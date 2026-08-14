<script setup>
import { ref, computed } from 'vue'
import {
	LIQUIDITY_LOCKED_OP_ACTION,
	LIQUIDITY_LOCKED_OP_MODULE
} from '../../../admin/constants/liquidityLockedOperationLog'
import {
	appendLockedYieldAdjustmentLog,
	lockedYieldAdjustmentLogs
} from '../../../admin/state/lockedYieldAdjustmentLogs'
import { appendLiquidityLockedOperationLog } from '../../../admin/state/liquidityLockedOperationLogs'

// 产品数据（baseRate 为年化 %，与锁仓产品配置一致）
const products = ref([
	{
		id: 'prod-001',
		ruleId: 'USDT-7D',
		name: 'USDT锁仓宝',
		currency: 'USDT',
		lockDays: 7,
		baseRate: 11,
		currentMultiplier: 1.0,
		adjustmentRate: 0,
		totalOrders: 156,
		totalAmount: 2580000,
		status: 'active'
	},
	{
		id: 'prod-002',
		ruleId: 'USDT-30D',
		name: 'USDT锁仓宝',
		currency: 'USDT',
		lockDays: 30,
		baseRate: 9.13,
		currentMultiplier: 1.2,
		adjustmentRate: 20,
		totalOrders: 89,
		totalAmount: 890000,
		status: 'active'
	},
	{
		id: 'prod-003',
		ruleId: 'USDT-90D',
		name: 'USDT锁仓宝',
		currency: 'USDT',
		lockDays: 90,
		baseRate: 10.22,
		currentMultiplier: 0.9,
		adjustmentRate: -10,
		totalOrders: 124,
		totalAmount: 1560000,
		status: 'active'
	}
])

// 搜索
const keyword = ref('')
const filteredProducts = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return products.value
  return products.value.filter((item) => 
    `${item.name} ${item.currency} ${productRuleLabel(item)} ${item.ruleId} ${fmtApr(item.baseRate)}`.toLowerCase().includes(kw)
  )
})

// 汇总数据
const summary = computed(() => {
  const total = products.value.length
  const active = products.value.filter((item) => item.status === 'active').length
  const adjusted = products.value.filter((item) => item.adjustmentRate !== 0).length
  const totalAmount = products.value.reduce((sum, item) => sum + item.totalAmount, 0)
  
  return [
    { label: '产品总数', value: String(total) },
    { label: '运行中', value: String(active) },
    { label: '已调整', value: String(adjusted) },
    { label: '资金规模', value: `$${(totalAmount / 1000000).toFixed(2)}M` }
  ]
})

// 控制弹窗
const showControlModal = ref(false)
const activeProductId = ref('')
const activeProduct = computed(() => 
  products.value.find((item) => item.id === activeProductId.value)
)

const productRuleLabel = (product) => {
	const days = Number(product?.lockDays)
	return days > 0 ? `${days}天规则` : '—'
}

const productControlIdentity = (product) => {
	if (!product) return '—'
	return `${product.name} · ${productRuleLabel(product)} · ${product.currency}`
}

const controlForm = ref({
	adjustmentRate: 0,
	reason: '',
	/** YYYY-MM-DD，空字符串表示持续生效（需手动恢复基准） */
	validUntil: ''
})

const openControl = (productId) => {
  const product = products.value.find((p) => p.id === productId)
  activeProductId.value = productId
	controlForm.value = {
		adjustmentRate: product.adjustmentRate,
		reason: '',
		validUntil: ''
	}
  showControlModal.value = true
}

