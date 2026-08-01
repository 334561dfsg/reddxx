<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { deliveryContractsData, deliveryMarketOverview } from '../../../admin/mock/deliveryReport'
import { createPerpetualControlContractsMock } from '../../../admin/mock/perpetualControl'
import { PERP_CONTROL_OFFSET_DIRECTION } from '../../../admin/constants/perpetualControl'
import PerpetualManualLineModal from '../../../admin/components/PerpetualManualLineModal.vue'
import HarvestControlPanel from '../../../admin/components/HarvestControlPanel.vue'

const router = useRouter()

const activeTab = ref('overview')
const lastRefreshAt = ref('')
const refreshIntervalMs = ref(2000)
const marketPrices = ref({})

const metricLabel = {
  VOLUME: '24h交易量',
  LONG: '多头持仓',
  SHORT: '空头持仓',
  NET: '净持仓',
  RATIO: '多空比',
  LONG_PNL: '做多盈亏',
  SHORT_PNL: '做空盈亏',
  PLATFORM_PNL: '平台盈亏'
}

const parseCompactUsd = (value) => {
  if (typeof value === 'number') return value
  if (!value) return 0
  const raw = String(value).trim()
  const sign = raw.startsWith('-') ? -1 : 1
  const normalized = raw.replace(/[+$,\s]/g, '').replace('-', '')
  const unit = normalized.slice(-1).toUpperCase()
  const num = Number(unit === 'K' || unit === 'M' || unit === 'B' ? normalized.slice(0, -1) : normalized)
  if (!Number.isFinite(num)) return 0
  const scale = unit === 'K' ? 1e3 : unit === 'M' ? 1e6 : unit === 'B' ? 1e9 : 1
  return sign * num * scale
}

const formatCompactUsd = (value, withSign = false) => {
  const n = Number(value || 0)
  const sign = n < 0 ? '-' : '+'
  const abs = Math.abs(n)
  let unit = ''
  let scaled = abs
  let digits = 0
  if (abs >= 1e9) {
    unit = 'B'
    scaled = abs / 1e9
    digits = 2
  } else if (abs >= 1e6) {
    unit = 'M'
    scaled = abs / 1e6
    digits = 2
  } else if (abs >= 1e3) {
    unit = 'K'
    scaled = abs / 1e3
    digits = 1
  }
  const body = `${scaled.toFixed(digits)}${unit}`
  return `${withSign ? sign : ''}$${body}`
}

const formatNumber = (value) => {
  const n = Number(value || 0)
  return new Intl.NumberFormat('en-US').format(n)
}

const jitter = (base, pct) => {
  const b = Number(base || 0)
  const factor = 1 + (Math.random() * 2 - 1) * pct
  return b * factor
}

const ensureNonZeroSigned = (raw, minAbs) => {
  const v = Number(raw || 0)
  const abs = Math.abs(v)
  if (abs >= minAbs) return v
  const sign = v === 0 ? (Math.random() > 0.5 ? 1 : -1) : v > 0 ? 1 : -1
  return sign * minAbs
}

const getMetric = (contract, label) => {
  return (contract.metrics || []).find((m) => m.label === label) || null
}

const upsertMetric = (contract, label, next) => {
  const metrics = Array.isArray(contract.metrics) ? contract.metrics : []
  const idx = metrics.findIndex((m) => m.label === label)
  if (idx === -1) return [...metrics, { label, ...next }]
  const updated = metrics.slice()
  updated[idx] = { ...updated[idx], ...next }
  return updated
}

