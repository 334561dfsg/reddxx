<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">现货订单管理</h1>
        <p class="mt-1 text-sm text-slate-500">监控现货交易订单状态、成交价格与交易量</p>
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
        <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="filters.type" class="">
          <a-select-option value="">全部类型</a-select-option>
          <a-select-option value="buy">买入</a-select-option>
          <a-select-option value="sell">卖出</a-select-option>
        </a-select>
        <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="filters.status" class="">
          <a-select-option value="">全部状态</a-select-option>
          <a-select-option value="pending">待成交</a-select-option>
          <a-select-option value="filled">已成交</a-select-option>
          <a-select-option value="cancelled">已取消</a-select-option>
        </a-select>
        <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="filters.productCode" class="">
          <a-select-option value="">全部产品</a-select-option>
          <a-select-option v-for="product in productOptions" :key="product.code" :value="product.code">
            {{ product.name }} ({{ product.code }})
          </a-select-option>
        </a-select>
        <a-input v-model:value="filters.orderId" type="text" placeholder="搜索订单 ID..." class="w-full max-w-xs rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        <a-input v-model:value="filters.userId" type="text" placeholder="搜索用户 ID/邮箱..." class="w-full max-w-xs rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        <a-button type="text" html-type="button" class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" @click="resetFilters">重置</a-button>
      </div>

      <div class="overflow-x-auto">
        <a-table  size="small" :pagination="false" :data-source="filteredOrders" :row-key="(order) => order.orderId" :scroll="{ x: 'max-content' }" :custom-row="(order, rowIndex) => ({ class: [&quot;border-t border-slate-100&quot;] })">
<a-table-column key="column-0" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>订单 ID</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="font-mono text-xs text-slate-600">{{ order.orderId }}</div>
                <div class="text-xs text-slate-500">{{ formatDate(order.createTime) }}</div>
              </template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>用户信息</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="text-slate-700">{{ order.userId }}</div>
                <div class="text-xs text-slate-500">{{ order.userEmail }}</div>
              </template>
</a-table-column>
<a-table-column key="column-2" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>产品</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="font-medium text-slate-900">{{ order.productName }}</div>
                <div class="text-xs text-slate-500">{{ order.productCode }}</div>
              </template>
</a-table-column>
<a-table-column key="column-3" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>类型/方向</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="flex items-center gap-2">
                  <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="{
                    'bg-emerald-50 text-emerald-700': order.type === 'buy',
                    'bg-rose-50 text-rose-700': order.type === 'sell'
                  }">
                    {{ order.type === 'buy' ? '买入' : '卖出' }}
                  </span>
                </div>
              </template>
</a-table-column>
<a-table-column key="column-4" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>价格/数量</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="text-xs text-slate-600">价格：{{ formatPrice(order.price) }}</div>
                <div class="font-medium text-slate-900">{{ order.quantity }} {{ order.baseCurrency }}</div>
              </template>
</a-table-column>
<a-table-column key="column-5" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>成交额</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="font-medium text-slate-900">{{ formatCurrency(order.totalValue) }}</div>
                <div class="text-xs text-slate-500">{{ order.quoteCurrency }}</div>
              </template>
</a-table-column>
<a-table-column key="column-6" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>成交量</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="mb-1 font-medium text-slate-700">{{ order.filledQuantity }} {{ order.baseCurrency }}</div>
                <div class="text-xs text-slate-500">成交率：{{ calculateFillRate(order) }}%</div>
              </template>
</a-table-column>
<a-table-column key="column-7" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>状态</template>
<template #default="{ record: order, index: rowIndex }">
                <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="{
                  'bg-blue-50 text-blue-700': order.status === 'pending',
                  'bg-emerald-50 text-emerald-700': order.status === 'filled',
                  'bg-slate-100 text-slate-600': order.status === 'cancelled'
                }">
                  {{ statusLabel(order.status) }}
                </span>
              </template>
