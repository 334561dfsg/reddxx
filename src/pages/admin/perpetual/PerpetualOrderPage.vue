<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">永续合约订单</h1>
        <p class="mt-1 text-sm text-slate-500">监控用户永续合约仓位、盈亏与风险状态</p>
      </div>
    </header>

    <article class="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm relative min-h-[400px]">
      <div class="flex items-center justify-between border-b border-slate-200 p-4 bg-white">
        <h3 class="text-base font-semibold text-slate-900">订单列表</h3>
        <a-button
          html-type="button"
          class="ant-btn inline-flex items-center gap-2"
          @click="exportOrders"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          <span>导出订单</span>
        </a-button>
      </div>

      <!-- 筛选区域 -->
      <div class="p-4 border-b border-slate-100 bg-slate-50/30">
        <div class="flex flex-wrap items-center gap-3">
          <!-- 基础筛选 -->
          <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="filters.status" class="!w-32">
            <a-select-option value="">全部状态</a-select-option>
            <a-select-option :value="PERPETUAL_ORDER_STATUS.HOLDING">持仓中</a-select-option>
            <a-select-option :value="PERPETUAL_ORDER_STATUS.CLOSED">已平仓</a-select-option>
            <a-select-option :value="PERPETUAL_ORDER_STATUS.LIQUIDATED">已爆仓</a-select-option>
          </a-select>

          <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="filters.symbol" class="!w-40">
            <a-select-option value="">全部交易对</a-select-option>
            <a-select-option value="BTC/USDT">BTC/USDT</a-select-option>
            <a-select-option value="ETH/USDT">ETH/USDT</a-select-option>
            <a-select-option value="BNB/USDT">BNB/USDT</a-select-option>
            <a-select-option value="SOL/USDT">SOL/USDT</a-select-option>
          </a-select>

          <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="filters.side" class="!w-32">
            <a-select-option value="">全部方向</a-select-option>
            <a-select-option :value="PERPETUAL_ORDER_SIDE.LONG">多</a-select-option>
            <a-select-option :value="PERPETUAL_ORDER_SIDE.SHORT">空</a-select-option>
          </a-select>

          <a-input v-model:value="filters.userId" type="text" placeholder="搜索用户 ID..." class="ant-input !w-64 !py-1.5" />

          <!-- 高级筛选展开按钮 -->
          <a-button html-type="button" class="ant-btn flex items-center gap-1 !py-1.5" @click="showAdvancedFilters = !showAdvancedFilters">
            <span>{{ showAdvancedFilters ? '收起' : '高级筛选' }}</span>
            <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': showAdvancedFilters }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </a-button>

          <a-button html-type="button" class="ant-btn !py-1.5" @click="resetFilters">重置</a-button>
        </div>
      </div>

      <!-- 高级筛选 -->
      <div v-show="showAdvancedFilters" class="border-b border-slate-200 bg-slate-50/50 px-4 py-3">
        <div class="grid gap-3 md:grid-cols-4">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">杠杆倍数范围</label>
            <div class="flex items-center gap-2">
              <a-input v-model:value="filters.minLeverage" type="number" placeholder="最小" class="ant-input !py-1.5" />
              <span class="text-slate-500">-</span>
              <a-input v-model:value="filters.maxLeverage" type="number" placeholder="最大" class="ant-input !py-1.5" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">仓位价值范围 (USDT)</label>
            <div class="flex items-center gap-2">
              <a-input v-model:value="filters.minPositionValue" type="number" placeholder="最小" class="ant-input !py-1.5" />
              <span class="text-slate-500">-</span>
              <a-input v-model:value="filters.maxPositionValue" type="number" placeholder="最大" class="ant-input !py-1.5" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">盈亏范围 (USDT)</label>
            <div class="flex items-center gap-2">
              <a-input v-model:value="filters.minPnl" type="number" placeholder="最小" class="ant-input !py-1.5" />
              <span class="text-slate-500">-</span>
              <a-input v-model:value="filters.maxPnl" type="number" placeholder="最大" class="ant-input !py-1.5" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">开仓时间范围</label>
            <a-input v-model:value="filters.dateRange" type="date" class="ant-input !py-1.5" />
          </div>
        </div>
      </div>

      <!-- 订单表格 -->
      <div class="overflow-x-auto">
        <a-table  size="small" :pagination="false" :data-source="paginatedOrders" :row-key="(order) => order.id" :scroll="{ x: 'max-content' }" :custom-row="(order, rowIndex) => ({ class: [&quot;border-t border-slate-100 hover:bg-slate-50&quot;, {
              'bg-emerald-50': order.unrealizedPnl > 0 &amp;&amp; order.status === PERPETUAL_ORDER_STATUS.HOLDING,
              'bg-rose-50': order.unrealizedPnl < 0 &amp;&amp; order.status === PERPETUAL_ORDER_STATUS.HOLDING
            }] })">
