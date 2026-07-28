<template>
	<section class="space-y-4">
		<header>
			<h1 class="text-3xl font-semibold text-slate-900">订单管理</h1>
			<p class="mt-1 text-sm text-slate-500">查看用户订单、收益状态及订单详情；收益调整在订单行或详情中发起</p>
		</header>

		<article class="rounded-xl border border-slate-200 bg-white">
			<div class="space-y-4 border-b border-slate-200 p-4">
				<div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
					<div class="md:col-span-2 xl:col-span-2">
						<label class="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">关键词</label>
						<input
							v-model="filterDraft.search"
							type="text"
							autocomplete="off"
							placeholder="订单号、用户ID、用户名、邮箱、产品名…"
							class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
							@keydown.enter.prevent="applySearch"
						/>
					</div>
					<div>
						<label class="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">币种</label>
						<select v-model="filterDraft.currency" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
							<option value="">全部币种</option>
							<option v-for="c in uniqueCurrencies" :key="c" :value="c">{{ c }}</option>
						</select>
					</div>
					<div>
						<label class="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">VIP</label>
						<select v-model="filterDraft.vip" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
							<option value="">全部等级</option>
							<option v-for="lv in vipSelectLevels" :key="lv" :value="String(lv)">{{ vipLevelMeta[lv].label }}</option>
						</select>
					</div>
					<div>
						<label class="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">状态</label>
						<select v-model="filterDraft.status" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
							<option value="">全部状态</option>
							<option v-for="st in orderStatusSelectValues" :key="st" :value="st">{{ orderStatusMeta[st].label }}</option>
						</select>
					</div>
					<div class="md:col-span-2 xl:col-span-2">
						<label class="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">产品</label>
						<select v-model="filterDraft.product" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
							<option value="">全部产品</option>
							<option v-for="p in uniqueProducts" :key="p" :value="p">{{ p }}</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
					<div>
						<label class="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">本金 ≥</label>
						<input
							v-model="filterDraft.principalMin"
							type="text"
							autocomplete="off"
							inputmode="decimal"
							placeholder="最小本金"
							class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
						/>
					</div>
					<div>
						<label class="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">本金 ≤</label>
						<input
							v-model="filterDraft.principalMax"
							type="text"
							autocomplete="off"
							inputmode="decimal"
							placeholder="最大本金"
							class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
						/>
					</div>
					<div>
						<label class="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">下单日起</label>
						<input v-model="filterDraft.startDateFrom" type="date" autocomplete="off" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
					</div>
					<div>
						<label class="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">下单日止</label>
						<input v-model="filterDraft.startDateTo" type="date" autocomplete="off" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
					</div>
					<div class="flex flex-col justify-end gap-2 sm:col-span-2 lg:col-span-2 xl:col-span-2">
						<div class="flex flex-wrap gap-2">
							<button
								type="button"
								class="min-w-[7rem] flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 sm:flex-none"
								@click="applySearch"
							>
								搜索
							</button>
							<button
								type="button"
								class="min-w-[7rem] flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:flex-none"
								@click="resetFilters"
							>
								重置条件
							</button>
						</div>
					</div>
				</div>

				<p class="text-xs text-slate-400">
					默认条件为「全部」（不限状态/币种/VIP/产品/日期/本金）；修改后请点击「搜索」更新列表，关键词框支持回车。
				</p>

				<div class="text-xs text-slate-500">
					命中 <span class="font-semibold text-slate-700">{{ filteredOrders.length }}</span> 条（当前第 {{ listCurrentPage }} 页，每页 {{ listPageSize }} 条）
					<span v-if="filteredOrders.length !== orders.length" class="text-slate-400">（数据源 {{ orders.length }} 条）</span>
				</div>
			</div>

			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="bg-slate-50 text-slate-500">
						<tr>
							<th class="px-4 py-3 text-left font-medium">订单ID</th>
							<th class="px-4 py-3 text-left font-medium">用户</th>
							<th class="px-4 py-3 text-left font-medium">产品</th>
							<th class="px-4 py-3 text-left font-medium">本金</th>
							<th class="px-4 py-3 text-left font-medium">日利率</th>
							<th class="px-4 py-3 text-left font-medium">周期</th>
							<th class="px-4 py-3 text-left font-medium">累计收益</th>
							<th class="px-4 py-3 text-left font-medium">状态</th>
							<th class="px-4 py-3 text-left font-medium">操作</th>
						</tr>
					</thead>
					<tbody>
						<tr v-if="!filteredOrders.length">
							<td colspan="9" class="px-4 py-12 text-center text-sm text-slate-500">
								<template v-if="!orders.length">暂无订单数据源（mock 未加载）。请检查控制台报错。</template>
								<template v-else>无符合条件的订单。请调整筛选后点击「搜索」，或「重置条件」。</template>
							</td>
						</tr>
						<tr v-for="order in pagedOrders" :key="order.id" class="border-t border-slate-100">
							<td class="px-4 py-3 font-mono text-xs text-slate-600">{{ order.id }}</td>
							<td class="px-4 py-3">
								<div class="text-slate-700">{{ order.userName }}</div>
								<span :class="['text-xs px-2 py-0.5 rounded-md font-medium', vipLevelMeta[order.vipLevel].class]">
									{{ vipLevelMeta[order.vipLevel].label }}
								</span>
							</td>
							<td class="px-4 py-3 text-slate-700">{{ order.productName }}</td>
							<td class="px-4 py-3 font-medium text-slate-900">{{ fmtCurrency(order.principal, order.currency) }}</td>
							<td class="px-4 py-3 font-medium text-emerald-600">{{ order.dailyRate.toFixed(2) }}%</td>
							<td class="px-4 py-3 text-slate-700">{{ formatAiQuantOrderCycleLabel(order) }}</td>
							<td class="px-4 py-3 font-medium text-blue-600">{{ fmtCurrency(order.accumulatedYield, order.currency) }}</td>
							<td class="px-4 py-3"><span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="orderStatusMeta[order.status].class">{{ orderStatusMeta[order.status].label }}</span></td>
							<td class="px-4 py-3">
								<button type="button" @click="viewOrderDetail(order)" class="text-blue-600 hover:text-blue-800 text-sm font-medium">详情</button>
								<template v-if="canYieldAdjust(order)">
									<span class="text-slate-300 mx-1.5">|</span>
									<button
										type="button"
										@click="openYieldAdjustForOrder(order)"
										class="text-emerald-600 hover:text-emerald-800 text-sm font-medium"
									>
										收益调整
									</button>
								</template>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<AdminListPaginationBar
				v-model:current-page="listCurrentPage"
				v-model:page-size="listPageSize"
				:total-pages="listTotalPages"
				:total-count="listTotalCount"
			/>
		</article>

		<AiQuantYieldAdjustmentModal ref="yieldModalRef" />

		<!-- 订单详情弹窗 -->
		<div v-if="showDetailModal && selectedOrder" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<div class="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
				<!-- 弹窗头部 -->
				<div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
					<div>
						<h2 class="text-xl font-semibold text-slate-900 flex items-center gap-2">
							订单详情
							<span :class="['px-2 py-1 text-xs font-medium rounded-md', orderStatusMeta[selectedOrder.status].class]">
								{{ orderStatusMeta[selectedOrder.status].label }}
							</span>
						</h2>
						<p class="text-sm text-slate-500 mt-1 font-mono">{{ selectedOrder.id }}</p>
					</div>
					<button @click="showDetailModal = false" class="text-slate-400 hover:text-slate-600">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<!-- 弹窗主体：左右分栏 -->
				<div class="flex-1 flex overflow-hidden">
					<!-- 左侧：订单信息 (55%) -->
					<div class="w-[55%] border-r border-slate-200 flex flex-col">
						<div class="flex-1 overflow-y-auto p-6 space-y-5">
							<!-- 用户与产品信息 -->
							<div>
								<h3 class="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
									<svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
									</svg>
									用户与产品
								</h3>
								<div class="bg-slate-50 rounded-lg p-4 space-y-3">
									<div class="flex justify-between items-center">
										<span class="text-sm text-slate-600">用户名称</span>
										<span class="text-sm font-medium text-slate-900">{{ selectedOrder.userName }}</span>
									</div>
									<div class="flex justify-between items-center">
										<span class="text-sm text-slate-600">用户邮箱</span>
										<span class="text-sm font-medium text-slate-900">{{ selectedOrder.userEmail }}</span>
									</div>
									<div class="flex justify-between items-center">
										<span class="text-sm text-slate-600">VIP等级</span>
										<span :class="['text-xs px-2 py-0.5 rounded-md font-medium', vipLevelMeta[selectedOrder.vipLevel].class]">
											{{ vipLevelMeta[selectedOrder.vipLevel].label }}
										</span>
									</div>
									<div class="flex justify-between items-center pt-2 border-t border-slate-200">
										<span class="text-sm text-slate-600">产品名称</span>
										<span class="text-sm font-medium text-slate-900">{{ selectedOrder.productName }}</span>
									</div>
									<div class="flex justify-between items-center">
										<span class="text-sm text-slate-600">计价币种</span>
										<span class="text-sm font-medium text-slate-900">{{ selectedOrder.currency }}</span>
									</div>
								</div>
							</div>

							<!-- 投资信息 -->
							<div>
								<h3 class="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
									<svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
										<path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
										<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"/>
									</svg>
									投资明细
								</h3>
								<div class="grid grid-cols-2 gap-3">
									<div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
										<div class="text-xs text-blue-700 mb-1">投资本金</div>
										<div class="text-lg font-bold text-blue-900">{{ fmtCurrency(selectedOrder.principal, selectedOrder.currency) }}</div>
									</div>
									<div class="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border border-emerald-200">
										<div class="text-xs text-emerald-700 mb-1">日收益率</div>
										<div class="text-lg font-bold text-emerald-900">{{ selectedOrder.dailyRate.toFixed(2) }}%</div>
									</div>
									<div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
										<div class="text-xs text-purple-700 mb-1">每日收益</div>
										<div class="text-lg font-bold text-purple-900">{{ fmtCurrency(selectedOrder.expectedDailyYield, selectedOrder.currency) }}</div>
									</div>
									<div class="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
										<div class="text-xs text-amber-700 mb-1">累计收益</div>
										<div class="text-lg font-bold text-amber-900">{{ fmtCurrency(selectedOrder.accumulatedYield, selectedOrder.currency) }}</div>
									</div>
								</div>
								<div class="mt-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-300">
									<div class="flex justify-between items-center">
										<span class="text-sm font-medium text-green-800">到期回款总额</span>
										<span class="text-xl font-bold text-green-900">{{ fmtCurrency(selectedOrder.totalReturn, selectedOrder.currency) }}</span>
									</div>
									<div class="text-xs text-green-700 mt-1">本金 + 累计收益</div>
								</div>
							</div>

							<!-- 时间周期 -->
							<div>
								<h3 class="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
									<svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
									</svg>
									时间周期
								</h3>
								<div class="bg-slate-50 rounded-lg p-4 space-y-3">
									<div class="flex justify-between items-center">
										<span class="text-sm text-slate-600">开始日期</span>
										<span class="text-sm font-medium text-slate-900">{{ selectedOrder.startDate }}</span>
									</div>
									<div class="flex justify-between items-center">
										<span class="text-sm text-slate-600">结束日期</span>
										<span class="text-sm font-medium text-slate-900">{{ formatAiQuantOrderEndLabel(selectedOrder) }}</span>
									</div>
									<div class="flex justify-between items-center">
										<span class="text-sm text-slate-600">总周期</span>
										<span class="text-sm font-medium text-slate-900">{{ formatAiQuantOrderTotalDaysLabel(selectedOrder) }}</span>
									</div>
									<div class="pt-2 border-t border-slate-200">
										<div class="flex justify-between items-center mb-2">
											<span class="text-sm text-slate-600">进度</span>
											<span class="text-sm font-medium text-blue-600">{{ formatAiQuantOrderProgressLabel(selectedOrder) }}</span>
										</div>
										<div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
											<div class="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300" :style="{ width: `${aiQuantOrderProgressPercent(selectedOrder)}%` }"></div>
										</div>
										<div class="text-xs text-slate-500 mt-1 text-right">{{ formatAiQuantOrderProgressCaption(selectedOrder) }}</div>
									</div>
								</div>
							</div>

							<!-- 操作记录 -->
							<div v-if="selectedOrder.settledAt">
								<h3 class="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
									<svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
									</svg>
									操作记录
								</h3>
								<div class="bg-slate-50 rounded-lg p-4">
									<div class="flex items-start gap-3">
										<div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
											<svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
											</svg>
										</div>
										<div class="flex-1">
											<div class="text-sm font-medium text-slate-900">订单已结算</div>
											<div class="text-xs text-slate-500 mt-1">{{ selectedOrder.settledAt }}</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- 右侧：收益详情 (45%) -->
					<div class="w-[45%] bg-slate-50 flex flex-col">
						<div class="flex-1 overflow-y-auto p-6 space-y-5">
							<!-- 收益统计 -->
							<div>
								<h3 class="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
									<svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
									</svg>
									收益统计
								</h3>
								<div class="space-y-3">
									<div class="bg-white rounded-lg p-4 border border-slate-200">
										<div class="flex justify-between items-center mb-3">
											<span class="text-xs text-slate-600">收益率</span>
											<span class="text-sm font-bold text-emerald-600">{{ ((selectedOrder.accumulatedYield / selectedOrder.principal) * 100).toFixed(2) }}%</span>
										</div>
										<div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
											<div class="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2 rounded-full" :style="{ width: `${Math.min((selectedOrder.accumulatedYield / selectedOrder.principal) * 100, 100)}%` }"></div>
										</div>
									</div>
									
									<div class="bg-white rounded-lg p-4 border border-slate-200 space-y-2">
										<div class="flex justify-between items-center text-xs">
											<span class="text-slate-600">已获收益</span>
											<span class="font-semibold text-slate-900">{{ fmtCurrency(selectedOrder.accumulatedYield, selectedOrder.currency) }}</span>
										</div>
										<div class="flex justify-between items-center text-xs">
											<span class="text-slate-600">预期总收益</span>
											<span class="font-semibold text-slate-900">{{ formatAiQuantOrderExpectedTotalYield(selectedOrder) }}</span>
										</div>
										<div class="flex justify-between items-center text-xs pt-2 border-t border-slate-200">
											<span class="text-slate-600">剩余预期</span>
											<span class="font-semibold text-blue-600">{{ formatAiQuantOrderRemainingYield(selectedOrder) }}</span>
										</div>
									</div>
								</div>
							</div>

							<!-- 收益时间轴 -->
							<div>
								<h3 class="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
									<svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
									</svg>
									收益时间轴
								</h3>
								<div class="bg-white rounded-lg p-4 border border-slate-200">
									<div class="space-y-3 max-h-64 overflow-y-auto">
										<div v-for="day in Math.min(selectedOrder.daysElapsed, 10)" :key="day" class="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0">
											<div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-xs font-medium text-blue-700">
												D{{ selectedOrder.daysElapsed - day + 1 }}
											</div>
											<div class="flex-1">
												<div class="flex justify-between items-center">
													<span class="text-xs text-slate-600">第 {{ selectedOrder.daysElapsed - day + 1 }} 天收益</span>
													<span class="text-xs font-semibold text-emerald-600">+{{ fmtCurrency(selectedOrder.expectedDailyYield, selectedOrder.currency) }}</span>
												</div>
												<div class="text-xs text-slate-400 mt-0.5">{{ formatDateOffset(selectedOrder.startDate, selectedOrder.daysElapsed - day) }}</div>
											</div>
										</div>
										<div v-if="selectedOrder.daysElapsed > 10" class="text-center text-xs text-slate-400 py-2">
											显示最近10天，共 {{ selectedOrder.daysElapsed }} 天
										</div>
									</div>
								</div>
							</div>

							<!-- 收益趋势 -->
							<div>
								<h3 class="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
									<svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clip-rule="evenodd"/>
									</svg>
									收益趋势
								</h3>
								<div class="bg-white rounded-lg p-4 border border-slate-200">
									<div class="h-32 flex items-end gap-1">
										<div v-for="i in 15" :key="i" class="flex-1 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t opacity-80 hover:opacity-100 transition-opacity" :style="{ height: `${aiQuantOrderTrendHeight(selectedOrder, i)}%` }"></div>
									</div>
									<div class="flex justify-between items-center mt-3 text-xs text-slate-500">
										<span>起始</span>
										<span>收益累积趋势</span>
										<span>当前</span>
									</div>
								</div>
							</div>

							<!-- 关键指标 -->
							<div>
								<h3 class="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
									<svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-4-1a1 1 0 100 2h.01a1 1 0 100-2H7z" clip-rule="evenodd"/>
									</svg>
									关键指标
								</h3>
								<div class="bg-white rounded-lg p-4 border border-slate-200 space-y-2 text-xs">
									<div class="flex justify-between items-center">
										<span class="text-slate-600">年化收益率</span>
										<span class="font-semibold text-slate-900">{{ (selectedOrder.dailyRate * 365).toFixed(2) }}%</span>
									</div>
									<div class="flex justify-between items-center">
										<span class="text-slate-600">平均日收益</span>
										<span class="font-semibold text-slate-900">{{ fmtCurrency(selectedOrder.expectedDailyYield, selectedOrder.currency) }}</span>
									</div>
									<div class="flex justify-between items-center">
										<span class="text-slate-600">收益天数</span>
										<span class="font-semibold text-slate-900">{{ selectedOrder.daysElapsed }} 天</span>
									</div>
									<div class="flex justify-between items-center">
										<span class="text-slate-600">剩余天数</span>
										<span class="font-semibold text-orange-600">{{ formatAiQuantOrderRemainingDays(selectedOrder) }}</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- 底部操作栏 -->
				<div class="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 flex-shrink-0 bg-slate-50">
					<button
						v-if="selectedOrder && canYieldAdjust(selectedOrder)"
						type="button"
						@click="openYieldAdjustForOrder(selectedOrder); showDetailModal = false"
						class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100"
					>
						收益调整
					</button>
					<button type="button" @click="showDetailModal = false" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">关闭</button>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup>
