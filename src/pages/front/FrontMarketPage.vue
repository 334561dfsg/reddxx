<script setup>
import { computed, ref } from 'vue'
import FrontPopupCard from '../../components/front/FrontPopupCard.vue'
import FrontPopupCloseButton from '../../components/front/FrontPopupCloseButton.vue'
import FrontPopupShell from '../../components/front/FrontPopupShell.vue'
import { buildFrontMarketTradeEntries } from '../../constants/frontMarketTradeEntries'

const prefix = '/front'

const tabs = [
  { key: 'crypto', label: '加密货币' },
  { key: 'fx', label: '外汇' },
  { key: 'metals', label: '贵金属' }
]

const activeTab = ref('crypto')
const query = ref('')
const tradeChoiceRow = ref(null)

const cryptoTradeModesBySymbol = {
  BTC: ['spot', 'perpetual', 'delivery'],
  ETH: ['spot', 'perpetual'],
  SOL: ['perpetual'],
  BNB: ['spot'],
  XRP: ['spot', 'perpetual'],
  DOGE: ['perpetual'],
  ADA: ['spot'],
  AVAX: ['perpetual', 'delivery'],
  DOT: ['perpetual'],
  MATIC: ['spot'],
  LINK: ['spot', 'perpetual'],
  SHIB: ['spot'],
  LTC: ['spot', 'delivery'],
  BCH: ['spot'],
  UNI: ['spot'],
  ATOM: ['perpetual'],
  NEAR: ['perpetual'],
  APT: ['perpetual'],
  ARB: ['spot', 'perpetual'],
  OP: ['spot', 'perpetual'],
  TRX: ['spot'],
  TON: ['perpetual'],
  FIL: ['delivery'],
  ETC: ['delivery']
}

function withCryptoTradeMeta(row) {
  return {
    ...row,
    assetClass: 'crypto',
    base: row.symbol,
    quote: 'USDT',
    tradeModes: cryptoTradeModesBySymbol[row.symbol] || ['perpetual']
  }
}

function withForexTradeMeta(row) {
  const [base, quote] = row.symbol.split('/')
  const singleModeOnly = row.symbol === 'USD/CNH' ? ['spot'] : ['perpetual']
  return {
    ...row,
    assetClass: 'forex',
    base,
    quote,
    tradeModes: singleModeOnly
  }
}

function withMetalTradeMeta(row) {
  const tradeModes = row.symbol === 'XPD' ? ['delivery'] : ['perpetual', 'delivery']
  return {
    ...row,
    assetClass: 'metal',
    base: row.symbol,
    quote: 'USD',
    tradeModes
  }
}

/** 示例行情（后续对接 WebSocket / REST） */
const cryptoRows = ref([
  { symbol: 'BTC', name: 'Bitcoin', price: '98,420.50', changePct: 1.24 },
  { symbol: 'ETH', name: 'Ethereum', price: '3,582.10', changePct: -0.62 },
  { symbol: 'SOL', name: 'Solana', price: '188.35', changePct: 2.91 },
  { symbol: 'BNB', name: 'BNB', price: '612.00', changePct: 0.18 },
  { symbol: 'XRP', name: 'XRP', price: '0.5234', changePct: -1.05 },
  { symbol: 'DOGE', name: 'Dogecoin', price: '0.1628', changePct: 3.42 },
  { symbol: 'ADA', name: 'Cardano', price: '0.712', changePct: -0.88 },
  { symbol: 'AVAX', name: 'Avalanche', price: '38.62', changePct: 1.56 },
  { symbol: 'DOT', name: 'Polkadot', price: '7.24', changePct: 0.33 },
  { symbol: 'MATIC', name: 'Polygon', price: '0.412', changePct: -2.14 },
  { symbol: 'LINK', name: 'Chainlink', price: '22.85', changePct: 0.91 },
  { symbol: 'SHIB', name: 'Shiba Inu', price: '0.0000248', changePct: 4.02 },
  { symbol: 'LTC', name: 'Litecoin', price: '104.20', changePct: -0.45 },
  { symbol: 'BCH', name: 'Bitcoin Cash', price: '428.60', changePct: 0.72 },
  { symbol: 'UNI', name: 'Uniswap', price: '12.34', changePct: -1.88 },
  { symbol: 'ATOM', name: 'Cosmos', price: '8.92', changePct: 2.05 },
  { symbol: 'NEAR', name: 'NEAR Protocol', price: '5.48', changePct: 1.67 },
  { symbol: 'APT', name: 'Aptos', price: '9.15', changePct: -3.21 },
  { symbol: 'ARB', name: 'Arbitrum', price: '0.86', changePct: 5.40 },
  { symbol: 'OP', name: 'Optimism', price: '1.72', changePct: -0.29 },
  { symbol: 'TRX', name: 'TRON', price: '0.2356', changePct: 0.12 },
  { symbol: 'TON', name: 'Toncoin', price: '5.62', changePct: 2.78 },
  { symbol: 'FIL', name: 'Filecoin', price: '5.28', changePct: -1.34 },
  { symbol: 'ETC', name: 'Ethereum Classic', price: '24.90', changePct: 0.56 }
].map(withCryptoTradeMeta))

