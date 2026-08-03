---
layout: section
---

# 2. 아키텍처 뜯어보기

무엇이 어떻게 조립되어 있는가

---

## 전체 아키텍처 한 장

```mermaid {scale: 0.58}
flowchart TB
    CL["클라이언트<br/>(브라우저 / 모바일 / 서버)"]
    CL --> EV["Envoy<br/>API 게이트웨이 · 인증 · 라우팅"]

    EV --> PR["PostgREST<br/>/rest/v1"]
    EV --> GT["Auth (GoTrue)<br/>/auth/v1"]
    EV --> RT["Realtime<br/>/realtime/v1"]
    EV --> ST["Storage API<br/>/storage/v1"]
    EV --> GQ["pg_graphql<br/>/graphql/v1"]
    EV --> EF["Edge Functions (Deno)<br/>/functions/v1"]
    EV --> PM["pg_meta<br/>/pg/"]

    PR --> PG[("PostgreSQL")]
    GT --> PG
    RT --> PG
    ST --> PG
    GQ --> PG
    EF --> PG
    PM --> PG

    ST --> S3[["오브젝트 스토리지<br/>+ CDN"]]

    APP["외부 앱 / ORM<br/>(Prisma, Drizzle…)"] --> SV["Supavisor<br/>커넥션 풀러"] --> PG

    style PG fill:#ccfbf1,stroke:#0d9488,stroke-width:2px
    style EV fill:#fef3c7,stroke:#d97706
```

---

## 요청 하나가 지나가는 길

`supabase.from('posts').select('*')` 를 호출했을 때 실제로 벌어지는 일.

```mermaid {scale: 0.5}
sequenceDiagram
    autonumber
    participant C as 클라이언트
    participant E as Envoy
    participant P as PostgREST
    participant D as Postgres

    C->>E: GET /rest/v1/posts?select=*<br/>apikey: sb_publishable_...<br/>Authorization: Bearer (로그인 JWT)
    E->>E: apikey 검증 → 프로젝트 식별
    E->>P: 요청 전달
    P->>P: JWT 검증 → role 클레임 추출
    P->>D: set local role = 'authenticated'<br/>set local request.jwt.claims = '...'
    P->>D: SELECT * FROM posts
    Note over D: RLS 정책이 auth.uid() 기준으로 행 필터링
    D-->>P: 허용된 행만
    P-->>C: JSON 응답
```

---

## Envoy — API 게이트웨이

프로젝트의 모든 HTTP 트래픽이 들어오는 단일 진입점.

<v-clicks>

- 하는 일: **경로 기반 라우팅**, `apikey` 헤더 검증, 속도 제한, CORS
- 경로 규칙이 곧 제품 구분이다
  - `/rest/v1/*` → PostgREST
  - `/auth/v1/*` → Auth
  - `/realtime/v1/*` → Realtime
  - `/storage/v1/*` → Storage API
  - `/functions/v1/*` → Edge Functions
  - `/graphql/v1` → pg_graphql
- 그래서 프로젝트 URL 하나(`https://<ref>.supabase.co`)로 전부 접근한다

</v-clicks>

<v-click>

과거 문서/블로그에는 **Kong**으로 나온다. 같은 역할을 하는 게이트웨이가 Envoy로 교체된 것이다.

</v-click>

---

## PostgREST — 테이블을 REST로

Supabase 초기 학습에서 가장 중요한 부품.

<v-clicks>

- Postgres 스키마를 읽어 **테이블 · 뷰 · 함수를 자동으로 REST 엔드포인트로 노출**한다
- 우리가 API 서버를 쓰지 않는 이유가 바로 이것이다
- 노출 대상은 설정된 스키마뿐 (기본값 `public`, `graphql_public`)
- `supabase-js`의 `.from().select().eq()` 는 결국 **URL 쿼리스트링을 만드는 빌더**다

</v-clicks>

<v-click>

```bash
# supabase-js 없이도 그냥 HTTP다
curl "https://<ref>.supabase.co/rest/v1/posts?select=id,title&status=eq.published&order=created_at.desc&limit=10" \
  -H "apikey: sb_publishable_xxx" \
  -H "Authorization: Bearer <로그인 JWT>"
```

</v-click>

---

## PostgREST가 만드는 엔드포인트

| SQL 대상 | HTTP | 설명 |
|---|---|---|
| `select` | `GET /rest/v1/<table>` | 조회. 필터·정렬·페이지네이션은 쿼리스트링 |
| `insert` | `POST /rest/v1/<table>` | 본문에 객체 또는 배열 |
| `update` | `PATCH /rest/v1/<table>?filter` | 필터에 걸린 행 수정 |
| `delete` | `DELETE /rest/v1/<table>?filter` | 필터에 걸린 행 삭제 |
| `upsert` | `POST` + `Prefer: resolution=merge-duplicates` | 있으면 수정, 없으면 삽입 |
| 함수 호출 | `POST /rest/v1/rpc/<function>` | 데이터베이스 함수 실행 |

<v-click>

