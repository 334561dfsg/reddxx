<script setup>
import { ref, computed, onMounted, onUnmounted, reactive, watch } from 'vue'
import { agentSettlementApi } from '../../../admin/mock/agentSettlement'
import {
  AGENT_SETTLEMENT_ACTION,
  AGENT_SETTLEMENT_STATUS,
  AGENT_SETTLEMENT_STATUS_OPTIONS,
  agentSettlementStatusLabel
} from '../../../admin/constants/agentSettlement'

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
const detailDrawer = ref({
  visible: false,
  loading: false,
  batch: null,
  list: []
})

const totalPages = computed(() => Math.max(1, Math.ceil(pagination.total / pagination.pageSize)))

const statusOptions = AGENT_SETTLEMENT_STATUS_OPTIONS

const badgeClass = (status) => {
  const o = statusOptions.find((x) => x.value === status)
  return o?.badgeClass || 'bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200'
}

const loadList = async () => {
  loading.value = true
  try {
    const res = await agentSettlementApi.listBatches({
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      status: statusFilter.value,
      searchKeyword: searchKeyword.value
    })
    if (res.success) {
      recordList.value = res.data.list
      pagination.total = res.data.total
      aggregates.value = res.data.aggregates
    }
  } catch (e) {
    console.error(e)
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

const stats = computed(() => {
  const a = aggregates.value
  if (!a) {
    return [
      { label: '待审核', value: '—' },
      { label: '自动入账', value: '—' },
      { label: '已入账', value: '—' }
    ]
  }
  return [
    { label: '待审核', value: a.pendingReview },
    { label: '自动入账', value: a.autoCompleted },
    { label: '已入账', value: a.completed }
  ]
})

const settlementModeLabel = (row) => (row.autoCredit ? '自动入账' : '人工审核')

const formatMoney = (n) => Number(n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const openDetails = async (row) => {
  detailDrawer.value = {
    visible: true,
    loading: true,
    batch: row,
    list: []
  }
  try {
    const res = await agentSettlementApi.listBatchDetails(row.id)
    if (res.success) {
      detailDrawer.value.batch = res.data.batch
      detailDrawer.value.list = res.data.list
    } else {
      showToast(res.message || '明细加载失败', 'error')
    }
  } catch (e) {
    showToast(e?.message || '明细加载失败', 'error')
  } finally {
    detailDrawer.value.loading = false
  }
}

const closeDetails = () => {
  detailDrawer.value.visible = false
}

/** 非原生提示（右上角 Toast） */
const toast = ref({ visible: false, message: '', kind: 'info' })
let toastHideTimer = null

function showToast(message, kind = 'info') {
  if (toastHideTimer) {
    clearTimeout(toastHideTimer)
    toastHideTimer = null
  }
  toast.value = { visible: true, message: String(message ?? ''), kind }
  toastHideTimer = setTimeout(() => {
    toast.value.visible = false
    toastHideTimer = null
  }, 3800)
}

const toastBorderClass = computed(() => {
  const k = toast.value.kind
  if (k === 'success') return 'border-emerald-200'
  if (k === 'error') return 'border-red-200'
  return 'border-blue-200'
})

const toastIconBgClass = computed(() => {
  const k = toast.value.kind
  if (k === 'success') return 'bg-emerald-500'
  if (k === 'error') return 'bg-red-500'
  return 'bg-blue-500'
})

/** 非原生确认框 */
const confirmDialog = ref({
  visible: false,
  message: '',
  loading: false,
  /** @type {null | (() => void | Promise<void>)} */
  onConfirm: null
})

function closeConfirm() {
  if (confirmDialog.value.loading) return
  confirmDialog.value.visible = false
  confirmDialog.value.message = ''
  confirmDialog.value.onConfirm = null
}

function openConfirm(message, onConfirm) {
  confirmDialog.value = {
    visible: true,
    message,
    loading: false,
    onConfirm
  }
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
  } catch (e) {
    showToast(e?.message || '操作失败', 'error')
  } finally {
    confirmDialog.value.loading = false
    closeConfirm()
  }
}

onUnmounted(() => {
  if (toastHideTimer) clearTimeout(toastHideTimer)
})

const doAdvance = (batchId, action, label) => {
  openConfirm(`确认${label}？`, async () => {
    const res = await agentSettlementApi.advanceBatch(batchId, action)
    showToast(res.message || (res.success ? '已更新' : '失败'), res.success ? 'success' : 'error')
    if (res.success) await loadList()
  })
}
</script>

<template>
  <div class="space-y-6 p-6">
    <div>
      <h1 class="text-xl font-semibold text-slate-900">代理佣金结算</h1>
      <p class="mt-1 text-sm text-slate-600">
        返佣明细按结算配置汇总成单；人工审核通过后直接划转，开启自动入账的汇总单无需审核。
      </p>
    </div>

    <div class="grid gap-3 sm:grid-cols-3">
      <div
        v-for="(s, idx) in stats"
        :key="idx"
        class="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
      >
        <p class="text-xs font-medium text-slate-500">{{ s.label }}</p>
        <p class="mt-1 text-2xl font-semibold text-slate-900">{{ s.value }}</p>
      </div>
    </div>

    <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div class="flex flex-wrap gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-600">关键词</label>
            <a-input v-model:value="searchKeyword" type="search" placeholder="汇总单号 / UID / 邮箱 / 账期" class="mt-1 w-56" @keyup.enter="handleSearch" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600">状态</label>
            <a-select v-model:value="statusFilter" class="mt-1 w-44">
              <a-select-option v-for="o in statusOptions" :key="o.value" :value="o.value">{{ o.label }}</a-select-option>
            </a-select>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <a-button html-type="button" class="bg-slate-900 text-sm font-medium text-white hover:bg-slate-800" @click="handleSearch">
            查询
          </a-button>
          <a-button html-type="button" class="border border-slate-300 text-sm text-slate-700 hover:bg-slate-50" @click="handleReset">
            重置
          </a-button>
        </div>
      </div>
    </div>

    <div class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <a-table  :data-source="recordList" :loading="loading" :pagination="false" size="small" :scroll="{ x: 'max-content' }" :row-key="(row) => row.id" :custom-row="(row, index) => ({ class: [&quot;hover:bg-slate-50/80&quot;] })">
<a-table-column key="column-0" ><template #title>汇总单号</template><template #default="{ record: row, index: index }"><div class="  font-mono text-xs text-slate-800">{{ row.batchNo }}</div></template></a-table-column>
<a-table-column key="column-1" ><template #title>账期</template><template #default="{ record: row, index: index }"><div class="  font-mono">{{ row.period }}</div></template></a-table-column>
<a-table-column key="column-2" ><template #title>代理</template><template #default="{ record: row, index: index }"><div class=" ">
                <div class="font-medium text-slate-900">{{ row.agentName }}</div>
                <div class="text-xs text-slate-500">UID {{ row.agentUid }} · {{ row.agentEmail }}</div>
              </div></template></a-table-column>
<a-table-column key="column-3" ><template #title>汇总来源</template><template #default="{ record: row, index: index }"><div class=" ">
                <div class="text-sm text-slate-800">{{ row.sourceDetailCount }} 条明细</div>
                <div class="text-xs text-slate-500">{{ row.invitedUserCount }} 个邀请用户</div>
              </div></template></a-table-column>
<a-table-column key="column-4" align="right"><template #title>佣金 (USDT)</template><template #default="{ record: row, index: index }"><div class="  text-right tabular-nums font-medium text-slate-900">
                {{ formatMoney(row.amount) }}
              </div></template></a-table-column>
<a-table-column key="column-5" ><template #title>入账方式</template><template #default="{ record: row, index: index }"><div class=" ">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="row.autoCredit ? 'bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200' : 'bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200'"
                >
                  {{ settlementModeLabel(row) }}
                </span>
              </div></template></a-table-column>
<a-table-column key="column-6" ><template #title>状态</template><template #default="{ record: row, index: index }"><div class=" ">
                <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" :class="badgeClass(row.status)">
                  {{ agentSettlementStatusLabel(row.status) }}
                </span>
              </div></template></a-table-column>
<a-table-column key="column-7" ><template #title>划转流水</template><template #default="{ record: row, index: index }"><div class="  font-mono text-xs text-slate-600">{{ row.creditTxnId || '—' }}</div></template></a-table-column>
<a-table-column key="column-8" ><template #title>操作</template><template #default="{ record: row, index: index }"><div class=" ">
                <div class="flex flex-wrap gap-1">
                  <a-button html-type="button" class="border border-slate-200 bg-white text-xs text-slate-700 hover:bg-slate-50" @click="openDetails(row)">
                    明细
                  </a-button>
                  <a-button v-if="row.status === AGENT_SETTLEMENT_STATUS.PENDING_REVIEW" html-type="button" class="border border-emerald-200 bg-emerald-50 text-xs text-emerald-900 hover:bg-emerald-100" @click="doAdvance(row.id, AGENT_SETTLEMENT_ACTION.APPROVE, '审核通过并划转入账')">
                    审核通过
                  </a-button>
                </div>
              </div></template></a-table-column><template #emptyText>暂无数据</template>
</a-table>
      </div>
      <div class="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
        <span>共 {{ pagination.total }} 条</span>
        <a-pagination  size="small" :current="pagination.currentPage" :page-size="pagination.pageSize" :total="pagination.total" :show-size-changer="false"  :disabled="loading" @change="pagination.currentPage = $event" />
      </div>
    </div>
  </div>

  <Teleport to="body">
    <!-- 汇总明细 -->
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
        </div></template></template><template v-if="detailDrawer.visible"><div v-if="detailDrawer.batch" class="grid gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 sm:grid-cols-2">
          <div>
            <p class="text-xs text-slate-500">汇总佣金</p>
            <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatMoney(detailDrawer.batch.amount) }} USDT</p>
          </div>
          <div>
            <p class="text-xs text-slate-500">明细记录</p>
            <p class="mt-1 text-lg font-semibold text-slate-900">{{ detailDrawer.batch.sourceDetailCount }} 条</p>
          </div>
        </div>