const fxRows = ref([
  { symbol: 'EUR/USD', name: '欧元 / 美元', price: '1.0842', changePct: 0.11 },
  { symbol: 'GBP/USD', name: '英镑 / 美元', price: '1.2631', changePct: -0.34 },
  { symbol: 'USD/JPY', name: '美元 / 日元', price: '149.82', changePct: 0.52 },
  { symbol: 'AUD/USD', name: '澳元 / 美元', price: '0.6234', changePct: -0.08 },
  { symbol: 'USD/CNH', name: '美元 / 离岸人民币', price: '7.2486', changePct: 0.04 }
].map(withForexTradeMeta))

const metalRows = ref([
  { symbol: 'XAU', name: '现货黄金', price: '2,658.20', changePct: 0.45 },
  { symbol: 'XAG', name: '现货白银', price: '31.42', changePct: -0.72 },
  { symbol: 'XPT', name: '现货铂金', price: '985.30', changePct: 0.19 },
  { symbol: 'XPD', name: '现货钯金', price: '1,042.00', changePct: -1.21 }
].map(withMetalTradeMeta))

const rowsByTab = computed(() => {
  switch (activeTab.value) {
    case 'crypto':
      return cryptoRows.value
    case 'fx':
      return fxRows.value
    case 'metals':
      return metalRows.value
    default:
      return []
  }
})

const filteredRows = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return rowsByTab.value
  return rowsByTab.value.filter(
    (r) =>
      r.symbol.toLowerCase().includes(q) ||
      (r.name && r.name.toLowerCase().includes(q))
  )
})

const tradeChoiceEntries = computed(() =>
  tradeChoiceRow.value ? buildFrontMarketTradeEntries(prefix, tradeChoiceRow.value) : []
)

const tradeChoiceTitle = computed(() => {
  const row = tradeChoiceRow.value
  if (!row) return '选择交易类型'
  const pair = row.quote ? `${row.base}/${row.quote}` : row.symbol
  return `选择 ${pair} 的交易类型`
})

function openTradeChoice(row) {
  tradeChoiceRow.value = row
}

function closeTradeChoice() {
  tradeChoiceRow.value = null
}

function changeClass(pct) {
  if (pct > 0) return 'text-emerald-400'
  if (pct < 0) return 'text-rose-400'
  return 'text-white/50'
}

function formatChange(pct) {
  if (pct === 0) return '0.00%'
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}
</script>

