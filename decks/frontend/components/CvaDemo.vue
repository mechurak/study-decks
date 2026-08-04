<!--
  cva(class-variance-authority)가 하는 일을 인터랙티브로 보여준다.
  variant/size를 고르면 → 생성되는 클래스 문자열 → 실제 렌더 결과가 동시에 바뀐다.
-->
<script setup>
import { ref, computed } from 'vue'

const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors'

const variantClasses = {
  default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  outline: 'border border-input bg-background hover:bg-accent',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
}
const sizeClasses = {
  sm: 'h-8 rounded-md px-3 text-xs',
  default: 'h-9 px-4 py-2',
  lg: 'h-10 rounded-md px-8',
}

const variant = ref('default')
const size = ref('default')

const output = computed(() =>
  `${base} ${variantClasses[variant.value]} ${sizeClasses[size.value]}`
)
</script>

<template>
  <div class="cva">
    <div class="controls">
      <div class="grp">
        <span class="glabel">variant</span>
        <button
          v-for="v in Object.keys(variantClasses)"
          :key="v"
          class="pick"
          :class="{ on: variant === v }"
          @click="variant = v"
        >{{ v }}</button>
      </div>
      <div class="grp">
        <span class="glabel">size</span>
        <button
          v-for="s in Object.keys(sizeClasses)"
          :key="s"
          class="pick"
          :class="{ on: size === s }"
          @click="size = s"
        >{{ s }}</button>
      </div>
    </div>

    <div class="out">
      <div class="col">
        <div class="demo-note">생성된 className</div>
        <code class="classout">{{ output }}</code>
      </div>
      <div class="col">
        <div class="demo-note">렌더 결과</div>
        <div class="ui ui-surface" style="display: flex; justify-content: center">
          <button class="ui-btn" :class="[`ui-btn--${variant}`, size !== 'default' && `ui-btn--${size}`]">
            버튼
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.7rem;
}
.grp {
  display: flex;
  gap: 0.35rem;
  align-items: center;
}
.glabel {
  font-family: ui-monospace, monospace;
  font-size: 0.68rem;
  opacity: 0.5;
  width: 3.6rem;
}
.pick {
  font-size: 0.74rem;
  padding: 0.12rem 0.6rem;
  border-radius: 5px;
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
.out {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 0.9rem;
  align-items: start;
}
.classout {
  display: block;
  font-family: ui-monospace, monospace;
  font-size: 0.66rem;
  line-height: 1.7;
  background: #f4f4f5;
  border-radius: 6px;
  padding: 0.6rem 0.7rem;
  word-break: break-all;
  color: #3f3f46;
}
html.dark .classout {
  background: #27272a;
  color: #d4d4d8;
}
</style>
