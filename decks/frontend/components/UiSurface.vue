<!--
  슬라이드 안에 "실물 UI"를 얹는 표면.
  theme prop으로 토큰 세트를 갈아끼운다 (style.css의 .ui[data-theme=...] 참고).
-->
<script setup>
defineProps({
  theme: { type: String, default: 'shadcn' },
  label: { type: String, default: '' },
  padded: { type: Boolean, default: true },
})
</script>

<template>
  <div class="ui-surface-wrap">
    <div v-if="label" class="ui-surface-label">{{ label }}</div>
    <div class="ui" :class="{ 'ui-surface': padded }" :data-theme="theme">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.ui-surface-wrap {
  min-width: 0;
}
.ui-surface-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.5;
  margin-bottom: 0.3rem;
}
</style>
