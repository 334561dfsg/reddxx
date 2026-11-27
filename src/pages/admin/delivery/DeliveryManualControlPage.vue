<script setup>
// 手动场控 — dashboard on the Ant Design Pro shell (2026-11-28): PageShell + Cards, Ant Table/Slider/InputNumber,
// Statistic/Descriptions for values; action feedback is a toast (the old native alert and inline action line are gone).
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Button, Card, Checkbox, Col, Descriptions, DescriptionsItem, Empty, InputNumber, Row, Slider, Space, Statistic, Table, Tag, TypographyText, message } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
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

// Operation feedback is toast-only; lastAction keeps the latest step for the page state.
const recordAction = (text) => {
  lastAction.value = text
  message.info(text)
}

const pickRow = (row) => {
  if (!row?.key) return
  selectedKey.value = row.key
}

const oneClickFlatten = () => {
  if (locked.value) return
  manualPrice.value = bestPrice.value
  recordAction(`一键抹平：${formatPrice(bestPrice.value)}（平台利润峰值 ${formatCompactUsd(bestProfit.value, true)}）`)
}

const lockResult = () => {
  locked.value = true
  recordAction(`锁定结果：${formatPrice(manualPrice.value)}`)
}

const undoIntervention = () => {
  locked.value = false
  manualPrice.value = roundToTick(marketPrice.value, tickSize.value)
  spoofOrders.value = []
  recordAction('撤销干预：回到市价')
}

const confirmHarvest = () => {
  const row = selectedRow.value
  if (!row) return
  row.lastManualAt = now.value
  lastAction.value = `确定收割：${row.key} 结算价 ${formatPrice(manualPrice.value)}`
  message.success(`已提交：${row.key} 结算价 ${formatPrice(manualPrice.value)}（示意页面：未接真实接口）`)
}

const harvestAll = () => {
  if (locked.value) return
  manualPrice.value = bestPrice.value
  locked.value = true
  recordAction(`一键收割以上所有人：${formatPrice(manualPrice.value)}`)
}

const harvestOneWhale = (pos) => {
  if (locked.value) return
  const tick = tickSize.value
  const target = pos.side === 'long' ? pos.entryPrice - tick : pos.entryPrice + tick
  manualPrice.value = roundToTick(clamp(target, priceMin.value, priceMax.value), tick)
  recordAction(`精准插针：${pos.uid} → ${formatPrice(manualPrice.value)}`)
}

