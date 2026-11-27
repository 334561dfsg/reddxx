<script setup>
// 认证日志 — Ant Design Pro list page (2026-11-28): query card (one input per field, explicit 查询/重置),
// overview Statistics, table card with toolbar and pagination, action type and levels as text Tags (the old type
// badge prefixed an icon glyph). The read-only detail dialog is unchanged apart from its task-specific title.
import { ref, computed } from 'vue'
import { Button, Card, Col, Row, Space, Statistic, Tag, TypographyText, message } from 'ant-design-vue'
import { ArrowRightOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import { verificationLogList } from '../../../admin/mock/verification'
import {
  LOG_ACTION_TYPE,
  LOG_ACTION_TYPE_OPTIONS
} from '../../../constants/verification'

const page = ref(1)
const visibleActionTypes = [
  LOG_ACTION_TYPE.AUDIT_APPROVED,
  LOG_ACTION_TYPE.AUDIT_REJECTED,
  LOG_ACTION_TYPE.AUDIT_RESUBMIT
]
const actionTypeOptions = LOG_ACTION_TYPE_OPTIONS.filter((it) => visibleActionTypes.includes(it.value))
const detailToneConfig = {
  [LOG_ACTION_TYPE.AUDIT_APPROVED]: {
    textClass: 'text-emerald-700',
    boxClass: 'border-emerald-200 bg-emerald-50 text-emerald-700'
  },
  [LOG_ACTION_TYPE.AUDIT_REJECTED]: {
    textClass: 'text-rose-700',
    boxClass: 'border-rose-200 bg-rose-50 text-rose-700'
  },
  [LOG_ACTION_TYPE.AUDIT_RESUBMIT]: {
    textClass: 'text-amber-700',
    boxClass: 'border-amber-200 bg-amber-50 text-amber-700'
  },
  [LOG_ACTION_TYPE.CONFIG_UPDATE]: {
    textClass: 'text-purple-700',
    boxClass: 'border-purple-200 bg-purple-50 text-purple-700'
  }
}

const blank = () => ({ userId: '', username: '', operator: '', description: '', actionType: 'all', actionTime: null })
const filters = ref(blank())
const fields = [
  { key: 'userId', label: '用户 ID' },
  { key: 'username', label: '用户名' },
  { key: 'operator', label: '操作人' },
  { key: 'description', label: '描述' },
  { key: 'actionType', label: '操作类型', options: [{ value: 'all', label: '全部类型' }, ...actionTypeOptions] },
  { key: 'actionTime', label: '操作时间', range: true }
]

const pad = (n) => String(n).padStart(2, '0')
const localDay = (value) => {
  const date = new Date(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())

const visibleLogs = computed(() => verificationLogList
  .filter((log) => visibleActionTypes.includes(log.actionType))
  .sort((a, b) => new Date(b.actionTime) - new Date(a.actionTime)))

const rows = computed(() => visibleLogs.value.filter((log) => {
  const f = filters.value
  const day = localDay(log.actionTime)
  return has(log.userId, f.userId) && has(log.username, f.username) && has(log.operator, f.operator) &&
    has(log.description, f.description) &&
    (f.actionType === 'all' || log.actionType === f.actionType) &&
    (!f.actionTime || (day >= f.actionTime[0] && day <= f.actionTime[1]))
}))

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }

const statistics = computed(() => {
  const today = new Date().toDateString()
  return [
    { label: '今日日志', value: visibleLogs.value.filter((log) => new Date(log.actionTime).toDateString() === today).length, suffix: '条' },
    { label: '总日志数', value: visibleLogs.value.length, suffix: '条' },
    { label: '审核操作', value: visibleLogs.value.length, suffix: '次' }
  ]
})

// 操作类型配置
const actionTypeConfig = {
  config_update: { text: '配置更新', color: 'purple' },
  audit_approved: { text: '审核通过', color: 'green' },
  audit_rejected: { text: '审核拒绝', color: 'red' },
  audit_resubmit: { text: '要求补件', color: 'gold' },
  level_upgrade: { text: '等级升级', color: 'blue' },
  level_downgrade: { text: '等级降级', color: 'orange' }
}

// 等级配置
const levelConfig = {
  none: { text: '未认证', color: 'default' },
  basic: { text: '初级认证', color: 'blue' },
  advanced: { text: '高级认证', color: 'purple' }
}

const columns = [
  { key: 'actionTime', title: '时间', width: 180, fixed: 'left' },
  { key: 'actionType', title: '操作类型', width: 110 },
  { key: 'user', title: '用户', width: 170 },
  { key: 'levels', title: '等级变更', width: 230 },
  { key: 'operator', title: '操作人', width: 110 },
  { key: 'description', title: '描述', width: 240 },
  { key: 'actions', title: '操作', width: 80, fixed: 'right' }
]

// 格式化日期
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 查看详情
const showDetailModal = ref(false)
const selectedLog = ref(null)

const selectedSiteInfo = computed(() => {
  if (!selectedLog.value) return null
  const log = selectedLog.value
  const details = log.details || {}
  const docList = Array.isArray(details.documents) ? details.documents : []
  const imageCount = docList.filter((d) => !String(d.url || '').toLowerCase().endsWith('.pdf')).length
  const pdfCount = docList.filter((d) => String(d.url || '').toLowerCase().endsWith('.pdf')).length
  return {
    uid: log.userId || '-',
    username: log.username || '-',
    operator: log.operator || '-',
    actionTypeText: actionTypeConfig[log.actionType]?.text || log.actionType,
    beforeLevel: levelConfig[log.beforeLevel]?.text || '-',
    afterLevel: levelConfig[log.afterLevel]?.text || '-',
    actionTime: formatDate(log.actionTime),
    ipAddress: log.ipAddress || '-',
    description: log.description || '-',
    auditId: details.auditId || '-',
    processTime: details.processTime || '-',
    reason: details.reason || '-',
    docCount: docList.length,
    imageCount,
    pdfCount,
    country: details.nationality || '-',
    city: details.city || '-',
    realName: details.realName || '-',
    idNumber: details.idNumber || '-',
    email: details.email || '-',
    documents: docList
  }
})

const viewDetail = (log) => {
  selectedLog.value = log
  showDetailModal.value = true
}

const closeDetail = () => {
  showDetailModal.value = false
  selectedLog.value = null
}

// Mock export: no file yet, so say so (operation feedback is toast-only).
const exportLogs = () => {
  message.info(`已按当前筛选条件准备导出 ${rows.value.length} 条认证日志（演示环境不生成文件）`)
}
</script>

<template>
  <PageShell>
    <SearchForm name="verification-log-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <Card :bordered="false" title="日志概况">
      <Row :gutter="24">
        <Col v-for="stat in statistics" :key="stat.label" :xs="12" :md="6">
          <Statistic :title="stat.label" :value="stat.value" :suffix="stat.suffix" />
        </Col>
      </Row>
    </Card>
    <AdminTable title="操作日志" v-model:page="page" :rows="rows" :columns="columns" row-key="id" desktop-only>
      <template #toolbar>
        <Button @click="exportLogs"><template #icon><DownloadOutlined /></template>导出</Button>
      </template>
      <template #cell="{ column, record }">
        <template v-if="column.key === 'actionTime'">{{ formatDate(record.actionTime) }}</template>
        <Tag v-else-if="column.key === 'actionType'" :color="actionTypeConfig[record.actionType]?.color">{{ actionTypeConfig[record.actionType]?.text || record.actionType }}</Tag>
        <Space v-else-if="column.key === 'user'" direction="vertical" :size="0">
          <TypographyText strong>{{ record.username }}</TypographyText>
          <TypographyText type="secondary" class="font-mono">{{ record.userId }}</TypographyText>
        </Space>
        <template v-else-if="column.key === 'levels'">
          <Space v-if="record.beforeLevel && record.afterLevel" :size="4" wrap>
            <Tag :color="levelConfig[record.beforeLevel]?.color">{{ levelConfig[record.beforeLevel]?.text || record.beforeLevel }}</Tag>
            <ArrowRightOutlined aria-label="变更为" />
            <Tag :color="levelConfig[record.afterLevel]?.color">{{ levelConfig[record.afterLevel]?.text || record.afterLevel }}</Tag>
          </Space>
          <TypographyText v-else type="secondary">—</TypographyText>
        </template>
        <Button v-else-if="column.key === 'actions'" type="link" class="px-0" @click="viewDetail(record)">详情</Button>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(showDetailModal && selectedLog && selectedSiteInfo)" :mask-closable="false" :keyboard="false" :closable="false"  width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeDetail"><template #title><template v-if="Boolean(showDetailModal && selectedLog && selectedSiteInfo)"><div class="flex items-center justify-between gap-3"><span>认证日志详情</span><a-button aria-label="关闭" html-type="button"   @click="closeDetail">×</a-button></div></template></template><template v-if="showDetailModal && selectedLog && selectedSiteInfo"><div class="border-b border-slate-200 bg-gradient-to-r from-white to-slate-100 px-5 py-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-xs font-medium tracking-wide text-slate-500">认证日志详情抽屉</div>
                <div class="mt-1 text-xl font-semibold text-slate-900">
                  {{ selectedSiteInfo.username }}（{{ selectedSiteInfo.uid }}）的日志详情
                </div>
                <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    class="rounded-full px-2.5 py-1 font-medium"
                    :class="actionTypeConfig[selectedLog.actionType]?.class || 'bg-slate-100 text-slate-700'"
                  >
                    类型：{{ selectedSiteInfo.actionTypeText }}
                  </span>
                  <span class="rounded-full bg-white px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">时间：{{ selectedSiteInfo.actionTime }}</span>
                  <span class="rounded-full bg-white px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">操作人：{{ selectedSiteInfo.operator }}</span>
                </div>
              </div>
            </div>
          </div>
<div class="min-h-0 flex-1 overflow-y-auto p-4">
            <div class="space-y-4">
              <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <section class="rounded-xl border border-slate-200 bg-white p-4">
                  <div class="text-xs text-slate-500">用户与申请</div>
                  <div class="mt-3 space-y-2 text-sm">
                    <div class="flex justify-between"><span class="text-slate-500">用户名</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.username }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">用户ID</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.uid }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">变更前等级</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.beforeLevel }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">变更后等级</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.afterLevel }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">审核ID</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.auditId }}</span></div>
                  </div>
                </section>

                <section class="rounded-xl border border-slate-200 bg-white p-4">
                  <div class="text-xs text-slate-500">站内进度</div>
                  <div class="mt-3 space-y-2 text-sm">
                    <div class="flex justify-between"><span class="text-slate-500">日志类型</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.actionTypeText }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">总材料数</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.docCount }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">图片数</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.imageCount }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">PDF 数</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.pdfCount }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">处理时长</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.processTime }}</span></div>
                  </div>
                </section>

                <section class="rounded-xl border border-slate-200 bg-white p-4">
                  <div class="text-xs text-slate-500">审核记录</div>
                  <div class="mt-3 space-y-2 text-sm">
                    <div class="flex justify-between"><span class="text-slate-500">操作时间</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.actionTime }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">操作人</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.operator }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">IP</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.ipAddress }}</span></div>
                    <div class="flex justify-between gap-3">
                      <span class="shrink-0 text-slate-500">审核描述</span>
                      <span
                        class="text-right font-medium"
                        :class="detailToneConfig[selectedLog.actionType]?.textClass || 'text-slate-900'"
                      >
                        {{ selectedSiteInfo.description }}
                      </span>
                    </div>
                  </div>
                  <div
                    v-if="selectedSiteInfo.reason !== '-'"
                    class="mt-3 rounded-lg border p-3 text-xs"
                    :class="detailToneConfig[selectedLog.actionType]?.boxClass || 'border-slate-200 bg-slate-50 text-slate-700'"
                  >
                    原因：{{ selectedSiteInfo.reason }}
                  </div>
                </section>
              </div>

              <section class="rounded-xl border border-slate-200 bg-white p-4">
                <div class="text-xs text-slate-500">初级认证区域</div>
                <div class="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                  <div class="rounded-lg bg-slate-50 px-3 py-2"><span class="text-slate-500">国家：</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.country }}</span></div>
                  <div class="rounded-lg bg-slate-50 px-3 py-2"><span class="text-slate-500">所在城市：</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.city }}</span></div>
                  <div class="rounded-lg bg-slate-50 px-3 py-2"><span class="text-slate-500">姓名：</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.realName }}</span></div>
                  <div class="rounded-lg bg-slate-50 px-3 py-2"><span class="text-slate-500">证件号码：</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.idNumber }}</span></div>
                  <div class="rounded-lg bg-slate-50 px-3 py-2 md:col-span-2"><span class="text-slate-500">邮箱：</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.email }}</span></div>
                </div>
              </section>

              <section class="rounded-xl border border-slate-200 bg-white p-4">
                <div class="mb-3 flex items-center justify-between">
                  <div class="text-xs text-slate-500">提交材料（站内）</div>
                </div>
                <div class="space-y-2">
                  <div
                    v-for="(doc, index) in selectedSiteInfo.documents"
                    :key="`${doc.type}-${index}`"
                    class="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <div class="min-w-0">
                      <div class="font-medium text-slate-900">{{ doc.type || '-' }}</div>
                      <div class="mt-0.5 truncate text-xs text-slate-500">{{ doc.url || '-' }}</div>
                    </div>
                  </div>
                  <div v-if="!selectedSiteInfo.documents.length" class="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                    暂无材料记录
                  </div>
                </div>
              </section>
            </div>
          </div></template><template #footer><template v-if="Boolean(showDetailModal && selectedLog && selectedSiteInfo)"><section class="shrink-0 border-t border-slate-200 bg-white px-5 py-4">
            <div class="mt-1 flex justify-end">
              <a-button class="" @click="closeDetail" html-type="button">关闭</a-button>
            </div>
          </section></template></template></a-modal>
  </PageShell>
</template>
