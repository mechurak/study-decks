---
layout: section
---

# 11. Tailwind 실전

긴 클래스와 함께 살아가는 법

---

## 긴 클래스 문자열 읽는 법

익숙해지면 이건 문장이 아니라 **표**로 보인다.

<ClassAnatomy :groups="[['레이아웃','inline-flex items-center justify-center gap-2'],['크기','h-9 px-4 py-2'],['타이포','text-sm font-medium whitespace-nowrap'],['색상','bg-primary text-primary-foreground'],['테두리','rounded-md border border-transparent'],['상태','hover:bg-primary/90 focus-visible:ring-2 disabled:opacity-50'],['애니메이션','transition-colors']]" />

<div class="pt-4 text-sm opacity-70">
클래스를 <strong>항상 같은 순서</strong>로 쓰면 눈이 자동으로 그룹을 나눈다.
그 순서를 사람이 지키는 대신 <strong>도구가 강제</strong>하게 만드는 것이 첫 번째 실전 규칙이다.
</div>

---

## 규칙 1: 클래스 정렬을 자동화한다

```bash
pnpm add -D prettier prettier-plugin-tailwindcss
```

```js
// prettier.config.mjs
export default {
  plugins: ['prettier-plugin-tailwindcss'],
}
```

<v-clicks>

- 저장할 때마다 클래스가 **공식 권장 순서**로 재배열된다
- 팀원마다 순서가 다를 일이 없어진다
- **diff가 깨끗해진다** — 같은 스타일이면 항상 같은 문자열
- 중복 클래스도 눈에 띄게 된다

</v-clicks>

<v-click>

<div class="pt-3">
설정이 한 줄이고 효과가 크다. <strong>프로젝트 시작할 때 반드시 넣는다.</strong>
</div>

</v-click>

---

## 규칙 2: `cn()` 유틸리티를 만든다

조건부 클래스를 붙이다 보면 반드시 이 문제를 만난다.

```tsx
// 기본은 p-4, 특정 상황에선 p-8
<div className={`p-4 ${isLarge ? 'p-8' : ''}`} />
```

<v-click>

<div class="pt-2">
결과 문자열: <code>"p-4 p-8"</code>.
<strong>CSS에서는 나중에 정의된 규칙이 이긴다.</strong> 클래스를 쓴 순서가 아니다.
Tailwind가 생성한 CSS에서 <code>.p-4</code>와 <code>.p-8</code> 중 누가 뒤에 있는지에 따라 결과가 갈린다.
</div>

</v-click>

<v-click>

<div class="pt-3 text-lg">
그래서 <strong>"뒤에 오는 클래스가 이기게" 병합해 주는 함수</strong>가 필요하다.
</div>

</v-click>

---

## `cn()`의 정체

```ts
// lib/utils.ts — shadcn/ui init이 자동으로 만들어 주는 파일
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

<div class="grid grid-cols-2 gap-6 pt-3">
<div>

**clsx** — 조건부 조립

```ts
clsx('p-4', isLarge && 'p-8', {
  'bg-red-500': hasError,
})
// → "p-4 p-8 bg-red-500"
```

</div>
<div>

**tailwind-merge** — 충돌 해소

```ts
twMerge('p-4 p-8')         // → "p-8"
twMerge('px-2 p-4')        // → "p-4"
twMerge('text-sm text-lg') // → "text-lg"
```

</div>
</div>

<v-click>

<div class="pt-3">
<code>tailwind-merge</code>는 <strong>어떤 유틸리티끼리 충돌하는지 알고 있다.</strong>
<code>px-2</code>가 <code>p-4</code>에 흡수된다는 것까지 안다.
</div>

</v-click>

---

## `cn()`이 여는 것: 오버라이드 가능한 컴포넌트

```tsx {1-11|13-17}
// components/ui/card.tsx
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-lg border bg-card p-6 shadow-sm', className)}
      {...props}
    />
  )
}

// 쓰는 쪽에서 필요한 것만 덮어쓴다
<Card />                                // 기본
<Card className="p-4" />                // 패딩만 좁게 — p-6가 제대로 밀려난다
<Card className="border-destructive" /> // 테두리 색만
```

<v-click>

<div class="pt-2">
<strong>이 패턴이 shadcn/ui 전체를 관통한다.</strong>
모든 컴포넌트가 <code>className</code>을 받아 <code>cn()</code>으로 병합한다.
</div>

</v-click>

---

## 규칙 3: variant는 `cva`로 관리한다

variant가 셋을 넘어가면 삼항 연산자가 무너진다.

```ts
import { cva } from 'class-variance-authority'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-white',
        outline: 'text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)