function formatYieldLogTime() {
	const d = new Date()
	const parts = new Intl.DateTimeFormat('zh-CN', {
		timeZone: 'Asia/Shanghai',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	}).formatToParts(d)
	const get = (t) => parts.find((x) => x.type === t)?.value ?? ''
	return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`
}

const saveControl = () => {
	const product = products.value.find((p) => p.id === activeProductId.value)
	if (!product) return
	const afterRate = controlForm.value.adjustmentRate
	const afterMultiplier = 1 + afterRate / 100
	const until = controlForm.value.validUntil?.trim()
	const durationLabel = until ? `有效期至 ${until}` : '持续生效'

	appendLockedYieldAdjustmentLog({
		productId: product.id,
		productName: productControlIdentity(product),
		currency: product.currency,
		beforeRate: product.adjustmentRate,
		afterRate,
		beforeMultiplier: product.currentMultiplier,
		afterMultiplier,
		durationLabel,
		actionType: 'adjust',
		operator: 'admin',
		reason: controlForm.value.reason.trim() || '—',
		createdAt: formatYieldLogTime()
	})

	const reasonShort = (controlForm.value.reason.trim() || '—').length > 60
		? `${(controlForm.value.reason.trim() || '—').slice(0, 60)}…`
		: controlForm.value.reason.trim() || '—'
	appendLiquidityLockedOperationLog({
		module: LIQUIDITY_LOCKED_OP_MODULE.YIELD_CONTROL,
		action: LIQUIDITY_LOCKED_OP_ACTION.YIELD_ADJUST,
		refId: product.id,
		targetLabel: productControlIdentity(product),
		summary: `调整收益：加成 ${product.adjustmentRate}% → ${afterRate}%；倍数 ${Number(product.currentMultiplier).toFixed(2)} → ${afterMultiplier.toFixed(2)}；${durationLabel}；${reasonShort}`
	})

	products.value = products.value.map((p) => {
		if (p.id === activeProductId.value) {
			return {
				...p,
				adjustmentRate: afterRate,
				currentMultiplier: afterMultiplier
			}
		}
		return p
	})
	showControlModal.value = false
}

const resetControl = (productId) => {
	const product = products.value.find((p) => p.id === productId)
	if (!product || product.adjustmentRate === 0) return

	appendLockedYieldAdjustmentLog({
		productId: product.id,
		productName: productControlIdentity(product),
		currency: product.currency,
		beforeRate: product.adjustmentRate,
		afterRate: 0,
		beforeMultiplier: product.currentMultiplier,
		afterMultiplier: 1,
		durationLabel: '—',
		actionType: 'reset',
		operator: 'admin',
		reason: '管理员重置为基准倍数',
		createdAt: formatYieldLogTime()
	})

	appendLiquidityLockedOperationLog({
		module: LIQUIDITY_LOCKED_OP_MODULE.YIELD_CONTROL,
		action: LIQUIDITY_LOCKED_OP_ACTION.YIELD_RESET,
		refId: product.id,
		targetLabel: productControlIdentity(product),
		summary: `重置为基准：加成 ${product.adjustmentRate}% → 0%；倍数 ${Number(product.currentMultiplier).toFixed(2)} → 1.00`
	})

	products.value = products.value.map((p) => {
		if (p.id === productId) {
			return {
				...p,
				adjustmentRate: 0,
				currentMultiplier: 1.0
			}
		}
		return p
	})
}

// 调整历史记录（与「收益调整日志」菜单共用数据）
const showHistoryModal = ref(false)
const historyProductId = ref('')

const filteredHistory = computed(() => {
	const list = lockedYieldAdjustmentLogs.value
	if (!historyProductId.value) return list
	return list.filter((item) => item.productId === historyProductId.value)
})

const openHistory = (productId = '') => {
  historyProductId.value = productId
  showHistoryModal.value = true
}

// 格式化显示
const formatRate = (rate) => {
  if (rate > 0) return `+${rate}%`
  if (rate < 0) return `${rate}%`
  return '0%'
}

const getRateColor = (rate) => {
	if (rate > 0) return 'text-emerald-600'
	if (rate < 0) return 'text-rose-600'
	return 'text-slate-600'
}

const YEAR_DAYS = 365

/** 收益率 × 倍数 → 展示用有效年化（%） */
function effectiveAnnualPct(baseAnnual, mult) {
	const b = Number(baseAnnual)
	const m = Number(mult)
	if (Number.isNaN(b) || Number.isNaN(m)) return 0
	return b * m
}

/** 单利：本金 × 年化% × 倍数 × (计息天数/365) */
function simpleInterestForDays(principal, annualPct, mult, days) {
	const p = Number(principal)
	const a = Number(annualPct)
	const m = Number(mult)
	const d = Number(days)
	if (Number.isNaN(p) || Number.isNaN(a) || Number.isNaN(m) || Number.isNaN(d)) return 0
	return (p * (a / 100) * m * d) / YEAR_DAYS
}

const fmtApr = (v) => (v == null || Number.isNaN(Number(v)) ? '—' : `${Number(v).toFixed(2)}%`)
const previewDays = (product) => {
	const days = Number(product?.lockDays)
	return days > 0 ? days : 30
}

/** 日期选择器最小可选日（本地自然日） */
const validUntilMin = computed(() => {
	const d = new Date()
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${y}-${m}-${day}`
})
</script>

