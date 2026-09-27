
<script setup>
import { ref, reactive, computed } from 'vue'
import {
	PRODUCT_STATUS,
	productStatusMeta,
	PURCHASE_LIMIT_TYPE,
	COMMON_FILTER_ALL,
	SUPPORTED_CURRENCIES,
	LOCK_PERIODS,
	LOCKED_MIN_VIP_OPTIONS,
	LOCKED_MIN_KYC_OPTIONS,
	DEFAULT_LOCKED_LENDABLE_RATIO,
	lockYieldAnnualPct,
	lockedMinKycLabel,
	sortLiquidityLockedProducts
} from '../../../admin/constants/liquidityLocked'
import {
	LIQUIDITY_LOCKED_OP_ACTION,
	LIQUIDITY_LOCKED_OP_MODULE
} from '../../../admin/constants/liquidityLockedOperationLog'
import { appendLiquidityLockedOperationLog } from '../../../admin/state/liquidityLockedOperationLogs'
import { lockedProductsCatalog } from '../../../admin/state/financeCatalogs'

const products = lockedProductsCatalog
const search = ref('')
const statusFilter = ref(COMMON_FILTER_ALL)
const currencyFilter = ref(COMMON_FILTER_ALL)

const showProductModal = ref(false)
const editingProductId = ref('')
const productModalTab = ref('config')

const productForm = reactive({
	name: '',
	currency: 'USDT',
	productCurrency: 'USDT',
	periods: [],
	earlyRedeemEnabled: true,
	earlyRedeemFee: 4,
	purchaseLimitType: PURCHASE_LIMIT_TYPE.LIFETIME,
	lifetimeLimit: 50000,
	periodLimit: 10000,
	periodDays: 30,
	minVipLevel: 0,
	minKycLevel: 'none',
	status: PRODUCT_STATUS.ENABLED,
	sortOrder: 0
})

const openCreateProduct = () => {
	editingProductId.value = ''
	productForm.name = ''
	productForm.currency = 'USDT'
	productForm.productCurrency = 'USDT'
	productForm.periods = [{ days: 10, annualRate: 12, minAmount: 100, maxAmount: 5000 }]
	productForm.earlyRedeemEnabled = true
	productForm.earlyRedeemFee = 4
	productForm.purchaseLimitType = PURCHASE_LIMIT_TYPE.LIFETIME
	productForm.lifetimeLimit = 50000
	productForm.periodLimit = 10000
	productForm.periodDays = 30
	productForm.minVipLevel = 0
	productForm.minKycLevel = 'none'
	productForm.status = PRODUCT_STATUS.ENABLED
	productForm.sortOrder = Math.max(0, ...products.value.map((product) => Number(product.sortOrder) || 0)) + 10
	productModalTab.value = 'config'
	showProductModal.value = true
}

const openEditProduct = (product) => {
	editingProductId.value = product.id
	productForm.name = product.name
	productForm.currency = product.currency
	productForm.productCurrency = product.productCurrency ?? product.currency
	productForm.periods = product.periods.map((p) => ({
		days: p.days,
		annualRate: lockYieldAnnualPct(p),
		minAmount: p.minAmount,
		maxAmount: p.maxAmount
	}))
	productForm.earlyRedeemEnabled = product.earlyRedeemEnabled
	productForm.earlyRedeemFee = product.earlyRedeemFee
	productForm.purchaseLimitType = product.purchaseLimitType
	productForm.lifetimeLimit = product.lifetimeLimit
	productForm.periodLimit = product.periodLimit
	productForm.periodDays = product.periodDays
	productForm.minVipLevel = product.minVipLevel ?? 0
	productForm.minKycLevel = product.minKycLevel ?? 'none'
	productForm.status = product.status
	productForm.sortOrder = Number(product.sortOrder ?? 0)
	productModalTab.value = 'config'
	showProductModal.value = true
}

const addPeriod = () => {
	productForm.periods.push({ days: 10, annualRate: 12, minAmount: 100, maxAmount: 5000 })
}

const removePeriod = (index) => {
	productForm.periods.splice(index, 1)
}

