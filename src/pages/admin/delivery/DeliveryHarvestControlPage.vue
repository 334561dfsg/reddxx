<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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

const pageSize = ref(10)
const page = ref(1)

const totalItems = computed(() => sortedRadar.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / Number(pageSize.value || 10))))

watch([totalItems, pageSize], () => {
  page.value = 1
})

watch(
  () => page.value,
  (next) => {
    const n = Math.floor(Number(next || 1))
    page.value = clamp(n, 1, totalPages.value)
  },
  { immediate: true }
)

const pageStart = computed(() => (page.value - 1) * Number(pageSize.value || 10))
const pageEnd = computed(() => Math.min(totalItems.value, pageStart.value + Number(pageSize.value || 10)))
const pagedRadar = computed(() => sortedRadar.value.slice(pageStart.value, pageEnd.value))

const goPrev = () => {
  page.value = Math.max(1, page.value - 1)
}

const goNext = () => {
  page.value = Math.min(totalPages.value, page.value + 1)
}

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
  alert(
    `已锁定：${payload?.label || '-'}\n模式：${modeLabel}\n结算价：${settlementLabel}\n用户：${
      picked?.length ? `已选 ${picked.length}` : '全部'
    }\n平台预估盈亏：${formatCompactUsd(payload?.estPlatformPnl, true)}\n（示意页面：未接真实接口）`
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

const deltaTone = (delta) => {
  const v = Number(delta || 0)
  return v > 0 ? 'text-blue-700' : v < 0 ? 'text-rose-700' : 'text-slate-600'
}
</script>

<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">交割合约 · 手动场控（全局监控）</h1>
        <p class="mt-1 text-sm text-slate-500">查看全局风险档位，选择目标进入实施场控</p>
      </div>
      <div class="flex items-center gap-2 text-xs text-slate-500">
        <span>刷新：1s</span>
        <span class="font-mono">{{ new Date(now).toISOString().replace('T', ' ').split('.')[0] }}</span>
      </div>
    </header>

    <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50/40">
        <div>
          <h2 class="text-sm font-semibold text-slate-900">全局收割监控（L1 - The Radar）</h2>
          <p class="mt-0.5 text-[11px] text-slate-500">默认按平台预估亏损额倒序，点击整行进入 L2</p>
        </div>
        <div class="text-[11px] text-slate-400 font-mono">Global Harvest Radar</div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th class="px-5 py-3 font-medium">币种/档位</th>
              <th class="px-5 py-3 font-medium">市价</th>
              <th class="px-5 py-3 font-medium">结算倒计时</th>
              <th class="px-5 py-3 font-medium">24h成交量</th>
              <th class="px-5 py-3 font-medium">总持仓</th>
              <th class="px-5 py-3 font-medium">多空比</th>
              <th class="px-5 py-3 font-medium">平台预估亏损额</th>
              <th class="px-5 py-3 font-medium">平台净头寸 (Delta)</th>
              <th class="px-5 py-3 font-medium">实时盈亏 (PnL)</th>
              <th class="px-5 py-3 font-medium text-right">进入</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="row in pagedRadar"
              :key="row.key"
              class="group cursor-pointer hover:bg-slate-50/60"
              @click="pickRow(row)"
            >
              <td class="px-5 py-3">
                <div class="font-semibold text-slate-900">{{ row.label }}</div>
                <div class="mt-0.5 text-[11px] text-slate-500 font-mono">{{ row.key }}</div>
              </td>
              <td class="px-5 py-3">
                <div class="font-mono text-slate-900">{{ formatPrice(row.marketPrice) }}</div>
              </td>
              <td class="px-5 py-3">
                <span
                  class="inline-flex items-center rounded-lg border px-2.5 py-1 font-mono text-xs"
                  :class="flashCountdown(row) ? 'flash-bg border-rose-200 text-rose-700' : 'border-slate-200 text-slate-700 bg-white'"
                >
                  {{ formatCountdown(row.remainSec) }}
                </span>
              </td>
              <td class="px-5 py-3">
                <div class="font-mono text-slate-700">{{ formatCompactUsd(row.volume24h) }}</div>
              </td>
              <td class="px-5 py-3">
                <div class="font-mono text-slate-700">{{ formatCompactUsd(row.position) }}</div>
              </td>
              <td class="px-5 py-3">
                <div class="font-mono text-slate-700">{{ Number(row.longShortRatio || 0).toFixed(2) }}</div>
              </td>
              <td class="px-5 py-3">
                <div class="font-mono text-rose-700">{{ formatCompactUsd(row.estimatedLoss) }}</div>
              </td>
              <td class="px-5 py-3">
                <div class="font-mono" :class="deltaTone(row.platformDelta)">
                  {{ formatCompactUsd(row.platformDelta, true) }}
                </div>
              </td>
              <td class="px-5 py-3">
                <div class="font-mono" :class="row.pnlNow < 0 ? 'text-rose-700' : 'text-emerald-700'">
                  {{ formatCompactUsd(row.pnlNow, true) }}
                </div>
              </td>
              <td class="px-5 py-3 text-right">
                <button
                  type="button"
                  class="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                  @click.stop="pickRow(row)"
                >
                  实施场控
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3">
        <div class="text-xs text-slate-500">
          显示 <span class="font-mono text-slate-700">{{ totalItems === 0 ? 0 : pageStart + 1 }}</span> -
          <span class="font-mono text-slate-700">{{ pageEnd }}</span> / <span class="font-mono text-slate-700">{{ totalItems }}</span>
        </div>

        <div class="flex items-center gap-2">
          <select
            class="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-slate-900 focus:outline-none focus:ring-0"
            v-model.number="pageSize"
          >
            <option :value="10">10 / 页</option>
            <option :value="20">20 / 页</option>
            <option :value="50">50 / 页</option>
          </select>

          <button
            type="button"
            class="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            :disabled="page <= 1"
            @click="goPrev"
          >
            上一页
          </button>
          <div class="text-sm text-slate-600">
            <span class="font-mono text-slate-900">{{ page }}</span>
            <span class="mx-1 text-slate-400">/</span>
            <span class="font-mono text-slate-700">{{ totalPages }}</span>
          </div>
          <button
            type="button"
            class="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            :disabled="page >= totalPages"
            @click="goNext"
          >
            下一页
          </button>
        </div>
      </div>
    </div>

    <HarvestControlPanel v-model="drawerOpen" :row="selectedRow" @lock="onLock" />
  </section>
</template>

<style scoped>
.flash-bg {
  background: rgba(244, 63, 94, 0.12);
  animation: flash 0.8s ease-in-out infinite;
}

@keyframes flash {
  0%,
  100% {
    background: rgba(244, 63, 94, 0.12);
  }
  50% {
    background: rgba(244, 63, 94, 0.3);
  }
}
</style>
