<!--
  덱 공통 내비게이션 (애드온 @decks/addon-nav — 붙이는 법은 옆 README 참고)

  1) 목차: 장(#) → 슬라이드(##) 2단 트리 팝업. 클릭 시 해당 슬라이드로 이동
  2) 홈: 인덱스(스터디 자료 목록)로 복귀
  3) 터치 기기(hover: none) 전용 조작 레이어 — script 중간 주석 참고

  수백 장 규모에서 평평한 목록은 훑을 수 없어 트리로 만들었다.
  장이 1개 이하인 작은 덱은 자동으로 기존 평평한 목록으로 떨어진다.
  강조 색은 덱의 style.css에서 :root { --deck-accent } 로 덮어쓴다.
-->
<script setup>
import { useDarkMode, useDrawings, useNav } from '@slidev/client'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const {
  slides, currentPage, total, go, next, prev, hasNext, hasPrev,
  isPrintMode, isEmbedded,
} = useNav()
const { isColorSchemaConfigured, isDark, toggleDark } = useDarkMode()
const { drawingEnabled } = useDrawings()

const open = ref(false)
const expanded = ref(new Set())

/** 제목은 원본 마크다운이라 인라인 표기가 섞여 있다. 목차용으로 벗겨낸다. */
function titleOf(route) {
  const raw = route.meta?.slide?.title
  if (!raw)
    return `슬라이드 ${route.no}`
  return raw
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
}

// level 1(장 구분 슬라이드) 아래에 level 2를 묶는다. 커버처럼 level이 없는 것은 orphan.
const tree = computed(() => {
  const chapters = []
  const orphans = []
  for (const s of slides.value) {
    const node = { no: s.no, title: titleOf(s) }
    if (s.meta?.slide?.level === 1)
      chapters.push({ ...node, items: [] })
    else if (chapters.length)
      chapters[chapters.length - 1].items.push(node)
    else
      orphans.push(node)
  }
  return { chapters: chapters.filter(c => c.items.length), orphans }
})

const isTree = computed(() => tree.value.chapters.length > 1)

/** 현재 슬라이드가 속한 장의 인덱스 (없으면 -1) */
const currentChapter = computed(() => {
  const cs = tree.value.chapters
  for (let i = cs.length - 1; i >= 0; i--) {
    if (currentPage.value >= cs[i].no)
      return i
  }
  return -1
})

function toggle(i) {
  const next = new Set(expanded.value)
  next.has(i) ? next.delete(i) : next.add(i)
  expanded.value = next
}

function goTo(no) {
  open.value = false
  go(no)
}

// 열 때마다 현재 장만 펼치고, 현재 슬라이드가 보이도록 스크롤한다
watch(open, (v) => {
  if (!v)
    return
  expanded.value = currentChapter.value >= 0 ? new Set([currentChapter.value]) : new Set()
  nextTick(() => {
    document.querySelector('.deck-toc-panel .deck-toc-item.active')
      ?.scrollIntoView({ block: 'center' })
  })
})

/* ------------------------------------------------------------------
   터치 기기 조작 레이어

   Slidev 기본 내비게이션 바는 `opacity-0 hover:opacity-100`이다.
   터치 기기에는 hover가 없어서 (a) 안 보이는 채로 화면 좌하단의 탭을 가로채고
   (b) 한 번 탭하면 hover가 눌어붙어 나타났다 사라졌다 한다.
   그래서 아래 전역 <style>로 기본 바를 완전히 죽이고 이 레이어가 그 자리를 대신한다.

   - 항상 보이는 작은 알약(현재 쪽수) → 탭하면 조작 바가 펼쳐진다 (6초 뒤 자동 접힘)
   - 화면 좌우 가장자리 22%를 탭하면 이전/다음 (스와이프 대신)
------------------------------------------------------------------ */

