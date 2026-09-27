<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">订单管理</h1>
        <p class="mt-1 text-sm text-slate-500">监控借贷订单状态与授信占用</p>
      </div>
      <a-button type="text" html-type="button" class="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2" @click="exportOrders">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
        <span>导出订单</span>
      </a-button>
    </header>

    <article class="rounded-xl border border-slate-200 bg-white">
      <div class="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
        <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="filters.status" class="">
          <a-select-option value="">不限</a-select-option>
          <a-select-option
            v-for="option in orderStatusOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </a-select-option>
        </a-select>
        <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="filters.collateralRisk" class="">
          <a-select-option value="">不限</a-select-option>
          <a-select-option
            v-for="option in collateralRiskOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </a-select-option>
        </a-select>
        <a-input v-model:value="filters.userId" type="text" placeholder="搜索用户ID..." class="w-full max-w-xs rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        <a-button type="text" html-type="button" class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" @click="resetFilters">重置</a-button>
        <div v-if="selectedDeductOrders.length" class="ml-auto flex flex-wrap items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
          <span class="text-xs font-medium text-rose-700">已选 {{ selectedDeductOrders.length }} 笔可处理订单</span>
          <a-button type="text" html-type="button" class="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700" @click="openBatchDeductDialog">
            {{ batchDeductActionText }}
          </a-button>
          <a-button type="text" html-type="button" class="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50" @click="clearSelectedOrders">
            清空选择
          </a-button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <a-table  size="small" :pagination="false" :data-source="filteredOrders" :row-key="(order) => order.orderId" :scroll="{ x: 'max-content' }" :custom-row="(order, rowIndex) => ({ class: [&quot;border-t border-slate-100&quot;] })">
<a-table-column key="column-0" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>
                <a-checkbox
                  class=""
                  :checked="allSelectableChecked"
                  :indeterminate="someSelectableChecked && !allSelectableChecked"
                  :disabled="selectableFilteredOrders.length === 0"
                  aria-label="选择当前筛选下可处理订单"
                  @change="toggleAllSelectableOrders"
                />
              </template>
<template #default="{ record: order, index: rowIndex }">
                <a-checkbox
                  class="disabled:opacity-40"
                  :checked="selectedOrderIds.includes(order.orderId)"
                  :disabled="!canDeductCollateral(order)"
                  :aria-label="`选择订单 ${order.orderId}`"
                  @change="toggleOrderSelection(order)"
                />
              </template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>订单ID</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="font-mono text-xs text-slate-600">{{ order.orderId }}</div>
                <div class="text-xs text-slate-500">{{ formatDate(order.createTime) }}</div>
              </template>
</a-table-column>
<a-table-column key="column-2" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>用户信息</template>
<template #default="{ record: order, index: rowIndex }">
                <a-button type="text"
                  html-type="button"
                  class="group block w-full text-left rounded-lg -mx-1 px-1 py-0.5 hover:bg-slate-100 transition-colors"
                  @click.stop="openUserDrawerFromOrder(order)"
                >
                  <div class="text-slate-900 font-medium group-hover:text-blue-700">{{ order.userName }}</div>
                  <div class="text-xs text-slate-500 font-mono group-hover:text-blue-600">{{ order.userId }}</div>
                  <div class="text-[11px] text-blue-600 mt-0.5 opacity-0 group-hover:opacity-100">查看用户档案</div>
                  <template v-for="p in [resolveLendingUserProfile(order)]" :key="`${order.orderId}-prof`">
                    <div v-if="p" class="mt-1.5 flex flex-wrap items-center gap-1">
                      <span
                        class="inline-flex rounded px-1.5 py-0 text-[10px] font-medium tabular-nums bg-slate-100 text-slate-700"
                        title="信用分（与用户中心或订单一致）"
                      >
                        分 {{ p.creditScore }}
                      </span>
                      <span
                        class="inline-flex rounded px-1.5 py-0 text-[10px] font-medium"
                        :class="kycChipMeta(p.kycStatus).class"
                      >
                        {{ kycChipMeta(p.kycStatus).text }}
                      </span>
                      <span class="inline-flex rounded px-1.5 py-0 text-[10px] font-medium bg-violet-50 text-violet-800">
                        {{ vipChipLabel(p) }}
                      </span>
                    </div>
                  </template>
                </a-button>
              </template>
</a-table-column>
<a-table-column key="column-3" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3 font-medium text-slate-900&quot;] })">
<template #title>产品名称</template>
<template #default="{ record: order, index: rowIndex }">{{ order.productName }}</template>
</a-table-column>
<a-table-column key="column-4" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>借贷金额</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="font-medium text-slate-900">{{ formatCurrency(order.loanAmount) }}</div>
                <div class="text-xs text-slate-500">{{ order.loanCurrency }}</div>
              </template>
</a-table-column>
<a-table-column key="column-5" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>质押资产</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="font-medium text-slate-900">
                  {{ order.collateralAmount ? `${formatPlainNumber(order.collateralAmount)} ${order.collateralType}` : '—' }}
                </div>
                <div class="text-xs text-slate-500">
                  {{ order.collateralValue ? `${formatCurrency(order.collateralValue)} · ${order.collateralStatus === 'deducted' ? '已抵扣' : '锁定中'}` : '无质押' }}
                </div>
                <div v-if="order.collateralValue" class="mt-1 text-[11px]" :class="collateralRiskStageMeta(order).hintClass">
                  {{ collateralRiskStageMeta(order).label }} · 债务占比 {{ collateralDebtRatioLabel(order) }} / 预警 {{ collateralWarningThresholdLabel(order) }} / 处理 {{ collateralDisposalThresholdLabel(order) }}
                </div>
              </template>
</a-table-column>
<a-table-column key="column-6" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>利息/总债务</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="text-xs text-slate-600">利息: {{ formatCurrency(order.interestAccrued) }}</div>
                <div class="font-medium text-slate-900">{{ formatCurrency(order.totalDebt) }}</div>
              </template>
</a-table-column>
<a-table-column key="column-7" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>期限</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="text-slate-700">{{ order.daysElapsed }}d / {{ order.loanDuration }}d</div>
                <div class="text-xs text-slate-500">剩余 {{ order.daysRemaining }}d</div>
              </template>
</a-table-column>
<a-table-column key="column-8" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>状态</template>
<template #default="{ record: order, index: rowIndex }">
                <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="statusChipClass(order.status)">
                  {{ statusLabel(order.status) }}
                </span>
                <div v-if="order.collateralValue && order.status !== 'completed' && order.status !== 'liquidated' && order.status !== 'cancelled'" class="mt-1">
                  <span class="rounded-md px-2 py-0.5 text-[11px] font-medium" :class="collateralRiskStageMeta(order).chipClass">
                    {{ collateralRiskStageMeta(order).label }}
                  </span>
                </div>
              </template>
</a-table-column>
<a-table-column key="column-9" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>操作</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="flex items-center gap-2">
                  <a-button type="text"
                    v-if="order.status === 'pending'"
                    html-type="button"
                    class="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 font-medium transition-colors whitespace-nowrap"
                    @click="reviewOrder(order)"
                  >
                    审核
                  </a-button>
                  <a-button type="text"
                    v-else
                    html-type="button"
                    class="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 font-medium transition-colors whitespace-nowrap"
                    @click="viewOrder(order)"
                  >
                    详情
                  </a-button>
                  <a-button type="text"
                    v-if="canDeductCollateral(order)"
                    html-type="button"
                    class="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-100 whitespace-nowrap"
                    @click="openDeductDialog(order)"
                  >
                    {{ deductActionText(order) }}
                  </a-button>
                </div>
              </template>
