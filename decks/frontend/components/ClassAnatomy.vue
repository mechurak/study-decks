<!--
  긴 유틸리티 클래스 문자열이 사실은 몇 개의 "관심사"로 나뉜다는 것을 색으로 보여준다.
  Tailwind 클래스가 길어 보이는 이유를 설명할 때 쓴다.
-->
<script setup>
defineProps({
  groups: { type: Array, required: true }, // [[그룹명, '클래스 클래스 …'], ...]
})

const palette = {
  레이아웃: ['#e0e7ff', '#3730a3'],
  크기: ['#dbeafe', '#1e40af'],
  간격: ['#dcfce7', '#166534'],
  타이포: ['#fef3c7', '#92400e'],
  색상: ['#fce7f3', '#9d174d'],
  테두리: ['#ede9fe', '#5b21b6'],
  상태: ['#ffe4e6', '#9f1239'],
  반응형: ['#ccfbf1', '#115e59'],
  애니메이션: ['#f3e8ff', '#6b21a8'],
}

function bg(name) {
  return (palette[name] || ['#f4f4f5', '#3f3f46'])[0]
}
function fg(name) {
  return (palette[name] || ['#f4f4f5', '#3f3f46'])[1]
}
</script>

<template>
  <div class="anat">
    <div v-for="[name, classes] in groups" :key="name" class="grow">
      <span class="gname" :style="{ background: bg(name), color: fg(name) }">{{ name }}</span>
      <span class="cls">
        <code
          v-for="c in classes.split(' ')"
          :key="c"
          :style="{ background: bg(name), color: fg(name) }"
        >{{ c }}</code>
      </span>
    </div>
  </div>
</template>

<style scoped>
.anat {
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
}
.grow {
  display: flex;
  align-items: baseline;
  gap: 0.55rem;
}
.gname {
  font-size: 0.66rem;
  font-weight: 700;
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
  width: 4.6rem;
  flex-shrink: 0;
  text-align: center;
}
.cls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.cls code {
  font-family: ui-monospace, monospace;
  font-size: 0.68rem;
  padding: 0.06rem 0.4rem;
  border-radius: 4px;
}
html.dark .gname,
html.dark .cls code {
  filter: brightness(0.9);
}
</style>
