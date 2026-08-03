---
layout: section
---

# 8. Storage

파일도 결국 테이블이다

---

## Storage의 구조

```mermaid {scale: 0.66}
flowchart LR
    C["클라이언트"] --> API["Storage API<br/>/storage/v1"]
    API --> META[("Postgres<br/>storage.buckets<br/>storage.objects")]
    API --> OBJ[["오브젝트 스토리지<br/>(S3 계열)"]]
    OBJ --> CDN[["글로벌 CDN"]]
    CDN --> C

    META -.->|RLS 정책으로 접근 판정| API

    style META fill:#ccfbf1,stroke:#0d9488
```

<v-clicks>

- **파일 바이트**는 오브젝트 스토리지에, **메타데이터**는 Postgres에
- 그래서 파일 권한도 **RLS 정책**으로 쓴다 — 새 권한 시스템을 배울 필요가 없다
- CDN이 앞단에 붙어 전 세계에서 빠르게 서빙된다

</v-clicks>

---

## 버킷 만들기 — public vs private

```sql
-- 공개 버킷: URL만 알면 누구나 접근
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

-- 비공개 버킷: 서명된 URL 또는 인증된 요청만
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760, array['application/pdf','image/png']);
```

<v-clicks>

| | public 버킷 | private 버킷 |
|---|---|---|
| 읽기 | URL만 알면 누구나 | 서명 URL 또는 인증 필요 |
| CDN 캐싱 | 매우 효율적 | 제한적 |
| 용도 | 아바타, 로고, 공개 이미지 | 계약서, 개인 문서, 유료 콘텐츠 |
| RLS | 쓰기에만 적용 | 읽기·쓰기 모두 적용 |

</v-clicks>

<v-click>

**public 버킷의 URL은 추측 불가능해야 한다.** 파일명에 UUID를 섞자.

</v-click>

---

## 업로드

```ts
// 기본 업로드
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/profile.png`, file, {
    cacheControl: '3600',
    upsert: true,            // 같은 경로가 있으면 덮어쓰기 (기본 false)
    contentType: 'image/png',
  })

// 서명된 업로드 URL — 서버가 발급, 클라이언트가 직접 업로드
const { data: signed } = await supabaseAdmin.storage
  .from('documents')
  .createSignedUploadUrl(`${userId}/${crypto.randomUUID()}.pdf`)

await supabase.storage
  .from('documents')
  .uploadToSignedUrl(signed.path, signed.token, file)
```

<v-click>

**경로 설계가 곧 권한 설계다.** `<userId>/<파일명>` 처럼 첫 세그먼트를 소유자로 두면
RLS 정책을 아주 간단하게 쓸 수 있다.

</v-click>

---

## 다운로드와 URL 3종

```ts
// 1) 공개 URL — public 버킷 전용. 만료 없음, CDN 캐시됨
const { data } = supabase.storage.from('avatars').getPublicUrl('user-1/profile.png')
// → https://<ref>.supabase.co/storage/v1/object/public/avatars/user-1/profile.png

// 2) 서명 URL — private 버킷. 지정 시간 동안만 유효
const { data: signed } = await supabase.storage
  .from('documents')
  .createSignedUrl('user-1/contract.pdf', 60)   // 60초

// 여러 개 한 번에
await supabase.storage.from('documents').createSignedUrls(['a.pdf', 'b.pdf'], 60)

// 3) 직접 다운로드 — 인증된 요청, Blob으로 받음
const { data: blob } = await supabase.storage
  .from('documents').download('user-1/contract.pdf')
```

<v-click>

**서명 URL은 발급 시점에 권한이 검사된다.** 발급 후에는 만료 전까지 누구나 쓸 수 있으므로
유효 시간을 짧게 잡고, 필요할 때마다 새로 발급하는 게 안전하다.

</v-click>

---
class: denser
---

## Storage RLS 정책

`storage.objects` 테이블에 정책을 쓴다.

```sql {1-8|10-15|all}
-- 업로드: 자기 폴더에만
create policy "자기 폴더에 업로드"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- 조회: 자기 폴더만 (select / update / delete 도 같은 형태로 만든다)
create policy "자기 폴더 조회"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- 삭제는 소유자 컬럼으로도 가능하다
--   using ( bucket_id = 'documents' and owner = (select auth.uid()) )
```

---

## 폴더 구조로 권한 나누기

```text
documents/
├── 8f3c1e2a-.../          ← 사용자 UUID = (storage.foldername(name))[1]
│   ├── contract.pdf
│   └── invoice.pdf
└── team-abc/              ← 팀 단위로 나누는 것도 가능
    └── shared.pdf
```

```sql
-- 팀 단위 접근
create policy "팀 문서 조회"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'team-files'
    and (storage.foldername(name))[1] in (
      select team_id::text from public.team_members
      where user_id = (select auth.uid())
    )
  );
```

<v-clicks>

- `storage.foldername(name)`은 경로를 `/`로 쪼갠 **배열**을 준다 (1-indexed)
- `storage.filename(name)`, `storage.extension(name)` 헬퍼도 있다

</v-clicks>

---

## 이미지 변환

원본 하나만 올려두고 필요한 크기로 받아 쓴다.

```ts
// 공개 URL에 변환 옵션
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl('user-1/profile.png', {
    transform: { width: 200, height: 200, resize: 'cover', quality: 80 },
  })

// 서명 URL에도 적용 가능
await supabase.storage.from('documents').createSignedUrl('a.png', 60, {
  transform: { width: 400 },
})

// 다운로드 시 변환
await supabase.storage.from('avatars')
  .download('user-1/profile.png', { transform: { width: 100 } })
