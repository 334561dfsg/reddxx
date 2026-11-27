<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { portfolioProductsCatalog } from '../../../../admin/state/financeCatalogs'
import { portfolioOrders } from '../../../../admin/state/portfolioOrders'
import {
  ORDER_STATUS,
  calculatePortfolioEstimate,
  canSubscribePortfolio,
  formatPortfolioAmount,
  formatPortfolioDuration,
  roundMoney
} from '../../../../admin/constants/portfolio'

const route = useRoute()
const prefix = '/front'
const amount = ref('')
const availableBalance = ref(50000)

const product = computed(() => {
  const id = String(route.params.productId || '')
  return portfolioProductsCatalog.value.find((item) => item.id === id) ?? null
})

const estimate = computed(() => calculatePortfolioEstimate(amount.value, product.value))
const subscribeAmount = computed(() => Number(amount.value) || 0)
const subscribeCheck = computed(() =>
  canSubscribePortfolio(product.value, subscribeAmount.value, { availableBalance: availableBalance.value })
)

const dailyRatePlain = computed(() => {
  if (!product.value) return '—'
  return `${Number(product.value.minDailyRatePct || 0).toFixed(2)}-${Number(product.value.maxDailyRatePct || 0).toFixed(2)}%`
})

const amountStep = computed(() => Math.max(1, Math.round(Number(product.value?.minAmount || 100) / 10)))

function formatPortfolioAssetTitle(nextProduct = product.value) {
  if (!nextProduct) return '—'
  return nextProduct.assets.map((asset) => asset.symbol).join(' + ')
}

function coinIconLabel(symbol) {
  const map = {
    BTC: '₿',
    ETH: 'Ξ',
    USDT: 'T',
    SHIB: '犬',
    XRP: 'X',
    SOL: 'S',
    BNB: 'B'
  }
  return map[symbol] ?? String(symbol || '?').slice(0, 1).toUpperCase()
}

function coinIconClass(symbol) {
  const map = {
    BTC: 'bg-[#f7931a] text-white',
    ETH: 'bg-slate-100 text-slate-700',
    USDT: 'bg-emerald-500 text-white',
    SHIB: 'bg-orange-500 text-white',
    XRP: 'bg-slate-800 text-white',
    SOL: 'bg-violet-500 text-white',
    BNB: 'bg-amber-400 text-black'
  }
  return map[symbol] ?? 'bg-lime-400 text-black'
}

function decreaseAmount() {
  amount.value = String(Math.max(0, roundMoney(subscribeAmount.value - amountStep.value, 2)))
}

function increaseAmount() {
  amount.value = String(roundMoney(subscribeAmount.value + amountStep.value, 2))
}

function confirmSubscribe() {
  if (!subscribeCheck.value.ok || !product.value) return
  const nextEstimate = calculatePortfolioEstimate(subscribeAmount.value, product.value)
  portfolioOrders.value = [
    {
      id: `pfo-${Date.now()}`,
      userId: 'U-DEMO',
      userName: 'demo@example.com',
      productId: product.value.id,
      productName: formatPortfolioAssetTitle(product.value),
      assets: product.value.assets,
      principal: nextEstimate.principal,
      quoteCurrency: product.value.quoteCurrency,
      durationDays: product.value.durationDays,
      minDailyRatePct: product.value.minDailyRatePct,
      maxDailyRatePct: product.value.maxDailyRatePct,
      fee: nextEstimate.fee,
      minYield: nextEstimate.minYield,
      maxYield: nextEstimate.maxYield,
      accumulatedYield: 0,
      status: ORDER_STATUS.RUNNING,
      startedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      maturityAt: `${product.value.durationDays} 天后`,
      heldDays: 0,
      earlyRedeemEnabled: product.value.earlyRedeemEnabled
    },
    ...portfolioOrders.value
  ]
  availableBalance.value = Math.max(0, availableBalance.value - nextEstimate.principal)
  amount.value = ''
}
</script>

