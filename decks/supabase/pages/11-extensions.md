---
layout: section
---

# 11. 확장으로 넓히기

Postgres를 쓴다는 것의 진짜 이점

---

## 확장(extension)이라는 개념

<v-clicks>

- Postgres는 **확장을 설치해 기능을 추가**할 수 있다. 새 타입, 함수, 인덱스, 백그라운드 작업까지
- Supabase는 50개 이상의 확장을 미리 준비해 두고 **토글 하나로 켤 수 있게** 해준다
- 이것이 "그냥 Postgres다"의 실질적 가치다 — **별도 인프라 없이 기능이 늘어난다**

</v-clicks>

<v-click>

<div class="pt-4">
벡터 검색이 필요하다고 Pinecone을 붙이고,<br>
스케줄러가 필요하다고 별도 워커를 띄우고,<br>
큐가 필요하다고 Redis를 붙이는 대신 —<br>
<strong>같은 DB 안에서 해결되는 경우가 많다.</strong>
</div>

</v-click>

---

## 확장 설치하기

```sql
-- 스키마를 지정해서 설치하는 것이 관례다 (public 오염 방지)
create extension if not exists vector with schema extensions;
create extension if not exists pg_cron;
create extension if not exists pg_net;   -- pg_net은 자체 net 스키마에 고정된다
create extension if not exists pgmq;

-- 설치된 확장 확인
select name, default_version, installed_version
from pg_available_extensions
where installed_version is not null;
```

<v-clicks>

- 대시보드 **Database → Extensions** 에서 토글로도 가능하다
- **마이그레이션 파일에 넣어두는 것을 권한다** — 새 환경에서 재현된다
- 일부 확장은 슈퍼유저 권한이 필요해 Supabase가 대신 처리한다

</v-clicks>

---

## pgvector (1) — 임베딩 검색이란

```mermaid {scale: 0.66}
flowchart LR
    T["텍스트<br/>'환불 정책이 뭔가요'"] --> E["임베딩 모델"]
    E --> V["벡터<br/>[0.02, -0.31, ...]"]
    V --> S["벡터 인덱스에서<br/>가장 가까운 이웃 검색"]
    S --> R["의미가 비슷한 문서"]

    style V fill:#ccfbf1,stroke:#0d9488
```

<v-clicks>

- 키워드가 겹치지 않아도 **의미가 비슷하면 찾아낸다**
- RAG(검색 증강 생성), 유사 문서 추천, 중복 탐지 등에 쓰인다
- **pgvector는 `vector` 타입과 거리 연산자를 Postgres에 추가**한다
  → 별도 벡터 DB 없이 **일반 컬럼과 함께 조건 검색**이 가능하다

</v-clicks>

---

## pgvector (2) — 스키마와 인덱스

```sql
create extension if not exists vector with schema extensions;

create table public.documents (
  id         bigint generated always as identity primary key,
  owner_id   uuid not null default auth.uid() references auth.users (id),
  content    text not null,
  embedding  extensions.vector(1536),      -- 모델의 차원 수에 맞춘다
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;

-- 근사 최근접 인덱스 (HNSW). 거리 함수에 맞는 연산자 클래스를 지정한다
create index documents_embedding_idx
  on public.documents
  using hnsw (embedding extensions.vector_cosine_ops);
```

<v-clicks>

- `<->` 유클리드 · `<=>` 코사인 · `<#>` 내적 — **인덱스와 쿼리의 연산자가 일치해야** 한다
- 인덱스 없이도 동작하지만 행이 많아지면 급격히 느려진다
- HNSW는 정확도·속도 균형이 좋고, IVFFlat은 메모리를 덜 쓴다

</v-clicks>

---

## pgvector (3) — 검색 함수와 호출

