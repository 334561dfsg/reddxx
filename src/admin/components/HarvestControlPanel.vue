<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

const formatCompactNumber = (n, digits) => {
  const str = Number(n).toFixed(digits)
  return str.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

const formatCompactUsd = (value, withSign = false) => {
  const n = Number(value || 0)
  const sign = n < 0 ? '-' : n > 0 ? '+' : ''
  const abs = Math.abs(n)
  let unit = ''
  let scaled = abs
  let digits = 0
  if (abs >= 1e9) {
    unit = 'B'
    scaled = abs / 1e9
    digits = 1
  } else if (abs >= 1e6) {
    unit = 'M'
    scaled = abs / 1e6
    digits = 1
  } else if (abs >= 1e3) {
    unit = 'K'
    scaled = abs / 1e3
    digits = 1
  }
  const body = `${formatCompactNumber(scaled, digits)}${unit}`
  return `${withSign ? sign : ''}$${body}`
}

const formatPrice = (value) => {
  const v = Number(value || 0)
  if (!Number.isFinite(v)) return '-'
  const digits = v >= 1000 ? 2 : v >= 10 ? 3 : 5
  return v.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

const pad2 = (n) => String(n).padStart(2, '0')

const formatDateTime = (ts) => {
  const d = new Date(Number(ts || 0))
  if (Number.isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

const tickSizeFor = (asset, price) => {
  const s = String(asset || '').toUpperCase()
  if (s.includes('BTC')) return 1
  if (s.includes('ETH')) return 0.1
  if (s.includes('SOL')) return 0.01
  if (price >= 10) return 0.01
  if (price >= 1) return 0.001
  return 0.00001
}

const roundToTick = (price, tick) => {
  const t = Number(tick || 0)
  if (!t) return Number(price || 0)
  return Math.round(Number(price || 0) / t) * t
}

const seeded = (key) => {
  const s = String(key || '')
  let x = 2166136261
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i)
    x = Math.imul(x, 16777619)
  }
  return () => {
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    return (x >>> 0) / 4294967296
  }
}

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  row: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'lock'])

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const close = () => {
  open.value = false
}

const key = computed(() => props.row?.key || '')
const label = computed(() => props.row?.label || '-')
const asset = computed(() => props.row?.asset || '')
const tierSec = computed(() => Number(props.row?.tierSec || 0))
const marketPrice = computed(() => Number(props.row?.marketPrice || 0))
const tickSize = computed(() => tickSizeFor(asset.value, marketPrice.value))

const volume24h = computed(() => Number(props.row?.volume24h || 0))

const positionsByKey = ref({})
const selectedUids = ref([])

const generatePositions = (seedKey, mp) => {
  const rand = seeded(`${seedKey}_positions`)
  const items = []
  const baseCount = 28
  const maintenance = 0.005
  const maxLev = 100

  const mkUid = (i) => {
    const base = Math.floor(rand() * 1_000_000)
    return String(100000 + ((base + i * 97) % 899999))
  }

  for (let i = 0; i < baseCount; i++) {
    const uid = mkUid(i)
    const whaleBoost = i < 3 ? 1.75 : 1
    const leverage = Math.max(2, Math.min(maxLev, Math.round(2 + rand() * 98)))
    const principal = Math.round((800 + rand() * 12_000) * whaleBoost)
    const side = rand() < 0.56 ? 'long' : 'short'
    const entrySkew = (rand() * 2 - 1) * (i < 3 ? 0.006 : 0.014)
    const entryPrice = mp * (1 - entrySkew)
    const notional = principal * leverage
    const qty = mp ? notional / mp : 0
    const liquidationPrice =
      side === 'long'
        ? entryPrice * (1 - (1 / leverage) + maintenance)
        : entryPrice * (1 + (1 / leverage) - maintenance)
    const holdingMin = i < 6 ? 18 : 2
    const holdingMax = i < 6 ? 55 : 28
    const holdingSec = (holdingMin + rand() * (holdingMax - holdingMin)) * 60
    const openTs = Date.now() - holdingSec * 1000
    items.push({
      uid,
      side,
      principal,
      leverage,
      entryPrice,
      qty,
      liquidationPrice,
      openTs
    })
  }

  items.sort((a, b) => Number(b.principal * b.leverage) - Number(a.principal * a.leverage))
  return items
}

watch(
  () => key.value,
  () => {
    if (!key.value) return
    if (!positionsByKey.value[key.value]) {
      positionsByKey.value = {
        ...positionsByKey.value,
        [key.value]: generatePositions(key.value, marketPrice.value)
      }
    }
  },
  { immediate: true }
)

const allPositions = computed(() => {
  if (!key.value) return []
  return positionsByKey.value[key.value] || []
})

const targetedPositions = computed(() => {
  const picked = selectedUids.value.map((x) => String(x))
  if (picked.length === 0) return allPositions.value
  const set = new Set(picked)
  return allPositions.value.filter((p) => set.has(String(p.uid)))
})

const userPnlAt = (pos, settlementPrice) => {
  const p = Number(settlementPrice || 0)
  const entry = Number(pos.entryPrice || 0)
  const qty = Number(pos.qty || 0)
  if (!qty) return 0
  const signed = (p - entry) * qty
  return pos.side === 'short' ? -signed : signed
}

const priceHistory = ref([])
const windowPriceEnabled = ref(false)

const contractWindowSec = computed(() => {
  const sec = Number(tierSec.value || 0)
  if (!Number.isFinite(sec) || sec <= 0) return 0
  return clamp(sec, 5, 600)
})

const windowMarkPrice = computed(() => {
  const raw = Number(marketPrice.value || 0)
  if (!windowPriceEnabled.value) return raw
  const sec = Math.max(0, Number(contractWindowSec.value || 0))
  const hist = priceHistory.value
  if (!sec || !hist.length || !Number.isFinite(raw) || raw <= 0) return raw
  const cutoff = Date.now() - sec * 1000
  const picked = hist.filter((x) => Number(x?.t || 0) >= cutoff)
  if (picked.length === 0) return raw
  const sum = picked.reduce((s, x) => s + Number(x?.p || 0), 0)
  const avg = sum / picked.length
  return Number.isFinite(avg) && avg > 0 ? avg : raw
})

const markPrice = computed(() => {
  const p = Number(windowMarkPrice.value || 0)
  const raw = Number(marketPrice.value || 0)
  if (Number.isFinite(p) && p > 0) return p
  return Number.isFinite(raw) && raw > 0 ? raw : 0
})

const priceBandPct = computed(() => {
  const p = markPrice.value
  if (p >= 1000) return 0.02
  if (p >= 10) return 0.03
  return 0.05
})

