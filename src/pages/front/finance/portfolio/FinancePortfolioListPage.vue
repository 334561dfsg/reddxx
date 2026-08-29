<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { portfolioProductsCatalog } from '../../../../admin/state/financeCatalogs'
import { portfolioOrders } from '../../../../admin/state/portfolioOrders'
import {
  EARLY_REDEEM_MODE,
  ORDER_STATUS,
  PRODUCT_STATUS,
  earlyRedeemModeMeta,
  formatPortfolioAmount,
  formatPortfolioDuration,
  formatPortfolioRateRange,
  orderStatusMeta,
  redeemArrivalModeMeta,
  sortPortfolioProducts
} from '../../../../admin/constants/portfolio'

const prefix = '/front'
const route = useRoute()
const products = portfolioProductsCatalog
const orders = portfolioOrders
const currentUserId = 'U10086'
const currentMonthKey = new Date().toISOString().slice(0, 7)

const panel = ref(route.query.tab === 'orders' ? 'mine' : 'market')
const orderPanel = ref('running')
const currentOrderPage = ref(1)
const orderPageSize = 5
const mobileProductPageSize = 4
const mobileOrderPageSize = 5
const visibleProductCount = ref(mobileProductPageSize)
const visibleOrderCount = ref(mobileOrderPageSize)
const redeemOrder = ref(null)

const enabledProducts = computed(() =>
  sortPortfolioProducts(products.value.filter((product) => product.status === PRODUCT_STATUS.ENABLED))
)
const visibleProducts = computed(() => enabledProducts.value.slice(0, visibleProductCount.value))
const hasMoreProducts = computed(() => visibleProductCount.value < enabledProducts.value.length)
const redeemedOrderStatuses = [ORDER_STATUS.EARLY_REDEEMED, ORDER_STATUS.COMPLETED, ORDER_STATUS.SETTLED]
const filteredOrders = computed(() => {
  if (orderPanel.value === 'redeemed') {
    return orders.value.filter((order) => redeemedOrderStatuses.includes(order.status))
  }
  return orders.value.filter((order) => order.status === ORDER_STATUS.RUNNING)
})
const mobilePagedOrders = computed(() => filteredOrders.value.slice(0, visibleOrderCount.value))
const hasMoreOrders = computed(() => visibleOrderCount.value < filteredOrders.value.length)
const totalOrderPages = computed(() => Math.max(1, Math.ceil(filteredOrders.value.length / orderPageSize)))
const pagedOrders = computed(() => {
  const start = (currentOrderPage.value - 1) * orderPageSize
  return filteredOrders.value.slice(start, start + orderPageSize)
})

function openPanel(nextPanel) {
  panel.value = nextPanel
  if (nextPanel === 'market') visibleProductCount.value = mobileProductPageSize
  if (nextPanel === 'mine') {
    currentOrderPage.value = 1
    visibleOrderCount.value = mobileOrderPageSize
  }
}

function openOrderPanel(nextPanel) {
  orderPanel.value = nextPanel
  currentOrderPage.value = 1
  visibleOrderCount.value = mobileOrderPageSize
}

watch(
  () => route.query.tab,
  (tab) => {
    if (tab === 'orders') panel.value = 'mine'
    if (tab === 'products') panel.value = 'market'
  }
)

function goOrderPage(page) {
  currentOrderPage.value = Math.min(Math.max(1, page), totalOrderPages.value)
}

function loadMoreProducts() {
  visibleProductCount.value += mobileProductPageSize
}

function loadMoreOrders() {
  visibleOrderCount.value += mobileOrderPageSize
}

function orderStatusClass(status) {
  if (status === ORDER_STATUS.RUNNING) return 'bg-sky-400/15 text-sky-200'
  if (status === ORDER_STATUS.COMPLETED) return 'bg-lime-400/12 text-lime-200'
  if (status === ORDER_STATUS.EARLY_REDEEMED) return 'bg-purple-400/15 text-purple-200'
  if (status === ORDER_STATUS.CANCELLED) return 'bg-rose-400/15 text-rose-200'
  return 'bg-white/10 text-white/55'
}

function getMonthlyRemainingCount(product) {
  const limit = Number(product.monthlyLimitCount || 0)
  if (!limit) return 0
  const used = orders.value.filter(
    (order) =>
      order.userId === currentUserId &&
      order.productId === product.id &&
      String(order.startedAt || '').startsWith(currentMonthKey)
  ).length
  return Math.max(0, limit - used)
}