</a-table-column>
</a-table>
      </div>

      <div class="flex items-center justify-between border-t border-slate-200 px-4 py-3">
        <a-pagination size="small" :current="currentPage" :total="totalPages" :page-size="1" :show-size-changer="false" @change="currentPage = $event" />
      </div>
    </article>

    <!-- 审核/详情模态框：Teleport 到 body，避免落在 main overflow 内导致 fixed 遮罩无法全屏 -->
    <Teleport to="body">
      <a-modal :wrap-props="{ 'aria-modal': true }" transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :open="Boolean(showReviewModal)" :mask-closable="false" :closable="false" :keyboard="false" :width="1024"  :destroy-on-close="true" wrap-class-name="admin-trading-modal" :body-style="{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 180px)' }" @cancel="closeReviewModal">
<template #title><template v-if="showReviewModal"><header class="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-full" :class="{
              'bg-blue-100': isReviewMode,
              'bg-slate-100': !isReviewMode
            }">
              <svg v-if="isReviewMode" class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <svg v-else class="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <div>
              <h2 class="text-xl font-semibold text-slate-900">{{ isReviewMode ? '借款单审核' : '订单详情' }}</h2>
              <p class="mt-0.5 text-sm text-slate-500">订单编号: {{ currentReviewOrder?.orderId }}</p>
            </div>
          </div>
          <a-button aria-label="关闭" type="text" html-type="button" class="text-slate-400 hover:text-slate-600 transition-colors" @click="closeReviewModal">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </a-button>
        </header></template></template>
