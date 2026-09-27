
<script setup>
import { ref, computed } from 'vue'
import {
	ORDER_STATUS,
	orderStatusMeta,
	COMMON_FILTER_ALL,
	lockYieldAnnualPct
} from '../../../admin/constants/liquidityLocked'
import { createLockedOrdersMock } from '../../../admin/mock/liquidityLocked'

const orders = ref(createLockedOrdersMock())
const search = ref('')
const statusFilter = ref(COMMON_FILTER_ALL)

const filteredOrders = computed(() => {
	const kw = search.value.trim().toLowerCase()
	return orders.value.filter(o => {
		const matchStatus = statusFilter.value === COMMON_FILTER_ALL || o.status === statusFilter.value
		const matchKeyword = !kw || `${o.id} ${o.userName} ${o.productName} ${o.currency}`.toLowerCase().includes(kw)
		return matchStatus && matchKeyword
	})
})

const fmtNumber = (val, decimals = 2) => Number(val).toFixed(decimals)
const fmtCurrency = (val, currency, decimals = 2) => {
	if (currency === 'BTC' || currency === 'ETH') return `${fmtNumber(val, decimals === 2 ? 4 : decimals)} ${currency}`
	return `${Number(val).toLocaleString()} ${currency}`
}
const adjustmentClass = (val) => {
	const n = Number(val) || 0
	if (n > 0) return 'text-emerald-600'
	if (n < 0) return 'text-rose-600'
	return 'text-slate-400'
}
const fmtSignedCurrency = (val, currency) => {
	const n = Number(val) || 0
	if (n === 0) return '-'
	const sign = n > 0 ? '+' : '-'
	return `${sign}${fmtCurrency(Math.abs(n), currency)}`
}
</script>

<template>
	<section class="space-y-4">
		<header>
			<h1 class="text-3xl font-semibold text-slate-900">订单管理</h1>
			<p class="mt-1 text-sm text-slate-500">审查锁仓订单状态与收益兑现节奏</p>
		</header>

		<article class="rounded-xl border border-slate-200 bg-white">
			<div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
				<div class="inline-flex items-center gap-3 text-sm">
					<a-button type="text" html-type="button" class="font-medium" :class="statusFilter === COMMON_FILTER_ALL ? 'text-blue-600' : 'text-slate-500'" @click="statusFilter = COMMON_FILTER_ALL">全部</a-button>
					<a-button type="text" html-type="button" class="font-medium" :class="statusFilter === ORDER_STATUS.LOCKED ? 'text-blue-600' : 'text-slate-500'" @click="statusFilter = ORDER_STATUS.LOCKED">锁定中</a-button>
					<a-button type="text" html-type="button" class="font-medium" :class="statusFilter === ORDER_STATUS.COMPLETED ? 'text-blue-600' : 'text-slate-500'" @click="statusFilter = ORDER_STATUS.COMPLETED">已完成</a-button>
					<a-button type="text" html-type="button" class="font-medium" :class="statusFilter === ORDER_STATUS.EARLY_REDEEMED ? 'text-blue-600' : 'text-slate-500'" @click="statusFilter = ORDER_STATUS.EARLY_REDEEMED">提前赎回</a-button>
				</div>
				<a-input v-model:value="search" type="text" placeholder="搜索订单ID、用户名..." class="w-full max-w-sm rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500" />
			</div>

			<div class="overflow-x-auto">
				<a-table  size="small" :pagination="false" :data-source="filteredOrders" :row-key="(order) => order.id" :scroll="{ x: 'max-content' }" :custom-row="(order, rowIndex) => ({ class: [&quot;border-t border-slate-100&quot;] })">
<a-table-column key="column-0" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3 font-mono text-xs text-slate-600&quot;] })">
<template #title>订单ID</template>
<template #default="{ record: order, index: rowIndex }">{{ order.id }}</template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3 text-slate-700&quot;] })">
<template #title>用户</template>
<template #default="{ record: order, index: rowIndex }">{{ order.userName }}</template>
</a-table-column>
<a-table-column key="column-2" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3 text-slate-700&quot;] })">
<template #title>产品</template>
<template #default="{ record: order, index: rowIndex }">{{ order.productName }}</template>
</a-table-column>
<a-table-column key="column-3" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3 font-medium text-slate-900&quot;] })">
<template #title>金额</template>
<template #default="{ record: order, index: rowIndex }">{{ fmtCurrency(order.amount, order.currency) }}</template>
</a-table-column>
<a-table-column key="column-4" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3 text-slate-700&quot;] })">
<template #title>周期</template>
<template #default="{ record: order, index: rowIndex }">{{ order.lockDays }} 天</template>
</a-table-column>
<a-table-column key="column-5" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3 font-medium text-emerald-600&quot;] })">
<template #title>年化收益率</template>
<template #default="{ record: order, index: rowIndex }">{{ lockYieldAnnualPct(order).toFixed(2) }}%</template>
</a-table-column>
<a-table-column key="column-6" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3 font-medium text-slate-700&quot;] })">
<template #title>基础预计收益</template>
<template #default="{ record: order, index: rowIndex }">{{ fmtCurrency(order.baseInterest, order.currency) }}</template>
</a-table-column>
<a-table-column key="column-7" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3 font-medium&quot;, adjustmentClass(order.executedInterestAdjustment)] })">
<template #title>已执行调整</template>
<template #default="{ record: order, index: rowIndex }">
								{{ fmtSignedCurrency(order.executedInterestAdjustment, order.currency) }}
							</template>
</a-table-column>
<a-table-column key="column-8" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3 font-medium text-blue-600&quot;] })">
<template #title>应发收益</template>
<template #default="{ record: order, index: rowIndex }">{{ fmtCurrency(order.payableInterest, order.currency) }}</template>
</a-table-column>
<a-table-column key="column-9" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>状态</template>
<template #default="{ record: order, index: rowIndex }"><span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="orderStatusMeta[order.status].class">{{ orderStatusMeta[order.status].label }}</span></template>
</a-table-column>
<a-table-column key="column-10" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3 text-slate-700&quot;] })">
<template #title>剩余天数</template>
<template #default="{ record: order, index: rowIndex }">{{ order.daysRemaining > 0 ? `${order.daysRemaining} 天` : '-' }}</template>
</a-table-column>
</a-table>
			</div>
		</article>
	</section>
</template>
