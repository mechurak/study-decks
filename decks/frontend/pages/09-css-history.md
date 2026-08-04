---
layout: section
---

# 9. CSS의 문제

Tailwind는 무엇을 끝냈는가

---

## Tailwind를 배우기 전에

<div class="text-xl py-4 leading-relaxed">
"클래스가 길어서 못 봐주겠다"는 첫인상은 정당하다.<br>
그런데 <strong>그 대가로 무엇을 얻는지</strong>를 모르면 판단할 수 없다.
</div>

<v-clicks>

- 이 장은 Tailwind 문법을 다루지 않는다
- **CSS가 왜 어려웠는지**를 먼저 정리한다
- 그래야 "긴 클래스"가 비용인지 대가인지 판단할 수 있다

</v-clicks>

---

## CSS의 근본 문제 세 가지

<v-clicks>

**1. 전역 네임스페이스**
`.title`은 온 세상에 하나다. 다른 파일의 `.title`과 충돌한다.

**2. 특이도(specificity) 전쟁**
`.card .title`이 `.title`을 이긴다. 이기려고 `.page .card .title`을 쓴다. 결국 `!important`.

**3. 죽은 코드를 못 지운다**
이 클래스를 쓰는 곳이 정말 없는지 확인할 방법이 없다. **그래서 아무도 안 지운다.**

</v-clicks>

<v-click>

<div class="pt-4 text-lg">
CSS 파일은 <strong>단조 증가</strong>한다. 이것이 모든 CSS 방법론이 풀려던 문제다.
</div>

</v-click>

---

## 해결 시도의 역사

```mermaid {scale: 0.58}
timeline
    title CSS 스타일링 접근의 변천
    2005 : 시맨틱 클래스 : .article-title
    2010 : OOCSS · SMACSS : 재사용 단위를 정의하려는 시도
    2013 : BEM : .block__element--modifier
    2015 : CSS Modules : 빌드 타임에 이름을 유일하게
    2016 : CSS-in-JS : styled-components · emotion
    2017 : Tailwind : 이름 짓기를 포기한다
    2025 : Tailwind v4 : CSS 자체가 설정 파일이 됨
```

---

## BEM — 규율로 해결하기

```css
.card { }
.card__header { }
.card__header--highlighted { }
.card__body { }
.card__body__list { }        /* 규칙 위반이지만 현실에서 나온다 */
```

<div class="grid grid-cols-2 gap-6 pt-2">
<div>

**얻은 것**

- 충돌 없음
- 구조가 이름에 드러남
- 특이도가 평평해짐

</div>
<div>

**남은 문제**

- 이름 짓는 데 시간이 든다
- 컴포넌트 이름이 바뀌면 클래스도 전부 바뀐다
- **여전히 아무것도 못 지운다**
- 팀원마다 규칙 해석이 다르다

</div>
</div>

---

## CSS-in-JS — 코로케이션으로 해결하기

```tsx
const Title = styled.h2`
  font-size: 1.25rem;
  color: ${(p) => (p.highlighted ? 'red' : 'black')};
`
```

<div class="grid grid-cols-2 gap-6 pt-2">
<div>

**얻은 것**

- 컴포넌트와 스타일이 같은 파일에
- 컴포넌트를 지우면 스타일도 지워진다
- props로 동적 스타일

</div>
<div>

**남은 문제**

- **런타임 비용** — 렌더마다 CSS를 만든다
- **서버 컴포넌트와 상극** — Context와 런타임이 필요해서 `use client`가 강제된다
- 번들에 CSS 엔진이 포함된다

</div>
</div>

<v-click>

<div class="pt-2 text-sm opacity-70">
RSC 시대에 styled-components 계열의 입지가 급격히 줄어든 결정적 이유가 이것이다.
</div>

</v-click>

---

## Tailwind의 제안

<div class="text-2xl py-6 leading-relaxed">
이름을 잘 짓는 방법을 찾는 대신,<br>
<strong>이름 짓기를 그만두자.</strong>
</div>

<v-clicks>

- CSS 속성 하나에 대응하는 **작고 고정된 클래스**를 미리 만들어 둔다
- 컴포넌트는 그걸 **조합**해서 쓴다
- 새 클래스를 만들 일이 없으니 **CSS 파일이 자라지 않는다**

</v-clicks>

---

## 같은 것을 세 가지 방식으로

<div class="grid grid-cols-3 gap-4 pt-2 text-sm">
<div>

**BEM**

```html
<div class="alert alert--warn">
  <p class="alert__text">주의</p>
</div>
```
```css
.alert {
  display: flex;
  gap: .75rem;
  padding: .75rem 1rem;
  border-radius: .5rem;
  border: 1px solid #e4e4e7;
}
.alert--warn {
  border-color: #f59e0b;
}
```

</div>
<div>

**CSS-in-JS**

```tsx
const Alert = styled.div`
  display: flex;
  gap: .75rem;
  padding: .75rem 1rem;
  border-radius: .5rem;
  border: 1px solid
    ${p => p.warn
      ? '#f59e0b'
      : '#e4e4e7'};
