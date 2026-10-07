<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { DownloadOutlined, FileExcelOutlined, SettingOutlined } from '@ant-design/icons-vue'
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
const reportColumns = computed(() => columnRegistry.filter(column => tableColumnLayoutState.appliedLayout.includes(column.id)).map(column => ({ key: column.id, title: column.label, width: column.id === 'amount' ? 160 : 180 })))
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
const draft = reactive(defaultUserReportFilters())
const report = ref(null)
const agents = ref([])
const employees = ref([])
const error = ref('')
const dateError = computed(() => error.value.includes('日期'))
const errorRef = ref(null)
const headingRef = ref(null)
const page = ref(1)
const pageSize = ref(10)
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
const pages = computed(() => Math.max(1, Math.ceil((report.value?.rows.length || 0) / pageSize.value)))
const rows = computed(() => report.value?.rows.slice((page.value - 1) * pageSize.value, page.value * pageSize.value) || [])
const dirty = computed(() => report.value && Object.keys(draft).some(key => draft[key].trim() !== report.value.filters[key]))
const agentOptions = computed(() => [{ value: '', label: '全部代理' }, { value: 'unassigned', label: '未分配代理' }, ...agents.value.map(userOption)])
// Keep the full option set, so changing the agent never silently replaces a
// selected salesperson. Incompatible combinations receive a query error.
const employeeOptions = computed(() => [{ value: '', label: '全部业务员' }, { value: 'unassigned', label: '未分配业务员' }, ...employees.value.map(userOption)])
const userTypeOptions = [{ value: '', label: '全部类型' }, ...depositUserTypeOptions]
const format = (value, precision = 8) => value == null ? '—' : Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: precision })
function userOption(user) {
  const uid = String(user.uid ?? user.id).replace(/^user_/, '')
  return { value: user.id, label: `${user.username} · UID ${uid}`, description: user.email || '未设置邮箱', searchText: `${user.id} UID ${uid} ${user.username} ${user.email || ''}` }
}
function filterUserOption(input, option) {
  return String(option.searchText || option.label).toLowerCase().includes(input.trim().toLowerCase())
}
function clearArtifact() {
  receipt.value = ''
  exportError.value = ''
}
async function query() {
  const generation = ++queryGeneration
  const snapshot = { ...draft }
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
    await nextTick()
    if (live && generation === queryGeneration) errorRef.value?.focus()
  } finally {
    if (live && generation === queryGeneration) loading.value = false
  }
}
function reset() {
  Object.assign(draft, defaultUserReportFilters())
  query()
}
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
onMounted(async () => {
  document.addEventListener('pointerdown', outsideColumns)
  await query()
  if (live && !error.value) headingRef.value?.focus()
})
onUnmounted(() => { live = false; unsubscribeTasks(); releaseTaskBackground(); clearArtifact(); document.removeEventListener('pointerdown', outsideColumns) })
</script>

