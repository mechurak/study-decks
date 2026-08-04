<!--
  Tailwind 스케일을 눈금이 아니라 "실제 크기"로 보여준다.
  kind: spacing | radius | text | shadow
-->
<script setup>
defineProps({
  kind: { type: String, default: 'spacing' },
})

const spacing = [
  ['0.5', '2px'], ['1', '4px'], ['2', '8px'], ['3', '12px'], ['4', '16px'],
  ['6', '24px'], ['8', '32px'], ['12', '48px'], ['16', '64px'], ['24', '96px'],
]
const radius = [
  ['rounded-none', '0'], ['rounded-sm', '2px'], ['rounded', '4px'], ['rounded-md', '6px'],
  ['rounded-lg', '8px'], ['rounded-xl', '12px'], ['rounded-2xl', '16px'], ['rounded-full', '9999px'],
]
const text = [
  ['text-xs', '12px', '16px'], ['text-sm', '14px', '20px'], ['text-base', '16px', '24px'],
  ['text-lg', '18px', '28px'], ['text-xl', '20px', '28px'], ['text-2xl', '24px', '32px'],
  ['text-3xl', '30px', '36px'], ['text-4xl', '36px', '40px'],
]
const shadow = [
  ['shadow-sm', '0 1px 2px 0 rgb(0 0 0 / .05)'],
  ['shadow', '0 1px 3px 0 rgb(0 0 0 / .1), 0 1px 2px -1px rgb(0 0 0 / .1)'],
  ['shadow-md', '0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1)'],
  ['shadow-lg', '0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1)'],
  ['shadow-xl', '0 20px 25px -5px rgb(0 0 0 / .1), 0 8px 10px -6px rgb(0 0 0 / .1)'],
]
</script>

<template>
  <div class="viz">
    <template v-if="kind === 'spacing'">
      <div v-for="[k, px] in spacing" :key="k" class="line">
        <code class="k">p-{{ k }}</code>
        <div class="bar" :style="{ width: px }" />
        <span class="px">{{ px }}</span>
      </div>
    </template>

    <template v-else-if="kind === 'radius'">
      <div class="grid">
        <div v-for="[k, r] in radius" :key="k" class="rcell">
          <div class="rbox" :style="{ borderRadius: r }" />
          <code class="k2">{{ k }}</code>
        </div>
      </div>
    </template>

    <template v-else-if="kind === 'text'">
      <div v-for="[k, size, lh] in text" :key="k" class="tline">
        <code class="k">{{ k }}</code>
        <span :style="{ fontSize: size, lineHeight: lh }">다람쥐 헌 쳇바퀴 Ag</span>
        <span class="px">{{ size }} / {{ lh }}</span>
      </div>
    </template>

    <template v-else>
      <div class="grid">
        <div v-for="[k, sh] in shadow" :key="k" class="rcell">
          <div class="sbox" :style="{ boxShadow: sh }" />
          <code class="k2">{{ k }}</code>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.viz {
  font-size: 0.8rem;
}
.line,
.tline {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin: 0.18rem 0;
}
.tline {
  margin: 0.1rem 0;
}
.k {
  font-family: ui-monospace, monospace;
  font-size: 0.7rem;
  width: 5.5rem;
  flex-shrink: 0;
  opacity: 0.7;
  background: none;
  padding: 0;
  color: inherit;
}
.k2 {
  font-family: ui-monospace, monospace;
  font-size: 0.66rem;
  opacity: 0.65;
  background: none;
  padding: 0;
  color: inherit;
}
.bar {
  height: 0.85rem;
  background: #6366f1;
  border-radius: 2px;
}
.px {
  font-size: 0.66rem;
  opacity: 0.45;
  font-family: ui-monospace, monospace;
}
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
}
.rcell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}
.rbox {
  width: 3.2rem;
  height: 3.2rem;
  background: #6366f1;
}
.sbox {
  width: 3.6rem;
  height: 3.2rem;
  background: #fff;
  border-radius: 6px;
}
html.dark .sbox {
  background: #3f3f46;
}
</style>