<a-table-column key="column-0" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>订单 ID</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="font-mono text-xs text-slate-600">{{ order.orderId }}</div>
                <div class="text-xs text-slate-500">{{ order.openTime.split(' ')[0] }}</div>
              </template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>用户信息</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="text-slate-700 font-medium">{{ order.userName }}</div>
                <div class="text-xs text-slate-500">{{ order.userId }}</div>
                <span :class="['text-xs px-2 py-0.5 rounded-md font-medium', vipLevelMeta[order.vipLevel]?.class || 'bg-slate-100 text-slate-600']">
                  {{ vipLevelMeta[order.vipLevel]?.label || order.vipLevel }}
                </span>
              </template>
</a-table-column>
<a-table-column key="column-2" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>交易对 / 方向</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="font-medium text-slate-900 mb-1">{{ order.productName }}</div>
                <span :class="['text-xs px-2 py-0.5 rounded-md font-medium', perpetualOrderSideMeta[order.side]?.badgeClass]">
                  {{ perpetualOrderSideMeta[order.side]?.text }}
                </span>
              </template>
</a-table-column>
<a-table-column key="column-3" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>杠杆 / 仓位</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="text-slate-700">{{ order.leverage }}x</div>
                <div class="text-xs text-slate-500">${{ order.positionValue?.toLocaleString() }}</div>
              </template>
</a-table-column>
<a-table-column key="column-4" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>价格信息</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="text-xs">
                  <div class="text-slate-600">入场：${{ order.entryPrice?.toLocaleString() }}</div>
                  <div class="text-slate-600">当前：${{ order.currentPrice?.toLocaleString() }}</div>
                  <div class="text-slate-500">强平：${{ order.liquidationPrice?.toLocaleString() }}</div>
                </div>
              </template>
</a-table-column>
<a-table-column key="column-5" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>盈亏</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="font-medium" :class="{
                  'text-emerald-600': order.unrealizedPnl > 0,
                  'text-rose-600': order.unrealizedPnl < 0,
                  'text-slate-600': order.unrealizedPnl === 0
                }">
                  {{ order.unrealizedPnl >= 0 ? '+' : '' }}{{ order.unrealizedPnl?.toFixed(2) }} USDT
                </div>
                <div class="text-xs" :class="{
                  'text-emerald-600': order.unrealizedPnlRate > 0,
                  'text-rose-600': order.unrealizedPnlRate < 0,
                  'text-slate-500': order.unrealizedPnlRate === 0
                }">
                  {{ order.unrealizedPnlRate?.toFixed(2) }}%
                </div>
              </template>
</a-table-column>
<a-table-column key="column-6" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>保证金率</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="mb-1">
                  <span class="text-xs font-medium" :class="{
                    'text-emerald-600': order.marginRatio <= 20,
                    'text-amber-600': order.marginRatio > 20 && order.marginRatio <= 50,
                    'text-rose-600': order.marginRatio > 50
                  }">{{ order.marginRatio?.toFixed(2) }}%</span>
                </div>
                <div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div class="h-full transition-all" :class="{
                    'bg-emerald-500': order.marginRatio <= 20,
                    'bg-amber-500': order.marginRatio > 20 && order.marginRatio <= 50,
                    'bg-rose-500': order.marginRatio > 50
                  }" :style="{width: `${Math.min(order.marginRatio, 100)}%`}"></div>
                </div>
              </template>
</a-table-column>
<a-table-column key="column-7" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>状态</template>
<template #default="{ record: order, index: rowIndex }">
                <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="perpetualOrderStatusMeta[order.status]?.badgeClass">
                  {{ perpetualOrderStatusMeta[order.status]?.text }}
                </span>
              </template>
</a-table-column>
<a-table-column key="column-8" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>操作</template>
<template #default="{ record: order, index: rowIndex }">
                <a-button html-type="button" class="ant-btn !h-8 !px-3 " @click="viewOrder(order)">
                  详情
                </a-button>
              </template>
