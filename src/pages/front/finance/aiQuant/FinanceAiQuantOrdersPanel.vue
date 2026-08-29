<script setup>
import { computed, onUnmounted, ref, watch, watchEffect } from 'vue'
import FrontPopupCard from '../../../../components/front/FrontPopupCard.vue'
import FrontPopupCloseButton from '../../../../components/front/FrontPopupCloseButton.vue'
import FrontPopupShell from '../../../../components/front/FrontPopupShell.vue'
import { createAiQuantOrdersMock, createYieldAdjustmentsMock } from '../../../../admin/mock/aiQuant'
import { buildAiQuantDemoExtraOrders, buildAiQuantDemoExtraAdjustments } from '../../../../admin/mock/frontFinanceDemoBulk'
import { aiQuantProductsCatalog } from '../../../../admin/state/financeCatalogs'
import { ORDER_STATUS, orderStatusMeta, adjustmentTypeMeta } from '../../../../admin/constants/aiQuant'
import { FINANCE_FX as fx } from '../../../../constants/frontFinanceUi'

const prefix = '/front'
const ORDER_BATCH_SIZE = 8

const products = aiQuantProductsCatalog
const orders = ref([...createAiQuantOrdersMock(), ...buildAiQuantDemoExtraOrders()])
const yieldAdjustments = ref([...createYieldAdjustmentsMock(), ...buildAiQuantDemoExtraAdjustments()])
const recordTab = ref('running')
const visibleRecordCount = ref(ORDER_BATCH_SIZE)

const runningOrders = computed(() =>
  orders.value.filter((o) => o.status === ORDER_STATUS.RUNNING)
)

const buyOrders = computed(() =>
  orders.value.filter(
    (o) =>
      o.status === ORDER_STATUS.RUNNING ||
      o.status === ORDER_STATUS.COMPLETED ||
      o.status === ORDER_STATUS.SETTLED ||
      o.status === ORDER_STATUS.LOCKED ||
      o.status === ORDER_STATUS.CANCELLED
  )
)

const redeemOrders = computed(() =>
  orders.value.filter((o) => o.status === ORDER_STATUS.EARLY_REDEEMED)
)

const rowsForTab = computed(() => {
  if (recordTab.value === 'running') return runningOrders.value
  if (recordTab.value === 'buy') return buyOrders.value
  if (recordTab.value === 'redeem') return redeemOrders.value
  return yieldAdjustments.value
})

const visibleRows = computed(() => rowsForTab.value.slice(0, visibleRecordCount.value))
const hasMoreRows = computed(() => visibleRecordCount.value < rowsForTab.value.length)

watch(recordTab, () => {
  visibleRecordCount.value = ORDER_BATCH_SIZE
})

function loadMoreRows() {
  visibleRecordCount.value = Math.min(
    visibleRecordCount.value + ORDER_BATCH_SIZE,
    rowsForTab.value.length
  )
}

function orderStatusPillClass(status) {
  if (status === ORDER_STATUS.RUNNING) return 'bg-sky-400/15 text-sky-200'
  if (status === ORDER_STATUS.COMPLETED) return 'bg-lime-400/12 text-lime-200'
  if (status === ORDER_STATUS.SETTLED) return 'bg-white/10 text-white/60'
  if (status === ORDER_STATUS.EARLY_REDEEMED) return 'bg-lime-400/12 text-lime-200'
  if (status === ORDER_STATUS.LOCKED) return 'bg-amber-400/15 text-amber-200'
  if (status === ORDER_STATUS.CANCELLED) return 'bg-rose-400/15 text-rose-200'
  return 'bg-white/10 text-white/55'
}

function productForAiOrder(o) {
  if (!o?.productId) return null
  return products.value.find((p) => p.id === o.productId) ?? null
}

function canApplyEarlyRedeemAiOrder(o) {
  if (!o || o.status !== ORDER_STATUS.RUNNING) return false
  const p = productForAiOrder(o)
  if (p && p.earlyRedeemEnabled === false) return false
  return true
}

