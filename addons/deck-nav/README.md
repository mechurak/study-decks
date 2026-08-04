# @decks/addon-nav

`decks/` 아래 모든 덱이 공유하는 내비게이션 애드온. npm에 배포하지 않는 **로컬 애드온**이다.

- **목차** — 장(`#`) → 슬라이드(`##`) 2단 트리 팝업
- **홈** — 인덱스(`/`)로 복귀
- **터치 기기 조작 레이어** — Slidev 기본 내비게이션 바를 대체 (아래 참고)

## 붙이는 법

덱의 `package.json`에 상대 경로로 지정한다. Slidev의 애드온 이름 해석은 `.`으로
시작하면 경로로 취급하므로(`createResolver`), npm 배포 없이 레포 안 폴더를 가리킬 수 있다.

```json
{
  "slidev": {
    "addons": ["../../addons/deck-nav"]
  }
}
```

`slides.md` 헤드매터의 `addons:`로도 되지만, 덱 본문에 인프라 설정이 섞이지 않도록
`package.json` 쪽을 쓴다.

## 강조 색

덱마다 다른 강조 색은 덱의 `style.css`에서 CSS 변수로 덮어쓴다. 지정하지 않으면 기본값(teal).

```css
:root {
  --deck-accent: #4f46e5;
  --deck-accent-dark: #a5b4fc;   /* 다크 모드용 */
}
```

## 터치 기기 조작 레이어

Slidev 기본 내비게이션 바는 `opacity-0 hover:opacity-100`이라 hover가 없는 기기에서
**보이지 않는 채로 화면 좌하단의 탭을 가로챈다**(`pointer-events`가 살아 있다).
한 번 탭하면 hover가 눌어붙어 나타났다 사라졌다 하는 것도 같은 원인이다.

그래서 `@media (hover: none)`에서 기본 바를 죽이고(전역 `<style>`) 대체 레이어를 띄운다.

- 오른쪽 아래 쪽수 알약이 항상 보이고, 탭하면 조작 바(목차·홈·다크·전체화면·이전·다음)가
  펼쳐진다. 6초 뒤 자동으로 접힌다
- 화면 **좌우 가장자리 22% 탭**으로 이전/다음 (스와이프도 그대로 동작)
- 가장자리 탭은 `#slide-content` 안이면서 `a/button/canvas/video/input…`이 아닐 때만
  동작한다. 덱에 새 인터랙티브 요소를 넣을 때 `<button>`이 아니면 `data-no-tap-nav`를 달 것
