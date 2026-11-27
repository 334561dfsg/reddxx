<script setup>
// 入金审核 — Ant Design Pro list page (2026-11-28): query card (one input per field instead of the old combined
// keyword box and status pills), business statistics card, table card with pagination, status as a text Tag and link
// actions. The review drawer (chain-event / manual confirmation), voucher preview and address dialog are unchanged;
// operation feedback uses Ant message instead of the inline header toast.
import { computed, onMounted, reactive, ref } from 'vue'
import { Button, Card, Col, Row, Space, Statistic, Tag, TypographyText, message } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import DepositAddressRotationDialog from '../../../admin/components/user/DepositAddressRotationDialog.vue'
import UserDetailDrawer from '../../../admin/components/user/UserDetailDrawer.vue'
import { getUserById } from '../../../admin/mock/user'
import {
  DEPOSIT_ORDER_STATUS,
  FUND_ORDER_FILTER_ALL,
  depositStatusOptions,
  fundOrderApi
} from '../../../admin/mock/fundOrders'

const loading = ref(false)
const orders = ref([])
const page = ref(1)
const addressDialogOpen = ref(false)
const addressUser = ref(null)
const addressOrder = ref(null)
const addressReturnFocus = ref(null)
function openAddressEditor(order, trigger) {
  if (addressDialogOpen.value) return
  addressUser.value = { id: order.userId, username: order.username }
  addressOrder.value = { id: order.id, coin: order.coin, network: order.network, toAddress: order.toAddress }
  addressReturnFocus.value = trigger
  addressDialogOpen.value = true
}
const selectedOrder = ref(null)
const selectedUser = ref(null)
const showUserDrawer = ref(false)
const chainEventKeyword = ref('')
const chainEvents = ref([])
const selectedChainEventId = ref('')
const loadingChainEvents = ref(false)
const confirmationMode = ref('chain')
const manualConfirmation = reactive({
  txHash: '',
  fromAddress: '',
  amount: ''
})
const actionType = ref('')
const actionNote = ref('')
const previewVoucher = ref(null)

const coins = ['USDT', 'BTC', 'ETH', 'USDC', 'TRX']
const blank = () => ({ orderId: '', user: '', status: FUND_ORDER_FILTER_ALL, coin: FUND_ORDER_FILTER_ALL, address: '', txHash: '', submitDate: null })
const filters = ref(blank())
const fields = [
  { key: 'orderId', label: '订单号' },
  { key: 'user', label: '用户' },
  { key: 'status', label: '状态', options: [{ value: FUND_ORDER_FILTER_ALL, label: '全部状态' }, ...depositStatusOptions.map(({ value, label }) => ({ value, label }))] },
  { key: 'coin', label: '币种', searchable: true, options: [{ value: FUND_ORDER_FILTER_ALL, label: '全部币种' }, ...coins.map((coin) => ({ value: coin, label: coin }))] },
  { key: 'address', label: '地址' },
  { key: 'txHash', label: 'TxHash' },
  { key: 'submitDate', label: '提交日期', range: true }
]

