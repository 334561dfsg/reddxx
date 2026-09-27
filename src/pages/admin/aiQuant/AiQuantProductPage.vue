<template>
	<section class="space-y-5">
		<header class="flex justify-between items-center">
			<div>
				<h1 class="text-3xl font-semibold text-slate-900">AI量化产品管理</h1>
				<p class="mt-1 text-sm text-slate-500">配置理财产品、收益阶梯及准入门槛</p>
			</div>
			<a-button type="text" @click="openCreateProduct" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
				+ 创建产品
			</a-button>
		</header>

		<!-- 筛选器 -->
		<div class="rounded-xl border border-slate-200 bg-white p-4">
			<div class="grid grid-cols-4 gap-4">
				<div>
					<a-input v-model:value="search" placeholder="搜索产品名称或币种" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
				</div>
				<div>
					<a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="statusFilter" class="w-full transition">
						<a-select-option :value="COMMON_FILTER_ALL">全部状态</a-select-option>
						<a-select-option v-for="(meta, key) in productStatusMeta" :key="key" :value="key">{{ meta.label }}</a-select-option>
					</a-select>
				</div>
				<div>
					<a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="currencyFilter" class="w-full transition">
						<a-select-option :value="COMMON_FILTER_ALL">全部币种</a-select-option>
						<a-select-option v-for="currency in SUPPORTED_CURRENCIES" :key="currency" :value="currency">{{ currency }}</a-select-option>
					</a-select>
				</div>
				<div>
					<a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="modeFilter" class="w-full transition">
						<a-select-option :value="COMMON_FILTER_ALL">全部模式</a-select-option>
						<a-select-option v-for="(meta, key) in operationModeMeta" :key="key" :value="key">{{ meta.label }}</a-select-option>
					</a-select>
				</div>
			</div>
		</div>

		<!-- 产品列表 -->
		<article class="rounded-xl border border-slate-200 bg-white overflow-hidden">
			<a-table  size="small" :pagination="false" :data-source="pagedProducts" :row-key="(product) => product.id" :scroll="{ x: 'max-content' }" :custom-row="(product, rowIndex) => ({ class: [&quot;transition hover:bg-slate-50&quot;] })">
<a-table-column key="column-0" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-6 py-4&quot;] })">
<template #title>产品信息</template>
<template #default="{ record: product, index: rowIndex }">
							<div>
								<div class="font-medium text-slate-900">{{ product.name }}</div>
								<div class="flex items-center gap-1.5 mt-0.5">
									<span class="text-xs text-slate-400 font-mono">{{ product.id }}</span>
									<a-button type="text"
										@click="copyProductId(product.id)"
										class="text-slate-400 hover:text-blue-600 transition p-0.5 rounded hover:bg-blue-50"
										title="复制产品ID"
									>
										<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
										</svg>
									</a-button>
								</div>
								<div class="text-sm text-slate-500 mt-1">{{ product.currency }} · {{ vipLevelMeta[product.minVipLevel].label }}+</div>
							</div>
						</template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-6 py-4&quot;] })">
<template #title>运营模式</template>
<template #default="{ record: product, index: rowIndex }">
							<div class="text-sm">
								<div class="font-medium text-slate-900">{{ operationModeMeta[product.operationMode].label }}</div>
								<div class="text-xs text-slate-500">托管 {{ formatAiQuantDurationLabel(product.durationDays) }}</div>
								<div class="text-xs text-slate-400">{{ settlementPeriodMeta[product.settlementPeriod].label }}</div>
							</div>
						</template>
</a-table-column>
<a-table-column key="column-2" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-6 py-4&quot;] })">
<template #title>收益阶梯</template>
<template #default="{ record: product, index: rowIndex }">
							<div class="text-xs space-y-1">
								<div v-for="(tier, idx) in product.tiers" :key="idx" class="flex items-center justify-between">
									<span class="text-slate-600">{{ tier.minAmount }}-{{ tier.maxAmount }} USDT</span>
									<span class="font-medium text-green-600">{{ tier.dailyRate }}%</span>
								</div>
							</div>
						</template>
