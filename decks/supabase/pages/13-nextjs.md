---
layout: section
---

# 13. Next.js 실전 통합

App Router + @supabase/ssr

---

## 왜 별도 패키지가 필요한가

<v-clicks>

브라우저 전용 `supabase-js`의 기본 동작:

- 세션을 **`localStorage`** 에 저장한다
- 서버는 `localStorage`를 읽을 수 없다 → **SSR에서 사용자를 알 수 없다**

</v-clicks>

<v-click>

`@supabase/ssr`이 하는 일:

- 세션을 **쿠키**에 저장한다 → 요청과 함께 서버로 전달된다
- 서버(미들웨어, Server Component, Route Handler)에서 세션을 읽을 수 있다
- 토큰 갱신 결과를 쿠키에 다시 써 준다

</v-click>

<v-click>

```bash
npm install @supabase/supabase-js @supabase/ssr
```

**주의:** 예전 문서에 나오는 `@supabase/auth-helpers-nextjs`는 구버전이다. **`@supabase/ssr`을 쓴다.**

</v-click>

---

## 환경 변수

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx

# 서버 전용 — NEXT_PUBLIC_ 을 절대 붙이지 않는다
SUPABASE_SECRET_KEY=sb_secret_xxxxx
```

<v-clicks>

- `.env.local`은 `.gitignore`에 포함되어 있어야 한다
- `.env.example`을 커밋해서 어떤 변수가 필요한지 팀에 알린다
- Vercel에서는 Production / Preview / Development 각각에 값을 설정한다

</v-clicks>

<v-click>

```bash
# 로컬 개발에서 로컬 Supabase 스택을 쓸 때
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<supabase start 출력의 anon key>
```

</v-click>

---

## 브라우저 클라이언트

```ts
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}
```

<v-clicks>

- **내부적으로 싱글턴이다.** 여러 번 호출해도 인스턴스는 하나다
- 세션을 쿠키에 저장하므로 서버와 공유된다
- 클라이언트 컴포넌트에서만 쓴다

</v-clicks>

---
class: denser
---

## 서버 클라이언트

```ts
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(list) {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Server Component에서는 쿠키를 쓸 수 없다.
            // 갱신은 미들웨어가 담당하므로 무시해도 안전하다.
          }
        },
      },
    },
  )
}
```

---

## 쿠키 처리 규칙

<v-clicks>

**반드시 `getAll` / `setAll`만 쓴다.**
개별 `get` / `set` / `remove`를 구현하면 세션이 깨질 수 있다.
(토큰이 여러 청크 쿠키로 나뉘어 저장되기 때문이다)

**요청마다 새 클라이언트를 만든다.**
서버에서는 요청마다 쿠키가 다르므로 인스턴스를 재사용하면 안 된다.

**Server Component는 쿠키를 쓸 수 없다.**
그래서 `setAll`을 `try/catch`로 감싼다. 갱신은 미들웨어가 담당한다.

</v-clicks>

<v-click>

```text
sb-<project_ref>-auth-token          ← 기본 쿠키 이름
sb-<project_ref>-auth-token.0        ← 토큰이 크면 청크로 분할된다
sb-<project_ref>-auth-token.1
```

</v-click>

---
class: denser
---

## middleware.ts — 세션 갱신

```ts
// lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )
  // 이 호출이 만료된 토큰을 갱신한다. 절대 생략하지 말 것
  const { data } = await supabase.auth.getClaims()
  return { response, claims: data?.claims ?? null }
}
```

---

## middleware.ts — 라우트 보호까지

```ts
// middleware.ts (프로젝트 루트)
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PROTECTED = ['/dashboard', '/settings', '/api/private']

