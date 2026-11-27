<script setup>
// 裂变佣金结算 — Ant Design Pro list page (2026-11-28): query card with one field per filter (the combined
// 结算单号/UID/账号/账期 keyword box is split), the settlement arrangement and counts as a Statistic card, table card
// with the 裂变分销设置 shortcut in its toolbar, link actions and text status Tags. Payout keeps its confirmation
// dialog (shared confirmation modal); the detail Drawer clears its content after the close animation.
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Card, Col, Descriptions, DescriptionsItem, Row, Space, Statistic, Table, Tag, TypographyText, message } from 'ant-design-vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import { referralApi } from '../../../admin/mock/referral'
import {
  COMMISSION_STATUS,
  COMMISSION_STATUS_OPTIONS,
  REFERRAL_TYPE_OPTIONS
} from '../../../admin/constants/referral'

const router = useRouter()
const loading = ref(false)
const page = ref(1)
const recordList = ref([])
const aggregates = ref(null)
const settlementGlobal = ref(null)

const blank = () => ({ batchNo: '', agentUid: '', agentUsername: '', period: 'all', status: 'all', mode: 'all' })
const filters = ref(blank())
const periodOptions = computed(() => [...new Set(recordList.value.map((row) => row.period))].sort().reverse().map((value) => ({ value, label: value })))
const fields = computed(() => [
  { key: 'batchNo', label: '结算单号' },
  { key: 'agentUid', label: '代理 UID' },
  { key: 'agentUsername', label: '代理账号' },
  { key: 'period', label: '账期', searchable: true, options: [{ value: 'all', label: '全部账期' }, ...periodOptions.value] },
  { key: 'status', label: '状态', options: [{ value: 'all', label: '全部状态' }, ...COMMISSION_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))] },
  { key: 'mode', label: '入账方式', options: [{ value: 'all', label: '全部方式' }, { value: 'auto', label: '自动入账' }, { value: 'manual', label: '手动发放' }] }
])
const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
const rows = computed(() => recordList.value.filter((row) => {
  const f = filters.value
  return has(row.batchNo, f.batchNo) && has(row.agentUid, f.agentUid) && has(row.agentUsername, f.agentUsername) &&
    (f.period === 'all' || row.period === f.period) &&
    (f.status === 'all' || row.status === f.status) &&
    (f.mode === 'all' || Boolean(row.autoCredit) === (f.mode === 'auto'))
}))

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

const STATUS_TAG_COLOR = { yellow: 'orange', green: 'green', blue: 'blue', red: 'red', gray: 'default' }
const getStatusConfig = (status) => {
  const config = COMMISSION_STATUS_OPTIONS.find((s) => s.value === status)
  return {
    text: config?.label || status,
    color: STATUS_TAG_COLOR[config?.color] || 'default'
  }
}

const getTypeLabel = (type) => {
  return REFERRAL_TYPE_OPTIONS.find((t) => t.value === type)?.label || type
}

const settlementModeLabel = (row) => (row.autoCredit ? '自动入账' : '手动发放')

const stats = computed(() => {
  const a = aggregates.value
  return [
    { label: '待发放', value: a ? a.pendingCount : '—' },
    { label: '已入账', value: a ? a.completedCount : '—' },
    { label: '已入账佣金（USDT）', value: a ? formatMoney(a.completedAmount) : '—' }
  ]
})

// The whole list is read once (unfiltered, so the counts cover every batch); the query card filters it locally.
async function loadList() {
  loading.value = true
  try {
    const res = await referralApi.getSettlementBatches({ page: 1, pageSize: Number.MAX_SAFE_INTEGER, searchKeyword: '', status: 'all' })
    if (res.success) {
      recordList.value = res.data.list
      aggregates.value = res.data.aggregates
      settlementGlobal.value = res.data.settlementGlobal
    } else {
      message.error(res.message || '结算单加载失败')
    }
  } catch (error) {
    message.error(error?.message || '结算单加载失败')
  } finally {
    loading.value = false
  }
}

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }

onMounted(() => {
  loadList()
})

const columns = [
  { key: 'batchNo', title: '结算单号', width: 190, fixed: 'left' },
  { key: 'period', title: '账期', width: 110 },
  { key: 'agent', title: '代理', width: 180 },
  { key: 'source', title: '汇总来源', width: 160 },
  { key: 'amount', title: '结算佣金（USDT）', width: 160, align: 'right' },
  { key: 'mode', title: '入账方式', width: 110 },
  { key: 'status', title: '状态', width: 90 },
  { key: 'creditTxnId', title: '入账流水', width: 180, ellipsis: true },
  { key: 'actions', title: '操作', width: 120, fixed: 'right' }
]

