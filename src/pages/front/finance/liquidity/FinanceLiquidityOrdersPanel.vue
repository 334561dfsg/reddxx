<script setup>
import { computed, onUnmounted, ref, watch, watchEffect } from 'vue'
import FrontPopupCard from '../../../../components/front/FrontPopupCard.vue'
import FrontPopupCloseButton from '../../../../components/front/FrontPopupCloseButton.vue'
import FrontPopupShell from '../../../../components/front/FrontPopupShell.vue'
import { createLockedOrdersMock } from '../../../../admin/mock/liquidityLocked'
import { buildLockedDemoExtraOrders } from '../../../../admin/mock/frontFinanceDemoBulk'
import { lockedProductsCatalog } from '../../../../admin/state/financeCatalogs'
import { ORDER_STATUS, orderStatusMeta } from '../../../../admin/constants/liquidityLocked'
import { FINANCE_FX as fx } from '../../../../constants/frontFinanceUi'

const prefix = '/front'
const ORDER_BATCH_SIZE = 8

const products = lockedProductsCatalog
const orders = ref([...createLockedOrdersMock(), ...buildLockedDemoExtraOrders()])
const orderTab = ref('active')
const visibleOrderCount = ref(ORDER_BATCH_SIZE)

const activeOrders = computed(() =>
  orders.value.filter((o) => o.status === ORDER_STATUS.LOCKED)
)
const redeemedOrders = computed(() =>
  orders.value.filter(
    (o) => o.status === ORDER_STATUS.COMPLETED || o.status === ORDER_STATUS.EARLY_REDEEMED
  )
)
const ordersForTab = computed(() => (orderTab.value === 'active' ? activeOrders.value : redeemedOrders.value))
const visibleOrders = computed(() => ordersForTab.value.slice(0, visibleOrderCount.value))
const hasMoreOrders = computed(() => visibleOrderCount.value < ordersForTab.value.length)

watch(orderTab, () => {
  visibleOrderCount.value = ORDER_BATCH_SIZE
})

function orderDetailLocation(orderId) {
  return {
    path: `${prefix}/finance/liquidity/order/${orderId}`,
    query: { from: 'orders' }
  }
}

function loadMoreOrders() {
  visibleOrderCount.value = Math.min(
    visibleOrderCount.value + ORDER_BATCH_SIZE,
    ordersForTab.value.length
  )
}

function orderStatusPillClass(status) {
  if (status === ORDER_STATUS.LOCKED) return 'bg-sky-400/15 text-sky-200'
  if (status === ORDER_STATUS.COMPLETED) return 'bg-lime-400/12 text-lime-200'
  if (status === ORDER_STATUS.EARLY_REDEEMED) return 'bg-rose-400/12 text-rose-200'
  return 'bg-white/10 text-white/55'
}

function orderDisplayStatus(order) {
  if (order?.status === ORDER_STATUS.LOCKED && isOrderMatured(order)) {
    return {
      label: '待领取',
      class: 'bg-lime-400/12 text-lime-200'
    }
  }
  return {
    label: orderStatusMeta[order?.status]?.label ?? order?.status ?? '—',
    class: orderStatusPillClass(order?.status)
  }
}

const orderActionOpen = ref(false)
const orderActionKind = ref('early')
const orderActionTarget = ref(null)
let clearOrderActionTimer = null

function productForOrder(order) {
  if (!order?.productId) return null
  return products.value.find((p) => p.id === order.productId) ?? null
}

