<!--
  Card + Label + Input + Button 조합.
  "같은 마크업이 토큰만 바뀌면 어떻게 달라지는가"를 보여주는 기준 화면으로 쓴다.
-->
<script setup>
defineProps({
  theme: { type: String, default: 'shadcn' },
  compact: { type: Boolean, default: false },
})
</script>

<template>
  <div class="ui" :data-theme="theme">
    <div class="ui-card">
      <div class="ui-card__header">
        <div class="ui-card__title">로그인</div>
        <div class="ui-card__desc">계정으로 계속하기</div>
      </div>
      <div class="ui-card__content">
        <label class="ui-label">이메일</label>
        <input class="ui-input" value="dev@example.com" readonly />
        <div v-if="!compact" style="height: 0.7rem" />
        <template v-if="!compact">
          <label class="ui-label">비밀번호</label>
          <input class="ui-input" type="password" value="secret123" readonly />
        </template>
      </div>
      <div class="ui-card__footer">
        <button class="ui-btn ui-btn--default" style="flex: 1">계속</button>
        <button class="ui-btn ui-btn--ghost">취소</button>
      </div>
    </div>
  </div>
</template>