const saveProduct = () => {
	const payload = {
		name: productForm.name.trim(),
		currency: productForm.currency,
		productCurrency: productForm.productCurrency,
		icon: productForm.currency === 'USDT' ? '₮' : productForm.currency === 'BTC' ? '₿' : productForm.currency === 'ETH' ? 'Ξ' : productForm.currency,
		periods: productForm.periods.map((p) => ({
			days: Number(p.days),
			annualRate: Number(p.annualRate),
			minAmount: Number(p.minAmount),
			maxAmount: Number(p.maxAmount)
		})),
		earlyRedeemEnabled: productForm.earlyRedeemEnabled,
		earlyRedeemFee: Number(productForm.earlyRedeemFee),
		purchaseLimitType: productForm.purchaseLimitType,
		lifetimeLimit: Number(productForm.lifetimeLimit),
		periodLimit: Number(productForm.periodLimit),
		periodDays: Number(productForm.periodDays),
		minVipLevel: Number(productForm.minVipLevel) || 0,
		minKycLevel: productForm.minKycLevel || 'none',
		status: productForm.status,
		sortOrder: Number(productForm.sortOrder)
	}

	if (editingProductId.value) {
		products.value = products.value.map(p => p.id === editingProductId.value ? { ...p, ...payload } : p)
		appendLiquidityLockedOperationLog({
			module: LIQUIDITY_LOCKED_OP_MODULE.PRODUCT,
			action: LIQUIDITY_LOCKED_OP_ACTION.PRODUCT_UPDATE,
			refId: editingProductId.value,
			targetLabel: payload.name,
			summary: `编辑产品：${payload.currency} · ${payload.periods.length} 个周期档位`
		})
	} else {
		const newId = `prod-${Date.now()}`
		products.value.unshift({
			id: newId,
			...payload,
			lendableRatio: DEFAULT_LOCKED_LENDABLE_RATIO,
			totalLocked: 0,
			totalOrders: 0,
			createdAt: new Date().toISOString().split('T')[0]
		})
		appendLiquidityLockedOperationLog({
			module: LIQUIDITY_LOCKED_OP_MODULE.PRODUCT,
			action: LIQUIDITY_LOCKED_OP_ACTION.PRODUCT_CREATE,
			refId: newId,
			targetLabel: payload.name,
			summary: `新建产品：${payload.currency} · ${payload.periods.length} 个周期档位`
		})
	}

	showProductModal.value = false
}

const filteredProducts = computed(() => {
	const kw = search.value.trim().toLowerCase()
	return sortLiquidityLockedProducts(products.value.filter((p) => {
		const matchStatus = statusFilter.value === COMMON_FILTER_ALL || p.status === statusFilter.value
		const matchCurrency = currencyFilter.value === COMMON_FILTER_ALL || p.currency === currencyFilter.value
		const matchKeyword = !kw || `${p.name} ${p.currency}`.toLowerCase().includes(kw)
		return matchStatus && matchCurrency && matchKeyword
	}))
})

const toggleProductStatus = (product) => {
	const prevStatus = product.status
	const newStatus =
		product.status === PRODUCT_STATUS.ENABLED ? PRODUCT_STATUS.DISABLED : PRODUCT_STATUS.ENABLED
	products.value = products.value.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p))
	appendLiquidityLockedOperationLog({
		module: LIQUIDITY_LOCKED_OP_MODULE.PRODUCT,
		action: LIQUIDITY_LOCKED_OP_ACTION.PRODUCT_STATUS,
		refId: product.id,
		targetLabel: product.name,
		summary: `产品状态：${productStatusMeta[prevStatus].label} → ${productStatusMeta[newStatus].label}`
	})
}

const copyProductId = async (productId) => {
	try {
		await navigator.clipboard.writeText(productId)
		alert('产品ID已复制到剪贴板')
	} catch {
		const textarea = document.createElement('textarea')
		textarea.value = productId
		textarea.style.position = 'fixed'
		textarea.style.opacity = '0'
		document.body.appendChild(textarea)
		textarea.select()
		try {
			document.execCommand('copy')
			alert('产品ID已复制到剪贴板')
		} catch {
			alert('复制失败，请手动复制')
		}
		document.body.removeChild(textarea)
	}
}

const minVipOptionLabel = (level) =>
	LOCKED_MIN_VIP_OPTIONS.find((o) => o.value === (level ?? 0))?.label ?? '无要求'

