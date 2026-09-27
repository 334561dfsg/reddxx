<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  createDeliveryOrdersMock,
  DELIVERY_ORDER_STATUS,
  DELIVERY_ORDER_RESULT,
  deliveryOrderStatusMeta,
  deliveryOrderResultMeta,
  deliveryOrderDirectionMeta
} from '../../../admin/mock/deliveryOrder'

const orders = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const showAdvancedFilters = ref(false)
const showDetailModal = ref(false)
const currentOrder = ref(null)
const currentTab = ref('overview')

const filters = ref({
  status: '',
  product: '',
  result: '',
  userId: '',
  minInvest: null,
  maxInvest: null,
  minYield: null,
  maxYield: null,
  cycleType: '',
  dateRange: ''
})

const vipLevelMeta = {
  VIP0: { label: 'VIP0', class: 'bg-slate-100 text-slate-500' },
  VIP1: { label: 'VIP1', class: 'bg-blue-100 text-blue-600' },
  VIP2: { label: 'VIP2', class: 'bg-violet-100 text-violet-600' },
  VIP3: { label: 'VIP3', class: 'bg-amber-100 text-amber-700' }
}

const detailTabs = [
  { id: 'overview', label: '概览' },
  { id: 'details', label: '订单详情' },
  { id: 'user', label: '用户信息' },
  { id: 'settlement', label: '结算记录' }
]

onMounted(() => {
  orders.value = createDeliveryOrdersMock()
})

const filteredOrders = computed(() => {
  let result = [...orders.value]

  if (filters.value.status) {
    result = result.filter((o) => o.status === filters.value.status)
  }
  if (filters.value.product) {
    result = result.filter((o) => o.productName === filters.value.product)
  }
  if (filters.value.result) {
    result = result.filter((o) => o.result === filters.value.result)
  }
  if (filters.value.userId) {
    result = result.filter((o) => o.userId.includes(filters.value.userId))
  }
  if (filters.value.minInvest) {
    result = result.filter((o) => o.investAmount >= filters.value.minInvest)
  }
  if (filters.value.maxInvest) {
    result = result.filter((o) => o.investAmount <= filters.value.maxInvest)
  }
  if (filters.value.minYield) {
    result = result.filter((o) => o.actualYield >= filters.value.minYield)
  }
  if (filters.value.maxYield) {
    result = result.filter((o) => o.actualYield <= filters.value.maxYield)
  }
  if (filters.value.cycleType) {
    if (filters.value.cycleType === 'short') {
      result = result.filter((o) => o.cycleSeconds <= 60)
    } else if (filters.value.cycleType === 'medium') {
      result = result.filter((o) => o.cycleSeconds > 60 && o.cycleSeconds <= 180)
    } else if (filters.value.cycleType === 'long') {
      result = result.filter((o) => o.cycleSeconds > 180)
    }
  }
  if (filters.value.dateRange) {
    const date = filters.value.dateRange
    result = result.filter((o) => o.betTime.startsWith(date))
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
    product: '',
    result: '',
    userId: '',
    minInvest: null,
    maxInvest: null,
    minYield: null,
    maxYield: null,
    cycleType: '',
    dateRange: ''
  }
  showAdvancedFilters.value = false
}

const exportOrders = () => {
  alert('导出交割合约订单数据')
}

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}
</script>