import { ref, shallowRef, reactive, computed, nextTick, onMounted } from 'vue'
import { ORDER_STATUS, orderStatusMeta, vipLevelMeta, VIP_LEVEL } from '../../../admin/constants/aiQuant'
import { getAiQuantAdminOrdersSnapshot } from '../../../admin/state/aiQuantOrders'
import AdminListPaginationBar from '../../../admin/components/AdminListPaginationBar.vue'
import { useAgentPagedList } from '../../../composables/useAgentListPagination'
import AiQuantYieldAdjustmentModal from './AiQuantYieldAdjustmentModal.vue'

/** 页面内快照，避免全局 ref 在热更新等场景被清空；演示数据仅本页持有 */
const orders = shallowRef(getAiQuantAdminOrdersSnapshot())

function emptyFilterFields() {
	return {
		search: '',
		status: '',
		currency: '',
		vip: '',
		product: '',
		principalMin: '',
		principalMax: '',
		startDateFrom: '',
		startDateTo: ''
	}
}

/** 表单草稿；点「搜索」后写入 filterApplied（ref 整对象替换，保证列表计算属性稳定更新） */
const filterDraft = reactive(emptyFilterFields())
const filterApplied = ref(emptyFilterFields())

const yieldModalRef = ref(null)

function applySearch() {
	filterApplied.value = {
		search: filterDraft.search,
		status: filterDraft.status,
		currency: filterDraft.currency,
		vip: filterDraft.vip,
		product: filterDraft.product,
		principalMin: filterDraft.principalMin,
		principalMax: filterDraft.principalMax,
		startDateFrom: filterDraft.startDateFrom,
		startDateTo: filterDraft.startDateTo
	}
}