<template>
  <div
    class="mx-auto min-h-[calc(100vh-8rem)] max-w-[1400px] px-3 pb-10 pt-4 text-white sm:px-4 lg:px-6 lg:pt-6"
  >
    <header class="border-b border-white/[0.05] pb-4 lg:pb-5">
      <h1 class="text-xl font-bold tracking-tight text-white md:text-2xl">行情</h1>
      <p class="mt-1 max-w-2xl text-xs text-white/55 sm:text-sm">
        加密货币、外汇与贵金属即时报价与涨跌示意。数据为前端示例，上线后接入统一行情源。
      </p>
    </header>

    <!-- 分类 -->
    <div
      class="sticky top-14 z-10 -mx-3 border-b border-white/[0.04] bg-[#050505]/92 px-3 py-3 backdrop-blur-md sm:-mx-4 sm:px-4 lg:static lg:top-auto lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-4 lg:backdrop-blur-0"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          class="flex w-full rounded-lg border border-white/[0.05] bg-[#090b0e] p-0.5 sm:w-auto sm:inline-flex"
          role="tablist"
          aria-label="行情分类"
        >
          <button
            v-for="t in tabs"
            :key="t.key"
            type="button"
            role="tab"
            :aria-selected="activeTab === t.key"
            class="min-w-0 flex-1 rounded-md px-3 py-2 text-center text-xs font-medium transition [-webkit-tap-highlight-color:transparent] focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] sm:flex-none sm:px-4 sm:text-sm"
            :class="
              activeTab === t.key
                ? 'bg-white/[0.08] text-lime-300'
                : 'text-white/50 hover:bg-white/[0.04] hover:text-white/88'
            "
            @click="activeTab = t.key"
          >
            {{ t.label }}
          </button>
        </div>

        <label class="relative block sm:max-w-xs sm:flex-1 lg:max-w-sm">
          <span class="sr-only">搜索品种</span>
          <input
            v-model="query"
            type="search"
            autocomplete="off"
            placeholder="搜索代码或名称"
            class="w-full rounded-lg border border-white/[0.05] bg-[#090b0e] py-2.5 pl-9 pr-3 text-sm text-[#eaecef] placeholder:text-[#848e9c] transition-colors [-webkit-tap-highlight-color:transparent] focus:border-lime-400/25 focus:bg-[#0c0f14] focus:outline-none focus:ring-1 focus:ring-lime-400/12"
          />
          <svg
            class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#848e9c]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.75"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3"
            />
          </svg>
        </label>
      </div>
    </div>

    <!-- 表格：大屏 -->
    <div
      class="mt-3 hidden overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] md:block"
    >
      <div
        class="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.95fr)_auto] gap-3 border-b border-white/[0.04] px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/40 sm:px-5"
      >
        <span>品种</span>
        <span class="text-right">最新价</span>
        <span class="text-right">24h 涨跌</span>
        <span class="text-right">操作</span>
      </div>
      <ul class="divide-y divide-white/[0.035]">
        <li
          v-for="(row, i) in filteredRows"
          :key="`${activeTab}-${row.symbol}-${i}`"
          class="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.95fr)_auto] items-center gap-3 px-4 py-3.5 transition hover:bg-white/[0.04] sm:px-5"
        >
          <div class="flex min-w-0 items-center gap-3">
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.06] to-white/[0.02] text-xs font-bold text-lime-300/90"
            >
              {{ row.symbol.replace(/[^A-Z]/gi, '').slice(0, 3) }}
            </span>
            <div class="min-w-0">
              <p class="truncate font-semibold text-white">{{ row.symbol }}</p>
              <p class="truncate text-xs text-white/50">{{ row.name }}</p>
            </div>
          </div>
          <p class="text-right font-mono text-sm tabular-nums text-white/95">{{ row.price }}</p>
          <p
            class="text-right font-mono text-sm tabular-nums font-medium"
            :class="changeClass(row.changePct)"
          >
            {{ formatChange(row.changePct) }}
          </p>
          <div class="flex justify-end">
            <button
              type="button"
              class="rounded-lg border border-lime-400/25 bg-lime-400/[0.08] px-3 py-1.5 text-xs font-semibold text-lime-200 transition [-webkit-tap-highlight-color:transparent] hover:bg-lime-400/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0e11]"
              aria-haspopup="dialog"
              :aria-expanded="tradeChoiceRow === row"
              @click="openTradeChoice(row)"
            >
              交易
            </button>
          </div>
        </li>
      </ul>
      <p v-if="!filteredRows.length" class="px-5 py-12 text-center text-sm text-white/45">
        没有匹配的品种
      </p>
    </div>

    <!-- 卡片：窄屏 -->
    <ul class="mt-3 space-y-2 md:hidden">
      <li
        v-for="(row, i) in filteredRows"
        :key="`m-${activeTab}-${row.symbol}-${i}`"
        class="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-4 active:bg-white/[0.06]"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <span
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-gradient-to-br from-lime-400/15 to-transparent text-xs font-bold text-lime-200"
            >
              {{ row.symbol.replace(/[^A-Z]/gi, '').slice(0, 3) }}
            </span>
            <div class="min-w-0">
              <p class="font-semibold text-white">{{ row.symbol }}</p>
              <p class="mt-0.5 truncate text-xs text-white/55">{{ row.name }}</p>
            </div>
          </div>
          <div class="shrink-0 text-right">
            <p class="font-mono text-base font-semibold tabular-nums text-white">{{ row.price }}</p>
            <p
              class="mt-1 font-mono text-sm tabular-nums font-medium"
              :class="changeClass(row.changePct)"
            >
              {{ formatChange(row.changePct) }}
            </p>
          </div>
        </div>
        <div class="mt-3 flex justify-end border-t border-white/[0.06] pt-3">
          <button
            type="button"
            class="rounded-lg border border-lime-400/25 bg-lime-400/[0.08] px-4 py-2 text-xs font-semibold text-lime-200 transition [-webkit-tap-highlight-color:transparent] hover:bg-lime-400/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0e11]"
            aria-haspopup="dialog"
            :aria-expanded="tradeChoiceRow === row"
            @click="openTradeChoice(row)"
          >
            去交易
          </button>
        </div>
      </li>
      <li
        v-if="!filteredRows.length"
        class="rounded-2xl border border-dashed border-white/[0.08] py-12 text-center text-sm text-white/45"
      >
        没有匹配的品种
      </li>
    </ul>

    <p class="mt-6 text-center text-[11px] leading-relaxed text-white/35">
      行情仅作展示。外汇与贵金属在不同产品线下点差、杠杆与交易时段可能不同，以实际协议与风控规则为准。
    </p>

    <FrontPopupShell
      :model-value="!!tradeChoiceRow"
      aria-labelledby="market-trade-choice-title"
      @backdrop-click="() => {}"
    >
      <FrontPopupCard v-if="tradeChoiceRow" variant="padded" wide @click.stop>
        <FrontPopupCloseButton @click="closeTradeChoice" />
        <div class="pr-10">
          <p class="text-xs font-medium uppercase tracking-[0.18em] text-lime-300/75">Trade</p>
          <h2 id="market-trade-choice-title" class="mt-2 text-lg font-semibold leading-snug text-white">
            {{ tradeChoiceTitle }}
          </h2>
          <p class="mt-2 text-sm leading-6 text-white/55">
            当前交易对仅展示已开放的交易入口。
          </p>
        </div>

        <div class="mt-5 space-y-2">
          <RouterLink
            v-for="entry in tradeChoiceEntries"
            :key="entry.key"
            :to="entry.to"
            class="flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-left transition [-webkit-tap-highlight-color:transparent] hover:border-lime-400/25 hover:bg-lime-400/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/35"
            @click="closeTradeChoice"
          >
            <span>
              <span class="block text-sm font-semibold text-white">{{ entry.label }}交易</span>
              <span class="mt-1 block text-xs text-white/45">进入 {{ tradeChoiceRow.symbol }} {{ entry.label }}盘口</span>
            </span>
            <span class="text-lg text-lime-300" aria-hidden="true">›</span>
          </RouterLink>
        </div>
      </FrontPopupCard>
    </FrontPopupShell>
  </div>
</template>
