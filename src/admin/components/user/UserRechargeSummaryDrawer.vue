<script setup>
import AdminDrawer from '../antd/AdminDrawer.vue'
import { AdminButton } from '../antd/controls.js'

import { computed, ref, watch } from 'vue'
import CompactPagination from '../CompactPagination.vue'

const PAGE_SIZE = 5

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  summary: { type: Object, default: null },
  returnFocus: { type: [Object, Function], default: null }
})
const emit = defineEmits(['close', 'closed'])
const displaySummary = ref(null)
const currentPage = ref(1)
const recordListRef = ref(null)
const userId = computed(() => String(props.user?.id ?? props.user?.userId ?? ''))
const records = computed(() => displaySummary.value?.records || [])
const pagedRecords = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return records.value.slice(start, start + PAGE_SIZE)
})
const money = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatTime = (value) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—'
const scrollRecordsToTop = () => {
  if (recordListRef.value) recordListRef.value.scrollTop = 0
}
const setCurrentPage = (page) => {
  currentPage.value = page
  scrollRecordsToTop()
}
const captureSummary = () => {
  displaySummary.value = props.summary ? JSON.parse(JSON.stringify(props.summary)) : null
  currentPage.value = 1
  scrollRecordsToTop()
}

// Frame: AdminDrawer (Ant Drawer + useDialogLifecycle), drawer migration 2026-11-27.
const drawerFrame = ref(null)

const handleClosed = () => {
  displaySummary.value = null
  emit('closed')
}
watch(() => [props.visible, props.summary, userId.value], ([visible]) => { if (visible) captureSummary() }, { immediate: true, deep: true })
</script>