<template v-if="showReviewModal">

        <!-- Tab 导航 -->
        <div class="shrink-0 border-b border-slate-200 bg-slate-50 px-6">
          <div class="flex gap-1">
            <a-button type="text"
              html-type="button"
              @click="detailTab = 'overview'"
              class="px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2"
              :class="detailTab === 'overview'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              <span>概览</span>
            </a-button>
            <a-button type="text"
              html-type="button"
              @click="detailTab = 'details'"
              class="px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2"
              :class="detailTab === 'details'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
              </svg>
              <span>借贷详情</span>
            </a-button>
            <a-button type="text"
              html-type="button"
              @click="detailTab = 'history'"
              class="px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2"
              :class="detailTab === 'history'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>历史借贷</span>
            </a-button>
            <a-button type="text"
              v-if="isReviewMode"
              html-type="button"
              @click="detailTab = 'review'"
              class="px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2"
              :class="detailTab === 'review'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>审核意见</span>
            </a-button>
          </div>
        </div>

        <!-- 内容区域：固定占用剩余高度，避免切换 Tab 时整窗伸缩 -->
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50">
          <!-- Tab: 概览 -->
          <div v-if="detailTab === 'overview'" class="p-6 space-y-5">
            <div class="grid gap-4 md:grid-cols-2">
              <div class="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-4">
                <div class="flex items-center gap-2 text-sm text-blue-700">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>本单申请金额</span>
                </div>
                <p class="mt-2 text-2xl font-bold text-blue-900">{{ formatCurrency(currentReviewOrder?.requestedAmount ?? currentReviewOrder?.loanAmount) }}</p>
                <p class="mt-1 text-xs text-blue-600">{{ currentReviewOrder?.loanCurrency }}</p>
              </div>

              <div class="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-4">
                <div class="flex items-center gap-2 text-sm text-indigo-700">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                  <span>授信剩余可借（本币种）</span>
                </div>
                <p class="mt-2 text-2xl font-bold text-indigo-900">{{ formatCurrency(creditSummary.available) }}</p>
                <p class="mt-1 text-xs text-indigo-600">已占用 {{ formatCurrency(creditSummary.used) }} / 上限 {{ formatCurrency(creditSummary.currencyCap) }}</p>
              </div>
            </div>

            <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                  <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                  </svg>
                </span>
                <span>授信信息</span>
              </h3>
              <p class="mb-4 text-xs text-slate-500">与运营端「授信中心」策略一致：单币种上限 + 账户总限额；以下为该用户在当前借出币种下的占用与剩余。信用分、VIP、认证与用户管理对齐。</p>
              <div
                v-if="creditSummary.profile"
                class="mb-4 rounded-lg border px-3 py-2.5 text-sm"
                :class="{
                  'border-emerald-200 bg-emerald-50/80 text-emerald-900': creditSummary.eligibilityLevel === 'ok',
                  'border-amber-200 bg-amber-50/80 text-amber-900': creditSummary.eligibilityLevel === 'warn',
                  'border-rose-200 bg-rose-50/80 text-rose-900': creditSummary.eligibilityLevel === 'risk'
                }"
              >
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-semibold">准入参考</span>
                  <span
                    class="inline-flex rounded px-2 py-0.5 text-[11px] font-medium"
                    :class="kycChipMeta(creditSummary.profile.kycStatus).class"
                  >{{ kycChipMeta(creditSummary.profile.kycStatus).text }}</span>
                  <span class="inline-flex rounded px-2 py-0.5 text-[11px] font-medium bg-violet-100 text-violet-800">{{ vipChipLabel(creditSummary.profile) }}</span>
                  <span class="inline-flex rounded px-2 py-0.5 text-[11px] font-medium tabular-nums bg-white/70 text-slate-800 ring-1 ring-slate-200/80">
                    信用分 {{ creditSummary.profile.creditScore }} / 800 · {{ creditSummary.scoreTier }}
                  </span>
                </div>
                <p class="mt-1.5 text-xs leading-relaxed opacity-90">{{ creditSummary.eligibilityDetail }}</p>
              </div>
              <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p class="text-xs font-medium text-slate-500">内部信用分</p>
                  <p class="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                    {{ creditSummary.profile?.creditScore ?? '—' }}
                    <span class="text-sm font-normal text-slate-500">/ 800</span>
                  </p>
                  <p class="mt-0.5 text-xs" :class="creditSummary.profile?.scoreTierClass || 'text-slate-500'">{{ creditSummary.scoreTier }}</p>
                </div>
                <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p class="text-xs font-medium text-slate-500">借出币种授信上限</p>
                  <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatCurrency(creditSummary.currencyCap) }}</p>
                  <p class="mt-0.5 text-xs text-slate-500">{{ currentReviewOrder?.loanCurrency }}</p>
                </div>
                <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p class="text-xs font-medium text-slate-500">账户级授信总上限（参考）</p>
                  <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatCurrency(creditSummary.accountCap) }}</p>
                  <p class="mt-0.5 text-xs text-slate-500">多产品共用额度池</p>
                </div>
                <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p class="text-xs font-medium text-slate-500">该用户本币种已占用</p>
                  <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatCurrency(creditSummary.used) }}</p>
                  <p class="mt-0.5 text-xs text-slate-500">含在途审核单</p>
                </div>
                <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p class="text-xs font-medium text-slate-500">本单通过后预计占用</p>
                  <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatCurrency(creditSummary.thisOrderExposure) }}</p>
                  <p class="mt-0.5 text-xs text-slate-500">待放款按申请额计</p>
                </div>
                <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p class="text-xs font-medium text-slate-500">授信状态</p>
                  <p class="mt-1">
                    <span class="inline-flex rounded-md px-2 py-0.5 text-xs font-medium" :class="creditSummary.available >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'">
                      {{ creditSummary.available >= 0 ? '额度充足' : '超出币种上限' }}
                    </span>
                  </p>
                </div>
              </div>
            </section>

            <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 class="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                    <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                  </span>
                  <span>用户信息</span>
                </h3>
                <a-button type="text"
                  html-type="button"
                  class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  @click.stop="openUserDrawerForCurrentModalOrder"
                >
                  用户档案（与用户管理一致）
                </a-button>
              </div>
              <div class="grid gap-4 md:grid-cols-3">
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">用户ID</label>
                  <p class="font-mono text-sm font-medium text-slate-900">{{ currentReviewOrder?.userId }}</p>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">用户姓名</label>
                  <p class="text-sm font-medium text-slate-900">{{ currentReviewOrder?.userName }}</p>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">申请时间</label>
                  <p class="text-sm text-slate-700">{{ currentReviewOrder?.createTime }}</p>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">邮箱</label>
                  <p class="text-sm text-slate-700">{{ currentReviewOrder?.email || '—' }}</p>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">联系电话</label>
                  <p class="text-sm text-slate-700">{{ currentReviewOrder?.phone || '—' }}</p>
                </div>
                <div v-if="creditSummary.profile" class="space-y-1 md:col-span-3">
                  <label class="text-xs font-medium text-slate-500">实名认证 · VIP（用户中心）</label>
                  <div class="flex flex-wrap items-center gap-2">
                    <span
                      class="inline-flex rounded-md px-2 py-0.5 text-xs font-medium"
                      :class="kycChipMeta(creditSummary.profile.kycStatus).class"
                    >{{ kycChipMeta(creditSummary.profile.kycStatus).text }}</span>
                    <span class="inline-flex rounded-md px-2 py-0.5 text-xs font-medium bg-violet-50 text-violet-800 ring-1 ring-violet-100">{{ vipChipLabel(creditSummary.profile) }}</span>
                    <span class="text-xs text-slate-500">信用分 {{ creditSummary.profile.creditScore }} / 800</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- Tab: 借贷详情 -->
          <div v-if="detailTab === 'details'" class="p-6 space-y-5">
            <!-- 产品与期限 -->
            <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                  <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                  </svg>
                </span>
                <span>产品信息</span>
              </h3>
              <div class="grid gap-4 md:grid-cols-2">
                <div class="rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-blue-700">产品名称</span>
                    <span class="text-lg font-bold text-blue-900">{{ currentReviewOrder?.productName }}</span>
                  </div>
                  <div class="mt-3 flex items-center justify-between">
                    <span class="text-sm font-medium text-blue-700">年化利率</span>
                    <span class="text-lg font-bold text-blue-900">{{ currentReviewOrder?.interestRate }}%</span>
                  </div>
                  <div class="mt-3 flex items-center justify-between">
                    <span class="text-sm font-medium text-blue-700">逾期违约金</span>
                    <span class="text-lg font-bold text-blue-900">{{ overduePenaltyRateLabel(currentReviewOrder) }}</span>
                  </div>
                </div>
                <div class="rounded-lg border border-purple-100 bg-purple-50 p-4">
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-purple-700">借款期限</span>
                    <span class="text-lg font-bold text-purple-900">{{ currentReviewOrder?.loanDuration }} 天</span>
                  </div>
                  <div class="mt-3 flex items-center justify-between">
                    <span class="text-sm font-medium text-purple-700">到期日期</span>
                    <span class="text-sm font-medium text-purple-900">{{ formatDate(currentReviewOrder?.maturityDate) }}</span>
                  </div>
                </div>
              </div>
            </section>

            <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                  <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 3.99c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z"/>
                  </svg>
                </span>
                <span>质押资产与风险处理</span>
              </h3>
              <div class="grid gap-4 md:grid-cols-4">
                <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p class="text-xs font-medium text-slate-500">质押币种</p>
                  <p class="mt-1 text-lg font-semibold text-slate-900">{{ currentReviewOrder?.collateralType || '—' }}</p>
                </div>
                <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p class="text-xs font-medium text-slate-500">锁定数量</p>
                  <p class="mt-1 text-lg font-semibold tabular-nums text-slate-900">{{ formatPlainNumber(currentReviewOrder?.collateralAmount) }}</p>
                </div>
                <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p class="text-xs font-medium text-slate-500">锁定价值</p>
                  <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatCurrency(currentReviewOrder?.collateralValue) }}</p>
                </div>
                <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p class="text-xs font-medium text-slate-500">状态</p>
                  <p class="mt-1">
                    <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="currentReviewOrder?.collateralStatus === 'deducted' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'">
                      {{ currentReviewOrder?.collateralStatus === 'deducted' ? '已扣除抵扣' : currentReviewOrder?.collateralAmount ? '锁定中' : '无质押' }}
                    </span>
                  </p>
                </div>
              </div>
              <div v-if="currentReviewOrder?.collateralAmount" class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                质押估值按实时币价计算；当待还债务达到质押实时估值的 {{ collateralWarningThresholdLabel(currentReviewOrder) }} 时进入风险预警，达到 {{ collateralDisposalThresholdLabel(currentReviewOrder) }} 时可执行逾期处理。当前 {{ collateralRiskStageMeta(currentReviewOrder).label }}，债务占比 {{ collateralDebtRatioLabel(currentReviewOrder) }}。
              </div>
            </section>

            <!-- 借款金额 -->
            <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </span>
                <span>借款信息</span>
              </h3>
              <div class="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                <div class="grid gap-4 md:grid-cols-3">
                  <div>
                    <p class="text-xs text-emerald-600">申请金额</p>
                    <p class="mt-1 text-2xl font-bold text-emerald-900">{{ formatCurrency(currentReviewOrder?.requestedAmount) }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-emerald-600">借出币种</p>
                    <p class="mt-1 text-xl font-bold text-emerald-900">{{ currentReviewOrder?.loanCurrency }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-emerald-600">预计利息</p>
                    <p class="mt-1 text-xl font-bold text-emerald-900">{{ formatCurrency(estimatedInterest) }}</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- Tab: 历史借贷 -->
          <div v-if="detailTab === 'history'" class="p-6 space-y-5">
            <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 class="mb-2 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                  <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                </span>
                <span>该用户历史借贷记录</span>
              </h3>
              <p class="mb-4 text-xs text-slate-500">同一用户 ID 下的全部订单（含本单），按创建时间倒序。</p>
              <div class="overflow-x-auto rounded-lg border border-slate-100">
                <a-table  size="small" :pagination="false" :data-source="userLendingHistoryPaged" :row-key="(row) => row.orderId" :scroll="{ x: 'max-content' }" :custom-row="(row, rowIndex) => ({ class: [&quot;border-t border-slate-100&quot;, { 'bg-blue-50/60': row.orderId === currentReviewOrder?.orderId }] })">
<a-table-column key="column-0" :custom-cell="(row, rowIndex) => ({ class: [&quot;px-3 py-2 font-mono text-xs text-slate-700&quot;] })">
<template #title>订单号</template>
<template #default="{ record: row, index: rowIndex }">{{ row.orderId }}</template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(row, rowIndex) => ({ class: [&quot;px-3 py-2 text-slate-800&quot;] })">
<template #title>产品</template>
<template #default="{ record: row, index: rowIndex }">{{ row.productName }}</template>
</a-table-column>
<a-table-column key="column-2" align="right" :custom-cell="(row, rowIndex) => ({ class: [&quot;px-3 py-2 text-right font-medium text-slate-900&quot;] })">
<template #title>金额</template>
<template #default="{ record: row, index: rowIndex }">
                        {{ formatCurrency(row.requestedAmount ?? row.loanAmount) }}
                        <span class="text-xs font-normal text-slate-500">{{ row.loanCurrency }}</span>
                      </template>
</a-table-column>
<a-table-column key="column-3" :custom-cell="(row, rowIndex) => ({ class: [&quot;px-3 py-2&quot;] })">
<template #title>状态</template>
<template #default="{ record: row, index: rowIndex }">
                        <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="{
                          'bg-blue-50 text-blue-700': row.status === 'pending',
                          'bg-emerald-50 text-emerald-700': row.status === 'active',
                          'bg-cyan-50 text-cyan-700': row.status === 'repaying',
                          'bg-orange-50 text-orange-700': row.status === 'overdue',
                          'bg-slate-100 text-slate-600': row.status === 'completed',
                          'bg-rose-50 text-rose-700': row.status === 'liquidated',
                          'bg-slate-100 text-slate-500': row.status === 'cancelled'
                        }">{{ statusLabel(row.status) }}</span>
                      </template>
</a-table-column>
<a-table-column key="column-4" :custom-cell="(row, rowIndex) => ({ class: [&quot;px-3 py-2 text-xs text-slate-600&quot;] })">
<template #title>创建时间</template>
<template #default="{ record: row, index: rowIndex }">{{ row.createTime }}</template>
</a-table-column>
<template #emptyText>暂无记录</template>
</a-table>
              </div>
              <AdminListPaginationBar
                :current-page="historyPage"
                :total-pages="historyTotalPages"
                :total-count="userLendingHistory.length"
                :page-size="historyPageSize"
                @update:current-page="historyPage = $event"
                @update:page-size="onHistoryPageSizeChange"
              />
            </section>
          </div>

          <!-- Tab: 审核意见（仅审核模式） -->
          <div v-if="detailTab === 'review' && isReviewMode" class="p-6">
            <section class="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
              <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-amber-900">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                  <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </span>
                <span>审核意见</span>
              </h3>
              <a-textarea
                v-model:value="reviewComment"
                rows="8"
                placeholder="请输入审核意见和理由（批准时选填，拒绝时必填）..."
                class="w-full rounded-lg border-2 border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-relaxed outline-none transition-colors focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200"
              ></a-textarea>
              <p class="mt-2 flex items-center gap-1 text-xs text-slate-500">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>审核意见将记录在系统中，请认真填写</span>
              </p>
            </section>
          </div>
        </div>

        <!-- 操作按钮 -->
        </template>
<template #footer><template v-if="showReviewModal"><footer class="shrink-0 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="text-sm text-slate-500">
              {{ isReviewMode ? '请仔细审核后做出决策' : '如需操作请联系管理员' }}
            </div>
            <div class="flex items-center gap-3">
              <a-button type="text"
                html-type="button"
                class="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                @click="closeReviewModal"
              >
                {{ isReviewMode ? '取消' : '关闭' }}
              </a-button>
              <template v-if="isReviewMode">
                <a-button type="text"
                  html-type="button"
                  class="rounded-lg border border-rose-300 bg-rose-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-rose-600 flex items-center gap-2"
                  @click="rejectOrder"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                  <span>拒绝申请</span>
                </a-button>
                <a-button type="text"
                  v-if="canDeductCollateral(currentReviewOrder)"
                  html-type="button"
                  class="rounded-lg border border-rose-300 bg-white px-5 py-2.5 text-sm font-medium text-rose-600 shadow-sm transition-colors hover:bg-rose-50"
                  @click="openDeductDialog(currentReviewOrder)"
                >
                  {{ deductActionText(currentReviewOrder) }}
                </a-button>
                <a-button type="text"
                  html-type="button"
                  class="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-emerald-600 hover:to-emerald-700 flex items-center gap-2"
                  @click="approveOrder"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  <span>批准放款</span>
                </a-button>
              </template>
            </div>
          </div>
        </footer></template></template>
</a-modal>
    </Teleport>

    <Teleport to="body">
      <a-modal :wrap-props="{ 'aria-modal': true }" transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :open="Boolean(showDeductModal)" :mask-closable="false" :closable="false" :keyboard="false" :width="672"  :destroy-on-close="true" wrap-class-name="admin-trading-modal" :body-style="{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 180px)' }" @cancel="closeDeductDialog">
<template #title><template v-if="showDeductModal"><header class="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-rose-600">{{ deductActionText(deductOrder) }}</p>
              <h2 class="mt-1 text-xl font-semibold text-slate-900">确认{{ deductActionText(deductOrder) }}质押资产</h2>
              <p class="mt-1 text-sm text-slate-500">{{ deductActionDescription(deductOrder) }}确认后订单将标记为「违约结清」，待还债务清零。</p>
            </div>
            <a-button aria-label="关闭" type="text" html-type="button" class="text-slate-400 transition hover:text-slate-600" @click="closeDeductDialog">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </a-button>
          </header></template></template>
<template v-if="showDeductModal">

          <div v-if="deductOrder" class="space-y-4 p-6">
            <div class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-900">
              此操作只处理用户借款时锁定的质押币种，不扣理财账户余额，也不扣其他账户资产；请确认订单与资产信息无误。
            </div>

            <dl class="grid gap-3 md:grid-cols-2">
              <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <dt class="text-xs font-medium text-slate-500">订单编号</dt>
                <dd class="mt-1 font-mono text-sm font-semibold text-slate-900">{{ deductOrder.orderId }}</dd>
              </div>
              <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <dt class="text-xs font-medium text-slate-500">用户</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ deductOrder.userName }}（{{ deductOrder.userId }}）</dd>
              </div>
              <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <dt class="text-xs font-medium text-slate-500">待还债务</dt>
                <dd class="mt-1 text-lg font-bold text-rose-700">{{ formatCurrency(deductOrder.totalDebt) }} <span class="text-sm font-medium text-slate-500">{{ deductOrder.loanCurrency }}</span></dd>
              </div>
              <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <dt class="text-xs font-medium text-slate-500">质押资产</dt>
                <dd class="mt-1 text-lg font-bold text-slate-900">{{ formatPlainNumber(deductOrder.collateralAmount) }} <span class="text-sm font-medium text-slate-500">{{ deductOrder.collateralType }}</span></dd>
              </div>
              <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <dt class="text-xs font-medium text-slate-500">质押估值</dt>
                <dd class="mt-1 text-lg font-bold text-slate-900">{{ formatCurrency(deductOrder.collateralValue) }}</dd>
              </div>
              <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <dt class="text-xs font-medium text-slate-500">债务占比 / 预警 / 处理</dt>
                <dd class="mt-1 text-lg font-bold text-rose-700">{{ collateralDebtRatioLabel(deductOrder) }} / {{ collateralWarningThresholdLabel(deductOrder) }} / {{ collateralDisposalThresholdLabel(deductOrder) }}</dd>
              </div>
              <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <dt class="text-xs font-medium text-slate-500">处理后状态</dt>
                <dd class="mt-1"><span class="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">违约结清</span></dd>
              </div>
            </dl>

            <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
              {{ deductActionText(deductOrder) }}记录会写入「信用借贷 / 操作日志」。生产环境按实时价格和待还债务拆分计算实际扣除数量；若质押资产价值高于应还债务，差额退回用户借款时的质押账户。
            </div>
          </div>

          </template>
