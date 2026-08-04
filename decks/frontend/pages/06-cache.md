---
layout: section
---

# 6. 캐싱

Next.js에서 가장 오해가 많았던 부분

---

## 왜 이 장이 필요한가

<v-clicks>

- Next.js 13~14의 캐싱은 **악명이 높았다.** "왜 데이터가 안 바뀌지"가 가장 흔한 질문이었다
- 원인: 캐시가 **암묵적으로 켜져 있었고**, 계층이 네 개나 됐다
- Next.js 16은 이걸 **Cache Components**라는 모델로 다시 설계했다
- 핵심 변화: **기본은 캐시 안 함. 캐시하려면 명시한다.**

</v-clicks>

<v-click>

<div class="pt-4 text-lg">
검색으로 찾은 <code>revalidate = 60</code>, <code>fetch(url, { next: { revalidate } })</code> 같은 코드는
<strong>이전 모델</strong>이다. 여전히 동작하지만 새로 배울 것은 이쪽이 아니다.
</div>

</v-click>

---

## 켜기

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
}

export default nextConfig
```

<v-clicks>

- 이걸 켜면 **부분 프리렌더링(PPR)이 기본 동작**이 된다
- 캐시되지 않은 데이터 접근은 **반드시 Suspense 안에** 있어야 한다 — 아니면 개발 중에 경고가 뜬다
- 강제성이 있는 대신, 모든 라우트가 **즉시 뜨는 정적 껍데기**를 갖게 된다

</v-clicks>

---

## `use cache` — 두 가지 층위

<div class="grid grid-cols-2 gap-6 pt-2">
<div>

**데이터 레벨**

```tsx
import { cacheLife } from 'next/cache'

export async function getUsers() {
  'use cache'
  cacheLife('hours')
  return db.query('SELECT * FROM users')
}
```

여러 컴포넌트가 같은 데이터를 쓸 때.

</div>
<div>

**UI 레벨**

```tsx
export default async function Page() {
  'use cache'
  cacheLife('hours')

  const users = await db.query('...')
  return <UserList users={users} />
}
```

렌더 결과까지 통째로 캐시.

</div>
</div>

<v-click>

<div class="pt-3">
<strong>인자와 클로저로 잡힌 값이 자동으로 캐시 키가 된다.</strong>
<code>getUser(1)</code>과 <code>getUser(2)</code>는 별개 엔트리다.
</div>

</v-click>

---
class: dense
---

## `cacheLife` — 수명을 정한다

```tsx
import { cacheLife } from 'next/cache'

async function BlogPosts() {
  'use cache'
  cacheLife('hours')      // 프로파일 이름으로 지정
  // ...
}
```

| 프로파일 | 대략의 성격 |
|---|---|
| `seconds` | 거의 실시간에 가까운 데이터 |
| `minutes` | 자주 바뀌는 목록 |
| `hours` | 블로그 글, 상품 정보 |
| `days` | 카테고리, 설정값 |
| `max` | 사실상 안 바뀌는 것 |

<v-click>

<div class="pt-2 text-sm opacity-70">
문서는 <strong>모든 캐시 지시자에 <code>cacheLife</code>를 짝지어 쓰기를 권장</strong>한다.
안 쓰면 암묵적 <code>default</code> 프로파일이 적용된다 — 예전 모델의 실수를 반복하지 않으려는 장치다.
</div>

</v-click>

---

## `cacheTag` + `revalidateTag` — 온디맨드 무효화

시간이 아니라 **사건**을 기준으로 갱신한다.

```tsx {1-9|11-18}
// 읽는 쪽: 태그를 붙인다
import { cacheLife, cacheTag } from 'next/cache'

async function BlogPosts() {
  'use cache'
  cacheLife('hours')
  cacheTag('posts')
  const res = await fetch('https://api.example.com/posts')
  return <List items={await res.json()} />
}

// 쓰는 쪽: 글을 발행하면 태그를 무효화한다
'use server'
import { revalidateTag } from 'next/cache'

export async function publishPost(data: FormData) {
  await db.post.create({ /* ... */ })
  revalidateTag('posts')      // 이 태그를 쓰는 모든 캐시가 갱신 대상
}
```

<v-click>

CMS 웹훅에서 Route Handler로 받아 `revalidateTag`를 호출하는 것이 전형적인 패턴이다.

</v-click>

---

## 캐시하지 않는 데이터는 Suspense로

<div class="text-lg py-2">
매 요청 새로 읽어야 하는 데이터에는 <strong><code>use cache</code>를 쓰지 않는다.</strong>
대신 Suspense로 감싼다.
</div>

```tsx
import { Suspense } from 'react'

async function LatestPosts() {
  const data = await fetch('https://api.example.com/posts')
  return <List items={await data.json()} />
}