<template>
  <section class="space-y-4">
    <!-- Page Header -->
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">交割合约订单</h1>
        <p class="mt-1 text-sm text-slate-500">监控用户交割合约投资、收益与结算状态，支持多维度订单筛选与导出</p>
      </div>
    </header>

    <article class="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <!-- 筛选区域 -->
      <div class="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4 md:px-6 bg-slate-50/30">
        <a-select :get-popup-container="(trigger) => trigger.parentElement"
          v-model:value="filters.status"
          class="!w-36"
        >
          <a-select-option value="">全部状态</a-select-option>
          <a-select-option :value="DELIVERY_ORDER_STATUS.PENDING">待结算</a-select-option>
          <a-select-option :value="DELIVERY_ORDER_STATUS.SETTLED">已结算</a-select-option>
          <a-select-option :value="DELIVERY_ORDER_STATUS.EXERCISED">已行权</a-select-option>
        </a-select>

        <a-select :get-popup-container="(trigger) => trigger.parentElement"
          v-model:value="filters.product"
          class="!w-36"
        >
          <a-select-option value="">全部产品</a-select-option>
          <a-select-option value="BTC 期权">BTC 期权</a-select-option>
          <a-select-option value="ETH 期权">ETH 期权</a-select-option>
        </a-select>

        <a-select :get-popup-container="(trigger) => trigger.parentElement"
          v-model:value="filters.result"
          class="!w-32"
        >
          <a-select-option value="">全部结果</a-select-option>
          <a-select-option :value="DELIVERY_ORDER_RESULT.WIN">赢利</a-select-option>
          <a-select-option :value="DELIVERY_ORDER_RESULT.LOSS">亏损</a-select-option>
        </a-select>

        <div class="relative w-full max-w-xs">
          <a-input
            v-model:value="filters.userId"
            type="text"
            placeholder="搜索用户 ID..."
            class="ant-input pl-9"
          />
          <svg viewBox="0 0 20 20" class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none">
            <circle cx="9" cy="9" r="5.8" stroke="currentColor" stroke-width="1.6" />
            <path d="M13.6 13.6L16.4 16.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </div>

        <a-button
          html-type="button"
          class="ant-btn inline-flex items-center gap-1.5"
          @click="showAdvancedFilters = !showAdvancedFilters"
        >
          <span>{{ showAdvancedFilters ? '收起' : '高级筛选' }}</span>
          <svg
            class="w-3 h-3 transition-transform"
            :class="{ 'rotate-180': showAdvancedFilters }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </a-button>

        <a-button
          html-type="button"
          class="ant-btn"
          @click="resetFilters"
        >
          重置
        </a-button>

        <div class="flex-1"></div>

        <a-button
          html-type="button"
          class="ant-btn inline-flex items-center gap-2"
          @click="exportOrders"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          <span>导出订单</span>
        </a-button>
      </div>

      <!-- 高级筛选 -->
      <div v-show="showAdvancedFilters" class="border-b border-slate-200 bg-slate-50/50 p-4 md:px-6">
        <div class="grid gap-6 md:grid-cols-4">
          <div class="space-y-1.5">
            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">投资金额 (USDT)</label>
            <div class="flex items-center gap-2">
              <a-input
                v-model:value.number="filters.minInvest"
                type="number"
                placeholder="最小"
                class="ant-input !py-1 text-xs"
              />
              <span class="text-slate-300">-</span>
              <a-input
                v-model:value.number="filters.maxInvest"
                type="number"
                placeholder="最大"
                class="ant-input !py-1 text-xs"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">实际收益 (%)</label>
            <div class="flex items-center gap-2">
              <a-input
                v-model:value.number="filters.minYield"
                type="number"
                placeholder="最小"
                class="ant-input !py-1 text-xs"
              />
              <span class="text-slate-300">-</span>
              <a-input
                v-model:value.number="filters.maxYield"
                type="number"
                placeholder="最大"
                class="ant-input !py-1 text-xs"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">周期类型</label>
            <a-select :get-popup-container="(trigger) => trigger.parentElement"
              v-model:value="filters.cycleType"
              class=""
            >
              <a-select-option value="">全部周期</a-select-option>
              <a-select-option value="short">短周期 (≤60s)</a-select-option>
              <a-select-option value="medium">中周期 (60s-180s)</a-select-option>
              <a-select-option value="long">长周期 (>180s)</a-select-option>
            </a-select>
          </div>

          <div class="space-y-1.5">
            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">下单日期</label>
            <a-input
              v-model:value="filters.dateRange"
              type="date"
              class="ant-input !py-1 text-xs"
            />
          </div>
        </div>
      </div>

      <!-- 表格内容 -->
      <div class="overflow-x-auto">
        <a-table  size="small" :pagination="false" :data-source="paginatedOrders" :row-key="(order) => order.id" :scroll="{ x: 'max-content' }" :custom-row="(order, rowIndex) => ({ class: [&quot;text-sm group&quot;] })">
