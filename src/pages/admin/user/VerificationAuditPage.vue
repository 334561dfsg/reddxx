<script setup>
// 认证身份审核 — Ant Design Pro list page (2026-11-28): query card (one input per field, explicit 查询/重置),
// audit overview Statistics, pending table card with toolbar and pagination, link review action, text Tags.
// The list stays limited to pending applications and the review dialog is unchanged apart from data fixes: the mock
// stores basicInfo.address (there is no city field, so 所在城市 was always empty), document preview used a native
// alert (now a toast), and a non-pending application can no longer be reviewed twice. The mock's date filter
// excluded the end day (compared at 00:00); dates now filter by whole local days.
import { ref, computed, onMounted } from 'vue'
import { Button, Card, Col, Row, Space, Statistic, Tag, TypographyText, message } from 'ant-design-vue'
import { ArrowRightOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import { getVerificationAudits, verificationAuditList } from '../../../admin/mock/verification'
import {
  VERIFICATION_LEVEL,
  VERIFICATION_LEVEL_OPTIONS,
  VERIFICATION_STATUS,
  VERIFICATION_DOC_TYPE_OPTIONS
} from '../../../constants/verification'

const auditList = ref([])
const loading = ref(false)
const page = ref(1)
// Bumped after each review so the overview re-reads the mutated mock list.
const revision = ref(0)

const blank = () => ({ userId: '', username: '', realName: '', email: '', applyLevel: 'all', submitTime: null })
const filters = ref(blank())
const fields = [
  { key: 'userId', label: '用户 ID' },
  { key: 'username', label: '用户名' },
  { key: 'realName', label: '真实姓名' },
  { key: 'email', label: '邮箱' },
  { key: 'applyLevel', label: '申请等级', options: [{ value: 'all', label: '全部等级' }, ...VERIFICATION_LEVEL_OPTIONS] },
  { key: 'submitTime', label: '提交时间', range: true }
]

const showDetailModal = ref(false)
const selectedAudit = ref(null)
const auditAction = ref(null)
const auditNote = ref('')

const statusConfig = {
  [VERIFICATION_STATUS.PENDING]: { text: '待审核', color: 'orange' },
  [VERIFICATION_STATUS.APPROVED]: { text: '已通过', color: 'green' },
  [VERIFICATION_STATUS.REJECTED]: { text: '已拒绝', color: 'red' },
  [VERIFICATION_STATUS.RESUBMIT]: { text: '需补件', color: 'gold' }
}

const levelConfig = {
  [VERIFICATION_LEVEL.NONE]: { text: '未认证', color: 'default' },
  [VERIFICATION_LEVEL.BASIC]: { text: '初级认证', color: 'blue' },
  [VERIFICATION_LEVEL.ADVANCED]: { text: '高级认证', color: 'purple' }
}

const getDocTypeLabel = (docType) => VERIFICATION_DOC_TYPE_OPTIONS.find(opt => opt.value === docType)?.label || docType

const pad = (n) => String(n).padStart(2, '0')
const localDay = (value) => {
  const date = new Date(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

const selectedSiteInfo = computed(() => {
  if (!selectedAudit.value) return null
  const audit = selectedAudit.value
  const docs = audit.documents || []
  const imageCount = docs.filter((d) => !String(d.url || '').toLowerCase().endsWith('.pdf')).length
  const pdfCount = docs.filter((d) => String(d.url || '').toLowerCase().endsWith('.pdf')).length
  const submitAt = audit.submitTime ? new Date(audit.submitTime).getTime() : 0
  const auditAt = audit.auditTime ? new Date(audit.auditTime).getTime() : 0
  const durationHours = submitAt && auditAt ? Math.max(0, Math.round((auditAt - submitAt) / (1000 * 60 * 60))) : null
  return {
    uid: audit.userId || '-',
    username: audit.username || '-',
    email: audit.email || '-',
    applyLevel: levelConfig[audit.applyLevel]?.text || audit.applyLevel,
    currentLevel: levelConfig[audit.currentLevel]?.text || audit.currentLevel,
    submitTime: formatDate(audit.submitTime),
    auditTime: formatDate(audit.auditTime),
    auditor: audit.auditor || '-',
    rejectReason: audit.rejectReason || '-',
    docCount: docs.length,
    imageCount,
    pdfCount,
    processHours: durationHours == null ? '-' : `${durationHours} 小时`
  }
})

const fetchAudits = async () => {
  loading.value = true
  try {
    const { list } = await getVerificationAudits({
      page: 1,
      pageSize: Number.MAX_SAFE_INTEGER,
      status: VERIFICATION_STATUS.PENDING
    })
    auditList.value = list
  } catch (error) {
    message.error('获取认证审核列表失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

onMounted(fetchAudits)

const rows = computed(() => auditList.value.filter((audit) => {
  const f = filters.value
  const day = localDay(audit.submitTime)
  return has(audit.userId, f.userId) && has(audit.username, f.username) &&
    has(audit.basicInfo?.realName, f.realName) && has(audit.email, f.email) &&
    (f.applyLevel === 'all' || audit.applyLevel === f.applyLevel) &&
    (!f.submitTime || (day >= f.submitTime[0] && day <= f.submitTime[1]))
}))

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }

const statistics = computed(() => {
  void revision.value
  const total = verificationAuditList.length
  const count = (status) => verificationAuditList.filter((a) => a.status === status).length
  const approved = count(VERIFICATION_STATUS.APPROVED)
  const rejected = count(VERIFICATION_STATUS.REJECTED)
  const rate = (value) => (total > 0 ? ((value / total) * 100).toFixed(1) : '0')
  return [
    { label: '待审核', value: count(VERIFICATION_STATUS.PENDING), hint: '需处理' },
    { label: '已通过', value: approved, hint: `通过率 ${rate(approved)}%` },
    { label: '已拒绝', value: rejected, hint: `拒绝率 ${rate(rejected)}%` },
    { label: '总申请', value: total, hint: '全部申请' }
  ]
})

const columns = [
  { key: 'user', title: '用户信息', width: 220, fixed: 'left' },
  { key: 'level', title: '认证等级', width: 230 },
  { key: 'documents', title: '认证资料', width: 100, align: 'right' },
  { key: 'status', title: '状态', width: 90 },
  { key: 'submitTime', title: '申请时间', width: 180 },
  { key: 'actions', title: '操作', width: 80, fixed: 'right' }
]

const viewDetail = (audit) => {
  selectedAudit.value = audit
  showDetailModal.value = true
  auditAction.value = null
  auditNote.value = ''
}

const closeDetail = () => {
  showDetailModal.value = false
  selectedAudit.value = null
  auditAction.value = null
  auditNote.value = ''
}

const startAuditAction = (action) => { auditAction.value = action }

const submitAudit = () => {
  if (!selectedAudit.value || !auditAction.value) return
  const idx = verificationAuditList.findIndex(a => a.id === selectedAudit.value.id)
  if (idx === -1) return
  const now = new Date().toISOString()
  const audit = verificationAuditList[idx]
  // State guard: an application that is no longer pending cannot be reviewed again.
  if (audit.status !== VERIFICATION_STATUS.PENDING) {
    message.warning('该申请已处理，请勿重复审核')
    closeDetail()
    fetchAudits()
    return
  }
  if (auditAction.value === 'approve') {
    audit.status = VERIFICATION_STATUS.APPROVED
    audit.auditTime = now
    audit.auditor = 'admin_current'
    message.success('审核通过！')
  } else if (auditAction.value === 'reject') {
    audit.status = VERIFICATION_STATUS.REJECTED
    audit.auditTime = now
    audit.auditor = 'admin_current'
    audit.rejectReason = auditNote.value || '不符合认证要求'
    message.success('已拒绝申请！')
  } else if (auditAction.value === 'resubmit') {
    audit.status = VERIFICATION_STATUS.RESUBMIT
    audit.auditTime = now
    audit.auditor = 'admin_current'
    audit.rejectReason = auditNote.value || '需要补充材料'
    message.success('已要求用户补件！')
  }
  revision.value += 1
  closeDetail()
  fetchAudits()
}

const previewDocument = (doc) => {
  message.info(`预览文档：${getDocTypeLabel(doc.type)}（演示环境不提供图片/PDF 预览）`)
}

const exportData = () => {
  message.info(`已按当前筛选条件准备导出 ${rows.value.length} 条审核申请（演示环境不生成文件）`)
}
</script>

<template>
  <PageShell>
    <SearchForm name="verification-audit-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <Card :bordered="false" title="审核概况">
      <Row :gutter="24">
        <Col v-for="stat in statistics" :key="stat.label" :xs="12" :md="6">
          <Statistic :title="stat.label" :value="stat.value" />
          <TypographyText type="secondary">{{ stat.hint }}</TypographyText>
        </Col>
      </Row>
    </Card>
    <AdminTable title="审核申请列表" v-model:page="page" :rows="rows" :columns="columns" row-key="id" :loading="loading" desktop-only>
      <template #toolbar>
        <Button @click="exportData"><template #icon><DownloadOutlined /></template>导出</Button>
      </template>
      <template #cell="{ column, record }">
        <Space v-if="column.key === 'user'" direction="vertical" :size="0">
          <TypographyText strong>{{ record.username }}</TypographyText>
          <span>{{ record.basicInfo?.realName ?? '—' }}</span>
          <TypographyText type="secondary">{{ record.email }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'level'" :size="4" wrap>
          <Tag :color="levelConfig[record.currentLevel]?.color">{{ levelConfig[record.currentLevel]?.text || record.currentLevel }}</Tag>
          <ArrowRightOutlined aria-label="申请" />
          <Tag :color="levelConfig[record.applyLevel]?.color">{{ levelConfig[record.applyLevel]?.text || record.applyLevel }}</Tag>
        </Space>
        <template v-else-if="column.key === 'documents'">{{ record.documents?.length || 0 }} 份</template>
        <Tag v-else-if="column.key === 'status'" :color="statusConfig[record.status]?.color">{{ statusConfig[record.status]?.text || record.status }}</Tag>
        <template v-else-if="column.key === 'submitTime'">{{ formatDate(record.submitTime) }}</template>
        <Button v-else-if="column.key === 'actions'" type="link" class="px-0" @click="viewDetail(record)">{{ record.status === VERIFICATION_STATUS.PENDING ? '审核' : '详情' }}</Button>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(showDetailModal && selectedAudit && selectedSiteInfo)" :mask-closable="false" :keyboard="false" :closable="false"  width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeDetail"><template #title><template v-if="Boolean(showDetailModal && selectedAudit && selectedSiteInfo)"><div class="flex items-center justify-between gap-3"><span>认证审核</span><a-button aria-label="关闭" html-type="button"   @click="closeDetail">×</a-button></div></template></template><template v-if="showDetailModal && selectedAudit && selectedSiteInfo"><div class="border-b border-slate-200 bg-gradient-to-r from-white to-slate-100 px-5 py-4">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="text-xs font-medium tracking-wide text-slate-500">认证审核详情抽屉</div>
                  <div class="mt-1 text-xl font-semibold text-slate-900">
                    {{ selectedSiteInfo.username }}（{{ selectedSiteInfo.uid }}）的审核信息
                  </div>
                  <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span class="rounded-full bg-slate-900 px-2.5 py-1 text-white">状态：{{ statusConfig[selectedAudit.status]?.text || selectedAudit.status }}</span>
                    <span class="rounded-full bg-white px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">申请等级：{{ selectedSiteInfo.applyLevel }}</span>
                    <span class="rounded-full bg-white px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">提交：{{ selectedSiteInfo.submitTime }}</span>
                  </div>
                </div>
              </div>
            </div>
<div class="min-h-0 flex-1 overflow-y-auto p-4">
              <div class="space-y-4">
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <section class="rounded-xl border border-slate-200 bg-white p-4">
                    <div class="text-xs text-slate-500">用户与申请</div>
                    <div class="mt-3 space-y-2 text-sm">
                      <div class="flex justify-between"><span class="text-slate-500">用户名</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.username }}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">邮箱</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.email }}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">当前等级</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.currentLevel }}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">申请等级</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.applyLevel }}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">提交时间</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.submitTime }}</span></div>
                    </div>
                  </section>

                  <section class="rounded-xl border border-slate-200 bg-white p-4">
                    <div class="text-xs text-slate-500">站内进度</div>
                    <div class="mt-3 space-y-2 text-sm">
                      <div class="flex justify-between"><span class="text-slate-500">审核状态</span><span class="font-medium text-slate-900">{{ statusConfig[selectedAudit.status]?.text || selectedAudit.status }}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">总材料数</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.docCount }}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">图片数</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.imageCount }}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">PDF 数</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.pdfCount }}</span></div>
                    </div>
                  </section>

                </div>

                <section class="rounded-xl border border-slate-200 bg-white p-4">
                  <div class="text-xs text-slate-500">初级认证区域</div>
                  <div class="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                    <div class="rounded-lg bg-slate-50 px-3 py-2"><span class="text-slate-500">国家：</span><span class="font-medium text-slate-900">{{ selectedAudit.basicInfo?.nationality || '-' }}</span></div>
                    <div class="rounded-lg bg-slate-50 px-3 py-2"><span class="text-slate-500">地址：</span><span class="font-medium text-slate-900">{{ selectedAudit.basicInfo?.address || '-' }}</span></div>
                    <div class="rounded-lg bg-slate-50 px-3 py-2"><span class="text-slate-500">姓名：</span><span class="font-medium text-slate-900">{{ selectedAudit.basicInfo?.realName || '-' }}</span></div>
                    <div class="rounded-lg bg-slate-50 px-3 py-2"><span class="text-slate-500">证件号码：</span><span class="font-medium text-slate-900">{{ selectedAudit.basicInfo?.idNumber || '-' }}</span></div>
                    <div class="rounded-lg bg-slate-50 px-3 py-2 md:col-span-2"><span class="text-slate-500">邮箱：</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.email || '-' }}</span></div>
                  </div>
                </section>

                <section class="rounded-xl border border-slate-200 bg-white p-4">
                  <div class="mb-3 flex items-center justify-between">
                    <div class="text-xs text-slate-500">提交材料（站内）</div>
                  </div>
                  <div class="space-y-2">
                    <div
                      v-for="(doc, index) in selectedAudit.documents"
                      :key="`${doc.type}-${index}`"
                      class="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <div class="min-w-0">
                        <div class="font-medium text-slate-900">{{ getDocTypeLabel(doc.type) }}</div>
                        <div class="mt-0.5 truncate text-xs text-slate-500">{{ formatDate(doc.uploadTime) }} · {{ doc.url }}</div>
                      </div>
                      <a-button class="shrink-0" @click="previewDocument(doc)" html-type="button">预览</a-button>
                    </div>
                    <div v-if="!selectedAudit.documents?.length" class="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                      暂无上传材料
                    </div>
                  </div>
                </section>
              </div>
            </div></template><template #footer><template v-if="Boolean(showDetailModal && selectedAudit && selectedSiteInfo)"><section class="shrink-0 border-t border-slate-200 bg-white px-5 py-4">
              <div class="text-xs text-slate-500">审核操作</div>
              <div class="mt-3 flex flex-wrap justify-end gap-2">
                <a-button class="" @click="closeDetail" html-type="button">关闭</a-button>
                <a-button class="" @click="startAuditAction('approve')" html-type="button" type="primary">通过</a-button>
                <a-button class="" @click="startAuditAction('resubmit')" html-type="button">要求补件</a-button>
                <a-button class="" @click="startAuditAction('reject')" html-type="button" danger>拒绝</a-button>
              </div>

              <div v-if="auditAction" class="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div class="text-sm font-medium text-slate-900">
                  {{
                    auditAction === 'approve'
                      ? '确认审核通过'
                      : auditAction === 'resubmit'
                        ? '填写补件说明'
                        : '填写拒绝原因'
                  }}
                </div>
                <a-textarea v-if="auditAction !== 'approve'" v-model:value="auditNote" :rows="3" class="mt-2 w-full" :placeholder="auditAction === 'reject' ? '请填写拒绝原因' : '请填写补件说明'" />
                <div class="mt-3 flex justify-end gap-2">
                  <a-button class="" @click="submitAudit" html-type="button" type="primary">确认提交</a-button>
                  <a-button class="" @click="auditAction = null" html-type="button">取消</a-button>
                </div>
              </div>
            </section></template></template></a-modal>
  </PageShell>
</template>
