<!--
  인터랙티브 데모: 버튼으로 토큰 세트를 갈아끼우면 아래 UI 전체가 즉시 바뀐다.
  마크업은 한 줄도 바뀌지 않는다는 점이 이 데모의 요지다.
-->
<script setup>
import { ref } from 'vue'

const themes = [
  ['shadcn', 'shadcn 기본'],
  ['material', 'Material 3'],
  ['radix', 'Radix Colors'],
  ['corporate', '사내 DS'],
  ['dark', 'dark'],
]
const cur = ref('shadcn')

const tokens = {
  shadcn: ['--primary: 240 5.9% 10%', '--radius: 0.5rem', '--border: 240 5.9% 90%'],
  material: ['--primary: 258 34% 48%', '--radius: 1.25rem', '--border: 275 15% 79%'],
  radix: ['--primary: 226 68% 55%', '--radius: 0.375rem', '--border: 222 84% 92%'],
  corporate: ['--primary: 214 78% 36%', '--radius: 0.125rem', '--border: 216 15% 84%'],
  dark: ['--primary: 0 0% 98%', '--radius: 0.5rem', '--border: 240 3.7% 15.9%'],
}
</script>

<template>
  <div>
    <div class="picker">
      <button
        v-for="[k, label] in themes"
        :key="k"
        class="pick"
        :class="{ on: cur === k }"
        @click="cur = k"
      >{{ label }}</button>
      <span class="hint">← 눌러보세요</span>
    </div>

    <div class="stage">
      <LoginCard :theme="cur" />
      <div>
        <div class="ui ui-surface" :data-theme="cur">
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center">
            <button class="ui-btn ui-btn--default">저장</button>
            <button class="ui-btn ui-btn--outline">취소</button>
            <button class="ui-btn ui-btn--ghost">더보기</button>
            <span class="ui-badge ui-badge--default">New</span>
            <span class="ui-badge ui-badge--secondary">Beta</span>
          </div>
          <div class="ui-separator" />
          <div class="ui-tabs">
            <button class="ui-tabs__trigger" data-active="true">개요</button>
            <button class="ui-tabs__trigger">설정</button>
            <button class="ui-tabs__trigger">멤버</button>
          </div>
          <div class="ui-separator" />
          <div class="ui-progress"><div class="ui-progress__bar" style="width: 62%" /></div>
        </div>

        <div class="tokens">
          <div v-for="t in tokens[cur]" :key="t">{{ t }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.picker {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  margin-bottom: 0.7rem;
}
.pick {
  font-size: 0.78rem;
  padding: 0.2rem 0.7rem;
  border-radius: 6px;
  border: 1px solid #d4d4d8;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.pick.on {
  background: #4f46e5;
  border-color: #4f46e5;
  color: #fff;
  font-weight: 600;
}
.hint {
  font-size: 0.7rem;
  opacity: 0.45;
  margin-left: 0.2rem;
}
.stage {
  display: grid;
  grid-template-columns: 17rem 1fr;
  gap: 1rem;
  align-items: start;
}
.tokens {
  margin-top: 0.5rem;
  font-family: ui-monospace, monospace;
  font-size: 0.68rem;
  opacity: 0.6;
  line-height: 1.7;
}
</style>
