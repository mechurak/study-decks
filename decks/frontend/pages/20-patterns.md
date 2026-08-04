---
layout: section
---

# 20. 실전

프로젝트를 시작하고 유지하는 법

---

## 첫날 체크리스트

```bash
# 1. 프로젝트
pnpm create next-app@latest my-app     # TypeScript, App Router, @/* alias

# 2. shadcn/ui  ← cssVariables는 반드시 true
pnpm dlx shadcn@latest init

# 3. 포매팅 — 미루면 나중에 diff가 지옥이 된다
pnpm add -D prettier prettier-plugin-tailwindcss

# 4. 접근성 린트
pnpm add -D eslint-plugin-jsx-a11y

# 5. 폼·검증
pnpm add react-hook-form @hookform/resolvers zod
```

<v-click>

<div class="pt-2">
2번의 <code>style</code>·<code>baseColor</code>·<code>cssVariables</code>는
<strong>나중에 못 바꾼다.</strong> 이 세 개만은 팀과 상의하고 정한다.
</div>

</v-click>

---

## 첫 주에 정할 것

<v-clicks>

- **폴더 구조** — 4장의 세 층 (`ui/` · `shared/` · `_components/`)
- **토큰** — 브랜드 색, radius, 폰트. 다크 모드도 **처음부터**
- **네이밍 규칙** — 컴포넌트 파일명, prop 이름 (`isOpen` vs `open`)
- **`ui/` 수정 정책** — 누가, 어떤 조건에서, 리뷰는 어떻게
- **컴포넌트 카탈로그** — `/dev/components` 페이지 하나라도

</v-clicks>

<v-click>

<div class="pt-3">
다섯 개 모두 <strong>나중에 하면 몇 배로 비싸진다.</strong>
특히 다크 모드는 나중에 붙이면 토큰 구조를 다시 짜야 한다.
</div>

</v-click>

---

## 컴포넌트 카탈로그를 만드는 가장 싼 방법

```tsx
// app/dev/components/page.tsx — 개발 환경에서만
import { notFound } from 'next/navigation'

export default function ComponentCatalog() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <div className="mx-auto max-w-5xl space-y-12 p-8">
      <Section title="Button">
        <Button>기본</Button>
        <Button variant="outline">아웃라인</Button>
        <Button variant="destructive">삭제</Button>
      </Section>
      <Section title="EmptyState">
        <EmptyState title="항목이 없습니다" action={<Button>추가</Button>} />
      </Section>
    </div>
  )
}
```

<v-click>

<div class="pt-2">
Storybook보다 훨씬 싸고, <strong>"있는 줄 몰라서 다시 만드는" 문제의 90%</strong>를 해결한다.
필요해지면 그때 Storybook으로 옮긴다.
</div>

</v-click>

---

## 실전 패턴 1: 목록 화면

거의 모든 앱에 있는 화면이다. 이 조합이 표준이다.

```tsx
// app/(app)/posts/page.tsx
export default async function PostsPage({ searchParams }: PageProps<'/posts'>) {
  const { q, sort, page } = await searchParams
  return (
    <>
      <PageHeader title="글" action={<Button asChild><Link href="/posts/new">새 글</Link></Button>} />
      <PostFilters />                       {/* 클라이언트 — URL만 조작 */}
      <Suspense key={`${q}-${sort}-${page}`} fallback={<TableSkeleton />}>
        <PostTable q={q} sort={sort} page={page} />   {/* 서버 */}
      </Suspense>
    </>
  )
}
```

<v-clicks>

- 필터는 **클라이언트**, 데이터는 **서버**, 경계는 URL
- `Suspense`의 **`key`가 중요하다** — 검색어가 바뀌면 스켈레톤이 다시 나온다
- 없으면 이전 결과가 남아 있다가 갑자기 바뀐다

</v-clicks>

---

## 실전 패턴 2: 삭제 확인