function formatPortfolioAssetTitle(product) {
  return product.assets.map((asset) => asset.symbol).join(' + ')
}

function portfolioOrderDetailLocation(orderId) {
  return {
    path: `${prefix}/finance/portfolio/order/${orderId}`,
    query: { from: 'orders' }
  }
}

function openRedeem(order) {
  redeemOrder.value = order
}

function closeRedeem() {
  redeemOrder.value = null
}

const redeemProduct = computed(() =>
  products.value.find((product) => product.id === redeemOrder.value?.productId) ?? null
)

const redeemCheck = computed(() => {
  const order = redeemOrder.value
  const product = redeemProduct.value
  if (!order || !product) return { ok: false, reason: '订单不存在' }
  if (order.status !== ORDER_STATUS.RUNNING) return { ok: false, reason: '只有运行中的订单可提前赎回' }
  if (!product.earlyRedeemEnabled) return { ok: false, reason: '该组合不支持提前赎回' }
  return { ok: true, reason: '' }
})

function confirmRedeem() {
  if (!redeemCheck.value.ok || !redeemOrder.value) return
  redeemOrder.value.status = ORDER_STATUS.EARLY_REDEEMED
  redeemOrder.value.redeemedAt = new Date().toLocaleString('zh-CN', { hour12: false })
  closeRedeem()
}

function redeemSummary(product, order) {
  if (!product || !order) return '—'
  const principal = Number(order.principal || 0)
  const fee = principal * (Number(product.earlyRedeemFeePct || 0) / 100)
  if (product.earlyRedeemMode === EARLY_REDEEM_MODE.FORFEIT_YIELD) {
    return `预计返还 ${formatPortfolioAmount(principal - fee)}，收益清零`
  }
  if (product.earlyRedeemMode === EARLY_REDEEM_MODE.FEE_ONLY) {
    return `预计返还本金 + 已产生收益，扣 ${formatPortfolioAmount(fee)} 手续费`
  }
  return `按已持有 ${order.heldDays || 0} 天计息，扣 ${formatPortfolioAmount(fee)} 手续费`
}
</script>

