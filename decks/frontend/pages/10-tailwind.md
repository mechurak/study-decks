---
layout: section
---

# 10. Tailwind CSS v4

CSS 자체가 설정 파일이 되었다

---

## 설치 — 이게 전부다

```bash
pnpm add tailwindcss @tailwindcss/postcss postcss
```

```js
// postcss.config.mjs
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
export default config
```

```css
/* app/globals.css */
@import "tailwindcss";
```

<v-click>

<div class="pt-2">
<strong><code>tailwind.config.js</code>가 없다.</strong> v4에서는 설정이 CSS 안으로 들어왔다.
v3의 <code>@tailwind base; @tailwind components; @tailwind utilities;</code> 세 줄도
<code>@import "tailwindcss"</code> 한 줄로 대체됐다.
</div>

</v-click>

---

## v3에서 온 사람이 가장 먼저 놀라는 것

| | v3 | v4 |
|---|---|---|
| 설정 파일 | `tailwind.config.js` | CSS의 `@theme` |
| 진입점 | `@tailwind` 3줄 | `@import "tailwindcss"` |
| PostCSS 플러그인 | `tailwindcss` + `autoprefixer` | `@tailwindcss/postcss` 하나 |
| content 경로 지정 | 직접 배열로 | **자동 탐지** |
| 색 공간 | rgb/hsl | **oklch** |
| 커스텀 값 접근 | JS import | **CSS 변수로 항상 노출** |
| 빌드 엔진 | PostCSS 기반 | Rust 기반 (Oxide) |

<v-click>

<div class="pt-2 text-sm opacity-70">
v3 설정 파일이 필요하면 <code>@config "../tailwind.config.js";</code>로 불러올 수 있다.
마이그레이션 중간 단계용이다.
</div>

</v-click>

---

## `@theme` — 디자인 토큰이 곧 유틸리티

```css
@import "tailwindcss";

@theme {
  --color-brand-500: oklch(0.72 0.11 178);
}
```

<v-clicks>

이 한 줄이 세 가지를 동시에 만든다.

- `bg-brand-500`, `text-brand-500`, `border-brand-500`, `fill-brand-500`… **유틸리티 전부**
- `var(--color-brand-500)` — 일반 **CSS 변수**로도 쓸 수 있다
- 자동완성 — 에디터가 이 값을 알게 된다

</v-clicks>

<v-click>

<div class="pt-3">
<code>:root</code>에 변수를 정의하는 것과 다르다.
<strong><code>@theme</code>은 유틸리티 클래스를 생성한다.</strong> 유틸리티가 필요 없으면 <code>:root</code>를 쓴다.
</div>

</v-click>

---
class: dense
---

## 네임스페이스가 곧 규칙

이름 앞부분이 **어떤 유틸리티가 만들어질지**를 결정한다.

| 네임스페이스 | 생성되는 것 |
|---|---|
| `--color-*` | `bg-*`, `text-*`, `border-*`, `fill-*`, `ring-*` |
| `--spacing-*` | `p-*`, `m-*`, `gap-*`, `w-*`, `h-*` |
| `--font-*` | `font-sans`, `font-serif` |
| `--text-*` | `text-sm`, `text-xl` (크기) |
| `--radius-*` | `rounded-*` |
| `--shadow-*` | `shadow-*` |
| `--breakpoint-*` | `sm:`, `md:`, `lg:` 변형 |
| `--container-*` | `@sm:`, `@md:` 컨테이너 쿼리 변형 |
| `--animate-*` | `animate-*` |

---

## 기본 스케일을 눈으로

<div class="grid grid-cols-2 gap-8">
<div>

<div class="demo-note">간격 — spacing</div>
<ScaleViz kind="spacing" />

</div>
<div>

<div class="demo-note">모서리 — radius</div>
<ScaleViz kind="radius" />

<div class="demo-note pt-3">그림자 — shadow</div>
<ScaleViz kind="shadow" />

</div>
</div>

---