```sql
create or replace function public.match_documents(
  query_embedding extensions.vector(1536),
  match_count int default 5,
  similarity_threshold float default 0.7
)
returns table (id bigint, content text, similarity float)
language sql stable
set search_path = ''
as $$
  select d.id, d.content, 1 - (d.embedding operator(extensions.<=>) query_embedding)
  from public.documents d
  where 1 - (d.embedding operator(extensions.<=>) query_embedding) > similarity_threshold
  order by d.embedding operator(extensions.<=>) query_embedding
  limit match_count;
$$;
```

```ts
const embedding = await getEmbedding(userQuestion)   // 외부 모델 호출
const { data } = await supabase.rpc('match_documents', {
  query_embedding: embedding, match_count: 5,
})
```

<v-click>

**RLS와 함께 쓸 수 있다는 게 핵심 이점이다.** "내 문서 중에서만 유사 검색"이 자연스럽게 된다.

</v-click>

---

## pg_cron — 스케줄 작업

```sql
create extension if not exists pg_cron;

-- 매일 새벽 3시에 오래된 로그 삭제
select cron.schedule(
  'purge-old-logs',
  '0 3 * * *',
  $$ delete from public.logs where created_at < now() - interval '90 days' $$
);

-- 5분마다 머티리얼라이즈드 뷰 갱신
select cron.schedule(
  'refresh-stats', '*/5 * * * *',
  $$ refresh materialized view concurrently public.daily_stats $$
);

-- 확인 / 해제
select * from cron.job;
select * from cron.job_run_details order by start_time desc limit 20;
select cron.unschedule('purge-old-logs');
```

<v-click>

**별도 스케줄러 인프라가 필요 없다.** Vercel Cron, GitHub Actions와 달리
DB 안에서 실행되므로 네트워크 왕복과 인증이 없다.

</v-click>

---

## pg_net — DB에서 HTTP 호출

```sql
create extension if not exists pg_net;

-- 비동기 HTTP 요청 (즉시 리턴, 응답은 나중에 테이블에 쌓인다)
select net.http_post(
  url     := 'https://<ref>.supabase.co/functions/v1/notify',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.secret_key')
  ),
  body    := jsonb_build_object('order_id', 123)
) as request_id;

-- 응답 확인
select * from net._http_response order by created desc limit 10;
```

<v-clicks>

- **Database Webhooks의 실체가 이것**이다
- 비동기라서 트랜잭션을 막지 않는다 — 대신 **결과를 기다릴 수 없다**
- 트리거 안에서 호출할 때는 실패해도 원래 작업이 롤백되지 않는다는 점을 감안한다

</v-clicks>

---

## pgmq — 메시지 큐

```sql
create extension if not exists pgmq;

select pgmq.create('email_jobs');                       -- 큐 생성

-- 메시지 넣기 (트리거 안에서 호출하면 트랜잭션과 함께 커밋된다)
select pgmq.send('email_jobs', jsonb_build_object('to', 'a@b.com', 'tpl', 'welcome'));

-- 꺼내기 (30초 동안 다른 소비자에게 안 보이게 잠금)
select * from pgmq.read('email_jobs', 30, 10);

-- 처리 완료
select pgmq.delete('email_jobs', msg_id);
```

<v-clicks>

- **트랜잭션 안에서 큐잉이 된다** — "주문 생성과 이메일 작업 등록"이 원자적으로 묶인다
- 재시도, 가시성 타임아웃, 아카이브 같은 큐의 기본기를 제공한다
- 소비자는 pg_cron으로 주기 실행하거나 Edge Function으로 폴링한다

</v-clicks>

---

## Foreign Data Wrappers

다른 시스템의 데이터를 **Postgres 테이블처럼** 조회한다.

```sql
create extension if not exists wrappers with schema extensions;

-- 예: Stripe 데이터를 테이블처럼
create foreign table stripe.customers (
  id text, email text, name text, created timestamp
) server stripe_server options ( object 'customers' );

-- 우리 DB 테이블과 조인까지 된다
select p.username, c.email
from public.profiles p
join stripe.customers c on c.id = p.stripe_customer_id;
```