function formatNowUtc8() {
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

function isOrderMatured(order) {
  const dr = Number(order?.daysRemaining)
  return Number.isFinite(dr) && dr <= 0
}

const orderActionProduct = computed(() => productForOrder(orderActionTarget.value))

const earlyRedeemPenaltyPct = computed(() => {
  const p = orderActionProduct.value
  const fee = Number(p?.earlyRedeemFee)
  return Number.isFinite(fee) && fee >= 0 ? fee : 0
})

const earlyRedeemFeeAmount = computed(() => {
  const amt = Number(orderActionTarget.value?.amount) || 0
  return amt * (earlyRedeemPenaltyPct.value / 100)
})

const earlyRedeemNetPrincipal = computed(() => {
  const amt = Number(orderActionTarget.value?.amount) || 0
  return Math.max(0, amt - earlyRedeemFeeAmount.value)
})

function openEarlyRedeem(order) {
  if (order?.status !== ORDER_STATUS.LOCKED) return
  if (isOrderMatured(order)) return
  const p = productForOrder(order)
  if (!p?.earlyRedeemEnabled) return
  if (clearOrderActionTimer != null) {
    clearTimeout(clearOrderActionTimer)
    clearOrderActionTimer = null
  }
  orderActionKind.value = 'early'
  orderActionTarget.value = order
  orderActionOpen.value = true
}

function openSettleOrder(order) {
  if (order?.status !== ORDER_STATUS.LOCKED || !isOrderMatured(order)) return
  if (clearOrderActionTimer != null) {
    clearTimeout(clearOrderActionTimer)
    clearOrderActionTimer = null
  }
  orderActionKind.value = 'settle'
  orderActionTarget.value = order
  orderActionOpen.value = true
}

function closeOrderAction() {
  orderActionOpen.value = false
}

function onOrderActionEscape(e) {
  if (e.key === 'Escape' && orderActionOpen.value) closeOrderAction()
}

function applyOrderStatusPatch(orderId, patch) {
  const idx = orders.value.findIndex((x) => x.id === orderId)
  if (idx === -1) return
  orders.value[idx] = { ...orders.value[idx], ...patch }
  orders.value = [...orders.value]
}

function confirmOrderAction() {
  const o = orderActionTarget.value
  if (!o || o.status !== ORDER_STATUS.LOCKED) return
  const t = formatNowUtc8()
  if (orderActionKind.value === 'early') {
    if (isOrderMatured(o)) return
    const p = productForOrder(o)
    if (!p?.earlyRedeemEnabled) return
    const principal = Number(o.amount) || 0
    const feePct = Number(p.earlyRedeemFee)
    const pct = Number.isFinite(feePct) && feePct >= 0 ? feePct : 0
    const feeAmt = principal * (pct / 100)
    const netPrincipal = Math.max(0, principal - feeAmt)
    applyOrderStatusPatch(o.id, {
      status: ORDER_STATUS.EARLY_REDEEMED,
      completedAt: t,
      daysRemaining: 0,
      amount: netPrincipal,
      totalInterest: 0,
      earlyRedeemFeeApplied: feeAmt
    })
  } else {
    if (!isOrderMatured(o)) return
    applyOrderStatusPatch(o.id, {
      status: ORDER_STATUS.COMPLETED,
      completedAt: t,
      daysRemaining: 0
    })
  }
  orderActionOpen.value = false
}

watch(orderActionOpen, (open) => {
  if (typeof window === 'undefined') return
  if (open) {
    window.addEventListener('keydown', onOrderActionEscape)
  } else {
    window.removeEventListener('keydown', onOrderActionEscape)
    if (clearOrderActionTimer != null) clearTimeout(clearOrderActionTimer)
    clearOrderActionTimer = window.setTimeout(() => {
      orderActionTarget.value = null
      clearOrderActionTimer = null
    }, 360)
  }
})

watchEffect(() => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = orderActionOpen.value ? 'hidden' : ''
})

onUnmounted(() => {
  if (clearOrderActionTimer != null) clearTimeout(clearOrderActionTimer)
  if (typeof document !== 'undefined') document.body.style.overflow = ''
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onOrderActionEscape)
  }
})
</script>

