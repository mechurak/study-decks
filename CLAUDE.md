# CLAUDE.md

Slidev 스터디 자료 모노레포. 작업 전 [README.md](README.md)(운영 방법)와
[docs/SPEC-slidev-study-decks.md](docs/SPEC-slidev-study-decks.md)(설계 결정과 제약)를 먼저 볼 것.
이 문서는 **그 두 문서에 없는, 실제로 부딪혀서 알게 된 것들**만 남긴다.

## 작업 방식

소유자 1인이 혼자 쓰는 레포다. **커밋은 `main`에 직접 하고 푸시한다.**
작업용 브랜치나 PR을 만들지 말 것 (2026-08-04 소유자 확인).
커밋/푸시 자체는 요청받았을 때만 한다.

## 현재 상태

| 덱 | 규모 | 비고 |
|---|---|---|
| `supabase` | 324장 | `pages/` 18개 파일로 분할. 한국어. Supabase 입문자 대상 |
| `frontend` | 319장 | `pages/` 22개 파일로 분할. Next.js·Tailwind·shadcn/ui. **`components/`에 실물 렌더 컴포넌트 12개** |
| `webgame` | 소규모 | Phaser 4 데모 임베드 |

Slidev 52.19 / mermaid 11.16 / Vue 3 기준.

---

## 절대 깨뜨리면 안 되는 것

- **`routerMode: hash`** — 인덱스 딥링크(`/<덱>/#/7`)가 정적 호스팅에서 동작하는 전제.
- **헤드매터의 `title:` / `description:`은 한 줄 형태** — `build-all.mjs`가 YAML 파서 없이
  정규식으로 읽는다. 여러 줄이나 중첩 구조를 쓰면 인덱스 카드가 깨진다.
- **`##` 헤딩 = 인덱스 목차 항목.** 장 구분 슬라이드는 `#` + `layout: section`,
  본문 슬라이드 제목은 `##`. `###` 이하는 목차에 안 잡힌다.

## 마크다운이 Vue 템플릿으로 컴파일된다

코드 펜스 **밖**에서는 다음이 빌드를 깨뜨리거나 조용히 오작동한다.

- `{{ }}` — Vue 보간으로 해석된다. 절대 쓰지 말 것
- 맨 `<` (예: `a < b`) — HTML 태그 시작으로 파싱된다. 백틱으로 감싸거나 `&lt;`
- 본문 중간의 `---` — 슬라이드 구분자가 된다. 가로줄 용도로 쓰지 말 것

작성 후 이 검사를 돌리면 대부분 걸러진다.