const EDGE = 0.22        // 좌우 탭 영역 비율
const TAP_MOVE = 12      // 이 이상 움직이면 스와이프/스크롤로 본다 (px)
const TAP_TIME = 400     // 이 이상 누르고 있으면 길게 누르기로 본다 (ms)
const BAR_IDLE = 6000    // 조작 바 자동 접힘 (ms)

const isTouch = ref(false)
const barOpen = ref(false)
const flash = ref(null)  // 'left' | 'right' — 탭 피드백
const hint = ref(false)
const isFullscreen = ref(false)
const fsEnabled = ref(false)

const showMobile = computed(() => isTouch.value && !isPrintMode.value && !isEmbedded.value)

let idleTimer = null
let flashTimer = null
let hintTimer = null
let tap = null

function poke() {
  clearTimeout(idleTimer)
  if (barOpen.value && !open.value)
    idleTimer = setTimeout(() => (barOpen.value = false), BAR_IDLE)
}

/** 조작 바 버튼은 눌릴 때마다 자동 접힘 타이머를 되감는다 */
function fromBar(fn) {
  fn()
  poke()
}

function openBar() {
  barOpen.value = true
  poke()
}

// 목차를 열어 둔 동안에는 바가 접히지 않아야 한다
watch(open, () => poke())

// ---- 좌우 가장자리 탭으로 페이지 넘기기

/** 슬라이드 본문 안이면서 조작 가능한 요소가 아닐 때만 탭 내비게이션 대상 */
function tappable(target) {
  if (!(target instanceof Element))
    return false
  // 텔레포트된 목차 팝업·조작 바·레터박스 여백은 #slide-content 밖이라 자동 제외된다.
  // 레터박스 탭은 Slidev 기본 동작(좌/우 절반)이 이미 처리한다.
  if (!target.closest('#slide-content'))
    return false
  // canvas/video는 데모(Phaser 등)가 직접 조작을 받는 영역이라 제외한다
  return !target.closest('a, button, input, select, textarea, label, summary, canvas, video, [contenteditable], [data-no-tap-nav]')
}

function onPointerDown(e) {
  tap = null
  if (!showMobile.value || drawingEnabled.value || e.pointerType === 'mouse' || !e.isPrimary)
    return
  if (!tappable(e.target))
    return
  tap = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId }
}

function onPointerUp(e) {
  const t = tap
  tap = null
  if (!t || e.pointerId !== t.id)
    return
  if (Math.abs(e.clientX - t.x) > TAP_MOVE || Math.abs(e.clientY - t.y) > TAP_MOVE)
    return
  if (e.timeStamp - t.t > TAP_TIME)
    return
  if (String(window.getSelection?.() ?? ''))   // 텍스트 선택 중이면 넘기지 않는다
    return

  const ratio = e.clientX / window.innerWidth
  if (ratio > EDGE && ratio < 1 - EDGE)
    return

  const dir = ratio <= EDGE ? 'left' : 'right'
  if (dir === 'left') {
    if (hasPrev.value)
      prev()
  }
  else if (hasNext.value) {
    next()
  }

  flash.value = dir
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (flash.value = null), 260)

  dismissHint()
}

function onPointerCancel() {
  tap = null
}

// ---- 전체화면 (Slidev 기본 바와 같은 대상: document.body)

function syncFullscreen() {
  isFullscreen.value = !!(document.fullscreenElement || document.webkitFullscreenElement)
}

function toggleFullscreen() {
  const el = document.body
  if (document.fullscreenElement || document.webkitFullscreenElement)
    (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)
  else
    (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el)
}

// ---- 첫 방문 안내

function dismissHint() {
  if (!hint.value)
    return
  hint.value = false
  clearTimeout(hintTimer)
  try {
    localStorage.setItem('deck-tap-hint', '1')
  }
  catch {}
}

