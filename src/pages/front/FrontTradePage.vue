<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import {
  TRADE_ASSET_CLASS_KEYS,
  TRADE_ASSET_CLASS_META,
  TRADE_PRODUCT_MODE_KEYS,
  TRADE_PRODUCT_MODE_META
} from '../../constants/frontNav'
import { PAIRS_BY_CLASS } from '../../constants/frontTradePairs'
import { VERIFICATION_LEVEL } from '../../constants/verification'
import VerificationRequiredDialog from '../../components/verification/VerificationRequiredDialog.vue'
import { FRONT_DEPOSIT_DEFAULT_SYMBOL_LOWER } from '../../constants/frontAssetCenterDemo'
import {
  frontSheetBackdropPaintOnly,
  frontSheetCancelBtnClass,
  frontSheetDragHandleClass,
  frontSheetListItemBorderClass,
  frontSheetListRowBtnClass,
  frontSheetPanelShellClass
} from '../../constants/frontBottomSheet'
import { useRequireFrontAuth } from '../../composables/useRequireFrontAuth'
import { useFrontAuthStore } from '../../stores/frontAuth'

const route = useRoute()
const router = useRouter()
const { requireAuth } = useRequireFrontAuth()
const frontAuth = useFrontAuthStore()
const { accountMode, accountModeLabel } = storeToRefs(frontAuth)
const showDemoAccountBadge = computed(() => accountMode.value === 'demo')

const prefix = computed(() => {
  const p = route.path
  const i = p.indexOf('/trade')
  return i > 0 ? p.slice(0, i) : '/front'
})

const depositDetailPath = computed(
  () => `${prefix.value}/personal-center/assets/deposit/${FRONT_DEPOSIT_DEFAULT_SYMBOL_LOWER}`
)
const transferPath = computed(() => `${prefix.value}/personal-center/assets/transfer`)
const convertPath = computed(() => `${prefix.value}/personal-center/assets/convert`)

const tradeAssetClass = computed(() => {
  const a = route.params.assetClass
  return TRADE_ASSET_CLASS_KEYS.includes(a) ? a : 'crypto'
})

const tradeMode = computed(() => {
  const m = route.params.tradeMode
  return TRADE_PRODUCT_MODE_KEYS.includes(m) ? m : 'perpetual'
})

/** 下拉/抽屉内切换品种、现货·永续·交割时仅改草稿，不立刻改路由；选具体交易对后再 push，主界面行情才联动 */
const pickerDraftAssetClass = ref('crypto')
const pickerDraftTradeMode = ref('perpetual')
const pickerDraftPairs = computed(
  () => PAIRS_BY_CLASS[pickerDraftAssetClass.value] || PAIRS_BY_CLASS.crypto
)

const isApplyingPairSelection = ref(false)

watch(
  () => [route.params.assetClass, route.params.tradeMode],
  () => {
    pickerDraftAssetClass.value = tradeAssetClass.value
    pickerDraftTradeMode.value = tradeMode.value
  },
  { immediate: true }
)

const tradeAssetClassLabel = computed(
  () => TRADE_ASSET_CLASS_META[tradeAssetClass.value]?.label ?? '加密货币'
)

const tradeTabs = computed(() =>
  TRADE_PRODUCT_MODE_KEYS.map((pm) => ({
    key: pm,
    label: TRADE_PRODUCT_MODE_META[pm].label
  }))
)

const assetClassTabItems = computed(() =>
  TRADE_ASSET_CLASS_KEYS.map((k) => ({
    key: k,
    label: TRADE_ASSET_CLASS_META[k].label
  }))
)

const modeMenuLabel = computed(
  () => TRADE_PRODUCT_MODE_META[tradeMode.value]?.label ?? TRADE_PRODUCT_MODE_META.perpetual.label
)

const isContract = computed(() => tradeMode.value === 'perpetual' || tradeMode.value === 'delivery')

const PAIR_MARKET_TABLE = {
  'BTC-USDT': [98420.5, 1.24],
  'ETH-USDT': [2050.43, -0.358],
  'SOL-USDT': [188.35, 2.91],
  'BNB-USDT': [712.8, 0.62],
  'XRP-USDT': [2.084, 1.05],
  'DOGE-USDT': [0.3842, -0.91],
  'ADA-USDT': [0.872, 0.44],
  'AVAX-USDT': [39.55, -0.27],
  'DOT-USDT': [7.82, 0.18],
  'MATIC-USDT': [0.5234, -1.12],
  'LINK-USDT': [24.16, 0.73],
  'UNI-USDT': [13.05, -0.45],
  'ATOM-USDT': [9.94, 0.29],
  'LTC-USDT': [108.3, 0.51],
  'ETC-USDT': [28.4, -0.62],
  'FIL-USDT': [8.12, 1.88],
  'APT-USDT': [9.65, -0.34],
  'ARB-USDT': [0.721, 0.92],
  'OP-USDT': [2.08, -0.71],
  'SUI-USDT': [3.42, 2.15],
  'INJ-USDT': [24.88, 0.38],
  'TIA-USDT': [4.95, -1.05],
  'SEI-USDT': [0.412, 0.67],
  'WLD-USDT': [1.856, -0.89],
  'PEPE-USDT': [0.00001234, 3.2],
  'SHIB-USDT': [0.00002418, -0.55],
  'EUR-USD': [1.0856, 0.042],
  'GBP-USD': [1.265, -0.08],
  'USD-JPY': [149.82, 0.15],
  'AUD-USD': [0.6234, -0.08],
  'USD-CNH': [7.2486, 0.04],
  'XAU-USD': [2658.2, 0.45],
  'XAG-USD': [31.42, -0.72],
  'XPT-USD': [985.3, 0.19],
  'XPD-USD': [1042, -1.21]
}

const pairs = computed(() => PAIRS_BY_CLASS[tradeAssetClass.value] || PAIRS_BY_CLASS.crypto)

const activePairIdx = ref(0)
const pcPairPickerOpen = ref(false)
const pcPairSearch = ref('')
const pcPairPickerRoot = ref(null)

watch(tradeAssetClass, () => {
  if (isApplyingPairSelection.value) return
  activePairIdx.value = 0
  pcPairPickerOpen.value = false
  pcPairSearch.value = ''
})

watch(pairs, (list) => {
  if (activePairIdx.value >= list.length) activePairIdx.value = 0
})

/** 顶栏搜索等：?pair=BASE-QUOTE（如 BTC-USDT）落地到当前品种下的交易对 */
function syncPairFromRouteQuery() {
  const raw = route.query.pair
  if (raw == null || raw === '') return
  const normalized = String(raw)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '-')
  const list = pairs.value
  const idx = list.findIndex((p) => `${p.base}-${p.quote}` === normalized)
  if (idx >= 0) activePairIdx.value = idx
}

watch(
  () => [String(route.query.pair ?? ''), tradeAssetClass.value],
  () => {
    nextTick(() => syncPairFromRouteQuery())
  },
  { immediate: true }
)

const activePair = computed(() => {
  const list = pairs.value
  const i = Math.min(activePairIdx.value, list.length - 1)
  return list[i]
})

const symbol = computed(() => `${activePair.value.base} / ${activePair.value.quote}`)

const midNumeric = ref(2050.43)
const changePct = ref(-0.358)

function syncPairMarket() {
  const p = activePair.value
  const key = `${p.base}-${p.quote}`
  const row = PAIR_MARKET_TABLE[key] || [100, 0]
  midNumeric.value = row[0]
  changePct.value = row[1]
}

watch([activePairIdx, tradeAssetClass], syncPairMarket, { immediate: true })

function marketRowDecimals(mid) {
  if (mid >= 10_000) return 2
  if (mid >= 100) return 2
  if (mid >= 1) return mid >= 10 ? 4 : 5
  if (mid >= 0.01) return 5
  if (mid >= 0.0001) return 6
  return 8
}

const decimals = computed(() => marketRowDecimals(midNumeric.value))

function fmtPriceNum(price, dec) {
  return price.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

const takeProfitPrice = ref('')
const stopLossPrice = ref('')

function priceTickSize() {
  const m = midNumeric.value
  if (m >= 10_000) return 1
  if (m >= 1000) return 0.1
  if (m >= 100) return 0.01
  return 0.0001
}

function parsePriceInputStr(s) {
  const n = parseFloat(String(s).replace(/,/g, ''))
  return Number.isNaN(n) ? null : n
}

function bumpTakeProfit(delta) {
  const step = priceTickSize()
  const cur = parsePriceInputStr(takeProfitPrice.value)
  const base = cur === null ? midNumeric.value : cur
  const next = Math.max(0, base + delta * step)
  takeProfitPrice.value = fmtPriceNum(next, decimals.value)
}

function bumpStopLoss(delta) {
  const step = priceTickSize()
  const cur = parsePriceInputStr(stopLossPrice.value)
  const base = cur === null ? midNumeric.value : cur
  const next = Math.max(0, base + delta * step)
  stopLossPrice.value = fmtPriceNum(next, decimals.value)
}

const depthAsks = computed(() => {
  const mid = midNumeric.value
  const tick =
    mid >= 10_000 ? mid * 0.00002 : mid >= 1_000 ? mid * 0.00005 : mid >= 100 ? 0.08 : 0.02
  const steps = [0.8, 2.4, 5.1, 8.2, 13.4].map((x) => x * tick)
  const sizes = [0.32, 0.58, 1.12, 0.44, 0.91]
  const maxQ = Math.max(...sizes)
  const dec = decimals.value
  return steps.map((s, i) => {
    const pNum = mid + s
    const qNum = sizes[i]
    const tNum = pNum * qNum
    return {
      p: fmtPriceNum(pNum, dec),
      q: qNum.toFixed(2),
      t: tNum.toLocaleString('en-US', { maximumFractionDigits: 2 }),
      bar: Math.round((qNum / maxQ) * 100)
    }
  })
})

const depthBids = computed(() => {
  const mid = midNumeric.value
  const tick =
    mid >= 10_000 ? mid * 0.00002 : mid >= 1_000 ? mid * 0.00005 : mid >= 100 ? 0.08 : 0.02
  const steps = [0.6, 1.4, 2.2, 2.8, 3.4].map((x) => x * tick)
  const sizes = [1.5, 1.44, 0.88, 2.03, 0.64]
  const maxQ = Math.max(...sizes)
  const dec = decimals.value
  return steps.map((s, i) => {
    const pNum = mid - s
    const qNum = sizes[i]
    const tNum = pNum * qNum
    return {
      p: fmtPriceNum(pNum, dec),
      q: qNum.toFixed(2),
      t: tNum.toLocaleString('en-US', { maximumFractionDigits: 2 }),
      bar: Math.round((qNum / maxQ) * 100)
    }
  })
})

/** K 线盘口：卖单从高价到低价向下展示 */
const depthAsksReversed = computed(() => [...depthAsks.value].reverse())

const lastPrice = computed(() => fmtPriceNum(midNumeric.value, decimals.value))

const stats24h = computed(() => {
  const m = midNumeric.value
  const dec = decimals.value
  const ac = tradeAssetClass.value
  if (ac === 'forex') {
    return {
      high: fmtPriceNum(m * 1.0022, dec),
      low: fmtPriceNum(m * 0.9978, dec),
      volBase: '128.4K lots',
      turnover: '—',
      tradeAmtShort: '—'
    }
  }
  if (ac === 'metal') {
    return {
      high: fmtPriceNum(m * 1.006, 2),
      low: fmtPriceNum(m * 0.994, 2),
      volBase: `${(8.2 + m / 400).toFixed(1)}K oz`,
      turnover: '—',
      tradeAmtShort: '—'
    }
  }
  if (m > 50_000) {
    return {
      high: '99,120.50',
      low: '97,880.00',
      volBase: '482.31 BTC',
      turnover: '47.28M USDT',
      tradeAmtShort: '12.41M'
    }
  }
  if (m > 500) {
    return {
      high: '2,081.76',
      low: '2,041.65',
      volBase: '90.85K ETH',
      turnover: '186.21M USDT',
      tradeAmtShort: '90.91K'
    }
  }
  return {
    high: '198.20',
    low: '182.10',
    volBase: '4.2M SOL',
    turnover: '782.5M USDT',
    tradeAmtShort: '1.28M'
  }
})

const marketMiniRows = computed(() =>
  pairs.value.map((p, idx) => {
    const key = `${p.base}-${p.quote}`
    const [mid, pct] = PAIR_MARKET_TABLE[key] || [100, 0]
    const dec = marketRowDecimals(mid)
    return {
      idx,
      label: `${p.base} / ${p.quote}`,
      price: fmtPriceNum(mid, dec),
      pct,
      vol: '—'
    }
  })
)

/** PC：自定义交易对选择（搜索 + 演示价 / 涨跌幅） */
const pcPairPickerRows = computed(() => {
  const q = pcPairSearch.value.trim().toLowerCase()
  const list = pickerDraftPairs.value
  const rows = []
  for (let i = 0; i < list.length; i++) {
    const p = list[i]
    const hay = `${p.base} ${p.quote} ${p.base}/${p.quote}`.toLowerCase()
    if (q && !hay.includes(q)) continue
    const key = `${p.base}-${p.quote}`
    const [mid, pct] = PAIR_MARKET_TABLE[key] || [100, 0]
    const dec = marketRowDecimals(mid)
    rows.push({
      i,
      p,
      price: fmtPriceNum(mid, dec),
      pct
    })
  }
  return rows
})

function isPcPickerRowSelected(row) {
  if (
    pickerDraftAssetClass.value !== tradeAssetClass.value ||
    pickerDraftTradeMode.value !== tradeMode.value
  ) {
    return false
  }
  return row.i === activePairIdx.value
}

function togglePcPairPicker() {
  pcPairPickerOpen.value = !pcPairPickerOpen.value
  if (pcPairPickerOpen.value) {
    pcLeveragePickerOpen.value = false
    pcPairSearch.value = ''
    nextTick(() => {
      document.getElementById('pc-trade-pair-search')?.focus()
    })
  }
}

async function selectPcPair(idx) {
  isApplyingPairSelection.value = true
  try {
    const path = `${prefix.value}/trade/${pickerDraftAssetClass.value}/${pickerDraftTradeMode.value}`
    if (!pathsMatch(route.path, path)) {
      await router.push(path)
    }
    activePairIdx.value = idx
  } finally {
    await nextTick()
    isApplyingPairSelection.value = false
  }
  pcPairPickerOpen.value = false
  pcPairSearch.value = ''
}

function onDocPointerDownPcPair(e) {
  if (pcPairPickerOpen.value) {
    const root = pcPairPickerRoot.value
    if (root && !root.contains(e.target)) {
      pcPairPickerOpen.value = false
    }
  }
  if (pcLeveragePickerOpen.value) {
    const root = pcLeveragePickerRoot.value
    if (root && !root.contains(e.target)) {
      pcLeveragePickerOpen.value = false
    }
  }
}

function togglePcLeveragePicker() {
  pcLeveragePickerOpen.value = !pcLeveragePickerOpen.value
  if (pcLeveragePickerOpen.value) {
    pcPairPickerOpen.value = false
  }
}

function selectPcLeverage(value) {
  leverage.value = String(value)
  pcLeveragePickerOpen.value = false
}

const pairDrawerOpen = ref(false)
const modeSheetOpen = ref(false)
const chartExpanded = ref(false)

const positionSide = ref('long')
const orderType = ref('limit')
const leverage = ref('20')
/** PC / 移动端共用的永续杠杆档位 */
const perpetualLeverageOptions = [
  { value: '1', label: '1×' },
  { value: '5', label: '5×' },
  { value: '10', label: '10×' },
  { value: '20', label: '20×' }
]
const pcLeveragePickerOpen = ref(false)
const pcLeveragePickerRoot = ref(null)

const pcLeverageLabel = computed(() => {
  const hit = perpetualLeverageOptions.find((o) => o.value === leverage.value)
  return hit?.label ?? `${leverage.value}×`
})
const tpSl = ref(false)
const quantity = ref('')
const qtyQuote = ref('')

watch(tpSl, (on) => {
  if (!on) {
    takeProfitPrice.value = ''
    stopLossPrice.value = ''
  }
})

const deliveryPeriods = ['30s - 7%', '1m - 5%', '5m - 12%', '15m - 18%']
const selectedDeliveryPeriod = ref(deliveryPeriods[0])

const chartTimeframes = ['1分', '5分', '15分', '30分', '1小时', '1日', '1周', '1月']
const chartTimeframe = ref('1分')
/** K 线展开区域：市场盘口 / 最新成交（非个人委托） */
const chartMarketTab = ref('depth')
const tradeBottomTab = ref('orders')
const orderBookTab = ref('book')
const obSideMode = ref('both')

const orderBookSideSegments = [
  { id: 'both', label: '买卖' },
  { id: 'sell', label: '卖盘' },
  { id: 'buy', label: '买盘' }
]
const pcBottomTab = ref('positions')
const clockStr = ref('')

/** 移动端限价委托价格（演示） */
const orderPrice = ref('')

let clockTimer = null

watch(
  () => route.fullPath,
  () => {
    chartExpanded.value = false
    chartMarketTab.value = 'depth'
    orderPrice.value = ''
    pcLeveragePickerOpen.value = false
    pcPairPickerOpen.value = false
    pcPairSearch.value = ''
  },
  { immediate: true }
)

/** K 线全屏浏览时仅保留方向入口，回到双列下单区填数量 */
function leaveChartToOrder(side) {
  positionSide.value = side
  chartExpanded.value = false
  nextTick(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById('mobile-order-anchor')
        if (!el) return
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })
  })
}