export default function Page() {
  return (
    <>
      <h1>My Blog</h1>
      <Suspense fallback={<p>불러오는 중…</p>}>
        <LatestPosts />
      </Suspense>
    </>
  )
}
```

<v-click>

fallback이 **정적 껍데기에 포함되어 즉시 전송**되고, 실제 내용은 요청 시점에 흘러온다.

</v-click>

---

## 런타임 API도 마찬가지다

`cookies()`, `headers()`, `searchParams`, `params` — 요청이 있어야 알 수 있는 것들.

```tsx
import { cookies } from 'next/headers'
import { Suspense } from 'react'

async function UserGreeting() {
  const cookieStore = await cookies()
  const theme = cookieStore.get('theme')?.value || 'light'
  return <p>테마: {theme}</p>
}

export default function Page() {
  return (
    <>
      <h1>대시보드</h1>
      <Suspense fallback={<p>불러오는 중…</p>}>
        <UserGreeting />
      </Suspense>
    </>
  )
}
```

<v-click>

<div class="pt-2">
<strong>중요한 변화:</strong> 예전 모델에서는 <code>cookies()</code>를 한 번만 읽어도
<strong>라우트 전체가 동적</strong>이 됐다. 이제는 그 Suspense 경계 안쪽만 동적이다.
</div>

</v-click>

---

## 정적 껍데기를 최대한 키우기

```tsx {1-8|10-19}
// ❌ 레이아웃 최상단에서 params를 await — 껍데기를 만들 수 없다
export default async function Layout({ children, params }: LayoutProps<'/shop/[slug]'>) {
  const { slug } = await params
  return (
    <div><Sidebar /><h1>{slug}</h1>{children}</div>
  )
}

// ✅ await를 경계 안쪽으로 밀어 넣는다
export default function Layout({ children, params }: LayoutProps<'/shop/[slug]'>) {
  return (
    <div>
      <Sidebar />
      <Suspense fallback={<h1>불러오는 중…</h1>}>
        {params.then(({ slug }) => <SlugHeading slug={slug} />)}
      </Suspense>
      {children}
    </div>
  )
}
```

<v-click>

**비동기 작업이 트리 깊은 곳에 있을수록 프리렌더할 수 있는 영역이 넓어진다.**

</v-click>

---

## 세 가지가 한 페이지에 공존한다

```mermaid {scale: 0.62}
flowchart TB
    subgraph shell["정적 껍데기 — CDN에서 즉시"]
        A["헤더 · 내비게이션<br/>(순수 계산)"]
        B["블로그 목록<br/>('use cache')"]
        C["사용자 설정 자리<br/>(Suspense fallback)"]
    end
    C -.요청 시 스트리밍.-> D["cookies() 읽어<br/>실제 설정 표시"]

    style A fill:#dcfce7,stroke:#15803d
    style B fill:#dbeafe,stroke:#1e40af
    style C fill:#fef3c7,stroke:#92400e
    style D fill:#fef3c7,stroke:#92400e
```

<v-clicks>

- 초록: 빌드 타임에 확정 — 순수 계산, 모듈 import
- 파랑: `use cache` — 모두에게 같은 내용, 캐시에서
- 노랑: 요청 시 — 사용자마다 다른 내용, 스트리밍

</v-clicks>

---

## `use cache: private` — 사용자별 캐시

쿠키·헤더를 **직접 읽으면서도** 수명을 가질 수 있다.

```tsx
async function UserSidebar() {
  'use cache: private'
  cacheLife('minutes')
  const session = (await cookies()).get('session')?.value
  return <Nav items={await getNavFor(session)} />
}
```

<v-clicks>

- 결과가 **브라우저에만** 저장된다. 서버 공유 캐시에 들어가지 않는다
- 프리페치에 포함될 수 있어 클릭 시 이미 준비돼 있다
- 사용자별로 다른 내용을 캐시해야 할 때의 정답

</v-clicks>

---

## `use cache: remote` — 인스턴스 간 공유 캐시

```tsx
async function ExpensiveReport(params: { month: string }) {
  'use cache: remote'
  cacheLife('hours')
  return renderReport(await runHeavyQuery(params.month))
}
```

<v-clicks>

- 기본 `use cache`의 런타임 저장소는 **인스턴스 메모리**다. 서버리스에서는 요청마다 날아갈 수 있다
- `remote`는 **cache handler**를 통해 durable 스토리지에 저장한다 — 인스턴스가 바뀌어도 유지된다
- 대신 **네트워크 왕복 비용**이 든다. 문서 표현대로 **적중률이 높을 때만 이득**이다

</v-clicks>

<v-click>

<div class="pt-2 text-sm opacity-70">
빌드 ID가 캐시 키에 포함되므로 <strong>새로 배포하면 remote 캐시도 초기화</strong>된다.
</div>

</v-click>

---

## 저장 위치 정리

| 저장소 | 무엇이 들어가나 | 수명 제어 |
|---|---|---|
| **프리렌더 HTML** | 정적 껍데기, ISR로 승격된 페이지 | `revalidate` / `expire` |
| **인스턴스 메모리** | 기본 `use cache` 런타임 결과 | 프로세스 수명 |
| **remote 스토어** | `use cache: remote` | cache handler 설정 |
| **브라우저** | 프리페치된 RSC 페이로드, `use cache: private` | `stale` |

<div class="pt-3 text-sm opacity-70">
전부 <strong>배포 단위로 스코프</strong>된다. 새 배포는 새 캐시에서 시작한다.
</div>

---

## 무작위 값과 현재 시각

캐시 모델에서 `Math.random()`, `Date.now()`는 애매한 존재다. Next.js는 **명시하라고 요구**한다.

<div class="grid grid-cols-2 gap-6 pt-2">
<div>

**요청마다 달라야 한다**

```tsx
import { connection } from 'next/server'

