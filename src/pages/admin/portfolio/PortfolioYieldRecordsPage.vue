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
      <table class="w-full">
        <thead class="border-b border-slate-200 bg-slate-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">记录 ID</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">订单</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">产品</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">用户</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">收益</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">日期</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">状态</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          <tr v-for="record in pagedRecords" :key="record.id" class="hover:bg-slate-50">
            <td class="px-6 py-4 font-mono text-xs text-slate-500">{{ record.id }}</td>
            <td class="px-6 py-4 font-mono text-xs text-slate-500">{{ record.orderId }}</td>
            <td class="px-6 py-4 text-sm text-slate-900">{{ record.productName }}</td>
            <td class="px-6 py-4 text-sm text-slate-600">{{ record.userName }}</td>
            <td class="px-6 py-4 text-sm">
              <div class="font-medium text-emerald-600">{{ formatPortfolioAmount(record.yieldAmount) }}</div>
              <div class="text-xs text-slate-500">日收益率 {{ record.dailyRatePct }}%</div>
            </td>
            <td class="px-6 py-4 text-sm text-slate-600">{{ record.recordDate }}</td>
            <td class="px-6 py-4"><span class="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">{{ record.status }}</span></td>
          </tr>
        </tbody>
      </table>
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