const pcBottomTabs = computed(() => {
  if (tradeMode.value === 'delivery') {
    return [
      { key: 'delivery-orders', label: '交割订单' },
      { key: 'hist', label: '历史订单' }
    ]
  }
  if (tradeMode.value === 'perpetual') {
    return [
      { key: 'positions', label: '当前持仓' },
      { key: 'open-orders', label: '当前委托' },
      { key: 'hist-orders', label: '历史委托' },
      { key: 'hist-trades', label: '历史成交' }
    ]
  }
  return [
    { key: 'open-orders', label: '当前委托' },
    { key: 'hist-orders', label: '历史委托' },
    { key: 'hist-trades', label: '历史成交' }
  ]
})

watch(
  [() => tradeMode.value, () => tradeAssetClass.value],
  () => {
    pcBottomTab.value = pcBottomTabs.value[0].key
    if (tradeMode.value === 'spot') positionSide.value = 'long'
  },
  { immediate: true }
)

function openPairDrawer() {
  closeMobilePicker()
  pairDrawerOpen.value = true
}

function closePairDrawer() {
  pairDrawerOpen.value = false
}

function openModeSheet() {
  closeMobilePicker()
  modeSheetOpen.value = true
}

function closeModeSheet() {
  modeSheetOpen.value = false
}

async function selectPair(i) {
  isApplyingPairSelection.value = true
  try {
    const path = `${prefix.value}/trade/${pickerDraftAssetClass.value}/${pickerDraftTradeMode.value}`
    if (!pathsMatch(route.path, path)) {
      await router.push(path)
    }
    activePairIdx.value = i
  } finally {
    await nextTick()
    isApplyingPairSelection.value = false
  }
  closePairDrawer()
}

function isMobileDrawerPairSelected(i) {
  if (
    pickerDraftAssetClass.value !== tradeAssetClass.value ||
    pickerDraftTradeMode.value !== tradeMode.value
  ) {
    return false
  }
  return i === activePairIdx.value
}

/** 抽屉内左侧角标（与主导航图标格统一尺度） */
function pairListBadge(base) {
  const b = String(base || '')
  return b.length <= 4 ? b : `${b.slice(0, 3)}…`
}

async function goMode(modeKey) {
  if (!TRADE_PRODUCT_MODE_KEYS.includes(modeKey)) return
  const path = `${prefix.value}/trade/${tradeAssetClass.value}/${modeKey}`
  if (!pathsMatch(route.path, path)) {
    await router.push(path)
  }
  closeModeSheet()
}

/** 移动端：用底部抽屉代替原生 select */
const mobilePickerOpen = ref(false)
const mobilePickerTitle = ref('')
const mobilePickerKind = ref('')
const mobilePickerOptionList = ref([])

function mobilePickerCurrentValue() {
  const k = mobilePickerKind.value
  if (k === 'chartTf') return chartTimeframe.value
  if (k === 'orderType') return orderType.value
  if (k === 'leverage') return leverage.value
  if (k === 'delivery') return selectedDeliveryPeriod.value
  return ''
}

function isMobilePickerOptionSelected(value) {
  return String(mobilePickerCurrentValue()) === String(value)
}

function openMobilePicker(kind) {
  mobilePickerKind.value = kind
  if (kind === 'chartTf') {
    mobilePickerTitle.value = 'K 线周期'
    mobilePickerOptionList.value = chartTimeframes.slice(0, 4).map((tf) => ({
      value: tf,
      label: tf
    }))
  } else if (kind === 'orderType') {
    mobilePickerTitle.value = '委托类型'
    mobilePickerOptionList.value = [
      { value: 'market', label: '市价' },
      { value: 'limit', label: '限价' }
    ]
  } else if (kind === 'leverage') {
    mobilePickerTitle.value = '杠杆'
    mobilePickerOptionList.value = perpetualLeverageOptions
  } else if (kind === 'delivery') {
    mobilePickerTitle.value = '交割周期'
    mobilePickerOptionList.value = deliveryPeriods.map((p) => ({
      value: p,
      label: p
    }))
  } else {
    mobilePickerOptionList.value = []
  }
  mobilePickerOpen.value = true
}

function closeMobilePicker() {
  mobilePickerOpen.value = false
}

function confirmMobilePick(value) {
  const k = mobilePickerKind.value
  if (k === 'chartTf') chartTimeframe.value = value
  else if (k === 'orderType') orderType.value = value
  else if (k === 'leverage') leverage.value = String(value)
  else if (k === 'delivery') selectedDeliveryPeriod.value = value
  closeMobilePicker()
}

function setQtyPct(pct) {
  quantity.value = String(pct)
}

function normPath(p) {
  return (p || '').replace(/\/+$/, '') || '/'
}

function pathsMatch(a, b) {
  return normPath(a) === normPath(b)
}

/** PC 顶栏右侧：切换现货/永续/交割立即改路由，主界面联动；下拉内换品种仍只改草稿 */
async function applyPcTradeModeTab(modeKey) {
  if (!TRADE_PRODUCT_MODE_KEYS.includes(modeKey)) return
  const path = `${prefix.value}/trade/${tradeAssetClass.value}/${modeKey}`
  if (pathsMatch(route.path, path)) return
  await router.push(path)
}

function changeClass(pct) {
  if (pct > 0) return 'text-[#00b464]'
  if (pct < 0) return 'text-[#ff3b30]'
  return 'text-white/50'
}

const primaryCtaLabel = computed(() => {
  if (!isContract.value) {
    return positionSide.value === 'long' ? `买入 ${activePair.value.base}` : `卖出 ${activePair.value.base}`
  }
  return positionSide.value === 'long' ? '做多买入' : '做空买入'
})

/** 移动端「当前委托 / 历史订单」演示数据 */
const mobileDemoOpenOrders = computed(() => {
  const base = activePair.value.base
  const sym = `${base}/${activePair.value.quote}`
  const px = lastPrice.value
  const contract = isContract.value
  const unit = contract ? '张' : base
  const modeTag =
    tradeMode.value === 'delivery' ? '交割' : contract ? '永续' : '现货'
  const amt1 =
    contract ? '12' : base === 'BTC' ? '0.008' : base === 'SOL' ? '2.40' : '0.24'
  const amt2 =
    contract ? '3' : base === 'BTC' ? '0.015' : base === 'SOL' ? '1.20' : '0.10'
  return [
    {
      id: 'doo-1',
      pair: sym,
      modeTag,
      sideLong: true,
      sideLabel: contract ? '开多' : '买入',
      type: '限价',
      price: px,
      amount: `${amt1} ${unit}`,
      filled: '0%',
      time: '14:32:18'
    },
    {
      id: 'doo-2',
      pair: sym,
      modeTag,
      sideLong: false,
      sideLabel: contract ? '开空' : '卖出',
      type: '市价',
      price: '—',
      amount: `${amt2} ${unit}`,
      filled: '0%',
      time: '14:28:05'
    }
  ]
})

const mobileDemoHistOrders = computed(() => {
  const base = activePair.value.base
  const contract = isContract.value
  const unit = contract ? '张' : base
  const px = lastPrice.value
  const a1 =
    contract ? '8' : base === 'BTC' ? '0.020' : base === 'SOL' ? '3.50' : '0.35'
  const a2 =
    contract ? '4' : base === 'BTC' ? '0.010' : base === 'SOL' ? '0.90' : '0.80'
  const a3 = contract ? '2' : '0.08'
  return [
    {
      id: 'dho-1',
      sideLong: true,
      sideLabel: contract ? '平空' : '买入',
      type: '限价',
      price: px,
      amount: `${a1} ${unit}`,
      status: '完全成交',
      time: '04-03 09:12'
    },
    {
      id: 'dho-2',
      sideLong: false,
      sideLabel: contract ? '平多' : '卖出',
      type: '市价',
      price: '市价',
      amount: `${a2} ${unit}`,
      status: '完全成交',
      time: '04-02 22:40'
    },
    {
      id: 'dho-3',
      sideLong: true,
      sideLabel: contract ? '开多' : '买入',
      type: '限价',
      price: px,
      amount: `${a3} ${unit}`,
      status: '已撤销',
      time: '04-01 16:08'
    }
  ]
})

/** PC 表格用：在移动端演示数据基础上多加几行，便于出现滚动条 */
const pcDemoOpenOrdersTable = computed(() => {
  const contract = isContract.value
  const unit = contract ? '张' : activePair.value.base
  const modeTag =
    tradeMode.value === 'delivery' ? '交割' : contract ? '永续' : '现货'
  const px = lastPrice.value
  const sym = `${activePair.value.base}/${activePair.value.quote}`
  return [
    ...mobileDemoOpenOrders.value,
    {
      id: 'pc-oo-3',
      pair: 'ETH/USDT',
      modeTag,
      sideLong: true,
      sideLabel: contract ? '开多' : '买入',
      type: '限价',
      price: '2,050.43',
      amount: contract ? '6 张' : '1.20 ETH',
      filled: '35%',
      time: '14:20:11'
    },
    {
      id: 'pc-oo-4',
      pair: 'SOL/USDT',
      modeTag,
      sideLong: false,
      sideLabel: contract ? '开空' : '卖出',
      type: '限价',
      price: '145.20',
      amount: contract ? '10 张' : '12 SOL',
      filled: '0%',
      time: '14:15:02'
    },
    {
      id: 'pc-oo-5',
      pair: 'BNB/USDT',
      modeTag,
      sideLong: true,
      sideLabel: contract ? '开多' : '买入',
      type: '市价',
      price: '—',
      amount: contract ? '2 张' : '3 BNB',
      filled: '0%',
      time: '14:08:44'
    },
    {
      id: 'pc-oo-6',
      pair: sym,
      modeTag,
      sideLong: false,
      sideLabel: contract ? '开空' : '卖出',
      type: '限价',
      price: px,
      amount: contract ? '1 张' : `0.02 ${activePair.value.base}`,
      filled: '0%',
      time: '13:59:30'
    }
  ]
})

const pcDemoHistOrdersTable = computed(() => {
  const contract = isContract.value
  const unit = contract ? '张' : activePair.value.base
  const px = lastPrice.value
  return [
    ...mobileDemoHistOrders.value,
    {
      id: 'dho-4',
      sideLong: false,
      sideLabel: contract ? '平仓' : '卖出',
      type: '限价',
      price: px,
      amount: contract ? '1 张' : `0.05 ${unit}`,
      status: '部分成交',
      time: '03-30 11:22'
    },
    {
      id: 'dho-5',
      sideLong: true,
      sideLabel: contract ? '开多' : '买入',
      type: '市价',
      price: '市价',
      amount: contract ? '8 张' : '2.5 SOL',
      status: '完全成交',
      time: '03-28 08:01'
    },
    {
      id: 'dho-6',
      sideLong: false,
      sideLabel: contract ? '开空' : '卖出',
      type: '限价',
      price: px,
      amount: contract ? '4 张' : '0.12 ETH',
      status: '已撤销',
      time: '03-25 19:45'
    }
  ]
})

/** PC 左下角：当前持仓 / 委托 / 成交（演示） */
const pcDemoPerpPositions = computed(() => {
  const base = activePair.value.base
  const quote = activePair.value.quote
  const sym = `${base}/${quote}`
  const px = lastPrice.value
  return [
    {
      id: 'pc-pos-1',
      pair: sym,
      sideLong: true,
      leverage: '20×',
      size: '12',
      entry: px,
      mark: px,
      uPnl: '+182.50',
      uPnlQuote: 'USDT',
      roe: '+3.02%'
    },
    {
      id: 'pc-pos-2',
      pair: base === 'BTC' ? 'ETH/USDT' : 'BTC/USDT',
      sideLong: false,
      leverage: '10×',
      size: '42',
      entry: base === 'BTC' ? '2,048.20' : '97,880.00',
      mark: base === 'BTC' ? '2,050.43' : '98,120.50',
      uPnl: '-94.10',
      uPnlQuote: 'USDT',
      roe: '-1.10%'
    },
    {
      id: 'pc-pos-3',
      pair: 'SOL/USDT',
      sideLong: true,
      leverage: '5×',
      size: '120',
      entry: '142.80',
      mark: '145.10',
      uPnl: '+276.00',
      uPnlQuote: 'USDT',
      roe: '+1.62%'
    },
    {
      id: 'pc-pos-4',
      pair: 'BNB/USDT',
      sideLong: false,
      leverage: '15×',
      size: '8',
      entry: '612.40',
      mark: '608.20',
      uPnl: '+33.60',
      uPnlQuote: 'USDT',
      roe: '+0.68%'
    },
    {
      id: 'pc-pos-5',
      pair: 'XRP/USDT',
      sideLong: true,
      leverage: '8×',
      size: '2,000',
      entry: '0.5288',
      mark: '0.5310',
      uPnl: '+44.00',
      uPnlQuote: 'USDT',
      roe: '+0.42%'
    },
    {
      id: 'pc-pos-6',
      pair: 'DOGE/USDT',
      sideLong: false,
      leverage: '12×',
      size: '50,000',
      entry: '0.1622',
      mark: '0.1610',
      uPnl: '-60.00',
      uPnlQuote: 'USDT',
      roe: '-0.74%'
    }
  ]
})

