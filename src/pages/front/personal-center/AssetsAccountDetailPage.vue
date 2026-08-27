<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import FrontStrokeIcon from '../../../components/front/FrontStrokeIcon.vue'
import {
  FRONT_DEPOSIT_DEFAULT_SYMBOL_LOWER,
  formatFrontAssetAmount,
  formatFrontUsdAmount,
  frontAssetAccountDetail
} from '../../../constants/frontAssetCenterDemo'
import { useFrontAuthStore } from '../../../stores/frontAuth'

const route = useRoute()
const router = useRouter()
const frontAuth = useFrontAuthStore()
const { accountMode } = storeToRefs(frontAuth)
const prefix = '/front'
const hideBalance = ref(false)

const accountKey = computed(() => String(route.params.accountKey || 'spot'))
const accountDetail = computed(() => frontAssetAccountDetail(accountKey.value))
const accountMeta = computed(() => accountDetail.value.meta)
const accountSummary = computed(() => accountDetail.value.summary)
const holdings = computed(() => accountDetail.value.holdings)

const withdrawPath = `${prefix}/personal-center/assets/withdraw`
const depositPath = `${prefix}/personal-center/assets/deposit/${FRONT_DEPOSIT_DEFAULT_SYMBOL_LOWER}`
const transferPath = `${prefix}/personal-center/assets/transfer`

const detailActions = [
  { key: 'withdraw', label: '提币', icon: 'arrow-right', to: withdrawPath },
  { key: 'deposit', label: '充币', icon: 'arrow-left', to: depositPath },
  { key: 'transfer', label: '划转', icon: 'arrows-swap', to: transferPath }
]
const visibleDetailActions = computed(() => (
  accountMode.value === 'demo'
    ? detailActions.filter((action) => action.key === 'transfer')
    : detailActions
))

const totalUsd = computed(() => accountSummary.value?.usd || '0.00')
const totalBtc = computed(() => accountSummary.value?.btc || '0.00000000 BTC')
const todayPnl = computed(() => accountSummary.value?.dayPnl || '$ 0.00')

function toggleEye() {
  hideBalance.value = !hideBalance.value
}

function displayVal(value) {
  return hideBalance.value ? '****' : value
}

function goBack() {
  router.push(`${prefix}/personal-center/assets`)
}

function coinSwatchClass(symbol) {
  const key = String(symbol || '').toUpperCase()
  if (key === 'BTC' || key === 'DOGE') return 'bg-amber-300 text-black'
  if (key === 'ETH' || key === 'USDC') return 'bg-sky-200 text-slate-900'
  if (key === 'USDT' || key === 'TRX') return 'bg-cyan-300 text-slate-900'
  if (key === 'PEPE' || key === 'DOT') return 'bg-fuchsia-400 text-white'
  if (key === 'BNB' || key === 'YFI') return 'bg-blue-400 text-white'
  return 'bg-white/85 text-black'
}

function coinIconLabel(symbol) {
  return String(symbol || '?').slice(0, 1).toUpperCase()
}

function amountText(row) {
  return displayVal(formatFrontAssetAmount(row.amount, row.symbol, { precision: row.precision, trimZeros: true }))
}

function frozenText(row) {
  return displayVal(formatFrontAssetAmount(row.frozen, row.symbol, { precision: row.precision, trimZeros: true }))
}

function latestPriceText(row) {
  const price = Number(row.latestPrice)
  if (!Number.isFinite(price) || price === 0) return '0'
  if (price >= 1) return formatFrontUsdAmount(price, { decimals: price >= 1000 ? 2 : 5 }).replace(/\.?0+$/, '')
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8
  }).replace(/\.?0+$/, '')
}
</script>

