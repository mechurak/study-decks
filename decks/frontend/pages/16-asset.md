---
layout: section
---

# 16. 컴포넌트가 자산이 되는 방식

복사된 코드에서 팀의 자산으로

---

## "자산"이 되려면 무엇이 필요한가

<div class="text-xl py-4 leading-relaxed">
파일이 늘어나는 것은 자산이 아니라 <strong>재고</strong>다.
</div>

<v-clicks>

자산의 조건 세 가지:

1. **찾을 수 있다** — 있는 줄 몰라서 다시 만드는 일이 없다
2. **일관되다** — 같은 것은 같게 동작한다
3. **축적된다** — 새 프로젝트가 0에서 시작하지 않는다

</v-clicks>

<v-click>

<div class="pt-3">
shadcn/ui는 <strong>가능성</strong>을 줄 뿐이다. 위 세 가지는 팀이 만들어야 한다.
이 장은 그 방법이다.
</div>

</v-click>

---

## 세 개의 층으로 나눈다

```mermaid {scale: 0.62}
flowchart TB
    A["components/ui/<br/>shadcn 원본 — 되도록 손대지 않는다<br/>Button, Card, Dialog, Input…"]
    B["components/shared/<br/>우리 확장 — 프로젝트 공통<br/>PageHeader, EmptyState, DataTable, ConfirmDialog"]
    C["app/(app)/**/_components/<br/>도메인 컴포넌트 — 이 화면 전용<br/>InvoiceRow, MemberInviteForm"]

    A --> B --> C

    style A fill:#e0e7ff,stroke:#3730a3
    style B fill:#ccfbf1,stroke:#115e59
    style C fill:#fef3c7,stroke:#92400e
```

<v-clicks>

- **위층은 아래층을 모른다.** `ui/`는 도메인을 절대 모른다
- **아래층은 위층을 조합한다.** 새로 만들지 않는다
- 자산은 주로 **가운데 층에 쌓인다**

</v-clicks>

---

## 층별 규칙

| 층 | 누가 만드나 | 도메인 지식 | 수정 빈도 |
|---|---|---|---|
| `ui/` | shadcn CLI | **없음** | 거의 없음 |
| `shared/` | 우리 팀 | **없음** | 가끔 |
| `_components/` | 기능 담당자 | **있음** | 자주 |

<v-click>

<div class="pt-3">
판별 질문: <strong>"이 컴포넌트가 'Invoice'나 'Member'를 아는가?"</strong><br>
안다면 도메인 층이다. `shared/`에 올리면 안 된다.
</div>

</v-click>

<v-click>

<div class="pt-2 text-sm opacity-70">
반대 방향의 실수도 흔하다 — 도메인 컴포넌트를 "재사용할 것 같아서" shared에 올려두고
결국 아무도 안 쓰는 경우. <strong>두 번째 사용처가 생겼을 때 올린다.</strong>
</div>

</v-click>

---

## `ui/`를 언제 고치는가

<div class="grid grid-cols-2 gap-6 pt-2">
<div>

**고쳐도 되는 것**

- 우리 디자인 시스템에 맞는 **variant 추가**
- 기본 size 값 조정
- 우리 프로젝트 관례에 맞춘 **prop 이름**
- 접근성 개선

</div>
<div>

**고치면 안 되는 것**

- 도메인 로직 삽입
- 특정 화면 전용 분기
- `useSession()` 같은 앱 훅 호출
- API 호출

</div>
</div>

<v-click>

```tsx
// ✅ variant 추가 — 정당한 수정
variant: {
  default: '...',
  outline: '...',
  brand: 'bg-brand text-brand-foreground hover:bg-brand/90',  // 우리 것
}

// ❌ 도메인 침투 — ui/ 밖으로 빼야 한다
function Button({ requiresAdmin, ...props }) {
  const { user } = useSession()
  if (requiresAdmin && !user.isAdmin) return null
}
```

</v-click>

---

## 수정을 추적 가능하게 만들기

`ui/` 파일을 고치면 **업스트림 수정을 자동으로 못 받는다.** 이걸 관리하는 방법.

<v-clicks>

**1. 수정한 파일에 표시를 남긴다**