const ensurePerpMetrics = (contract) => {
  const seed = String(contract.symbol || contract.id || '')
    .split('')
    .reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  const baseVol = 8_000_000 + (seed % 45) * 900_000
  const baseLong = 650_000 + (seed % 30) * 85_000
  const baseShort = 600_000 + (seed % 28) * 80_000
  const net = baseLong - baseShort
  const ratio = baseShort > 0 ? baseLong / baseShort : 1
  const longPnl = ensureNonZeroSigned((seed % 2 === 0 ? 1 : -1) * (9_000 + (seed % 60) * 620), 500)
  const shortPnl = ensureNonZeroSigned((seed % 3 === 0 ? 1 : -1) * (7_000 + (seed % 55) * 540), 500)
  const platformPnl = longPnl + shortPnl

  const existing = Array.isArray(contract.metrics) ? contract.metrics : []
  const byLabel = new Map(existing.map((m) => [m.label, { ...m }]))
  const getOr = (label, fallback) => {
    const hit = byLabel.get(label)
    return hit ? { ...fallback, ...hit } : fallback
  }

  return [
    getOr(metricLabel.LONG, { label: metricLabel.LONG, value: formatCompactUsd(baseLong) }),
    getOr(metricLabel.SHORT, { label: metricLabel.SHORT, value: formatCompactUsd(baseShort) }),
    getOr(metricLabel.NET, { label: metricLabel.NET, value: formatCompactUsd(net, true) }),
    getOr(metricLabel.RATIO, { label: metricLabel.RATIO, value: ratio.toFixed(2) }),
    getOr(metricLabel.VOLUME, { label: metricLabel.VOLUME, value: formatCompactUsd(baseVol) }),
    getOr(metricLabel.LONG_PNL, { label: metricLabel.LONG_PNL, value: formatCompactUsd(longPnl, true) }),
    getOr(metricLabel.SHORT_PNL, { label: metricLabel.SHORT_PNL, value: formatCompactUsd(shortPnl, true) }),
    getOr(metricLabel.PLATFORM_PNL, { label: metricLabel.PLATFORM_PNL, value: formatCompactUsd(platformPnl, true) })
  ]
}

const perpContracts = ref(createPerpetualControlContractsMock().map((c) => ({ ...c, metrics: ensurePerpMetrics(c) })))
const deliveryContracts = ref(deliveryContractsData.map((c) => ({ ...c })))
const deliveryOverview = ref({ ...deliveryMarketOverview })

const baseMarketPrice = (symbol) => {
  const s = String(symbol || '')
  if (s.includes('BTC')) return 50000
  if (s.includes('ETH')) return 3000
  if (s.includes('SOL')) return 100
  const seed = s.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return 500 + (seed % 4500)
}

const marketVolatilityPct = (symbol) => {
  const s = String(symbol || '')
  if (s.includes('BTC')) return 0.0015
  if (s.includes('ETH')) return 0.002
  if (s.includes('SOL')) return 0.0035
  return 0.0025
}

const showPerpManualModal = ref(false)
const manualContractId = ref('')
const manualInitialConfig = ref({})
const manualInitialDurationSec = ref(1800)

const showDeliveryHarvestPanel = ref(false)
const deliveryHarvestRow = ref(null)

const manualOverrides = ref({})
const manualTimers = new Map()

const clearManualTimer = (contractId) => {
  const t = manualTimers.get(contractId)
  if (t) clearTimeout(t)
  manualTimers.delete(contractId)
}

const isManualActive = (contractId) => Boolean(manualOverrides.value[contractId])

const revertManual = (contractId) => {
  const entry = manualOverrides.value[contractId]
  if (!entry) return
  clearManualTimer(contractId)
  perpContracts.value = perpContracts.value.map((c) => {
    if (c.id !== contractId) return c
    return { ...c, config: { ...entry.baseConfig } }
  })
  const next = { ...manualOverrides.value }
  delete next[contractId]
  manualOverrides.value = next
}

const scheduleManualExpiry = (contractId, durationSec) => {
  clearManualTimer(contractId)
  if (!Number(durationSec) || Number(durationSec) <= 0) return
  const handle = setTimeout(() => revertManual(contractId), Number(durationSec) * 1000)
  manualTimers.set(contractId, handle)
}

const manualContract = computed(() => perpContracts.value.find((c) => c.id === manualContractId.value) || null)