const orderStatusSelectValues = [
	ORDER_STATUS.RUNNING,
	ORDER_STATUS.COMPLETED,
	ORDER_STATUS.SETTLED,
	ORDER_STATUS.EARLY_REDEEMED,
	ORDER_STATUS.LOCKED,
	ORDER_STATUS.CANCELLED
]

/** 仅运行中可发起收益调整；已完成/已结算/提前赎回等为终态，不可调 */
const YIELD_ADJUST_ALLOWED_STATUSES = new Set([ORDER_STATUS.RUNNING])

const canYieldAdjust = (order) => Boolean(order?.status && YIELD_ADJUST_ALLOWED_STATUSES.has(order.status))

const vipSelectLevels = [VIP_LEVEL.VIP0, VIP_LEVEL.VIP1, VIP_LEVEL.VIP2, VIP_LEVEL.VIP3, VIP_LEVEL.VIP4, VIP_LEVEL.VIP5]

const uniqueCurrencies = computed(() => [...new Set(orders.value.map((o) => o.currency))].sort())
const uniqueProducts = computed(() => [...new Set(orders.value.map((o) => o.productName))].sort())

const resetFilters = () => {
	Object.assign(filterDraft, emptyFilterFields())
	applySearch()
}

onMounted(() => {
	if (!orders.value.length) {
		orders.value = getAiQuantAdminOrdersSnapshot()
	}
	applySearch()
})