</a-table-column>
</a-table>
      </div>

      <!-- 分页 -->
      <div class="flex items-center justify-between border-t border-slate-200 px-4 py-3">
        <div class="text-sm text-slate-600">
          共 {{ filteredOrders.length }} 条订单 · 第 {{ currentPage }} / {{ totalPages }} 页
        </div>
        <div class="flex items-center gap-3">
          <a-pagination size="small" :current="currentPage" :total="totalPages" :page-size="1" :show-size-changer="false" @change="currentPage = $event" />
        </div>
      </div>
    </article>

    <!-- 详情弹窗 -->
    <a-modal :wrap-props="{ 'aria-modal': true }" transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :open="Boolean(showDetailModal)" :mask-closable="false" :closable="false" :keyboard="true" :width="1152"  :destroy-on-close="true" wrap-class-name="admin-trading-modal" :body-style="{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 180px)' }" @cancel="closeDetailModal">
<template #title><template v-if="showDetailModal"><header class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
            </div>
            <div>
              <h2 class="text-xl font-semibold text-slate-900">永续合约订单详情</h2>
              <p class="mt-0.5 text-sm text-slate-500">订单编号：{{ currentOrder?.orderId }}</p>
            </div>
          </div>
          <a-button aria-label="关闭" type="text" html-type="button" class="text-slate-400 hover:text-slate-600 transition-colors" @click="closeDetailModal">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </a-button>
        </header></template></template>
