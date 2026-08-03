---
layout: section
---

# 14. 운영

마이그레이션 · 브랜칭 · CI/CD · 백업

---

## 환경 분리 전략

| 방식 | 구성 | 장점 | 단점 |
|---|---|---|---|
| **로컬만** | 개발자 PC + 프로덕션 | 가장 단순 | 리허설 없이 배포 |
| **로컬 + 스테이징** | 별도 프로젝트 1개 | 프로덕션 전 검증 | 스테이징 상태 관리 |
| **로컬 + 브랜치 + 프로덕션** | PR마다 프리뷰 브랜치 | **PR 단위 격리** | 브랜치 비용 |
| **완전 분리** | 조직/프로젝트 분리 | 사고 반경 최소 | 운영 부담 |

<v-clicks>

- **최소 기준: 프로덕션과 개발이 같은 DB를 쓰지 않는다**
- 소규모 팀의 현실적 선택은 "로컬 + 프리뷰 브랜치 + 프로덕션"
- 프로덕션 데이터를 개발 환경에 복사할 때는 **반드시 익명화**한다

</v-clicks>

---

## 마이그레이션의 규칙

<v-clicks>

**1. 스키마 변경은 오직 마이그레이션 파일로**
대시보드에서 프로덕션을 직접 고치는 순간 환경이 갈라진다.

**2. 적용된 마이그레이션은 절대 수정하지 않는다**
이미 적용된 파일을 고치면 다른 환경과 이력이 어긋난다. 새 파일을 추가한다.

**3. 파일 하나 = 논리적 변경 하나**
"posts 테이블 추가"와 "comments 인덱스 추가"를 한 파일에 섞지 않는다.

**4. 커밋 전에 `supabase db reset`을 통과시킨다**
빈 DB에서 처음부터 만들어지는지 확인하는 것이다.

**5. RLS 정책도 마이그레이션이다**
정책은 스키마의 일부다. 대시보드에서 손으로 만들지 않는다.

</v-clicks>

---

## 마이그레이션 작성 요령

```sql
-- supabase/migrations/20260804120000_create_posts.sql

-- 1) 테이블
create table if not exists public.posts (
  id         bigint generated always as identity primary key,
  author_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 200),
  published  boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2) RLS (테이블과 같은 파일에!)
alter table public.posts enable row level security;

create policy "공개 글 읽기" on public.posts
  for select to anon, authenticated using ( published );

create policy "본인 글 관리" on public.posts
  for all to authenticated
  using ( (select auth.uid()) = author_id )
  with check ( (select auth.uid()) = author_id );

-- 3) 인덱스
create index if not exists posts_author_id_idx on public.posts (author_id);
create index if not exists posts_created_at_idx on public.posts (created_at desc);
```

---

## 파괴적 변경 다루기

<v-clicks>

**위험한 작업들**

- `drop table` / `drop column` — 데이터가 사라진다
- `alter column ... type` — 변환 실패 시 전체 롤백, 큰 테이블은 락
- `not null` 추가 — 기존 `null` 행이 있으면 실패
- `unique` 추가 — 중복이 있으면 실패
- 인덱스 생성 — `concurrently` 없이는 쓰기를 막는다

</v-clicks>

<v-click>

**대응**

```sql
-- 큰 테이블의 인덱스는 반드시 concurrently
create index concurrently if not exists posts_title_idx on public.posts (title);

-- not null 추가는 2단계로
alter table posts add column status text;              -- 1) nullable로 추가
update posts set status = 'draft' where status is null; -- 2) 백필
alter table posts alter column status set not null;     -- 3) 제약 추가
```

</v-click>

---

## 무중단 스키마 변경 순서

컬럼 이름을 `name` → `full_name`으로 바꾸는 경우.

```mermaid {scale: 0.6}
flowchart LR
    S1["1. full_name 컬럼 추가<br/>(nullable)"] --> S2["2. 앱: 양쪽에 쓰기<br/>읽기는 name"]
    S2 --> S3["3. 기존 데이터 백필"]
    S3 --> S4["4. 앱: full_name 읽기"]
    S4 --> S5["5. 앱: name 쓰기 중단"]
    S5 --> S6["6. name 컬럼 삭제"]
```