</a-table-column>
<a-table-column key="column-3" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-6 py-4&quot;] })">
<template #title>限购规则</template>
<template #default="{ record: product, index: rowIndex }">
							<div class="text-sm text-slate-600">
								<div>单用户: {{ product.limitAmount }} USDT</div>
								<div>产品总额: {{ product.limitCount }} USDT</div>
								<div>次数: {{ product.monthlyLimitCount }}/月</div>
							</div>
						</template>
</a-table-column>
<a-table-column key="column-4" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-6 py-4&quot;] })">
<template #title>运营数据</template>
<template #default="{ record: product, index: rowIndex }">
							<div class="text-sm text-slate-600">
								<div>锁定: {{ product.totalLocked }} USDT</div>
								<div>订单: {{ product.totalOrders }} 笔</div>
								<div class="text-green-600">收益: {{ product.totalYield }} USDT</div>
							</div>
						</template>
</a-table-column>
<a-table-column key="column-5" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-6 py-4&quot;] })">
<template #title>状态</template>
<template #default="{ record: product, index: rowIndex }">
							<span :class="['px-2 py-1 text-xs rounded-full', productStatusMeta[product.status].color]">
								{{ productStatusMeta[product.status].label }}
							</span>
						</template>
</a-table-column>
<a-table-column key="column-6" align="right" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-6 py-4 text-right&quot;] })">
<template #title>操作</template>
<template #default="{ record: product, index: rowIndex }">
							<a-button type="text" @click="openEditProduct(product)" class="text-sm font-medium text-blue-600 hover:text-blue-800 transition mr-3">编辑</a-button>
							<a-button type="text" @click="toggleProductStatus(product)" class="text-sm font-medium text-slate-600 transition hover:text-slate-800">
								{{ product.status === PRODUCT_STATUS.ENABLED ? '禁用' : '启用' }}
							</a-button>
						</template>
</a-table-column>
</a-table>

			<AdminListPaginationBar
				v-model:current-page="productCurrentPage"
				v-model:page-size="productPageSize"
				:total-pages="productTotalPages"
				:total-count="productTotalCount"
			/>

			<div v-if="filteredProducts.length === 0" class="text-center py-12 text-slate-500">
				暂无产品数据
			</div>
		</article>

		<!-- 产品编辑弹窗：Teleport 到 body，避免落在 main overflow 内导致 fixed 遮罩无法全屏 -->
		<Teleport to="body">
			<a-modal :wrap-props="{ 'aria-modal': true }" transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :open="Boolean(showProductModal)" :mask-closable="false" :closable="false" :keyboard="false" :width="1152"  :destroy-on-close="true" wrap-class-name="admin-trading-modal" :body-style="{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 180px)' }" @cancel="showProductModal = false">
<template #title><template v-if="showProductModal"><div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
					<div>
						<h2 class="text-xl font-semibold text-slate-900">{{ editingProductId ? '编辑产品' : '创建产品' }}</h2>
						<p class="text-sm text-slate-500 mt-1">配置产品信息，右侧实时预览效果</p>
					</div>
					<a-button aria-label="关闭" type="text" @click="showProductModal = false" class="text-slate-400 hover:text-slate-600">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</a-button>
				</div></template></template>
