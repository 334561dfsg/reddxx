<script setup>
// 交割合约订单 — Ant Design Pro list page (2026-11-28): query card (EarnSearchForm), table card with toolbar and
// pagination (EarnAdminTable), link actions, status as a text Tag. Reads the mock's real fields (status/result/
// direction meta use `text`; profit = actualReturn − investAmount; VIP from vipLevel), which the old table missed.
import { ref, computed, onMounted } from 'vue'
import { Button, Space, Tag, TypographyText, message } from 'ant-design-vue'
import { DownloadOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import {
  createDeliveryOrdersMock,
  DELIVERY_ORDER_STATUS,
  DELIVERY_ORDER_RESULT,
  deliveryOrderStatusMeta,
  deliveryOrderResultMeta,
  deliveryOrderDirectionMeta
} from '../../../admin/mock/deliveryOrder'

const orders = ref([])
const page = ref(1)
const showDetailModal = ref(false)
const currentOrder = ref(null)
const currentTab = ref('overview')

const blank = () => ({ orderId: '', userId: '', status: 'all', product: 'all', result: 'all', cycle: 'all', betDate: null, invest: [null, null], yield: [null, null] })
const filters = ref(blank())
const productOptions = computed(() => [...new Set(orders.value.map((o) => o.productName))].map((value) => ({ value, label: value })))
const fields = computed(() => [
  { key: 'orderId', label: '订单号' },
  { key: 'userId', label: '用户 ID' },
  { key: 'status', label: '状态', options: [{ value: 'all', label: '全部状态' }, ...Object.entries(deliveryOrderStatusMeta).map(([value, meta]) => ({ value, label: meta.text }))] },
  { key: 'product', label: '产品', searchable: true, options: [{ value: 'all', label: '全部产品' }, ...productOptions.value] },
  { key: 'result', label: '结算结果', options: [{ value: 'all', label: '全部结果' }, ...Object.entries(deliveryOrderResultMeta).map(([value, meta]) => ({ value, label: meta.text }))] },
  { key: 'cycle', label: '周期', options: [{ value: 'all', label: '全部周期' }, { value: 'short', label: '短周期（≤60 秒）' }, { value: 'medium', label: '中周期（61–180 秒）' }, { value: 'long', label: '长周期（>180 秒）' }] },
  { key: 'betDate', label: '下单日期', range: true },
  { key: 'invest', label: '投资金额', numberRange: true, min: 0 },
  { key: 'yield', label: '实际收益率', numberRange: true }
])

const vipLabel = (order) => (order.vipLevel === undefined || order.vipLevel === null ? '' : String(order.vipLevel).startsWith('VIP') ? String(order.vipLevel) : `VIP${order.vipLevel}`)
const profitOf = (order) => Number((order.actualReturn - order.investAmount).toFixed(2))
const isSettled = (order) => order.status !== DELIVERY_ORDER_STATUS.PENDING
const money = (value) => Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
const statusColor = { [DELIVERY_ORDER_STATUS.PENDING]: 'orange', [DELIVERY_ORDER_STATUS.SETTLED]: 'default', [DELIVERY_ORDER_STATUS.EXERCISED]: 'blue' }
const has = (value, query) => !query || String(value).toLowerCase().includes(query.trim().toLowerCase())
const inRange = (value, [min, max]) => (min === null || min === undefined || value >= min) && (max === null || max === undefined || value <= max)
const cycleOf = (seconds) => (seconds <= 60 ? 'short' : seconds <= 180 ? 'medium' : 'long')

onMounted(() => {
  orders.value = createDeliveryOrdersMock()
})

const rows = computed(() => orders.value.filter((o) => {
  const f = filters.value
  const day = o.betTime.slice(0, 10)
  return has(o.id, f.orderId) && has(o.userId, f.userId) &&
    (f.status === 'all' || o.status === f.status) &&
    (f.product === 'all' || o.productName === f.product) &&
    (f.result === 'all' || (isSettled(o) && o.result === f.result)) &&
    (f.cycle === 'all' || cycleOf(o.cycleSeconds) === f.cycle) &&
    (!f.betDate || (day >= f.betDate[0] && day <= f.betDate[1])) &&
    inRange(o.investAmount, f.invest) && inRange(o.actualYield, f.yield)
}))

const columns = [
  { key: 'order', title: '订单', width: 200, fixed: 'left' },
  { key: 'user', title: '用户', width: 160 },
  { key: 'invest', title: '投资金额（USDT）', width: 170, align: 'right' },
  { key: 'expected', title: '预期收益率', width: 120, align: 'right' },
  { key: 'pnl', title: '结算盈亏（USDT）', width: 160, align: 'right' },
  { key: 'status', title: '状态', width: 90 },
  { key: 'actions', title: '操作', width: 80, fixed: 'right' }
]

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }

