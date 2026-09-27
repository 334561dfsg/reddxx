<template>
	<Teleport to="body">
		<a-modal :wrap-props="{ 'aria-modal': true }" transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :open="Boolean(showAdjustmentModal)" :mask-closable="false" :closable="false" :keyboard="false" :width="512"  :destroy-on-close="true" wrap-class-name="admin-trading-modal" :body-style="{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 180px)' }" @cancel="showAdjustmentModal = false">
<template #title><template v-if="showAdjustmentModal"><header class="flex items-center justify-between border-b border-slate-200 px-5 py-4 flex-shrink-0">
					<div>
						<h2 class="text-lg font-semibold text-slate-900">订单收益调整</h2>
						<p class="text-xs text-slate-500 mt-0.5">仅作用于当前订单，提交后可在「收益调整记录」中查询</p>
					</div>
					<a-button type="text" html-type="button" class="text-slate-400 hover:text-slate-600 p-1" aria-label="关闭" @click="showAdjustmentModal = false">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</a-button>
				</header></template></template>
<template v-if="showAdjustmentModal">

				<div class="flex-1 overflow-y-auto p-5 space-y-4">
					<div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm space-y-1.5">
						<div class="flex justify-between gap-3">
							<span class="text-slate-500 shrink-0">订单</span>
							<span class="font-mono text-xs text-slate-900 text-right break-all">{{ adjustmentForm.orderId }}</span>
						</div>
						<div class="flex justify-between gap-3">
							<span class="text-slate-500">产品</span>
							<span class="text-slate-900 text-right">{{ adjustmentForm.productName }}</span>
						</div>
						<div class="flex justify-between gap-3">
							<span class="text-slate-500">币种</span>
							<span class="font-medium text-slate-900">{{ adjustmentForm.currency }}</span>
						</div>
					</div>

					<div class="space-y-3">
						<label class="block text-sm font-medium text-slate-700 mb-1.5">调整类型</label>
						<a-select :get-popup-container="(trigger) => trigger.parentElement"
							v-model:value="adjustmentForm.type"
							class="w-full"
						>
							<a-select-option v-for="(meta, key) in adjustmentTypeMeta" :key="key" :value="key">
								{{ meta.label }}
							</a-select-option>
						</a-select>
						<div class="rounded-lg border px-3 py-2.5 text-xs" :class="activeTypeConfig.tipClass">
							<div class="font-medium">{{ activeTypeConfig.title }}</div>
							<p class="mt-1 leading-5">{{ activeTypeConfig.desc }}</p>
						</div>
					</div>

					<div v-if="activeTypeConfig.showAmount">
						<label class="block text-sm font-medium text-slate-700 mb-1.5">
							{{ activeTypeConfig.amountLabel }} <span class="text-red-500">*</span>
						</label>
						<div class="flex gap-2">
							<a-input
								v-model:value.number="adjustmentForm.amount"
								type="number"
								step="0.01"
								min="0"
								class="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
								:placeholder="activeTypeConfig.amountPlaceholder"
							/>
							<span class="flex w-20 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700">
								{{ adjustmentForm.currency }}
							</span>
						</div>
						<p class="mt-1.5 text-xs leading-5 text-slate-500">{{ activeTypeConfig.amountHelp }}</p>
						<div v-if="adjustmentForm.currency === 'USDT'" class="mt-2 flex flex-wrap gap-1.5">
							<a-button type="text"
								v-for="preset in amountPresetsUsdt"
								:key="preset"
								html-type="button"
								class="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:border-blue-300 hover:bg-blue-50"
								@click="adjustmentForm.amount = preset"
							>
								+{{ preset }}
							</a-button>
						</div>
					</div>

					<div v-if="activeTypeConfig.showPercentage">
						<label class="block text-sm font-medium text-slate-700 mb-1.5">
							{{ activeTypeConfig.percentageLabel }} <span class="text-red-500">*</span>
						</label>
						<div class="flex gap-2">
							<a-input
								v-model:value.number="adjustmentForm.percentage"
								type="number"
								step="0.01"
								min="0"
								class="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
								:placeholder="activeTypeConfig.percentagePlaceholder"
							/>
							<span class="flex w-20 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700">
								%
							</span>
						</div>
						<p class="mt-1.5 text-xs leading-5 text-slate-500">{{ activeTypeConfig.percentageHelp }}</p>
					</div>

					<div>
						<label class="block text-sm font-medium text-slate-700 mb-1.5">原因说明 <span class="text-red-500">*</span></label>
						<div class="mb-2 flex flex-wrap gap-1.5">
							<a-button type="text"
								v-for="t in reasonTemplates"
								:key="t"
								html-type="button"
								class="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:border-blue-300 hover:bg-blue-50"
								@click="adjustmentForm.reason = t"
							>
								{{ t }}
							</a-button>
						</div>
						<a-textarea
							v-model:value="adjustmentForm.reason"
							rows="3"
							maxlength="200"
							class="w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
							:class="adjustmentForm.reason.trim() ? 'border-slate-300' : 'border-red-200 bg-red-50/50'"
							:placeholder="activeTypeConfig.reasonPlaceholder"
						/>
					</div>

					<p class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
						{{ activeTypeConfig.warning }}
					</p>
				</div>

				</template>
