<!--
  Slidev 내비게이션 바 커스텀 버튼 (덱마다 동일한 파일을 복사해 둔다.
  덱이 늘어 관리가 번거워지면 공통 테마/애드온 패키지로 분리할 것)
  - 목차: 장(#) → 슬라이드(##) 2단 트리 팝업. 클릭 시 해당 슬라이드로 이동
  - 홈: 인덱스(스터디 자료 목록)로 복귀

  수백 장 규모에서 평평한 목록은 훑을 수 없어 트리로 만들었다.
  장이 1개 이하인 작은 덱은 자동으로 기존 평평한 목록으로 떨어진다.
-->
<script setup>
import { useNav } from '@slidev/client'
import { computed, nextTick, ref, watch } from 'vue'

const { slides, currentPage, go } = useNav()
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
  background: rgb(99 102 241 / 0.12);
}
.deck-toc-chaphead.current {
  color: #4f46e5;
}
html.dark .deck-toc-chaphead.current {
  color: #a5b4fc;
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
</style>
