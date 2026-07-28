<script setup>
import { computed, onUnmounted, ref, watch, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import FrontPopupCard from '../../../../components/front/FrontPopupCard.vue'
import FrontPopupCloseButton from '../../../../components/front/FrontPopupCloseButton.vue'
import FrontPopupShell from '../../../../components/front/FrontPopupShell.vue'
import FrontStrokeIcon from '../../../../components/front/FrontStrokeIcon.vue'
import FrontClientPager from '../../../../components/front/FrontClientPager.vue'
import { useClientListPagination } from '../../../../composables/useClientListPagination'
import { FINANCE_FX as fx } from '../../../../constants/frontFinanceUi'
import { createAiQuantOrdersMock, createYieldAdjustmentsMock } from '../../../../admin/mock/aiQuant'
import { aiQuantProductsCatalog } from '../../../../admin/state/financeCatalogs'
import { buildAiQuantDemoExtraOrders, buildAiQuantDemoExtraAdjustments } from '../../../../admin/mock/frontFinanceDemoBulk'
import {
  PRODUCT_STATUS,
  productStatusMeta,
  ORDER_STATUS,
  orderStatusMeta,
  SETTLEMENT_PERIOD,
  settlementPeriodMeta,
  formatAiQuantDurationLabel,
  adjustmentTypeMeta,
  sortAiQuantProducts
} from '../../../../admin/constants/aiQuant'

const prefix = '/front'
const route = useRoute()

const LIST_PAGE_SIZE = 8

/** 列表页资产 Tab（与产品配置币种对齐） */
const TAB_CURRENCIES = ['USDC', 'BTC', 'ETH', 'DOGE', 'XRP', 'SOL', 'BNB', 'TRX']

const products = aiQuantProductsCatalog
const orders = ref([...createAiQuantOrdersMock(), ...buildAiQuantDemoExtraOrders()])
const yieldAdjustments = ref([...createYieldAdjustmentsMock(), ...buildAiQuantDemoExtraAdjustments()])

const currencyTab = ref('USDC')

/** Hero 主入口：机器人市场 / 我的托管（与借贷、流动性列表一致） */
const heroPanel = ref('market')

watch(
  products,
  (list) => {
    const withProd = TAB_CURRENCIES.find((c) => list.some((p) => productCurrencyMatchesTab(p.currency, c)))
    if (withProd) currencyTab.value = withProd
  },
  { immediate: true }
)

function productCurrencyMatchesTab(productCurrency, tab) {
  const pc = String(productCurrency || '').toUpperCase()
  const t = String(tab || '').toUpperCase()
  if (t === 'USDC') return pc === 'USDC' || pc === 'USDT'
  return pc === t
}

const productsForTab = computed(() =>
  sortAiQuantProducts(products.value.filter((p) => productCurrencyMatchesTab(p.currency, currencyTab.value)))
)

const vipBadgeRing = [
  'border-lime-400/40 bg-lime-400/12 text-lime-100',
  'border-white/20 bg-white/[0.08] text-white/90',
  'border-lime-400/25 bg-lime-400/[0.07] text-lime-200',
  'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
]

function vipBadgeClass(i) {
  return vipBadgeRing[i % vipBadgeRing.length]
}

/** 分档行：每个产品 × 档位 → 一行「机器人」租用入口 */
const tierRows = computed(() => {
  const rows = []
  for (const p of productsForTab.value) {
    const tiers = p.tiers || []
    tiers.forEach((tier, idx) => {
      const vipNum = Math.min(9, (Number(p.minVipLevel) || 0) + idx + 1)
      rows.push({
        rowKey: `${p.id}-${idx}`,
        product: p,
        tier,
        tierIndex: idx,
        vipLabel: `VIP.${vipNum}`
      })
    })
  }
  return rows
})

function cycleLabel(p) {
  return formatAiQuantDurationLabel(p?.durationDays)
}

function formatAmountSpan(min, max, currency) {
  const a = Number(min)
  const b = Number(max)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return '—'
  return `${formatCompact(a)} ~ ${formatCompact(b)} ${currency}`
}

function formatCompact(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  const abs = Math.abs(v)
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${(v / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${(v / 1e3).toFixed(2)}K`
  if (abs >= 1 && abs < 1e3) return v.toLocaleString(undefined, { maximumFractionDigits: 2 })
  return String(v)
}

function displayCurrency(tab) {
  return tab === 'USDC' ? 'USDC' : tab
}

const ordersForTabCurrency = computed(() =>
  orders.value.filter((o) => productCurrencyMatchesTab(o.currency, currencyTab.value))
)

const runningOrdersTab = computed(() =>
  ordersForTabCurrency.value.filter((o) => o.status === ORDER_STATUS.RUNNING)
)

const custodyPrincipal = computed(() =>
  runningOrdersTab.value.reduce((s, o) => s + (Number(o.principal) || 0), 0)
)

const expectedDailyTab = computed(() =>
  runningOrdersTab.value.reduce((s, o) => s + (Number(o.expectedDailyYield) || 0), 0)
)

const accumulatedYieldTab = computed(() =>
  ordersForTabCurrency.value.reduce((s, o) => s + (Number(o.accumulatedYield) || 0), 0)
)

const custodyOrderCount = computed(() => runningOrdersTab.value.length)

function formatAmountForTab(n, currency) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '0'
  const dec = currency === 'BTC' || currency === 'ETH' ? 4 : 2
  return v.toLocaleString(undefined, { maximumFractionDigits: dec })
}

const recordTab = ref('running')

const buyOrders = computed(() =>
  ordersForTabCurrency.value.filter(
    (o) =>
      o.status === ORDER_STATUS.RUNNING ||
      o.status === ORDER_STATUS.COMPLETED ||
      o.status === ORDER_STATUS.SETTLED ||
      o.status === ORDER_STATUS.LOCKED ||
      o.status === ORDER_STATUS.CANCELLED
  )
)

const redeemOrders = computed(() =>
  ordersForTabCurrency.value.filter((o) => o.status === ORDER_STATUS.EARLY_REDEEMED)
)

const interestRows = computed(() => yieldAdjustments.value.filter((a) => productCurrencyMatchesTab(a.currency, currencyTab.value)))

const pgTier = useClientListPagination(tierRows, { pageSize: LIST_PAGE_SIZE })
const pgRunning = useClientListPagination(runningOrdersTab, { pageSize: LIST_PAGE_SIZE })
const pgBuy = useClientListPagination(buyOrders, { pageSize: LIST_PAGE_SIZE })
const pgRedeem = useClientListPagination(redeemOrders, { pageSize: LIST_PAGE_SIZE })
const pgInterest = useClientListPagination(interestRows, { pageSize: LIST_PAGE_SIZE })

watch(currencyTab, () => {
  pgTier.resetPage()
  pgRunning.resetPage()
  pgBuy.resetPage()
  pgRedeem.resetPage()
  pgInterest.resetPage()
})

watch(recordTab, () => {
  pgRunning.resetPage()
  pgBuy.resetPage()
  pgRedeem.resetPage()
  pgInterest.resetPage()
})

watch(heroPanel, (panel) => {
  if (panel === 'market') pgTier.resetPage()
  if (panel === 'mine') {
    pgRunning.resetPage()
    pgBuy.resetPage()
    pgRedeem.resetPage()
    pgInterest.resetPage()
  }
})

function orderStatusPillClass(status) {
  if (status === ORDER_STATUS.RUNNING) return 'bg-sky-400/15 text-sky-200'
  if (status === ORDER_STATUS.COMPLETED) return 'bg-lime-400/12 text-lime-200'
  if (status === ORDER_STATUS.SETTLED) return 'bg-white/10 text-white/60'
  if (status === ORDER_STATUS.EARLY_REDEEMED) return 'bg-lime-400/12 text-lime-200'
  if (status === ORDER_STATUS.LOCKED) return 'bg-amber-400/15 text-amber-200'
  if (status === ORDER_STATUS.CANCELLED) return 'bg-rose-400/15 text-rose-200'
  return 'bg-white/10 text-white/55'
}

function productRentable(p) {
  return p.status === PRODUCT_STATUS.ENABLED
}

/** 展示用币种（Tab 为 USDC 时 USDT 产品显示为 USDC） */
function displayAssetCurrency(productCurrency) {
  const c = String(productCurrency || '').toUpperCase()
  if (c === 'USDT') return 'USDC'
  return c || '—'
}

function distributionLabel(p) {
  if (!p) return '—'
  if (p.settlementPeriod === SETTLEMENT_PERIOD.DAILY) return '每天'
  if (p.settlementPeriod === SETTLEMENT_PERIOD.WEEKLY) return '每周'
  if (p.settlementPeriod === SETTLEMENT_PERIOD.MONTHLY) return '每月'
  if (p.settlementPeriod === SETTLEMENT_PERIOD.CUSTOM && p.customDays) {
    return `每 ${p.customDays} 天`
  }
  return settlementPeriodMeta[p.settlementPeriod]?.label ?? '—'
}

function formatValueDateUtc8() {
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
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')} (UTC+8)`
}

/** 订单结算/赎回时间（UTC+8，无时区后缀） */
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

function formatTierAmountPlain(min, max, productCurrency) {
  const cur = displayAssetCurrency(productCurrency)
  const a = Number(min)
  const b = Number(max)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return `— ${cur}`
  return `${a} ~ ${b} ${cur}`
}

/** 立即租用弹窗 */
const rentOpen = ref(false)
const rentRow = ref(null)
const rentAmount = ref('')
let clearRentTimer = null

/** Sample available balance per asset (rent dialog helper line) */
const availableBalanceByAsset = {
  USDT: 5.562875,
  USDC: 5.562875,
  BTC: 0.015628,
  ETH: 1.2482,
  BNB: 12.905,
  SOL: 48.33,
  DOGE: 10240.5,
  XRP: 888.2,
  TRX: 22000
}

const rentAvailable = computed(() => {
  const p = rentRow.value?.product
  if (!p?.currency) return 0
  const key = String(p.currency).toUpperCase()
  return availableBalanceByAsset[key] ?? 0
})

function openRentDialog(row) {
  if (clearRentTimer != null) {
    clearTimeout(clearRentTimer)
    clearRentTimer = null
  }
  aiRedeemOpen.value = false
  rentRow.value = row
  rentAmount.value = ''
  rentOpen.value = true
}

function closeRentDialog() {
  rentOpen.value = false
}

function onRentEscape(e) {
  if (e.key === 'Escape' && rentOpen.value) closeRentDialog()
}

/** 运行中订单：申请提前赎回 */
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
  rentOpen.value = false
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

watch(rentOpen, (open) => {
  if (typeof window === 'undefined') return
  if (open) {
    if (clearRentTimer != null) {
      clearTimeout(clearRentTimer)
      clearRentTimer = null
    }
    window.addEventListener('keydown', onRentEscape)
  } else {
    window.removeEventListener('keydown', onRentEscape)
    if (clearRentTimer != null) clearTimeout(clearRentTimer)
    clearRentTimer = window.setTimeout(() => {
      rentRow.value = null
      rentAmount.value = ''
      clearRentTimer = null
    }, 360)
  }
})

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
  document.body.style.overflow = rentOpen.value || aiRedeemOpen.value ? 'hidden' : ''
})

onUnmounted(() => {
  if (clearRentTimer != null) clearTimeout(clearRentTimer)
  if (clearAiRedeemTimer != null) clearTimeout(clearAiRedeemTimer)
  if (typeof document !== 'undefined') document.body.style.overflow = ''
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onRentEscape)
    window.removeEventListener('keydown', onAiRedeemEscape)
  }
})