<template>
  <section class="user-deposit-report space-y-5" aria-labelledby="user-deposit-report-title">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 id="user-deposit-report-title" ref="headingRef" tabindex="-1" class="text-2xl font-bold text-slate-900">用户充值报表</h1>
        <p class="mt-1 text-sm text-slate-500">每笔充值单独展示，支持按用户类型、所属代理、所属业务员和充值时间查询。用户类型按当前账号身份展示。</p>
      </div>
    </header>
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
      <a-alert v-if="taskError" :message="taskError" type="error" show-icon />
      <template #footer><a-button v-if="activeExport?.status !== 'succeeded'" @click="exportProgressOpen = false">关闭</a-button></template>
    </a-modal>
    <a-modal v-model:open="tasksOpen" title="导出文件下载" :width="960" :mask-closable="false" :footer="null" class="deposit-export-modal" :after-close="() => releaseTaskBackground()" :body-style="{ maxHeight: '65vh', overflowY: 'auto' }">
      <a-alert v-if="taskError" :message="taskError" type="error" show-icon class="mb-3" />
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

    <a-card :bordered="false"><a-form :model="draft" layout="vertical" aria-label="用户充值查询" @finish="query">
      <div class="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label class="report-field">所属代理
          <a-select v-model:value="draft.agentId" :options="agentOptions" show-search :filter-option="filterUserOption" :virtual="false" placeholder="输入 UID 或邮箱搜索" aria-label="所属代理，可按 UID 或邮箱搜索" not-found-content="未找到匹配的 UID 或邮箱">
            <template #option="option">
              <div>{{ option.label }}</div>
              <div v-if="option.description" class="text-xs font-normal text-slate-500">{{ option.description }}</div>
            </template>
          </a-select>
        </label>
        <label class="report-field">所属业务员
          <a-select v-model:value="draft.employeeId" :options="employeeOptions" show-search :filter-option="filterUserOption" :virtual="false" placeholder="输入 UID 或邮箱搜索" aria-label="所属业务员，可按 UID 或邮箱搜索" not-found-content="未找到匹配的 UID 或邮箱">
            <template #option="option">
              <div>{{ option.label }}</div>
              <div v-if="option.description" class="text-xs font-normal text-slate-500">{{ option.description }}</div>
            </template>
          </a-select>
        </label>
        <label class="report-field">用户类型
          <a-select v-model:value="draft.userType" :options="userTypeOptions" :virtual="false" aria-label="用户类型" />
        </label>
        <label class="report-field">用户 ID / 昵称<a-input v-model:value="draft.keyword" type="search" placeholder="输入用户 ID 或昵称" autocomplete="off" @keydown.enter="event => event.isComposing && event.preventDefault()" /></label>
        <label class="report-field">开始日期（UTC+8）<a-date-picker v-model:value="draft.startDate" value-format="YYYY-MM-DD" format="YYYY-MM-DD" :allow-clear="false" required :aria-invalid="dateError" :aria-describedby="dateError ? 'user-report-error' : undefined" /></label>
        <label class="report-field">结束日期（UTC+8）<a-date-picker v-model:value="draft.endDate" value-format="YYYY-MM-DD" format="YYYY-MM-DD" :allow-clear="false" required :aria-invalid="dateError" :aria-describedby="dateError ? 'user-report-error' : undefined" /></label>
        <div class="flex flex-wrap gap-2">
          <a-button html-type="submit" type="primary" :disabled="loading">{{ loading ? '正在查询…' : '查询报表' }}</a-button>
          <a-button html-type="button" @click="reset">重置为近 30 天</a-button>
        </div>
      </div>
      <p v-if="dirty" class="mt-2 text-sm text-amber-800">筛选条件尚未应用，请点击“查询报表”更新列表和导出数据。</p>
    </a-form></a-card>

    <div v-if="error" id="user-report-error" ref="errorRef" tabindex="-1" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      {{ error }}<span v-if="report">。以下保留上次成功查询结果，重新查询成功后可导出。</span>
      <a-button html-type="button" @click="query">重试查询</a-button>
    </div>

    <p v-if="loading" role="status" class="text-sm text-slate-600">正在加载充值订单<span v-if="report">，下方暂为上次查询结果</span>…</p>
    <template v-if="report">
      <section class="min-w-0 rounded-xl border border-slate-200 bg-white" aria-labelledby="report-results-title" data-capability-tier="display" :aria-busy="loading">
        <div class="space-y-3 border-b border-slate-200 p-4 sm:p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-baseline gap-x-5 gap-y-2">
                <h2 id="report-results-title" class="font-semibold text-slate-900">充值明细 <span class="ml-1 text-sm font-normal text-slate-500">{{ report.rows.length }} 笔充值</span></h2>
                <dl class="flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-1 text-sm font-normal text-slate-500" aria-label="当前查询结果按用户类型汇总充值 USDT">
                  <div v-for="(item, index) in report.typeTotals" :key="item.userType" class="flex min-w-0 flex-wrap items-baseline gap-y-1">
                    <dt><span v-if="index" class="mx-1" aria-hidden="true">/</span>{{ item.label }}：</dt>
                    <dd class="m-0"><span class="tabular-nums" :class="item.totalUsdt == null ? '' : 'font-semibold text-red-500'">{{ format(item.totalUsdt, 2) }}</span> USDT</dd>
                    <dd v-if="item.missingCount" class="m-0 ml-1 text-xs font-normal text-amber-800">（{{ item.missingCount }} 笔缺少折合金额，未计入）</dd>
                  </div>
                </dl>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <a-button ref="exportTrigger" html-type="button" :disabled="!report.rows.length || !!error || loading || exporting" :aria-busy="exporting" @click="exportCsv">{{ exporting ? '正在创建任务…' : '导出全部查询结果' }}</a-button>
              <a-button ref="taskTrigger" @click="taskError = ''; tasksOpen = true"><template #icon><DownloadOutlined /></template>导出文件下载<span v-if="runningTasks">（{{ runningTasks }}）</span></a-button>
              <RouterLink to="/admin/users/list" custom v-slot="{ href, navigate }"><a-button :href="href" @click="navigate">用户列表</a-button></RouterLink>
              <div ref="columnsRoot" class="column-settings" @keydown.esc.stop.prevent="closeColumns()" @focusout="event => { if (columnsOpen && event.relatedTarget && !columnsRoot?.contains(event.relatedTarget)) closeColumns(false) }">
                <a-popover :open="columnsOpen" :arrow="false" placement="bottomRight" :get-popup-container="trigger => trigger.parentElement">
                <a-button ref="columnsTrigger" type="text" size="small" aria-label="列设置" title="列设置" html-type="button" :aria-expanded="columnsOpen" aria-controls="report-column-settings" @click="toggleColumns">
                  <template #icon><SettingOutlined /></template>
                </a-button>
                <template #content>
                <section id="report-column-settings" class="column-panel" aria-label="充值报表列设置">
                  <div class="flex items-center justify-between gap-3 pb-2">
                    <a-checkbox ref="columnsAll" class="column-option font-semibold" :checked="allColumnsSelected" :indeterminate="someColumnsSelected && !allColumnsSelected" @change="selectAllColumns">列显示</a-checkbox>
                    <a-button type="link" size="small" html-type="button" @click="resetColumns">重置</a-button>
                  </div>
                  <fieldset class="column-options">
                    <legend class="sr-only">显示的报表字段</legend>
                    <a-checkbox v-for="column in columnRegistry" :key="column.id" class="column-option" :checked="tableColumnLayoutState.draftLayout.includes(column.id)" :disabled="column.required" @change="event => setColumnVisible(column.id, event.target.checked)">
                      <span>{{ column.label }}<span v-if="column.required" class="ml-1 text-xs text-slate-400">必显</span></span>
                    </a-checkbox>
                  </fieldset>
                </section>
                </template>
                </a-popover>
              </div>
            </div>
          </div>
          <p class="text-sm text-slate-500">用户类型：{{ report.userTypeLabel }}</p>
          <p role="status" class="sr-only">{{ columnsNotice }}</p>
          <p v-if="receipt" role="status" class="text-sm text-emerald-800">{{ receipt }}</p>
          <p v-if="exportError" role="alert" class="text-sm text-rose-700">{{ exportError }}</p>
        </div>

        <div v-if="!rows.length" class="px-4 py-10 text-center">
          <p class="font-medium text-slate-800">当前条件没有充值记录</p>
          <p class="mt-2 text-sm text-slate-500">可调整用户类型、充值日期、代理、业务员或用户关键词后重新查询。</p>
          <a-button html-type="button" @click="reset">重置筛选条件</a-button>
        </div>
        <a-table v-else :columns="reportColumns" :data-source="rows" row-key="orderId" :pagination="false" :scroll="{ x: 1100 }" size="middle"><template #bodyCell="{ column, record: row }"><template v-if="column.key === 'order'"><span class="block font-semibold text-slate-900">{{ row.orderId }}</span><span class="mt-1 block text-xs text-slate-500">{{ userReportTime(row.submitTime) }}</span></template>
          <template v-if="column.key === 'user'"><div><span class="block font-medium text-slate-900">{{ row.nickname }}</span><div class="mt-1 flex flex-wrap items-center gap-1"><span class="text-xs text-slate-500">{{ row.userId }}</span><a-tag :color="row.userType === 'agent' ? 'purple' : row.userType === 'salesperson' ? 'blue' : undefined">{{ depositUserTypeLabel(row.userType) }}</a-tag></div></div></template>
          <template v-if="column.key === 'agent'"><div><span class="block">{{ row.agentId || '未分配代理' }}</span><span class="mt-1 block text-xs text-slate-500">{{ row.agentEmail || (row.agentId ? '未设置邮箱' : '—') }}</span></div></template>
          <template v-if="column.key === 'employee'"><div><span class="block">{{ row.employeeId || '未分配业务员' }}</span><span class="mt-1 block text-xs text-slate-500">{{ row.employeeEmail || (row.employeeId ? '未设置邮箱' : '—') }}</span></div></template>
          <template v-if="column.key === 'amount'"><div><span>{{ format(row.amount) }}</span><span class="mt-1 block text-xs text-slate-500">{{ row.coin }}</span></div></template>
          <template v-if="column.key === 'usdt'"><span>{{ format(row.usdtValue, 2) }}</span></template>
          <template v-if="column.key === 'status'"><div><a-tag color="success">{{ depositReportStatus(row.status) }}</a-tag><span class="mt-1 block text-xs text-slate-500">{{ userReportTime(row.creditedTime) }}</span></div></template></template></a-table>
        <div class="flex justify-end border-t border-slate-200 p-4"><a-pagination v-model:current="page" v-model:page-size="pageSize" :total="report.rows.length" :page-size-options="['10', '20', '50']" show-size-changer :show-total="total => `共 ${total} 条`" @show-size-change="page = 1" /></div>
      </section>
    </template>
  </section>