<template #footer><template v-if="showAdjustmentModal"><footer class="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 flex-shrink-0 bg-slate-50">
					<a-button type="text" html-type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100" @click="showAdjustmentModal = false">
						取消
					</a-button>
					<a-button type="text"
						html-type="button"
						class="rounded-lg px-4 py-2 text-sm font-medium text-white transition"
						:class="isFormValid ? 'bg-blue-600 hover:bg-blue-700' : 'cursor-not-allowed bg-slate-400'"
						:disabled="!isFormValid"
						@click="saveAdjustment"
					>
						提交调整
					</a-button>
				</footer></template></template>
</a-modal>
	</Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import {
	ADJUSTMENT_TYPE,
	adjustmentTypeMeta
} from '../../../admin/constants/aiQuant'
import {
	AI_QUANT_OP_ACTION,
	AI_QUANT_OP_MODULE
} from '../../../admin/constants/aiQuantOperationLog'
import { aiQuantYieldAdjustments } from '../../../admin/state/aiQuantYieldAdjustments'
import { appendAiQuantOperationLog } from '../../../admin/state/aiQuantOperationLogs'

const amountPresetsUsdt = [100, 500, 1000, 5000]

const adjustmentFormConfig = {
	[ADJUSTMENT_TYPE.BONUS]: {
		showAmount: true,
		showPercentage: false,
		title: '直接补发收益',
		desc: '用于活动奖励、VIP 激励、人工补偿等场景。只需要填写补发金额，提交后这笔金额会作为额外收益增加到当前订单。',
		tipClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
		amountLabel: '补发金额',
		amountPlaceholder: '输入要补发的收益金额',
		amountHelp: '只填写实际要补给用户的收益额，不需要填写收益率。',
		reasonPlaceholder: '例如：VIP3 升级奖励，补发 500 USDT',
		warning: '提交后将增加当前订单收益；请确认补发金额和币种无误。',
		reasons: ['活动奖励补发', 'VIP 激励', '客服补偿', '运营活动奖励']
	},
	[ADJUSTMENT_TYPE.PENALTY]: {
		showAmount: true,
		showPercentage: false,
		title: '直接扣减收益',
		desc: '用于违规套利、风控处罚、重复领取奖励等场景。只需要填写扣减金额，提交后这笔金额会从当前订单收益中扣除。',
		tipClass: 'border-rose-200 bg-rose-50 text-rose-800',
		amountLabel: '扣减金额',
		amountPlaceholder: '输入要扣减的收益金额',
		amountHelp: '只填写需要扣减的绝对金额，系统会按违规惩罚类型处理为扣减。',
		reasonPlaceholder: '例如：违规领取活动奖励，扣减 0.05 BTC',
		warning: '提交后将扣减当前订单收益；请确认扣减依据已完成审核。',
		reasons: ['违规扣减', '重复奖励扣回', '风控处罚', '套利行为处理']
	},
	[ADJUSTMENT_TYPE.CORRECTION]: {
		showAmount: true,
		showPercentage: false,
		title: '修正收益差额',
		desc: '用于系统少计、数据同步延迟、人工核账差异等场景。只需要填写需要补正的差额；如果是负向扣减，请改选「违规惩罚」。',
		tipClass: 'border-sky-200 bg-sky-50 text-sky-800',
		amountLabel: '修正差额',
		amountPlaceholder: '输入需要修正的差额',
		amountHelp: '当前修正按正向差额记录；如果需要扣减，请选择「违规惩罚」。',
		reasonPlaceholder: '例如：系统少计 2 天收益，补正 0.1 ETH',
		warning: '提交后将按数据修正记录入账；请在原因中写明核算依据。',
		reasons: ['系统差错修正', '收益少计补正', '数据同步延迟', '人工核账修正']
	},
	[ADJUSTMENT_TYPE.INCREASE]: {
		showAmount: true,
		showPercentage: true,
		title: '部分本金提高收益率',
		desc: '用于临时加息、定向提息等场景。填写“影响本金金额”和“提升收益率”：影响本金按提升后的收益率计算，未覆盖的剩余本金仍按默认收益率计算。',
		tipClass: 'border-violet-200 bg-violet-50 text-violet-800',
		amountLabel: '影响本金金额',
		amountPlaceholder: '输入本次调整覆盖的本金金额',
		amountHelp: '例如订单本金 100 USDT，本次只对 70 USDT 提升收益率，就填 70；剩余 30 USDT 仍按默认收益。',
		percentageLabel: '提升收益率',
		percentagePlaceholder: '例如 0.05 表示提升 0.05%',
		percentageHelp: '这里填写“增加多少个百分点”，不是填写调整后的最终收益率。',
		reasonPlaceholder: '例如：定向活动加息，对 70 USDT 本金提升收益率 0.05%',
		warning: '提交后将按收益提升记录生效；请同时确认收益率幅度和影响本金金额。',
		reasons: ['活动加息', 'VIP 激励', '定向提息', '运营补贴']
	},
	[ADJUSTMENT_TYPE.DECREASE]: {
		showAmount: true,
		showPercentage: true,
		title: '部分本金降低收益率',
		desc: '用于风险调降、异常策略降息等场景。填写“影响本金金额”和“降低收益率”：影响本金按降低后的收益率计算，未覆盖的剩余本金仍按默认收益率计算。',
		tipClass: 'border-orange-200 bg-orange-50 text-orange-800',
		amountLabel: '影响本金金额',
		amountPlaceholder: '输入本次调整覆盖的本金金额',
		amountHelp: '例如订单本金 100 USDT，本次只对 70 USDT 降低收益率，就填 70；剩余 30 USDT 仍按默认收益。',
		percentageLabel: '降低收益率',
		percentagePlaceholder: '例如 0.03 表示降低 0.03%',
		percentageHelp: '这里填写“降低多少个百分点”，不是填写调整后的最终收益率。',
		reasonPlaceholder: '例如：策略风险调降，对 70 USDT 本金降低收益率 0.03%',
		warning: '提交后将按收益降低记录生效；请同时确认收益率幅度和影响本金金额。',
		reasons: ['风险调降', '策略异常降息', '收益配置修正', '风控处理']
	}
}