<template v-if="showDetailModal">

        <!-- Tab 导航 -->
        <div class="border-b border-slate-200 bg-slate-50 px-6">
          <div class="flex gap-1">
            <a-button type="text"
              v-for="tab in detailTabs"
              :key="tab.id"
              html-type="button"
              @click="currentTab = tab.id"
              class="px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2"
              :class="currentTab === tab.id
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path :d="tab.icon" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
              <span>{{ tab.label }}</span>
            </a-button>
          </div>
        </div>

        <!-- 内容区域 -->
        <div class="flex-1 overflow-y-auto bg-slate-50 p-6">
          <!-- Tab 1: 概览 -->
          <div v-if="currentTab === 'overview'" class="space-y-5">
            <!-- 关键指标卡片 -->
            <div class="grid gap-4 md:grid-cols-4">
              <div class="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-4">
                <div class="flex items-center gap-2 text-sm text-blue-700">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>仓位价值</span>
                </div>
                <p class="mt-2 text-2xl font-bold text-blue-900">${{ currentOrder?.positionValue?.toLocaleString() }}</p>
                <p class="mt-1 text-xs text-blue-600">{{ currentOrder?.productName }}</p>
              </div>

              <div class="rounded-xl border" :class="currentOrder?.unrealizedPnl >= 0
                ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50'
                : 'border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/50'">
                <div class="flex items-center gap-2 text-sm" :class="currentOrder?.unrealizedPnl >= 0
                  ? 'text-emerald-700'
                  : 'text-rose-700'">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                  <span>未实现盈亏</span>
                </div>
                <p class="mt-2 text-2xl font-bold" :class="currentOrder?.unrealizedPnl >= 0
                  ? 'text-emerald-900'
                  : 'text-rose-900'">
                  {{ currentOrder?.unrealizedPnl >= 0 ? '+' : '' }}${{ currentOrder?.unrealizedPnl?.toFixed(2) }}
                </p>
                <p class="mt-1 text-xs" :class="currentOrder?.unrealizedPnl >= 0
                  ? 'text-emerald-600'
                  : 'text-rose-600'">
                  {{ currentOrder?.unrealizedPnlRate?.toFixed(2) }}%
                </p>
              </div>

              <div class="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-4">
                <div class="flex items-center gap-2 text-sm text-purple-700">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                  <span>保证金</span>
                </div>
                <p class="mt-2 text-2xl font-bold text-purple-900">${{ currentOrder?.margin?.toFixed(2) }}</p>
                <p class="mt-1 text-xs text-purple-600">{{ currentOrder?.leverage }}x 杠杆</p>
              </div>

              <div class="rounded-xl border" :class="{
                'border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50': currentOrder?.marginRatio <= 20,
                'border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50': currentOrder?.marginRatio > 20 && currentOrder?.marginRatio <= 50,
                'border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/50': currentOrder?.marginRatio > 50
              }">
                <div class="flex items-center gap-2 text-sm" :class="{
                  'text-emerald-700': currentOrder?.marginRatio <= 20,
                  'text-amber-700': currentOrder?.marginRatio > 20 && currentOrder?.marginRatio <= 50,
                  'text-rose-700': currentOrder?.marginRatio > 50
                }">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                  <span>保证金率</span>
                </div>
                <p class="mt-2 text-2xl font-bold" :class="{
                  'text-emerald-900': currentOrder?.marginRatio <= 20,
                  'text-amber-900': currentOrder?.marginRatio > 20 && currentOrder?.marginRatio <= 50,
                  'text-rose-900': currentOrder?.marginRatio > 50
                }">{{ currentOrder?.marginRatio?.toFixed(2) }}%</p>
                <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white">
                  <div class="h-full transition-all" :class="{
                    'bg-emerald-500': currentOrder?.marginRatio <= 20,
                    'bg-amber-500': currentOrder?.marginRatio > 20 && currentOrder?.marginRatio <= 50,
                    'bg-rose-500': currentOrder?.marginRatio > 50
                  }" :style="{width: `${Math.min(currentOrder?.marginRatio, 100)}%`}"></div>
                </div>
              </div>
            </div>

            <!-- 基本信息 -->
            <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </span>
                <span>订单基本信息</span>
              </h3>
              <div class="grid gap-4 md:grid-cols-3">
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">订单 ID</label>
                  <p class="font-mono text-sm font-medium text-slate-900">{{ currentOrder?.orderId }}</p>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">交易对</label>
                  <p class="text-sm font-medium text-slate-900">{{ currentOrder?.symbol }}</p>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">方向</label>
                  <span :class="['text-xs px-2 py-0.5 rounded-md font-medium', perpetualOrderSideMeta[currentOrder?.side]?.badgeClass]">
                    {{ perpetualOrderSideMeta[currentOrder?.side]?.text }}
                  </span>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">状态</label>
                  <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="perpetualOrderStatusMeta[currentOrder?.status]?.badgeClass">
                    {{ perpetualOrderStatusMeta[currentOrder?.status]?.text }}
                  </span>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">开仓时间</label>
                  <p class="text-sm text-slate-700">{{ currentOrder?.openTime }}</p>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">平仓时间</label>
                  <p class="text-sm text-slate-700">{{ currentOrder?.closeTime || '-' }}</p>
                </div>
              </div>
            </section>
          </div>

          <!-- Tab 2: 仓位详情 -->
          <div v-if="currentTab === 'position'" class="space-y-5">
            <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                  <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                </span>
                <span>仓位参数</span>
              </h3>
              <div class="grid gap-4 md:grid-cols-3">
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs text-slate-500">仓位大小</p>
                  <p class="mt-1 text-xl font-bold text-slate-900">{{ currentOrder?.positionSize }}</p>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs text-slate-500">入场价格</p>
                  <p class="mt-1 text-xl font-bold text-slate-900">${{ currentOrder?.entryPrice?.toLocaleString() }}</p>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs text-slate-500">当前价格</p>
                  <p class="mt-1 text-xl font-bold text-slate-900">${{ currentOrder?.currentPrice?.toLocaleString() }}</p>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs text-slate-500">标记价格</p>
                  <p class="mt-1 text-xl font-bold text-slate-900">${{ currentOrder?.markPrice?.toLocaleString() }}</p>
                </div>
                <div class="rounded-lg border border-rose-200 bg-rose-50 p-4">
                  <p class="text-xs text-rose-600">强平价格</p>
                  <p class="mt-1 text-xl font-bold text-rose-700">${{ currentOrder?.liquidationPrice?.toLocaleString() }}</p>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs text-slate-500">杠杆倍数</p>
                  <p class="mt-1 text-xl font-bold text-slate-900">{{ currentOrder?.leverage }}x</p>
                </div>
              </div>
            </section>

            <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                  <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </span>
                <span>费用信息</span>
              </h3>
              <div class="grid gap-4 md:grid-cols-3">
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs text-slate-500">资金费率</p>
                  <p class="mt-1 text-lg font-bold text-slate-900">${{ currentOrder?.fundingFee?.toFixed(2) }}</p>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs text-slate-500">交易手续费</p>
                  <p class="mt-1 text-lg font-bold text-slate-900">${{ currentOrder?.tradingFee?.toFixed(2) }}</p>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs text-slate-500">已实现盈亏</p>
                  <p class="mt-1 text-lg font-bold" :class="currentOrder?.realizedPnl >= 0
                    ? 'text-emerald-600'
                    : 'text-rose-600'">
                    {{ currentOrder?.realizedPnl >= 0 ? '+' : '' }}${{ currentOrder?.realizedPnl?.toFixed(2) }}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <!-- Tab 3: 用户信息 -->
          <div v-if="currentTab === 'user'" class="space-y-5">
            <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100">
                  <svg class="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </span>
                <span>用户信息</span>
              </h3>
              <div class="grid gap-4 md:grid-cols-3">
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">用户 ID</label>
                  <p class="font-mono text-sm font-medium text-slate-900">{{ currentOrder?.userId }}</p>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">用户名</label>
                  <p class="text-sm font-medium text-slate-900">{{ currentOrder?.userName }}</p>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">VIP 等级</label>
                  <span :class="['text-xs px-2 py-0.5 rounded-md font-medium', vipLevelMeta[currentOrder?.vipLevel]?.class]">
                    {{ vipLevelMeta[currentOrder?.vipLevel]?.label }}
                  </span>
                </div>
              </div>
            </section>
          </div>

          <!-- Tab 4: 盈亏分析 -->
          <div v-if="currentTab === 'pnl'" class="space-y-5">
            <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                  <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                </span>
                <span>盈亏明细</span>
              </h3>
              <div class="space-y-4">
                <div class="flex justify-between items-center p-4 rounded-lg" :class="currentOrder?.unrealizedPnl >= 0
                  ? 'bg-emerald-50 border border-emerald-200'
                  : 'bg-rose-50 border border-rose-200'">
                  <span class="text-sm font-medium text-slate-700">未实现盈亏</span>
                  <div class="text-right">
                    <p class="text-2xl font-bold" :class="currentOrder?.unrealizedPnl >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'">
                      {{ currentOrder?.unrealizedPnl >= 0 ? '+' : '' }}${{ currentOrder?.unrealizedPnl?.toFixed(2) }}
                    </p>
                    <p class="text-sm" :class="currentOrder?.unrealizedPnl >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'">
                      {{ currentOrder?.unrealizedPnlRate?.toFixed(2) }}%
                    </p>
                  </div>
                </div>

                <div class="flex justify-between items-center p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <span class="text-sm font-medium text-slate-700">已实现盈亏</span>
                  <div class="text-right">
                    <p class="text-2xl font-bold" :class="currentOrder?.realizedPnl >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'">
                      {{ currentOrder?.realizedPnl >= 0 ? '+' : '' }}${{ currentOrder?.realizedPnl?.toFixed(2) }}
                    </p>
                  </div>
                </div>

                <div class="flex justify-between items-center p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <span class="text-sm font-medium text-slate-700">总费用</span>
                  <div class="text-right">
                    <p class="text-xl font-bold text-slate-900">
                      ${{ ((currentOrder?.fundingFee || 0) + (currentOrder?.tradingFee || 0)).toFixed(2) }}
                    </p>
                    <p class="text-xs text-slate-500">资金费 + 交易费</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- Tab 5: 操作记录 -->
          <div v-if="currentTab === 'history'" class="space-y-4">
            <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                  <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </span>
                <span>操作记录</span>
              </h3>
              <div class="space-y-3">
                <div class="flex items-start gap-3 pb-3 border-b border-slate-200">
                  <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <p class="text-sm font-medium text-slate-900">开仓</p>
                    <p class="text-xs text-slate-500 mt-1">{{ currentOrder?.openTime }}</p>
                    <p class="text-xs text-slate-600 mt-1">
                      以 ${{ currentOrder?.entryPrice?.toLocaleString() }} 开设 {{ currentOrder?.leverage }}x {{ perpetualOrderSideMeta[currentOrder?.side]?.text }} 仓
                    </p>
                  </div>
                </div>

                <div v-if="currentOrder?.status !== PERPETUAL_ORDER_STATUS.HOLDING" class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-full" :class="{
                    'bg-emerald-100': currentOrder?.status === PERPETUAL_ORDER_STATUS.CLOSED,
                    'bg-rose-100': currentOrder?.status === PERPETUAL_ORDER_STATUS.LIQUIDATED
                  }">
                    <svg class="w-4 h-4" :class="{
                      'text-emerald-600': currentOrder?.status === PERPETUAL_ORDER_STATUS.CLOSED,
                      'text-rose-600': currentOrder?.status === PERPETUAL_ORDER_STATUS.LIQUIDATED
                    }" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <p class="text-sm font-medium text-slate-900">
                      {{ currentOrder?.status === PERPETUAL_ORDER_STATUS.CLOSED ? '主动平仓' : '强制平仓' }}
                    </p>
                    <p class="text-xs text-slate-500 mt-1">{{ currentOrder?.closeTime }}</p>
                    <p class="text-xs text-slate-600 mt-1">
                      实现盈亏：{{ currentOrder?.realizedPnl >= 0 ? '+' : '' }}${{ currentOrder?.realizedPnl?.toFixed(2) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
        </template>
<template #footer><template v-if="showDetailModal"><footer class="border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div class="flex items-center justify-end">
            <a-button html-type="button" class="ant-btn !px-6 !py-2.5 !h-auto" @click="closeDetailModal">
              关闭
            </a-button>
          </div>
        </footer></template></template>
</a-modal>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { createPerpetualOrdersMock, PERPETUAL_ORDER_STATUS, PERPETUAL_ORDER_SIDE, perpetualOrderStatusMeta, perpetualOrderSideMeta } from '../../../admin/mock/perpetualOrder'

const orders = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const showAdvancedFilters = ref(false)
const showDetailModal = ref(false)
const currentOrder = ref(null)
const currentTab = ref('overview')

const filters = ref({
  status: '',
  symbol: '',
  side: '',
  userId: '',
  minLeverage: null,
  maxLeverage: null,
  minPositionValue: null,
  maxPositionValue: null,
  minPnl: null,
  maxPnl: null,
  dateRange: ''
})

const vipLevelMeta = {
  VIP0: { label: 'VIP0', class: 'bg-slate-100 text-slate-600' },
  VIP1: { label: 'VIP1', class: 'bg-blue-100 text-blue-700' },
  VIP2: { label: 'VIP2', class: 'bg-purple-100 text-purple-700' },
  VIP3: { label: 'VIP3', class: 'bg-amber-100 text-amber-700' }
}

const detailTabs = [
  { id: 'overview', label: '概览', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'position', label: '仓位详情', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'user', label: '用户信息', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'pnl', label: '盈亏分析', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  { id: 'history', label: '操作记录', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
]

onMounted(() => {
  orders.value = createPerpetualOrdersMock()
})

const filteredOrders = computed(() => {
  let result = [...orders.value]

  if (filters.value.status) {
    result = result.filter(o => o.status === filters.value.status)
  }
  if (filters.value.symbol) {
    result = result.filter(o => o.symbol === filters.value.symbol)
  }
  if (filters.value.side) {
    result = result.filter(o => o.side === filters.value.side)
  }
  if (filters.value.userId) {
    result = result.filter(o => o.userId.includes(filters.value.userId))
  }
  if (filters.value.minLeverage) {
    result = result.filter(o => o.leverage >= filters.value.minLeverage)
  }
  if (filters.value.maxLeverage) {
    result = result.filter(o => o.leverage <= filters.value.maxLeverage)
  }
  if (filters.value.minPositionValue) {
    result = result.filter(o => o.positionValue >= filters.value.minPositionValue)
  }
  if (filters.value.maxPositionValue) {
    result = result.filter(o => o.positionValue <= filters.value.maxPositionValue)
  }
  if (filters.value.minPnl !== null && filters.value.minPnl !== '') {
    result = result.filter(o => o.unrealizedPnl >= filters.value.minPnl)
  }
  if (filters.value.maxPnl !== null && filters.value.maxPnl !== '') {
    result = result.filter(o => o.unrealizedPnl <= filters.value.maxPnl)
  }
  if (filters.value.dateRange) {
    const date = filters.value.dateRange
    result = result.filter(o => o.openTime.startsWith(date))
  }

  return result
})

const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredOrders.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(filteredOrders.value.length / pageSize.value))

const viewOrder = (order) => {
  currentOrder.value = order
  currentTab.value = 'overview'
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  currentOrder.value = null
}

const resetFilters = () => {
  filters.value = {
    status: '',
    symbol: '',
    side: '',
    userId: '',
    minLeverage: null,
    maxLeverage: null,
    minPositionValue: null,
    maxPositionValue: null,
    minPnl: null,
    maxPnl: null,
    dateRange: ''
  }
  showAdvancedFilters.value = false
}

const exportOrders = () => {
  alert('导出永续合约订单数据')
}

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}
</script>
