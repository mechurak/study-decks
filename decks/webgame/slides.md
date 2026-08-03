---
title: 웹게임 개발 with Phaser 4
description: Phaser 4로 브라우저 게임 만들기 — 씬 구조, 게임 루프, 슬라이드 안 라이브 데모
theme: default
routerMode: hash
transition: slide-left
---

# 웹게임 개발

Phaser 4 입문 — 슬라이드 안에서 바로 굴려보기

<div class="pt-10 text-sm opacity-60">
방향키 → 로 진행하세요
</div>

---

## 왜 Phaser인가

<v-clicks>

- 웹 2D 게임 프레임워크 중 가장 오래 살아남은 축 — 문서와 예제가 압도적으로 많다
- 렌더링(WebGL/Canvas), 입력, 사운드, 물리까지 배터리 포함
- **Phaser 4**: 렌더러를 새로 쓴 메이저 업데이트. 씬/입력 등 상위 API는 v3와 거의 동일
- 빌드 도구 없이 `<script>` 한 줄로도, Vite 같은 번들러로도 사용 가능

</v-clicks>

---

## Phaser 4 핵심 구조

Game(전역 설정) → Scene(단위 화면) → GameObject(그릴 것들). 씬의 `create`/`update`가 게임 루프의 뼈대.

```js {1-6|8-15|all}
const game = new Phaser.Game({
  type: Phaser.AUTO,        // WebGL 우선, 안 되면 Canvas
  width: 640,
  height: 360,
  scene: { create, update },
})

function create() {
  // 씬 시작 시 1회 — 오브젝트 배치
  this.player = this.add.rectangle(320, 180, 28, 28, 0x4ade80)
}

function update(time, delta) {
  // 매 프레임 — delta(ms) 기반으로 이동시켜야 프레임레이트 독립적
}
```

---

## 라이브 데모

방향키로 이동해서 코인을 먹는 최소 게임. **데모 실행 중에는 방향키가 게임에만 전달**되고, Esc로 슬라이드 조작으로 복귀한다.

<PhaserDemo />

---

## 슬라이드 임베드 시 주의점

이 데모 컴포넌트가 실제로 처리하고 있는 것들:

<v-clicks>

- **SSR 회피** — Slidev 빌드는 SSR을 거치므로 Phaser는 `onMounted` 이후 동적 `import()`로만 로드
- **키 입력 충돌** — Slidev도 방향키/스페이스를 쓰므로, 데모 활성 중에는 capture 단계에서 게임 키를 가로챈다
- **정리** — 컴포넌트 unmount 시 `game.destroy(true)` 호출, 안 하면 슬라이드를 오갈 때마다 인스턴스가 쌓인다

</v-clicks>

---

## 정리

- Phaser 4는 v3 지식이 거의 그대로 통한다 — 렌더러 내부가 바뀐 것
- 게임 루프는 `create`(1회) + `update`(매 프레임, delta 기반)
- 프레임워크(Vue 등)에 임베드할 때는 **생명주기 정리가 전부다**: 로드 시점, 입력 소유권, 파괴 시점
