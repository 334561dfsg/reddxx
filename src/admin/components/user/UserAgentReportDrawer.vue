<script setup>
import { computed, ref, watch } from 'vue'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'
import CompactPagination from '../CompactPagination.vue'

const PAGE_SIZE = 10

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  report: { type: Object, default: null },
  error: { type: String, default: '' },
  returnFocus: { type: [Object, Function], default: null }
})
const emit = defineEmits(['close', 'closed'])
const drawerRef = ref(null)
const titleRef = ref(null)
const errorRef = ref(null)
const currentPage = ref(1)
const activeTab = ref('daily')
const userId = computed(() => String(props.user?.id ?? props.user?.userId ?? ''))
const productLines = computed(() => props.report?.productLines || [])
const dailyRows = computed(() => props.report?.dailyRows || [])
const totalPages = computed(() => Math.max(1, Math.ceil(dailyRows.value.length / PAGE_SIZE)))
const pagedDailyRows = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return dailyRows.value.slice(start, start + PAGE_SIZE)
})
const formatNumber = (value, digits = 0) => Number(value || 0).toLocaleString('zh-CN', {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits
})
const formatMoney = (value) => `${formatNumber(value, 2)} USDT`
const summaryCards = computed(() => [
  { label: '直属客户数', value: `${formatNumber(props.report?.summary?.directClientCount)} 人` },
  { label: '累计业务量', value: formatMoney(props.report?.summary?.totalVolume) },
  { label: '累计佣金', value: formatMoney(props.report?.summary?.totalCommission) }
])

const { rendered, phase, layerStyle, requestDialogClose, onAfterEnter, onAfterLeave } = useDialogLifecycle({
  open: computed(() => props.visible),
  dialogRef: drawerRef,
  initialFocusRef: computed(() => props.error ? errorRef.value : titleRef.value),
  returnFocusRef: computed(() => props.returnFocus),
  requestClose: () => emit('close')
})
const close = createDialogCloseAction(requestDialogClose)
const handleAfterLeave = async () => {
  if (!await onAfterLeave()) return
  emit('closed')
}

watch(() => [props.visible, userId.value], ([visible]) => {
  if (visible) {
    currentPage.value = 1
    activeTab.value = 'daily'
  }
})