const showDetailModal = ref(false)
const selectedOrder = ref(null)

const viewOrderDetail = (order) => {
	selectedOrder.value = order
	showDetailModal.value = true
}

const openYieldAdjustForOrder = (order) => {
	if (!canYieldAdjust(order)) return
	nextTick(() => yieldModalRef.value?.openForOrder(order))
}

/** 空字符串不得当成 0，否则「本金≤」会变成 principal<=0 滤掉全部订单 */
const parseNum = (s) => {
	const t = String(s ?? '')
		.trim()
		.replace(/,/g, '')
	if (t === '') return null
	const n = Number(t)
	return Number.isFinite(n) ? n : null
}

const isYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s ?? '').trim())

const filteredOrders = computed(() => {
	const list = Array.isArray(orders.value) ? orders.value : []
	const q = filterApplied.value
	const kw = String(q.search ?? '').trim().toLowerCase()
	const st = String(q.status ?? '').trim()
	const cur = String(q.currency ?? '').trim()
	const vip = String(q.vip ?? '').trim()
	const prod = String(q.product ?? '').trim()
	const dFrom = String(q.startDateFrom ?? '').trim()
	const dTo = String(q.startDateTo ?? '').trim()
	const pMin = parseNum(q.principalMin)
	const pMax = parseNum(q.principalMax)
	return list.filter((o) => {
		if (!o || typeof o !== 'object') return false
		const matchStatus = !st || o.status === st
		const hay = `${o.id ?? ''} ${o.userId ?? ''} ${o.userName ?? ''} ${o.userEmail ?? ''} ${o.productName ?? ''} ${o.productId ?? ''}`.toLowerCase()
		const matchKeyword = !kw || hay.includes(kw)
		const matchCurrency = !cur || o.currency === cur
		const matchVip = !vip || String(o.vipLevel) === vip
		const matchProduct = !prod || o.productName === prod
		const matchPrincipalMin = pMin == null || Number(o.principal) >= pMin
		const matchPrincipalMax = pMax == null || Number(o.principal) <= pMax
		const matchDateFrom = !dFrom || !isYmd(dFrom) || String(o.startDate || '') >= dFrom
		const matchDateTo = !dTo || !isYmd(dTo) || String(o.startDate || '') <= dTo
		return (
			matchStatus &&
			matchKeyword &&
			matchCurrency &&
			matchVip &&
			matchProduct &&
			matchPrincipalMin &&
			matchPrincipalMax &&
			matchDateFrom &&
			matchDateTo
		)
	})
})

