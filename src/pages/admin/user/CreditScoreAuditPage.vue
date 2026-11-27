<script setup>
// 信用分变动审核 — Ant Design Pro list page (2026-11-28): query card (one input per field, explicit 查询/重置),
// audit overview Statistics, pending table card with toolbar and pagination, link review action, text Tags.
// The list stays limited to pending applications; review happens in CreditScoreAuditDrawer as before.
// The mock's date filter excluded the end day (compared at 00:00); dates now filter by whole local days.
import { ref, computed, onMounted } from 'vue'
import { Button, Card, Col, Row, Space, Statistic, Tag, TypographyText, message } from 'ant-design-vue'
import { DownloadOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import { getCreditScoreAudits, creditScoreAuditList } from '../../../admin/mock/creditScore'
import CreditScoreAuditDrawer from '../../../admin/components/credit-score-audit/CreditScoreAuditDrawer.vue'
import {
  CREDIT_SCORE_CHANGE_TYPE,
  CREDIT_SCORE_CHANGE_TYPE_OPTIONS,
  CREDIT_SCORE_AUDIT_STATUS
} from '../../../admin/constants/creditScore'

const auditList = ref([])
const loading = ref(false)
const page = ref(1)
// Bumped after each review so the overview re-reads the mutated mock list.
const revision = ref(0)

const blank = () => ({ userId: '', username: '', email: '', reason: '', changeType: 'all', applyTime: null })
const filters = ref(blank())
const fields = [
  { key: 'userId', label: '用户 ID' },
  { key: 'username', label: '用户名' },
  { key: 'email', label: '邮箱' },
  { key: 'reason', label: '原因' },
  { key: 'changeType', label: '变动类型', options: [{ value: 'all', label: '全部类型' }, ...CREDIT_SCORE_CHANGE_TYPE_OPTIONS] },
  { key: 'applyTime', label: '申请时间', range: true }
]

const pad = (n) => String(n).padStart(2, '0')
const localDay = (value) => {
  const date = new Date(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())

const fetchAudits = async () => {
  loading.value = true
  try {
    const { list } = await getCreditScoreAudits({
      page: 1,
      pageSize: Number.MAX_SAFE_INTEGER,
      auditStatus: CREDIT_SCORE_AUDIT_STATUS.PENDING
    })
    auditList.value = list
  } catch (error) {
    message.error('获取信用分审核列表失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

onMounted(fetchAudits)

const rows = computed(() => auditList.value.filter((audit) => {
  const f = filters.value
  const day = localDay(audit.applyTime)
  return has(audit.userId, f.userId) && has(audit.username, f.username) && has(audit.email, f.email) &&
    has(audit.reason, f.reason) &&
    (f.changeType === 'all' || audit.changeType === f.changeType) &&
    (!f.applyTime || (day >= f.applyTime[0] && day <= f.applyTime[1]))
}))

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }

// 审核抽屉
const showDetailModal = ref(false)
const selectedAudit = ref(null)

const statistics = computed(() => {
  void revision.value
  const total = creditScoreAuditList.length
  const count = (status) => creditScoreAuditList.filter((a) => a.auditStatus === status).length
  const approved = count(CREDIT_SCORE_AUDIT_STATUS.APPROVED)
  const rejected = count(CREDIT_SCORE_AUDIT_STATUS.REJECTED)
  const rate = (value) => (total > 0 ? ((value / total) * 100).toFixed(1) : '0')
  return [
    { label: '待审核', value: count(CREDIT_SCORE_AUDIT_STATUS.PENDING), hint: '需处理' },
    { label: '已通过', value: approved, hint: `通过率 ${rate(approved)}%` },
    { label: '已拒绝', value: rejected, hint: `拒绝率 ${rate(rejected)}%` },
    { label: '总申请', value: total, hint: '全部申请' }
  ]
})

const statusConfig = {
  [CREDIT_SCORE_AUDIT_STATUS.PENDING]: { text: '待审核', color: 'orange' },
  [CREDIT_SCORE_AUDIT_STATUS.APPROVED]: { text: '已通过', color: 'green' },
  [CREDIT_SCORE_AUDIT_STATUS.REJECTED]: { text: '已拒绝', color: 'red' },
  [CREDIT_SCORE_AUDIT_STATUS.AUTO_APPROVED]: { text: '自动通过', color: 'blue' }
}

const changeTypeConfig = {
  [CREDIT_SCORE_CHANGE_TYPE.RECHARGE]: { text: '充值', color: 'blue' },
  [CREDIT_SCORE_CHANGE_TYPE.PRIMARY_KYC]: { text: '初级认证', color: 'green' },
  [CREDIT_SCORE_CHANGE_TYPE.ADVANCED_KYC]: { text: '高级认证', color: 'purple' },
  [CREDIT_SCORE_CHANGE_TYPE.MANUAL_ADJUST]: { text: '手动调整', color: 'gold' },
  [CREDIT_SCORE_CHANGE_TYPE.AUTO_UPGRADE]: { text: '自动升级', color: 'geekblue' },
  [CREDIT_SCORE_CHANGE_TYPE.PENALTY]: { text: '惩罚', color: 'red' },
  [CREDIT_SCORE_CHANGE_TYPE.REWARD]: { text: '奖励', color: 'cyan' }
}

const columns = [
  { key: 'user', title: '用户信息', width: 220, fixed: 'left' },
  { key: 'changeType', title: '变动类型', width: 110 },
  { key: 'beforeScore', title: '变动前', width: 90, align: 'right' },
  { key: 'changeAmount', title: '变动值', width: 90, align: 'right' },
  { key: 'afterScore', title: '变动后', width: 90, align: 'right' },
  { key: 'reason', title: '原因', width: 220 },
  { key: 'applyOperatorName', title: '申请人', width: 120 },
  { key: 'applyTime', title: '申请时间', width: 170 },
  { key: 'status', title: '状态', width: 90 },
  { key: 'actions', title: '操作', width: 80, fixed: 'right' }
]

const formatDate = (dateString) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}

const viewDetail = (audit) => {
  selectedAudit.value = audit
  showDetailModal.value = true
}

const closeDetail = () => {
  showDetailModal.value = false
  selectedAudit.value = null
}

// 提交审核（由 CreditScoreAuditDrawer 触发）
const submitAudit = ({ action, note }) => {
  if (!selectedAudit.value || !action) return

  const auditIndex = creditScoreAuditList.findIndex((a) => a.id === selectedAudit.value.id)
  if (auditIndex === -1) return

  const now = new Date().toISOString()
  const audit = creditScoreAuditList[auditIndex]
  // State guard: an application that is no longer pending cannot be reviewed again.
  if (audit.auditStatus !== CREDIT_SCORE_AUDIT_STATUS.PENDING) {
    closeDetail()
    message.warning('该申请已处理，请勿重复审核')
    fetchAudits()
    return
  }

  switch (action) {
    case 'approve':
      audit.auditStatus = CREDIT_SCORE_AUDIT_STATUS.APPROVED
      audit.auditTime = now
      audit.auditorId = 'admin_current'
      audit.auditorName = '当前管理员'
      audit.auditNote = note || null
      closeDetail()
      message.success('审核通过，积分变动已生效！')
      break
    case 'reject':
      audit.auditStatus = CREDIT_SCORE_AUDIT_STATUS.REJECTED
      audit.auditTime = now
      audit.auditorId = 'admin_current'
      audit.auditorName = '当前管理员'
      audit.auditNote = note || '审核未通过'
      closeDetail()
      message.success('已拒绝申请，积分变动不生效！')
      break
    default:
      return
  }
  revision.value += 1
  fetchAudits()
}

// Mock export: no file yet, so say so instead of a native alert (operation feedback is toast-only).
const exportData = () => {
  message.info(`已按当前筛选条件准备导出 ${rows.value.length} 条待审核申请（演示环境不生成文件）`)
}
</script>

<template>
  <PageShell>
    <SearchForm name="credit-score-audit-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <Card :bordered="false" title="审核概况">
      <Row :gutter="24">
        <Col v-for="stat in statistics" :key="stat.label" :xs="12" :md="6">
          <Statistic :title="stat.label" :value="stat.value" />
          <TypographyText type="secondary">{{ stat.hint }}</TypographyText>
        </Col>
      </Row>
    </Card>
    <AdminTable title="待审核列表" v-model:page="page" :rows="rows" :columns="columns" row-key="id" :loading="loading" desktop-only>
      <template #toolbar>
        <Button @click="exportData"><template #icon><DownloadOutlined /></template>导出</Button>
      </template>
      <template #cell="{ column, record }">
        <Space v-if="column.key === 'user'" direction="vertical" :size="0">
          <TypographyText strong>{{ record.username }}</TypographyText>
          <TypographyText type="secondary">{{ record.email }}</TypographyText>
          <TypographyText type="secondary" class="font-mono">{{ record.userId }}</TypographyText>
        </Space>
        <Tag v-else-if="column.key === 'changeType'" :color="changeTypeConfig[record.changeType]?.color">{{ changeTypeConfig[record.changeType]?.text || record.changeType }}</Tag>
        <TypographyText v-else-if="column.key === 'changeAmount'" :type="record.changeAmount > 0 ? 'success' : record.changeAmount < 0 ? 'danger' : undefined" strong>{{ record.changeAmount > 0 ? '+' : '' }}{{ record.changeAmount }}</TypographyText>
        <template v-else-if="column.key === 'applyTime'">{{ formatDate(record.applyTime) }}</template>
        <Tag v-else-if="column.key === 'status'" :color="statusConfig[record.auditStatus]?.color">{{ statusConfig[record.auditStatus]?.text || record.auditStatus }}</Tag>
        <Button v-else-if="column.key === 'actions'" type="link" class="px-0" @click="viewDetail(record)">{{ record.auditStatus === CREDIT_SCORE_AUDIT_STATUS.PENDING ? '审核' : '详情' }}</Button>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <CreditScoreAuditDrawer
      :visible="showDetailModal"
      :audit="selectedAudit"
      @close="closeDetail"
      @submit="submitAudit"
    />
  </PageShell>
</template>