/** 单利：本金 × 年化% × (天数/365) */
const previewLockInterest = (principal, annualPct, days) => {
	const p = Number(principal)
	const a = Number(annualPct)
	const d = Number(days)
	if (Number.isNaN(p) || Number.isNaN(a) || Number.isNaN(d)) return 0
	return (p * (a / 100) * d) / 365
}

const fmtNumber = (val, decimals = 2) => Number(val).toFixed(decimals)
const fmtCurrency = (val, currency, decimals = 2) => {
	if (currency === 'BTC' || currency === 'ETH') return `${fmtNumber(val, decimals === 2 ? 4 : decimals)} ${currency}`
	return `${Number(val).toLocaleString()} ${currency}`
}

const applyPresetDays = (days) => {
	if (productForm.periods.some((p) => Number(p.days) === days)) return
	productForm.periods.push({ days, annualRate: 12, minAmount: 100, maxAmount: 5000 })
}
</script>

<template>
	<section class="space-y-5">
		<header class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-semibold text-slate-900">产品管理</h1>
				<p class="mt-1 text-sm text-slate-500">配置锁仓产品、多档年化收益、赎回与限购及申购门槛</p>
			</div>
			<a-button type="text"
				html-type="button"
				class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
				@click="openCreateProduct"
			>
				+ 创建产品
			</a-button>
		</header>

		<div class="rounded-xl border border-slate-200 bg-white p-4">
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div>
					<a-input
						v-model:value="search"
						type="search"
						placeholder="搜索产品名称或币种"
						class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
					/>
				</div>
				<div>
					<a-select :get-popup-container="(trigger) => trigger.parentElement"
						v-model:value="statusFilter"
						class="w-full transition"
					>
						<a-select-option :value="COMMON_FILTER_ALL">全部状态</a-select-option>
						<a-select-option v-for="(meta, key) in productStatusMeta" :key="key" :value="key">{{ meta.label }}</a-select-option>
					</a-select>
				</div>
				<div>
					<a-select :get-popup-container="(trigger) => trigger.parentElement"
						v-model:value="currencyFilter"
						class="w-full transition"
					>
						<a-select-option :value="COMMON_FILTER_ALL">全部币种</a-select-option>
						<a-select-option v-for="currency in SUPPORTED_CURRENCIES" :key="currency" :value="currency">{{ currency }}</a-select-option>
					</a-select>
				</div>
			</div>
		</div>

		<article class="overflow-hidden rounded-xl border border-slate-200 bg-white">
			<a-table  size="small" :pagination="false" :data-source="filteredProducts" :row-key="(product) => product.id" :scroll="{ x: 'max-content' }" :custom-row="(product, rowIndex) => ({ class: [&quot;transition hover:bg-slate-50&quot;] })">
<a-table-column key="column-0" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-6 py-4&quot;] })">
<template #title>产品信息</template>
<template #default="{ record: product, index: rowIndex }">
							<div class="font-medium text-slate-900">{{ product.name }}</div>
							<div class="mt-0.5 flex items-center gap-1.5">
								<span class="font-mono text-xs text-slate-400">{{ product.id }}</span>
								<a-button type="text"
									html-type="button"
									class="rounded p-0.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
									title="复制产品ID"
									@click="copyProductId(product.id)"
								>
									<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
										/>
									</svg>
								</a-button>
							</div>
							<div class="mt-1 text-sm text-slate-500">{{ product.currency }} · {{ product.periods.length }} 档</div>
						</template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-6 py-4&quot;] })">
<template #title>锁仓与年化</template>
<template #default="{ record: product, index: rowIndex }">
							<div class="space-y-1 text-xs">
								<div
									v-for="(period, idx) in product.periods"
									:key="idx"
									class="flex items-center justify-between gap-2"
								>
									<span class="text-slate-600">{{ period.days }} 天</span>
									<span class="font-medium text-emerald-600">{{ lockYieldAnnualPct(period).toFixed(2) }}%</span>
								</div>
							</div>
						</template>
</a-table-column>
<a-table-column key="column-2" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-6 py-4 text-sm text-slate-600&quot;] })">
<template #title>提前赎回</template>
<template #default="{ record: product, index: rowIndex }">
							<span v-if="product.earlyRedeemEnabled" class="text-amber-700">违约金 {{ product.earlyRedeemFee }}%</span>
							<span v-else>不支持</span>
						</template>
