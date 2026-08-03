---
layout: section
---

# 3. 시작하기

대시보드에서 5분, 그리고 제대로 된 로컬 개발 환경

---

## 두 갈래 시작 경로

```mermaid {scale: 0.7}
flowchart LR
    A["대시보드에서 바로 시작"] --> A1["클릭으로 테이블 생성"] --> A2["즉시 API 사용"]
    B["CLI로 로컬 시작"] --> B1["supabase start"] --> B2["마이그레이션으로 스키마 관리"] --> B3["db push로 배포"]

    style A fill:#fef3c7,stroke:#d97706
    style B fill:#ccfbf1,stroke:#0d9488
```

<v-clicks>

- **A 경로**는 감을 잡는 데 좋다. 5분이면 동작하는 것을 본다
- **B 경로**가 실제 개발 방식이다. 스키마가 코드로 남고, 팀과 공유되고, 되돌릴 수 있다
- 이 장은 A로 시작해서 B로 넘어간다. **A에서 멈추면 나중에 반드시 아프다**

</v-clicks>

---

## 대시보드로 프로젝트 만들기

<v-clicks>

1. [supabase.com/dashboard](https://supabase.com/dashboard) 에서 GitHub 로그인
2. **New project** → 조직 선택
3. 입력할 것 세 가지
   - **Name** — 프로젝트 이름
   - **Database Password** — Postgres `postgres` 사용자 비밀번호. **여기서 잘 저장해 둘 것**
   - **Region** — 사용자와 가장 가까운 곳 (한국 서비스면 `Northeast Asia (Seoul)`)
4. 1~2분 기다리면 프로비저닝 완료

</v-clicks>

<v-click>

**리전 선택은 나중에 바꿀 수 없다.** 지연 시간에 직접 영향을 주므로 신중하게.
Vercel 배포 리전과 가까이 두는 것도 중요하다 (12장에서 다시 다룬다).

</v-click>

---
class: dense
---

## 대시보드 둘러보기 — 어디에 뭐가 있나

| 메뉴 | 하는 일 | 자주 쓰나 |
|---|---|---|
| **Table Editor** | 스프레드시트처럼 테이블 보기/편집 | ◎ |
| **SQL Editor** | 임의 SQL 실행, 저장된 쿼리 | ◎ |
| **Authentication** | 사용자 목록, 로그인 제공자 설정, 이메일 템플릿 | ◎ |
| **Storage** | 버킷과 파일 관리 | ○ |
| **Database** | 스키마, 함수, 트리거, 확장, 역할, 복제 설정 | ○ |
| **Edge Functions** | 배포된 함수와 로그 | ○ |
| **Reports / Logs** | 쿼리 성능, API 로그, 에러 추적 | ○ (문제 생겼을 때) |
| **Advisors** | 보안·성능 자동 점검 결과 | **◎ (꼭 볼 것)** |
| **Project Settings** | API 키, 연결 문자열, 컴퓨트 설정 | ○ |

---

## 프로젝트 자격 증명 확인하기

**Project Settings → API Keys** 에서 확인한다.

```bash
# 프로젝트 URL — 모든 요청의 베이스
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmno.supabase.co

# publishable key — 브라우저에 노출해도 되는 키
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxx

# secret key — 서버에서만. 절대 NEXT_PUBLIC_ 접두사를 붙이지 말 것
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxxxxxx
```

<v-clicks>

- 예전 프로젝트에는 `anon` / `service_role` JWT 키가 보인다. **2026년 말 폐기 예정**이므로 신규는 새 키를 쓴다
- `NEXT_PUBLIC_` 접두사가 붙은 값은 **브라우저 번들에 그대로 들어간다**. secret key에 붙이면 즉시 사고다
- 키가 유출됐다면 대시보드에서 회전(rotate)할 수 있다

</v-clicks>

---

## 첫 테이블 만들기 (SQL Editor)

Table Editor 클릭보다 SQL로 만드는 습관을 들이자. 나중에 그대로 마이그레이션이 된다.

```sql {1-8|10-11|13-22|all}
create table public.posts (
  id          bigint generated always as identity primary key,
  author_id   uuid not null references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 200),
  body        text,
  published   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- 테이블을 만들면 RLS를 켜는 것까지가 한 세트다
alter table public.posts enable row level security;

-- 정책이 없으면 아무도 못 읽는다. 최소 정책 두 개
create policy "누구나 공개 글을 읽는다"
  on public.posts for select
  using (published = true);

create policy "본인 글은 본인이 관리한다"
  on public.posts for all
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);
```

---

## supabase-js 설치와 클라이언트 생성

```bash
npm install @supabase/supabase-js
```

```ts
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
)
```

<v-clicks>

- 이 클라이언트는 **브라우저용**이다. 로그인하면 세션이 자동으로 붙는다
- Next.js에서는 이렇게 쓰지 않고 `@supabase/ssr`을 쓴다 (13장)
- 서버 전용 관리 작업에는 secret key로 별도 클라이언트를 만든다

</v-clicks>

---

## 첫 조회 / 삽입

```ts
// 조회 — SELECT id, title, created_at FROM posts WHERE published ORDER BY created_at DESC LIMIT 10
const { data, error } = await supabase
  .from('posts')
  .select('id, title, created_at')
  .eq('published', true)
  .order('created_at', { ascending: false })
  .limit(10)

// 삽입 — author_id는 넣지 않는다. 기본값/트리거로 채우는 편이 안전하다
const { data: created, error: insertError } = await supabase
  .from('posts')
  .insert({ title: '첫 글', body: '내용' })
  .select()
  .single()
```

<v-click>

**`error`를 항상 확인할 것.** supabase-js는 예외를 던지지 않고 `{ data, error }` 를 돌려준다.
`try/catch`만 두르고 안심하면 실패를 놓친다.

</v-click>

---

## 여기서 멈추면 안 되는 이유

대시보드만 쓰면 곧 이런 상황이 온다.

<v-clicks>

- "이 컬럼 누가 언제 추가했지?" — 기록이 없다
- "스테이징이랑 프로덕션 스키마가 다른데요" — 손으로 맞춰야 한다
- "실수로 프로덕션 테이블을 지웠어요" — 되돌릴 코드가 없다
- "새로 온 사람이 로컬 환경 세팅을 못 해요" — 재현 가능한 정의가 없다

</v-clicks>

<v-click>

해법은 하나다. **스키마를 SQL 파일로 버전 관리하고, 로컬에서 먼저 돌린다.**
그게 CLI가 하는 일이다.

</v-click>

---

## CLI 설치

```bash
# macOS / Linux — Homebrew
brew install supabase/tap/supabase

# 프로젝트 의존성으로 (공식 문서가 권장하는 방식)
npm install supabase --save-dev
npx supabase --help

# Windows — Scoop
# scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
# scoop install supabase
```

<v-click>

**전역 설치보다 프로젝트 의존성 설치를 권한다.**
팀원마다 CLI 버전이 달라 마이그레이션 동작이 갈라지는 사고를 막을 수 있다.

</v-click>

---

## supabase init — 프로젝트 구조

```bash
supabase init
```

```text
supabase/
├── config.toml          # 로컬 스택 설정 (포트, Auth 설정, 스토리지 등)
├── migrations/          # 스키마 변경 이력 (SQL 파일, 타임스탬프 순)
├── functions/           # Edge Functions 소스
└── seed.sql             # 로컬 DB 초기 데이터
```

<v-clicks>

- **`supabase/` 디렉터리는 반드시 git에 커밋한다.** 이게 곧 백엔드 소스 코드다
- `.gitignore`에는 `supabase/.temp`, `supabase/.branches` 정도만 넣는다
- `config.toml`은 로컬 스택 설정이자, 일부 항목은 원격에도 반영된다

</v-clicks>

---

## supabase start — 로컬 스택

```bash
# Docker가 켜져 있어야 한다
supabase start
```

```text
Started supabase local development setup.

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIs...
service_role key: eyJhbGciOiJIUzI1NiIs...
```

<v-click>

**프로덕션과 같은 구성의 스택이 통째로 로컬에 뜬다.** Auth도, Storage도, Realtime도 전부 동작한다.
로컬 키는 모든 개발자에게 동일한 고정값이라 커밋해도 안전하다.

</v-click>

---

## 로컬 스택 구성 요소와 포트

| 포트 | 서비스 | 설명 |
|---|---|---|
| `54321` | API Gateway | `/rest/v1`, `/auth/v1`, `/storage/v1`, `/functions/v1` 전부 여기로 |
| `54322` | Postgres | `psql`, Prisma, DBeaver로 직접 붙는 주소 |
| `54323` | Studio | 로컬 대시보드. 원격과 UI가 동일하다 |
| `54324` | Inbucket / Mailpit | **로컬 메일 서버** — 가입 확인 메일, 매직 링크를 여기서 확인 |

<v-click>

`54324`가 특히 유용하다. 이메일 인증이나 매직 링크 플로우를
**실제 메일 발송 없이** 브라우저에서 그대로 테스트할 수 있다.

</v-click>

---

## 첫 마이그레이션 만들기

두 가지 방법이 있다.

```bash
# 방법 1) 빈 마이그레이션 파일을 만들고 직접 SQL을 쓴다
supabase migration new create_posts
# → supabase/migrations/20260804120000_create_posts.sql 생성
```

```bash
# 방법 2) 로컬 Studio에서 클릭으로 바꾼 뒤, 차이를 뽑아낸다
supabase db diff -f create_posts
# → 현재 로컬 DB와 마이그레이션 이력의 차이를 SQL로 추출
```

<v-clicks>

- **방법 1을 기본으로 삼는 것을 권한다.** 의도가 명확한 SQL이 남는다
- 방법 2는 복잡한 변경(정책, 트리거 다수)을 GUI로 만든 뒤 뽑아낼 때 편하다
- 어느 쪽이든 결과물은 **`migrations/` 안의 SQL 파일**이고, 이게 진실이다

</v-clicks>

---

## supabase db reset — 재현 가능한 DB

```bash
supabase db reset
```

<v-clicks>

하는 일:

1. 로컬 DB를 **완전히 비운다**
2. `migrations/` 안의 SQL을 **타임스탬프 순서대로 전부 재실행**한다
3. `seed.sql`(또는 config에 지정한 시드)을 실행한다

</v-clicks>

<v-click>

이 명령이 통과한다는 건 **"빈 DB에서 우리 스키마를 처음부터 만들 수 있다"** 는 뜻이다.
CI에서 이걸 돌리면 마이그레이션이 깨졌는지 자동으로 잡힌다.

</v-click>

<v-click>

**습관:** 마이그레이션을 쓴 뒤 커밋 전에 항상 `supabase db reset` 한 번.

</v-click>

---

## seed.sql — 개발용 데이터

```sql
-- supabase/seed.sql
insert into auth.users (id, email, encrypted_password, email_confirmed_at, role, aud)
values (
  '00000000-0000-0000-0000-000000000001',
  'dev@example.com',
  crypt('password123', gen_salt('bf')),
  now(), 'authenticated', 'authenticated'
);

insert into public.posts (author_id, title, body, published) values
  ('00000000-0000-0000-0000-000000000001', '첫 글', '내용', true),
  ('00000000-0000-0000-0000-000000000001', '초안', '아직 작성 중', false);
```

<v-clicks>

- 시드는 **로컬과 프리뷰 브랜치에만** 적용된다. 프로덕션에는 실행되지 않는다
- 고정 UUID를 쓰면 테스트 코드에서 참조하기 쉽다
- 시드가 커지면 여러 파일로 나누고 `config.toml`의 `[db.seed]`에서 glob으로 지정한다

</v-clicks>

---

## 원격 프로젝트와 연결하기

```bash
# 1) 로그인
supabase login

# 2) 로컬 디렉터리를 원격 프로젝트에 연결 (project-ref는 대시보드 URL에 있다)
supabase link --project-ref abcdefghijklmno

# 3) 로컬 마이그레이션을 원격에 적용
supabase db push

# 반대 방향: 원격에서 이미 손댄 스키마를 로컬로 끌어온다
supabase db pull
```

<v-clicks>

- `db push`는 **아직 적용되지 않은 마이그레이션만** 순서대로 실행한다
- 원격에서 대시보드로 직접 바꿔 놓은 게 있으면 충돌한다 → `db pull`로 먼저 흡수
- 실무에서는 `db push`를 사람이 직접 치지 않고 **CI에서 실행**한다 (14장)

</v-clicks>

---

## 타입 생성 — 여기서 개발 경험이 갈린다

```bash
# 로컬 DB 기준
supabase gen types typescript --local > lib/database.types.ts

# 원격 프로젝트 기준
supabase gen types typescript --project-id abcdefghijklmno > lib/database.types.ts
```

```ts
import type { Database } from './database.types'

const supabase = createClient<Database>(url, key)

const { data } = await supabase.from('posts').select('id, title')
// data: { id: number; title: string }[] | null  ← 컬럼 이름 오타가 컴파일 에러가 된다
```

<v-click>

**`package.json` 스크립트로 등록해 두고, 스키마를 바꿀 때마다 돌린다.**

```json
{ "scripts": { "types": "supabase gen types typescript --local > lib/database.types.ts" } }
```

</v-click>

---

## config.toml 훑어보기

```toml
[api]
enabled = true
port = 54321
schemas = ["public", "graphql_public"]   # API에 노출할 스키마
max_rows = 1000                          # 한 번에 반환할 최대 행 수

[db]
port = 54322
major_version = 17

[auth]
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = ["https://localhost:3000"]
jwt_expiry = 3600
enable_signup = true

[auth.email]
enable_confirmations = false             # 로컬에서는 끄면 편하다

[auth.external.github]
enabled = true
client_id = "env(GITHUB_CLIENT_ID)"
secret = "env(GITHUB_SECRET)"
```

<v-click>

`max_rows`는 기억해 둘 만하다. 클라이언트가 무한정 데이터를 긁어가는 것을 막는 안전장치다.

</v-click>

---

## 3장 요약 + 권장 워크플로

```mermaid {scale: 0.68}
flowchart LR
    A["supabase migration new"] --> B["SQL 작성"]
    B --> C["supabase db reset<br/>(로컬 검증)"]
    C --> D["gen types<br/>(타입 갱신)"]
    D --> E["앱 코드 수정 + 테스트"]
    E --> F["git commit / PR"]
    F --> G["CI에서 supabase db push"]

    style C fill:#ccfbf1,stroke:#0d9488
    style G fill:#ccfbf1,stroke:#0d9488
```

<v-clicks>

- 대시보드는 **탐색과 디버깅용**, 스키마 변경의 진실은 `migrations/`
- `supabase start` → 프로덕션과 같은 스택이 로컬에
- `db reset`이 통과해야 커밋한다
- 타입 생성은 자동화해 둔다

</v-clicks>
