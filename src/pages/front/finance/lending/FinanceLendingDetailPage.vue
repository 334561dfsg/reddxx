<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { lendingProductsCatalog, lockedProductsCatalog } from '../../../../admin/state/financeCatalogs'
import {
  PRODUCT_STATUS as LOCK_PRODUCT_STATUS,
  borrowableLiquidityFromLocked
} from '../../../../admin/constants/liquidityLocked'
import {
  PRODUCT_STATUS,
  PRODUCT_STATUS_LABELS,
  INTEREST_RATE_TYPE,
  INTEREST_RATE_TYPE_LABELS,
  normalizeOverduePenaltyRate,
  normalizeCollateralWarningThreshold,
  normalizeCollateralDisposalThreshold
} from '../../../../admin/constants/cryptoLending'

const route = useRoute()
const prefix = '/front'

const product = computed(() => {
  const id = String(route.params.productId || '')
  return lendingProductsCatalog.value.find((p) => p.productId === id) ?? null
})

/** 与借贷借出币种一致的、上架中锁仓池存在时，用流动性挖矿「可借贷比例」推算可借余额 */
const displayedAvailableLiquidity = computed(() => {
  const p = product.value
  if (!p) return { value: 0, fromLockedPool: false }
  const locked = lockedProductsCatalog.value
  const hasPool = locked.some(
    (x) => x.currency === p.loanCurrency && x.status === LOCK_PRODUCT_STATUS.ENABLED
  )
  if (!hasPool) {
    return { value: Number(p.availableLiquidity || 0), fromLockedPool: false }
  }
  return {
    value: borrowableLiquidityFromLocked(p.loanCurrency, locked),
    fromLockedPool: true
  }
})

function statusPillClass(s) {
  if (s === PRODUCT_STATUS.ACTIVE) return 'bg-emerald-400/15 text-emerald-200'
  if (s === PRODUCT_STATUS.SUSPENDED) return 'bg-amber-400/15 text-amber-200'
  return 'bg-white/10 text-white/50'
}

/** 与运营端产品列表利率列口径一致 */
const headlineRateLabel = computed(() => {
  const p = product.value
  if (!p) return '年化利率'
  if (p.interestRateType === INTEREST_RATE_TYPE.FLOATING) return '利率区间'
  if (p.interestRateType === INTEREST_RATE_TYPE.TIERED) return '利率结构'
  return '年化利率'
})

const headlineRateValue = computed(() => {
  const p = product.value
  if (!p) return '—'
  if (p.interestRateType === INTEREST_RATE_TYPE.FLOATING && p.floatingRateConfig) {
    const c = p.floatingRateConfig
    if (c.minRate != null && c.maxRate != null) return `${c.minRate}% – ${c.maxRate}%`
  }
  if (p.interestRateType === INTEREST_RATE_TYPE.FLOATING) {
    return `${p.interestRate ?? '—'}%`
  }
  if (p.interestRateType === INTEREST_RATE_TYPE.TIERED) return '阶梯计费'
  return `${p.interestRate ?? '—'}%`
})

const overduePenaltyRate = computed(() => {
  const p = product.value
  return p ? normalizeOverduePenaltyRate(p) : null
})

const collateralDisposalThreshold = computed(() => {
  const p = product.value
  return p ? normalizeCollateralDisposalThreshold(p) : null
})

const collateralWarningThreshold = computed(() => {
  const p = product.value
  return p ? normalizeCollateralWarningThreshold(p) : null
})
</script>

