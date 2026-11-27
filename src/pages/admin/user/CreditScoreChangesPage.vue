<script setup>
// 信用分变动日志 — Ant Design Pro list page (2026-11-28): query card (one input per field, explicit 查询/重置),
// overview Statistics, table card with toolbar and pagination, link actions, change type as a text Tag.
// The mock's date filter compared the end date at 00:00 (the end day was excluded); dates now filter by whole local
// days. Related amounts are USDT, not USD (the old cell formatted them with a $ sign).
import { ref, computed, onMounted } from 'vue'
import { Button, Card, Col, Row, Space, Statistic, Tag, TypographyText, message } from 'ant-design-vue'
import { DownloadOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import {
  getCreditScoreChanges,
  creditScoreChanges,
  creditScoreAuditList
} from '../../../admin/mock/creditScore'
import {
  CREDIT_SCORE_CHANGE_TYPE,
  CREDIT_SCORE_CHANGE_TYPE_OPTIONS,
  CREDIT_SCORE_AUDIT_STATUS
} from '../../../admin/constants/creditScore'
import CreditScoreAuditDrawer from '../../../admin/components/credit-score-audit/CreditScoreAuditDrawer.vue'

/** 将变动日志行转为审核抽屉所需结构，并尽量关联审核库中的记录以展示历史审核信息 */
function buildAuditFromChange(change) {
  const matched = creditScoreAuditList.find(
    (a) =>
      a.userId === change.userId &&
      a.beforeScore === change.beforeScore &&
      a.afterScore === change.afterScore &&
      a.changeAmount === change.changeAmount &&
      a.changeType === change.changeType
  )
  if (matched) {
    return { ...matched }
  }
  return {
    id: change.id,
    userId: change.userId,
    username: change.username,
    email: `${change.username}@example.com`,
    changeType: change.changeType,
    beforeScore: change.beforeScore,
    afterScore: change.afterScore,
    changeAmount: change.changeAmount,
    relatedAmount: change.relatedAmount ?? null,
    reason: change.reason,
    applyOperatorId: change.operatorId,
    applyOperatorName: change.operatorName,
    applyTime: change.createdAt,
    auditStatus: CREDIT_SCORE_AUDIT_STATUS.AUTO_APPROVED,
    auditTime: change.createdAt,
    auditorId: null,
    auditorName: '—',
    auditNote: '系统自动生效，无人工审核记录'
  }
}

const changes = ref([])
const loading = ref(false)
const page = ref(1)

const blank = () => ({ userId: '', username: '', changeType: 'all', reason: '', operator: '', createdAt: null })
const filters = ref(blank())
const fields = [
  { key: 'userId', label: '用户 ID' },
  { key: 'username', label: '用户名' },
  { key: 'changeType', label: '变动类型', options: [{ value: 'all', label: '全部类型' }, ...CREDIT_SCORE_CHANGE_TYPE_OPTIONS] },
  { key: 'reason', label: '原因' },
  { key: 'operator', label: '操作人' },
  { key: 'createdAt', label: '变动时间', range: true }
]

const pad = (n) => String(n).padStart(2, '0')
const localDay = (value) => {
  const date = new Date(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())

const fetchChanges = async () => {
  loading.value = true
  try {
    const { list } = await getCreditScoreChanges({ page: 1, pageSize: Number.MAX_SAFE_INTEGER })
    changes.value = list
  } catch (error) {
    message.error('获取信用分变动日志失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

onMounted(fetchChanges)

const rows = computed(() => changes.value.filter((change) => {
  const f = filters.value
  const day = localDay(change.createdAt)
  return has(change.userId, f.userId) && has(change.username, f.username) &&
    (f.changeType === 'all' || change.changeType === f.changeType) &&
    has(change.reason, f.reason) && has(change.operatorName, f.operator) &&
    (!f.createdAt || (day >= f.createdAt[0] && day <= f.createdAt[1]))
}))

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }

const changeTypeConfig = {
  [CREDIT_SCORE_CHANGE_TYPE.RECHARGE]: { text: '充值', color: 'blue' },
  [CREDIT_SCORE_CHANGE_TYPE.PRIMARY_KYC]: { text: '初级认证', color: 'green' },
  [CREDIT_SCORE_CHANGE_TYPE.ADVANCED_KYC]: { text: '高级认证', color: 'purple' },
  [CREDIT_SCORE_CHANGE_TYPE.MANUAL_ADJUST]: { text: '手动调整', color: 'gold' },
  [CREDIT_SCORE_CHANGE_TYPE.AUTO_UPGRADE]: { text: '自动升级', color: 'geekblue' },
  [CREDIT_SCORE_CHANGE_TYPE.PENALTY]: { text: '惩罚', color: 'red' },
  [CREDIT_SCORE_CHANGE_TYPE.REWARD]: { text: '奖励', color: 'cyan' }
}

const statistics = computed(() => {
  const list = changes.value.length ? changes.value : creditScoreChanges
  return [
    { label: '总变动记录', value: list.length },
    { label: '增加记录', value: list.filter((c) => c.changeAmount > 0).length },
    { label: '减少记录', value: list.filter((c) => c.changeAmount < 0).length },
    { label: '累计增加', value: list.reduce((sum, c) => (c.changeAmount > 0 ? sum + c.changeAmount : sum), 0), prefix: '+' }
  ]
})

const columns = [
  { key: 'user', title: '用户', width: 180, fixed: 'left' },
  { key: 'changeType', title: '变动类型', width: 110 },
  { key: 'beforeScore', title: '变动前', width: 90, align: 'right' },
  { key: 'changeAmount', title: '变动值', width: 90, align: 'right' },
  { key: 'afterScore', title: '变动后', width: 90, align: 'right' },
  { key: 'relatedAmount', title: '关联金额（USDT）', width: 160, align: 'right' },
  { key: 'reason', title: '原因', width: 240 },
  { key: 'operatorName', title: '操作人', width: 120 },
  { key: 'createdAt', title: '时间', width: 180 },
  { key: 'actions', title: '操作', width: 80, fixed: 'right' }
]

const formatDateTime = (dateString) => new Date(dateString).toLocaleString('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
})
const formatAmount = (amount) => Number(amount).toLocaleString('zh-CN', { maximumFractionDigits: 2 })

// Mock export: no file yet, so say so instead of a native alert (operation feedback is toast-only).
const exportData = () => {
  message.info(`已按当前筛选条件准备导出 ${rows.value.length} 条变动记录（演示环境不生成文件）`)
}

// 变动详情抽屉（含「历史审核信息」，与「信用分变动审核」页待处理抽屉区分）
const showChangeDetail = ref(false)
const selectedAuditPayload = ref(null)

const openChangeDetail = (change) => {
  selectedAuditPayload.value = buildAuditFromChange(change)
  showChangeDetail.value = true
}

const closeChangeDetail = () => {
  showChangeDetail.value = false
  selectedAuditPayload.value = null
}
</script>

<template>
  <PageShell>
    <SearchForm name="credit-score-change-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <Card :bordered="false" title="变动概况">
      <Row :gutter="24">
        <Col v-for="stat in statistics" :key="stat.label" :xs="12" :md="6">
          <Statistic :title="stat.label" :value="stat.value" :prefix="stat.prefix" />
        </Col>
      </Row>
    </Card>
    <AdminTable title="变动记录" v-model:page="page" :rows="rows" :columns="columns" row-key="id" :loading="loading" desktop-only>
      <template #toolbar>
        <Button @click="exportData"><template #icon><DownloadOutlined /></template>导出</Button>
      </template>
      <template #cell="{ column, record }">
        <Space v-if="column.key === 'user'" direction="vertical" :size="0">
          <TypographyText strong>{{ record.username }}</TypographyText>
          <TypographyText type="secondary" class="font-mono">{{ record.userId }}</TypographyText>
        </Space>
        <Tag v-else-if="column.key === 'changeType'" :color="changeTypeConfig[record.changeType]?.color">{{ changeTypeConfig[record.changeType]?.text || record.changeType }}</Tag>
        <TypographyText v-else-if="column.key === 'changeAmount'" :type="record.changeAmount > 0 ? 'success' : record.changeAmount < 0 ? 'danger' : undefined" strong>{{ record.changeAmount > 0 ? '+' : '' }}{{ record.changeAmount }}</TypographyText>
        <template v-else-if="column.key === 'relatedAmount'">
          <span v-if="record.relatedAmount">{{ formatAmount(record.relatedAmount) }}</span>
          <TypographyText v-else type="secondary">—</TypographyText>
        </template>
        <template v-else-if="column.key === 'createdAt'">{{ formatDateTime(record.createdAt) }}</template>
        <Button v-else-if="column.key === 'actions'" type="link" class="px-0" @click="openChangeDetail(record)">详情</Button>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <CreditScoreAuditDrawer
      :visible="showChangeDetail"
      :audit="selectedAuditPayload"
      :show-audit-history-section="true"
      read-only
      @close="closeChangeDetail"
    />
  </PageShell>
</template>
