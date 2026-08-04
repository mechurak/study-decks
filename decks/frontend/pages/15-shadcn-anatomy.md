---
layout: section
---

# 15. 컴포넌트 해부

`button.tsx`를 한 줄씩

---

## 이 장의 목적

<div class="text-xl py-4 leading-relaxed">
"내 코드"라고 하는데 <strong>읽을 수 없으면</strong> 소유한 게 아니다.
</div>

<v-clicks>

- `button.tsx`는 60줄 남짓이다. 전부 이해할 수 있는 분량이다
- 여기 쓰인 패턴이 **나머지 70개 컴포넌트에도 똑같이** 나온다
- 한 번 읽어두면 어떤 컴포넌트든 열어서 고칠 수 있다

</v-clicks>

---

## 전체 골격

```tsx
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(base, { variants: { variant, size }, defaultVariants })

function Button({ className, variant, size, render, ...props }) {
  return <Component className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
```

<v-clicks>

- **cva로 클래스 조합 정의** → **cn으로 사용자 오버라이드 병합** → **나머지 props는 통과**
- `buttonVariants`를 **함께 export**하는 것이 중요하다. 이유는 뒤에서
- 세 줄짜리 구조다. 나머지는 클래스 문자열의 길이일 뿐이다

</v-clicks>

---

## 베이스 클래스 — 모든 variant가 공유하는 것

```ts
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap " +
  "rounded-md text-sm font-medium transition-all shrink-0 outline-none " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] " +
  "aria-invalid:ring-destructive/20 aria-invalid:border-destructive " +
  "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  { /* … */ }
)
```

<ClassAnatomy :groups="[['레이아웃','inline-flex items-center justify-center gap-2 shrink-0'],['타이포','whitespace-nowrap text-sm font-medium'],['테두리','rounded-md outline-none'],['상태','disabled:opacity-50 focus-visible:ring-[3px] aria-invalid:border-destructive'],['애니메이션','transition-all']]" />

---

## 눈여겨볼 세 가지

<v-clicks>

**1. `focus-visible:` 이지 `focus:` 가 아니다**
마우스 클릭에는 링이 안 나오고 **키보드 탭 이동에만** 나온다. 접근성과 미관을 둘 다 잡는다.

**2. `aria-invalid:` 변형**
`aria-invalid="true"`만 붙이면 테두리가 자동으로 destructive가 된다.
**스타일을 위해 별도 prop을 만들 필요가 없다** — 접근성 속성이 곧 스타일 훅이다.

**3. `[&_svg]:pointer-events-none`**
자식 SVG에 적용되는 임의 셀렉터. 아이콘이 클릭을 가로채는 문제를 원천 차단한다.

</v-clicks>

---

## `aria-invalid` 를 눈으로

<div class="grid grid-cols-2 gap-6 pt-3">
<UiSurface label="기본">
<label class="ui-label">이메일</label>
<input class="ui-input" value="dev@example.com" readonly />
<div class="ui-help">회사 이메일을 입력하세요</div>
</UiSurface>

<UiSurface label='aria-invalid="true" 만 추가'>
<label class="ui-label">이메일</label>
<input class="ui-input" value="dev@" aria-invalid="true" readonly />
<div class="ui-error">올바른 이메일 형식이 아닙니다</div>
</UiSurface>
</div>

<div class="pt-4 text-sm opacity-70">
클래스는 양쪽 모두 <code>ui-input</code> 하나다.
<strong>스크린리더가 읽는 속성과 시각적 표시가 같은 소스에서 나온다</strong> — 둘이 어긋날 수 없다.
</div>

---

## variant 정의

```ts
variants: {
  variant: {
    default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
    destructive: 'bg-destructive text-white shadow-xs hover:bg-destructive/90',
    outline: 'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline',
  },
  size: {
    default: 'h-9 px-4 py-2',
    xs: 'h-7 rounded-sm px-2 text-xs',
    sm: 'h-8 rounded-md px-3',
    lg: 'h-10 rounded-md px-6',
    icon: 'size-9',
    'icon-sm': 'size-8',
    'icon-lg': 'size-10',
  },
},
defaultVariants: { variant: 'default', size: 'default' },
```

---

## 여기서 하나도 원시 색이 없다

<v-clicks>

