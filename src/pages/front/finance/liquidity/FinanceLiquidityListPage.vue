<script setup>
import { computed, onUnmounted, ref, watch, watchEffect } from 'vue'
import FrontClientPager from '../../../../components/front/FrontClientPager.vue'
import { useClientListPagination } from '../../../../composables/useClientListPagination'
import { useRoute } from 'vue-router'
import FrontTopNav from '../../../../components/FrontTopNav.vue'
import FrontPopupCard from '../../../../components/front/FrontPopupCard.vue'
import FrontPopupCloseButton from '../../../../components/front/FrontPopupCloseButton.vue'
import FrontPopupShell from '../../../../components/front/FrontPopupShell.vue'
import { createLockedOrdersMock } from '../../../../admin/mock/liquidityLocked'
import { lockedProductsCatalog } from '../../../../admin/state/financeCatalogs'
import { buildLockedDemoExtraOrders } from '../../../../admin/mock/frontFinanceDemoBulk'
import {
  LOCKED_MIN_VIP_OPTIONS,
  PRODUCT_STATUS,
  productStatusMeta,
  orderStatusMeta,
  ORDER_STATUS,
  PURCHASE_LIMIT_TYPE,
  lockYieldAnnualPct,
  lockedMinKycRequirementPhrase,
  sortLiquidityLockedProducts
} from '../../../../admin/constants/liquidityLocked'
import { FINANCE_FX as fx } from '../../../../constants/frontFinanceUi'

const prefix = '/front'
const route = useRoute()
const navMenuOpen = ref(false)

/** Keep UX copy aligned with product detail where relevant */
const DEMO_AVAILABLE_FUNDS = 5.562875

const currencyTab = ref('')
const orderTab = ref('active')
/** Hero 主入口：挖矿产品 / 我的订单（与 AI 量化、借贷一致） */
const heroPanel = ref(route.query.tab === 'orders' ? 'orders' : 'products')

const LIST_PAGE_SIZE = 8

const products = lockedProductsCatalog
const orders = ref([...createLockedOrdersMock(), ...buildLockedDemoExtraOrders()])

const currenciesFromProducts = computed(() => {
  const set = new Set(products.value.map((p) => p.currency).filter(Boolean))
  return [...set].sort()
})

const filteredProducts = computed(() => {
  let rows = products.value
  if (currencyTab.value) {
    rows = rows.filter((p) => p.currency === currencyTab.value)
  }
  return sortLiquidityLockedProducts(rows)
})

const periodRows = computed(() => {
  const out = []
  for (const p of filteredProducts.value) {
    const periods = p.periods ?? []
    for (const row of periods) {
      out.push({
        key: `${p.id}-${row.days}`,
        product: p,
        period: row,
        annual: lockYieldAnnualPct(row)
      })
    }
  }
  return out
})

const activeOrders = computed(() =>
  orders.value.filter((o) => o.status === ORDER_STATUS.LOCKED)
)
const redeemedOrders = computed(() =>
  orders.value.filter(
    (o) => o.status === ORDER_STATUS.COMPLETED || o.status === ORDER_STATUS.EARLY_REDEEMED
  )
)
const ordersForTab = computed(() => (orderTab.value === 'active' ? activeOrders.value : redeemedOrders.value))

const pgOrdersTab = useClientListPagination(ordersForTab, { pageSize: LIST_PAGE_SIZE })

watch(orderTab, () => {
  pgOrdersTab.resetPage()
})

watch(
  () => route.query.tab,
  (tab) => {
    if (tab === 'orders') heroPanel.value = 'orders'
    if (tab === 'products') heroPanel.value = 'products'
  }
)

function orderDetailLocation(orderId) {
  return {
    path: `${prefix}/finance/liquidity/order/${orderId}`,
    query: { from: 'orders' }
  }
}

function goOrdersPrev() {
  pgOrdersTab.goPrev()
}

function goOrdersNext() {
  pgOrdersTab.goNext()
}