const toggleFlag = (pos) => {
  const set = new Set(flaggedUsers.value)
  if (set.has(pos.uid)) set.delete(pos.uid)
  else set.add(pos.uid)
  flaggedUsers.value = set
  message.success(set.has(pos.uid) ? `已标记用户 ${pos.uid}` : `已取消标记用户 ${pos.uid}`)
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

const deltaType = (value) => (Number(value || 0) < 0 ? 'danger' : Number(value || 0) > 0 ? 'success' : undefined)
const clockText = computed(() => new Date(now.value).toISOString().replace('T', ' ').split('.')[0])

const spoofColumns = [
  { key: 'label', title: '类型', width: 80 },
  { key: 'price', title: '价格', width: 120, align: 'right' },
  { key: 'size', title: '数量（USDT）', width: 120, align: 'right' }
]
const whaleColumns = [
  { key: 'user', title: '用户', width: 150 },
  { key: 'side', title: '方向', width: 70 },
  { key: 'holding', title: '持仓（USD）', width: 110, align: 'right' },
  { key: 'pnl', title: '盈亏（USD）', width: 110, align: 'right' },
  { key: 'actions', title: '操作', width: 150 }
]
</script>

<template>
  <PageShell>
    <Row :gutter="[24, 24]">
      <Col :xs="24" :xl="6">
        <Card :bordered="false" title="全盘风险实时榜" :body-style="{ padding: 0 }">
          <template #extra><TypographyText type="secondary">刷新 1s · <span class="font-mono">{{ clockText }}</span></TypographyText></template>
          <div class="risk-board" role="list" aria-label="按平台即时亏损额倒序的合约，点选后联动作战区">
            <Button
              v-for="row in sortedRiskBoard"
              :key="row.key"
              type="text"
              block
              role="listitem"
              class="risk-row"
              :style="heatStyle(row)"
              :aria-pressed="row.key === selectedKey"
              @click="pickRow(row)"
            >
              <span class="risk-row__main">
                <TypographyText :strong="row.key === selectedKey">{{ row.asset }}-{{ row.tierSec }}s</TypographyText>
                <Tag v-if="row.key === selectedKey" color="blue">当前</Tag>
                <Tag v-if="row.lastManualAt">已干预</Tag>
              </span>
              <span class="risk-row__meta">
                <TypographyText :type="deltaType(row.platformDelta)" class="font-mono">{{ formatCompactUsd(row.platformDelta, true) }}</TypographyText>
                <TypographyText type="secondary" class="font-mono">倒计时 {{ row.remainSec }}s · {{ formatPrice(row.marketPrice) }}</TypographyText>
              </span>
            </Button>
          </div>
        </Card>
      </Col>

      <Col :xs="24" :xl="12">
        <Card :bordered="false" title="深度作战区">
          <template #extra>
            <Space :size="8">
              <TypographyText strong>{{ selectedRow?.key || '-' }}</TypographyText>
              <TypographyText type="secondary" class="font-mono">倒计时 {{ selectedRow?.remainSec ?? '-' }}s</TypographyText>
              <Tag v-if="isSprint" color="red">结算冲刺</Tag>
            </Space>
          </template>

          <Row :gutter="[24, 24]">
            <Col :xs="24" :xxl="14">
              <Card size="small" title="实时 K 线 + 场控落点">
                <template #extra><TypographyText type="secondary" class="font-mono">市价 {{ formatPrice(marketPrice) }}</TypographyText></template>
                <svg :viewBox="`0 0 ${klineSvg.w} ${klineSvg.h}`" class="w-full h-36" role="img" :aria-label="`${selectedRow?.key || ''} K 线，市价 ${formatPrice(marketPrice)}，场控落点 ${formatPrice(manualPrice)}`">
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
                <div class="control-bar">
                  <Checkbox v-model:checked="spoofEnabled" :disabled="locked">同步产生虚假成交</Checkbox>
                  <Space :size="8" wrap>
                    <Button :disabled="locked" @click="oneClickFlatten">一键抹平</Button>
                    <Button type="primary" :disabled="locked" @click="confirmHarvest">确定收割</Button>
                    <Button @click="undoIntervention">撤销干预</Button>
                  </Space>
                </div>
              </Card>

              <Card v-if="spoofEnabled && spoofOrders.length" size="small" title="虚假量能联动（示意）" class="mt-6">
                <Table size="small" :pagination="false" :columns="spoofColumns" :data-source="spoofOrders" row-key="id">
                  <template #bodyCell="{ column, record }">
                    <Tag v-if="column.key === 'label'" :color="record.side === 'buy' ? 'green' : record.side === 'sell' ? 'red' : 'default'">{{ record.label }}</Tag>
                    <span v-else-if="column.key === 'price'" class="font-mono">{{ formatPrice(record.price) }}</span>
                    <span v-else-if="column.key === 'size'" class="font-mono">{{ formatCompactUsd(record.sizeUsd) }}</span>
                  </template>
                </Table>
              </Card>
            </Col>

            <Col :xs="24" :xxl="10">
              <Card size="small" title="手动拨盘">
                <template #extra>
                  <Space :size="8">
                    <TypographyText type="secondary">偏离</TypographyText>
                    <TypographyText :type="deviationWarn ? 'danger' : undefined" class="font-mono">{{ (deviationPct * 100).toFixed(2) }}%</TypographyText>
                    <Tag v-if="deviationWarn" color="red">偏离过大</Tag>
                  </Space>
                </template>
                <Slider v-model:value="manualPrice" :min="priceMin" :max="priceMax" :step="tickSize" :disabled="locked" aria-label="场控结算价拨盘" />
                <Descriptions :column="2" size="small">
                  <DescriptionsItem label="范围"><span class="font-mono">{{ formatPrice(priceMin) }} ~ {{ formatPrice(priceMax) }}</span></DescriptionsItem>
                  <DescriptionsItem label="建议峰值"><span class="font-mono">{{ formatPrice(bestPrice) }}</span></DescriptionsItem>
                </Descriptions>
                <Space.Compact class="w-full">
                  <InputNumber
                    v-model:value="manualPrice"
                    :min="priceMin"
                    :max="priceMax"
                    :step="tickSize"
                    :disabled="locked"
                    aria-label="场控结算价"
                    class="flex-1 font-mono"
                    :class="{ 'flash-warn': deviationWarn }"
                  />
                  <Button :disabled="locked" @click="manualPrice = roundToTick(marketPrice, tickSize)">贴近市价</Button>
                </Space.Compact>
                <div class="control-bar">
                  <Button :disabled="locked" @click="harvestAll">一键收割以上所有人</Button>
                  <Button type="primary" :disabled="locked || !isSprint" @click="lockResult">锁定结果</Button>
                </div>
              </Card>

              <Card size="small" title="盈亏平衡点与利润曲线" class="mt-6">
                <template #extra>
                  <Space :size="8">
                    <TypographyText type="secondary">峰值利润</TypographyText>
                    <TypographyText :type="bestProfit >= 0 ? 'success' : 'danger'" class="font-mono">{{ formatCompactUsd(bestProfit, true) }}</TypographyText>
                  </Space>
                </template>
                <svg v-if="svgCurve.path" :viewBox="`0 0 ${svgCurve.w} ${svgCurve.h}`" class="w-full h-32" role="img" aria-label="横轴价格、纵轴平台利润的利润曲线">
                  <rect x="0" y="0" :width="svgCurve.w" :height="svgCurve.h" fill="white" rx="8" />
                  <path :d="svgCurve.path" fill="none" stroke="rgba(37,99,235,0.9)" stroke-width="2" />
                  <line :x1="markerX(marketPrice)" :x2="markerX(marketPrice)" y1="8" :y2="svgCurve.h - 8" stroke="rgba(148,163,184,0.85)" stroke-dasharray="4 4" />
                  <line :x1="markerX(manualPrice)" :x2="markerX(manualPrice)" y1="8" :y2="svgCurve.h - 8" stroke="rgba(37,99,235,0.55)" />
                  <line :x1="markerX(bestPrice)" :x2="markerX(bestPrice)" y1="8" :y2="svgCurve.h - 8" stroke="rgba(16,185,129,0.8)" />
                  <circle :cx="markerX(manualPrice)" :cy="markerY(platformProfitAt(manualPrice))" r="4" fill="rgba(37,99,235,0.95)" />
                  <circle :cx="markerX(bestPrice)" :cy="markerY(platformProfitAt(bestPrice))" r="4" fill="rgba(16,185,129,0.95)" />
                </svg>
                <Empty v-else description="暂无利润曲线数据" />
                <Row :gutter="16" class="mt-4">
                  <Col :span="8"><Statistic title="市价" :value="formatPrice(marketPrice)" :value-style="{ fontSize: '16px' }" /></Col>
                  <Col :span="8"><Statistic title="当前拨盘" :value="formatPrice(manualPrice)" :value-style="{ fontSize: '16px' }" /></Col>
                  <Col :span="8"><Statistic title="峰值点" :value="formatPrice(bestPrice)" :value-style="{ fontSize: '16px' }" /></Col>
                </Row>
              </Card>
            </Col>
          </Row>
        </Card>
      </Col>

      <Col :xs="24" :xl="6">
        <Card :bordered="false" title="亏损源分析与精准收割">
          <Empty v-if="relevantWhales.length === 0" description="该档位暂无元凶大户，切换左侧合约查看" />
          <template v-else>
            <Table size="small" :pagination="false" :columns="whaleColumns" :data-source="relevantWhales.slice(0, 8)" row-key="uid" :scroll="{ x: 590 }">
              <template #bodyCell="{ column, record, index }">
                <Space v-if="column.key === 'user'" :size="4">
                  <TypographyText type="secondary" class="font-mono">#{{ index + 1 }}</TypographyText>
                  <TypographyText strong class="font-mono">{{ record.uid }}</TypographyText>
                  <Tag v-if="flaggedUsers.has(record.uid)" color="orange">已标记</Tag>
                </Space>
                <Tag v-else-if="column.key === 'side'" :color="record.side === 'long' ? 'blue' : 'red'">{{ record.side === 'long' ? '多' : '空' }}</Tag>
                <span v-else-if="column.key === 'holding'" class="font-mono">{{ formatCompactUsd(record.holdingUsd) }}</span>
                <TypographyText v-else-if="column.key === 'pnl'" :type="record.pnl >= 0 ? 'danger' : 'success'" class="font-mono">{{ formatCompactUsd(record.pnl, true) }}</TypographyText>
                <Space v-else-if="column.key === 'actions'" :size="8">
                  <Button type="link" class="px-0" :disabled="locked" @click="harvestOneWhale(record)">收割</Button>
                  <Button type="link" class="px-0" @click="toggleFlag(record)">{{ flaggedUsers.has(record.uid) ? '取消标记' : '禁封/滑点' }}</Button>
                </Space>
              </template>
            </Table>
            <Descriptions title="精准插针提示" :column="1" size="small" class="mt-6">
              <DescriptionsItem label="说明">最小位移使目标用户转亏（示意）</DescriptionsItem>
              <DescriptionsItem label="当前结算价"><span class="font-mono">{{ formatPrice(manualPrice) }}</span></DescriptionsItem>
              <DescriptionsItem label="锁定状态"><Tag :color="locked ? 'red' : 'green'">{{ locked ? '已锁定' : '未锁定' }}</Tag></DescriptionsItem>
            </Descriptions>
          </template>
        </Card>
      </Col>
    </Row>
  </PageShell>
</template>

<style scoped>
.risk-board {
  max-height: 36rem;
  overflow-y: auto;
}
.risk-board :deep(.risk-row) {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
  height: auto;
  padding: 12px 16px;
  border-radius: 0;
  text-align: left;
  white-space: normal;
}
.risk-board :deep(.risk-row + .risk-row) {
  border-top: 1px solid rgb(5 5 5 / 6%);
}
.risk-row__main,
.risk-row__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 8px;
}
.control-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 16px;
}
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
@media (prefers-reduced-motion: reduce) {
  .flash-warn {
    animation: none;
    background: rgba(244, 63, 94, 0.12);
  }
}
</style>