<v-clicks>

- 지원 대상 예: Stripe, S3, BigQuery, ClickHouse, Firebase, Airtable, Redis 등
- **데이터를 복제해 오지 않고** 조회 시점에 원본을 읽는다
- 분석·대시보드 용도에 유용하다. 다만 **성능은 원격 API에 종속**된다

</v-clicks>

---

## Vault — 시크릿 저장

```sql
-- 시크릿 저장 (암호화되어 저장된다)
select vault.create_secret('sk_live_xxxxx', 'stripe_key', 'Stripe 시크릿 키');

-- 복호화해서 읽기 (권한이 있는 역할만)
select decrypted_secret from vault.decrypted_secrets where name = 'stripe_key';
```

<v-clicks>

- DB 안에서 외부 API 키가 필요할 때(예: pg_net으로 웹훅 호출) 평문으로 두지 않기 위한 장치
- **백업/덤프에도 암호화된 상태로 들어간다**
- 애플리케이션 시크릿의 주 저장소로 쓰기보다는, **DB 내부 로직이 쓰는 키**에 적합하다

</v-clicks>

---
class: dense
---

## 기타 알아둘 확장들

| 확장 | 용도 |
|---|---|
| `pg_stat_statements` | 쿼리별 실행 통계 — **성능 문제의 출발점** |
| `pg_trgm` | 부분 문자열 유사도 검색, 오타 허용 검색 |
| `postgis` | 지리 정보 — 거리 계산, 반경 검색 |
| `pg_graphql` | GraphQL 엔드포인트 (`/graphql/v1`) |
| `http` | 동기 HTTP 요청 (pg_net과 달리 응답을 기다린다) |
| `hypopg` | 가상 인덱스로 효과를 미리 실험 |
| `index_advisor` | 쿼리를 보고 인덱스를 제안 |
| `pgaudit` | 감사 로그 |
| `pgroonga` | 한국어·일본어 형태소 기반 전문 검색 |

---

## 조합 패턴 — cron + queue + edge function

"매일 밤 미발송 알림을 모아 이메일로 보낸다"

```mermaid {scale: 0.6}
flowchart LR
    A["pg_cron<br/>매일 02:00"] --> B["SQL: 대상 조회<br/>→ pgmq.send()"]
    B --> C["pg_cron<br/>1분마다"]
    C --> D["pg_net으로<br/>Edge Function 호출"]
    D --> E["Edge Function<br/>큐 읽기 → 메일 발송"]
    E --> F["pgmq.delete()<br/>또는 재시도"]

    style A fill:#ccfbf1,stroke:#0d9488
    style E fill:#fef3c7,stroke:#d97706
```

<v-clicks>

- 외부 인프라 0개. 큐도, 스케줄러도, 워커도 전부 프로젝트 안에 있다
- 트랜잭션 경계가 명확하다 — 큐잉이 원본 작업과 함께 커밋된다
- 규모가 커지면 이 구조를 그대로 유지한 채 소비자만 밖으로 빼면 된다

</v-clicks>

---

## 11장 요약

<v-clicks>

- 확장은 "Postgres를 쓴다"의 실질적 배당금이다 — **인프라를 늘리지 않고 기능이 는다**
- `pgvector`: 임베딩 검색을 **RLS와 함께** 쓸 수 있다
- `pg_cron`: 스케줄러, `pg_net`: DB발 HTTP, `pgmq`: 트랜잭션 큐
- `wrappers`: 외부 시스템을 테이블처럼, `vault`: DB 내부용 시크릿
- 확장 설치는 **마이그레이션에 기록**해서 환경 간 재현성을 지킨다
- 다만 무엇이든 DB에 몰아넣으면 DB가 병목이 된다 — **규모에 따라 밖으로 뺄 계획**도 세워둔다

</v-clicks>