const {
	pageSize: listPageSize,
	currentPage: listCurrentPage,
	totalCount: listTotalCount,
	totalPages: listTotalPages,
	pagedList: pagedOrders
} = useAgentPagedList(filteredOrders, { pageSize: 10 })

applySearch()

const fmtNumber = (val, decimals = 2) => Number(val).toFixed(decimals)
const fmtCurrency = (val, currency, decimals = 2) => {
	if (currency === 'BTC' || currency === 'ETH') return `${fmtNumber(val, decimals === 2 ? 4 : decimals)} ${currency}`
	return `${Number(val).toLocaleString()} ${currency}`
}

const hasFixedAiQuantTerm = (order) => Number(order?.totalDays) > 0

const formatAiQuantOrderEndLabel = (order) => {
	if (!order) return '—'
	if (!hasFixedAiQuantTerm(order) || order.endDate == null || order.endDate === '') return '无限期'
	return order.endDate
}

const formatAiQuantOrderTotalDaysLabel = (order) => (hasFixedAiQuantTerm(order) ? `${order.totalDays} 天` : '无限期')

const formatAiQuantOrderProgressLabel = (order) => {
	const elapsed = Number(order?.daysElapsed) || 0
	if (!hasFixedAiQuantTerm(order)) return `已运行 ${elapsed} 天`
	return `${elapsed} / ${order.totalDays} 天`
}

