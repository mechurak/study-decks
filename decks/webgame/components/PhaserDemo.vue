<script setup>
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'

const host = ref(null)
const started = ref(false)
const starting = ref(false)
const game = shallowRef(null)

// 데모 활성 중 게임이 소유하는 키 (Slidev 내비게이션과 겹치는 것들)
const GAME_CODES = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'])
const pressed = new Set()

// capture 단계에서 가로채 Slidev(window/document 버블 리스너)에 닿기 전에 끊는다.
// 이동 처리는 Phaser 키보드 플러그인 대신 pressed Set을 씬 update에서 직접 읽는다.
function onKeyDown(e) {
  if (!started.value)
    return
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    stopDemo()
    return
  }
  if (GAME_CODES.has(e.code)) {
    pressed.add(e.code)
    e.preventDefault()
    e.stopPropagation()
  }
}

function onKeyUp(e) {
  if (!started.value)
    return
  if (GAME_CODES.has(e.code)) {
    pressed.delete(e.code)
    e.preventDefault()
    e.stopPropagation()
  }
}

async function startDemo() {
  if (game.value || starting.value)
    return
  starting.value = true
  try {
    // SSR 회피: Phaser는 반드시 클라이언트에서 동적 로드
    const mod = await import('phaser')
    const Phaser = mod.default ?? mod

    const W = 640
    const H = 360
    let player, coin, scoreText, score

    game.value = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.value,
      width: W,
      height: H,
      backgroundColor: '#16161e',
      scene: {
        create() {
          score = 0
          player = this.add.rectangle(W / 2, H / 2, 28, 28, 0x4ade80)
          coin = this.add.circle(120, 90, 10, 0xfacc15)
          scoreText = this.add.text(12, 10, 'Score: 0', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#e7e5e4',
          })
          this.add.text(W - 12, H - 10, '방향키: 이동 / Esc: 종료', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#71717a',
          }).setOrigin(1, 1)
        },
        update(_time, delta) {
          const v = 0.28 * delta
          if (pressed.has('ArrowLeft'))
            player.x -= v
          if (pressed.has('ArrowRight'))
            player.x += v
          if (pressed.has('ArrowUp'))
            player.y -= v
          if (pressed.has('ArrowDown'))
            player.y += v
          player.x = Phaser.Math.Clamp(player.x, 14, W - 14)
          player.y = Phaser.Math.Clamp(player.y, 14, H - 14)

          const dist = Phaser.Math.Distance.Between(player.x, player.y, coin.x, coin.y)
          if (dist < 24) {
            score += 1
            scoreText.setText(`Score: ${score}`)
            coin.setPosition(Phaser.Math.Between(30, W - 30), Phaser.Math.Between(40, H - 30))
          }
        },
      },
    })
    started.value = true
  }
  finally {
    starting.value = false
  }
}

function stopDemo() {
  pressed.clear()
  started.value = false
  if (game.value) {
    game.value.destroy(true) // true: 캔버스 DOM까지 제거 — 인스턴스 누적 방지
    game.value = null
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown, true)
  window.addEventListener('keyup', onKeyUp, true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown, true)
  window.removeEventListener('keyup', onKeyUp, true)
  stopDemo()
})
</script>

<template>
  <div class="phaser-demo">
    <div v-if="!started" class="placeholder">
      <button class="start-btn" :disabled="starting" @click="startDemo">
        {{ starting ? '로딩 중…' : '▶ 데모 시작' }}
      </button>
      <p class="hint">실행 중에는 방향키가 게임에 전달됩니다 · Esc 또는 종료 버튼으로 복귀</p>
    </div>
    <div v-show="started" class="stage-wrap">
      <div ref="host" class="stage" />
      <button class="stop-btn" @click="stopDemo">종료 (Esc)</button>
    </div>
  </div>
</template>

<style scoped>
.phaser-demo {
  margin-top: 8px;
}
.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 240px;
  border: 1px dashed rgba(128, 128, 128, 0.5);
  border-radius: 10px;
}
.start-btn {
  font-size: 16px;
  font-weight: 600;
  padding: 10px 22px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  background: #14b8a6;
  color: #fff;
}
.start-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}
.hint {
  font-size: 12px;
  opacity: 0.6;
  margin: 0;
}
.stage-wrap {
  position: relative;
  display: inline-block;
}
.stage :deep(canvas) {
  max-width: 100%;
  border-radius: 10px;
  display: block;
}
.stop-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
}
.stop-btn:hover {
  background: rgba(0, 0, 0, 0.8);
}
</style>
