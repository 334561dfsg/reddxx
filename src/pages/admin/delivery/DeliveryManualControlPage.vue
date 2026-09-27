<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { deliveryContractsData, deliveryWhalesList } from '../../../admin/mock/deliveryReport'

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

const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

const baseMarketPrice = (symbol) => {
  const s = String(symbol || '').toUpperCase()
  if (s.includes('BTC')) return 68000
  if (s.includes('ETH')) return 3500
  if (s.includes('SOL')) return 150
  if (s.includes('XRP')) return 0.62
  if (s.includes('DOGE')) return 0.18
  if (s.includes('ARB')) return 0.95
  const seed = s.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return 1 + (seed % 2500) / 10
}

const marketVolatilityPct = (symbol) => {
  const s = String(symbol || '').toUpperCase()
  if (s.includes('BTC')) return 0.0009
  if (s.includes('ETH')) return 0.0012
  if (s.includes('SOL')) return 0.002
  return 0.0016
}

const tickSizeFor = (symbol, price) => {
  const s = String(symbol || '').toUpperCase()
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

const now = ref(Date.now())

const riskBoard = ref(
  deliveryContractsData.map((c) => {
    const tierSec = Number(String(c.cycleType || '').replace('s', '')) || Number(String(c.symbol).match(/(\d+)S$/)?.[1]) || 60
    const baseSymbol = String(c.symbol || '').replace(/\d+S$/i, '')
    const seed = String(c.symbol || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
    const marketPrice = baseMarketPrice(baseSymbol)
    const remainSec = 1 + (seed % Math.max(1, tierSec))
    const baseDelta = Number(c.platformPnl24h || 0)
    const initialDelta = baseDelta * (baseDelta < 0 ? 0.8 : 0.35)
    return {
      key: c.symbol,
      asset: baseSymbol,
      tierSec,
      marketPrice,
      platformDelta: initialDelta,
      remainSec,
      lastManualAt: null
    }
  })
)

const platformLoss = (delta) => Math.max(0, -Number(delta || 0))

const sortedRiskBoard = computed(() => {
  return [...riskBoard.value].sort((a, b) => {
    const lossDiff = platformLoss(b.platformDelta) - platformLoss(a.platformDelta)
    if (lossDiff !== 0) return lossDiff
    return Number(b.platformDelta || 0) - Number(a.platformDelta || 0)
  })
})

const selectedKey = ref(sortedRiskBoard.value[0]?.key || '')

const selectedRow = computed(() => {
  return riskBoard.value.find((row) => row.key === selectedKey.value) || sortedRiskBoard.value[0] || null
})

const marketPrice = computed(() => Number(selectedRow.value?.marketPrice || 0))
const tickSize = computed(() => tickSizeFor(selectedRow.value?.asset || '', marketPrice.value))

const priceBandPct = computed(() => {
  const p = marketPrice.value
  if (p >= 1000) return 0.02
  if (p >= 10) return 0.03
  return 0.05
})

const priceMin = computed(() => roundToTick(marketPrice.value * (1 - priceBandPct.value), tickSize.value))
const priceMax = computed(() => roundToTick(marketPrice.value * (1 + priceBandPct.value), tickSize.value))

const manualPrice = ref(0)
const locked = ref(false)
const spoofEnabled = ref(false)
const spoofOrders = ref([])
const flaggedUsers = ref(new Set())
const lastAction = ref('')

const ensureManualInBand = () => {
  const p = Number(manualPrice.value || 0)
  const next = roundToTick(clamp(p, priceMin.value, priceMax.value), tickSize.value)
  if (!Number.isFinite(next)) return
  if (next !== p) manualPrice.value = next
}

watch([priceMin, priceMax, tickSize], ensureManualInBand)

watch(
  selectedKey,
  () => {
    const p = marketPrice.value
    manualPrice.value = roundToTick(p, tickSize.value)
    locked.value = false
    spoofOrders.value = []
    lastAction.value = ''
  },
  { immediate: true }
)

const deviationPct = computed(() => {
  const m = marketPrice.value
  if (!m) return 0
  return Math.abs(Number(manualPrice.value || 0) - m) / m
})

const deviationWarn = computed(() => deviationPct.value >= 0.004)

const isSprint = computed(() => Number(selectedRow.value?.remainSec || 0) <= 5)

const relevantWhales = computed(() => {
  const key = selectedRow.value?.key
  if (!key) return []
  return deliveryWhalesList
    .filter((w) => Array.isArray(w.contracts) && w.contracts.includes(key))
    .map((w) => {
      const side = Number(w.longPosition || 0) >= Number(w.shortPosition || 0) ? 'long' : 'short'
      const holdingUsd = Number(w.totalPosition || 0)
      const qty = holdingUsd && marketPrice.value ? holdingUsd / marketPrice.value : 0
      const pnl = Number(w.pnl24h || 0)
      const entryPrice = qty
        ? side === 'long'
          ? marketPrice.value - pnl / qty
          : marketPrice.value + pnl / qty
        : marketPrice.value
      return {
        uid: String(w.userId || w.username || '').replace(/^user_/, ''),
        side,
        holdingUsd,
        pnl,
        entryPrice,
        qty,
        raw: w
      }
    })
    .sort((a, b) => Number(b.pnl || 0) - Number(a.pnl || 0))
})

const userPnlAt = (pos, settlementPrice) => {
  const p = Number(settlementPrice || 0)
  const entry = Number(pos.entryPrice || 0)
  const qty = Number(pos.qty || 0)
  if (!qty) return 0
  const signed = (p - entry) * qty
  return pos.side === 'short' ? -signed : signed
}

const platformProfitAt = (settlementPrice) => {
  return -relevantWhales.value.reduce((sum, pos) => sum + userPnlAt(pos, settlementPrice), 0)
}

const profitCurve = computed(() => {
  const min = priceMin.value
  const max = priceMax.value
  const steps = 80
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return []
  const points = []
  for (let i = 0; i <= steps; i++) {
    const price = min + ((max - min) * i) / steps
    points.push({ price, profit: platformProfitAt(price) })
  }
  return points
})

const bestPrice = computed(() => {
  if (profitCurve.value.length === 0) return manualPrice.value
  let best = profitCurve.value[0]
  for (const p of profitCurve.value) {
    if (p.profit > best.profit) best = p
  }
  return roundToTick(best.price, tickSize.value)
})

const bestProfit = computed(() => platformProfitAt(bestPrice.value))

const svgCurve = computed(() => {
  const points = profitCurve.value
  if (points.length === 0) return { path: '', minProfit: 0, maxProfit: 0 }
  const profits = points.map((p) => p.profit)
  const minProfit = Math.min(...profits)
  const maxProfit = Math.max(...profits)
  const span = maxProfit - minProfit || 1
  const w = 420
  const h = 120
  const pad = 10
  const xFor = (price) => {
    const t = (price - priceMin.value) / (priceMax.value - priceMin.value)
    return pad + t * (w - pad * 2)
  }
  const yFor = (profit) => {
    const t = (profit - minProfit) / span
    return h - pad - t * (h - pad * 2)
  }
  const d = points
    .map((p, idx) => {
      const x = xFor(p.price)
      const y = yFor(p.profit)
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
  return { path: d, minProfit, maxProfit, xFor, yFor, w, h, pad }
})

const markerX = (price) => {
  if (!svgCurve.value.xFor) return 0
  return svgCurve.value.xFor(price)
}

const markerY = (profit) => {
  if (!svgCurve.value.yFor) return 0
  return svgCurve.value.yFor(profit)
}

const candlesByKey = ref({})

const initCandles = (key, basePrice) => {
  const tick = tickSizeFor(key, basePrice)
  const candles = []
  let last = basePrice
  const span = 28
  for (let i = 0; i < span; i++) {
    const open = last
    const close = open * (1 + (Math.random() * 2 - 1) * 0.0015)
    const high = Math.max(open, close) * (1 + Math.random() * 0.001)
    const low = Math.min(open, close) * (1 - Math.random() * 0.001)
    last = close
    candles.push({
      o: roundToTick(open, tick),
      h: roundToTick(high, tick),
      l: roundToTick(low, tick),
      c: roundToTick(close, tick)
    })
  }
  return candles
}

const kline = computed(() => {
  const key = selectedRow.value?.key
  if (!key) return []
  const existing = candlesByKey.value[key]
  if (Array.isArray(existing) && existing.length > 0) return existing
  const seeded = initCandles(key, marketPrice.value)
  candlesByKey.value = { ...candlesByKey.value, [key]: seeded }
  return seeded
})

const klineSvg = computed(() => {
  const candles = kline.value
  if (!candles.length) return { w: 420, h: 140, items: [], min: 0, max: 0, manualY: 0, marketY: 0 }
  const w = 420
  const h = 140
  const pad = 10
  const highs = candles.map((c) => c.h)
  const lows = candles.map((c) => c.l)
  const min = Math.min(...lows)
  const max = Math.max(...highs)
  const span = max - min || 1
  const yFor = (price) => {
    const t = (price - min) / span
    return h - pad - t * (h - pad * 2)
  }
  const xStep = (w - pad * 2) / candles.length
  const bodyW = Math.max(3, xStep * 0.55)
  const items = candles.map((c, idx) => {
    const xCenter = pad + xStep * idx + xStep / 2
    const up = c.c >= c.o
    const yOpen = yFor(c.o)
    const yClose = yFor(c.c)
    const yHigh = yFor(c.h)
    const yLow = yFor(c.l)
    const yTop = Math.min(yOpen, yClose)
    const yBottom = Math.max(yOpen, yClose)
    return {
      x: xCenter,
      up,
      yOpen,
      yClose,
      yHigh,
      yLow,
      yTop,
      yBottom,
      bodyH: Math.max(2, yBottom - yTop),
      bodyW
    }
  })
  const manualY = yFor(Number(manualPrice.value || 0))
  const marketY = yFor(marketPrice.value)
  return { w, h, pad, min, max, items, manualY, marketY }
})

const computeSpoofOrders = (fromPrice, toPrice) => {
  const mp = marketPrice.value
  const direction = toPrice > fromPrice ? 'up' : toPrice < fromPrice ? 'down' : 'flat'
  const base = direction === 'up' ? '买单' : direction === 'down' ? '卖单' : '挂单'
  const side = direction === 'up' ? 'buy' : direction === 'down' ? 'sell' : 'neutral'
  const count = 4
  const tick = tickSize.value
  const list = []
  for (let i = 0; i < count; i++) {
    const offsetTicks = 6 + i * 4
    const px = direction === 'up' ? mp + offsetTicks * tick : direction === 'down' ? mp - offsetTicks * tick : mp + (i - 2) * tick
    const size = Math.round(80_000 + Math.random() * 220_000)
    list.push({
      id: `${Date.now()}_${i}`,
      side,
      label: base,
      price: roundToTick(px, tick),
      sizeUsd: size
    })
  }
  return list
}

watch(
  manualPrice,
  (next, prev) => {
    if (locked.value) return
    ensureManualInBand()
    if (!spoofEnabled.value) return
    spoofOrders.value = computeSpoofOrders(Number(prev || 0), Number(next || 0))
  },
  { flush: 'post' }
)

const pickRow = (row) => {
  if (!row?.key) return
  selectedKey.value = row.key
}

const oneClickFlatten = () => {
  if (locked.value) return
  manualPrice.value = bestPrice.value
  lastAction.value = `一键抹平：${formatPrice(bestPrice.value)}（平台利润峰值 ${formatCompactUsd(bestProfit.value, true)}）`
}

const lockResult = () => {
  locked.value = true
  lastAction.value = `锁定结果：${formatPrice(manualPrice.value)}`
}

const undoIntervention = () => {
  locked.value = false
  manualPrice.value = roundToTick(marketPrice.value, tickSize.value)
  spoofOrders.value = []
  lastAction.value = '撤销干预：回到市价'
}

const confirmHarvest = () => {
  const row = selectedRow.value
  if (!row) return
  row.lastManualAt = now.value
  lastAction.value = `确定收割：${row.key} 结算价 ${formatPrice(manualPrice.value)}`
  alert(`已提交：${row.key} 结算价 ${formatPrice(manualPrice.value)}\n（示意页面：未接真实接口）`)
}

const harvestAll = () => {
  if (locked.value) return
  manualPrice.value = bestPrice.value
  locked.value = true
  lastAction.value = `一键收割以上所有人：${formatPrice(manualPrice.value)}`
}

const harvestOneWhale = (pos) => {
  if (locked.value) return
  const tick = tickSize.value
  const target = pos.side === 'long' ? pos.entryPrice - tick : pos.entryPrice + tick
  manualPrice.value = roundToTick(clamp(target, priceMin.value, priceMax.value), tick)
  lastAction.value = `精准插针：${pos.uid} → ${formatPrice(manualPrice.value)}`
}

const toggleFlag = (pos) => {
  const set = new Set(flaggedUsers.value)
  if (set.has(pos.uid)) set.delete(pos.uid)
  else set.add(pos.uid)
  flaggedUsers.value = set
}

let timer = null
onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
    riskBoard.value = riskBoard.value.map((row) => {
      const vol = marketVolatilityPct(row.asset)
      const nextMarket = Math.max(tickSizeFor(row.asset, row.marketPrice), row.marketPrice * (1 + (Math.random() * 2 - 1) * vol))
      const base = Number(deliveryContractsData.find((c) => c.symbol === row.key)?.platformPnl24h || 0) * (baseMarketPrice(row.asset) >= 1000 ? 0.45 : 0.35)
      const jittered = base * (1 + (Math.random() * 2 - 1) * 0.18) + (Math.random() * 2 - 1) * Math.abs(base) * 0.08
      const nextDelta = Number.isFinite(jittered) ? jittered : row.platformDelta
      const nextRemain = row.remainSec - 1 <= 0 ? row.tierSec : row.remainSec - 1
      const nextRow = { ...row, marketPrice: nextMarket, platformDelta: nextDelta, remainSec: nextRemain }
      const key = row.key
      const prev = candlesByKey.value[key]
      if (Array.isArray(prev) && prev.length) {
        const tick = tickSizeFor(row.asset, nextMarket)
        const last = prev[prev.length - 1]
        const open = last.c
        const close = roundToTick(nextMarket, tick)
        const high = roundToTick(Math.max(open, close) * (1 + Math.random() * 0.0012), tick)
        const low = roundToTick(Math.min(open, close) * (1 - Math.random() * 0.0012), tick)
        const nextCandle = { o: open, h: high, l: low, c: close }
        const nextSeries = prev.length >= 34 ? [...prev.slice(1), nextCandle] : [...prev, nextCandle]
        candlesByKey.value = { ...candlesByKey.value, [key]: nextSeries }
      }
      return nextRow
    })
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const heatStyle = (row) => {
  const loss = platformLoss(row.platformDelta)
  const maxLoss = Math.max(1, ...riskBoard.value.map((r) => platformLoss(r.platformDelta)))
  const t = clamp(loss / maxLoss, 0, 1)
  if (loss > 0) {
    return { background: `linear-gradient(90deg, rgba(244,63,94,${0.10 + 0.25 * t}) 0%, rgba(244,63,94,0.04) 72%, rgba(255,255,255,0) 100%)` }
  }
  const profit = Math.max(0, Number(row.platformDelta || 0))
  const maxProfit = Math.max(1, ...riskBoard.value.map((r) => Math.max(0, Number(r.platformDelta || 0))))
  const k = clamp(profit / maxProfit, 0, 1)
  return { background: `linear-gradient(90deg, rgba(16,185,129,${0.08 + 0.18 * k}) 0%, rgba(16,185,129,0.03) 72%, rgba(255,255,255,0) 100%)` }
}

const rowTone = (row) => {
  const v = Number(row.platformDelta || 0)
  return v < 0 ? 'text-rose-600' : v > 0 ? 'text-emerald-600' : 'text-slate-600'
}
</script>

<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">交割合约 · 手动场控</h1>
        <p class="mt-1 text-sm text-slate-500">左：全盘风险热力｜中：深度作战区｜右：元凶追踪与精准场控</p>
      </div>
      <div class="flex items-center gap-2 text-xs text-slate-500">
        <span>刷新：1s</span>
        <span class="font-mono">{{ new Date(now).toISOString().replace('T', ' ').split('.')[0] }}</span>
      </div>
    </header>

    <div class="grid gap-4 lg:grid-cols-12">
      <aside class="lg:col-span-3 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50/40">
          <div>
            <h2 class="text-sm font-semibold text-slate-900">全盘风险实时榜</h2>
            <p class="mt-0.5 text-[11px] text-slate-500">按平台即时亏损额倒序，点红联动右侧</p>
          </div>
          <div class="text-[11px] text-slate-400 font-mono">Global Risk Heatmap</div>
        </div>
        <div class="max-h-[36rem] overflow-y-auto divide-y divide-slate-100">
          <a-button type="text"
            v-for="row in sortedRiskBoard"
            :key="row.key"
            html-type="button"
            class="w-full text-left px-4 py-3 transition-all hover:bg-slate-50/60"
            :class="row.key === selectedKey ? 'bg-slate-50 ring-1 ring-inset ring-blue-200' : ''"
            :style="heatStyle(row)"
            @click="pickRow(row)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-slate-900">{{ row.asset }}-{{ row.tierSec }}s</span>
                  <span v-if="row.lastManualAt" class="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">已干预</span>
                </div>
                <div class="mt-1 text-xs text-slate-500">
                  <span class="font-mono" :class="rowTone(row)">{{ formatCompactUsd(row.platformDelta, true) }}</span>
                  <span class="mx-2 text-slate-300">|</span>
                  <span class="font-mono">倒计时 {{ row.remainSec }}s</span>
                </div>
              </div>
              <div class="flex flex-col items-end">
                <span class="text-[11px] text-slate-400">Delta</span>
                <span class="text-xs font-mono text-slate-700">{{ formatPrice(row.marketPrice) }}</span>
              </div>
            </div>
          </a-button>
        </div>
      </aside>

      <main class="lg:col-span-6 space-y-4">
        <article
          class="rounded-xl border border-slate-200 bg-white shadow-sm p-5 transition-all"
          :class="isSprint ? 'ring-2 ring-rose-500 bg-rose-50/40 scale-[1.01]' : ''"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-sm font-semibold text-slate-900">深度作战区</h2>
              <p class="mt-0.5 text-[11px] text-slate-500">拨盘直接落点到 K 线，且联动利润曲线峰值</p>
            </div>
            <div class="text-right">
              <div class="text-[11px] text-slate-400 font-mono">The Kill Zone</div>
              <div class="mt-1 text-xs text-slate-600">
                <span class="font-semibold text-slate-900">{{ selectedRow?.key || '-' }}</span>
                <span class="mx-2 text-slate-300">|</span>
                <span class="font-mono">倒计时 {{ selectedRow?.remainSec ?? '-' }}s</span>
              </div>
            </div>
          </div>

          <div class="mt-4 grid gap-4 md:grid-cols-12">
            <div class="md:col-span-7">
              <div class="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
                <div class="flex items-center justify-between mb-2">
                  <div class="text-xs text-slate-600">实时 K 线 + 场控落点</div>
                  <div class="text-[11px] text-slate-500 font-mono">
                    市价 <span class="text-slate-900">{{ formatPrice(marketPrice) }}</span>
                  </div>
                </div>
                <svg :viewBox="`0 0 ${klineSvg.w} ${klineSvg.h}`" class="w-full h-36">
                  <rect x="0" y="0" :width="klineSvg.w" :height="klineSvg.h" fill="white" rx="8" />
                  <g>
                    <line x1="0" :y1="klineSvg.marketY" :x2="klineSvg.w" :y2="klineSvg.marketY" stroke="rgba(148,163,184,0.8)" stroke-dasharray="4 4" />
                    <line x1="0" :y1="klineSvg.manualY" :x2="klineSvg.w" :y2="klineSvg.manualY" stroke="rgba(37,99,235,0.9)" />
                    <g v-for="(c, idx) in klineSvg.items" :key="`c-${idx}`">
                      <line :x1="c.x" :x2="c.x" :y1="c.yHigh" :y2="c.yLow" :stroke="c.up ? 'rgba(16,185,129,0.9)' : 'rgba(244,63,94,0.9)'" stroke-width="1" />
                      <rect
                        :x="c.x - c.bodyW / 2"
                        :y="c.yTop"
                        :width="c.bodyW"
                        :height="c.bodyH"
                        :fill="c.up ? 'rgba(16,185,129,0.55)' : 'rgba(244,63,94,0.55)'"
                        :stroke="c.up ? 'rgba(16,185,129,0.85)' : 'rgba(244,63,94,0.85)'"
                        stroke-width="1"
                      />
                    </g>
                    <line
                      :x1="klineSvg.w * 0.65"
                      :y1="klineSvg.items[klineSvg.items.length - 1]?.yClose ?? klineSvg.marketY"
                      :x2="klineSvg.w - klineSvg.pad"
                      :y2="klineSvg.manualY"
                      stroke="rgba(59,130,246,0.55)"
                      stroke-width="2"
                    />
                  </g>
                </svg>

                <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <label class="inline-flex items-center gap-2 text-xs text-slate-600">
                    <a-checkbox v-model:checked="spoofEnabled" class="" :disabled="locked" />
                    <span>同步产生虚假成交</span>
                  </label>
                  <div class="flex items-center gap-2">
                    <a-button html-type="button" class="ant-btn ant-btn-default !h-9 !px-3 !text-xs" :disabled="locked" @click="oneClickFlatten">
                      一键抹平
                    </a-button>
                    <a-button type="primary" html-type="button" class="ant-btn ant-btn-primary !h-9 !px-3 !text-xs" :disabled="locked" @click="confirmHarvest">
                      确定收割
                    </a-button>
                    <a-button html-type="button" class="ant-btn !h-9 !px-3 !text-xs" @click="undoIntervention">撤销干预</a-button>
                  </div>
                </div>
              </div>

              <div v-if="spoofEnabled && spoofOrders.length" class="mt-3 rounded-lg border border-slate-200 bg-white overflow-hidden">
                <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <h3 class="text-xs font-semibold text-slate-900">虚假量能联动（示意）</h3>
                  <span class="text-[11px] text-slate-500">Orderbook Spoofing</span>
                </div>
                <a-table  size="small" :pagination="false" :data-source="spoofOrders" :row-key="(o) => o.id" :scroll="{ x: 'max-content' }">
<a-table-column key="column-0" :custom-cell="(o, rowIndex) => ({ class: [&quot;px-4 py-2&quot;, o.side === 'buy' ? 'text-emerald-700' : o.side === 'sell' ? 'text-rose-700' : 'text-slate-700'] })">
<template #title>类型</template>
<template #default="{ record: o, index: rowIndex }">
                        {{ o.label }}
                      </template>
</a-table-column>
<a-table-column key="column-1" align="right" :custom-cell="(o, rowIndex) => ({ class: [&quot;px-4 py-2 text-right font-mono&quot;] })">
<template #title>价格</template>
<template #default="{ record: o, index: rowIndex }">{{ formatPrice(o.price) }}</template>
</a-table-column>
<a-table-column key="column-2" align="right" :custom-cell="(o, rowIndex) => ({ class: [&quot;px-4 py-2 text-right font-mono&quot;] })">
<template #title>数量(USDT)</template>
<template #default="{ record: o, index: rowIndex }">{{ formatCompactUsd(o.sizeUsd) }}</template>
</a-table-column>
</a-table>
              </div>
            </div>

            <div class="md:col-span-5 space-y-4">
              <div class="rounded-lg border border-slate-200 bg-white p-4">
                <div class="flex items-start justify-between">
                  <div>
                    <h3 class="text-xs font-semibold text-slate-900">手动拨盘</h3>
                    <p class="mt-0.5 text-[11px] text-slate-500">偏离过大将闪烁预警</p>
                  </div>
                  <div class="text-right">
                    <p class="text-[11px] text-slate-400">偏离</p>
                    <p class="text-xs font-mono" :class="deviationWarn ? 'text-rose-600' : 'text-slate-700'">{{ (deviationPct * 100).toFixed(2) }}%</p>
                  </div>
                </div>

                <div class="mt-3 space-y-3">
                  <a-slider
                    :min="priceMin"
                    :max="priceMax"
                    :step="tickSize"
                    v-model:value.number="manualPrice"
                    class="w-full"
                    :disabled="locked"
                  />
                  <div class="grid grid-cols-2 gap-2">
                    <div class="rounded border border-slate-200 px-3 py-2">
                      <p class="text-[11px] text-slate-500">范围</p>
                      <p class="mt-1 text-xs font-mono text-slate-900">{{ formatPrice(priceMin) }} ~ {{ formatPrice(priceMax) }}</p>
                    </div>
                    <div class="rounded border border-slate-200 px-3 py-2">
                      <p class="text-[11px] text-slate-500">建议峰值</p>
                      <p class="mt-1 text-xs font-mono text-slate-900">{{ formatPrice(bestPrice) }}</p>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <a-input
                      type="number"
                      v-model:value.number="manualPrice"
                      :step="tickSize"
                      :disabled="locked"
                      class="flex-1 rounded border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-200"
                      :class="deviationWarn ? 'flash-warn border-rose-300' : ''"
                    />
                    <a-button html-type="button" class="ant-btn ant-btn-default !h-10 !px-3 !text-xs" :disabled="locked" @click="manualPrice = roundToTick(marketPrice, tickSize)">
                      贴近市价
                    </a-button>
                  </div>

                  <div class="flex items-center justify-between gap-2">
                    <a-button html-type="button" class="ant-btn ant-btn-default !h-9 !px-3 !text-xs" :disabled="locked" @click="harvestAll">
                      一键收割以上所有人
                    </a-button>
                    <a-button type="primary" html-type="button" class="ant-btn ant-btn-primary !h-9 !px-3 !text-xs" :disabled="locked || !isSprint" @click="lockResult">
                      锁定结果
                    </a-button>
                  </div>
                </div>
              </div>

              <div class="rounded-lg border border-slate-200 bg-white p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-xs font-semibold text-slate-900">盈亏平衡点与利润曲线</h3>
                    <p class="mt-0.5 text-[11px] text-slate-500">横轴价格，纵轴平台利润</p>
                  </div>
                  <div class="text-right">
                    <p class="text-[11px] text-slate-400">峰值利润</p>
                    <p class="text-xs font-mono" :class="bestProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'">{{ formatCompactUsd(bestProfit, true) }}</p>
                  </div>
                </div>
                <div class="mt-3 rounded-md border border-slate-200 bg-slate-50/40 p-2">
                  <svg v-if="svgCurve.path" :viewBox="`0 0 ${svgCurve.w} ${svgCurve.h}`" class="w-full h-32">
                    <rect x="0" y="0" :width="svgCurve.w" :height="svgCurve.h" fill="white" rx="8" />
                    <path :d="svgCurve.path" fill="none" stroke="rgba(37,99,235,0.9)" stroke-width="2" />
                    <line
                      :x1="markerX(marketPrice)"
                      :x2="markerX(marketPrice)"
                      y1="8"
                      :y2="svgCurve.h - 8"
                      stroke="rgba(148,163,184,0.85)"
                      stroke-dasharray="4 4"
                    />
                    <line
                      :x1="markerX(manualPrice)"
                      :x2="markerX(manualPrice)"
                      y1="8"
                      :y2="svgCurve.h - 8"
                      stroke="rgba(37,99,235,0.55)"
                    />
                    <line
                      :x1="markerX(bestPrice)"
                      :x2="markerX(bestPrice)"
                      y1="8"
                      :y2="svgCurve.h - 8"
                      stroke="rgba(16,185,129,0.8)"
                    />
                    <circle :cx="markerX(manualPrice)" :cy="markerY(platformProfitAt(manualPrice))" r="4" fill="rgba(37,99,235,0.95)" />
                    <circle :cx="markerX(bestPrice)" :cy="markerY(platformProfitAt(bestPrice))" r="4" fill="rgba(16,185,129,0.95)" />
                  </svg>
                  <div v-else class="h-32 flex items-center justify-center text-xs text-slate-500">暂无利润曲线数据</div>
                </div>
                <div class="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div class="rounded border border-slate-200 px-3 py-2">
                    <p class="text-[11px] text-slate-500">市价</p>
                    <p class="mt-1 font-mono text-slate-900">{{ formatPrice(marketPrice) }}</p>
                  </div>
                  <div class="rounded border border-slate-200 px-3 py-2">
                    <p class="text-[11px] text-slate-500">当前拨盘</p>
                    <p class="mt-1 font-mono text-slate-900">{{ formatPrice(manualPrice) }}</p>
                  </div>
                  <div class="rounded border border-slate-200 px-3 py-2">
                    <p class="text-[11px] text-slate-500">峰值点</p>
                    <p class="mt-1 font-mono text-slate-900">{{ formatPrice(bestPrice) }}</p>
                  </div>
                </div>
              </div>

              <div v-if="lastAction" class="rounded-lg border border-slate-200 bg-slate-50/40 px-4 py-3 text-xs text-slate-700">
                <span class="font-semibold text-slate-900">动作</span>
                <span class="ml-2 font-mono">{{ lastAction }}</span>
              </div>
            </div>
          </div>
        </article>
      </main>

      <aside class="lg:col-span-3 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50/40">
          <div>
            <h2 class="text-sm font-semibold text-slate-900">亏损源分析与精准收割</h2>
            <p class="mt-0.5 text-[11px] text-slate-500">直接定位导致平台亏损的大户</p>
          </div>
          <div class="text-[11px] text-slate-400 font-mono">Whale Hunter Panel</div>
        </div>

        <div class="p-4 space-y-3">
          <div v-if="relevantWhales.length === 0" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <p class="text-sm text-slate-600">该档位暂无元凶大户</p>
            <p class="mt-1 text-[11px] text-slate-400">切换左侧红色合约查看</p>
          </div>

          <div v-else class="space-y-2">
            <div class="rounded-lg border border-slate-200 overflow-hidden">
              <a-table  size="small" :pagination="false" :data-source="relevantWhales.slice(0, 8)" :row-key="(u) => u.uid" :scroll="{ x: 'max-content' }" :custom-row="(u, idx) => ({ class: [&quot;hover:bg-slate-50/70&quot;] })">
<a-table-column key="column-0" :custom-cell="(u, idx) => ({ class: [&quot;px-4 py-2&quot;] })">
<template #title>用户</template>
<template #default="{ record: u, index: idx }">
                      <div class="flex items-center gap-2">
                        <span class="text-slate-400 font-mono">#{{ idx + 1 }}</span>
                        <span class="font-semibold text-slate-900 font-mono">{{ u.uid }}</span>
                        <span v-if="flaggedUsers.has(u.uid)" class="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">已标记</span>
                      </div>
                    </template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(u, idx) => ({ class: [&quot;px-4 py-2&quot;] })">
<template #title>方向</template>
<template #default="{ record: u, index: idx }">
                      <span class="inline-flex items-center gap-1 rounded px-2 py-1 border text-[11px]"
                        :class="u.side === 'long' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-rose-50 border-rose-200 text-rose-700'"
                      >
                        {{ u.side === 'long' ? '多' : '空' }}
                      </span>
                    </template>
</a-table-column>
<a-table-column key="column-2" align="right" :custom-cell="(u, idx) => ({ class: [&quot;px-4 py-2 text-right font-mono&quot;] })">
<template #title>持仓</template>
<template #default="{ record: u, index: idx }">{{ formatCompactUsd(u.holdingUsd) }}</template>
</a-table-column>
<a-table-column key="column-3" align="right" :custom-cell="(u, idx) => ({ class: [&quot;px-4 py-2 text-right font-mono&quot;, u.pnl >= 0 ? 'text-rose-600' : 'text-emerald-600'] })">
<template #title>盈亏</template>
<template #default="{ record: u, index: idx }">
                      {{ formatCompactUsd(u.pnl, true) }}
                    </template>
</a-table-column>
<a-table-column key="column-4" align="right" :custom-cell="(u, idx) => ({ class: [&quot;px-4 py-2&quot;] })">
<template #title>操作</template>
<template #default="{ record: u, index: idx }">
                      <div class="flex justify-end gap-2">
                        <a-button html-type="button" class="ant-btn ant-btn-default !h-8 !px-2 !text-xs" :disabled="locked" @click="harvestOneWhale(u)">
                          收割
                        </a-button>
                        <a-button html-type="button" class="ant-btn !h-8 !px-2 !text-xs" @click="toggleFlag(u)">
                          禁封/滑点
                        </a-button>
                      </div>
                    </template>
</a-table-column>
</a-table>
            </div>

            <div class="rounded-lg border border-slate-200 bg-slate-50/40 p-4 text-xs text-slate-700 space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-slate-900">精准插针提示</span>
                <span class="text-[11px] text-slate-500">最小位移使目标用户转亏（示意）</span>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div class="rounded border border-slate-200 bg-white px-3 py-2">
                  <p class="text-[11px] text-slate-500">当前结算价</p>
                  <p class="mt-1 font-mono text-slate-900">{{ formatPrice(manualPrice) }}</p>
                </div>
                <div class="rounded border border-slate-200 bg-white px-3 py-2">
                  <p class="text-[11px] text-slate-500">锁定状态</p>
                  <p class="mt-1 font-mono" :class="locked ? 'text-rose-600' : 'text-emerald-600'">{{ locked ? 'LOCKED' : 'OPEN' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.flash-warn {
  animation: warnFlash 0.9s ease-in-out infinite;
}

@keyframes warnFlash {
  0% {
    background: rgba(254, 226, 226, 0.25);
  }
  50% {
    background: rgba(244, 63, 94, 0.18);
  }
  100% {
    background: rgba(254, 226, 226, 0.25);
  }
}
</style>