const pcDemoHistTrades = computed(() => {
  const base = activePair.value.base
  const quote = activePair.value.quote
  const sym = `${base}/${quote}`
  const px = lastPrice.value
  const perp = tradeMode.value === 'perpetual'
  const qtyUnit = perp ? '张' : base
  const q1 = perp ? '2' : base === 'BTC' ? '0.008' : '0.24'
  const q2 = perp ? '5' : base === 'BTC' ? '0.015' : '0.10'
  const q3 = perp ? '10' : base === 'BTC' ? '0.004' : '1.20'
  return [
    {
      id: 'pc-ht-1',
      time: '14:32:01',
      pair: sym,
      sideLong: true,
      price: px,
      qty: `${q1} ${qtyUnit}`,
      fee: '0.0420 USDT',
      role: '吃单'
    },
    {
      id: 'pc-ht-2',
      time: '14:28:56',
      pair: sym,
      sideLong: false,
      price: px,
      qty: `${q2} ${qtyUnit}`,
      fee: '0.1050 USDT',
      role: '吃单'
    },
    {
      id: 'pc-ht-3',
      time: '13:10:22',
      pair: base === 'BTC' ? 'ETH/USDT' : 'BTC/USDT',
      sideLong: true,
      price: base === 'BTC' ? '2,048.00' : '97,900.00',
      qty: `${q3} ${qtyUnit}`,
      fee: '0.2100 USDT',
      role: '挂单'
    },
    {
      id: 'pc-ht-4',
      time: '12:44:09',
      pair: sym,
      sideLong: false,
      price: px,
      qty: `${perp ? '1' : '0.002'} ${qtyUnit}`,
      fee: '0.0180 USDT',
      role: '吃单'
    },
    {
      id: 'pc-ht-5',
      time: '12:01:33',
      pair: 'SOL/USDT',
      sideLong: true,
      price: '144.88',
      qty: `${perp ? '20' : '4.5'} ${qtyUnit}`,
      fee: '0.0650 USDT',
      role: '吃单'
    },
    {
      id: 'pc-ht-6',
      time: '11:22:17',
      pair: 'BNB/USDT',
      sideLong: false,
      price: '610.00',
      qty: `${perp ? '3' : '2.1'} ${qtyUnit}`,
      fee: '0.0380 USDT',
      role: '挂单'
    },
    {
      id: 'pc-ht-7',
      time: '10:55:40',
      pair: sym,
      sideLong: true,
      price: px,
      qty: `${perp ? '8' : '0.06'} ${qtyUnit}`,
      fee: '0.0920 USDT',
      role: '吃单'
    },
    {
      id: 'pc-ht-8',
      time: '10:12:08',
      pair: 'ETH/USDT',
      sideLong: false,
      price: '2,041.50',
      qty: `${perp ? '6' : '0.5'} ${qtyUnit}`,
      fee: '0.0510 USDT',
      role: '吃单'
    }
  ]
})

const pcDemoDeliveryOrders = computed(() => {
  const sym = `${activePair.value.base}/${activePair.value.quote}`
  return [
    {
      id: 'pc-do-1',
      pair: sym,
      direction: '看涨',
      period: '5m - 12%',
      amount: '100 USDT',
      status: '持仓中'
    },
    {
      id: 'pc-do-2',
      pair: sym,
      direction: '看跌',
      period: '1m - 5%',
      amount: '50 USDT',
      status: '结算中'
    },
    {
      id: 'pc-do-3',
      pair: 'ETH/USDT',
      direction: '看涨',
      period: '30s - 7%',
      amount: '200 USDT',
      status: '待成交'
    },
    {
      id: 'pc-do-4',
      pair: 'SOL/USDT',
      direction: '看跌',
      period: '15m - 18%',
      amount: '80 USDT',
      status: '已结算'
    }
  ]
})

const pcDemoDeliveryHist = computed(() => [
  {
    id: 'pc-dh-1',
    time: '04-03 09:00',
    pair: 'BTC/USDT',
    result: '盈利',
    payout: '+12.40 USDT',
    payoutClass: 'text-[#00b464]'
  },
  {
    id: 'pc-dh-2',
    time: '04-02 21:15',
    pair: 'ETH/USDT',
    result: '亏损',
    payout: '-5.00 USDT',
    payoutClass: 'text-[#ff3b30]'
  },
  {
    id: 'pc-dh-3',
    time: '04-01 18:40',
    pair: 'SOL/USDT',
    result: '盈利',
    payout: '+3.20 USDT',
    payoutClass: 'text-[#00b464]'
  },
  {
    id: 'pc-dh-4',
    time: '03-31 14:22',
    pair: 'DOGE/USDT',
    result: '亏损',
    payout: '-1.05 USDT',
    payoutClass: 'text-[#ff3b30]'
  },
  {
    id: 'pc-dh-5',
    time: '03-29 09:50',
    pair: 'XRP/USDT',
    result: '盈利',
    payout: '+0.88 USDT',
    payoutClass: 'text-[#00b464]'
  }
])

/** K 线区「最新成交」：示意市场成交明细，非用户订单 */
const klineMarketTrades = computed(() => {
  const mid = midNumeric.value
  const dec = decimals.value
  const tick =
    mid >= 10_000 ? 1 : mid >= 1_000 ? 0.1 : mid >= 100 ? 0.01 : 0.0001
  const pattern = [
    [true, 0, '0.04'],
    [false, 0.01, '0.05'],
    [true, -0.01, '0.09'],
    [false, 0.02, '0.12'],
    [true, 0.01, '0.03'],
    [false, -0.01, '0.07'],
    [true, 0, '0.11'],
    [false, 0.01, '0.02'],
    [true, -0.02, '0.08'],
    [false, 0, '0.15'],
    [true, 0.02, '0.06'],
    [false, -0.01, '0.04']
  ]
  const rows = []
  let ts = Date.now()
  for (let i = 0; i < pattern.length; i++) {
    const [isBuy, deltaTicks, q] = pattern[i]
    ts -= 700 + i * 320
    const d = new Date(ts)
    const timeStr = d.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    const pNum = Math.max(0.00000001, mid + deltaTicks * tick * (isBuy ? -1 : 1))
    rows.push({
      time: timeStr,
      price: fmtPriceNum(pNum, dec),
      qty: q,
      isBuy
    })
  }
  return rows
})

const orderToast = ref('')
let orderToastTimer = null

/** 演示：后台要求「初级认证」通过后才允许交易；持久化便于刷新后仍保持 */
const FEX_FRONT_TRADE_KYC_APPROVED_KEY = 'fex-front-trade-kyc-approved-demo'
const tradeKycApproved = ref(false)
const tradeVerificationDialogOpen = ref(false)

const tradeKycUserLevelForDialog = computed(() =>
  tradeKycApproved.value ? VERIFICATION_LEVEL.BASIC : VERIFICATION_LEVEL.NONE
)

function syncTradeKycFromStorage() {
  try {
    tradeKycApproved.value =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem(FEX_FRONT_TRADE_KYC_APPROVED_KEY) === '1'
  } catch {
    tradeKycApproved.value = false
  }
}

function markTradeKycApprovedDemo() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FEX_FRONT_TRADE_KYC_APPROVED_KEY, '1')
    }
  } catch {
    /* ignore */
  }
  tradeKycApproved.value = true
  tradeVerificationDialogOpen.value = false
  showTradeToast('演示：已通过初级认证，可正常提交委托')
}

function showTradeToast(message) {
  orderToast.value = message
  if (orderToastTimer) clearTimeout(orderToastTimer)
  orderToastTimer = setTimeout(() => {
    orderToast.value = ''
  }, 2600)
}

function validateOrderQty() {
  const q = String(quantity.value || '').trim()
  if (tradeMode.value === 'spot') {
    const qq = String(qtyQuote.value || '').trim()
    if (!q && !qq) return '请填写数量'
  } else if (!q) {
    return '请填写数量'
  }
  return null
}

/** 演示环境：校验数量后提示，无真实下单 */
function submitDemoOrder(forcedSide) {
  if (!requireAuth()) return
  syncTradeKycFromStorage()
  if (!tradeKycApproved.value) {
    tradeVerificationDialogOpen.value = true
    showTradeToast('请先完成身份认证后再交易')
    return
  }
  const err = validateOrderQty()
  if (err) {
    showTradeToast(err)
    return
  }
  const side = forcedSide || positionSide.value
  const sideLabel =
    tradeMode.value === 'spot'
      ? side === 'long'
        ? '买入'
        : '卖出'
      : side === 'long'
        ? '做多'
        : '做空'
  const pair = `${activePair.value.base}/${activePair.value.quote}`
  showTradeToast(`演示：已提交${sideLabel} ${pair}（无真实成交）`)
}

function onBodyKeydown(e) {
  if (e.key === 'Escape') {
    if (pcLeveragePickerOpen.value) {
      pcLeveragePickerOpen.value = false
      return
    }
    if (pcPairPickerOpen.value) {
      pcPairPickerOpen.value = false
      return
    }
    if (mobilePickerOpen.value) {
      closeMobilePicker()
      return
    }
    pairDrawerOpen.value = false
    modeSheetOpen.value = false
  }
}