```tsx
// components/ui/button.tsx
// [MODIFIED] brand variant 추가 (2026-07-12, @sshim)
// [MODIFIED] size에 xl 추가 (2026-08-01, @sshim)
```

**2. 커밋을 분리한다**
`shadcn add`로 받은 그대로를 먼저 커밋 → 수정을 별도 커밋으로.
나중에 diff를 볼 때 "원본이 무엇이었는지"가 git에 남는다.

**3. 정기적으로 `--diff`를 돌린다**

```bash
pnpm dlx shadcn@latest add button --diff
```

</v-clicks>

---

## `--diff`가 보여주는 것

```diff
components/ui/button.tsx

+ // 업스트림에 추가된 부분
+ "aria-invalid:ring-destructive/20 aria-invalid:border-destructive"

  // 내가 추가한 부분 — 그대로 유지된다
  brand: "bg-brand text-brand-foreground hover:bg-brand/90",
```

<v-clicks>

- 자동 병합은 **하지 않는다.** 무엇이 달라졌는지만 알려준다
- 접근성 개선이나 보안 수정이 있었는지 확인하는 용도
- **분기마다 한 번씩** 돌려보는 것을 팀 루틴으로 만든다

</v-clicks>

<v-click>

<div class="pt-2 text-sm opacity-70">
2026년부터는 <code>pnpm dlx skills add shadcn/ui</code>로 설치하는 스킬을 통해
코딩 에이전트에게 마이그레이션을 맡기는 경로도 공식적으로 제공된다.
수정한 파일까지 감안해 컴포넌트 단위로 커밋과 리포트를 만들어 준다.
</div>

</v-click>

---

## 가운데 층에 무엇이 쌓이는가

실제 프로젝트에서 `shared/`에 자주 생기는 것들.

<div class="grid grid-cols-2 gap-6 pt-2 text-sm">
<div>

- **PageHeader** — 제목 + 설명 + 액션 버튼
- **EmptyState** — 아이콘 + 문구 + CTA
- **DataTable** — 정렬·필터·페이지네이션 묶음
- **ConfirmDialog** — "정말 삭제할까요?"
- **FormField** — label + input + error 세트

</div>
<div>

- **StatusBadge** — 상태값 → 배지 매핑
- **DateText** — 상대 시간 + 툴팁에 절대 시간
- **CopyButton** — 클릭하면 복사 + 체크 표시
- **Money** — 통화 포맷 통일
- **LoadingBoundary** — Suspense + ErrorBoundary 묶음

</div>
</div>

<v-click>

<div class="pt-3">
공통점: <strong>도메인을 모르지만 우리 팀의 결정이 담겨 있다.</strong>
"빈 상태는 이렇게 생겼다", "날짜는 이렇게 보여준다" 같은 것들이다.
</div>

</v-click>

---

## EmptyState 예시

<div class="grid grid-cols-2 gap-6 pt-2">
<div>

```tsx
// components/shared/empty-state.tsx
export function EmptyState({
  icon, title, description, action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center
      justify-center gap-3 rounded-lg border
      border-dashed p-10 text-center">
      {icon}
      <h3 className="font-semibold">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
```

</div>
<div>

<UiSurface label="렌더 결과">
<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.6rem;border:1px dashed var(--ui-border);border-radius:.5rem;padding:1.6rem;text-align:center">
  <div style="font-size:1.5rem">📭</div>
  <div style="font-weight:600;font-size:.9rem">아직 초대한 멤버가 없습니다</div>
  <div style="font-size:.78rem;color:var(--ui-muted-foreground)">팀원을 초대하면 여기에 표시됩니다.</div>
  <button class="ui-btn ui-btn--default ui-btn--sm">멤버 초대</button>
</div>
</UiSurface>

<div class="pt-3 text-sm opacity-70">
이걸 한 번 만들어 두면 앱의 <strong>모든 빈 화면이 같은 모양</strong>이 된다.
</div>

</div>
</div>

---

## 여기까지가 한 프로젝트의 이야기다

<div class="text-xl py-4 leading-relaxed">
그런데 <strong>다음 프로젝트</strong>는?
</div>

<v-clicks>

- 복사해 온다 → 두 레포가 서서히 갈라진다
- 사내 npm 패키지로 만든다 → shadcn의 소유권 모델을 잃는다
- **자체 레지스트리를 만든다** → shadcn과 같은 방식으로 배포한다