const manualContractMetrics = computed(() => {
  const c = manualContract.value
  return {
    volume: getMetric(c || {}, metricLabel.VOLUME)?.value || '-',
    long: getMetric(c || {}, metricLabel.LONG)?.value || '-',
    short: getMetric(c || {}, metricLabel.SHORT)?.value || '-',
    net: getMetric(c || {}, metricLabel.NET)?.value || '-',
    ratio: getMetric(c || {}, metricLabel.RATIO)?.value || '-',
    platformPnl: getMetric(c || {}, metricLabel.PLATFORM_PNL)?.value || '-'
  }
})

const manualBasePrice = computed(() => {
  const contract = manualContract.value
  const id = contract?.id
  if (id && marketPrices.value[id]) return Number(marketPrices.value[id])
  const symbol = contract?.symbol || id || 'BTCUSDT'
  return baseMarketPrice(symbol)
})

const openPerpManualDialog = (contractId) => {
  const contract = perpContracts.value.find((c) => c.id === contractId)
  if (!contract) return
  manualContractId.value = contractId
  manualInitialConfig.value = {
    priceOffset: Number(contract?.config?.priceOffset ?? 5),
    offsetDirection: contract?.config?.offsetDirection ?? PERP_CONTROL_OFFSET_DIRECTION.AGAINST,
    slippagePct: 0,
    latencyMs: 0
  }
  manualInitialDurationSec.value = 0
  showPerpManualModal.value = true
}

const closePerpManualDialog = () => {
  showPerpManualModal.value = false
  manualContractId.value = ''
}

const onRemovePerpManual = ({ contractId }) => {
  if (!contractId) return
  revertManual(contractId)
  closePerpManualDialog()
}

const applyPerpManual = ({ contractId, payload }) => {
  const contract = perpContracts.value.find((c) => c.id === contractId)
  if (!contract) return
  const id = contract.id
  const existing = manualOverrides.value[id]
  const baseConfig = existing?.baseConfig ? { ...existing.baseConfig } : { ...contract.config }
  const durationSec = Number(payload?.durationSec || 0)
  const overrideConfig = {
    ...contract.config,
    priceOffset: Number(payload?.priceOffset || 0),
    offsetDirection: payload?.offsetDirection ?? PERP_CONTROL_OFFSET_DIRECTION.AGAINST,
    slippagePct: Number(payload?.slippagePct || 0),
    latencyMs: Number(payload?.latencyMs || 0)
  }

  manualOverrides.value = {
    ...manualOverrides.value,
    [id]: { baseConfig, overrideConfig, startedAt: Date.now(), durationSec }
  }

  perpContracts.value = perpContracts.value.map((c) => (c.id === id ? { ...c, config: { ...overrideConfig } } : c))
  scheduleManualExpiry(id, durationSec)
  alert('手动插线已生效！')
  closePerpManualDialog()
}