// ---- detail drawer ------------------------------------------------------------------------------------------
const detailDrawer = ref({
  visible: false,
  loading: false,
  batch: null,
  list: []
})

const openDetails = async (row) => {
  detailDrawer.value = {
    visible: true,
    loading: true,
    batch: row,
    list: []
  }
  try {
    const res = await referralApi.getSettlementBatchDetails(row.id)
    if (detailDrawer.value.batch?.id !== row.id) return
    if (res.success) {
      detailDrawer.value.batch = res.data.batch
      detailDrawer.value.list = res.data.list
    } else {
      message.error(res.message || '明细加载失败')
    }
  } catch (error) {
    message.error(error?.message || '明细加载失败')
  } finally {
    if (detailDrawer.value.batch?.id === row.id) detailDrawer.value.loading = false
  }
}

const closeDetails = () => {
  detailDrawer.value.visible = false
}

function onDetailsAfterOpenChange(open) {
  if (open) return
  detailDrawer.value = { visible: false, loading: false, batch: null, list: [] }
}

const detailColumns = [
  { key: 'id', dataIndex: 'id', title: '明细记录', width: 160 },
  { key: 'createdAt', dataIndex: 'createdAt', title: '产生时间', width: 160 },
  { key: 'referral', title: '被邀请用户', width: 180 },
  { key: 'type', dataIndex: 'type', title: '业务类型', width: 110 },
  { key: 'amount', dataIndex: 'amount', title: '计佣基数（USDT）', width: 150, align: 'right' },
  { key: 'level', title: '层级 / 比例', width: 120, align: 'right' },
  { key: 'commission', dataIndex: 'commission', title: '佣金（USDT）', width: 130, align: 'right' }
]

// ---- payout confirmation ------------------------------------------------------------------------------------
const confirmDialog = ref({ visible: false, batch: null, loading: false })

function settleBatch(row) {
  confirmDialog.value = { visible: true, batch: row, loading: false }
}

function closeConfirm() {
  if (confirmDialog.value.loading) return
  confirmDialog.value = { visible: false, batch: null, loading: false }
}

async function submitConfirm() {
  const row = confirmDialog.value.batch
  if (!row || confirmDialog.value.loading) return
  confirmDialog.value.loading = true
  try {
    const res = await referralApi.settleBatch(row.id)
    if (res.success) {
      message.success(res.message || '发放成功')
      confirmDialog.value.loading = false
      closeConfirm()
      await loadList()
      if (detailDrawer.value.visible && detailDrawer.value.batch?.id === row.id) {
        await openDetails(res.data)
      }
    } else {
      message.error(res.message || '发放失败')
    }
  } catch (error) {
    message.error(error?.message || '操作失败')
  } finally {
    confirmDialog.value.loading = false
  }
}
</script>