function statusPillClass(status) {
  if (status === PRODUCT_STATUS.ENABLED) return 'bg-lime-400/15 text-lime-200'
  if (status === PRODUCT_STATUS.SOLD_OUT) return 'bg-amber-400/15 text-amber-200'
  return 'bg-white/10 text-white/55'
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

/** 订单：提前赎回 / 到期领取（本地更新 orders） */
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

const mineDialogOpen = ref(false)
const mineProduct = ref(null)
const minePeriod = ref(null)
const purchaseAmount = ref('')

/** 弹层离场动画后再清空上下文，避免 FrontPopupShell 过渡期内内容闪空 */
let clearMineRefsTimer = null

function openMineDialog(product, period) {
  if (clearMineRefsTimer != null) {
    clearTimeout(clearMineRefsTimer)
    clearMineRefsTimer = null
  }
  mineProduct.value = product
  minePeriod.value = period
  purchaseAmount.value = ''
  mineDialogOpen.value = true
}

function closeMineDialog() {
  mineDialogOpen.value = false
}

function onMineDialogEscape(e) {
  if (e.key === 'Escape' && mineDialogOpen.value) closeMineDialog()
}

watch(mineDialogOpen, (open) => {
  if (typeof window === 'undefined') return
  if (open) {
    if (clearMineRefsTimer != null) {
      clearTimeout(clearMineRefsTimer)
      clearMineRefsTimer = null
    }
    window.addEventListener('keydown', onMineDialogEscape)
  } else {
    window.removeEventListener('keydown', onMineDialogEscape)
    if (clearMineRefsTimer != null) clearTimeout(clearMineRefsTimer)
    clearMineRefsTimer = window.setTimeout(() => {
      mineProduct.value = null
      minePeriod.value = null
      clearMineRefsTimer = null
    }, 360)
  }
})

watchEffect(() => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = mineDialogOpen.value || orderActionOpen.value ? 'hidden' : ''
})

onUnmounted(() => {
  if (clearMineRefsTimer != null) clearTimeout(clearMineRefsTimer)
  if (clearOrderActionTimer != null) clearTimeout(clearOrderActionTimer)
  if (typeof document !== 'undefined') document.body.style.overflow = ''
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onMineDialogEscape)
    window.removeEventListener('keydown', onOrderActionEscape)
  }
})

const mineCanSubmit = computed(
  () => mineProduct.value != null && mineProduct.value.status === PRODUCT_STATUS.ENABLED
)