function fillRentAll() {
  const row = rentRow.value
  if (!row?.tier) return
  rentAmount.value = String(row.tier.maxAmount ?? '')
}

const parsedRentAmount = computed(() => {
  const n = Number(String(rentAmount.value).replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 0
})

const rentSubmitValid = computed(() => {
  const row = rentRow.value
  if (!row?.tier) return false
  const n = parsedRentAmount.value
  const min = Number(row.tier.minAmount)
  const max = Number(row.tier.maxAmount)
  if (!Number.isFinite(n) || !Number.isFinite(min) || !Number.isFinite(max)) return false
  if (n < min || n > max) return false
  if (n > rentAvailable.value) return false
  return true
})
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
          <span class="text-white/70">AI 量化</span>
        </nav>

        <!-- Hero：仅一级入口 + 标题；「购买/赎回/利息」在正文区，避免与市场 Tab 视觉同级 -->
        <div class="mt-4 flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div class="min-w-0 flex-1 space-y-5 sm:space-y-6">
            <div>
              <p :class="fx.kicker">
                Quant · 策略托管
              </p>
              <h1 :class="fx.h1">
                AI 量化交易
              </h1>
            </div>
            <div :class="fx.heroSegmentWrap" role="tablist" aria-label="页面主入口">
              <button
                type="button"
                role="tab"
                :aria-selected="heroPanel === 'market'"
                :class="[fx.heroTab, heroPanel === 'market' ? fx.heroTabOn : fx.heroTabOff]"
                @click="heroPanel = 'market'"
              >
                机器人市场
              </button>
              <button
                type="button"
                role="tab"
                :aria-selected="heroPanel === 'mine'"
                :class="[fx.heroTab, heroPanel === 'mine' ? fx.heroTabOn : fx.heroTabOff]"
                @click="heroPanel = 'mine'"
              >
                我的托管
              </button>
            </div>
          </div>

          <div
            v-if="heroPanel === 'market'"
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

    <!-- 上下 padding 与面板无关，避免切换主 Tab 时滚动条/视口宽度变化带动币种行「伸缩」 -->
    <div :class="fx.mainWrap">
      <!-- 币种 Tab：全宽 flex，不用 inline-flex 随内容宽窄变化 -->
      <div :class="fx.filterRailWrap">
        <p :class="fx.filterMobileLabel">资产</p>
        <div :class="fx.filterChipWrap" role="tablist" aria-label="托管币种">
          <button
            v-for="c in TAB_CURRENCIES"
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

      <template v-if="heroPanel === 'market'">
      <!-- 机器人分档表 -->
      <div :class="fx.tableWrapMarket">
        <table
          v-if="tierRows.length"
          :class="['w-full min-w-0 border-collapse text-left max-md:table-fixed md:min-w-[720px] md:table-auto', fx.tableBodyText]"
        >
          <thead class="hidden md:table-header-group">
            <tr :class="fx.tableHeadRow">
              <th class="px-4 py-2 font-semibold md:px-5 md:py-2.5">产品名称</th>
              <th class="hidden px-3 py-2 font-semibold md:table-cell md:px-5 md:py-2.5">周期</th>
              <th class="hidden px-3 py-2 font-semibold md:table-cell md:px-5 md:py-2.5">价格</th>
              <th class="hidden px-3 py-2 font-semibold md:table-cell md:px-5 md:py-2.5">日收益率</th>
              <th class="px-3 py-2 text-right font-semibold md:px-5 md:py-2.5">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in pgTier.pagedItems"
              :key="row.rowKey"
              class="border-b border-white/[0.06] transition hover:bg-white/[0.03] max-md:block max-md:last:border-b-0 md:table-row"
            >
              <td class="max-md:block max-md:w-full max-md:px-3 max-md:pb-1 max-md:pt-3 md:table-cell md:px-5 md:py-2.5">
                <div class="flex items-start gap-2.5 sm:gap-3">
                  <span
                    class="shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-bold tabular-nums sm:text-[10px]"
                    :class="vipBadgeClass(row.tierIndex)"
                  >
                    {{ row.vipLabel }}
                  </span>
                  <div class="flex min-w-0 flex-1 items-start gap-2">
                    <span
                      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.02] text-lime-300/90"
                    >
                      <FrontStrokeIcon name="cpu" size-class="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" />
                    </span>
                    <div class="min-w-0 flex-1">
                      <p class="text-[15px] font-semibold leading-snug text-white sm:text-base">
                        {{ displayCurrency(currencyTab) }} 机器人
                      </p>
                      <p class="mt-0.5 truncate text-[11px] text-white/40 sm:text-xs">
                        {{ row.product.name }} · {{ productStatusMeta[row.product.status]?.label }}
                      </p>
                      <div
                        class="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-white/[0.06] pt-3 text-[11px] text-white/50 max-md:grid-cols-2 md:hidden"
                      >
                        <span class="text-white/35">周期</span>
                        <span class="text-right tabular-nums text-white/70">{{ cycleLabel(row.product) }}</span>
                        <span class="text-white/35">区间</span>
                        <span class="text-right tabular-nums text-white/70">{{
                          formatAmountSpan(row.tier.minAmount, row.tier.maxAmount, 'USDT')
                        }}</span>
                        <span class="text-white/35">日收益</span>
                        <span class="text-right font-semibold tabular-nums text-lime-300/90">{{ row.tier.dailyRate }}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
              <td class="hidden whitespace-nowrap px-3 py-2.5 text-white/75 md:table-cell md:px-5">
                {{ cycleLabel(row.product) }}
              </td>
              <td class="hidden px-3 py-2.5 tabular-nums text-white/70 md:table-cell md:px-5">
                {{ formatAmountSpan(row.tier.minAmount, row.tier.maxAmount, 'USDT') }}
              </td>
              <td class="hidden px-3 py-2.5 font-semibold tabular-nums text-lime-300/95 md:table-cell md:px-5">
                {{ row.tier.dailyRate }}%
              </td>
              <td
                class="max-md:block max-md:w-full max-md:px-3 max-md:pb-3 max-md:pt-2 md:table-cell md:px-5 md:py-2.5 sm:px-3"
              >
                <button
                  v-if="productRentable(row.product)"
                  type="button"
                  :class="fx.btnPrimaryBlock"
                  @click="openRentDialog(row)"
                >
                  立即租用
                </button>
                <span v-else :class="fx.btnDisabledHint">
                  {{ productStatusMeta[row.product.status]?.label }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="px-3 py-12 text-center text-sm text-white/45 sm:py-14">当前币种暂无可用策略</p>
        <FrontClientPager
          v-if="heroPanel === 'market' && tierRows.length"
          :page="pgTier.page"
          :total-pages="pgTier.totalPages"
          :total="pgTier.total"
          :page-size="pgTier.pageSize"
          @prev="pgTier.goPrev"
          @next="pgTier.goNext"
        />
      </div>
      </template>

      <template v-else>
      <!-- 托管概览：放在正文区，避免 Hero 内 Tab + 大数字 + 三列挤在一起 -->
      <div class="mt-5 space-y-3 sm:mt-6 sm:space-y-4">
        <div :class="['sm:rounded-2xl sm:py-5', fx.statCard]">
          <p :class="[fx.statCardLabel, 'uppercase tracking-wide']">
            托管金额 · {{ displayCurrency(currencyTab) }}
          </p>
          <p class="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-white sm:text-3xl md:text-4xl">
            {{
              runningOrdersTab.length
                ? formatAmountForTab(custodyPrincipal, currencyTab)
                : '0'
            }}
          </p>
        </div>
        <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4">
          <div :class="fx.statCard">
            <p :class="fx.statCardLabel">预计日收益</p>
            <p class="mt-1 text-sm font-semibold tabular-nums text-lime-200/95 sm:text-base">
              {{
                runningOrdersTab.length
                  ? formatAmountForTab(expectedDailyTab, currencyTab)
                  : '0'
              }}
            </p>
          </div>
          <div :class="fx.statCard">
            <p :class="fx.statCardLabel">累计收益</p>
            <p class="mt-1 text-sm font-semibold tabular-nums text-lime-200/90 sm:text-base">
              {{ formatAmountForTab(accumulatedYieldTab, currencyTab) }}
            </p>
          </div>
          <div :class="['col-span-2 sm:col-span-1', fx.statCard]">
            <p :class="fx.statCardLabel">订单托管</p>
            <p class="mt-1 text-sm font-semibold tabular-nums text-white sm:text-base">
              {{ custodyOrderCount }}
            </p>
          </div>
        </div>

      </div>

      <!-- 记录：二级用底边线 Tab，与 Hero 胶囊主入口区分 -->
      <section class="mt-5 sm:mt-6">
        <div :class="fx.panelRecords">
          <div :class="fx.panelRecordsHeader">
            <p :class="fx.sectionKicker">记录明细</p>
            <div :class="fx.recordTablist4" role="tablist" aria-label="记录类型">
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
          <!-- 运行中 -->
          <table
            v-if="recordTab === 'running' && runningOrdersTab.length"
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
                v-for="o in pgRunning.pagedItems"
                :key="`mine-run-${o.id}`"
                class="border-b border-white/[0.06] transition hover:bg-white/[0.02] max-md:block max-md:last:border-0 md:table-row"
              >
                <td class="min-w-0 max-md:block max-md:w-full max-md:px-3 max-md:pb-0 max-md:pt-4 md:table-cell md:px-5 md:py-3">
                  <p class="text-[14px] font-medium leading-snug text-white sm:text-sm">{{ o.productName }}</p>
                  <p class="mt-0.5 tabular-nums text-[11px] text-white/55 sm:text-xs">
                    {{ o.principal }} {{ o.currency }}
                  </p>
                  <div v-if="canApplyEarlyRedeemAiOrder(o)" class="mt-3 md:hidden">
                    <button type="button" :class="fx.btnTableActionBlock" @click="openAiRedeemDialog(o)">
                      申请赎回
                    </button>
                  </div>
                  <div v-else class="mt-3 md:hidden">
                    <p :class="[fx.hintBlock, 'text-[11px]']">
                      不可提前赎回
                    </p>
                  </div>
                </td>
                <td class="hidden tabular-nums text-white/80 md:table-cell md:px-5 md:py-3">
                  {{ o.principal }} {{ o.currency }}
                </td>
                <td class="max-md:hidden md:table-cell md:px-5 md:py-3 md:text-left">
                  <button
                    v-if="canApplyEarlyRedeemAiOrder(o)"
                    type="button"
                    :class="fx.btnTableAction"
                    @click="openAiRedeemDialog(o)"
                  >
                    申请赎回
                  </button>
                  <span v-else class="text-xs text-white/35">不可提前赎回</span>
                </td>
              </tr>
            </tbody>
          </table>
          <p
            v-else-if="recordTab === 'running'"
            class="px-3 py-12 text-center text-sm text-white/40 sm:py-14"
          >
            当前币种暂无运行中托管
          </p>

          <!-- 购买 -->
          <table
            v-else-if="recordTab === 'buy' && buyOrders.length"
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
                v-for="o in pgBuy.pagedItems"
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
                  <div v-if="o.status === ORDER_STATUS.RUNNING" class="mt-3 md:hidden">
                    <button
                      v-if="canApplyEarlyRedeemAiOrder(o)"
                      type="button"
                      :class="fx.btnTableActionBlock"
                      @click="openAiRedeemDialog(o)"
                    >
                      申请赎回
                    </button>
                    <p v-else :class="[fx.hintBlock, 'text-[11px]']">
                      不可提前赎回
                    </p>
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

          <!-- 赎回 -->
          <table
            v-else-if="recordTab === 'redeem' && redeemOrders.length"
            :class="['w-full min-w-0 border-collapse text-left md:min-w-[640px] md:table-auto max-md:table-fixed', fx.tableBodyText]"
          >
            <thead class="hidden md:table-header-group">
              <tr :class="fx.tableHeadRow">
                <th class="px-3 py-2.5 md:px-5">产品名称</th>
                <th class="hidden px-3 py-2.5 md:table-cell md:px-5">赎回时间</th>
                <th class="hidden px-3 py-2.5 md:table-cell md:px-5">本金</th>
                <th class="px-3 py-2.5 text-right md:px-5">状态</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="o in pgRedeem.pagedItems"
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
                </td>
                <td class="hidden tabular-nums text-white/55 md:table-cell md:px-5 md:py-3">
                  {{ o.settledAt || '—' }}
                </td>
                <td class="hidden tabular-nums md:table-cell md:px-5 md:py-3">
                  {{ o.principal }} {{ o.currency }}
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

          <!-- 利息 / 调整 -->
          <table
            v-else-if="recordTab === 'interest' && interestRows.length"
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
                v-for="a in pgInterest.pagedItems"
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
          <FrontClientPager
            v-if="recordTab === 'running' && runningOrdersTab.length"
            :page="pgRunning.page"
            :total-pages="pgRunning.totalPages"
            :total="pgRunning.total"
            :page-size="pgRunning.pageSize"
            @prev="pgRunning.goPrev"
            @next="pgRunning.goNext"
          />
          <FrontClientPager
            v-else-if="recordTab === 'buy' && buyOrders.length"
            :page="pgBuy.page"
            :total-pages="pgBuy.totalPages"
            :total="pgBuy.total"
            :page-size="pgBuy.pageSize"
            @prev="pgBuy.goPrev"
            @next="pgBuy.goNext"
          />
          <FrontClientPager
            v-else-if="recordTab === 'redeem' && redeemOrders.length"
            :page="pgRedeem.page"
            :total-pages="pgRedeem.totalPages"
            :total="pgRedeem.total"
            :page-size="pgRedeem.pageSize"
            @prev="pgRedeem.goPrev"
            @next="pgRedeem.goNext"
          />
          <FrontClientPager
            v-else-if="recordTab === 'interest' && interestRows.length"
            :page="pgInterest.page"
            :total-pages="pgInterest.totalPages"
            :total="pgInterest.total"
            :page-size="pgInterest.pageSize"
            @prev="pgInterest.goPrev"
            @next="pgInterest.goNext"
          />
        </div>
      </section>
      </template>
    </div>

    <FrontPopupShell
      v-model="aiRedeemOpen"
      aria-labelledby="ai-quant-redeem-dialog-title"
      close-on-backdrop
      @backdrop-click="closeAiRedeemDialog"
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

    <FrontPopupShell
      v-model="rentOpen"
      aria-labelledby="ai-quant-rent-dialog-title"
      close-on-backdrop
      @backdrop-click="closeRentDialog"
    >
      <FrontPopupCard v-if="rentRow" variant="flow" flow-max="680" wide @click.stop>
        <FrontPopupCloseButton @click="closeRentDialog" />

        <div class="relative flex min-h-0 flex-1 flex-col overflow-hidden border-b border-white/10">
          <div class="shrink-0 px-4 pb-3 pt-5 pr-11 sm:px-5 sm:pr-12">
            <h2 id="ai-quant-rent-dialog-title" class="text-lg font-semibold text-white">产品详情</h2>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-1 sm:px-5 sm:pb-6">
            <dl class="space-y-0 divide-y divide-white/[0.06] text-sm">
              <div class="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                <dt class="shrink-0 text-white/45">机器人</dt>
                <dd class="text-right font-medium text-lime-200/95">
                  {{ displayAssetCurrency(rentRow.product.currency) }} 机器人
                </dd>
              </div>
              <div class="flex items-center justify-between gap-3 py-2.5">
                <dt class="shrink-0 text-white/45">金额</dt>
                <dd class="text-right tabular-nums text-white">
                  {{
                    formatTierAmountPlain(rentRow.tier.minAmount, rentRow.tier.maxAmount, 'USDT')
                  }}
                </dd>
              </div>
              <div class="flex items-center justify-between gap-3 py-2.5">
                <dt class="shrink-0 text-white/45">周期</dt>
                <dd class="text-right text-white">{{ cycleLabel(rentRow.product) }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3 py-2.5">
                <dt class="shrink-0 text-white/45">日收益率</dt>
                <dd class="text-right font-medium tabular-nums text-lime-300/95">{{ rentRow.tier.dailyRate }}%</dd>
              </div>
              <div class="flex items-center justify-between gap-3 py-2.5">
                <dt class="shrink-0 text-white/45">派息时间</dt>
                <dd class="text-right text-white">{{ distributionLabel(rentRow.product) }}</dd>
              </div>
              <div class="flex items-start justify-between gap-3 py-2.5">
                <dt class="shrink-0 pt-0.5 text-white/45">起息日</dt>
                <dd class="max-w-[16rem] text-right text-xs leading-snug text-white/90 sm:text-sm">
                  {{ formatValueDateUtc8() }}
                </dd>
              </div>
            </dl>

            <div class="mt-5 border-t border-white/[0.08] pt-5">
              <div class="flex flex-wrap items-baseline justify-between gap-2">
                <span class="text-sm font-medium text-white/80">购买金额</span>
                <span class="text-xs text-white/40">
                  可用余额:
                  {{
                    Number.isInteger(rentAvailable)
                      ? rentAvailable
                      : rentAvailable.toLocaleString(undefined, { maximumFractionDigits: 8 })
                  }}{{ displayAssetCurrency(rentRow.product.currency) }}
                </span>
              </div>
              <div class="mt-2 flex gap-2">
                <input
                  v-model="rentAmount"
                  type="text"
                  inputmode="decimal"
                  :placeholder="`请输入购买金额`"
                  :class="fx.inputFlex"
                />
                <button type="button" :class="fx.inputSideBtn" @click="fillRentAll">
                  全部
                </button>
              </div>
            </div>

            <p
              v-if="rentRow && !rentSubmitValid && parsedRentAmount > 0"
              class="mt-3 text-xs leading-relaxed text-amber-200/90"
            >
              请输入档位允许区间（{{ rentRow.tier.minAmount }} – {{ rentRow.tier.maxAmount }} USDT）内且不超过可用余额的金额。
            </p>
            <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" :class="fx.btnGhost" @click="closeRentDialog">
                关闭
              </button>
              <RouterLink
                v-if="rentSubmitValid"
                :to="{ path: `${prefix}/login`, query: { redirect: route.path } }"
                :class="['inline-flex items-center justify-center', fx.btnPrimary]"
                @click="closeRentDialog"
              >
                确定并去登录
              </RouterLink>
            </div>
          </div>
        </div>
      </FrontPopupCard>
    </FrontPopupShell>
  </div>
</template>