const priceMin = computed(() => roundToTick(markPrice.value * (1 - priceBandPct.value), tickSize.value))
const priceMax = computed(() => roundToTick(markPrice.value * (1 + priceBandPct.value), tickSize.value))

const platformProfitAtUniform = (settlementPrice) => {
  return -targetedPositions.value.reduce((sum, pos) => sum + userPnlAt(pos, settlementPrice), 0)
}

const platformProfitAtSqueeze = (longSettlementPrice, shortSettlementPrice) => {
  return -targetedPositions.value.reduce((sum, pos) => {
    const p = pos.side === 'long' ? longSettlementPrice : shortSettlementPrice
    return sum + userPnlAt(pos, p)
  }, 0)
}

const controlPrice = ref(0)
const mode = ref('force')
const squeezePoints = ref(6)
const squeezeCenter = ref(0)
const locked = ref(false)
const lastAction = ref('')
const hoverPrice = ref(null)

const outcomeBias = ref('user_lose')
const outcomeIntensity = ref(70)
const deviationPctLimit = ref(1.2)
const autoApplyRecommendation = ref(true)
const advancedTune = ref(false)
const showAdvanced = ref(false)

const intensityPresets = [
  { label: '轻', value: 30 },
  { label: '中', value: 60 },
  { label: '强', value: 85 }
]

const ready = computed(() => {
  const p = Number(markPrice.value || 0)
  return Boolean(key.value) && Number.isFinite(p) && p > 0 && targetedPositions.value.length > 0
})

const squeezeGap = computed(() => Math.max(0, Number(squeezePoints.value || 0)) * tickSize.value)

const squeezeCenterMin = computed(() => {
  const min = priceMin.value + squeezeGap.value
  const max = priceMax.value - squeezeGap.value
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return priceMin.value
  return roundToTick(min, tickSize.value)
})

const squeezeCenterMax = computed(() => {
  const min = priceMin.value + squeezeGap.value
  const max = priceMax.value - squeezeGap.value
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return priceMax.value
  return roundToTick(max, tickSize.value)
})

const settlementPrices = computed(() => {
  if (mode.value !== 'squeeze') {
    const p = finalSettlementPrice.value
    return { long: p, short: p }
  }
  const center = clamp(squeezeCenter.value, squeezeCenterMin.value, squeezeCenterMax.value)
  const gap = squeezeGap.value
  const long = roundToTick(clamp(center - gap, priceMin.value, priceMax.value), tickSize.value)
  const short = roundToTick(clamp(center + gap, priceMin.value, priceMax.value), tickSize.value)
  return { long, short }
})

const platformProfitAtForCurve = (centerOrUniformPrice) => {
  const p = Number(centerOrUniformPrice || 0)
  if (mode.value === 'squeeze') {
    const gap = squeezeGap.value
    const longP = clamp(p - gap, priceMin.value, priceMax.value)
    const shortP = clamp(p + gap, priceMin.value, priceMax.value)
    return platformProfitAtSqueeze(longP, shortP)
  }
  return platformProfitAtUniform(p)
}

const summaryAt = (centerOrUniformPrice) => {
  const center = Number(centerOrUniformPrice || 0)
  const total = targetedPositions.value.length
  if (!total) {
    return { profit: 0, winCount: 0, lossCount: 0, flatCount: 0, winRate: 0 }
  }

  let winCount = 0
  let lossCount = 0
  let flatCount = 0

  if (mode.value === 'squeeze') {
    const gap = squeezeGap.value
    const longP = clamp(center - gap, priceMin.value, priceMax.value)
    const shortP = clamp(center + gap, priceMin.value, priceMax.value)
    for (const pos of targetedPositions.value) {
      const p = pos.side === 'long' ? longP : shortP
      const pnl = userPnlAt(pos, p)
      if (pnl > 0) winCount += 1
      else if (pnl < 0) lossCount += 1
      else flatCount += 1
    }
    const profit = platformProfitAtSqueeze(longP, shortP)
    return { profit, winCount, lossCount, flatCount, winRate: winCount / total }
  }

  for (const pos of targetedPositions.value) {
    const pnl = userPnlAt(pos, center)
    if (pnl > 0) winCount += 1
    else if (pnl < 0) lossCount += 1
    else flatCount += 1
  }
  const profit = platformProfitAtUniform(center)
  return { profit, winCount, lossCount, flatCount, winRate: winCount / total }
}

const curveMin = computed(() => {
  if (mode.value !== 'squeeze') return priceMin.value
  const min = squeezeCenterMin.value
  const max = squeezeCenterMax.value
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return priceMin.value
  return min
})

const curveMax = computed(() => {
  if (mode.value !== 'squeeze') return priceMax.value
  const min = squeezeCenterMin.value
  const max = squeezeCenterMax.value
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return priceMax.value
  return max
})

const curveStats = computed(() => {
  const min = curveMin.value
  const max = curveMax.value
  const steps = 120
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return []
  const points = []
  for (let i = 0; i <= steps; i++) {
    const price = min + ((max - min) * i) / steps
    const s = summaryAt(price)
    points.push({ price, profit: s.profit, winRate: s.winRate, winCount: s.winCount, lossCount: s.lossCount, flatCount: s.flatCount })
  }
  return points
})

const bestPoint = computed(() => {
  const points = curveStats.value
  if (points.length === 0) {
    const s = summaryAt(marketPrice.value)
    return { price: marketPrice.value, profit: s.profit, winRate: s.winRate, winCount: s.winCount, lossCount: s.lossCount, flatCount: s.flatCount }
  }
  let best = points[0]
  for (const p of points) {
    if (p.profit > best.profit) best = p
  }
  return best
})

const breakevenPoint = computed(() => {
  const points = curveStats.value
  if (points.length === 0) return { price: marketPrice.value, profit: 0, winRate: 0, winCount: 0, lossCount: 0, flatCount: 0 }
  let best = points[0]
  let bestAbs = Math.abs(best.profit)
  for (const p of points) {
    const abs = Math.abs(p.profit)
    if (abs < bestAbs) {
      bestAbs = abs
      best = p
    }
  }
  return best
})

