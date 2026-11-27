<template>
	<section class="space-y-4">
		<header>
			<h1 class="text-3xl font-semibold text-slate-900">收益调整记录</h1>
			<p class="mt-1 text-sm text-slate-500">查询历史收益调整；发起调整请在「订单管理」中点击对应订单的「收益调整」</p>
		</header>

		<article class="rounded-xl border border-slate-200 bg-white">
			<div class="space-y-2 border-b border-slate-200 p-4">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div class="text-sm text-slate-600">
						命中 {{ filteredAdjustments.length }} 条（第 {{ adjCurrentPage }} / {{ adjTotalPages }} 页，每页 {{ adjPageSize }} 条）
					</div>
					<input v-model="search" type="text" placeholder="搜索用户、订单或产品..." class="w-full max-w-sm rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" />
				</div>
			</div>

			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="bg-slate-50 text-slate-500">
						<tr>
							<th class="px-4 py-3 text-left font-medium">调整ID</th>
							<th class="px-4 py-3 text-left font-medium">类型</th>
							<th class="px-4 py-3 text-left font-medium">目标</th>
							<th class="px-4 py-3 text-left font-medium">产品</th>
							<th class="px-4 py-3 text-left font-medium">金额</th>
							<th class="px-4 py-3 text-left font-medium">原因</th>
							<th class="px-4 py-3 text-left font-medium">操作人</th>
							<th class="px-4 py-3 text-left font-medium">调整时间</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="adj in pagedAdjustments" :key="adj.id" class="border-t border-slate-100">
							<td class="px-4 py-3 font-mono text-xs text-slate-600">{{ adj.id }}</td>
							<td class="px-4 py-3">
								<div class="flex items-center gap-1.5">
									<component :is="getAdjustmentIcon(adj.type)" class="w-4 h-4" :class="getIconColor(adj.type)" />
									<span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="adjustmentTypeMeta[adj.type].class">{{ adjustmentTypeMeta[adj.type].label }}</span>
								</div>
							</td>
							<td class="px-4 py-3">
								<div class="text-slate-700">{{ adj.targetName }}</div>
								<div class="text-xs text-slate-500">{{ adj.targetType === 'user' ? '用户' : adj.targetType === 'product' ? '产品' : '订单' }}</div>
							</td>
							<td class="px-4 py-3">
								<div class="text-slate-700">{{ adj.productName }}</div>
								<div v-if="adj.orderId" class="text-xs text-slate-500 font-mono">{{ adj.orderId }}</div>
							</td>
							<td class="px-4 py-3">
								<div class="font-medium text-slate-900">{{ fmtCurrency(adj.amount, adj.currency) }}</div>
								<div v-if="adj.percentage" class="text-xs text-slate-500">{{ adj.percentage }}%</div>
							</td>
							<td class="px-4 py-3">
								<div class="text-slate-700 max-w-xs truncate">{{ adj.reason }}</div>
							</td>
							<td class="px-4 py-3">
								<div class="text-slate-700">{{ adj.operatorName }}</div>
							</td>
							<td class="px-4 py-3">
								<div class="text-slate-700">{{ adj.createdAt }}</div>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<AdminListPaginationBar
				v-model:current-page="adjCurrentPage"
				v-model:page-size="adjPageSize"
				:total-pages="adjTotalPages"
				:total-count="adjTotalCount"
			/>
		</article>
	</section>
</template>

<script setup>
import { ref, computed, h } from 'vue'
import { ADJUSTMENT_TYPE, adjustmentTypeMeta } from '../../../admin/constants/aiQuant'
import { aiQuantYieldAdjustments } from '../../../admin/state/aiQuantYieldAdjustments'
import AdminListPaginationBar from '../../../admin/components/AdminListPaginationBar.vue'
import { useAgentPagedList } from '../../../composables/useAgentListPagination'

const search = ref('')

const getAdjustmentIcon = (type) => {
	const icons = {
		[ADJUSTMENT_TYPE.BONUS]: (props) => h('svg', { ...props, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
			h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7' })
		]),
		[ADJUSTMENT_TYPE.PENALTY]: (props) => h('svg', { ...props, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
			h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' })
		]),
		[ADJUSTMENT_TYPE.CORRECTION]: (props) => h('svg', { ...props, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
			h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }),
			h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' })
		]),
		[ADJUSTMENT_TYPE.INCREASE]: (props) => h('svg', { ...props, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
			h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' })
		]),
		[ADJUSTMENT_TYPE.DECREASE]: (props) => h('svg', { ...props, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
			h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6' })
		])
	}
	return icons[type] || icons[ADJUSTMENT_TYPE.BONUS]
}

const getIconColor = (type) => {
	const colors = {
		[ADJUSTMENT_TYPE.BONUS]: 'text-green-600',
		[ADJUSTMENT_TYPE.PENALTY]: 'text-red-600',
		[ADJUSTMENT_TYPE.CORRECTION]: 'text-blue-600',
		[ADJUSTMENT_TYPE.INCREASE]: 'text-purple-600',
		[ADJUSTMENT_TYPE.DECREASE]: 'text-orange-600'
	}
	return colors[type] || 'text-slate-600'
}

const filteredAdjustments = computed(() => {
	const kw = search.value.trim().toLowerCase()
	return aiQuantYieldAdjustments.value.filter(adj => {
		return !kw || `${adj.targetName} ${adj.productName} ${adj.orderId || ''}`.toLowerCase().includes(kw)
	})
})

const {
	pageSize: adjPageSize,
	currentPage: adjCurrentPage,
	totalCount: adjTotalCount,
	totalPages: adjTotalPages,
	pagedList: pagedAdjustments
} = useAgentPagedList(filteredAdjustments, { pageSize: 10 })

const fmtNumber = (val, decimals = 2) => Number(val).toFixed(decimals)
const fmtCurrency = (val, currency, decimals = 2) => {
	if (currency === 'BTC' || currency === 'ETH') return `${fmtNumber(val, decimals === 2 ? 4 : decimals)} ${currency}`
	return `${Number(val).toLocaleString()} ${currency}`
}
</script>
