<script setup>
// 锁仓订单 — Ant Design Pro list page (2026-11-28): query card with one input per field, table card with
// pagination, right-aligned amounts (mixed currencies keep the unit in the cell) and status as a text Tag.
import { ref, computed } from 'vue'
import { Space, Tag, TypographyText } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import {
	ORDER_STATUS,
	orderStatusMeta,
	COMMON_FILTER_ALL,
	SUPPORTED_CURRENCIES,
	lockYieldAnnualPct
} from '../../../admin/constants/liquidityLocked'
import { createLockedOrdersMock } from '../../../admin/mock/liquidityLocked'

const orders = ref(createLockedOrdersMock())
const page = ref(1)

const blank = () => ({ orderId: '', user: '', product: '', currency: COMMON_FILTER_ALL, status: COMMON_FILTER_ALL, lockedAt: null })
const filters = ref(blank())
const fields = [
	{ key: 'orderId', label: '订单号' },
	{ key: 'user', label: '用户' },
	{ key: 'product', label: '产品名称' },
	{ key: 'currency', label: '币种', searchable: true, options: [{ value: COMMON_FILTER_ALL, label: '全部币种' }, ...SUPPORTED_CURRENCIES.map((value) => ({ value, label: value }))] },
	{ key: 'status', label: '状态', options: [{ value: COMMON_FILTER_ALL, label: '全部状态' }, ...Object.entries(orderStatusMeta).map(([value, meta]) => ({ value, label: meta.label }))] },
	{ key: 'lockedAt', label: '锁仓日期', range: true }
]

const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
const filteredOrders = computed(() => {
	const f = filters.value
	return orders.value.filter((o) => {
		const day = String(o.lockedAt || '').slice(0, 10)
		return has(o.id, f.orderId) &&
			(has(o.userName, f.user) || has(o.userId, f.user)) &&
			has(o.productName, f.product) &&
			(f.currency === COMMON_FILTER_ALL || o.currency === f.currency) &&
			(f.status === COMMON_FILTER_ALL || o.status === f.status) &&
			(!f.lockedAt || (day >= f.lockedAt[0] && day <= f.lockedAt[1]))
	})
})

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }

const columns = [
	{ key: 'order', title: '订单', width: 200, fixed: 'left' },
	{ key: 'user', title: '用户', width: 190 },
	{ key: 'amount', title: '锁仓金额', width: 160, align: 'right' },
	{ key: 'rate', title: '年化收益率', width: 110, align: 'right' },
	{ key: 'baseInterest', title: '基础预计收益', width: 150, align: 'right' },
	{ key: 'adjustment', title: '已执行调整', width: 140, align: 'right' },
	{ key: 'payable', title: '应发收益', width: 150, align: 'right' },
	{ key: 'status', title: '状态', width: 100 },
	{ key: 'remaining', title: '剩余天数', width: 100, align: 'right' }
]
const statusColor = { [ORDER_STATUS.LOCKED]: 'blue', [ORDER_STATUS.COMPLETED]: 'green', [ORDER_STATUS.EARLY_REDEEMED]: 'orange' }

const fmtNumber = (val, decimals = 2) => Number(val).toFixed(decimals)
const fmtCurrency = (val, currency, decimals = 2) => {
	if (currency === 'BTC' || currency === 'ETH') return `${fmtNumber(val, decimals === 2 ? 4 : decimals)} ${currency}`
	return `${Number(val).toLocaleString()} ${currency}`
}
const adjustmentType = (val) => {
	const n = Number(val) || 0
	if (n > 0) return 'success'
	if (n < 0) return 'danger'
	return 'secondary'
}
const fmtSignedCurrency = (val, currency) => {
	const n = Number(val) || 0
	if (n === 0) return '-'
	const sign = n > 0 ? '+' : '-'
	return `${sign}${fmtCurrency(Math.abs(n), currency)}`
}
</script>

<template>
	<PageShell>
		<SearchForm name="liquidity-locked-order-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
		<AdminTable title="锁仓订单" v-model:page="page" :rows="filteredOrders" :columns="columns" row-key="id" desktop-only>
			<template #cell="{ column, record: order }">
				<Space v-if="column.key === 'order'" direction="vertical" :size="0">
					<TypographyText strong>{{ order.productName }}</TypographyText>
					<TypographyText type="secondary" class="font-mono">{{ order.id }}</TypographyText>
					<TypographyText type="secondary">{{ order.lockedAt }}</TypographyText>
				</Space>
				<Space v-else-if="column.key === 'user'" direction="vertical" :size="0">
					<span>{{ order.userName }}</span>
					<TypographyText type="secondary" class="font-mono">{{ order.userId }}</TypographyText>
				</Space>
				<Space v-else-if="column.key === 'amount'" direction="vertical" :size="0" align="end">
					<span>{{ fmtCurrency(order.amount, order.currency) }}</span>
					<TypographyText type="secondary">{{ order.lockDays }} 天</TypographyText>
				</Space>
				<template v-else-if="column.key === 'rate'">{{ lockYieldAnnualPct(order).toFixed(2) }}%</template>
				<template v-else-if="column.key === 'baseInterest'">{{ fmtCurrency(order.baseInterest, order.currency) }}</template>
				<TypographyText v-else-if="column.key === 'adjustment'" :type="adjustmentType(order.executedInterestAdjustment)">
					{{ fmtSignedCurrency(order.executedInterestAdjustment, order.currency) }}
				</TypographyText>
				<TypographyText v-else-if="column.key === 'payable'" strong>{{ fmtCurrency(order.payableInterest, order.currency) }}</TypographyText>
				<Tag v-else-if="column.key === 'status'" :color="statusColor[order.status]">{{ orderStatusMeta[order.status]?.label ?? order.status }}</Tag>
				<template v-else-if="column.key === 'remaining'">{{ order.daysRemaining > 0 ? `${order.daysRemaining} 天` : '-' }}</template>
				<template v-else>{{ order[column.key] ?? '—' }}</template>
			</template>
		</AdminTable>
	</PageShell>
</template>
