<script setup>
// 收益调整日志 — Ant Design Pro list page (2026-11-28): one query input per field, table card with pagination,
// adjustment type as a text Tag. The header shortcut to 收益调控 was removed (the page stays in the side menu).
import { ref, computed } from 'vue'
import { Space, Tag, TypographyText } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import { SUPPORTED_CURRENCIES } from '../../../admin/constants/liquidityLocked'
import { lockedYieldAdjustmentLogs } from '../../../admin/state/lockedYieldAdjustmentLogs'

const page = ref(1)
const blank = () => ({ actionType: 'all', product: '', currency: 'all', reason: '', operator: '', logId: '', createdAt: null })
const filters = ref(blank())
const fields = [
  { key: 'actionType', label: '类型', options: [{ value: 'all', label: '全部类型' }, { value: 'adjust', label: '调整' }, { value: 'reset', label: '重置' }] },
  { key: 'product', label: '产品名称' },
  { key: 'currency', label: '币种', searchable: true, options: [{ value: 'all', label: '全部币种' }, ...SUPPORTED_CURRENCIES.map((value) => ({ value, label: value }))] },
  { key: 'reason', label: '原因' },
  { key: 'operator', label: '操作人' },
  { key: 'logId', label: '日志 ID' },
  { key: 'createdAt', label: '操作日期', range: true }
]

const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
const filteredLogs = computed(() => {
  const f = filters.value
  return lockedYieldAdjustmentLogs.value.filter((row) => {
    const day = String(row.createdAt || '').slice(0, 10)
    return (f.actionType === 'all' || row.actionType === f.actionType) &&
      (f.currency === 'all' || row.currency === f.currency) &&
      has(row.productName, f.product) && has(row.reason, f.reason) &&
      has(row.operator, f.operator) && has(row.id, f.logId) &&
      (!f.createdAt || (day >= f.createdAt[0] && day <= f.createdAt[1]))
  })
})

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }

const columns = [
  { key: 'id', title: '日志 ID', width: 150 },
  { key: 'actionType', title: '类型', width: 80 },
  { key: 'product', title: '产品', width: 180 },
  { key: 'rate', title: '调整比例', width: 130, align: 'right' },
  { key: 'multiplier', title: '倍数', width: 130, align: 'right' },
  { key: 'durationLabel', title: '生效策略', width: 130 },
  { key: 'reason', title: '原因', width: 240 },
  { key: 'operator', title: '操作人', width: 100 },
  { key: 'createdAt', title: '时间', width: 170 }
]

function formatRate(rate) {
  const r = Number(rate)
  if (r > 0) return `+${r}%`
  if (r < 0) return `${r}%`
  return '0%'
}

function rateType(rate) {
  const r = Number(rate)
  if (r > 0) return 'success'
  if (r < 0) return 'danger'
  return undefined
}

function fmtMult(m) {
  const x = Number(m)
  if (Number.isNaN(x)) return '—'
  return `${x.toFixed(2)}×`
}
</script>

<template>
  <PageShell>
    <SearchForm name="liquidity-locked-yield-log-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <AdminTable title="收益调整日志" v-model:page="page" :rows="filteredLogs" :columns="columns" row-key="id" desktop-only>
      <template #cell="{ column, record: row }">
        <TypographyText v-if="column.key === 'id'" class="font-mono">{{ row.id }}</TypographyText>
        <Tag v-else-if="column.key === 'actionType'" :color="row.actionType === 'reset' ? 'default' : 'blue'">{{ row.actionType === 'reset' ? '重置' : '调整' }}</Tag>
        <Space v-else-if="column.key === 'product'" direction="vertical" :size="0">
          <TypographyText strong>{{ row.productName }}</TypographyText>
          <TypographyText type="secondary">{{ row.currency }}</TypographyText>
        </Space>
        <span v-else-if="column.key === 'rate'">
          <TypographyText type="secondary">{{ formatRate(row.beforeRate) }} → </TypographyText>
          <TypographyText :type="rateType(row.afterRate)" strong>{{ formatRate(row.afterRate) }}</TypographyText>
        </span>
        <span v-else-if="column.key === 'multiplier'">{{ fmtMult(row.beforeMultiplier) }} → {{ fmtMult(row.afterMultiplier) }}</span>
        <template v-else-if="column.key === 'durationLabel'">{{ row.durationLabel || '—' }}</template>
        <template v-else>{{ row[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>
  </PageShell>
</template>
