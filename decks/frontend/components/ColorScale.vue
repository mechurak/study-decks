<!-- 색 스케일(50~950)을 스와치로 렌더. 토큰 설계 설명용. -->
<script setup>
defineProps({
  name: { type: String, default: '' },
  colors: { type: Array, required: true },
  steps: {
    type: Array,
    default: () => ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
  },
  note: { type: String, default: '' },
})

// 배경 밝기에 따라 라벨 색을 뒤집는다
function labelColor(hex) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.8)'
}
</script>

<template>
  <div class="wrap">
    <div v-if="name" class="name">{{ name }}</div>
    <div class="swatch-row">
      <div
        v-for="(c, i) in colors"
        :key="i"
        class="swatch"
        :style="{ background: c, color: labelColor(c) }"
      >{{ steps[i] }}</div>
    </div>
    <div v-if="note" class="note">{{ note }}</div>
  </div>
</template>

<style scoped>
.wrap {
  margin-bottom: 0.55rem;
}
.name {
  font-size: 0.7rem;
  font-weight: 700;
  font-family: ui-monospace, monospace;
  opacity: 0.65;
  margin-bottom: 0.2rem;
}
.note {
  font-size: 0.68rem;
  opacity: 0.55;
  margin-top: 0.2rem;
}
</style>
