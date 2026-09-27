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
        <a-input v-model:value="search" placeholder="搜索订单、用户或产品" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="statusFilter" class="">
          <a-select-option :value="COMMON_FILTER_ALL">全部状态</a-select-option>
          <a-select-option v-for="(meta, key) in orderStatusMeta" :key="key" :value="key">{{ meta.label }}</a-select-option>
        </a-select>
        <div class="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">当前 {{ filteredOrders.length }} 笔订单</div>
      </div>
    </div>

    <article class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <a-table  size="small" :pagination="false" :data-source="pagedOrders" :row-key="(order) => order.id" :scroll="{ x: 'max-content' }" :custom-row="(order, rowIndex) => ({ class: [&quot;hover:bg-slate-50&quot;] })">
<a-table-column key="column-0" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-6 py-4 font-mono text-xs text-slate-500&quot;] })">
<template #title>订单</template>
<template #default="{ record: order, index: rowIndex }">{{ order.id }}</template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-6 py-4 text-sm text-slate-700&quot;] })">
<template #title>用户</template>
<template #default="{ record: order, index: rowIndex }">
              <div>{{ order.userName }}</div>
              <div class="text-xs text-slate-400">{{ order.userId }}</div>
            </template>
</a-table-column>
<a-table-column key="column-2" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-6 py-4&quot;] })">
<template #title>产品</template>
<template #default="{ record: order, index: rowIndex }">
              <div class="text-sm font-medium text-slate-900">{{ order.productName }}</div>
              <div class="mt-1 flex flex-wrap gap-1">
                <span v-for="asset in order.assets" :key="asset.symbol" class="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                  {{ asset.symbol }}
                </span>
              </div>
            </template>
</a-table-column>
<a-table-column key="column-3" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-6 py-4 text-sm text-slate-600&quot;] })">
<template #title>金额收益</template>
<template #default="{ record: order, index: rowIndex }">
              <div>本金 {{ formatPortfolioAmount(order.principal, order.quoteCurrency) }}</div>
              <div class="text-emerald-600">预估 {{ formatPortfolioAmount(order.minYield) }} - {{ formatPortfolioAmount(order.maxYield) }}</div>
              <div>手续费 {{ formatPortfolioAmount(order.fee) }}</div>
            </template>
</a-table-column>
<a-table-column key="column-4" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-6 py-4 text-sm text-slate-600&quot;] })">
<template #title>时间</template>
<template #default="{ record: order, index: rowIndex }">
              <div>开始 {{ order.startedAt }}</div>
              <div>到期 {{ order.maturityAt }}</div>
              <div v-if="order.redeemedAt">赎回 {{ order.redeemedAt }}</div>
            </template>
</a-table-column>
<a-table-column key="column-5" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-6 py-4&quot;] })">
<template #title>状态</template>
<template #default="{ record: order, index: rowIndex }">
              <span class="rounded-full px-2 py-1 text-xs" :class="statusClass(order.status)">
                {{ orderStatusMeta[order.status]?.label }}
              </span>
            </template>
</a-table-column>
</a-table>
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