onMounted(() => {
  const mq = window.matchMedia('(hover: none)')
  isTouch.value = mq.matches
  mq.addEventListener('change', e => (isTouch.value = e.matches))

  fsEnabled.value = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled)
  syncFullscreen()
  document.addEventListener('fullscreenchange', syncFullscreen)
  document.addEventListener('webkitfullscreenchange', syncFullscreen)

  // 캡처 단계 — 본문 컴포넌트가 이벤트를 멈춰도 탭 판정은 받아야 한다
  window.addEventListener('pointerdown', onPointerDown, true)
  window.addEventListener('pointerup', onPointerUp, true)
  window.addEventListener('pointercancel', onPointerCancel, true)

  if (isTouch.value) {
    try {
      hint.value = !localStorage.getItem('deck-tap-hint')
    }
    catch {}
    if (hint.value)
      hintTimer = setTimeout(dismissHint, 5000)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onPointerDown, true)
  window.removeEventListener('pointerup', onPointerUp, true)
  window.removeEventListener('pointercancel', onPointerCancel, true)
  document.removeEventListener('fullscreenchange', syncFullscreen)
  document.removeEventListener('webkitfullscreenchange', syncFullscreen)
  clearTimeout(idleTimer)
  clearTimeout(flashTimer)
  clearTimeout(hintTimer)
})
</script>

<template>
  <button class="slidev-icon-btn" title="목차" @click="open = !open">
    <svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  </button>
  <a class="slidev-icon-btn" href="/" title="스터디 자료 목록으로">
    <svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V21h13V9.5" />
    </svg>
  </a>

<!-- 내비게이션 바는 hover에 따라 opacity가 바뀌므로, 팝업은 body로 빼서 항상 선명하게 -->
  <Teleport to="body">
    <div v-if="open" class="deck-toc-backdrop" @click="open = false" />
    <div v-if="open" class="deck-toc-panel">
      <div class="deck-toc-head">목차</div>

      <template v-if="isTree">
        <button
          v-for="o in tree.orphans"
          :key="`o${o.no}`"
          class="deck-toc-item"
          :class="{ active: o.no === currentPage }"
          @click="goTo(o.no)"
        >
          <span class="no">{{ o.no }}</span>
          <span class="t">{{ o.title }}</span>
        </button>

        <div v-for="(c, i) in tree.chapters" :key="`c${c.no}`" class="deck-toc-chap">
          <button
            class="deck-toc-chaphead"
            :class="{ current: i === currentChapter }"
            @click="toggle(i)"
          >
            <span class="chev" :class="{ open: expanded.has(i) }">▸</span>
            <span class="t">{{ c.title }}</span>
            <span class="cnt">{{ c.items.length }}</span>
          </button>
          <div v-if="expanded.has(i)" class="deck-toc-children">
            <button
              v-for="s in c.items"
              :key="s.no"
              class="deck-toc-item"
              :class="{ active: s.no === currentPage }"
              @click="goTo(s.no)"
            >
              <span class="no">{{ s.no }}</span>
              <span class="t">{{ s.title }}</span>
            </button>
          </div>
        </div>
      </template>

      <template v-else>
        <button
          v-for="s in slides"
          :key="s.no"
          class="deck-toc-item"
          :class="{ active: s.no === currentPage }"
          @click="goTo(s.no)"
        >
          <span class="no">{{ s.no }}</span>
          <span class="t">{{ titleOf(s) }}</span>
        </button>
      </template>
    </div>

    <!-- 터치 기기 조작 레이어 -->
    <template v-if="showMobile">
      <div class="mnav" :class="{ open: barOpen }">
        <template v-if="barOpen">
          <button class="mnav-btn" title="목차" @click="fromBar(() => (open = !open))">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
              <circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <a class="mnav-btn" href="/" title="스터디 자료 목록으로">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V21h13V9.5" />
            </svg>
          </a>
          <button v-if="!isColorSchemaConfigured" class="mnav-btn" title="라이트/다크" @click="fromBar(toggleDark)">
            <svg v-if="isDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="4.2" />
              <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
            </svg>
          </button>
          <button v-if="fsEnabled" class="mnav-btn" title="전체화면" @click="fromBar(toggleFullscreen)">
            <svg v-if="isFullscreen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />
            </svg>
          </button>

          <span class="mnav-sep" />

          <button class="mnav-btn" title="이전" :disabled="!hasPrev" @click="fromBar(prev)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 5 8 12l7 7" />
            </svg>
          </button>
          <span class="mnav-page">{{ currentPage }}<i>/{{ total }}</i></span>
          <button class="mnav-btn" title="다음" :disabled="!hasNext" @click="fromBar(next)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button class="mnav-btn mnav-collapse" title="접기" @click="barOpen = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </template>

        <button v-else class="mnav-pill" title="내비게이션 열기" @click="openBar">
          {{ currentPage }}<i>/{{ total }}</i>
        </button>
      </div>

      <div v-if="flash" class="mnav-flash" :class="flash">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path v-if="flash === 'left'" d="M15 5 8 12l7 7" />
          <path v-else d="M9 5l7 7-7 7" />
        </svg>
      </div>

      <div v-if="hint" class="mnav-hint" @click="dismissHint">
        화면 <b>좌우 가장자리</b>를 탭하면 넘어갑니다 · 오른쪽 아래 쪽수 = 메뉴
      </div>
    </template>
  </Teleport>