const parsedPurchase = computed(() => {
  const n = Number(String(purchaseAmount.value).replace(/,/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : 0
})

const mineSelectedAnnualPct = computed(() =>
  minePeriod.value ? lockYieldAnnualPct(minePeriod.value) : 0
)

const mineEstimatedYield = computed(() => {
  const row = minePeriod.value
  if (!row) return 0
  const apr = lockYieldAnnualPct(row) / 100
  return parsedPurchase.value * apr * (row.days / 365)
})

const minePurchaseValid = computed(() => {
  const p = mineProduct.value
  const row = minePeriod.value
  if (!p || !row || p.status !== PRODUCT_STATUS.ENABLED) return false
  const n = parsedPurchase.value
  const min = Number(row.minAmount) || 0
  const cap = Math.min(Number(row.maxAmount) || Infinity, DEMO_AVAILABLE_FUNDS)
  if (!Number.isFinite(n) || n <= 0) return false
  if (n < min) return false
  if (Number.isFinite(cap) && n > cap) return false
  return true
})

function fillAllPurchase() {
  const row = minePeriod.value
  if (!row) return
  const cap = Math.min(DEMO_AVAILABLE_FUNDS, Number(row.maxAmount) || DEMO_AVAILABLE_FUNDS)
  purchaseAmount.value = String(cap)
}

function openNavigationMenu() {
  navMenuOpen.value = true
}

const mineLimitDesc = computed(() => {
  const p = mineProduct.value
  if (!p) return ''
  if (p.purchaseLimitType === PURCHASE_LIMIT_TYPE.LIFETIME) {
    return `终身累计申购上限 ${p.lifetimeLimit?.toLocaleString?.() ?? p.lifetimeLimit} ${p.currency}`
  }
  if (p.purchaseLimitType === PURCHASE_LIMIT_TYPE.PERIOD) {
    return `每 ${p.periodDays} 天周期内上限 ${p.periodLimit?.toLocaleString?.() ?? p.periodLimit} ${p.currency}`
  }
  return '当前产品不设个人申购上限（以实际风控为准）'
})

const mineMinVipLabel = computed(() => {
  const p = mineProduct.value
  if (!p) return ''
  const hit = LOCKED_MIN_VIP_OPTIONS.find((o) => o.value === p.minVipLevel)
  return hit?.label ?? `VIP ${p.minVipLevel}`
})
</script>

<template>
  <div :class="fx.pageRoot">
    <FrontTopNav
      prefix="/front"
      drawer-only
      v-model:mobile-drawer-open="navMenuOpen"
      @mobile-open-change="navMenuOpen = $event"
    />
    <header :class="fx.header">
      <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div :class="fx.headerGlowL" />
        <div :class="fx.headerGlowR" />
        <div :class="fx.headerGrad" />
      </div>
      <div class="relative mx-auto max-w-7xl px-4 pb-4 pt-[calc(5.5rem+env(safe-area-inset-top,0px))] sm:px-8 sm:pb-8 lg:px-10 lg:pb-10 lg:pt-10">
        <div
          class="fixed inset-x-0 top-0 z-40 flex h-[4.5rem] items-center justify-center border-b border-white/[0.08] bg-black/95 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur supports-[backdrop-filter]:bg-black/80 sm:px-8 lg:hidden"
          aria-label="流动性挖矿移动端标题栏"
        >
          <button
            type="button"
            class="absolute left-4 inline-flex h-10 w-10 items-center justify-center rounded-md text-white/86 transition hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/35 sm:left-8 lg:hidden"
            aria-haspopup="dialog"
            aria-controls="front-nav-drawer"
            :aria-expanded="navMenuOpen"
            :aria-label="navMenuOpen ? '关闭菜单' : '打开菜单'"
            @click="openNavigationMenu"
          >
            <svg class="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
            </svg>
          </button>
          <h1 class="text-base font-semibold text-white">流动性挖矿</h1>
          <RouterLink
            :to="`${prefix}/finance/liquidity/orders`"
            class="absolute right-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-lime-400/45 bg-lime-400/10 px-3 text-sm font-semibold text-lime-200 transition hover:bg-lime-400/15 focus:outline-none focus:ring-2 focus:ring-lime-300/60 sm:right-8 lg:hidden"
            aria-label="查看流动性挖矿订单"
          >
            订单
          </RouterLink>
        </div>

        <nav :class="[fx.breadcrumbNav, 'hidden lg:block']">
          <RouterLink :to="`${prefix}/finance`" class="transition hover:text-lime-300">金融</RouterLink>
          <span class="mx-1.5 text-white/20 sm:mx-2">/</span>
          <span class="text-white/70">流动性挖矿</span>
        </nav>

        <div class="mt-0 flex flex-col gap-4 sm:gap-5 lg:mt-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div class="min-w-0 flex-1 space-y-3 sm:space-y-4 lg:space-y-6">
            <div>
              <p class="inline-flex items-center gap-2 rounded-full border border-lime-400/25 bg-lime-400/[0.08] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-lime-200/95 sm:px-3 sm:py-1 sm:text-[11px] sm:tracking-[0.3em]">
                Earn · 锁仓理财
              </p>
              <h1 class="mt-1 text-[28px] font-bold leading-tight tracking-tight text-white sm:mt-2 sm:text-3xl md:text-4xl lg:mt-3 lg:text-[3.25rem] lg:leading-tight">
                流动性挖矿
              </h1>
            </div>
            <div :class="[fx.heroSegmentWrap, 'hidden lg:inline-flex']" role="tablist" aria-label="页面主入口">
              <button
                type="button"
                role="tab"
                :aria-selected="heroPanel === 'products'"
                :class="[fx.heroTab, heroPanel === 'products' ? fx.heroTabOn : fx.heroTabOff]"
                @click="heroPanel = 'products'"
              >
                挖矿产品
              </button>
              <button
                type="button"
                role="tab"
                :aria-selected="heroPanel === 'orders'"
                :class="[fx.heroTab, heroPanel === 'orders' ? fx.heroTabOn : fx.heroTabOff]"
                @click="heroPanel = 'orders'"
              >
                我的订单
              </button>
            </div>
          </div>

          <div
            v-if="heroPanel === 'products'"
            class="pointer-events-none relative mx-auto hidden h-36 w-36 shrink-0 sm:h-40 sm:w-40 md:block lg:mx-0 lg:h-44 lg:w-44"
            aria-hidden="true"
          >
            <div
              class="absolute inset-0 rounded-full border border-lime-400/20 bg-gradient-to-br from-lime-400/15 via-transparent to-emerald-600/10 opacity-90"
            />
            <div
              class="absolute inset-[18%] rounded-full border border-white/[0.06] bg-lime-400/[0.06] opacity-90"
            />
            <div
              class="absolute inset-[38%] rounded-full border border-white/[0.08] bg-white/[0.03] opacity-90"
            />
            <div
              class="absolute -right-1 top-1/4 h-14 w-14 rounded-full bg-lime-400/18 opacity-90 blur-2xl sm:h-16 sm:w-16"
            />
          </div>
        </div>
      </div>
    </header>

    <div :class="fx.mainWrap">
      <template v-if="heroPanel === 'products'">
        <div :class="fx.filterRailWrap">
          <div :class="fx.filterChipWrap" role="tablist" aria-label="锁仓币种">
            <button
              type="button"
              role="tab"
              :aria-selected="currencyTab === ''"
              :class="[fx.filterChip, currencyTab === '' ? fx.filterChipOn : fx.filterChipOff]"
              @click="currencyTab = ''"
            >
              全部
            </button>
            <button
              v-for="c in currenciesFromProducts"
              :key="c"
              type="button"
              role="tab"
              :aria-selected="currencyTab === c"
              :class="[fx.filterChip, currencyTab === c ? fx.filterChipOn : fx.filterChipOff]"
              @click="currencyTab = c"
            >
              {{ c }}
            </button>
          </div>
        </div>

        <div :class="fx.tableWrapMarket">
          <table
            v-if="periodRows.length"
            :class="['w-full min-w-0 border-collapse text-left max-md:table-fixed md:min-w-[640px] md:table-auto', fx.tableBodyText]"
          >
            <thead class="hidden md:table-header-group">
              <tr :class="fx.tableHeadRow">
                <th class="px-4 py-2 font-semibold md:px-5 md:py-2.5">产品</th>
                <th class="hidden px-3 py-2 font-semibold md:table-cell md:px-5 md:py-2.5">参考年化</th>
                <th class="hidden px-3 py-2 font-semibold md:table-cell md:px-5 md:py-2.5">期限</th>
                <th class="hidden px-3 py-2 font-semibold lg:table-cell lg:px-5 lg:py-2.5">申购区间</th>
                <th class="px-3 py-2 text-right font-semibold md:px-5 md:py-2.5">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in periodRows"
                :key="r.key"
                class="border-b border-white/[0.06] transition hover:bg-white/[0.03] max-md:block max-md:last:border-b-0 md:table-row"
              >
                <td class="max-md:block max-md:w-full max-md:px-3 max-md:pb-1 max-md:pt-3 md:table-cell md:px-5 md:py-2.5">
                  <div class="flex items-start gap-2 sm:gap-3">
                    <span class="shrink-0 text-xl leading-none sm:text-2xl" aria-hidden="true">{{
                      r.product.icon
                    }}</span>
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <RouterLink
                          :to="`${prefix}/finance/liquidity/${r.product.id}`"
                          class="text-[15px] font-semibold leading-snug text-white transition hover:text-lime-300 sm:text-base"
                          @click.stop
                        >
                          {{ r.product.name }}
                        </RouterLink>
                        <span
                          class="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold sm:px-2 sm:text-[10px]"
                          :class="statusPillClass(r.product.status)"
                        >
                          {{ productStatusMeta[r.product.status]?.label ?? r.product.status }}
                        </span>
                      </div>
                      <p class="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/40 sm:text-xs">
                        {{ r.product.currency }} · VIP{{ r.product.minVipLevel }} ·
                        {{ lockedMinKycRequirementPhrase(r.product.minKycLevel) }}
                      </p>
                      <div
                        class="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-white/[0.06] pt-3 text-[11px] text-white/50 max-md:grid-cols-2 md:hidden"
                      >
                        <span class="text-white/35">参考年化</span>
                        <span class="text-right font-bold tabular-nums text-lime-300">{{ r.annual.toFixed(2) }}%</span>
                        <span class="text-white/35">期限</span>
                        <span class="text-right tabular-nums text-white/70">{{ r.period.days }} 天</span>
                        <span class="text-white/35">区间</span>
                        <span class="text-right truncate tabular-nums text-white/70">
                          {{ r.period.minAmount }} – {{ r.period.maxAmount }} {{ r.product.currency }}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td class="hidden whitespace-nowrap px-3 py-2.5 md:table-cell md:px-5">
                  <span class="text-sm font-bold tabular-nums text-lime-300 sm:text-base">{{
                    r.annual.toFixed(2)
                  }}%</span>
                </td>
                <td class="hidden px-3 py-2.5 tabular-nums text-white/85 md:table-cell md:px-5">
                  {{ r.period.days }} 天
                </td>
                <td class="hidden px-3 py-2.5 tabular-nums text-white/70 lg:table-cell lg:px-5">
                  {{ r.period.minAmount }} – {{ r.period.maxAmount }} {{ r.product.currency }}
                </td>
                <td
                  class="max-md:block max-md:w-full max-md:px-3 max-md:pb-3 max-md:pt-2 md:table-cell md:px-5 md:py-2.5 sm:px-3"
                >
                  <button
                    v-if="r.product.status === PRODUCT_STATUS.ENABLED"
                    type="button"
                    :class="fx.btnPrimaryBlock"
                    @click="openMineDialog(r.product, r.period)"
                  >
                    立即挖矿
                  </button>
                  <button
                    v-else
                    type="button"
                    :class="fx.btnMutedOutline"
                    @click="openMineDialog(r.product, r.period)"
                  >
                    查看说明
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="px-3 py-12 text-center text-sm text-white/45 sm:py-14">暂无匹配档位</p>
        </div>
      </template>

      <template v-else>
        <section id="my-liquidity-orders" :class="fx.panelRecords" aria-label="锁仓订单列表">
          <div :class="fx.panelRecordsHeader">
            <div class="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
              <p :class="fx.sectionKicker">订单明细</p>
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
                  v-for="o in pgOrdersTab.pagedItems"
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
          <FrontClientPager
            :page="pgOrdersTab.page"
            :total-pages="pgOrdersTab.totalPages"
            :total="pgOrdersTab.total"
            :page-size="pgOrdersTab.pageSize"
            @prev="goOrdersPrev"
            @next="goOrdersNext"
          />
          <p v-if="ordersForTab.length === 0" class="px-3 py-12 text-center text-sm text-white/40 sm:py-14">
            当前分类暂无订单
          </p>
        </section>
      </template>
    </div>

    <FrontPopupShell
      v-model="orderActionOpen"
      aria-labelledby="liquidity-order-action-title"
      close-on-backdrop
      @backdrop-click="closeOrderAction"
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

    <FrontPopupShell
      v-model="mineDialogOpen"
      aria-labelledby="liquidity-mine-dialog-title"
      close-on-backdrop
      @backdrop-click="closeMineDialog"
    >
      <FrontPopupCard
        v-if="mineProduct && minePeriod"
        variant="flow"
        flow-max="720"
        wide
        @click.stop
      >
        <FrontPopupCloseButton @click="closeMineDialog" />

        <div
          class="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-5 pr-11 sm:pr-12"
        >
          <div class="flex items-start gap-3">
            <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/15 text-2xl leading-none"
              aria-hidden="true"
            >
              {{ mineProduct.icon }}
            </div>
            <div class="min-w-0 flex-1">
              <h2 id="liquidity-mine-dialog-title" class="text-lg font-semibold leading-snug text-white">
                立即挖矿
              </h2>
              <p class="mt-2 text-sm leading-relaxed text-emerald-100/85">
                <span class="font-medium text-white/90">{{ mineProduct.name }}</span>
                <span class="mx-1.5 text-white/25">·</span>
                <span class="tabular-nums text-white/55">{{ mineProduct.currency }}</span>
                <span
                  class="ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold align-middle"
                  :class="statusPillClass(mineProduct.status)"
                >
                  {{ productStatusMeta[mineProduct.status]?.label ?? mineProduct.status }}
                </span>
              </p>
            </div>
          </div>

          <div
            v-if="!mineCanSubmit"
            class="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-100/90"
          >
            该产品当前不可申购，您仍可查看产品参数。
          </div>

          <dl class="mt-5 grid grid-cols-2 gap-3 text-sm sm:gap-4">
            <div class="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
              <dt class="text-[10px] font-medium uppercase tracking-wide text-white/40">参考年化</dt>
              <dd class="mt-0.5 text-lg font-bold tabular-nums text-lime-300">
                {{ mineSelectedAnnualPct.toFixed(2) }}%
              </dd>
            </div>
            <div class="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
              <dt class="text-[10px] font-medium uppercase tracking-wide text-white/40">锁仓期限</dt>
              <dd class="mt-0.5 text-lg font-semibold tabular-nums text-white">{{ minePeriod.days }} 天</dd>
            </div>
            <div class="col-span-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
              <dt class="text-[10px] font-medium uppercase tracking-wide text-white/40">单档最小申购</dt>
              <dd class="mt-0.5 font-semibold tabular-nums text-white">
                {{ minePeriod.minAmount }} {{ mineProduct.currency }}
              </dd>
            </div>
          </dl>

          <div
            v-if="mineProduct.earlyRedeemEnabled && mineProduct.earlyRedeemFee > 0"
            class="mt-4 rounded-xl border border-lime-400/25 bg-lime-400/10 px-3 py-2.5 text-center text-xs font-medium text-lime-100/90 sm:text-sm"
          >
            提前赎回手续费：约 {{ mineProduct.earlyRedeemFee }}%，以产品协议为准。
          </div>

          <ul class="mt-4 space-y-2 text-xs leading-relaxed text-white/55 sm:text-[13px]">
            <li>VIP：{{ mineMinVipLabel }}</li>
            <li>认证：{{ lockedMinKycRequirementPhrase(mineProduct.minKycLevel) }}</li>
            <li>{{ mineLimitDesc }}</li>
          </ul>

          <RouterLink
            class="mt-4 inline-flex text-xs font-medium text-lime-300/90 transition hover:text-lime-200"
            :to="`${prefix}/finance/liquidity/${mineProduct.id}`"
            @click="closeMineDialog"
          >
            查看产品说明与规则 →
          </RouterLink>

          <div v-if="mineCanSubmit" class="mt-5 border-t border-white/[0.08] pt-5">
            <label class="block">
              <span class="text-sm font-medium text-white/70">购买金额（{{ mineProduct.currency }}）</span>
              <span class="mt-0.5 block text-xs text-white/40">可用余额：{{ DEMO_AVAILABLE_FUNDS }}</span>
              <div class="mt-2 flex gap-2">
                <input
                  v-model="purchaseAmount"
                  type="text"
                  inputmode="decimal"
                  :placeholder="`最小 ${minePeriod.minAmount}`"
                  :class="fx.inputFlex"
                />
                <button type="button" :class="fx.inputSideBtn" @click="fillAllPurchase">
                  全部
                </button>
              </div>
            </label>
            <p class="mt-2 text-xs tabular-nums text-white/50 sm:text-sm">
              预计收益（估算）：
              <span class="font-semibold text-lime-300/90">
                {{ mineEstimatedYield.toFixed(6) }} {{ mineProduct.currency }}
              </span>
            </p>
            <p
              v-if="mineCanSubmit && !minePurchaseValid && parsedPurchase > 0"
              class="mt-2 text-xs leading-relaxed text-amber-200/90"
            >
              请输入 {{ minePeriod.minAmount }} – {{ minePeriod.maxAmount }}（且不超过当前可用余额
              {{ DEMO_AVAILABLE_FUNDS }}）范围内的金额。
            </p>
          </div>

          <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" :class="fx.btnGhost" @click="closeMineDialog">
              关闭
            </button>
            <RouterLink
              v-if="mineCanSubmit && minePurchaseValid"
              :to="{ path: `${prefix}/login`, query: { redirect: route.path } }"
              :class="['inline-flex items-center justify-center', fx.btnPrimary]"
              @click="closeMineDialog"
            >
              去登录申购
            </RouterLink>
          </div>
        </div>
      </FrontPopupCard>
    </FrontPopupShell>
  </div>
</template>
