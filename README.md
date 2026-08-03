# Study Decks

여러 기술 주제의 스터디 자료를 [Slidev](https://sli.dev) 슬라이드로 만들어 하나의 사이트로 배포하는 모노레포.

## 구조

```
decks/<이름>/slides.md    # 덱 하나 = 디렉터리 하나 (독립 package.json)
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

인덱스의 목차는 본문 `##` 헤딩을 수집해 만든다. 코드 펜스 안 내용과 슬라이드별
프론트매터는 제외되고, `src:`로 포함한 외부 파일도 따라가서 수집한다.

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