<template>
  <PageShell>
    <SearchForm name="referral-commission-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />

    <Card :bordered="false">
      <Row :gutter="24">
        <Col v-for="stat in stats" :key="stat.label" :span="6">
          <Statistic :title="stat.label" :value="stat.value" />
        </Col>
        <Col :span="6">
          <Statistic title="当前入账账户" :value="settlementGlobal?.creditLabel || '—'" />
        </Col>
      </Row>
      <TypographyText v-if="settlementGlobal" type="secondary" class="referral-settlement-schedule">
        结算安排：{{ settlementGlobal.settlementScheduleLabel }} {{ settlementGlobal.settlementNotifyLine }}
      </TypographyText>
    </Card>

    <AdminTable title="结算单列表" v-model:page="page" :rows="rows" :columns="columns" row-key="id" :loading="loading" desktop-only>
      <template #toolbar>
        <Space :size="8">
          <Button :loading="loading" @click="loadList">刷新</Button>
          <Button @click="router.push('/admin/agent/referral-config')">裂变分销设置</Button>
        </Space>
      </template>
      <template #cell="{ column, record }">
        <span v-if="column.key === 'batchNo'" class="font-mono">{{ record.batchNo }}</span>
        <span v-else-if="column.key === 'period'" class="font-mono">{{ record.period }}</span>
        <Space v-else-if="column.key === 'agent'" direction="vertical" :size="0">
          <TypographyText strong>{{ record.agentUsername }}</TypographyText>
          <TypographyText type="secondary">UID {{ record.agentUid }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'source'" direction="vertical" :size="0">
          <span>{{ record.detailCount }} 条返佣明细</span>
          <TypographyText type="secondary">{{ record.invitedUserCount }} 个被邀请用户</TypographyText>
        </Space>
        <template v-else-if="column.key === 'amount'">{{ formatMoney(record.amount) }}</template>
        <Tag v-else-if="column.key === 'mode'" :color="record.autoCredit ? 'blue' : 'default'">{{ settlementModeLabel(record) }}</Tag>
        <Tag v-else-if="column.key === 'status'" :color="getStatusConfig(record.status).color">{{ getStatusConfig(record.status).text }}</Tag>
        <span v-else-if="column.key === 'creditTxnId'" class="font-mono" :title="record.creditTxnId || undefined">{{ record.creditTxnId || '—' }}</span>
        <Space v-else-if="column.key === 'actions'" :size="8">
          <Button type="link" class="px-0" @click="openDetails(record)">明细</Button>
          <Button v-if="record.status === COMMISSION_STATUS.PENDING" type="link" class="px-0" @click="settleBatch(record)">发放</Button>
        </Space>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <a-drawer :open="Boolean(detailDrawer.visible)" :mask-closable="false" :keyboard="false" :closable="false" placement="right" width="min(960px, 100vw)" class="admin-ant-business-overlay" @close="closeDetails" @after-open-change="onDetailsAfterOpenChange">
      <template #title>
        <div class="referral-drawer-header">
          <div class="referral-drawer-heading">
            <div class="referral-drawer-title">返佣明细</div>
            <TypographyText type="secondary">{{ detailDrawer.batch?.batchNo }} · {{ detailDrawer.batch?.period }} · UID {{ detailDrawer.batch?.agentUid }}</TypographyText>
          </div>
          <Button type="text" aria-label="关闭" @click="closeDetails"><CloseOutlined /></Button>
        </div>
      </template>
      <Descriptions v-if="detailDrawer.batch" :column="3" size="small" bordered class="referral-drawer-summary">
        <DescriptionsItem label="结算佣金（USDT）">{{ formatMoney(detailDrawer.batch.amount) }}</DescriptionsItem>
        <DescriptionsItem label="返佣明细">{{ detailDrawer.batch.detailCount }} 条</DescriptionsItem>
        <DescriptionsItem label="入账账户">{{ detailDrawer.batch.creditLabel || '—' }}</DescriptionsItem>
      </Descriptions>
      <Table :columns="detailColumns" :data-source="detailDrawer.list" :loading="detailDrawer.loading" :pagination="false" size="middle" row-key="id" :scroll="{ x: 1010 }" :locale="{ emptyText: '暂无明细' }">
        <template #bodyCell="{ column, record }">
          <span v-if="column.key === 'id'" class="font-mono">{{ record.id }}</span>
          <template v-else-if="column.key === 'createdAt'">{{ formatDate(record.createdAt) }}</template>
          <Space v-else-if="column.key === 'referral'" direction="vertical" :size="0">
            <span>{{ record.referralUsername }}</span>
            <TypographyText type="secondary">UID {{ record.referralUid }}</TypographyText>
          </Space>
          <template v-else-if="column.key === 'type'">{{ getTypeLabel(record.type) }}</template>
          <template v-else-if="column.key === 'amount'">{{ formatMoney(record.amount) }}</template>
          <template v-else-if="column.key === 'level'">{{ record.level }} 级 / {{ (Number(record.commissionRate || 0) * 100).toFixed(2) }}%</template>
          <template v-else-if="column.key === 'commission'">{{ formatMoney(record.commission) }}</template>
        </template>
      </Table>
    </a-drawer>

    <AdminModal :open="confirmDialog.visible" title="发放裂变佣金" confirm-text="确认发放" :busy="confirmDialog.loading" :width="480" @close="closeConfirm" @confirm="submitConfirm">
      <TypographyText>确认发放结算单 {{ confirmDialog.batch?.batchNo }}？</TypographyText>
      <TypographyText type="secondary">{{ confirmDialog.batch?.agentUsername }} · {{ formatMoney(confirmDialog.batch?.amount) }} USDT</TypographyText>
    </AdminModal>
  </PageShell>
</template>

<style scoped>
.referral-settlement-schedule { display: block; margin-top: 16px; }
.referral-drawer-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.referral-drawer-heading { min-width: 0; }
.referral-drawer-title { font-size: 16px; line-height: 24px; font-weight: 600; }
.referral-drawer-summary { margin-bottom: 16px; }
</style>
