<script setup>
import AdminListPaginationBar from '../../../admin/components/AdminListPaginationBar.vue'
import { useAdminListPagination } from '../../../admin/composables/useAdminListPagination'
import { portfolioYieldRecords } from '../../../admin/state/portfolioOrders'
import { formatPortfolioAmount } from '../../../admin/constants/portfolio'

const {
  currentPage,
  pageSize,
  totalPages,
  pagedRows: pagedRecords,
  onPageSizeChange
} = useAdminListPagination(portfolioYieldRecords)
</script>

<template>
  <section class="space-y-5">
    <header>
      <h1 class="text-3xl font-semibold text-slate-900">投资组合收益记录</h1>
      <p class="mt-1 text-sm text-slate-500">展示每日收益、订单收益和模拟入账记录</p>
    </header>

    <article class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <a-table  size="small" :pagination="false" :data-source="pagedRecords" :row-key="(record) => record.id" :scroll="{ x: 'max-content' }" :custom-row="(record, rowIndex) => ({ class: [&quot;hover:bg-slate-50&quot;] })">
<a-table-column key="column-0" :custom-cell="(record, rowIndex) => ({ class: [&quot;px-6 py-4 font-mono text-xs text-slate-500&quot;] })">
<template #title>记录 ID</template>
<template #default="{ record: record, index: rowIndex }">{{ record.id }}</template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(record, rowIndex) => ({ class: [&quot;px-6 py-4 font-mono text-xs text-slate-500&quot;] })">
<template #title>订单</template>
<template #default="{ record: record, index: rowIndex }">{{ record.orderId }}</template>
</a-table-column>
<a-table-column key="column-2" :custom-cell="(record, rowIndex) => ({ class: [&quot;px-6 py-4 text-sm text-slate-900&quot;] })">
<template #title>产品</template>
<template #default="{ record: record, index: rowIndex }">{{ record.productName }}</template>
</a-table-column>
<a-table-column key="column-3" :custom-cell="(record, rowIndex) => ({ class: [&quot;px-6 py-4 text-sm text-slate-600&quot;] })">
<template #title>用户</template>
<template #default="{ record: record, index: rowIndex }">{{ record.userName }}</template>
</a-table-column>
<a-table-column key="column-4" :custom-cell="(record, rowIndex) => ({ class: [&quot;px-6 py-4 text-sm&quot;] })">
<template #title>收益</template>
<template #default="{ record: record, index: rowIndex }">
              <div class="font-medium text-emerald-600">{{ formatPortfolioAmount(record.yieldAmount) }}</div>
              <div class="text-xs text-slate-500">日收益率 {{ record.dailyRatePct }}%</div>
            </template>
</a-table-column>
<a-table-column key="column-5" :custom-cell="(record, rowIndex) => ({ class: [&quot;px-6 py-4 text-sm text-slate-600&quot;] })">
<template #title>日期</template>
<template #default="{ record: record, index: rowIndex }">{{ record.recordDate }}</template>
</a-table-column>
<a-table-column key="column-6" :custom-cell="(record, rowIndex) => ({ class: [&quot;px-6 py-4&quot;] })">
<template #title>状态</template>
<template #default="{ record: record, index: rowIndex }"><span class="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">{{ record.status }}</span></template>
</a-table-column>
</a-table>
      <AdminListPaginationBar
        :current-page="currentPage"
        :total-pages="totalPages"
        :total-count="portfolioYieldRecords.length"
        :page-size="pageSize"
        @update:current-page="currentPage = $event"
        @update:page-size="onPageSizeChange"
      />
    </article>
  </section>
</template>