- `bg-primary`, `text-primary-foreground`, `border`, `bg-accent`…
- **`bg-zinc-900`이 단 한 번도 안 나온다**
- 그래서 17장에서 토큰만 갈아끼우면 전부 따라 바뀐다

</v-clicks>

<div class="pt-3">
<BtnMatrix :sizes="false" />
</div>

<div class="pt-3">
<BtnMatrix theme="material" :sizes="false" />
</div>

<div class="pt-3 text-sm opacity-70">
위아래 두 줄은 <strong>같은 코드</strong>다. 아래는 토큰만 Material 3 값으로 바꾼 것이다.
</div>

---

## `/90` 은 무엇인가

```css
hover:bg-primary/90
```

<v-clicks>

- **투명도 수식어**다. `--primary` 색을 90% 불투명도로 쓴다
- `hover:bg-primary-600` 같은 **별도 토큰을 만들 필요가 없다**
- 어떤 테마를 넣어도 "조금 연해진 primary"가 자동으로 나온다

</v-clicks>

<v-click>

<div class="pt-3 text-sm opacity-70">
단점도 있다. 배경이 어두우면 투명도로 밝아지고, 밝으면 어두워진다.
정밀한 호버 색이 필요한 디자인 시스템에서는 <code>--primary-hover</code> 토큰을 따로 두기도 한다.
</div>

</v-click>

---

## 함수 본문

```tsx
function Button({
  className,
  variant,
  size,
  render,
  ...props
}: React.ComponentProps<'button'> &
   VariantProps<typeof buttonVariants> &
   { render?: React.ReactElement }) {
  return (
    <BaseButton
      data-slot="button"
      render={render}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}
```

<v-clicks>

- `React.ComponentProps<'button'>` — **`<button>`이 받는 모든 속성**을 그대로 받는다
- `VariantProps<typeof buttonVariants>` — cva에서 **타입을 자동 추출**한다
- `...props` 통과 — `onClick`, `type`, `aria-label`, `form` 전부 그냥 동작한다

</v-clicks>

---

## `forwardRef`가 사라졌다

```tsx
// React 18 시절
const Button = React.forwardRef<HTMLButtonElement, Props>(
  ({ className, ...props }, ref) => <button ref={ref} {...props} />
)
Button.displayName = 'Button'

// React 19 — ref가 그냥 prop이다
function Button({ className, ref, ...props }: Props) {
  return <button ref={ref} {...props} />
}
```

<v-click>

<div class="pt-2">
오래된 shadcn 자료에는 <code>forwardRef</code>가 잔뜩 나온다.
지금 CLI가 주는 코드는 이 형태가 아니다. <strong>둘을 섞어 쓰면 혼란스러워진다.</strong>
</div>

</v-click>

---

## `data-slot` — 바깥에서 스타일링하는 훅

```tsx
<BaseButton data-slot="button" ... />
```

<v-clicks>

- 모든 shadcn 컴포넌트가 `data-slot` 속성을 갖는다
- 부모에서 **자식의 특정 부분만** 겨냥할 수 있다

</v-clicks>

```tsx
// 이 카드 안의 버튼만 전부 작게
<Card className="[&_[data-slot=button]]:h-8">
  <Button>저장</Button>
  <Button>취소</Button>
</Card>
```

<v-click>

<div class="pt-2 text-sm opacity-70">
남용하면 읽기 어려워지지만, <strong>컴포넌트를 수정하지 않고 예외를 만드는</strong> 탈출구로 유용하다.
</div>

</v-click>

---

## `buttonVariants`를 export하는 이유

버튼처럼 보여야 하지만 **`<button>`이 아니어야 할 때**가 있다.

```tsx
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

// 링크를 버튼처럼
<Link href="/pricing" className={buttonVariants({ variant: 'outline' })}>
  요금제 보기
</Link>
```

<v-click>

<div class="pt-2">
<code>&lt;Button render={&lt;Link /&gt;}&gt;</code>로 하는 것보다 이쪽이 권장된다.
클래스만 필요한 경우에 <strong>컴포넌트 합성 오버헤드를 만들 이유가 없기</strong> 때문이다.
</div>

</v-click>

---

## 합성 컴포넌트 — Card를 예로

