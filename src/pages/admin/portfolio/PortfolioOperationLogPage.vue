<script setup>
import AdminListPaginationBar from '../../../admin/components/AdminListPaginationBar.vue'
import { useAdminListPagination } from '../../../admin/composables/useAdminListPagination'
import { portfolioOperationLogs } from '../../../admin/state/portfolioOperationLogs'

const {
  currentPage,
  pageSize,
  totalPages,
  pagedRows: pagedLogs,
  onPageSizeChange
} = useAdminListPagination(portfolioOperationLogs)
</script>

<template>
  <section class="space-y-5">
    <header>
      <h1 class="text-3xl font-semibold text-slate-900">投资组合操作日志</h1>
      <p class="mt-1 text-sm text-slate-500">审计产品配置、上下架、收益与赎回规则调整</p>
    </header>

    <article class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <a-table  size="small" :pagination="false" :data-source="pagedLogs" :row-key="(log) => log.id" :scroll="{ x: 'max-content' }" :custom-row="(log, rowIndex) => ({ class: [&quot;hover:bg-slate-50&quot;] })">
<a-table-column key="column-0" :custom-cell="(log, rowIndex) => ({ class: [&quot;px-6 py-4 text-sm text-slate-600&quot;] })">
<template #title>时间</template>
<template #default="{ record: log, index: rowIndex }">{{ log.createdAt }}</template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(log, rowIndex) => ({ class: [&quot;px-6 py-4 text-sm text-slate-900&quot;] })">
<template #title>操作人</template>
<template #default="{ record: log, index: rowIndex }">{{ log.operator }}</template>
</a-table-column>
<a-table-column key="column-2" :custom-cell="(log, rowIndex) => ({ class: [&quot;px-6 py-4 text-sm text-blue-600&quot;] })">
<template #title>动作</template>
<template #default="{ record: log, index: rowIndex }">{{ log.action }}</template>
</a-table-column>
<a-table-column key="column-3" :custom-cell="(log, rowIndex) => ({ class: [&quot;px-6 py-4 text-sm text-slate-700&quot;] })">
<template #title>对象</template>
<template #default="{ record: log, index: rowIndex }">{{ log.target }}</template>
</a-table-column>
<a-table-column key="column-4" :custom-cell="(log, rowIndex) => ({ class: [&quot;px-6 py-4 text-sm text-slate-600&quot;] })">
<template #title>摘要</template>
<template #default="{ record: log, index: rowIndex }">{{ log.summary }}</template>
</a-table-column>
</a-table>
      <AdminListPaginationBar
        :current-page="currentPage"
        :total-pages="totalPages"
        :total-count="portfolioOperationLogs.length"
        :page-size="pageSize"
        @update:current-page="currentPage = $event"
        @update:page-size="onPageSizeChange"
      />
    </article>
  </section>
</template>
