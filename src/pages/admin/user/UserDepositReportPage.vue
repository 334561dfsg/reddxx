<script setup>
// 用户充值报表 — Ant Design Pro report page (2026-11-28): query card (EarnSearchForm; the old combined 用户 ID / 昵称
// box is split into two fields, the two dates into one required range), per-type USDT totals as a Statistic card, and
// the detail table card (EarnAdminTable) with export, export-file and column-setting tools in its toolbar. Export
// tasks, column preferences and the error/retry toast are unchanged.
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { Button, Card, Col, Row, Space, Statistic, Tag, TypographyText } from 'ant-design-vue'
import { DownloadOutlined, FileExcelOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import { getUserStaffRepository } from '../../../admin/repositories/userStaffRepository.js'
import { defaultUserReportFilters, depositUserTypeOptions, depositUserTypeLabel, depositReportStatus, userReportTime } from '../../../features/user-staff/userDepositReport.js'
import { getUserDepositReport } from '../../../admin/repositories/userDepositReportRepository.js'

import { getDepositExportTasks } from '../../../features/user-staff/depositExportTasks.js'

// Column preferences only affect this page's display; CSV always includes all fields.
const columnRegistry = [
  { id: 'order', label: '充值单号 / 时间', required: true },
  { id: 'user', label: '用户 ID / 昵称 / 类型', required: true },
  { id: 'agent', label: '代理 ID / 邮箱' },
  { id: 'employee', label: '业务员 ID / 邮箱' },
  { id: 'amount', label: '充值金额 / 币种', required: true },
  { id: 'usdt', label: '折合 USDT' },
  { id: 'status', label: '状态 / 入账时间', required: true }
]
const defaultColumns = () => columnRegistry.map(column => column.id)
const tableColumnLayoutState = reactive({
  columnLayoutOwnerId: 'user-deposit-report-columns',
  columnRegistry,
  draftLayout: defaultColumns(),
  appliedLayout: defaultColumns(),
  persistedLayout: null
})
const columnLayout = { order: { width: 200 }, user: { width: 200 }, agent: { width: 200 }, employee: { width: 200 }, amount: { width: 170, align: 'right' }, usdt: { width: 150, align: 'right', title: '折合（USDT）' }, status: { width: 170 } }
const reportColumns = computed(() => columnRegistry.filter(column => tableColumnLayoutState.appliedLayout.includes(column.id)).map(column => ({ key: column.id, title: column.label, ...columnLayout[column.id] })))
const columnsOpen = ref(false)
const columnsRoot = ref(null)
const columnsTrigger = ref(null)
const columnsAll = ref(null)
const columnsNotice = ref('')
watch(columnsAll, control => { if (control && columnsOpen.value) nextTick(() => { if (live && columnsOpen.value) control.focus() }) }, { flush: 'post' })
const optionalColumns = columnRegistry.filter(column => !column.required)
const allColumnsSelected = computed(() => optionalColumns.every(column => tableColumnLayoutState.draftLayout.includes(column.id)))
const someColumnsSelected = computed(() => optionalColumns.some(column => tableColumnLayoutState.draftLayout.includes(column.id)))
async function toggleColumns() {
  if (columnsOpen.value) { closeColumns(); return }
  tableColumnLayoutState.draftLayout = [...tableColumnLayoutState.appliedLayout]
  columnsOpen.value = true
  await nextTick()
  if (live && columnsOpen.value) columnsAll.value?.focus()
}
function closeColumns(restoreFocus = true) {
  columnsOpen.value = false
  tableColumnLayoutState.draftLayout = [...tableColumnLayoutState.appliedLayout]
  if (restoreFocus) (columnsTrigger.value?.$el || columnsTrigger.value)?.focus()
}
function applyColumns() {
  tableColumnLayoutState.appliedLayout = columnRegistry.filter(column => column.required || tableColumnLayoutState.draftLayout.includes(column.id)).map(column => column.id)
  columnsNotice.value = `已显示 ${tableColumnLayoutState.appliedLayout.length} 列`
}
function setColumnVisible(id, checked) {
  tableColumnLayoutState.draftLayout = checked ? [...tableColumnLayoutState.draftLayout, id] : tableColumnLayoutState.draftLayout.filter(value => value !== id)
  applyColumns()
}
function resetColumns() {
  tableColumnLayoutState.draftLayout = defaultColumns()
  applyColumns()
}
function selectAllColumns(event) {
  tableColumnLayoutState.draftLayout = columnRegistry.filter(column => column.required || event.target.checked).map(column => column.id)
  applyColumns()
}
function outsideColumns(event) {
  if (columnsOpen.value && !columnsRoot.value?.contains(event.target)) closeColumns(false)
}
// Applied query: the query card keeps its own draft; 查询 replaces this, 重置 restores the last-30-days default.
const blank = () => {
  const defaults = defaultUserReportFilters()
  return { date: [defaults.startDate, defaults.endDate], userType: 'all', userId: '', nickname: '', agentId: 'all', employeeId: 'all' }
}
const filters = ref(blank())
const report = ref(null)
const agents = ref([])
const employees = ref([])
const error = ref('')
const page = ref(1)
const receipt = ref('')
const exportError = ref('')
const exporting = ref(false)
const tasksOpen = ref(false)
const exportProgressOpen = ref(false)
const exportTrigger = ref(null)
const activeExportId = ref('')
const taskTrigger = ref(null)
let taskBackground = null
let taskBackgroundWasInert = false
function releaseTaskBackground(target = taskTrigger) {
  if (taskBackground) taskBackground.inert = taskBackgroundWasInert
  taskBackground = null
  if (live) nextTick(() => (target?.value || target)?.$el?.focus())
}
watch([tasksOpen, exportProgressOpen], async ([tasks, progress]) => {
  if (!tasks && !progress) return
  await nextTick()
  if ((!tasksOpen.value && !exportProgressOpen.value) || !live) return
  if (!taskBackground) {
    taskBackground = document.getElementById('app')
    taskBackgroundWasInert = taskBackground?.inert || false
  }
  if (taskBackground) taskBackground.inert = true
  document.querySelectorAll('.deposit-export-modal .ant-modal-close').forEach(button => button.setAttribute('aria-label', '关闭'))
})
const taskService = getDepositExportTasks()
const exportTasks = ref(taskService.list())
const unsubscribeTasks = taskService.subscribe(tasks => { exportTasks.value = tasks })
const taskError = ref('')
const activeExport = computed(() => exportTasks.value.find(task => task.id === activeExportId.value))
const exportProgressTitle = computed(() => activeExport.value?.status === 'succeeded' ? '导出完成' : activeExport.value?.status === 'failed' ? '导出失败' : '导出中')
const runningTasks = computed(() => exportTasks.value.filter(task => task.status === 'running').length)
const taskColumns = [
  { title: '报表 / 查询范围', key: 'report' },
  { title: '创建时间（UTC+8）', key: 'created', width: 175 },
  { title: '条数', dataIndex: 'count', width: 70 },
  { title: '状态', key: 'status', width: 110 },
  { title: '操作', key: 'action', width: 90 }
]
function downloadTask(task) {
  taskError.value = ''
  try {
    const artifact = taskService.download(task.id)
    const isExcel = artifact.format === 'xlsx'
    const content = isExcel ? Uint8Array.from(atob(artifact.csv), char => char.charCodeAt(0)) : artifact.csv
    const url = URL.createObjectURL(new Blob([content], { type: isExcel ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = artifact.filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (cause) { taskError.value = cause.message }
}
function retryTask(task) {
  taskError.value = ''
  try { taskService.retry(task.id) } catch (cause) { taskError.value = cause.message }
}
let live = true
const loading = ref(false)
let queryGeneration = 0
const rows = computed(() => report.value?.rows || [])
// Keep the full option set, so changing the agent never silently replaces a
// selected salesperson. Incompatible combinations receive a query error.
const agentOptions = computed(() => [{ value: 'all', label: '全部代理' }, { value: 'unassigned', label: '未分配代理' }, ...agents.value.map(userOption)])
const employeeOptions = computed(() => [{ value: 'all', label: '全部业务员' }, { value: 'unassigned', label: '未分配业务员' }, ...employees.value.map(userOption)])
const userTypeOptions = [{ value: 'all', label: '全部类型' }, ...depositUserTypeOptions]
const fields = computed(() => [
  { key: 'date', label: '充值日期', range: true },
  { key: 'userType', label: '用户类型', options: userTypeOptions },
  { key: 'userId', label: '用户 ID' },
  { key: 'nickname', label: '昵称' },
  { key: 'agentId', label: '所属代理', searchable: true, options: agentOptions.value },
  { key: 'employeeId', label: '所属业务员', searchable: true, options: employeeOptions.value }
])
const format = (value, precision = 8) => value == null ? '—' : Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: precision })
// The label carries UID and email, so typing either one finds the person (Select filters by label).
function userOption(user) {
  const uid = String(user.uid ?? user.id).replace(/^user_/, '')
  return { value: user.id, label: `${user.username} · UID ${uid} · ${user.email || '未设置邮箱'}` }
}
const allToBlank = value => (value === 'all' ? '' : value || '')
function loadStaffOptions() {
  try {
    const repository = getUserStaffRepository()
    agents.value = repository.agents()
    employees.value = repository.employees()
  } catch { /* the query reports repository failures */ }
}
function clearArtifact() {
  receipt.value = ''
  exportError.value = ''
}
async function query() {
  const generation = ++queryGeneration
  const f = filters.value
  const snapshot = {
    startDate: f.date?.[0] || '', endDate: f.date?.[1] || '', userType: allToBlank(f.userType),
    agentId: allToBlank(f.agentId), employeeId: allToBlank(f.employeeId), keyword: '', userId: f.userId || '', nickname: f.nickname || ''
  }
  error.value = ''
  loading.value = true
  clearArtifact()
  try {
    const repository = getUserStaffRepository()
    agents.value = repository.agents()
    employees.value = repository.employees()
    const result = await getUserDepositReport(snapshot)
    if (!live || generation !== queryGeneration) return
    report.value = result
    page.value = 1
  } catch (cause) {
    if (!live || generation !== queryGeneration) return
    error.value = cause.message || '充值报表加载失败，请重试'
  } finally {
    if (live && generation === queryGeneration) loading.value = false
  }
}
function search(values) { filters.value = { ...blank(), ...values }; query() }
function reset() { filters.value = blank(); query() }
async function exportCsv() {
  if (!report.value?.rows.length || error.value || loading.value || exporting.value) return
  exporting.value = true
  exportError.value = ''
  taskError.value = ''
  try {
    activeExportId.value = taskService.create(report.value)
    receipt.value = ''
    exportProgressOpen.value = true
    await nextTick()
  } catch (cause) { exportError.value = cause.message || '任务创建失败，请重试' }
  finally { exporting.value = false }
}
loadStaffOptions()
onMounted(async () => {
  document.addEventListener('pointerdown', outsideColumns)
  await query()
})
onUnmounted(() => { live = false; unsubscribeTasks(); releaseTaskBackground(); clearArtifact(); document.removeEventListener('pointerdown', outsideColumns) })
</script>

<template>
  <PageShell class="user-deposit-report">
    <a-modal v-model:open="exportProgressOpen" :title="exportProgressTitle" :width="560" :mask-closable="false" class="deposit-export-modal" :after-close="() => releaseTaskBackground(exportTrigger)">
      <div class="py-6 text-center">
        <template v-if="activeExport?.status === 'succeeded'">
          <div class="export-file-card">
            <div class="export-file-icon"><FileExcelOutlined /></div>
            <div class="min-w-0 flex-1 text-left">
              <div class="font-medium text-slate-900 break-all">{{ activeExport.filename }}</div>
              <div class="mt-1 text-xs text-slate-500">Excel 工作簿 · {{ activeExport.count }} 条记录</div>
            </div>
            <a-button type="primary" @click="downloadTask(activeExport)"><template #icon><DownloadOutlined /></template>下载</a-button>
          </div>
        </template>
        <div v-else role="status">
          <a-spin v-if="activeExport?.status === 'running'" size="large" />
          <p class="mt-5 text-sm text-slate-600">{{ activeExport?.status === 'failed' ? `导出失败：${activeExport.error}。可以关闭，稍后在“导出文件下载”中重试。` : '正在导出搜索结果，可以关闭，稍后在“导出文件下载”中下载。' }}</p>
        </div>
      </div>
      <FeedbackToast v-if="taskError" type="error" :source="() => (taskError) ? ((taskError)) : ''"></FeedbackToast>
      <template #footer><a-button v-if="activeExport?.status !== 'succeeded'" @click="exportProgressOpen = false">关闭</a-button></template>
    </a-modal>
    <a-modal v-model:open="tasksOpen" title="导出文件下载" :width="960" :mask-closable="false" :footer="null" class="deposit-export-modal" :after-close="() => releaseTaskBackground()" :body-style="{ maxHeight: '65vh', overflowY: 'auto' }">
      <FeedbackToast v-if="taskError" type="error" :source="() => (taskError) ? ((taskError)) : ''"></FeedbackToast>
      <a-table :columns="taskColumns" :data-source="exportTasks" row-key="id" size="small" :pagination="{ pageSize: 8, showSizeChanger: false }" :scroll="{ x: 780 }" :locale="{ emptyText: '暂无导出文件，请先导出充值报表' }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'report'"><div class="font-medium">用户充值报表</div><div class="text-xs text-slate-500">{{ record.range }}</div><div class="text-xs text-slate-500">{{ record.scope }}</div></template>
          <template v-else-if="column.key === 'created'">{{ userReportTime(record.createdAt) }}</template>
          <template v-else-if="column.key === 'status'"><a-tag :color="record.status === 'succeeded' ? 'success' : record.status === 'failed' ? 'error' : 'processing'">{{ record.status === 'succeeded' ? '生成成功' : record.status === 'failed' ? '生成失败' : '生成中' }}</a-tag><div v-if="record.error" class="text-xs text-red-600">{{ record.error }}</div></template>
          <template v-else-if="column.key === 'action'"><a-button v-if="record.status === 'succeeded'" type="link" size="small" :aria-label="`下载 ${record.filename}`" @click="downloadTask(record)">下载</a-button><a-button v-else-if="record.status === 'failed'" type="link" size="small" @click="retryTask(record)">重试</a-button><span v-else class="text-slate-400">请稍候</span></template>
        </template>
      </a-table>
      <span role="status" class="sr-only">{{ runningTasks ? `${runningTasks} 个任务生成中` : '任务列表已更新' }}</span>
    </a-modal>

    <SearchForm name="user-deposit-report-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />

    <Card v-if="report" :bordered="false" title="按用户类型汇总（当前查询结果）">
      <Row :gutter="24">
        <Col v-for="item in report.typeTotals" :key="item.userType" :span="6">
          <Statistic :title="`${item.label}充值（USDT）`" :value="format(item.totalUsdt, 2)" />
          <TypographyText v-if="item.missingCount" type="warning">{{ item.missingCount }} 笔缺少折合金额，未计入</TypographyText>
        </Col>
      </Row>
    </Card>

    <AdminTable title="充值明细" v-model:page="page" :rows="rows" :columns="reportColumns" :loading="loading" row-key="orderId" desktop-only :aria-busy="loading">
      <template #toolbar>
        <Space :size="8">
          <FeedbackToast v-if="error" id="user-report-error" type="error" :source="() => (error) ? (([String((error) ?? ''),((report) ? [&quot;。以下保留上次成功查询结果，重新查询成功后可导出。&quot;].join('') : ''),''].join(''))) : ''"><Button @click="query"><template #icon><ReloadOutlined /></template>重试查询</Button></FeedbackToast>
          <FeedbackToast v-if="exportError" type="error" :source="() => (exportError) ? (exportError) : ''"></FeedbackToast>
          <Button ref="exportTrigger" type="primary" :disabled="!report?.rows.length || !!error || loading || exporting" :aria-busy="exporting" @click="exportCsv"><template #icon><FileExcelOutlined /></template>{{ exporting ? '正在创建任务…' : '导出全部查询结果' }}</Button>
          <Button ref="taskTrigger" @click="taskError = ''; tasksOpen = true"><template #icon><DownloadOutlined /></template>导出文件下载<span v-if="runningTasks">（{{ runningTasks }}）</span></Button>
          <div ref="columnsRoot" class="column-settings" @keydown.esc.stop.prevent="closeColumns()" @focusout="event => { if (columnsOpen && event.relatedTarget && !columnsRoot?.contains(event.relatedTarget)) closeColumns(false) }">
            <a-popover :open="columnsOpen" :arrow="false" placement="bottomRight" :get-popup-container="trigger => trigger.parentElement">
            <Button ref="columnsTrigger" type="text" aria-label="列设置" title="列设置" :aria-expanded="columnsOpen" aria-controls="report-column-settings" @click="toggleColumns">
              <template #icon><SettingOutlined /></template>
            </Button>
            <template #content>
            <section id="report-column-settings" class="column-panel" aria-label="充值报表列设置">
              <div class="column-panel-header">
                <a-checkbox ref="columnsAll" class="column-option" :checked="allColumnsSelected" :indeterminate="someColumnsSelected && !allColumnsSelected" @change="selectAllColumns">列显示</a-checkbox>
                <Button type="link" size="small" @click="resetColumns">重置</Button>
              </div>
              <fieldset class="column-options">
                <legend class="sr-only">显示的报表字段</legend>
                <a-checkbox v-for="column in columnRegistry" :key="column.id" class="column-option" :checked="tableColumnLayoutState.draftLayout.includes(column.id)" :disabled="column.required" @change="event => setColumnVisible(column.id, event.target.checked)">
                  <span>{{ column.label }}<TypographyText v-if="column.required" type="secondary"> 必显</TypographyText></span>
                </a-checkbox>
              </fieldset>
            </section>
            </template>
            </a-popover>
          </div>
        </Space>
        <span role="status" class="sr-only">{{ columnsNotice }}</span>
        <span v-if="receipt" role="status" class="sr-only">{{ receipt }}</span>
      </template>
      <template #cell="{ column, record: row }">
        <Space v-if="column.key === 'order'" direction="vertical" :size="0">
          <span class="font-mono">{{ row.orderId }}</span>
          <TypographyText type="secondary">{{ userReportTime(row.submitTime) }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'user'" direction="vertical" :size="0">
          <span>{{ row.nickname }} <Tag :color="row.userType === 'agent' ? 'purple' : row.userType === 'salesperson' ? 'blue' : undefined">{{ depositUserTypeLabel(row.userType) }}</Tag></span>
          <TypographyText type="secondary" class="font-mono">{{ row.userId }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'agent'" direction="vertical" :size="0">
          <span class="font-mono">{{ row.agentId || '未分配代理' }}</span>
          <TypographyText type="secondary">{{ row.agentEmail || (row.agentId ? '未设置邮箱' : '—') }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'employee'" direction="vertical" :size="0">
          <span class="font-mono">{{ row.employeeId || '未分配业务员' }}</span>
          <TypographyText type="secondary">{{ row.employeeEmail || (row.employeeId ? '未设置邮箱' : '—') }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'amount'" direction="vertical" :size="0" align="end">
          <span>{{ format(row.amount) }}</span>
          <TypographyText type="secondary">{{ row.coin }}</TypographyText>
        </Space>
        <span v-else-if="column.key === 'usdt'">{{ format(row.usdtValue, 2) }}</span>
        <Space v-else-if="column.key === 'status'" direction="vertical" :size="0">
          <Tag color="success">{{ depositReportStatus(row.status) }}</Tag>
          <TypographyText type="secondary">{{ userReportTime(row.creditedTime) }}</TypographyText>
        </Space>
        <template v-else>{{ row[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>
  </PageShell>
</template>

<style scoped>
.export-file-card { display: flex; align-items: center; gap: 16px; padding: 16px; border: 1px solid #e8ecef; border-radius: 8px; background: #fafcfb; flex-wrap: wrap; }
.export-file-icon { display: grid; place-items: center; width: 48px; height: 56px; flex-shrink: 0; border-radius: 8px; background: #e8f5ed; color: #217346; font-size: 30px; }
.column-settings { position: relative; }
.column-panel { width: 216px; max-width: calc(100vw - 4rem); }
.column-panel-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 8px; }
.column-options { padding: 0; max-height: 60vh; max-height: 60dvh; overflow-y: auto; }
.column-option { display: flex; align-items: center; min-height: 30px; margin-inline-start: 0; cursor: pointer; }

@media (pointer: coarse) { .column-option { min-height: 44px; } }
</style>

<style>
.deposit-export-modal { top: max(16px, env(safe-area-inset-top)); padding-bottom: max(16px, env(safe-area-inset-bottom)); }
.deposit-export-modal .ant-modal-content { max-height: calc(100vh - 32px); max-height: calc(100dvh - 32px); overflow: hidden; display: flex; flex-direction: column; }
.deposit-export-modal .ant-modal-body { min-height: 0; overflow: auto; }
.deposit-export-modal .ant-modal-header { flex-shrink: 0; padding-right: 32px; }
@media (prefers-reduced-motion: reduce) { .deposit-export-modal, .deposit-export-modal * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
</style>
