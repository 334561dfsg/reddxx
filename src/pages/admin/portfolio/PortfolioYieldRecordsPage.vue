<script setup>
// 投资组合收益记录 — Ant Design Pro list page (2026-11-28): query card + table card, amounts right-aligned.
import { computed, ref } from 'vue'
import { Space, Tag, TypographyText } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import { portfolioYieldRecords } from '../../../admin/state/portfolioOrders'

const page = ref(1)
const blank = () => ({ orderId: '', userName: '', product: 'all', status: 'all', recordDate: null })
const filters = ref(blank())
const distinct = (key) => [...new Set(portfolioYieldRecords.value.map((row) => row[key]).filter(Boolean))].map((value) => ({ value, label: value }))
const fields = computed(() => [
  { key: 'orderId', label: '订单号' },
  { key: 'userName', label: '用户' },
  { key: 'product', label: '产品', searchable: true, options: [{ value: 'all', label: '全部产品' }, ...distinct('productName')] },
  { key: 'status', label: '状态', options: [{ value: 'all', label: '全部状态' }, ...distinct('status')] },
  { key: 'recordDate', label: '收益日期', range: true }
])

const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
const money = (value) => Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })

const rows = computed(() => portfolioYieldRecords.value.filter((row) => {
  const f = filters.value
  return has(row.orderId, f.orderId) && has(row.userName, f.userName) &&
    (f.product === 'all' || row.productName === f.product) &&
    (f.status === 'all' || row.status === f.status) &&
    (!f.recordDate || (row.recordDate >= f.recordDate[0] && row.recordDate <= f.recordDate[1]))
}))

const columns = [
  { key: 'id', title: '记录', width: 200 },
  { key: 'product', title: '产品', width: 240 },
  { key: 'userName', title: '用户', width: 200 },
  { key: 'principal', title: '本金（USDT）', width: 140, align: 'right' },
  { key: 'yield', title: '收益（USDT）', width: 160, align: 'right' },
  { key: 'recordDate', title: '收益日期', width: 120 },
  { key: 'status', title: '状态', width: 100 }
]

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }
</script>

<template>
  <PageShell>
    <SearchForm name="portfolio-yield-record-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <AdminTable title="投资组合收益记录" v-model:page="page" :rows="rows" :columns="columns" row-key="id" desktop-only>
      <template #cell="{ column, record }">
        <Space v-if="column.key === 'id'" direction="vertical" :size="0">
          <span class="font-mono">{{ record.id }}</span>
          <TypographyText type="secondary" class="font-mono">订单 {{ record.orderId }}</TypographyText>
        </Space>
        <template v-else-if="column.key === 'product'">{{ record.productName }}</template>
        <template v-else-if="column.key === 'principal'">{{ money(record.principal) }}</template>
        <Space v-else-if="column.key === 'yield'" direction="vertical" :size="0" align="end">
          <TypographyText type="success">+{{ money(record.yieldAmount) }}</TypographyText>
          <TypographyText type="secondary">日收益率 {{ record.dailyRatePct }}%</TypographyText>
        </Space>
        <Tag v-else-if="column.key === 'status'" color="green">{{ record.status }}</Tag>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>
  </PageShell>
</template>