<template v-if="showProductModal">

				<!-- 弹窗主体：左右分栏 -->
				<div class="flex-1 flex overflow-hidden">
					<!-- 左侧：表单编辑区域 (60%) -->
					<div class="w-3/5 border-r border-slate-200 flex flex-col">
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
							<!-- 基础信息 -->
							<div>
								<h3 class="font-semibold text-slate-900 mb-3">基础信息</h3>
								<div class="grid grid-cols-2 gap-4">
									<div>
										<label class="block text-sm font-medium text-slate-700 mb-1">产品名称</label>
										<a-input v-model:value="productForm.name" placeholder="例如：BTC 智能量化基金 A" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
									</div>
								<div>
									<label class="block text-sm font-medium text-slate-700 mb-1">计价币种</label>
									<a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="productForm.currency" class="w-full transition">
										<a-select-option v-for="currency in SUPPORTED_CURRENCIES" :key="currency" :value="currency">{{ currency }}</a-select-option>
									</a-select>
								</div>
								<div>
									<label class="block text-sm font-medium text-slate-700 mb-1">产品品种</label>
									<a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="productForm.productCurrency" class="w-full transition">
										<a-select-option v-for="currency in SUPPORTED_CURRENCIES" :key="currency" :value="currency">{{ currency }}</a-select-option>
									</a-select>
								</div>
								<div>
										<label class="block text-sm font-medium text-slate-700 mb-1">运营模式</label>
										<a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="productForm.operationMode" class="w-full transition">
											<a-select-option v-for="(meta, key) in operationModeMeta" :key="key" :value="key">{{ meta.label }}</a-select-option>
										</a-select>
									</div>
									<div>
										<label class="block text-sm font-medium text-slate-700 mb-1">最低 VIP 等级</label>
										<a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="productForm.minVipLevel" class="w-full transition">
											<a-select-option v-for="(meta, key) in vipLevelMeta" :key="key" :value="Number(key)">{{ meta.label }}</a-select-option>
										</a-select>
									</div>
								</div>
							</div>

							<!-- 托管与派息周期 -->
							<div>
								<h3 class="font-semibold text-slate-900 mb-3">托管与派息周期</h3>
								<div class="grid grid-cols-2 gap-4">
									<div>
										<label class="block text-sm font-medium text-slate-700 mb-1">托管周期</label>
										<a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value.number="productForm.durationDays" class="w-full transition">
											<a-select-option v-for="opt in aiQuantDurationOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</a-select-option>
										</a-select>
									</div>
									<div>
										<label class="block text-sm font-medium text-slate-700 mb-1">派息周期</label>
										<a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="productForm.settlementPeriod" class="w-full transition">
											<a-select-option v-for="(meta, key) in productFormSettlementPeriodMeta" :key="key" :value="key">{{ meta.label }}</a-select-option>
										</a-select>
									</div>
									<div v-if="productForm.settlementPeriod === SETTLEMENT_PERIOD.CUSTOM">
										<label class="block text-sm font-medium text-slate-700 mb-1">自定义天数</label>
										<a-input v-model:value.number="productForm.customDays" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
									</div>
								</div>
							</div>

							<!-- 收益阶梯 -->
								<div>
									<div class="flex justify-between items-center mb-3">
										<div>
											<h3 class="font-semibold text-slate-900">收益阶梯配置</h3>
											<p class="mt-1 text-xs leading-relaxed text-slate-500">
												用户申购金额落入对应区间后，按该档日收益率计算预估收益；区间请连续且不要重叠。
											</p>
										</div>
										<a-button type="text" @click="addTier" class="text-sm font-medium text-blue-600 hover:text-blue-800 transition">+ 添加阶梯</a-button>
									</div>
									<div class="space-y-3">
										<div v-for="(tier, idx) in productForm.tiers" :key="idx" class="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
											<div class="flex items-center justify-between gap-3">
												<div class="text-sm font-semibold text-slate-900">档位 {{ idx + 1 }}</div>
												<a-button type="text" @click="removeTier(idx)" class="text-sm text-red-600 transition hover:text-red-800">删除</a-button>
											</div>
											<div class="grid grid-cols-2 gap-3">
												<label class="block">
													<span class="mb-1 block text-xs font-medium text-slate-600">档位名称</span>
													<a-input v-model:value="tier.label" placeholder="例如：标准级" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
												</label>
												<label class="block">
													<span class="mb-1 block text-xs font-medium text-slate-600">日收益率（%）</span>
													<a-input v-model:value.number="tier.dailyRate" placeholder="例如：0.15" type="number" step="0.01" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
												</label>
											</div>
											<div>
												<div class="mb-1 flex items-center justify-between gap-2">
													<span class="text-xs font-medium text-slate-600">适用申购金额区间（USDT）</span>
													<span class="text-xs text-slate-400">单位：USDT</span>
												</div>
												<div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
													<a-input v-model:value.number="tier.minAmount" placeholder="最低金额" type="number" step="0.01" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
													<span class="text-xs text-slate-400">至</span>
													<a-input v-model:value.number="tier.maxAmount" placeholder="最高金额" type="number" step="0.01" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
												</div>
											</div>
										</div>
									</div>
								</div>

							<!-- 赎回规则 -->
							<div>
								<h3 class="font-semibold text-slate-900 mb-3">赎回规则</h3>
								<div class="space-y-3">
									<label class="flex items-center">
										<a-checkbox v-model:checked="productForm.earlyRedeemEnabled" class="mr-2" />
										<span class="text-sm text-slate-700">允许提前赎回</span>
									</label>
									<div v-if="productForm.earlyRedeemEnabled">
										<label class="block text-sm font-medium text-slate-700 mb-1">提前赎回手续费 (%)</label>
										<a-input v-model:value.number="productForm.earlyRedeemFeePercent" type="number" step="0.1" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
									</div>
								</div>
							</div>

							<!-- 限购规则 -->
							<div>
								<h3 class="font-semibold text-slate-900 mb-3">限购规则</h3>
								<div class="grid grid-cols-3 gap-4">
									<div>
										<label class="block text-sm font-medium text-slate-700 mb-1">单用户最大持仓（USDT）</label>
										<a-input v-model:value.number="productForm.limitAmount" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
									</div>
									<div>
										<label class="block text-sm font-medium text-slate-700 mb-1">产品总限额（USDT）</label>
										<a-input v-model:value.number="productForm.limitCount" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
									</div>
									<div>
										<label class="block text-sm font-medium text-slate-700 mb-1">月限购次数</label>
										<a-input v-model:value.number="productForm.monthlyLimitCount" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
									</div>
								</div>
							</div>

							<!-- 产品状态与排序 -->
							<div class="grid grid-cols-2 gap-4">
								<div>
									<label class="block text-sm font-medium text-slate-700 mb-1">产品状态</label>
									<a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="productForm.status" class="w-full transition">
										<a-select-option v-for="(meta, key) in productStatusMeta" :key="key" :value="key">{{ meta.label }}</a-select-option>
									</a-select>
								</div>
								<div>
									<label class="block text-sm font-medium text-slate-700 mb-1">产品排序</label>
									<a-input v-model:value.number="productForm.sortOrder" type="number" placeholder="数字越大越靠前" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
								</div>
							</div>
						</div>

						<div v-show="productModalTab === 'rules'" class="space-y-4">
							<div class="rounded-xl border border-blue-200 bg-blue-50 p-4">
								<h3 class="text-sm font-semibold text-blue-900">收益阶梯计算</h3>
								<p class="mt-2 text-sm leading-relaxed text-blue-900">
									申购金额落入对应阶梯后，按该阶梯日收益率计算预期收益：持仓金额 × 日收益率 × 持有天数。页面收益为预估展示，最终以订单结算记录为准。
								</p>
							</div>

							<div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
								<h3 class="text-sm font-semibold text-emerald-900">派息周期</h3>
								<p class="mt-2 text-sm leading-relaxed text-emerald-900">
									每日、每周、每月或自定义周期用于控制收益派发频率；派息时生成收益记录并累计到用户订单收益中。
								</p>
							</div>

							<div class="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
								<h3 class="text-sm font-semibold text-cyan-900">托管周期</h3>
								<p class="mt-2 text-sm leading-relaxed text-cyan-900">
									托管周期用于控制用户订单运行期限；到期后可进入完成或结算流程。无限期产品不固定结束时间，按赎回与后台订单规则处理。
								</p>
							</div>

							<div class="rounded-xl border border-violet-200 bg-violet-50 p-4">
								<h3 class="text-sm font-semibold text-violet-900">运营模式</h3>
								<p class="mt-2 text-sm leading-relaxed text-violet-900">
									内部策略、外部托管等运营模式用于区分资金运作口径和后台展示，不改变用户侧按阶梯收益率展示的基础计算方式。
								</p>
							</div>

							<div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
								<h3 class="text-sm font-semibold text-amber-900">提前赎回</h3>
								<p class="mt-2 text-sm leading-relaxed text-amber-900">
									若产品允许提前赎回，提前退出时按产品配置收取手续费；不支持提前赎回的产品需按托管周期或订单规则正常结算退出。
								</p>
							</div>

							<div class="rounded-xl border border-slate-200 bg-white p-4">
								<h3 class="text-sm font-semibold text-slate-900">限购与准入</h3>
								<ul class="mt-2 space-y-2 text-sm leading-relaxed text-slate-700">
									<li>• 单用户最大持仓限制用户在该产品下可持有的本金规模。</li>
									<li>• 产品总限额限制全平台可申购规模。</li>
									<li>• 月限购次数按自然月统计用户提交申购次数。</li>
									<li>• 最低 VIP 等级在申购时校验，不影响已成立订单。</li>
								</ul>
							</div>

							<div class="rounded-xl border border-rose-200 bg-rose-50 p-4">
								<h3 class="text-sm font-semibold text-rose-900">风险提示</h3>
								<p class="mt-2 text-sm leading-relaxed text-rose-900">
									AI 量化收益受策略表现、市场波动和流动性影响；后台配置的日收益率用于产品展示与模拟计算，实际结算应以订单流水为准。
								</p>
							</div>
						</div>
						</div>
					</div>

					<!-- 右侧：实时预览区域 (40%) -->
					<div class="w-2/5 bg-slate-50 flex flex-col">
						<div class="flex-1 overflow-y-auto p-6 space-y-4">
							<!-- 产品卡片预览 -->
							<div>
								<h4 class="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
									<svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
										<path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
										<path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
									</svg>
									产品卡片预览
								</h4>
								<div class="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
									<div class="flex items-start justify-between">
										<div class="flex items-center gap-3">
											<div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
												{{ productForm.currency.slice(0, 1) }}
											</div>
											<div>
												<div class="font-semibold text-slate-900">{{ productForm.name || '产品名称' }}</div>
												<div class="text-xs text-slate-500">{{ productForm.currency }} · {{ vipLevelMeta[productForm.minVipLevel].label }}+</div>
											</div>
										</div>
										<span :class="['px-2 py-1 text-xs rounded-full', productStatusMeta[productForm.status].color]">
											{{ productStatusMeta[productForm.status].label }}
										</span>
									</div>
									<div class="flex items-center justify-between text-sm pt-2 border-t border-slate-200">
										<span class="text-slate-600">运营模式</span>
										<span class="font-medium text-slate-900">{{ operationModeMeta[productForm.operationMode].label }}</span>
									</div>
									<div class="flex items-center justify-between text-sm">
										<span class="text-slate-600">托管周期</span>
										<span class="font-medium text-slate-900">{{ formatAiQuantDurationLabel(productForm.durationDays) }}</span>
									</div>
									<div class="flex items-center justify-between text-sm">
										<span class="text-slate-600">派息周期</span>
										<span class="font-medium text-slate-900">{{ settlementPeriodMeta[productForm.settlementPeriod].label }}</span>
									</div>
								</div>
							</div>

							<!-- 收益阶梯预览 -->
							<div>
								<h4 class="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
									<svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clip-rule="evenodd"/>
									</svg>
									收益阶梯预览
								</h4>
								<div class="bg-white border border-slate-200 rounded-xl p-4">
									<div v-if="productForm.tiers.length === 0" class="text-center py-6 text-slate-400 text-sm">
										暂无收益阶梯配置
									</div>
									<div v-else class="space-y-2">
										<div v-for="(tier, idx) in productForm.tiers" :key="idx" class="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
											<div class="flex-1">
												<div class="text-xs font-medium text-slate-900 mb-1">{{ tier.label || `阶梯 ${idx + 1}` }}</div>
												<div class="text-xs text-slate-600">{{ tier.minAmount }} - {{ tier.maxAmount }} USDT</div>
											</div>
											<div class="text-right">
												<div class="text-sm font-semibold text-green-600">{{ tier.dailyRate }}%</div>
												<div class="text-xs text-slate-500">日利率</div>
											</div>
										</div>
									</div>
								</div>
							</div>

							<!-- 收益计算器 -->
							<div>
								<h4 class="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
									<svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
										<path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
										<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"/>
									</svg>
									收益计算示例
								</h4>
								<div class="bg-white border border-slate-200 rounded-xl p-4">
									<div v-if="productForm.tiers.length === 0" class="text-center py-6 text-slate-400 text-sm">
										配置收益阶梯后查看示例
									</div>
									<div v-else class="space-y-3">
										<div v-for="(tier, idx) in productForm.tiers.slice(0, 2)" :key="idx" class="p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
											<div class="text-xs text-slate-600 mb-2">{{ tier.label || `阶梯 ${idx + 1}` }} 示例</div>
											<div class="space-y-1 text-xs">
												<div class="flex justify-between">
													<span class="text-slate-600">投资金额</span>
													<span class="font-medium text-slate-900">{{ tier.minAmount }} USDT</span>
												</div>
												<div class="flex justify-between">
													<span class="text-slate-600">日收益</span>
											<span class="font-medium text-green-600">{{ (tier.minAmount * tier.dailyRate / 100).toFixed(2) }} USDT</span>
												</div>
												<div class="flex justify-between">
													<span class="text-slate-600">{{ previewYieldDays }}天收益</span>
											<span class="font-semibold text-green-600">{{ (tier.minAmount * tier.dailyRate / 100 * previewYieldDays).toFixed(2) }} USDT</span>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>

							<!-- 规则说明预览 -->
							<div>
								<h4 class="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
									<svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
									</svg>
									规则说明
								</h4>
								<div class="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-xs text-slate-600">
									<div class="flex items-start gap-2">
										<span class="text-blue-600 mt-0.5">•</span>
										<span>单用户最大持仓：{{ productForm.limitAmount }} USDT</span>
									</div>
									<div class="flex items-start gap-2">
										<span class="text-blue-600 mt-0.5">•</span>
										<span>产品总限额：{{ productForm.limitCount }} USDT</span>
									</div>
									<div class="flex items-start gap-2">
										<span class="text-blue-600 mt-0.5">•</span>
										<span>每月限购次数：{{ productForm.monthlyLimitCount }} 次</span>
									</div>
									<div v-if="productForm.earlyRedeemEnabled" class="flex items-start gap-2">
										<span class="text-blue-600 mt-0.5">•</span>
										<span>提前赎回手续费：{{ productForm.earlyRedeemFeePercent }}%</span>
									</div>
									<div v-else class="flex items-start gap-2">
										<span class="text-orange-600 mt-0.5">•</span>
										<span class="text-orange-600">不支持提前赎回</span>
									</div>
									<div class="flex items-start gap-2">
										<span class="text-blue-600 mt-0.5">•</span>
										<span>托管周期：{{ formatAiQuantDurationLabel(productForm.durationDays) }}</span>
									</div>
									<div class="flex items-start gap-2">
										<span class="text-blue-600 mt-0.5">•</span>
										<span>派息周期：{{ settlementPeriodMeta[productForm.settlementPeriod].label }}</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- 底部操作栏 -->
				</template>
