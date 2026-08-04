---
layout: section
---

# 17. 디자인 시스템 적용

이미 있는 시스템을 어떻게 얹는가

---

## 먼저 해보고 시작하자

아래 버튼을 눌러보면, 이 장이 무엇을 하려는지 한 번에 이해된다.

<ThemeSwitcher />

<div class="pt-3 text-sm opacity-70">
카드·버튼·배지·탭·프로그레스 — <strong>마크업은 한 글자도 바뀌지 않는다.</strong>
바뀌는 것은 오른쪽 아래에 표시된 CSS 변수 세 줄뿐이다.
</div>

---

## 디자인 시스템의 네 구성요소

<div class="grid grid-cols-2 gap-6 pt-2">
<div>

1. **토큰** — 색·타이포·간격·모션
2. **컴포넌트** — 그 토큰을 쓰는 UI 조각
3. **패턴** — "폼은 이렇게 배치한다" 같은 규칙
4. **문서** — 언제 무엇을 쓰는지

</div>
<div>

이 중 **코드로 옮겨야 하는 것은 1과 2**다.

그리고 **1을 제대로 하면 2는 거의 따라온다** —
15장에서 봤듯 shadcn 컴포넌트에는
원시 색이 하나도 없기 때문이다.

</div>
</div>

<v-click>

<div class="pt-4 text-lg">
그래서 이 장의 작업량은 <strong>대부분 토큰 매핑</strong>이다.
</div>

</v-click>

---

## 세 가지 시나리오

| 시나리오 | 상황 | 난이도 |
|---|---|---|
| **A. 브랜드 색만 입힌다** | 디자인 시스템은 없고 브랜드 컬러만 있다 | 30분 |
| **B. 유명 디자인 시스템을 채택** | Material 3, Radix Colors 등을 따른다 | 반나절 |
| **C. 사내 디자인 시스템 매핑** | Figma에 정의된 사내 토큰이 있다 | 1~2주 |

<v-click>

<div class="pt-3">
셋 다 <strong>같은 파일 하나</strong>를 고치는 일이다. 차이는 매핑해야 할 토큰 개수뿐이다.
</div>

</v-click>

---

## A. 브랜드 색만 입히기 (30분)

```css
/* app/globals.css */
:root {
  --primary: oklch(0.55 0.22 264);          /* 브랜드 컬러 */
  --primary-foreground: oklch(0.99 0 0);    /* 그 위의 글자 */
  --ring: oklch(0.55 0.22 264);             /* 포커스 링도 맞춘다 */
  --radius: 0.5rem;
}

.dark {
  --primary: oklch(0.70 0.18 264);          /* 다크에선 밝게 */
  --primary-foreground: oklch(0.20 0.02 264);
  --ring: oklch(0.70 0.18 264);
}
```

<v-clicks>

- **`--primary` · `--primary-foreground` · `--ring` 세 개**면 앱의 인상이 바뀐다
- 다크 모드에서는 **명도를 뒤집는다.** 같은 색을 그대로 쓰면 눈이 아프다
- `--radius`까지 만지면 성격이 확 달라진다

</v-clicks>

---
class: denser
---

## B. Material Design 3 채택

Material 3의 색 역할과 shadcn 토큰을 매핑한다.

| Material 3 | shadcn/ui | 비고 |
|---|---|---|
| `primary` | `--primary` | 그대로 |
| `onPrimary` | `--primary-foreground` | `on*`이 곧 `*-foreground` |
| `surface` | `--background` | |
| `onSurface` | `--foreground` | |
| `surfaceContainer` | `--card` | 고도 단계가 여럿이라 하나를 고른다 |
| `secondaryContainer` | `--secondary` | |
| `onSecondaryContainer` | `--secondary-foreground` | |
| `outline` | `--border` | |
| `outlineVariant` | `--input` | |
| `error` | `--destructive` | |

<v-click>