const viewOrder = (order) => {
  currentOrder.value = order
  currentTab.value = 'overview'
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  currentOrder.value = null
}

// Mock export: no file yet, so say so instead of a native alert (operation feedback is toast-only).
const exportOrders = () => {
  message.info(`已按当前筛选条件准备导出 ${rows.value.length} 条订单（演示环境不生成文件）`)
}

const detailTabs = [
  { id: 'overview', label: '概览' },
  { id: 'details', label: '订单详情' },
  { id: 'user', label: '用户信息' },
  { id: 'settlement', label: '结算记录' }
]
</script>

<template>
  <PageShell>
    <SearchForm name="delivery-order-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <AdminTable title="交割合约订单" v-model:page="page" :rows="rows" :columns="columns" row-key="id" desktop-only>
      <template #toolbar>
        <Button @click="exportOrders"><template #icon><DownloadOutlined /></template>导出</Button>
      </template>
      <template #cell="{ column, record }">
        <Space v-if="column.key === 'order'" direction="vertical" :size="0">
          <TypographyText strong>{{ record.productName }}</TypographyText>
          <TypographyText type="secondary" class="font-mono">{{ record.id }}</TypographyText>
          <TypographyText type="secondary">{{ record.betTime }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'user'" direction="vertical" :size="0">
          <span>{{ record.userName }} <Tag v-if="vipLabel(record)" class="ml-1">{{ vipLabel(record) }}</Tag></span>
          <TypographyText type="secondary" class="font-mono">{{ record.userId }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'invest'" direction="vertical" :size="0" align="end">
          <span>{{ money(record.investAmount) }}</span>
          <span><Tag :color="record.direction === 'CALL' ? 'green' : 'red'">{{ deliveryOrderDirectionMeta[record.direction]?.text }}</Tag><TypographyText type="secondary">{{ record.cycleSeconds }} 秒</TypographyText></span>
        </Space>
        <Space v-else-if="column.key === 'expected'" direction="vertical" :size="0" align="end">
          <span>{{ record.expectedYield }}%</span>
          <TypographyText type="secondary">手续费 {{ money(record.fee) }}</TypographyText>
        </Space>
        <template v-else-if="column.key === 'pnl'">
          <Space v-if="isSettled(record)" direction="vertical" :size="0" align="end">
            <TypographyText :type="profitOf(record) >= 0 ? 'success' : 'danger'">{{ profitOf(record) > 0 ? '+' : '' }}{{ money(profitOf(record)) }}</TypographyText>
            <TypographyText type="secondary">{{ deliveryOrderResultMeta[record.result]?.text }} · 收益率 {{ record.actualYield }}%</TypographyText>
          </Space>
          <TypographyText v-else type="secondary">待结算</TypographyText>
        </template>
        <Tag v-else-if="column.key === 'status'" :color="statusColor[record.status]">{{ deliveryOrderStatusMeta[record.status]?.text }}</Tag>
        <Button v-else-if="column.key === 'actions'" type="link" class="px-0" @click="viewOrder(record)">详情</Button>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <!-- 订单详情模态框 -->
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
                      :class="currentOrder.direction === 'CALL' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'"
                    >
                      <svg v-if="currentOrder.direction === 'CALL'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        :class="currentOrder.direction === 'CALL' ? 'text-emerald-600' : 'text-rose-600'"
                      >
                        {{ currentOrder.direction === 'CALL' ? '看涨 (Buy Up)' : '看跌 (Buy Down)' }}
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
                        {{ profitOf(currentOrder) > 0 ? '+' : '' }}{{ money(profitOf(currentOrder)) }} USDT
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
                      <Tag v-if="vipLabel(currentOrder)">{{ vipLabel(currentOrder) }}</Tag>
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
                        结算完成，结果: {{ currentOrder.result === 'win' ? '赢利' : '亏损' }}，返还资金 {{ money(currentOrder.actualReturn) }} USDT
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
  </PageShell>
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