<template #footer><template v-if="showDeductModal"><footer class="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <a-button type="text" html-type="button" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="closeDeductDialog">
              取消
            </a-button>
            <a-button type="text" html-type="button" class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!canDeductCollateral(deductOrder)" @click="confirmDeductCollateral">
              确认{{ deductActionText(deductOrder) }}并结清
            </a-button>
          </footer></template></template>
</a-modal>
    </Teleport>

    <Teleport to="body">
      <a-modal :wrap-props="{ 'aria-modal': true }" transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :open="Boolean(showBatchDeductModal)" :mask-closable="false" :closable="false" :keyboard="false" :width="896"  :destroy-on-close="true" wrap-class-name="admin-trading-modal" :body-style="{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 180px)' }" @cancel="closeBatchDeductDialog">
<template #title><template v-if="showBatchDeductModal"><header class="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-rose-600">{{ batchDeductActionText }}</p>
              <h2 class="mt-1 text-xl font-semibold text-slate-900">确认{{ batchDeductActionText }}质押资产</h2>
              <p class="mt-1 text-sm text-slate-500">确认后所选订单将统一标记为「违约结清」，待还债务清零。</p>
            </div>
            <a-button aria-label="关闭" type="text" html-type="button" class="text-slate-400 transition hover:text-slate-600" @click="closeBatchDeductDialog">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </a-button>
          </header></template></template>
