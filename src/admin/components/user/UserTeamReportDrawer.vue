<script setup>
import { computed, ref, watch } from 'vue'
import { getTeamReport } from '../../repositories/userRelationshipRepository.js'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'
import CompactPagination from '../CompactPagination.vue'

const PAGE_SIZE = 10

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  returnFocus: { type: [Object, Function], default: null }
})
const emit = defineEmits(['close', 'closed'])
const drawerRef = ref(null)
const titleRef = ref(null)
const currentPage = ref(1)
const userId = computed(() => String(props.user?.id ?? props.user?.userId ?? ''))
const report = computed(() => {
  props.visible
  return userId.value ? getTeamReport(userId.value) : null
})
const hasMembers = computed(() => Number(report.value?.memberCount || 0) > 0)
const branches = computed(() => report.value?.branches || [])
const totalPages = computed(() => Math.max(1, Math.ceil(branches.value.length / PAGE_SIZE)))
const pagedBranches = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return branches.value.slice(start, start + PAGE_SIZE)
})
const formatNumber = (value, maximumFractionDigits = 2) => new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(Number(value || 0))
const signedProfit = (value) => {
  const number = Number(value || 0)
  return `${number > 0 ? '+' : ''}${formatNumber(number)}`
}
const profitLabel = (value) => Number(value || 0) >= 0 ? '盈利' : '亏损'
const metricCards = computed(() => report.value ? [
  { label: '裂变团队总人数', value: formatNumber(report.value.memberCount, 0) },
  { label: '直属裂变下级人数', value: formatNumber(report.value.directCount, 0) },
  { label: '裂变代理人数', value: formatNumber(report.value.agentCount, 0) },
  { label: '裂变活跃人数', value: formatNumber(report.value.activeCount, 0) },
  { label: '裂变总可用余额', value: `${formatNumber(report.value.availableBalance)} USDT` },
  { label: '裂变总冻结余额', value: `${formatNumber(report.value.frozenBalance)} USDT` },
  { label: '裂变总交易量', value: `${formatNumber(report.value.tradingVolume)} USDT` },
  { label: '裂变团队累计盈亏', value: `${profitLabel(report.value.totalProfit)} ${signedProfit(report.value.totalProfit)} USDT`, profit: true, positive: report.value.totalProfit >= 0 }
] : [])

const {
  rendered,
  phase,
  layerStyle,
  requestDialogClose,
  onAfterEnter,
  onAfterLeave
} = useDialogLifecycle({
  open: computed(() => props.visible),
  dialogRef: drawerRef,
  initialFocusRef: titleRef,
  returnFocusRef: computed(() => props.returnFocus),
  requestClose: () => emit('close')
})
const close = createDialogCloseAction(requestDialogClose)
const handleAfterLeave = async () => {
  if (!await onAfterLeave()) return
  emit('closed')
}

watch(() => [props.visible, userId.value], ([visible]) => {
  if (visible) currentPage.value = 1
})