const showAdjustmentModal = ref(false)
const adjustmentForm = reactive({
	type: ADJUSTMENT_TYPE.BONUS,
	targetType: 'order',
	targetId: '',
	targetName: '',
	orderId: '',
	productName: '',
	amount: 0,
	currency: 'USDT',
	percentage: null,
	reason: ''
})

const activeTypeConfig = computed(() => adjustmentFormConfig[adjustmentForm.type] || adjustmentFormConfig[ADJUSTMENT_TYPE.BONUS])
const reasonTemplates = computed(() => activeTypeConfig.value.reasons)

watch(
	() => adjustmentForm.type,
	() => {
		adjustmentForm.amount = 0
		adjustmentForm.percentage = null
		adjustmentForm.reason = ''
	}
)

const openForOrder = (order) => {
	adjustmentForm.type = ADJUSTMENT_TYPE.BONUS
	adjustmentForm.targetType = 'order'
	adjustmentForm.targetId = ''
	adjustmentForm.targetName = ''
	adjustmentForm.orderId = order.id
	adjustmentForm.productName = order.productName
	adjustmentForm.currency = order.currency
	adjustmentForm.amount = 0
	adjustmentForm.percentage = null
	adjustmentForm.reason = ''
	showAdjustmentModal.value = true
}

const saveAdjustment = () => {
	const orderId = adjustmentForm.orderId.trim()
	const hasPercentage = activeTypeConfig.value.showPercentage
	const payload = {
		...adjustmentForm,
		amount: Number(adjustmentForm.amount || 0),
		percentage: hasPercentage ? Number(adjustmentForm.percentage || 0) : null,
		targetId: orderId,
		targetName: `订单 ${orderId}`
	}

	const adjId = `adj-${Date.now()}`
	aiQuantYieldAdjustments.value.unshift({
		id: adjId,
		...payload,
		operator: 'admin-001',
		operatorName: 'Current Admin',
		createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
	})

	const typeLabel = adjustmentTypeMeta[payload.type]?.label ?? payload.type
	const reasonShort = payload.reason.trim().length > 80 ? `${payload.reason.trim().slice(0, 80)}…` : payload.reason.trim()
	appendAiQuantOperationLog({
		module: AI_QUANT_OP_MODULE.YIELD_ADJUSTMENT,
		action: AI_QUANT_OP_ACTION.YIELD_ADJUSTMENT_SUBMIT,
		refId: orderId,
		targetLabel: '订单收益调整',
		summary: hasPercentage
			? `类型：${typeLabel}；收益率变动 ${payload.percentage}%；影响本金 ${payload.amount} ${payload.currency}；原因：${reasonShort}`
			: `类型：${typeLabel}；金额 ${payload.amount} ${payload.currency}；原因：${reasonShort}`,
		operator: 'admin-001'
	})

	showAdjustmentModal.value = false
}

const isFormValid = computed(() => {
	const hasReason = Boolean(adjustmentForm.reason.trim() && adjustmentForm.orderId.trim())
	if (!hasReason) return false
	const hasAmount = !activeTypeConfig.value.showAmount || Number(adjustmentForm.amount) > 0
	const hasPercentage = !activeTypeConfig.value.showPercentage || Number(adjustmentForm.percentage) > 0
	return hasAmount && hasPercentage
})

defineExpose({ openForOrder })
</script>
