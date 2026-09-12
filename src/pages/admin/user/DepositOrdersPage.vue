<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import AdminListPaginationBar from '../../../admin/components/AdminListPaginationBar.vue'
import DepositAddressRotationDialog from '../../../admin/components/user/DepositAddressRotationDialog.vue'
import UserDetailDrawer from '../../../admin/components/user/UserDetailDrawer.vue'
import { getUserById } from '../../../admin/mock/user'
import {
  DEPOSIT_ORDER_STATUS,
  FUND_ORDER_FILTER_ALL,
  depositStatusOptions,
  fundOrderApi
} from '../../../admin/mock/fundOrders'

const keyword = ref('')
const statusFilter = ref(FUND_ORDER_FILTER_ALL)
const coinFilter = ref(FUND_ORDER_FILTER_ALL)
const loading = ref(false)
const rows = ref([])
const aggregates = ref(null)
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
const toast = ref({ show: false, text: '', kind: 'info' })

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const coins = ['USDT', 'BTC', 'ETH', 'USDC', 'TRX']

const totalPages = computed(() => Math.max(1, Math.ceil(pagination.total / pagination.pageSize)))
const canProcessSelectedOrder = computed(() => (
  selectedOrder.value &&
  selectedOrder.value.status === DEPOSIT_ORDER_STATUS.REVIEW
))

const stats = computed(() => {
  const byStatus = aggregates.value?.byStatus || {}
  return [
    { label: '待确认', value: byStatus[DEPOSIT_ORDER_STATUS.REVIEW] || 0, class: 'text-amber-600' },
    { label: '已入账', value: byStatus[DEPOSIT_ORDER_STATUS.CREDITED] || 0, class: 'text-emerald-600' },
    { label: '已驳回', value: byStatus[DEPOSIT_ORDER_STATUS.REJECTED] || 0, class: 'text-rose-600' },
    { label: '筛选金额', value: formatMoney(aggregates.value?.totalUsdt || 0), class: 'text-slate-900' }
  ]
})