const refreshData = () => {
  const now = Date.now()
  const nextMarketPrices = { ...marketPrices.value }

  perpContracts.value = perpContracts.value.map((contract) => {
    const next = { ...contract }
    const metrics = ensurePerpMetrics(next)

    const contractId = next.id
    const symbol = next.symbol || next.id
    const prevPrice = Number(nextMarketPrices[contractId] ?? baseMarketPrice(symbol))
    const vol = marketVolatilityPct(symbol)
    const nextPrice = Math.max(0.0001, prevPrice * (1 + (Math.random() * 2 - 1) * vol))
    nextMarketPrices[contractId] = nextPrice

    const long = jitter(parseCompactUsd(getMetric({ metrics }, metricLabel.LONG)?.value), 0.012)
    const short = jitter(parseCompactUsd(getMetric({ metrics }, metricLabel.SHORT)?.value), 0.012)
    const net = long - short
    const ratio = short > 0 ? long / short : 1
    const volume = jitter(parseCompactUsd(getMetric({ metrics }, metricLabel.VOLUME)?.value), 0.03)
    const longPnl = ensureNonZeroSigned(jitter(parseCompactUsd(getMetric({ metrics }, metricLabel.LONG_PNL)?.value), 0.08), 500)
    const shortPnl = ensureNonZeroSigned(jitter(parseCompactUsd(getMetric({ metrics }, metricLabel.SHORT_PNL)?.value), 0.08), 500)
    const platformPnl = longPnl + shortPnl

    let updated = metrics
    updated = upsertMetric({ metrics: updated }, metricLabel.LONG, { value: formatCompactUsd(long) })
    updated = upsertMetric({ metrics: updated }, metricLabel.SHORT, { value: formatCompactUsd(short) })
    updated = upsertMetric({ metrics: updated }, metricLabel.NET, { value: formatCompactUsd(net, true) })
    updated = upsertMetric({ metrics: updated }, metricLabel.RATIO, { value: ratio.toFixed(2) })
    updated = upsertMetric({ metrics: updated }, metricLabel.VOLUME, { value: formatCompactUsd(volume) })
    updated = upsertMetric({ metrics: updated }, metricLabel.LONG_PNL, { value: formatCompactUsd(longPnl, true) })
    updated = upsertMetric({ metrics: updated }, metricLabel.SHORT_PNL, { value: formatCompactUsd(shortPnl, true) })
    updated = upsertMetric({ metrics: updated }, metricLabel.PLATFORM_PNL, { value: formatCompactUsd(platformPnl, true) })

    next.metrics = updated
    return next
  })
  marketPrices.value = nextMarketPrices

  deliveryContracts.value = deliveryContracts.value.map((c) => {
    const next = { ...c }
    next.volume24h = Math.max(0, Math.round(jitter(next.volume24h, 0.03)))
    next.activeUsers = Math.max(0, Math.round(jitter(next.activeUsers, 0.02)))
    next.longPnl24h = Math.round(ensureNonZeroSigned(jitter(next.longPnl24h ?? 0, 0.08), 500))
    next.shortPnl24h = Math.round(ensureNonZeroSigned(jitter(next.shortPnl24h ?? 0, 0.08), 500))
    next.platformPnl24h = Number(next.longPnl24h || 0) + Number(next.shortPnl24h || 0)
    next.userPnl24h = -next.platformPnl24h
    return next
  })

  deliveryOverview.value = {
    ...deliveryOverview.value,
    totalVolume24h: deliveryContracts.value.reduce((sum, c) => sum + Number(c.volume24h || 0), 0),
    activeUsers24h: deliveryContracts.value.reduce((sum, c) => sum + Number(c.activeUsers || 0), 0),
    longPnl24h: deliveryContracts.value.reduce((sum, c) => sum + Number(c.longPnl24h || 0), 0),
    shortPnl24h: deliveryContracts.value.reduce((sum, c) => sum + Number(c.shortPnl24h || 0), 0),
    platformPnl24h: deliveryContracts.value.reduce((sum, c) => sum + Number(c.platformPnl24h || 0), 0)
  }

  lastRefreshAt.value = new Date(now).toISOString().replace('T', ' ').split('.')[0]
}

let timer = null
onMounted(() => {
  refreshData()
  timer = setInterval(() => refreshData(), Number(refreshIntervalMs.value))
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  timer = null
  for (const [, t] of manualTimers.entries()) clearTimeout(t)
  manualTimers.clear()
})

const perpPlatformPnl = computed(() => {
  return perpContracts.value.reduce((sum, c) => sum + parseCompactUsd(getMetric(c, metricLabel.PLATFORM_PNL)?.value), 0)
})

const perpLongPnl = computed(() => {
  return perpContracts.value.reduce((sum, c) => sum + parseCompactUsd(getMetric(c, metricLabel.LONG_PNL)?.value), 0)
})

const perpShortPnl = computed(() => {
  return perpContracts.value.reduce((sum, c) => sum + parseCompactUsd(getMetric(c, metricLabel.SHORT_PNL)?.value), 0)
})

