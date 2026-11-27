<script setup>
// 收益调整日志 — Ant Design Pro list page (2026-11-28): the combined keyword box is split into one field per
// filter; the "去收益调控" shortcut moves to the table toolbar.
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Space, Tag, TypographyText } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import { formatPortfolioAdjustmentRate } from '../../../admin/constants/portfolio'
import { portfolioYieldAdjustmentLogs } from '../../../admin/state/portfolioYieldAdjustmentLogs'

const router = useRouter()
const page = ref(1)
const blank = () => ({ id: '', product: '', operator: '', reason: '', actionType: 'all', createdAt: null })
const filters = ref(blank())
const fields = [
  { key: 'id', label: '日志 ID' },
  { key: 'product', label: '产品' },
  { key: 'operator', label: '操作人' },
  { key: 'reason', label: '原因' },
  { key: 'actionType', label: '类型', options: [{ value: 'all', label: '全部类型' }, { value: 'adjust', label: '调整' }, { value: 'reset', label: '重置' }] },
  { key: 'createdAt', label: '操作日期', range: true }
]

const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
// Seed logs use 'YYYY-MM-DD HH:mm:ss', new ones the zh-CN locale string ('YYYY/M/D HH:mm:ss'); normalise both.
const dayOf = (value) => {
  const match = String(value || '').match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/)
  return match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : ''
}

const rows = computed(() => portfolioYieldAdjustmentLogs.value.filter((row) => {
  const f = filters.value
  const day = dayOf(row.createdAt)
  return has(row.id, f.id) &&
    (has(row.productId, f.product) || has(row.productName, f.product) || has(row.assetsLabel, f.product)) &&
    has(row.operator, f.operator) && has(row.reason, f.reason) &&
    (f.actionType === 'all' || row.actionType === f.actionType) &&
    (!f.createdAt || (day >= f.createdAt[0] && day <= f.createdAt[1]))
}))

const columns = [
  { key: 'id', title: '日志 ID', width: 140 },
  { key: 'actionType', title: '类型', width: 80 },
  { key: 'product', title: '产品', width: 220 },
  { key: 'rate', title: '调整比例', width: 140, align: 'right' },
  { key: 'multiplier', title: '倍数', width: 130, align: 'right' },
  { key: 'range', title: '收益区间', width: 200 },
  { key: 'durationLabel', title: '生效策略', width: 160 },
  { key: 'reason', title: '原因', width: 220, ellipsis: true },
  { key: 'operator', title: '操作人', width: 120 },
  { key: 'createdAt', title: '时间', width: 180 }
]

function rateType(rate) {
  const n = Number(rate)
  if (n > 0) return 'success'
  if (n < 0) return 'danger'
  return undefined
}

function fmtMult(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${n.toFixed(2)}×`
}

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }
</script>

<template>
  <PageShell>
    <SearchForm name="portfolio-yield-adjustment-log-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <AdminTable title="收益调整日志" v-model:page="page" :rows="rows" :columns="columns" row-key="id" desktop-only>
      <template #toolbar>
        <Button @click="router.push({ name: 'portfolio-yield-control' })">去收益调控</Button>
      </template>
      <template #cell="{ column, record }">
        <span v-if="column.key === 'id'" class="font-mono">{{ record.id }}</span>
        <Tag v-else-if="column.key === 'actionType'" :color="record.actionType === 'reset' ? 'default' : 'blue'">{{ record.actionType === 'reset' ? '重置' : '调整' }}</Tag>
        <Space v-else-if="column.key === 'product'" direction="vertical" :size="0">
          <TypographyText strong>{{ record.assetsLabel }}</TypographyText>
          <TypographyText type="secondary" class="font-mono">{{ record.productId }}</TypographyText>
        </Space>
        <span v-else-if="column.key === 'rate'">
          <TypographyText type="secondary">{{ formatPortfolioAdjustmentRate(record.beforeRate) }} → </TypographyText>
          <TypographyText :type="rateType(record.afterRate)" strong>{{ formatPortfolioAdjustmentRate(record.afterRate) }}</TypographyText>
        </span>
        <span v-else-if="column.key === 'multiplier'">{{ fmtMult(record.beforeMultiplier) }} → {{ fmtMult(record.afterMultiplier) }}</span>
        <Space v-else-if="column.key === 'range'" direction="vertical" :size="0">
          <TypographyText type="secondary">{{ record.beforeRange }}</TypographyText>
          <span>→ {{ record.afterRange }}</span>
        </Space>
        <span v-else-if="column.key === 'reason'" :title="record.reason">{{ record.reason || '—' }}</span>
        <TypographyText v-else-if="column.key === 'createdAt'" type="secondary">{{ record.createdAt }}</TypographyText>
        <template v-else>{{ record[column.key] || '—' }}</template>
      </template>
    </AdminTable>
  </PageShell>
</template>