<template>
  <div v-if="product" class="min-h-screen bg-black text-white">
    <main class="mx-auto max-w-[430px] px-4 pb-10 pt-[5.5rem] lg:hidden">
      <header class="fixed inset-x-0 top-0 z-50 mx-auto flex h-[4.5rem] w-full max-w-[430px] items-center justify-center bg-black/90 px-4 backdrop-blur">
        <RouterLink :to="`${prefix}/finance/portfolio`" class="absolute left-4 text-[28px] leading-none text-white transition hover:text-lime-200">
          ←
        </RouterLink>
        <h1 class="text-[24px] font-bold leading-8 tracking-tight">投资组合</h1>
        <span
          v-if="product.isHot"
          class="absolute right-4 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 px-3 py-1 text-[10px] font-black tracking-[0.18em] text-white shadow-lg shadow-rose-500/20"
        >
          HOT
        </span>
      </header>

      <section class="mt-6 rounded-2xl bg-[#121212] p-4">
        <div class="grid grid-cols-3 gap-5">
          <template v-for="(asset, index) in product.assets" :key="asset.symbol">
            <div class="relative min-h-[8.75rem] rounded-[1.35rem] bg-black px-3 pb-4 pt-4 text-center">
              <div
                v-if="index > 0"
                class="absolute -left-[1.45rem] top-1/2 -translate-y-1/2 text-[26px] font-light text-white/20"
              >
                +
              </div>
              <div class="mx-auto mt-0 flex h-14 w-14 items-center justify-center rounded-full text-[28px] font-black shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)]" :class="coinIconClass(asset.symbol)">
                {{ coinIconLabel(asset.symbol) }}
              </div>
              <p class="mt-4 truncate text-[16px] font-medium text-white">{{ asset.symbol }}</p>
            </div>
          </template>
        </div>
        <div v-if="product.minVipLevel > 0" class="mt-5">
          <span class="inline-flex rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-[12px] font-semibold text-lime-200">
            VIP {{ product.minVipLevel }}
          </span>
        </div>

        <h2 class="sr-only">组合信息</h2>
        <dl class="mt-9 space-y-5">
          <div class="flex items-center justify-between gap-5">
            <dt class="text-[15px] text-white/52">运行时长</dt>
            <dd class="text-[16px] font-bold text-white">{{ formatPortfolioDuration(product.durationDays) }}</dd>
          </div>
          <div class="flex items-center justify-between gap-5">
            <dt class="text-[15px] text-white/52">日收益率</dt>
            <dd class="text-[16px] font-bold text-white">{{ dailyRatePlain }}</dd>
          </div>
          <div class="flex items-center justify-between gap-5">
            <dt class="text-[15px] text-white/52">预估收益</dt>
            <dd class="text-[16px] font-bold text-white">{{ formatPortfolioAmount(estimate.minYield) }}</dd>
          </div>
          <div class="flex items-center justify-between gap-5">
            <dt class="text-[15px] text-white/52">投资金额</dt>
            <dd class="text-[16px] font-bold text-white">{{ product.minAmount.toLocaleString() }}-{{ product.maxAmount.toLocaleString() }} {{ product.quoteCurrency }}</dd>
          </div>
          <div class="flex items-center justify-between gap-5">
            <dt class="text-[15px] text-white/52">手续费</dt>
            <dd class="text-[16px] font-bold text-white">{{ formatPortfolioAmount(estimate.fee) }}</dd>
          </div>
        </dl>
      </section>

      <section class="mt-6 rounded-2xl bg-[#121212] p-5">
        <div class="flex items-center gap-3">
          <span class="h-3 w-3 rounded-sm bg-fuchsia-400 shadow-[8px_6px_0_0_#2bf2b5]" />
          <h2 class="text-[22px] font-bold leading-7">申购金额</h2>
        </div>
        <p class="mt-4 text-[14px] text-white/45">账户余额: {{ formatPortfolioAmount(availableBalance) }}</p>

        <div class="mt-7 flex min-h-[4.5rem] items-center gap-3 rounded-2xl border border-slate-500/70 px-3">
          <button
            type="button"
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-[28px] font-semibold text-white transition hover:bg-white/[0.12]"
            @click="decreaseAmount"
          >
            -
          </button>
          <input
            v-model="amount"
            type="number"
            min="0"
            :placeholder="`请输入投资金额`"
            class="min-w-0 flex-1 bg-transparent text-[17px] font-semibold text-white outline-none placeholder:text-white/30"
          />
          <span class="text-[20px] font-black text-emerald-500">{{ product.quoteCurrency }}</span>
          <button
            type="button"
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-[28px] font-semibold text-white transition hover:bg-white/[0.12]"
            @click="increaseAmount"
          >
            +
          </button>
        </div>

        <p v-if="amount && !subscribeCheck.ok" class="mt-5 rounded-xl bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {{ subscribeCheck.reason }}
        </p>

        <button
          type="button"
          :disabled="!subscribeCheck.ok"
          class="mt-8 flex min-h-[4.5rem] w-full items-center justify-center rounded-full bg-lime-400 text-[20px] font-bold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
          @click="confirmSubscribe"
        >
          确定
        </button>
      </section>

      <section class="mt-8 px-5 pb-8">
        <div class="flex items-center gap-3">
          <span class="h-3 w-3 rounded-sm bg-fuchsia-400 shadow-[8px_6px_0_0_#2bf2b5]" />
          <h2 class="text-[22px] font-bold leading-7">怎样进行运作?</h2>
        </div>
        <p class="mt-7 text-[15px] leading-7 text-white/58">
          接入一系列的交易所，例如 Coinbase、Huobi、Binance、KuCoin、YFX 等全球知名交易所，通过算法判断各币种的趋势，实时监控当前市场情况。在价格范围内，高频率买入和卖出相关币种，实现套利，以保证您的收益最大化。
        </p>
      </section>
    </main>

    <main class="hidden lg:block">
      <span class="sr-only">PC 详情</span>
      <header class="relative overflow-hidden border-b border-white/[0.06] bg-[#050505]">
        <div class="absolute -left-1/4 top-0 h-[26rem] w-[26rem] rounded-full bg-lime-400/[0.07] blur-[100px]" />
        <div class="absolute -right-1/4 bottom-0 h-[22rem] w-[22rem] rounded-full bg-lime-400/[0.05] blur-[90px]" />
        <div class="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,#050505_55%,#050505_100%)]" />

        <div class="relative mx-auto max-w-7xl px-10 pb-10 pt-10">
          <nav class="text-sm text-white/40">
            <RouterLink :to="`${prefix}/finance`" class="transition hover:text-lime-300">金融</RouterLink>
            <span class="mx-2 text-white/20">/</span>
            <RouterLink :to="`${prefix}/finance/portfolio`" class="transition hover:text-lime-300">投资组合</RouterLink>
            <span class="mx-2 text-white/20">/</span>
            <span class="text-white/75">{{ formatPortfolioAssetTitle(product) }}</span>
          </nav>

          <div class="mt-5 flex items-end justify-between gap-6">
            <div class="min-w-0">
              <p class="inline-flex items-center gap-2 rounded-full border border-lime-400/25 bg-lime-400/[0.08] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.3em] text-lime-200/95">
                Portfolio Earn
              </p>
              <h1 class="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">{{ formatPortfolioAssetTitle(product) }}</h1>
              <span
                v-if="product.minVipLevel > 0"
                class="mt-4 inline-flex rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-xs font-semibold text-lime-200"
              >
                VIP {{ product.minVipLevel }}
              </span>
              <p class="mt-3 max-w-2xl text-base leading-relaxed text-white/55">
                多币种组合申购，按固定周期展示参考收益区间；提前赎回以当前组合配置为准。
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-3">
              <span
                v-if="product.isHot"
                class="rounded-full bg-gradient-to-r from-rose-500 to-orange-400 px-3 py-1.5 text-xs font-black tracking-[0.18em] text-white shadow-lg shadow-rose-500/20"
              >
                HOT
              </span>
              <RouterLink
                :to="`${prefix}/finance/portfolio`"
                class="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/85 transition hover:bg-white/10"
              >
                返回列表
              </RouterLink>
            </div>
          </div>
        </div>
      </header>

      <div class="mx-auto grid max-w-7xl items-start gap-6 px-10 py-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div class="space-y-6">
          <section class="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6">
            <div class="flex items-center justify-between gap-5">
              <div>
                <h2 class="text-lg font-semibold text-white">组合币种</h2>
                <p class="mt-1 text-sm text-white/45">申购后按当前组合配置参与运作</p>
              </div>
              <p class="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1.5 text-xs font-semibold text-lime-200">
                {{ product.assets.map((asset) => asset.symbol).join(' + ') }}
              </p>
            </div>

            <div class="mt-5 grid gap-3 sm:grid-cols-3">
              <template v-for="(asset, index) in product.assets" :key="asset.symbol">
                <div class="relative rounded-xl border border-white/[0.06] bg-black/35 px-4 py-5 text-center">
                  <div
                    v-if="index > 0"
                    class="absolute -left-4 top-1/2 -translate-y-1/2 text-2xl font-light text-white/18"
                  >
                    +
                  </div>
                  <div
                    class="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl font-black shadow-[0_18px_50px_-25px_rgba(255,255,255,0.25)]"
                    :class="coinIconClass(asset.symbol)"
                  >
                    {{ coinIconLabel(asset.symbol) }}
                  </div>
                  <p class="mt-4 truncate text-base font-semibold text-white">{{ asset.symbol }}</p>
                </div>
              </template>
            </div>
          </section>

          <section class="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6">
            <h2 class="text-lg font-semibold text-white">组合信息</h2>
            <dl class="mt-6 grid gap-4 sm:grid-cols-2">
              <div class="rounded-xl border border-white/[0.06] bg-black/25 px-4 py-3">
                <dt class="text-[11px] font-medium uppercase tracking-wide text-white/40">运行时长</dt>
                <dd class="mt-1 text-sm font-semibold leading-snug text-white/90">{{ formatPortfolioDuration(product.durationDays) }}</dd>
              </div>
              <div class="rounded-xl border border-white/[0.06] bg-black/25 px-4 py-3">
                <dt class="text-[11px] font-medium uppercase tracking-wide text-white/40">日收益率</dt>
                <dd class="mt-1 text-sm font-semibold leading-snug text-lime-200/90">{{ dailyRatePlain }}</dd>
              </div>
              <div class="rounded-xl border border-white/[0.06] bg-black/25 px-4 py-3">
                <dt class="text-[11px] font-medium uppercase tracking-wide text-white/40">预估收益</dt>
                <dd class="mt-1 text-sm font-semibold leading-snug text-white/90">{{ formatPortfolioAmount(estimate.minYield) }}</dd>
              </div>
              <div class="rounded-xl border border-white/[0.06] bg-black/25 px-4 py-3">
                <dt class="text-[11px] font-medium uppercase tracking-wide text-white/40">投资金额</dt>
                <dd class="mt-1 text-sm font-semibold leading-snug text-white/90">{{ product.minAmount.toLocaleString() }}-{{ product.maxAmount.toLocaleString() }} {{ product.quoteCurrency }}</dd>
              </div>
              <div class="rounded-xl border border-white/[0.06] bg-black/25 px-4 py-3 sm:col-span-2">
                <dt class="text-[11px] font-medium uppercase tracking-wide text-white/40">手续费</dt>
                <dd class="mt-1 text-sm font-semibold leading-snug text-white/90">{{ formatPortfolioAmount(estimate.fee) }}</dd>
              </div>
            </dl>
          </section>

          <section class="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6">
            <div class="flex items-center gap-3">
              <span class="h-3 w-3 rounded-sm bg-fuchsia-400 shadow-[8px_6px_0_0_#2bf2b5]" />
              <h2 class="text-lg font-semibold text-white">怎样进行运作?</h2>
            </div>
            <p class="mt-4 max-w-4xl text-sm leading-7 text-white/58">
              接入一系列的交易所，例如 Coinbase、Huobi、Binance、KuCoin、YFX 等全球知名交易所，通过算法判断各币种的趋势，实时监控当前市场情况。在价格范围内，高频率买入和卖出相关币种，实现套利，以保证您的收益最大化。
            </p>
          </section>
        </div>

        <aside class="lg:sticky lg:top-8">
          <section class="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6">
            <div class="flex items-center gap-3">
              <span class="h-3 w-3 rounded-sm bg-fuchsia-400 shadow-[8px_6px_0_0_#2bf2b5]" />
              <h2 class="text-lg font-semibold text-white">申购金额</h2>
            </div>
            <p class="mt-3 text-xs text-white/45">账户余额: {{ formatPortfolioAmount(availableBalance) }}</p>

            <div class="mt-5 flex min-h-[3.25rem] items-center gap-2 rounded-xl border border-white/[0.12] bg-black/40 px-2">
              <button
                type="button"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-xl font-semibold text-white transition hover:bg-white/[0.12]"
                @click="decreaseAmount"
              >
                -
              </button>
              <input
                v-model="amount"
                type="number"
                min="0"
                :placeholder="`请输入投资金额`"
                class="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-white outline-none placeholder:text-white/30"
              />
              <span class="text-sm font-semibold text-lime-300">{{ product.quoteCurrency }}</span>
              <button
                type="button"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-xl font-semibold text-white transition hover:bg-white/[0.12]"
                @click="increaseAmount"
              >
                +
              </button>
            </div>

            <p v-if="amount && !subscribeCheck.ok" class="mt-5 rounded-xl bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              {{ subscribeCheck.reason }}
            </p>

            <button
              type="button"
              :disabled="!subscribeCheck.ok"
              class="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-lime-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
              @click="confirmSubscribe"
            >
              确定
            </button>
          </section>
        </aside>
      </div>
    </main>
  </div>

  <div v-else class="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 py-24 text-center">
    <p class="text-lg text-white/60">未找到该组合产品</p>
    <RouterLink
      :to="`${prefix}/finance/portfolio`"
      class="mt-6 inline-flex rounded-xl border border-white/[0.12] bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-lime-300 transition hover:bg-white/[0.08]"
    >
      返回投资组合
    </RouterLink>
  </div>
</template>
