<script setup>
// 全局收割监控 — Ant Design Pro list (2026-11-28): query card (币种 / 档位), table card with link action; the lock
// result is a toast instead of a native alert. HarvestControlPanel (the L2 drawer) is unchanged.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Button, Space, Tag, TypographyText, message } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import { deliveryContractsData } from '../../../admin/mock/deliveryReport'
import HarvestControlPanel from '../../../admin/components/HarvestControlPanel.vue'

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
const formatCountdown = (sec) => {
  const s = Math.max(0, Math.floor(Number(sec || 0)))
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`
}

const baseMarketPrice = (asset) => {
  const s = String(asset || '').toUpperCase()
  if (s.includes('BTC')) return 68000
  if (s.includes('ETH')) return 3500
  if (s.includes('SOL')) return 150
  if (s.includes('XRP')) return 0.62
  if (s.includes('DOGE')) return 0.18
  if (s.includes('ARB')) return 0.95
  const seed = s.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return 1 + (seed % 2500) / 10
}

const marketVolatilityPct = (asset) => {
  const s = String(asset || '').toUpperCase()
  if (s.includes('BTC')) return 0.0009
  if (s.includes('ETH')) return 0.0012
  if (s.includes('SOL')) return 0.002
  return 0.0016
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

const secondsOf = (tierSec) => {
  const n = Number(tierSec || 0)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 60
}

const labelOf = (asset, tierSec) => `${String(asset || '').toUpperCase()}-${secondsOf(tierSec)}s`

const now = ref(Date.now())
const radarRows = ref([])

const initRadarRows = () => {
  const bases = deliveryContractsData.map((c) => {
    const asset = String(c.baseSymbol || c.symbol || '').replace(/USDT$/i, '').replace(/\d+S$/i, '')
    const tierSec = Number(String(c.cycleType || '').replace('s', '')) || Number(String(c.symbol || '').match(/(\d+)S$/i)?.[1]) || 60
    return { asset, tierSec, base: c }
  })

  const wanted = [
    { asset: 'BTC', tierSec: 10 },
    { asset: 'SOL', tierSec: 30 },
    { asset: 'ETH', tierSec: 30 }
  ]

  const merged = [...bases]
  for (const w of wanted) {
    if (!merged.some((b) => String(b.asset).toUpperCase() === w.asset && secondsOf(b.tierSec) === w.tierSec)) {
      merged.push({ asset: w.asset, tierSec: w.tierSec, base: null })
    }
  }

  const normalized = merged
    .map((item) => {
      const asset = String(item.asset || '').toUpperCase()
      const tierSec = secondsOf(item.tierSec)
      const key = `${asset}${tierSec}S`
      const rand = seeded(key)
      const marketPrice = baseMarketPrice(asset) * (1 + (rand() * 2 - 1) * 0.004)
      const remainSec = 1 + Math.floor(rand() * tierSec)
      const baseLoss = Math.abs(Number(item.base?.platformPnl24h || 0)) || 10_000 + rand() * 55_000
      const lossBias = rand() < 0.62 ? 1 : -0.35
      const estimatedLoss = Math.max(0, baseLoss * lossBias * (0.85 + rand() * 0.4))
      const delta = Number(item.base?.netPosition || 0) || (rand() * 2 - 1) * (asset === 'BTC' ? 800_000 : asset === 'ETH' ? 420_000 : 180_000)
      const pnlNow = (rand() * 2 - 1) * estimatedLoss
      const volume24h = Number(item.base?.volume24h || 0) || Math.round((asset === 'BTC' ? 32_000_000 : asset === 'ETH' ? 18_000_000 : 9_000_000) * (0.35 + rand() * 0.95))
      const position = Number(item.base?.position || 0) || Math.round((asset === 'BTC' ? 1_800_000 : asset === 'ETH' ? 980_000 : 520_000) * (0.35 + rand() * 1.05))
      const activeUsers = Number(item.base?.activeUsers || 0) || Math.round((asset === 'BTC' ? 820 : asset === 'ETH' ? 520 : 260) * (0.4 + rand() * 1.0))
      const longShortRatio = Number(item.base?.longShortRatio || 0) || Number((0.65 + rand() * 1.6).toFixed(2))
      const controlActive = item.base?.controlActive ?? rand() < 0.55
      return {
        key,
        asset,
        tierSec,
        label: labelOf(asset, tierSec),
        marketPrice,
        remainSec,
        estimatedLoss,
        platformDelta: delta,
        pnlNow,
        volume24h,
        position,
        activeUsers,
        longShortRatio,
        controlActive
      }
    })
    .reduce((acc, row) => {
      if (!acc.some((r) => r.key === row.key)) acc.push(row)
      return acc
    }, [])

  radarRows.value = normalized
}

initRadarRows()

const sortedRadar = computed(() => {
  return [...radarRows.value].sort((a, b) => {
    const diff = Number(b.estimatedLoss || 0) - Number(a.estimatedLoss || 0)
    if (diff !== 0) return diff
    return String(a.key).localeCompare(String(b.key))
  })
})

const blankFilters = () => ({ asset: 'all', tier: 'all' })
const filters = ref(blankFilters())
const page = ref(1)
const assetOptions = computed(() => [...new Set(radarRows.value.map((row) => row.asset))].sort().map((value) => ({ value, label: value })))
const tierOptions = computed(() => [...new Set(radarRows.value.map((row) => row.tierSec))].sort((a, b) => a - b).map((value) => ({ value: String(value), label: `${value} 秒` })))
const queryFields = computed(() => [
  { key: 'asset', label: '币种', searchable: true, options: [{ value: 'all', label: '全部币种' }, ...assetOptions.value] },
  { key: 'tier', label: '档位', options: [{ value: 'all', label: '全部档位' }, ...tierOptions.value] }
])
const filteredRadar = computed(() => sortedRadar.value.filter((row) => (
  (filters.value.asset === 'all' || row.asset === filters.value.asset) &&
  (filters.value.tier === 'all' || String(row.tierSec) === filters.value.tier)
)))
function search(values) { filters.value = { ...blankFilters(), ...values }; page.value = 1 }
function reset() { filters.value = blankFilters(); page.value = 1 }

const columns = [
  { key: 'label', title: '币种/档位', width: 150, fixed: 'left' },
  { key: 'marketPrice', title: '市价', width: 120, align: 'right' },
  { key: 'remainSec', title: '结算倒计时', width: 120 },
  { key: 'volume24h', title: '24h 成交量（USD）', width: 150, align: 'right' },
  { key: 'position', title: '总持仓（USD）', width: 130, align: 'right' },
  { key: 'longShortRatio', title: '多空比', width: 90, align: 'right' },
  { key: 'estimatedLoss', title: '平台预估亏损额（USD）', width: 180, align: 'right' },
  { key: 'platformDelta', title: '平台净头寸 Delta（USD）', width: 190, align: 'right' },
  { key: 'pnlNow', title: '实时盈亏 PnL（USD）', width: 170, align: 'right' },
  { key: 'actions', title: '操作', width: 110, fixed: 'right' }
]

const selectedKey = ref(sortedRadar.value[0]?.key || '')
const drawerOpen = ref(false)

const selectedRow = computed(() => sortedRadar.value.find((r) => r.key === selectedKey.value) || sortedRadar.value[0] || null)

const pickRow = (row) => {
  if (!row?.key) return
  selectedKey.value = row.key
  drawerOpen.value = true
}

const onLock = (payload) => {
  const modeLabel = payload?.mode === 'squeeze' ? '双向挤压' : payload?.mode === 'slippage' ? '滑点注入' : '强制结算价'
  const picked = Array.isArray(payload?.targetUids) ? payload.targetUids : null
  const settlementLabel =
    payload?.mode === 'squeeze'
      ? `多 ${formatPrice(payload?.settlementPriceLong)} / 空 ${formatPrice(payload?.settlementPriceShort)}`
      : formatPrice(payload?.settlementPrice)
  message.success(
    `已锁定：${payload?.label || '-'}，模式：${modeLabel}，结算价：${settlementLabel}，用户：${
      picked?.length ? `已选 ${picked.length}` : '全部'
    }，平台预估盈亏：${formatCompactUsd(payload?.estPlatformPnl, true)}（示意页面：未接真实接口）`
  )
}

let timer = null
onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
    radarRows.value = radarRows.value.map((row) => {
      const vol = marketVolatilityPct(row.asset)
      const nextMarket = Math.max(tickSizeFor(row.asset, row.marketPrice), row.marketPrice * (1 + (Math.random() * 2 - 1) * vol))
      const remain = row.remainSec - 1 <= 0 ? row.tierSec : row.remainSec - 1
      const jitter = (Math.random() * 2 - 1) * Math.max(120, row.estimatedLoss * 0.03)
      const nextLoss = Math.max(0, row.estimatedLoss + jitter)
      const nextPnl = (Math.random() * 2 - 1) * nextLoss
      return { ...row, marketPrice: nextMarket, remainSec: remain, estimatedLoss: nextLoss, pnlNow: nextPnl }
    })
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const flashCountdown = (row) => secondsOf(row?.tierSec) === 10 && Number(row?.remainSec || 0) <= 3

const clockText = computed(() => new Date(now.value).toISOString().replace('T', ' ').split('.')[0])
</script>

<template>
  <PageShell>
    <SearchForm name="delivery-harvest-filters" :model="filters" :fields="queryFields" @search="search" @reset="reset" />
    <AdminTable title="全局收割监控" v-model:page="page" :rows="filteredRadar" :columns="columns" row-key="key" desktop-only>
      <template #toolbar>
        <TypographyText type="secondary">按平台预估亏损额倒序 · 刷新 1s · <span class="font-mono">{{ clockText }}</span></TypographyText>
      </template>
      <template #cell="{ column, record }">
        <Space v-if="column.key === 'label'" direction="vertical" :size="0">
          <TypographyText strong>{{ record.label }}</TypographyText>
          <TypographyText type="secondary" class="font-mono">{{ record.key }}</TypographyText>
        </Space>
        <span v-else-if="column.key === 'marketPrice'" class="font-mono">{{ formatPrice(record.marketPrice) }}</span>
        <Tag v-else-if="column.key === 'remainSec'" :color="flashCountdown(record) ? 'red' : 'default'" class="font-mono" :class="{ 'flash-bg': flashCountdown(record) }">{{ formatCountdown(record.remainSec) }}{{ flashCountdown(record) ? ' 即将结算' : '' }}</Tag>
        <span v-else-if="column.key === 'volume24h'" class="font-mono">{{ formatCompactUsd(record.volume24h) }}</span>
        <span v-else-if="column.key === 'position'" class="font-mono">{{ formatCompactUsd(record.position) }}</span>
        <span v-else-if="column.key === 'longShortRatio'" class="font-mono">{{ Number(record.longShortRatio || 0).toFixed(2) }}</span>
        <TypographyText v-else-if="column.key === 'estimatedLoss'" type="danger" class="font-mono">{{ formatCompactUsd(record.estimatedLoss) }}</TypographyText>
        <TypographyText v-else-if="column.key === 'platformDelta'" :type="record.platformDelta < 0 ? 'danger' : undefined" class="font-mono">{{ formatCompactUsd(record.platformDelta, true) }}</TypographyText>
        <TypographyText v-else-if="column.key === 'pnlNow'" :type="record.pnlNow < 0 ? 'danger' : 'success'" class="font-mono">{{ formatCompactUsd(record.pnlNow, true) }}</TypographyText>
        <Button v-else-if="column.key === 'actions'" type="link" class="px-0" :aria-label="`对 ${record.label} 实施场控`" @click="pickRow(record)">实施场控</Button>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <HarvestControlPanel v-model="drawerOpen" :row="selectedRow" @lock="onLock" />
  </PageShell>
</template>

<style scoped>
.flash-bg {
  animation: flash 0.8s ease-in-out infinite;
}

@keyframes flash {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}
@media (prefers-reduced-motion: reduce) {
  .flash-bg {
    animation: none;
  }
}
</style>
