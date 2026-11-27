<script setup>
// 投资组合操作日志 — Ant Design Pro list page (2026-11-28): query card + table card with pagination.
import { computed, ref } from 'vue'
import { Tag, TypographyText } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import { portfolioOperationLogs } from '../../../admin/state/portfolioOperationLogs'

const page = ref(1)
const blank = () => ({ target: '', operator: '', action: 'all', createdAt: null })
const filters = ref(blank())
const actionOptions = computed(() => [...new Set(portfolioOperationLogs.value.map((log) => log.action))].map((value) => ({ value, label: value })))
const fields = computed(() => [
  { key: 'target', label: '对象' },
  { key: 'operator', label: '操作人' },
  { key: 'action', label: '动作', options: [{ value: 'all', label: '全部动作' }, ...actionOptions.value] },
  { key: 'createdAt', label: '操作日期', range: true }
])

// Seed logs use 'YYYY-MM-DD HH:mm:ss' while new logs use the zh-CN locale string ('YYYY/M/D HH:mm:ss'); normalise both.
const dayOf = (value) => {
  const match = String(value || '').match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/)
  return match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : ''
}
const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())

const rows = computed(() => portfolioOperationLogs.value.filter((log) => {
  const f = filters.value
  const day = dayOf(log.createdAt)
  return has(log.target, f.target) && has(log.operator, f.operator) &&
    (f.action === 'all' || log.action === f.action) &&
    (!f.createdAt || (day >= f.createdAt[0] && day <= f.createdAt[1]))
}))

const columns = [
  { key: 'createdAt', title: '时间', width: 180 },
  { key: 'operator', title: '操作人', width: 140 },
  { key: 'action', title: '动作', width: 140 },
  { key: 'target', title: '对象', width: 240 },
  { key: 'summary', title: '操作描述', width: 360 }
]

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }
</script>

<template>
  <PageShell>
    <SearchForm name="portfolio-operation-log-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <AdminTable title="投资组合操作日志" v-model:page="page" :rows="rows" :columns="columns" row-key="id" desktop-only>
      <template #cell="{ column, record }">
        <Tag v-if="column.key === 'action'">{{ record.action }}</Tag>
        <TypographyText v-else-if="column.key === 'createdAt'" type="secondary">{{ record.createdAt }}</TypographyText>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>
  </PageShell>
</template>