<template #footer><template v-if="showProductModal"><div class="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 flex-shrink-0">
					<a-button type="text" @click="showProductModal = false" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">取消</a-button>
					<a-button type="text" @click="saveProduct" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">保存产品</a-button>
				</div></template></template>
</a-modal>
		</Teleport>
	</section>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import AdminListPaginationBar from '../../../admin/components/AdminListPaginationBar.vue'
import { useAgentPagedList } from '../../../composables/useAgentListPagination'
import {
	PRODUCT_STATUS,
	productStatusMeta,
	COMMON_FILTER_ALL,
	SUPPORTED_CURRENCIES,
	aiQuantDurationOptions,
	formatAiQuantDurationLabel,
	vipLevelMeta,
	operationModeMeta,
	settlementPeriodMeta,
	productFormSettlementPeriodMeta,
	SETTLEMENT_PERIOD,
	OPERATION_MODE,
	VIP_LEVEL,
	sortAiQuantProducts
} from '../../../admin/constants/aiQuant'
import {
	AI_QUANT_OP_ACTION,
	AI_QUANT_OP_MODULE
} from '../../../admin/constants/aiQuantOperationLog'
import { appendAiQuantOperationLog } from '../../../admin/state/aiQuantOperationLogs'
import { aiQuantProductsCatalog } from '../../../admin/state/financeCatalogs'

