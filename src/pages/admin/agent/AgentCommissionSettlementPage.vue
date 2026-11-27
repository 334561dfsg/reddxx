<script setup>
// 代理佣金结算 — Ant Design Pro list page (2026-11-28): query card with one field per filter (the combined
// 汇总单号/UID/邮箱/账期 keyword box is split), status counts as a Statistic card, table card with link actions and
// text status Tags. Review approval keeps its confirmation dialog (shared confirmation modal) and toast feedback.
// The detail Drawer keeps its own open flag; its content is cleared after the close animation.
import { ref, computed, onMounted } from 'vue'
import { Button, Card, Col, Descriptions, DescriptionsItem, Row, Space, Statistic, Table, Tag, TypographyText, message } from 'ant-design-vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import { agentSettlementApi } from '../../../admin/mock/agentSettlement'
import {
  AGENT_SETTLEMENT_ACTION,
  AGENT_SETTLEMENT_STATUS,
  AGENT_SETTLEMENT_STATUS_OPTIONS,
  agentSettlementStatusLabel
} from '../../../admin/constants/agentSettlement'

const loading = ref(false)
const page = ref(1)
const recordList = ref([])
const aggregates = ref(null)

const blank = () => ({ batchNo: '', agentUid: '', agentEmail: '', period: 'all', status: 'all', mode: 'all' })
const filters = ref(blank())
const periodOptions = computed(() => [...new Set(recordList.value.map((row) => row.period))].sort().reverse().map((value) => ({ value, label: value })))
const fields = computed(() => [
  { key: 'batchNo', label: '汇总单号' },
  { key: 'agentUid', label: '代理 UID' },
  { key: 'agentEmail', label: '代理邮箱' },
  { key: 'period', label: '账期', searchable: true, options: [{ value: 'all', label: '全部账期' }, ...periodOptions.value] },
  { key: 'status', label: '状态', options: AGENT_SETTLEMENT_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.value === 'all' ? '全部状态' : o.label })) },
  { key: 'mode', label: '入账方式', options: [{ value: 'all', label: '全部方式' }, { value: 'auto', label: '自动入账' }, { value: 'manual', label: '人工审核' }] }
])
const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
const rows = computed(() => recordList.value.filter((row) => {
  const f = filters.value
  return has(row.batchNo, f.batchNo) && has(row.agentUid, f.agentUid) && has(row.agentEmail, f.agentEmail) &&
    (f.period === 'all' || row.period === f.period) &&
    (f.status === 'all' || row.status === f.status) &&
    (f.mode === 'all' || Boolean(row.autoCredit) === (f.mode === 'auto'))
}))

const statusColor = { [AGENT_SETTLEMENT_STATUS.PENDING_REVIEW]: 'orange', [AGENT_SETTLEMENT_STATUS.COMPLETED]: 'green' }

// The mock caps a page at 50 rows; read every page so the query card can filter the whole list locally.
const loadList = async () => {
  loading.value = true
  try {
    const all = []
    let next = 1
    let total = Infinity
    while (all.length < total) {
      const res = await agentSettlementApi.listBatches({ page: next, pageSize: 50, status: 'all', searchKeyword: '' })
      if (!res.success) throw new Error(res.message || '加载失败')
      all.push(...res.data.list)
      total = res.data.total
      aggregates.value = res.data.aggregates
      if (!res.data.list.length) break
      next += 1
    }
    recordList.value = all
  } catch (e) {
    message.error('结算单加载失败：' + (e?.message || '请稍后重试'))
  } finally {
    loading.value = false
  }
}

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }

onMounted(() => {
  loadList()
})

const stats = computed(() => {
  const a = aggregates.value
  return [
    { label: '待审核', value: a ? a.pendingReview : '—' },
    { label: '自动入账', value: a ? a.autoCompleted : '—' },
    { label: '已入账', value: a ? a.completed : '—' }
  ]
})

const settlementModeLabel = (row) => (row.autoCredit ? '自动入账' : '人工审核')