```

<v-clicks>

- `resize`: `cover` | `contain` | `fill`
- 변환 결과는 **CDN에 캐시**된다 — 같은 옵션의 두 번째 요청부터는 빠르다
- 유료 플랜 기능이며 **변환된 원본 이미지 수 기준으로 과금**된다
- Next.js `next/image`와 함께 쓸 때는 어느 쪽에서 리사이즈할지 정해야 한다 (중복 비용 주의)

</v-clicks>

---
class: denser
---

## 재개 가능 업로드 (TUS)

큰 파일을 안정적으로 올리는 방법.

```ts
import * as tus from 'tus-js-client'

const upload = new tus.Upload(file, {
  endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
  headers: {
    authorization: `Bearer ${session.access_token}`,
    'x-upsert': 'true',
  },
  metadata: {
    bucketName: 'videos',
    objectName: `${userId}/${file.name}`,
    contentType: file.type,
  },
  chunkSize: 6 * 1024 * 1024,       // 6MB — Supabase 권장값
  onProgress: (sent, total) => console.log(`${((sent / total) * 100).toFixed(1)}%`),
  onSuccess: () => console.log('완료'),
})
upload.start()
```

<v-clicks>

- 네트워크가 끊겨도 **이어서 올릴 수 있다**
- 일반 업로드는 파일 크기 상한이 있다. 큰 파일은 TUS 또는 S3 멀티파트를 쓴다
- 진행률 표시가 필요한 UI에도 적합하다

</v-clicks>

---

## S3 호환 접근

기존 S3 도구와 라이브러리를 그대로 쓸 수 있다.

```ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
  forcePathStyle: true,
  region: 'ap-northeast-2',
  endpoint: `${SUPABASE_URL}/storage/v1/s3`,
  credentials: {
    accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY!,
    secretAccessKey: process.env.SUPABASE_S3_SECRET_KEY!,
  },
})

await s3.send(new PutObjectCommand({ Bucket: 'videos', Key: 'a.mp4', Body: buf }))
```

<v-clicks>

- 대시보드에서 S3 액세스 키를 발급받아 쓴다
- 멀티파트 업로드, `aws s3 sync` 같은 CLI 도구 사용 가능
- **주의:** S3 자격 증명은 RLS를 우회한다. 서버에서만 사용한다

</v-clicks>

---

## 파일 메타데이터를 앱 테이블과 연결하기

파일 정보를 앱 테이블에 따로 저장하는 패턴.

```sql
create table public.attachments (
  id          uuid primary key default gen_random_uuid(),
  post_id     bigint not null references public.posts (id) on delete cascade,
  bucket_id   text not null,
  path        text not null,
  size_bytes  bigint,
  mime_type   text,
  uploaded_by uuid not null default auth.uid() references auth.users (id),
  created_at  timestamptz not null default now(),
  unique (bucket_id, path)
);
```

<v-clicks>

- 앱 도메인 정보(어느 글의 첨부인지, 정렬 순서, 캡션)를 담을 자리가 생긴다
- 조인이 쉬워진다 — `posts`와 함께 한 번에 조회 가능
- **고아 파일 문제**: 행은 지웠는데 파일이 남는다 → 삭제 트리거나 정기 배치(pg_cron)로 정리

</v-clicks>

---

## 대용량 · 보안 업로드 패턴

```mermaid {scale: 0.6}
sequenceDiagram
    participant C as 클라이언트
    participant S as 서버 (Route Handler)
    participant ST as Storage
    participant DB as Postgres

    C->>S: 업로드 요청 (파일명, 크기, 타입)
    S->>S: 권한/용량/확장자 검증
    S->>ST: createSignedUploadUrl()
    ST-->>S: 서명된 URL + 토큰
    S-->>C: URL 전달
    C->>ST: 파일 직접 업로드 (서버를 거치지 않음)
    C->>S: 업로드 완료 알림
    S->>DB: attachments 행 생성
```

<v-click>

**핵심 이점:** 파일 바이트가 애플리케이션 서버를 통과하지 않는다.
Vercel 함수의 요청 본문 크기 제한과 실행 시간 제한을 피할 수 있다. (12장에서 다시 다룬다)

</v-click>

---

## Storage 함정 모음

<v-clicks>

1. **버킷을 public으로 만들고 잊기** — 추측 가능한 경로면 전부 노출된다
2. **`storage.objects`에 RLS 정책을 안 만들기** — 업로드가 통째로 막히거나 열린다
3. **경로에 사용자 입력을 그대로 사용** — `../` 같은 문자, 한글 파일명 인코딩 문제
4. **MIME 타입을 클라이언트 값만 믿기** — 버킷의 `allowed_mime_types`로 서버 측 제한을 건다
5. **파일 크기 제한 미설정** — 버킷의 `file_size_limit`와 서버 검증 둘 다
6. **고아 파일 방치** — 스토리지 비용이 조용히 늘어난다
7. **서명 URL 유효 시간을 너무 길게** — 유출되면 그 기간 내내 열려 있다
8. **이미지 변환을 매 요청마다 다른 파라미터로** — 캐시가 안 먹고 비용만 는다

</v-clicks>

---

## 8장 요약

<v-clicks>

- Storage = 오브젝트 스토리지 + **Postgres 메타데이터** + CDN
- 권한은 `storage.objects`에 대한 **RLS 정책**으로 쓴다
- **경로 설계가 곧 권한 설계** — `<userId>/파일` 또는 `<teamId>/파일`
- public 버킷은 공개 자산에만, 나머지는 private + 짧은 서명 URL
- 큰 파일은 TUS(재개 가능) 또는 S3 멀티파트
- 서명 업로드 URL을 쓰면 파일이 앱 서버를 통과하지 않는다

</v-clicks>