</a-table-column>
<a-table-column key="column-8" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>时间</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="text-xs text-slate-600">创建：{{ formatTime(order.createTime) }}</div>
                <div v-if="order.updateTime" class="text-xs text-slate-500">更新：{{ formatTime(order.updateTime) }}</div>
              </template>
</a-table-column>
<a-table-column key="column-9" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>操作</template>
<template #default="{ record: order, index: rowIndex }">
                <a-button type="text"
                  html-type="button"
                  class="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 font-medium transition-colors whitespace-nowrap"
                  @click="viewOrder(order)"
                >
                  详情
                </a-button>
              </template>
</a-table-column>
</a-table>
      </div>

      <div class="flex items-center justify-between border-t border-slate-200 px-4 py-3">
        <a-pagination size="small" :current="currentPage" :total="totalPages" :page-size="1" :show-size-changer="false" @change="currentPage = $event" />
      </div>
    </article>

    <!-- 订单详情模态框 -->
    <a-modal :wrap-props="{ 'aria-modal': true }" transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :open="Boolean(showDetailModal &amp;&amp; selectedOrder)" :mask-closable="false" :closable="false" :keyboard="true" :width="1024"  :destroy-on-close="true" wrap-class-name="admin-trading-modal" :body-style="{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 180px)' }" @cancel="showDetailModal = false">
<template #title><template v-if="showDetailModal &amp;&amp; selectedOrder"><header class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-full" :class="{
              'bg-emerald-100': selectedOrder.type === 'buy',
              'bg-rose-100': selectedOrder.type === 'sell'
            }">
              <svg class="w-6 h-6" :class="{
                'text-emerald-600': selectedOrder.type === 'buy',
                'text-rose-600': selectedOrder.type === 'sell'
              }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
            </div>
            <div>
              <h2 class="text-xl font-semibold text-slate-900">订单详情</h2>
              <p class="mt-0.5 text-sm text-slate-500 font-mono">订单编号：{{ selectedOrder.orderId }}</p>
            </div>
          </div>
          <a-button aria-label="关闭" type="text" html-type="button" class="text-slate-400 hover:text-slate-600 transition-colors" @click="showDetailModal = false">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </a-button>
        </header></template></template>