```

---

## `cva`를 직접 움직여 보기

<CvaDemo />

<div class="pt-2 text-sm opacity-70">
왼쪽은 <code>cva</code>가 조립한 최종 className, 오른쪽은 그 결과다.
variant와 size가 <strong>독립적으로 조합</strong>되는 것이 핵심이다.
</div>

---

## `compoundVariants` — 조합에만 적용되는 규칙

```ts
const button = cva('...', {
  variants: {
    variant: { default: '...', outline: '...' },
    size: { sm: 'h-8 px-3', lg: 'h-10 px-8' },
  },
  compoundVariants: [
    {
      variant: 'outline',
      size: 'sm',
      class: 'border-2',    // outline이면서 sm일 때만
    },
  ],
  defaultVariants: { variant: 'default', size: 'default' },
})
```

<v-click>

타입도 함께 얻는다.

```ts
import { type VariantProps } from 'class-variance-authority'
type ButtonProps = VariantProps<typeof button>
// { variant?: 'default' | 'outline', size?: 'sm' | 'lg' }
```

</v-click>

---

## 규칙 4: `@apply`를 쓰지 않는다

```css
/* ❌ 유혹적이지만 하지 말 것 */
.btn {
  @apply inline-flex items-center rounded-md bg-primary px-4 py-2;
}
```

<v-clicks>

- Tailwind가 없앤 문제(**이름 짓기, 전역 CSS, 못 지우는 코드**)를 그대로 되살린다
- 이 `.btn`이 어디서 쓰이는지 다시 알 수 없게 된다
- 결국 `.btn-sm`, `.btn-primary-outline`이 생기고 BEM으로 되돌아간다
- Tailwind 제작자 본인이 **"이걸 만든 걸 후회한다"**고 여러 차례 언급했다

</v-clicks>

<v-click>

<div class="pt-3 text-lg">
반복이 보이면 CSS 클래스가 아니라 <strong>컴포넌트를 만든다.</strong>
</div>

</v-click>

---

## `@apply`가 정당한 드문 경우

<v-clicks>

- **서드파티가 뱉는 마크업**을 스타일링해야 할 때 (에디터, 캘린더 위젯)
- **마크다운 렌더 결과** — `h1`, `p` 같은 태그에 직접 걸어야 할 때
- 컴포넌트로 감쌀 수 없는 **글로벌 리셋**

</v-clicks>

```css
/* 마크다운 본문 — 마크업을 우리가 만들지 않는다 */
.prose h2 {
  @apply mt-8 text-2xl font-semibold tracking-tight;
}
```

<v-click>

<div class="pt-2 text-sm opacity-70">
공통점: <strong>마크업에 클래스를 붙일 수 없는 상황</strong>이라는 것.
그게 아니라면 컴포넌트가 답이다.
</div>

</v-click>

---

## 커스텀 유틸리티가 필요하면 `@utility`

v4는 `@apply` 대신 **진짜 유틸리티를 추가하는 방법**을 제공한다.

```css
@import "tailwindcss";

@utility scrollbar-none {
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}

@utility text-pretty-balance {
  text-wrap: pretty;
}
```

<v-click>

<div class="pt-2">
이제 <code>scrollbar-none</code>이 진짜 유틸리티가 된다 —
<code>hover:</code>, <code>md:</code> 같은 변형도 붙일 수 있다.
<code>@apply</code>로 만든 클래스는 그게 안 된다.
</div>

</v-click>

---

## 규칙 5: 언제 컴포넌트로 뽑을 것인가

| 상황 | 판단 |
|---|---|
| 같은 클래스 조합이 **2번** 나타남 | 그냥 둔다 |
| **3번 이상** + 함께 바뀔 것이 확실 | 컴포넌트로 뽑는다 |
| 클래스는 같은데 **의미가 다름** | 뽑지 않는다 |
| 마크업 구조까지 같음 | 컴포넌트로 뽑는다 |

<v-click>

<div class="pt-3">
성급한 추상화가 더 큰 비용이다.
<strong>"이 둘이 앞으로도 같이 바뀔까?"</strong>가 유일하게 의미 있는 질문이다.
우연히 지금 같아 보이는 것을 묶으면 나중에 분리하는 데 더 든다.
</div>

</v-click>

---

## 자주 쓰는 조합 치트시트

```html
<!-- 중앙 정렬 -->
<div class="flex items-center justify-center">
<div class="grid place-items-center">

<!-- 카드 그리드 -->
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

<!-- 좌우 끝 정렬 -->
<div class="flex items-center justify-between">

<!-- 컨테이너 -->
<div class="mx-auto w-full max-w-5xl px-4">

<!-- 스택 (자식 사이 간격만) -->
<div class="flex flex-col gap-4">

<!-- 텍스트 잘림 방지 (flex 안에서 필수) -->
<div class="flex"><span class="min-w-0 truncate">아주 긴 텍스트…</span></div>

<!-- 종횡비 유지 -->
<div class="relative aspect-video overflow-hidden rounded-lg">
```

<v-click>

`min-w-0`은 flex 자식이 안 줄어드는 문제의 해결책이다. **모르면 한 시간을 태운다.**

</v-click>

---

## 11장 요약

<v-clicks>

- **prettier-plugin-tailwindcss**로 클래스 순서를 자동 정렬한다 — 무조건 넣는다
- **`cn()` = clsx + tailwind-merge.** 조건부 조립 + 충돌 해소
- 모든 컴포넌트가 `className`을 받아 `cn()`으로 병합 → **오버라이드 가능**
- variant가 셋 이상이면 **`cva`**. 타입도 함께 얻는다
- **`@apply`는 쓰지 않는다.** 마크업에 클래스를 못 붙이는 상황만 예외
- 커스텀 유틸리티는 **`@utility`**로 만든다 (변형이 붙는다)

</v-clicks>