const perpVolume24h = computed(() => {
  return perpContracts.value.reduce((sum, c) => sum + parseCompactUsd(getMetric(c, metricLabel.VOLUME)?.value), 0)
})

const deliveryPlatformPnl = computed(() => deliveryOverview.value.platformPnl24h || 0)
const deliveryLongPnl = computed(() => deliveryOverview.value.longPnl24h || 0)
const deliveryShortPnl = computed(() => deliveryOverview.value.shortPnl24h || 0)
const deliveryVolume24h = computed(() => deliveryOverview.value.totalVolume24h || 0)

const totalPlatformPnl = computed(() => perpPlatformPnl.value + deliveryPlatformPnl.value)
const totalLongPnl = computed(() => perpLongPnl.value + deliveryLongPnl.value)
const totalShortPnl = computed(() => perpShortPnl.value + deliveryShortPnl.value)
const totalVolume = computed(() => perpVolume24h.value + deliveryVolume24h.value)

const activeFilterLabel = computed(() => (activeTab.value === 'perpetual' ? '永续' : activeTab.value === 'delivery' ? '交割' : '综合概览'))
const selectedPlatformPnl = computed(() => (activeTab.value === 'perpetual' ? perpPlatformPnl.value : activeTab.value === 'delivery' ? deliveryPlatformPnl.value : totalPlatformPnl.value))
const selectedVolume = computed(() => (activeTab.value === 'perpetual' ? perpVolume24h.value : activeTab.value === 'delivery' ? deliveryVolume24h.value : totalVolume.value))

const unifiedContracts = computed(() => {
  const perps = perpContracts.value.map((c) => ({
    key: `perp-${c.id}`,
    product: '永续',
    contractId: c.id,
    symbol: c.symbol,
    name: c.alias,
    volume: parseCompactUsd(getMetric(c, metricLabel.VOLUME)?.value),
    platformPnl: parseCompactUsd(getMetric(c, metricLabel.PLATFORM_PNL)?.value),
    longAmount: parseCompactUsd(getMetric(c, metricLabel.LONG)?.value),
    shortAmount: parseCompactUsd(getMetric(c, metricLabel.SHORT)?.value),
    extra: `净持仓 ${getMetric(c, metricLabel.NET)?.value || '-'}`
  }))
  const delivery = deliveryContracts.value.map((c) => ({
    key: `delivery-${c.symbol}`,
    product: '交割',
    symbol: c.symbol,
    name: c.name,
    volume: Number(c.volume24h || 0),
    platformPnl: Number(c.platformPnl24h || 0),
    longAmount: Number(c.longPosition || 0),
    shortAmount: Number(c.shortPosition || 0),
    extra: `到期 ${c.expiryDate || '-'}`
  }))
  return [...perps, ...delivery].sort((a, b) => b.volume - a.volume)
})

const filteredUnifiedContracts = computed(() => {
  if (activeTab.value === 'perpetual') return unifiedContracts.value.filter((row) => row.product === '永续')
  if (activeTab.value === 'delivery') return unifiedContracts.value.filter((row) => row.product === '交割')
  return unifiedContracts.value
})

const filteredLongTotal = computed(() => filteredUnifiedContracts.value.reduce((sum, row) => sum + Number(row.longAmount || 0), 0))
const filteredShortTotal = computed(() => filteredUnifiedContracts.value.reduce((sum, row) => sum + Number(row.shortAmount || 0), 0))

const tabItems = [
  { key: 'overview', label: '综合概览' },
  { key: 'perpetual', label: '永续' },
  { key: 'delivery', label: '交割' }
]

const openPerpReport = () => router.push('/perpetual/manual-line')
const openDeliveryContracts = () => router.push('/delivery/harvest-control')

const secondsOf = (tierSec) => {
  const n = Number(tierSec || 0)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 60
}

const labelOf = (asset, tierSec) => `${String(asset || '').toUpperCase()}-${secondsOf(tierSec)}s`