<v-clicks>

- 각 단계가 **배포 하나**다. 이전 버전의 앱과도 호환되어야 한다
- `rename column` 한 방은 배포 사이 짧은 시간 동안 앱이 깨진다
- 트래픽이 적은 서비스라면 과할 수 있다. **다운타임을 감수할지 먼저 정한다**

</v-clicks>

---

## 브랜칭 개요

```mermaid {scale: 0.6}
flowchart TB
    M["main 브랜치<br/>= 프로덕션 프로젝트"]
    PR1["PR #101<br/>Preview Branch (독립 DB)"]
    PR2["PR #102<br/>Preview Branch (독립 DB)"]
    ST["staging<br/>Persistent Branch"]

    M -.->|"PR 생성 시 분기"| PR1
    M -.-> PR2
    PR1 -->|"머지 → 마이그레이션 적용"| M
    M --- ST

    style M fill:#ccfbf1,stroke:#0d9488
```

<v-clicks>

- **Preview Branch** — PR마다 자동 생성. 비활동 시 일시정지, PR 종료 시 삭제
- **Persistent Branch** — 스테이징/QA용. 자동 삭제되지 않는다
- 브랜치는 **데이터를 복사하지 않는다.** 마이그레이션 + 시드로 채워진다
- 각 브랜치는 **자체 API URL과 키**를 갖는다

</v-clicks>

---

## 브랜칭 워크플로

<v-clicks>

**1) GitHub 연동 설정**
대시보드에서 저장소와 프로덕션 브랜치(`main`)를 연결한다.

**2) PR 생성**
`supabase/migrations/`에 변경이 있으면 Preview Branch가 생성된다.

**3) 자동 적용**
브랜치 DB에 마이그레이션과 시드가 실행된다. Edge Function도 배포된다.

**4) 프리뷰 배포와 연결**
Vercel 통합이 있으면 프리뷰 배포의 환경 변수가 이 브랜치를 가리킨다.

**5) 머지**
`main`에 머지되면 프로덕션에 마이그레이션이 적용되고, 브랜치는 정리된다.

</v-clicks>

<v-click>

**핵심 이점:** "이 마이그레이션이 실제로 돌아가는가"를 **머지 전에** 확인할 수 있다.

</v-click>

---

## CI/CD 파이프라인 설계

```mermaid {scale: 0.58}
flowchart LR
    P["git push"] --> L["Lint / 타입 검사"]
    L --> DB["supabase db reset<br/>(마이그레이션 검증)"]
    DB --> T["pgTAP 정책 테스트<br/>+ 앱 테스트"]
    T --> TY["타입 파일 최신성 확인"]
    TY --> PR{"main 브랜치?"}
    PR -->|아니오| PV["프리뷰 배포"]
    PR -->|예| DP["supabase db push<br/>+ functions deploy<br/>+ Vercel 프로덕션"]

    style DB fill:#ccfbf1,stroke:#0d9488
    style DP fill:#fef3c7,stroke:#d97706
```

<v-click>

**가장 가치 있는 스텝은 `supabase db reset`이다.**
"빈 DB에서 우리 스키마가 만들어지는가"를 매 PR마다 검증한다.

</v-click>

---

## GitHub Actions — 검증

```yaml
name: verify
on: pull_request

jobs:
  database:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with: { version: latest }

      - name: 로컬 스택 기동
        run: supabase start

      - name: 마이그레이션 재현성 검증
        run: supabase db reset

      - name: RLS 정책 테스트 (pgTAP)
        run: supabase test db

      - name: 타입 파일이 최신인지 확인
        run: |
          supabase gen types typescript --local > /tmp/types.ts
          diff /tmp/types.ts lib/database.types.ts \
            || (echo "타입 파일이 오래되었습니다. npm run db:types 를 실행하세요." && exit 1)
```

---

## GitHub Actions — 배포

```yaml
name: deploy
on:
  push:
    branches: [main]

jobs:
  migrate:
    runs-on: ubuntu-latest
    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
      PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1

      - run: supabase link --project-ref $PROJECT_REF
      - run: supabase db push
      - run: supabase functions deploy
```

