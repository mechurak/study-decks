# Slidev 스터디 자료 모노레포 구축 스펙

> **상태: 구현 완료 (2026-08-04).**
> 이 문서는 원래 Claude Code에 구현을 지시하기 위한 명세였고, 구현 완료 후
> 실제 상태에 맞게 갱신했다. 최초 지시와 달라진 지점은 본문에 **[변경]** 표시로 남겼다.
> 현재 운영 방법(커맨드, 배포 절차)은 README가 기준이다.

구현 당시 규칙: 판단이 필요한 지점은 "결정 사항"과 "제약"을 우선 따르고,
명시되지 않은 부분만 재량으로 처리한다.

---

## 1. 목적

여러 기술 주제(Supabase, 웹게임 등)의 스터디 자료를 슬라이드 형태로 만들어 웹에 배포한다.
마크다운 장문 문서는 읽고 따라가기 어렵다는 문제가 있어, 한 화면당 정보량을 줄이고
다이어그램과 실행 가능한 데모를 적극 활용하는 방식으로 전환한다.

## 2. 결정 사항 (변경 금지)

| 항목 | 결정 |
|---|---|
| 슬라이드 도구 | Slidev |
| 레포 구성 | 단일 모노레포, 주제별 덱 분리 |
| 패키지 매니저 | pnpm workspace |
| 덱별 package.json | **둔다** (Phaser 등 무거운 의존성 격리 목적) |
| 인덱스 페이지 | 직접 생성 (빌드 스크립트가 자동 생성) |
| 배포 | Cloudflare Pages, `wrangler pages deploy dist` |
| 서드파티 워크스페이스 도구 | **쓰지 않는다** (slidev-workspace, slidev-decks 등) |

서드파티 래퍼를 배제한 이유는 유지보수 주체가 불투명해 Slidev 버전 업그레이드 시
따라오지 못할 위험이 있기 때문이다. 래퍼가 하는 일은 스캔 → 빌드 → 인덱스 생성 세 가지뿐이라
직접 유지하는 비용이 더 낮다고 판단했다.

## 3. 디렉터리 구조

```
study-decks/
  package.json              # 워크스페이스 루트, 스크립트만 보유
  pnpm-workspace.yaml
  .npmrc                    # [변경] shamefully-hoist=true (아래 4.1 참고)
  .gitignore                # dist/, node_modules/, .slidev/
  scripts/
    build-all.mjs           # 전체 빌드 + 인덱스 생성
    dev.mjs                 # [변경] pnpm dev <덱이름> 래퍼
  decks/
    supabase/
      package.json
      slides.md
      custom-nav-controls.vue   # [변경] 덱 내 목차/홈 버튼 (아래 4.8 참고)
    webgame/
      package.json
      slides.md
      custom-nav-controls.vue   # [변경]
      components/
        PhaserDemo.vue
  dist/                     # 빌드 산출물 (git 무시)
    index.html
    supabase/
    webgame/
  README.md
```

[변경] `wrangler.toml`은 두지 않았다 — 계정 종속 값을 레포에 남기지 않기 위해
CLI 인자/프롬프트 방식으로 갈음했다 (4.9 배포 참고).
`scripts/new-deck.mjs` 스캐폴딩은 구현하지 않았다 (7절 이후 검토 항목 유지).

## 4. 파일별 명세

### 4.1 `pnpm-workspace.yaml` / `.npmrc`

`decks/*`를 워크스페이스 패키지로 등록한다.

[변경] `.npmrc`에 `shamefully-hoist=true`를 추가했다. pnpm 기본(격리) 모드에서는
덱 디렉터리(cwd) 기준으로 `@slidev/theme-default` 등이 resolve되지 않아 빌드가 깨진다.
호이스팅해도 의존성 선언 자체는 덱별로 격리 유지된다 (phaser는 webgame에만 선언).

참고: pnpm 11이 설치 시 `pnpm-workspace.yaml`에 `allowBuilds`(esbuild/workerd 빌드 스크립트
승인), `minimumReleaseAgeExclude` 항목을 자동 추가한다. 정상이다.

### 4.2 루트 `package.json`

- `private: true`
- 스크립트:
  - `build` → `node scripts/build-all.mjs`
  - `dev` → 인자로 덱 이름을 받아 해당 덱만 dev 서버 실행
    (예: `pnpm dev supabase`. `scripts/dev.mjs` 래퍼로 구현)
  - `preview` → `serve dist` — [변경] 빌드 결과 로컬 확인용으로 추가
  - `deploy` → `pnpm build && wrangler pages deploy dist`
- 루트 devDependency: `@slidev/cli`, `@slidev/theme-default`, `serve`, `wrangler`
  (호이스팅으로 중복 설치 방지. [변경] theme-default/serve/wrangler도 루트에 명시)