export async function middleware(request: NextRequest) {
  const { response, claims } = await updateSession(request)
  const { pathname } = request.nextUrl

  if (!claims && PROTECTED.some(p => pathname.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)'],
}
```

---

## middleware 주의사항

<v-clicks>

1. **반드시 `response` 객체를 그대로 반환한다.**
   새 `NextResponse`를 만들어 반환하면 갱신된 쿠키가 유실되고, 사용자가 무작위로 로그아웃된다

2. **`getClaims()` 호출과 `return` 사이에 로직을 최소화한다.**
   그 사이에 리다이렉트하면 쿠키가 안 실릴 수 있다

3. **`getSession()`을 권한 판단에 쓰지 않는다.**
   쿠키는 위조 가능하다. `getClaims()`는 JWT 서명을 검증한다

4. **미들웨어는 방어선이 아니라 UX다.**
   진짜 방어선은 **RLS**다. 미들웨어를 우회해도 데이터는 안전해야 한다

5. **matcher를 좁게 잡는다.**
   정적 자산까지 미들웨어를 태우면 응답 지연과 함수 비용이 늘어난다

</v-clicks>

---

## Server Component에서 데이터 조회

```tsx
// app/posts/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function PostsPage() {
  const supabase = await createClient()

  // 쿠키의 JWT가 자동으로 실린다 → RLS가 이 사용자 기준으로 동작한다
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, title, created_at, profiles ( username )')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw new Error(error.message)

  return (
    <ul>
      {posts?.map(p => <li key={p.id}>{p.title}</li>)}
    </ul>
  )
}
```

<v-click>

`await createClient()`를 **컴포넌트 안에서** 호출한다. 모듈 최상단에서 만들면 요청 간 쿠키가 섞인다.

</v-click>

---

## 라우트 보호 패턴

```tsx
// app/dashboard/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims) redirect('/login')

  return <section>{children}</section>
}
```

<v-clicks>

- **레이아웃에서 한 번 검사**하면 하위 페이지 전체가 보호된다
- 미들웨어와 중복되지만, 미들웨어를 우회하는 경로가 있을 수 있으므로 둘 다 두는 게 안전하다
- 최신 사용자 정보(정지 여부 등)가 필요하면 `getUser()`를 쓴다 (네트워크 왕복 발생)

</v-clicks>

---

## Server Action으로 로그인

```tsx
// app/login/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email')),
    password: String(formData.get('password')),
  })

  if (error) return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' }

  revalidatePath('/', 'layout')   // 캐시된 페이지에 로그인 상태 반영
  redirect('/dashboard')
}
```

<v-click>

Server Action에서는 **쿠키를 쓸 수 있다.** 그래서 로그인/로그아웃은 여기서 처리하는 게 자연스럽다.

</v-click>

---

## Server Action으로 데이터 변경

```tsx
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createPost(formData: FormData) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('posts')
    .insert({ title: String(formData.get('title')) })
    .select()
    .single()

  // RLS에 막히면 error.code === '42501'
  if (error) return { error: error.message }

  revalidatePath('/posts')
  return { data }
}
```

<v-clicks>

- **Server Action은 공개 엔드포인트다.** 누구나 호출할 수 있다고 가정하고 검증한다
- 하지만 RLS가 걸려 있으면 **권한 검사를 한 번 더 안 해도 데이터는 안전하다** — 이게 Supabase의 이점
- `revalidatePath` / `revalidateTag`로 캐시를 무효화하는 걸 잊지 말자

</v-clicks>

---

## Route Handler

```ts
// app/api/export/route.ts
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims) return new Response('Unauthorized', { status: 401 })

  const { data, error } = await supabase.from('posts').select('*').csv()
  if (error) return new Response(error.message, { status: 500 })

  return new Response(data, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="posts.csv"',
    },
  })
}
```

<v-click>

Route Handler는 **OAuth 콜백, 웹훅 수신, 파일 다운로드, 외부 API 프록시**에 쓴다.
단순 데이터 조회는 Server Component가 더 간단하다.
웹훅이 프론트 배포와 독립적으로 살아 있어야 하면 Edge Function 쪽이 낫다 (12·16장).

</v-click>

---

## 클라이언트 컴포넌트에서 조회

```tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function CommentList({ postId }: { postId: number }) {
  const [comments, setComments] = useState<Comment[]>([])
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    supabase
      .from('comments')
      .select('id, body, profiles ( username )')
      .eq('post_id', postId)
      .order('created_at')
      .then(({ data }) => { if (!cancelled) setComments(data ?? []) })

    return () => { cancelled = true }
  }, [postId])

  return <ul>{comments.map(c => <li key={c.id}>{c.body}</li>)}</ul>
}
```

<v-click>

**이 요청은 Vercel을 거치지 않는다.** 브라우저에서 Supabase로 직접 간다 — 함수 비용이 0이다.

</v-click>

---

## Realtime을 클라이언트 컴포넌트에서

```tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function LiveComments({ postId, initial }: Props) {
  const [comments, setComments] = useState(initial)   // 서버에서 받은 초기 데이터

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`comments:${postId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'comments',
        filter: `post_id=eq.${postId}`,
      }, ({ new: row }) => setComments(prev => [...prev, row]))
      .subscribe()

    return () => { supabase.removeChannel(channel) }   // 정리 필수
  }, [postId])

  return <ul>{comments.map(c => <li key={c.id}>{c.body}</li>)}</ul>
}
```

<v-click>

**패턴:** 초기 데이터는 **Server Component**에서, 이후 갱신은 **클라이언트 구독**으로.
첫 렌더가 빠르면서 실시간성도 유지된다.

</v-click>

---

## 캐싱과 동적 렌더링

<v-clicks>

인증이 걸린 페이지에서 가장 위험한 실수는 **사용자별 데이터가 캐시되는 것**이다.

```tsx
// 방법 1: 라우트 전체를 동적으로
export const dynamic = 'force-dynamic'

// 방법 2: 특정 조회만 캐시 제외
import { unstable_noStore as noStore } from 'next/cache'
export default async function Page() {
  noStore()
  // ...
}
```

</v-clicks>

<v-click>

- `cookies()`를 읽으면 Next.js가 자동으로 동적 렌더링으로 전환한다
  → `createClient()`를 쓰는 Server Component는 대체로 자동으로 동적이 된다
- 하지만 **명시하는 편이 안전하다.** 리팩터링 중 조용히 정적으로 바뀔 수 있다
- 공개 데이터(로그인 불필요)는 오히려 적극적으로 캐시하자 — `revalidate`

</v-click>

---

## 관리자 클라이언트 분리

```ts
// lib/supabase/admin.ts
import 'server-only'                    // ← 클라이언트 import 시 빌드 에러
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)
```

```bash
npm install server-only
```

<v-clicks>

- `server-only` 패키지를 import하면 **클라이언트 번들에 포함될 때 컴파일이 실패**한다
- 사람의 주의력에 의존하지 않고 **도구가 막아준다**
- 이 클라이언트는 RLS를 우회하므로, 사용하는 모든 함수에서 권한을 직접 검증한다

</v-clicks>

---

## 타입 공유 구조

```ts
// lib/database.types.ts  ← supabase gen types 결과 (직접 수정하지 않는다)
export type Database = { /* 자동 생성 */ }

// lib/types.ts  ← 사람이 쓰는 별칭
import type { Database } from './database.types'

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type Post = Tables<'posts'>
export type Profile = Tables<'profiles'>
```

```json
{
  "scripts": {
    "db:types": "supabase gen types typescript --local > lib/database.types.ts",
    "db:reset": "supabase db reset && npm run db:types"
  }
}
```

---

## 로그아웃과 세션 정리

```tsx
// app/logout/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  return NextResponse.redirect(new URL('/login', request.url), { status: 302 })
}
```

<v-clicks>

- 로그아웃은 **POST로** 처리한다. GET이면 링크 프리페치나 크롤러가 로그아웃시킬 수 있다
- `signOut()`이 쿠키를 지우려면 **쿠키를 쓸 수 있는 컨텍스트**(Route Handler / Server Action)여야 한다
- 캐시된 페이지에 로그인 상태가 남지 않도록 `revalidatePath('/', 'layout')` 을 함께 호출한다

</v-clicks>

---

## 디렉터리 구조 예시

```text
app/
├── (auth)/login/page.tsx, actions.ts
├── auth/callback/route.ts          # OAuth code → session 교환
├── (app)/dashboard/layout.tsx      # 인증 가드
│   └── posts/page.tsx
├── api/
│   └── stripe/webhook/route.ts     # 또는 Edge Function (16장)
└── logout/route.ts

lib/
├── supabase/
│   ├── client.ts                   # 브라우저
│   ├── server.ts                   # 서버 (RLS 적용)
│   ├── middleware.ts               # 세션 갱신
│   └── admin.ts                    # secret key (server-only)
├── database.types.ts               # 자동 생성
└── types.ts

middleware.ts
supabase/                           # 마이그레이션, 함수, config
```

---

## Next.js 통합 함정 모음

<v-clicks>

1. **미들웨어에서 `response`를 반환하지 않음** → 무작위 로그아웃
2. **`getSession()`으로 권한 판단** → 위조 가능. `getClaims()`를 쓴다
3. **쿠키 핸들러를 `get`/`set`으로 구현** → 청크 쿠키가 깨진다
4. **서버 클라이언트를 모듈 최상단에서 생성** → 요청 간 세션 혼선
5. **secret key를 클라이언트 컴포넌트에서 import** → `server-only`로 막는다
6. **사용자별 페이지가 캐시됨** → 다른 사람의 데이터가 보인다
7. **`revalidatePath` 누락** → 변경했는데 화면이 그대로
8. **Realtime 채널 정리 누락** → StrictMode에서 이벤트 중복
9. **`@supabase/auth-helpers-nextjs` 사용** → 구버전. `@supabase/ssr`로
10. **OAuth 콜백 라우트 누락** → 소셜 로그인이 완료되지 않는다

</v-clicks>

---

## 13장 요약

<v-clicks>

- `@supabase/ssr`이 세션을 **쿠키**로 옮겨 서버에서도 읽게 해준다
- 클라이언트는 4종: **브라우저 / 서버 / 미들웨어 / 관리자(server-only)**
- 쿠키는 반드시 **`getAll` / `setAll`**, 서버 클라이언트는 **요청마다 생성**
- 미들웨어는 **세션 갱신 + UX 리다이렉트**. 진짜 방어선은 RLS
- 초기 데이터는 Server Component, 실시간 갱신은 클라이언트 구독
- 인증 페이지의 **캐싱을 항상 의심**한다

</v-clicks>