```tsx
// components/shared/confirm-dialog.tsx
export function ConfirmDialog({
  trigger, title, description, confirmText = '확인', onConfirm,
}: Props) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmText}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

<v-click>

<div class="pt-2">
<strong>`Dialog`가 아니라 `AlertDialog`를 쓴다.</strong>
바깥 클릭·Esc로 실수로 닫히지 않고, 스크린리더에 <code>alertdialog</code> 역할로 알려진다.
</div>

</v-click>

---

## 실전 패턴 3: 낙관적 삭제

```tsx
'use client'
export function PostRow({ post, deleteAction }) {
  const [isDeleting, setIsDeleting] = useState(false)

  return (
    <tr className={cn('transition-opacity', isDeleting && 'opacity-40')}>
      <td>{post.title}</td>
      <td>
        <ConfirmDialog
          trigger={<Button variant="ghost" size="icon" aria-label="삭제">🗑</Button>}
          title="이 글을 삭제할까요?"
          description="되돌릴 수 없습니다."
          onConfirm={async () => {
            setIsDeleting(true)
            const res = await deleteAction(post.id)
            if (res?.error) { setIsDeleting(false); toast.error(res.error) }
          }}
        />
      </td>
    </tr>
  )
}
```

<v-click>

실패하면 **되돌리고 토스트로 알린다.** 성공하면 `revalidateTag`로 목록이 갱신되며 행이 사라진다.

</v-click>

---

## 실전 패턴 4: 로딩 상태 세 단계

<div class="grid grid-cols-3 gap-4 pt-2">

<UiSurface label="① 첫 진입 — 스켈레톤">
<div style="display:flex;flex-direction:column;gap:.5rem">
<div class="ui-skeleton" style="height:1rem;width:60%"></div>
<div class="ui-skeleton" style="height:.8rem"></div>
<div class="ui-skeleton" style="height:.8rem;width:85%"></div>
<div class="ui-skeleton" style="height:.8rem;width:70%"></div>
</div>
</UiSurface>

<UiSurface label="② 갱신 중 — 흐리게 + 유지">
<div style="opacity:.45;font-size:.8rem;line-height:1.7">
<div style="font-weight:600">최근 주문</div>
<div>#1024 · 완료</div>
<div>#1025 · 배송중</div>
<div>#1026 · 준비중</div>
</div>
</UiSurface>

<UiSurface label="③ 액션 중 — 버튼만">
<div style="font-size:.8rem;line-height:1.7">
<div style="font-weight:600">최근 주문</div>
<div>#1024 · 완료</div>
<div style="height:.4rem"></div>
<button class="ui-btn ui-btn--default ui-btn--sm" disabled>저장 중…</button>
</div>
</UiSurface>

</div>

<div class="pt-4 text-sm opacity-70">
②가 자주 빠진다. 필터를 바꿀 때 <strong>전체를 스켈레톤으로 바꾸면 화면이 깜빡인다.</strong>
기존 내용을 흐리게 유지하는 편이 훨씬 안정적으로 느껴진다.
</div>

---

## 안티패턴 모음 (1) — Next.js

<v-clicks>

- **레이아웃 최상단 `use client`** — 앱 전체가 클라이언트가 된다
- **화면용 데이터를 Route Handler로** — 서버 컴포넌트에서 직접 조회하면 된다
- **서버 컴포넌트에서 `fetch('/api/...')`** — 자기 자신을 HTTP로 부르는 낭비
- **`proxy.ts`만 믿는 인증** — Server Function은 그 경로를 안 탈 수 있다
- **의존 없는 쿼리를 `await` 줄줄이** — `Promise.all` 또는 컴포넌트별 조회
- **변경 후 재검증 누락** — DB는 바뀌었는데 화면이 그대로
- **`Suspense`에 `key` 누락** — 필터 바꿔도 스켈레톤이 안 나온다

</v-clicks>

---

## 안티패턴 모음 (2) — Tailwind · shadcn

<v-clicks>

- **동적 클래스 이름 조립** — `` `text-${color}-500` `` 은 절대 동작하지 않는다
- **`@apply`로 컴포넌트 클래스 만들기** — BEM으로 되돌아간다
- **`cn()` 없이 `className` 이어붙이기** — 오버라이드가 안 먹힌다
- **컴포넌트에 원시 색 하드코딩** — `bg-zinc-900`. 테마 교체가 불가능해진다
- **`ui/`에 도메인 로직 삽입** — 재사용성이 죽는다
- **`--diff` 없이 방치** — 업스트림 보안·접근성 수정을 영영 못 받는다
- **`cssVariables: false`** — 되돌리기 매우 어렵다

</v-clicks>

---

## 코드 리뷰 체크리스트

<div class="grid grid-cols-2 gap-6 pt-2 text-sm">
<div>

**경계**
- `use client`가 필요한 최소 범위인가
- 경계를 넘는 props가 직렬화 가능한가
- 비밀 키가 클라이언트로 새지 않는가

**데이터**
- 병렬로 가져올 수 있는데 순차인가
- 변경 후 재검증을 했는가
- Server Function에 인증·검증·인가가 있는가

</div>
<div>

**스타일**
- 원시 색을 직접 쓴 곳이 없는가
- `cn()`으로 className을 병합했는가
- `ui/` 변경이 있다면 표시와 사유가 있는가

**접근성**
- 아이콘 버튼에 이름이 있는가
- 색만으로 정보를 전달하지 않는가
- 키보드로 조작 가능한가

</div>
</div>

---

## 팀에 도입할 때의 순서

<v-clicks>

1. **작은 화면 하나**로 시작한다. 전면 도입 금지
2. 토큰을 먼저 정한다 — 브랜드 색, radius, 다크 모드
3. `shared/` 층을 만들며 **첫 5개 컴포넌트**를 쌓는다
4. `/dev/components` 카탈로그를 만든다
5. `ui/` 수정 정책을 문서화한다
6. 두 번째 프로젝트가 생기면 **레지스트리를 검토**한다

</v-clicks>

<v-click>

<div class="pt-3 text-lg">
1번이 가장 중요하다. <strong>기존 코드를 전부 옮기려는 시도는 대부분 실패한다.</strong>
새로 만드는 화면부터 적용하고 경계를 조금씩 넓힌다.
</div>

</v-click>

---

## 마이그레이션 시 자주 나오는 질문

| 질문 | 답 |
|---|---|
| MUI를 쓰던 프로젝트인데 | 공존 가능하다. 새 화면부터 shadcn으로 |
| Pages Router에서 App Router로 | 라우트 단위로 점진 이전이 지원된다 |
| CSS Modules와 Tailwind 공존 | 가능하다. 새 컴포넌트만 Tailwind |
| styled-components를 쓰고 있다 | RSC와 충돌한다. 이 전환은 미루기 어렵다 |
| Tailwind v3에서 v4로 | 공식 업그레이드 도구가 있다. `@config`로 단계적 이전 |

<v-click>

<div class="pt-3 text-sm opacity-70">
공존이 대부분 가능한 이유는 <strong>Tailwind가 클래스 기반</strong>이고
<strong>shadcn이 내 레포의 파일</strong>이기 때문이다. 충돌할 전역 런타임이 없다.
</div>

</v-click>

---

## 20장 요약

<v-clicks>

- 첫날에 정할 것: **`style` · `baseColor` · `cssVariables`** (나중에 못 바꾼다)
- 첫 주에 정할 것: **폴더 구조 · 토큰 · 네이밍 · `ui/` 정책 · 카탈로그**
- 목록 화면 표준: **클라이언트 필터 + URL + 서버 테이블 + Suspense key**
- 로딩은 세 단계 — 특히 **갱신 중에는 기존 내용을 흐리게 유지**한다
- 안티패턴 1순위: **동적 클래스 조립**과 **레이아웃 `use client`**
- 도입은 **작은 화면 하나부터.** 전면 전환은 대부분 실패한다

</v-clicks>
