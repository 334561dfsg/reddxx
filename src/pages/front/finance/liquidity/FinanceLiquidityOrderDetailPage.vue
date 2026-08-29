<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { createLockedOrdersMock } from '../../../../admin/mock/liquidityLocked'
import { buildLockedDemoExtraOrders } from '../../../../admin/mock/frontFinanceDemoBulk'
import {
  ORDER_STATUS,
  orderStatusMeta
} from '../../../../admin/constants/liquidityLocked'

const route = useRoute()
const prefix = '/front'
const dailyPageSize = 8
const visibleDailyLimit = ref(dailyPageSize)
const ordersReturnLocation = {
  path: `${prefix}/finance/liquidity`,
  query: { tab: 'orders' }
}

const orders = computed(() => [...createLockedOrdersMock(), ...buildLockedDemoExtraOrders()])

const order = computed(() => {
  const id = String(route.params.orderId || '')
  return orders.value.find((row) => row.id === id) ?? null
})

function statusPillClass(status) {
  if (status === ORDER_STATUS.LOCKED) return 'bg-sky-400/15 text-sky-200'
  if (status === ORDER_STATUS.COMPLETED) return 'bg-lime-400/12 text-lime-200'
  if (status === ORDER_STATUS.EARLY_REDEEMED) return 'bg-rose-400/12 text-rose-200'
  return 'bg-white/10 text-white/55'
}

function orderStatusLabel(row) {
  return orderStatusMeta[row?.status]?.label ?? row?.status ?? '—'
}

function formatNumber(value, digits = 6) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(digits)
}

function formatAmount(value, currency, digits = 6) {
  const amount = formatNumber(value, digits)
  return amount === '—' ? '—' : `${amount} ${currency}`
}

function orderDailyEarnings(row) {
  if (row?.status === ORDER_STATUS.EARLY_REDEEMED) return 0
  const amount = Number(row?.amount)
  const dailyRate = Number(row?.dailyRate)
  if (!Number.isFinite(amount) || !Number.isFinite(dailyRate)) return 0
  return amount * (dailyRate / 100)
}