function statusMeta(status) {
  return depositStatusOptions.find((item) => item.value === status) || {
    label: status,
    badgeClass: 'bg-slate-100 text-slate-700'
  }
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

function confirmationClass(order) {
  if (order.confirmations >= order.requiredConfirmations) return 'text-emerald-600'
  if (order.confirmations > 0) return 'text-amber-600'
  return 'text-rose-600'
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

function matchClass(order) {
  if (order.linkedChainEventId) return 'text-emerald-600'
  if (order.status === DEPOSIT_ORDER_STATUS.REJECTED) return 'text-slate-500'
  return 'text-amber-600'
}

function showToast(text, kind = 'info') {
  toast.value = { show: true, text, kind }
  setTimeout(() => {
    toast.value.show = false
  }, 2600)
}

async function loadList() {
  loading.value = true
  try {
    const res = await fundOrderApi.listDepositOrders({
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      status: statusFilter.value,
      coin: coinFilter.value,
      keyword: keyword.value
    })
    if (res.success) {
      rows.value = res.data.list
      pagination.total = res.data.total
      aggregates.value = res.data.aggregates
      if (selectedOrder.value) {
        selectedOrder.value = rows.value.find((item) => item.id === selectedOrder.value.id) || selectedOrder.value
      }
    }
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.currentPage = 1
  loadList()
}

function resetFilters() {
  keyword.value = ''
  statusFilter.value = FUND_ORDER_FILTER_ALL
  coinFilter.value = FUND_ORDER_FILTER_ALL
  handleSearch()
}

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
    const latest = rows.value.find((item) => item.id === selectedOrder.value.id)
    if (latest) selectedOrder.value = latest
    await loadChainEvents()
  }
}

watch(
  () => [pagination.currentPage, pagination.pageSize],
  () => loadList()
)

onMounted(loadList)
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">入金审核</h1>
        <p class="mt-1 text-sm text-slate-500">核对用户入金申请、上传凭证，并手动选择链上通知记录确认入账。</p>
      </div>
      <div v-if="toast.show" class="rounded-lg border bg-white px-4 py-2 text-sm shadow-sm" :class="toast.kind === 'error' ? 'border-rose-200 text-rose-700' : 'border-emerald-200 text-emerald-700'">
        {{ toast.text }}
      </div>
    </header>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article v-for="stat in stats" :key="stat.label" class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-sm text-slate-500">{{ stat.label }}</p>
        <p class="mt-2 text-2xl font-semibold tabular-nums" :class="stat.class">{{ stat.value }}</p>
      </article>
    </div>

    <article class="rounded-xl border border-slate-200 bg-white">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="opt in [{ value: FUND_ORDER_FILTER_ALL, label: '全部' }, ...depositStatusOptions]"
            :key="opt.value"
            type="button"
            class="rounded-lg px-3 py-2 text-sm font-medium transition"
            :class="statusFilter === opt.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            @click="statusFilter = opt.value; handleSearch()"
          >
            {{ opt.label }}
          </button>
        </div>
        <div class="flex w-full flex-wrap gap-2 lg:w-auto">
          <select v-model="coinFilter" class="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500" @change="handleSearch">
            <option :value="FUND_ORDER_FILTER_ALL">全部币种</option>
            <option v-for="coin in coins" :key="coin" :value="coin">{{ coin }}</option>
          </select>
          <input
            v-model="keyword"
            type="text"
            placeholder="搜索订单、用户、地址、哈希"
            class="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500 lg:w-72"
            @keyup.enter="handleSearch"
          />
          <button type="button" class="ant-btn ant-btn-primary" @click="handleSearch">查询</button>
          <button type="button" class="ant-btn" @click="resetFilters">重置</button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-3">订单</th>
              <th class="px-4 py-3">用户</th>
              <th class="px-4 py-3 text-right">入金金额</th>
              <th class="px-4 py-3">匹配状态</th>
              <th class="px-4 py-3">凭证</th>
              <th class="px-4 py-3">状态</th>
              <th class="px-4 py-3">提交时间</th>
              <th class="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="loading">
              <td colspan="8" class="px-4 py-10 text-center text-slate-500">加载中...</td>
            </tr>
            <tr v-for="order in rows" v-else :key="order.id" class="hover:bg-slate-50">
              <td class="px-4 py-3">
                <div class="font-mono text-xs text-slate-500">{{ order.id }}</div>
                <div class="mt-1 text-xs text-slate-400">用户提交凭证</div>
              </td>
              <td class="px-4 py-3">
                <button
                  type="button"
                  class="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                  @click="openUserPanel(order)"
                >
                  {{ order.username }}
                </button>
                <div class="text-xs text-slate-500">{{ order.userId }}</div>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="font-semibold text-slate-900">{{ formatMoney(order.amount) }} {{ order.coin }}</div>
                <div class="text-xs text-slate-500">折合 {{ formatMoney(order.usdtValue) }} USDT</div>
              </td>
              <td class="max-w-[260px] px-4 py-3">
                <div class="text-sm font-medium" :class="matchClass(order)">{{ matchText(order) }}</div>
                <div class="mt-1 truncate font-mono text-xs text-slate-500">{{ order.linkedChainEventId || order.toAddress }}</div>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <button type="button" class="rounded border border-slate-200 transition hover:border-blue-400" @click="openVoucherPreview(order)">
                    <img :src="order.voucherUrl" :alt="order.voucherName" class="h-10 w-14 rounded object-cover" />
                  </button>
                  <span class="max-w-[120px] truncate text-xs text-slate-500">{{ order.voucherName }}</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="statusMeta(order.status).badgeClass">{{ statusMeta(order.status).label }}</span>
              </td>
              <td class="px-4 py-3 text-xs text-slate-500">{{ formatTime(order.submitTime) }}</td>
              <td class="px-4 py-3 text-right">
                <div class="flex flex-wrap justify-end gap-2">
                  <button type="button" class="min-h-11 rounded px-2 text-sm font-medium text-blue-600 hover:underline focus-visible:ring-2 focus-visible:ring-blue-500" @click="openDetail(order)">详情</button>
                  <button type="button" class="min-h-11 rounded px-2 text-sm font-medium text-blue-600 hover:underline focus-visible:ring-2 focus-visible:ring-blue-500" :aria-label="`修改入金地址 ${order.id}`" @click="openAddressEditor(order, $event.currentTarget)">修改入金地址</button>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && rows.length === 0">
              <td colspan="8" class="px-4 py-10 text-center text-slate-500">暂无入金审核记录</td>
            </tr>
          </tbody>
        </table>
      </div>
      <AdminListPaginationBar
        v-model:current-page="pagination.currentPage"
        v-model:page-size="pagination.pageSize"
        :total-pages="totalPages"
        :total-count="pagination.total"
      />
    </article>

    <DepositAddressRotationDialog :visible="addressDialogOpen" :user="addressUser" :order="addressOrder" :return-focus="addressReturnFocus" @close="addressDialogOpen = false" />

    <Teleport to="body">
      <div v-if="selectedOrder" class="fixed inset-0 z-50 flex justify-end bg-slate-900/35" @click.self="closeDetail">
        <aside class="flex h-full w-full max-w-6xl flex-col bg-white shadow-2xl">
          <header class="border-b border-slate-200 px-6 py-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-medium text-slate-500">入金审核详情</p>
                <h2 class="mt-1 text-xl font-semibold text-slate-900">{{ selectedOrder.id }}</h2>
              </div>
              <button type="button" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100" @click="closeDetail">关闭</button>
            </div>
          </header>
          <div class="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-xl bg-slate-50 p-4">
                <p class="text-xs text-slate-500">用户</p>
                <button
                  type="button"
                  class="mt-1 font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  @click="openUserPanel(selectedOrder)"
                >
                  {{ selectedOrder.username }}
                </button>
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
                  <button type="button" class="mt-3 block w-full rounded-xl border border-slate-200 bg-slate-50 transition hover:border-blue-400" @click="openVoucherPreview(selectedOrder)">
                    <img :src="selectedOrder.voucherUrl" :alt="selectedOrder.voucherName" class="max-h-[360px] w-full rounded-xl object-contain" />
                  </button>
                </div>
              </div>

              <div v-if="canProcessSelectedOrder" class="rounded-xl border border-slate-200 p-4">
                <div class="flex rounded-lg bg-slate-100 p-1">
                  <button
                    type="button"
                    class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition"
                    :class="confirmationMode === 'chain' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'"
                    @click="confirmationMode = 'chain'; actionType = ''"
                  >
                    选择链上通知
                  </button>
                  <button
                    type="button"
                    class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition"
                    :class="confirmationMode === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'"
                    @click="confirmationMode = 'manual'; actionType = ''"
                  >
                    手动输入确认
                  </button>
                </div>

                <div v-if="confirmationMode === 'chain'" class="mt-4">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p class="text-sm font-semibold text-slate-900">未确认链上通知记录</p>
                      <p class="mt-1 text-sm text-slate-500">请选择一条与凭证、币种、网络和平台地址一致的链上通知记录。</p>
                    </div>
                    <div class="flex gap-2">
                      <input
                        v-model="chainEventKeyword"
                        type="text"
                        placeholder="搜索 TxHash / 地址 / 金额"
                        class="h-9 w-56 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-blue-500"
                        @keyup.enter="loadChainEvents"
                      />
                      <button type="button" class="ant-btn" @click="loadChainEvents">查询</button>
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
                          <input v-model="selectedChainEventId" type="radio" :value="event.id" class="mt-1" />
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
                    <input v-model="manualConfirmation.txHash" type="text" spellcheck="false" placeholder="请输入链上交易哈希" class="ant-input w-full font-mono" />
                  </label>
                  <label class="block space-y-1.5">
                    <span class="text-sm font-medium text-slate-700">付款地址 <span class="text-rose-500">*</span></span>
                    <input v-model="manualConfirmation.fromAddress" type="text" spellcheck="false" placeholder="请输入付款方链上地址" class="ant-input w-full font-mono" />
                  </label>
                  <label class="block space-y-1.5">
                    <span class="text-sm font-medium text-slate-700">实际到账金额 <span class="text-rose-500">*</span></span>
                    <div class="flex overflow-hidden rounded-md border border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
                      <input v-model="manualConfirmation.amount" type="number" min="0" step="any" inputmode="decimal" placeholder="请输入实际到账金额" class="min-w-0 flex-1 border-0 px-3 py-2 text-sm outline-none" />
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
                    <button type="button" class="ant-btn ant-btn-primary" @click="actionType = 'credit'">确认入账</button>
                    <button type="button" class="ant-btn" @click="actionType = 'reject'">驳回</button>
                  </div>
                  <div v-if="actionType" class="mt-3">
                    <textarea v-model="actionNote" rows="3" class="ant-input w-full" :placeholder="actionType === 'reject' ? '请输入驳回原因' : '请输入入账备注（可选）'"></textarea>
                    <div class="mt-3 flex justify-end gap-2">
                      <button type="button" class="ant-btn" @click="actionType = ''">取消</button>
                      <button type="button" class="ant-btn ant-btn-primary" @click="submitAction(actionType)">确认提交</button>
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
          </div>
        </aside>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="previewVoucher" class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-6" @click.self="closeVoucherPreview">
        <div class="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
          <header class="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-3">
            <p class="truncate text-sm font-semibold text-slate-900">{{ previewVoucher.name }}</p>
            <button type="button" class="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100" @click="closeVoucherPreview">关闭</button>
          </header>
          <div class="min-h-0 overflow-auto bg-slate-100 p-4">
            <img :src="previewVoucher.url" :alt="previewVoucher.name" class="mx-auto max-h-[78vh] max-w-full rounded-lg bg-white object-contain shadow-sm" />
          </div>
        </div>
      </div>
    </Teleport>

    <UserDetailDrawer
      :visible="showUserDrawer"
      :user="selectedUser"
      @close="closeUserPanel"
    />
  </section>
</template>