<template>
  <div class="min-w-0 text-white">
    <header class="mb-4 flex min-h-12 items-center gap-3 md:mb-5">
      <button
        type="button"
        class="-ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/75 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/35"
        aria-label="返回资产中心"
        @click="goBack"
      >
        <FrontStrokeIcon name="arrow-left" size-class="h-6 w-6" />
      </button>
      <div class="min-w-0">
        <h1 class="truncate text-2xl font-semibold tracking-tight text-white md:text-xl">
          {{ accountMeta.title }}
        </h1>
        <p class="mt-1 hidden text-xs text-white/40 md:block">
          {{ accountMeta.shortTitle }}持有币种与快捷操作
        </p>
      </div>
    </header>

    <section
      class="rounded-xl border border-white/[0.08] bg-white/[0.045] px-4 py-4 md:rounded-lg md:px-5 md:py-5"
      :aria-label="`${accountMeta.title}总览`"
    >
      <div class="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-xs font-medium text-white/55 md:text-sm">账户总资产</h2>
            <button
              type="button"
              class="-mr-1 rounded-md p-1 text-white/60 transition hover:bg-white/[0.08] hover:text-white"
              :aria-label="hideBalance ? '显示余额' : '隐藏余额'"
              @click="toggleEye"
            >
              <FrontStrokeIcon :name="hideBalance ? 'eye-off' : 'eye'" size-class="h-4 w-4" />
            </button>
          </div>
          <p class="mt-4 font-mono text-[2rem] font-medium leading-none tracking-tight text-white md:text-[2.25rem]">
            {{ displayVal(totalUsd) }}
          </p>
          <p class="mt-2 text-sm text-white/58">≈$ {{ displayVal(totalUsd) }}</p>
          <div class="mt-7 flex flex-wrap items-center gap-2 text-sm font-medium text-white">
            <span>今日收益: {{ displayVal(todayPnl.replace('$ ', '')) }}</span>
            <button
              type="button"
              class="-m-1 rounded-md p-1 text-white/75 transition hover:bg-white/[0.08] hover:text-white"
              aria-label="刷新估值"
            >
              <FrontStrokeIcon name="refresh" size-class="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav
          class="grid gap-2 md:min-w-[24rem]"
          :class="accountMode === 'demo' ? 'grid-cols-1 md:grid-cols-[minmax(8rem,10rem)] md:justify-end' : 'grid-cols-3 md:grid-cols-3'"
          aria-label="账户资产操作"
        >
          <RouterLink
            v-for="action in visibleDetailActions"
            :key="action.key"
            :to="action.to"
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.14] px-3 text-sm font-semibold text-white/85 transition hover:border-cyan-300/75 hover:text-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/45"
            :class="action.key === 'transfer' ? 'bg-cyan-300 text-black hover:text-black' : 'bg-transparent'"
          >
            <FrontStrokeIcon :name="action.icon" size-class="h-4 w-4" />
            <span>{{ action.label }}</span>
          </RouterLink>
        </nav>
      </div>
    </section>

    <section class="mt-8" aria-labelledby="asset-holdings-title">
      <h2 id="asset-holdings-title" class="sr-only">持有币种</h2>

      <div
        class="hidden overflow-hidden rounded-lg border border-white/[0.07] md:block"
        role="table"
        :aria-label="`${accountMeta.title}持有币种`"
      >
        <div
          class="grid grid-cols-[1fr_1fr_1fr_1fr] border-b border-white/[0.09] px-5 py-3 text-xs font-semibold text-cyan-100"
          role="row"
        >
          <span role="columnheader">币种</span>
          <span role="columnheader">数量</span>
          <span role="columnheader">冻结</span>
          <span role="columnheader">最新价</span>
        </div>
        <div
          v-for="row in holdings"
          :key="row.symbol"
          class="grid grid-cols-[1fr_1fr_1fr_1fr] items-center border-b border-white/[0.09] px-5 py-4 last:border-b-0"
          role="row"
        >
          <div class="flex min-w-0 items-center gap-3" role="cell">
            <span
              class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black"
              :class="coinSwatchClass(row.symbol)"
              aria-hidden="true"
            >
              {{ coinIconLabel(row.symbol) }}
            </span>
            <span class="min-w-0 truncate text-sm font-semibold text-white">{{ row.symbol }}</span>
          </div>
          <span class="font-mono text-sm tabular-nums text-white" role="cell">{{ amountText(row) }}</span>
          <span class="font-mono text-sm tabular-nums text-white" role="cell">{{ frozenText(row) }}</span>
          <span class="font-mono text-sm tabular-nums text-white" role="cell">{{ latestPriceText(row) }}</span>
        </div>
      </div>

      <div class="grid gap-3 md:hidden" :aria-label="`${accountMeta.title}持有币种`">
        <article
          v-for="row in holdings"
          :key="`m-${row.symbol}`"
          class="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-3">
              <span
                class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black"
                :class="coinSwatchClass(row.symbol)"
                aria-hidden="true"
              >
                {{ coinIconLabel(row.symbol) }}
              </span>
              <div class="min-w-0">
                <h3 class="truncate text-base font-semibold text-white">{{ row.symbol }}</h3>
                <p class="truncate text-xs text-white/42">{{ row.name }}</p>
              </div>
            </div>
            <p class="font-mono text-sm text-white/86">{{ latestPriceText(row) }}</p>
          </div>
          <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt class="text-xs text-white/42">数量</dt>
              <dd class="mt-1 font-mono text-white">{{ amountText(row) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-white/42">冻结</dt>
              <dd class="mt-1 font-mono text-white">{{ frozenText(row) }}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  </div>
</template>