**주의:** `PATCH`/`DELETE`에 필터가 없으면 전체 행이 대상이 된다.
RLS가 켜져 있으면 정책에 걸린 행만 영향을 받지만, RLS가 없으면 테이블이 통째로 날아간다.

</v-click>

---

## Auth (GoTrue) — JWT 발급기

<v-clicks>

- 사용자 정보를 `auth` 스키마(특히 `auth.users`)에 저장한다
- 로그인에 성공하면 **access token(JWT)** 과 **refresh token**을 발급한다
- JWT에는 `sub`(사용자 UUID), `role`, `email`, `aal`, `app_metadata` 등이 담긴다
- 이 JWT가 이후 모든 요청에 `Authorization: Bearer`로 실려 다니고,
  **PostgREST가 그걸 풀어 Postgres 세션 변수에 넣는다** → RLS가 읽는다

</v-clicks>

<v-click>

핵심 연결고리 한 줄:

<div class="text-lg pt-2">
JWT의 <code>sub</code> 클레임 &nbsp;=&nbsp; SQL의 <code>auth.uid()</code>
</div>

</v-click>

---

## Realtime — WAL 구독 + 브로드캐스트

Elixir/Phoenix로 만들어진 WebSocket 서버.

<v-clicks>

세 가지 기능을 제공한다.

- **Broadcast** — 클라이언트끼리 임의의 메시지를 주고받는다 (커서 위치, 채팅 등)
- **Presence** — 채널에 누가 접속해 있는지 상태를 공유한다
- **Postgres Changes** — Postgres의 논리 복제(WAL)를 읽어 INSERT/UPDATE/DELETE를 밀어준다

</v-clicks>

<v-click>

세 기능 모두 **채널(channel)** 이라는 같은 추상 위에 올라간다.
그리고 Postgres Changes와 private 채널에는 **RLS가 적용된다.**

</v-click>

---

## Storage API — 메타데이터는 Postgres에

<v-clicks>

- 실제 파일 바이트는 오브젝트 스토리지(S3 계열)에, **메타데이터는 Postgres `storage` 스키마**에
- `storage.buckets`, `storage.objects` 테이블이 실제로 존재한다
- 그래서 **파일 접근 권한도 RLS 정책으로 쓴다** — 별도 권한 시스템을 배울 필요가 없다
- S3 호환 엔드포인트, TUS 재개 가능 업로드, 이미지 변환, 글로벌 CDN 제공

</v-clicks>

<v-click>

```sql
-- 파일 권한도 결국 테이블 정책이다
create policy "자기 폴더에만 업로드"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
```

</v-click>

---

## Edge Functions — Deno 런타임

<v-clicks>

- **Deno** 기반 서버리스 함수. TypeScript를 그대로 실행한다
- 전 세계 엣지 로케이션에 배포되어 사용자와 가까운 곳에서 실행된다
- 용도: 웹훅 수신, 외부 API 호출(시크릿 필요), 이메일 발송, 무거운 처리 위임
- 함수 안에서는 `secret key`를 써서 RLS를 우회한 관리자 작업도 가능하다

</v-clicks>

<v-click>

**Vercel의 Route Handler와 역할이 겹친다.** 어느 쪽에 무엇을 둘지는 12장에서 정리한다.
한 줄 요약: *DB에 붙어 있어야 하는 로직은 Supabase, 프론트엔드와 붙어 있어야 하는 로직은 Vercel.*

</v-click>

---

## Supavisor — 커넥션 풀러

서버리스 환경에서 반드시 이해해야 하는 부품.

<v-clicks>

- Postgres는 **연결 하나당 프로세스 하나**를 쓴다. 연결 수가 곧 메모리 비용이다
- 서버리스 함수는 요청마다 새로 뜨고 죽는다 → 연결이 폭발한다
- Supavisor가 앞단에서 연결을 모아 **소수의 실제 연결로 다중화**한다

</v-clicks>

<v-click>

| 방식 | 포트 | 언제 쓰나 |
|---|---|---|
| Direct connection | 5432 | 상시 떠 있는 서버, 마이그레이션, `pg_dump` |
| Supavisor **session** mode | 5432 | IPv4만 되는 환경의 상시 서버 |
| Supavisor **transaction** mode | 6543 | **서버리스 / 엣지 함수** — 짧은 연결이 몰릴 때 |
| Dedicated pooler (PgBouncer) | 6543 | 유료 플랜, 고성능 프로덕션 |

</v-click>

<v-click>

**transaction 모드는 prepared statement를 지원하지 않는다.** ORM 설정에서 꺼야 한다.

</v-click>

---

## pg_meta와 Studio

<v-clicks>

- **pg_meta** — 테이블 생성, 컬럼 추가, 역할 관리 같은 **DDL 작업을 REST로** 노출하는 서버
- **Studio** — 우리가 보는 웹 대시보드. 실제 동작은 pg_meta 호출이다
- 그래서 대시보드에서 클릭으로 만든 테이블은 **결국 SQL DDL이 실행된 것**이다