async function UniqueContent() {
  await connection()      // 요청 시점으로 미룬다
  const uuid = crypto.randomUUID()
  return <p>요청 ID: {uuid}</p>
}
// + Suspense로 감싼다
```

</div>
<div>

**모두 같아도 된다**

```tsx
export default async function Page() {
  'use cache'
  const buildId = crypto.randomUUID()
  return <p>빌드 ID: {buildId}</p>
}
```

</div>
</div>

<v-click>

<div class="pt-2 text-sm opacity-70">
외우지 않아도 된다. 개발 중 오버레이가
<code>blocking-prerender-random</code> 같은 진단을 띄우고 고치는 방법을 알려준다.
</div>

</v-click>

---

## 런타임 프리페칭

`use cache`가 만든 결과는 **링크를 프리페치할 때 미리 준비**될 수 있다.

```mermaid {scale: 0.6}
sequenceDiagram
    participant U as 사용자
    participant B as 브라우저
    participant S as 서버
    Note over B: /search?q=shoes 링크가 뷰포트에 들어옴
    B->>S: 프리페치 (destination URL 포함)
    S-->>B: 정적 껍데기 + searchParams로 해결된 캐시 결과
    Note over U: 아직 클릭 안 함
    U->>B: 클릭
    Note over B: 기다릴 것이 없음 — 즉시 표시
```

<v-click>

<div class="pt-2 text-sm opacity-70">
비용은 프리페치 대상 링크마다 서버 호출 한 번이다.
<code>partialPrefetching</code> 설정과 <code>&lt;Link prefetch&gt;</code>로 조절한다.
</div>

</v-click>

---

## 봇과 크롤러는 다르게 처리된다

<v-clicks>

- 사람의 브라우저 → 정적 껍데기를 즉시 받고 나머지는 스트리밍
- **봇·크롤러 → 껍데기를 건너뛰고 전체를 요청 시점에 렌더**해서 완성된 HTML을 준다
- SEO를 위한 배려지만 **함정이 하나 있다**

</v-clicks>

<v-click>

<div class="pt-3">
껍데기가 <strong>빌드 타임에만 존재하는 데이터</strong>에 의존하고 있으면,
사람에게는 잘 뜨는 페이지가 <strong>크롤러에게는 실패</strong>할 수 있다.
껍데기가 쓰는 데이터는 요청 시점에도 접근 가능해야 한다.
</div>

</v-click>

---

## 예전 모델과의 대응표

| 하려던 일 | 예전 (13~15) | 지금 (Cache Components) |
|---|---|---|
| 페이지 정적 생성 | 기본값 (암묵적) | `use cache` 명시 |
| 60초마다 갱신 | `export const revalidate = 60` | `cacheLife('minutes')` |
| fetch 결과 캐시 | `fetch(url, { next: { revalidate: 60 } })` | 함수에 `use cache` + `cacheLife` |
| 캐시 안 함 | `cache: 'no-store'` | 아무것도 안 붙임 (기본) |
| 동적 렌더 강제 | `export const dynamic = 'force-dynamic'` | Suspense + 런타임 API |
| 태그 무효화 | `revalidateTag` | `revalidateTag` (동일) |
| 부분 프리렌더 | `experimental.ppr` | 기본 동작 |

---

## 6장 요약

<v-clicks>

- Cache Components는 **"기본은 캐시 안 함, 캐시는 명시"**로 뒤집은 모델이다
- `use cache`는 **데이터 함수와 컴포넌트 양쪽**에 붙일 수 있다
- **`cacheLife`를 항상 짝지어** 쓴다. `cacheTag` + `revalidateTag`로 사건 기반 무효화
- 캐시 안 하는 것·런타임 API는 **Suspense로 감싼다** → 나머지는 정적 껍데기로 남는다
- `private`는 사용자별(브라우저), `remote`는 인스턴스 공유(durable)
- **await를 트리 아래로 밀수록 껍데기가 커진다**

</v-clicks>
