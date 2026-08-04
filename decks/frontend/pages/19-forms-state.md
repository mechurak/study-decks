---
layout: section
---

# 19. 폼과 상태

무엇을 어디에 둘 것인가

---

## 상태를 네 종류로 나눈다

<div class="text-lg py-2">
"상태 관리 라이브러리 뭐 써요?"라는 질문은 대부분 <strong>분류가 안 된 상태</strong>에서 나온다.
</div>

| 종류 | 예 | 어디에 둘까 |
|---|---|---|
| **서버 상태** | 글 목록, 사용자 정보 | 서버 컴포넌트 / TanStack Query |
| **URL 상태** | 필터, 정렬, 페이지, 탭 | **searchParams** |
| **폼 상태** | 입력 중인 값 | 폼 컴포넌트 지역 상태 |
| **UI 상태** | 열린 모달, 사이드바 접힘 | `useState` / 소수의 Provider |

<v-click>

<div class="pt-3 text-lg">
이렇게 나누고 나면 <strong>전역 상태 라이브러리가 필요한 경우가 거의 없다.</strong>
</div>

</v-click>

---

## 흔한 오해: 전부 전역에 넣기

<div class="grid grid-cols-2 gap-6 pt-2">
<div>

**❌ 예전 습관**

```ts
// store.ts
{
  user, posts, comments,        // 서버 상태
  filters, sortBy, page,        // URL 상태
  formValues, errors,           // 폼 상태
  isModalOpen, sidebarCollapsed // UI 상태
}
```

전부 한 곳에 있으니
무엇이 어디서 바뀌는지 알 수 없다.

</div>
<div>

**✅ 종류별로**

```tsx
// 서버 상태 — 서버 컴포넌트
const posts = await getPosts()

// URL 상태 — searchParams
const { sort } = await searchParams

// 폼 상태 — 폼 안에
const form = useForm()

// UI 상태 — 필요한 곳에
const [open, setOpen] = useState(false)
```

</div>
</div>

---

## URL 상태를 다루는 법

```tsx {1-8|10-21}
// 서버 쪽 — 읽기
export default async function Page({ searchParams }: PageProps<'/posts'>) {
  const { q = '', sort = 'new', page = '1' } = await searchParams
  const posts = await getPosts({ q, sort, page: Number(page) })
  return (
    <><Filters /><PostList posts={posts} /></>   {/* 필터는 클라이언트, 목록은 서버 */}
  )
}

// 클라이언트 쪽 — 쓰기
'use client'
export function Filters() {
  const router = useRouter()
  const params = useSearchParams()

  function setSort(sort: string) {
    const next = new URLSearchParams(params)
    next.set('sort', sort)
    next.delete('page')          // 정렬이 바뀌면 1페이지로
    router.push(`?${next}`)
  }
}
```

<v-click>

`nuqs` 같은 라이브러리를 쓰면 이 보일러플레이트가 `useQueryState`로 줄어든다.

</v-click>

---

## 폼: React Hook Form + zod

shadcn/ui의 `Form` 컴포넌트가 전제하는 조합이다.

```tsx {1-9|11-20}
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('올바른 이메일을 입력하세요'),
  password: z.string().min(8, '8자 이상이어야 합니다'),
})
type Values = z.infer<typeof schema>

export function LoginForm() {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>{/* FormField들 */}</form>
    </Form>
  )
}
```

---

## 스키마를 서버와 공유한다

이것이 이 조합의 진짜 이점이다.

```ts
// lib/schemas.ts — 양쪽에서 import한다
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})
```

<div class="grid grid-cols-2 gap-6 pt-2">
<div>

```tsx
// 클라이언트 — 즉각적인 피드백
useForm({ resolver: zodResolver(LoginSchema) })
```

</div>
<div>

```ts
// 서버 — 진짜 방어선
'use server'
const parsed = LoginSchema.safeParse(input)
if (!parsed.success) return { error: '...' }
```

</div>
</div>

<v-click>

<div class="pt-3 text-lg">
<strong>클라이언트 검증은 UX, 서버 검증은 보안이다.</strong>
같은 스키마를 쓰면 둘이 어긋나지 않는다. 하나만 한다면 반드시 서버 쪽이다.
</div>

</v-click>

---

## 폼 상태를 눈으로

<div class="grid grid-cols-3 gap-4 pt-2">

<UiSurface label="입력 중">
<label class="ui-label">이메일</label>
<input class="ui-input" value="dev@examp" readonly />
<div class="ui-help">회사 이메일을 입력하세요</div>
</UiSurface>