const has = (value, query) => !String(query || '').trim() || String(value || '').toLowerCase().includes(String(query).trim().toLowerCase())
const localDate = (value) => {
  const date = new Date(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
// Status and coin go to the mock API; the remaining single-attribute fields are matched on the returned rows.
const rows = computed(() => orders.value.filter((order) => {
  const f = filters.value
  return has(order.id, f.orderId) &&
    (has(order.userId, f.user) || has(order.username, f.user)) &&
    (has(order.toAddress, f.address) || has(order.fromAddress, f.address)) && has(order.txHash, f.txHash) &&
    (!f.submitDate || (localDate(order.submitTime) >= f.submitDate[0] && localDate(order.submitTime) <= f.submitDate[1]))
}))

const columns = [
  { key: 'order', title: '订单', width: 170 },
  { key: 'user', title: '用户', width: 170 },
  { key: 'amount', title: '入金金额', width: 190, align: 'right' },
  { key: 'match', title: '匹配状态', width: 240 },
  { key: 'voucher', title: '凭证', width: 200 },
  { key: 'status', title: '状态', width: 90 },
  { key: 'submitTime', title: '提交时间', width: 170 },
  { key: 'actions', title: '操作', width: 170, fixed: 'right' }
]
const statusColor = { [DEPOSIT_ORDER_STATUS.REVIEW]: 'orange', [DEPOSIT_ORDER_STATUS.CREDITED]: 'green', [DEPOSIT_ORDER_STATUS.REJECTED]: 'red' }
const canProcessSelectedOrder = computed(() => (
  selectedOrder.value &&
  selectedOrder.value.status === DEPOSIT_ORDER_STATUS.REVIEW
))

const stats = computed(() => {
  const count = (status) => rows.value.filter((order) => order.status === status).length
  return [
    { label: '待确认', value: count(DEPOSIT_ORDER_STATUS.REVIEW) },
    { label: '已入账', value: count(DEPOSIT_ORDER_STATUS.CREDITED) },
    { label: '已驳回', value: count(DEPOSIT_ORDER_STATUS.REJECTED) },
    { label: '筛选金额（USDT）', value: formatMoney(rows.value.reduce((total, order) => total + Number(order.usdtValue || 0), 0)) }
  ]
})

function statusMeta(status) {
  return depositStatusOptions.find((item) => item.value === status) || { label: status }
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

function eventConfirmationClass(event) {
  if (event.confirmations >= event.requiredConfirmations) return 'text-emerald-600'
  if (event.confirmations > 0) return 'text-amber-600'
  return 'text-rose-600'
}

function matchText(order) {
  if (order.linkedChainEvent?.source === 'manual') return '人工确认'
  if (order.linkedChainEventId) return '已关联链上通知'
  if (order.status === DEPOSIT_ORDER_STATUS.REJECTED) return '无需关联'
  return '待人工选择'
}

function matchColor(order) {
  if (order.linkedChainEventId) return 'green'
  if (order.status === DEPOSIT_ORDER_STATUS.REJECTED) return 'default'
  return 'orange'
}

function matchClass(order) {
  if (order.linkedChainEventId) return 'text-emerald-600'
  if (order.status === DEPOSIT_ORDER_STATUS.REJECTED) return 'text-slate-500'
  return 'text-amber-600'
}

function showToast(text, kind = 'info') {
  if (kind === 'error') message.error(text)
  else if (kind === 'success') message.success(text)
  else message.info(text)
}

async function loadList() {
  loading.value = true
  try {
    const res = await fundOrderApi.listDepositOrders({
      page: 1,
      pageSize: Number.MAX_SAFE_INTEGER,
      status: filters.value.status,
      coin: filters.value.coin
    })
    if (res.success) {
      orders.value = res.data.list
      if (selectedOrder.value) {
        selectedOrder.value = orders.value.find((item) => item.id === selectedOrder.value.id) || selectedOrder.value
      }
    } else showToast(res.message || '入金审核记录加载失败', 'error')
  } finally {
    loading.value = false
  }
}

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1; loadList() }
function reset() { filters.value = blank(); page.value = 1; loadList() }

function openDetail(order) {
  selectedOrder.value = order
  actionType.value = ''
  actionNote.value = ''
  selectedChainEventId.value = ''
  chainEventKeyword.value = ''
  confirmationMode.value = 'chain'
  Object.assign(manualConfirmation, { txHash: '', fromAddress: '', amount: '' })
  loadChainEvents()
}

function closeDetail() {
  selectedOrder.value = null
  chainEvents.value = []
  selectedChainEventId.value = ''
  chainEventKeyword.value = ''
  confirmationMode.value = 'chain'
  Object.assign(manualConfirmation, { txHash: '', fromAddress: '', amount: '' })
  actionType.value = ''
  actionNote.value = ''
}

function openUserPanel(order) {
  selectedUser.value = getUserById(order.userId) || {
    id: order.userId,
    username: order.username,
    email: order.email
  }
  showUserDrawer.value = true
}

function closeUserPanel() {
  showUserDrawer.value = false
  selectedUser.value = null
}

function openVoucherPreview(order) {
  previewVoucher.value = {
    name: order.voucherName,
    url: order.voucherUrl
  }
}

function closeVoucherPreview() {
  previewVoucher.value = null
}

async function loadChainEvents() {
  if (!selectedOrder.value) return
  loadingChainEvents.value = true
  try {
    const res = await fundOrderApi.listUnconfirmedChainDepositEvents(
      selectedOrder.value.id,
      chainEventKeyword.value
    )
    if (res.success) {
      chainEvents.value = res.data
      if (!chainEvents.value.some((event) => event.id === selectedChainEventId.value)) {
        selectedChainEventId.value = ''
      }
    } else {
      chainEvents.value = []
      showToast(res.message || '链上通知记录加载失败', 'error')
    }
  } finally {
    loadingChainEvents.value = false
  }
}

async function submitAction(action) {
  if (!selectedOrder.value) return
  if (action === 'credit') {
    if (confirmationMode.value === 'chain' && !selectedChainEventId.value) {
      showToast('确认入账前请选择一条未确认链上通知记录', 'error')
      return
    }
    if (confirmationMode.value === 'manual') {
      if (!manualConfirmation.txHash.trim()) {
        showToast('请输入 TxHash', 'error')
        return
      }
      if (!manualConfirmation.fromAddress.trim()) {
        showToast('请输入付款地址', 'error')
        return
      }
      if (!Number.isFinite(Number(manualConfirmation.amount)) || Number(manualConfirmation.amount) <= 0) {
        showToast('实际到账金额必须大于 0', 'error')
        return
      }
    }
  }
  if (action === 'reject' && !actionNote.value.trim()) {
    showToast('驳回入金审核时必须填写原因', 'error')
    return
  }
  const res = await fundOrderApi.updateDepositOrder(
    selectedOrder.value.id,
    action,
    actionNote.value.trim(),
    confirmationMode.value === 'chain' ? selectedChainEventId.value : '',
    action === 'credit' && confirmationMode.value === 'manual'
      ? {
          txHash: manualConfirmation.txHash.trim(),
          fromAddress: manualConfirmation.fromAddress.trim(),
          amount: Number(manualConfirmation.amount)
        }
      : null
  )
  showToast(res.message, res.success ? 'success' : 'error')
  if (res.success) {
    actionType.value = ''
    actionNote.value = ''
    selectedChainEventId.value = ''
    Object.assign(manualConfirmation, { txHash: '', fromAddress: '', amount: '' })
    await loadList()
    const latest = orders.value.find((item) => item.id === selectedOrder.value.id)
    if (latest) selectedOrder.value = latest
    await loadChainEvents()
  }
}

onMounted(loadList)
</script>

<template>
  <PageShell>
    <SearchForm name="deposit-order-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />

    <Card :bordered="false">
      <Row :gutter="24">
        <Col v-for="stat in stats" :key="stat.label" :span="6"><Statistic :title="stat.label" :value="stat.value" /></Col>
      </Row>
    </Card>

    <AdminTable title="入金审核" v-model:page="page" :rows="rows" :columns="columns" :loading="loading" row-key="id" desktop-only>
      <template #cell="{ column, record: order }">
        <Space v-if="column.key === 'order'" direction="vertical" :size="0">
          <span class="font-mono">{{ order.id }}</span>
          <TypographyText type="secondary">{{ order.source || '用户提交凭证' }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'user'" direction="vertical" :size="0">
          <Button type="link" class="px-0" @click="openUserPanel(order)">{{ order.username }}</Button>
          <TypographyText type="secondary" class="font-mono">{{ order.userId }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'amount'" direction="vertical" :size="0" align="end">
          <span>{{ formatMoney(order.amount) }} {{ order.coin }}</span>
          <TypographyText type="secondary">折合 {{ formatMoney(order.usdtValue) }} USDT</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'match'" direction="vertical" :size="0">
          <Tag :color="matchColor(order)">{{ matchText(order) }}</Tag>
          <TypographyText type="secondary" class="font-mono" :ellipsis="{ tooltip: order.linkedChainEventId || order.toAddress }" :content="order.linkedChainEventId || order.toAddress" />
        </Space>
        <Space v-else-if="column.key === 'voucher'" :size="8">
          <Button type="text" class="voucher-thumb" :aria-label="`查看充值凭证 ${order.voucherName}`" @click="openVoucherPreview(order)">
            <img :src="order.voucherUrl" alt="" />
          </Button>
          <TypographyText type="secondary" :ellipsis="{ tooltip: order.voucherName }" :content="order.voucherName" class="voucher-name" />
        </Space>
        <Tag v-else-if="column.key === 'status'" :color="statusColor[order.status]">{{ statusMeta(order.status).label }}</Tag>
        <TypographyText v-else-if="column.key === 'submitTime'" type="secondary">{{ formatTime(order.submitTime) }}</TypographyText>
        <Space v-else-if="column.key === 'actions'" :size="8">
          <Button type="link" class="px-0" @click="openDetail(order)">{{ order.status === DEPOSIT_ORDER_STATUS.REVIEW ? '处理' : '详情' }}</Button>
          <Button type="link" class="px-0" :aria-label="`修改入金地址 ${order.id}`" @click="openAddressEditor(order, $event.currentTarget)">修改入金地址</Button>
        </Space>
        <template v-else>{{ order[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <DepositAddressRotationDialog :visible="addressDialogOpen" :user="addressUser" :order="addressOrder" :return-focus="addressReturnFocus" @close="addressDialogOpen = false" />

      <a-drawer :open="Boolean(selectedOrder)" :mask-closable="false" :keyboard="false" :closable="false" placement="right" width="min(960px, 100vw)" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @close="closeDetail"><template #title><template v-if="Boolean(selectedOrder)"><header class="border-b border-slate-200 px-6 py-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-medium text-slate-500">入金审核详情</p>
                <h2 class="mt-1 text-xl font-semibold text-slate-900">{{ selectedOrder.id }}</h2>
              </div>
              <a-button aria-label="关闭" html-type="button" class="text-slate-500 hover:bg-slate-100" @click="closeDetail">关闭</a-button>
            </div>
          </header></template></template><template v-if="selectedOrder"><div class="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-xl bg-slate-50 p-4">
                <p class="text-xs text-slate-500">用户</p>
                <a-button html-type="button" class="mt-1 font-semibold text-blue-600 hover:text-blue-700 hover:underline" @click="openUserPanel(selectedOrder)">
                  {{ selectedOrder.username }}
                </a-button>
                <p class="text-xs text-slate-500">{{ selectedOrder.email }}</p>
              </div>
              <div class="rounded-xl bg-slate-50 p-4">
                <p class="text-xs text-slate-500">入金金额</p>
                <p class="mt-1 font-semibold text-slate-900">{{ formatMoney(selectedOrder.amount) }} {{ selectedOrder.coin }}</p>
                <p class="text-xs text-slate-500">折合 {{ formatMoney(selectedOrder.usdtValue) }} USDT</p>
              </div>
            </div>

            <div
              class="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]"
            >
              <div class="space-y-5">
                <div class="rounded-xl border border-slate-200 p-4">
                  <p class="text-sm font-semibold text-slate-900">入金申请</p>
                  <div class="mt-3 space-y-2 text-sm">
                    <div class="flex justify-between gap-4"><span class="text-slate-500">网络</span><span class="font-medium text-slate-900">{{ selectedOrder.network }}</span></div>
                    <div class="flex justify-between gap-4"><span class="text-slate-500">平台地址</span><span class="break-all text-right font-mono text-slate-900">{{ selectedOrder.toAddress }}</span></div>
                    <div class="flex justify-between gap-4"><span class="text-slate-500">链上通知</span><span class="font-medium" :class="matchClass(selectedOrder)">{{ matchText(selectedOrder) }}</span></div>
                  </div>
                </div>

                <div class="rounded-xl border border-slate-200 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <p class="text-sm font-semibold text-slate-900">上传凭证</p>
                    <span class="text-xs text-slate-500">{{ selectedOrder.voucherName }}</span>
                  </div>
                  <a-button html-type="button" class="mt-3 block w-full border border-slate-200 bg-slate-50 transition hover:border-blue-400" @click="openVoucherPreview(selectedOrder)">
                    <img :src="selectedOrder.voucherUrl" :alt="selectedOrder.voucherName" class="max-h-[360px] w-full rounded-xl object-contain" />
                  </a-button>
                </div>
              </div>

              <div v-if="canProcessSelectedOrder" class="rounded-xl border border-slate-200 p-4">
                <div class="flex rounded-lg bg-slate-100 p-1">
                  <a-button html-type="button" class="flex-1 text-sm font-medium transition" :class="confirmationMode === 'chain' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'" @click="confirmationMode = 'chain'; actionType = ''">
                    选择链上通知
                  </a-button>
                  <a-button html-type="button" class="flex-1 text-sm font-medium transition" :class="confirmationMode === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'" @click="confirmationMode = 'manual'; actionType = ''">
                    手动输入确认
                  </a-button>
                </div>

                <div v-if="confirmationMode === 'chain'" class="mt-4">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p class="text-sm font-semibold text-slate-900">未确认链上通知记录</p>
                      <p class="mt-1 text-sm text-slate-500">请选择一条与凭证、币种、网络和平台地址一致的链上通知记录。</p>
                    </div>
                    <div class="flex gap-2">
                      <a-input v-model:value="chainEventKeyword" type="text" placeholder="搜索 TxHash / 地址 / 金额" class="w-56" @keyup.enter="loadChainEvents" />
                      <a-button html-type="button" class="" @click="loadChainEvents">查询</a-button>
                    </div>
                  </div>

                  <div class="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    <div v-if="loadingChainEvents" class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">加载链上通知记录...</div>
                    <template v-else>
                      <label
                        v-for="event in chainEvents"
                        :key="event.id"
                        class="block cursor-pointer rounded-xl border p-3 transition"
                        :class="selectedChainEventId === event.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'"
                      >
                        <div class="flex items-start gap-3">
                          <a-radio :value="event.id" class="mt-1" :checked="selectedChainEventId === event.id" @update:checked="selectedChainEventId = event.id" />
                          <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-center justify-between gap-2">
                              <p class="font-mono text-xs text-slate-700">{{ event.txHash }}</p>
                              <p class="text-sm font-semibold text-slate-900">{{ formatMoney(event.amount) }} {{ event.coin }}</p>
                            </div>
                            <div class="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                              <p class="truncate">付款地址：<span class="font-mono text-slate-700">{{ event.fromAddress }}</span></p>
                              <p class="truncate">平台地址：<span class="font-mono text-slate-700">{{ event.toAddress }}</span></p>
                              <p>网络：{{ event.network }}</p>
                              <p>确认数：<span :class="eventConfirmationClass(event)">{{ event.confirmations }}/{{ event.requiredConfirmations }}</span></p>
                            </div>
                          </div>
                        </div>
                      </label>
                    </template>
                    <div v-if="!loadingChainEvents && chainEvents.length === 0" class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-4 text-sm text-amber-700">
                      暂无同币种、同网络、同平台地址的未确认链上通知记录。
                    </div>
                  </div>
                </div>

                <div v-else class="mt-4 space-y-4">
                  <div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
                    人工确认将直接使用下列信息完成入账，请先与用户凭证及区块浏览器核对。
                  </div>
                  <label class="block space-y-1.5">
                    <span class="text-sm font-medium text-slate-700">TxHash <span class="text-rose-500">*</span></span>
                    <a-input v-model:value="manualConfirmation.txHash" type="text" spellcheck="false" placeholder="请输入链上交易哈希" class="w-full font-mono" />
                  </label>
                  <label class="block space-y-1.5">
                    <span class="text-sm font-medium text-slate-700">付款地址 <span class="text-rose-500">*</span></span>
                    <a-input v-model:value="manualConfirmation.fromAddress" type="text" spellcheck="false" placeholder="请输入付款方链上地址" class="w-full font-mono" />
                  </label>
                  <label class="block space-y-1.5">
                    <span class="text-sm font-medium text-slate-700">实际到账金额 <span class="text-rose-500">*</span></span>
                    <div class="flex overflow-hidden rounded-md border border-slate-300">
                      <a-input type="number" :min="0" step="any" inputmode="decimal" placeholder="请输入实际到账金额" class="min-w-0 flex-1" :value="manualConfirmation.amount" @update:value="manualConfirmation.amount = $event === '' ? '' : Number($event)" />
                      <span class="flex items-center border-l border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600">{{ selectedOrder.coin }}</span>
                    </div>
                  </label>
                </div>

                <div class="mt-4 border-t border-slate-200 pt-4">
                  <p class="text-sm font-semibold text-slate-900">审核处理</p>
                  <p class="mt-1 text-sm text-slate-500">
                    {{ confirmationMode === 'manual' ? '手动确认时 TxHash、付款地址和实际到账金额均为必填；驳回时必须填写原因。' : '确认入账前必须选择一条未确认链上通知记录；驳回时必须填写原因。' }}
                  </p>
                  <div class="mt-3 flex gap-2">
                    <a-button html-type="button" class="" @click="actionType = 'credit'" type="primary">确认入账</a-button>
                    <a-button html-type="button" class="" @click="actionType = 'reject'">驳回</a-button>
                  </div>
                  <div v-if="actionType" class="mt-3">
                    <a-textarea v-model:value="actionNote" :rows="3" class="w-full" :placeholder="actionType === 'reject' ? '请输入驳回原因' : '请输入入账备注（可选）'"></a-textarea>
                    <div class="mt-3 flex justify-end gap-2">
                      <a-button html-type="button" class="" @click="actionType = ''">取消</a-button>
                      <a-button html-type="button" class="" @click="submitAction(actionType)" type="primary">确认提交</a-button>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="space-y-5">
                <div v-if="selectedOrder.linkedChainEvent" class="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <p class="text-sm font-semibold text-emerald-950">{{ selectedOrder.linkedChainEvent.source === 'manual' ? '人工确认记录' : '已关联链上通知记录' }}</p>
                    <span v-if="selectedOrder.linkedChainEvent.source === 'manual'" class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">人工确认</span>
                  </div>
                  <div class="mt-3 space-y-2 text-sm">
                    <div class="flex justify-between gap-4"><span class="text-emerald-700">TxHash</span><span class="break-all text-right font-mono text-emerald-950">{{ selectedOrder.linkedChainEvent.txHash }}</span></div>
                    <div class="flex justify-between gap-4"><span class="text-emerald-700">付款地址</span><span class="break-all text-right font-mono text-emerald-950">{{ selectedOrder.linkedChainEvent.fromAddress }}</span></div>
                    <div class="flex justify-between gap-4"><span class="text-emerald-700">金额</span><span class="font-medium text-emerald-950">{{ formatMoney(selectedOrder.linkedChainEvent.amount) }} {{ selectedOrder.linkedChainEvent.coin }}</span></div>
                    <div class="flex justify-between gap-4"><span class="text-emerald-700">确认数</span><span class="font-medium" :class="eventConfirmationClass(selectedOrder.linkedChainEvent)">{{ selectedOrder.linkedChainEvent.confirmations }}/{{ selectedOrder.linkedChainEvent.requiredConfirmations }}</span></div>
                  </div>
                </div>

                <div class="rounded-xl border border-slate-200 p-4">
                  <p class="text-sm font-semibold text-slate-900">处理信息</p>
                  <div class="mt-3 space-y-2 text-sm text-slate-600">
                    <div>状态：<span class="font-medium text-slate-900">{{ statusMeta(selectedOrder.status).label }}</span></div>
                    <div>操作人：{{ selectedOrder.operator || '-' }}</div>
                    <div>入账时间：{{ formatTime(selectedOrder.creditedTime) }}</div>
                    <div>备注：{{ selectedOrder.auditNote || '-' }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div></template></a-drawer>
    

      <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(previewVoucher)" :mask-closable="false" :keyboard="false" :closable="false" :footer="null" width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeVoucherPreview"><template #title><template v-if="Boolean(previewVoucher)"><header class="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-3">
            <p class="truncate text-sm font-semibold text-slate-900">{{ previewVoucher.name }}</p>
            <a-button aria-label="关闭" html-type="button" class="text-sm text-slate-500 hover:bg-slate-100" @click="closeVoucherPreview">关闭</a-button>
          </header></template></template><template v-if="previewVoucher"><div class="min-h-0 overflow-auto bg-slate-100 p-4">
            <img :src="previewVoucher.url" :alt="previewVoucher.name" class="mx-auto max-h-[78vh] max-w-full rounded-lg bg-white object-contain shadow-sm" />
          </div></template></a-modal>
    

    <UserDetailDrawer
      :visible="showUserDrawer"
      :user="selectedUser"
      @close="closeUserPanel"
    />
  </PageShell>
</template>

<style scoped>
.voucher-thumb { height: auto; padding: 2px; }
.voucher-thumb img { display: block; width: 56px; height: 40px; object-fit: cover; border-radius: 4px; }
.voucher-name { max-width: 120px; }
</style>