const products = aiQuantProductsCatalog
const search = ref('')
const statusFilter = ref(COMMON_FILTER_ALL)
const currencyFilter = ref(COMMON_FILTER_ALL)
const modeFilter = ref(COMMON_FILTER_ALL)

const showProductModal = ref(false)
const editingProductId = ref('')
const productModalTab = ref('config')

const productForm = reactive({
	name: '',
	currency: 'USDT',
	productCurrency: 'USDT',
	operationMode: OPERATION_MODE.INTERNAL,
	durationDays: 30,
	settlementPeriod: SETTLEMENT_PERIOD.DAILY,
	customDays: 1,
	minVipLevel: VIP_LEVEL.VIP0,
	tiers: [],
	earlyRedeemEnabled: true,
	earlyRedeemFeePercent: 3,
	limitAmount: 100000,
	limitCount: 100,
	monthlyLimitCount: 5,
	sortOrder: 0,
	status: PRODUCT_STATUS.ENABLED
})

const openCreateProduct = () => {
	editingProductId.value = ''
	productForm.name = ''
	productForm.currency = 'USDT'
	productForm.productCurrency = 'USDT'
	productForm.operationMode = OPERATION_MODE.INTERNAL
	productForm.durationDays = 30
	productForm.settlementPeriod = SETTLEMENT_PERIOD.DAILY
	productForm.customDays = 1
	productForm.minVipLevel = VIP_LEVEL.VIP0
	productForm.tiers = [{ minAmount: 100, maxAmount: 10000, dailyRate: 0.012, label: '标准级' }]
	productForm.earlyRedeemEnabled = true
	productForm.earlyRedeemFeePercent = 3
	productForm.limitAmount = 100000
	productForm.limitCount = 100
	productForm.monthlyLimitCount = 5
	productForm.sortOrder = Math.max(0, ...products.value.map((product) => Number(product.sortOrder) || 0)) + 10
	productForm.status = PRODUCT_STATUS.ENABLED
	productModalTab.value = 'config'
	showProductModal.value = true
}