const formatMoney = (n) => Number(n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const columns = [
  { key: 'batchNo', title: '汇总单号', width: 190, fixed: 'left' },
  { key: 'period', title: '账期', width: 100 },
  { key: 'agent', title: '代理', width: 240 },
  { key: 'source', title: '汇总来源', width: 140 },
  { key: 'amount', title: '佣金（USDT）', width: 140, align: 'right' },
  { key: 'mode', title: '入账方式', width: 110 },
  { key: 'status', title: '状态', width: 90 },
  { key: 'creditTxnId', title: '划转流水', width: 180 },
  { key: 'actions', title: '操作', width: 140, fixed: 'right' }
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
    const res = await agentSettlementApi.listBatchDetails(row.id)
    if (detailDrawer.value.batch?.id !== row.id) return
    if (res.success) {
      detailDrawer.value.batch = res.data.batch
      detailDrawer.value.list = res.data.list
    } else {
      message.error(res.message || '明细加载失败')
    }
  } catch (e) {
    message.error(e?.message || '明细加载失败')
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
  { key: 'occurredAt', dataIndex: 'occurredAt', title: '产生时间', width: 170 },
  { key: 'invited', title: '被邀请用户', width: 200 },
  { key: 'typeLabel', dataIndex: 'typeLabel', title: '业务类型', width: 110 },
  { key: 'sourceOrderNo', dataIndex: 'sourceOrderNo', title: '来源单号', width: 180 },
  { key: 'baseAmount', dataIndex: 'baseAmount', title: '计佣基数（USDT）', width: 150, align: 'right' },
  { key: 'commissionRate', dataIndex: 'commissionRate', title: '比例', width: 90, align: 'right' },
  { key: 'commission', dataIndex: 'commission', title: '佣金（USDT）', width: 130, align: 'right' }
]

// ---- review confirmation ------------------------------------------------------------------------------------
const confirmDialog = ref({ visible: false, batch: null, loading: false })

function openApprove(row) {
  confirmDialog.value = { visible: true, batch: row, loading: false }
}

function closeConfirm() {
  if (confirmDialog.value.loading) return
  confirmDialog.value = { visible: false, batch: null, loading: false }
}

async function submitConfirm() {
  const batch = confirmDialog.value.batch
  if (!batch || confirmDialog.value.loading) return
  confirmDialog.value.loading = true
  try {
    const res = await agentSettlementApi.advanceBatch(batch.id, AGENT_SETTLEMENT_ACTION.APPROVE)
    if (res.success) {
      message.success(res.message || '已审核通过并划转入账')
      confirmDialog.value.loading = false
      closeConfirm()
      await loadList()
    } else {
      message.error(res.message || '操作失败')
    }
  } catch (e) {
    message.error(e?.message || '操作失败')
  } finally {
    confirmDialog.value.loading = false
  }
}
</script>

<template>
  <PageShell>
    <SearchForm name="agent-settlement-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />

    <Card :bordered="false">
      <Row :gutter="24">
        <Col v-for="item in stats" :key="item.label" :span="8">
          <Statistic :title="item.label" :value="item.value" />
        </Col>
      </Row>
    </Card>

    <AdminTable title="代理佣金结算" v-model:page="page" :rows="rows" :columns="columns" row-key="id" :loading="loading" desktop-only>
      <template #toolbar>
        <Button :loading="loading" @click="loadList">刷新</Button>
      </template>
      <template #cell="{ column, record }">
        <span v-if="column.key === 'batchNo'" class="font-mono">{{ record.batchNo }}</span>
        <span v-else-if="column.key === 'period'" class="font-mono">{{ record.period }}</span>
        <Space v-else-if="column.key === 'agent'" direction="vertical" :size="0">
          <TypographyText strong>{{ record.agentName }}</TypographyText>
          <TypographyText type="secondary">UID {{ record.agentUid }} · {{ record.agentEmail }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'source'" direction="vertical" :size="0">
          <span>{{ record.sourceDetailCount }} 条明细</span>
          <TypographyText type="secondary">{{ record.invitedUserCount }} 个邀请用户</TypographyText>
        </Space>
        <template v-else-if="column.key === 'amount'">{{ formatMoney(record.amount) }}</template>
        <Tag v-else-if="column.key === 'mode'" :color="record.autoCredit ? 'blue' : 'default'">{{ settlementModeLabel(record) }}</Tag>
        <Tag v-else-if="column.key === 'status'" :color="statusColor[record.status]">{{ agentSettlementStatusLabel(record.status) }}</Tag>
        <TypographyText v-else-if="column.key === 'creditTxnId'" :type="record.creditTxnId ? undefined : 'secondary'" class="font-mono">{{ record.creditTxnId || '—' }}</TypographyText>
        <Space v-else-if="column.key === 'actions'" :size="8">
          <Button type="link" class="px-0" @click="openDetails(record)">明细</Button>
          <Button v-if="record.status === AGENT_SETTLEMENT_STATUS.PENDING_REVIEW" type="link" class="px-0" @click="openApprove(record)">审核通过</Button>
        </Space>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <!-- 汇总明细 -->
    <a-drawer :open="Boolean(detailDrawer.visible)" :mask-closable="false" :keyboard="false" :closable="false" placement="right" width="min(960px, 100vw)" class="admin-ant-business-overlay" @close="closeDetails" @after-open-change="onDetailsAfterOpenChange">
      <template #title>
        <div class="settlement-drawer-header">
          <div class="settlement-drawer-heading">
            <div class="settlement-drawer-title">返佣明细</div>
            <TypographyText type="secondary">{{ detailDrawer.batch?.batchNo }} · {{ detailDrawer.batch?.period }} · UID {{ detailDrawer.batch?.agentUid }}</TypographyText>
          </div>
          <Button type="text" aria-label="关闭" @click="closeDetails"><CloseOutlined /></Button>
        </div>
      </template>
      <Descriptions v-if="detailDrawer.batch" :column="2" size="small" bordered class="settlement-drawer-summary">
        <DescriptionsItem label="汇总佣金（USDT）">{{ formatMoney(detailDrawer.batch.amount) }}</DescriptionsItem>
        <DescriptionsItem label="明细记录">{{ detailDrawer.batch.sourceDetailCount }} 条</DescriptionsItem>
        <DescriptionsItem label="入账方式">{{ settlementModeLabel(detailDrawer.batch) }}</DescriptionsItem>
        <DescriptionsItem label="状态"><Tag :color="statusColor[detailDrawer.batch.status]">{{ agentSettlementStatusLabel(detailDrawer.batch.status) }}</Tag></DescriptionsItem>
      </Descriptions>
      <Table :columns="detailColumns" :data-source="detailDrawer.list" :loading="detailDrawer.loading" :pagination="false" size="middle" row-key="id" :scroll="{ x: 1030 }" :locale="{ emptyText: '暂无明细' }">
        <template #bodyCell="{ column, record }">
          <span v-if="column.key === 'occurredAt'" class="font-mono">{{ record.occurredAt }}</span>
          <Space v-else-if="column.key === 'invited'" direction="vertical" :size="0">
            <span>UID {{ record.invitedUid }}</span>
            <TypographyText type="secondary">{{ record.invitedEmail }}</TypographyText>
          </Space>
          <span v-else-if="column.key === 'sourceOrderNo'" class="font-mono">{{ record.sourceOrderNo }}</span>
          <template v-else-if="column.key === 'baseAmount'">{{ formatMoney(record.baseAmount) }}</template>
          <template v-else-if="column.key === 'commissionRate'">{{ (Number(record.commissionRate || 0) * 100).toFixed(2) }}%</template>
          <template v-else-if="column.key === 'commission'">{{ formatMoney(record.commission) }}</template>
        </template>
      </Table>
    </a-drawer>

    <!-- 确认操作 -->
    <AdminModal :open="confirmDialog.visible" title="审核通过并划转入账" confirm-text="确认通过" :busy="confirmDialog.loading" :width="480" @close="closeConfirm" @confirm="submitConfirm">
      <TypographyText>确认审核通过并划转入账？</TypographyText>
      <TypographyText type="secondary">{{ confirmDialog.batch?.batchNo }} · {{ confirmDialog.batch?.agentName }} · {{ formatMoney(confirmDialog.batch?.amount) }} USDT</TypographyText>
    </AdminModal>
  </PageShell>
</template>

<style scoped>
.settlement-drawer-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.settlement-drawer-heading { min-width: 0; }
.settlement-drawer-title { font-size: 16px; line-height: 24px; font-weight: 600; }
.settlement-drawer-summary { margin-bottom: 16px; }
</style>