<template v-if="showBatchDeductModal">

          <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
            <div class="grid gap-3 md:grid-cols-3">
              <div class="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <p class="text-xs font-medium text-slate-500">处理订单</p>
                <p class="mt-1 text-2xl font-bold text-slate-900">{{ selectedDeductOrders.length }}</p>
              </div>
              <div class="rounded-lg border border-rose-100 bg-rose-50 p-4">
                <p class="text-xs font-medium text-rose-600">待还债务合计</p>
                <p class="mt-1 text-2xl font-bold text-rose-700">{{ formatCurrency(batchDeductDebtTotal) }}</p>
              </div>
              <div class="rounded-lg border border-amber-100 bg-amber-50 p-4">
                <p class="text-xs font-medium text-amber-700">质押估值合计</p>
                <p class="mt-1 text-2xl font-bold text-amber-900">{{ formatCurrency(batchDeductCollateralValueTotal) }}</p>
              </div>
            </div>

            <div class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-900">
              批量操作会逐笔处理已锁定质押资产并写入操作日志；仅处理达到处理阈值的风险订单，差额退回用户借款时的质押账户。
            </div>

            <div class="overflow-hidden rounded-lg border border-slate-200">
              <a-table  size="small" :pagination="false" :data-source="selectedDeductOrders" :row-key="(order) => `batch-${order.orderId}`" :scroll="{ x: 'max-content' }" :custom-row="(order, rowIndex) => ({ class: [&quot;border-t border-slate-100&quot;] })">
<a-table-column key="column-0" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-3 py-2 font-mono text-xs text-slate-700&quot;] })">
<template #title>订单</template>
<template #default="{ record: order, index: rowIndex }">{{ order.orderId }}</template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-3 py-2 text-slate-800&quot;] })">
<template #title>用户</template>
<template #default="{ record: order, index: rowIndex }">{{ order.userName }}</template>
</a-table-column>
<a-table-column key="column-2" align="right" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-3 py-2 text-right font-medium text-rose-700&quot;] })">
<template #title>待还</template>
<template #default="{ record: order, index: rowIndex }">{{ formatCurrency(order.totalDebt) }}</template>
</a-table-column>
<a-table-column key="column-3" align="right" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-3 py-2 text-right tabular-nums text-slate-900&quot;] })">
<template #title>质押资产</template>
<template #default="{ record: order, index: rowIndex }">{{ formatPlainNumber(order.collateralAmount) }} {{ order.collateralType }}</template>
</a-table-column>
<a-table-column key="column-4" align="right" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-3 py-2 text-right font-medium text-slate-900&quot;] })">
<template #title>估值</template>
<template #default="{ record: order, index: rowIndex }">{{ formatCurrency(order.collateralValue) }}</template>
</a-table-column>
<a-table-column key="column-5" align="right" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-3 py-2 text-right font-medium text-rose-700&quot;] })">
<template #title>占比/预警/处理</template>
<template #default="{ record: order, index: rowIndex }">{{ collateralDebtRatioLabel(order) }} / {{ collateralWarningThresholdLabel(order) }} / {{ collateralDisposalThresholdLabel(order) }}</template>
</a-table-column>
</a-table>
            </div>
          </div>

          </template>
<template #footer><template v-if="showBatchDeductModal"><footer class="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <a-button type="text" html-type="button" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="closeBatchDeductDialog">
              取消
            </a-button>
            <a-button type="text" html-type="button" class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="selectedDeductOrders.length === 0" @click="confirmBatchDeductCollateral">
              确认{{ batchDeductActionText }}
            </a-button>
          </footer></template></template>
</a-modal>
    </Teleport>

    <UserDetailDrawer
      :visible="showUserDrawer"
      :user="drawerUser"
      @close="closeUserDrawer"
    />
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { mockOrders } from '../../../admin/mock/cryptoLending'
import { lendingProductsCatalog } from '../../../admin/state/financeCatalogs'
import {
  LOAN_ORDER_STATUS,
  LOAN_ORDER_STATUS_LABELS,
  normalizeOverduePenaltyRate,
  normalizeCollateralWarningThreshold,
  normalizeCollateralDisposalThreshold
} from '../../../admin/constants/cryptoLending'
import { usersList } from '../../../admin/mock/user'
import { USER_STATUS, USER_ROLE, USER_KYC_STATUS } from '../../../admin/constants/user'
import { lendingCreditPolicy } from '../../../admin/mock/lendingCreditConfig'
import {
  LENDING_OP_ACTION,
  LENDING_OP_MODULE
} from '../../../admin/constants/lendingOperationLog'
import { appendLendingOperationLog } from '../../../admin/state/lendingOperationLogs'
import UserDetailDrawer from '../../../admin/components/user/UserDetailDrawer.vue'
import AdminListPaginationBar from '../../../admin/components/AdminListPaginationBar.vue'

const orders = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const selectedOrderIds = ref([])

const filters = ref({
  status: '',
  collateralRisk: '',
  userId: ''
})

const orderStatusOptions = [
  { value: LOAN_ORDER_STATUS.PENDING, label: '待审核' },
  { value: LOAN_ORDER_STATUS.ACTIVE, label: '借贷中' },
  { value: LOAN_ORDER_STATUS.REPAYING, label: '还款中' },
  { value: LOAN_ORDER_STATUS.OVERDUE, label: '逾期' },
  { value: LOAN_ORDER_STATUS.COMPLETED, label: '已完成' },
  { value: LOAN_ORDER_STATUS.LIQUIDATED, label: '违约结清' },
  { value: LOAN_ORDER_STATUS.CANCELLED, label: '已取消' }
]