단일 컴포넌트가 아니라 **여러 조각의 묶음**으로 제공되는 것들이 있다.

```tsx
<Card>
  <CardHeader>
    <CardTitle>월간 리포트</CardTitle>
    <CardDescription>2026년 7월</CardDescription>
    <CardAction><Button variant="ghost" size="icon">⋯</Button></CardAction>
  </CardHeader>
  <CardContent>
    <Chart data={data} />
  </CardContent>
  <CardFooter>
    <Button>내보내기</Button>
  </CardFooter>
</Card>
```

<v-click>

<div class="pt-2">
props로 <code>title</code>, <code>description</code>, <code>footer</code>를 받는 대신 <strong>구조를 열어둔다.</strong>
"제목 옆에 배지를 넣고 싶다" 같은 요구가 왔을 때 컴포넌트를 안 고쳐도 된다.
</div>

</v-click>

---

## 합성의 결과물

<div class="grid grid-cols-2 gap-6 pt-2">
<UiSurface label="기본 조합" :padded="false">
<div class="ui-card">
  <div class="ui-card__header">
    <div class="ui-card__title">월간 리포트</div>
    <div class="ui-card__desc">2026년 7월</div>
  </div>
  <div class="ui-card__content">
    <div class="ui-progress"><div class="ui-progress__bar" style="width:74%"></div></div>
    <div style="height:.5rem"></div>
    <div style="font-size:.78rem;opacity:.7">목표 대비 74% 달성</div>
  </div>
  <div class="ui-card__footer">
    <button class="ui-btn ui-btn--default ui-btn--sm">내보내기</button>
    <button class="ui-btn ui-btn--ghost ui-btn--sm">공유</button>
  </div>
</div>
</UiSurface>

<UiSurface label="구조를 열어뒀기에 가능한 변형" :padded="false">
<div class="ui-card">
  <div class="ui-card__header">
    <div style="display:flex;align-items:center;gap:.5rem">
      <div class="ui-card__title">월간 리포트</div>
      <span class="ui-badge ui-badge--destructive">지연</span>
    </div>
    <div class="ui-card__desc">2026년 7월 · 검토 필요</div>
  </div>
  <div class="ui-card__content">
    <div class="ui-alert ui-alert--destructive" style="padding:.5rem .7rem">
      <div><div class="ui-alert__desc">3건의 데이터가 누락되었습니다</div></div>
    </div>
  </div>
  <div class="ui-card__footer">
    <button class="ui-btn ui-btn--destructive ui-btn--sm">확인</button>
  </div>
</div>
</UiSurface>
</div>

<div class="pt-3 text-sm opacity-70">
오른쪽을 만들기 위해 <code>card.tsx</code>를 <strong>한 줄도 수정하지 않았다.</strong>
</div>

---

## `render` 프롭 — 태그를 바꾸기

```tsx
// Base UI 방식 — 렌더할 엘리먼트를 직접 넘긴다
<Tabs.Trigger render={<a href="/settings" />}>설정</Tabs.Trigger>

// Radix 방식 (구버전 자료) — 자식으로 넘긴다
<Tabs.Trigger asChild>
  <a href="/settings">설정</a>
</Tabs.Trigger>
```

<v-clicks>

- 용도: **동작은 그대로 두고 렌더되는 태그만 바꾸고 싶을 때**
- 예: 탭 트리거를 실제 링크로, 버튼을 `<label>`로
- `render`는 병합 지점이 명시적이라 디버깅이 쉽다

</v-clicks>

---

## 15장 요약

<v-clicks>

- 구조는 세 줄이다: **cva 정의 → cn 병합 → props 통과**
- **원시 색이 한 번도 안 나온다.** 전부 의미 토큰이다 → 테마 교체가 가능한 이유
- `focus-visible:`, `aria-invalid:`, `[&_svg]:` — **접근성 속성이 스타일 훅**이다
- React 19에서 **`forwardRef`는 필요 없다**. `ref`가 그냥 prop
- `data-slot`으로 **컴포넌트를 수정하지 않고** 예외를 만들 수 있다
- `buttonVariants` export → **링크를 버튼처럼** 보이게 할 때
- 합성 컴포넌트는 **구조를 열어둬서** 변형 요구를 흡수한다

</v-clicks>