## 타이포 스케일

<ScaleViz kind="text" />

<div class="pt-3 text-sm opacity-70">
<code>text-*</code>는 폰트 크기와 <strong>줄 높이를 함께</strong> 설정한다.
줄 높이만 따로 바꾸려면 <code>leading-*</code>을 쓴다.
</div>

---

## 색 팔레트

<ColorScale name="zinc — 기본 중립색" :colors="['#fafafa','#f4f4f5','#e4e4e7','#d4d4d8','#a1a1aa','#71717a','#52525b','#3f3f46','#27272a','#18181b','#09090b']" />
<ColorScale name="indigo" :colors="['#eef2ff','#e0e7ff','#c7d2fe','#a5b4fc','#818cf8','#6366f1','#4f46e5','#4338ca','#3730a3','#312e81','#1e1b4b']" />
<ColorScale name="emerald" :colors="['#ecfdf5','#d1fae5','#a7f3d0','#6ee7b7','#34d399','#10b981','#059669','#047857','#065f46','#064e3b','#022c22']" />
<ColorScale name="rose" :colors="['#fff1f2','#ffe4e6','#fecdd3','#fda4af','#fb7185','#f43f5e','#e11d48','#be123c','#9f1239','#881337','#4c0519']" />

<div class="pt-2 text-sm opacity-70">
숫자는 <strong>밝기</strong>다. 50이 가장 밝고 950이 가장 어둡다.
텍스트는 보통 700~900, 배경은 50~100, 강조는 500~600을 쓴다.
</div>

---
class: dense
---

## 변형(variant) — 조건부 스타일

```html
<button class="bg-zinc-900 hover:bg-zinc-700 focus-visible:ring-2
               disabled:opacity-50 dark:bg-white dark:text-zinc-900
               md:px-6 lg:px-8">
```

| 변형 | 의미 |
|---|---|
| `hover:` `focus:` `active:` | 상태 의사 클래스 |
| `sm:` `md:` `lg:` `xl:` | 최소 폭 (모바일 우선) |
| `dark:` | 다크 모드 |
| `group-hover:` | **부모**에 호버했을 때 |
| `peer-checked:` | **형제**가 체크됐을 때 |
| `data-[state=open]:` | 임의의 data 속성 |
| `has-[:checked]:` | 자식 조건 (CSS `:has()`) |
| `@md:` | **컨테이너** 크기 기준 |

---

## 반응형은 모바일 우선

`md:grid-cols-2`는 "md에서만"이 아니라 **"md 이상에서"**다.

<ResponsiveDemo />

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

---

## group과 peer

부모/형제 상태에 반응하는 것을 **JS 없이** 한다.

```html
<!-- group: 부모에 호버하면 자식이 반응한다 -->
<a class="group flex items-center gap-2 rounded-md p-3 hover:bg-zinc-100">
  <span class="text-zinc-500 group-hover:text-zinc-900">아이콘</span>
  <span class="group-hover:translate-x-1 transition">더보기</span>
</a>

<!-- peer: 앞의 형제 상태를 뒤의 형제가 읽는다 -->
<input type="checkbox" class="peer sr-only" id="agree" />
<label for="agree"
  class="border peer-checked:border-indigo-500 peer-checked:bg-indigo-50">
  동의합니다
</label>
```

<v-click>

`data-[state=open]:rotate-180` 같은 변형은 **Base UI/Radix가 붙여주는 data 속성**과 짝을 이룬다.
shadcn/ui 컴포넌트가 이 패턴을 광범위하게 쓴다. (15장)

</v-click>

---

## 임의 값 — 스케일 밖으로 나가야 할 때

```html
<div class="top-[117px] grid-cols-[1fr_500px_2fr] bg-[#1da1f2]">
<div class="w-[calc(100%-2rem)] text-[color:var(--brand)]">
<div class="[mask-image:linear-gradient(to_bottom,black,transparent)]">
```

<v-clicks>