watch(totalPages, (nextTotalPages) => {
  currentPage.value = Math.min(Math.max(1, currentPage.value), nextTotalPages)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="agent-report-drawer" appear @after-enter="onAfterEnter" @after-leave="handleAfterLeave">
      <div v-if="rendered" v-show="phase !== 'closing'" class="fixed inset-0 flex justify-end bg-slate-950/50" :style="layerStyle" role="presentation">
        <aside
          ref="drawerRef"
          data-testid="user-agent-report-drawer"
          class="agent-report-drawer-panel flex h-[100vh] max-h-[100vh] w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl supports-[height:100dvh]:h-[100dvh] supports-[height:100dvh]:max-h-[100dvh]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-agent-report-title"
        >
          <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4" style="padding-right: max(1rem, env(safe-area-inset-right)); padding-left: max(1rem, env(safe-area-inset-left)); padding-top: max(0.75rem, env(safe-area-inset-top));">
            <div class="min-w-0 flex-1">
              <h2 id="user-agent-report-title" ref="titleRef" tabindex="-1" class="break-words text-lg font-semibold text-slate-900 outline-none">代理业务报表</h2>
              <p class="mt-0.5 break-words text-sm text-slate-500">{{ user?.username || '未知代理' }} · UID {{ userId || '—' }}</p>
            </div>
            <button type="button" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="关闭" @click="close">×</button>
          </header>

          <div data-testid="user-agent-report-body" class="min-h-0 flex flex-1 flex-col overflow-hidden px-4 py-4 sm:px-5" style="padding-right: max(1rem, env(safe-area-inset-right)); padding-left: max(1rem, env(safe-area-inset-left));">
            <p v-if="error" ref="errorRef" data-testid="agent-report-error-state" tabindex="-1" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 outline-none" :class="report ? 'shrink-0' : 'min-h-0 flex-1 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]'" role="alert">
              <span class="font-semibold">代理报表加载失败</span><span class="mt-1 block break-words">{{ error }}</span>
            </p>

            <template v-if="report">
              <section data-testid="agent-report-overview" class="shrink-0" aria-labelledby="agent-report-summary-title">
                <h3 id="agent-report-summary-title" class="text-sm font-semibold text-slate-900">业务概览</h3>
                <dl class="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-3">
                  <div v-for="card in summaryCards" :key="card.label" data-testid="agent-report-summary-card" class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <dt class="text-xs text-slate-500">{{ card.label }}</dt>
                    <dd class="mt-1 break-words text-sm font-semibold text-slate-900">{{ card.value }}</dd>
                  </div>
                </dl>
              </section>

              <div data-testid="agent-report-tablist" class="mt-4 grid shrink-0 grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-medium" role="tablist" aria-label="代理业务报表视图">
                <button
                  id="agent-report-products-tab"
                  type="button"
                  class="min-h-10 rounded-lg px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :class="activeTab === 'products' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'"
                  role="tab"
                  :aria-selected="activeTab === 'products' ? 'true' : 'false'"
                  aria-controls="agent-report-products-panel"
                  @click="activeTab = 'products'"
                >产品线汇总</button>
                <button
                  id="agent-report-daily-tab"
                  type="button"
                  class="min-h-10 rounded-lg px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :class="activeTab === 'daily' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'"
                  role="tab"
                  :aria-selected="activeTab === 'daily' ? 'true' : 'false'"
                  aria-controls="agent-report-daily-panel"
                  @click="activeTab = 'daily'"
                >业绩明细</button>
              </div>

              <section
                v-if="activeTab === 'products'"
                id="agent-report-products-panel"
                data-testid="agent-report-products-panel"
                class="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-[max(1rem,env(safe-area-inset-bottom))] outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
                role="tabpanel"
                tabindex="0"
                aria-labelledby="agent-report-products-tab"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <h3 class="text-sm font-semibold text-slate-900">产品线汇总</h3>
                  <span class="text-xs text-slate-500">共 {{ productLines.length }} 个产品线</span>
                </div>
                <div v-if="productLines.length" class="mt-2 overflow-hidden rounded-xl border border-slate-200">
                  <table data-testid="agent-report-product-table" class="w-full divide-y divide-slate-200 text-left text-sm">
                    <thead class="bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th scope="col" class="px-3 py-2 font-medium">产品线</th>
                        <th scope="col" class="px-3 py-2 font-medium">业务量</th>
                        <th scope="col" class="px-3 py-2 font-medium">佣金</th>
                        <th scope="col" class="px-3 py-2 text-right font-medium">订单</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 bg-white">
                      <tr v-for="line in productLines" :key="line.key" data-testid="agent-report-product-row" class="align-top">
                        <th scope="row" class="px-3 py-2 font-medium text-slate-900">{{ line.label }}</th>
                        <td class="px-3 py-2 font-medium text-slate-800">{{ formatMoney(line.volume) }}</td>
                        <td class="px-3 py-2 font-medium text-slate-800">{{ formatMoney(line.commission) }}</td>
                        <td class="px-3 py-2 text-right text-slate-600">{{ formatNumber(line.orderCount) }} 笔</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-else class="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">暂无产品线汇总</p>
              </section>

              <section
                v-else
                id="agent-report-daily-panel"
                data-testid="agent-report-daily-panel"
                class="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-y-contain outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
                :class="dailyRows.length ? '' : 'pb-[max(1rem,env(safe-area-inset-bottom))]'"
                role="tabpanel"
                tabindex="0"
                aria-labelledby="agent-report-daily-tab"
              >
                <div data-testid="agent-report-daily-header" class="flex flex-wrap items-center justify-between gap-2">
                  <h3 class="text-sm font-semibold text-slate-900">代理业绩明细</h3>
                  <span class="text-xs text-slate-500">按日期倒序</span>
                </div>
                <div v-if="dailyRows.length" class="mt-2 space-y-2">
                  <article v-for="row in pagedDailyRows" :key="row.date" data-testid="agent-report-daily-row" class="rounded-xl border border-slate-200 bg-white p-3">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <time :datetime="row.date" class="text-base font-semibold text-slate-900">{{ row.date }}</time>
                      <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{{ formatNumber(row.orderCount) }} 笔订单</span>
                    </div>
                    <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm min-[560px]:grid-cols-4">
                      <div><dt class="text-xs text-slate-500">业务量</dt><dd class="mt-0.5 break-words font-medium text-slate-800">{{ formatMoney(row.volume) }}</dd></div>
                      <div><dt class="text-xs text-slate-500">佣金</dt><dd class="mt-0.5 break-words font-medium text-slate-800">{{ formatMoney(row.commission) }}</dd></div>
                      <div><dt class="text-xs text-slate-500">新增客户</dt><dd class="mt-0.5 font-medium text-slate-800">{{ formatNumber(row.newClients) }} 人</dd></div>
                      <div><dt class="text-xs text-slate-500">订单数</dt><dd class="mt-0.5 font-medium text-slate-800">{{ formatNumber(row.orderCount) }} 笔</dd></div>
                    </dl>
                  </article>
                </div>
                <p v-else class="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">暂无代理业绩明细</p>
              </section>

              <footer v-if="activeTab === 'daily' && dailyRows.length" data-testid="agent-report-pagination" class="shrink-0 border-t border-slate-200 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <CompactPagination v-model:current-page="currentPage" :total-count="dailyRows.length" :page-size="PAGE_SIZE" />
              </footer>
            </template>

            <div v-else-if="!error" data-testid="agent-report-empty-state" class="grid min-h-0 flex-1 place-items-center overflow-y-auto rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] text-center">
              <div><p class="font-medium text-slate-700">当前代理暂无业务报表数据</p><p class="mt-1 text-sm text-slate-500">该代理尚无可统计的客户与佣金记录。</p></div>
            </div>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.agent-report-drawer-enter-active { transition: opacity 200ms ease-out; }
.agent-report-drawer-leave-active { transition: opacity 150ms ease-in; }
.agent-report-drawer-enter-active .agent-report-drawer-panel { transition: transform 200ms ease-out; }
.agent-report-drawer-leave-active .agent-report-drawer-panel { transition: transform 150ms ease-in; }
.agent-report-drawer-enter-from,
.agent-report-drawer-leave-to { opacity: 0; }
.agent-report-drawer-enter-from .agent-report-drawer-panel,
.agent-report-drawer-leave-to .agent-report-drawer-panel { transform: translateX(100%); }
@media (prefers-reduced-motion: reduce) {
  .agent-report-drawer-enter-active,
  .agent-report-drawer-leave-active,
  .agent-report-drawer-enter-active .agent-report-drawer-panel,
  .agent-report-drawer-leave-active .agent-report-drawer-panel { transition-duration: 50ms; }
  .agent-report-drawer-enter-from .agent-report-drawer-panel,
  .agent-report-drawer-leave-to .agent-report-drawer-panel { transform: none; }
}
</style>
