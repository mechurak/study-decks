<!-- shadcn/ui Button의 variant × size 조합을 실물로 렌더한다. -->
<script setup>
defineProps({
  theme: { type: String, default: 'shadcn' },
  sizes: { type: Boolean, default: true },
})

const variants = [
  ['default', 'Default'],
  ['secondary', 'Secondary'],
  ['destructive', 'Destructive'],
  ['outline', 'Outline'],
  ['ghost', 'Ghost'],
  ['link', 'Link'],
]
</script>

<template>
  <div class="ui ui-surface" :data-theme="theme">
    <div class="row">
      <div v-for="[v, label] in variants" :key="v" class="cell">
        <div class="btnbox">
          <button class="ui-btn" :class="`ui-btn--${v}`">{{ label }}</button>
        </div>
        <code class="tag">variant="{{ v }}"</code>
      </div>
    </div>

    <template v-if="sizes">
      <div class="ui-separator" />
      <div class="row">
        <div class="cell">
          <div class="btnbox"><button class="ui-btn ui-btn--default ui-btn--sm">Small</button></div>
          <code class="tag">size="sm"</code>
        </div>
        <div class="cell">
          <div class="btnbox"><button class="ui-btn ui-btn--default">Default</button></div>
          <code class="tag">size="default"</code>
        </div>
        <div class="cell">
          <div class="btnbox"><button class="ui-btn ui-btn--default ui-btn--lg">Large</button></div>
          <code class="tag">size="lg"</code>
        </div>
        <div class="cell">
          <div class="btnbox"><button class="ui-btn ui-btn--outline ui-btn--icon">★</button></div>
          <code class="tag">size="icon"</code>
        </div>
        <div class="cell">
          <div class="btnbox"><button class="ui-btn ui-btn--default" disabled>Disabled</button></div>
          <code class="tag">disabled</code>
        </div>
        <div class="cell">
          <div class="btnbox"><button class="ui-btn ui-btn--outline" data-focus>Focused</button></div>
          <code class="tag">:focus-visible</code>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem 1.1rem;
  align-items: flex-start;
}
.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}
.btnbox {
  height: 2.7rem;
  display: flex;
  align-items: center;
}
.tag {
  font-size: 0.62rem;
  font-family: ui-monospace, monospace;
  opacity: 0.5;
  background: none;
  padding: 0;
  color: inherit;
}
</style>