function formatAiQuantOrderEndLabel(o) {
  if (!o) return '—'
  if (Number(o.totalDays) === 0 || o.endDate == null || o.endDate === '') return '无限期'
  return o.endDate
}

function aiQuantOrderDetailLocation(orderId) {
  return {
    path: `${prefix}/finance/ai-quant/order/${orderId}`,
    query: { from: 'orders' }
  }
}

function formatAiOrderSettledAt() {
  const d = new Date()
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(d)
  const get = (t) => parts.find((x) => x.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`
}

const aiRedeemOpen = ref(false)
const aiRedeemOrder = ref(null)
let clearAiRedeemTimer = null

const aiRedeemProductSnapshot = computed(() =>
  aiRedeemOrder.value ? productForAiOrder(aiRedeemOrder.value) : null
)

function openAiRedeemDialog(order) {
  if (!canApplyEarlyRedeemAiOrder(order)) return
  if (clearAiRedeemTimer != null) {
    clearTimeout(clearAiRedeemTimer)
    clearAiRedeemTimer = null
  }
  aiRedeemOrder.value = order
  aiRedeemOpen.value = true
}

function closeAiRedeemDialog() {
  aiRedeemOpen.value = false
}

function onAiRedeemEscape(e) {
  if (e.key === 'Escape' && aiRedeemOpen.value) closeAiRedeemDialog()
}

function confirmAiEarlyRedeem() {
  const o = aiRedeemOrder.value
  if (!o || !canApplyEarlyRedeemAiOrder(o)) return
  const now = formatAiOrderSettledAt()
  const idx = orders.value.findIndex((x) => x.id === o.id)
  if (idx === -1) return
  orders.value[idx] = {
    ...orders.value[idx],
    status: ORDER_STATUS.EARLY_REDEEMED,
    settledAt: now
  }
  orders.value = [...orders.value]
  aiRedeemOpen.value = false
}

watch(aiRedeemOpen, (open) => {
  if (typeof window === 'undefined') return
  if (open) {
    window.addEventListener('keydown', onAiRedeemEscape)
  } else {
    window.removeEventListener('keydown', onAiRedeemEscape)
    if (clearAiRedeemTimer != null) clearTimeout(clearAiRedeemTimer)
    clearAiRedeemTimer = window.setTimeout(() => {
      aiRedeemOrder.value = null
      clearAiRedeemTimer = null
    }, 360)
  }
})

watchEffect(() => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = aiRedeemOpen.value ? 'hidden' : ''
})

onUnmounted(() => {
  if (clearAiRedeemTimer != null) clearTimeout(clearAiRedeemTimer)
  if (typeof document !== 'undefined') document.body.style.overflow = ''
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onAiRedeemEscape)
  }
})
</script>

<template>
  <section id="my-ai-quant-orders" class="space-y-3" aria-label="AI 量化订单列表">
    <div class="flex flex-col gap-2 px-0 py-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div class="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
        <span
          v-if="rowsForTab.length > 0"
          class="text-[11px] tabular-nums text-white/40 sm:text-xs"
        >共 {{ rowsForTab.length }} 条</span>
      </div>
      <div :class="fx.recordTablist4" role="tablist" aria-label="AI 量化订单类型">
        <button
          type="button"
          role="tab"
          :aria-selected="recordTab === 'running'"
          :class="[fx.recordTab, recordTab === 'running' ? fx.recordTabOn : fx.recordTabOff]"
          @click="recordTab = 'running'"
        >
          运行中
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="recordTab === 'buy'"
          :class="[fx.recordTab, recordTab === 'buy' ? fx.recordTabOn : fx.recordTabOff]"
          @click="recordTab = 'buy'"
        >
          购买
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="recordTab === 'redeem'"
          :class="[fx.recordTab, recordTab === 'redeem' ? fx.recordTabOn : fx.recordTabOff]"
          @click="recordTab = 'redeem'"
        >
          赎回
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="recordTab === 'interest'"
          :class="[fx.recordTab, recordTab === 'interest' ? fx.recordTabOn : fx.recordTabOff]"
          @click="recordTab = 'interest'"
        >
          利息
        </button>
      </div>
    </div>

    <div class="overflow-x-auto">
      <table
        v-if="recordTab === 'running' && rowsForTab.length"
        :class="['w-full min-w-0 border-collapse text-left md:min-w-[560px] md:table-auto max-md:table-fixed', fx.tableBodyText]"
      >
        <thead class="hidden md:table-header-group">
          <tr :class="fx.tableHeadRow">
            <th class="px-3 py-2.5 md:px-5">产品</th>
            <th class="hidden px-3 py-2.5 md:table-cell md:px-5">本金</th>
            <th class="px-3 py-2.5 text-right md:px-5 md:text-left">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="o in visibleRows"
            :key="`mine-run-${o.id}`"
            class="border-b border-white/[0.06] transition hover:bg-white/[0.02] max-md:block max-md:last:border-0 md:table-row"
          >
            <td class="min-w-0 max-md:block max-md:w-full max-md:px-3 max-md:pb-0 max-md:pt-4 md:table-cell md:px-5 md:py-3">
              <p class="text-[14px] font-medium leading-snug text-white sm:text-sm">{{ o.productName }}</p>
              <p class="mt-0.5 tabular-nums text-[11px] text-white/55 sm:text-xs">
                {{ o.principal }} {{ o.currency }}
              </p>
              <div class="mt-3 grid grid-cols-2 gap-2 md:hidden">
                <RouterLink :to="aiQuantOrderDetailLocation(o.id)" :class="fx.btnTableActionBlock">
                  查看详情
                </RouterLink>
                <button
                  v-if="canApplyEarlyRedeemAiOrder(o)"
                  type="button"
                  :class="fx.btnTableActionBlock"
                  @click="openAiRedeemDialog(o)"
                >
                  申请赎回
                </button>
                <p v-else :class="[fx.hintBlock, 'text-center text-[11px]']">
                  不可提前赎回
                </p>
              </div>
            </td>
            <td class="hidden tabular-nums text-white/80 md:table-cell md:px-5 md:py-3">
              {{ o.principal }} {{ o.currency }}
            </td>
            <td class="max-md:hidden md:table-cell md:px-5 md:py-3 md:text-left">
              <div class="flex flex-wrap items-center gap-2">
                <RouterLink :to="aiQuantOrderDetailLocation(o.id)" :class="fx.btnTableAction">
                  查看详情
                </RouterLink>
                <button
                  v-if="canApplyEarlyRedeemAiOrder(o)"
                  type="button"
                  :class="fx.btnTableAction"
                  @click="openAiRedeemDialog(o)"
                >
                  申请赎回
                </button>
                <span v-else class="text-xs text-white/35">不可提前赎回</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p
        v-else-if="recordTab === 'running'"
        class="px-3 py-12 text-center text-sm text-white/40 sm:py-14"
      >
        暂无运行中托管
      </p>

      <table
        v-else-if="recordTab === 'buy' && rowsForTab.length"
        :class="['w-full min-w-0 border-collapse text-left md:min-w-[960px] md:table-auto max-md:table-fixed', fx.tableBodyText]"
      >
        <thead class="hidden md:table-header-group">
          <tr :class="fx.tableHeadRow">
            <th class="px-3 py-2.5 md:px-5">产品名称</th>
            <th class="hidden px-3 py-2.5 md:table-cell md:px-5">购买时间</th>
            <th class="hidden px-3 py-2.5 lg:table-cell lg:px-5">结束时间</th>
            <th class="hidden px-3 py-2.5 md:table-cell md:px-5">支付金额</th>
            <th class="hidden px-3 py-2.5 lg:table-cell lg:px-5">累计收益</th>
            <th class="hidden px-3 py-2.5 md:table-cell md:px-5">日收益</th>
            <th class="px-3 py-2.5 text-right md:px-5 md:text-left">操作</th>
            <th class="px-3 py-2.5 text-right md:px-5">状态</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="o in visibleRows"
            :key="o.id"
            class="border-b border-white/[0.06] hover:bg-white/[0.02] max-md:block max-md:last:border-0 md:table-row"
          >
            <td class="min-w-0 max-md:block max-md:w-full max-md:px-3 max-md:pb-0 max-md:pt-4 md:table-cell md:px-5 md:py-3">
              <p class="text-[14px] font-medium leading-snug text-white sm:text-sm">
                {{ o.productName }}
              </p>
              <div
                class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-white/[0.06] pt-3 text-[11px] text-white/50 md:hidden"
              >
                <span class="text-white/35">购买</span>
                <span class="text-right tabular-nums text-white/70">{{ o.startDate }}</span>
                <span class="text-white/35">结束</span>
                <span class="text-right tabular-nums text-white/70">{{ formatAiQuantOrderEndLabel(o) }}</span>
                <span class="text-white/35">支付</span>
                <span class="text-right tabular-nums text-white/80">{{ o.principal }} {{ o.currency }}</span>
                <span class="text-white/35">累计收益</span>
                <span class="text-right tabular-nums text-lime-200/90">{{ o.accumulatedYield }}</span>
                <span class="text-white/35">日收益</span>
                <span class="text-right tabular-nums text-white/70">{{ o.expectedDailyYield }}</span>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-2 md:hidden">
                <RouterLink :to="aiQuantOrderDetailLocation(o.id)" :class="fx.btnTableActionBlock">
                  查看详情
                </RouterLink>
                <template v-if="o.status === ORDER_STATUS.RUNNING">
                  <button
                    v-if="canApplyEarlyRedeemAiOrder(o)"
                    type="button"
                    :class="fx.btnTableActionBlock"
                    @click="openAiRedeemDialog(o)"
                  >
                    申请赎回
                  </button>
                  <p v-else :class="[fx.hintBlock, 'text-center text-[11px]']">
                    不可提前赎回
                  </p>
                </template>
                <span v-else :class="[fx.hintBlock, 'text-center text-[11px]']">—</span>
              </div>
            </td>
            <td class="hidden tabular-nums text-white/55 md:table-cell md:px-5 md:py-3">{{ o.startDate }}</td>
            <td class="hidden tabular-nums text-white/55 lg:table-cell lg:px-5 lg:py-3">{{ formatAiQuantOrderEndLabel(o) }}</td>
            <td class="hidden tabular-nums md:table-cell md:px-5 md:py-3">
              {{ o.principal }} {{ o.currency }}
            </td>
            <td class="hidden tabular-nums text-lime-200/90 lg:table-cell lg:px-5 lg:py-3">
              {{ o.accumulatedYield }}
            </td>
            <td class="hidden tabular-nums text-white/60 md:table-cell md:px-5 md:py-3">
              {{ o.expectedDailyYield }}
            </td>
            <td class="max-md:hidden md:table-cell md:px-5 md:py-3 md:text-left">
              <div class="flex flex-wrap items-center gap-2">
                <RouterLink :to="aiQuantOrderDetailLocation(o.id)" :class="fx.btnTableAction">
                  查看详情
                </RouterLink>
                <template v-if="o.status === ORDER_STATUS.RUNNING">
                  <button
                    v-if="canApplyEarlyRedeemAiOrder(o)"
                    type="button"
                    :class="fx.btnTableAction"
                    @click="openAiRedeemDialog(o)"
                  >
                    申请赎回
                  </button>
                  <span v-else class="text-xs text-white/35">不可提前赎回</span>
                </template>
                <span v-else class="text-xs text-white/35">—</span>
              </div>
            </td>
            <td
              class="max-md:block max-md:w-full max-md:px-3 max-md:pb-4 max-md:pt-1 md:table-cell md:px-5 md:py-3 md:text-left"
            >
              <span
                class="inline-flex min-h-[1.75rem] items-center rounded-full px-2.5 py-1 text-[11px] font-semibold sm:text-xs md:px-2.5"
                :class="orderStatusPillClass(o.status)"
              >
                {{ orderStatusMeta[o.status]?.label ?? o.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <p
        v-else-if="recordTab === 'buy'"
        class="px-3 py-12 text-center text-sm text-white/40 sm:py-14"
      >
        暂无数据
      </p>

      <table
        v-else-if="recordTab === 'redeem' && rowsForTab.length"
        :class="['w-full min-w-0 border-collapse text-left md:min-w-[640px] md:table-auto max-md:table-fixed', fx.tableBodyText]"
      >
        <thead class="hidden md:table-header-group">
          <tr :class="fx.tableHeadRow">
            <th class="px-3 py-2.5 md:px-5">产品名称</th>
            <th class="hidden px-3 py-2.5 md:table-cell md:px-5">赎回时间</th>
            <th class="hidden px-3 py-2.5 md:table-cell md:px-5">本金</th>
            <th class="hidden px-3 py-2.5 md:table-cell md:px-5">操作</th>
            <th class="px-3 py-2.5 text-right md:px-5">状态</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="o in visibleRows"
            :key="o.id"
            class="border-b border-white/[0.06] hover:bg-white/[0.02] max-md:block max-md:last:border-0 md:table-row"
          >
            <td class="min-w-0 max-md:block max-md:w-full max-md:px-3 max-md:pb-0 max-md:pt-4 md:px-5 md:py-3">
              <p class="text-[14px] font-medium leading-snug text-white sm:text-sm">{{ o.productName }}</p>
              <div
                class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-white/[0.06] pt-3 text-[11px] text-white/50 md:hidden"
              >
                <span class="text-white/35">赎回时间</span>
                <span class="text-right tabular-nums text-white/70">{{ o.settledAt || o.endDate }}</span>
                <span class="text-white/35">本金</span>
                <span class="text-right tabular-nums text-white/80">{{ o.principal }} {{ o.currency }}</span>
              </div>
              <div class="mt-3 md:hidden">
                <RouterLink :to="aiQuantOrderDetailLocation(o.id)" :class="fx.btnTableActionBlock">
                  查看详情
                </RouterLink>
              </div>
            </td>
            <td class="hidden tabular-nums text-white/55 md:table-cell md:px-5 md:py-3">
              {{ o.settledAt || '—' }}
            </td>
            <td class="hidden tabular-nums md:table-cell md:px-5 md:py-3">
              {{ o.principal }} {{ o.currency }}
            </td>
            <td class="hidden md:table-cell md:px-5 md:py-3">
              <RouterLink :to="aiQuantOrderDetailLocation(o.id)" :class="fx.btnTableAction">
                查看详情
              </RouterLink>
            </td>
            <td
              class="max-md:block max-md:w-full max-md:px-3 max-md:pb-4 max-md:pt-3 md:px-5 md:py-3 md:text-left"
            >
              <span
                class="inline-flex min-h-[1.75rem] items-center rounded-full px-2.5 py-1 text-[11px] font-semibold sm:text-xs"
                :class="orderStatusPillClass(o.status)"
              >
                {{ orderStatusMeta[o.status]?.label ?? o.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <p
        v-else-if="recordTab === 'redeem'"
        class="px-3 py-12 text-center text-sm text-white/40 sm:py-14"
      >
        暂无数据
      </p>

      <table
        v-else-if="recordTab === 'interest' && rowsForTab.length"
        :class="['w-full min-w-0 border-collapse text-left md:min-w-[720px] md:table-auto max-md:table-fixed', fx.tableBodyText]"
      >
        <thead class="hidden md:table-header-group">
          <tr :class="fx.tableHeadRow">
            <th class="px-3 py-2.5 md:px-5">说明</th>
            <th class="hidden px-3 py-2.5 md:table-cell md:px-5">类型</th>
            <th class="hidden px-3 py-2.5 md:table-cell md:px-5">金额</th>
            <th class="hidden px-3 py-2.5 lg:table-cell lg:px-5">时间</th>
            <th class="px-3 py-2.5 text-right md:px-5">类型</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="a in visibleRows"
            :key="a.id"
            class="border-b border-white/[0.06] hover:bg-white/[0.02] max-md:block max-md:last:border-0 md:table-row"
          >
            <td class="min-w-0 max-md:block max-md:w-full max-md:px-3 max-md:pb-0 max-md:pt-4 md:px-5 md:py-3">
              <p class="text-[14px] leading-snug text-white sm:text-sm">{{ a.reason }}</p>
              <div
                class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-white/[0.06] pt-3 text-[11px] text-white/50 md:hidden"
              >
                <span class="text-white/35">类型</span>
                <span class="text-right text-white/75">{{ adjustmentTypeMeta[a.type]?.label ?? a.type }}</span>
                <span class="text-white/35">金额</span>
                <span class="text-right tabular-nums text-white/80">{{
                  a.amount
                }}{{ a.currency ? ` ${a.currency}` : a.percentage != null ? ` (${a.percentage}%)` : '' }}</span>
                <span class="text-white/35">时间</span>
                <span class="text-right tabular-nums text-white/60">{{ a.createdAt }}</span>
              </div>
            </td>
            <td class="hidden md:table-cell md:px-5 md:py-3">
              {{ adjustmentTypeMeta[a.type]?.label ?? a.type }}
            </td>
            <td class="hidden tabular-nums md:table-cell md:px-5 md:py-3">
              {{ a.amount }}{{ a.currency ? ` ${a.currency}` : a.percentage != null ? ` (${a.percentage}%)` : '' }}
            </td>
            <td class="hidden tabular-nums text-white/50 lg:table-cell lg:px-5 lg:py-3">{{ a.createdAt }}</td>
            <td
              class="max-md:block max-md:w-full max-md:px-3 max-md:pb-4 max-md:pt-2 text-left text-[12px] text-white/70 md:px-5 md:py-3 md:text-right lg:text-sm"
            >
              <p class="text-[11px] text-white/35 md:hidden">类型</p>
              <p class="mt-0.5 break-words md:mt-0">{{ a.productName || a.orderId || '—' }}</p>
            </td>
          </tr>
        </tbody>
      </table>
      <p
        v-else-if="recordTab === 'interest'"
        class="px-3 py-12 text-center text-sm text-white/40 sm:py-14"
      >
        暂无数据
      </p>
    </div>

    <div v-if="hasMoreRows" class="pt-2">
      <button
        type="button"
        class="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-white/12 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-lime-300/50"
        @click="loadMoreRows"
      >
        加载更多订单
      </button>
    </div>

    <FrontPopupShell
      v-model="aiRedeemOpen"
      aria-labelledby="ai-quant-redeem-dialog-title"
    >
      <FrontPopupCard v-if="aiRedeemOrder" variant="padded" wide @click.stop>
        <FrontPopupCloseButton @click="closeAiRedeemDialog" />
        <h2 id="ai-quant-redeem-dialog-title" class="pr-10 text-lg font-semibold tracking-tight text-white">
          确认提前赎回
        </h2>
        <p class="mt-1.5 text-[13px] leading-relaxed text-white/45">
          确认后订单将标记为「提前赎回」，您可在「赎回」记录中查看。
        </p>
        <dl class="mt-4 space-y-2 rounded-xl border border-white/[0.08] bg-black/35 px-3 py-3 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-white/45">产品</dt>
            <dd class="text-right text-white/90">{{ aiRedeemOrder.productName }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-white/45">本金</dt>
            <dd class="tabular-nums font-medium text-white">
              {{ aiRedeemOrder.principal }} {{ aiRedeemOrder.currency }}
            </dd>
          </div>
          <div class="flex justify-between gap-3 border-t border-white/[0.06] pt-2">
            <dt class="text-white/45">规则手续费（约）</dt>
            <dd class="tabular-nums text-amber-200/90">
              {{
                aiRedeemProductSnapshot?.earlyRedeemFeePercent != null
                  ? `${aiRedeemProductSnapshot.earlyRedeemFeePercent}%`
                  : '—'
              }}
            </dd>
          </div>
        </dl>
        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" :class="fx.btnGhost" @click="closeAiRedeemDialog">
            取消
          </button>
          <button type="button" :class="fx.btnPrimary" @click="confirmAiEarlyRedeem">
            确认赎回
          </button>
        </div>
      </FrontPopupCard>
    </FrontPopupShell>
  </section>
</template>