<div class="pt-2 text-sm opacity-70">
Material의 <code>on*</code> 접두사와 shadcn의 <code>*-foreground</code> 접미사는 <strong>같은 개념</strong>이다.
"이 표면 위에 올라가는 것"을 뜻한다. 이 대응만 알면 절반은 끝난다.
</div>

</v-click>

---
class: dense
---

## Material 3 매핑 결과

```css
:root {
  --background: oklch(0.98 0.01 320);   /* surface */
  --foreground: oklch(0.22 0.01 300);   /* onSurface */
  --primary: oklch(0.47 0.10 295);      /* #6750A4 */
  --primary-foreground: oklch(1 0 0);   /* onPrimary */
  --secondary: oklch(0.90 0.04 305);    /* secondaryContainer */
  --border: oklch(0.82 0.02 300);       /* outline */
  --radius: 1.25rem;                    /* Material은 라운드가 크다 */
}
```

<div class="grid grid-cols-2 gap-6 pt-4">
<UiSurface label="shadcn 기본"><LoginCard compact /></UiSurface>
<UiSurface label="Material 3 토큰 적용" theme="material"><LoginCard theme="material" compact /></UiSurface>
</div>

---

## 토큰만으로 안 되는 것

Material 3에는 **shadcn 기본 컴포넌트에 없는 구조적 특징**이 있다.

<v-clicks>

- **버튼이 알약 모양** — `--radius`로는 안 된다. `rounded-full`이 필요하다
- **elevation(고도)** — 테두리 대신 그림자 단계로 표면을 구분한다
- **state layer** — 호버 시 반투명 오버레이가 덮이는 방식
- **ripple** — 클릭 위치에서 퍼지는 애니메이션

</v-clicks>

<v-click>

<div class="pt-3 text-lg">
이럴 때 <strong>16장의 "variant 추가"가 정당한 수정</strong>이 된다.
<code>ui/button.tsx</code>의 베이스 클래스를 <code>rounded-full</code>로 바꾸는 것이다.
</div>

</v-click>

---

## 구조적 차이를 반영한 결과

<div class="grid grid-cols-3 gap-4 pt-2">
<UiSurface label="토큰만 (radius만 큼)" :padded="false">
<div class="ui" data-theme="shadcn" style="border:1px solid var(--ui-border);border-radius:.75rem;padding:1rem">
<div style="display:flex;gap:.5rem;flex-wrap:wrap">
<button class="ui-btn ui-btn--default" style="border-radius:1.25rem">저장</button>
<button class="ui-btn ui-btn--outline" style="border-radius:1.25rem">취소</button>
</div>
</div>
</UiSurface>

<UiSurface label="토큰 + 알약 + 색" theme="material">
<div style="display:flex;gap:.5rem;flex-wrap:wrap">
<button class="ui-btn ui-btn--default">저장</button>
<button class="ui-btn ui-btn--outline">취소</button>
<button class="ui-btn ui-btn--ghost">더보기</button>
</div>
</UiSurface>

<UiSurface label="비교: 엔터프라이즈" theme="corporate">
<div style="display:flex;gap:.5rem;flex-wrap:wrap">
<button class="ui-btn ui-btn--default">저장</button>
<button class="ui-btn ui-btn--outline">취소</button>
<button class="ui-btn ui-btn--ghost">더보기</button>
</div>
</UiSurface>
</div>

<div class="pt-4 text-sm opacity-70">
가운데는 <strong>토큰(색·폰트) + 컴포넌트 수정(높이·패딩·알약)</strong>을 함께 한 결과다.
디자인 시스템 채택은 대부분 이 두 가지의 조합이다.
</div>

---
class: dense
---

## B-2. Radix Colors 채택

색 팔레트만 제공하는 시스템이다. **12단계 스케일에 의미가 정해져 있다.**