<template>
  <div class="relative overflow-hidden">
    <div class="pointer-events-none absolute inset-0" aria-hidden="true">
      <div class="absolute -left-24 top-0 h-72 w-72 rounded-full bg-lime-400/[0.08] blur-[110px]" />
      <div class="absolute right-0 top-32 h-80 w-80 rounded-full bg-violet-400/[0.07] blur-[120px]" />
    </div>

    <section class="relative mx-auto max-w-7xl px-5 pb-10 pt-8 sm:px-8 lg:px-10">
      <nav class="text-xs text-white/40 sm:text-sm">
        <RouterLink :to="`${prefix}/finance`" class="transition hover:text-lime-300">金融</RouterLink>
        <span class="mx-2 text-white/20">/</span>
        <span class="text-white/75">投资组合</span>
      </nav>

      <div class="mt-6">
        <p class="text-[11px] font-bold uppercase tracking-[0.35em] text-lime-400/85">Portfolio Earn</p>
        <h1 class="mt-3 text-2xl font-bold tracking-tight text-white sm:text-4xl">投资组合</h1>
      </div>

      <div class="mt-8 flex rounded-2xl border border-white/[0.08] bg-black/25 p-1 sm:w-fit">
        <button
          type="button"
          :class="[
            'flex-1 rounded-xl px-5 py-2.5 text-sm font-semibold transition sm:flex-none',
            panel === 'market' ? 'bg-lime-400 text-black' : 'text-white/55 hover:text-white'
          ]"
          @click="openPanel('market')"
        >
          组合市场
        </button>
        <button
          type="button"
          :class="[
            'flex-1 rounded-xl px-5 py-2.5 text-sm font-semibold transition sm:flex-none',
            panel === 'mine' ? 'bg-lime-400 text-black' : 'text-white/55 hover:text-white'
          ]"
          @click="openPanel('mine')"
        >
          我的订单
        </button>
      </div>

      <div v-if="panel === 'market'" class="mt-6">
        <div class="grid gap-4 lg:hidden">
          <article
            v-for="product in visibleProducts"
            :key="product.id"
            class="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 transition hover:border-lime-400/25 sm:p-6"
          >
            <span
              v-if="product.isHot"
              class="absolute right-0 top-0 rounded-bl-2xl bg-gradient-to-r from-rose-500 to-orange-400 px-3 py-1.5 text-[10px] font-black tracking-[0.18em] text-white shadow-lg shadow-rose-500/20"
            >
              HOT
            </span>
            <div class="pr-14 sm:pr-16">
              <RouterLink
                :to="`${prefix}/finance/portfolio/${product.id}`"
                class="block text-lg font-bold tracking-tight text-white transition hover:text-lime-200 sm:text-xl"
              >
                {{ formatPortfolioAssetTitle(product) }}
              </RouterLink>
            </div>

            <div class="mt-4 flex flex-wrap gap-2 sm:mt-5">
              <span
                v-for="asset in product.assets"
                :key="asset.symbol"
                class="rounded-full border border-white/[0.08] bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-white/75 sm:px-3 sm:text-xs"
              >
                {{ asset.symbol }}
              </span>
              <span
                v-if="product.minVipLevel > 0"
                class="rounded-full border border-lime-300/20 bg-lime-300/10 px-2.5 py-1 text-[11px] font-semibold text-lime-200 sm:px-3 sm:text-xs"
              >
                VIP {{ product.minVipLevel }}
              </span>
            </div>

            <dl class="mt-4 grid grid-cols-2 gap-2 text-[13px] sm:mt-5 sm:grid-cols-4 sm:gap-3 sm:text-sm">
              <div class="rounded-xl bg-black/20 p-3">
                <dt class="text-white/38">周期</dt>
                <dd class="mt-1 font-semibold text-white">{{ formatPortfolioDuration(product.durationDays) }}</dd>
              </div>
              <div class="rounded-xl bg-black/20 p-3">
                <dt class="text-white/38">日收益区间</dt>
                <dd class="mt-1 font-semibold tabular-nums text-lime-300">{{ formatPortfolioRateRange(product) }}</dd>
              </div>
              <div class="rounded-xl bg-black/20 p-3">
                <dt class="text-white/38">投资区间</dt>
                <dd class="mt-1 font-semibold text-white">{{ product.minAmount.toLocaleString() }} - {{ product.maxAmount.toLocaleString() }}</dd>
              </div>
              <div class="rounded-xl bg-black/20 p-3">
                <dt class="text-white/38">手续费</dt>
                <dd class="mt-1 font-semibold text-white">{{ product.subscriptionFeePct }}%</dd>
              </div>
            </dl>

            <div class="mt-4 border-t border-white/[0.08] pt-4 sm:mt-5 sm:pt-5">
              <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[13px] sm:text-sm">
                <p class="text-white/45">
                  提前赎回：
                  <span class="text-white/75">
                    {{ product.earlyRedeemEnabled ? earlyRedeemModeMeta[product.earlyRedeemMode]?.label : '不支持' }}
                  </span>
                </p>
                <p class="text-white/45">
                  本月剩余：
                  <span class="font-semibold text-lime-300">{{ getMonthlyRemainingCount(product) }} 次</span>
                </p>
              </div>
              <RouterLink
                :to="`${prefix}/finance/portfolio/${product.id}`"
                class="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-lime-400 px-4 text-sm font-bold text-black transition hover:bg-lime-300 sm:mt-5"
              >
                查看并参与
              </RouterLink>
            </div>
          </article>
        </div>
        <div class="hidden gap-4 lg:grid lg:grid-cols-2">
          <article
            v-for="product in enabledProducts"
            :key="`desktop-${product.id}`"
            class="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition hover:border-lime-400/25"
          >
            <span
              v-if="product.isHot"
              class="absolute right-0 top-0 rounded-bl-2xl bg-gradient-to-r from-rose-500 to-orange-400 px-3 py-1.5 text-[10px] font-black tracking-[0.18em] text-white shadow-lg shadow-rose-500/20"
            >
              HOT
            </span>
            <div class="pr-16">
              <RouterLink
                :to="`${prefix}/finance/portfolio/${product.id}`"
                class="block text-xl font-bold tracking-tight text-white transition hover:text-lime-200"
              >
                {{ formatPortfolioAssetTitle(product) }}
              </RouterLink>
            </div>

            <div class="mt-5 flex flex-wrap gap-2">
              <span
                v-for="asset in product.assets"
                :key="asset.symbol"
                class="rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1 text-xs font-semibold text-white/75"
              >
                {{ asset.symbol }}
              </span>
              <span
                v-if="product.minVipLevel > 0"
                class="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-xs font-semibold text-lime-200"
              >
                VIP {{ product.minVipLevel }}
              </span>
            </div>

            <dl class="mt-5 grid grid-cols-4 gap-3 text-sm">
              <div class="rounded-xl bg-black/20 p-3">
                <dt class="text-white/38">周期</dt>
                <dd class="mt-1 font-semibold text-white">{{ formatPortfolioDuration(product.durationDays) }}</dd>
              </div>
              <div class="rounded-xl bg-black/20 p-3">
                <dt class="text-white/38">日收益区间</dt>
                <dd class="mt-1 font-semibold tabular-nums text-lime-300">{{ formatPortfolioRateRange(product) }}</dd>
              </div>
              <div class="rounded-xl bg-black/20 p-3">
                <dt class="text-white/38">投资区间</dt>
                <dd class="mt-1 font-semibold text-white">{{ product.minAmount.toLocaleString() }} - {{ product.maxAmount.toLocaleString() }}</dd>
              </div>
              <div class="rounded-xl bg-black/20 p-3">
                <dt class="text-white/38">手续费</dt>
                <dd class="mt-1 font-semibold text-white">{{ product.subscriptionFeePct }}%</dd>
              </div>
            </dl>

            <div class="mt-5 border-t border-white/[0.08] pt-5">
              <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
                <p class="text-white/45">
                  提前赎回：
                  <span class="text-white/75">
                    {{ product.earlyRedeemEnabled ? earlyRedeemModeMeta[product.earlyRedeemMode]?.label : '不支持' }}
                  </span>
                </p>
                <p class="text-white/45">
                  本月剩余：
                  <span class="font-semibold text-lime-300">{{ getMonthlyRemainingCount(product) }} 次</span>
                </p>
              </div>
              <RouterLink
                :to="`${prefix}/finance/portfolio/${product.id}`"
                class="mt-5 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-lime-400 px-4 text-sm font-bold text-black transition hover:bg-lime-300"
              >
                查看并参与
              </RouterLink>
            </div>
          </article>
        </div>
        <div v-if="hasMoreProducts" class="mt-5 lg:hidden">
          <button
            type="button"
            class="flex min-h-11 w-full items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.04] text-sm font-semibold text-white/70 transition hover:bg-white/[0.08]"
            @click="loadMoreProducts"
          >
            加载更多组合
          </button>
        </div>
      </div>

      <div v-else class="mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
        <div class="border-b border-white/[0.08] p-5">
          <div class="flex items-center justify-between gap-4">
            <h2 class="text-base font-semibold text-white/65">订单明细</h2>
            <p class="text-sm font-semibold text-white/45">共 {{ filteredOrders.length }} 条</p>
          </div>
          <div class="mt-5 grid grid-cols-2 rounded-2xl border border-white/[0.08] bg-black/35 p-1 sm:max-w-xl">
            <button
              type="button"
              :class="[
                'rounded-xl px-5 py-3 text-sm font-bold transition',
                orderPanel === 'running' ? 'bg-white/[0.12] text-lime-300' : 'text-white/45 hover:text-white'
              ]"
              @click="openOrderPanel('running')"
            >
              进行中
            </button>
            <button
              type="button"
              :class="[
                'rounded-xl px-5 py-3 text-sm font-bold transition',
                orderPanel === 'redeemed' ? 'bg-white/[0.12] text-lime-300' : 'text-white/45 hover:text-white'
              ]"
              @click="openOrderPanel('redeemed')"
            >
              已赎回
            </button>
          </div>
        </div>
        <div class="divide-y divide-white/[0.08]">
          <article v-for="order in mobilePagedOrders" :key="order.id" class="grid gap-4 p-4 lg:hidden">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-[15px] font-semibold text-white">{{ order.productName }}</h2>
                <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="orderStatusClass(order.status)">
                  {{ orderStatusMeta[order.status]?.label }}
                </span>
              </div>
              <div class="mt-2 grid gap-1.5 text-[13px] text-white/45">
                <span>本金 {{ formatPortfolioAmount(order.principal, order.quoteCurrency) }}</span>
                <span>周期 {{ formatPortfolioDuration(order.durationDays) }}</span>
                <span>预估收益 {{ formatPortfolioAmount(order.minYield) }} - {{ formatPortfolioAmount(order.maxYield) }}</span>
                <span>开始 {{ order.startedAt }}</span>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2" :data-testid="`portfolio-order-card-actions-${order.id}`">
              <RouterLink
                :to="portfolioOrderDetailLocation(order.id)"
                class="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.04] px-4 text-sm font-semibold text-white/75 transition hover:bg-white/[0.08]"
              >
                查看详情
              </RouterLink>
              <button
                type="button"
                class="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.04] px-4 text-sm font-semibold text-white/75 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:text-white/30"
                :disabled="order.status !== ORDER_STATUS.RUNNING"
                @click="openRedeem(order)"
              >
                提前赎回
              </button>
            </div>
          </article>
          <article v-for="order in pagedOrders" :key="`desktop-${order.id}`" class="hidden gap-4 p-5 lg:grid lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="font-semibold text-white">{{ order.productName }}</h2>
                <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="orderStatusClass(order.status)">
                  {{ orderStatusMeta[order.status]?.label }}
                </span>
              </div>
              <div class="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/45">
                <span>本金 {{ formatPortfolioAmount(order.principal, order.quoteCurrency) }}</span>
                <span>周期 {{ formatPortfolioDuration(order.durationDays) }}</span>
                <span>预估收益 {{ formatPortfolioAmount(order.minYield) }} - {{ formatPortfolioAmount(order.maxYield) }}</span>
                <span>开始 {{ order.startedAt }}</span>
              </div>
            </div>
            <div class="flex flex-wrap items-center justify-end gap-2">
              <RouterLink
                :to="portfolioOrderDetailLocation(order.id)"
                class="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.04] px-4 text-sm font-semibold text-white/75 transition hover:bg-white/[0.08]"
              >
                查看详情
              </RouterLink>
              <button
                type="button"
                class="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.04] px-4 text-sm font-semibold text-white/75 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:text-white/30"
                :disabled="order.status !== ORDER_STATUS.RUNNING"
                @click="openRedeem(order)"
              >
                提前赎回
              </button>
            </div>
          </article>
          <div v-if="!filteredOrders.length" class="p-8 text-center text-sm text-white/40">
            暂无订单
          </div>
        </div>
        <div v-if="hasMoreOrders" class="border-t border-white/[0.08] p-4 lg:hidden">
          <button
            type="button"
            class="flex min-h-11 w-full items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.04] text-sm font-semibold text-white/70 transition hover:bg-white/[0.08]"
            @click="loadMoreOrders"
          >
            加载更多订单
          </button>
        </div>
        <div v-if="filteredOrders.length" class="hidden flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] p-5 text-sm lg:flex">
          <p class="text-white/40">第 {{ currentOrderPage }} / {{ totalOrderPages }} 页</p>
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="rounded-xl border border-white/[0.1] px-3 py-2 font-semibold text-white/55 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:text-white/20"
              :disabled="currentOrderPage <= 1"
              @click="goOrderPage(currentOrderPage - 1)"
            >
              上一页
            </button>
            <button
              v-for="page in totalOrderPages"
              :key="page"
              type="button"
              :class="[
                'min-w-10 rounded-xl px-3 py-2 font-semibold transition',
                page === currentOrderPage ? 'bg-lime-400 text-black' : 'border border-white/[0.1] text-white/55 hover:bg-white/[0.06]'
              ]"
              @click="goOrderPage(page)"
            >
              {{ page }}
            </button>
            <button
              type="button"
              class="rounded-xl border border-white/[0.1] px-3 py-2 font-semibold text-white/55 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:text-white/20"
              :disabled="currentOrderPage >= totalOrderPages"
              @click="goOrderPage(currentOrderPage + 1)"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="redeemOrder" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
        <div class="w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#0b0d10] p-6 shadow-2xl">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-white">提前赎回</h2>
              <p class="mt-1 text-sm text-white/45">{{ redeemOrder.productName }}</p>
            </div>
            <button type="button" class="text-2xl leading-none text-white/45 hover:text-white" @click="closeRedeem">×</button>
          </div>
          <div class="mt-5 space-y-3 text-sm text-white/65">
            <p>处理方式：{{ redeemProduct?.earlyRedeemEnabled ? earlyRedeemModeMeta[redeemProduct.earlyRedeemMode]?.label : '不支持' }}</p>
            <p>到账时间：{{ redeemArrivalModeMeta[redeemProduct?.redeemArrivalMode]?.label ?? '—' }}</p>
            <p>{{ redeemSummary(redeemProduct, redeemOrder) }}</p>
          </div>
          <p v-if="!redeemCheck.ok" class="mt-4 rounded-xl bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
            {{ redeemCheck.reason }}
          </p>
          <button
            type="button"
            :disabled="!redeemCheck.ok"
            class="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl bg-lime-400 text-sm font-bold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
            @click="confirmRedeem"
          >
            确认赎回
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