### 4.3 덱별 `package.json`

- `name`은 `@decks/<이름>` 형태
- `private: true`
- 스크립트: `dev` → `slidev`, `build` → `slidev build`
- 덱 고유 의존성만 여기에 둔다 (예: webgame 덱의 `phaser`)

### 4.4 `scripts/build-all.mjs`

요구 동작:

1. `decks/` 하위 디렉터리를 스캔한다.
2. 각 덱의 `slides.md`에서 메타데이터를 추출한다.
   - **프론트매터**: 첫 블록에서 `title`, `description`. 없으면 디렉터리명을 title로 사용한다.
   - **YAML 파서를 쓰지 말고** 정규식으로 최소 파싱한다 (의존성 추가 회피).
     프론트매터에 복잡한 구조를 쓰지 않는 것을 전제로 한다.
   - **목차**: 본문의 `##` 레벨 헤딩을 순서대로 배열로 수집한다. 인덱스 페이지에서
     각 덱이 다루는 내용을 미리 보여주기 위한 용도다.
     - 코드 블록(``` 펜스) 내부의 `#`은 주석일 수 있으므로 반드시 제외한다.
       파싱 전 펜스 구간을 걷어내거나, 펜스 진입/이탈 상태를 추적하며 스캔할 것.
     - 슬라이드 구분자(`---`) 뒤에 오는 슬라이드별 프론트매터 안의 내용도 제외한다.
     - `#`(제목 슬라이드)은 수집하지 않는다. `###` 이하도 수집하지 않는다.
     - 별도 파일을 `src:`로 끌어오는 슬라이드가 있다면 해당 파일도 따라가서 수집한다.
       (지금 샘플 덱에는 없지만 나중에 덱이 커지면 쓰게 될 구조다)
3. 각 덱에 대해 아래를 실행한다. `cwd`를 덱 디렉터리로 잡아야 한다.
   ```
   pnpm exec slidev build --base /<name>/ --out ../../dist/<name>
   ```
   `--base`가 없으면 서브디렉터리 배포 시 asset 경로가 깨진다. **필수.**

   [변경] 슬라이드 번호 계산은 `@slidev/parser`의 분할 규칙을 그대로 미러링해 구현했다:
   펜스 밖에서 `/^---+$/` 줄이 구분자이고, 구분자 **바로 다음 줄이 비어 있지 않으면**
   프론트매터 블록으로 보고 닫는 `---`까지 스킵한다. 이 규칙 덕에 번호가 실제 산출물과
   어긋나지 않음을 검증했고, 목차 딥링크 기능을 유지했다.
4. 덱 하나라도 빌드에 실패하면 전체를 non-zero exit으로 중단한다 (부분 배포 방지).
5. `dist/index.html`을 생성한다.

인터페이스:
- 인자 없이 실행 → 전체 빌드
- 인자로 덱 이름 → 해당 덱만 빌드 (인덱스는 갱신)

### 4.5 인덱스 페이지 (`dist/index.html`)

- 빌드 스크립트가 생성하는 **정적 HTML 단일 파일**. 프레임워크 도입 금지.
- 덱 목록을 카드 그리드로 표시. 각 카드에 title, description, `/<name>/` 링크.
- 스타일은 Tailwind CDN 한 줄 또는 인라인 `<style>` 중 택일.
  기본 템플릿처럼 보이지 않도록 타이포그래피와 여백에 최소한의 의도를 담을 것.
- 다크모드 대응은 있으면 좋고 필수는 아님.

**목차 노출 (2단계)**

1. **카드에 상시 요약** — 수집한 `##` 헤딩 중 앞 3~4개를 한 줄로 나열하고
   나머지는 `+N`으로 축약한다. 카드 높이가 덱마다 들쭉날쭉해지지 않도록
   줄 수를 고정하고 넘치면 말줄임 처리한다.
2. **전체 목차 상세 보기** — 카드 안에 "목차" 버튼을 두고, 누르면 전체 헤딩 목록을 편다.
   - 구현은 `<details>/<summary>` 또는 최소한의 인라인 JS 토글. 둘 다 무방하나
     **의존성 없이** 구현할 것.
   - 각 헤딩 항목은 해당 슬라이드로 직접 이동하는 링크로 만든다.
     헤딩 수집 시 **슬라이드 번호를 함께 기록**해 연결한다.
   - [변경] 딥링크는 `/<name>/7`(history)이 아니라 **`/<name>/#/7`(hash) 형태**다.
     각 덱 헤드매터에 `routerMode: hash`를 넣었다. history 모드 딥링크는 정적 호스팅에서
     SPA 리라이트 규칙(`_redirects` 등)이 필요해, 어떤 정적 서버에서도 설정 없이 동작하는
     hash 모드를 택했다. **새 덱도 `routerMode: hash`를 반드시 유지할 것.**

**hover 동작은 보조 수단으로만 쓴다.** 터치 디바이스에서 hover는 동작하지 않으므로,
hover로만 접근 가능한 정보가 있어서는 안 된다. hover는 카드 강조 등 시각적 피드백에 그치고,
목차 열람은 반드시 클릭 가능한 버튼으로 제공한다.

### 4.6 `decks/supabase/slides.md`

최초에는 구조 검증용 최소 덱(5~6장)이었다. **[변경] 이후 본격 스터디 자료로 확장했다 (324장).**

검증 대상이던 기능은 그대로 유지한다:

- 프론트매터에 `title`, `description` (인덱스 생성 검증용) + `routerMode: hash` (필수, 4.5 참고)
- Mermaid 다이어그램 (현재 30개)
- 단계별 코드 하이라이트 `{1-3|5-8|all}` (현재 8개 슬라이드)
- `v-click` / `v-clicks` 점진적 노출

**[변경] 덱이 커지면서 도입한 두 가지 구조:**

1. **`pages/` 분할** — `slides.md`는 커버 슬라이드와 18개의 `src:` include만 갖고,
   본문은 `pages/00-intro.md` ~ `pages/17-wrapup.md`에 장별로 둔다.
   `build-all.mjs`의 목차 수집이 `src:`를 따라가므로 인덱스 딥링크는 그대로 동작한다
   (4.4 참고). 슬라이드 번호가 실제 산출물과 일치하는지 `@slidev/parser`로 교차 검증했다.
2. **`style.css`** — 덱 루트에 두면 Slidev이 전역 스타일로 읽는다.
   정보량이 많아 한 화면을 넘치는 슬라이드에 쓰는 `dense` / `denser` 밀도 조절 클래스를 정의했고,
   해당 슬라이드는 프론트매터에 `class: dense`를 지정한다.
   **남용하지 말 것** — 실제로 넘치는 슬라이드에만 쓴다 (검증 방법은 5절 참고).

### 4.7 `decks/webgame/slides.md` + `components/PhaserDemo.vue`

Phaser 데모를 슬라이드에 임베드한다. 구현 시 반드시 처리해야 할 세 가지:

1. **SSR 회피** — Slidev 빌드는 SSR 단계를 거친다. Phaser는 반드시
   `onMounted` 내부에서 동적 `import()`로 로드한다. 최상단 정적 import 금지.
2. **키 입력 충돌** — Slidev는 방향키/스페이스로 슬라이드를 넘긴다. 게임 캔버스가
   활성일 때 Slidev 단축키가 발동하지 않도록 막는다. 캔버스 포커스 또는
   명시적 "데모 시작/종료" 토글 중 구현이 단순한 쪽을 선택하되, 사용자가
   슬라이드에서 빠져나갈 방법이 항상 있어야 한다.
3. **정리** — `onUnmounted`에서 `game.destroy(true)` 호출. 슬라이드를 오갈 때
   인스턴스가 누적되지 않는지 실제로 확인할 것.

**Phaser 4 기준으로 작성한다.** v3와 API가 다른 부분이 있으므로 v3 예제 코드를
그대로 가져오지 말 것. 불확실하면 Phaser 4 공식 문서를 확인하고 진행한다.
(구현은 phaser 4.2.1. 키 입력 충돌은 "데모 시작/종료" 토글 + window capture 단계에서
게임 키를 가로채는 방식으로 처리했고, 이동 로직은 Phaser 키보드 플러그인 대신
자체 키 상태 Set을 씬 `update`에서 읽는다. Esc와 종료 버튼 두 가지 탈출 경로 제공.)

### 4.8 `custom-nav-controls.vue` — [추가]

최초 스펙에는 없던 파일. 각 덱 루트에 두면 Slidev이 하단 내비게이션 바에 삽입해 주는
공식 커스터마이징 지점으로, 두 가지 버튼을 제공한다:

- **목차**: `useNav()`의 슬라이드 메타(제목)로 팝업 목록을 만들고, 클릭 시 해당
  슬라이드로 이동. 내비게이션 바의 hover 페이드에 팝업이 묻히지 않도록
  `<Teleport to="body">`로 렌더링한다.
- **홈**: `/`(인덱스)로 복귀하는 링크.

현재는 덱마다 같은 파일을 복사해 두는 방식이다. 덱이 늘어 관리가 번거워지면
공통 테마/애드온 패키지로 분리한다 (7절 참고).

### 4.9 배포

- Cloudflare Pages, `wrangler pages deploy dist`
- **로컬 빌드 후 배포** 방식. Pages의 Git 연동 자동 빌드는 사용하지 않는다.
  (덱이 늘면 빌드 시간이 선형 증가하므로 CI 시간을 소모하지 않기 위함)
- 프로젝트명 등 계정 종속 값은 하드코딩하지 말고 README에 설정 방법만 기술한다.
  - [변경] 이후 소유자 판단으로 완화: 개인 레포라 deploy 스크립트에
    `--project-name=study-decks`를 명시했다 (2026-08-04 첫 배포 시).
- [변경] `wrangler.toml` 없이 운영한다. `wrangler`는 루트 devDependency로 두었고,
  최초 1회 `wrangler login` + `wrangler pages project create` 후 `pnpm deploy`.
  상세 절차는 README 참고.

## 5. 검증 기준

구현 완료 판단은 아래가 모두 통과할 때만 내린다. 코드 작성으로 끝내지 말고 실제로 실행할 것.

**전 항목 통과 확인 (2026-08-04, Playwright 브라우저 자동화로 실측)**

- [x] `pnpm install`이 에러 없이 완료된다
- [x] `pnpm dev supabase`로 개별 덱 dev 서버가 뜬다
- [x] `pnpm build`가 두 덱을 모두 빌드하고 `dist/` 구조가 명세와 일치한다
- [x] `dist`를 정적 서버로 띄웠을 때 (`pnpm preview`):
  - [x] 인덱스에서 두 덱 링크가 모두 동작한다
  - [x] 카드의 목차 요약이 각 덱의 실제 `##` 헤딩과 일치한다
        (코드 블록 안의 `#`/`##` 주석이 목차로 새어 들어오지 않음 확인)
  - [x] "목차" 버튼으로 전체 목록이 펼쳐지고, 항목 링크가 의도한 슬라이드로 이동한다
        (`/supabase/#/4` → "RLS 정책" 4/6 도착 확인)
  - [x] 브라우저 창을 모바일 폭(390px)으로 줄여도 카드와 목차가 깨지지 않는다
  - [x] 각 덱에서 CSS/폰트/이미지가 깨지지 않는다 (= `--base` 검증)
  - [x] Mermaid, 단계별 하이라이트, `v-click`이 정상 동작한다

**[추가] 덱이 커진 뒤 도입한 검증 (supabase 덱 324장 확장 시 실측)**

덱이 수백 장 규모가 되면 눈으로 확인하는 방식이 불가능하다. 아래는 스크립트로 전수 검사한다.

- [x] **슬라이드 번호 교차 검증** — `build-all.mjs`가 계산한 슬라이드 수·목차 번호가
      `@slidev/parser`로 실제 파싱한 결과와 일치한다 (324장, 목차 305항목 전수 일치).
      `src:` 분할을 쓰면 이 검증 없이는 딥링크가 조용히 어긋날 수 있다.
- [x] **Mermaid 전수 렌더 확인** — 30개 다이어그램이 모두 SVG로 렌더된다.
      주의: Slidev은 mermaid를 **shadow DOM**에 렌더하므로 `.mermaid`의 `innerHTML`은
      항상 비어 있다. `element.shadowRoot`를 봐야 하고, 문법 오류도 그 안의 텍스트로 나타난다.
      (Node에서 `mermaid.parse()`만 돌리는 방식은 DOM이 없어 실패하므로 판정 근거가 될 수 없다)
- [x] **세로 넘침 전수 검사** — 324장 전부에서 `.slidev-layout`의
      `scrollHeight <= clientHeight`. 빌드는 성공해도 내용이 잘리는 것은 잡히지 않으므로 필수다.
      넘치는 슬라이드는 `class: dense`/`denser`로 조절하거나 내용을 나눈다.
- [x] 단계별 하이라이트 8개 슬라이드에서 → 키 입력에 따라 강조 줄 수가 실제로 바뀐다
  - [x] Phaser 데모가 실행되고, 슬라이드를 벗어났다 돌아와도 인스턴스가 중복되지 않는다
        (재시작·시작 버튼 연타에도 canvas 1개 유지, 데모 중 방향키로 슬라이드 안 넘어감,
        Esc로 복귀 후 내비게이션 정상)
- [x] 덱 디렉터리를 하나 복사해 이름만 바꿔도 인덱스에 자동으로 나타난다

## 6. 하지 말 것

- 서드파티 Slidev 워크스페이스 패키지 도입
- 인덱스 페이지에 빌드 단계나 프레임워크 추가
- 프론트매터 파싱을 위한 YAML 라이브러리 의존성 추가
- Phaser v3 API 사용
- PDF export를 전제로 한 설계 (인터랙티브 요소가 죽으므로 SPA 배포가 전제)

## 7. 이후 추가 검토 (지금은 구현하지 않음)

- mtime 비교 기반 증분 빌드 (덱이 5개를 넘어가면)
- `scripts/new-deck.mjs` 스캐폴딩
- 덱 간 공통 테마 패키지 분리
- 검색/레퍼런스 용도가 필요해지면 동일 마크다운을 VitePress로 이중 배포
