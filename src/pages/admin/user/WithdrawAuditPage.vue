<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import AdminListPaginationBar from '../../../admin/components/AdminListPaginationBar.vue'
import UserDetailDrawer from '../../../admin/components/user/UserDetailDrawer.vue'
import { getUserById } from '../../../admin/mock/user'
import {
  FUND_ORDER_FILTER_ALL,
  WITHDRAW_AUDIT_STATUS,
  fundOrderApi,
  withdrawStatusOptions
} from '../../../admin/mock/fundOrders'

const keyword = ref('')
const statusFilter = ref(FUND_ORDER_FILTER_ALL)
const coinFilter = ref(FUND_ORDER_FILTER_ALL)
const loading = ref(false)
const rows = ref([])
const aggregates = ref(null)
const selectedOrder = ref(null)
const selectedUser = ref(null)
const showUserDrawer = ref(false)
const auditAction = ref('')
const auditNote = ref('')
const toast = ref({ show: false, text: '', kind: 'info' })

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const totalPages = computed(() => Math.max(1, Math.ceil(pagination.total / pagination.pageSize)))

const coins = ['USDT', 'BTC', 'ETH', 'USDC', 'TRX']

const stats = computed(() => {
  const byStatus = aggregates.value?.byStatus || {}
  return [
    { label: '待审核', value: byStatus[WITHDRAW_AUDIT_STATUS.PENDING] || 0, class: 'text-amber-600' },
    { label: '已通过', value: byStatus[WITHDRAW_AUDIT_STATUS.APPROVED] || 0, class: 'text-blue-600' },
    { label: '已拒绝', value: byStatus[WITHDRAW_AUDIT_STATUS.REJECTED] || 0, class: 'text-rose-600' },
    { label: '筛选金额', value: formatMoney(aggregates.value?.totalUsdt || 0), class: 'text-slate-900' }
  ]
})

