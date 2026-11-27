<script setup>
// 合约线控日志 — Ant Design Pro list page (2026-11-28): query card with one input per field, table card with
// pagination, result as a text Tag. Contract/action options now come from the log data, so XRPUSDT/ADAUSDT and
// 启用规则 (present in the mock but missing from the old hard-coded selects) are filterable.
import { computed, ref, onMounted } from 'vue'
import { Tag } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import { createPerpetualControlLogsMock } from '../../../admin/mock/perpetualControl'

const logs = ref([])
const page = ref(1)

onMounted(() => {
  logs.value = createPerpetualControlLogsMock()
})

const blank = () => ({ logId: '', contract: 'all', action: 'all', result: 'all', rule: '', operator: '', detail: '', time: null })
const filters = ref(blank())
const optionsOf = (key, allLabel) => [{ value: 'all', label: allLabel }, ...[...new Set(logs.value.map((log) => log[key]))].sort().map((value) => ({ value, label: value }))]
const fields = computed(() => [
  { key: 'logId', label: '日志 ID' },
  { key: 'contract', label: '合约', searchable: true, options: optionsOf('contract', '全部合约') },
  { key: 'action', label: '动作', options: optionsOf('action', '全部动作') },
  { key: 'result', label: '结果', options: [{ value: 'all', label: '全部结果' }, { value: 'success', label: '成功' }, { value: 'failed', label: '失败' }] },
  { key: 'rule', label: '规则/对象' },
  { key: 'operator', label: '操作人' },
  { key: 'detail', label: '详情' },
  { key: 'time', label: '时间', range: true }
])

const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())

const rows = computed(() => logs.value.filter((log) => {
  const f = filters.value
  const day = String(log.time).slice(0, 10)
  return has(log.id, f.logId) && has(log.rule, f.rule) && has(log.operator, f.operator) && has(log.detail, f.detail) &&
    (f.contract === 'all' || log.contract === f.contract) &&
    (f.action === 'all' || log.action === f.action) &&
    (f.result === 'all' || log.result === f.result) &&
    (!f.time || (day >= f.time[0] && day <= f.time[1]))
}))

const columns = [
  { key: 'time', title: '时间', width: 180 },
  { key: 'id', title: '日志 ID', width: 120 },
  { key: 'contract', title: '合约', width: 120 },
  { key: 'action', title: '动作', width: 110 },
  { key: 'rule', title: '规则/对象', width: 170 },
  { key: 'operator', title: '操作人', width: 130 },
  { key: 'result', title: '结果', width: 90 },
  { key: 'detail', title: '详情', width: 280 }
]

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }
</script>

<template>
  <PageShell>
    <SearchForm name="perpetual-control-log-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <AdminTable title="合约线控日志" v-model:page="page" :rows="rows" :columns="columns" row-key="id" desktop-only>
      <template #cell="{ column, record }">
        <span v-if="column.key === 'id'" class="font-mono">{{ record.id }}</span>
        <Tag v-else-if="column.key === 'result'" :color="record.result === 'success' ? 'green' : 'red'">{{ record.result === 'success' ? '成功' : '失败' }}</Tag>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>
  </PageShell>
</template>