`
```

</div>
<div>

**Tailwind**

```html
<div class="flex gap-3 px-4
  py-3 rounded-lg border
  border-amber-500">
  <p>주의</p>
</div>
```

파일 하나. 컨텍스트 전환 없음.

</div>
</div>

<v-click>

<div class="pt-3">
세 방식 모두 <strong>결과 CSS는 사실상 같다.</strong> 차이는 "어디에 무엇을 쓰느냐"뿐이다.
</div>

</v-click>

---

## "관심사의 분리"라는 반론

가장 흔한 비판이다. "HTML에 스타일을 쓰면 관심사 분리 원칙 위반 아닌가?"

<v-clicks>

- 그 원칙은 **HTML과 CSS가 별개 파일로 배포되던 시대**의 것이다
- 지금은 마크업과 스타일이 **같은 컴포넌트 안에서 함께 바뀐다**
- 카드 디자인을 고칠 때 CSS만 고치고 끝나는 경우가 얼마나 되나?

</v-clicks>

<v-click>

<div class="pt-4 text-lg">
재사용의 단위는 이제 <strong>CSS 클래스가 아니라 컴포넌트</strong>다.<br>
같은 스타일을 다시 쓰고 싶으면 <strong>컴포넌트를 재사용</strong>하면 된다.
</div>

</v-click>

---

## 남는 진짜 문제: 반복

```html
<!-- 이 조합을 20군데서 반복한다면? -->
<button class="inline-flex items-center justify-center rounded-md text-sm
  font-medium bg-zinc-900 text-white h-9 px-4 hover:bg-zinc-800">
```

<v-clicks>

- Tailwind의 답: **`@apply`를 쓰지 말고 컴포넌트를 만들어라**
- `<Button>` 컴포넌트 하나를 만들면 조합은 한 곳에만 존재한다
- 그리고 그 `<Button>`을 처음부터 잘 만들어 주는 것이 → **shadcn/ui**

</v-clicks>

<v-click>

<div class="pt-4 text-lg">
이것이 Tailwind와 shadcn/ui가 <strong>한 세트로 다뤄지는 이유</strong>다.
Tailwind만으로는 반복 문제가 남고, shadcn/ui가 그 자리를 채운다.
</div>

</v-click>

---

## 유틸리티가 실제로 만드는 CSS

```html
<div class="p-4 text-sm rounded-lg">
```

```css
/* 빌드 결과 — 딱 이만큼만 생성된다 */
.p-4 { padding: 1rem }
.text-sm { font-size: .875rem; line-height: 1.25rem }
.rounded-lg { border-radius: .5rem }
```

<v-clicks>

- 프로젝트 전체에서 `p-4`를 100번 써도 **CSS에는 한 번만** 나온다
- 안 쓴 클래스는 **생성되지 않는다**
- 그래서 CSS 파일 크기가 **프로젝트 규모와 거의 무관**하게 유지된다

</v-clicks>

---

## CSS 크기 비교

<BarChart
  :items="[['대형 SPA · BEM 누적 5년', 480, '480 kB'], ['CSS Modules', 210, '210 kB'], ['Tailwind (같은 규모)', 32, '32 kB']]"
  :highlight="2"
  unit=""
/>

<div class="pt-4 text-sm opacity-70">
Tailwind 쪽이 작은 이유는 압축을 잘해서가 아니라
<strong>중복이 구조적으로 발생하지 않기 때문</strong>이다.
같은 스타일이 100군데 쓰여도 정의는 한 번뿐이다.
</div>

---

## Tailwind가 안 맞는 경우

<v-clicks>

- **디자이너가 CSS를 직접 수정**하는 워크플로가 있다 → 유틸리티는 진입 장벽이 된다
- **마크업을 우리가 소유하지 않는다** (CMS가 뱉는 HTML, 서드파티 위젯)
- **이메일 템플릿** — 인라인 스타일이 필요하다
- **디자인 토큰이 런타임에 서버에서 내려온다** — 빌드 타임 스캔과 안 맞는다

</v-clicks>

<v-click>

<div class="pt-3">
마지막 항목은 우회 가능하다. <strong>CSS 변수를 쓰면 런타임에 바꿀 수 있다</strong> — 12장·17장의 핵심 기법이다.
</div>

</v-click>

---

## 9장 요약

<v-clicks>

- CSS의 근본 문제는 **전역 네임스페이스 · 특이도 · 못 지우는 코드** 세 가지
- BEM은 규율로, CSS Modules는 빌드로, CSS-in-JS는 코로케이션으로 풀려 했다
- CSS-in-JS는 **런타임 비용과 RSC 비호환**으로 입지가 줄었다
- Tailwind는 **이름 짓기 자체를 없애서** 문제를 우회한다
- "관심사의 분리"는 **재사용 단위가 컴포넌트로 옮겨가면서** 전제가 바뀌었다
- 남는 문제(반복)는 **컴포넌트로** 푼다 → 그게 shadcn/ui의 자리다

</v-clicks>