function addDays(dateText, offset) {
  const [datePart] = String(dateText || '').split(' ')
  const [year, month, day] = datePart.split('-').map((part) => Number(part))
  if (![year, month, day].every(Number.isFinite)) return '—'
  const d = new Date(Date.UTC(year, month - 1, day + offset))
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

const dailyRows = computed(() => {
  const row = order.value
  if (!row) return []
  const days = Math.max(0, Math.floor(Number(row.lockDays) || 0))
  const daily = orderDailyEarnings(row)
  return Array.from({ length: days }, (_, index) => ({
    day: index + 1,
    date: addDays(row.lockedAt, index),
    daily,
    cumulative: daily * (index + 1)
  }))
})

const visibleDailyRows = computed(() => dailyRows.value.slice(0, visibleDailyLimit.value))

const hasMoreDailyRows = computed(() => visibleDailyRows.value.length < dailyRows.value.length)

function loadMoreDailyRows() {
  visibleDailyLimit.value = Math.min(
    visibleDailyLimit.value + dailyPageSize,
    dailyRows.value.length
  )
}

watch(
  () => route.params.orderId,
  () => {
    visibleDailyLimit.value = dailyPageSize
  }
)

const summaryItems = computed(() => {
  const row = order.value
  if (!row) return []
  return [
    { label: '订单号', value: row.id },
    { label: '产品', value: row.productName },
    { label: '金额', value: `${row.amount} ${row.currency}` },
    { label: '订单状态', value: orderStatusLabel(row) }
  ]
})
</script>

<template>
  <div
    v-if="order"
    class="min-h-[100dvh] bg-[#050505] pb-10 text-white lg:min-h-[calc(100dvh-3.5rem)]"
    aria-label="流动性挖矿订单详情页"
  >
    <header
      class="flex min-h-14 items-center justify-center border-b border-white/[0.06] bg-black px-4 pt-[env(safe-area-inset-top,0px)] lg:hidden"
      aria-label="订单详情移动端标题栏"
    >
      <RouterLink
        :to="ordersReturnLocation"
        class="absolute left-3 inline-flex h-11 w-11 items-center justify-center rounded-full text-white transition hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-lime-300/60"
        aria-label="返回流动性挖矿"
      >
        <span class="text-3xl leading-none" aria-hidden="true">‹</span>
      </RouterLink>
      <h1 class="text-base font-semibold text-white">详情</h1>
    </header>

    <header class="hidden border-b border-white/[0.06] bg-[#050505] lg:block">
      <div class="mx-auto max-w-7xl px-4 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-7 lg:px-10">
        <nav class="text-xs text-white/40 sm:text-sm" aria-label="订单详情路径">
          <RouterLink :to="`${prefix}/finance`" class="transition hover:text-lime-300">金融</RouterLink>
          <span class="mx-1.5 text-white/20 sm:mx-2">/</span>
          <RouterLink :to="ordersReturnLocation" class="transition hover:text-lime-300">流动性挖矿</RouterLink>
          <span class="mx-1.5 text-white/20 sm:mx-2">/</span>
          <span class="text-white/70">订单详情</span>
        </nav>

        <div class="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-2xl font-bold tracking-tight text-white sm:text-3xl">订单详情</h1>
              <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusPillClass(order.status)">
                {{ orderStatusLabel(order) }}
              </span>
            </div>
            <p class="mt-2 text-sm text-white/50">
              {{ order.productName }} · {{ order.id }}
            </p>
          </div>
          <RouterLink
            :to="ordersReturnLocation"
            class="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/85 transition hover:bg-white/10"
          >
            返回列表
          </RouterLink>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-5 sm:px-8 sm:py-8 lg:px-10">
      <section class="rounded-lg border border-white/[0.08] bg-white/[0.025] p-3.5 sm:p-4" aria-label="订单概要">
        <dl class="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <div
            v-for="item in summaryItems"
            :key="item.label"
            class="min-w-0 rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2"
          >
            <dt class="text-xs text-white/35">{{ item.label }}</dt>
            <dd
              class="mt-1 break-words text-xs tabular-nums sm:text-sm"
              :class="item.strong ? 'font-semibold text-lime-200' : 'text-white/82'"
            >
              {{ item.value }}
            </dd>
          </div>
        </dl>
      </section>

      <section class="mt-5 rounded-lg border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5" aria-label="每日收益明细">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-base font-semibold text-lime-200/95">每日收益明细</h2>
          <span class="text-xs text-white/40">共 {{ dailyRows.length }} 天</span>
        </div>
        <div
          class="mt-4 space-y-2 md:hidden"
          aria-label="移动端每日收益明细列表"
        >
          <article
            v-for="row in visibleDailyRows"
            :key="row.day"
            class="rounded-lg border border-white/[0.08] bg-black/20 px-3.5 py-3"
            :aria-label="`${row.date} 收益明细`"
            :data-testid="`daily-earning-card-${row.day}`"
          >
            <dl class="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <dt class="text-xs text-white/35">日期</dt>
              <dd class="text-right tabular-nums text-white/75">{{ row.date }}</dd>
              <dt class="text-xs text-white/35">收益</dt>
              <dd class="text-right font-semibold tabular-nums text-lime-300">
                {{ formatAmount(row.daily, order.currency) }}
              </dd>
              <dt class="text-xs text-white/35">累计收益</dt>
              <dd class="text-right tabular-nums text-white/75">
                {{ formatAmount(row.cumulative, order.currency) }}
              </dd>
            </dl>
          </article>
        </div>
        <div
          class="hidden md:block mt-4 overflow-x-auto rounded-lg border border-white/[0.08]"
          aria-label="桌面端每日收益明细表格"
        >
          <table class="w-full min-w-[420px] border-collapse text-left text-sm text-white/85">
            <thead>
              <tr class="border-b border-white/[0.08] text-xs text-white/40">
                <th scope="col" class="px-3 py-2.5 font-medium">日期</th>
                <th scope="col" class="px-3 py-2.5 text-right font-medium">收益</th>
                <th scope="col" class="px-3 py-2.5 text-right font-medium">累计收益</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in visibleDailyRows"
                :key="row.day"
                class="border-b border-white/[0.06] last:border-b-0"
              >
                <td class="px-3 py-3 tabular-nums text-white/60">{{ row.date }}</td>
                <td class="px-3 py-3 text-right font-semibold tabular-nums text-lime-300">
                  {{ formatAmount(row.daily, order.currency) }}
                </td>
                <td class="px-3 py-3 text-right tabular-nums text-white/75">
                  {{ formatAmount(row.cumulative, order.currency) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="hasMoreDailyRows" class="mt-4 flex justify-center">
          <button
            type="button"
            class="inline-flex min-h-11 min-w-32 items-center justify-center rounded-lg border border-lime-400/35 bg-lime-400/10 px-5 py-2.5 text-sm font-semibold text-lime-200 transition hover:bg-lime-400/15 focus:outline-none focus:ring-2 focus:ring-lime-300/60 focus:ring-offset-2 focus:ring-offset-[#050505]"
            @click="loadMoreDailyRows"
          >
            加载更多
          </button>
        </div>
      </section>
    </main>
  </div>

  <div
    v-else
    class="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 py-24 text-center"
  >
    <p class="text-lg text-white/60">未找到该订单</p>
    <RouterLink
      :to="ordersReturnLocation"
      class="mt-6 inline-flex rounded-lg border border-white/[0.12] bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-lime-300 transition hover:bg-white/[0.08]"
    >
      返回流动性挖矿
    </RouterLink>
  </div>
</template>
