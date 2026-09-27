<template>
  <section class="space-y-4">
    <header>
      <h1 class="text-3xl font-semibold text-slate-900">操作日志</h1>
      <p class="mt-1 text-sm text-slate-500">
        记录锁仓产品与收益调控等关键操作，便于审计与追溯（演示数据可随页面操作追加）。
      </p>
    </header>

    <article class="rounded-xl border border-slate-200 bg-white">
      <div class="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
        <a-select :get-popup-container="(trigger) => trigger.parentElement"
          v-model:value="moduleFilter"
          class="min-w-[10rem]"
        >
          <a-select-option value="">全部模块</a-select-option>
          <a-select-option v-for="(label, key) in LIQUIDITY_LOCKED_OP_MODULE_LABEL" :key="key" :value="key">{{ label }}</a-select-option>
        </a-select>
        <a-input
          v-model:value="search"
          type="search"
          class="min-w-[12rem] flex-1 max-w-md rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
          placeholder="摘要、关联编号、对象、操作人…"
          autocomplete="off"
        />
      </div>

      <div v-if="filteredRows.length" class="overflow-x-auto">
        <a-table  size="small" :pagination="false" :data-source="pagedRows" :row-key="(row) => row.id" :scroll="{ x: 'max-content' }" :custom-row="(row, rowIndex) => ({ class: [&quot;border-t border-slate-100&quot;] })">
<a-table-column key="column-0" :custom-cell="(row, rowIndex) => ({ class: [&quot;whitespace-nowrap px-4 py-3 text-slate-600&quot;] })">
<template #title>时间</template>
<template #default="{ record: row, index: rowIndex }">{{ row.createdAt }}</template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(row, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>模块</template>
<template #default="{ record: row, index: rowIndex }">
                <span class="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {{ LIQUIDITY_LOCKED_OP_MODULE_LABEL[row.module] || row.module }}
                </span>
              </template>
</a-table-column>
<a-table-column key="column-2" :custom-cell="(row, rowIndex) => ({ class: [&quot;px-4 py-3 text-slate-800&quot;] })">
<template #title>操作</template>
<template #default="{ record: row, index: rowIndex }">{{ LIQUIDITY_LOCKED_OP_ACTION_LABEL[row.action] || row.action }}</template>
</a-table-column>
<a-table-column key="column-3" :custom-cell="(row, rowIndex) => ({ class: [&quot;px-4 py-3 text-slate-700&quot;] })">
<template #title>对象</template>
<template #default="{ record: row, index: rowIndex }">{{ row.targetLabel }}</template>
</a-table-column>
<a-table-column key="column-4" :custom-cell="(row, rowIndex) => ({ class: [&quot;px-4 py-3 font-mono text-xs text-slate-600&quot;] })">
<template #title>关联编号</template>
<template #default="{ record: row, index: rowIndex }">{{ row.refId || '—' }}</template>
</a-table-column>
<a-table-column key="column-5" :custom-cell="(row, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>摘要</template>
<template #default="{ record: row, index: rowIndex }">
                <div class="max-w-md text-slate-700" :title="row.summary">{{ row.summary }}</div>
              </template>
</a-table-column>
<a-table-column key="column-6" :custom-cell="(row, rowIndex) => ({ class: [&quot;px-4 py-3 text-slate-600&quot;] })">
<template #title>操作人</template>
<template #default="{ record: row, index: rowIndex }">{{ row.operator }}</template>
</a-table-column>
</a-table>
      </div>
      <div v-else class="px-4 py-12 text-center text-sm text-slate-500">暂无日志</div>

      <AdminListPaginationBar
        :current-page="listPage"
        :total-pages="totalPages"
        :total-count="filteredRows.length"
        :page-size="pageSize"
        @update:current-page="listPage = $event"
        @update:page-size="onPageSizeChange"
      />
    </article>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  LIQUIDITY_LOCKED_OP_MODULE_LABEL,
  LIQUIDITY_LOCKED_OP_ACTION_LABEL
} from '../../../admin/constants/liquidityLockedOperationLog'
import { liquidityLockedOperationLogs } from '../../../admin/state/liquidityLockedOperationLogs'
import AdminListPaginationBar from '../../../admin/components/AdminListPaginationBar.vue'

const search = ref('')
const moduleFilter = ref('')
const listPage = ref(1)
const pageSize = ref(10)

const filteredRows = computed(() => {
  const kw = search.value.trim().toLowerCase()
  return liquidityLockedOperationLogs.value.filter((row) => {
    const modOk = !moduleFilter.value || row.module === moduleFilter.value
    const blob =
      `${row.summary} ${row.refId ?? ''} ${row.targetLabel} ${row.operator} ${row.action} ${row.id}`.toLowerCase()
    const kwOk = !kw || blob.includes(kw)
    return modOk && kwOk
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value)))

const pagedRows = computed(() => {
  const list = filteredRows.value
  const page = Math.min(listPage.value, totalPages.value)
  const start = (page - 1) * pageSize.value
  return list.slice(start, start + pageSize.value)
})

watch([search, moduleFilter], () => {
  listPage.value = 1
})

watch([() => filteredRows.value.length, pageSize], () => {
  const tp = Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value))
  if (listPage.value > tp) listPage.value = tp
})

function onPageSizeChange(n) {
  pageSize.value = n
  listPage.value = 1
}
</script>