```bash
cd decks/<덱>/pages
grep -n '{{' *.md                                   # 없어야 함
for f in *.md; do echo "$f $(grep -c '^```' $f)"; done   # 펜스 개수가 짝수여야 함
```

## 큰 덱: `src:` 분할

`slides.md`에 커버 + `src:` include만 두고 본문은 `pages/`에 나눈다.
챕터 파일은 `---\nlayout: section\n---`로 시작하고, 이 선두 프론트매터는
**include 슬라이드에 병합되므로 슬라이드 번호를 올리지 않는다**.
`build-all.mjs`가 `@slidev/parser`의 분할 규칙을 미러링하고 있어 번호가 맞지만,
**분할 구조를 바꿨다면 반드시 아래 교차 검증을 다시 돌릴 것.**

## 밀도 조절 (`style.css`)

덱 루트의 `style.css`는 Slidev이 전역 스타일로 자동으로 읽는다.
내용이 한 화면을 넘치는 슬라이드만 프론트매터에 `class: dense`(또는 `denser`)를 준다.

- **넘치지 않는 슬라이드에 습관적으로 붙이지 말 것.** 글씨만 작아진다
- `denser`의 코드 폰트가 12px다. **그 아래로 더 줄이지 말고 내용을 두 장으로 나눌 것**
- 표 10행 / 코드 25줄이 대략 한 장의 한계선
- **코드 블록이 지배하는 슬라이드는 `dense`로 수십 px를 못 살린다** (46px 넘침에 14px밖에
  안 줄어든 실측 사례 있음). 폰트가 아니라 줄 수를 줄여라 — 인라인 병합, SQL 포맷 압축 등

---

## 검증 — 빌드 성공은 아무것도 보장하지 않는다

수백 장 규모에서 **빌드는 통과하는데 내용이 잘리거나 딥링크가 어긋나는** 일이 실제로 일어난다.
덱을 크게 고쳤으면 아래 3종을 전수로 돌린다. (2026-08-04 supabase 덱 324장 확장 시 확립)

```bash
pnpm build supabase          # 한 덱만 빌드해도 인덱스는 전체 덱 기준으로 재생성된다
npx serve dist -l 4321       # 검증용 정적 서버
```

Playwright는 레포 의존성이 **아니다**. 스크래치패드에 따로 설치해서 쓴다.
캐시된 브라우저 버전이 안 맞으면 `npx playwright install chromium-headless-shell`.

### 1. 슬라이드 번호 교차 검증 (`src:` 분할을 썼다면 필수)

`build-all.mjs`의 계산값과 Slidev 실제 파싱 결과를 대조한다. 어긋나면 목차 딥링크가
**조용히** 엉뚱한 슬라이드로 간다. 파서는 pnpm 스토어에서 직접 import하고
**인자 두 개 모두 절대 경로**를 줘야 한다.

```js
import { load } from 'file:///<abs>/node_modules/.pnpm/@slidev+parser@*/node_modules/@slidev/parser/dist/fs.mjs'
const d = await load('/abs/decks/supabase', '/abs/decks/supabase/slides.md')
d.slides.length          // dist/index.html의 "N slides" 및 목차 번호와 일치해야 한다
d.slides[n-1].title      // 목차 항목 텍스트와 일치해야 한다
```

### 2. 세로 넘침 전수 검사

가장 자주 걸리는 문제. 빌드는 무조건 통과하므로 이걸 안 돌리면 잘린 채로 배포된다.

```js
// 각 슬라이드로 이동 후
const l = document.querySelector(`.slidev-page-${n} .slidev-layout`)
l.scrollHeight - l.clientHeight   // 0 이하여야 한다 (기준 뷰포트 1600x900)
```

**~6px 이하는 렌더 노이즈로 간주한다.** supabase 덱 128·146·250·318번(3~5px)이
알려진 미세 넘침이다 (2026-08-04 기준). mermaid 슬라이드는 진입 경로(딥링크 직행 vs
해시 내비게이션)에 따라 높이가 몇 px 흔들린다. 새로 생긴 넘침인지 애매하면
`git stash` → HEAD 빌드로 기준선을 재서 비교한다. 4px 때문에 `dense`를 붙이지 말 것.

### 3. Mermaid 렌더 확인 — 함정 주의

**Slidev은 mermaid를 shadow DOM에 렌더한다.** 그래서:

- `.mermaid`의 `innerHTML`은 **정상일 때도 항상 길이 0**이다.
  이걸 실패로 오판하기 쉽다 (실제로 30개 전부 실패로 잘못 판정했었다)
- 반드시 `el.shadowRoot`를 봐야 한다. 문법 오류도 그 안의 텍스트로 나타난다
- Node에서 `mermaid.parse()`만 돌리는 방식은 **판정 근거가 될 수 없다**.
  DOM이 없어 `purify.addHook is not a function`으로 전부 실패한다

```js
const el = document.querySelector(`.slidev-page-${n} .mermaid`)
const sr = el.shadowRoot
sr.querySelector('svg')                                  // 있어야 한다
/Syntax error|Parse error/.test(sr.textContent)          // false여야 한다
```

### 부수적으로 같이 보는 것

- 단계별 하이라이트: → 키 전후로 `.slidev-code .line.highlighted` 개수가 바뀌는지
- `v-clicks`: → 키 전후로 `.slidev-vclick-hidden` 개수가 줄어드는지
- 인덱스 모바일 폭 390px에서 `scrollWidth > clientWidth`가 아닌지

---

## supabase 덱 내용을 고칠 때

공식 문서가 **모델 학습 시점보다 앞서 있는 항목들이 있다.** 아래는 2026-08-04에
supabase.com/docs를 직접 조회해 확인한 것으로, 덱은 이 기준으로 쓰여 있다.
관련 부분을 수정할 때 예전 지식으로 되돌리지 말 것.

| 항목 | 현재 | 예전(덱에 쓰면 안 됨) |
|---|---|---|
| API 게이트웨이 | **Envoy** | Kong |
| API 키 | **`sb_publishable_` / `sb_secret_`** | `anon` / `service_role` JWT (2026년 말 폐기 예정) |
| 서버 신원 확인 | **`getClaims()`** (JWKS 로컬 서명 검증) | `getSession()` — 권한 판단에 쓰면 안 됨 |
| JWT 서명 | **비대칭키(ECC P-256/RSA) + JWKS** | 대칭 HS256 공유 시크릿 |
| Next.js 패키지 | **`@supabase/ssr`** | `@supabase/auth-helpers-nextjs` |
| Edge Function 템플릿 | **`withSupabase` 핸들러** | `Deno.serve` (여전히 동작은 함) |
| Realtime 전환 기준 | 동시 구독자 ~3,000 넘으면 Postgres Changes → Broadcast | — |
| Realtime 필터 연산자 | **`eq neq lt lte gt gte in like ilike match imatch is isdistinct` + `not.` 접두사 + 쉼표 AND** | `eq neq lt lte gt gte in`만 지원 |
| Realtime 페이로드 축소 | **`postgres_changes` 구독 옵션 `select:`** (PK는 항상 포함) | 그런 옵션 없음 |
| 구독 없는 Broadcast 전송 | **`channel.httpSend()`** (supabase-js 2.107+) | 미구독 채널에서 `channel.send()` |
| 로컬 메일 테스트 | **Mailpit** (포트 54324) | Inbucket |

Realtime 세 줄은 2026-08-04 리뷰에서 검토 에이전트가 전부 "존재하지 않는 API"로
오판했다가 실물 문서로 실재가 확인된 항목들이다. **"이 API는 없다"는 판단은
반드시 supabase.com/docs를 직접 조회한 뒤에 내릴 것.**

내용 수정 시 유지할 서술 원칙:

- 각 기능을 **"Postgres에서 실체가 무엇인지"**로 연결한다 (덱 전체의 일관된 축)
- 12장의 축은 **"Vercel은 실행, Supabase는 상태"** — 배치 판단은 전부 여기서 파생
- 장 끝마다 요약, 주요 장에는 안티패턴 목록을 둔다

---

## frontend 덱 내용을 고칠 때

### 실물 UI를 렌더하는 구조 (이 덱 고유)

"그림 대신 실제로 보여준다"가 이 덱의 축이다. 두 조각으로 되어 있다.

1. **`style.css`의 `.ui-*` 레이어** — shadcn/ui 풍 컴포넌트를 CSS 변수로 구현한 것.
   `.ui[data-theme="shadcn|material|radix|corporate|dark"]`로 토큰 세트를 갈아끼운다.
   17장(디자인 시스템)의 데모가 전부 여기 의존한다.
2. **`components/*.vue` 12개** — `UiSurface` `BtnMatrix` `LoginCard` `ThemeCompare` `ThemeSwitcher`
   `ColorScale` `ScaleViz` `GalleryDemo` `CvaDemo` `BarChart` `ClassAnatomy` `ResponsiveDemo`

**`.ui-*` 클래스는 Tailwind/UnoCSS가 아니라 `style.css`에 직접 정의한 것**이다.
Slidev의 UnoCSS 유틸리티(`grid-cols-2`, `pt-4` 등)와 섞여 있으니 혼동하지 말 것.
토큰을 추가하면 5개 테마 전부에 값을 넣어야 한다 — 하나라도 빠지면 그 테마에서만 깨진다.

### 2026-08-04에 공식 문서로 확인한 것들

이 생태계는 supabase보다도 빠르게 움직인다. 아래는 **모델 학습 시점보다 앞서 있어
직접 조회해 확인한** 항목이다. 예전 지식으로 되돌리지 말 것.

| 항목 | 현재 | 예전(덱에 쓰면 안 됨) |
|---|---|---|
| Next.js | **16.3** | 14 / 15 |
| 미들웨어 | **`proxy.ts`** (Node.js 런타임 기본) | `middleware.ts` (deprecated, 이름 변경됨) |
| 캐싱 | **Cache Components** (`cacheComponents: true`) + `use cache` / `use cache: private` / `use cache: remote` | `fetch(next: { revalidate })`, `export const revalidate` |
| PPR | **Cache Components 켜면 기본 동작** | `experimental.ppr` |
| 번들러 | **Turbopack** | webpack |
| 페이지 타입 | **`PageProps<'/posts/[slug]'>` 자동 생성** | 직접 정의 |
| Tailwind | **4.3, `@import "tailwindcss"` + `@theme`** | v3, `tailwind.config.js` + `@tailwind` 3줄 |
| PostCSS 플러그인 | **`@tailwindcss/postcss`** | `tailwindcss` + `autoprefixer` |
| shadcn 기본 베이스 | **Base UI** (2026-07부터) | Radix (여전히 지원. `init -b radix`) |
| Radix 패키지 | **통합 `radix-ui`** | `@radix-ui/react-*` 개별 |
| 합성 프롭 | **`render`** | `asChild` |
| shadcn style | **8종** (vega/nova/maia/lyra/mira/luma/rhea/sera) | `default` / `new-york` 2종 |
| React | **19.2** — `ref`가 그냥 prop | 18 — `forwardRef` 필요 |
| React Compiler | **1.0 정식** (2025-10) | 실험적 babel 플러그인 |

**"이 API는 없다"는 판단은 nextjs.org/docs · tailwindcss.com/docs ·
ui.shadcn.com/docs(특히 `/changelog`)를 직접 조회한 뒤에 내릴 것.**

### 유지할 서술 원칙

- 매 장이 **"이 코드는 어디서 실행되는가"**(빌드/서버/브라우저)로 수렴한다
- 12장(토큰)과 16장(자산화)이 축이다 — 나머지 장이 이 둘을 참조한다
- 장 끝마다 요약, 주요 장에 안티패턴 목록

## 하지 말 것

- 대시보드 스크린샷 등 외부 이미지 추가 — 자산 관리 대상이 늘고 `--base` 이슈가 생긴다
- PDF export를 전제로 한 작성 — SPA 배포가 전제라 인터랙티브 요소가 죽는다
- 목차를 만들려고 `###`을 쓰는 것 — 수집 대상이 아니다
- 검증 스크립트를 레포에 커밋 — playwright가 레포 의존성이 아니다. 스크래치패드에서 돌린다