const openEditProduct = (product) => {
	editingProductId.value = product.id
	productForm.name = product.name
	productForm.currency = product.currency
	productForm.productCurrency = product.productCurrency ?? product.currency
	productForm.operationMode = product.operationMode
	productForm.durationDays = Number.isFinite(Number(product.durationDays)) ? Number(product.durationDays) : 0
	productForm.settlementPeriod = productFormSettlementPeriodMeta[product.settlementPeriod]
		? product.settlementPeriod
		: SETTLEMENT_PERIOD.DAILY
	productForm.customDays = product.customDays
	productForm.minVipLevel = product.minVipLevel
	productForm.tiers = product.tiers.map(t => ({ ...t }))
	productForm.earlyRedeemEnabled = product.earlyRedeemEnabled
	productForm.earlyRedeemFeePercent = product.earlyRedeemFeePercent
	productForm.limitAmount = product.limitAmount
	productForm.limitCount = product.limitCount
	productForm.monthlyLimitCount = product.monthlyLimitCount
	productForm.sortOrder = Number.isFinite(Number(product.sortOrder)) ? Number(product.sortOrder) : 0
	productForm.status = product.status
	productModalTab.value = 'config'
	showProductModal.value = true
}

const addTier = () => {
	productForm.tiers.push({ minAmount: 0, maxAmount: 0, dailyRate: 0, label: '' })
}