| 단계 | 용도 |
|---|---|
| 1–2 | 앱 배경, 미묘한 배경 |
| 3–5 | 컴포넌트 배경 (기본 / 호버 / 눌림) |
| 6–8 | 테두리 (미묘 / 기본 / 강조) |
| 9–10 | 채도 높은 솔리드 배경 (기본 / 호버) |
| 11 | 저대비 텍스트 |
| 12 | 고대비 텍스트 |

<v-click>

```css
:root {
  --background: var(--gray-1);
  --card: var(--gray-2);
  --muted: var(--gray-3);
  --border: var(--gray-6);
  --primary: var(--indigo-9);        /* 9단계 = 솔리드 배경 */
  --muted-foreground: var(--gray-11);
  --foreground: var(--gray-12);
}
```

</v-click>

---

## Radix Colors가 좋은 이유

<v-clicks>

- **단계마다 용도가 명시**되어 있어 "이 회색은 몇 번?"을 고민하지 않는다
- 라이트/다크가 **같은 번호로 짝**을 이룬다. `gray-9`는 양쪽에서 같은 역할
- **대비가 보장**되어 있다 — 11번은 항상 저대비 텍스트로 쓸 수 있는 명도다
- 투명 버전(`grayA`)이 함께 제공되어 겹칠 때 자연스럽다

</v-clicks>

<div class="pt-3">
<ColorScale name="Radix indigo (1~12)" :colors="['#fdfdfe','#f7f9ff','#edf2fe','#e1e9ff','#d2deff','#c1d0ff','#abbdf9','#8da4ef','#3e63dd','#3358d4','#3a5bc7','#1f2d5c']" :steps="['1','2','3','4','5','6','7','8','9','10','11','12']" />
</div>

<div class="pt-2 text-sm opacity-70">
9번(<code>#3e63dd</code>)이 <strong>브랜드 색으로 쓰라고 만든 단계</strong>다.
</div>

---

## C. 사내 디자인 시스템 매핑

가장 흔하고 가장 까다로운 시나리오다. 절차를 단계로 나눈다.

<v-clicks>

**1단계 — 인벤토리**
사내 DS의 토큰 목록을 뽑는다. Figma Variables를 CSV로 내보내면 빠르다.

**2단계 — 매핑 표 작성**
사내 토큰 → shadcn 토큰. **1:1이 안 되는 것들을 표시**한다.

**3단계 — 갭 분석**
사내에만 있는 것 / shadcn에만 있는 것을 나눈다.

**4단계 — 토큰 파일 작성**
`globals.css`에 light/dark/`@theme inline` 세 블록.

**5단계 — 컴포넌트 차이 반영**
구조가 다른 것만 `ui/`에서 수정. (16장 규칙 준수)

**6단계 — 검증**
대비비, 다크 모드, 포커스 링을 전수 확인.

</v-clicks>

---
class: dense
---

## 2단계 — 매핑 표는 이렇게 생겼다

| 사내 토큰 | shadcn 토큰 | 상태 | 메모 |
|---|---|---|---|
| `color.brand.primary` | `--primary` | ✅ 1:1 | |
| `color.brand.onPrimary` | `--primary-foreground` | ✅ 1:1 | |
| `color.surface.default` | `--background` | ✅ 1:1 | |
| `color.surface.raised` | `--card` | ✅ 1:1 | |
| `color.surface.sunken` | — | ⚠️ 없음 | 토큰 추가 필요 |
| `color.text.tertiary` | — | ⚠️ 없음 | `muted-foreground`로 통합? |
| — | `--accent` | ⚠️ 미정 | 호버 배경. `surface.hover`로? |
| `color.status.warning` | — | ⚠️ 없음 | 12장 방식으로 추가 |
| `radius.card` = 12px | `--radius` | ⚠️ 충돌 | 버튼은 6px인데 카드는 12px |

<v-click>

<div class="pt-2 text-sm opacity-70">
<strong>⚠️ 행들이 실제 작업량이다.</strong> ✅ 행은 값만 옮기면 끝난다.
이 표를 디자이너와 함께 채우는 것이 이 작업에서 가장 중요한 회의다.
</div>

</v-click>

---

## 3단계 — 갭을 처리하는 세 가지 방법

<v-clicks>

**갭 1: 사내에만 있는 토큰** (`surface.sunken`, `status.warning`)
→ **토큰을 추가한다.** 12장의 3곳 수정(light / dark / `@theme inline`).

**갭 2: shadcn에만 있는 토큰** (`--accent`, `--popover`)
→ **적당한 값을 할당한다.** 비워두면 컴포넌트가 깨진다.
디자이너에게 "호버 배경색이 정의돼 있나요?"를 물어 결정한다.

**갭 3: 1:N 대응** (`radius`가 컴포넌트마다 다름)
→ **파생 스케일을 쓰거나** 컴포넌트별로 오버라이드한다.

</v-clicks>

<v-click>

```css
/* 갭 3의 해결 예 */
:root { --radius: 0.375rem; }              /* 버튼 기준 */
@theme inline {
  --radius-lg: 0.75rem;                    /* 카드는 별도로 */
}
```

</v-click>

---

## 4단계 — 최종 파일 형태

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

/* ① 값 — 사내 DS에서 옮겨온 것 */
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.21 0.01 250);
  --primary: oklch(0.52 0.16 254);
  --primary-foreground: oklch(0.99 0 0);
  --warning: oklch(0.84 0.16 84);            /* 사내 전용 추가 */
  --warning-foreground: oklch(0.28 0.07 46);
  --radius: 0.375rem;
}

