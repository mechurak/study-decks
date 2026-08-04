---
layout: section
---

# 21. 정리

가져갈 것

---

## 세 도구를 한 줄로 다시

<v-clicks>

**Next.js** — React를 서버에서도 실행한다. 나머지는 그걸 실용적으로 만드는 부속이다.

**Tailwind CSS** — CSS를 없애는 게 아니라 **이름 짓기**를 없앤다.

**shadcn/ui** — 라이브러리가 아니라 **코드 배송 시스템**. 컴포넌트가 내 레포에 온다.

</v-clicks>

<v-click>

<div class="pt-5 text-lg">
공통 태도: <strong>추상화를 얇게 유지한다.</strong>
그래서 셋을 겹쳐 써도 서로를 가리지 않는다.
</div>

</v-click>

---

## 이 덱에서 가장 중요한 세 장

<v-clicks>

**4장 — 경계 설계**
`use client`를 아래로, 작게. 이것만 지켜도 번들과 성능 문제의 대부분이 사라진다.

**12장 — 디자인 토큰**
`:root`에 값, `@theme inline`에 연결, 컴포넌트는 이름만 안다.
이 구조가 있어야 17장이 가능해진다.

**16장 — 자산화**
`ui/` · `shared/` · `_components/` 세 층. `ui/`는 도메인을 모른다.

</v-clicks>

---

## 자주 틀리는 것 다섯 개

<v-clicks>

1. **레이아웃 최상단에 `use client`** → 앱 전체가 클라이언트
2. **동적 클래스 이름 조립** → `` `text-${c}-500` `` 은 빌드에 존재하지 않는다
3. **컴포넌트에 원시 색 하드코딩** → 테마 교체가 영영 불가능해진다
4. **Server Function에 인증 검사 누락** → 공개 엔드포인트다
5. **`cssVariables: false`로 init** → 되돌리기 매우 어렵다

</v-clicks>

<v-click>

<div class="pt-4 text-lg">
다섯 개 중 <strong>3번과 5번은 되돌리기가 특히 비싸다.</strong>
프로젝트 시작 시점에 한 번만 신경 쓰면 된다.
</div>

</v-click>

---

## 2026년 8월 기준 버전 정리

| | 버전 | 기억할 것 |
|---|---|---|
| Next.js | 16.3 | `proxy.ts`, Cache Components, Turbopack 기본 |
| React | 19.2 | `forwardRef` 불필요, Compiler 1.0 |
| Tailwind | 4.3 | `@theme`, 설정 파일 없음, oklch |
| shadcn CLI | 3.x | **Base UI 기본**, 8가지 style, 레지스트리 |
| Base UI | 1.6+ | `render` 프롭, `Positioner` 분리 |

<div class="pt-3 text-sm opacity-70">
검색으로 찾은 자료가 <code>middleware.ts</code>, <code>tailwind.config.js</code>, <code>asChild</code>,
<code>forwardRef</code>를 쓰고 있다면 <strong>한 세대 이전</strong>이다.
동작은 하지만 새로 배울 것은 그쪽이 아니다.
</div>

---

## 다음에 볼 것

<div class="grid grid-cols-2 gap-6 pt-2">
<div>

**공식 문서**

- nextjs.org/docs — 특히 Caching, Server Components
- tailwindcss.com/docs — Theme, Functions and Directives
- ui.shadcn.com/docs — Registry, Theming, Changelog
- base-ui.com — 프리미티브 API

</div>
<div>

**깊이 파볼 주제**

- Partial Prerendering의 내부 동작
- 자체 레지스트리 + CI 연동
- Figma Variables → 토큰 자동 생성
- 시각 회귀 테스트 (Playwright + 스냅샷)
- React Compiler 적용 결과 측정

</div>
</div>

<v-click>

<div class="pt-4 text-sm opacity-70">
특히 <strong>ui.shadcn.com/docs/changelog</strong>는 주기적으로 볼 가치가 있다.
이 생태계에서 가장 빠르게 움직이는 부분이다.
</div>

</v-click>

---

## 마지막으로

<div class="text-2xl py-8 leading-relaxed">
이 스택의 진짜 이점은 속도가 아니라<br>
<strong>디자인이 바뀔 때 드는 비용이 작다</strong>는 것이다.
</div>

<v-clicks>

- 제품은 반드시 바뀐다. 브랜드도, 디자이너도, 요구사항도
- 그때 **파일 하나를 고칠 것인가, 200개를 찾아 고칠 것인가**
- 토큰 층과 소유권 모델이 그 차이를 만든다

</v-clicks>

---

## 마무리

<div class="pt-4">
<ThemeCompare :themes="['shadcn', 'material', 'radix', 'corporate']" compact />
</div>

<div class="pt-6 text-lg text-center">
같은 컴포넌트, 같은 마크업, 다른 토큰.<br>
<strong>이 그림을 만들 수 있게 되었다면 이 덱의 목적은 달성된 것이다.</strong>
</div>