<template v-if="showDetailModal &amp;&amp; selectedOrder">

        <!-- Tab 导航 -->
        <div class="border-b border-slate-200 bg-slate-50 px-6">
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
              <span>交易详情</span>
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
              <span>成交历史</span>
            </a-button>
          </div>
        </div>

        <!-- 内容区域 -->
        <div class="flex-1 overflow-y-auto bg-slate-50 p-6">
          <!-- Tab: 概览 -->
          <div v-if="detailTab === 'overview'" class="space-y-5">
            <!-- 关键指标卡片 -->
            <div class="grid gap-4 md:grid-cols-4">
              <div class="rounded-xl border p-4" :class="{
                'border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50': selectedOrder.type === 'buy',
                'border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/50': selectedOrder.type === 'sell'
              }">
                <div class="flex items-center gap-2 text-sm" :class="{
                  'text-emerald-700': selectedOrder.type === 'buy',
                  'text-rose-700': selectedOrder.type === 'sell'
                }">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                  <span>订单类型</span>
                </div>
                <p class="mt-2 text-2xl font-bold" :class="{
                  'text-emerald-900': selectedOrder.type === 'buy',
                  'text-rose-900': selectedOrder.type === 'sell'
                }">{{ selectedOrder.type === 'buy' ? '买入' : '卖出' }}</p>
                <p class="mt-1 text-xs" :class="{
                  'text-emerald-600': selectedOrder.type === 'buy',
                  'text-rose-600': selectedOrder.type === 'sell'
                }">{{ selectedOrder.productName }}</p>
              </div>

              <div class="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-4">
                <div class="flex items-center gap-2 text-sm text-blue-700">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>委托价格</span>
                </div>
                <p class="mt-2 text-2xl font-bold text-blue-900">{{ formatPrice(selectedOrder.price) }}</p>
                <p class="mt-1 text-xs text-blue-600">{{ selectedOrder.quoteCurrency }}</p>
              </div>

              <div class="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-4">
                <div class="flex items-center gap-2 text-sm text-purple-700">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                  </svg>
                  <span>委托数量</span>
                </div>
                <p class="mt-2 text-2xl font-bold text-purple-900">{{ selectedOrder.quantity }}</p>
                <p class="mt-1 text-xs text-purple-600">{{ selectedOrder.baseCurrency }}</p>
              </div>

              <div class="rounded-xl border p-4" :class="{
                'border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50': selectedOrder.status === 'filled',
                'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50': selectedOrder.status === 'pending',
                'border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50': selectedOrder.status === 'cancelled'
              }">
                <div class="flex items-center gap-2 text-sm" :class="{
                  'text-emerald-700': selectedOrder.status === 'filled',
                  'text-blue-700': selectedOrder.status === 'pending',
                  'text-slate-700': selectedOrder.status === 'cancelled'
                }">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>订单状态</span>
                </div>
                <p class="mt-2 text-2xl font-bold" :class="{
                  'text-emerald-900': selectedOrder.status === 'filled',
                  'text-blue-900': selectedOrder.status === 'pending',
                  'text-slate-900': selectedOrder.status === 'cancelled'
                }">{{ statusLabel(selectedOrder.status) }}</p>
                <p class="mt-1 text-xs" :class="{
                  'text-emerald-600': selectedOrder.status === 'filled',
                  'text-blue-600': selectedOrder.status === 'pending',
                  'text-slate-600': selectedOrder.status === 'cancelled'
                }">{{ selectedOrder.status === 'filled' ? '成交率：100%' : selectedOrder.status === 'pending' ? '等待成交' : '已撤销' }}</p>
              </div>
            </div>

            <!-- 用户与产品信息 -->
            <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </span>
                <span>用户与产品信息</span>
              </h3>
              <div class="grid gap-4 md:grid-cols-3">
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">用户 ID</label>
                  <p class="font-mono text-sm font-medium text-slate-900">{{ selectedOrder.userId }}</p>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">用户邮箱</label>
                  <p class="text-sm font-medium text-slate-900">{{ selectedOrder.userEmail }}</p>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">产品代码</label>
                  <p class="font-mono text-sm font-medium text-slate-900">{{ selectedOrder.productCode }}</p>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">产品名称</label>
                  <p class="text-sm font-medium text-slate-900">{{ selectedOrder.productName }}</p>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">基础币种</label>
                  <p class="text-sm font-medium text-slate-900">{{ selectedOrder.baseCurrency }}</p>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">计价币种</label>
                  <p class="text-sm font-medium text-slate-900">{{ selectedOrder.quoteCurrency }}</p>
                </div>
              </div>
            </section>
          </div>

          <!-- Tab: 交易详情 -->
          <div v-if="detailTab === 'details'" class="space-y-5">
            <!-- 交易统计 -->
            <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                  <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                </span>
                <span>交易统计</span>
              </h3>
              <div class="grid gap-4 md:grid-cols-3">
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-sm font-medium text-slate-700">已成交量</p>
                  <p class="mt-2 text-2xl font-bold text-slate-900">{{ selectedOrder.filledQuantity }}</p>
                  <p class="mt-1 text-xs text-slate-500">{{ selectedOrder.baseCurrency }}</p>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-sm font-medium text-slate-700">剩余数量</p>
                  <p class="mt-2 text-2xl font-bold text-slate-900">{{ selectedOrder.remainingQuantity }}</p>
                  <p class="mt-1 text-xs text-slate-500">{{ selectedOrder.baseCurrency }}</p>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-sm font-medium text-slate-700">成交总额</p>
                  <p class="mt-2 text-2xl font-bold text-slate-900">{{ formatCurrency(selectedOrder.filledValue) }}</p>
                  <p class="mt-1 text-xs text-slate-500">{{ selectedOrder.quoteCurrency }}</p>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-sm font-medium text-slate-700">平均成交价</p>
                  <p class="mt-2 text-2xl font-bold text-slate-900">{{ formatPrice(selectedOrder.avgFilledPrice) }}</p>
                  <p class="mt-1 text-xs text-slate-500">{{ selectedOrder.quoteCurrency }}</p>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-sm font-medium text-slate-700">手续费</p>
                  <p class="mt-2 text-2xl font-bold text-slate-900">{{ formatCurrency(selectedOrder.fee) }}</p>
                  <p class="mt-1 text-xs text-slate-500">{{ selectedOrder.quoteCurrency }}</p>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-sm font-medium text-slate-700">手续费率</p>
                  <p class="mt-2 text-2xl font-bold text-slate-900">{{ selectedOrder.feeRate }}%</p>
                  <p class="mt-1 text-xs text-slate-500">VIP 折扣后</p>
                </div>
              </div>
            </section>

            <!-- 进度条 -->
            <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                </span>
                <span>成交状态</span>
              </h3>
              <div class="space-y-4">
                <div v-if="selectedOrder.status === 'filled'" class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <div class="flex items-center gap-2 text-emerald-700">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span class="font-semibold">订单已全部成交</span>
                  </div>
                  <p class="mt-2 text-sm text-emerald-900">成交价格：{{ formatPrice(selectedOrder.avgFilledPrice) }} {{ selectedOrder.quoteCurrency }}</p>
                  <p class="text-sm text-emerald-900">成交数量：{{ selectedOrder.filledQuantity }} {{ selectedOrder.baseCurrency }}</p>
                  <p class="text-sm text-emerald-900">成交总额：{{ formatCurrency(selectedOrder.filledValue) }}</p>
                </div>
                <div v-else-if="selectedOrder.status === 'pending'" class="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div class="flex items-center gap-2 text-blue-700">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span class="font-semibold">等待成交</span>
                  </div>
                  <p class="mt-2 text-sm text-blue-900">委托价格：{{ formatPrice(selectedOrder.price) }} {{ selectedOrder.quoteCurrency }}</p>
                  <p class="text-sm text-blue-900">委托数量：{{ selectedOrder.quantity }} {{ selectedOrder.baseCurrency }}</p>
                  <p class="text-sm text-blue-900">订单总额：{{ formatCurrency(selectedOrder.totalValue) }}</p>
                </div>
                <div v-else class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div class="flex items-center gap-2 text-slate-700">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    <span class="font-semibold">订单已取消</span>
                  </div>
                  <p class="mt-2 text-sm text-slate-900">委托价格：{{ formatPrice(selectedOrder.price) }} {{ selectedOrder.quoteCurrency }}</p>
                  <p class="text-sm text-slate-900">委托数量：{{ selectedOrder.quantity }} {{ selectedOrder.baseCurrency }}</p>
                </div>
              </div>
            </section>
          </div>

          <!-- Tab: 成交历史 -->
          <div v-if="detailTab === 'history'" class="space-y-5">
            <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                  <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </span>
                <span>成交明细</span>
              </h3>
              <div v-if="selectedOrder.trades && selectedOrder.trades.length > 0" class="space-y-3">
                <div v-for="(trade, index) in selectedOrder.trades" :key="index" class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div class="grid gap-3 md:grid-cols-4">
                    <div>
                      <p class="text-xs text-slate-500">成交价格</p>
                      <p class="mt-1 text-sm font-bold text-slate-900">{{ formatPrice(trade.price) }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-slate-500">成交数量</p>
                      <p class="mt-1 text-sm font-bold text-slate-900">{{ trade.quantity }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-slate-500">成交额</p>
                      <p class="mt-1 text-sm font-bold text-slate-900">{{ formatCurrency(trade.value) }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-slate-500">成交时间</p>
                      <p class="mt-1 text-xs text-slate-700">{{ trade.time }}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-8 text-slate-500">
                <svg class="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <p class="mt-2 text-sm">暂无成交记录</p>
              </div>
            </section>
          </div>
        </div>

        <!-- 操作按钮 -->
        </template>
<template #footer><template v-if="showDetailModal &amp;&amp; selectedOrder"><footer class="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="text-sm text-slate-500">
              创建时间：{{ selectedOrder.createTime }} | 更新时间：{{ selectedOrder.updateTime || '-' }}
            </div>
            <div class="flex items-center gap-3">
              <a-button type="text"
                html-type="button"
                class="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                @click="showDetailModal = false"
              >
                关闭
              </a-button>
            </div>
          </div>
        </footer></template></template>
</a-modal>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { mockSpotOrders } from '../../../admin/mock/spot'

const orders = ref([])
const currentPage = ref(1)
const pageSize = ref(10)

const filters = ref({
  type: '',
  status: '',
  productCode: '',
  orderId: '',
  userId: ''
})

const productOptions = ref([
  { code: 'BTCUSDT', name: 'BTC/USDT' },
  { code: 'ETHUSDT', name: 'ETH/USDT' },
  { code: 'BNBUSDT', name: 'BNB/USDT' },
  { code: 'XRPUSDT', name: 'XRP/USDT' },
  { code: 'ADAUSDT', name: 'ADA/USDT' },
  { code: 'SOLUSDT', name: 'SOL/USDT' },
  { code: 'DOGEUSDT', name: 'DOGE/USDT' },
  { code: 'DOTUSDT', name: 'DOT/USDT' }
])

onMounted(() => {
  orders.value = mockSpotOrders
})

const showDetailModal = ref(false)
const selectedOrder = ref(null)
const detailTab = ref('overview')

const filteredOrders = computed(() => {
  let result = orders.value

  if (filters.value.type) {
    result = result.filter(o => o.type === filters.value.type)
  }
  if (filters.value.status) {
    result = result.filter(o => o.status === filters.value.status)
  }
  if (filters.value.productCode) {
    result = result.filter(o => o.productCode === filters.value.productCode)
  }
  if (filters.value.orderId) {
    result = result.filter(o => o.orderId.includes(filters.value.orderId))
  }
  if (filters.value.userId) {
    const keyword = filters.value.userId.toLowerCase()
    result = result.filter(o => o.userId.toLowerCase().includes(keyword) || o.userEmail.toLowerCase().includes(keyword))
  }

  return result
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
    minimumFractionDigits: 2
  }).format(value)
}

const formatPrice = (price) => {
  if (price === null || price === undefined || isNaN(price)) {
    return '0'
  }
  return Number(price).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8
  })
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return dateStr.split(' ')[0]
}

const formatTime = (dateStr) => {
  if (!dateStr) return '-'
  return dateStr.split(' ')[1] || dateStr
}

const statusLabel = (status) => {
  const labels = {
    pending: '待成交',
    filled: '已成交',
    cancelled: '已取消'
  }
  return labels[status] || status
}

const calculateFillRate = (order) => {
  if (!order.quantity || order.quantity === 0) return 0
  return ((order.filledQuantity / order.quantity) * 100).toFixed(2)
}

const resetFilters = () => {
  filters.value = {
    type: '',
    status: '',
    productCode: '',
    orderId: '',
    userId: ''
  }
}

const exportOrders = () => {
  alert('导出订单数据')
}

const viewOrder = (order) => {
  selectedOrder.value = order
  detailTab.value = 'overview'
  showDetailModal.value = true
}

const cancelOrder = (order) => {
  // 平台对手交易模式下不支持撤单
  alert('平台对手交易模式不支持撤单功能')
}

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}
</script>