<template>
  <div v-if="product">
    <header class="relative overflow-hidden border-b border-white/[0.06] bg-[#050505]">
      <div
        class="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-950/90 via-[#070c12] to-[#030304]"
        aria-hidden="true"
      />
      <div
        class="pointer-events-none absolute -right-20 top-1/4 h-72 w-72 rounded-full bg-sky-400/12 blur-3xl"
        aria-hidden="true"
      />
      <div class="relative mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <nav class="text-sm text-white/45">
          <RouterLink :to="`${prefix}/finance`" class="transition hover:text-lime-300">金融</RouterLink>
          <span class="mx-2 text-white/20">/</span>
          <RouterLink :to="`${prefix}/finance/lending`" class="transition hover:text-lime-300">信用借贷</RouterLink>
          <span class="mx-2 text-white/20">/</span>
          <span class="text-white/75">{{ product.productName }}</span>
        </nav>

        <div class="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="text-3xl font-bold tracking-tight text-white md:text-4xl">{{ product.productName }}</h1>
              <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusPillClass(product.status)">
                {{ PRODUCT_STATUS_LABELS[product.status] }}
              </span>
            </div>
            <p class="mt-3 max-w-2xl text-base leading-relaxed text-white/55 md:text-lg">
              {{ INTEREST_RATE_TYPE_LABELS[product.interestRateType] }} · 借出
              <span class="font-medium text-white/80">{{ product.loanCurrency }}</span>
            </p>
          </div>
          <div class="flex shrink-0 flex-wrap gap-2 lg:pb-0.5">
            <RouterLink
              v-if="product.status === PRODUCT_STATUS.ACTIVE"
              :to="{ path: `${prefix}/login`, query: { redirect: route.fullPath } }"
              class="inline-flex items-center justify-center rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-semibold text-[#0b0e11] transition hover:bg-lime-300"
            >
              登录后申请借款
            </RouterLink>
            <p
              v-else
              class="max-w-sm rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm leading-relaxed text-white/55"
            >
              当前产品非在售状态，暂不可发起新借款；请返回列表选择其他产品。
            </p>
          </div>
        </div>

        <dl class="mt-8 grid max-w-xs grid-cols-1 gap-3 border-t border-white/[0.08] pt-8 sm:gap-4">
          <div class="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3 sm:px-4">
            <dt class="text-[11px] font-medium uppercase tracking-wide text-white/40">{{ headlineRateLabel }}</dt>
            <dd class="mt-1 text-lg font-bold tabular-nums text-sky-300 sm:text-xl">{{ headlineRateValue }}</dd>
          </div>
        </dl>
      </div>
    </header>

    <div class="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <div class="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <section class="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 lg:rounded-3xl lg:p-8">
          <h2 class="text-base font-semibold text-white lg:text-lg">借贷参数</h2>
          <dl class="mt-5 divide-y divide-white/[0.06] text-[15px]">
            <div class="flex items-center justify-between gap-4 py-3 first:pt-0">
              <dt class="text-white/45">逾期违约金比例</dt>
              <dd class="font-medium tabular-nums text-white/85">{{ overduePenaltyRate ?? '—' }}% / 日</dd>
            </div>
            <div class="flex items-center justify-between gap-4 py-3">
              <dt class="text-white/45">质押预警比例</dt>
              <dd class="font-medium tabular-nums text-white/85">{{ collateralWarningThreshold ?? '—' }}%</dd>
            </div>
            <div class="flex items-center justify-between gap-4 py-3">
              <dt class="text-white/45">逾期处理阈值</dt>
              <dd class="font-medium tabular-nums text-white/85">{{ collateralDisposalThreshold ?? '—' }}%</dd>
            </div>
            <div class="flex items-center justify-between gap-4 py-3">
              <dt class="text-white/45">违约结清处置费</dt>
              <dd class="font-medium tabular-nums text-white/85">{{ product.liquidationPenalty ?? '—' }}%</dd>
            </div>
            <div class="flex items-center justify-between gap-4 py-3">
              <dt class="text-white/45">借款期限</dt>
              <dd class="tabular-nums text-white/80">
                {{ product.minLoanDuration }} – {{ product.maxLoanDuration }} 天
              </dd>
            </div>
            <div class="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <dt class="text-white/45">单笔可借</dt>
              <dd class="text-right font-medium tabular-nums text-white/85">
                {{ product.minLoanAmount?.toLocaleString() }} – {{ product.maxLoanAmount?.toLocaleString() }}
                {{ product.loanCurrency }}
              </dd>
            </div>
          </dl>
        </section>

        <section class="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 lg:rounded-3xl lg:p-8">
          <h2 class="text-base font-semibold text-white lg:text-lg">可借流动性</h2>
          <dl class="mt-5 space-y-3 text-[15px]">
            <div class="flex justify-between gap-4 border-b border-white/[0.05] pb-3">
              <dt class="text-white/45">累计借出</dt>
              <dd class="tabular-nums text-white/80">{{ product.totalLent?.toLocaleString() }} {{ product.loanCurrency }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-white/45">可借余额</dt>
              <dd class="font-medium tabular-nums text-sky-200/90">
                {{ displayedAvailableLiquidity.value.toLocaleString() }} {{ product.loanCurrency }}
              </dd>
            </div>
            <div class="flex justify-between gap-4 border-t border-white/[0.05] pt-3">
              <dt class="text-white/45">配置可用流动性</dt>
              <dd class="tabular-nums text-white/60">
                {{ product.availableLiquidity?.toLocaleString() }} {{ product.loanCurrency }}
              </dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-white/45">在贷订单</dt>
              <dd class="tabular-nums text-white/80">{{ product.activeOrders?.toLocaleString() ?? '—' }} 单</dd>
            </div>
          </dl>
          <p
            v-if="displayedAvailableLiquidity.fromLockedPool"
            class="mt-3 text-xs leading-relaxed text-white/40"
          >
            与同币种锁仓理财上架规模及平台可借贷比例综合测算，具体以页面与风控规则为准。
          </p>
          <p class="mt-5 rounded-lg border border-amber-400/15 bg-amber-400/[0.06] px-3 py-2.5 text-xs leading-relaxed text-amber-100/85">
            质押币种按实时币价估值；当债务占比达到预警比例时，平台会提示补充质押或提前还款，达到处理阈值后可进入逾期处理。
          </p>
        </section>
      </div>
    </div>
  </div>

  <div
    v-else
    class="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 py-24 text-center"
  >
    <p class="text-lg text-white/60">未找到该产品</p>
    <RouterLink
      :to="`${prefix}/finance/lending`"
      class="mt-6 inline-flex rounded-xl border border-white/[0.12] bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-lime-300 transition hover:bg-white/[0.08]"
    >
      返回信用借贷列表
    </RouterLink>
  </div>
</template>
