<script setup>
import { ref, computed, onMounted, onUnmounted, reactive, watch } from 'vue'
import { referralApi } from '../../../admin/mock/referral'
import {
  COMMISSION_STATUS,
  COMMISSION_STATUS_OPTIONS,
  REFERRAL_TYPE_OPTIONS
} from '../../../admin/constants/referral'

const searchKeyword = ref('')
const statusFilter = ref('all')
const loading = ref(false)

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const recordList = ref([])
const aggregates = ref(null)
const settlementGlobal = ref(null)
const detailDrawer = ref({
  visible: false,
  loading: false,
  batch: null,
  list: []
})

const toast = ref({ visible: false, message: '', kind: 'info' })
const confirmDialog = ref({
  visible: false,
  message: '',
  loading: false,
  onConfirm: null
})

let toastTimer = null

const totalPages = computed(() => Math.max(1, Math.ceil(pagination.total / pagination.pageSize)))
const statusOptions = computed(() => [
  { value: 'all', label: '全部状态', color: 'gray' },
  ...COMMISSION_STATUS_OPTIONS
])

const formatMoney = (n) => Number(n || 0).toLocaleString('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const formatDate = (dateString) => {
  if (!dateString) return '—'
  const d = new Date(dateString.includes('T') ? dateString : `${dateString.replace(' ', 'T')}`)
  if (Number.isNaN(d.getTime())) return dateString
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusConfig = (status) => {
  const config = COMMISSION_STATUS_OPTIONS.find((s) => s.value === status)
  return {
    text: config?.label || status,
    color: config?.color || 'gray'
  }
}

const statusBadgeClass = (status) => {
  const color = getStatusConfig(status).color
  const map = {
    yellow: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
    green: 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200',
    blue: 'bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200',
    red: 'bg-red-50 text-red-800 ring-1 ring-inset ring-red-200',
    gray: 'bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200'
  }
  return map[color] || map.gray
}

const getTypeLabel = (type) => {
  return REFERRAL_TYPE_OPTIONS.find((t) => t.value === type)?.label || type
}

const settlementModeLabel = (row) => (row.autoCredit ? '自动入账' : '手动发放')

const stats = computed(() => {
  const a = aggregates.value
  if (!a) {
    return [
      { label: '待发放', value: '—' },
      { label: '已入账', value: '—' },
      { label: '已入账佣金', value: '—' }
    ]
  }
  return [
    { label: '待发放', value: a.pendingCount },
    { label: '已入账', value: a.completedCount },
    { label: '已入账佣金', value: `${formatMoney(a.completedAmount)} USDT` }
  ]
})

async function loadList() {
  loading.value = true
  try {
    const res = await referralApi.getSettlementBatches({
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      searchKeyword: searchKeyword.value,
      status: statusFilter.value
    })
    if (res.success) {
      recordList.value = res.data.list
      pagination.total = res.data.total
      aggregates.value = res.data.aggregates
      settlementGlobal.value = res.data.settlementGlobal
    }
  } catch (error) {
    showToast(error?.message || '结算单加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.currentPage = 1
  loadList()
}

const handleReset = () => {
  searchKeyword.value = ''
  statusFilter.value = 'all'
  pagination.currentPage = 1
  loadList()
}

watch(
  () => pagination.currentPage,
  () => {
    loadList()
  }
)

onMounted(() => {
  loadList()
})

function showToast(message, kind = 'info') {
  if (toastTimer) {
    clearTimeout(toastTimer)
    toastTimer = null
  }
  toast.value = { visible: true, message: String(message || ''), kind }
  toastTimer = setTimeout(() => {
    toast.value.visible = false
    toastTimer = null
  }, 3600)
}

const toastBorderClass = computed(() => {
  if (toast.value.kind === 'success') return 'border-emerald-200'
  if (toast.value.kind === 'error') return 'border-red-200'
  return 'border-blue-200'
})

const toastIconBgClass = computed(() => {
  if (toast.value.kind === 'success') return 'bg-emerald-500'
  if (toast.value.kind === 'error') return 'bg-red-500'
  return 'bg-blue-500'
})

function openConfirm(message, onConfirm) {
  confirmDialog.value = {
    visible: true,
    message,
    loading: false,
    onConfirm
  }
}

function closeConfirm() {
  if (confirmDialog.value.loading) return
  confirmDialog.value.visible = false
  confirmDialog.value.message = ''
  confirmDialog.value.onConfirm = null
}

async function submitConfirm() {
  const fn = confirmDialog.value.onConfirm
  if (!fn) {
    closeConfirm()
    return
  }
  confirmDialog.value.loading = true
  try {
    await fn()
  } catch (error) {
    showToast(error?.message || '操作失败', 'error')
  } finally {
    confirmDialog.value.loading = false
    closeConfirm()
  }
}

const openDetails = async (row) => {
  detailDrawer.value = {
    visible: true,
    loading: true,
    batch: row,
    list: []
  }
  try {
    const res = await referralApi.getSettlementBatchDetails(row.id)
    if (res.success) {
      detailDrawer.value.batch = res.data.batch
      detailDrawer.value.list = res.data.list
    } else {
      showToast(res.message || '明细加载失败', 'error')
    }
  } catch (error) {
    showToast(error?.message || '明细加载失败', 'error')
  } finally {
    detailDrawer.value.loading = false
  }
}

const closeDetails = () => {
  detailDrawer.value.visible = false
}

const settleBatch = (row) => {
  openConfirm(`确认发放结算单 ${row.batchNo}？`, async () => {
    const res = await referralApi.settleBatch(row.id)
    showToast(res.message || (res.success ? '发放成功' : '发放失败'), res.success ? 'success' : 'error')
    if (res.success) {
      await loadList()
      if (detailDrawer.value.visible && detailDrawer.value.batch?.id === row.id) {
        await openDetails(res.data)
      }
    }
  })
}

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">裂变佣金结算</h1>
        <p class="mt-1 text-sm text-slate-500">
          被邀请用户充值或交易产生返佣明细；系统按结算配置定期汇总成结算单，再由运营发放或自动入账。
        </p>
      </div>
      <router-link
        to="/admin/agent/referral-config"
        class="ant-btn inline-flex shrink-0 items-center justify-center no-underline"
      >
        裂变分销设置
      </router-link>
    </div>

    <div v-if="settlementGlobal" class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      当前入账：<span class="font-medium text-slate-900">{{ settlementGlobal.creditLabel }}</span>
      <span class="mx-2 text-slate-300">·</span>
      <span class="text-slate-500">结算安排：</span>
      <span class="font-medium text-slate-900">{{ settlementGlobal.settlementScheduleLabel }}</span>
      <p class="mt-1 text-xs text-slate-500">{{ settlementGlobal.settlementNotifyLine }}</p>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <p class="text-xs font-medium text-slate-500">{{ stat.label }}</p>
        <p class="mt-1 text-xl font-bold tabular-nums text-slate-900">{{ stat.value }}</p>
      </div>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/30 p-4 md:px-6 lg:flex-row lg:items-end lg:justify-between">
        <div class="flex flex-wrap items-center gap-3">
          <h3 class="shrink-0 text-base font-semibold text-slate-900">结算单列表</h3>
          <a-select v-model:value="statusFilter" class="!w-32" @change="handleSearch">
            <a-select-option v-for="status in statusOptions" :key="status.value" :value="status.value">
              {{ status.label }}
            </a-select-option>
          </a-select>
          <div class="relative min-w-[220px] max-w-md flex-1">
            <a-input v-model:value="searchKeyword" type="text" placeholder="结算单号、代理 UID、代理账号、账期" class="pl-9" @keyup.enter="handleSearch" />
            <svg viewBox="0 0 20 20" class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none">
              <circle cx="9" cy="9" r="5.8" stroke="currentColor" stroke-width="1.6" />
              <path d="M13.6 13.6L16.4 16.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <a-button html-type="button" class="" @click="handleSearch" type="primary">查询</a-button>
          <a-button html-type="button" class="" @click="handleReset">重置</a-button>
        </div>
      </div>

      <div class="relative overflow-x-auto">
        <div v-if="loading" class="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
          <div class="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600"></div>
        </div>

        <a-table  :data-source="recordList" :pagination="false" size="small" :scroll="{ x: 'max-content' }" :row-key="(row) => row.id" :custom-row="(row, index) => ({ class: [&quot;hover:bg-slate-50&quot;] })">
<a-table-column key="column-0" ><template #title>结算单号</template><template #default="{ record: row, index: index }"><div class="whitespace-nowrap   font-mono text-xs font-medium text-slate-900">{{ row.batchNo }}</div></template></a-table-column>
<a-table-column key="column-1" ><template #title>账期</template><template #default="{ record: row, index: index }"><div class="whitespace-nowrap   font-mono text-sm text-slate-700">{{ row.period }}</div></template></a-table-column>
<a-table-column key="column-2" ><template #title>代理</template><template #default="{ record: row, index: index }"><div class="whitespace-nowrap  ">
                <div class="text-sm font-medium text-slate-900">{{ row.agentUsername }}</div>
                <div class="text-xs text-slate-500">UID: {{ row.agentUid }}</div>
              </div></template></a-table-column>
<a-table-column key="column-3" ><template #title>汇总来源</template><template #default="{ record: row, index: index }"><div class="whitespace-nowrap  ">
                <div class="text-sm text-slate-900">{{ row.detailCount }} 条返佣明细</div>
                <div class="text-xs text-slate-500">{{ row.invitedUserCount }} 个被邀请用户</div>
              </div></template></a-table-column>
<a-table-column key="column-4" align="right"><template #title>结算佣金</template><template #default="{ record: row, index: index }"><div class="whitespace-nowrap   text-right font-semibold tabular-nums text-slate-900">
                {{ formatMoney(row.amount) }} USDT
              </div></template></a-table-column>
<a-table-column key="column-5" ><template #title>入账方式</template><template #default="{ record: row, index: index }"><div class="whitespace-nowrap  ">
                <span
                  class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="row.autoCredit ? 'bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200' : 'bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200'"
                >
                  {{ settlementModeLabel(row) }}
                </span>
              </div></template></a-table-column>
<a-table-column key="column-6" ><template #title>状态</template><template #default="{ record: row, index: index }"><div class="whitespace-nowrap  ">
                <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="statusBadgeClass(row.status)">
                  {{ getStatusConfig(row.status).text }}
                </span>
              </div></template></a-table-column>
<a-table-column key="column-7" ><template #title>入账流水</template><template #default="{ record: row, index: index }"><div class="max-w-[12rem] truncate   font-mono text-xs text-slate-600">{{ row.creditTxnId || '—' }}</div></template></a-table-column>
<a-table-column key="column-8" align="right"><template #title>操作</template><template #default="{ record: row, index: index }"><div class="whitespace-nowrap   text-right text-sm font-medium">
                <a-button html-type="button" class="text-blue-600 hover:text-blue-900" @click="openDetails(row)">
                  明细
                </a-button>
                <a-button v-if="row.status === COMMISSION_STATUS.PENDING" html-type="button" class="ml-3 text-green-600 hover:text-green-900" @click="settleBatch(row)">
                  发放
                </a-button>
              </div></template></a-table-column><template #emptyText>暂无结算单</template>
</a-table>
      </div>

      <div v-if="pagination.total > 0" class="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 text-sm text-slate-700">
        <span>共 <span class="font-medium">{{ pagination.total }}</span> 条结算单</span>
        <a-pagination  size="small" :current="pagination.currentPage" :page-size="pagination.pageSize" :total="pagination.total" :show-size-changer="false"  :disabled="loading" @change="pagination.currentPage = $event" />
      </div>
    </div>

    <Teleport to="body">
      <a-drawer :open="Boolean(detailDrawer.visible)" :mask-closable="false" :keyboard="false" :closable="false" placement="right" width="min(960px, 100vw)" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @close="closeDetails"><template #title><template v-if="Boolean(detailDrawer.visible)"><div class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <p class="text-base font-semibold text-slate-900">返佣明细</p>
              <p class="mt-1 text-xs text-slate-500">
                {{ detailDrawer.batch?.batchNo }} · {{ detailDrawer.batch?.period }} · UID {{ detailDrawer.batch?.agentUid }}
              </p>
            </div>
            <a-button aria-label="关闭" html-type="button" class="border border-slate-300 text-sm text-slate-600 hover:bg-slate-50" @click="closeDetails">
              关闭
            </a-button>
          </div></template></template><template v-if="detailDrawer.visible"><div v-if="detailDrawer.batch" class="grid gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 sm:grid-cols-3">
            <div>
              <p class="text-xs text-slate-500">结算佣金</p>
              <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatMoney(detailDrawer.batch.amount) }} USDT</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">返佣明细</p>
              <p class="mt-1 text-lg font-semibold text-slate-900">{{ detailDrawer.batch.detailCount }} 条</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">入账账户</p>
              <p class="mt-1 text-lg font-semibold text-slate-900">{{ detailDrawer.batch.creditLabel }}</p>
            </div>
          </div>
<div class="min-h-0 flex-1 overflow-auto">
            <div v-if="detailDrawer.loading" class="px-5 py-10 text-center text-sm text-slate-500">加载明细中…</div>
            <a-table v-else :data-source="detailDrawer.list" :pagination="false" size="small" :scroll="{ x: 'max-content' }" :row-key="(item) => item.id" :custom-row="(item, index) => ({ class: [&quot;hover:bg-slate-50/80&quot;] })">
<a-table-column key="column-0" ><template #title>明细记录</template><template #default="{ record: item, index: index }"><div class="  font-mono text-xs text-slate-700">{{ item.id }}</div></template></a-table-column>
<a-table-column key="column-1" ><template #title>产生时间</template><template #default="{ record: item, index: index }"><div class="  text-xs text-slate-600">{{ formatDate(item.createdAt) }}</div></template></a-table-column>
<a-table-column key="column-2" ><template #title>被邀请用户</template><template #default="{ record: item, index: index }"><div class=" ">
                    <div class="font-medium text-slate-900">{{ item.referralUsername }}</div>
                    <div class="text-xs text-slate-500">UID: {{ item.referralUid }}</div>
                  </div></template></a-table-column>
<a-table-column key="column-3" ><template #title>业务类型</template><template #default="{ record: item, index: index }"><div class="  text-slate-700">{{ getTypeLabel(item.type) }}</div></template></a-table-column>
<a-table-column key="column-4" align="right"><template #title>计佣基数</template><template #default="{ record: item, index: index }"><div class="  text-right tabular-nums">{{ formatMoney(item.amount) }}</div></template></a-table-column>
<a-table-column key="column-5" align="right"><template #title>层级 / 比例</template><template #default="{ record: item, index: index }"><div class="  text-right tabular-nums">{{ item.level }} 级 / {{ (item.commissionRate * 100).toFixed(2) }}%</div></template></a-table-column>
<a-table-column key="column-6" align="right"><template #title>佣金</template><template #default="{ record: item, index: index }"><div class="  text-right tabular-nums font-medium text-slate-900">{{ formatMoney(item.commission) }}</div></template></a-table-column><template #emptyText>暂无明细</template>
</a-table>
          </div></template></a-drawer>

      <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(confirmDialog.visible)" :mask-closable="false" :keyboard="false" :closable="false"  width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeConfirm"><template #title><template v-if="Boolean(confirmDialog.visible)"><div class="flex items-center justify-between gap-3"><span>请确认</span><a-button aria-label="关闭" html-type="button"  :disabled="confirmDialog.loading" @click="closeConfirm">×</a-button></div></template></template><template v-if="confirmDialog.visible"><p class="text-base font-semibold text-slate-900">请确认</p>
<p class="mt-2 text-sm leading-relaxed text-slate-600">{{ confirmDialog.message }}</p></template><template #footer><template v-if="Boolean(confirmDialog.visible)"><div class="mt-6 flex justify-end gap-2">
            <a-button html-type="button" class="" :disabled="confirmDialog.loading" @click="closeConfirm">
              取消
            </a-button>
            <a-button html-type="button" class="" :disabled="confirmDialog.loading" @click="submitConfirm" type="primary">
              {{ confirmDialog.loading ? '处理中…' : '确定' }}
            </a-button>
          </div></template></template></a-modal>

      <div
        v-if="toast.visible"
        class="fixed right-4 top-4 z-[110] flex max-w-sm items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow-lg"
        :class="toastBorderClass"
      >
        <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" :class="toastIconBgClass">
          <svg v-if="toast.kind === 'success'" class="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <svg v-else-if="toast.kind === 'error'" class="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <svg v-else class="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span class="text-sm font-medium text-slate-900">{{ toast.message }}</span>
      </div>
    </Teleport>
  </div>
</template>