</a-table-column>
<a-table-column key="column-3" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-6 py-4 text-sm text-slate-600&quot;] })">
<template #title>限购与门槛</template>
<template #default="{ record: product, index: rowIndex }">
							<div v-if="product.purchaseLimitType === PURCHASE_LIMIT_TYPE.LIFETIME">终身 {{ fmtCurrency(product.lifetimeLimit, product.currency) }}</div>
							<div v-else-if="product.purchaseLimitType === PURCHASE_LIMIT_TYPE.PERIOD">
								{{ product.periodDays }} 天 / {{ fmtCurrency(product.periodLimit, product.currency) }}
							</div>
							<div v-else>不限购</div>
							<div class="mt-1 text-xs text-slate-500">
								{{ minVipOptionLabel(product.minVipLevel) }} · {{ lockedMinKycLabel(product.minKycLevel) }}
							</div>
						</template>
</a-table-column>
<a-table-column key="column-4" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-6 py-4 text-sm text-slate-600&quot;] })">
<template #title>运营数据</template>
<template #default="{ record: product, index: rowIndex }">
							<div>锁仓 {{ fmtCurrency(product.totalLocked, product.currency) }}</div>
							<div>订单 {{ product.totalOrders }} 笔</div>
						</template>
</a-table-column>
<a-table-column key="column-5" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-6 py-4&quot;] })">
<template #title>状态</template>
<template #default="{ record: product, index: rowIndex }">
							<span :class="['rounded-full px-2 py-1 text-xs font-medium', productStatusMeta[product.status].class]">
								{{ productStatusMeta[product.status].label }}
							</span>
						</template>
</a-table-column>
<a-table-column key="column-6" align="right" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-6 py-4 text-right&quot;] })">
<template #title>操作</template>
<template #default="{ record: product, index: rowIndex }">
							<a-button type="text"
								html-type="button"
								class="mr-3 text-sm font-medium text-blue-600 transition hover:text-blue-800"
								@click="openEditProduct(product)"
							>
								编辑
							</a-button>
							<a-button type="text"
								html-type="button"
								class="text-sm font-medium text-slate-600 transition hover:text-slate-800"
								@click="toggleProductStatus(product)"
							>
								{{ product.status === PRODUCT_STATUS.ENABLED ? '下架' : '上架' }}
							</a-button>
						</template>
</a-table-column>
</a-table>
			<div v-if="filteredProducts.length === 0" class="py-12 text-center text-slate-500">暂无产品数据</div>
		</article>

		<Teleport to="body">
			<a-modal :wrap-props="{ 'aria-modal': true }" transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :open="Boolean(showProductModal)" :mask-closable="false" :closable="false" :keyboard="false" :width="1152"  :destroy-on-close="true" wrap-class-name="admin-trading-modal" :body-style="{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 180px)' }" @cancel="showProductModal = false">
<template #title><template v-if="showProductModal"><div class="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
						<div>
							<h2 class="text-xl font-semibold text-slate-900">{{ editingProductId ? '编辑产品' : '创建产品' }}</h2>
							<p class="mt-1 text-sm text-slate-500">配置产品信息，右侧实时预览效果</p>
						</div>
						<a-button aria-label="关闭" type="text" html-type="button" class="text-slate-400 transition hover:text-slate-600" @click="showProductModal = false">
							<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</a-button>
					</div></template></template>