<v-click>

**사람이 `db push`를 직접 치지 않게 한다.** 배포 경로를 하나로 고정하면 이력이 명확해진다.

</v-click>

---

## 시크릿 관리

| 시크릿 | 어디에 | 비고 |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | GitHub Secrets | CLI 인증용 개인 토큰 |
| `SUPABASE_DB_PASSWORD` | GitHub Secrets | `db push`에 필요 |
| `SUPABASE_SECRET_KEY` | Vercel 환경 변수 (서버) | **절대 클라이언트 금지** |
| Edge Function 시크릿 | `supabase secrets set` | 함수 런타임 전용 |
| DB 내부용 키 | Supabase Vault | pg_net 호출 등에 사용 |

<v-clicks>

- **원칙: 한 시크릿은 한 곳에만 산다.** 여러 곳에 복사하면 회전할 때 반드시 하나를 빠뜨린다
- 로컬 개발용 키는 고정값이라 커밋해도 되지만, **원격 키는 절대 커밋하지 않는다**
- 유출 시 회전 절차를 문서로 만들어 둔다 (누가, 어디를, 어떤 순서로)

</v-clicks>

---

## 백업과 복구

<v-clicks>

**플랜별 제공**

- Free: 자동 백업 없음 → **직접 `pg_dump`를 돌려야 한다**
- Pro: 일 단위 백업, 7일 보관
- Team: 14일 보관
- PITR(Point-in-Time Recovery): 애드온. 특정 시각으로 복구

</v-clicks>

<v-click>

```bash
# 수동 백업
supabase db dump --db-url "$DATABASE_URL" -f backup.sql              # 스키마 + 데이터
supabase db dump --db-url "$DATABASE_URL" --data-only -f data.sql     # 데이터만
supabase db dump --db-url "$DATABASE_URL" --role-only -f roles.sql    # 역할
```

</v-click>

<v-click>

**중요:** 백업은 존재만으로는 의미가 없다.
**복구를 실제로 해본 적이 있는가**가 유일하게 의미 있는 질문이다. 분기에 한 번은 리허설하자.
Storage 파일은 DB 백업에 포함되지 않는다 — **별도로 백업**해야 한다.

</v-click>

---

## 모니터링과 로그

<v-clicks>

**대시보드에서 볼 것들**

- **Reports** — API 요청 수, 에러율, DB 사용량, 대역폭
- **Logs** — Postgres 로그, API 게이트웨이 로그, Auth 로그, Edge Function 로그
- **Query Performance** — 느린 쿼리 순위 (`pg_stat_statements` 기반)

</v-clicks>

<v-click>

```sql
-- 느린 쿼리 직접 조회
select
  calls,
  round(total_exec_time::numeric, 1) as total_ms,
  round(mean_exec_time::numeric, 2)  as mean_ms,
  left(query, 100) as query
from extensions.pg_stat_statements
order by total_exec_time desc
limit 20;
```

</v-click>

<v-click>

**외부 연동:** 로그 드레인으로 Datadog 등에 보낼 수 있다 (상위 플랜).
최소한 **디스크 사용량과 커넥션 수 알림**은 걸어두자.

</v-click>

---

## Advisors 활용

대시보드 **Advisors**는 무료로 제공되는 자동 점검이다. 정기적으로 확인하자.

<v-clicks>

**Security Advisor가 잡는 것**

- RLS가 꺼진 `public` 테이블 ← **가장 중요**
- `security definer` 뷰
- `search_path`가 설정되지 않은 함수
- 노출된 확장 스키마

**Performance Advisor가 잡는 것**

- 인덱스가 없는 외래 키
- 사용되지 않는 인덱스
- RLS 정책의 비효율 (`auth.uid()` 미감싸기 등)
- 중복 정책

</v-clicks>

<v-click>

**팀 규칙으로:** 배포 전 Security Advisor 경고 0개를 확인한다.

</v-click>

---

## 프로덕션 체크리스트 — 보안

<v-clicks>