const removeTier = (index) => {
	productForm.tiers.splice(index, 1)
}

const previewYieldDays = computed(() => {
	const n = Number(productForm.durationDays)
	return Number.isFinite(n) && n > 0 ? n : 30
})

const saveProduct = () => {
	const payload = {
		...productForm,
		sortOrder: Number(productForm.sortOrder),
		icon: productForm.currency === 'USDT' ? '₮' : productForm.currency === 'BTC' ? '₿' : productForm.currency === 'ETH' ? 'Ξ' : productForm.currency
	}

	if (editingProductId.value) {
		products.value = products.value.map(p => p.id === editingProductId.value ? { ...p, ...payload } : p)
		appendAiQuantOperationLog({
			module: AI_QUANT_OP_MODULE.PRODUCT,
			action: AI_QUANT_OP_ACTION.PRODUCT_UPDATE,
			refId: editingProductId.value,
			targetLabel: payload.name,
			summary: `编辑产品：${payload.currency} · ${operationModeMeta[payload.operationMode].label} · 阶梯 ${payload.tiers.length} 档`
		})
	} else {
		const newId = `aiq-prod-${Date.now()}`
		products.value.unshift({
			id: newId,
			...payload,
			totalLocked: 0,
			totalOrders: 0,
			totalYield: 0,
			createdAt: new Date().toISOString().split('T')[0]
		})
		appendAiQuantOperationLog({
			module: AI_QUANT_OP_MODULE.PRODUCT,
			action: AI_QUANT_OP_ACTION.PRODUCT_CREATE,
			refId: newId,
			targetLabel: payload.name,
			summary: `新建产品：${payload.currency} · ${operationModeMeta[payload.operationMode].label}`
		})
	}

	showProductModal.value = false
}

