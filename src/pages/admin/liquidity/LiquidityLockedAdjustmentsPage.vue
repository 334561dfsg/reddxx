
<script setup>
import { ref, reactive, computed } from 'vue'
import {
	ADJUSTMENT_STATUS,
	ADJUSTMENT_TYPE,
	adjustmentStatusMeta,
	adjustmentTypeMeta,
	COMMON_FILTER_ALL
} from '../../../admin/constants/liquidityLocked'
import { createLockedAdjustmentsMock, createLockedOrdersMock } from '../../../admin/mock/liquidityLocked'

const adjustments = ref(createLockedAdjustmentsMock())
const orders = ref(createLockedOrdersMock())
const search = ref('')
const statusFilter = ref(COMMON_FILTER_ALL)

const showAdjustmentModal = ref(false)
const adjustmentForm = reactive({
	orderId: '',
	type: ADJUSTMENT_TYPE.ADD_INTEREST,
	amount: 0,
	reason: ''
})

const openCreateAdjustment = () => {
	adjustmentForm.orderId = ''
	adjustmentForm.type = ADJUSTMENT_TYPE.ADD_INTEREST
	adjustmentForm.amount = 0
	adjustmentForm.reason = ''
	showAdjustmentModal.value = true
}

const saveAdjustment = () => {
	const order = orders.value.find(o => o.id === adjustmentForm.orderId)
	if (!order) return

	adjustments.value.unshift({
		id: `adj-${Date.now()}`,
		orderId: adjustmentForm.orderId,
		userId: order.userId,
		userName: order.userName,
		type: adjustmentForm.type,
		amount: Number(adjustmentForm.amount),
		currency: order.currency,
		reason: adjustmentForm.reason.trim(),
		status: ADJUSTMENT_STATUS.PENDING,
		requestedBy: 'admin@platform.com',
		requestedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
		executedAt: null
	})

	showAdjustmentModal.value = false
}

const approveAdjustment = (id) => {
	adjustments.value = adjustments.value.map(a =>
		a.id === id ? { ...a, status: ADJUSTMENT_STATUS.APPROVED } : a
	)
}

const executeAdjustment = (id) => {
	adjustments.value = adjustments.value.map(a =>
		a.id === id ? { ...a, status: ADJUSTMENT_STATUS.EXECUTED, executedAt: new Date().toISOString().replace('T', ' ').substring(0, 19) } : a
	)
}

const rejectAdjustment = (id) => {
	adjustments.value = adjustments.value.map(a =>
		a.id === id ? { ...a, status: ADJUSTMENT_STATUS.REJECTED } : a
	)
}

const filteredAdjustments = computed(() => {
	const kw = search.value.trim().toLowerCase()
	return adjustments.value.filter(a => {
		const matchStatus = statusFilter.value === COMMON_FILTER_ALL || a.status === statusFilter.value
		const matchKeyword = !kw || `${a.orderId} ${a.userName}`.toLowerCase().includes(kw)
		return matchStatus && matchKeyword
	})
})

const fmtNumber = (val, decimals = 2) => Number(val).toFixed(decimals)
const fmtCurrency = (val, currency, decimals = 2) => {
	if (currency === 'BTC' || currency === 'ETH') return `${fmtNumber(val, decimals === 2 ? 4 : decimals)} ${currency}`
	return `${Number(val).toLocaleString()} ${currency}`
}
</script>

