<script setup>
import { computed, ref } from 'vue'
import AdminListPaginationBar from '../../../admin/components/AdminListPaginationBar.vue'
import { useAdminListPagination } from '../../../admin/composables/useAdminListPagination'
import { portfolioOrders } from '../../../admin/state/portfolioOrders'
import { COMMON_FILTER_ALL, ORDER_STATUS, formatPortfolioAmount, orderStatusMeta } from '../../../admin/constants/portfolio'

const statusFilter = ref(COMMON_FILTER_ALL)
const search = ref('')

const filteredOrders = computed(() => {
  const kw = search.value.trim().toLowerCase()
  return portfolioOrders.value.filter((order) => {
    const matchesSearch =
      !kw ||
      order.id.toLowerCase().includes(kw) ||
      order.userName.toLowerCase().includes(kw) ||
      order.productName.toLowerCase().includes(kw)
    const matchesStatus = statusFilter.value === COMMON_FILTER_ALL || order.status === statusFilter.value
    return matchesSearch && matchesStatus
  })
})

const {
  currentPage,
  pageSize,
  totalPages,
  pagedRows: pagedOrders,
  onPageSizeChange
} = useAdminListPagination(filteredOrders, { resetSources: [search, statusFilter] })

function statusClass(status) {
  return orderStatusMeta[status]?.class ?? 'bg-slate-100 text-slate-600'
}
</script>

<template>
  <section class="space-y-5">
    <header>
      <h1 class="text-3xl font-semibold text-slate-900">投资组合订单管理</h1>
      <p class="mt-1 text-sm text-slate-500">查看用户认购、运行、到期与提前赎回状态</p>
    </header>

    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="grid gap-4 md:grid-cols-3">
        <input v-model="search" placeholder="搜索订单、用户或产品" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select v-model="statusFilter" class="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option :value="COMMON_FILTER_ALL">全部状态</option>
          <option v-for="(meta, key) in orderStatusMeta" :key="key" :value="key">{{ meta.label }}</option>
        </select>
        <div class="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">当前 {{ filteredOrders.length }} 笔订单</div>
      </div>
    </div>

    <article class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table class="w-full">
        <thead class="border-b border-slate-200 bg-slate-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">订单</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">用户</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">产品</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">金额收益</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">时间</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">状态</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          <tr v-for="order in pagedOrders" :key="order.id" class="hover:bg-slate-50">
            <td class="px-6 py-4 font-mono text-xs text-slate-500">{{ order.id }}</td>
            <td class="px-6 py-4 text-sm text-slate-700">
              <div>{{ order.userName }}</div>
              <div class="text-xs text-slate-400">{{ order.userId }}</div>
            </td>
            <td class="px-6 py-4">
              <div class="text-sm font-medium text-slate-900">{{ order.productName }}</div>
              <div class="mt-1 flex flex-wrap gap-1">
                <span v-for="asset in order.assets" :key="asset.symbol" class="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                  {{ asset.symbol }}
                </span>
              </div>
            </td>
            <td class="px-6 py-4 text-sm text-slate-600">
              <div>本金 {{ formatPortfolioAmount(order.principal, order.quoteCurrency) }}</div>
              <div class="text-emerald-600">预估 {{ formatPortfolioAmount(order.minYield) }} - {{ formatPortfolioAmount(order.maxYield) }}</div>
              <div>手续费 {{ formatPortfolioAmount(order.fee) }}</div>
            </td>
            <td class="px-6 py-4 text-sm text-slate-600">
              <div>开始 {{ order.startedAt }}</div>
              <div>到期 {{ order.maturityAt }}</div>
              <div v-if="order.redeemedAt">赎回 {{ order.redeemedAt }}</div>
            </td>
            <td class="px-6 py-4">
              <span class="rounded-full px-2 py-1 text-xs" :class="statusClass(order.status)">
                {{ orderStatusMeta[order.status]?.label }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <AdminListPaginationBar
        :current-page="currentPage"
        :total-pages="totalPages"
        :total-count="filteredOrders.length"
        :page-size="pageSize"
        @update:current-page="currentPage = $event"
        @update:page-size="onPageSizeChange"
      />
    </article>
  </section>
</template>