.dark { /* ② 같은 이름, 다크 값 */ }

/* ③ 유틸리티 생성 */
@theme inline {
  --color-background: var(--background);
  --color-primary: var(--primary);
  --color-warning: var(--warning);
  --radius-lg: calc(var(--radius) * 2);
}
```

---

## 5단계 — 컴포넌트 차이는 최소로

<v-clicks>

- **먼저 토큰만으로 얼마나 가는지** 확인한다. 대부분 80%는 토큰으로 해결된다
- 남는 20%만 `ui/` 수정 대상이다
- 수정할 때는 **16장의 규칙**을 지킨다: 표시 남기기, 커밋 분리

</v-clicks>

<v-click>

<div class="pt-3">
흔히 필요한 구조적 수정:
</div>

| 요구 | 수정 위치 |
|---|---|
| 버튼 높이가 다르다 | `button.tsx`의 `size` variant |
| 그림자 대신 테두리 | `card.tsx` 베이스 클래스 |
| 포커스 링 두께·색 | `button.tsx` 등의 `focus-visible:` |
| 입력 필드 라벨 위치 | `label.tsx` + 폼 패턴 |

</v-click>

---

## 6단계 — 검증

<v-clicks>

**대비비 (WCAG AA)**
본문 텍스트 4.5:1, 큰 텍스트·UI 요소 3:1 이상.
`*-foreground` 짝을 전부 확인한다.

**다크 모드 전수 확인**
`.dark`에서 값을 빠뜨린 토큰이 있으면 라이트 값이 그대로 남아 대비가 깨진다.

**포커스 링**
`--ring`이 배경과 충분히 대비되는가? primary와 같은 색으로 뒀다면
primary 버튼 위에서 안 보인다.

**실제 화면 스냅샷**
로그인·목록·폼·빈 상태·에러 — 다섯 화면을 라이트/다크로 캡처해 나란히 본다.

</v-clicks>

---

## 검증 화면 예시

<div class="grid grid-cols-2 gap-6 pt-2">
<UiSurface label="라이트 — 전체 화면"><GalleryDemo /></UiSurface>
<UiSurface label="다크 — 같은 화면" theme="dark"><GalleryDemo theme="dark" /></UiSurface>
</div>

<div class="pt-3 text-sm opacity-70">
나란히 놓고 보면 <strong>다크에서만 깨지는 것</strong>이 바로 눈에 띈다.
배지 대비, 테이블 구분선, 흐린 텍스트가 단골이다.
</div>

---

## 도구들

<v-clicks>

- **tweakcn** — shadcn 토큰을 시각적으로 편집하고 CSS를 뽑아준다. 시작점으로 좋다
- **shadcn 프리셋** — `shadcn apply <code>`로 테마 프리셋을 적용한다.
  `--only theme`으로 테마만 적용할 수도 있다
- **Radix Colors** — 팔레트가 필요하면 가장 안전한 선택
- **oklch.com** — 색 변환·비교
- **Style Dictionary** — Figma 토큰 → 여러 플랫폼 포맷 자동 생성

</v-clicks>

```bash
pnpm dlx shadcn@latest apply a2r6bw --only theme
```

---

## 테마를 레지스트리로 배포하기

브랜드가 여러 개거나 프로젝트가 여러 개면 **테마 자체를 배포**한다.

```json
{
  "name": "acme-theme",
  "type": "registry:theme",
  "title": "ACME Design System",
  "cssVars": {
    "light": {
      "primary": "oklch(0.52 0.16 254)",
      "primary-foreground": "oklch(0.99 0 0)",
      "warning": "oklch(0.84 0.16 84)"
    },
    "dark": {
      "primary": "oklch(0.70 0.14 254)",
      "warning": "oklch(0.41 0.11 46)"
    }
  }
}
```

```bash
pnpm dlx shadcn@latest add @acme/acme-theme
```

<v-click>

새 프로젝트가 **명령 한 줄로 사내 디자인 시스템을 입는다.**

</v-click>

---

## 멀티 브랜드 — 한 앱에서 여러 테마

```css
[data-brand="acme"] {
  --primary: oklch(0.52 0.16 254);
}
[data-brand="globex"] {
  --primary: oklch(0.62 0.19 35);
}
```

```tsx
// 테넌트에 따라 최상위에 붙인다
<html data-brand={tenant.brand}>
```

<v-clicks>

- 컴포넌트는 여전히 `bg-primary`만 쓴다
- **런타임에 결정**되므로 빌드를 나눌 필요가 없다
- 테넌트 색을 DB에서 받아 인라인 스타일로 주입하는 것도 가능하다

</v-clicks>

<v-click>

```tsx
<html style={themeVars}>   {/* { '--primary': tenant.color } */}
```

</v-click>

---

## 안티패턴

<v-clicks>

- **컴포넌트마다 색을 하드코딩** — 토큰 층을 건너뛰면 이 장의 모든 것이 무의미해진다
- **`!important`로 덮어쓰기** — 토큰을 안 고치고 스타일로 이기려는 시도
- **디자인 시스템을 100% 재현하려다 멈춤** — 80%에서 출시하고 나머지를 채운다
- **다크 모드를 나중으로 미룸** — 나중에 하면 토큰 구조를 다시 짜야 한다
- **`cssVariables: false`로 시작** — 14장에서 경고한 그것. 되돌리기가 매우 어렵다
- **디자이너 없이 매핑** — ⚠️ 행의 결정은 개발자가 혼자 내릴 수 없다

</v-clicks>

---

## 17장 요약

<v-clicks>

- 디자인 시스템 적용 = **대부분 토큰 매핑**이다. 컴포넌트 수정은 20% 남짓
- Material의 `on*`과 shadcn의 `*-foreground`는 **같은 개념**
- Radix Colors는 **단계마다 용도가 정해져 있어** 매핑이 쉽다
- 사내 DS는 **인벤토리 → 매핑 표 → 갭 분석 → 토큰 → 컴포넌트 → 검증** 순서
- **⚠️ 표시된 갭이 실제 작업량**이다. 디자이너와 함께 채운다
- 검증은 **대비비 · 다크 모드 · 포커스 링 · 다섯 화면 스냅샷**
- 여러 프로젝트라면 `registry:theme`으로 **테마를 배포**한다

</v-clicks>