<template>
	<section class="space-y-4">
		<header class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<h1 class="text-3xl font-semibold text-slate-900">手工调整</h1>
				<p class="mt-1 text-sm text-slate-500">处理补息、扣息、展期与提前赎回</p>
			</div>
			<a-button type="text" html-type="button" class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" @click="openCreateAdjustment">+ 新建调整</a-button>
		</header>

		<article class="rounded-xl border border-slate-200 bg-white">
			<div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
				<div class="inline-flex items-center gap-3 text-sm">
					<a-button type="text" html-type="button" class="font-medium" :class="statusFilter === COMMON_FILTER_ALL ? 'text-blue-600' : 'text-slate-500'" @click="statusFilter = COMMON_FILTER_ALL">全部</a-button>
					<a-button type="text" html-type="button" class="font-medium" :class="statusFilter === ADJUSTMENT_STATUS.PENDING ? 'text-blue-600' : 'text-slate-500'" @click="statusFilter = ADJUSTMENT_STATUS.PENDING">待处理</a-button>
					<a-button type="text" html-type="button" class="font-medium" :class="statusFilter === ADJUSTMENT_STATUS.APPROVED ? 'text-blue-600' : 'text-slate-500'" @click="statusFilter = ADJUSTMENT_STATUS.APPROVED">已批准</a-button>
					<a-button type="text" html-type="button" class="font-medium" :class="statusFilter === ADJUSTMENT_STATUS.EXECUTED ? 'text-blue-600' : 'text-slate-500'" @click="statusFilter = ADJUSTMENT_STATUS.EXECUTED">已执行</a-button>
				</div>
				<a-input v-model:value="search" type="text" placeholder="搜索订单ID、用户名..." class="w-full max-w-sm rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500" />
			</div>

			<div class="space-y-3 p-4">
				<article v-for="adj in filteredAdjustments" :key="adj.id" class="rounded-xl border border-slate-200 bg-white p-4">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div class="flex-1">
							<div class="flex items-center gap-2">
								<span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="adjustmentTypeMeta[adj.type].class">{{ adjustmentTypeMeta[adj.type].label }}</span>
								<span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="adjustmentStatusMeta[adj.status].class">{{ adjustmentStatusMeta[adj.status].label }}</span>
								<span class="text-sm text-slate-500">{{ adj.requestedAt }}</span>
							</div>
							<div class="mt-2 text-sm text-slate-700">
								<p><span class="font-medium">订单:</span> {{ adj.orderId }} · <span class="font-medium">用户:</span> {{ adj.userName }}</p>
								<p class="mt-1"><span class="font-medium">金额:</span> {{ fmtCurrency(adj.amount, adj.currency) }}</p>
								<p class="mt-1"><span class="font-medium">原因:</span> {{ adj.reason }}</p>
								<p class="mt-1 text-xs text-slate-500">操作人: {{ adj.requestedBy }}</p>
							</div>
						</div>
						<div v-if="adj.status === ADJUSTMENT_STATUS.PENDING" class="flex gap-2">
							<a-button type="text" html-type="button" class="rounded-lg border border-emerald-500 px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50" @click="approveAdjustment(adj.id)">批准</a-button>
							<a-button type="text" html-type="button" class="rounded-lg border border-rose-500 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50" @click="rejectAdjustment(adj.id)">拒绝</a-button>
						</div>
						<div v-else-if="adj.status === ADJUSTMENT_STATUS.APPROVED" class="flex gap-2">
							<a-button type="text" html-type="button" class="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700" @click="executeAdjustment(adj.id)">执行</a-button>
						</div>
					</div>
				</article>
			</div>
		</article>

		<!-- 调整申请弹窗：Teleport 到 body，遮罩铺满视口 -->
		<Teleport to="body">
			<a-modal :wrap-props="{ 'aria-modal': true }" transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :open="Boolean(showAdjustmentModal)" :mask-closable="false" :closable="false" :keyboard="false" :width="448"  :destroy-on-close="true" wrap-class-name="admin-trading-modal" :body-style="{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 180px)' }" @cancel="showAdjustmentModal = false">
<template #title><template v-if="showAdjustmentModal"><header class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
					<h2 class="text-xl font-semibold text-slate-900">新建调整</h2>
					<a-button aria-label="关闭" type="text" html-type="button" class="text-2xl text-slate-400" @click="showAdjustmentModal = false">×</a-button>
				</header></template></template>
<template v-if="showAdjustmentModal">

				<div class="space-y-4 px-5 py-4">
					<label class="space-y-1">
						<span class="text-sm font-medium">订单ID</span>
						<a-input v-model:value="adjustmentForm.orderId" type="text" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
					</label>

					<label class="space-y-1">
						<span class="text-sm font-medium">调整类型</span>
						<a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="adjustmentForm.type" class="w-full">
							<a-select-option :value="ADJUSTMENT_TYPE.ADD_INTEREST">补息</a-select-option>
							<a-select-option :value="ADJUSTMENT_TYPE.DEDUCT_INTEREST">扣息</a-select-option>
							<a-select-option :value="ADJUSTMENT_TYPE.EXTEND">展期</a-select-option>
							<a-select-option :value="ADJUSTMENT_TYPE.EARLY_REDEEM">提前赎回</a-select-option>
						</a-select>
					</label>

					<label class="space-y-1">
						<span class="text-sm font-medium">金额</span>
						<a-input v-model:value.number="adjustmentForm.amount" type="number" step="0.0001" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
					</label>

					<label class="space-y-1">
						<span class="text-sm font-medium">原因说明</span>
						<a-textarea v-model:value="adjustmentForm.reason" rows="3" class="w-full rounded-lg border border-slate-300 px-3 py-2"></a-textarea>
					</label>
				</div>

				</template>
<template #footer><template v-if="showAdjustmentModal"><footer class="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
					<a-button type="text" html-type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700" @click="showAdjustmentModal = false">取消</a-button>
					<a-button type="text" html-type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white" @click="saveAdjustment">提交</a-button>
				</footer></template></template>
</a-modal>
		</Teleport>
	</section>
</template>
