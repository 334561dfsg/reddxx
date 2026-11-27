<script setup>
// 出金审核 — Ant Design Pro list page (2026-11-28): query card (one input per field instead of the old combined
// keyword box and status pills), business statistics card, table card with pagination, status as a text Tag and a
// link 处理/详情 action. The review drawer and its validation are unchanged; feedback uses Ant message.
import { computed, onMounted, ref } from 'vue'
import { Button, Card, Col, Row, Space, Statistic, Tag, TypographyText, message } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import UserDetailDrawer from '../../../admin/components/user/UserDetailDrawer.vue'
import { getUserById } from '../../../admin/mock/user'
import {
  FUND_ORDER_FILTER_ALL,
  WITHDRAW_AUDIT_STATUS,
  fundOrderApi,
  withdrawStatusOptions
} from '../../../admin/mock/fundOrders'

const loading = ref(false)
const orders = ref([])
const page = ref(1)
const selectedOrder = ref(null)
const selectedUser = ref(null)
const showUserDrawer = ref(false)
const auditAction = ref('')
const auditNote = ref('')

const coins = ['USDT', 'BTC', 'ETH', 'USDC', 'TRX']
const blank = () => ({ orderId: '', user: '', status: FUND_ORDER_FILTER_ALL, coin: FUND_ORDER_FILTER_ALL, address: '', txHash: '', applyDate: null })
const filters = ref(blank())
const fields = [
  { key: 'orderId', label: '订单号' },
  { key: 'user', label: '用户' },
  { key: 'status', label: '状态', options: [{ value: FUND_ORDER_FILTER_ALL, label: '全部状态' }, ...withdrawStatusOptions.map(({ value, label }) => ({ value, label }))] },
  { key: 'coin', label: '币种', searchable: true, options: [{ value: FUND_ORDER_FILTER_ALL, label: '全部币种' }, ...coins.map((coin) => ({ value: coin, label: coin }))] },
  { key: 'address', label: '出金地址' },
  { key: 'txHash', label: 'TxHash' },
  { key: 'applyDate', label: '申请日期', range: true }
]

const has = (value, query) => !String(query || '').trim() || String(value || '').toLowerCase().includes(String(query).trim().toLowerCase())
const localDate = (value) => {
  const date = new Date(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
const rows = computed(() => orders.value.filter((order) => {
  const f = filters.value
  return has(order.id, f.orderId) &&
    (has(order.userId, f.user) || has(order.username, f.user)) &&
    has(order.address, f.address) && has(order.txHash, f.txHash) &&
    (!f.applyDate || (localDate(order.applyTime) >= f.applyDate[0] && localDate(order.applyTime) <= f.applyDate[1]))
}))

const stats = computed(() => {
  const count = (status) => rows.value.filter((order) => order.status === status).length
  return [
    { label: '待审核', value: count(WITHDRAW_AUDIT_STATUS.PENDING) },
    { label: '已通过', value: count(WITHDRAW_AUDIT_STATUS.APPROVED) },
    { label: '已拒绝', value: count(WITHDRAW_AUDIT_STATUS.REJECTED) },
    { label: '筛选金额（USDT）', value: formatMoney(rows.value.reduce((total, order) => total + Number(order.usdtValue || 0), 0)) }
  ]
})

const columns = [
  { key: 'order', title: '订单', width: 180 },
  { key: 'user', title: '用户', width: 170 },
  { key: 'amount', title: '出金金额', width: 170, align: 'right' },
  { key: 'usdt', title: '折合（USDT）', width: 150, align: 'right' },
  { key: 'address', title: '地址 / 网络', width: 260 },
  { key: 'status', title: '状态', width: 90 },
  { key: 'applyTime', title: '申请时间', width: 170 },
  { key: 'actions', title: '操作', width: 80, fixed: 'right' }
]
const statusColor = { [WITHDRAW_AUDIT_STATUS.PENDING]: 'orange', [WITHDRAW_AUDIT_STATUS.APPROVED]: 'blue', [WITHDRAW_AUDIT_STATUS.REJECTED]: 'red' }

function statusMeta(status) {
  return withdrawStatusOptions.find((item) => item.value === status) || { label: status }
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
  if (kind === 'error') message.error(text)
  else if (kind === 'success') message.success(text)
  else message.info(text)
}

// Status and coin go to the mock API; the remaining single-attribute fields are matched on the returned rows.
async function loadList() {
  loading.value = true
  try {
    const res = await fundOrderApi.listWithdrawOrders({
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
    } else showToast(res.message || '出金审核记录加载失败', 'error')
  } finally {
    loading.value = false
  }
}

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1; loadList() }
function reset() { filters.value = blank(); page.value = 1; loadList() }

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
    const latest = orders.value.find((item) => item.id === selectedOrder.value.id)
    if (latest) selectedOrder.value = latest
  }
}

onMounted(loadList)
</script>

<template>
  <PageShell>
    <SearchForm name="withdraw-audit-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />

    <Card :bordered="false">
      <Row :gutter="24">
        <Col v-for="stat in stats" :key="stat.label" :span="6"><Statistic :title="stat.label" :value="stat.value" /></Col>
      </Row>
    </Card>

    <AdminTable title="出金审核" v-model:page="page" :rows="rows" :columns="columns" :loading="loading" row-key="id" desktop-only>
      <template #cell="{ column, record: order }">
        <Space v-if="column.key === 'order'" direction="vertical" :size="0">
          <span class="font-mono">{{ order.id }}</span>
          <TypographyText type="secondary">VIP{{ order.vipLevel }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'user'" direction="vertical" :size="0">
          <Button type="link" class="px-0" @click="openUserPanel(order)">{{ order.username }}</Button>
          <TypographyText type="secondary" class="font-mono">{{ order.userId }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'amount'" direction="vertical" :size="0" align="end">
          <span>{{ formatMoney(order.amount) }} {{ order.coin }}</span>
          <TypographyText type="secondary">手续费 {{ order.fee }} {{ order.coin }}</TypographyText>
        </Space>
        <span v-else-if="column.key === 'usdt'">{{ order.usdtValue == null ? '—' : formatMoney(order.usdtValue) }}</span>
        <Space v-else-if="column.key === 'address'" direction="vertical" :size="0">
          <TypographyText class="font-mono" :ellipsis="{ tooltip: order.address }" :content="order.address" />
          <TypographyText type="secondary">{{ order.network }}</TypographyText>
        </Space>
        <Tag v-else-if="column.key === 'status'" :color="statusColor[order.status]">{{ statusMeta(order.status).label }}</Tag>
        <TypographyText v-else-if="column.key === 'applyTime'" type="secondary">{{ formatTime(order.applyTime) }}</TypographyText>
        <Button v-else-if="column.key === 'actions'" type="link" class="px-0" @click="openDetail(order)">{{ order.status === WITHDRAW_AUDIT_STATUS.PENDING ? '处理' : '详情' }}</Button>
        <template v-else>{{ order[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

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
                <a-textarea v-model:value="auditNote" :rows="3" class="w-full" :placeholder="auditAction === 'reject' ? '请输入拒绝原因' : '请输入审核备注（可选）'"></a-textarea>
                <div class="mt-3 flex justify-end gap-2">
                  <a-button html-type="button" class="" @click="auditAction = ''">取消</a-button>
                  <a-button html-type="button" class="" @click="submitAction(auditAction)" type="primary">确认提交</a-button>
                </div>
              </div>
            </div>

          </div></template></a-drawer>
    

    <UserDetailDrawer
      :visible="showUserDrawer"
      :user="selectedUser"
      @close="closeUserPanel"
    />
  </PageShell>
</template>