const collateralRiskOptions = [
  { value: 'normal', label: '风险正常' },
  { value: 'warning', label: '风险预警' },
  { value: 'disposal', label: '触达处理阈值' }
]

onMounted(() => {
  orders.value = mockOrders
})

// 计算属性：预计总利息
const estimatedInterest = computed(() => {
  if (!currentReviewOrder.value) return 0
  const amount = currentReviewOrder.value.requestedAmount || currentReviewOrder.value.loanAmount || 0
  const rate = (currentReviewOrder.value.interestRate || 0) / 100
  const days = currentReviewOrder.value.loanDuration || 0
  return Number((amount * rate * days / 365).toFixed(2))
})

const filteredOrders = computed(() => {
  let result = orders.value

  if (filters.value.status) {
    result = result.filter(o => o.status === filters.value.status)
  }
  if (filters.value.collateralRisk) {
    result = result.filter((o) => {
      if (!o.collateralValue) return false
      return collateralRiskStageMeta(o).key === filters.value.collateralRisk
    })
  }
  if (filters.value.userId) {
    result = result.filter(o => o.userId.includes(filters.value.userId))
  }

  return result
})

const selectableFilteredOrders = computed(() =>
  filteredOrders.value.filter((order) => canDeductCollateral(order))
)

const selectedDeductOrders = computed(() =>
  orders.value.filter((order) => selectedOrderIds.value.includes(order.orderId) && canDeductCollateral(order))
)

const allSelectableChecked = computed(() =>
  selectableFilteredOrders.value.length > 0 &&
  selectableFilteredOrders.value.every((order) => selectedOrderIds.value.includes(order.orderId))
)

const someSelectableChecked = computed(() =>
  selectableFilteredOrders.value.some((order) => selectedOrderIds.value.includes(order.orderId))
)

const batchDeductDebtTotal = computed(() =>
  selectedDeductOrders.value.reduce((sum, order) => sum + (Number(order.totalDebt) || 0), 0)
)

const batchDeductCollateralValueTotal = computed(() =>
  selectedDeductOrders.value.reduce((sum, order) => sum + (Number(order.collateralValue) || 0), 0)
)

const isOverdueDeductOrder = (order) => order?.status === LOAN_ORDER_STATUS.OVERDUE

const deductActionText = (order) => {
  if (!order) return '处理质押'
  return isOverdueDeductOrder(order) ? '逾期处理' : '风险处理'
}

const deductActionDescription = (order) => {
  if (isOverdueDeductOrder(order)) {
    return '订单已到期未还，且债务占比触达处理阈值后，可执行逾期处理；'
  }
  return '订单虽未到期，但债务占比已触达处理阈值后，可执行风险处理；'
}

const batchDeductActionText = computed(() => {
  if (!selectedDeductOrders.value.length) return '批量处理质押'
  const allOverdue = selectedDeductOrders.value.every((order) => isOverdueDeductOrder(order))
  const allRisk = selectedDeductOrders.value.every((order) => !isOverdueDeductOrder(order))
  if (allOverdue) return '批量逾期处理'
  if (allRisk) return '批量风险处理'
  return '批量处理质押'
})

const totalPages = computed(() => {
  return Math.ceil(filteredOrders.value.length / pageSize.value)
})

const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0'
  }
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(value)
}

const formatPlainNumber = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return '—'
  return n.toLocaleString(undefined, { maximumFractionDigits: 8 })
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return dateStr.split(' ')[0]
}

const statusLabel = (status) => {
  return LOAN_ORDER_STATUS_LABELS[status] || status
}

const statusChipClass = (status) => {
  const statusClassMap = {
    [LOAN_ORDER_STATUS.PENDING]: 'bg-blue-50 text-blue-700',
    [LOAN_ORDER_STATUS.ACTIVE]: 'bg-emerald-50 text-emerald-700',
    [LOAN_ORDER_STATUS.REPAYING]: 'bg-cyan-50 text-cyan-700',
    [LOAN_ORDER_STATUS.OVERDUE]: 'bg-orange-50 text-orange-700',
    [LOAN_ORDER_STATUS.COMPLETED]: 'bg-slate-100 text-slate-600',
    [LOAN_ORDER_STATUS.LIQUIDATED]: 'bg-rose-50 text-rose-700',
    [LOAN_ORDER_STATUS.CANCELLED]: 'bg-slate-100 text-slate-500'
  }
  return statusClassMap[status] || 'bg-slate-100 text-slate-600'
}

const overduePenaltyRateLabel = (order) => {
  const product = productForOrder(order)
  return `${normalizeOverduePenaltyRate({ ...product, ...order })}% / 日`
}

const productForOrder = (order) =>
  lendingProductsCatalog.value.find((p) => p.productId === order?.productId) ?? null

const collateralDisposalThreshold = (order) => {
  const product = productForOrder(order)
  return normalizeCollateralDisposalThreshold({ ...product, ...order })
}

const collateralWarningThreshold = (order) => {
  const product = productForOrder(order)
  return normalizeCollateralWarningThreshold({ ...product, ...order })
}

const collateralWarningThresholdLabel = (order) => `${collateralWarningThreshold(order)}%`
const collateralDisposalThresholdLabel = (order) => `${collateralDisposalThreshold(order)}%`

const collateralDebtRatio = (order) => {
  const debt = Number(order?.totalDebt)
  const collateralValue = Number(order?.collateralValue)
  if (!Number.isFinite(debt) || !Number.isFinite(collateralValue) || collateralValue <= 0) return 0
  return (debt / collateralValue) * 100
}

const collateralDebtRatioLabel = (order) => `${collateralDebtRatio(order).toFixed(2)}%`

const collateralDisposalReached = (order) =>
  collateralDebtRatio(order) >= collateralDisposalThreshold(order)

const collateralRiskStageMeta = (order) => {
  const ratio = collateralDebtRatio(order)
  const warning = collateralWarningThreshold(order)
  const disposal = collateralDisposalThreshold(order)
  if (ratio >= disposal) {
    return {
      key: 'disposal',
      label: '触达处理阈值',
      chipClass: 'bg-rose-50 text-rose-700',
      hintClass: 'font-medium text-rose-600'
    }
  }
  if (ratio >= warning) {
    return {
      key: 'warning',
      label: '质押风险预警',
      chipClass: 'bg-amber-50 text-amber-700',
      hintClass: 'font-medium text-amber-700'
    }
  }
  return {
    key: 'normal',
    label: '质押风险正常',
    chipClass: 'bg-emerald-50 text-emerald-700',
    hintClass: 'text-slate-500'
  }
}

const resetFilters = () => {
  filters.value = {
    status: '',
    collateralRisk: '',
    userId: ''
  }
}

const exportOrders = () => {
  alert('导出订单数据')
}

const canDeductCollateral = (order) => {
  if (!order) return false
  if (order.overdueDeductEnabled === false) return false
  if (!order.collateralAmount || order.collateralStatus === 'deducted') return false
  if (![LOAN_ORDER_STATUS.ACTIVE, LOAN_ORDER_STATUS.REPAYING, LOAN_ORDER_STATUS.OVERDUE].includes(order.status)) return false
  return collateralDisposalReached(order)
}