- 대괄호 안에 **아무 CSS 값**이나 넣을 수 있다. 공백은 밑줄 `_`로
- 마지막 형태는 **임의 속성** — Tailwind에 유틸리티가 없는 CSS 속성도 쓸 수 있다
- 하지만 **자주 쓰면 냄새**다. 반복된다면 `@theme`에 토큰으로 승격시킨다

</v-clicks>

<v-click>

<div class="pt-3">
좋은 신호: 임의 값이 <strong>한 번만</strong> 나타난다.
나쁜 신호: <code>bg-[#1da1f2]</code>가 12군데에 흩어져 있다.
</div>

</v-click>

---

## 반드시 알아야 할 제약: 클래스 이름은 정적이어야 한다

Tailwind는 **소스 파일을 텍스트로 스캔**해서 필요한 CSS를 만든다.
그래서 문자열을 조립하면 찾지 못한다.

```tsx
// ❌ 절대 동작하지 않는다 — 빌드 시 이런 문자열이 존재하지 않는다
<div className={`text-${color}-500`} />
<div className={`p-${size}`} />

// ✅ 완전한 클래스 이름을 나열한다
const colorClass = {
  red: 'text-red-500',
  blue: 'text-blue-500',
}[color]

// ✅ 또는 CSS 변수로 넘긴다 (동적 값이 진짜 필요할 때)
const barStyle = { '--bar-width': `${percent}%` } as React.CSSProperties
<div style={barStyle} className="w-[var(--bar-width)]" />
```

<v-click>

<div class="pt-2">
이건 Tailwind를 처음 쓰는 사람이 <strong>거의 반드시</strong> 한 번은 겪는 문제다.
개발 중엔 되는 것처럼 보이다가 프로덕션 빌드에서 스타일이 사라지기도 한다.
</div>

</v-click>

---
class: dense
---

## 다크 모드

```css
/* v4에서는 다크 모드 전략도 CSS로 선언한다. 기본값은 prefers-color-scheme */
@custom-variant dark (&:where(.dark, .dark *));
```

<div class="grid grid-cols-2 gap-6 pt-1">
<UiSurface label="light" theme="shadcn"><GalleryDemo /></UiSurface>
<UiSurface label="dark" theme="dark"><GalleryDemo theme="dark" /></UiSurface>
</div>

<div class="pt-1 text-sm opacity-70">
직접 토글하게 하려면 위처럼 클래스 기반으로 바꾸고 <code>next-themes</code>를 쓴다.
</div>

---
class: dense
---

## 유용한 유틸리티 몇 가지

| 유틸리티 | 하는 일 |
|---|---|
| `space-y-4` | 자식들 사이에만 세로 간격 (첫 요소 위엔 없음) |
| `divide-y` | 자식들 사이에 구분선 |
| `truncate` | 한 줄 말줄임 (`overflow`+`text-overflow`+`whitespace`) |
| `line-clamp-3` | 3줄 말줄임 |
| `sr-only` | 화면엔 안 보이고 **스크린리더에만** 읽힘 |
| `size-9` | `w-9 h-9` |
| `inset-0` | `top/right/bottom/left: 0` |
| `aspect-video` | 16:9 비율 유지 |
| `field-sizing-content` | 입력 내용에 맞춰 textarea 자동 크기 |

---

## 10장 요약

<v-clicks>

- v4는 **설정 파일이 사라지고** CSS의 `@theme`이 그 역할을 한다
- `@theme`의 변수는 **유틸리티 + CSS 변수**를 동시에 만든다
- 네임스페이스(`--color-*`, `--spacing-*`…)가 어떤 유틸리티가 생길지 결정한다
- 변형은 `hover:` `md:` `dark:` `group-` `peer-` `data-[]` `has-[]` `@md:`
- **클래스 이름은 반드시 정적**이어야 한다. 문자열 조립은 동작하지 않는다
- 임의 값 `[...]`은 탈출구지만, 반복되면 토큰으로 승격시킨다

</v-clicks>
