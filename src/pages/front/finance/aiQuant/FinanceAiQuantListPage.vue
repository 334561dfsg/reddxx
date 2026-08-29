<script setup>
import { computed, onUnmounted, ref, watch, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import FrontTopNav from '../../../../components/FrontTopNav.vue'
import FrontPopupCard from '../../../../components/front/FrontPopupCard.vue'
import FrontPopupCloseButton from '../../../../components/front/FrontPopupCloseButton.vue'
import FrontPopupShell from '../../../../components/front/FrontPopupShell.vue'
import FrontStrokeIcon from '../../../../components/front/FrontStrokeIcon.vue'
import FrontClientPager from '../../../../components/front/FrontClientPager.vue'
import { useClientListPagination } from '../../../../composables/useClientListPagination'
import { FINANCE_FX as fx } from '../../../../constants/frontFinanceUi'
import { aiQuantProductsCatalog } from '../../../../admin/state/financeCatalogs'
import {
  PRODUCT_STATUS,
  productStatusMeta,
  SETTLEMENT_PERIOD,
  settlementPeriodMeta,
  formatAiQuantDurationLabel,
  sortAiQuantProducts
} from '../../../../admin/constants/aiQuant'
import FinanceAiQuantOrdersPanel from './FinanceAiQuantOrdersPanel.vue'

const prefix = '/front'
const route = useRoute()
const navMenuOpen = ref(false)

const LIST_PAGE_SIZE = 8

/** 列表页资产 Tab（与产品配置币种对齐） */
const TAB_CURRENCIES = ['USDC', 'BTC', 'ETH', 'DOGE', 'XRP', 'SOL', 'BNB', 'TRX']

const products = aiQuantProductsCatalog

const currencyTab = ref('USDC')

/** Hero 主入口：机器人市场 / 我的托管（与借贷、流动性列表一致） */
const heroPanel = ref(route.query.tab === 'orders' ? 'mine' : 'market')

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

const pgTier = useClientListPagination(tierRows, { pageSize: LIST_PAGE_SIZE })

watch(currencyTab, () => {
  pgTier.resetPage()
})

watch(
  () => route.query.tab,
  (tab) => {
    if (tab === 'orders') heroPanel.value = 'mine'
    if (tab === 'products') heroPanel.value = 'market'
  }
)

watch(heroPanel, (panel) => {
  if (panel === 'market') pgTier.resetPage()
})

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

watchEffect(() => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = rentOpen.value ? 'hidden' : ''
})

onUnmounted(() => {
  if (clearRentTimer != null) clearTimeout(clearRentTimer)
  if (typeof document !== 'undefined') document.body.style.overflow = ''
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onRentEscape)
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

function openNavigationMenu() {
  navMenuOpen.value = true
}
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
          aria-label="AI 量化移动端标题栏"
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
          <h1 class="text-base font-semibold text-white">AI 量化</h1>
          <RouterLink
            :to="`${prefix}/finance/ai-quant/orders`"
            class="absolute right-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-lime-400/45 bg-lime-400/10 px-3 text-sm font-semibold text-lime-200 transition hover:bg-lime-400/15 focus:outline-none focus:ring-2 focus:ring-lime-300/60 sm:right-8 lg:hidden"
            aria-label="查看 AI 量化订单"
          >
            订单
          </RouterLink>
        </div>

        <nav :class="[fx.breadcrumbNav, 'hidden lg:block']">
          <RouterLink :to="`${prefix}/finance`" class="transition hover:text-lime-300">金融</RouterLink>
          <span class="mx-1.5 text-white/20 sm:mx-2">/</span>
          <span class="text-white/70">AI 量化</span>
        </nav>

        <!-- Hero：仅一级入口 + 标题；「购买/赎回/利息」在正文区，避免与市场 Tab 视觉同级 -->
        <div class="mt-0 flex flex-col gap-4 sm:gap-5 lg:mt-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div class="min-w-0 flex-1 space-y-3 sm:space-y-4 lg:space-y-6">
            <div>
              <p class="inline-flex items-center gap-2 rounded-full border border-lime-400/25 bg-lime-400/[0.08] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-lime-200/95 sm:px-3 sm:py-1 sm:text-[11px] sm:tracking-[0.3em]">
                Quant · 策略托管
              </p>
              <h1 class="mt-1 text-[28px] font-bold leading-tight tracking-tight text-white sm:mt-2 sm:text-3xl md:text-4xl lg:mt-3 lg:text-[3.25rem] lg:leading-tight">
                AI 量化交易
              </h1>
            </div>
            <div :class="[fx.heroSegmentWrap, 'hidden lg:inline-flex']" role="tablist" aria-label="页面主入口">
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

    <div :class="fx.mainWrap">
      <template v-if="heroPanel === 'market'">
      <div :class="fx.filterRailWrap">
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
        <FinanceAiQuantOrdersPanel />
      </template>
    </div>

    <FrontPopupShell
      v-model="rentOpen"
      aria-labelledby="ai-quant-rent-dialog-title"
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