function tickClock() {
  clockStr.value = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

onMounted(() => {
  syncTradeKycFromStorage()
  document.body.addEventListener('keydown', onBodyKeydown)
  document.addEventListener('pointerdown', onDocPointerDownPcPair, true)
  tickClock()
  clockTimer = setInterval(tickClock, 1000)
})

onUnmounted(() => {
  document.body.removeEventListener('keydown', onBodyKeydown)
  document.removeEventListener('pointerdown', onDocPointerDownPcPair, true)
  if (clockTimer) clearInterval(clockTimer)
  if (orderToastTimer) clearTimeout(orderToastTimer)
})

</script>

<template>
  <div
    class="trade-page w-full text-white lg:max-w-none lg:flex lg:h-[calc(100dvh-3.5rem-1px)] lg:min-h-0 lg:flex-col lg:overflow-hidden"
  >
    <!-- ——— PC：行情横条 + 类型切换 ——— -->
    <div
      class="hidden shrink-0 border-b border-[#1f2429] bg-[#0b0e11] lg:block lg:px-4 lg:py-2 xl:px-6"
    >
      <!-- 整行不换行：统计区可横向滑览，右侧品种/类型/时间固定同一行并对齐 -->
      <div class="flex min-h-[2.75rem] flex-nowrap items-center gap-3 xl:gap-4">
        <div ref="pcPairPickerRoot" class="relative shrink-0">
          <label class="sr-only" for="pc-trade-pair-trigger">交易对</label>
          <button
            id="pc-trade-pair-trigger"
            type="button"
            class="flex min-w-[11rem] items-center gap-2 rounded-lg border border-[#1f2429] bg-[#1e2329] py-1.5 pl-2.5 pr-2 text-left transition hover:border-[#00b464]/35 hover:bg-[#232a31] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00b464]/40"
            :aria-expanded="pcPairPickerOpen"
            aria-haspopup="listbox"
            aria-controls="pc-trade-pair-listbox"
            :aria-label="`交易品种与交易对，${tradeAssetClassLabel}，${symbol}`"
            @click="togglePcPairPicker"
          >
            <span class="flex min-w-0 flex-1 flex-col items-start gap-0.5">
              <span class="text-[10px] font-medium leading-none text-[#848e9c]">{{
                tradeAssetClassLabel
              }}</span>
              <span class="truncate font-mono text-sm font-semibold tabular-nums leading-tight text-white">{{
                symbol
              }}</span>
            </span>
            <svg
              class="h-4 w-4 shrink-0 text-white/45 transition duration-200"
              :class="pcPairPickerOpen ? 'rotate-180' : ''"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="m6 9 6 6 6-6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <div
            v-show="pcPairPickerOpen"
            id="pc-trade-pair-panel"
            class="absolute left-0 top-[calc(100%+0.375rem)] z-[60] w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-[#1f2429] bg-[#1e2329] py-2 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.65)]"
            role="presentation"
            @click.stop
          >
            <div class="border-b border-white/[0.06] px-2 pb-2 pt-1">
              <nav
                class="flex gap-0.5 rounded-md bg-[#0b0e11] p-0.5 ring-1 ring-white/[0.06]"
                aria-label="交易品种"
              >
                <button
                  v-for="t in assetClassTabItems"
                  :key="t.key"
                  type="button"
                  class="min-w-0 flex-1 whitespace-nowrap rounded px-1.5 py-1.5 text-center text-[11px] font-medium leading-tight transition"
                  :class="
                    pickerDraftAssetClass === t.key
                      ? 'bg-lime-400/15 text-lime-200 ring-1 ring-lime-400/25'
                      : 'text-white/65 hover:bg-white/[0.06] hover:text-white/90'
                  "
                  @click="pickerDraftAssetClass = t.key"
                >
                  {{ t.label }}
                </button>
              </nav>
            </div>
            <p class="px-3 pb-1 pt-2 text-[11px] text-[#848e9c]">当前市场可交易对</p>
            <div class="px-2 pt-1">
              <input
                id="pc-trade-pair-search"
                v-model="pcPairSearch"
                type="search"
                autocomplete="off"
                placeholder="搜索代码，如 ETH、USD…"
                class="w-full rounded-md border border-[#2b3139] bg-[#0b0e11] px-2.5 py-2 text-xs text-white placeholder:text-[#5e6673] focus:border-[#00b464]/45 focus:outline-none focus:ring-1 focus:ring-[#00b464]/25"
                @keydown.escape.stop="pcPairPickerOpen = false"
              />
            </div>
            <ul
              id="pc-trade-pair-listbox"
              class="trade-pair-scroll mt-1 max-h-60 overflow-y-auto overscroll-contain px-1 pb-1 pr-1.5"
              role="listbox"
            >
              <template v-if="pcPairPickerRows.length">
                <li v-for="row in pcPairPickerRows" :key="row.p.base + row.p.quote + row.i" role="none">
                  <button
                    type="button"
                    role="option"
                    class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition"
                    :class="
                      isPcPickerRowSelected(row)
                        ? 'bg-[#00b464]/15 text-lime-200 ring-1 ring-[#00b464]/25'
                        : 'text-[#eaecef] hover:bg-white/[0.06]'
                    "
                    :aria-selected="isPcPickerRowSelected(row)"
                    @click="selectPcPair(row.i)"
                  >
                    <span class="min-w-0 flex-1 truncate font-mono font-semibold tabular-nums">
                      {{ row.p.base }}
                      <span class="font-normal text-white/40">/</span>
                      {{ row.p.quote }}
                    </span>
                    <span class="shrink-0 font-mono text-xs tabular-nums text-white/80">{{ row.price }}</span>
                    <span
                      class="w-[3.25rem] shrink-0 text-right font-mono text-[11px] tabular-nums"
                      :class="changeClass(row.pct)"
                    >
                      {{ row.pct >= 0 ? '+' : '' }}{{ row.pct.toFixed(2) }}%
                    </span>
                  </button>
                </li>
              </template>
              <li v-else class="px-3 py-6 text-center text-xs text-white/40">无匹配交易对</li>
            </ul>
          </div>
        </div>

        <div
          class="min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div class="flex w-max max-w-none flex-nowrap items-center gap-x-6 pr-1 lg:gap-x-7 xl:gap-x-8">
            <div class="shrink-0">
              <p class="font-mono text-xl font-bold leading-tight tabular-nums" :class="changeClass(changePct)">
                {{ lastPrice }}
              </p>
              <p class="mt-0.5 whitespace-nowrap text-[11px] text-white/45">≈ $ {{ lastPrice }}</p>
            </div>
            <div class="shrink-0 whitespace-nowrap text-xs">
              <span class="text-white/40">24H 涨跌</span>
              <span class="ml-2 font-mono tabular-nums" :class="changeClass(changePct)">
                {{ changePct >= 0 ? '+' : '' }}{{ changePct.toFixed(3) }}%
              </span>
            </div>
            <div class="shrink-0 whitespace-nowrap text-xs">
              <span class="text-white/40">24H 高</span>
              <span class="ml-2 font-mono tabular-nums text-white/85">{{ stats24h.high }}</span>
            </div>
            <div class="shrink-0 whitespace-nowrap text-xs">
              <span class="text-white/40">24H 低</span>
              <span class="ml-2 font-mono tabular-nums text-white/85">{{ stats24h.low }}</span>
            </div>
            <div class="shrink-0 whitespace-nowrap text-xs">
              <span class="text-white/40">24H 成交量</span>
              <span class="ml-2 font-mono text-white/85">{{ stats24h.volBase }}</span>
            </div>
            <div class="shrink-0 whitespace-nowrap text-xs">
              <span class="text-white/40">24H 交易额</span>
              <span class="ml-2 font-mono text-white/85">{{ stats24h.turnover }}</span>
            </div>
          </div>
        </div>

        <div class="flex shrink-0 flex-nowrap items-center justify-end gap-2.5 sm:gap-3">
          <nav
            class="flex rounded-lg border border-white/[0.06] bg-white/[0.04] p-0.5"
            aria-label="交易类型"
          >
            <button
              v-for="t in tradeTabs"
              :key="t.key"
              type="button"
              class="whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition"
              :class="
                tradeMode === t.key
                  ? 'bg-lime-400/15 text-lime-200 ring-1 ring-lime-400/25'
                  : 'text-white/65 hover:bg-white/[0.06] hover:text-white/90'
              "
              @click="applyPcTradeModeTab(t.key)"
            >
              {{ t.label }}
            </button>
          </nav>
          <time class="font-mono text-xs tabular-nums text-white/50">{{ clockStr }}</time>
        </div>
      </div>
    </div>

    <!-- ——— PC：三栏主终端（flex-1 + min-h-0：滚动只在栏内，不撑出 body） ——— -->
    <div
      class="hidden min-h-0 border-[#1f2429] lg:flex lg:flex-1 lg:flex-row lg:overflow-hidden lg:border-t lg:border-b"
    >
      <!-- 左：图表 + 底部订单 -->
      <div
        class="flex h-full min-h-0 min-w-0 flex-[1.15] flex-col border-r border-[#1f2429] bg-[#050505]"
      >
        <div class="flex items-center justify-between border-b border-[#1f2429] px-2 py-1.5">
          <div class="flex flex-wrap gap-0.5" role="tablist" aria-label="K 线周期">
            <button
              v-for="tf in chartTimeframes"
              :key="tf"
              type="button"
              class="rounded px-2 py-1 text-xs font-medium transition"
              :class="
                chartTimeframe === tf
                  ? 'bg-[#00b464]/20 text-[#00b464]'
                  : 'text-white/45 hover:bg-white/[0.04] hover:text-white/75'
              "
              @click="chartTimeframe = tf"
            >
              {{ tf }}
            </button>
          </div>
          <div class="flex items-center gap-1 text-white/35">
            <button
              type="button"
              class="rounded p-1.5 hover:bg-white/[0.06] hover:text-white/70"
              aria-label="指标"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-width="1.5"
                  d="M12 6v12M6 12h12M9 3v2m6-2v2M9 19v2m6-2v2M19 9h2m-2 6h2M3 9h2m-2 6h2"
                />
              </svg>
            </button>
            <button
              type="button"
              class="rounded p-1.5 hover:bg-white/[0.06] hover:text-white/70"
              aria-label="全屏"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M4 8V4h4M16 4h4v4M4 16v4h4m12 0h4v-4"
                />
              </svg>
            </button>
          </div>
        </div>
        <div
          class="relative flex min-h-[240px] flex-1 flex-col overflow-hidden bg-[#050505] lg:min-h-0"
        >
            <div
              class="pointer-events-none absolute inset-0 opacity-[0.08]"
              style="
                background-image: linear-gradient(#1f2429 1px, transparent 1px),
                  linear-gradient(90deg, #1f2429 1px, transparent 1px);
                background-size: 22px 22px;
              "
            />
            <div class="relative flex flex-1 items-end justify-center px-4 pb-6 pt-8">
              <div class="h-40 w-full max-w-4xl xl:h-48">
                <div
                  class="h-full w-full bg-gradient-to-t from-[#00b464]/15 via-rose-500/10 to-transparent"
                  style="clip-path: polygon(0% 72%, 10% 55%, 20% 62%, 30% 44%, 40% 52%, 50% 38%, 60% 46%, 70% 32%, 80% 40%, 90% 28%, 100% 36%, 100% 100%, 0% 100%)"
                />
              </div>
              <p class="absolute bottom-3 text-center text-[11px] text-white/35">
                K 线区域（示意）· 接入 TradingView / 自研图表
              </p>
            </div>
            <div class="relative h-14 border-t border-[#1f2429] bg-[#0b0e11]/80 px-2">
              <div
                class="flex h-full items-end gap-px pt-2"
                aria-hidden="true"
              >
                <div
                  v-for="(h, hi) in [40, 55, 35, 60, 45, 70, 30, 50, 65, 40, 58, 48]"
                  :key="hi"
                  class="flex-1 rounded-t-[1px] bg-[#00b464]/35"
                  :style="{ height: `${h}%` }"
                />
              </div>
            </div>
        </div>

        <div
          class="flex h-[280px] min-h-0 shrink-0 flex-col border-t border-[#1f2429] bg-[#0b0e11]"
        >
          <div class="flex shrink-0 flex-wrap gap-0 border-b border-[#1f2429] px-1">
            <button
              v-for="bt in pcBottomTabs"
              :key="bt.key"
              type="button"
              class="border-b-2 px-3 py-2 text-xs font-medium transition"
              :class="
                pcBottomTab === bt.key
                  ? 'border-[#00b464] text-[#00b464]'
                  : 'border-transparent text-white/45 hover:text-white/75'
              "
              @click="pcBottomTab = bt.key"
            >
              {{ bt.label }}
            </button>
          </div>
          <div class="flex min-h-0 flex-1 flex-col px-2 pb-1.5 pt-0">
            <div
              class="trade-pair-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-0.5 pt-2"
            >
              <!-- 永续 · 当前持仓（多列表格） -->
              <template v-if="tradeMode === 'perpetual' && pcBottomTab === 'positions'">
                  <table
                    class="pc-bottom-data-table w-full table-fixed rounded-lg border-separate border-spacing-0 bg-[#080a0d] text-[11px] leading-snug tracking-tight"
                  >
                    <thead class="border-b border-[#2a3139]">
                      <tr>
                        <th
                          class="w-[14%] py-2.5 pl-2.5 pr-1.5 text-left text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          合约
                        </th>
                        <th
                          class="w-[7%] px-1.5 text-center text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          方向
                        </th>
                        <th
                          class="w-[8%] px-1.5 text-right text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          杠杆
                        </th>
                        <th
                          class="w-[9%] px-1.5 text-right text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          张数
                        </th>
                        <th
                          class="w-[16%] px-1.5 text-right text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          开仓价
                        </th>
                        <th
                          class="w-[16%] px-1.5 text-right text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          标记价
                        </th>
                        <th
                          class="w-[15%] px-1.5 text-right text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          未实现盈亏
                        </th>
                        <th
                          class="w-[15%] py-2.5 pl-1.5 pr-2.5 text-right text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          收益率
                        </th>
                      </tr>
                    </thead>
                    <tbody class="text-[#e2e8f0]">
                      <tr
                        v-for="row in pcDemoPerpPositions"
                        :key="row.id"
                        class="border-b border-white/[0.04] font-mono tabular-nums transition-colors odd:bg-white/[0.02] last:border-b-0 hover:bg-[#121820]/90"
                      >
                        <td class="max-w-0 truncate py-2 pl-2.5 pr-1.5 text-left align-middle text-[#cbd5e1]">
                          {{ row.pair }}
                        </td>
                        <td class="px-1.5 text-center align-middle">
                          <span
                            class="inline-flex min-h-[1.125rem] min-w-[1.375rem] items-center justify-center rounded-md px-1 py-px text-[10px] font-bold ring-1 ring-inset"
                            :class="
                              row.sideLong
                                ? 'bg-[#00b464]/12 text-[#34d399] ring-[#00b464]/25'
                                : 'bg-[#ff3b30]/10 text-[#fb7185] ring-[#ff3b30]/20'
                            "
                          >
                            {{ row.sideLong ? '多' : '空' }}
                          </span>
                        </td>
                        <td class="px-1.5 text-right align-middle text-[#8b95a5]">
                          {{ row.leverage }}
                        </td>
                        <td class="px-1.5 text-right align-middle text-[#94a3b8]">{{ row.size }}</td>
                        <td class="px-1.5 text-right align-middle text-[#94a3b8]">{{ row.entry }}</td>
                        <td class="px-1.5 text-right align-middle text-[#94a3b8]">{{ row.mark }}</td>
                        <td
                          class="px-1.5 text-right align-middle font-medium"
                          :class="row.uPnl.startsWith('+') ? 'text-[#34d399]' : 'text-[#fb7185]'"
                        >
                          {{ row.uPnl }}
                        </td>
                        <td
                          class="py-2 pl-1.5 pr-2.5 text-right align-middle font-medium"
                          :class="row.roe.startsWith('+') ? 'text-[#34d399]' : 'text-[#fb7185]'"
                        >
                          {{ row.roe }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
              </template>

              <!-- 交割 · 订单 -->
              <template v-else-if="tradeMode === 'delivery' && pcBottomTab === 'delivery-orders'">
                  <table
                    class="pc-bottom-data-table w-full table-fixed rounded-lg border-separate border-spacing-0 bg-[#080a0d] text-[11px] leading-snug tracking-tight"
                  >
                    <thead class="border-b border-[#2a3139]">
                      <tr>
                        <th
                          class="w-[22%] py-2.5 pl-2.5 pr-1.5 text-left text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          合约
                        </th>
                        <th
                          class="w-[14%] px-1.5 text-center text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          方向
                        </th>
                        <th
                          class="w-[26%] px-1.5 text-left text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          周期
                        </th>
                        <th
                          class="w-[20%] px-1.5 text-right text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          金额
                        </th>
                        <th
                          class="w-[18%] py-2.5 pl-1.5 pr-2.5 text-right text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          状态
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="row in pcDemoDeliveryOrders"
                        :key="row.id"
                        class="border-b border-white/[0.04] text-[#e2e8f0] transition-colors odd:bg-white/[0.02] last:border-b-0 hover:bg-[#121820]/90"
                      >
                        <td class="max-w-0 truncate py-2 pl-2.5 pr-1.5 font-mono align-middle text-[#cbd5e1]">
                          {{ row.pair }}
                        </td>
                        <td class="px-1.5 text-center align-middle">
                          <span
                            class="font-semibold"
                            :class="
                              row.direction === '看涨' ? 'text-[#34d399]' : 'text-[#fb7185]'
                            "
                          >
                            {{ row.direction }}
                          </span>
                        </td>
                        <td class="truncate px-1.5 align-middle text-[#8b95a5]">{{ row.period }}</td>
                        <td class="px-1.5 text-right font-mono tabular-nums align-middle text-[#94a3b8]">
                          {{ row.amount }}
                        </td>
                        <td class="py-2 pl-1.5 pr-2.5 text-right align-middle">
                          <span
                            class="inline-block rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-[#9ca8b8]"
                          >
                            {{ row.status }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
              </template>

              <!-- 交割 · 历史 -->
              <template v-else-if="tradeMode === 'delivery' && pcBottomTab === 'hist'">
                  <table
                    class="pc-bottom-data-table w-full table-fixed rounded-lg border-separate border-spacing-0 bg-[#080a0d] text-[11px] leading-snug tracking-tight"
                  >
                    <thead class="border-b border-[#2a3139]">
                      <tr>
                        <th
                          class="w-[26%] py-2.5 pl-2.5 pr-1.5 text-left text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          时间
                        </th>
                        <th
                          class="w-[28%] px-1.5 text-left text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          合约
                        </th>
                        <th
                          class="w-[18%] px-1.5 text-center text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          结果
                        </th>
                        <th
                          class="w-[28%] py-2.5 pl-1.5 pr-2.5 text-right text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          盈亏
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="row in pcDemoDeliveryHist"
                        :key="row.id"
                        class="border-b border-white/[0.04] transition-colors odd:bg-white/[0.02] last:border-b-0 hover:bg-[#121820]/90"
                      >
                        <td class="py-2 pl-2.5 pr-1.5 font-mono align-middle text-[10px] text-[#8b95a5]">
                          {{ row.time }}
                        </td>
                        <td class="max-w-0 truncate px-1.5 font-mono align-middle text-[#cbd5e1]">
                          {{ row.pair }}
                        </td>
                        <td class="px-1.5 text-center align-middle text-[#9ca8b8]">
                          {{ row.result }}
                        </td>
                        <td
                          class="py-2 pl-1.5 pr-2.5 text-right font-mono text-[11px] font-semibold tabular-nums align-middle"
                          :class="row.payoutClass"
                        >
                          {{ row.payout }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
              </template>

              <!-- 当前委托（现货 / 永续） -->
              <template v-else-if="pcBottomTab === 'open-orders'">
                  <table
                    class="pc-bottom-data-table w-full table-fixed rounded-lg border-separate border-spacing-0 bg-[#080a0d] text-[11px] leading-snug tracking-tight"
                  >
                    <thead class="border-b border-[#2a3139]">
                      <tr>
                        <th
                          class="w-[11%] py-2.5 pl-2.5 pr-1.5 text-left text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          方向
                        </th>
                        <th
                          class="w-[18%] px-1.5 text-left text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          合约
                        </th>
                        <th
                          class="w-[11%] px-1.5 text-center text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          类型
                        </th>
                        <th
                          class="w-[11%] px-1.5 text-center text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          模式
                        </th>
                        <th
                          class="w-[15%] px-1.5 text-right text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          委托价
                        </th>
                        <th
                          class="w-[14%] px-1.5 text-right text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          数量
                        </th>
                        <th
                          class="w-[10%] px-1.5 text-right text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          已成交
                        </th>
                        <th
                          class="w-[10%] py-2.5 pl-1.5 pr-2.5 text-right text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          时间
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="row in pcDemoOpenOrdersTable"
                        :key="'pc-' + row.id"
                        class="border-b border-white/[0.04] transition-colors odd:bg-white/[0.02] last:border-b-0 hover:bg-[#121820]/90"
                      >
                        <td class="py-2 pl-2.5 pr-1.5 align-middle">
                          <span
                            class="text-[11px] font-bold"
                            :class="row.sideLong ? 'text-[#34d399]' : 'text-[#fb7185]'"
                          >
                            {{ row.sideLabel }}
                          </span>
                        </td>
                        <td class="max-w-0 truncate px-1.5 font-mono align-middle text-[#cbd5e1]">
                          {{ row.pair }}
                        </td>
                        <td class="px-1.5 text-center align-middle text-[#8b95a5]">
                          {{ row.type }}
                        </td>
                        <td class="px-1.5 text-center align-middle">
                          <span
                            class="rounded bg-white/[0.05] px-1 py-px text-[10px] text-[#8b95a5]"
                          >
                            {{ row.modeTag }}
                          </span>
                        </td>
                        <td class="px-1.5 text-right font-mono tabular-nums align-middle text-[#94a3b8]">
                          {{ row.price }}
                        </td>
                        <td class="px-1.5 text-right font-mono align-middle text-[#e2e8f0]">
                          {{ row.amount }}
                        </td>
                        <td class="px-1.5 text-right align-middle text-[#64748b]">
                          {{ row.filled }}
                        </td>
                        <td class="py-2 pl-1.5 pr-2.5 text-right font-mono text-[10px] align-middle text-[#8b95a5]">
                          {{ row.time }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
              </template>

              <!-- 历史委托 -->
              <template v-else-if="pcBottomTab === 'hist-orders'">
                  <table
                    class="pc-bottom-data-table w-full table-fixed rounded-lg border-separate border-spacing-0 bg-[#080a0d] text-[11px] leading-snug tracking-tight"
                  >
                    <thead class="border-b border-[#2a3139]">
                      <tr>
                        <th
                          class="w-[14%] py-2.5 pl-2.5 pr-1.5 text-left text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          方向
                        </th>
                        <th
                          class="w-[14%] px-1.5 text-center text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          类型
                        </th>
                        <th
                          class="w-[20%] px-1.5 text-right text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          价格
                        </th>
                        <th
                          class="w-[20%] px-1.5 text-right text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          数量
                        </th>
                        <th
                          class="w-[16%] px-1.5 text-center text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          状态
                        </th>
                        <th
                          class="w-[16%] py-2.5 pl-1.5 pr-2.5 text-right text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          时间
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="row in pcDemoHistOrdersTable"
                        :key="'pc-ho-' + row.id"
                        class="border-b border-white/[0.04] transition-colors odd:bg-white/[0.02] last:border-b-0 hover:bg-[#121820]/90"
                      >
                        <td class="py-2 pl-2.5 pr-1.5 align-middle">
                          <span
                            class="text-[11px] font-bold"
                            :class="row.sideLong ? 'text-[#34d399]' : 'text-[#fb7185]'"
                          >
                            {{ row.sideLabel }}
                          </span>
                        </td>
                        <td class="px-1.5 text-center align-middle text-[#8b95a5]">
                          {{ row.type }}
                        </td>
                        <td class="px-1.5 text-right font-mono tabular-nums align-middle text-[#94a3b8]">
                          {{ row.price }}
                        </td>
                        <td class="px-1.5 text-right font-mono align-middle text-[#e2e8f0]">
                          {{ row.amount }}
                        </td>
                        <td class="px-1.5 text-center align-middle">
                          <span
                            class="inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                            :class="
                              row.status === '已撤销'
                                ? 'bg-amber-500/12 text-amber-300/95 ring-1 ring-amber-500/25'
                                : 'bg-white/[0.05] text-[#9ca8b8]'
                            "
                          >
                            {{ row.status }}
                          </span>
                        </td>
                        <td class="py-2 pl-1.5 pr-2.5 text-right font-mono text-[10px] align-middle text-[#8b95a5]">
                          {{ row.time }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
              </template>

              <!-- 历史成交 -->
              <template v-else-if="pcBottomTab === 'hist-trades'">
                  <table
                    class="pc-bottom-data-table w-full table-fixed rounded-lg border-separate border-spacing-0 bg-[#080a0d] text-[11px] leading-snug tracking-tight"
                  >
                    <thead class="border-b border-[#2a3139]">
                      <tr>
                        <th
                          class="w-[12%] py-2.5 pl-2.5 pr-1.5 text-left text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          时间
                        </th>
                        <th
                          class="w-[16%] px-1.5 text-left text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          合约
                        </th>
                        <th
                          class="w-[10%] px-1.5 text-center text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          方向
                        </th>
                        <th
                          class="w-[18%] px-1.5 text-right text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          成交价
                        </th>
                        <th
                          class="w-[16%] px-1.5 text-right text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          数量
                        </th>
                        <th
                          class="w-[14%] px-1.5 text-right text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          手续费
                        </th>
                        <th
                          class="w-[14%] py-2.5 pl-1.5 pr-2.5 text-right text-[10px] font-semibold tracking-wide text-[#7c8794]"
                        >
                          角色
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="row in pcDemoHistTrades"
                        :key="row.id"
                        class="border-b border-white/[0.04] transition-colors odd:bg-white/[0.02] last:border-b-0 hover:bg-[#121820]/90"
                      >
                        <td class="py-2 pl-2.5 pr-1.5 font-mono align-middle text-[10px] text-[#8b95a5]">
                          {{ row.time }}
                        </td>
                        <td class="max-w-0 truncate px-1.5 font-mono align-middle text-[#cbd5e1]">
                          {{ row.pair }}
                        </td>
                        <td class="px-1.5 text-center align-middle">
                          <span
                            class="text-[11px] font-bold"
                            :class="row.sideLong ? 'text-[#34d399]' : 'text-[#fb7185]'"
                          >
                            {{ row.sideLong ? '买入' : '卖出' }}
                          </span>
                        </td>
                        <td class="px-1.5 text-right font-mono tabular-nums align-middle text-[#94a3b8]">
                          {{ row.price }}
                        </td>
                        <td class="px-1.5 text-right font-mono align-middle text-[#e2e8f0]">
                          {{ row.qty }}
                        </td>
                        <td class="px-1.5 text-right font-mono text-[10px] align-middle text-[#8b95a5]">
                          {{ row.fee }}
                        </td>
                        <td class="py-2 pl-1.5 pr-2.5 text-right align-middle text-[#8b95a5]">
                          <span
                            class="rounded bg-white/[0.05] px-1 py-px text-[10px] text-[#9ca8b8]"
                          >
                            {{ row.role }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
              </template>
            </div>
            <p
              class="shrink-0 border-t border-white/[0.06] pt-2 text-center text-[10px] tracking-wide text-[#5c6570]"
            >
              演示数据
            </p>
          </div>
        </div>
      </div>

      <!-- 中：盘口 / 成交 -->
      <div
        class="flex h-full min-h-0 w-[300px] shrink-0 flex-col border-r border-[#1f2429] bg-[#0b0e11] xl:w-[340px]"
      >
        <div class="flex border-b border-[#1f2429]">
          <button
            type="button"
            class="flex-1 border-b-2 py-2.5 text-xs font-medium transition"
            :class="
              orderBookTab === 'book'
                ? 'border-[#00b464] text-[#00b464]'
                : 'border-transparent text-white/45'
            "
            @click="orderBookTab = 'book'"
          >
            委托订单
          </button>
          <button
            type="button"
            class="flex-1 border-b-2 py-2.5 text-xs font-medium transition"
            :class="
              orderBookTab === 'trades'
                ? 'border-[#00b464] text-[#00b464]'
                : 'border-transparent text-white/45'
            "
            @click="orderBookTab = 'trades'"
          >
            最新成交
          </button>
        </div>
        <div
          v-if="orderBookTab === 'book'"
          class="border-b border-[#1f2429] px-2.5 py-2"
        >
          <div
            class="flex w-full items-stretch rounded-lg bg-[#12141a] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-[#1a1e25]"
            role="tablist"
            aria-label="盘口显示"
          >
            <button
              v-for="seg in orderBookSideSegments"
              :key="seg.id"
              type="button"
              role="tab"
              :aria-selected="obSideMode === seg.id"
              class="min-w-0 flex-1 rounded-md px-1.5 py-2 text-center text-[11px] font-medium leading-none tracking-tight transition-[color,background-color,box-shadow] duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00b464]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[#12141a]"
              :class="
                obSideMode === seg.id
                  ? 'bg-[#2f333c] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]'
                  : 'bg-transparent text-[#848e9c] hover:bg-white/[0.025] hover:text-[#b7bdc6]'
              "
              @click="obSideMode = seg.id"
            >
              {{ seg.label }}
            </button>
          </div>
        </div>

        <template v-if="orderBookTab === 'book'">
          <div
            class="grid grid-cols-3 border-b border-[#1f2429] px-2 py-2 text-[10px] font-medium text-[#848e9c]"
          >
            <span class="text-left">价格({{ activePair.quote }})</span>
            <span class="text-right">数量({{ activePair.base }})</span>
            <span class="text-right">合计({{ activePair.quote }})</span>
          </div>
          <div class="trade-pair-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <ul v-if="obSideMode !== 'buy'">
              <li
                v-for="(row, i) in depthAsks"
                :key="'pa-' + i"
                class="relative grid grid-cols-3 font-mono text-[11px] tabular-nums leading-6"
              >
                <div
                  class="pointer-events-none absolute inset-y-0 right-0 bg-rose-500/15"
                  :style="{ width: `${row.bar}%` }"
                />
                <span class="relative px-2 text-left text-[#ff3b30]">{{ row.p }}</span>
                <span class="relative px-2 text-right text-white/70">{{ row.q }}</span>
                <span class="relative px-2 text-right text-white/50">{{ row.t }}</span>
              </li>
            </ul>
            <div
              class="flex items-center justify-center gap-2 border-y border-[#1f2429] bg-black/25 py-2"
            >
              <span class="font-mono text-sm font-bold tabular-nums text-white">{{ lastPrice }}</span>
              <svg
                class="h-4 w-4 shrink-0 text-[#ff3b30]"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 5v14M19 12l-7 7-7-7"
                />
              </svg>
            </div>
            <ul v-if="obSideMode !== 'sell'">
              <li
                v-for="(row, i) in depthBids"
                :key="'pb-' + i"
                class="relative grid grid-cols-3 font-mono text-[11px] tabular-nums leading-6"
              >
                <div
                  class="pointer-events-none absolute inset-y-0 right-0 bg-[#00b464]/12"
                  :style="{ width: `${row.bar}%` }"
                />
                <span class="relative px-2 text-left text-[#00b464]">{{ row.p }}</span>
                <span class="relative px-2 text-right text-white/70">{{ row.q }}</span>
                <span class="relative px-2 text-right text-white/50">{{ row.t }}</span>
              </li>
            </ul>
          </div>
        </template>
        <div
          v-else
          class="trade-pair-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3 text-center text-xs text-white/40"
        >
          <p>最新成交接入行情后展示</p>
          <ul class="mt-4 space-y-2 text-left font-mono text-[11px] text-white/55">
            <li v-for="n in 6" :key="n" class="grid grid-cols-4 gap-1">
              <span>17:{{ String(40 + n).padStart(2, '0') }}:01</span>
              <span :class="n % 2 ? 'text-[#00b464]' : 'text-[#ff3b30]'">
                {{ n % 2 ? '做多' : '做空' }}
              </span>
              <span class="text-right">{{ lastPrice }}</span>
              <span class="text-right opacity-70">0.{{ n }}42</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- 右：下单 + 行情列表 + 资产（#121214 终端侧栏 + 橄榄绿 / 珊瑚红） -->
      <div
        class="flex h-full min-h-0 w-[320px] shrink-0 flex-col border-l border-[#1a1c21] bg-[#121214] xl:w-[360px]"
      >
        <div class="flex min-h-0 flex-1 flex-col border-b border-[#1a1c21]">
          <!-- 顶栏：交割方向 / 市价限价，固定不随表单滚动 -->
          <div
            class="shrink-0 border-b border-[#1a1c21] bg-[#121214] px-3 pb-2.5 pt-3.5"
          >
            <template v-if="tradeMode === 'delivery'">
              <div
                class="grid grid-cols-2 gap-1 rounded-lg bg-[#0e0f12] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ring-1 ring-[#1a1c21]"
              >
                <button
                  type="button"
                  class="rounded-md py-2.5 text-xs font-bold tracking-tight transition duration-150"
                  :class="
                    positionSide === 'long'
                      ? 'bg-[#152019] text-[#8fd4a8] shadow-[inset_0_1px_0_rgba(143,212,168,0.12)] ring-1 ring-[#4d7c59]/55'
                      : 'text-[#8e8e93] hover:bg-white/[0.03] hover:text-[#b4b4b8]'
                  "
                  @click="positionSide = 'long'"
                >
                  做多买入
                </button>
                <button
                  type="button"
                  class="rounded-md py-2.5 text-xs font-bold tracking-tight transition duration-150"
                  :class="
                    positionSide === 'short'
                      ? 'bg-[#231619] text-[#ffb0b3] shadow-[inset_0_1px_0_rgba(240,90,94,0.08)] ring-1 ring-[#8f3d42]/60'
                      : 'text-[#8e8e93] hover:bg-white/[0.03] hover:text-[#b4b4b8]'
                  "
                  @click="positionSide = 'short'"
                >
                  做空买入
                </button>
              </div>
            </template>
            <template v-else-if="tradeMode === 'perpetual'">
              <div
                class="flex rounded-lg bg-[#0e0f12] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ring-1 ring-[#1a1c21]"
              >
                <button
                  type="button"
                  class="flex-1 rounded-md py-2 text-xs font-semibold tracking-tight transition duration-150"
                  :class="
                    orderType === 'market'
                      ? 'bg-[#152019] text-[#9bc99f] shadow-[inset_0_1px_0_rgba(155,201,159,0.1)] ring-1 ring-[#4d7c59]/45'
                      : 'text-[#8e8e93] hover:bg-white/[0.025] hover:text-[#b4b4b8]'
                  "
                  @click="orderType = 'market'"
                >
                  市价
                </button>
                <button
                  type="button"
                  class="flex-1 rounded-md py-2 text-xs font-semibold tracking-tight transition duration-150"
                  :class="
                    orderType === 'limit'
                      ? 'bg-[#152019] text-[#9bc99f] shadow-[inset_0_1px_0_rgba(155,201,159,0.1)] ring-1 ring-[#4d7c59]/45'
                      : 'text-[#8e8e93] hover:bg-white/[0.025] hover:text-[#b4b4b8]'
                  "
                  @click="orderType = 'limit'"
                >
                  限价
                </button>
              </div>
            </template>
            <template v-else>
              <div class="flex rounded-lg border border-[#1f2429] bg-[#121212] p-0.5">
                <button
                  type="button"
                  class="flex-1 rounded-md py-1.5 text-xs font-medium"
                  :class="orderType === 'market' ? 'bg-[#00b464]/20 text-[#00b464]' : 'text-white/45'"
                  @click="orderType = 'market'"
                >
                  市价
                </button>
                <button
                  type="button"
                  class="flex-1 rounded-md py-1.5 text-xs font-medium"
                  :class="orderType === 'limit' ? 'bg-[#00b464]/20 text-[#00b464]' : 'text-white/45'"
                  @click="orderType = 'limit'"
                >
                  限价
                </button>
              </div>
            </template>
          </div>

          <div
            class="trade-pair-scroll min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-3 pb-2 pt-3"
          >
          <!-- 交割 -->
          <template v-if="tradeMode === 'delivery'">
            <ul class="space-y-2 text-[11px] leading-snug">
              <li class="flex justify-between gap-2">
                <span class="text-[#8e8e93]">交易资产</span>
                <span class="font-medium text-white">{{ activePair.quote }}</span>
              </li>
              <li class="flex justify-between gap-2">
                <span class="text-[#8e8e93]">可用数量</span>
                <span class="font-mono font-medium text-white">0.00</span>
              </li>
              <li class="flex justify-between gap-2">
                <span class="text-[#8e8e93]">最低买入</span>
                <span class="font-mono font-medium text-white">100</span>
              </li>
              <li class="flex justify-between gap-2">
                <span class="text-[#8e8e93]">手续费</span>
                <span class="font-mono font-medium text-white">0.00</span>
              </li>
            </ul>
            <label class="block text-[11px] font-medium text-[#8e8e93]">合约周期</label>
            <select
              v-model="selectedDeliveryPeriod"
              class="w-full rounded-lg border border-[#24252b] bg-[#1a1b1f] py-2 pl-2.5 pr-8 text-xs text-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)] focus:border-[#4d7c59]/50 focus:outline-none focus:ring-1 focus:ring-[#4d7c59]/35"
            >
              <option v-for="o in deliveryPeriods" :key="o" :value="o">{{ o }}</option>
            </select>
            <label class="block text-[11px] font-medium text-[#8e8e93]">数量</label>
            <input
              v-model="quantity"
              type="text"
              placeholder="请输入数量"
              class="w-full rounded-lg border border-[#24252b] bg-[#1a1b1f] py-2 px-2.5 text-sm text-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)] placeholder:text-[#6b6b70] focus:border-[#4d7c59]/45 focus:outline-none focus:ring-1 focus:ring-[#4d7c59]/30"
            />
            <div class="grid grid-cols-4 gap-1.5">
              <button
                v-for="p in [25, 50, 75, 100]"
                :key="p"
                type="button"
                class="rounded-md border border-[#2a2b31] bg-transparent py-2 text-[10px] font-semibold text-[#a1a1a6] transition hover:border-[#4d7c59]/40 hover:text-white"
                @click="setQtyPct(p)"
              >
                {{ p }}%
              </button>
            </div>
          </template>

          <!-- 永续 -->
          <template v-else-if="tradeMode === 'perpetual'">
            <div class="flex justify-between text-[11px]">
              <span class="text-[#8e8e93]">可用数量</span>
              <span class="font-mono font-medium text-white">0.00 {{ activePair.quote }}</span>
            </div>
            <label class="block text-[11px] font-medium text-[#8e8e93]" for="pc-leverage-trigger">杠杆</label>
            <div ref="pcLeveragePickerRoot" class="relative w-full">
              <button
                id="pc-leverage-trigger"
                type="button"
                class="flex w-full items-center justify-between gap-2 rounded-lg border border-[#24252b] bg-[#1a1b1f] py-2 pl-2.5 pr-2 text-left text-xs text-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)] transition hover:border-[#4d7c59]/35 focus:border-[#4d7c59]/50 focus:outline-none focus:ring-1 focus:ring-[#4d7c59]/35"
                :aria-expanded="pcLeveragePickerOpen"
                aria-haspopup="listbox"
                aria-controls="pc-leverage-listbox"
                @click="togglePcLeveragePicker"
              >
                <span class="min-w-0 font-mono font-medium tabular-nums">{{ pcLeverageLabel }}</span>
                <svg
                  class="h-3.5 w-3.5 shrink-0 text-white/45 transition duration-200"
                  :class="pcLeveragePickerOpen ? 'rotate-180' : ''"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="m6 9 6 6 6-6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <ul
                v-show="pcLeveragePickerOpen"
                id="pc-leverage-listbox"
                class="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-[60] max-h-60 overflow-y-auto overscroll-contain rounded-lg border border-[#24252b] bg-[#1a1b1f] py-1 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.65)]"
                role="listbox"
                aria-label="杠杆倍数"
                @click.stop
              >
                <li v-for="opt in perpetualLeverageOptions" :key="opt.value" role="none">
                  <button
                    type="button"
                    role="option"
                    class="flex w-full items-center px-2.5 py-2 text-left text-xs font-mono font-medium tabular-nums transition"
                    :class="
                      leverage === opt.value
                        ? 'bg-[#152019] text-[#9bc99f] ring-1 ring-[#4d7c59]/45'
                        : 'text-[#eaecef] hover:bg-white/[0.06]'
                    "
                    :aria-selected="leverage === opt.value"
                    @click="selectPcLeverage(opt.value)"
                  >
                    {{ opt.label }}
                  </button>
                </li>
              </ul>
            </div>
            <label class="block text-[11px] font-medium text-[#8e8e93]">价格 ({{ activePair.quote }})</label>
            <input
              type="text"
              :placeholder="lastPrice"
              :disabled="orderType === 'market'"
              class="w-full rounded-lg border border-[#24252b] bg-[#1a1b1f] py-2 px-2.5 text-sm text-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)] placeholder:text-[#6b6b70] focus:border-[#4d7c59]/45 focus:outline-none focus:ring-1 focus:ring-[#4d7c59]/30 disabled:cursor-not-allowed disabled:opacity-45"
            />
            <label class="block text-[11px] font-medium text-[#8e8e93]">数量 (张)</label>
            <input
              v-model="quantity"
              type="text"
              placeholder="请输入数量(张)"
              class="w-full rounded-lg border border-[#24252b] bg-[#1a1b1f] py-2 px-2.5 text-sm text-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)] placeholder:text-[#6b6b70] focus:border-[#4d7c59]/45 focus:outline-none focus:ring-1 focus:ring-[#4d7c59]/30"
            />
            <div class="grid grid-cols-4 gap-1.5">
              <button
                v-for="p in [25, 50, 75, 100]"
                :key="p"
                type="button"
                class="rounded-md border border-[#2a2b31] bg-transparent py-2 text-[10px] font-semibold text-[#a1a1a6] transition hover:border-[#4d7c59]/40 hover:text-white"
                @click="setQtyPct(p)"
              >
                {{ p }}%
              </button>
            </div>
            <ul class="space-y-1.5 text-[11px] leading-snug">
              <li class="flex justify-between gap-2">
                <span class="text-[#8e8e93]">最大可开仓</span>
                <span class="font-mono font-medium text-[#9bc99f]">0.00 张</span>
              </li>
              <li class="flex justify-between gap-2">
                <span class="text-[#8e8e93]">初始保证金</span>
                <span class="font-mono text-white">--</span>
              </li>
              <li class="flex justify-between gap-2">
                <span class="text-[#8e8e93]">手续费</span>
                <span class="font-mono text-white">0.00</span>
              </li>
            </ul>
            <label class="flex cursor-pointer select-none items-center gap-2.5 text-[11px] text-[#8e8e93]">
              <input
                v-model="tpSl"
                type="checkbox"
                class="h-4 w-4 shrink-0 rounded border-[#2a2b31] bg-[#1a1b1f] accent-[#84cc16] focus:ring-2 focus:ring-[#84cc16]/30"
              />
              <span class="font-medium hover:text-[#b4b4b8]">止盈止损</span>
            </label>
            <div v-if="tpSl" class="space-y-2">
              <div
                class="flex h-10 overflow-hidden rounded-lg border border-[#24252b] bg-[#1a1b1f] shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]"
              >
                <button
                  type="button"
                  class="flex w-9 shrink-0 items-center justify-center border-r border-[#24252b] bg-[#1f2026] text-lg leading-none text-[#a1a1a6] transition hover:bg-[#25262e] hover:text-white"
                  aria-label="降低止盈价"
                  @click="bumpTakeProfit(-1)"
                >
                  −
                </button>
                <input
                  v-model="takeProfitPrice"
                  type="text"
                  inputmode="decimal"
                  :placeholder="`请输入止盈价格(${activePair.quote})`"
                  class="min-w-0 flex-1 border-0 bg-transparent px-2 text-center text-xs text-white placeholder:text-[#6b6b70] focus:outline-none focus:ring-0"
                />
                <button
                  type="button"
                  class="flex w-9 shrink-0 items-center justify-center border-l border-[#24252b] bg-[#1f2026] text-lg leading-none text-[#a1a1a6] transition hover:bg-[#25262e] hover:text-white"
                  aria-label="提高止盈价"
                  @click="bumpTakeProfit(1)"
                >
                  +
                </button>
              </div>
              <div
                class="flex h-10 overflow-hidden rounded-lg border border-[#24252b] bg-[#1a1b1f] shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]"
              >
                <button
                  type="button"
                  class="flex w-9 shrink-0 items-center justify-center border-r border-[#24252b] bg-[#1f2026] text-lg leading-none text-[#a1a1a6] transition hover:bg-[#25262e] hover:text-white"
                  aria-label="降低止损价"
                  @click="bumpStopLoss(-1)"
                >
                  −
                </button>
                <input
                  v-model="stopLossPrice"
                  type="text"
                  inputmode="decimal"
                  :placeholder="`请输入止损价格(${activePair.quote})`"
                  class="min-w-0 flex-1 border-0 bg-transparent px-2 text-center text-xs text-white placeholder:text-[#6b6b70] focus:outline-none focus:ring-0"
                />
                <button
                  type="button"
                  class="flex w-9 shrink-0 items-center justify-center border-l border-[#24252b] bg-[#1f2026] text-lg leading-none text-[#a1a1a6] transition hover:bg-[#25262e] hover:text-white"
                  aria-label="提高止损价"
                  @click="bumpStopLoss(1)"
                >
                  +
                </button>
              </div>
            </div>
          </template>

          <!-- 现货 -->
          <template v-else>
            <div class="flex justify-between text-[11px] text-white/50">
              <span>可用</span>
              <span class="font-mono">0.00 {{ activePair.quote }}</span>
            </div>
            <label class="block text-[11px] text-white/45">{{ activePair.quote }}</label>
            <input
              v-model="qtyQuote"
              type="text"
              placeholder="请输入数量"
              class="w-full rounded-lg border border-[#1f2429] bg-[#1e2329] py-2 px-2 text-sm text-white placeholder:text-[#848e9c]"
            />
            <label class="block text-[11px] text-white/45">{{ activePair.base }}</label>
            <input
              v-model="quantity"
              type="text"
              placeholder="请输入数量"
              class="w-full rounded-lg border border-[#1f2429] bg-[#1e2329] py-2 px-2 text-sm text-white placeholder:text-[#848e9c]"
            />
          </template>
          </div>

          <!-- 主操作固定在侧栏底部，避免卷入滚动区被滚动条挤压/裁切 -->
          <div class="shrink-0 border-t border-[#1a1c21] bg-[#121214] px-3 pb-3 pt-2.5">
            <template v-if="tradeMode === 'delivery'">
              <div class="mb-2 flex justify-between text-[11px] text-[#8e8e93]">
                <span>预计收益</span>
                <span class="font-mono">--</span>
              </div>
              <button
                type="button"
                class="w-full rounded-lg py-3 text-sm font-bold tracking-tight text-white shadow-md transition hover:brightness-105 active:brightness-95"
                :class="
                  positionSide === 'long'
                    ? 'bg-[#3d8f62] shadow-[#3d8f62]/15'
                    : 'bg-[#F05A5E] shadow-[#F05A5E]/20'
                "
                @click="submitDemoOrder()"
              >
                {{ primaryCtaLabel }}
              </button>
            </template>
            <template v-else-if="tradeMode === 'perpetual'">
              <div class="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  class="min-h-[44px] rounded-lg bg-[#3d8f62] px-1 py-3 text-xs font-bold leading-tight tracking-tight text-white shadow-md shadow-[#3d8f62]/15 transition hover:brightness-105 active:brightness-95"
                  @click="submitDemoOrder('long')"
                >
                  做多买入
                </button>
                <button
                  type="button"
                  class="min-h-[44px] rounded-lg bg-[#F05A5E] px-1 py-3 text-xs font-bold leading-tight tracking-tight text-white shadow-md shadow-[#F05A5E]/20 transition hover:brightness-105 active:brightness-95"
                  @click="submitDemoOrder('short')"
                >
                  做空买入
                </button>
              </div>
            </template>
            <template v-else>
              <div class="grid grid-cols-2 gap-2.5 pt-0.5">
                <button
                  type="button"
                  class="min-h-[44px] rounded-lg bg-[#3d8f62] py-3 text-xs font-bold tracking-tight text-white shadow-md shadow-[#3d8f62]/15 transition hover:brightness-105"
                  @click="submitDemoOrder('long')"
                >
                  买入
                </button>
                <button
                  type="button"
                  class="min-h-[44px] rounded-lg bg-[#F05A5E] py-3 text-xs font-bold tracking-tight text-white shadow-md shadow-[#F05A5E]/20 transition hover:brightness-105"
                  @click="submitDemoOrder('short')"
                >
                  卖出
                </button>
              </div>
            </template>
          </div>
        </div>

        <div
          class="trade-pair-scroll max-h-[220px] shrink-0 overflow-y-auto border-b border-[#1a1c21] bg-[#121214]"
        >
          <div
            class="sticky top-0 flex items-center justify-between border-b border-[#1a1c21] bg-[#121214] px-3 py-2 text-[11px] font-medium text-[#8e8e93]"
          >
            <span>币对</span>
            <span>最新价</span>
            <span class="w-14 text-right">涨跌</span>
          </div>
          <button
            v-for="row in marketMiniRows"
            :key="row.idx"
            type="button"
            class="flex w-full items-center justify-between px-3 py-2 text-left text-xs transition hover:bg-white/[0.03]"
            :class="
              row.idx === activePairIdx
                ? 'bg-[#152019] text-[#9bc99f] ring-1 ring-inset ring-[#4d7c59]/25'
                : 'text-white'
            "
            @click="activePairIdx = row.idx"
          >
            <span class="font-medium">{{ row.label }}</span>
            <span class="font-mono tabular-nums">{{ row.price }}</span>
            <span
              class="w-14 text-right font-mono tabular-nums text-[10px]"
              :class="changeClass(row.pct)"
            >
              {{ row.pct >= 0 ? '+' : '' }}{{ row.pct.toFixed(2) }}%
            </span>
          </button>
        </div>

        <div
          class="grid grid-cols-2 gap-2 border-t border-[#1a1c21] bg-[#121214] p-3 sm:grid-cols-4"
        >
          <RouterLink
            :to="depositDetailPath"
            class="rounded-lg border border-[#2a2b31] py-2 text-center text-xs text-[#a1a1a6] transition hover:border-[#4d7c59]/35 hover:bg-white/[0.03] hover:text-white"
          >
            充币
          </RouterLink>
          <RouterLink
            :to="`${prefix}/personal-center/assets/withdraw`"
            class="rounded-lg border border-[#2a2b31] py-2 text-center text-xs text-[#a1a1a6] transition hover:border-[#4d7c59]/35 hover:bg-white/[0.03] hover:text-white"
          >
            提币
          </RouterLink>
          <RouterLink
            :to="transferPath"
            class="rounded-lg border border-[#2a2b31] py-2 text-center text-xs text-[#a1a1a6] transition hover:border-[#4d7c59]/35 hover:bg-white/[0.03] hover:text-white"
          >
            划转
          </RouterLink>
          <RouterLink
            :to="convertPath"
            class="rounded-lg border border-[#2a2b31] py-2 text-center text-xs text-[#a1a1a6] transition hover:border-[#4d7c59]/35 hover:bg-white/[0.03] hover:text-white"
          >
            闪兑
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- ——— 移动端：参考 MDFEX 双列（左下单 + 右盘口），K 线全屏时底部方向条 ——— -->
    <div class="lg:hidden bg-black text-white">
      <div
        class="sticky top-14 z-20 border-b border-white/[0.04] bg-black/95 px-2.5 py-2 backdrop-blur-sm supports-[backdrop-filter]:bg-black/90"
      >
        <div
          v-if="showDemoAccountBadge"
          class="mb-2 flex h-10 items-center justify-center rounded-lg border border-amber-300/35 bg-amber-300/10 px-3 text-sm font-semibold leading-none text-amber-100"
          aria-label="当前账户类型：模拟账户"
        >
          {{ accountModeLabel }}
        </div>
        <div class="flex items-stretch gap-2">
          <button
            type="button"
            class="relative flex min-h-[44px] min-w-0 flex-[1.15] touch-manipulation items-center rounded-lg border border-white/[0.05] bg-[#141414] py-2 pl-2.5 pr-8 text-left [-webkit-tap-highlight-color:transparent] active:bg-[#1a1a1a]"
            aria-haspopup="dialog"
            :aria-expanded="pairDrawerOpen"
            :aria-label="`交易对与品种市场，当前 ${symbol}，${tradeAssetClassLabel}`"
            @click="openPairDrawer"
          >
            <span class="block min-w-0 truncate text-left leading-tight">
              <span class="text-[14px] font-semibold tracking-tight">{{ symbol }}</span>
              <span class="text-[11px] font-normal text-white/40"> · {{ tradeAssetClassLabel }}</span>
            </span>
            <svg
              class="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="m6 9 6 6 6-6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            class="flex min-h-[44px] max-w-[38%] touch-manipulation items-center gap-1 rounded-lg border border-white/[0.05] bg-[#141414] px-2.5 py-2 text-left text-[12px] font-medium text-white/90 [-webkit-tap-highlight-color:transparent] active:bg-[#1a1a1a] sm:max-w-none"
            :aria-label="`选择交易类型，当前为${modeMenuLabel}`"
            @click="openModeSheet"
          >
            <span class="min-w-0 flex-1 truncate">{{ modeMenuLabel }}</span>
            <svg class="h-3.5 w-3.5 shrink-0 text-white/35" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="m6 9 6 6 6-6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            class="flex min-h-[44px] min-w-[44px] shrink-0 touch-manipulation items-center justify-center rounded-lg border border-white/[0.05] bg-[#141414] [-webkit-tap-highlight-color:transparent] active:bg-[#1a1a1a]"
            :class="chartExpanded ? 'text-[#4ade80] ring-1 ring-[#4ade80]/35' : 'text-white/45'"
            aria-label="展开或收起 K 线"
            @click="chartExpanded = !chartExpanded"
          >
            <svg class="h-[1.15rem] w-[1.15rem]" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 18V6M8 16V9M12 14v-5M16 11V7M20 15v-6"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
              />
              <path d="M3 20h18" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div
        class="px-2.5 pt-2"
        :class="
          chartExpanded
            ? 'pb-[calc(10.85rem+env(safe-area-inset-bottom,0px))]'
            : 'pb-[calc(5.85rem+env(safe-area-inset-bottom,0px))]'
        "
      >
        <!-- 行情概要：交易视图与 K 线模式共用 -->
        <header
          class="mb-2 border-b border-white/[0.04] pb-2 pt-0"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <p
                class="font-mono text-[1.35rem] font-bold leading-none tracking-tight tabular-nums"
                :class="changeClass(changePct)"
              >
                {{ lastPrice }}
              </p>
              <div class="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0">
                <span
                  class="text-[11px] font-mono font-medium tabular-nums"
                  :class="changeClass(changePct)"
                >
                  {{ changePct >= 0 ? '+' : '' }}{{ changePct.toFixed(3) }}%
                </span>
                <span class="text-[11px] font-mono tabular-nums text-[#4ade80]">
                  ≈$ {{ lastPrice }}
                </span>
              </div>
            </div>
            <div
              class="flex w-[min(48%,11rem)] shrink-0 flex-col gap-1 text-[11px] leading-snug sm:w-auto sm:min-w-[10rem]"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="shrink-0 text-white/45">24H 最高</span>
                <span class="min-w-0 truncate text-right font-mono tabular-nums text-white">
                  {{ stats24h.high }}
                </span>
              </div>
              <div class="flex items-center justify-between gap-2">
                <span class="shrink-0 text-white/45">24H 最低</span>
                <span class="min-w-0 truncate text-right font-mono tabular-nums text-white">
                  {{ stats24h.low }}
                </span>
              </div>
              <div class="flex items-center justify-between gap-2">
                <span class="shrink-0 text-white/45">24H 交易额</span>
                <span class="min-w-0 truncate text-right font-mono tabular-nums text-white">
                  {{ stats24h.tradeAmtShort }}
                </span>
              </div>
            </div>
          </div>
        </header>

        <section
          v-show="chartExpanded"
          class="mb-3 overflow-hidden rounded-lg border border-white/[0.05] bg-[#0a0a0a]"
        >
          <div
            class="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.04] px-4 py-2.5"
          >
            <div class="flex w-full items-center gap-2 text-[11px] text-white/45">
              <span class="shrink-0">周期</span>
              <button
                type="button"
                class="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-[#141414] px-2.5 py-1.5 text-left text-xs text-[#eaecef] active:bg-[#1a1a1a]"
                @click="openMobilePicker('chartTf')"
              >
                <span class="truncate">{{ chartTimeframe }}</span>
                <svg
                  class="h-3.5 w-3.5 shrink-0 text-white/35"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="m6 9 6 6 6-6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div class="relative flex min-h-[min(42vh,17.5rem)] items-end justify-center px-4 pb-4 pt-3">
            <div
              class="pointer-events-none absolute inset-0 opacity-[0.1]"
              style="
                background-image: linear-gradient(#1f2429 1px, transparent 1px),
                  linear-gradient(90deg, #1f2429 1px, transparent 1px);
                background-size: 20px 20px;
              "
            />
            <div class="relative h-28 w-[92%] max-w-md sm:h-32">
              <div
                class="h-full w-full bg-gradient-to-t from-rose-500/20 via-emerald-500/10 to-transparent"
                style="clip-path: polygon(0% 65%, 12% 48%, 22% 55%, 32% 40%, 42% 52%, 52% 35%, 62% 45%, 72% 30%, 82% 38%, 92% 28%, 100% 42%, 100% 100%, 0% 100%)"
              />
            </div>
          </div>
          <p class="border-t border-white/[0.04] px-3 pt-2 text-[10px] text-white/35">
            以下为市场公开数据（演示），非本人委托
          </p>
          <div class="flex border-b border-white/[0.04] px-1">
            <button
              type="button"
              class="flex-1 py-2 text-xs font-medium"
              :class="
                chartMarketTab === 'depth'
                  ? 'border-b-2 border-[#4ade80] text-[#4ade80]'
                  : 'text-white/45'
              "
              @click="chartMarketTab = 'depth'"
            >
              委托订单
            </button>
            <button
              type="button"
              class="flex-1 py-2 text-xs font-medium"
              :class="
                chartMarketTab === 'tape'
                  ? 'border-b-2 border-[#4ade80] text-[#4ade80]'
                  : 'text-white/45'
              "
              @click="chartMarketTab = 'tape'"
            >
              最新成交
            </button>
          </div>
          <!-- 市场盘口：左买量 | 中间价 | 右卖量 -->
          <div
            v-if="chartMarketTab === 'depth'"
            class="max-h-[14rem] overflow-y-auto overscroll-contain px-2 pb-2 pt-1"
          >
            <div
              class="grid grid-cols-3 gap-0.5 pb-1 text-[10px] font-medium text-white/40"
            >
              <span class="text-left">数量({{ activePair.base }})</span>
              <span class="text-center">价格({{ activePair.quote }})</span>
              <span class="text-right">数量({{ activePair.base }})</span>
            </div>
            <div class="font-mono text-[11px] tabular-nums leading-tight">
              <div
                v-for="(row, i) in depthAsksReversed"
                :key="'ask-' + i"
                class="grid grid-cols-3 items-center py-[3px]"
              >
                <span class="text-left text-white/25">—</span>
                <span class="text-center text-[#f87171]">{{ row.p }}</span>
                <div class="relative py-0.5 text-right">
                  <div
                    class="pointer-events-none absolute inset-y-0 right-0 bg-rose-500/16"
                    :style="{ width: `${row.bar}%` }"
                  />
                  <span class="relative text-white/75">{{ row.q }}</span>
                </div>
              </div>
              <div
                class="border-y border-white/[0.05] bg-black/40 py-1.5 text-center text-[13px] font-bold text-white"
              >
                {{ lastPrice }}
              </div>
              <div
                v-for="(row, i) in depthBids"
                :key="'bid-' + i"
                class="grid grid-cols-3 items-center py-[3px]"
              >
                <div class="relative py-0.5 text-left">
                  <div
                    class="pointer-events-none absolute inset-y-0 left-0 bg-emerald-500/16"
                    :style="{ width: `${row.bar}%` }"
                  />
                  <span class="relative text-white/75">{{ row.q }}</span>
                </div>
                <span class="text-center text-[#4ade80]">{{ row.p }}</span>
                <span class="text-right text-white/25">—</span>
              </div>
            </div>
          </div>
          <!-- 市场最新成交 -->
          <div
            v-else
            class="max-h-[14rem] overflow-y-auto overscroll-contain px-2 pb-2 pt-1"
          >
            <div
              class="grid grid-cols-3 gap-1 border-b border-white/[0.04] pb-1 text-[10px] font-medium text-white/40"
            >
              <span>时间</span>
              <span class="text-center">价格({{ activePair.quote }})</span>
              <span class="text-right">数量({{ activePair.base }})</span>
            </div>
            <ul class="m-0 list-none p-0 font-mono text-[11px] tabular-nums">
              <li
                v-for="(row, i) in klineMarketTrades"
                :key="'kt-' + i"
                class="grid grid-cols-3 items-center py-1.5 text-white/80"
              >
                <span class="text-white/45">{{ row.time }}</span>
                <span
                  class="text-center"
                  :class="row.isBuy ? 'text-[#4ade80]' : 'text-[#f87171]'"
                >
                  {{ row.price }}
                </span>
                <span class="text-right">{{ row.qty }}</span>
              </li>
            </ul>
          </div>
        </section>

        <!-- K 线收起：参考 MDFEX 左表单 + 右盘口；scroll-mt 对齐顶栏 sticky + 本页交易条，避免滚入后被挡住 -->
        <div
          v-show="!chartExpanded"
          id="mobile-order-anchor"
          class="flex scroll-mt-[7.75rem] gap-2.5"
        >
          <div class="min-w-0 flex-[1.12] space-y-2 py-0.5 pl-0.5 pr-0">
            <div v-if="isContract" class="flex flex-wrap gap-1.5 text-[10px] text-white/45">
              <span class="rounded border border-white/[0.06] px-1.5 py-0.5">全仓</span>
              <span class="rounded border border-white/[0.06] px-1.5 py-0.5">{{ leverage }}×</span>
            </div>

            <div class="grid grid-cols-2 gap-1">
              <template v-if="isContract">
                <button
                  type="button"
                  class="rounded-md py-2.5 text-[13px] font-bold transition"
                  :class="
                    positionSide === 'long'
                      ? 'bg-gradient-to-b from-[#1a4d38]/95 to-[#0d281c] text-[#4ade80] shadow-[inset_0_1px_0_rgba(74,222,128,0.15)] ring-1 ring-[#4ade80]/35'
                      : 'bg-[#1a1a1a] text-white/38'
                  "
                  @click="positionSide = 'long'"
                >
                  做多
                </button>
                <button
                  type="button"
                  class="rounded-md py-2.5 text-[13px] font-bold transition"
                  :class="
                    positionSide === 'short'
                      ? 'bg-gradient-to-b from-[#4a2529]/95 to-[#30181c] text-[#fca5a5] shadow-[inset_0_1px_0_rgba(252,165,165,0.12)] ring-1 ring-[#f87171]/35'
                      : 'bg-[#1a1a1a] text-white/38'
                  "
                  @click="positionSide = 'short'"
                >
                  做空
                </button>
              </template>
              <template v-else>
                <button
                  type="button"
                  class="rounded-md py-2.5 text-[13px] font-bold transition"
                  :class="
                    positionSide === 'long'
                      ? 'bg-gradient-to-b from-[#1a4d38]/95 to-[#0d281c] text-[#4ade80] shadow-[inset_0_1px_0_rgba(74,222,128,0.15)] ring-1 ring-[#4ade80]/35'
                      : 'bg-[#1a1a1a] text-white/38'
                  "
                  @click="positionSide = 'long'"
                >
                  买入
                </button>
                <button
                  type="button"
                  class="rounded-md py-2.5 text-[13px] font-bold transition"
                  :class="
                    positionSide === 'short'
                      ? 'bg-gradient-to-b from-[#4a2529]/95 to-[#30181c] text-[#fca5a5] shadow-[inset_0_1px_0_rgba(252,165,165,0.12)] ring-1 ring-[#f87171]/35'
                      : 'bg-[#1a1a1a] text-white/38'
                  "
                  @click="positionSide = 'short'"
                >
                  卖出
                </button>
              </template>
            </div>

            <button
              type="button"
              class="flex w-full items-center justify-between gap-2 rounded-md border border-white/[0.05] bg-[#141414] px-2.5 py-2 text-left text-[13px] text-white active:bg-[#1a1a1a]"
              @click="openMobilePicker('orderType')"
            >
              <span>{{ orderType === 'market' ? '市价' : '限价' }}</span>
              <svg
                class="h-4 w-4 shrink-0 text-white/30"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="m6 9 6 6 6-6"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>

            <div v-if="tradeMode === 'perpetual'" class="flex items-center gap-2">
              <span class="shrink-0 text-[10px] text-white/40">杠杆</span>
              <button
                type="button"
                class="flex min-w-0 flex-1 items-center justify-between gap-1 rounded-md border border-white/[0.05] bg-[#141414] px-2 py-1.5 text-left text-[12px] text-white active:bg-[#1a1a1a]"
                @click="openMobilePicker('leverage')"
              >
                <span>{{ leverage }}×</span>
                <svg
                  class="h-3.5 w-3.5 shrink-0 text-white/30"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="m6 9 6 6 6-6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div v-if="tradeMode === 'delivery'">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-2 rounded-md border border-white/[0.05] bg-[#141414] px-2 py-1.5 text-left text-[11px] text-white active:bg-[#1a1a1a]"
                @click="openMobilePicker('delivery')"
              >
                <span class="line-clamp-2 min-w-0">{{ selectedDeliveryPeriod }}</span>
                <svg
                  class="h-3.5 w-3.5 shrink-0 text-white/30"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="m6 9 6 6 6-6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div class="space-y-1">
              <input
                v-if="orderType === 'limit'"
                v-model="orderPrice"
                type="text"
                inputmode="decimal"
                :placeholder="lastPrice"
                class="w-full rounded-md border border-white/[0.05] bg-[#141414] px-2.5 py-2.5 font-mono text-[14px] font-semibold tabular-nums text-white placeholder:text-white/25 focus:border-[#4ade80]/50 focus:outline-none"
              />
              <input
                v-else
                type="text"
                readonly
                :value="lastPrice"
                class="w-full cursor-default rounded-md border border-white/[0.05] bg-[#141414] px-2.5 py-2.5 font-mono text-[14px] font-semibold tabular-nums text-white/90"
              />
              <p class="text-[10px] text-white/35">≈ ${{ lastPrice }}</p>
            </div>

            <template v-if="tradeMode === 'spot'">
              <div class="relative">
                <input
                  v-model="qtyQuote"
                  type="text"
                  inputmode="decimal"
                  placeholder="请输入数量"
                  class="w-full rounded-md border border-white/[0.05] bg-[#141414] py-2.5 pl-2.5 pr-10 text-[13px] text-white placeholder:text-white/25 focus:border-[#4ade80]/50 focus:outline-none"
                />
                <span
                  class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-white/35"
                >
                  {{ activePair.quote }}
                </span>
              </div>
            </template>
            <template v-else>
              <div class="relative">
                <input
                  v-model="quantity"
                  type="text"
                  inputmode="decimal"
                  :placeholder="tradeMode === 'perpetual' ? '数量(张)' : '请输入数量'"
                  class="w-full rounded-md border border-white/[0.05] bg-[#141414] py-2.5 pl-2.5 pr-9 text-[13px] text-white placeholder:text-white/25 focus:border-[#4ade80]/50 focus:outline-none"
                />
                <span
                  class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/35"
                >
                  {{ tradeMode === 'perpetual' ? '张' : activePair.base }}
                </span>
              </div>
            </template>

            <div class="grid grid-cols-4 gap-1">
              <button
                v-for="p in [25, 50, 75, 100]"
                :key="p"
                type="button"
                class="rounded border border-white/[0.09] bg-transparent py-2 text-[11px] font-semibold text-white/50 active:bg-white/[0.05]"
                @click="setQtyPct(p)"
              >
                {{ p }}%
              </button>
            </div>

            <template v-if="tradeMode === 'perpetual'">
              <label class="flex cursor-pointer items-center gap-2 text-[11px] text-white/45">
                <input
                  v-model="tpSl"
                  type="checkbox"
                  class="h-3.5 w-3.5 rounded border-white/[0.11] bg-[#141414] text-[#4ade80] accent-[#4ade80]"
                />
                止盈止损
              </label>
              <div v-if="tpSl" class="space-y-1">
                <input
                  v-model="takeProfitPrice"
                  type="text"
                  inputmode="decimal"
                  :placeholder="`止盈 ${activePair.quote}`"
                  class="w-full rounded-md border border-white/[0.05] bg-[#141414] px-2 py-1.5 text-center text-[11px] text-white placeholder:text-white/25 focus:border-[#4ade80]/45 focus:outline-none"
                />
                <input
                  v-model="stopLossPrice"
                  type="text"
                  inputmode="decimal"
                  :placeholder="`止损 ${activePair.quote}`"
                  class="w-full rounded-md border border-white/[0.05] bg-[#141414] px-2 py-1.5 text-center text-[11px] text-white placeholder:text-white/25 focus:border-[#4ade80]/45 focus:outline-none"
                />
              </div>
            </template>

            <div
              v-if="tradeMode === 'delivery'"
              class="flex justify-between text-[10px] text-white/40"
            >
              <span>预计收益</span>
              <span class="font-mono text-white/55">--</span>
            </div>

            <button
              type="button"
              class="w-full rounded-lg py-2.5 text-[14px] font-bold shadow-lg transition active:opacity-90"
              :class="
                positionSide === 'long'
                  ? 'bg-[#58bd8c] text-black shadow-[#58bd8c]/25'
                  : 'bg-[#e85d5d] text-white shadow-[#e85d5d]/20'
              "
              @click="submitDemoOrder()"
            >
              {{ primaryCtaLabel }}
            </button>

            <div class="space-y-0.5 text-[10px] leading-relaxed text-white/40">
              <p>可用 0.00 {{ activePair.quote }}</p>
              <p v-if="tradeMode === 'spot'">可用 0.00 {{ activePair.base }}</p>
            </div>

            <p class="text-center text-[10px] text-white/25">演示数据，无真实成交</p>
          </div>

          <div
            class="flex min-h-[14rem] min-w-0 flex-[0.88] flex-col border-l border-white/[0.04] pl-2"
          >
            <div
              class="grid grid-cols-2 gap-0.5 pb-1.5 text-[10px] font-medium text-white/40"
            >
              <span>价格({{ activePair.quote }})</span>
              <span class="text-right">数量({{ activePair.base }})</span>
            </div>
            <div
              class="trade-pair-scroll max-h-[min(50vh,22rem)] flex-1 overflow-y-auto overscroll-contain pr-0.5 [-webkit-overflow-scrolling:touch]"
            >
              <ul class="m-0 list-none p-0">
                <li
                  v-for="(row, i) in depthAsks"
                  :key="'ma2-' + i"
                  class="relative grid grid-cols-2 py-[3px] font-mono text-[11px] tabular-nums leading-tight"
                >
                  <div
                    class="pointer-events-none absolute inset-y-0 right-0 bg-emerald-500/[0.14]"
                    :style="{ width: `${row.bar}%` }"
                  />
                  <span class="relative text-[#4ade80]">{{ row.p }}</span>
                  <span class="relative text-right text-white/55">{{ row.q }}</span>
                </li>
              </ul>
              <div
                class="sticky top-0 z-[1] border-y border-white/[0.05] bg-black py-2 text-center font-mono text-[13px] font-bold tabular-nums text-white"
              >
                {{ lastPrice }}
              </div>
              <ul class="m-0 list-none p-0">
                <li
                  v-for="(row, i) in depthBids"
                  :key="'mb2-' + i"
                  class="relative grid grid-cols-2 py-[3px] font-mono text-[11px] tabular-nums leading-tight"
                >
                  <div
                    class="pointer-events-none absolute inset-y-0 right-0 bg-rose-500/[0.14]"
                    :style="{ width: `${row.bar}%` }"
                  />
                  <span class="relative text-[#f87171]">{{ row.p }}</span>
                  <span class="relative text-right text-white/55">{{ row.q }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div v-show="!chartExpanded" class="mt-3 border-t border-white/[0.04] pt-1">
          <div class="flex text-[13px] font-medium">
            <button
              type="button"
              class="flex-1 py-2.5 transition"
              :class="
                tradeBottomTab === 'orders'
                  ? 'border-b-2 border-[#4ade80] text-[#4ade80]'
                  : 'border-b-2 border-transparent text-white/40'
              "
              @click="tradeBottomTab = 'orders'"
            >
              当前委托
            </button>
            <button
              type="button"
              class="flex-1 py-2.5 transition"
              :class="
                tradeBottomTab === 'trades'
                  ? 'border-b-2 border-[#4ade80] text-[#4ade80]'
                  : 'border-b-2 border-transparent text-white/40'
              "
              @click="tradeBottomTab = 'trades'"
            >
              历史订单
            </button>
          </div>
          <div
            class="trade-pair-scroll max-h-[min(40vh,16rem)] overflow-y-auto overscroll-contain px-0.5"
          >
            <ul
              v-if="tradeBottomTab === 'orders'"
              class="m-0 list-none divide-y divide-white/[0.06] p-0"
            >
              <li
                v-for="row in mobileDemoOpenOrders"
                :key="'m-' + row.id"
                class="py-2.5 first:pt-1"
              >
                <div class="mb-1 flex items-start justify-between gap-2">
                  <div class="min-w-0 flex flex-wrap items-center gap-1.5">
                    <span
                      class="text-[12px] font-semibold"
                      :class="row.sideLong ? 'text-[#4ade80]' : 'text-[#f87171]'"
                    >
                      {{ row.sideLabel }}
                    </span>
                    <span class="text-[10px] text-white/35">{{ row.pair }}</span>
                    <span
                      class="rounded bg-white/[0.06] px-1 py-px text-[10px] text-white/45"
                    >
                      {{ row.modeTag }}
                    </span>
                  </div>
                  <span class="shrink-0 font-mono text-[10px] text-white/35">{{
                    row.time
                  }}</span>
                </div>
                <p class="font-mono text-[10px] leading-relaxed text-white/55">
                  <span class="text-white/40">{{ row.type }}</span>
                  <span class="mx-1 text-white/20">·</span>
                  <span>{{ row.price }}</span>
                  <span class="mx-1 text-white/20">·</span>
                  <span>{{ row.amount }}</span>
                </p>
                <p class="mt-1 text-[10px] text-white/35">已成交 {{ row.filled }}</p>
              </li>
            </ul>
            <ul
              v-else
              class="m-0 list-none divide-y divide-white/[0.06] p-0"
            >
              <li
                v-for="row in mobileDemoHistOrders"
                :key="'mh-' + row.id"
                class="py-2.5 first:pt-1"
              >
                <div class="mb-1 flex items-start justify-between gap-2">
                  <span
                    class="text-[12px] font-semibold"
                    :class="row.sideLong ? 'text-[#4ade80]' : 'text-[#f87171]'"
                  >
                    {{ row.sideLabel }}
                  </span>
                  <span class="shrink-0 font-mono text-[10px] text-white/35">{{
                    row.time
                  }}</span>
                </div>
                <p class="font-mono text-[10px] leading-relaxed text-white/55">
                  <span class="text-white/40">{{ row.type }}</span>
                  <span class="mx-1 text-white/20">·</span>
                  <span>{{ row.price }}</span>
                  <span class="mx-1 text-white/20">·</span>
                  <span>{{ row.amount }}</span>
                </p>
                <p
                  class="mt-1 text-[10px]"
                  :class="
                    row.status === '已撤销' ? 'text-amber-400/90' : 'text-white/40'
                  "
                >
                  {{ row.status }}
                </p>
              </li>
            </ul>
          </div>
        </div>

        <p class="mt-2 text-center text-[10px] text-white/25">
          行情与盘口为演示数据
        </p>
      </div>

      <!-- K 线展开：底部悬浮做多/做空（或买/卖），点击进入下单页填数量，不在此直接成交 -->
      <div
        v-show="chartExpanded"
        class="fixed left-0 right-0 z-[35] border-t border-white/[0.05] bg-black/95 px-3 py-2 shadow-[0_-12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md lg:hidden"
        :style="{ bottom: 'calc(0.5rem + 3.5rem + 0.6rem + env(safe-area-inset-bottom, 0px))' }"
      >
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="flex min-h-[46px] items-center justify-center rounded-lg bg-[#58bd8c] text-[14px] font-bold text-black active:opacity-90"
            @click="leaveChartToOrder('long')"
          >
            {{ isContract ? '做多买入' : '买入' }}
          </button>
          <button
            type="button"
            class="flex min-h-[46px] items-center justify-center rounded-lg bg-[#e85d5d] text-[14px] font-bold text-white active:opacity-90"
            @click="leaveChartToOrder('short')"
          >
            {{ isContract ? '做空卖出' : '卖出' }}
          </button>
        </div>
      </div>

    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="pairDrawerOpen"
          class="fixed inset-0 z-[60] bg-black/55 backdrop-blur-[1px] lg:hidden"
          aria-hidden="true"
          @click="closePairDrawer"
        />
      </Transition>
      <Transition name="slide-left">
        <aside
          v-if="pairDrawerOpen"
          class="trade-pair-drawer-panel fixed bottom-0 left-0 top-0 z-[61] flex h-full w-[min(18rem,86vw)] max-w-[100vw] flex-col border-r border-[#1f2429] bg-[#0b0e11] shadow-2xl shadow-black/50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="trade-pair-drawer-title"
          @click.stop
        >
          <div
            class="flex shrink-0 items-center justify-between gap-2 border-b border-[#1f2429] bg-[#0b0e11]/95 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))]"
          >
            <div class="min-w-0 px-2">
              <h2 id="trade-pair-drawer-title" class="text-sm font-semibold text-lime-300">
                市场与交易对
              </h2>
              <p class="mt-0.5 text-[11px] text-[#848e9c]">先选品种，再选具体交易对</p>
            </div>
            <button
              type="button"
              class="rounded-lg p-2 text-[#848e9c] transition hover:bg-white/[0.08] hover:text-white"
              aria-label="关闭"
              @click="closePairDrawer"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="m6 6 12 12M18 6 6 18"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>
          <div
            class="shrink-0 border-b border-[#1f2429] px-2 py-2.5"
            role="tablist"
            aria-label="交易品种"
          >
            <div class="grid grid-cols-3 gap-1 rounded-lg bg-[#141414] p-0.5 ring-1 ring-white/[0.06]">
              <button
                v-for="t in assetClassTabItems"
                :key="t.key"
                type="button"
                role="tab"
                :aria-selected="pickerDraftAssetClass === t.key"
                class="touch-manipulation rounded-md py-2 text-center text-[11px] font-semibold leading-none transition [-webkit-tap-highlight-color:transparent] focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[#141414] active:opacity-90"
                :class="
                  pickerDraftAssetClass === t.key
                    ? 'bg-white/[0.1] text-lime-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                    : 'text-white/45 hover:bg-white/[0.04] hover:text-white/75'
                "
                @click="pickerDraftAssetClass = t.key"
              >
                {{ t.label }}
              </button>
            </div>
          </div>
          <ul
            class="trade-pair-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-2 py-3 pr-2.5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
            role="listbox"
            aria-label="交易对列表"
          >
            <li v-for="(p, i) in pickerDraftPairs" :key="p.base + p.quote">
              <button
                type="button"
                role="option"
                :aria-selected="isMobileDrawerPairSelected(i)"
                class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition"
                :class="
                  isMobileDrawerPairSelected(i)
                    ? 'bg-lime-400/10 text-lime-200'
                    : 'text-[#eaecef] hover:bg-white/[0.06]'
                "
                @click="selectPair(i)"
              >
                <span
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1f2429] text-[11px] font-bold uppercase tracking-tight text-lime-400/90"
                  aria-hidden="true"
                >
                  {{ pairListBadge(p.base) }}
                </span>
                <span class="min-w-0 flex-1 truncate font-mono tabular-nums">{{ p.base }} / {{ p.quote }}</span>
                <svg
                  v-if="isMobileDrawerPairSelected(i)"
                  class="h-5 w-5 shrink-0 text-lime-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M20 6 9 17l-5-5"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </li>
          </ul>
        </aside>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="mobilePickerOpen"
          :class="['fixed inset-0 z-[62] lg:hidden', frontSheetBackdropPaintOnly]"
          @click="closeMobilePicker"
        />
      </Transition>
      <Transition name="slide-up">
        <div
          v-if="mobilePickerOpen"
          :class="`fixed bottom-0 left-0 right-0 z-[63] max-h-[min(70vh,28rem)] flex flex-col pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-2 lg:hidden ${frontSheetPanelShellClass}`"
          role="dialog"
          :aria-label="mobilePickerTitle"
        >
          <div :class="['mx-auto mb-2', frontSheetDragHandleClass]" />
          <p class="shrink-0 px-4 pb-2 text-center text-sm font-semibold text-white">
            {{ mobilePickerTitle }}
          </p>
          <ul class="trade-pair-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pr-2.5">
            <li
              v-for="opt in mobilePickerOptionList"
              :key="String(opt.value)"
              :class="frontSheetListItemBorderClass"
            >
              <button type="button" :class="frontSheetListRowBtnClass" @click="confirmMobilePick(opt.value)">
                <span class="min-w-0 flex-1 pr-2 leading-snug">{{ opt.label }}</span>
                <svg
                  v-if="isMobilePickerOptionSelected(opt.value)"
                  class="h-5 w-5 shrink-0 text-lime-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M20 6 9 17l-5-5"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </li>
          </ul>
          <button type="button" :class="frontSheetCancelBtnClass" @click="closeMobilePicker">
            取消
          </button>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="modeSheetOpen"
          :class="['fixed inset-0 z-[60] lg:hidden', frontSheetBackdropPaintOnly]"
          @click="closeModeSheet"
        />
      </Transition>
      <Transition name="slide-up">
        <div
          v-if="modeSheetOpen"
          :class="`fixed bottom-0 left-0 right-0 z-[61] flex flex-col pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-2 lg:hidden ${frontSheetPanelShellClass}`"
          role="dialog"
          aria-label="选择交易类型"
        >
          <div :class="['mx-auto mb-2', frontSheetDragHandleClass]" />
          <ul class="px-2">
            <li v-for="t in tradeTabs" :key="t.key" :class="frontSheetListItemBorderClass">
              <button type="button" :class="frontSheetListRowBtnClass" @click="goMode(t.key)">
                {{ t.label }}
                <svg
                  v-if="tradeMode === t.key"
                  class="h-5 w-5 shrink-0 text-lime-400"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M20 6 9 17l-5-5"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </li>
          </ul>
          <button type="button" :class="frontSheetCancelBtnClass" @click="closeModeSheet">
            取消
          </button>
        </div>
      </Transition>
      <Transition name="fade">
        <div
          v-if="orderToast"
          class="fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-[80] max-w-[min(92vw,24rem)] -translate-x-1/2 px-3"
          role="status"
        >
          <p
            class="rounded-xl bg-[#1e2329] px-4 py-2.5 text-center text-sm leading-snug text-white shadow-lg ring-1 ring-white/10"
          >
            {{ orderToast }}
          </p>
        </div>
      </Transition>
    </Teleport>

    <VerificationRequiredDialog
      v-model="tradeVerificationDialogOpen"
      :user-level="tradeKycUserLevelForDialog"
      :required-level="VERIFICATION_LEVEL.BASIC"
      feature-name="交易下单"
      :verify-href="`${prefix}/personal-center/verification`"
      dark
    >
      <template #afterActions>
        <p class="text-center text-[11px] leading-relaxed text-white/50">
          演示环境：
          <button
            type="button"
            class="text-lime-300/95 underline decoration-lime-400/35 underline-offset-2 hover:text-lime-200"
            @click="markTradeKycApprovedDemo"
          >
            模拟已通过初级认证
          </button>
        </p>
      </template>
    </VerificationRequiredDialog>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.24s ease;
}
.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
}
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.24s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

/* PC 左下：表头吸顶（sticky 写在 th 上，且祖先不能有 overflow:hidden） */
.pc-bottom-data-table thead th {
  position: -webkit-sticky;
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: #0b0e11;
  box-shadow: 0 4px 14px -2px rgba(0, 0, 0, 0.55);
}
</style>
