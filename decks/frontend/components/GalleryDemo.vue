<!-- shadcn/ui로 만든 화면의 "느낌"을 한 장에 압축해서 보여준다. -->
<script setup>
defineProps({
  theme: { type: String, default: 'shadcn' },
})

const rows = [
  ['김서연', 'Owner', 'active'],
  ['박지훈', 'Member', 'invited'],
  ['이도윤', 'Viewer', 'active'],
]
</script>

<template>
  <div class="ui ui-surface" :data-theme="theme">
    <div class="top">
      <div class="ui-tabs">
        <button class="ui-tabs__trigger" data-active="true">멤버</button>
        <button class="ui-tabs__trigger">청구</button>
        <button class="ui-tabs__trigger">알림</button>
      </div>
      <div style="flex: 1" />
      <input class="ui-input" placeholder="검색…" style="width: 9rem" readonly />
      <button class="ui-btn ui-btn--default ui-btn--sm">초대</button>
    </div>

    <div class="ui-separator" />

    <table class="ui-table">
      <thead>
        <tr><th>이름</th><th>역할</th><th>상태</th><th></th></tr>
      </thead>
      <tbody>
        <tr v-for="[name, role, status] in rows" :key="name">
          <td>
            <span style="display: inline-flex; align-items: center; gap: 0.5rem">
              <span class="ui-avatar" style="width: 1.6rem; height: 1.6rem; font-size: 0.6rem">
                {{ name.slice(0, 1) }}
              </span>
              {{ name }}
            </span>
          </td>
          <td>{{ role }}</td>
          <td>
            <span class="ui-badge" :class="status === 'active' ? 'ui-badge--secondary' : 'ui-badge--outline'">
              {{ status }}
            </span>
          </td>
          <td style="text-align: right">
            <button class="ui-btn ui-btn--ghost ui-btn--sm">⋯</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="ui-separator" />

    <div class="ui-alert">
      <span>ℹ️</span>
      <div>
        <div class="ui-alert__title">시트 3개 중 3개 사용 중</div>
        <div class="ui-alert__desc">더 초대하려면 플랜을 업그레이드하세요.</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.top {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
</style>