</template>

<!--
  전역 스타일 — 터치 기기에서 Slidev 기본 내비게이션 바를 끈다.
  #slide-container의 직계 자식은 #slide-content(본문)와 컨트롤 래퍼 둘뿐이라
  :not(#slide-content)이 곧 그 래퍼다. pointer-events가 핵심 —
  보이지 않는 상태로도 탭을 먹던 유령 히트영역을 없앤다.
-->
<style>
@media (hover: none) {
  #slide-container > div:not(#slide-content) {
    opacity: 0 !important;
    pointer-events: none !important;
  }
}
</style>

<style scoped>
/* 덱이 :root에 --deck-accent 를 정의하면 그것을, 없으면 아래 기본값을 쓴다 */
.deck-toc-panel {
  --acc: var(--deck-accent, #0d9488);
  --acc-dark: var(--deck-accent-dark, #2dd4bf);
}

.deck-toc-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99;
}
.deck-toc-panel {
  position: fixed;
  left: 1rem;
  bottom: 3.2rem;
  z-index: 100;
  min-width: 260px;
  max-width: 380px;
  max-height: 70vh;
  overflow-y: auto;
  padding: 6px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #e5e5e5;
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.12);
}
html.dark .deck-toc-panel {
  background: #1c1c1e;
  border-color: #333;
}
.deck-toc-head {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.5;
  padding: 6px 10px 4px;
}