<div class="min-h-0 flex-1 overflow-auto">
          <div v-if="detailDrawer.loading" class="px-5 py-10 text-center text-sm text-slate-500">加载明细中…</div>
          <a-table v-else :data-source="detailDrawer.list" :pagination="false" size="small" :scroll="{ x: 'max-content' }" :row-key="(item) => item.id" :custom-row="(item, index) => ({ class: [&quot;hover:bg-slate-50/80&quot;] })">
<a-table-column key="column-0" ><template #title>产生时间</template><template #default="{ record: item, index: index }"><div class="  font-mono text-xs text-slate-600">{{ item.occurredAt }}</div></template></a-table-column>
<a-table-column key="column-1" ><template #title>被邀请用户</template><template #default="{ record: item, index: index }"><div class=" ">
                  <div class="font-medium text-slate-900">UID {{ item.invitedUid }}</div>
                  <div class="text-xs text-slate-500">{{ item.invitedEmail }}</div>
                </div></template></a-table-column>
<a-table-column key="column-2" ><template #title>业务类型</template><template #default="{ record: item, index: index }"><div class="  text-slate-700">{{ item.typeLabel }}</div></template></a-table-column>
<a-table-column key="column-3" ><template #title>来源单号</template><template #default="{ record: item, index: index }"><div class="  font-mono text-xs text-slate-600">{{ item.sourceOrderNo }}</div></template></a-table-column>
<a-table-column key="column-4" align="right"><template #title>计佣基数</template><template #default="{ record: item, index: index }"><div class="  text-right tabular-nums">{{ formatMoney(item.baseAmount) }}</div></template></a-table-column>
<a-table-column key="column-5" align="right"><template #title>比例</template><template #default="{ record: item, index: index }"><div class="  text-right tabular-nums">{{ (item.commissionRate * 100).toFixed(2) }}%</div></template></a-table-column>
<a-table-column key="column-6" align="right"><template #title>佣金</template><template #default="{ record: item, index: index }"><div class="  text-right tabular-nums font-medium text-slate-900">{{ formatMoney(item.commission) }}</div></template></a-table-column>
</a-table>
        </div></template></a-drawer>

    <!-- 确认操作 -->
    <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(confirmDialog.visible)" :mask-closable="false" :keyboard="false" :closable="false"  width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeConfirm"><template #title><template v-if="Boolean(confirmDialog.visible)"><div class="flex items-center justify-between gap-3"><span>请确认</span><a-button aria-label="关闭" html-type="button"  :disabled="confirmDialog.loading" @click="closeConfirm">×</a-button></div></template></template><template v-if="confirmDialog.visible"><p class="text-base font-semibold text-slate-900">请确认</p>
<p class="mt-2 text-sm leading-relaxed text-slate-600">{{ confirmDialog.message }}</p></template><template #footer><template v-if="Boolean(confirmDialog.visible)"><div class="mt-6 flex justify-end gap-2">
          <a-button html-type="button" class="" :disabled="confirmDialog.loading" @click="closeConfirm">
            取消
          </a-button>
          <a-button html-type="button" class="" :disabled="confirmDialog.loading" @click="submitConfirm" type="primary">
            {{ confirmDialog.loading ? '处理中…' : '确定' }}
          </a-button>
        </div></template></template></a-modal>

    <!-- 结果提示 -->
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
</template>
