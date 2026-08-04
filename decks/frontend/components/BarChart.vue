<!-- 숫자 비교를 표 대신 막대로. items: [[라벨, 값, 표시문자열?], ...] -->
<script setup>
const props = defineProps({
  items: { type: Array, required: true },
  unit: { type: String, default: '' },
  color: { type: String, default: '#6366f1' },
  highlight: { type: Number, default: -1 },
})

const max = Math.max(...props.items.map((i) => i[1]))
</script>

<template>
  <div class="chart">
    <div v-for="(it, i) in items" :key="i" class="row">
      <span class="label">{{ it[0] }}</span>
      <div class="track">
        <div
          class="fill"
          :style="{
            width: `${Math.max((it[1] / max) * 100, 1.5)}%`,
            background: i === highlight ? '#16a34a' : color,
          }"
        />
      </div>
      <span class="val">{{ it[2] || it[1] }}{{ it[2] ? '' : unit }}</span>
    </div>
  </div>
</template>

<style scoped>
.chart {
  font-size: 0.82rem;
}
.row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin: 0.3rem 0;
}
.label {
  width: 12rem;
  flex-shrink: 0;
  text-align: right;
  opacity: 0.8;
}
.track {
  flex: 1;
  height: 1.05rem;
  background: rgb(128 128 128 / 0.12);
  border-radius: 3px;
  overflow: hidden;
}
.fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}
.val {
  width: 5rem;
  font-family: ui-monospace, monospace;
  font-size: 0.72rem;
  opacity: 0.7;
}
</style>