<a-table-column key="column-0" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-6 py-4&quot;] })">
<template #title>订单信息</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="flex flex-col">
                  <span class="font-bold text-slate-900">{{ order.productName }}</span>
                  <span class="mt-0.5 font-mono text-[11px] text-slate-400">{{ order.id }}</span>
                  <span class="mt-1 text-[11px] text-slate-500">{{ order.betTime }}</span>
                </div>
              </template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-6 py-4&quot;] })">
<template #title>用户信息</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="flex flex-col">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-slate-700">{{ order.userName }}</span>
                    <span
                      class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                      :class="vipLevelMeta[order.userVip]?.class"
                    >
                      {{ vipLevelMeta[order.userVip]?.label }}
                    </span>
                  </div>
                  <span class="mt-0.5 font-mono text-[11px] text-slate-400">{{ order.userId }}</span>
                </div>
              </template>
</a-table-column>
<a-table-column key="column-2" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-6 py-4&quot;] })">
<template #title>投资明细</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="flex flex-col">
                  <div class="flex items-center gap-1.5">
                    <span
                      class="h-2 w-2 rounded-full"
                      :class="order.direction === 'up' ? 'bg-emerald-500' : 'bg-rose-500'"
                    ></span>
                    <span class="font-bold text-slate-900">{{ Number(order.investAmount).toLocaleString() }} USDT</span>
                  </div>
                  <span class="mt-0.5 text-[11px] text-slate-500">周期: {{ order.cycleSeconds }}s</span>
                </div>
              </template>
</a-table-column>
<a-table-column key="column-3" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-6 py-4&quot;] })">
<template #title>预期收益</template>
<template #default="{ record: order, index: rowIndex }">
                <div class="flex flex-col">
                  <span class="font-bold text-blue-600">{{ order.expectedYield }}%</span>
                  <span class="mt-0.5 text-[11px] text-slate-400">手续费: {{ order.fee }} USDT</span>
                </div>
              </template>
</a-table-column>
<a-table-column key="column-4" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-6 py-4&quot;] })">
<template #title>结算结果</template>
<template #default="{ record: order, index: rowIndex }">
                <div v-if="order.status !== DELIVERY_ORDER_STATUS.PEND" class="flex flex-col">
                  <span
                    class="font-bold"
                    :class="order.result === DELIVERY_ORDER_RESULT.WIN ? 'text-emerald-600' : 'text-rose-600'"
                  >
                    {{ order.result === DELIVERY_ORDER_RESULT.WIN ? '+' : '' }}{{ order.pnlAmount }} USDT
                  </span>
                  <span class="mt-0.5 text-[11px] text-slate-500">实际收益: {{ order.actualYield }}%</span>
                </div>
                <span v-else class="text-slate-300 italic">待结算</span>
              </template>
</a-table-column>
<a-table-column key="column-5" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-6 py-4&quot;] })">
<template #title>状态</template>
<template #default="{ record: order, index: rowIndex }">
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                  :class="deliveryOrderStatusMeta[order.status]?.class"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
                  {{ deliveryOrderStatusMeta[order.status]?.label }}
                </span>
              </template>
</a-table-column>
<a-table-column key="column-6" align="center" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-6 py-4 text-center&quot;] })">
<template #title>操作</template>
<template #default="{ record: order, index: rowIndex }">
                <a-button
                  html-type="button"
                  class="ant-btn ant-btn-sm"
                  @click="viewOrder(order)"
                >
                  详情
                </a-button>
              </template>
</a-table-column>
</a-table>
      </div>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="flex items-center justify-between border-t border-slate-100 p-4 md:px-6">
        <div class="text-sm text-slate-500">
          共 <span class="font-medium text-slate-900">{{ filteredOrders.length }}</span> 条订单
        </div>
        <div class="flex items-center gap-2">
          <a-pagination size="small" :current="currentPage" :total="totalPages" :page-size="1" :show-size-changer="false" @change="currentPage = $event" />
        </div>
      </div>
    </article>

    <!-- 订单详情模态框 -->
    <Transition name="modal">
      <a-modal :wrap-props="{ 'aria-modal': true }" transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :open="Boolean(showDetailModal)" :mask-closable="false" :closable="false" :keyboard="true" :width="896"  :destroy-on-close="true" wrap-class-name="admin-trading-modal" :body-style="{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 180px)' }" @cancel="closeDetailModal">