</v-clicks>

<v-click>

<div class="pt-4 text-lg">
세 번째가 이 스택이 제공하는 답이다.
<strong>우리 컴포넌트도 <code>shadcn add</code>로 설치되게 만든다.</strong>
</div>

</v-click>

---

## 자체 레지스트리 — 전체 그림

```mermaid {scale: 0.6}
flowchart LR
    A["registry/<br/>컴포넌트 소스"] --> B["registry.json<br/>목록 정의"]
    B --> C["shadcn build<br/>→ public/r/*.json"]
    C --> D["정적 호스팅<br/>registry.acme.com"]
    D --> E["다른 프로젝트<br/>shadcn add @acme/empty-state"]

    style C fill:#ccfbf1,stroke:#115e59
    style E fill:#e0e7ff,stroke:#3730a3
```

<v-clicks>

- 서버가 필요 없다. **정적 JSON 파일**을 서빙하면 끝이다
- Vercel, S3, 사내 nginx, 심지어 GitHub 레포도 된다
- 인증이 필요하면 헤더를 붙일 수 있다

</v-clicks>

---

## `registry.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "acme",
  "homepage": "https://registry.acme.com",
  "items": [
    {
      "name": "empty-state",
      "type": "registry:component",
      "title": "Empty State",
      "description": "목록이 비었을 때 보여주는 표준 화면.",
      "registryDependencies": ["button"],
      "files": [
        {
          "path": "registry/empty-state.tsx",
          "type": "registry:component"
        }
      ]
    }
  ]
}
```

---

## `registry-item.json` 전체 필드

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "brand-button",
  "type": "registry:ui",
  "title": "Brand Button",
  "description": "브랜드 variant가 추가된 버튼.",
  "author": "ACME Design Systems",
  "dependencies": ["class-variance-authority"],
  "devDependencies": [],
  "registryDependencies": ["button", "@acme/tokens"],
  "files": [
    { "path": "registry/brand-button.tsx", "type": "registry:ui",
      "target": "@ui/brand-button.tsx" }
  ],
  "cssVars": {
    "theme": { "font-heading": "Pretendard, sans-serif" },
    "light": { "brand": "oklch(0.55 0.22 264)" },
    "dark":  { "brand": "oklch(0.70 0.18 264)" }
  },
  "css": { "@layer components": { ".brand-ring": { "outline-color": "var(--brand)" } } },
  "envVars": { "NEXT_PUBLIC_BRAND_MODE": "acme" },
  "docs": "설치 후 globals.css에 brand 토큰이 추가됩니다.",
  "categories": ["buttons", "brand"]
}
```

---
class: denser
---

## `type`의 종류

| type | 용도 |
|---|---|
| `registry:ui` | UI 컴포넌트·프리미티브 |
| `registry:component` | 단순 컴포넌트 |
| `registry:block` | 여러 파일로 된 복합 블록 |
| `registry:lib` | 유틸리티·라이브러리 |
| `registry:hook` | 커스텀 훅 |
| `registry:page` | 페이지 / 파일 기반 라우트 |
| `registry:file` | 기타 파일 (설정, 규칙 등) |
| `registry:theme` | 테마 (토큰만) |
| `registry:style` | 레지스트리 스타일 |
| `registry:base` | **디자인 시스템 전체** |
| `registry:font` | 폰트 |

<v-click>

<div class="pt-2">
<strong><code>registry:theme</code>과 <code>registry:base</code>가 17장의 열쇠다.</strong>
컴포넌트 없이 <strong>토큰만</strong> 배포할 수 있다는 뜻이다.
</div>

</v-click>

---

## 빌드하고 호스팅하기

```bash
pnpm dlx shadcn@latest build --output ./public/r
```

```text
public/r/
├─ empty-state.json
├─ brand-button.json
└─ acme-theme.json
```

```bash
# 정적 호스팅에 올리면 끝
# https://registry.acme.com/r/empty-state.json
```

<v-click>

<div class="pt-2">
GitHub 레포를 그대로 레지스트리로 쓸 수도 있다 (2026년 6월 추가).
사내에서 빠르게 시작할 때 유용하다.
</div>

</v-click>

---

## 네임스페이스 등록