<UiSurface label="blur 후 검증 실패">
<label class="ui-label">이메일</label>
<input class="ui-input" value="dev@examp" aria-invalid="true" readonly />
<div class="ui-error">올바른 이메일을 입력하세요</div>
</UiSurface>

<UiSurface label="제출 중">
<label class="ui-label">이메일</label>
<input class="ui-input" value="dev@example.com" readonly />
<div style="height:.55rem"></div>
<button class="ui-btn ui-btn--default" disabled style="width:100%">확인 중…</button>
</UiSurface>

</div>

<div class="pt-4 text-sm opacity-70">
검증 시점 기본값은 <code>onSubmit</code>이다. 입력하는 동안 빨갛게 되는 것은
대체로 <strong>나쁜 UX</strong>다 — 다 치기도 전에 틀렸다고 알린다.
<code>mode: 'onBlur'</code> 또는 제출 후 <code>onChange</code>가 무난하다.
</div>

---

## Server Function과 함께 쓰기

```tsx
'use client'
export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, {})
  const form = useForm({ resolver: zodResolver(LoginSchema) })

  return (
    <Form {...form}>
      {/* action에 formAction을 넘기면 점진적 향상이 유지된다 */}
      <form action={formAction} onSubmit={form.handleSubmit(() => {})}>
        <FormField name="email" render={/* ... */} />
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <Button disabled={isPending}>로그인</Button>
      </form>
    </Form>
  )
}
```

<v-click>

<div class="pt-2 text-sm opacity-70">
두 시스템을 겹쳐 쓰는 것은 다소 번거롭다.
<strong>단순한 폼이면 Server Function + <code>useActionState</code>만으로 충분</strong>하고,
필드가 많고 동적 검증이 복잡할 때 RHF를 더한다.
</div>

</v-click>

---

## 서버 상태를 클라이언트에서 다뤄야 할 때

<v-clicks>

기준: **폴링·무한스크롤·낙관적 목록 갱신**이 필요한가?

- 아니오 → **서버 컴포넌트**. 라이브러리 필요 없음
- 예 → **TanStack Query** 또는 SWR

</v-clicks>

```tsx
// 서버에서 첫 데이터를 주고, 클라이언트가 이어받는 조합
export default async function Page() {
  const initial = await getNotifications()
  return <NotificationList initialData={initial} />
}

'use client'
function NotificationList({ initialData }) {
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    initialData,                 // 첫 렌더는 서버 데이터로 — 로딩이 없다
    refetchInterval: 30_000,
  })
}
```

---

## 전역 클라이언트 상태가 진짜 필요할 때

<v-clicks>

- 장바구니 (여러 화면에서 읽고 쓴다)
- 편집기의 실행 취소 스택
- 실시간 협업 커서 위치
- 위저드의 여러 단계에 걸친 입력

</v-clicks>

<v-click>

<div class="pt-3">
이럴 때 선택지: <strong>Zustand</strong>(가장 가볍고 RSC와 잘 맞음),
<strong>Jotai</strong>(원자 단위), <strong>Redux Toolkit</strong>(이미 쓰고 있다면).
</div>

</v-click>

<v-click>

<div class="pt-3 text-lg">
하지만 먼저 <strong>정말 전역인지</strong> 의심한다.
"두 컴포넌트가 공유"는 전역이 아니라 <strong>공통 부모</strong>의 문제인 경우가 많다.
</div>

</v-click>

---

## 결정표

| 질문 | 답 |
|---|---|
| 서버에 있는 데이터인가? | 서버 컴포넌트에서 조회 |
| 새로고침해도 남아야 하나? | URL(searchParams) |
| 링크로 공유돼야 하나? | URL |
| 뒤로가기가 동작해야 하나? | URL |
| 이 컴포넌트만 아는가? | `useState` |
| 형제 둘이 공유하나? | 공통 부모로 올린다 |
| 앱 전체가 쓰나? | Provider 또는 Zustand |
| 실시간 갱신이 필요한가? | TanStack Query |

---

## 19장 요약

<v-clicks>

- 상태를 **서버 / URL / 폼 / UI** 네 종류로 나누면 대부분 해결된다
- 필터·정렬·페이지는 **URL이 정답**이다 — 공유·뒤로가기가 공짜
- 폼은 **RHF + zod**, 스키마를 **서버와 공유**한다
- **클라이언트 검증은 UX, 서버 검증은 보안** — 하나만 한다면 서버
- 폴링·무한스크롤이 아니면 **TanStack Query가 필요 없다**
- 전역 상태는 마지막 수단. 대부분 **공통 부모**로 해결된다

</v-clicks>
