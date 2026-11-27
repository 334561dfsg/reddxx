<script setup>
// 投资组合订单 — Ant Design Pro list page (2026-11-28): one query field per filter (the old combined
// order/user/product keyword box is split), table card with right-aligned amounts and text status Tags.
import { computed, ref } from 'vue'
import { Space, Tag, TypographyText } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import { portfolioOrders } from '../../../admin/state/portfolioOrders'
import { COMMON_FILTER_ALL, ORDER_STATUS, orderStatusMeta } from '../../../admin/constants/portfolio'

const page = ref(1)
const blank = () => ({ orderId: '', user: '', product: COMMON_FILTER_ALL, status: COMMON_FILTER_ALL, startedAt: null, principal: [null, null] })
const filters = ref(blank())
const productOptions = computed(() => [...new Set(portfolioOrders.value.map((order) => order.productName))].map((value) => ({ value, label: value })))
const fields = computed(() => [
  { key: 'orderId', label: '订单号' },
  { key: 'user', label: '用户' },
  { key: 'product', label: '产品', searchable: true, options: [{ value: COMMON_FILTER_ALL, label: '全部产品' }, ...productOptions.value] },
  { key: 'status', label: '状态', options: [{ value: COMMON_FILTER_ALL, label: '全部状态' }, ...Object.entries(orderStatusMeta).map(([value, meta]) => ({ value, label: meta.label }))] },
  { key: 'startedAt', label: '开始日期', range: true },
  { key: 'principal', label: '本金', numberRange: true, min: 0 }
])

const statusColor = {
  [ORDER_STATUS.RUNNING]: 'blue',
  [ORDER_STATUS.COMPLETED]: 'green',
  [ORDER_STATUS.SETTLED]: 'default',
  [ORDER_STATUS.EARLY_REDEEMED]: 'purple',
  [ORDER_STATUS.CANCELLED]: 'red'
}
const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
const inRange = (value, [min, max]) => (min === null || min === undefined || value >= min) && (max === null || max === undefined || value <= max)
const money = (value) => Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })

const rows = computed(() => portfolioOrders.value.filter((order) => {
  const f = filters.value
  const day = String(order.startedAt || '').slice(0, 10)
  return has(order.id, f.orderId) && (has(order.userName, f.user) || has(order.userId, f.user)) &&
    (f.product === COMMON_FILTER_ALL || order.productName === f.product) &&
    (f.status === COMMON_FILTER_ALL || order.status === f.status) &&
    (!f.startedAt || (day >= f.startedAt[0] && day <= f.startedAt[1])) &&
    inRange(Number(order.principal), f.principal)
}))

const columns = [
  { key: 'id', title: '订单号', width: 180, fixed: 'left' },
  { key: 'user', title: '用户', width: 200 },
  { key: 'product', title: '产品', width: 240 },
  { key: 'principal', title: '本金（USDT）', width: 140, align: 'right' },
  { key: 'yield', title: '预估收益（USDT）', width: 170, align: 'right' },
  { key: 'fee', title: '手续费（USDT）', width: 130, align: 'right' },
  { key: 'time', title: '时间', width: 220 },
  { key: 'status', title: '状态', width: 100 }
]

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }
</script>

<template>
  <PageShell>
    <SearchForm name="portfolio-order-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <AdminTable title="投资组合订单" v-model:page="page" :rows="rows" :columns="columns" row-key="id" desktop-only>
      <template #cell="{ column, record }">
        <span v-if="column.key === 'id'" class="font-mono">{{ record.id }}</span>
        <Space v-else-if="column.key === 'user'" direction="vertical" :size="0">
          <span>{{ record.userName }}</span>
          <TypographyText type="secondary" class="font-mono">{{ record.userId }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'product'" direction="vertical" :size="4">
          <TypographyText strong>{{ record.productName }}</TypographyText>
          <span><Tag v-for="asset in record.assets" :key="asset.symbol">{{ asset.symbol }}</Tag></span>
        </Space>
        <template v-else-if="column.key === 'principal'">{{ money(record.principal) }}</template>
        <Space v-else-if="column.key === 'yield'" direction="vertical" :size="0" align="end">
          <span>{{ money(record.minYield) }} - {{ money(record.maxYield) }}</span>
          <TypographyText v-if="record.accumulatedYield != null" type="secondary">已产生 {{ money(record.accumulatedYield) }}</TypographyText>
        </Space>
        <template v-else-if="column.key === 'fee'">{{ money(record.fee) }}</template>
        <Space v-else-if="column.key === 'time'" direction="vertical" :size="0">
          <span>开始 {{ record.startedAt }}</span>
          <TypographyText type="secondary">到期 {{ record.maturityAt }}</TypographyText>
          <TypographyText v-if="record.redeemedAt" type="secondary">赎回 {{ record.redeemedAt }}</TypographyText>
        </Space>
        <Tag v-else-if="column.key === 'status'" :color="statusColor[record.status]">{{ orderStatusMeta[record.status]?.label ?? record.status }}</Tag>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>
  </PageShell>
</template>