const openDeductDialog = (order) => {
  if (!canDeductCollateral(order)) return
  deductOrder.value = order
  showDeductModal.value = true
}

const closeDeductDialog = () => {
  showDeductModal.value = false
  deductOrder.value = null
}

const toggleOrderSelection = (order) => {
  if (!canDeductCollateral(order)) return
  const id = order.orderId
  selectedOrderIds.value = selectedOrderIds.value.includes(id)
    ? selectedOrderIds.value.filter((x) => x !== id)
    : [...selectedOrderIds.value, id]
}

const toggleAllSelectableOrders = () => {
  const ids = selectableFilteredOrders.value.map((order) => order.orderId)
  if (!ids.length) return
  if (allSelectableChecked.value) {
    selectedOrderIds.value = selectedOrderIds.value.filter((id) => !ids.includes(id))
  } else {
    selectedOrderIds.value = [...new Set([...selectedOrderIds.value, ...ids])]
  }
}

const clearSelectedOrders = () => {
  selectedOrderIds.value = []
}

const openBatchDeductDialog = () => {
  if (!selectedDeductOrders.value.length) return
  showBatchDeductModal.value = true
}

const closeBatchDeductDialog = () => {
  showBatchDeductModal.value = false
}

const viewOrder = (order) => {
  currentReviewOrder.value = order
  reviewComment.value = ''
  isReviewMode.value = false
  detailTab.value = 'overview'
  showReviewModal.value = true
}

// 审核相关
const showReviewModal = ref(false)
const currentReviewOrder = ref(null)
const reviewComment = ref('')
const isReviewMode = ref(false)
const detailTab = ref('overview')
const showDeductModal = ref(false)
const deductOrder = ref(null)
const showBatchDeductModal = ref(false)

const showUserDrawer = ref(false)
const drawerUser = ref(null)

const loanExposureAmount = (o) => {
  if (!o) return 0
  const st = o.status
  if (st === 'pending') return Number(o.requestedAmount ?? o.loanAmount ?? 0) || 0
  if (st === 'active' || st === 'repaying' || st === 'overdue') return Number(o.totalDebt ?? o.loanAmount ?? 0) || 0
  return 0
}

const usedCreditSameCurrency = (userId, loanCurrency) => {
  let sum = 0
  for (const o of orders.value) {
    if (o.userId !== userId) continue
    if (o.loanCurrency !== loanCurrency) continue
    sum += loanExposureAmount(o)
  }
  return sum
}

function findPlatformUser(lendingOrder) {
  if (!lendingOrder) return null
  const byEmail = usersList.find((u) => u.email === lendingOrder.email)
  if (byEmail) return byEmail
  const suffix = String(lendingOrder.userId || '').replace(/\D/g, '')
  if (suffix) {
    const id = `user_${suffix}`
    const byId = usersList.find((u) => u.id === id)
    if (byId) return byId
  }
  return null
}

function scoreTierFromScore(sc) {
  const n = Number(sc) || 0
  if (n >= 750) return '优秀'
  if (n >= 650) return '良好'
  return '一般'
}

function scoreTierClassFromScore(sc) {
  const n = Number(sc) || 0
  if (n >= 750) return 'text-emerald-600'
  if (n >= 650) return 'text-amber-600'
  return 'text-rose-600'
}

function inferKycFromCreditScore(score) {
  const n = Number(score) || 0
  if (n >= 720) return USER_KYC_STATUS.VERIFIED
  if (n >= 620) return USER_KYC_STATUS.PENDING
  return USER_KYC_STATUS.NOT_VERIFIED
}

function inferVipFromCreditScore(score) {
  const n = Number(score) || 0
  const vipLevel = Math.min(5, Math.max(0, Math.floor(n / 150)))
  return { vipLevel, isVip: vipLevel >= 1 || n >= 700 }
}

/** 与用户管理一致：优先平台用户，否则按订单信用分推断 KYC/VIP */
function resolveLendingUserProfile(order) {
  if (!order) return null
  const pu = findPlatformUser(order)
  const orderScore = Number(order.creditScore) || 0
  if (pu) {
    const sc = Number(pu.creditScore) || orderScore
    return {
      source: 'platform',
      creditScore: sc,
      kycStatus: pu.kycStatus,
      vipLevel: Number(pu.vipLevel) || 0,
      isVip: Boolean(pu.isVip),
      scoreTier: scoreTierFromScore(sc),
      scoreTierClass: scoreTierClassFromScore(sc)
    }
  }
  const sc = orderScore
  const { vipLevel, isVip } = inferVipFromCreditScore(sc)
  return {
    source: 'inferred',
    creditScore: sc,
    kycStatus: inferKycFromCreditScore(sc),
    vipLevel,
    isVip,
    scoreTier: scoreTierFromScore(sc),
    scoreTierClass: scoreTierClassFromScore(sc)
  }
}

const kycChipMeta = (kycStatus) => {
  const map = {
    [USER_KYC_STATUS.NOT_VERIFIED]: { text: '未认证', class: 'bg-slate-100 text-slate-700' },
    [USER_KYC_STATUS.PENDING]: { text: '初级认证', class: 'bg-blue-50 text-blue-700' },
    [USER_KYC_STATUS.VERIFIED]: { text: '高级认证', class: 'bg-emerald-50 text-emerald-700' },
    [USER_KYC_STATUS.REJECTED]: { text: '未认证', class: 'bg-slate-100 text-slate-700' }
  }
  return map[kycStatus] || map[USER_KYC_STATUS.NOT_VERIFIED]
}

const vipChipLabel = (profile) => {
  if (!profile) return '—'
  if (!profile.isVip && profile.vipLevel <= 0) return '普通用户'
  return `VIP${profile.vipLevel}`
}

const creditSummary = computed(() => {
  const o = currentReviewOrder.value
  if (!o) {
    return {
      accountCap: 0,
      currencyCap: 0,
      used: 0,
      available: 0,
      thisOrderExposure: 0,
      scoreTier: '—',
      profile: null,
      eligibilityLevel: 'ok',
      eligibilityDetail: ''
    }
  }
  const cur = o.loanCurrency || 'USDT'
  const accountCap = Number(lendingCreditPolicy.accountTotalCapNotional) || 0
  const capMap = lendingCreditPolicy.capByLoanCurrency || {}
  const currencyCap = Number(capMap[cur] ?? accountCap) || accountCap
  const used = usedCreditSameCurrency(o.userId, cur)
  const thisOrderExposure = loanExposureAmount(o)
  const available = Math.max(0, currencyCap - used)
  const profile = resolveLendingUserProfile(o)
  const sc = profile?.creditScore ?? 0
  const scoreTier = profile?.scoreTier ?? scoreTierFromScore(sc)

  let eligibilityLevel = 'ok'
  let eligibilityDetail = '实名与信用分满足常规借贷准入（演示规则）。'
  if (profile) {
    if (
      profile.kycStatus === USER_KYC_STATUS.NOT_VERIFIED ||
      profile.kycStatus === USER_KYC_STATUS.REJECTED
    ) {
      eligibilityLevel = 'risk'
      eligibilityDetail = '用户未实名或认证未通过，建议拒绝或要求完成认证后再审。'
    } else if (profile.kycStatus === USER_KYC_STATUS.PENDING) {
      eligibilityLevel = 'warn'
      eligibilityDetail = '仅为初级认证，可酌情放款或要求升级为高级认证。'
    }
    if (sc < 600) {
      if (eligibilityLevel === 'ok') eligibilityLevel = 'warn'
      if (eligibilityLevel === 'warn' && sc < 550) eligibilityLevel = 'risk'
      eligibilityDetail +=
        sc < 550
          ? ' 信用分过低，风险较高。'
          : ' 信用分偏低，请结合授信额度综合判断。'
    }
  }

  return {
    accountCap,
    currencyCap,
    used,
    available,
    thisOrderExposure,
    scoreTier,
    profile,
    eligibilityLevel,
    eligibilityDetail
  }
})

