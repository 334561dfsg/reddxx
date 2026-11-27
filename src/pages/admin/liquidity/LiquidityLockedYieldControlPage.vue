<script setup>
// 收益调控 — Ant Design Pro list page (2026-11-28): query card (one input per field instead of the combined keyword box),
// overview Statistics card, table card with toolbar/pagination and link actions. Dialog business logic is unchanged.
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Card, Col, Row, Space, Statistic, Tag, TypographyText } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
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

const router = useRouter()
const page = ref(1)

// 查询：产品名称、币种、锁仓天数（周期规则）与规则 ID 各自一个输入框，可区分同名产品的不同周期规则
const blank = () => ({ name: '', currency: 'all', lockDays: 'all', ruleId: '' })
const filters = ref(blank())
const fields = computed(() => [
	{ key: 'name', label: '产品名称' },
	{ key: 'currency', label: '币种', searchable: true, options: [{ value: 'all', label: '全部币种' }, ...[...new Set(products.value.map((item) => item.currency))].map((value) => ({ value, label: value }))] },
	{ key: 'lockDays', label: '周期规则', options: [{ value: 'all', label: '全部规则' }, ...[...new Set(products.value.map((item) => item.lockDays))].sort((a, b) => a - b).map((days) => ({ value: String(days), label: productRuleLabel({ lockDays: days }) }))] },
	{ key: 'ruleId', label: '规则 ID' }
])
const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
const filteredProducts = computed(() => {
	const f = filters.value
	return products.value.filter((item) =>
		has(item.name, f.name) && has(item.ruleId, f.ruleId) &&
		(f.currency === 'all' || item.currency === f.currency) &&
		(f.lockDays === 'all' || String(item.lockDays) === f.lockDays)
	)
})
function searchProducts(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function resetFilters() { filters.value = blank(); page.value = 1 }

const columns = [
	{ key: 'product', title: '产品', width: 300, fixed: 'left' },
	{ key: 'adjustmentRate', title: '调整比例', width: 110, align: 'right' },
	{ key: 'multiplier', title: '当前倍数', width: 110, align: 'right' },
	{ key: 'totalOrders', title: '订单数', width: 100, align: 'right' },
	{ key: 'totalAmount', title: '资金规模（USDT）', width: 170, align: 'right' },
	{ key: 'status', title: '状态', width: 90 },
	{ key: 'actions', title: '操作', width: 160, fixed: 'right' }
]

// 汇总数据（业务概览，资金规模按产品计价币种 USDT 展示，不再用 $ 前缀）
const summary = computed(() => {
  const total = products.value.length
  const active = products.value.filter((item) => item.status === 'active').length
  const adjusted = products.value.filter((item) => item.adjustmentRate !== 0).length
  const totalAmount = products.value.reduce((sum, item) => sum + item.totalAmount, 0)

  return [
    { label: '产品总数', value: total },
    { label: '运行中', value: active },
    { label: '已调整', value: adjusted },
    { label: '资金规模', value: totalAmount, suffix: 'USDT', precision: 0 }
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

const rateType = (rate) => {
	if (rate > 0) return 'success'
	if (rate < 0) return 'danger'
	return undefined
}

// 快捷场景（以按钮类型区分当前选中，不使用高亮描边）
const presetScenarios = [
	{ rate: 50, title: '强激励', hint: '+50%，拉新或竞品跟进' },
	{ rate: 20, title: '温和上调', hint: '+20%，常规运营' },
	{ rate: -20, title: '成本回收', hint: '−20%，缓和平台贴息' },
	{ rate: -40, title: '紧急控费', hint: '−40%，压力情景' }
]
const reasonPresets = [
	{ label: '策略调价', text: '根据资金与风险情况，适度上调平台对手方报价以提升竞争力' },
	{ label: '成本压降', text: '为控制平台对手方成本，下调对用户展示的收益率' },
	{ label: '活动期', text: '活动期临时上浮收益倍数，活动结束后按计划恢复' },
	{ label: '风控收敛', text: '风险与流动性管控需要，暂时下调收益倍数' }
]

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

<template>
	<PageShell>
		<SearchForm name="liquidity-locked-yield-control-filters" :model="filters" :fields="fields" @search="searchProducts" @reset="resetFilters" />

		<Card :bordered="false" title="调控概览">
			<Row :gutter="24">
				<Col v-for="item in summary" :key="item.label" :xs="12" :xl="6">
					<Statistic :title="item.label" :value="item.value" :suffix="item.suffix" :precision="item.precision" />
				</Col>
			</Row>
		</Card>

		<AdminTable title="收益调控" v-model:page="page" :rows="filteredProducts" :columns="columns" row-key="id" desktop-only>
			<template #toolbar>
				<Space :size="8">
					<Button @click="router.push({ name: 'liquidity-locked-yield-adjustment-log' })">收益调整日志</Button>
					<Button @click="openHistory('')">全部调整历史</Button>
				</Space>
			</template>
			<template #cell="{ column, record: product }">
				<Space v-if="column.key === 'product'" direction="vertical" :size="4">
					<TypographyText strong>{{ product.name }}</TypographyText>
					<span>
						<Tag>{{ product.currency }}</Tag>
						<Tag color="blue">{{ productRuleLabel(product) }}</Tag>
						<Tag>收益率 {{ fmtApr(product.baseRate) }}</Tag>
					</span>
					<TypographyText type="secondary" class="font-mono">ID {{ product.ruleId }}</TypographyText>
				</Space>
				<TypographyText v-else-if="column.key === 'adjustmentRate'" :type="rateType(product.adjustmentRate)" strong>
					{{ formatRate(product.adjustmentRate) }}
				</TypographyText>
				<template v-else-if="column.key === 'multiplier'">{{ Number(product.currentMultiplier).toFixed(2) }}×</template>
				<template v-else-if="column.key === 'totalAmount'">{{ product.totalAmount.toLocaleString() }}</template>
				<Tag v-else-if="column.key === 'status'" :color="product.status === 'active' ? 'green' : 'default'">{{ product.status === 'active' ? '运行中' : '已停用' }}</Tag>
				<Space v-else-if="column.key === 'actions'" :size="8">
					<Button type="link" class="px-0" @click="openControl(product.id)">调整</Button>
					<Button v-if="product.adjustmentRate !== 0" type="link" class="px-0" @click="resetControl(product.id)">重置</Button>
					<Button type="link" class="px-0" @click="openHistory(product.id)">历史</Button>
				</Space>
				<template v-else>{{ product[column.key] ?? '—' }}</template>
			</template>
		</AdminTable>

		<!-- 收益控制弹窗 -->
			<a-modal :wrap-props="{ 'aria-modal': true }" transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :open="Boolean(showControlModal)" :mask-closable="false" :closable="false" :keyboard="false" :width="1024"  :destroy-on-close="true" wrap-class-name="admin-trading-modal" :body-style="{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 180px)' }" @cancel="showControlModal = false">
<template #title><template v-if="showControlModal"><div class="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/90 px-5 py-4">
						<div>
							<h3 class="text-lg font-semibold text-slate-900">收益倍数调整</h3>
							<p class="mt-0.5 text-sm text-slate-500">{{ productControlIdentity(activeProduct) }} · ID {{ activeProduct?.ruleId || '—' }}</p>
						</div>
						<a-button type="text"
							html-type="button"
							class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-700"
							aria-label="关闭"
							@click="showControlModal = false"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</a-button>
					</div></template></template>
<template v-if="showControlModal">

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
										<a-slider
											v-model:value.number="controlForm.adjustmentRate"
											:min="-100"
											:max="100"
											:step="5"
											class="slider w-full"
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
										<Button
											v-for="preset in presetScenarios"
											:key="preset.rate"
											:type="controlForm.adjustmentRate === preset.rate ? 'primary' : 'default'"
											:aria-pressed="controlForm.adjustmentRate === preset.rate"
											class="h-auto text-left"
											@click="controlForm.adjustmentRate = preset.rate"
										>
											<div class="font-medium">{{ preset.title }}</div>
											<div class="mt-0.5 text-xs opacity-75">{{ preset.hint }}</div>
										</Button>
									</div>
								</div>

								<div class="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
									<h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">精确输入</h4>
									<label class="mt-3 block text-sm font-medium text-slate-700">调整比例（%）</label>
									<div class="mt-1.5 flex gap-2">
										<a-input
											v-model:value.number="controlForm.adjustmentRate"
											type="number"
											:step="1"
											min="-100"
											:max="100"
											class="min-w-0 flex-1"
											placeholder="−100～100"
										/>
										<Button class="shrink-0" @click="controlForm.adjustmentRate = 0">清零</Button>
									</div>
									<p class="mt-1.5 text-xs text-slate-500">
										倍数约 {{ (1 + controlForm.adjustmentRate / 100).toFixed(2) }}×；展示年化约
										{{ effectiveAnnualPct(activeProduct?.baseRate, 1 + controlForm.adjustmentRate / 100).toFixed(2) }}%（收益率 × 倍数）
									</p>

									<div class="mt-5 space-y-1.5">
										<label class="text-sm font-medium text-slate-700">有效期至</label>
										<div class="flex gap-2">
											<a-input
												v-model:value="controlForm.validUntil"
												type="date"
												:min="validUntilMin"
												autocomplete="off"
												class="min-w-0 flex-1"
											/>
											<Button v-if="controlForm.validUntil" class="shrink-0" @click="controlForm.validUntil = ''">清空</Button>
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
									<Space :size="8" wrap>
										<Button v-for="preset in reasonPresets" :key="preset.label" size="small" @click="controlForm.reason = preset.text">{{ preset.label }}</Button>
									</Space>
									<a-textarea
										v-model:value="controlForm.reason"
										:rows="5"
										:maxlength="200"
										class="mt-2 w-full resize-none"
										aria-label="调整原因"
										aria-required="true"
										aria-describedby="liquidity-yield-reason-hint"
										placeholder="说明背景、目的与预期持续影响，便于审计追溯。"
									/>
									<TypographyText id="liquidity-yield-reason-hint" type="secondary" class="mt-2 block text-xs">须填写原因后方可提交</TypographyText>
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

					</template>
<template #footer><template v-if="showControlModal"><div class="flex items-center justify-between gap-3">
						<TypographyText type="secondary">提交前请确认「有效期至」符合运营与风控预期。</TypographyText>
						<Space :size="8">
							<Button @click="showControlModal = false">取消</Button>
							<Button type="primary" :disabled="!controlForm.reason.trim()" @click="saveControl">确认调整</Button>
						</Space>
					</div></template></template>
</a-modal>

			<a-modal :wrap-props="{ 'aria-modal': true }" transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :open="Boolean(showHistoryModal)" :mask-closable="false" :closable="false" :keyboard="true" :width="768"  :destroy-on-close="true" wrap-class-name="admin-trading-modal" :body-style="{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 180px)' }" @cancel="showHistoryModal = false">
<template #title><template v-if="showHistoryModal"><div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
						<h3 class="text-lg font-semibold text-slate-900">调整历史</h3>
						<a-button type="text"
							html-type="button"
							class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
							aria-label="关闭"
							@click="showHistoryModal = false"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</a-button>
					</div></template></template>
<template v-if="showHistoryModal">
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
								<p class="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
									<span class="font-medium text-slate-600">原因</span> {{ record.reason }}
								</p>
							</article>
						</div>
						<div v-if="filteredHistory.length === 0" class="py-12 text-center text-sm text-slate-500">暂无记录</div>
					</div>
					</template>
<template #footer><template v-if="showHistoryModal"><Button @click="showHistoryModal = false">关闭</Button></template></template>
</a-modal>
	</PageShell>
</template>
