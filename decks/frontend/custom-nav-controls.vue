<!--
  Slidev 내비게이션 바 커스텀 버튼 (덱마다 동일한 파일을 복사해 둔다.
  덱이 늘어 관리가 번거워지면 공통 테마/애드온 패키지로 분리할 것)
  - 목차: 슬라이드 제목 목록 팝업, 클릭 시 해당 슬라이드로 이동
  - 홈: 인덱스(스터디 자료 목록)로 복귀
-->
<script setup>
import { useNav } from '@slidev/client'
import { ref } from 'vue'

const { slides, currentPage, go } = useNav()
const open = ref(false)

function goTo(no) {
  open.value = false
  go(no)
}

function titleOf(route) {
  return route.meta?.slide?.title || `슬라이드 ${route.no}`
}
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
    </div>
  </Teleport>
</template>

<style scoped>
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
  min-width: 220px;
  max-width: 320px;
  max-height: 60vh;
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
.deck-toc-item {
  display: flex;
  gap: 10px;
  align-items: baseline;
  width: 100%;
  text-align: left;
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font-size: 13px;
  cursor: pointer;
}
.deck-toc-item:hover {
  background: rgb(99 102 241 / 0.12);
}
.deck-toc-item.active {
  color: #4f46e5;
  font-weight: 600;
}
html.dark .deck-toc-item.active {
  color: #a5b4fc;
}
.deck-toc-item .no {
  font-variant-numeric: tabular-nums;
  font-size: 11px;
  opacity: 0.5;
  min-width: 16px;
  text-align: right;
  flex-shrink: 0;
}
.deck-toc-item .t {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