const userLendingHistory = computed(() => {
  const o = currentReviewOrder.value
  if (!o?.userId) return []
  const list = orders.value.filter((x) => x.userId === o.userId)
  return [...list].sort((a, b) => String(b.createTime).localeCompare(String(a.createTime)))
})

const historyPage = ref(1)
const historyPageSize = ref(10)

const historyTotalPages = computed(() =>
  Math.max(1, Math.ceil(userLendingHistory.value.length / historyPageSize.value))
)

const userLendingHistoryPaged = computed(() => {
  const list = userLendingHistory.value
  const page = Math.min(historyPage.value, historyTotalPages.value)
  const start = (page - 1) * historyPageSize.value
  return list.slice(start, start + historyPageSize.value)
})

watch(
  () => currentReviewOrder.value?.orderId,
  () => {
    historyPage.value = 1
  }
)

watch([() => userLendingHistory.value.length, historyPageSize], () => {
  const tp = Math.max(1, Math.ceil(userLendingHistory.value.length / historyPageSize.value))
  if (historyPage.value > tp) historyPage.value = tp
})

const onHistoryPageSizeChange = (n) => {
  historyPageSize.value = n
  historyPage.value = 1
}

function buildUserDetailFromLendingOrder(order) {
  const m = findPlatformUser(order)
  if (m) return m
  const p = resolveLendingUserProfile(order)
  const uid = order.userId || 'unknown'
  const sc = Math.min(800, p?.creditScore || 650)
  return {
    id: uid,
    username: order.userName || '—',
    email: order.email || '—',
    phone: order.phone,
    role: USER_ROLE.USER,
    status: USER_STATUS.ACTIVE,
    kycStatus: p?.kycStatus ?? USER_KYC_STATUS.NOT_VERIFIED,
    isVip: Boolean(p?.isVip),
    vipLevel: p?.vipLevel ?? 0,
    creditScore: sc,
    balance: Math.max(1000, Math.floor(sc * 120)),
    frozenBalance: 0,
    totalProfit: Math.floor(sc * 10),
    tradingVolume: sc * 500,
    parentId: null,
    parentUsername: null,
    registerTime: order.createTime || new Date().toISOString(),
    lastLoginTime: order.updateTime || order.createTime || new Date().toISOString(),
    lastLoginIp: '10.0.0.1',
    remark: ''
  }
}

const openUserDrawerFromOrder = (order) => {
  drawerUser.value = buildUserDetailFromLendingOrder(order)
  showUserDrawer.value = true
}

const openUserDrawerForCurrentModalOrder = () => {
  if (!currentReviewOrder.value) return
  openUserDrawerFromOrder(currentReviewOrder.value)
}

const closeUserDrawer = () => {
  showUserDrawer.value = false
  drawerUser.value = null
}

const reviewOrder = (order) => {
  currentReviewOrder.value = order
  reviewComment.value = ''
  isReviewMode.value = true
  detailTab.value = 'overview'
  showReviewModal.value = true
}

const closeReviewModal = () => {
  showReviewModal.value = false
  currentReviewOrder.value = null
  reviewComment.value = ''
  isReviewMode.value = false
  detailTab.value = 'overview'
}

const approveOrder = () => {
  if (!currentReviewOrder.value) return
  const oid = currentReviewOrder.value.orderId
  const cmt = reviewComment.value.trim()

  // 更新订单状态为活跃
  const order = orders.value.find(o => o.orderId === oid)
  if (order) {
    order.status = 'active'
    if (order.collateralAmount && !order.collateralStatus) order.collateralStatus = 'locked'
    order.updateTime = new Date().toISOString().replace('T', ' ').substring(0, 19)
  }

  appendLendingOperationLog({
    module: LENDING_OP_MODULE.ORDER,
    action: LENDING_OP_ACTION.ORDER_APPROVE,
    refId: oid,
    targetLabel: '借款单审核',
    summary: cmt ? `批准放款；审核意见：${cmt}` : '批准放款（无备注）'
  })

  alert(`订单 ${oid} 已批准放款\n${cmt ? '审核意见: ' + cmt : ''}`)
  closeReviewModal()
}

const deductCollateral = (order) => {
  if (!canDeductCollateral(order)) return
  const debtRatioLabel = collateralDebtRatioLabel(order)
  const thresholdLabel = collateralDisposalThresholdLabel(order)
  order.collateralStatus = 'deducted'
  order.status = LOAN_ORDER_STATUS.LIQUIDATED
  order.interestAccrued = 0
  order.totalDebt = 0
  order.daysRemaining = 0
  order.updateTime = new Date().toISOString().replace('T', ' ').substring(0, 19)
  appendLendingOperationLog({
    module: LENDING_OP_MODULE.ORDER,
    action: LENDING_OP_ACTION.ORDER_COLLATERAL_DEDUCT,
    refId: order.orderId,
    targetLabel: deductActionText(order),
    summary: `${deductActionText(order)}：债务占比 ${debtRatioLabel} 触达处理阈值 ${thresholdLabel}，处理 ${formatPlainNumber(order.collateralAmount)} ${order.collateralType} 并违约结清`
  })
  if (currentReviewOrder.value?.orderId === order.orderId) currentReviewOrder.value = order
}

const confirmDeductCollateral = () => {
  if (!deductOrder.value) return
  deductCollateral(deductOrder.value)
  selectedOrderIds.value = selectedOrderIds.value.filter((id) => id !== deductOrder.value.orderId)
  closeDeductDialog()
}

const confirmBatchDeductCollateral = () => {
  const rows = [...selectedDeductOrders.value]
  if (!rows.length) return
  rows.forEach((order) => deductCollateral(order))
  const doneIds = rows.map((order) => order.orderId)
  selectedOrderIds.value = selectedOrderIds.value.filter((id) => !doneIds.includes(id))
  closeBatchDeductDialog()
}

const rejectOrder = () => {
  if (!currentReviewOrder.value) return

  if (!reviewComment.value.trim()) {
    alert('拒绝申请时必须填写审核意见')
    return
  }

  const oid = currentReviewOrder.value.orderId
  const reason = reviewComment.value.trim()

  appendLendingOperationLog({
    module: LENDING_OP_MODULE.ORDER,
    action: LENDING_OP_ACTION.ORDER_REJECT,
    refId: oid,
    targetLabel: '借款单审核',
    summary: `拒绝申请；原因：${reason}`
  })

  // 从订单列表中移除
  const index = orders.value.findIndex(o => o.orderId === oid)
  if (index > -1) {
    orders.value.splice(index, 1)
  }

  alert(`订单 ${oid} 已拒绝\n拒绝理由: ${reason}`)
  closeReviewModal()
}

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}
</script>