const svgLandscape = computed(() => {
  const points = curveStats.value
  const w = 620
  const h = 220
  const pad = 22
  if (points.length === 0) return { w, h, pad, path: '', minProfit: 0, maxProfit: 0, xFor: null, yFor: null }
  const profits = points.map((p) => p.profit)
  const minProfit = Math.min(...profits)
  const maxProfit = Math.max(...profits)
  const span = maxProfit - minProfit || 1
  const xFor = (price) => {
    const t = (price - curveMin.value) / (curveMax.value - curveMin.value)
    return pad + clamp(t, 0, 1) * (w - pad * 2)
  }
  const yFor = (profit) => {
    const t = (profit - minProfit) / span
    return h - pad - clamp(t, 0, 1) * (h - pad * 2)
  }
  const d = points
    .map((p, idx) => {
      const x = xFor(p.price)
      const y = yFor(p.profit)
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
  return { w, h, pad, path: d, minProfit, maxProfit, xFor, yFor }
})

const deathZones = computed(() => {
  if (!svgLandscape.value.xFor) return []
  const points = curveStats.value
  const zones = []
  let start = null
  for (let i = 0; i < points.length; i++) {
    const neg = Number(points[i].profit || 0) < 0
    if (neg && start === null) start = points[i].price
    if (!neg && start !== null) {
      zones.push({ from: start, to: points[i].price })
      start = null
    }
  }
  if (start !== null && points.length) zones.push({ from: start, to: points[points.length - 1].price })
  return zones
})

const harvestZone = computed(() => {
  const points = curveStats.value
  if (points.length < 2) return null
  const span = (curveMax.value - curveMin.value) * 0.06
  return { from: bestPoint.value.price - span, to: bestPoint.value.price + span }
})

const hoverSettlementPrice = computed(() => {
  const raw = hoverPrice.value
  const n = Number(raw)
  if (raw === null) return null
  if (!Number.isFinite(n)) return null
  return n
})

const previewSettlementPrice = computed(() => {
  return finalSettlementPrice.value
})

const markHoverPrice = (evt) => {
  if (!svgLandscape.value.xFor) return
  const box = evt.currentTarget?.getBoundingClientRect?.()
  if (!box) return
  const x = clamp(evt.clientX - box.left, svgLandscape.value.pad, svgLandscape.value.w - svgLandscape.value.pad)
  const t = (x - svgLandscape.value.pad) / (svgLandscape.value.w - svgLandscape.value.pad * 2)
  const p = curveMin.value + t * (curveMax.value - curveMin.value)
  hoverPrice.value = roundToTick(p, tickSize.value)
}

const clearHover = () => {
  hoverPrice.value = null
}

watch(
  () => key.value,
  () => {
    priceHistory.value = []
    controlPrice.value = roundToTick(marketPrice.value, tickSize.value)
    squeezeCenter.value = roundToTick(marketPrice.value, tickSize.value)
    mode.value = 'force'
    squeezePoints.value = 6
    locked.value = false
    lastAction.value = ''
    hoverPrice.value = null
    selectedUids.value = []
    outcomeBias.value = 'user_lose'
    outcomeIntensity.value = 70
    deviationPctLimit.value = 1.2
    autoApplyRecommendation.value = true
    advancedTune.value = false
    showAdvanced.value = false
  },
  { immediate: true }
)

watch([priceMin, priceMax, tickSize, squeezePoints], () => {
  if (mode.value === 'force') {
    const next = roundToTick(clamp(controlPrice.value, priceMin.value, priceMax.value), tickSize.value)
    if (Number.isFinite(next)) controlPrice.value = next
  }
  if (mode.value === 'squeeze') {
    const next = roundToTick(clamp(squeezeCenter.value, squeezeCenterMin.value, squeezeCenterMax.value), tickSize.value)
    if (Number.isFinite(next)) squeezeCenter.value = next
  }
})

const finalSettlementPrice = computed(() => {
  if (mode.value === 'squeeze') {
    return roundToTick(clamp(squeezeCenter.value, squeezeCenterMin.value, squeezeCenterMax.value), tickSize.value)
  }
  return roundToTick(clamp(controlPrice.value, priceMin.value, priceMax.value), tickSize.value)
})

const estPlatformPnl = computed(() => {
  if (mode.value === 'squeeze') return platformProfitAtSqueeze(settlementPrices.value.long, settlementPrices.value.short)
  return platformProfitAtUniform(finalSettlementPrice.value)
})

const targetWinRate = computed(() => {
  const t = clamp(Number(outcomeIntensity.value || 0), 0, 100) / 100
  if (outcomeBias.value === 'user_win') return 0.5 + t * 0.35
  if (outcomeBias.value === 'user_lose') return 0.5 - t * 0.35
  return 0.5
})

const recommendRange = computed(() => {
  const mark = Number(markPrice.value || 0)
  const pct = clamp(Number(deviationPctLimit.value || 0), 0.1, 20) / 100
  if (!Number.isFinite(mark) || mark <= 0 || !Number.isFinite(pct)) return { min: curveMin.value, max: curveMax.value }
  const min = mark * (1 - pct)
  const max = mark * (1 + pct)
  return { min: Math.max(curveMin.value, min), max: Math.min(curveMax.value, max) }
})

const recommendedPoint = computed(() => {
  const points = curveStats.value
  if (!points.length) {
    const s = summaryAt(finalSettlementPrice.value)
    return { price: finalSettlementPrice.value, ...s }
  }

  const range = recommendRange.value
  const filtered = points.filter((p) => p.price >= range.min && p.price <= range.max)
  const candidates = filtered.length ? filtered : points
  const mark = Number(markPrice.value || 0) || 1

  let best = candidates[0]
  let bestScore = Infinity
  for (const p of candidates) {
    const winGap = Math.abs(Number(p.winRate || 0) - Number(targetWinRate.value || 0))
    const dev = Math.abs(Number(p.price || 0) - Number(markPrice.value || 0)) / mark
    const profit = Number(p.profit || 0)
    const profitScale = exposureSummary.value.totalNotional > 0 ? Math.abs(profit) / exposureSummary.value.totalNotional : Math.abs(profit)
    const score =
      winGap * 120 +
      dev * 18 +
      (outcomeBias.value === 'balanced' ? profitScale * 20 : outcomeBias.value === 'user_win' ? Math.max(0, -profitScale) * 10 : 0)

    if (score < bestScore) {
      bestScore = score
      best = p
    } else if (score === bestScore) {
      if (outcomeBias.value === 'user_lose') {
        if (profit > best.profit) best = p
      } else if (outcomeBias.value === 'user_win') {
        if (profit > best.profit) best = p
      } else if (Math.abs(profit) < Math.abs(best.profit)) best = p
    }
  }
  return best
})

const recommendedSettlementPrices = computed(() => {
  const p = Number(recommendedPoint.value?.price || 0)
  if (mode.value !== 'squeeze') return { long: p, short: p }
  const gap = squeezeGap.value
  const long = roundToTick(clamp(p - gap, priceMin.value, priceMax.value), tickSize.value)
  const short = roundToTick(clamp(p + gap, priceMin.value, priceMax.value), tickSize.value)
  return { long, short }
})

const currentSummary = computed(() => {
  return summaryAt(finalSettlementPrice.value)
})

const applyRecommended = () => {
  if (locked.value) return
  const p = roundToTick(Number(recommendedPoint.value?.price || 0), tickSize.value)
  if (!Number.isFinite(p) || p <= 0) return
  if (mode.value === 'squeeze') {
    squeezeCenter.value = roundToTick(clamp(p, squeezeCenterMin.value, squeezeCenterMax.value), tickSize.value)
  } else {
    controlPrice.value = roundToTick(clamp(p, priceMin.value, priceMax.value), tickSize.value)
  }
  hoverPrice.value = null
  const winPct = Math.round(Number(recommendedPoint.value?.winRate || 0) * 100)
  lastAction.value = `应用推荐：用户胜率 ${winPct}% · ${formatPrice(p)}`
}

watch(
  [mode, outcomeBias, outcomeIntensity, deviationPctLimit, selectedUids],
  () => {
    if (locked.value) return
    if (!autoApplyRecommendation.value) return
    applyRecommended()
  },
  { flush: 'post' }
)

const onCurveClick = (evt) => {
  if (locked.value) return
  const box = evt.currentTarget?.getBoundingClientRect?.()
  if (!box) return
  const x = clamp(evt.clientX - box.left, svgLandscape.value.pad, svgLandscape.value.w - svgLandscape.value.pad)
  const t = (x - svgLandscape.value.pad) / (svgLandscape.value.w - svgLandscape.value.pad * 2)
  const p = curveMin.value + t * (curveMax.value - curveMin.value)
  if (mode.value === 'squeeze') {
    squeezeCenter.value = roundToTick(clamp(p, squeezeCenterMin.value, squeezeCenterMax.value), tickSize.value)
    lastAction.value = `曲线点选：中心 ${formatPrice(squeezeCenter.value)}`
  } else {
    mode.value = 'force'
    controlPrice.value = roundToTick(p, tickSize.value)
    lastAction.value = `曲线点选：${formatPrice(controlPrice.value)}`
  }
  hoverPrice.value = null
}

const fillSettlementPrice = (price, labelText) => {
  if (locked.value) return
  if (mode.value === 'squeeze') {
    squeezeCenter.value = roundToTick(clamp(Number(price || 0), squeezeCenterMin.value, squeezeCenterMax.value), tickSize.value)
    lastAction.value = `${labelText}：中心 ${formatPrice(squeezeCenter.value)}`
  } else {
    mode.value = 'force'
    controlPrice.value = roundToTick(Number(price || 0), tickSize.value)
    lastAction.value = `${labelText}：${formatPrice(controlPrice.value)}`
  }
  hoverPrice.value = null
}

const stopLossPriceOf = (pos, lossFraction) => {
  const entry = Number(pos.entryPrice || 0)
  const qty = Number(pos.qty || 0)
  const principal = Math.max(0, Number(pos.principal || 0))
  if (!qty) return entry
  const loss = principal * clamp(Number(lossFraction || 0), 0, 1)
  const p = pos.side === 'long' ? entry - loss / qty : entry + loss / qty
  return roundToTick(clamp(p, priceMin.value, priceMax.value), tickSize.value)
}

const positionsWithStats = computed(() => {
  return allPositions.value.map((p) => {
    return {
      ...p,
      pnlNow: userPnlAt(p, marketPrice.value),
      stopLossPrice: stopLossPriceOf(p, 0.5)
    }
  })
})

const topProfitUsers = computed(() => {
  return [...positionsWithStats.value].sort((a, b) => Number(b.pnlNow || 0) - Number(a.pnlNow || 0)).slice(0, 20)
})

const nudge = (dir) => {
  if (locked.value) return
  mode.value = 'force'
  controlPrice.value = roundToTick(controlPrice.value + Number(dir || 0) * tickSize.value, tickSize.value)
}

const squeezeNudge = (dir) => {
  if (locked.value) return
  mode.value = 'squeeze'
  squeezeCenter.value = roundToTick(squeezeCenter.value + Number(dir || 0) * tickSize.value, tickSize.value)
}

const lockPlan = () => {
  locked.value = true
  const picked = selectedUids.value.map((x) => String(x))
  const userLabel = picked.length ? `已选 ${picked.length}` : '全部'
  const s = summaryAt(finalSettlementPrice.value)
  const winPct = Math.round(Number(s.winRate || 0) * 100)
  lastAction.value =
    mode.value === 'squeeze'
      ? `锁定结算方案：多 ${formatPrice(settlementPrices.value.long)} / 空 ${formatPrice(settlementPrices.value.short)} · 范围：${userLabel}`
      : `锁定结算方案：${formatPrice(finalSettlementPrice.value)} · 范围：${userLabel}`
  emit('lock', {
    key: key.value,
    label: label.value,
    asset: asset.value,
    tierSec: tierSec.value,
    mode: mode.value,
    settlementPrice: finalSettlementPrice.value,
    settlementPriceLong: mode.value === 'squeeze' ? settlementPrices.value.long : null,
    settlementPriceShort: mode.value === 'squeeze' ? settlementPrices.value.short : null,
    squeezePoints: mode.value === 'squeeze' ? Number(squeezePoints.value || 0) : null,
    estPlatformPnl: estPlatformPnl.value,
    targetUids: picked.length ? picked : null,
    outcomeBias: outcomeBias.value,
    outcomeIntensity: Number(outcomeIntensity.value || 0),
    deviationPctLimit: Number(deviationPctLimit.value || 0),
    outcomeWinRate: winPct,
    outcomeWinCount: s.winCount,
    outcomeLossCount: s.lossCount
  })
}

watch(
  () => marketPrice.value,
  (p) => {
    if (!Number.isFinite(p) || p <= 0) return
    const now = Date.now()
    const keepSec = clamp(Number(tierSec.value || 0), 60, 600)
    const keepPoints = Math.min(620, Math.max(90, Math.ceil(keepSec) + 20))
    const next = [...priceHistory.value, { t: now, p: Number(p) }].slice(-keepPoints)
    const cutoff = now - keepSec * 1000
    priceHistory.value = next.filter((x) => x.t >= cutoff)
  },
  { immediate: true }
)

const heartbeat = ref(0)
let heartbeatTimer = null

const bumpHeartbeat = () => {
  heartbeat.value++
}

const lastRefreshAtText = computed(() => {
  heartbeat.value
  return formatDateTime(Date.now())
})

watch(
  () => open.value,
  (v) => {
    if (v) {
      if (!heartbeatTimer) {
        bumpHeartbeat()
        heartbeatTimer = setInterval(bumpHeartbeat, 1000)
      }
    } else if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (heartbeatTimer) clearInterval(heartbeatTimer)
})

const exposureSummary = computed(() => {
  const positions = targetedPositions.value
  let longNotional = 0
  let shortNotional = 0
  let longUsers = 0
  let shortUsers = 0
  for (const p of positions) {
    const notional = Math.max(0, Number(p.principal || 0)) * Math.max(0, Number(p.leverage || 0))
    if (p.side === 'long') {
      longNotional += notional
      longUsers += 1
    } else {
      shortNotional += notional
      shortUsers += 1
    }
  }
  const totalNotional = longNotional + shortNotional
  const ratio = shortNotional > 0 ? longNotional / shortNotional : longNotional > 0 ? Infinity : 0
  return {
    longNotional,
    shortNotional,
    totalNotional,
    longUsers,
    shortUsers,
    netNotional: longNotional - shortNotional,
    ratio
  }
})

const platformPnlNow = computed(() => {
  return platformProfitAtUniform(markPrice.value)
})

const klineByKey = ref({})
const generateKline = (seedKey, mp) => {
  const rand = seeded(`${seedKey}_kline`)
  const candles = []
  let last = Number(mp || 0) || 1
  for (let i = 0; i < 26; i++) {
    const drift = (rand() * 2 - 1) * 0.0022
    const open = last
    const close = Math.max(0.00001, open * (1 + drift))
    const wick = Math.abs((rand() * 2 - 1) * 0.0018)
    const high = Math.max(open, close) * (1 + wick)
    const low = Math.min(open, close) * (1 - wick)
    candles.push({ open, close, high, low })
    last = close
  }
  if (candles.length) candles[candles.length - 1].close = Number(mp || candles[candles.length - 1].close)
  return candles
}

watch(
  () => key.value,
  () => {
    if (!key.value) return
    if (!klineByKey.value[key.value]) {
      klineByKey.value = { ...klineByKey.value, [key.value]: generateKline(key.value, marketPrice.value) }
    }
  },
  { immediate: true }
)

watch(
  () => marketPrice.value,
  (p) => {
    if (!key.value) return
    const candles = klineByKey.value[key.value]
    if (!candles?.length || !Number.isFinite(p) || p <= 0) return
    const last = candles[candles.length - 1]
    const close = Number(p)
    const high = Math.max(Number(last.high || 0), close)
    const low = Math.min(Number(last.low || 0), close)
    const next = [...candles]
    next[next.length - 1] = { ...last, close, high, low }
    klineByKey.value = { ...klineByKey.value, [key.value]: next }
  }
)

const klineSvg = computed(() => {
  const candles = klineByKey.value[key.value] || []
  const w = 620
  const h = 160
  const pad = 18
  if (!candles.length) return { w, h, pad, candles: [], yFor: null, xFor: null, min: 0, max: 0 }
  const lows = candles.map((c) => Number(c.low || 0))
  const highs = candles.map((c) => Number(c.high || 0))
  const extra = [Number(previewSettlementPrice.value || 0), Number(marketPrice.value || 0)]
  const min = Math.min(...lows, ...extra)
  const max = Math.max(...highs, ...extra)
  const span = max - min || 1
  const yFor = (price) => {
    const t = (Number(price || 0) - min) / span
    return h - pad - clamp(t, 0, 1) * (h - pad * 2)
  }
  const xFor = (idx) => {
    const step = (w - pad * 2) / Math.max(1, candles.length)
    return pad + idx * step + step * 0.5
  }
  return { w, h, pad, candles, yFor, xFor, min, max }
})

</script>

<template>
  <transition name="slide">
    <div v-if="open" class="fixed inset-0 z-40">
      <div class="absolute inset-0 bg-slate-900/35"></div>
      <div class="absolute right-0 top-0 h-full w-full max-w-7xl bg-white shadow-2xl flex flex-col">
        <div class="border-b border-slate-200 px-6 py-4">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="text-xs text-slate-500">The War Room Header</div>
              <h2 class="mt-1 text-xl font-semibold text-slate-900">实施场控：{{ label }}</h2>
              <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                <span>设置结算策略并预览影响，确认后执行场控</span>
              </div>
            </div>
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            @click="close"
          >
            关闭
          </button>
          </div>

          <div class="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
            <div class="flex items-center gap-4 overflow-x-auto whitespace-nowrap text-[11px] text-slate-600">
              <div class="flex items-baseline gap-2 shrink-0">
                <span class="text-slate-500">更新</span>
                <span class="font-mono text-slate-900">{{ lastRefreshAtText || '-' }}</span>
              </div>

              <span class="h-4 w-px bg-slate-200 shrink-0"></span>

              <div class="flex items-baseline gap-2 shrink-0">
                <span class="text-slate-500">24h交易量</span>
                <span class="font-mono text-slate-900">{{ volume24h > 0 ? formatCompactUsd(volume24h) : '-' }}</span>
              </div>

              <div class="flex items-baseline gap-2 shrink-0">
                <span class="text-slate-500">平台盈亏</span>
                <span class="font-mono" :class="platformPnlNow < 0 ? 'text-rose-700' : 'text-emerald-700'">
                  {{ formatCompactUsd(platformPnlNow, true) }}
                </span>
              </div>

              <span class="h-4 w-px bg-slate-200 shrink-0"></span>

              <div class="flex items-baseline gap-2 shrink-0">
                <span class="text-slate-500">持仓(多/空/净)</span>
                <span class="font-mono text-slate-900">{{ formatCompactUsd(exposureSummary.longNotional) }} / {{ formatCompactUsd(exposureSummary.shortNotional) }} / {{ formatCompactUsd(exposureSummary.netNotional, true) }}</span>
              </div>

              <span class="h-4 w-px bg-slate-200 shrink-0"></span>

              <div class="flex items-baseline gap-2 shrink-0 ml-auto">
                <span class="text-slate-500">范围</span>
                <span class="font-mono text-slate-900">{{ selectedUids.length ? `已选 ${selectedUids.length}` : '全部用户' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-6">
          <div class="grid gap-4 lg:grid-cols-12 h-full">
             <section class="lg:col-span-5 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50/40">
                <div>
                  <h3 class="text-sm font-semibold text-slate-900">用户列表</h3>
                  <p class="mt-0.5 text-[11px] text-slate-500">Top 20 · 勾选用户则仅对勾选生效（不选=全部）</p>
                </div>
                <div class="text-[11px] text-slate-400 font-mono">Advanced Scanner</div>
              </div>

              <div class="space-y-4 h-full">
                <div class="max-h-[90%] overflow-auto">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50 text-[11px] text-slate-500">
                      <tr>
                        <th class="px-3 py-2 font-medium">UID</th>
                        <th class="px-3 py-2 font-medium">方向</th>
                        <th class="px-3 py-2 font-medium">本金 / 开仓价</th>
                        <th class="px-3 py-2 font-medium">当前盈亏</th>
                        <th class="px-3 py-2 font-medium">爆仓/止损</th>
                        <th class="px-3 py-2 font-medium text-right">选择</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      <tr v-for="pos in topProfitUsers" :key="pos.uid" class="hover:bg-slate-50/60">
                        <td class="px-3 py-2 align-top font-mono text-slate-900">{{ pos.uid }}</td>
                        <td class="px-3 py-2 align-top">
                          <span
                            class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            :class="pos.side === 'long' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'"
                          >
                            {{ pos.side === 'long' ? '多' : '空' }}
                          </span>
                        </td>
                        <td class="px-3 py-2 align-top">
                          <div class="font-mono text-slate-700">{{ formatCompactUsd(pos.principal) }}</div>
                          <div class="mt-1 font-mono text-[11px] text-slate-500">{{ formatPrice(pos.entryPrice) }}</div>
                        </td>
                        <td class="px-3 py-2 align-top font-mono" :class="pos.pnlNow < 0 ? 'text-rose-700' : 'text-emerald-700'">
                          {{ formatCompactUsd(pos.pnlNow, true) }}
                        </td>
                        <td class="px-3 py-2 align-top">
                          <div class="font-mono text-[11px] text-slate-700">{{ formatPrice(pos.liquidationPrice) }}</div>
                          <div class="mt-1 font-mono text-[11px] text-slate-500">{{ formatPrice(pos.stopLossPrice) }}</div>
                        </td>
                        <td class="px-3 py-2 align-top text-right">
                          <input
                            type="checkbox"
                            class="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 disabled:opacity-40"
                            :disabled="locked"
                            :value="pos.uid"
                            v-model="selectedUids"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
           

            <section class="lg:col-span-3 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-0">
              <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50/40">
                <div>
                  <h3 class="text-sm font-semibold text-slate-900">指令执行区</h3>
                  <p class="mt-0.5 text-[11px] text-slate-500">统一结算 / 双向挤压</p>
                </div>
                <div class="text-[11px] text-slate-400 font-mono">Command Center</div>
              </div>

              <div class="flex-1 overflow-y-auto p-5 space-y-4">
                <div class="space-y-2">
                  <div class="text-xs font-semibold text-slate-900">结算策略</div>
                  <div class="grid grid-cols-2 gap-2">
                    <label class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                      <input
                        type="radio"
                        name="mode"
                        value="force"
                        class="h-4 w-4 text-slate-900 focus:ring-slate-900"
                        v-model="mode"
                        :disabled="locked || !ready"
                      />
                      <div class="min-w-0">
                        <div class="text-sm font-semibold text-slate-900">统一结算</div>
                        <div class="text-[11px] text-slate-500">多空同价，易解释</div>
                      </div>
                    </label>
                    <label class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                      <input
                        type="radio"
                        name="mode"
                        value="squeeze"
                        class="h-4 w-4 text-slate-900 focus:ring-slate-900"
                        v-model="mode"
                        :disabled="locked || !ready"
                      />
                      <div class="min-w-0">
                        <div class="text-sm font-semibold text-slate-900">双向挤压</div>
                        <div class="text-[11px] text-slate-500">多空不同价，强度更高</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div class="rounded-lg border border-slate-200 p-3 space-y-3">
                  <div class="flex items-center justify-between">
                    <div class="text-xs font-semibold text-slate-900">标记价</div>
                    <div class="font-mono text-xs text-slate-700">{{ formatPrice(markPrice) }}</div>
                  </div>
                  <div v-if="!ready" class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900/80">
                    等待合约/行情数据就绪后再执行
                  </div>
                  <div class="space-y-2">
                    <div class="text-xs font-semibold text-slate-900">目标偏好</div>
                    <div class="grid grid-cols-3 gap-2 text-[11px]">
                      <label class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                        <input
                          type="radio"
                          name="outcomeBias"
                          value="user_win"
                          class="h-4 w-4 text-slate-900 focus:ring-slate-900"
                          v-model="outcomeBias"
                          :disabled="locked || !ready"
                        />
                        <div class="text-slate-900">偏向用户</div>
                      </label>
                      <label class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                        <input
                          type="radio"
                          name="outcomeBias"
                          value="balanced"
                          class="h-4 w-4 text-slate-900 focus:ring-slate-900"
                          v-model="outcomeBias"
                          :disabled="locked || !ready"
                        />
                        <div class="text-slate-900">中性</div>
                      </label>
                      <label class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                        <input
                          type="radio"
                          name="outcomeBias"
                          value="user_lose"
                          class="h-4 w-4 text-slate-900 focus:ring-slate-900"
                          v-model="outcomeBias"
                          :disabled="locked || !ready"
                        />
                        <div class="text-slate-900">偏向平台</div>
                      </label>
                    </div>
                    <div class="text-[11px] text-slate-500">通过选择结算价，让整体胜率趋势靠近目标值；不保证每单命中</div>
                  </div>

                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                      <div class="text-[11px] font-semibold text-slate-700">偏向程度</div>
                      <div class="font-mono text-[11px] text-slate-700">目标胜率 {{ Math.round(targetWinRate * 100) }}%</div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      v-model.number="outcomeIntensity"
                      :disabled="locked || !ready || outcomeBias === 'balanced'"
                      class="w-full accent-slate-900 disabled:opacity-40"
                    />
                    <div class="flex flex-wrap items-center gap-2">
                      <button
                        v-for="p in intensityPresets"
                        :key="`preset-${p.value}`"
                        type="button"
                        class="h-7 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                        :disabled="locked || !ready || outcomeBias === 'balanced'"
                        @click="outcomeIntensity = p.value"
                      >
                        {{ p.label }}
                      </button>
                      <div v-if="outcomeBias === 'balanced'" class="text-[11px] text-slate-400">中性模式不启用偏向</div>
                    </div>
                  </div>

                  <div v-if="mode === 'squeeze'" class="space-y-1.5">
                    <div class="flex items-center justify-between">
                      <div class="text-[11px] font-semibold text-slate-700">挤压跨度（Points）</div>
                      <div class="font-mono text-[11px] text-slate-700">Gap {{ formatPrice(squeezeGap) }}</div>
                    </div>
                    <input
                      type="number"
                      class="h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-0 disabled:bg-slate-50"
                      v-model.number="squeezePoints"
                      min="0"
                      :disabled="locked || !ready"
                    />
                  </div>

                  <div class="flex items-center justify-between gap-3">
                    <label class="flex items-center gap-2 text-[11px] text-slate-500">
                      <input
                        type="checkbox"
                        class="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 disabled:opacity-40"
                        v-model="autoApplyRecommendation"
                        :disabled="locked || !ready"
                      />
                      自动应用推荐
                    </label>
                    <button
                      type="button"
                      class="text-[11px] font-semibold text-slate-700 hover:text-slate-900 disabled:opacity-40"
                      :disabled="locked || !ready"
                      @click="showAdvanced = !showAdvanced"
                    >
                      {{ showAdvanced ? '收起高级设置' : '展开高级设置' }}
                    </button>
                  </div>

                  <div v-if="showAdvanced" class="space-y-3 pt-1">
                    <div class="space-y-1.5">
                      <div class="flex items-center justify-between">
                        <div class="text-[11px] font-semibold text-slate-700">价格偏离上限</div>
                        <div class="font-mono text-[11px] text-slate-700">±{{ Number(deviationPctLimit || 0).toFixed(1) }}%</div>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="8"
                        step="0.1"
                        v-model.number="deviationPctLimit"
                        :disabled="locked || !ready"
                        class="w-full accent-slate-900 disabled:opacity-40"
                      />
                      <div class="text-[11px] text-slate-500">
                        推荐区间 {{ formatPrice(recommendRange.min) }} ~ {{ formatPrice(recommendRange.max) }} · Tick {{ formatPrice(tickSize) }}
                      </div>
                    </div>

                    <label class="flex items-center justify-between gap-3">
                      <div class="min-w-0">
                        <div class="text-[11px] font-semibold text-slate-700">时间窗口修正</div>
                        <div class="text-[11px] text-slate-500">以窗口均价作为参考标记价（{{ Math.round(contractWindowSec) }}s）</div>
                      </div>
                      <input
                        type="checkbox"
                        class="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 disabled:opacity-40"
                        v-model="windowPriceEnabled"
                        :disabled="locked || !ready"
                      />
                    </label>

                    <div class="space-y-2">
                      <label class="flex items-center justify-between gap-3">
                        <span class="text-[11px] font-semibold text-slate-700">高级微调</span>
                        <input
                          type="checkbox"
                          class="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 disabled:opacity-40"
                          v-model="advancedTune"
                          :disabled="locked || !ready"
                        />
                      </label>

                      <div v-if="advancedTune" class="space-y-2">
                        <div class="text-[11px] text-slate-500">仅用于最后 1-2 Tick 校正</div>

                        <div v-if="mode === 'force'" class="flex items-center gap-2">
                          <button
                            type="button"
                            class="h-9 w-9 shrink-0 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center leading-none"
                            :disabled="locked || !ready"
                            @click="nudge(-1)"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            class="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 font-mono text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-0 disabled:bg-slate-50"
                            v-model.number="controlPrice"
                            :step="tickSize"
                            :min="priceMin"
                            :max="priceMax"
                            :disabled="locked || !ready"
                          />
                          <button
                            type="button"
                            class="h-9 w-9 shrink-0 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center leading-none"
                            :disabled="locked || !ready"
                            @click="nudge(1)"
                          >
                            +
                          </button>
                        </div>

                        <div v-else class="flex items-center gap-2">
                          <button
                            type="button"
                            class="h-9 w-9 shrink-0 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center leading-none"
                            :disabled="locked || !ready"
                            @click="squeezeNudge(-1)"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            class="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 font-mono text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-0 disabled:bg-slate-50"
                            v-model.number="squeezeCenter"
                            :step="tickSize"
                            :min="squeezeCenterMin"
                            :max="squeezeCenterMax"
                            :disabled="locked || !ready"
                          />
                          <button
                            type="button"
                            class="h-9 w-9 shrink-0 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center leading-none"
                            :disabled="locked || !ready"
                            @click="squeezeNudge(1)"
                          >
                            +
                          </button>
                        </div>

                        <div v-if="mode === 'squeeze'" class="grid grid-cols-2 gap-2 text-[11px]">
                          <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <div class="text-slate-500">多头结算价</div>
                            <div class="mt-1 font-mono text-slate-900">{{ formatPrice(settlementPrices.long) }}</div>
                          </div>
                          <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <div class="text-slate-500">空头结算价</div>
                            <div class="mt-1 font-mono text-slate-900">{{ formatPrice(settlementPrices.short) }}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 space-y-1.5">
                    <div class="flex items-center justify-between gap-2">
                      <div class="text-[11px] text-slate-500">推荐结算</div>
                      <button
                        type="button"
                        class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                        :disabled="locked || !ready"
                        @click="applyRecommended"
                      >
                        应用
                      </button>
                    </div>
                    <div class="font-mono text-sm text-slate-900">
                      <span v-if="mode === 'squeeze'">{{ formatPrice(recommendedSettlementPrices.long) }} / {{ formatPrice(recommendedSettlementPrices.short) }}</span>
                      <span v-else>{{ formatPrice(recommendedPoint.price) }}</span>
                    </div>
                    <div class="text-[11px] text-slate-500">
                      用户胜率 {{ Math.round(Number(recommendedPoint.winRate || 0) * 100) }}%（赢{{ recommendedPoint.winCount || 0 }}/输{{ recommendedPoint.lossCount || 0 }}/平{{ recommendedPoint.flatCount || 0 }}）
                      · 平台 {{ formatCompactUsd(recommendedPoint.profit, true) }}
                    </div>
                  </div>
                </div>
                

                <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div class="flex items-baseline justify-between gap-2">
                    <div class="text-xs text-slate-600">当前方案</div>
                    <div class="font-mono text-xs text-slate-700">
                      胜率 {{ Math.round(Number(currentSummary.winRate || 0) * 100) }}%（赢{{ currentSummary.winCount || 0 }}/输{{ currentSummary.lossCount || 0 }}/平{{ currentSummary.flatCount || 0 }}）
                    </div>
                  </div>
                  <div class="mt-1 text-xs text-slate-600">
                    平台预估盈亏
                    <span class="ml-1 font-mono" :class="estPlatformPnl < 0 ? 'text-rose-700' : 'text-emerald-700'">
                      {{ formatCompactUsd(estPlatformPnl, true) }}
                    </span>
                  </div>
                  <div v-if="lastAction" class="mt-1 text-[11px] text-slate-500">{{ lastAction }}</div>
                </div>
              </div>

              <div class="border-t border-slate-200 bg-white p-5">
                <button
                  type="button"
                  class="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                  :disabled="locked || !ready"
                  @click="lockPlan"
                >
                  执行方案
                </button>
              </div>
            </section>

             <section class="lg:col-span-4 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-0">
              <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50/40">
                <div>
                  <h3 class="text-sm font-semibold text-slate-900">战情沙盘</h3>
                  <p class="mt-0.5 text-[11px] text-slate-500">Money Map + PnL Simulator</p>
                </div>
                <div class="text-[11px] text-slate-400 font-mono">The War Room</div>
              </div>

              <div class="flex-1 overflow-y-auto p-5 space-y-4">
                <div class="rounded-xl border border-slate-200 bg-white p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="text-xs font-semibold text-slate-900">持仓分布与利润模拟</div>
                      <div class="mt-0.5 text-[11px] text-slate-500">点击曲线定位结算价；悬停预演；红区=亏损，绿区=黄金收割</div>
                    </div>
                    <div class="text-right shrink-0">
                      <div class="text-[11px] text-slate-400">市场价</div>
                      <div class="font-mono text-xs text-slate-900">{{ formatPrice(markPrice) }}</div>
                    </div>
                  </div>

                  <svg class="mt-3 h-24 w-full" :viewBox="`0 0 ${klineSvg.w} ${klineSvg.h}`">
                    <rect x="0" y="0" :width="klineSvg.w" :height="klineSvg.h" fill="#ffffff" rx="10" />
                    <g v-if="klineSvg.candles.length && klineSvg.xFor">
                      <g v-for="(c, i) in klineSvg.candles" :key="i">
                        <line
                          :x1="klineSvg.xFor(i)"
                          :x2="klineSvg.xFor(i)"
                          :y1="klineSvg.yFor(c.high)"
                          :y2="klineSvg.yFor(c.low)"
                          stroke="#94a3b8"
                          stroke-width="1.2"
                        />
                        <rect
                          :x="klineSvg.xFor(i) - 4.2"
                          :y="Math.min(klineSvg.yFor(c.open), klineSvg.yFor(c.close))"
                          width="8.4"
                          :height="Math.max(2, Math.abs(klineSvg.yFor(c.open) - klineSvg.yFor(c.close)))"
                          :fill="c.close >= c.open ? '#10b981' : '#f43f5e'"
                          opacity="0.85"
                          rx="2"
                        />
                      </g>

                      <line
                        :x1="klineSvg.xFor(klineSvg.candles.length - 1)"
                        :x2="klineSvg.xFor(klineSvg.candles.length - 1)"
                        :y1="klineSvg.yFor(marketPrice)"
                        :y2="klineSvg.yFor(previewSettlementPrice)"
                        stroke="#0f172a"
                        stroke-width="2"
                        stroke-dasharray="6 5"
                        opacity="0.8"
                      />
                      <circle
                        :cx="klineSvg.xFor(klineSvg.candles.length - 1)"
                        :cy="klineSvg.yFor(previewSettlementPrice)"
                        r="3.4"
                        fill="#0f172a"
                      />
                    </g>
                  </svg>

                  <svg
                    class="mt-3 h-36 w-full select-none"
                    :viewBox="`0 0 ${svgLandscape.w} ${svgLandscape.h}`"
                    @mousemove="markHoverPrice"
                    @mouseleave="clearHover"
                    @click="onCurveClick"
                  >
                    <rect x="0" y="0" :width="svgLandscape.w" :height="svgLandscape.h" fill="#ffffff" rx="10" />
                    <g v-if="svgLandscape.xFor">
                      <rect
                        v-for="(z, i) in deathZones"
                        :key="i"
                        :x="svgLandscape.xFor(z.from)"
                        :y="svgLandscape.pad"
                        :width="Math.max(1, svgLandscape.xFor(z.to) - svgLandscape.xFor(z.from))"
                        :height="svgLandscape.h - svgLandscape.pad * 2"
                        fill="#fb7185"
                        opacity="0.12"
                      />
                      <rect
                        v-if="harvestZone"
                        :x="svgLandscape.xFor(harvestZone.from)"
                        :y="svgLandscape.pad"
                        :width="Math.max(1, svgLandscape.xFor(harvestZone.to) - svgLandscape.xFor(harvestZone.from))"
                        :height="svgLandscape.h - svgLandscape.pad * 2"
                        fill="#22c55e"
                        opacity="0.10"
                      />
                      <line
                        :x1="svgLandscape.xFor(breakevenPoint.price)"
                        :x2="svgLandscape.xFor(breakevenPoint.price)"
                        :y1="svgLandscape.pad"
                        :y2="svgLandscape.h - svgLandscape.pad"
                        stroke="#cbd5e1"
                        stroke-dasharray="4 4"
                      />
                      <line
                        :x1="svgLandscape.xFor(previewSettlementPrice)"
                        :x2="svgLandscape.xFor(previewSettlementPrice)"
                        :y1="svgLandscape.pad"
                        :y2="svgLandscape.h - svgLandscape.pad"
                        stroke="#0ea5e9"
                        stroke-dasharray="6 4"
                        opacity="0.85"
                      />
                      <line
                        v-if="hoverSettlementPrice !== null"
                        :x1="svgLandscape.xFor(hoverSettlementPrice)"
                        :x2="svgLandscape.xFor(hoverSettlementPrice)"
                        :y1="svgLandscape.pad"
                        :y2="svgLandscape.h - svgLandscape.pad"
                        stroke="#0f172a"
                        stroke-dasharray="4 4"
                        opacity="0.75"
                      />
                      <path :d="svgLandscape.path" fill="none" stroke="#0f172a" stroke-width="2.25" />
                      <circle
                        :cx="svgLandscape.xFor(bestPoint.price)"
                        :cy="svgLandscape.yFor(bestPoint.profit)"
                        r="5"
                        fill="#22c55e"
                      />
                      <circle
                        :cx="svgLandscape.xFor(breakevenPoint.price)"
                        :cy="svgLandscape.yFor(breakevenPoint.profit)"
                        r="4.2"
                        fill="#64748b"
                      />
                      <circle
                        :cx="svgLandscape.xFor(marketPrice)"
                        :cy="svgLandscape.yFor(platformProfitAtForCurve(marketPrice))"
                        r="4.2"
                        fill="#0ea5e9"
                      />
                    </g>
                  </svg>

                  <div class="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
                    <div>
                      <div class="text-slate-400">盈亏平衡</div>
                      <button
                        type="button"
                        class="font-mono text-slate-900 hover:underline disabled:opacity-40"
                        :disabled="locked"
                        @click="fillSettlementPrice(breakevenPoint.price, '盈亏平衡')"
                      >
                        {{ formatPrice(breakevenPoint.price) }}
                      </button>
                    </div>
                    <div>
                      <div class="text-slate-400">最大利润点</div>
                      <button
                        type="button"
                        class="font-mono text-slate-900 hover:underline disabled:opacity-40"
                        :disabled="locked"
                        @click="fillSettlementPrice(bestPoint.price, '最大利润点')"
                      >
                        {{ formatPrice(bestPoint.price) }}
                      </button>
                    </div>
                    <div>
                      <div class="text-slate-400">预演结算价</div>
                      <div class="font-mono text-slate-900">
                        <span v-if="mode === 'squeeze'">{{ formatPrice(settlementPrices.long) }} / {{ formatPrice(settlementPrices.short) }}</span>
                        <span v-else>{{ formatPrice(previewSettlementPrice) }}</span>
                      </div>
                    </div>
                  </div>
                </div>

               
              </div>
            </section>

           
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 220ms ease, opacity 220ms ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(24px);
  opacity: 0;
}
</style>