const toggleProductStatus = (product) => {
	const prevStatus = product.status
	const newStatus = product.status === PRODUCT_STATUS.ENABLED ? PRODUCT_STATUS.DISABLED : PRODUCT_STATUS.ENABLED
	products.value = products.value.map(p => p.id === product.id ? { ...p, status: newStatus } : p)
	appendAiQuantOperationLog({
		module: AI_QUANT_OP_MODULE.PRODUCT,
		action: AI_QUANT_OP_ACTION.PRODUCT_STATUS,
		refId: product.id,
		targetLabel: product.name,
		summary: `产品状态：${productStatusMeta[prevStatus].label} → ${productStatusMeta[newStatus].label}`
	})
}

const copyProductId = async (productId) => {
	try {
		await navigator.clipboard.writeText(productId)
		alert('产品ID已复制到剪贴板')
	} catch (err) {
		console.error('复制失败:', err)
		// 降级方案：使用传统方法
		const textarea = document.createElement('textarea')
		textarea.value = productId
		textarea.style.position = 'fixed'
		textarea.style.opacity = '0'
		document.body.appendChild(textarea)
		textarea.select()
		try {
			document.execCommand('copy')
			alert('产品ID已复制到剪贴板')
		} catch (e) {
			alert('复制失败，请手动复制')
		}
		document.body.removeChild(textarea)
	}
}

const filteredProducts = computed(() => {
	const kw = search.value.trim().toLowerCase()
	return sortAiQuantProducts(products.value.filter(p => {
		const matchStatus = statusFilter.value === COMMON_FILTER_ALL || p.status === statusFilter.value
		const matchCurrency = currencyFilter.value === COMMON_FILTER_ALL || p.currency === currencyFilter.value
		const matchMode = modeFilter.value === COMMON_FILTER_ALL || p.operationMode === modeFilter.value
		const matchKeyword = !kw || `${p.name} ${p.currency}`.toLowerCase().includes(kw)
		return matchStatus && matchCurrency && matchMode && matchKeyword
	}))
})

const {
	pageSize: productPageSize,
	currentPage: productCurrentPage,
	totalCount: productTotalCount,
	totalPages: productTotalPages,
	pagedList: pagedProducts
} = useAgentPagedList(filteredProducts, { pageSize: 8 })
</script>