- [ ] `public` 스키마의 **모든 테이블에 RLS 활성화**
- [ ] Security Advisor 경고 0개
- [ ] secret key가 클라이언트 번들에 없음 (빌드 결과물 검색으로 확인)
- [ ] Auth Redirect URL 허용 목록 정리 (와일드카드 범위가 과하지 않은지)
- [ ] 비밀번호 정책 + 유출된 비밀번호 차단 활성화
- [ ] 커스텀 SMTP 설정 완료
- [ ] `verify_jwt = false`인 Edge Function에 자체 검증 존재
- [ ] `security definer` 함수에 `set search_path = ''`
- [ ] 노출 스키마 목록 확인 (API Settings)
- [ ] 뷰에 `security_invoker = on`
- [ ] MFA 필요 여부 검토 (관리자 계정 최소한)
- [ ] 속도 제한(rate limit) 설정 확인

</v-clicks>

---

## 프로덕션 체크리스트 — 안정성

<v-clicks>

- [ ] 컴퓨트 크기가 예상 부하에 맞는가 (Free/Micro는 프로덕션에 부족할 수 있다)
- [ ] 백업 정책 확인, **복구 리허설 완료**
- [ ] Storage 파일 백업 계획
- [ ] 커넥션 방식이 환경에 맞는가 (서버리스 → Supavisor transaction 6543)
- [ ] 느린 쿼리 상위 10개 점검, 인덱스 확인
- [ ] 디스크 사용량 알림 설정
- [ ] 마이그레이션이 CI를 통해서만 적용되는가
- [ ] 롤백 절차 문서화
- [ ] Vercel 함수 리전과 DB 리전 일치
- [ ] Realtime 동시 접속 한도 확인
- [ ] 대역폭 사용량 추이 확인 (초과 요금 예측)

</v-clicks>

---

## 사고 대응 시나리오

<v-clicks>

**"secret key가 유출됐다"**
1. 대시보드에서 즉시 키 회전 → 2. 모든 환경 변수 갱신 → 3. Logs에서 이상 접근 확인 → 4. 필요하면 데이터 감사

**"프로덕션 테이블을 실수로 지웠다"**
1. 즉시 쓰기 차단 (앱 유지보수 모드) → 2. PITR 또는 최근 백업으로 복구 → 3. 원인 마이그레이션 확인 → 4. `db push` 권한을 CI로만 제한

**"DB가 느려졌다"**
1. Query Performance에서 상위 쿼리 확인 → 2. `pg_stat_activity`로 잠금/장기 실행 확인 → 3. 인덱스 추가 또는 쿼리 수정 → 4. 임시로 컴퓨트 상향

**"커넥션이 고갈됐다"**
1. 연결 방식 확인 (direct → Supavisor transaction) → 2. ORM 풀 크기 축소 → 3. 유휴 연결 정리

</v-clicks>

---

## 팀 규칙으로 만들 것들

<v-clicks>

1. **프로덕션 대시보드에서 스키마를 직접 고치지 않는다** (읽기/디버깅만)
2. **테이블 생성 PR에는 RLS 정책이 함께 있어야 한다** — 리뷰 체크 항목
3. **`db reset`이 통과하지 않으면 머지하지 않는다**
4. **타입 파일은 자동 생성물이다** — 직접 수정 금지
5. **secret key는 서버 코드에서만**, `server-only`로 강제한다
6. **배포는 CI를 통해서만** — 로컬에서 `db push` 금지
7. **분기에 한 번 복구 리허설**
8. **Security Advisor 경고 0개를 릴리스 조건으로**

</v-clicks>

---

## 14장 요약

<v-clicks>

- 스키마의 진실은 **`supabase/migrations/`** 다. 대시보드가 아니다
- `supabase db reset`이 재현성을 보증한다 — **CI에 반드시 넣는다**
- 브랜칭으로 PR마다 독립 DB를 얻는다 (데이터는 복사되지 않으므로 시드 필요)
- 배포는 CI에서만. 사람이 `db push`를 치지 않는다
- 백업은 **복구해 본 적이 있어야** 백업이다. Storage는 별도 백업
- Advisors는 공짜 보안 감사다 — 릴리스 게이트로 삼자

</v-clicks>