/* 장 헤더 — 행 전체가 펼치기 토글 */
.deck-toc-chaphead {
  display: flex;
  gap: 7px;
  align-items: center;
  width: 100%;
  text-align: left;
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.deck-toc-chaphead:hover {
  background: color-mix(in srgb, var(--acc) 12%, transparent);
}
.deck-toc-chaphead.current {
  color: var(--acc);
}
html.dark .deck-toc-chaphead.current {
  color: var(--acc-dark);
}
.chev {
  flex-shrink: 0;
  width: 10px;
  font-size: 10px;
  line-height: 1;
  opacity: 0.55;
  transition: transform 0.15s;
}
.chev.open {
  transform: rotate(90deg);
}
.cnt {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 10px;
  opacity: 0.45;
  font-variant-numeric: tabular-nums;
}
.deck-toc-children {
  margin: 1px 0 4px 15px;
  padding-left: 5px;
  border-left: 1px solid rgb(128 128 128 / 0.25);
}

.deck-toc-item {
  display: flex;
  gap: 10px;
  align-items: baseline;
  width: 100%;
  text-align: left;
  padding: 5px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font-size: 12.5px;
  cursor: pointer;
}
.deck-toc-item:hover {
  background: color-mix(in srgb, var(--acc) 12%, transparent);
}
.deck-toc-item.active {
  color: var(--acc);
  font-weight: 600;
}
html.dark .deck-toc-item.active {
  color: var(--acc-dark);
}
.deck-toc-item .no {
  font-variant-numeric: tabular-nums;
  font-size: 11px;
  opacity: 0.5;
  min-width: 22px;
  text-align: right;
  flex-shrink: 0;
}
.deck-toc-item .t,
.deck-toc-chaphead .t {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------------------------------------------- 터치 기기 조작 레이어 */

.mnav {
  position: fixed;
  right: max(0.5rem, env(safe-area-inset-right));
  bottom: max(0.5rem, env(safe-area-inset-bottom));
  z-index: 101; /* 목차 백드롭(99)·패널(100)보다 위 — 목차를 연 채로도 조작 가능 */
  display: flex;
  align-items: center;
  border-radius: 999px;
  color: #fff;
}
.mnav.open {
  padding: 3px;
  gap: 2px;
  background: rgb(24 24 27 / 0.78);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.28);
}

.mnav-pill {
  display: flex;
  align-items: baseline;
  padding: 6px 13px;
  border: none;
  border-radius: 999px;
  background: rgb(24 24 27 / 0.42);
  backdrop-filter: blur(6px);
  color: #fff;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
  cursor: pointer;
}
.mnav-pill i {
  font-style: normal;
  font-size: 10.5px;
  opacity: 0.62;
}

.mnav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.mnav-btn svg {
  width: 20px;
  height: 20px;
}
.mnav-btn:active {
  background: rgb(255 255 255 / 0.18);
}
.mnav-btn:disabled {
  opacity: 0.3;
}
.mnav-collapse svg {
  width: 16px;
  height: 16px;
  opacity: 0.7;
}

.mnav-sep {
  width: 1px;
  height: 20px;
  margin: 0 3px;
  background: rgb(255 255 255 / 0.22);
}

.mnav-page {
  display: flex;
  align-items: baseline;
  justify-content: center;
  min-width: 52px;
  font-size: 13.5px;
  font-variant-numeric: tabular-nums;
}
.mnav-page i {
  font-style: normal;
  font-size: 11px;
  opacity: 0.62;
}

/* 좌우 탭 피드백 */
.mnav-flash {
  position: fixed;
  top: 50%;
  z-index: 98;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 999px;
  background: rgb(24 24 27 / 0.45);
  color: #fff;
  pointer-events: none;
  animation: mnav-fade 260ms ease-out forwards;
}
.mnav-flash svg {
  width: 22px;
  height: 22px;
}
.mnav-flash.left {
  left: 12px;
}
.mnav-flash.right {
  right: 12px;
}
@keyframes mnav-fade {
  from {
    opacity: 0.95;
    transform: translateY(-50%) scale(0.86);
  }
  to {
    opacity: 0;
    transform: translateY(-50%) scale(1.05);
  }
}

.mnav-hint {
  position: fixed;
  left: 50%;
  bottom: calc(max(0.5rem, env(safe-area-inset-bottom)) + 52px);
  z-index: 101;
  transform: translateX(-50%);
  max-width: 92vw;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgb(24 24 27 / 0.82);
  backdrop-filter: blur(6px);
  color: #fff;
  font-size: 12.5px;
  line-height: 1.35;
  text-align: center;
}
.mnav-hint b {
  font-weight: 600;
}

/* 터치 기기에서는 목차 팝업을 화면 폭에 맞추고 항목을 키운다 */
@media (hover: none) {
  .deck-toc-panel {
    left: 8px;
    right: 8px;
    bottom: calc(max(0.5rem, env(safe-area-inset-bottom)) + 50px);
    min-width: 0;
    max-width: none;
    max-height: 66vh;
  }
  .deck-toc-item {
    padding: 9px 10px;
    font-size: 13.5px;
  }
  .deck-toc-chaphead {
    padding: 10px;
    font-size: 14px;
  }
}
</style>