</template>

<style scoped>
.user-deposit-report { min-width: 0; padding: env(safe-area-inset-top, 0) env(safe-area-inset-right, 0) max(1rem, env(safe-area-inset-bottom, 0)) env(safe-area-inset-left, 0); overflow-wrap: anywhere; }
.report-button { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; gap: .5rem; border: 1px solid #cbd5e1; border-radius: .5rem; padding: .5rem .875rem; background: #fff; color: #334155; font-size: .875rem; font-weight: 500; }
.report-button:hover:not(:disabled) { background: #f8fafc; }
.report-primary, .report-primary:hover:not(:disabled) { background: #2563eb; color: white; border-color: #2563eb; }
.report-button:disabled { cursor: not-allowed; opacity: .45; }
.user-deposit-report :deep(:focus-visible) { outline: 2px solid #2563eb; outline-offset: 3px; }
.export-file-card { display: flex; align-items: center; gap: 16px; padding: 16px; border: 1px solid #e8ecef; border-radius: 8px; background: #fafcfb; flex-wrap: wrap; }
.export-file-icon { display: grid; place-items: center; width: 48px; height: 56px; flex-shrink: 0; border-radius: 8px; background: #e8f5ed; color: #217346; font-size: 30px; }
.report-field { display: flex; min-width: 0; flex-direction: column; gap: .25rem; font-size: .875rem; font-weight: 500; color: #374151; }
.column-settings { position: relative; }
.column-panel { width: 216px; max-width: calc(100vw - 4rem); }
.column-options { padding: 0; max-height: 60vh; max-height: 60dvh; overflow-y: auto; }
.column-option { display: flex; align-items: center; min-height: 30px; margin-inline-start: 0; font-size: .875rem; color: #334155; cursor: pointer; }

@media (pointer: coarse) { .column-option { min-height: 44px; } }
</style>

<style>
.deposit-export-modal { top: max(16px, env(safe-area-inset-top)); padding-bottom: max(16px, env(safe-area-inset-bottom)); }
.deposit-export-modal .ant-modal-content { max-height: calc(100vh - 32px); max-height: calc(100dvh - 32px); overflow: hidden; display: flex; flex-direction: column; }
.deposit-export-modal .ant-modal-body { min-height: 0; overflow: auto; }
.deposit-export-modal .ant-modal-header { flex-shrink: 0; padding-right: 32px; }
@media (prefers-reduced-motion: reduce) { .deposit-export-modal, .deposit-export-modal * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
</style>
