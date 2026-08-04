<!--
  같은 컴포넌트 트리를 여러 토큰 세트로 나란히 렌더한다.
  "디자인 시스템 교체 = 토큰 교체"라는 주장을 눈으로 확인시키는 용도.
-->
<script setup>
defineProps({
  themes: { type: Array, default: () => ['shadcn', 'material', 'radix', 'corporate'] },
  labels: { type: Array, default: () => null },
  compact: { type: Boolean, default: false },
})

const fallback = {
  shadcn: 'shadcn/ui 기본 (zinc)',
  material: 'Material Design 3',
  radix: 'Radix Colors (indigo)',
  corporate: '사내 엔터프라이즈',
  dark: 'shadcn dark',
}
</script>

<template>
  <div class="cmp" :style="{ gridTemplateColumns: `repeat(${themes.length}, minmax(0, 1fr))` }">
    <div v-for="(t, i) in themes" :key="t">
      <div class="cap">{{ (labels && labels[i]) || fallback[t] || t }}</div>
      <LoginCard :theme="t" :compact="compact" />
    </div>
  </div>
</template>

<style scoped>
.cmp {
  display: grid;
  gap: 0.9rem;
}
.cap {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  opacity: 0.55;
  margin-bottom: 0.35rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