<template>
  <section id="my-liquidity-orders" class="space-y-3" aria-label="锁仓订单列表">
    <div class="flex flex-col gap-2 px-0 py-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div class="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
        <span
          v-if="ordersForTab.length > 0"
          class="text-[11px] tabular-nums text-white/40 sm:text-xs"
        >共 {{ ordersForTab.length }} 条</span>
      </div>
      <div :class="fx.recordTablist2" role="tablist" aria-label="订单状态">
        <button
          type="button"
          role="tab"
          :aria-selected="orderTab === 'active'"
          :class="[fx.recordTab, orderTab === 'active' ? fx.recordTabOn : fx.recordTabOff]"
          @click="orderTab = 'active'"
        >
          进行中
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="orderTab === 'redeemed'"
          :class="[fx.recordTab, orderTab === 'redeemed' ? fx.recordTabOn : fx.recordTabOff]"
          @click="orderTab = 'redeemed'"
        >
          已赎回
        </button>
      </div>
    </div>
    <div class="overflow-x-auto">
      <table
        v-if="ordersForTab.length"
        :class="['w-full min-w-0 border-collapse text-left max-md:table-fixed md:min-w-[720px] md:table-auto', fx.tableBodyText]"
      >
        <thead class="hidden md:table-header-group">
          <tr :class="fx.tableHeadRow">
            <th class="px-3 py-2.5 font-semibold md:px-5 md:py-3">产品</th>
            <th class="hidden px-3 py-2.5 font-semibold md:table-cell md:px-5 md:py-3">期限</th>
            <th class="hidden px-3 py-2.5 font-semibold md:table-cell md:px-5 md:py-3">下单时间</th>
            <th class="hidden px-3 py-2.5 font-semibold md:table-cell md:px-5 md:py-3">金额</th>
            <th class="hidden px-3 py-2.5 font-semibold md:table-cell md:px-5 md:py-3">到期</th>
            <th class="hidden px-3 py-2.5 font-semibold lg:table-cell lg:px-5 lg:py-3">收益</th>
            <th class="px-3 py-2.5 text-right font-semibold md:px-5 md:py-3 md:text-left">操作</th>
            <th class="px-3 py-2.5 text-right font-semibold md:px-5 md:py-3 md:text-left">状态</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="o in visibleOrders"
            :key="o.id"
            class="border-b border-white/[0.06] transition hover:bg-white/[0.02] max-md:block max-md:last:border-b-0 md:table-row"
          >
            <td class="min-w-0 max-md:block max-md:w-full max-md:px-3 max-md:pb-0 max-md:pt-4 md:table-cell md:px-5 md:py-3">
              <p class="text-[14px] font-medium leading-snug text-white sm:text-sm">{{ o.productName }}</p>
              <div
                class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-white/[0.06] pt-3 text-[11px] text-white/50 md:hidden"
                :data-testid="`liquidity-order-card-info-${o.id}`"
              >
                <span class="text-white/35">期限</span>
                <span class="text-right tabular-nums text-white/70">{{ o.lockDays }} 天</span>
                <span class="text-white/35">下单</span>
                <span class="text-right tabular-nums text-white/60">{{ o.lockedAt }}</span>
                <span class="text-white/35">金额</span>
                <span class="text-right tabular-nums text-white/80">{{ o.amount }} {{ o.currency }}</span>
                <span class="text-white/35">到期</span>
                <span class="text-right tabular-nums text-white/60">{{ o.unlockAt }}</span>
                <span class="text-white/35">收益</span>
                <span class="text-right tabular-nums text-lime-300/90">{{ o.totalInterest }} {{ o.currency }}</span>
                <span class="text-white/35">当前状态</span>
                <span class="text-right">
                  <span
                    class="inline-flex min-h-[1.625rem] items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    :class="orderDisplayStatus(o).class"
                  >
                    {{ orderDisplayStatus(o).label }}
                  </span>
                </span>
              </div>
              <div
                class="mt-3 grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-3 md:hidden"
                :data-testid="`liquidity-order-card-actions-${o.id}`"
              >
                <RouterLink
                  :to="orderDetailLocation(o.id)"
                  :class="[fx.btnInlineNeutral, 'max-md:w-full']"
                >
                  查看详情
                </RouterLink>
                <template v-if="orderTab === 'active' && o.status === ORDER_STATUS.LOCKED">
                  <button
                    v-if="isOrderMatured(o)"
                    type="button"
                    :class="[fx.btnPrimarySm, 'max-md:w-full']"
                    @click="openSettleOrder(o)"
                  >
                    领取本息
                  </button>
                  <template v-else>
                    <button
                      v-if="productForOrder(o)?.earlyRedeemEnabled"
                      type="button"
                      :class="[fx.btnTableAction, 'max-md:w-full']"
                      @click="openEarlyRedeem(o)"
                    >
                      提前赎回
                    </button>
                    <span v-else :class="[fx.btnDisabledHint, 'max-md:w-full']">
                      不可提前赎回
                    </span>
                  </template>
                </template>
              </div>
            </td>
            <td class="hidden tabular-nums text-white/70 md:table-cell md:px-5 md:py-3">{{ o.lockDays }} 天</td>
            <td class="hidden tabular-nums text-white/55 md:table-cell md:px-5 md:py-3">{{ o.lockedAt }}</td>
            <td class="hidden tabular-nums md:table-cell md:px-5 md:py-3">{{ o.amount }} {{ o.currency }}</td>
            <td class="hidden tabular-nums text-white/50 md:table-cell md:px-5 md:py-3">{{ o.unlockAt }}</td>
            <td class="hidden tabular-nums text-lime-300/90 lg:table-cell lg:px-5 lg:py-3">
              {{ o.totalInterest }} {{ o.currency }}
            </td>
            <td class="hidden md:table-cell md:px-5 md:py-3 md:text-left">
              <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <RouterLink
                  :to="orderDetailLocation(o.id)"
                  :class="fx.btnInlineNeutral"
                >
                  查看详情
                </RouterLink>
                <template v-if="orderTab === 'active' && o.status === ORDER_STATUS.LOCKED">
                  <button
                    v-if="isOrderMatured(o)"
                    type="button"
                    :class="fx.btnPrimarySm"
                    @click="openSettleOrder(o)"
                  >
                    领取本息
                  </button>
                  <template v-else>
                    <button
                      v-if="productForOrder(o)?.earlyRedeemEnabled"
                      type="button"
                      :class="fx.btnTableAction"
                      @click="openEarlyRedeem(o)"
                    >
                      提前赎回
                    </button>
                    <span v-else :class="fx.btnDisabledHint">
                      不可提前赎回
                    </span>
                  </template>
                </template>
              </div>
            </td>
            <td class="hidden md:table-cell md:px-5 md:py-3 md:text-left">
              <span
                class="inline-flex min-h-[1.75rem] items-center rounded-full px-2.5 py-1 text-[11px] font-semibold sm:text-xs"
                :class="orderDisplayStatus(o).class"
              >
                {{ orderDisplayStatus(o).label }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="hasMoreOrders" class="pt-1">
      <button
        type="button"
        class="flex min-h-11 w-full items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.04] text-sm font-semibold text-white/70 transition hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/35"
        @click="loadMoreOrders"
      >
        加载更多
      </button>
    </div>
    <p v-if="ordersForTab.length === 0" class="px-3 py-12 text-center text-sm text-white/40 sm:py-14">
      当前分类暂无订单
    </p>
  </section>

  <FrontPopupShell
    v-model="orderActionOpen"
    aria-labelledby="liquidity-order-action-title"
  >
    <FrontPopupCard v-if="orderActionTarget" variant="padded" wide @click.stop>
      <FrontPopupCloseButton @click="closeOrderAction" />
      <h2 id="liquidity-order-action-title" class="pr-10 text-lg font-semibold tracking-tight text-white">
        {{ orderActionKind === 'settle' ? '到期领取本息' : '提前赎回' }}
      </h2>
      <p class="mt-1.5 text-sm text-white/45">
        {{ orderActionTarget.productName }} · {{ orderActionTarget.amount }} {{ orderActionTarget.currency }}
      </p>
      <template v-if="orderActionKind === 'early'">
        <dl class="mt-4 space-y-2 rounded-xl border border-white/[0.08] bg-black/35 px-3 py-3 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-white/45">本金</dt>
            <dd class="font-semibold tabular-nums text-white">{{ orderActionTarget.amount }} {{ orderActionTarget.currency }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-white/45">违约金（约 {{ earlyRedeemPenaltyPct }}%）</dt>
            <dd class="font-semibold tabular-nums text-amber-200/90">
              {{ earlyRedeemFeeAmount.toFixed(4) }} {{ orderActionTarget.currency }}
            </dd>
          </div>
          <div class="flex justify-between gap-3 border-t border-white/[0.08] pt-2">
            <dt class="text-white/45">预计到账本金</dt>
            <dd class="font-semibold tabular-nums text-lime-200/95">
              {{ earlyRedeemNetPrincipal.toFixed(4) }} {{ orderActionTarget.currency }}
            </dd>
          </div>
        </dl>
        <p class="mt-3 text-xs leading-relaxed text-white/38">
          已计未派发利息以实际结算为准；确认后订单将标记为「提前赎回」。
        </p>
      </template>
      <template v-else>
        <p class="mt-4 rounded-xl border border-lime-400/20 bg-lime-400/[0.08] px-3 py-3 text-sm text-lime-100/90">
          锁定期已满，确认领取后本息将入账至您的资金账户。
        </p>
        <dl class="mt-3 space-y-2 text-sm text-white/70">
          <div class="flex justify-between gap-3">
            <dt class="text-white/45">本金 + 已计收益</dt>
            <dd class="tabular-nums text-white">
              {{ orderActionTarget.amount }} + {{ orderActionTarget.totalInterest }}
              {{ orderActionTarget.currency }}
            </dd>
          </div>
        </dl>
      </template>
      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" :class="fx.btnGhost" @click="closeOrderAction">
          取消
        </button>
        <button type="button" :class="fx.btnPrimary" @click="confirmOrderAction">
          确认{{ orderActionKind === 'settle' ? '领取' : '赎回' }}
        </button>
      </div>
    </FrontPopupCard>
  </FrontPopupShell>
</template>
