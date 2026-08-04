# Study Decks

여러 기술 주제의 스터디 자료를 [Slidev](https://sli.dev) 슬라이드로 만들어 하나의 사이트로 배포하는 모노레포.

## 구조

```
decks/<이름>/slides.md    # 덱 하나 = 디렉터리 하나 (독립 package.json)
decks/<이름>/pages/*.md   # 덱이 크면 장별로 분리하고 slides.md에서 src: 로 참조
decks/<이름>/style.css    # (선택) 덱 전역 스타일. Slidev이 자동으로 읽는다
scripts/build-all.mjs     # 전체 빌드 + dist/index.html 인덱스 생성
dist/                     # 빌드 산출물 (git 무시)
  index.html              # 덱 목록 인덱스 (자동 생성)
  <이름>/                 # 각 덱의 SPA
```

서드파티 워크스페이스 래퍼 없이 pnpm workspace + 자체 스크립트로만 구성한다.
구축 배경과 상세 명세는 [docs/SPEC-slidev-study-decks.md](docs/SPEC-slidev-study-decks.md) 참고.

## 사용법

```bash
pnpm install

# 개별 덱 dev 서버
pnpm dev supabase
pnpm dev frontend
pnpm dev webgame

# 전체 빌드 (dist/ 초기화 후 재생성)
pnpm build

# 특정 덱만 재빌드 (인덱스는 전체 메타로 갱신)
pnpm build supabase

# 빌드 결과 로컬 확인
pnpm preview
```

## 새 덱 추가

1. `decks/<이름>/` 디렉터리를 만들고 `package.json`(name: `@decks/<이름>`)과 `slides.md`를 둔다.
   기존 덱 디렉터리를 복사해서 이름만 바꿔도 된다.
2. `slides.md` 헤드매터에 `title`, `description`을 쓴다 (인덱스 카드에 표시됨).
   - 헤드매터 파싱은 정규식 최소 파싱이므로 `title: 값` 한 줄 형태만 지원한다.
   - `routerMode: hash`를 유지할 것 — 인덱스의 목차 딥링크(`/<이름>/#/7`)가
     서버 리라이트 설정 없이 동작하는 전제다.
3. 덱 고유 의존성(예: phaser)은 덱의 `package.json`에만 추가한다.
4. `custom-nav-controls.vue`(하단 내비게이션의 목차/홈 버튼)를 기존 덱에서 복사한다.
   현재는 덱마다 같은 파일을 복사해 두는 방식이다 — 덱이 늘어 관리가 번거워지면
   공통 테마/애드온 패키지로 분리한다.
5. `pnpm install && pnpm build` — 인덱스에 자동으로 나타난다.

인덱스의 목차는 본문 `#`(장)과 `##`(슬라이드) 헤딩을 수집해 **2단 트리**로 만든다.
코드 펜스 안 내용과 슬라이드별 프론트매터는 제외되고, `src:`로 포함한 외부 파일도
따라가서 수집한다. 장이 1개 이하인 작은 덱은 자동으로 평평한 목록이 된다.

덱 안의 하단 내비게이션 목차(`custom-nav-controls.vue`)도 같은 기준으로 트리를 만들고,
열 때 **현재 슬라이드가 속한 장만 펼쳐서** 보여준다.

## 큰 덱 만들기

`supabase`(324장)와 `frontend`(319장) 덱이 참고 사례다. 장수가 많아지면 다음 두 가지를 쓴다.

**장별 파일 분리** — `slides.md`에는 커버와 `src:` include만 두고 본문은 `pages/`에 나눈다.

```md
---
src: ./pages/01-why.md
---
```

**밀도 조절** — 내용이 한 화면을 넘치는 슬라이드는 프론트매터에 `class: dense`
(더 빡빡하게는 `denser`)를 지정한다. 클래스 정의는 덱 루트의 `style.css`에 있다.
넘치지 않는 슬라이드에 습관적으로 붙이지 말 것. 글씨만 작아진다.

```md
---
class: dense
---

## 표가 긴 슬라이드
```

**실물 렌더 데모** — `frontend` 덱은 UI를 스크린샷 대신 실제 DOM으로 보여준다.
`style.css`에 CSS 변수 기반 컴포넌트 레이어(`.ui-*`)를 두고, `components/*.vue`에서
그걸 조합한다. 토큰만 갈아끼우면 같은 마크업이 다른 디자인 시스템으로 렌더된다.
UI를 다루는 덱을 새로 만든다면 이 구조를 그대로 가져다 쓸 수 있다.

**검증** — 수백 장이 되면 눈으로 확인할 수 없다. 빌드가 성공해도 내용이 잘리거나
목차 딥링크가 어긋날 수 있으므로, 아래 세 가지는 스크립트로 전수 검사한다.
구체적인 방법과 함정(특히 Mermaid는 shadow DOM에 렌더된다)은
[docs/SPEC-slidev-study-decks.md](docs/SPEC-slidev-study-decks.md) 5절 참고.

1. `build-all.mjs`의 슬라이드 번호와 `@slidev/parser` 실제 파싱 결과가 일치하는가
2. 모든 슬라이드가 세로로 넘치지 않는가 (`scrollHeight <= clientHeight`)
3. 모든 Mermaid 다이어그램이 실제로 렌더되는가

## 배포 (Cloudflare Pages)

로컬 빌드 후 직접 업로드하는 방식을 쓴다 (Git 연동 자동 빌드 사용 안 함).
현재 프로젝트: `study-decks` → https://study-decks-3bi.pages.dev

최초 1회 (새 환경에서):

```bash
pnpm exec wrangler login
```

배포:

```bash
pnpm deploy
# 내부적으로: pnpm build && wrangler pages deploy dist --project-name=study-decks
```

다른 계정/프로젝트로 배포하려면 `wrangler pages project create <이름>` 후
`package.json`의 deploy 스크립트에서 `--project-name`을 바꾼다.

## 설계 메모

- **`--base /<이름>/` 필수** — 서브디렉터리 배포에서 asset 경로가 깨지지 않게 한다.
  build-all.mjs가 자동으로 붙인다.
- **`routerMode: hash`** — 딥링크가 `/<이름>/#/7` 형태라 어떤 정적 호스팅에서도
  리다이렉트 규칙 없이 동작한다.
- **부분 배포 방지** — 덱 하나라도 빌드 실패 시 전체가 non-zero exit으로 중단된다.
- **PDF export는 전제하지 않는다** — Phaser 데모 등 인터랙티브 요소가 죽으므로 SPA 배포 전용.