<template #title><template v-if="showDetailModal"><header class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 class="text-lg font-semibold text-slate-900">订单详情</h2>
              <p class="mt-0.5 text-xs text-slate-400 font-mono">#{{ currentOrder?.id }}</p>
            </div>
            <a-button aria-label="关闭" type="text"
              html-type="button"
              class="text-slate-400 hover:text-slate-600 transition-colors text-2xl leading-none"
              @click="closeDetailModal"
            >
              ×
            </a-button>
          </header></template></template>
<template v-if="showDetailModal">

          <div class="px-6 border-b border-slate-100 bg-white">
            <div class="flex gap-8">
              <a-button type="text"
                v-for="tab in detailTabs"
                :key="tab.id"
                html-type="button"
                class="relative py-3 text-sm transition-all"
                :class="
                  currentTab === tab.id
                    ? 'text-blue-600 font-medium after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                "
                @click="currentTab = tab.id"
              >
                {{ tab.label }}
              </a-button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto bg-white p-6">
            <div v-if="currentOrder" class="space-y-8">
              <div v-if="currentTab === 'overview'" class="grid gap-8 md:grid-cols-2">
                <div class="space-y-4">
                  <h3 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                    交易方向
                  </h3>
                  <div class="flex items-center gap-4">
                    <div
                      class="h-12 w-12 rounded-lg flex items-center justify-center text-xl shadow-inner"
                      :class="currentOrder.direction === 'up' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'"
                    >
                      <svg v-if="currentOrder.direction === 'up'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      <svg v-else class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                    <div>
                      <p class="text-xl font-bold text-slate-900">{{ currentOrder.productName }}</p>
                      <p
                        class="mt-0.5 font-bold text-xs"
                        :class="currentOrder.direction === 'up' ? 'text-emerald-600' : 'text-rose-600'"
                      >
                        {{ currentOrder.direction === 'up' ? '看涨 (Buy Up)' : '看跌 (Buy Down)' }}
                      </p>
                    </div>
                  </div>
                </div>

                <div class="space-y-4">
                  <h3 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                    投资金额
                  </h3>
                  <div class="flex items-baseline gap-1.5">
                    <span class="text-2xl font-black text-slate-900">{{ currentOrder.investAmount }}</span>
                    <span class="text-xs font-bold text-slate-400">USDT</span>
                  </div>
                  <div class="flex items-center gap-3 text-[10px] font-medium">
                    <span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">周期: {{ currentOrder.cycleSeconds }}s</span>
                    <span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">预期收益: {{ currentOrder.expectedYield }}%</span>
                  </div>
                </div>

                <div class="md:col-span-2 space-y-4">
                  <h3 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                    结算统计
                  </h3>
                  <div class="grid gap-4 sm:grid-cols-3">
                    <div class="p-4 rounded border border-slate-100 bg-slate-50/50">
                      <p class="text-[10px] text-slate-400 font-bold uppercase">盈亏金额</p>
                      <p
                        class="mt-1 text-base font-black"
                        :class="currentOrder.result === 'win' ? 'text-emerald-600' : 'text-rose-600'"
                      >
                        {{ currentOrder.result === 'win' ? '+' : '' }}{{ currentOrder.pnlAmount }} USDT
                      </p>
                    </div>
                    <div class="p-4 rounded border border-slate-100 bg-slate-50/50">
                      <p class="text-[10px] text-slate-400 font-bold uppercase">实际收益率</p>
                      <p class="mt-1 text-base font-black text-slate-900">{{ currentOrder.actualYield }}%</p>
                    </div>
                    <div class="p-4 rounded border border-slate-100 bg-slate-50/50">
                      <p class="text-[10px] text-slate-400 font-bold uppercase">手续费</p>
                      <p class="mt-1 text-base font-black text-slate-900">{{ currentOrder.fee }} USDT</p>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="currentTab === 'details'" class="space-y-6">
                <div class="grid gap-y-6 gap-x-12 sm:grid-cols-2">
                  <div v-for="(val, label) in {
                    '订单 ID': currentOrder.id,
                    '产品名称': currentOrder.productName,
                    '下单时间': currentOrder.betTime,
                    '结算时间': currentOrder.settleTime || '-',
                    '买入价格': currentOrder.entryPrice + ' USDT',
                    '结算价格': currentOrder.settlePrice ? currentOrder.settlePrice + ' USDT' : '-',
                    '投资周期': currentOrder.cycleSeconds + ' 秒',
                    '预期收益': currentOrder.expectedYield + '%'
                  }" :key="label" class="flex flex-col gap-1 border-b border-slate-50 pb-2">
                    <span class="text-[11px] font-bold text-slate-400">{{ label }}</span>
                    <span class="text-sm font-medium text-slate-900 font-mono">{{ val }}</span>
                  </div>
                </div>
              </div>

              <div v-if="currentTab === 'user'" class="space-y-6">
                <div class="flex items-center gap-4 p-4 rounded bg-slate-50 border border-slate-100">
                  <div class="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold">
                    {{ currentOrder.userName.charAt(0) }}
                  </div>
                  <div>
                    <p class="text-base font-bold text-slate-900">{{ currentOrder.userName }}</p>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span class="text-[11px] text-slate-500 font-mono">UID: {{ currentOrder.userId }}</span>
                      <span
                        class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                        :class="vipLevelMeta[currentOrder.userVip]?.class"
                      >
                        {{ vipLevelMeta[currentOrder.userVip]?.label }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="grid gap-6 sm:grid-cols-3">
                  <div class="flex flex-col gap-1">
                    <span class="text-[11px] font-bold text-slate-400">账号余额</span>
                    <span class="text-sm font-bold text-slate-900 font-mono">42,500.00 USDT</span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <span class="text-[11px] font-bold text-slate-400">累计充值</span>
                    <span class="text-sm font-bold text-slate-900 font-mono">150,000.00 USDT</span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <span class="text-[11px] font-bold text-slate-400">风控状态</span>
                    <span class="text-sm font-bold text-emerald-600">正常</span>
                  </div>
                </div>
              </div>

              <div v-if="currentTab === 'settlement'" class="space-y-4">
                <div class="relative pl-6 space-y-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                  <div class="relative">
                    <div class="absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600 shadow-sm"></div>
                    <div class="flex flex-col">
                      <span class="text-[11px] font-bold text-slate-400 uppercase">2024-03-12 14:30:00</span>
                      <span class="mt-0.5 text-sm font-medium text-slate-900">订单已创建，冻结资金 {{ currentOrder.investAmount }} USDT</span>
                    </div>
                  </div>
                  <div class="relative">
                    <div class="absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-slate-300 shadow-sm"></div>
                    <div class="flex flex-col">
                      <span class="text-[11px] font-bold text-slate-400 uppercase">2024-03-12 14:30:01</span>
                      <span class="mt-0.5 text-sm font-medium text-slate-900">入场价格已记录: {{ currentOrder.entryPrice }} USDT</span>
                    </div>
                  </div>
                  <div class="relative" v-if="currentOrder.status !== 'pending'">
                    <div class="absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm"></div>
                    <div class="flex flex-col">
                      <span class="text-[11px] font-bold text-slate-400 uppercase">{{ currentOrder.settleTime }}</span>
                      <span class="mt-0.5 text-sm font-medium text-slate-900">
                        结算完成，结果: {{ currentOrder.result === 'win' ? '赢利' : '亏损' }}，返还资金 {{ currentOrder.pnlAmount }} USDT
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          </template>
<template #footer><template v-if="showDetailModal"><footer class="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <a-button
              html-type="button"
              class="ant-btn"
              @click="closeDetailModal"
            >
              关闭
            </a-button>
          </footer></template></template>
</a-modal>
    </Transition>
  </section>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
