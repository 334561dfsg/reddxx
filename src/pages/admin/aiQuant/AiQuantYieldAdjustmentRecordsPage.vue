<script setup>
// 收益调整记录 — Ant Design Pro list page (2026-11-28): one query input per field (the combined keyword box was split),
// table card with pagination, adjustment type as a text Tag (decorative per-type icons removed).
import { ref, computed } from 'vue'
import { Space, Tag, TypographyText } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import { ADJUSTMENT_TYPE, adjustmentTypeMeta } from '../../../admin/constants/aiQuant'
import { aiQuantYieldAdjustments } from '../../../admin/state/aiQuantYieldAdjustments'

const page = ref(1)
const targetTypeLabel = { user: '用户', product: '产品', order: '订单' }
const typeColor = {
	[ADJUSTMENT_TYPE.BONUS]: 'green',
	[ADJUSTMENT_TYPE.PENALTY]: 'red',
	[ADJUSTMENT_TYPE.CORRECTION]: 'blue',
	[ADJUSTMENT_TYPE.INCREASE]: 'purple',
	[ADJUSTMENT_TYPE.DECREASE]: 'orange'
}

const blank = () => ({ type: 'all', targetType: 'all', target: '', product: '', orderId: '', operator: '', createdAt: null })
const filters = ref(blank())
const fields = [
	{ key: 'type', label: '调整类型', options: [{ value: 'all', label: '全部类型' }, ...Object.entries(adjustmentTypeMeta).map(([value, meta]) => ({ value, label: meta.label }))] },
	{ key: 'targetType', label: '目标类型', options: [{ value: 'all', label: '全部目标' }, ...Object.entries(targetTypeLabel).map(([value, label]) => ({ value, label }))] },
	{ key: 'target', label: '目标名称' },
	{ key: 'product', label: '产品名称' },
	{ key: 'orderId', label: '订单号' },
	{ key: 'operator', label: '操作人' },
	{ key: 'createdAt', label: '调整日期', range: true }
]

const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
const filteredAdjustments = computed(() => {
	const f = filters.value
	return aiQuantYieldAdjustments.value.filter((adj) => {
		const day = String(adj.createdAt || '').slice(0, 10)
		return (f.type === 'all' || adj.type === f.type) &&
			(f.targetType === 'all' || adj.targetType === f.targetType) &&
			has(adj.targetName, f.target) && has(adj.productName, f.product) &&
			has(adj.orderId, f.orderId) && has(adj.operatorName, f.operator) &&
			(!f.createdAt || (day >= f.createdAt[0] && day <= f.createdAt[1]))
	})
})

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }

const columns = [
	{ key: 'id', title: '调整 ID', width: 120 },
	{ key: 'type', title: '类型', width: 110 },
	{ key: 'target', title: '目标', width: 180 },
	{ key: 'product', title: '产品', width: 200 },
	{ key: 'amount', title: '金额', width: 150, align: 'right' },
	{ key: 'reason', title: '原因', width: 240 },
	{ key: 'operatorName', title: '操作人', width: 130 },
	{ key: 'createdAt', title: '调整时间', width: 170 }
]

const fmtNumber = (val, decimals = 2) => Number(val).toFixed(decimals)
const fmtCurrency = (val, currency, decimals = 2) => {
	if (currency === 'BTC' || currency === 'ETH') return `${fmtNumber(val, decimals === 2 ? 4 : decimals)} ${currency}`
	return `${Number(val).toLocaleString()} ${currency}`
}
</script>

<template>
	<PageShell>
		<SearchForm name="ai-quant-yield-record-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
		<AdminTable title="收益调整记录" v-model:page="page" :rows="filteredAdjustments" :columns="columns" row-key="id" desktop-only>
			<template #cell="{ column, record: adj }">
				<TypographyText v-if="column.key === 'id'" class="font-mono">{{ adj.id }}</TypographyText>
				<Tag v-else-if="column.key === 'type'" :color="typeColor[adj.type]">{{ adjustmentTypeMeta[adj.type]?.label ?? adj.type }}</Tag>
				<Space v-else-if="column.key === 'target'" direction="vertical" :size="0">
					<span>{{ adj.targetName }}</span>
					<TypographyText type="secondary">{{ targetTypeLabel[adj.targetType] ?? '订单' }}</TypographyText>
				</Space>
				<Space v-else-if="column.key === 'product'" direction="vertical" :size="0">
					<span>{{ adj.productName }}</span>
					<TypographyText v-if="adj.orderId" type="secondary" class="font-mono">{{ adj.orderId }}</TypographyText>
				</Space>
				<Space v-else-if="column.key === 'amount'" direction="vertical" :size="0" align="end">
					<span>{{ fmtCurrency(adj.amount, adj.currency) }}</span>
					<TypographyText v-if="adj.percentage" type="secondary">{{ adj.percentage }}%</TypographyText>
				</Space>
				<template v-else>{{ adj[column.key] ?? '—' }}</template>
			</template>
		</AdminTable>
	</PageShell>
</template>