const openDeliveryHarvestControl = (symbol) => {
  const keyRaw = String(symbol || '').toUpperCase()
  const m = keyRaw.match(/^([A-Z]+)(\d+)S$/)
  const asset = String(m?.[1] || keyRaw.replace(/\d+S$/i, '') || '').toUpperCase()
  const tierSec = secondsOf(m?.[2] || 60)
  const key = `${asset}${tierSec}S`

  const base =
    deliveryContracts.value.find((c) => String(c.symbol || '').toUpperCase() === key) ||
    deliveryContractsData.find((c) => String(c.symbol || '').toUpperCase() === key) ||
    null

  const marketPrice = baseMarketPrice(asset)
  const netPosition = Number(base?.netPosition ?? 0)
  const platformPnl24h = Number(base?.platformPnl24h ?? 0)
  const estLoss = Math.max(0, Math.abs(platformPnl24h) || 10_000)

  deliveryHarvestRow.value = {
    key,
    asset,
    tierSec,
    label: labelOf(asset, tierSec),
    marketPrice,
    remainSec: tierSec,
    estimatedLoss: estLoss,
    platformDelta: Number.isFinite(netPosition) ? netPosition : 0,
    pnlNow: platformPnl24h,
    volume24h: Number(base?.volume24h ?? 0),
    position: Number(base?.position ?? 0),
    activeUsers: Number(base?.activeUsers ?? 0),
    longShortRatio: Number(base?.longShortRatio ?? 0),
    controlActive: Boolean(base?.controlActive)
  }

  showDeliveryHarvestPanel.value = true
}

const onLockDeliveryHarvest = (payload) => {
  const modeLabel = payload?.mode === 'squeeze' ? '双向挤压' : payload?.mode === 'slippage' ? '滑点注入' : '强制结算价'
  alert(`已锁定：${payload?.label || '-'}\n模式：${modeLabel}\n（示意页面：未接真实接口）`)
}
</script>

