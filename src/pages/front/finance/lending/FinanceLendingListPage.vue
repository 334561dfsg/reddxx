<script setup>
import { computed, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'
import FrontPopupCard from '../../../../components/front/FrontPopupCard.vue'
import FrontPopupCloseButton from '../../../../components/front/FrontPopupCloseButton.vue'
import FrontPopupShell from '../../../../components/front/FrontPopupShell.vue'
import FrontStrokeIcon from '../../../../components/front/FrontStrokeIcon.vue'
import FrontClientPager from '../../../../components/front/FrontClientPager.vue'
import { useClientListPagination } from '../../../../composables/useClientListPagination'
import { lendingProductsCatalog } from '../../../../admin/state/financeCatalogs'
import { mockOrders, mockRepayments } from '../../../../admin/mock/cryptoLending'
import { buildLendingDemoExtraOrders, buildLendingDemoExtraRepayments } from '../../../../admin/mock/frontFinanceDemoBulk'
import { applyScorecardToPolicy, lendingCreditPolicy } from '../../../../admin/mock/lendingCreditConfig'
import {
  accountCreditRemaining,
  borrowCreditRemaining as computeBorrowCreditRemaining,
  LENDING_CREDIT_ACTIVE_ORDER_STATUSES,
  sumActiveDebt
} from '../../../../admin/constants/lendingCredit'
import {
  PRODUCT_STATUS,
  PRODUCT_STATUS_LABELS,
  LOAN_ORDER_STATUS,
  LOAN_ORDER_STATUS_LABELS,
  REPAYMENT_STATUS,
  REPAYMENT_STATUS_LABELS,
  REPAYMENT_TYPE_LABELS,
  REPAYMENT_PAYMENT_METHOD_USER,
  deriveRepaymentType,
  LENDING_COLLATERAL_PRICE_USD,
  normalizeCollateralConfig,
  normalizeOverduePenaltyRate,
  normalizeCollateralWarningThreshold,
  normalizeCollateralDisposalThreshold,
  sortLendingProducts,
  collateralRequiredAmount,
  collateralRequiredValue
} from '../../../../admin/constants/cryptoLending'
import { FINANCE_FX as fx } from '../../../../constants/frontFinanceUi'

const prefix = '/front'

const LIST_PAGE_SIZE = 8

const products = lendingProductsCatalog
const orders = ref([...mockOrders, ...buildLendingDemoExtraOrders()])
const repayments = ref([...mockRepayments, ...buildLendingDemoExtraRepayments()])

/** 进入页时按运营端授信模板与评分规则同步可用额度（对接后由服务端按用户实时计算） */
onMounted(() => {
  applyScorecardToPolicy()
})

/** 借出币种筛选（顶部资产卡；用弹层选择，避免卡内 Tab 过窄） */
const loanCurrencyFilter = ref('')
const currencyPickerOpen = ref(false)

/** 资产卡主数字：短文案避免窄格换行 */
const loanCurrencyHeadline = computed(() =>
  loanCurrencyFilter.value ? String(loanCurrencyFilter.value) : '全部'
)

const loanCurrencyHint = computed(() =>
  loanCurrencyFilter.value ? `筛选「${loanCurrencyFilter.value}」` : '借出币种未限定'
)

const loanCurrencies = computed(() => {
  const set = new Set(products.value.map((p) => p.loanCurrency).filter(Boolean))
  return [...set].sort()
})

const filteredProducts = computed(() => {
  const rows = loanCurrencyFilter.value
    ? products.value.filter((p) => p.loanCurrency === loanCurrencyFilter.value)
    : products.value
  return sortLendingProducts(rows)
})

function formatUsdCompact(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  const v = Number(n)
  if (v >= 1e9) return `$ ${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `$ ${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$ ${(v / 1e3).toFixed(1)}K`
  return `$ ${v.toLocaleString()}`
}

const liquidityTotal = computed(() =>
  filteredProducts.value.reduce((s, p) => s + (Number(p.availableLiquidity) || 0), 0)
)

const activeStatuses = LENDING_CREDIT_ACTIVE_ORDER_STATUSES

/** 当前筛选下的待还（记录区与「待还数量」卡） */
const pendingRepayTotal = computed(() =>
  orders.value
    .filter((o) => activeStatuses.includes(o.status))
    .filter((o) => !loanCurrencyFilter.value || o.loanCurrency === loanCurrencyFilter.value)
    .reduce((s, o) => s + (Number(o.totalDebt) || 0), 0)
)

/** 全量在贷债务（授信「已用」与账户剩余共用此口径） */
const globalPendingRepayTotal = computed(() => sumActiveDebt(orders.value, activeStatuses))

const walletBalanceDisplay = 128_430.55

const remainingBorrowApprox = computed(() =>
  accountCreditRemaining(lendingCreditPolicy, orders.value)
)

const borrowCreditRemaining = computed(() => {
  const p = borrowProduct.value
  if (!p?.loanCurrency) return remainingBorrowApprox.value
  return computeBorrowCreditRemaining(lendingCreditPolicy, orders.value, p.loanCurrency)
})

const recordTab = ref('current')
/** Hero 主入口：借币一览 / 我的记录（与 AI 量化、流动性列表一致） */
const heroPanel = ref('overview')

/** 还款弹窗：本地更新订单与还款记录 */
const repayOpen = ref(false)
const repayOrder = ref(null)
const repayAmount = ref('')
let clearRepayTimer = null

function formatLendingNow() {
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

function openRepayDialog(order) {
  if (
    order.status !== LOAN_ORDER_STATUS.ACTIVE &&
    order.status !== LOAN_ORDER_STATUS.REPAYING &&
    order.status !== LOAN_ORDER_STATUS.OVERDUE
  ) {
    return
  }
  if (clearRepayTimer != null) {
    clearTimeout(clearRepayTimer)
    clearRepayTimer = null
  }
  currencyPickerOpen.value = false
  borrowOpen.value = false
  repayOrder.value = order
  const debt = Number(order.totalDebt) || 0
  repayAmount.value = debt > 0 ? String(debt) : ''
  repayOpen.value = true
}

function closeRepayDialog() {
  repayOpen.value = false
}

function onRepayEscape(e) {
  if (e.key === 'Escape' && repayOpen.value) closeRepayDialog()
}

function fillRepayAll() {
  const o = repayOrder.value
  if (!o) return
  repayAmount.value = String(Number(o.totalDebt) || 0)
}

const parsedRepay = computed(() => {
  const n = Number(String(repayAmount.value).replace(/,/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : 0
})

const repayConfirmEnabled = computed(() => {
  const o = repayOrder.value
  if (!o) return false
  const debt = Number(o.totalDebt) || 0
  const pay = parsedRepay.value
  return pay > 0 && debt > 0 && pay <= debt
})

const repayBreakdown = computed(() => {
  const o = repayOrder.value
  const pay = parsedRepay.value
  if (!o || pay <= 0) {
    return {
      overduePenaltyPaid: 0,
      interestPaid: 0,
      principalPaid: 0
    }
  }
  const overduePenaltyAccrued = Number(o.overduePenaltyAccrued) || 0
  const interestAccrued = Number(o.interestAccrued) || 0
  const overduePenaltyPaid = Math.min(pay, overduePenaltyAccrued)
  const afterPenalty = pay - overduePenaltyPaid
  const interestPaid = Math.min(afterPenalty, interestAccrued)
  const principalPaid = Math.max(0, afterPenalty - interestPaid)
  return {
    overduePenaltyPaid,
    interestPaid,
    principalPaid
  }
})

function confirmRepay() {
  const o = repayOrder.value
  if (!o) return
  const debt = Number(o.totalDebt) || 0
  let pay = parsedRepay.value
  if (pay <= 0 || debt <= 0) return
  pay = Math.min(pay, debt)
  const overduePenaltyAccrued = Number(o.overduePenaltyAccrued) || 0
  const accrued = Number(o.interestAccrued) || 0
  const overduePenaltyPaid = Math.min(pay, overduePenaltyAccrued)
  const afterPenalty = pay - overduePenaltyPaid
  const interestPaid = Math.min(afterPenalty, accrued)
  const principalPaid = afterPenalty - interestPaid
  const newDebt = Math.max(0, debt - pay)
  const newOverduePenaltyAccrued = Math.max(0, overduePenaltyAccrued - overduePenaltyPaid)
  const newAccrued = Math.max(0, accrued - interestPaid)
  const now = formatLendingNow()
  const idx = orders.value.findIndex((x) => x.orderId === o.orderId)
  if (idx === -1) return
  const nextStatus =
    newDebt <= 0
      ? LOAN_ORDER_STATUS.COMPLETED
      : o.status === LOAN_ORDER_STATUS.OVERDUE
        ? LOAN_ORDER_STATUS.OVERDUE
        : LOAN_ORDER_STATUS.REPAYING
  orders.value[idx] = {
    ...orders.value[idx],
    totalDebt: newDebt,
    overduePenaltyAccrued: newOverduePenaltyAccrued,
    interestAccrued: newAccrued,
    status: nextStatus,
    updateTime: now,
    daysRemaining: newDebt <= 0 ? 0 : o.daysRemaining
  }
  orders.value = [...orders.value]
  const rid = `REP-DEMO-${Date.now()}`
  repayments.value = [
    {
      repaymentId: rid,
      orderId: o.orderId,
      userId: o.userId,
      userName: o.userName,
      productName: o.productName,
      loanCurrency: o.loanCurrency || 'USDT',
      repaymentType: deriveRepaymentType({ newDebt }),
      amount: pay,
      overduePenaltyPaid,
      interestPaid,
      principalPaid,
      remainingDebt: newDebt,
      status: REPAYMENT_STATUS.COMPLETED,
      paymentMethod: REPAYMENT_PAYMENT_METHOD_USER,
      transactionId: `TXN-${rid}`,
      repaymentTime: now,
      createTime: now
    },
    ...repayments.value
  ]
  repayOpen.value = false
}

watch(repayOpen, (open) => {
  if (typeof window === 'undefined') return
  if (open) {
    window.addEventListener('keydown', onRepayEscape)
  } else {
    window.removeEventListener('keydown', onRepayEscape)
    if (clearRepayTimer != null) clearTimeout(clearRepayTimer)
    clearRepayTimer = window.setTimeout(() => {
      repayOrder.value = null
      repayAmount.value = ''
      clearRepayTimer = null
    }, 360)
  }
})

const currentOrders = computed(() =>
  orders.value.filter((o) => activeStatuses.includes(o.status))
)

const pgCurrent = useClientListPagination(currentOrders, { pageSize: LIST_PAGE_SIZE })
const pgRepay = useClientListPagination(repayments, { pageSize: LIST_PAGE_SIZE })

watch(recordTab, () => {
  pgCurrent.resetPage()
  pgRepay.resetPage()
})

function statusClass(s) {
  if (s === PRODUCT_STATUS.ACTIVE) return 'bg-lime-400/12 text-lime-200'
  if (s === PRODUCT_STATUS.SUSPENDED) return 'bg-amber-400/15 text-amber-200'
  if (s === PRODUCT_STATUS.INACTIVE) return 'bg-white/10 text-white/45'
  return 'bg-white/10 text-white/50'
}

/** 借款弹窗 */
const borrowOpen = ref(false)
const borrowProduct = ref(null)
const borrowAmount = ref('')
const borrowCollateralCurrency = ref('')
let clearBorrowTimer = null

function openBorrowDialog(p) {
  if (clearBorrowTimer != null) {
    clearTimeout(clearBorrowTimer)
    clearBorrowTimer = null
  }
  currencyPickerOpen.value = false
  repayOpen.value = false
  borrowProduct.value = p
  borrowAmount.value = ''
  borrowCollateralCurrency.value = normalizeCollateralConfig(p).currencies[0] || 'USDT'
  borrowOpen.value = true
}

function closeBorrowDialog() {
  borrowOpen.value = false
}

function onBorrowEscape(e) {
  if (e.key === 'Escape' && borrowOpen.value) closeBorrowDialog()
}

function closeCurrencyPicker() {
  currencyPickerOpen.value = false
}

function onCurrencyPickerEscape(e) {
  if (e.key === 'Escape' && currencyPickerOpen.value) closeCurrencyPicker()
}

function applyLoanCurrency(code) {
  loanCurrencyFilter.value = code
  currencyPickerOpen.value = false
}

watch(borrowOpen, (open) => {
  if (typeof window === 'undefined') return
  if (open) {
    if (clearBorrowTimer != null) {
      clearTimeout(clearBorrowTimer)
      clearBorrowTimer = null
    }
    window.addEventListener('keydown', onBorrowEscape)
  } else {
    window.removeEventListener('keydown', onBorrowEscape)
    if (clearBorrowTimer != null) clearTimeout(clearBorrowTimer)
    clearBorrowTimer = window.setTimeout(() => {
      borrowProduct.value = null
      borrowAmount.value = ''
      borrowCollateralCurrency.value = ''
      clearBorrowTimer = null
    }, 360)
  }
})

watch(currencyPickerOpen, (open) => {
  if (typeof window === 'undefined') return
  if (open) {
    window.addEventListener('keydown', onCurrencyPickerEscape)
  } else {
    window.removeEventListener('keydown', onCurrencyPickerEscape)
  }
})

watchEffect(() => {
  if (typeof document === 'undefined') return
  document.body.style.overflow =
    borrowOpen.value || currencyPickerOpen.value || repayOpen.value ? 'hidden' : ''
})

onUnmounted(() => {
  if (clearBorrowTimer != null) clearTimeout(clearBorrowTimer)
  if (clearRepayTimer != null) clearTimeout(clearRepayTimer)
  if (typeof document !== 'undefined') document.body.style.overflow = ''
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onBorrowEscape)
    window.removeEventListener('keydown', onCurrencyPickerEscape)
    window.removeEventListener('keydown', onRepayEscape)
  }
})

const parsedBorrow = computed(() => {
  const n = Number(String(borrowAmount.value).replace(/,/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : 0
})

const borrowInterestPreviewDays = computed(() => {
  const p = borrowProduct.value
  if (!p) return 7
  const min = Math.max(1, Number(p.minLoanDuration) || 7)
  const max = Math.max(min, Number(p.maxLoanDuration) || min)
  return Math.round((min + max) / 2)
})

const borrowInterestPreview = computed(() => {
  const p = borrowProduct.value
  if (!p) return 0
  const amt = parsedBorrow.value
  const days = borrowInterestPreviewDays.value
  return (amt * (Number(p.interestRate) / 100) * days) / 365
})

const borrowCollateralConfig = computed(() => normalizeCollateralConfig(borrowProduct.value || {}))

const borrowCollateralValue = computed(() =>
  collateralRequiredValue(parsedBorrow.value, borrowProduct.value || {})
)

const borrowCollateralAmount = computed(() =>
  collateralRequiredAmount(parsedBorrow.value, borrowProduct.value || {}, borrowCollateralCurrency.value)
)

const borrowCollateralBalance = computed(() => {
  const balances = {
    BTC: 4.28,
    ETH: 96.5,
    BNB: 1200,
    SOL: 3200,
    USDT: walletBalanceDisplay,
    USDC: 76000
  }
  return Number(balances[borrowCollateralCurrency.value]) || 0
})

const borrowCollateralSufficient = computed(() => {
  if (!borrowCollateralConfig.value.enabled) return true
  return borrowCollateralAmount.value > 0 && borrowCollateralAmount.value <= borrowCollateralBalance.value
})

const borrowSubmitValid = computed(() => {
  const p = borrowProduct.value
  if (!p || p.status !== PRODUCT_STATUS.ACTIVE) return false
  const n = parsedBorrow.value
  const min = Number(p.minLoanAmount)
  const max = Number(p.maxLoanAmount)
  if (!Number.isFinite(n) || n <= 0) return false
  if (!Number.isFinite(min) || n < min) return false
  if (Number.isFinite(max) && max > 0 && n > max) return false
  if (n > borrowCreditRemaining.value) return false
  if (!borrowCollateralSufficient.value) return false
  return true
})

function fillBorrowAll() {
  const p = borrowProduct.value
  if (!p) return
  const cap = borrowCreditRemaining.value
  const maxLoan = Number(p.maxLoanAmount)
  const lim =
    Number.isFinite(maxLoan) && maxLoan > 0 ? Math.min(maxLoan, cap) : cap
  borrowAmount.value = String(lim > 0 ? lim : '')
}

const borrowCanSubmit = computed(
  () => borrowProduct.value != null && borrowProduct.value.status === PRODUCT_STATUS.ACTIVE
)

const overdueFeePct = computed(() =>
  borrowProduct.value ? normalizeOverduePenaltyRate(borrowProduct.value) : 4
)

function submitBorrowApplication() {
  const p = borrowProduct.value
  if (!p || !borrowSubmitValid.value) return
  const now = formatLendingNow()
  const days = borrowInterestPreviewDays.value
  const amount = parsedBorrow.value
  const collateralCurrency = borrowCollateralCurrency.value
  const collateralAmount = borrowCollateralConfig.value.enabled
    ? Number(borrowCollateralAmount.value.toFixed(8))
    : 0
  const collateralValue = borrowCollateralConfig.value.enabled
    ? Number(borrowCollateralValue.value.toFixed(2))
    : 0
  orders.value = [
    {
      orderId: `ORD-DEMO-${Date.now()}`,
      userId: 'USR-DEMO',
      userName: '演示用户',
      email: 'demo@example.com',
      creditScore: 760,
      productId: p.productId,
      productName: p.productName,
      loanCurrency: p.loanCurrency,
      loanAmount: amount,
      requestedAmount: amount,
      interestRate: Number(p.interestRate) || 0,
      overduePenaltyRate: normalizeOverduePenaltyRate(p),
      collateralWarningThreshold: normalizeCollateralWarningThreshold(p),
      collateralDisposalThreshold: normalizeCollateralDisposalThreshold(p),
      overduePenaltyAccrued: 0,
      interestAccrued: 0,
      totalDebt: amount,
      status: LOAN_ORDER_STATUS.PENDING,
      loanDuration: days,
      daysElapsed: 0,
      daysRemaining: days,
      createTime: now,
      updateTime: now,
      maturityDate: now,
      collateralType: collateralCurrency,
      collateralAmount,
      collateralValue,
      collateralMultiplier: borrowCollateralConfig.value.multiplier,
      collateralStatus: borrowCollateralConfig.value.enabled ? 'locked' : 'none',
      overdueDeductEnabled: borrowCollateralConfig.value.overdueDeductEnabled,
      purpose: '前台申请',
      remarks: borrowCollateralConfig.value.enabled
        ? `已锁定 ${collateralAmount} ${collateralCurrency} 作为质押资产`
        : '无需质押'
    },
    ...orders.value
  ]
  recordTab.value = 'current'
  heroPanel.value = 'records'
  closeBorrowDialog()
}
</script>

<template>
  <div :class="fx.pageRoot">
    <header :class="fx.header">
      <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div :class="fx.headerGlowL" />
        <div :class="fx.headerGlowR" />
        <div :class="fx.headerGrad" />
      </div>
      <div :class="fx.headerInner">
        <nav :class="fx.breadcrumbNav">
          <RouterLink :to="`${prefix}/finance`" class="transition hover:text-lime-300">金融</RouterLink>
          <span class="mx-1.5 text-white/20 sm:mx-2">/</span>
          <span class="text-white/70">信用借贷</span>
        </nav>

        <div class="mt-4 flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div class="min-w-0 flex-1 space-y-5 sm:space-y-6">
            <div>
              <p :class="fx.kicker">
                Borrow · 信用借币
              </p>
              <h1 :class="fx.h1">
                信用借贷
              </h1>
            </div>
            <div :class="fx.heroSegmentWrap" role="tablist" aria-label="页面主入口">
              <button
                type="button"
                role="tab"
                :aria-selected="heroPanel === 'overview'"
                :class="[fx.heroTab, heroPanel === 'overview' ? fx.heroTabOn : fx.heroTabOff]"
                @click="heroPanel = 'overview'"
              >
                借币一览
              </button>
              <button
                type="button"
                role="tab"
                :aria-selected="heroPanel === 'records'"
                :class="[fx.heroTab, heroPanel === 'records' ? fx.heroTabOn : fx.heroTabOff]"
                @click="heroPanel = 'records'"
              >
                我的记录
              </button>
            </div>
          </div>

          <div
            v-if="heroPanel === 'overview'"
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
      <template v-if="heroPanel === 'overview'">
      <!-- 顶部四卡 -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <div :class="['flex min-w-0 items-center justify-between gap-3', fx.statCard]">
          <div class="min-w-0 flex-1 pr-1">
            <p :class="fx.statCardLabel">资产</p>
            <div class="mt-1.5 flex min-w-0 items-center gap-0.5">
              <p
                class="min-w-0 truncate text-lg font-bold tabular-nums tracking-tight sm:text-xl"
                :class="loanCurrencyFilter ? 'text-lime-200/[0.92]' : 'text-white'"
              >
                {{ loanCurrencyHeadline }}
              </p>
              <button
                type="button"
                class="shrink-0 touch-manipulation rounded-md p-1 text-white/35 transition hover:bg-white/[0.06] hover:text-lime-300/90 focus:outline-none"
                aria-label="选择借出币种"
                @click="currencyPickerOpen = true"
              >
                <FrontStrokeIcon
                  name="chevron-down"
                  size-class="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]"
                />
              </button>
            </div>
            <p class="mt-1 truncate text-[11px] leading-snug text-white/38">
              {{ loanCurrencyHint }}
            </p>
          </div>
          <button
            type="button"
            class="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.02] text-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-lime-400/30 hover:bg-lime-400/[0.08] hover:text-lime-300/95 focus:outline-none active:scale-[0.96]"
            aria-label="选择借出币种"
            @click="currencyPickerOpen = true"
          >
            <FrontStrokeIcon name="arrows-swap" size-class="h-5 w-5" />
          </button>
        </div>

        <div :class="['flex items-center justify-between gap-3', fx.statCard]">
          <div class="min-w-0">
            <p :class="fx.statCardLabel">可流动性</p>
            <p class="mt-1.5 truncate text-lg font-bold tabular-nums text-white sm:text-xl">
              {{ formatUsdCompact(liquidityTotal) }}
            </p>
          </div>
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.02] text-white/45"
            aria-hidden="true"
          >
            <FrontStrokeIcon name="bolt" size-class="h-5 w-5" />
          </div>
        </div>

        <div :class="['flex items-center justify-between gap-3', fx.statCard]">
          <div class="min-w-0">
            <p :class="fx.statCardLabel">可借（授信剩余）</p>
            <p class="mt-1.5 truncate text-lg font-bold tabular-nums text-lime-300 sm:text-xl">
              {{ remainingBorrowApprox.toLocaleString() }}
            </p>
          </div>
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.02] text-white/45"
            aria-hidden="true"
          >
            <FrontStrokeIcon name="id-card" size-class="h-5 w-5" />
          </div>
        </div>

        <div :class="['flex items-center justify-between gap-3', fx.statCard]">
          <div class="min-w-0">
            <p :class="fx.statCardLabel">待还数量</p>
            <p class="mt-1.5 truncate text-lg font-bold tabular-nums text-white sm:text-xl">
              {{ Math.round(pendingRepayTotal).toLocaleString() }}
            </p>
          </div>
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.02] text-white/45"
            aria-hidden="true"
          >
            <FrontStrokeIcon name="clipboard" size-class="h-5 w-5" />
          </div>
        </div>
      </div>

      <!-- 中部：借币期限 + 账户（标题均在框外，与左侧结构一致） -->
      <div class="mt-6 flex flex-col gap-5 sm:mt-8 sm:gap-6 lg:flex-row lg:items-start lg:gap-8">
        <section class="min-w-0 flex-1">
          <h2 class="mb-3 text-base font-semibold leading-snug tracking-tight text-lime-200/95 sm:text-lg">
            借币期限
          </h2>
          <div :class="fx.tableWrapMarketNoTop">
            <table
              :class="['w-full min-w-0 border-collapse text-left max-md:table-fixed md:min-w-[640px] md:table-auto', fx.tableBodyText]"
            >
              <thead class="hidden md:table-header-group">
                <tr :class="fx.tableHeadRow">
                  <th class="px-4 py-2 font-semibold md:px-5 md:py-2.5">币种</th>
                  <th class="hidden px-3 py-2 font-semibold md:table-cell md:px-5 md:py-2.5">利率</th>
                  <th class="hidden px-3 py-2 font-semibold md:table-cell md:px-5 md:py-2.5">还款周期</th>
                  <th class="hidden px-3 py-2 font-semibold md:table-cell md:px-5 md:py-2.5">质押倍数</th>
                  <th class="hidden px-3 py-2 font-semibold md:table-cell md:px-5 md:py-2.5">可借额度</th>
                  <th class="px-3 py-2 text-right font-semibold md:px-5 md:py-2.5">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="p in filteredProducts"
                  :key="p.productId"
                  class="border-b border-white/[0.06] transition hover:bg-white/[0.03] max-md:block max-md:last:border-b-0 md:table-row"
                >
                  <td class="max-md:block max-md:w-full max-md:px-3 max-md:pb-1 max-md:pt-3 md:table-cell md:px-5 md:py-2.5 sm:px-4">
                    <div class="flex items-start gap-2 sm:gap-3">
                      <span
                        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.12] bg-transparent text-white/40"
                      >
                        <FrontStrokeIcon name="wallet" size-class="h-4 w-4" />
                      </span>
                      <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span class="text-[15px] font-semibold leading-snug text-white sm:text-base">{{
                            p.loanCurrency
                          }}</span>
                          <span
                            class="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold sm:px-2 sm:text-[10px]"
                            :class="statusClass(p.status)"
                          >
                            {{ PRODUCT_STATUS_LABELS[p.status] }}
                          </span>
                        </div>
                        <div
                          class="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-white/[0.06] pt-3 text-[11px] text-white/50 md:hidden"
                        >
                          <span class="text-white/35">利率</span>
                          <span class="text-right font-bold tabular-nums text-lime-300">{{ p.interestRate }}%</span>
                          <span class="text-white/35">周期</span>
                          <span class="text-right tabular-nums text-white/70">
                            {{ p.minLoanDuration }} – {{ p.maxLoanDuration }} 天
                          </span>
                          <span class="text-white/35">质押</span>
                          <span class="text-right tabular-nums text-white/70">
                            {{ normalizeCollateralConfig(p).enabled ? `${normalizeCollateralConfig(p).multiplier}x` : '关闭' }}
                          </span>
                          <span class="text-white/35">额度</span>
                          <span class="truncate text-right tabular-nums text-white/70">
                            {{ p.minLoanAmount?.toLocaleString() }} – {{ p.maxLoanAmount?.toLocaleString() }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="hidden px-3 py-2.5 align-middle font-bold tabular-nums text-lime-300 md:table-cell md:px-5">
                    {{ p.interestRate }}%
                  </td>
                  <td class="hidden px-3 py-2.5 tabular-nums text-white/75 md:table-cell md:px-5">
                    {{ p.minLoanDuration }} – {{ p.maxLoanDuration }} 天
                  </td>
                  <td class="hidden px-3 py-2.5 tabular-nums text-white/70 md:table-cell md:px-5">
                    {{ normalizeCollateralConfig(p).enabled ? `${normalizeCollateralConfig(p).multiplier}x` : '关闭' }}
                  </td>
                  <td class="hidden px-3 py-2.5 tabular-nums text-white/70 md:table-cell md:px-5">
                    {{ p.minLoanAmount?.toLocaleString() }} – {{ p.maxLoanAmount?.toLocaleString() }}
                  </td>
                  <td
                    class="max-md:block max-md:w-full max-md:px-3 max-md:pb-3 max-md:pt-2 md:table-cell md:px-5 md:py-2.5 sm:px-3"
                  >
                    <button
                      v-if="p.status === PRODUCT_STATUS.ACTIVE"
                      type="button"
                      :class="fx.btnSecondaryBlock"
                      @click="openBorrowDialog(p)"
                    >
                      借款
                    </button>
                    <RouterLink
                      v-else
                      :to="`${prefix}/finance/lending/${p.productId}`"
                      :class="fx.btnMutedOutline"
                    >
                      查看
                    </RouterLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="filteredProducts.length === 0" class="mt-4 text-center text-sm text-white/45">
            暂无该币种产品
          </p>
        </section>

        <aside class="w-full shrink-0 lg:w-[min(100%,20rem)] xl:w-[min(100%,22rem)]">
          <h2 class="mb-3 text-base font-semibold leading-snug tracking-tight text-lime-200/95 sm:text-lg">
            账户信息
          </h2>
          <div
            class="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3.5 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.06)] sm:p-5 lg:rounded-2xl"
          >
            <dl class="space-y-2.5 text-xs sm:space-y-3 sm:text-sm">
              <div class="flex items-start justify-between gap-2 border-b border-white/[0.06] pb-2.5 sm:items-center sm:gap-3 sm:pb-3">
                <dt class="shrink-0 text-white/45">站内可用（演示）</dt>
                <dd class="max-w-[min(100%,11rem)] text-right text-[11px] font-semibold tabular-nums text-white sm:max-w-none sm:text-sm">
                  {{ walletBalanceDisplay.toLocaleString(undefined, { maximumFractionDigits: 2 }) }} USDT
                </dd>
              </div>
              <div class="flex items-start justify-between gap-2 border-b border-white/[0.06] pb-2.5 sm:items-center sm:gap-3 sm:pb-3">
                <dt class="shrink-0 text-white/45">授信总额</dt>
                <dd class="max-w-[min(100%,11rem)] text-right text-[11px] font-semibold tabular-nums text-white sm:max-w-none sm:text-sm">
                  {{ lendingCreditPolicy.accountTotalCapNotional.toLocaleString() }} USDT
                </dd>
              </div>
              <div class="flex items-start justify-between gap-2 border-b border-white/[0.06] pb-2.5 sm:items-center sm:gap-3 sm:pb-3">
                <dt class="shrink-0 text-white/45">已用额度</dt>
                <dd class="max-w-[min(100%,11rem)] text-right text-[11px] font-semibold tabular-nums text-white sm:max-w-none sm:text-sm">
                  {{ Math.round(globalPendingRepayTotal).toLocaleString() }}
                </dd>
              </div>
              <div class="flex items-start justify-between gap-2 pb-1 sm:items-center sm:gap-3">
                <dt class="shrink-0 text-white/45">剩余额度</dt>
                <dd class="max-w-[min(100%,11rem)] text-right text-[11px] font-semibold tabular-nums text-lime-200/90 sm:max-w-none sm:text-sm">
                  {{ remainingBorrowApprox.toLocaleString() }}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
      </template>

      <template v-else>
        <section :class="fx.panelRecords">
          <div :class="fx.panelRecordsHeader">
            <div class="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
              <p :class="fx.sectionKicker">记录明细</p>
              <span
                v-if="recordTab === 'current' && currentOrders.length"
                class="text-[11px] tabular-nums text-white/40 sm:text-xs"
              >共 {{ currentOrders.length }} 条</span>
              <span
                v-else-if="recordTab === 'repayment' && repayments.length"
                class="text-[11px] tabular-nums text-white/40 sm:text-xs"
              >共 {{ repayments.length }} 条</span>
            </div>
            <div :class="fx.recordTablist2" role="tablist" aria-label="记录类型">
              <button
                type="button"
                role="tab"
                :aria-selected="recordTab === 'current'"
                :class="[fx.recordTab, recordTab === 'current' ? fx.recordTabOn : fx.recordTabOff]"
                @click="recordTab = 'current'"
              >
                当前
              </button>
              <button
                type="button"
                role="tab"
                :aria-selected="recordTab === 'repayment'"
                :class="[fx.recordTab, recordTab === 'repayment' ? fx.recordTabOn : fx.recordTabOff]"
                @click="recordTab = 'repayment'"
              >
                还款
              </button>
            </div>
          </div>
          <div class="overflow-x-auto">
            <!-- 当前记录 -->
            <table
              v-if="recordTab === 'current'"
              :class="['w-full min-w-0 border-collapse text-left max-md:table-fixed md:min-w-[560px] md:table-auto', fx.tableBodyText]"
            >
              <thead class="hidden md:table-header-group">
                <tr :class="fx.tableHeadRow">
                  <th class="px-3 py-2.5 font-semibold md:px-5 md:py-3">借币</th>
                  <th class="hidden px-3 py-2.5 font-semibold md:table-cell md:px-5 md:py-3">借款金额</th>
                  <th class="hidden px-3 py-2.5 font-semibold md:table-cell md:px-5 md:py-3">锁定质押</th>
                  <th class="hidden px-3 py-2.5 font-semibold md:table-cell md:px-5 md:py-3">利率</th>
                  <th class="hidden px-3 py-2.5 font-semibold md:table-cell md:px-5 md:py-3">到期</th>
                  <th class="hidden px-3 py-2.5 font-semibold md:table-cell md:px-5 md:py-3">待还</th>
                  <th class="px-3 py-2.5 text-right font-semibold md:px-5 md:py-3 md:text-left">操作</th>
                  <th class="px-3 py-2.5 text-right font-semibold md:px-5 md:py-3 md:text-left">状态</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="o in pgCurrent.pagedItems"
                  :key="o.orderId"
                  class="border-b border-white/[0.06] transition hover:bg-white/[0.02] max-md:block max-md:last:border-b-0 md:table-row"
                >
                  <td class="min-w-0 max-md:block max-md:w-full max-md:px-3 max-md:pb-0 max-md:pt-4 md:table-cell md:px-5 md:py-3">
                    <p class="text-[14px] font-semibold leading-snug text-white sm:text-sm">{{ o.loanCurrency }}</p>
                    <p class="mt-0.5 tabular-nums text-[11px] text-white/55 sm:text-xs">
                      {{ o.loanAmount?.toLocaleString() }}
                    </p>
                    <div
                      class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-white/[0.06] pt-3 text-[11px] text-white/50 md:hidden"
                    >
                      <span class="text-white/35">利率</span>
                      <span class="text-right font-medium tabular-nums text-lime-300/90">{{ o.interestRate }}%</span>
                      <span class="text-white/35">到期</span>
                      <span class="text-right tabular-nums text-white/70">{{ o.maturityDate }}</span>
                      <span class="text-white/35">待还</span>
                      <span class="text-right font-medium tabular-nums text-white/85">{{ o.totalDebt?.toLocaleString() }}</span>
                      <span class="text-white/35">逾期利息</span>
                      <span class="text-right tabular-nums text-orange-200/90">{{ (o.overduePenaltyAccrued || 0)?.toLocaleString() }}</span>
                      <span class="text-white/35">质押</span>
                      <span class="text-right tabular-nums text-white/70">
                        {{ o.collateralAmount ? `${o.collateralAmount?.toLocaleString()} ${o.collateralType}` : '—' }}
                      </span>
                    </div>
                    <div
                      v-if="
                        o.status === LOAN_ORDER_STATUS.ACTIVE || o.status === LOAN_ORDER_STATUS.REPAYING
                        || o.status === LOAN_ORDER_STATUS.OVERDUE
                      "
                      class="mt-3 md:hidden"
                    >
                      <button
                        type="button"
                        :class="fx.btnTableActionBlock"
                        @click="openRepayDialog(o)"
                      >
                        还款
                      </button>
                    </div>
                  </td>
                  <td class="hidden px-3 py-2.5 tabular-nums md:table-cell md:px-5 md:py-3">
                    {{ o.loanAmount?.toLocaleString() }}
                  </td>
                  <td class="hidden px-3 py-2.5 tabular-nums text-white/70 md:table-cell md:px-5 md:py-3">
                    {{ o.collateralAmount ? `${o.collateralAmount?.toLocaleString()} ${o.collateralType}` : '—' }}
                  </td>
                  <td class="hidden tabular-nums text-lime-300/90 md:table-cell md:px-5 md:py-3">
                    {{ o.interestRate }}%
                  </td>
                  <td class="hidden tabular-nums text-white/50 md:table-cell md:px-5 md:py-3">
                    {{ o.maturityDate }}
                  </td>
                  <td class="hidden tabular-nums text-white/80 md:table-cell md:px-5 md:py-3">
                    <div>{{ o.totalDebt?.toLocaleString() }}</div>
                    <div v-if="o.overduePenaltyAccrued" class="text-xs text-orange-200/85">
                      逾期利息 {{ o.overduePenaltyAccrued?.toLocaleString() }}
                    </div>
                  </td>
                  <td
                    class="max-md:hidden md:table-cell md:px-5 md:py-3 md:text-left"
                  >
                    <button
                      v-if="
                        o.status === LOAN_ORDER_STATUS.ACTIVE || o.status === LOAN_ORDER_STATUS.REPAYING
                        || o.status === LOAN_ORDER_STATUS.OVERDUE
                      "
                      type="button"
                      :class="fx.btnTableAction"
                      @click="openRepayDialog(o)"
                    >
                      还款
                    </button>
                    <span v-else class="text-xs text-white/35">—</span>
                  </td>
                  <td
                    class="max-md:block max-md:w-full max-md:px-3 max-md:pb-4 max-md:pt-1 md:table-cell md:px-5 md:py-3 md:text-left"
                  >
                    <span class="text-[11px] leading-snug text-white/85 sm:text-xs md:text-sm">
                      {{ LOAN_ORDER_STATUS_LABELS[o.status] ?? o.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- 还款记录 -->
            <table
              v-else-if="recordTab === 'repayment'"
              :class="['w-full min-w-0 border-collapse text-left max-md:table-fixed md:min-w-[560px] md:table-auto', fx.tableBodyText]"
            >
              <thead class="hidden md:table-header-group">
                <tr :class="fx.tableHeadRow">
                  <th class="px-3 py-2.5 font-semibold md:px-5 md:py-3">产品 / 金额</th>
                  <th class="hidden px-3 py-2.5 font-semibold md:table-cell md:px-5 md:py-3">金额</th>
                  <th class="hidden px-3 py-2.5 font-semibold md:table-cell md:px-5 md:py-3">类型</th>
                  <th class="hidden px-3 py-2.5 font-semibold md:table-cell md:px-5 md:py-3">时间</th>
                  <th class="px-3 py-2.5 text-right font-semibold md:px-5 md:py-3 md:text-left">状态</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="r in pgRepay.pagedItems"
                  :key="r.repaymentId"
                  class="border-b border-white/[0.06] transition hover:bg-white/[0.02] max-md:block max-md:last:border-b-0 md:table-row"
                >
                  <td class="min-w-0 max-md:block max-md:w-full max-md:px-3 max-md:pb-0 max-md:pt-4 md:table-cell md:px-5 md:py-3">
                    <p class="line-clamp-2 text-[14px] font-medium leading-snug text-white sm:text-sm">
                      {{ r.productName }}
                    </p>
                    <p class="mt-0.5 tabular-nums text-[11px] text-white/55 sm:text-xs">
                      {{ r.amount?.toLocaleString() }} {{ r.loanCurrency || 'USDT' }}
                    </p>
                    <div
                      class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-white/[0.06] pt-3 text-[11px] text-white/50 md:hidden"
                    >
                      <span class="text-white/35">逾期利息</span>
                      <span class="text-right tabular-nums text-orange-200/90">{{ (r.overduePenaltyPaid || 0).toLocaleString() }}</span>
                      <span class="text-white/35">正常利息</span>
                      <span class="text-right tabular-nums text-lime-300/90">{{ (r.interestPaid || 0).toLocaleString() }}</span>
                      <span class="text-white/35">本金</span>
                      <span class="text-right tabular-nums text-white/85">{{ (r.principalPaid || 0).toLocaleString() }}</span>
                      <span class="text-white/35">类型</span>
                      <span class="text-right text-white/75">{{ REPAYMENT_TYPE_LABELS[r.repaymentType] ?? r.repaymentType }}</span>
                      <span class="text-white/35">时间</span>
                      <span class="text-right tabular-nums text-white/60">{{ r.repaymentTime ?? r.createTime }}</span>
                    </div>
                  </td>
                  <td class="hidden px-3 py-2.5 tabular-nums md:table-cell md:px-5 md:py-3">
                    <div>{{ r.amount?.toLocaleString() }} {{ r.loanCurrency || 'USDT' }}</div>
                    <div class="mt-1 text-xs text-white/50">
                      逾期利息 {{ (r.overduePenaltyPaid || 0).toLocaleString() }} / 利息 {{ (r.interestPaid || 0).toLocaleString() }} / 本金 {{ (r.principalPaid || 0).toLocaleString() }}
                    </div>
                  </td>
                  <td class="hidden md:table-cell md:px-5 md:py-3">
                    {{ REPAYMENT_TYPE_LABELS[r.repaymentType] ?? r.repaymentType }}
                  </td>
                  <td class="hidden tabular-nums text-white/50 md:table-cell md:px-5 md:py-3">
                    {{ r.repaymentTime ?? r.createTime }}
                  </td>
                  <td
                    class="max-md:block max-md:w-full max-md:px-3 max-md:pb-4 max-md:pt-3 md:table-cell md:px-5 md:py-3 md:text-left"
                  >
                    <span class="text-[11px] leading-snug sm:text-xs md:text-sm">
                      {{ REPAYMENT_STATUS_LABELS[r.status] ?? r.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

          </div>
          <FrontClientPager
            v-if="recordTab === 'current'"
            :page="pgCurrent.page"
            :total-pages="pgCurrent.totalPages"
            :total="pgCurrent.total"
            :page-size="pgCurrent.pageSize"
            @prev="pgCurrent.goPrev"
            @next="pgCurrent.goNext"
          />
          <FrontClientPager
            v-else-if="recordTab === 'repayment'"
            :page="pgRepay.page"
            :total-pages="pgRepay.totalPages"
            :total="pgRepay.total"
            :page-size="pgRepay.pageSize"
            @prev="pgRepay.goPrev"
            @next="pgRepay.goNext"
          />
          <p
            v-if="
              (recordTab === 'current' && !currentOrders.length) ||
              (recordTab === 'repayment' && !repayments.length)
            "
            class="px-3 py-12 text-center text-sm text-white/40 sm:py-14"
          >
            暂无数据
          </p>
        </section>
      </template>
    </div>

    <!-- 还款 -->
    <FrontPopupShell
      v-model="repayOpen"
      aria-labelledby="lending-repay-dialog-title"
      close-on-backdrop
      @backdrop-click="closeRepayDialog"
    >
      <FrontPopupCard v-if="repayOrder" variant="padded" wide @click.stop>
        <FrontPopupCloseButton @click="closeRepayDialog" />
        <h2 id="lending-repay-dialog-title" class="pr-10 text-lg font-semibold tracking-tight text-white">
          确认还款
        </h2>
        <p class="mt-1.5 text-[13px] leading-relaxed text-white/45">
          提交后将按顺序冲减逾期利息、正常利息、最后冲减本金，并同步「还款」记录。
        </p>
        <dl class="mt-4 space-y-2 rounded-xl border border-white/[0.08] bg-black/35 px-3 py-3 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-white/45">订单</dt>
            <dd class="font-mono text-xs text-white/80">{{ repayOrder.orderId }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-white/45">产品</dt>
            <dd class="text-right text-white/90">{{ repayOrder.productName }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-white/45">币种</dt>
            <dd class="font-medium text-white">{{ repayOrder.loanCurrency }}</dd>
          </div>
          <div class="flex justify-between gap-3 border-t border-white/[0.06] pt-2">
            <dt class="text-white/45">待还总额</dt>
            <dd class="tabular-nums font-semibold text-white">
              {{ repayOrder.totalDebt?.toLocaleString() }} {{ repayOrder.loanCurrency }}
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-white/45">逾期利息</dt>
            <dd class="tabular-nums text-orange-200/90">
              {{ (repayOrder.overduePenaltyAccrued || 0).toLocaleString() }} {{ repayOrder.loanCurrency }}
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-white/45">已计利息</dt>
            <dd class="tabular-nums text-lime-200/90">
              {{ repayOrder.interestAccrued?.toLocaleString() }} {{ repayOrder.loanCurrency }}
            </dd>
          </div>
        </dl>
        <div class="mt-5">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <span class="text-sm font-medium text-white/75">还款金额</span>
            <button type="button" :class="fx.linkAccent" @click="fillRepayAll">
              全额
            </button>
          </div>
          <input
            v-model="repayAmount"
            type="text"
            inputmode="decimal"
            class="mt-2 w-full"
            :class="fx.input"
            placeholder="输入还款金额"
          />
        </div>
        <div class="mt-4 rounded-xl border border-white/[0.08] bg-black/30 px-3 py-3 text-xs text-white/60">
          <div class="flex justify-between gap-3">
            <span>本次先还逾期利息</span>
            <span class="tabular-nums text-orange-200/90">{{ repayBreakdown.overduePenaltyPaid.toLocaleString() }} {{ repayOrder.loanCurrency }}</span>
          </div>
          <div class="mt-1.5 flex justify-between gap-3">
            <span>然后还正常利息</span>
            <span class="tabular-nums text-lime-300/90">{{ repayBreakdown.interestPaid.toLocaleString() }} {{ repayOrder.loanCurrency }}</span>
          </div>
          <div class="mt-1.5 flex justify-between gap-3">
            <span>最后还本金</span>
            <span class="tabular-nums text-white/85">{{ repayBreakdown.principalPaid.toLocaleString() }} {{ repayOrder.loanCurrency }}</span>
          </div>
        </div>
        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" :class="fx.btnGhost" @click="closeRepayDialog">
            取消
          </button>
          <button
            type="button"
            :class="fx.btnPrimary"
            :disabled="!repayConfirmEnabled"
            @click="confirmRepay"
          >
            确认还款
          </button>
        </div>
      </FrontPopupCard>
    </FrontPopupShell>

    <!-- 借出币种（弹层，避免资产卡内 Tab 过窄） -->
    <FrontPopupShell
      v-model="currencyPickerOpen"
      aria-labelledby="lending-currency-picker-title"
      close-on-backdrop
      @backdrop-click="closeCurrencyPicker"
    >
      <FrontPopupCard variant="padded" wide @click.stop>
        <FrontPopupCloseButton @click="closeCurrencyPicker" />
        <h2 id="lending-currency-picker-title" class="pr-10 text-lg font-semibold tracking-tight text-white">
          选择借出币种
        </h2>
        <div
          class="mt-5 overflow-hidden rounded-xl border border-white/[0.08] bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
        >
          <ul
            class="max-h-[min(56vh,20rem)] divide-y divide-white/[0.06] overflow-y-auto overscroll-contain"
            role="listbox"
            aria-label="借出币种选项"
          >
            <li>
              <button
                type="button"
                role="option"
                :aria-selected="loanCurrencyFilter === ''"
                class="flex w-full min-h-[3.25rem] touch-manipulation items-center justify-between gap-3 px-4 py-3.5 text-left text-[15px] font-semibold transition focus:outline-none focus-visible:bg-white/[0.04]"
                :class="
                  loanCurrencyFilter === ''
                    ? 'bg-lime-400/[0.1] text-lime-50'
                    : 'text-white/90 hover:bg-white/[0.04]'
                "
                @click="applyLoanCurrency('')"
              >
                <span>全部币种</span>
                <FrontStrokeIcon
                  v-if="loanCurrencyFilter === ''"
                  name="check"
                  size-class="h-5 w-5 shrink-0 text-lime-400/90"
                />
              </button>
            </li>
            <li v-for="c in loanCurrencies" :key="c">
              <button
                type="button"
                role="option"
                :aria-selected="loanCurrencyFilter === c"
                class="flex w-full min-h-[3.25rem] touch-manipulation items-center justify-between gap-3 px-4 py-3.5 text-left text-[15px] font-semibold tabular-nums transition focus:outline-none focus-visible:bg-white/[0.04]"
                :class="
                  loanCurrencyFilter === c
                    ? 'bg-lime-400/[0.1] text-lime-50'
                    : 'text-white/90 hover:bg-white/[0.04]'
                "
                @click="applyLoanCurrency(c)"
              >
                <span>{{ c }}</span>
                <FrontStrokeIcon
                  v-if="loanCurrencyFilter === c"
                  name="check"
                  size-class="h-5 w-5 shrink-0 text-lime-400/90"
                />
              </button>
            </li>
          </ul>
        </div>
      </FrontPopupCard>
    </FrontPopupShell>

    <!-- 产品详情 / 借款 -->
    <FrontPopupShell
      v-model="borrowOpen"
      aria-labelledby="credit-borrow-dialog-title"
      close-on-backdrop
      @backdrop-click="closeBorrowDialog"
    >
      <FrontPopupCard v-if="borrowProduct" variant="flow" flow-max="760" wide class="lg:!max-w-3xl" @click.stop>
        <FrontPopupCloseButton @click="closeBorrowDialog" />

        <div
          class="relative flex min-h-0 flex-1 flex-col overflow-hidden border-b border-white/10"
        >
          <div class="shrink-0 px-4 pb-3 pt-5 pr-11 sm:px-5 sm:pr-12">
            <h2 id="credit-borrow-dialog-title" class="text-lg font-semibold text-white">
              产品详情
            </h2>
            <div class="mt-4 flex items-center gap-3">
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.12] bg-transparent text-white/45"
              >
                <FrontStrokeIcon name="wallet" size-class="h-6 w-6" />
              </div>
              <p class="text-xl font-semibold text-white">{{ borrowProduct.loanCurrency }}</p>
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-1 [scrollbar-width:none] sm:px-5 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
            <div class="grid gap-4 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
              <div class="space-y-4">
                <dl class="space-y-2 text-sm">
                  <div class="flex items-center justify-between gap-3 border-b border-white/[0.06] py-2">
                    <dt class="text-white/45">利率</dt>
                    <dd class="font-bold tabular-nums text-lime-300">{{ borrowProduct.interestRate }}%</dd>
                  </div>
                  <div class="flex items-center justify-between gap-3 border-b border-white/[0.06] py-2">
                    <dt class="text-white/45">还款周期</dt>
                    <dd class="tabular-nums text-white">
                      {{ borrowProduct.minLoanDuration }} – {{ borrowProduct.maxLoanDuration }} 天
                    </dd>
                  </div>
                  <div class="flex items-center justify-between gap-3 border-b border-white/[0.06] py-2">
                    <dt class="text-white/45">借款币种</dt>
                    <dd class="font-medium text-white">{{ borrowProduct.loanCurrency }}</dd>
                  </div>
                  <div class="flex items-center justify-between gap-3 border-b border-white/[0.06] py-2">
                    <dt class="text-white/45">借款金额（最小 / 最大）</dt>
                    <dd class="text-right tabular-nums text-white">
                      {{ borrowProduct.minLoanAmount?.toLocaleString() }} –
                      {{ borrowProduct.maxLoanAmount?.toLocaleString() }}
                    </dd>
                  </div>
                  <div class="flex items-center justify-between gap-3 py-2">
                    <dt class="text-white/45">质押规则</dt>
                    <dd class="text-right tabular-nums text-white">
                      {{ borrowCollateralConfig.enabled ? `${borrowCollateralConfig.multiplier}x · ${borrowCollateralConfig.currencies.join(' / ')}` : '关闭' }}
                    </dd>
                  </div>
                </dl>

                <div
                  class="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-xs leading-relaxed text-orange-200/95"
                >
                  请及时还款；若逾期，每日额外收取（本金+利息）约
                  <span class="font-semibold">{{ overdueFeePct }}%</span>
                  作为逾期费。质押币种按实时币价估值，达到 {{ normalizeCollateralWarningThreshold(borrowProduct) }}% 将进入风险预警，达到 {{ normalizeCollateralDisposalThreshold(borrowProduct) }}% 可进入逾期处理。
                </div>
              </div>

              <div v-if="borrowCanSubmit" class="space-y-3 rounded-xl border border-white/[0.08] bg-black/20 p-3">
                <div class="flex flex-wrap items-baseline justify-between gap-2">
                  <span class="text-sm font-medium text-white/75">借币数量</span>
                  <span class="text-xs text-white/45">
                    本单可借上限：{{ borrowCreditRemaining.toLocaleString() }} {{ borrowProduct.loanCurrency }}
                  </span>
                </div>
                <div class="flex gap-2">
                  <input
                    v-model="borrowAmount"
                    type="text"
                    inputmode="decimal"
                    :placeholder="`最少 ${borrowProduct.minLoanAmount} 起`"
                    :class="fx.inputFlex"
                  />
                  <button type="button" :class="fx.inputSideBtn" @click="fillBorrowAll">
                    全部
                  </button>
                </div>
                <p class="text-xs tabular-nums text-white/50">
                  利息预估（约 {{ borrowInterestPreviewDays }} 天）：
                  <span class="font-semibold text-lime-300/90">
                    {{ borrowInterestPreview.toFixed(4) }} {{ borrowProduct.loanCurrency }}
                  </span>
                </p>
                <div
                  v-if="borrowCollateralConfig.enabled"
                  class="rounded-xl border border-white/[0.08] bg-black/30 p-3"
                >
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <span class="text-sm font-medium text-white/75">质押币种</span>
                    <select
                      v-model="borrowCollateralCurrency"
                      class="rounded-lg border border-white/[0.12] bg-[#111] px-3 py-2 text-sm text-white outline-none"
                    >
                      <option v-for="coin in borrowCollateralConfig.currencies" :key="coin" :value="coin">{{ coin }}</option>
                    </select>
                  </div>
                  <dl class="mt-3 grid grid-cols-2 gap-2 text-xs text-white/50">
                    <dt>需锁定价值</dt>
                    <dd class="text-right tabular-nums text-white/85">{{ borrowCollateralValue.toLocaleString(undefined, { maximumFractionDigits: 2 }) }} USD</dd>
                    <dt>需锁定数量</dt>
                    <dd class="text-right tabular-nums text-lime-200/90">{{ borrowCollateralAmount.toLocaleString(undefined, { maximumFractionDigits: 8 }) }} {{ borrowCollateralCurrency }}</dd>
                    <dt>账户可用</dt>
                    <dd class="text-right tabular-nums text-white/75">{{ borrowCollateralBalance.toLocaleString(undefined, { maximumFractionDigits: 8 }) }} {{ borrowCollateralCurrency }}</dd>
                    <dt>参考价格</dt>
                    <dd class="text-right tabular-nums text-white/60">{{ (LENDING_COLLATERAL_PRICE_USD[borrowCollateralCurrency] || 1).toLocaleString() }} USD</dd>
                  </dl>
                  <p v-if="parsedBorrow > 0 && !borrowCollateralSufficient" class="mt-2 text-xs text-amber-200/90">
                    当前质押币种余额不足，请切换币种或降低借款金额。
                  </p>
                </div>
                <p
                  v-if="!borrowSubmitValid && parsedBorrow > 0"
                  class="text-xs leading-relaxed text-amber-200/90"
                >
                  请输入 {{ borrowProduct.minLoanAmount?.toLocaleString() }} –
                  {{ borrowProduct.maxLoanAmount?.toLocaleString() }} 范围内，且不超过本单可借上限
                  {{ borrowCreditRemaining.toLocaleString() }} {{ borrowProduct.loanCurrency }}。
                </p>
              </div>
            </div>

            <div class="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" :class="fx.btnGhost" @click="closeBorrowDialog">
                取消
              </button>
              <button
                v-if="borrowCanSubmit"
                type="button"
                :class="fx.btnPrimary"
                :disabled="!borrowSubmitValid"
                @click="submitBorrowApplication"
              >
                提交申请并锁定质押
              </button>
            </div>
          </div>
        </div>
      </FrontPopupCard>
    </FrontPopupShell>
  </div>
</template>
