<script setup>
// 锁仓操作日志 — Ant Design Pro list page (2026-11-28): one query input per field (no combined keyword box),
// table card with 10-row pagination, module/action as text Tags.
import { ref, computed } from 'vue'
import { Tag, TypographyText } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import {
  LIQUIDITY_LOCKED_OP_MODULE_LABEL,
  LIQUIDITY_LOCKED_OP_ACTION_LABEL
} from '../../../admin/constants/liquidityLockedOperationLog'
import { liquidityLockedOperationLogs } from '../../../admin/state/liquidityLockedOperationLogs'

const page = ref(1)
const blank = () => ({ module: 'all', action: 'all', refId: '', target: '', operator: '', summary: '', createdAt: null })
const filters = ref(blank())
const fields = [
  { key: 'module', label: '模块', options: [{ value: 'all', label: '全部模块' }, ...Object.entries(LIQUIDITY_LOCKED_OP_MODULE_LABEL).map(([value, label]) => ({ value, label }))] },
  { key: 'action', label: '操作', options: [{ value: 'all', label: '全部操作' }, ...Object.entries(LIQUIDITY_LOCKED_OP_ACTION_LABEL).map(([value, label]) => ({ value, label }))] },
  { key: 'refId', label: '关联编号' },
  { key: 'target', label: '对象' },
  { key: 'operator', label: '操作人' },
  { key: 'summary', label: '摘要' },
  { key: 'createdAt', label: '操作日期', range: true }
]

const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
const filteredRows = computed(() => {
  const f = filters.value
  return liquidityLockedOperationLogs.value.filter((row) => {
    const day = String(row.createdAt || '').slice(0, 10)
    return (f.module === 'all' || row.module === f.module) &&
      (f.action === 'all' || row.action === f.action) &&
      has(row.refId, f.refId) && has(row.targetLabel, f.target) &&
      has(row.operator, f.operator) && has(row.summary, f.summary) &&
      (!f.createdAt || (day >= f.createdAt[0] && day <= f.createdAt[1]))
  })
})

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }

const columns = [
  { key: 'createdAt', title: '时间', width: 170 },
  { key: 'module', title: '模块', width: 110 },
  { key: 'action', title: '操作', width: 160 },
  { key: 'targetLabel', title: '对象', width: 160 },
  { key: 'refId', title: '关联编号', width: 140 },
  { key: 'summary', title: '摘要', width: 320 },
  { key: 'operator', title: '操作人', width: 100 }
]
</script>

<template>
  <PageShell>
    <SearchForm name="liquidity-locked-operation-log-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <AdminTable title="操作日志" v-model:page="page" :rows="filteredRows" :columns="columns" row-key="id" desktop-only>
      <template #cell="{ column, record: row }">
        <Tag v-if="column.key === 'module'">{{ LIQUIDITY_LOCKED_OP_MODULE_LABEL[row.module] || row.module }}</Tag>
        <template v-else-if="column.key === 'action'">{{ LIQUIDITY_LOCKED_OP_ACTION_LABEL[row.action] || row.action }}</template>
        <TypographyText v-else-if="column.key === 'refId'" class="font-mono">{{ row.refId || '—' }}</TypographyText>
        <template v-else>{{ row[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>
  </PageShell>
</template>
