<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { PERP_CONTROL_OFFSET_DIRECTION } from '../constants/perpetualControl'

defineOptions({ name: 'PerpetualManualLineModal' })

const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

const formatCompactNumber = (n, digits) => {
  const str = Number(n).toFixed(digits)
  return str.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

const formatCompactUsd = (value, { withSign = false } = {}) => {
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
  } else {
    unit = ''
    scaled = abs
    digits = 0
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

const parseCompactUsd = (raw) => {
  if (raw == null) return 0
  const text = String(raw).trim().replaceAll(',', '')
  if (!text) return 0
  let sign = 1
  let s = text
  if (s.startsWith('+')) {
    sign = 1
    s = s.slice(1)
  } else if (s.startsWith('-')) {
    sign = -1
    s = s.slice(1)
  }
  s = s.trim()
  if (s.startsWith('$')) s = s.slice(1)
  const unit = s.slice(-1).toUpperCase()
  let multiplier = 1
  let numberPart = s
  if (unit === 'K') {
    multiplier = 1e3
    numberPart = s.slice(0, -1)
  } else if (unit === 'M') {
    multiplier = 1e6
    numberPart = s.slice(0, -1)
  } else if (unit === 'B') {
    multiplier = 1e9
    numberPart = s.slice(0, -1)
  }
  const n = Number(numberPart)
  if (!Number.isFinite(n)) return 0
  return sign * n * multiplier
}

const props = defineProps({
  open: { type: Boolean, default: false },
  contractId: { type: String, default: '' },
  contractLabel: { type: String, default: '' },
  basePrice: { type: Number, default: 0 },
  lastRefreshAt: { type: String, default: '' },
  metrics: {
    type: Object,
    default: () => ({
      volume: '-',
      users: '-',
      long: '-',
      short: '-',
      net: '-',
      ratio: '-',
      platformPnl: '-'
    })
  },
  initialConfig: { type: Object, default: () => ({}) },
  initialDurationSec: { type: Number, default: 0 },
  allowRemove: { type: Boolean, default: false },
  isManualActive: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'save', 'remove'])

const ui = reactive({
  intent: 'harvest_short',
  selectedUid: ''
})

const form = reactive({
  priceOffset: 5,
  offsetDirection: PERP_CONTROL_OFFSET_DIRECTION.AGAINST,
  latencyMs: 0,
  durationSec: 0
})

const quickManualInputs = {
  durationSec: [0, 300, 900, 1800, 3600, 7200]
}

const initFromProps = () => {
  const cfg = props.initialConfig || {}
  form.priceOffset = Number(cfg.priceOffset ?? 5)
  form.offsetDirection = PERP_CONTROL_OFFSET_DIRECTION.UP
  form.latencyMs = Number(cfg.latencyMs ?? 0)
  form.durationSec = Number(props.initialDurationSec ?? 0)
  ui.selectedUid = ''

  ui.intent = 'harvest_short'
}

watch(
  () => [props.open, props.contractId],
  ([open]) => {
    if (!open) return
    initFromProps()
    ensurePositions()
  },
  { immediate: true }
)

watch(
  () => ui.intent,
  (next) => {
    if (next === 'harvest_long') form.offsetDirection = PERP_CONTROL_OFFSET_DIRECTION.DOWN
    else if (next === 'harvest_short') form.offsetDirection = PERP_CONTROL_OFFSET_DIRECTION.UP
  }
)

const setOffsetDirection = (dir) => {
  if (dir === PERP_CONTROL_OFFSET_DIRECTION.DOWN) ui.intent = 'harvest_long'
  else ui.intent = 'harvest_short'
  form.offsetDirection = ui.intent === 'harvest_long' ? PERP_CONTROL_OFFSET_DIRECTION.DOWN : PERP_CONTROL_OFFSET_DIRECTION.UP
}

const quickPriceOffsets = [1, 2, 3, 5, 8, 13]
 

const basePrice = computed(() => {
  const p = Number(props.basePrice || 0)
  return Number.isFinite(p) && p > 0 ? p : 0
})

const ratioValue = computed(() => {
  const raw = props.metrics?.ratio
  const n = Number(String(raw || '').replaceAll(',', '').trim())
  return Number.isFinite(n) && n > 0 ? n : 1
})

const platformPnlPositive = computed(() => parseCompactUsd(props.metrics?.platformPnl) >= 0)

 

const priceOffsetFocused = ref(false)
const priceOffsetDraft = ref('0')

watch(
  () => form.priceOffset,
  (v) => {
    if (priceOffsetFocused.value) return
    priceOffsetDraft.value = String(clamp(Math.round(Number(v || 0)), 0, 50))
  },
  { immediate: true }
)

const onPriceOffsetDraftFocus = () => {
  priceOffsetFocused.value = true
}

const onPriceOffsetDraftInput = (evt) => {
  const raw = evt?.target?.value ?? ''
  priceOffsetDraft.value = raw
  const n = Number(raw)
  if (!Number.isFinite(n)) return
  form.priceOffset = clamp(Math.round(n), 0, 50)
}

const onPriceOffsetDraftBlur = () => {
  priceOffsetFocused.value = false
  form.priceOffset = clamp(Math.round(Number(form.priceOffset || 0)), 0, 50)
  priceOffsetDraft.value = String(form.priceOffset)
}

watch(
  () => form.offsetDirection,
  (dir) => {
    if (dir === PERP_CONTROL_OFFSET_DIRECTION.DOWN) return
    if (dir === PERP_CONTROL_OFFSET_DIRECTION.UP) return
    form.offsetDirection = PERP_CONTROL_OFFSET_DIRECTION.UP
    ui.intent = 'harvest_short'
  },
  { immediate: true }
)

 

 

const quoteAt = (centerPrice, offsetPoints, offsetDirection) => {
  const p0 = Number(centerPrice || 0)
  const offset = Number(offsetPoints || 0)
  let buy = p0
  let sell = p0

  if (offsetDirection === PERP_CONTROL_OFFSET_DIRECTION.AGAINST) {
    buy = p0 + offset
    sell = p0 - offset
  } else if (offsetDirection === PERP_CONTROL_OFFSET_DIRECTION.FOLLOW) {
    buy = p0 - offset
    sell = p0 + offset
  } else if (offsetDirection === PERP_CONTROL_OFFSET_DIRECTION.UP) {
    buy = p0 + offset
    sell = p0 + offset
  } else if (offsetDirection === PERP_CONTROL_OFFSET_DIRECTION.DOWN) {
    buy = p0 - offset
    sell = p0 - offset
  } else if (offsetDirection === PERP_CONTROL_OFFSET_DIRECTION.RANDOM) {
    const rand = seeded(`${props.contractId}_${Math.floor(Date.now() / 60_000)}`)()
    if (rand > 0.5) {
      buy = p0 + offset
      sell = p0 - offset
    } else {
      buy = p0 - offset
      sell = p0 + offset
    }
  }

  return { buyQuote: buy, sellQuote: sell, mid: (buy + sell) / 2 }
}

const settlementAt = ({ centerPrice, offsetPoints, offsetDirection, spreadPoints }) => {
  const { buyQuote, sellQuote, mid } = quoteAt(centerPrice, offsetPoints, offsetDirection)
  const spread = Math.max(0, Number(spreadPoints || 0))
  const long = sellQuote - spread
  const short = buyQuote + spread
  return { buyQuote, sellQuote, mid, long, short, spreadPoints: spread }
}

const platformProfitAt = ({ centerPrice, offsetPoints, offsetDirection, spreadPoints }) => {
  const { long, short } = settlementAt({ centerPrice, offsetPoints, offsetDirection, spreadPoints })
  if (!Number.isFinite(long) || !Number.isFinite(short)) return 0
  return -allPositions.value.reduce((sum, pos) => {
    const p = pos.side === 'long' ? long : short
    return sum + userPnlAt(pos, p)
  }, 0)
}

const manualPreview = computed(() => {
  const p0 = basePrice.value
  const offset = Number(form.priceOffset || 0)
  const { buyQuote, sellQuote, mid, long, short } = settlementAt({
    centerPrice: p0,
    offsetPoints: offset,
    offsetDirection: form.offsetDirection,
    spreadPoints: 0
  })
  const profitRatePct = p0 > 0 ? ((mid - p0) / p0) * 100 : 0

  return {
    marketPrice: p0,
    buyQuote,
    sellQuote,
    mid,
    longSettlementPrice: long,
    shortSettlementPrice: short,
    profitRatePct
  }
})

const outlierCheck = computed(() => {
  const p0 = manualPreview.value.marketPrice
  if (!p0) return { diffPct: 0, level: 'ok', cls: 'text-slate-600', locked: false }
  const diff = Math.max(Math.abs(manualPreview.value.buyQuote - p0), Math.abs(manualPreview.value.sellQuote - p0))
  const diffPct = (diff / p0) * 100
  if (diffPct >= 1.0) return { diffPct, level: 'danger', cls: 'text-rose-700', locked: true }
  if (diffPct >= 0.5) return { diffPct, level: 'warn', cls: 'text-amber-700', locked: false }
  return { diffPct, level: 'ok', cls: 'text-emerald-700', locked: false }
})

const positionsByContractId = reactive({})

const ensurePositions = () => {
  const id = String(props.contractId || '')
  if (!id) return
  if (positionsByContractId[id]) return
  const mp = basePrice.value || 1
  const rand = seeded(`perp_manual_${id}`)
  const maintenance = 0.005
  const maxLev = 100
  const longProb = clamp((ratioValue.value / (1 + ratioValue.value)) - 0.1, 0.2, 0.8)
  const count = 60

  const mkUid = (i) => {
    const base = Math.floor(rand() * 1_000_000)
    return String(100000 + ((base + i * 97) % 899999))
  }

  const items = []
  for (let i = 0; i < count; i++) {
    const uid = mkUid(i)
    const whaleBoost = i < 4 ? 1.9 : i < 9 ? 1.3 : 1
    const leverage = Math.max(2, Math.min(maxLev, Math.round(2 + rand() * 98)))
    const principal = Math.round((700 + rand() * 13_000) * whaleBoost)
    const side = rand() < longProb ? 'long' : 'short'

    const entrySkew =
      side === 'long'
        ? -Math.abs((rand() * 2 - 1) * (i < 4 ? 0.005 : 0.012))
        : Math.abs((rand() * 2 - 1) * (i < 4 ? 0.005 : 0.012))
    const entryPrice = mp * (1 + entrySkew)
    const notional = principal * leverage
    const qty = entryPrice ? notional / entryPrice : 0

    const liquidationPrice =
      side === 'long'
        ? entryPrice * (1 - 1 / leverage + maintenance)
        : entryPrice * (1 + 1 / leverage - maintenance)

    items.push({
      uid,
      side,
      principal,
      leverage,
      entryPrice,
      qty,
      liquidationPrice
    })
  }

  items.sort((a, b) => Number(b.principal * b.leverage) - Number(a.principal * a.leverage))
  positionsByContractId[id] = items
}

const allPositions = computed(() => {
  const id = String(props.contractId || '')
  if (!id) return []
  return positionsByContractId[id] || []
})

const userPnlAt = (pos, settlementPrice) => {
  const p = Number(settlementPrice || 0)
  const entry = Number(pos.entryPrice || 0)
  const qty = Number(pos.qty || 0)
  if (!qty || !Number.isFinite(p) || !Number.isFinite(entry)) return 0
  const signed = (p - entry) * qty
  return pos.side === 'short' ? -signed : signed
}

const riskUsers = computed(() => {
  const mp = manualPreview.value.marketPrice
  if (!mp) return []
  return allPositions.value
    .map((p) => ({
      ...p,
      pnlNow: userPnlAt(p, mp),
      liqDistance: p.side === 'long' ? Math.max(0, mp - Number(p.liquidationPrice || 0)) : Math.max(0, Number(p.liquidationPrice || 0) - mp)
    }))
    .sort((a, b) => Number(b.pnlNow) - Number(a.pnlNow))
    .slice(0, 24)
})

const priceBandPct = computed(() => {
  const p = manualPreview.value.marketPrice
  if (p >= 1000) return 0.02
  if (p >= 10) return 0.03
  return 0.05
})

const bandMin = computed(() => manualPreview.value.marketPrice * (1 - priceBandPct.value))
const bandMax = computed(() => manualPreview.value.marketPrice * (1 + priceBandPct.value))

const moneyMap = computed(() => {
  const mp = manualPreview.value.marketPrice
  const min = bandMin.value
  const max = bandMax.value
  if (!mp || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) return { bins: [], maxV: 0, mp, min, max }
  const binCount = 26
  const w = (max - min) / binCount
  const bins = Array.from({ length: binCount }, (_, i) => ({
    from: min + i * w,
    to: min + (i + 1) * w,
    c: min + (i + 0.5) * w,
    longV: 0,
    shortV: 0
  }))

  for (const pos of allPositions.value) {
    const liq = Number(pos.liquidationPrice || 0)
    if (!Number.isFinite(liq) || liq <= 0) continue
    const idx = clamp(Math.floor((liq - min) / w), 0, binCount - 1)
    const v = Number(pos.principal || 0) * Number(pos.leverage || 0)
    if (pos.side === 'long') bins[idx].longV += v
    else bins[idx].shortV += v
  }

  const maxV = Math.max(1, ...bins.map((b) => Math.max(b.longV, b.shortV)))
  return { bins, maxV, mp, min, max }
})

const curve = computed(() => {
  const min = bandMin.value
  const max = bandMax.value
  const mp = manualPreview.value.marketPrice
  if (!mp || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return { w: 620, h: 160, pad: 14, path: '', points: [], best: { price: mp, profit: 0 }, mp }
  }
  const samples = 64
  const points = Array.from({ length: samples }, (_, i) => {
    const price = min + (i / (samples - 1)) * (max - min)
    const profit = platformProfitAt({
      centerPrice: price,
      offsetPoints: Number(form.priceOffset || 0),
      offsetDirection: form.offsetDirection,
      spreadPoints: 0
    })
    return { price, profit }
  })

  const profits = points.map((p) => p.profit)
  const minY = Math.min(...profits, 0)
  const maxY = Math.max(...profits, 0)

  const best = points.reduce((acc, cur) => (cur.profit > acc.profit ? cur : acc), points[0] || { price: mp, profit: 0 })

  const w = 620
  const h = 160
  const pad = 14

  const xFor = (price) => {
    if (max === min) return pad
    return pad + ((price - min) / (max - min)) * (w - pad * 2)
  }
  const yFor = (profit) => {
    if (maxY === minY) return h / 2
    return pad + ((maxY - profit) / (maxY - minY)) * (h - pad * 2)
  }

  const path = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${xFor(p.price).toFixed(2)} ${yFor(p.profit).toFixed(2)}`)
    .join(' ')

  return { w, h, pad, path, points, best, mp, xFor, yFor, min, max }
})

const curveZones = computed(() => {
  const pts = curve.value.points || []
  if (!pts.length || !curve.value.xFor) return []
  const zones = []
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i]
    const b = pts[i + 1]
    const sign = a.profit >= 0 && b.profit >= 0 ? 'pos' : a.profit <= 0 && b.profit <= 0 ? 'neg' : 'mix'
    zones.push({ from: a.price, to: b.price, sign })
  }
  return zones
})

const hoverPrice = ref(null)
const onCurveMove = (evt) => {
  const svg = evt.currentTarget
  if (!svg) return
  const rect = svg.getBoundingClientRect()
  const x = evt.clientX - rect.left
  const pad = curve.value.pad
  const w = curve.value.w
  const min = curve.value.min
  const max = curve.value.max
  const pct = clamp((x - pad) / (w - pad * 2), 0, 1)
  hoverPrice.value = min + pct * (max - min)
}
const onCurveLeave = () => {
  hoverPrice.value = null
}

const targetUser = computed(() => {
  const uid = String(ui.selectedUid || '')
  if (!uid) return null
  return riskUsers.value.find((x) => String(x.uid) === uid) || null
})

const close = () => emit('close')
const remove = () => emit('remove', { contractId: props.contractId })

const emitSave = () =>
  emit('save', {
    contractId: props.contractId,
    payload: {
      priceOffset: Number(form.priceOffset || 0),
      offsetDirection: form.offsetDirection,
      latencyMs: Number(form.latencyMs || 0),
      durationSec: Number(form.durationSec || 0)
    }
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
              <h2 class="mt-1 text-xl font-semibold text-slate-900">手动插线：{{ contractId || '-' }}</h2>
              <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                <span>调整永续合约K线偏移</span>
                <span v-if="contractLabel" class="truncate">· {{ contractLabel }}</span>
              </div>
            </div>
            <button type="button" class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" @click="close">
              关闭
            </button>
          </div>

          <div class="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
            <div class="flex items-center gap-4 overflow-x-auto whitespace-nowrap text-[11px] text-slate-600">
              <div class="flex items-baseline gap-2 shrink-0">
                <span class="text-slate-500">更新</span>
                <span class="font-mono text-slate-900">{{ lastRefreshAt || '-' }}</span>
              </div>

              <span class="h-4 w-px bg-slate-200 shrink-0"></span>

              <div class="flex items-baseline gap-2 shrink-0">
                <span class="text-slate-500">24h交易量</span>
                <span class="font-mono text-slate-900">{{ metrics.volume }}</span>
              </div>

              <div class="flex items-baseline gap-2 shrink-0">
                <span class="text-slate-500">持仓(多/空/净)</span>
                <span class="font-mono text-slate-900">{{ metrics.long }} / {{ metrics.short }} / {{ metrics.net }}</span>
              </div>

              <div class="flex items-baseline gap-2 shrink-0">
                <span class="text-slate-500">平台盈亏</span>
                <span class="font-mono" :class="platformPnlPositive ? 'text-emerald-700' : 'text-rose-700'">{{ metrics.platformPnl }}</span>
              </div>

              <span class="h-4 w-px bg-slate-200 shrink-0"></span>

              <div class="flex items-baseline gap-2 shrink-0">
                <span class="text-slate-500">偏离率</span>
                <span class="font-mono font-semibold tabular-nums whitespace-nowrap" :class="outlierCheck.cls">{{ outlierCheck.diffPct.toFixed(2) }}%</span>
              </div>

              <div class="flex items-baseline gap-2 shrink-0 ml-auto">
                <span class="text-slate-500">范围</span>
                <span class="font-mono text-slate-900">{{ ui.selectedUid ? `定点 ${ui.selectedUid}` : '全部用户' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex-1 min-h-0 p-6">
          <div class="grid gap-4 lg:grid-cols-12 h-full min-h-0">
            <section class="lg:col-span-5 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-0">
              <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50/40">
                <div>
                  <h3 class="text-sm font-semibold text-slate-900">用户监控</h3>
                  <p class="mt-0.5 text-[11px] text-slate-500">实时浮盈与爆仓距离排行 </p>
                </div>
                <div class="text-[11px] text-slate-400 font-mono">Counterparty</div>
              </div>

              <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                <table class="w-full table-fixed text-left text-[11px]">
                  <thead class="text-slate-500">
                      <tr>
                        <th class="sticky top-0 z-10 bg-slate-50 px-3 py-2 font-semibold w-20">UID</th>
                        <th class="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-right font-semibold w-14">方向</th>
                        <th class="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-right font-semibold">本金 / 杠杆</th>
                        <th class="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-right font-semibold">开仓价 / 数量</th>
                        <th class="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-right font-semibold">浮盈 / 收益率</th>
                        <th class="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-right font-semibold">爆仓价 / 距离</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 text-slate-700">
                      <tr v-for="u in riskUsers" :key="u.uid" class="hover:bg-slate-50/60" :class="String(ui.selectedUid) === String(u.uid) ? 'bg-slate-50' : ''">
                        <td class="px-3 py-2 font-mono text-slate-900 truncate">{{ u.uid }}</td>
                        <td class="px-3 py-2 text-right">
                          <div class="font-semibold" :class="u.side === 'long' ? 'text-emerald-700' : 'text-rose-700'">{{ u.side === 'long' ? '多' : '空' }}</div>
                        </td>
                        <td class="px-3 py-2 text-right">
                          <div class="font-mono text-slate-900">{{ formatCompactUsd(u.principal) }}</div>
                          <div class="mt-1 font-mono text-slate-500">{{ u.leverage }}x</div>
                        </td>
                        <td class="px-3 py-2 text-right">
                          <div class="font-mono text-slate-900">{{ formatPrice(u.entryPrice) }}</div>
                          <div class="mt-1 font-mono text-slate-500">{{ formatCompactNumber(u.qty, u.qty >= 1 ? 4 : 6) }}</div>
                        </td>
                        <td class="px-3 py-2 text-right">
                          <div class="font-mono" :class="u.pnlNow >= 0 ? 'text-emerald-700' : 'text-rose-700'">{{ formatCompactUsd(u.pnlNow, { withSign: true }) }}</div>
                          <div class="mt-1 font-mono text-slate-500">{{ `${formatCompactNumber((u.pnlNow / Math.max(1, Number(u.principal || 0))) * 100, 2)}%` }}</div>
                        </td>
                        <td class="px-3 py-2 text-right">
                          <div class="font-mono text-slate-900">{{ formatPrice(u.liquidationPrice) }}</div>
                          <div class="mt-1 font-mono text-slate-500">{{ formatCompactNumber(u.liqDistance, u.liqDistance >= 1 ? 2 : 5) }}</div>
                        </td>
                      </tr>
                    </tbody>
                </table>

                <div v-if="targetUser" class="p-5">
                  <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
                    <div class="flex items-center justify-between">
                      <div class="font-semibold text-slate-900">已锁定目标</div>
                      <button type="button" class="text-slate-500 hover:text-slate-900" @click="ui.selectedUid = ''">清除</button>
                    </div>
                    <div class="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <div class="text-slate-500">UID</div>
                        <div class="mt-0.5 font-mono text-slate-900">{{ targetUser.uid }}</div>
                      </div>
                      <div>
                        <div class="text-slate-500">方向</div>
                        <div class="mt-0.5 font-semibold" :class="targetUser.side === 'long' ? 'text-emerald-700' : 'text-rose-700'">{{ targetUser.side === 'long' ? '多头' : '空头' }}</div>
                      </div>
                      <div>
                        <div class="text-slate-500">当前盈利</div>
                        <div class="mt-0.5 font-mono" :class="targetUser.pnlNow >= 0 ? 'text-emerald-700' : 'text-rose-700'">{{ formatCompactUsd(targetUser.pnlNow, { withSign: true }) }}</div>
                      </div>
                      <div>
                        <div class="text-slate-500">目标爆仓价</div>
                        <div class="mt-0.5 font-mono text-slate-900">{{ formatPrice(targetUser.liquidationPrice) }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            <section class="lg:col-span-3 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-0">
              <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50/40">
                <div>
                  <h3 class="text-sm font-semibold text-slate-900">指令执行区</h3>
                  <p class="mt-0.5 text-[11px] text-slate-500">一键策略与手动滑块</p>
                </div>
              </div>

              <div class="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">

                <div class="rounded-xl border border-slate-200 bg-white p-4">
                  <div class="flex items-center justify-between">
                    <div class="text-xs font-semibold text-slate-900">K线偏移</div>
                    <div class="flex items-center gap-2">
                      <div class="flex items-center gap-1 font-mono text-sm font-semibold text-slate-900">
                        <span v-if="form.offsetDirection === PERP_CONTROL_OFFSET_DIRECTION.UP">+</span>
                        <span v-else-if="form.offsetDirection === PERP_CONTROL_OFFSET_DIRECTION.DOWN">-</span>
                        <span v-else>+</span>
                        <input
                          :value="priceOffsetDraft"
                          type="number"
                          min="0"
                          max="50"
                          step="1"
                          inputmode="numeric"
                          class="h-8 w-20 rounded-lg border border-slate-200 bg-white px-2 text-right font-mono text-sm font-semibold text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-0"
                          @focus="onPriceOffsetDraftFocus"
                          @input="onPriceOffsetDraftInput"
                          @blur="onPriceOffsetDraftBlur"
                        />
                        <span>点</span>
                      </div>
                    </div>
                  </div>
                  <div class="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      class="h-8 rounded-lg border text-[11px] font-semibold transition"
                      :class="form.offsetDirection === PERP_CONTROL_OFFSET_DIRECTION.UP ? 'border-slate-900 bg-slate-900 text-white shadow-sm ring-2 ring-slate-900 ring-offset-1 ring-offset-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
                      @click="setOffsetDirection(PERP_CONTROL_OFFSET_DIRECTION.UP)"
                    >
                      向上
                    </button>
                    <button
                      type="button"
                      class="h-8 rounded-lg border text-[11px] font-semibold transition"
                      :class="form.offsetDirection === PERP_CONTROL_OFFSET_DIRECTION.DOWN ? 'border-slate-900 bg-slate-900 text-white shadow-sm ring-2 ring-slate-900 ring-offset-1 ring-offset-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
                      @click="setOffsetDirection(PERP_CONTROL_OFFSET_DIRECTION.DOWN)"
                    >
                      向下
                    </button>
                  </div>
                  <input v-model.number="form.priceOffset" type="range" min="0" max="50" step="1" class="mt-2 w-full accent-slate-900" />
                  <div class="mt-2 flex flex-wrap gap-2">
                    <button v-for="v in quickPriceOffsets" :key="`po-${v}`" type="button" class="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50" @click="form.priceOffset = v">
                      {{ v }}
                    </button>
                  </div>
                </div>

                

                <div class="rounded-xl border border-slate-200 bg-white p-4">
                  <div class="flex items-center justify-between">
                    <div class="text-xs font-semibold text-slate-900">持续时间</div>
                    <div class="font-mono text-[11px] text-slate-500">{{ Number(form.durationSec || 0) === 0 ? '持续' : `${Number(form.durationSec || 0)}s` }}</div>
                  </div>
                  <select v-model.number="form.durationSec" class="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-0">
                    <option v-for="v in quickManualInputs.durationSec" :key="`dur-${v}`" :value="v">{{ v === 0 ? '持续' : `${v}s` }}</option>
                  </select>
                </div>
              </div>

              <div class="border-t border-slate-200 bg-white p-5">
                <div class="grid gap-2" :class="allowRemove && isManualActive ? 'grid-cols-2' : 'grid-cols-1'">
                  <button v-if="allowRemove && isManualActive" type="button" class="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="remove">
                    解除手动
                  </button>
                  <button type="button" class="h-11 w-full rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-40" :disabled="outlierCheck.locked || !contractId" @click="emitSave">
                    保存并生效
                  </button>
                </div>
              </div>
            </section>

            <section class="lg:col-span-4 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-0">
              <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50/40">
                <div>
                  <h3 class="text-sm font-semibold text-slate-900">战情沙盘</h3>
                  <p class="mt-0.5 text-[11px] text-slate-500">Money Map + PnL Simulator</p>
                </div>
                <div class="text-right text-[11px] text-slate-400 font-mono">The War Room</div>
              </div>

              <div class="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
                <div class="rounded-lg border border-slate-200 bg-white p-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="text-xs font-semibold text-slate-900">持仓分布与利润模拟</div>
                      <div class="mt-0.5 text-[11px] text-slate-500">点击图表定点 · 标注最大利润点</div>
                    </div>
                    <div class="text-right text-[11px]">
                      <div class="text-slate-400">市场价</div>
                      <div class="font-mono tabular-nums whitespace-nowrap text-slate-900">{{ formatPrice(manualPreview.marketPrice) }}</div>
                    </div>
                  </div>
                  <svg class="mt-3 w-full" viewBox="0 0 620 180">
                    <rect x="0" y="0" width="620" height="180" rx="10" fill="#ffffff" stroke="#e2e8f0" />
                    <line x1="14" y1="90" x2="606" y2="90" stroke="#cbd5e1" stroke-dasharray="5 5" />
                    <g v-if="moneyMap.bins.length">
                      <g v-for="(b, i) in moneyMap.bins" :key="i">
                        <rect
                          :x="14 + (i * (592 / moneyMap.bins.length)) + 1"
                          :width="(592 / moneyMap.bins.length) - 2"
                          :y="90 - (b.shortV / moneyMap.maxV) * 70"
                          :height="(b.shortV / moneyMap.maxV) * 70"
                          fill="#f43f5e"
                          opacity="0.55"
                        />
                        <rect
                          :x="14 + (i * (592 / moneyMap.bins.length)) + 1"
                          :width="(592 / moneyMap.bins.length) - 2"
                          y="90"
                          :height="(b.longV / moneyMap.maxV) * 70"
                          fill="#10b981"
                          opacity="0.55"
                        />
                      </g>
                    </g>
                    <line x1="310" y1="14" x2="310" y2="166" stroke="#94a3b8" stroke-dasharray="7 6" opacity="0.9" />
                    <text x="310" y="174" text-anchor="middle" font-size="10" fill="#64748b">当前价附近</text>
                  </svg>
                  <svg class="mt-3 w-full select-none" :viewBox="`0 0 ${curve.w} ${curve.h}`" @mousemove="onCurveMove" @mouseleave="onCurveLeave">
                    <rect x="0" y="0" :width="curve.w" :height="curve.h" rx="10" fill="#ffffff" stroke="#e2e8f0" />
                    <rect
                      v-for="(z, i) in curveZones"
                      :key="i"
                      :x="curve.xFor(z.from)"
                      :y="curve.pad"
                      :width="Math.max(1, curve.xFor(z.to) - curve.xFor(z.from))"
                      :height="curve.h - curve.pad * 2"
                      :fill="z.sign === 'pos' ? '#22c55e' : z.sign === 'neg' ? '#fb7185' : '#ffffff'"
                      :opacity="z.sign === 'mix' ? 0 : 0.08"
                    />
                    <path v-if="curve.path" :d="curve.path" fill="none" stroke="#0f172a" stroke-width="2.25" />
                    <circle v-if="curve.xFor" :cx="curve.xFor(curve.best.price)" :cy="curve.yFor(curve.best.profit)" r="5" fill="#22c55e" />
                    <line v-if="curve.xFor" :x1="curve.xFor(manualPreview.marketPrice)" :x2="curve.xFor(manualPreview.marketPrice)" :y1="curve.pad" :y2="curve.h - curve.pad" stroke="#0ea5e9" stroke-dasharray="7 6" opacity="0.9" />
                    <line v-if="curve.xFor && hoverPrice !== null" :x1="curve.xFor(hoverPrice)" :x2="curve.xFor(hoverPrice)" :y1="curve.pad" :y2="curve.h - curve.pad" stroke="#64748b" stroke-dasharray="4 4" opacity="0.8" />
                  </svg>
                  
                </div>

                <div class="rounded-lg border border-slate-200 bg-white p-4">
                  <div class="text-xs font-semibold text-slate-900">价格对比</div>
                  <div class="mt-3 text-[11px]">
                    <div class="grid grid-cols-12 gap-2 items-center py-1">
                      <div class="col-span-3 text-slate-500">参考价格</div>
                      <div class="col-span-9 font-mono tabular-nums whitespace-nowrap text-right text-slate-900">{{ formatPrice(manualPreview.marketPrice) }}</div>
                    </div>
                    <div class="grid grid-cols-12 gap-2 items-center py-1">
                      <div class="col-span-3 text-slate-500">用户看到价</div>
                      <div class="col-span-9 font-mono tabular-nums whitespace-nowrap text-right text-slate-900">{{ formatPrice(manualPreview.buyQuote) }} / {{ formatPrice(manualPreview.sellQuote) }}</div>
                    </div>
                    <div class="grid grid-cols-12 gap-2 items-center py-1">
                      <div class="col-span-3 text-slate-500">K线偏移量</div>
                      <div class="col-span-9 font-mono tabular-nums whitespace-nowrap text-right text-slate-900">
                        {{ form.offsetDirection === PERP_CONTROL_OFFSET_DIRECTION.DOWN ? '-' : '+' }}{{ Number(form.priceOffset || 0).toFixed(2) }}
                        ({{ manualPreview.profitRatePct.toFixed(2) }}%)
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
