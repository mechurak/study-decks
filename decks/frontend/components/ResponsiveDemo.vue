<!--
  `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` 이 브레이크포인트마다
  어떤 레이아웃으로 "확정되는지"를 세 개의 창으로 동시에 보여준다.
  (실제 뷰포트를 줄일 수 없으므로 각 창은 해당 폭에서의 결과를 재현한 것이다)
-->
<script setup>
defineProps({
  cols: { type: Array, default: () => [1, 2, 3] },
})

const frames = [
  ['모바일', '~ 767px', 'grid-cols-1'],
  ['태블릿', 'md: 768px ~', 'md:grid-cols-2'],
  ['데스크톱', 'lg: 1024px ~', 'lg:grid-cols-3'],
]
</script>

<template>
  <div class="frames">
    <div v-for="(f, i) in frames" :key="f[0]" class="frame">
      <div class="head">
        <strong>{{ f[0] }}</strong>
        <span>{{ f[1] }}</span>
      </div>
      <div class="viewport">
        <div class="grid" :style="{ gridTemplateColumns: `repeat(${cols[i]}, minmax(0, 1fr))` }">
          <div v-for="n in 6" :key="n" class="card">{{ n }}</div>
        </div>
      </div>
      <code class="cls">{{ f[2] }}</code>
    </div>
  </div>
</template>

<style scoped>
.frames {
  display: grid;
  grid-template-columns: 0.8fr 1.1fr 1.5fr;
  gap: 0.9rem;
  align-items: start;
}
.frame {
  min-width: 0;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.68rem;
  margin-bottom: 0.25rem;
}
.head span {
  opacity: 0.5;
  font-family: ui-monospace, monospace;
  font-size: 0.62rem;
}
.viewport {
  border: 1px solid #d4d4d8;
  border-radius: 6px;
  padding: 0.4rem;
  background: rgb(128 128 128 / 0.05);
}
.grid {
  display: grid;
  gap: 0.3rem;
}
.card {
  background: #6366f1;
  color: #fff;
  border-radius: 4px;
  font-size: 0.66rem;
  height: 1.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cls {
  display: block;
  margin-top: 0.3rem;
  font-family: ui-monospace, monospace;
  font-size: 0.64rem;
  opacity: 0.6;
  background: none;
  padding: 0;
  color: inherit;
}
</style>