```json
// 소비하는 프로젝트의 components.json
{
  "registries": {
    "@acme": "https://registry.acme.com/r/{name}.json",
    "@acme-blocks": "https://registry.acme.com/blocks/{name}.json",
    "@v0": "https://v0.dev/chat/b/{name}"
  }
}
```

```bash
pnpm dlx shadcn@latest add @acme/empty-state
pnpm dlx shadcn@latest add @acme/brand-button @acme-blocks/dashboard
pnpm dlx shadcn@latest list @acme          # 우리 레지스트리 목록
pnpm dlx shadcn@latest search @acme -q "table"
```

<v-click>

<div class="pt-2">
<code>{name}</code> 자리에 컴포넌트 이름이 치환된다.
<strong>여러 레지스트리를 동시에</strong> 쓸 수 있고 이름이 충돌하지 않는다.
</div>

</v-click>

---

## 사내 레지스트리에 인증 붙이기

```json
{
  "registries": {
    "@acme": {
      "url": "https://registry.acme.internal/r/{name}.json",
      "headers": {
        "Authorization": "Bearer ${REGISTRY_TOKEN}"
      }
    }
  }
}
```

```bash
# .env.local
REGISTRY_TOKEN=xxxxx
```

<v-clicks>

- `${VAR}` 형태로 **환경변수가 확장**된다. 토큰을 레포에 커밋하지 않는다
- Bearer 토큰, API 키 헤더, Basic 인증, 쿼리 파라미터 모두 지원
- 사내 GitLab/Artifactory 뒤에 두고 사내망에서만 접근하게 할 수 있다

</v-clicks>

---

## 성숙도 단계

| 단계 | 상태 | 다음으로 가는 신호 |
|---|---|---|
| **0** | shadcn 컴포넌트를 그때그때 add | 같은 조합을 세 번째 복사할 때 |
| **1** | `shared/` 층이 생김 | 다른 프로젝트에서 "그거 가져다 쓰고 싶다" |
| **2** | 자체 레지스트리 구축 | 프로젝트가 3개를 넘어갈 때 |
| **3** | 토큰도 `registry:theme`으로 배포 | 브랜드가 여러 개가 될 때 |
| **4** | 문서·플레이그라운드·시각 회귀 테스트 | 디자인 시스템 전담 인원이 생길 때 |

<v-click>

<div class="pt-3">
<strong>대부분의 팀은 1단계에서 충분하다.</strong>
2단계 이상은 실제로 여러 프로젝트가 있을 때만 이득이다.
성급하게 올라가면 관리 비용만 늘어난다.
</div>

</v-click>

---

## 자산화를 방해하는 것들

<v-clicks>

- **`ui/`를 각자 마음대로 고침** — 코드 리뷰에서 `ui/` 변경은 별도로 본다
- **`shared/`에 도메인이 섞임** — import에 `@/lib/api`가 들어오면 경고 신호
- **문서가 없음** — Storybook까지 안 가더라도 `/dev/components` 페이지 하나는 만든다
- **네이밍이 제각각** — `ConfirmModal`, `ConfirmDialog`, `AreYouSureDialog`가 공존
- **탐색 불가** — 있는 줄 몰라서 다시 만든다. 검색 가능한 목록이 필요하다

</v-clicks>

<v-click>

<div class="pt-3 text-sm opacity-70">
마지막이 가장 흔하고 가장 비싸다. 컴포넌트가 50개를 넘으면
<strong>"찾을 수 있는가"가 "잘 만들었는가"보다 중요해진다.</strong>
</div>

</v-click>

---

## 16장 요약

<v-clicks>

- 자산의 조건: **찾을 수 있고 · 일관되고 · 축적된다**
- **세 층**으로 나눈다 — `ui/`(원본) · `shared/`(우리 확장) · `_components/`(도메인)
- `ui/` 수정은 **variant 추가까지.** 도메인 로직이 들어가면 안 된다
- 수정은 **표시 · 커밋 분리 · 정기 `--diff`**로 추적 가능하게 만든다
- 다음 프로젝트로 넘기려면 **자체 레지스트리** — 정적 JSON이면 충분하다
- `registry:theme` / `registry:base`로 **토큰만도 배포**할 수 있다
- 성숙도는 단계적으로. **1단계에서 충분한 팀이 대부분이다**

</v-clicks>