<template>
  <AdminDrawer :open="visible" title="会员累计充值" title-id="user-recharge-summary-title" :return-focus="returnFocus" testid="user-recharge-summary-drawer" :width="672" plain ref="drawerFrame" @close="emit('close')" @closed="handleClosed">
      <template #subtitle>{{ user?.username || '未知用户' }} · UID {{ userId || '—' }} · VIP{{ displaySummary?.currentVipLevel ?? user?.vipLevel ?? 0 }}</template>
      <div data-testid="user-recharge-summary-body" class="recharge-drawer-body min-h-0 flex flex-1 flex-col overflow-hidden px-4 py-4 sm:px-5" style="padding-right: max(1rem, env(safe-area-inset-right));">
            <section data-testid="user-recharge-summary-overview" class="recharge-drawer-fixed-overview grid shrink-0 grid-cols-1 gap-3 min-[520px]:grid-cols-[220px_minmax(0,1fr)]" aria-label="累计充值概况">
              <div class="recharge-drawer-overview-card rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p class="text-xs text-slate-500">累计充值</p>
                <p class="mt-1 text-xl font-semibold text-slate-900">{{ money(displaySummary?.cumulativeRecharge) }} <span class="text-xs font-normal text-slate-500">USDT</span></p>
              </div>
              <section v-if="displaySummary?.nextLevel" class="recharge-drawer-overview-card rounded-xl border border-blue-200 bg-blue-50 p-4" aria-labelledby="next-vip-progress-title">
                <div class="flex items-start justify-between gap-3">
                  <div><h3 id="next-vip-progress-title" class="text-sm font-semibold text-blue-950">距离 {{ displaySummary.nextLevel.name }} · {{ displaySummary.nextLevel.displayName }}</h3><p class="mt-1 text-xs text-blue-700">还需 {{ money(displaySummary.nextLevel.remainingRecharge) }} USDT</p></div>
                  <span class="shrink-0 text-sm font-semibold text-blue-800">{{ displaySummary.nextLevel.progressPercent }}%</span>
                </div>
                <div class="mt-3 h-2 overflow-hidden rounded-full bg-blue-100" role="progressbar" :aria-valuenow="displaySummary.nextLevel.progressPercent" aria-valuemin="0" aria-valuemax="100" :aria-label="`升级 ${displaySummary.nextLevel.name} 进度`">
                  <div class="h-full rounded-full bg-blue-600" :style="{ width: `${displaySummary.nextLevel.progressPercent}%` }" />
                </div>
                <p class="mt-2 text-xs text-blue-700">目标累计计入金额 {{ money(displaySummary.nextLevel.targetRecharge) }} USDT</p>
              </section>
              <p v-else class="recharge-drawer-overview-card rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">当前计入金额已达到最高启用会员等级门槛。</p>
            </section>

            <section class="recharge-drawer-records-section mt-4 min-h-0 flex flex-1 flex-col" aria-labelledby="recharge-records-title">
              <div class="flex shrink-0 items-center justify-between"><h3 id="recharge-records-title" class="text-sm font-semibold text-slate-900">充值记录</h3><span class="text-xs text-slate-500">共 {{ displaySummary?.records?.length || 0 }} 笔</span></div>
              <div ref="recordListRef" data-testid="user-recharge-record-list" tabindex="0" aria-labelledby="recharge-records-title" class="recharge-drawer-record-list min-h-0 flex flex-1 flex-col gap-2 overflow-y-auto pt-2 focus-visible:outline-none">
                <template v-if="records.length">
                  <article v-for="record in pagedRecords" :key="record.id" class="rounded-xl border border-slate-200 p-3 text-sm">
                    <div class="flex flex-wrap items-start justify-between gap-2"><div><p class="font-semibold text-slate-900">{{ money(record.amount) }} USDT</p></div><span class="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{{ record.source }}</span></div>
                    <dl class="mt-3 grid grid-cols-[4.5rem_1fr] gap-y-1 text-xs"><dt class="text-slate-500">流水号</dt><dd class="break-all text-slate-700">{{ record.transactionId }}</dd><dt class="text-slate-500">充值时间</dt><dd class="text-slate-700">{{ formatTime(record.createdAt) }}</dd></dl>
                  </article>
                </template>
                <p v-else class="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">暂无计入会员等级的充值记录</p>
              </div>
              <div data-testid="user-recharge-pagination" class="recharge-drawer-fixed-pagination shrink-0 pt-3" style="padding-bottom: max(1rem, env(safe-area-inset-bottom));">
                <CompactPagination
                  class="recharge-drawer-pagination-control rounded-xl border border-slate-200"
                  :current-page="currentPage"
                  :total-count="records.length"
                  :page-size="PAGE_SIZE"
                  :always-show-navigation="true"
                  @update:current-page="setCurrentPage"
                />
              </div>
            </section>
          </div>
    </AdminDrawer>
</template>

<style scoped>
@media (max-height: 44rem) {
  .recharge-drawer-body { padding-top: 0.75rem; padding-bottom: 0.75rem; }
  .recharge-drawer-fixed-overview { gap: 0.5rem; }
  .recharge-drawer-overview-card { padding: 0.75rem; }
  .recharge-drawer-records-section { margin-top: 0.75rem; }
  .recharge-drawer-record-list { gap: 0.5rem; padding-top: 0.5rem; }
  .recharge-drawer-fixed-pagination { padding-top: 0.5rem; }
  .recharge-drawer-fixed-pagination :deep(.recharge-drawer-pagination-control) { gap: 0.5rem; padding: 0.5rem 0.75rem; }
}

@media (max-height: 32rem) {
  .recharge-drawer-body { padding-top: 0.5rem; padding-bottom: 0.5rem; }
  .recharge-drawer-overview-card { padding: 0.5rem; }
  .recharge-drawer-records-section { margin-top: 0.5rem; }
  .recharge-drawer-record-list { min-height: 2.5rem; }
  .recharge-drawer-fixed-pagination :deep(.recharge-drawer-pagination-control) { padding: 0.375rem 0.5rem; }
}
</style>