const formatAiQuantOrderCycleLabel = (order) => {
	if (!order) return '—'
	if (!hasFixedAiQuantTerm(order)) return `${formatAiQuantOrderProgressLabel(order)} / 无限期`
	return formatAiQuantOrderProgressLabel(order)
}

const aiQuantOrderProgressPercent = (order) => {
	if (!hasFixedAiQuantTerm(order)) return 100
	const elapsed = Number(order?.daysElapsed) || 0
	const total = Number(order.totalDays)
	return Math.min(100, Math.max(0, Number(((elapsed / total) * 100).toFixed(1))))
}

const formatAiQuantOrderProgressCaption = (order) => {
	if (!hasFixedAiQuantTerm(order)) return '无限期持续运行'
	return `${aiQuantOrderProgressPercent(order).toFixed(1)}% 完成`
}

const formatAiQuantOrderExpectedTotalYield = (order) => {
	if (!order) return '—'
	if (!hasFixedAiQuantTerm(order)) return '按每日收益持续累计'
	return fmtCurrency(order.expectedDailyYield * order.totalDays, order.currency)
}

const formatAiQuantOrderRemainingYield = (order) => {
	if (!order) return '—'
	if (!hasFixedAiQuantTerm(order)) return '无限期持续派息'
	return fmtCurrency(order.expectedDailyYield * Math.max(0, order.totalDays - order.daysElapsed), order.currency)
}

const formatAiQuantOrderRemainingDays = (order) => {
	if (!order) return '—'
	if (!hasFixedAiQuantTerm(order)) return '无限期'
	return `${Math.max(0, Number(order.totalDays) - (Number(order.daysElapsed) || 0))} 天`
}

const aiQuantOrderTrendHeight = (order, index) => {
	if (!hasFixedAiQuantTerm(order)) return Math.min(100, 28 + index * 4)
	return Math.min(100, (index / 15) * aiQuantOrderProgressPercent(order))
}

// 根据起始日期和天数偏移计算日期
const formatDateOffset = (startDate, daysOffset) => {
	const date = new Date(startDate)
	date.setDate(date.getDate() + daysOffset)
	return date.toISOString().split('T')[0]
}
</script>