function statusMeta(status) {
  return withdrawStatusOptions.find((item) => item.value === status) || {
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

function showToast(text, kind = 'info') {
  toast.value = { show: true, text, kind }
  setTimeout(() => {
    toast.value.show = false
  }, 2600)
}

async function loadList() {
  loading.value = true
  try {
    const res = await fundOrderApi.listWithdrawOrders({
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
  auditAction.value = ''
  auditNote.value = ''
}

function closeDetail() {
  selectedOrder.value = null
  auditAction.value = ''
  auditNote.value = ''
}

function openUserPanel(order) {
  selectedUser.value = getUserById(order.userId) || {
    id: order.userId,
    username: order.username,
    email: order.email,
    vipLevel: order.vipLevel,
    kycStatus: order.kycStatus
  }
  showUserDrawer.value = true
}

function closeUserPanel() {
  showUserDrawer.value = false
  selectedUser.value = null
}

async function submitAction(action) {
  if (!selectedOrder.value) return
  if (action === 'reject' && !auditNote.value.trim()) {
    showToast('拒绝出金时必须填写原因', 'error')
    return
  }
  const res = await fundOrderApi.updateWithdrawOrder(selectedOrder.value.id, action, auditNote.value.trim())
  showToast(res.message, res.success ? 'success' : 'error')
  if (res.success) {
    auditAction.value = ''
    auditNote.value = ''
    await loadList()
    const latest = rows.value.find((item) => item.id === selectedOrder.value.id)
    if (latest) selectedOrder.value = latest
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
        <h1 class="text-2xl font-bold text-slate-900">出金审核</h1>
        <p class="mt-1 text-sm text-slate-500">审核用户出金申请，处理通过和拒绝状态。</p>
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
          <a-button v-for="opt in [{ value: FUND_ORDER_FILTER_ALL, label: '全部' }, ...withdrawStatusOptions]" :key="opt.value" html-type="button" class="text-sm font-medium transition" :class="statusFilter === opt.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'" @click="statusFilter = opt.value; handleSearch()">
            {{ opt.label }}
          </a-button>
        </div>
        <div class="flex w-full flex-wrap gap-2 lg:w-auto">
          <a-select v-model:value="coinFilter" class="" @change="handleSearch">
            <a-select-option :value="FUND_ORDER_FILTER_ALL">全部币种</a-select-option>
            <a-select-option v-for="coin in coins" :key="coin" :value="coin">{{ coin }}</a-select-option>
          </a-select>
          <a-input v-model:value="keyword" type="text" placeholder="搜索订单、用户、地址或哈希" class="w-full lg:w-72" @keyup.enter="handleSearch" />
          <a-button html-type="button" class="" @click="handleSearch" type="primary">查询</a-button>
          <a-button html-type="button" class="" @click="resetFilters">重置</a-button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <a-table  :data-source="rows" :loading="loading" :pagination="false" size="small" :scroll="{ x: 'max-content' }" :row-key="(order) => order.id" :custom-row="(order, index) => ({ class: [&quot;hover:bg-slate-50&quot;] })">
<a-table-column key="column-0" ><template #title>订单</template><template #default="{ record: order, index: index }"><div class=" ">
                <div class="font-mono text-xs text-slate-500">{{ order.id }}</div>
                <div class="mt-1 text-xs text-slate-400">VIP{{ order.vipLevel }}</div>
              </div></template></a-table-column>
<a-table-column key="column-1" ><template #title>用户</template><template #default="{ record: order, index: index }"><div class=" ">
                <a-button html-type="button" class="font-medium text-blue-600 hover:text-blue-700 hover:underline" @click="openUserPanel(order)">
                  {{ order.username }}
                </a-button>
                <div class="text-xs text-slate-500">{{ order.userId }}</div>
              </div></template></a-table-column>
<a-table-column key="column-2" align="right"><template #title>出金金额</template><template #default="{ record: order, index: index }"><div class="  text-right">
                <div class="font-semibold text-slate-900">{{ formatMoney(order.amount) }} {{ order.coin }}</div>
                <div class="text-xs text-slate-500">手续费 {{ order.fee }} {{ order.coin }}</div>
              </div></template></a-table-column>
<a-table-column key="usdt-value" title="折合 USDT" align="right"><template #default="{ record: order }">
                <span class="whitespace-nowrap tabular-nums">{{ order.usdtValue == null ? '—' : formatMoney(order.usdtValue) }}</span>
              </template></a-table-column>
<a-table-column key="column-3" ><template #title>地址 / 网络</template><template #default="{ record: order, index: index }"><div class="max-w-[260px]  ">
                <div class="truncate font-mono text-xs text-slate-700">{{ order.address }}</div>
                <div class="mt-1 text-xs text-slate-500">{{ order.network }}</div>
              </div></template></a-table-column>
<a-table-column key="column-4" ><template #title>状态</template><template #default="{ record: order, index: index }"><div class=" ">
                <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="statusMeta(order.status).badgeClass">{{ statusMeta(order.status).label }}</span>
              </div></template></a-table-column>
<a-table-column key="column-5" ><template #title>申请时间</template><template #default="{ record: order, index: index }"><div class="  text-xs text-slate-500">{{ formatTime(order.applyTime) }}</div></template></a-table-column>
<a-table-column key="column-6" align="right"><template #title>操作</template><template #default="{ record: order, index: index }"><div class="  text-right">
                <a-button html-type="button" class="text-sm font-medium text-blue-600 hover:underline" @click="openDetail(order)">处理</a-button>
              </div></template></a-table-column><template #emptyText>暂无出金审核记录</template>
</a-table>
      </div>
      <AdminListPaginationBar
        v-model:current-page="pagination.currentPage"
        v-model:page-size="pagination.pageSize"
        :total-pages="totalPages"
        :total-count="pagination.total"
      />
    </article>

    <Teleport to="body">
      <a-drawer :open="Boolean(selectedOrder)" :mask-closable="false" :keyboard="false" :closable="false" placement="right" width="min(960px, 100vw)" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @close="closeDetail"><template #title><template v-if="Boolean(selectedOrder)"><header class="border-b border-slate-200 px-6 py-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-medium text-slate-500">出金审核详情</p>
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
                <p class="text-xs text-slate-500">出金金额</p>
                <p class="mt-1 font-semibold text-slate-900">{{ formatMoney(selectedOrder.amount) }} {{ selectedOrder.coin }}</p>
                <p class="text-xs text-slate-500">折合 {{ formatMoney(selectedOrder.usdtValue) }} USDT</p>
              </div>
            </div>

            <div class="rounded-xl border border-slate-200 p-4">
              <p class="text-sm font-semibold text-slate-900">链上信息</p>
              <div class="mt-3 space-y-2 text-sm">
                <div class="flex justify-between gap-4"><span class="text-slate-500">网络</span><span class="font-medium text-slate-900">{{ selectedOrder.network }}</span></div>
                <div class="flex justify-between gap-4"><span class="text-slate-500">地址</span><span class="break-all text-right font-mono text-slate-900">{{ selectedOrder.address }}</span></div>
                <div class="flex justify-between gap-4"><span class="text-slate-500">TxHash</span><span class="break-all text-right font-mono text-slate-900">{{ selectedOrder.txHash || '-' }}</span></div>
              </div>
            </div>

            <div class="rounded-xl border border-slate-200 p-4">
              <p class="text-sm font-semibold text-slate-900">审核信息</p>
              <div class="mt-3 space-y-2 text-sm text-slate-600">
                <div>状态：<span class="font-medium text-slate-900">{{ statusMeta(selectedOrder.status).label }}</span></div>
                <div>审核人：{{ selectedOrder.auditor || '-' }}</div>
                <div>审核时间：{{ formatTime(selectedOrder.auditTime) }}</div>
                <div>备注：{{ selectedOrder.auditNote || '-' }}</div>
              </div>
            </div>

            <div v-if="selectedOrder.status === WITHDRAW_AUDIT_STATUS.PENDING" class="rounded-xl border border-slate-200 p-4">
              <p class="text-sm font-semibold text-slate-900">审核操作</p>
              <div class="mt-3 flex gap-2">
                <a-button html-type="button" class="" @click="auditAction = 'approve'" type="primary">通过</a-button>
                <a-button html-type="button" class="danger" @click="auditAction = 'reject'">拒绝</a-button>
              </div>
              <div v-if="auditAction" class="mt-3">
                <a-textarea v-model:value="auditNote" rows="3" class="w-full" :placeholder="auditAction === 'reject' ? '请输入拒绝原因' : '请输入审核备注（可选）'"></a-textarea>
                <div class="mt-3 flex justify-end gap-2">
                  <a-button html-type="button" class="" @click="auditAction = ''">取消</a-button>
                  <a-button html-type="button" class="" @click="submitAction(auditAction)" type="primary">确认提交</a-button>
                </div>
              </div>
            </div>

          </div></template></a-drawer>
    </Teleport>

    <UserDetailDrawer
      :visible="showUserDrawer"
      :user="selectedUser"
      @close="closeUserPanel"
    />
  </section>
</template>