<style scoped>
/* 美化滑块样式 */
.slider {
  -webkit-appearance: none;
  appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
}

.slider::-moz-range-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

/* 滑块轨道增强 */
.slider::-webkit-slider-runnable-track {
	height: 8px;
	border-radius: 9999px;
	background: linear-gradient(to right, #fecdd3 0%, #e2e8f0 50%, #bbf7d0 100%);
}

.slider::-moz-range-track {
	height: 8px;
	border-radius: 9999px;
	background: linear-gradient(to right, #fecdd3 0%, #e2e8f0 50%, #bbf7d0 100%);
}
</style>

<template>
	<section class="space-y-6">
		<header>
			<h1 class="text-3xl font-semibold tracking-tight text-slate-900">收益调控</h1>
			<p class="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
				平台作为对手方时，通过倍数调整报价侧收益；作用范围以「产品 / 同币种池」为准，与外部撮合市场无关。
			</p>
		</header>

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<div
				v-for="item in summary"
				:key="item.label"
				class="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm"
			>
				<div class="text-xs font-medium uppercase tracking-wide text-slate-500">{{ item.label }}</div>
				<div class="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{{ item.value }}</div>
			</div>
		</div>

		<article class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
			<div class="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
				<input
					v-model="keyword"
					type="search"
					placeholder="搜索产品名称、币种、天数或规则ID…"
					class="h-10 w-full max-w-sm rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none ring-blue-500/20 transition-shadow focus:border-blue-500 focus:ring-2"
				/>
				<div class="flex shrink-0 flex-wrap items-center gap-2">
					<RouterLink
						:to="{ name: 'liquidity-locked-yield-adjustment-log' }"
						class="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/80 hover:text-blue-800"
					>
						收益调整日志
					</RouterLink>
					<button
						type="button"
						class="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
						@click="openHistory('')"
					>
						弹窗历史
					</button>
				</div>
			</div>

			<div class="overflow-x-auto">
				<table class="w-full min-w-[640px] text-left text-sm">
					<thead class="border-b border-slate-100 bg-slate-50/90">
						<tr>
							<th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">产品</th>
							<th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">调整比例</th>
							<th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">订单数</th>
							<th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">资金规模</th>
							<th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">状态</th>
							<th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">操作</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						<tr
							v-for="product in filteredProducts"
							:key="product.id"
							class="transition-colors hover:bg-slate-50/80"
						>
							<td class="whitespace-nowrap px-4 py-3.5">
								<div class="font-medium text-slate-900">{{ product.name }}</div>
								<div class="mt-1 flex max-w-[24rem] flex-wrap gap-1.5 text-xs">
									<span class="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">{{ product.currency }}</span>
									<span class="rounded-md bg-blue-50 px-2 py-0.5 font-medium text-blue-700">{{ productRuleLabel(product) }}</span>
									<span class="rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">收益率 {{ fmtApr(product.baseRate) }}</span>
									<span class="rounded-md bg-slate-50 px-2 py-0.5 font-mono text-slate-500">ID {{ product.ruleId }}</span>
								</div>
							</td>
							<td class="whitespace-nowrap px-4 py-3.5">
								<span :class="['font-medium tabular-nums', getRateColor(product.adjustmentRate)]">
									{{ formatRate(product.adjustmentRate) }}
								</span>
							</td>
							<td class="whitespace-nowrap px-4 py-3.5 tabular-nums text-slate-700">{{ product.totalOrders }}</td>
							<td class="whitespace-nowrap px-4 py-3.5 tabular-nums text-slate-700">${{ product.totalAmount.toLocaleString() }}</td>
							<td class="whitespace-nowrap px-4 py-3.5">
								<span
									class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
									:class="product.status === 'active' ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/15' : 'bg-slate-100 text-slate-600'"
								>
									{{ product.status === 'active' ? '运行中' : '已停用' }}
								</span>
							</td>
							<td class="whitespace-nowrap px-4 py-3.5 text-right">
								<button type="button" class="font-medium text-blue-600 hover:text-blue-700" @click="openControl(product.id)">调整</button>
								<span class="mx-2 text-slate-200">|</span>
								<button
									v-if="product.adjustmentRate !== 0"
									type="button"
									class="font-medium text-slate-600 hover:text-slate-800"
									@click="resetControl(product.id)"
								>
									重置
								</button>
								<template v-if="product.adjustmentRate !== 0">
									<span class="mx-2 text-slate-200">|</span>
								</template>
								<button type="button" class="font-medium text-slate-600 hover:text-slate-800" @click="openHistory(product.id)">历史</button>
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div v-if="filteredProducts.length === 0" class="px-4 py-14 text-center text-slate-500">
				<p class="text-sm font-medium text-slate-700">未找到匹配的产品</p>
				<p class="mt-1 text-xs text-slate-500">请更换搜索关键词</p>
			</div>
		</article>

		<!-- 收益控制弹窗 -->
		<Teleport to="body">
			<div
				v-if="showControlModal"
				class="fixed inset-0 z-[100] flex min-h-[100dvh] w-full items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-6"
				role="dialog"
				aria-modal="true"
			>
				<div class="flex max-h-[min(92dvh,920px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10">
					<div class="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/90 px-5 py-4">
						<div>
							<h3 class="text-lg font-semibold text-slate-900">收益倍数调整</h3>
							<p class="mt-0.5 text-sm text-slate-500">{{ productControlIdentity(activeProduct) }} · ID {{ activeProduct?.ruleId || '—' }}</p>
						</div>
						<button
							type="button"
							class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-700"
							aria-label="关闭"
							@click="showControlModal = false"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>

					<div class="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
						<div class="flex min-h-0 flex-1 flex-col border-slate-100 lg:w-[58%] lg:border-r">
							<div class="flex-1 space-y-6 overflow-y-auto p-5">
								<div>
									<h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">滑块调整</h4>
									<div class="mt-3 flex items-center justify-between gap-3">
										<label class="text-sm text-slate-700">相对基准的调整比例</label>
										<div class="flex items-baseline gap-2 tabular-nums">
											<span class="text-xs text-slate-500">当前</span>
											<span class="text-base font-semibold" :class="getRateColor(controlForm.adjustmentRate)">
												{{ formatRate(controlForm.adjustmentRate) }}
											</span>
											<span class="text-xs text-slate-400">（{{ (1 + controlForm.adjustmentRate / 100).toFixed(2) }}×）</span>
										</div>
									</div>
									<div class="relative mt-2">
										<input
											v-model.number="controlForm.adjustmentRate"
											type="range"
											min="-100"
											max="100"
											step="5"
											class="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200"
										/>
										<div class="mt-1 flex justify-between text-[11px] text-slate-400">
											<span>−100%（0×）</span>
											<span>0%（1×）</span>
											<span>+100%（2×）</span>
										</div>
									</div>
									<div
										class="mt-3 rounded-lg border border-slate-200/80 bg-gradient-to-r from-rose-50/90 via-slate-50 to-emerald-50/90 px-3 py-2.5"
									>
										<div class="flex items-center justify-between text-[11px] font-medium text-slate-600">
											<span class="text-rose-700">压低用户端收益</span>
											<span class="text-slate-500">基准</span>
											<span class="text-emerald-700">抬高用户端收益</span>
										</div>
									</div>
								</div>

								<div>
									<h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">快捷场景</h4>
									<div class="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
										<button
											type="button"
											class="rounded-xl border px-3 py-2.5 text-left text-sm transition-all"
											:class="
												controlForm.adjustmentRate === 50
													? 'border-emerald-400 bg-emerald-50/80 ring-1 ring-emerald-500/20'
													: 'border-slate-200 bg-white hover:border-slate-300'
											"
											@click="controlForm.adjustmentRate = 50"
										>
											<div class="font-medium text-slate-900">强激励</div>
											<div class="mt-0.5 text-xs text-slate-500">+50%，拉新或竞品跟进</div>
										</button>
										<button
											type="button"
											class="rounded-xl border px-3 py-2.5 text-left text-sm transition-all"
											:class="
												controlForm.adjustmentRate === 20
													? 'border-blue-400 bg-blue-50/80 ring-1 ring-blue-500/20'
													: 'border-slate-200 bg-white hover:border-slate-300'
											"
											@click="controlForm.adjustmentRate = 20"
										>
											<div class="font-medium text-slate-900">温和上调</div>
											<div class="mt-0.5 text-xs text-slate-500">+20%，常规运营</div>
										</button>
										<button
											type="button"
											class="rounded-xl border px-3 py-2.5 text-left text-sm transition-all"
											:class="
												controlForm.adjustmentRate === -20
													? 'border-amber-400 bg-amber-50/80 ring-1 ring-amber-500/20'
													: 'border-slate-200 bg-white hover:border-slate-300'
											"
											@click="controlForm.adjustmentRate = -20"
										>
											<div class="font-medium text-slate-900">成本回收</div>
											<div class="mt-0.5 text-xs text-slate-500">−20%，缓和平台贴息</div>
										</button>
										<button
											type="button"
											class="rounded-xl border px-3 py-2.5 text-left text-sm transition-all"
											:class="
												controlForm.adjustmentRate === -40
													? 'border-rose-400 bg-rose-50/80 ring-1 ring-rose-500/20'
													: 'border-slate-200 bg-white hover:border-slate-300'
											"
											@click="controlForm.adjustmentRate = -40"
										>
											<div class="font-medium text-slate-900">紧急控费</div>
											<div class="mt-0.5 text-xs text-slate-500">−40%，压力情景</div>
										</button>
									</div>
								</div>

								<div class="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
									<h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">精确输入</h4>
									<label class="mt-3 block text-sm font-medium text-slate-700">调整比例（%）</label>
									<div class="mt-1.5 flex gap-2">
										<input
											v-model.number="controlForm.adjustmentRate"
											type="number"
											step="1"
											min="-100"
											max="100"
											class="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm tabular-nums text-slate-900 outline-none ring-blue-500/20 focus:border-blue-500 focus:ring-2"
											placeholder="−100～100"
										/>
										<button
											type="button"
											class="h-10 shrink-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
											@click="controlForm.adjustmentRate = 0"
										>
											清零
										</button>
									</div>
									<p class="mt-1.5 text-xs text-slate-500">
										倍数约 {{ (1 + controlForm.adjustmentRate / 100).toFixed(2) }}×；展示年化约
										{{ effectiveAnnualPct(activeProduct?.baseRate, 1 + controlForm.adjustmentRate / 100).toFixed(2) }}%（收益率 × 倍数）
									</p>

									<div class="mt-5 space-y-1.5">
										<label class="text-sm font-medium text-slate-700">有效期至</label>
										<div class="flex gap-2">
											<input
												v-model="controlForm.validUntil"
												type="date"
												:min="validUntilMin"
												autocomplete="off"
												class="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-blue-500/20 focus:border-blue-500 focus:ring-2"
											/>
											<button
												v-if="controlForm.validUntil"
												type="button"
												class="h-10 shrink-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
												@click="controlForm.validUntil = ''"
											>
												清空
											</button>
										</div>
										<p class="text-xs leading-relaxed text-slate-500">
											留空表示持续生效（需手动恢复基准）；选择日期表示该自然日结束后（按服务器日切）恢复基准。
										</p>
									</div>
								</div>

								<div>
									<div class="mb-2 flex items-center justify-between">
										<h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">
											调整原因 <span class="font-normal text-rose-600">（必填）</span>
										</h4>
										<span class="text-xs text-slate-400">{{ controlForm.reason.length }} / 200</span>
									</div>
									<div class="flex flex-wrap gap-2">
										<button
											type="button"
											class="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50/60"
											@click="controlForm.reason = '根据资金与风险情况，适度上调平台对手方报价以提升竞争力'"
										>
											策略调价
										</button>
										<button
											type="button"
											class="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50/60"
											@click="controlForm.reason = '为控制平台对手方成本，下调对用户展示的收益率'"
										>
											成本压降
										</button>
										<button
											type="button"
											class="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50/60"
											@click="controlForm.reason = '活动期临时上浮收益倍数，活动结束后按计划恢复'"
										>
											活动期
										</button>
										<button
											type="button"
											class="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50/60"
											@click="controlForm.reason = '风险与流动性管控需要，暂时下调收益倍数'"
										>
											风控收敛
										</button>
									</div>
									<textarea
										v-model="controlForm.reason"
										rows="5"
										maxlength="200"
										class="mt-2 w-full resize-none rounded-lg border px-3 py-2.5 text-sm leading-relaxed outline-none ring-blue-500/20 focus:ring-2"
										:class="
											!controlForm.reason.trim()
												? 'border-rose-200 bg-rose-50/50 text-slate-900 focus:border-rose-400'
												: 'border-slate-200 bg-white text-slate-900 focus:border-blue-500'
										"
										placeholder="说明背景、目的与预期持续影响，便于审计追溯。"
									/>
									<p
										v-if="!controlForm.reason.trim()"
										class="mt-2 flex items-center gap-1 rounded-md bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700"
									>
										须填写原因后方可提交
									</p>
									<p v-else class="mt-2 text-xs text-emerald-700">已填写，可提交</p>
								</div>
							</div>
						</div>

						<div class="flex min-h-0 flex-col border-t border-slate-100 bg-slate-50/90 lg:w-[42%] lg:border-t-0 lg:border-l">
							<div class="flex-1 space-y-4 overflow-y-auto p-5">
								<div>
									<h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">当前生效</h4>
									<div class="mt-2 space-y-0 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
										<div class="flex items-center justify-between border-b border-slate-100 py-2 text-sm">
											<span class="text-slate-500">周期规则</span>
											<span class="font-semibold text-slate-900">{{ productRuleLabel(activeProduct) }}</span>
										</div>
										<div class="flex items-center justify-between border-b border-slate-100 py-2 text-sm">
											<span class="text-slate-500">收益率（年化）</span>
											<span class="font-semibold tabular-nums text-slate-900">{{ fmtApr(activeProduct?.baseRate) }}</span>
										</div>
										<div class="flex items-center justify-between border-b border-slate-100 py-2 text-sm">
											<span class="text-slate-500">已挂调整</span>
											<span class="font-semibold tabular-nums" :class="getRateColor(activeProduct?.adjustmentRate)">
												{{ formatRate(activeProduct?.adjustmentRate) }}
											</span>
										</div>
										<div class="flex items-center justify-between py-2 text-sm">
											<span class="text-slate-500">展示年化</span>
											<span class="font-semibold tabular-nums text-emerald-700">
												{{ effectiveAnnualPct(activeProduct?.baseRate, activeProduct?.currentMultiplier).toFixed(2) }}%
											</span>
										</div>
									</div>
								</div>

								<div>
									<h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">提交后预览</h4>
									<div class="mt-2 space-y-2">
										<div class="rounded-xl border border-slate-200 bg-white/90 p-3">
											<div class="text-[11px] font-medium uppercase tracking-wide text-slate-400">调整前</div>
											<div class="mt-2 flex justify-between text-sm">
												<span class="text-slate-500">年化（含倍数）</span>
												<span class="font-semibold tabular-nums text-slate-900">
													{{ effectiveAnnualPct(activeProduct?.baseRate, activeProduct?.currentMultiplier).toFixed(2) }}%
												</span>
											</div>
											<div class="mt-1 flex justify-between text-sm">
												<span class="text-slate-500">{{ productRuleLabel(activeProduct) }}估算（1 万本金，单利）</span>
												<span class="font-semibold tabular-nums text-slate-900">
													{{
														simpleInterestForDays(
															10000,
															activeProduct?.baseRate,
															activeProduct?.currentMultiplier,
															previewDays(activeProduct)
														).toFixed(2)
													}}
												</span>
											</div>
										</div>
										<div class="flex justify-center text-slate-300">
											<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
											</svg>
										</div>
										<div
											class="rounded-xl border-2 p-3"
											:class="
												controlForm.adjustmentRate > 0
													? 'border-emerald-300 bg-emerald-50/60'
													: controlForm.adjustmentRate < 0
														? 'border-rose-300 bg-rose-50/60'
														: 'border-blue-200 bg-blue-50/50'
											"
										>
											<div
												class="text-[11px] font-medium uppercase tracking-wide"
												:class="
													controlForm.adjustmentRate > 0
														? 'text-emerald-800'
														: controlForm.adjustmentRate < 0
															? 'text-rose-800'
															: 'text-blue-800'
												"
											>
												调整后
											</div>
											<div class="mt-2 flex justify-between text-sm">
												<span class="text-slate-600">年化（含倍数）</span>
												<span
													class="font-bold tabular-nums"
													:class="
														controlForm.adjustmentRate > 0
															? 'text-emerald-800'
															: controlForm.adjustmentRate < 0
																? 'text-rose-800'
																: 'text-blue-800'
													"
												>
													{{
														effectiveAnnualPct(
															activeProduct?.baseRate,
															1 + controlForm.adjustmentRate / 100
														).toFixed(2)
													}}%
												</span>
											</div>
											<div class="mt-1 flex justify-between text-sm">
												<span class="text-slate-600">{{ productRuleLabel(activeProduct) }}估算（单利）</span>
												<span
													class="font-bold tabular-nums"
													:class="
														controlForm.adjustmentRate > 0
															? 'text-emerald-800'
															: controlForm.adjustmentRate < 0
																? 'text-rose-800'
																: 'text-blue-800'
													"
												>
													{{
														simpleInterestForDays(
															10000,
															activeProduct?.baseRate,
															1 + controlForm.adjustmentRate / 100,
															previewDays(activeProduct)
														).toFixed(2)
													}}
												</span>
											</div>
										</div>
									</div>
									<div
										class="mt-3 rounded-xl border border-blue-200/80 bg-gradient-to-br from-slate-50 to-blue-50/40 p-3"
									>
										<div class="text-[11px] text-slate-500">差额（10,000 {{ activeProduct?.currency }} × {{ previewDays(activeProduct) }} 天）</div>
										<div
											class="mt-1 text-base font-bold tabular-nums"
											:class="
												controlForm.adjustmentRate > 0
													? 'text-emerald-600'
													: controlForm.adjustmentRate < 0
														? 'text-rose-600'
														: 'text-slate-600'
											"
										>
											{{ controlForm.adjustmentRate > 0 ? '+' : ''
											}}{{
												(
													simpleInterestForDays(
														10000,
														activeProduct?.baseRate,
														1 + controlForm.adjustmentRate / 100,
														previewDays(activeProduct)
													) -
													simpleInterestForDays(
														10000,
														activeProduct?.baseRate,
														activeProduct?.currentMultiplier,
														previewDays(activeProduct)
													)
												).toFixed(2)
											}}
											{{ activeProduct?.currency }}
										</div>
										<p class="mt-1 text-[11px] text-slate-500">
											{{
												controlForm.adjustmentRate > 0
													? '用户侧展示收益上升，平台贴息增加'
													: controlForm.adjustmentRate < 0
														? '用户侧展示收益下降，平台成本压力减轻'
														: '与当前生效一致'
											}}
										</p>
									</div>
								</div>

								<div class="rounded-lg border border-amber-200/80 bg-amber-50/50 p-3 text-xs leading-relaxed text-amber-900">
									<span class="font-semibold">注意：</span>平台为对手方时，倍数以产品与池维度生效；预览为示意，最终以核心账务为准。
								</div>
							</div>
						</div>
					</div>

					<div
						class="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-white px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
					>
						<p class="text-xs text-slate-500">提交前请确认「有效期至」符合运营与风控预期。</p>
						<div class="flex justify-end gap-2">
							<button
								type="button"
								class="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
								@click="showControlModal = false"
							>
								取消
							</button>
							<button
								type="button"
								class="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
								:disabled="!controlForm.reason.trim()"
								@click="saveControl"
							>
								确认调整
							</button>
						</div>
					</div>
				</div>
			</div>
		</Teleport>

		<Teleport to="body">
			<div
				v-if="showHistoryModal"
				class="fixed inset-0 z-[100] flex min-h-[100dvh] w-full items-center justify-center overflow-y-auto bg-black/50 p-4"
				role="dialog"
				aria-modal="true"
			>
				<div
					class="flex max-h-[min(85dvh,720px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl"
				>
					<div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
						<h3 class="text-lg font-semibold text-slate-900">调整历史</h3>
						<button
							type="button"
							class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
							aria-label="关闭"
							@click="showHistoryModal = false"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
					<div class="flex-1 overflow-y-auto p-5">
						<div class="space-y-3">
							<article
								v-for="record in filteredHistory"
								:key="record.id"
								class="rounded-xl border border-slate-200/80 bg-slate-50/30 p-4"
							>
								<div class="flex flex-wrap items-start justify-between gap-2">
									<div>
										<div class="font-medium text-slate-900">{{ record.productName }}</div>
										<time class="mt-0.5 text-xs text-slate-500">{{ record.createdAt }}</time>
									</div>
									<span class="text-xs text-slate-500">操作人 {{ record.operator }}</span>
								</div>
								<div class="mt-3 grid grid-cols-2 gap-3 text-sm">
									<div>
										<span class="text-slate-500">调整前 </span>
										<span :class="['font-semibold tabular-nums', getRateColor(record.beforeRate)]">{{
											formatRate(record.beforeRate)
										}}</span>
									</div>
									<div>
										<span class="text-slate-500">调整后 </span>
										<span :class="['font-semibold tabular-nums', getRateColor(record.afterRate)]">{{
											formatRate(record.afterRate)
										}}</span>
									</div>
								</div>
								<p v-if="record.durationLabel && record.durationLabel !== '—'" class="mt-2 text-xs text-slate-500">
									生效策略：{{ record.durationLabel }}
								</p>
								<p class="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-100">
									<span class="font-medium text-slate-600">原因</span> {{ record.reason }}
								</p>
							</article>
						</div>
						<div v-if="filteredHistory.length === 0" class="py-12 text-center text-sm text-slate-500">暂无记录</div>
					</div>
					<div class="border-t border-slate-100 px-5 py-3 text-right">
						<button
							type="button"
							class="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
							@click="showHistoryModal = false"
						>
							关闭
						</button>
					</div>
				</div>
			</div>
		</Teleport>
	</section>
</template>
