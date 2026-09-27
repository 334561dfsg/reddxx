<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">收益调整日志</h1>
        <p class="mt-1 text-sm text-slate-500">查询投资组合收益调控记录；发起调整请在「收益调控」中操作。</p>
      </div>
      <RouterLink
        :to="{ name: 'portfolio-yield-control' }"
        class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
      >
        去收益调控
      </RouterLink>
    </header>

    <article class="rounded-xl border border-slate-200 bg-white">
      <div class="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
        <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="actionFilter" class="">
          <a-select-option value="">全部类型</a-select-option>
          <a-select-option value="adjust">调整</a-select-option>
          <a-select-option value="reset">重置</a-select-option>
        </a-select>
        <a-input
          v-model:value="search"
          type="search"
          class="min-w-[12rem] max-w-md flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
          placeholder="产品、币种、原因、操作人…"
        />
      </div>

      <div v-if="filteredLogs.length" class="overflow-x-auto">
        <a-table  size="small" :pagination="false" :data-source="pagedLogs" :row-key="(row) => row.id" :scroll="{ x: 'max-content' }" :custom-row="(row, rowIndex) => ({ class: [&quot;border-t border-slate-100 hover:bg-slate-50&quot;] })">
<a-table-column key="column-0" :custom-cell="(row, rowIndex) => ({ class: [&quot;px-4 py-3 font-mono text-xs text-slate-600&quot;] })">
<template #title>日志ID</template>
<template #default="{ record: row, index: rowIndex }">{{ row.id }}</template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(row, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>类型</template>
<template #default="{ record: row, index: rowIndex }">
                <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="row.actionType === 'reset' ? 'bg-slate-100 text-slate-700' : 'bg-blue-50 text-blue-700'">
                  {{ row.actionType === 'reset' ? '重置' : '调整' }}
                </span>
              </template>
</a-table-column>
<a-table-column key="column-2" :custom-cell="(row, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>产品</template>
<template #default="{ record: row, index: rowIndex }">
                <div class="font-medium text-slate-900">{{ row.assetsLabel }}</div>
                <div class="text-xs text-slate-500">{{ row.productId }}</div>
              </template>
</a-table-column>
<a-table-column key="column-3" :custom-cell="(row, rowIndex) => ({ class: [&quot;px-4 py-3 tabular-nums&quot;] })">
<template #title>调整比例</template>
<template #default="{ record: row, index: rowIndex }">
                <span class="text-slate-600">{{ formatPortfolioAdjustmentRate(row.beforeRate) }}</span>
                <span class="mx-1 text-slate-300">→</span>
                <span :class="rateClass(row.afterRate)">{{ formatPortfolioAdjustmentRate(row.afterRate) }}</span>
              </template>
</a-table-column>
<a-table-column key="column-4" :custom-cell="(row, rowIndex) => ({ class: [&quot;px-4 py-3 tabular-nums text-slate-700&quot;] })">
<template #title>倍数</template>
<template #default="{ record: row, index: rowIndex }">
                {{ fmtMult(row.beforeMultiplier) }}
                <span class="mx-1 text-slate-300">→</span>
                {{ fmtMult(row.afterMultiplier) }}
              </template>
</a-table-column>
<a-table-column key="column-5" :custom-cell="(row, rowIndex) => ({ class: [&quot;px-4 py-3 text-slate-600&quot;] })">
<template #title>收益区间</template>
<template #default="{ record: row, index: rowIndex }">
                <div>{{ row.beforeRange }}</div>
                <div class="text-emerald-600">→ {{ row.afterRange }}</div>
              </template>
</a-table-column>
<a-table-column key="column-6" :custom-cell="(row, rowIndex) => ({ class: [&quot;px-4 py-3 text-slate-600&quot;] })">
<template #title>生效策略</template>
<template #default="{ record: row, index: rowIndex }">{{ row.durationLabel || '—' }}</template>
</a-table-column>
<a-table-column key="column-7" :custom-cell="(row, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>原因</template>
<template #default="{ record: row, index: rowIndex }">
                <div class="max-w-[14rem] truncate text-slate-700" :title="row.reason">{{ row.reason }}</div>
              </template>
</a-table-column>
<a-table-column key="column-8" :custom-cell="(row, rowIndex) => ({ class: [&quot;px-4 py-3 text-slate-700&quot;] })">
<template #title>操作人</template>
<template #default="{ record: row, index: rowIndex }">{{ row.operator }}</template>
</a-table-column>
<a-table-column key="column-9" :custom-cell="(row, rowIndex) => ({ class: [&quot;whitespace-nowrap px-4 py-3 text-slate-600&quot;] })">
<template #title>时间</template>
<template #default="{ record: row, index: rowIndex }">{{ row.createdAt }}</template>
</a-table-column>
</a-table>
      </div>
      <div v-else class="px-4 py-12 text-center text-sm text-slate-500">暂无日志</div>

      <AdminListPaginationBar
        :current-page="listPage"
        :total-pages="totalPages"
        :total-count="filteredLogs.length"
        :page-size="pageSize"
        @update:current-page="listPage = $event"
        @update:page-size="onPageSizeChange"
      />
    </article>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import AdminListPaginationBar from '../../../admin/components/AdminListPaginationBar.vue'
import { formatPortfolioAdjustmentRate } from '../../../admin/constants/portfolio'
import { portfolioYieldAdjustmentLogs } from '../../../admin/state/portfolioYieldAdjustmentLogs'

const search = ref('')
const actionFilter = ref('')
const listPage = ref(1)
const pageSize = ref(10)

const filteredLogs = computed(() => {
  const kw = search.value.trim().toLowerCase()
  return portfolioYieldAdjustmentLogs.value.filter((row) => {
    const typeOk = !actionFilter.value || row.actionType === actionFilter.value
    const text = `${row.id} ${row.productId} ${row.productName} ${row.assetsLabel} ${row.reason} ${row.operator}`.toLowerCase()
    const kwOk = !kw || text.includes(kw)
    return typeOk && kwOk
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredLogs.value.length / pageSize.value)))
const pagedLogs = computed(() => {
  const page = Math.min(listPage.value, totalPages.value)
  const start = (page - 1) * pageSize.value
  return filteredLogs.value.slice(start, start + pageSize.value)
})

watch([search, actionFilter], () => {
  listPage.value = 1
})

watch([() => filteredLogs.value.length, pageSize], () => {
  if (listPage.value > totalPages.value) listPage.value = totalPages.value
})

function onPageSizeChange(n) {
  pageSize.value = n
  listPage.value = 1
}

function rateClass(rate) {
  const n = Number(rate)
  if (n > 0) return 'font-medium text-emerald-600'
  if (n < 0) return 'font-medium text-rose-600'
  return 'font-medium text-slate-600'
}

function fmtMult(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${n.toFixed(2)}×`
}
</script>