watch(totalPages, (nextTotalPages) => {
  currentPage.value = Math.min(currentPage.value, nextTotalPages)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="team-report-overlay" appear @after-enter="onAfterEnter" @after-leave="handleAfterLeave">
      <div v-if="rendered" v-show="phase !== 'closing'" class="fixed inset-0 flex justify-end bg-slate-950/50" :style="layerStyle" role="presentation">
        <section ref="drawerRef" class="team-report-panel flex h-screen max-h-screen w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl supports-[height:100dvh]:h-dvh supports-[height:100dvh]:max-h-dvh" role="dialog" aria-modal="true" aria-labelledby="team-report-title">
          <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5" style="padding-left: max(1rem, env(safe-area-inset-left)); padding-right: max(1rem, env(safe-area-inset-right));">
            <div class="min-w-0 flex-1">
              <h2 id="team-report-title" ref="titleRef" tabindex="-1" class="text-xl font-semibold text-slate-900 outline-none">裂变团队报表</h2>
              <p class="mt-1 break-words text-sm text-slate-500">{{ user?.username || '未知用户' }} · UID {{ userId || '—' }} · 裂变统计范围不包含本人</p>
            </div>
            <button type="button" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="关闭" @click="close">×</button>
          </header>

          <div data-testid="team-report-drawer-body" class="min-h-0 flex flex-1 flex-col overflow-hidden px-4 py-4 sm:px-5" style="padding-left: max(1rem, env(safe-area-inset-left)); padding-right: max(1rem, env(safe-area-inset-right));">
            <template v-if="hasMembers">
              <section data-testid="team-report-overview-scroll" class="min-h-0 max-h-[min(18rem,38vh)] shrink overflow-y-auto overscroll-y-contain outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset" role="region" tabindex="0" aria-labelledby="team-report-overview-title">
                <h3 id="team-report-overview-title" class="text-sm font-semibold text-slate-900">裂变团队概览</h3>
                <div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div v-for="metric in metricCards" :key="metric.label" data-testid="team-report-metric" class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p class="text-xs text-slate-500">{{ metric.label }}</p>
                    <p class="mt-1 break-words text-sm font-semibold" :class="metric.profit ? (metric.positive ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-900'">{{ metric.value }}</p>
                  </div>
                </div>
              </section>

              <section data-testid="team-report-branch-header" class="mt-5 shrink-0" aria-labelledby="team-report-branch-title">
                <h3 id="team-report-branch-title" class="text-sm font-semibold text-slate-900">直属裂变分支明细</h3>
              </section>
              <div data-testid="team-report-branch-scroll" class="min-h-20 flex-1 overflow-y-auto overscroll-y-contain outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset" role="region" :tabindex="branches.length ? 0 : undefined" aria-labelledby="team-report-branch-title">
                <div class="mt-2 space-y-2">
                  <article v-for="branch in pagedBranches" :key="branch.user.id" class="rounded-xl border border-slate-200 bg-white p-3">
                    <div class="flex flex-wrap items-start justify-between gap-2">
                      <p class="font-medium text-slate-900">{{ branch.user.username }} <span class="ml-1 text-xs font-normal text-slate-500">UID {{ branch.user.id }}</span></p>
                      <span class="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{{ branch.memberCount }} 人</span>
                    </div>
                    <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                      <div><dt class="text-slate-500">可用余额</dt><dd class="mt-0.5 font-medium text-slate-800">{{ formatNumber(branch.availableBalance) }} USDT</dd></div>
                      <div><dt class="text-slate-500">冻结余额</dt><dd class="mt-0.5 font-medium text-slate-800">{{ formatNumber(branch.frozenBalance) }} USDT</dd></div>
                      <div><dt class="text-slate-500">交易量</dt><dd class="mt-0.5 font-medium text-slate-800">{{ formatNumber(branch.tradingVolume) }} USDT</dd></div>
                      <div><dt class="text-slate-500">累计盈亏</dt><dd class="mt-0.5 font-medium" :class="branch.totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'">{{ profitLabel(branch.totalProfit) }} {{ signedProfit(branch.totalProfit) }} USDT</dd></div>
                    </dl>
                  </article>
                  <p v-if="!pagedBranches.length" class="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">当前没有直属裂变分支</p>
                </div>
              </div>
              <footer v-if="branches.length" data-testid="team-report-pagination" class="shrink-0 border-t border-slate-200 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <CompactPagination v-model:current-page="currentPage" :total-count="branches.length" :page-size="PAGE_SIZE" />
              </footer>
            </template>

            <div v-else data-testid="team-report-empty-state" class="grid min-h-0 flex-1 place-items-center overflow-y-auto rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] text-center">
              <div><p class="font-medium text-slate-700">当前没有裂变团队成员</p><p class="mt-1 text-sm text-slate-500">该用户尚无可统计的裂变下级关系。</p></div>
            </div>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.team-report-overlay-enter-active { transition: opacity 200ms ease-out; }
.team-report-overlay-leave-active { transition: opacity 150ms ease-in; }
.team-report-overlay-enter-active .team-report-panel { transition: opacity 200ms ease-out, transform 200ms ease-out; }
.team-report-overlay-leave-active .team-report-panel { transition: opacity 150ms ease-in, transform 150ms ease-in; }
.team-report-overlay-enter-from,
.team-report-overlay-leave-to { opacity: 0; }
.team-report-overlay-enter-from .team-report-panel,
.team-report-overlay-leave-to .team-report-panel { opacity: 0; transform: translateX(100%); }
@media (prefers-reduced-motion: reduce) {
  .team-report-overlay-enter-active,
  .team-report-overlay-leave-active,
  .team-report-overlay-enter-active .team-report-panel,
  .team-report-overlay-leave-active .team-report-panel { transition-duration: 50ms; }
  .team-report-overlay-enter-from .team-report-panel,
  .team-report-overlay-leave-to .team-report-panel { transform: none; }
}
</style>