<template v-if="showProductModal">

					<div class="flex min-h-0 flex-1 overflow-hidden">
						<div class="flex w-3/5 flex-col border-r border-slate-200">
							<div class="shrink-0 border-b border-slate-200 px-6">
								<div class="flex gap-1">
									<a-button type="text"
										html-type="button"
										:class="[
											'border-b-2 px-4 py-3 text-sm font-medium transition-colors',
											productModalTab === 'config'
												? 'border-blue-600 text-blue-600'
												: 'border-transparent text-slate-600 hover:text-slate-900'
										]"
										@click="productModalTab = 'config'"
									>
										产品配置
									</a-button>
									<a-button type="text"
										html-type="button"
										:class="[
											'border-b-2 px-4 py-3 text-sm font-medium transition-colors',
											productModalTab === 'rules'
												? 'border-blue-600 text-blue-600'
												: 'border-transparent text-slate-600 hover:text-slate-900'
										]"
										@click="productModalTab = 'rules'"
									>
										计算规则
									</a-button>
								</div>
							</div>
							<div class="flex-1 overflow-y-auto p-6">
							<div v-show="productModalTab === 'config'" class="space-y-6">
								<div>
									<h3 class="mb-3 font-semibold text-slate-900">基础信息</h3>
									<div class="grid grid-cols-2 gap-4">
										<div>
											<label class="mb-1 block text-sm font-medium text-slate-700">产品名称</label>
											<a-input
												v-model:value="productForm.name"
												type="text"
												placeholder="例如：USDT 稳健锁仓"
												class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
											/>
										</div>
										<div>
											<label class="mb-1 block text-sm font-medium text-slate-700">计价币种</label>
											<a-select :get-popup-container="(trigger) => trigger.parentElement"
											v-model:value="productForm.currency"
											class="w-full transition"
										>
											<a-select-option v-for="curr in SUPPORTED_CURRENCIES" :key="curr" :value="curr">{{ curr }}</a-select-option>
										</a-select>
									</div>
									<div>
										<label class="mb-1 block text-sm font-medium text-slate-700">产品品种</label>
										<a-select :get-popup-container="(trigger) => trigger.parentElement"
											v-model:value="productForm.productCurrency"
											class="w-full transition"
										>
											<a-select-option v-for="curr in SUPPORTED_CURRENCIES" :key="curr" :value="curr">{{ curr }}</a-select-option>
										</a-select>
									</div>
									<div>
											<label class="mb-1 block text-sm font-medium text-slate-700">产品状态</label>
											<a-select :get-popup-container="(trigger) => trigger.parentElement"
												v-model:value="productForm.status"
												class="w-full max-w-md transition"
											>
												<a-select-option :value="PRODUCT_STATUS.ENABLED">上架中（可申购）</a-select-option>
												<a-select-option :value="PRODUCT_STATUS.DISABLED">已下架</a-select-option>
												<a-select-option :value="PRODUCT_STATUS.SOLD_OUT">已售罄</a-select-option>
											</a-select>
										</div>
										<div>
											<label class="mb-1 block text-sm font-medium text-slate-700">产品排序</label>
											<a-input
												v-model:value.number="productForm.sortOrder"
												type="number"
												placeholder="数字越大越靠前"
												class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
											/>
											<p class="mt-1 text-xs text-slate-500">数字越大越靠前</p>
										</div>
									</div>
								</div>

								<div>
									<div class="mb-3 flex items-center justify-between">
										<h3 class="font-semibold text-slate-900">锁仓与收益</h3>
										<a-button type="text"
											html-type="button"
											class="text-sm font-medium text-blue-600 transition hover:text-blue-800"
											@click="addPeriod"
										>
											+ 添加档位
										</a-button>
									</div>
									<p class="mb-3 text-xs text-slate-500">年化按单利口径展示；常用天数可一键追加。</p>
									<div class="mb-3 flex flex-wrap gap-2">
										<a-button type="text"
											v-for="d in LOCK_PERIODS"
											:key="d"
											html-type="button"
											class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
											@click="applyPresetDays(d)"
										>
											{{ d }} 天
										</a-button>
									</div>
									<div class="space-y-3">
										<div
											v-for="(period, idx) in productForm.periods"
											:key="idx"
											class="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
										>
											<div class="flex-1 space-y-2">
												<div class="grid grid-cols-2 gap-2">
													<label class="block">
														<span class="mb-1 block text-xs font-medium text-slate-600">锁仓天数（天）</span>
														<a-input
															v-model:value.number="period.days"
															type="number"
															min="1"
															placeholder="请输入天数"
															class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
														/>
													</label>
													<label class="block">
														<span class="mb-1 block text-xs font-medium text-slate-600">年化收益率（%）</span>
														<a-input
															v-model:value.number="period.annualRate"
															type="number"
															min="0"
															step="0.01"
															placeholder="请输入年化收益率"
															class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
														/>
													</label>
												</div>
												<div class="grid grid-cols-2 gap-2">
													<label class="block">
														<span class="mb-1 block text-xs font-medium text-slate-600">最低申购金额（{{ productForm.currency }}）</span>
														<a-input
															v-model:value.number="period.minAmount"
															type="number"
															min="0"
															step="0.01"
															placeholder="请输入最低申购金额"
															class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
														/>
													</label>
													<label class="block">
														<span class="mb-1 block text-xs font-medium text-slate-600">最高申购金额（{{ productForm.currency }}）</span>
														<a-input
															v-model:value.number="period.maxAmount"
															type="number"
															min="0"
															step="0.01"
															placeholder="请输入最高申购金额"
															class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
														/>
													</label>
												</div>
											</div>
											<a-button type="text"
												html-type="button"
												class="mt-1 text-sm text-red-600 transition hover:text-red-800"
												@click="removePeriod(idx)"
											>
												删除
											</a-button>
										</div>
									</div>
								</div>

								<div>
									<h3 class="mb-3 font-semibold text-slate-900">赎回规则</h3>
									<div class="space-y-3">
										<label class="flex items-center">
											<a-checkbox v-model:checked="productForm.earlyRedeemEnabled" class="mr-2" />
											<span class="text-sm text-slate-700">允许提前赎回</span>
										</label>
										<div v-if="productForm.earlyRedeemEnabled">
											<label class="mb-1 block text-sm font-medium text-slate-700">违约金（占本金 %）</label>
											<a-input
												v-model:value.number="productForm.earlyRedeemFee"
												type="number"
												min="0"
												step="0.1"
												class="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
											/>
										</div>
									</div>
								</div>

								<div>
									<h3 class="mb-3 font-semibold text-slate-900">限购规则</h3>
									<div class="grid grid-cols-3 gap-3">
										<a-button type="text"
											html-type="button"
											:class="[
												'rounded-lg border-2 p-3 text-center text-sm transition',
												productForm.purchaseLimitType === PURCHASE_LIMIT_TYPE.NONE
													? 'border-blue-500 bg-blue-50 text-blue-800'
													: 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
											]"
											@click="productForm.purchaseLimitType = PURCHASE_LIMIT_TYPE.NONE"
										>
											<div class="font-semibold">不限购</div>
										</a-button>
										<a-button type="text"
											html-type="button"
											:class="[
												'rounded-lg border-2 p-3 text-center text-sm transition',
												productForm.purchaseLimitType === PURCHASE_LIMIT_TYPE.LIFETIME
													? 'border-blue-500 bg-blue-50 text-blue-800'
													: 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
											]"
											@click="productForm.purchaseLimitType = PURCHASE_LIMIT_TYPE.LIFETIME"
										>
											<div class="font-semibold">终身限购</div>
										</a-button>
										<a-button type="text"
											html-type="button"
											:class="[
												'rounded-lg border-2 p-3 text-center text-sm transition',
												productForm.purchaseLimitType === PURCHASE_LIMIT_TYPE.PERIOD
													? 'border-blue-500 bg-blue-50 text-blue-800'
													: 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
											]"
											@click="productForm.purchaseLimitType = PURCHASE_LIMIT_TYPE.PERIOD"
										>
											<div class="font-semibold">周期限购</div>
										</a-button>
									</div>
									<div v-if="productForm.purchaseLimitType === PURCHASE_LIMIT_TYPE.LIFETIME" class="mt-4">
										<label class="mb-1 block text-sm font-medium text-slate-700">终身限购额度</label>
										<a-input
											v-model:value.number="productForm.lifetimeLimit"
											type="number"
											min="0"
											class="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
										/>
									</div>
									<div v-if="productForm.purchaseLimitType === PURCHASE_LIMIT_TYPE.PERIOD" class="mt-4 grid grid-cols-2 gap-4">
										<div>
											<label class="mb-1 block text-sm font-medium text-slate-700">周期天数</label>
											<a-input
												v-model:value.number="productForm.periodDays"
												type="number"
												min="1"
												class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
											/>
										</div>
										<div>
											<label class="mb-1 block text-sm font-medium text-slate-700">周期内限额</label>
											<a-input
												v-model:value.number="productForm.periodLimit"
												type="number"
												min="0"
												class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
											/>
										</div>
									</div>
									<div class="mt-4 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">
										<div>
											<label class="mb-1 block text-sm font-medium text-slate-700">最低 VIP</label>
											<a-select :get-popup-container="(trigger) => trigger.parentElement"
												v-model:value.number="productForm.minVipLevel"
												class="w-full transition"
											>
												<a-select-option v-for="opt in LOCKED_MIN_VIP_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</a-select-option>
											</a-select>
										</div>
										<div>
											<label class="mb-1 block text-sm font-medium text-slate-700">最低认证</label>
											<a-select :get-popup-container="(trigger) => trigger.parentElement"
												v-model:value="productForm.minKycLevel"
												class="w-full transition"
											>
												<a-select-option v-for="opt in LOCKED_MIN_KYC_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</a-select-option>
											</a-select>
										</div>
									</div>
								</div>
							</div>

							<div v-show="productModalTab === 'rules'" class="space-y-4">
								<div class="rounded-xl border border-blue-200 bg-blue-50 p-4">
									<h3 class="text-sm font-semibold text-blue-900">收益计算</h3>
									<p class="mt-2 text-sm leading-relaxed text-blue-900">
										锁仓收益按固定年化单利估算：锁仓本金 × 年化收益率 × 锁仓天数 / 365。收益按用户锁定的币种数量计算，不按法币价格折算。
									</p>
								</div>

								<div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
									<h3 class="text-sm font-semibold text-emerald-900">到期结算</h3>
									<p class="mt-2 text-sm leading-relaxed text-emerald-900">
										订单锁满对应周期后，到期自动解锁本金并一次性返还本金与累计收益；持有期间收益可在订单中累计展示。
									</p>
								</div>

								<div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
									<h3 class="text-sm font-semibold text-amber-900">提前赎回</h3>
									<p class="mt-2 text-sm leading-relaxed text-amber-900">
										若产品开启提前赎回，提前赎回时按本金扣除违约金，已累计收益不发放；未开启提前赎回的产品，用户需持有到期。
									</p>
									<p class="mt-2 text-xs text-amber-800">
										例：本金 5000 USDT，违约金 4%，提前赎回返还 5000 × 96% = 4800 USDT。
									</p>
								</div>

								<div class="rounded-xl border border-slate-200 bg-white p-4">
									<h3 class="text-sm font-semibold text-slate-900">限购与门槛</h3>
									<ul class="mt-2 space-y-2 text-sm leading-relaxed text-slate-700">
										<li>• 终身限购按用户在该产品的历史累计锁仓金额判断。</li>
										<li>• 周期限购按配置周期内的累计申购金额判断。</li>
										<li>• VIP 与认证门槛在用户提交申购时校验，不影响已成立订单。</li>
									</ul>
								</div>

								<div class="rounded-xl border border-rose-200 bg-rose-50 p-4">
									<h3 class="text-sm font-semibold text-rose-900">风险提示</h3>
									<p class="mt-2 text-sm leading-relaxed text-rose-900">
										收益按币种数量计算，币价波动不会改变订单应返还数量，但会影响资产折算法币后的价值。
									</p>
								</div>
							</div>
							</div>
						</div>

						<div class="flex w-2/5 flex-col bg-slate-50">
							<div class="flex-1 space-y-4 overflow-y-auto p-6">
								<div>
									<h4 class="mb-3 flex items-center gap-2 text-sm font-medium text-slate-900">
										<svg class="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
												clip-rule="evenodd"
											/>
										</svg>
										产品卡片预览
									</h4>
									<div class="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
										<div class="flex items-start justify-between">
											<div class="flex items-center gap-3">
												<div
													class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-lg font-semibold text-white"
												>
													{{ productForm.currency.slice(0, 1) }}
												</div>
												<div>
													<div class="font-semibold text-slate-900">{{ productForm.name || '产品名称' }}</div>
													<div class="text-xs text-slate-500">
														{{ productForm.currency }} · {{ minVipOptionLabel(productForm.minVipLevel) }}
													</div>
												</div>
											</div>
											<span :class="['rounded-full px-2 py-1 text-xs font-medium', productStatusMeta[productForm.status].class]">
												{{ productStatusMeta[productForm.status].label }}
											</span>
										</div>
										<div class="flex items-center justify-between border-t border-slate-200 pt-2 text-sm">
											<span class="text-slate-600">提前赎回</span>
											<span class="font-medium text-slate-900">{{
												productForm.earlyRedeemEnabled ? `违约金 ${productForm.earlyRedeemFee}%` : '不支持'
											}}</span>
										</div>
									</div>
								</div>

								<div>
									<h4 class="mb-3 flex items-center gap-2 text-sm font-medium text-slate-900">
										<svg class="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
												clip-rule="evenodd"
											/>
										</svg>
										锁仓档位预览
									</h4>
									<div class="rounded-xl border border-slate-200 bg-white p-4">
										<div v-if="productForm.periods.length === 0" class="py-6 text-center text-sm text-slate-400">暂无档位</div>
										<div v-else class="space-y-2">
											<div
												v-for="(period, idx) in productForm.periods"
												:key="idx"
												class="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
											>
												<div>
													<div class="text-xs font-medium text-slate-900">锁仓 {{ period.days }} 天</div>
													<div class="text-xs text-slate-600">
														{{ period.minAmount }} – {{ period.maxAmount }} {{ productForm.currency }}
													</div>
												</div>
												<div class="text-right">
													<div class="text-sm font-semibold text-emerald-600">{{ Number(period.annualRate || 0).toFixed(2) }}%</div>
													<div class="text-xs text-slate-500">年化</div>
												</div>
											</div>
										</div>
									</div>
								</div>

								<div>
									<h4 class="mb-3 flex items-center gap-2 text-sm font-medium text-slate-900">
										<svg class="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
												clip-rule="evenodd"
											/>
										</svg>
										收益计算示例
									</h4>
									<div class="rounded-xl border border-slate-200 bg-white p-4">
										<div v-if="productForm.periods.length === 0" class="py-6 text-center text-sm text-slate-400">配置档位后查看</div>
										<div v-else class="space-y-3">
											<div
												v-for="(period, idx) in productForm.periods.slice(0, 2)"
												:key="idx"
												class="space-y-1 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-emerald-50 p-3 text-xs"
											>
												<div class="mb-1 text-slate-600">{{ period.days }} 天档 · 按单利估算</div>
												<div class="flex justify-between">
													<span class="text-slate-600">最小申购</span>
													<span class="font-medium text-slate-900">{{ period.minAmount }} {{ productForm.currency }}</span>
												</div>
												<div class="flex justify-between">
													<span class="text-slate-600">锁满期收益</span>
													<span class="font-semibold text-emerald-600">{{
														previewLockInterest(period.minAmount, period.annualRate, period.days).toFixed(4)
													}}
													{{ productForm.currency }}</span>
												</div>
												<div class="flex justify-between">
													<span class="text-slate-600">30 天等价</span>
													<span class="font-medium text-emerald-700">{{
														previewLockInterest(period.minAmount, period.annualRate, 30).toFixed(4)
													}}
													{{ productForm.currency }}</span>
												</div>
											</div>
										</div>
									</div>
								</div>

								<div>
									<h4 class="mb-3 flex items-center gap-2 text-sm font-medium text-slate-900">
										<svg class="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
												clip-rule="evenodd"
											/>
										</svg>
										规则摘要
									</h4>
									<div class="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
										<div class="flex gap-2">
											<span class="text-blue-600">•</span>
											<span>认证：{{ lockedMinKycLabel(productForm.minKycLevel) }}</span>
										</div>
										<div class="flex gap-2">
											<span class="text-blue-600">•</span>
											<span>
												限购：
												<template v-if="productForm.purchaseLimitType === PURCHASE_LIMIT_TYPE.LIFETIME"
													>终身 {{ productForm.lifetimeLimit }} {{ productForm.currency }}</template
												>
												<template v-else-if="productForm.purchaseLimitType === PURCHASE_LIMIT_TYPE.PERIOD"
													>{{ productForm.periodDays }} 天内 {{ productForm.periodLimit }} {{ productForm.currency }}</template
												>
												<template v-else>不限购</template>
											</span>
										</div>
										<div v-if="productForm.earlyRedeemEnabled" class="flex gap-2">
											<span class="text-blue-600">•</span>
											<span>提前赎回违约金 {{ productForm.earlyRedeemFee }}%</span>
										</div>
										<div v-else class="flex gap-2">
											<span class="text-amber-600">•</span>
											<span class="text-amber-800">不支持提前赎回</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					</template>
<template #footer><template v-if="showProductModal"><div class="flex shrink-0 justify-end gap-3 border-t border-slate-200 px-6 py-4">
						<a-button type="text"
							html-type="button"
							class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
							@click="showProductModal = false"
						>
							取消
						</a-button>
						<a-button type="text"
							html-type="button"
							class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
							@click="saveProduct"
						>
							保存产品
						</a-button>
					</div></template></template>
</a-modal>
		</Teleport>
	</section>
</template>