</v-clicks>

<v-click>

**중요한 함정:** 대시보드 클릭으로 만든 변경은 **마이그레이션 파일로 자동 기록되지 않는다.**
로컬 → 마이그레이션 → 배포 흐름을 쓰지 않으면 스키마가 환경마다 갈라진다. (14장 주제)

</v-click>

---

## 스키마 지도: 무엇이 어디에 있나

| 스키마 | 내용 | API 노출 |
|---|---|---|
| `public` | **내가 만드는 테이블** | ○ (기본 노출) |
| `auth` | `users`, `sessions`, `identities`, `mfa_factors` | ✕ (헬퍼 함수만 사용) |
| `storage` | `buckets`, `objects` | ✕ (Storage API 경유) |
| `realtime` | `messages`, 구독 관리 | ✕ |
| `extensions` | 설치된 확장들 | ✕ |
| `vault` | 암호화된 시크릿 | ✕ |
| `graphql_public` | GraphQL 진입점 | ○ |

<v-click>

`public`이 아닌 스키마(`app`, `private` 등)를 만들어 **API에 노출하지 않는 내부 테이블**을 두는 것이
좋은 습관이다. 노출 스키마는 대시보드의 API Settings에서 관리한다.

</v-click>

---

## API 키와 Postgres 역할의 연결

이 그림이 Supabase 보안 모델의 전부다.

```mermaid {scale: 0.66}
flowchart LR
    PK["publishable key<br/>sb_publishable_..."] -->|"로그인 안 함"| ANON["role: anon"]
    PK -->|"+ 사용자 JWT"| AUTH["role: authenticated<br/>auth.uid() = 사용자 ID"]
    SK["secret key<br/>sb_secret_..."] --> SR["role: service_role"]

    ANON --> RLS["RLS 정책 평가"]
    AUTH --> RLS
    SR --> BYPASS["RLS 우회 (전체 접근)"]

    style PK fill:#ccfbf1,stroke:#0d9488
    style SK fill:#fecaca,stroke:#dc2626
    style BYPASS fill:#fecaca,stroke:#dc2626
```

<v-click>

- **publishable key는 브라우저에 노출해도 된다.** 그 자체로는 아무 권한이 없다
- **secret key는 절대 클라이언트에 두지 않는다.** RLS를 통째로 우회한다
- 예전 이름인 `anon key` / `service_role key`(JWT 형태)는 **2026년 말 폐기 예정**이다

</v-click>

---

## 세 가지 접근 경로 비교

| | Data API (PostgREST) | 직접 연결 (Postgres 프로토콜) | Edge Function |
|---|---|---|---|
| 클라이언트 | `supabase-js`, HTTP | Prisma, Drizzle, `pg` | HTTP 호출 |
| 인증 | JWT + API 키 | DB 사용자/비밀번호 | JWT 또는 커스텀 |
| **RLS 적용** | **○ 자동** | 연결 역할에 따름 (보통 우회) | 어떤 키를 쓰느냐에 따름 |
| 브라우저에서 직접 | ○ | ✕ | ○ |
| 커넥션 풀 필요 | ✕ (HTTP) | **○ (Supavisor)** | 상황에 따라 |
| 적합한 곳 | 사용자 데이터 CRUD | 관리자 도구, 배치, 복잡한 트랜잭션 | 시크릿이 필요한 로직 |

<v-click>

**흔한 실수:** Prisma로 직접 연결하면서 RLS가 적용될 거라 기대하는 것.
직접 연결은 보통 `postgres` 사용자로 붙기 때문에 **RLS가 적용되지 않는다.**

</v-click>

---

## 이 구조에서 나오는 결론들

<v-clicks>

**1. Postgres가 단일 진실 공급원(single source of truth)이다**
사용자도, 파일 메타데이터도, 권한 정책도 전부 한 DB 안에 있다.

**2. 보안의 무게중심이 DB로 내려간다**
"API 서버에서 권한 체크"가 아니라 "DB가 행 단위로 판정"이다.

**3. 프론트엔드가 DB와 직접 대화한다**
중간 계층이 없으니 빠르지만, **RLS를 틀리면 곧바로 데이터 유출**이다.

**4. 부품을 갈아끼울 수 있다**
Data API 대신 직접 연결, Edge Function 대신 Vercel 함수 — 선택지가 열려 있다.

</v-clicks>

---

## 2장 요약

<v-clicks>

- Envoy가 문지기, PostgREST가 API, GoTrue가 신분증 발급소, Postgres가 금고
- 모든 부품이 **하나의 Postgres**를 공유한다 — 이게 통합성과 위험성의 원천
- `publishable key`(공개 가능) / `secret key`(서버 전용) 두 개만 구분하면 된다
- 서버리스에서 직접 연결을 쓸 거면 **Supavisor transaction 모드(6543)** 를 기억한다
- 대시보드 클릭 변경은 마이그레이션으로 남지 않는다 — 처음부터 CLI 흐름을 익힌다

</v-clicks>