<template>
  <section class="space-y-5">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">合约综合面板</h1>
        <p class="mt-1 text-sm text-slate-500">汇总永续/交割平台盈亏与关键风控指标，并提供手动控制入口</p>
      </div>
    </header>

    <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <button type="button" class="font-medium" :class="activeTab === t.key ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'" v-for="t in tabItems" :key="t.key" @click="activeTab = t.key">
          {{ t.label }}
        </button>
      </div>
      <div class="flex items-center gap-3 text-xs text-slate-500">
        <!-- <span>实时刷新 {{ Number(refreshIntervalMs) / 1000 }}s</span> -->
        <span>最后刷新：{{ lastRefreshAt || '-' }}</span>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">平台盈亏</p>
        <p class="mt-2 text-3xl font-bold font-mono" :class="selectedPlatformPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'">
          {{ formatCompactUsd(selectedPlatformPnl, true) }}
        </p>
        <p class="mt-2 text-xs text-slate-400">筛选：{{ activeFilterLabel }}</p>
      </article>

      <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">做多</p>
        <p class="mt-2 text-3xl font-bold font-mono text-emerald-600">
          {{ formatCompactUsd(totalLongPnl, true) }}
        </p>
        <div class="mt-3 flex items-center justify-between text-xs text-slate-400">
          <span>合约数</span>
          <span class="font-mono text-slate-600">{{ formatNumber(perpContracts.length) }}</span>
        </div>
      </article>

      <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">做空</p>
        <p class="mt-2 text-3xl font-bold font-mono text-rose-600">
          {{ formatCompactUsd(totalShortPnl, true) }}
        </p>
        <div class="mt-3 flex items-center justify-between text-xs text-slate-400">
          <span>临近到期</span>
          <span class="font-mono text-slate-600">{{ formatNumber(deliveryOverview.nearExpiryContracts || 0) }}</span>
        </div>
      </article>

      <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">当前筛选交易量</p>
        <p class="mt-2 text-2xl font-bold font-mono text-slate-900">${{ formatNumber(Math.round(selectedVolume)) }}</p>
      </article>
    </div>

    <article class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">合约概览</h2>
          <p class="mt-0.5 text-xs text-slate-500">按 24h 交易量排序TOP 10，筛选仅影响列表展示</p>
        </div>
        <div class="flex items-center gap-2">
          <button v-if="activeTab !== 'delivery'" type="button" class="ant-btn !h-9 !px-4" @click="openPerpReport">永续线控</button>
          <button v-if="activeTab !== 'perpetual'" type="button" class="ant-btn !h-9 !px-4" @click="openDeliveryContracts">交割场控</button>
        </div>
      </div>
      <div class="overflow-auto">
        <table class="w-full">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-5 py-3 text-left text-xs font-semibold text-slate-900 uppercase">产品线</th>
              <th class="px-5 py-3 text-left text-xs font-semibold text-slate-900 uppercase">合约</th>
              <th class="px-5 py-3 text-right text-xs font-semibold text-slate-900 uppercase">24h交易量</th>
              <th class="px-5 py-3 text-right text-xs font-semibold text-slate-900 uppercase">做多总额</th>
              <th class="px-5 py-3 text-right text-xs font-semibold text-slate-900 uppercase">做空总额</th>
              <th class="px-5 py-3 text-right text-xs font-semibold text-slate-900 uppercase">平台盈亏</th>
              <th class="px-5 py-3 text-left text-xs font-semibold text-slate-900 uppercase">风险摘要</th>
              <th class="px-5 py-3 text-right text-xs font-semibold text-slate-900 uppercase">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="row in filteredUnifiedContracts" :key="row.key" class="hover:bg-slate-50">
              <td class="px-5 py-4 text-sm font-semibold text-slate-900">{{ row.product }}</td>
              <td class="px-5 py-4">
                <p class="text-sm font-bold text-slate-900">{{ row.symbol }}</p>
                <p class="text-xs text-slate-500">{{ row.name }}</p>
              </td>
              <td class="px-5 py-4 text-right text-sm font-semibold text-slate-900">${{ formatNumber(Math.round(row.volume)) }}</td>
              <td class="px-5 py-4 text-right text-sm font-semibold text-emerald-700">${{ formatNumber(Math.round(row.longAmount || 0)) }}</td>
              <td class="px-5 py-4 text-right text-sm font-semibold text-rose-700">${{ formatNumber(Math.round(row.shortAmount || 0)) }}</td>
              <td class="px-5 py-4 text-right text-sm font-semibold">
                <span :class="row.platformPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'">{{ formatCompactUsd(row.platformPnl, true) }}</span>
              </td>
              <td class="px-5 py-4 text-sm text-slate-600">{{ row.extra }}</td>
              <td class="px-5 py-4 text-right">
                <button v-if="row.product === '永续'" type="button" class="ant-btn !h-9 !px-4" @click="openPerpManualDialog(row.contractId)">手动插线</button>
                <button v-else type="button" class="ant-btn !h-9 !px-4" @click="openDeliveryHarvestControl(row.symbol)">场控设置</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <PerpetualManualLineModal
      :open="showPerpManualModal"
      :contract-id="manualContractId"
      :contract-label="manualContract?.alias || ''"
      :base-price="manualBasePrice"
      :last-refresh-at="lastRefreshAt"
      :metrics="manualContractMetrics"
      :initial-config="manualInitialConfig"
      :initial-duration-sec="manualInitialDurationSec"
      :allow-remove="true"
      :is-manual-active="Boolean(manualContractId && isManualActive(manualContractId))"
      @close="closePerpManualDialog"
      @save="applyPerpManual"
      @remove="onRemovePerpManual"
    />

    <HarvestControlPanel v-model="showDeliveryHarvestPanel" :row="deliveryHarvestRow" @lock="onLockDeliveryHarvest" />
  </section>
</template>
