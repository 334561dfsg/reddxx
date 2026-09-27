<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import PanelSingleSelect from '../../../admin/components/form/PanelSingleSelect.vue'
import { getUserStaffRepository } from '../../../admin/repositories/userStaffRepository.js'
import { defaultUserReportFilters, userDepositCsv, depositReportStatus, userReportTime } from '../../../features/user-staff/userDepositReport.js'
import { getUserDepositReport } from '../../../admin/repositories/userDepositReportRepository.js'

// Column preferences only affect this page's display; CSV always includes all fields.
const columnRegistry = [
  { id: 'order', label: '充值单号 / 时间', required: true },
  { id: 'user', label: '用户 ID / 昵称', required: true },
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
const columnsOpen = ref(false)
const columnsRoot = ref(null)
const columnsTrigger = ref(null)
const columnsAll = ref(null)
const columnsNotice = ref('')
const optionalColumns = columnRegistry.filter(column => !column.required)
const allColumnsSelected = computed(() => optionalColumns.every(column => tableColumnLayoutState.draftLayout.includes(column.id)))
const someColumnsSelected = computed(() => optionalColumns.some(column => tableColumnLayoutState.draftLayout.includes(column.id)))
const visibleColumn = id => tableColumnLayoutState.appliedLayout.includes(id)
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
  if (restoreFocus) columnsTrigger.value?.focus()
}
function applyColumns() {
  tableColumnLayoutState.appliedLayout = columnRegistry.filter(column => column.required || tableColumnLayoutState.draftLayout.includes(column.id)).map(column => column.id)
  columnsNotice.value = `已显示 ${tableColumnLayoutState.appliedLayout.length} 列`
  closeColumns()
}
function selectAllColumns(event) {
  tableColumnLayoutState.draftLayout = columnRegistry.filter(column => column.required || event.target.checked).map(column => column.id)
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
const artifact = ref(null)
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
const format = (value, precision = 8) => value == null ? '—' : Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: precision })
function userOption(user) {
  return { value: user.id, label: `${user.username} · ${user.id}`, description: user.email || '未设置邮箱', searchText: `${user.id} ${user.username} ${user.email || ''}` }
}
function clearArtifact() {
  if (artifact.value) URL.revokeObjectURL(artifact.value.url)
  artifact.value = null
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
  clearArtifact()
  const snapshot = report.value
  await nextTick()
  if (!live || report.value !== snapshot || error.value || loading.value) { exporting.value = false; return }
  try {
    const blob = new Blob([userDepositCsv(snapshot)], { type: 'text/csv;charset=utf-8;' })
    artifact.value = {
      url: URL.createObjectURL(blob),
      filename: `用户充值报表-演示-${snapshot.filters.startDate}-${snapshot.filters.endDate}.csv`,
      count: snapshot.rows.length
    }
    const link = document.createElement('a')
    link.href = artifact.value.url
    link.download = artifact.value.filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    receipt.value = `已生成 ${artifact.value.count} 笔充值的 CSV，已请求浏览器下载。若未开始，可点击重新下载。`
  } catch (cause) {
    exportError.value = `导出失败：${cause.message || '文件生成失败'}。请重试导出。`
  } finally {
    exporting.value = false
  }
}
onMounted(async () => {
  document.addEventListener('pointerdown', outsideColumns)
  await query()
  if (live && !error.value) headingRef.value?.focus()
})
onUnmounted(() => { live = false; clearArtifact(); document.removeEventListener('pointerdown', outsideColumns) })
</script>

<template>
  <section class="user-deposit-report space-y-5" aria-labelledby="user-deposit-report-title">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 id="user-deposit-report-title" ref="headingRef" tabindex="-1" class="text-2xl font-bold text-slate-900">用户充值报表</h1>
        <p class="mt-1 text-sm text-slate-500">每笔充值单独展示，支持按代理、业务员和充值时间查询。</p>
      </div>
      <RouterLink class="report-button" to="/admin/users/list">用户列表</RouterLink>
    </header>

    <form class="rounded-xl border border-slate-200 bg-white p-4 sm:p-5" aria-label="用户充值查询" novalidate @submit.prevent="query">
      <div class="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <PanelSingleSelect v-model="draft.agentId" :options="agentOptions" label="所属代理" search-label="搜索代理 ID、名称或邮箱" id-base="user-report-agent" />
        <PanelSingleSelect v-model="draft.employeeId" :options="employeeOptions" label="所属业务员" search-label="搜索业务员 ID、名称或邮箱" id-base="user-report-employee" />
        <label class="report-field">用户 ID / 昵称<input v-model="draft.keyword" type="search" placeholder="输入用户 ID 或昵称" autocomplete="off" @keydown.enter="event => event.isComposing && event.preventDefault()" /></label>
        <label class="report-field">开始日期（UTC+8）<input v-model="draft.startDate" type="date" required :aria-invalid="dateError" :aria-describedby="dateError ? 'user-report-error' : undefined" /></label>
        <label class="report-field">结束日期（UTC+8）<input v-model="draft.endDate" type="date" required :aria-invalid="dateError" :aria-describedby="dateError ? 'user-report-error' : undefined" /></label>
        <div class="flex flex-wrap gap-2">
          <button type="submit" class="report-button report-primary" :disabled="loading">{{ loading ? '正在查询…' : '查询报表' }}</button>
          <button type="button" class="report-button" @click="reset">重置为近 30 天</button>
        </div>
      </div>
      <p v-if="dirty" class="mt-2 text-sm text-amber-800">筛选条件尚未应用，请点击“查询报表”更新列表和导出数据。</p>
    </form>

    <div v-if="error" id="user-report-error" ref="errorRef" tabindex="-1" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      {{ error }}<span v-if="report">。以下保留上次成功查询结果，重新查询成功后可导出。</span>
      <button type="button" class="report-button ml-2" @click="query">重试查询</button>
    </div>

    <p v-if="loading" role="status" class="text-sm text-slate-600">正在加载充值订单<span v-if="report">，下方暂为上次查询结果</span>…</p>
    <template v-if="report">
      <section class="min-w-0 rounded-xl border border-slate-200 bg-white" aria-labelledby="report-results-title" data-capability-tier="display" :aria-busy="loading">
        <div class="space-y-3 border-b border-slate-200 p-4 sm:p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 id="report-results-title" class="font-semibold text-slate-900">充值明细 <span class="ml-1 text-sm font-normal text-slate-500">{{ report.rows.length }} 笔充值</span></h2>
            <div class="flex flex-wrap items-center gap-2">
            <button type="button" class="report-button" :disabled="!report.rows.length || !!error || loading || exporting" :aria-busy="exporting" @click="exportCsv">{{ exporting ? '正在生成 CSV…' : '导出全部查询结果' }}</button>
              <div ref="columnsRoot" class="column-settings" @keydown.esc.stop.prevent="closeColumns()" @focusout="event => { if (columnsOpen && event.relatedTarget && !columnsRoot?.contains(event.relatedTarget)) closeColumns(false) }">
                <button ref="columnsTrigger" type="button" class="report-button" :aria-expanded="columnsOpen" aria-controls="report-column-settings" @click="toggleColumns">
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m9 3-.6 2.3-2 .9-2.1-.7-2 3.4L4 10.5v3l-1.7 1.6 2 3.4 2.1-.7 2 .9L9 21h4l.6-2.3 2-.9 2.1.7 2-3.4-1.7-1.6v-3l1.7-1.6-2-3.4-2.1.7-2-.9L13 3Z"/><circle cx="11" cy="12" r="3"/></svg>
                  列设置
                </button>
                <section v-if="columnsOpen" id="report-column-settings" class="column-panel" aria-label="充值报表列设置">
                  <div class="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2">
                    <label class="column-option font-semibold"><input ref="columnsAll" type="checkbox" :checked="allColumnsSelected" :indeterminate="someColumnsSelected && !allColumnsSelected" @change="selectAllColumns">列显示</label>
                    <button type="button" class="column-text-button" @click="tableColumnLayoutState.draftLayout = defaultColumns()">重置</button>
                  </div>
                  <fieldset class="column-options">
                    <legend class="sr-only">显示的报表字段</legend>
                    <label v-for="column in columnRegistry" :key="column.id" class="column-option">
                      <input v-model="tableColumnLayoutState.draftLayout" type="checkbox" :value="column.id" :disabled="column.required">
                      <span>{{ column.label }}<span v-if="column.required" class="ml-1 text-xs text-slate-400">必显</span></span>
                    </label>
                  </fieldset>
                  <div class="border-t border-slate-100 p-3">
                    <p class="mb-2 text-xs text-slate-500">仅调整当前页面，导出仍包含全部字段。</p>
                    <div class="flex justify-end gap-2"><button type="button" class="report-button" @click="closeColumns()">取消</button><button type="button" class="report-button report-primary" @click="applyColumns">应用</button></div>
                  </div>
                </section>
              </div>
            </div>
          </div>
          <p role="status" class="sr-only">{{ columnsNotice }}</p>
          <p v-if="receipt" role="status" class="text-sm text-emerald-800">{{ receipt }} <a v-if="artifact" :href="artifact.url" :download="artifact.filename" class="inline-flex min-h-11 items-center underline">重新下载 CSV</a></p>
          <p v-if="exportError" role="alert" class="text-sm text-rose-700">{{ exportError }}</p>
        </div>

        <div v-if="!rows.length" class="px-4 py-10 text-center">
          <p class="font-medium text-slate-800">当前条件没有充值记录</p>
          <p class="mt-2 text-sm text-slate-500">可调整充值日期、代理、业务员或用户关键词后重新查询。</p>
          <button type="button" class="report-button mt-4" @click="reset">重置筛选条件</button>
        </div>
        <table v-else class="report-table w-full table-fixed text-sm">
          <caption class="sr-only">每笔充值一行；金额按原币种展示，折合 USDT 取自充值订单。</caption>
          <thead class="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th v-if="visibleColumn('order')" scope="col" class="identity-col">充值单号 / 时间</th>
              <th v-if="visibleColumn('user')" scope="col" class="identity-col">用户 ID / 昵称</th>
              <th v-if="visibleColumn('agent')" scope="col" class="identity-col">代理 ID / 邮箱</th>
              <th v-if="visibleColumn('employee')" scope="col" class="identity-col">业务员 ID / 邮箱</th>
              <th v-if="visibleColumn('amount')" scope="col" class="text-right">充值金额 / 币种</th>
              <th v-if="visibleColumn('usdt')" scope="col" class="text-right">折合 USDT</th>
              <th v-if="visibleColumn('status')" scope="col" class="identity-col">状态 / 入账时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.orderId" class="border-t border-slate-100">
              <th scope="row" class="text-left font-normal"><span class="block font-semibold text-slate-900">{{ row.orderId }}</span><span class="mt-1 block text-xs text-slate-500">{{ userReportTime(row.submitTime) }}</span></th>
              <td v-if="visibleColumn('user')" data-label="用户 ID / 昵称"><div><span class="block font-medium text-slate-900">{{ row.nickname }}</span><span class="mt-1 block text-xs text-slate-500">{{ row.userId }}</span></div></td>
              <td v-if="visibleColumn('agent')" data-label="代理 ID / 邮箱"><div><span class="block">{{ row.agentId || '未分配代理' }}</span><span class="mt-1 block text-xs text-slate-500">{{ row.agentEmail || (row.agentId ? '未设置邮箱' : '—') }}</span></div></td>
              <td v-if="visibleColumn('employee')" data-label="业务员 ID / 邮箱"><div><span class="block">{{ row.employeeId || '未分配业务员' }}</span><span class="mt-1 block text-xs text-slate-500">{{ row.employeeEmail || (row.employeeId ? '未设置邮箱' : '—') }}</span></div></td>
              <td v-if="visibleColumn('amount')" data-label="充值金额 / 币种" class="text-right tabular-nums"><div><span>{{ format(row.amount) }}</span><span class="mt-1 block text-xs text-slate-500">{{ row.coin }}</span></div></td>
              <td v-if="visibleColumn('usdt')" data-label="折合 USDT" class="text-right tabular-nums"><span>{{ format(row.usdtValue, 2) }}</span></td>
              <td v-if="visibleColumn('status')" data-label="状态 / 入账时间"><div><span class="font-medium" :class="row.status === 'credited' ? 'text-emerald-700' : row.status === 'rejected' ? 'text-rose-700' : 'text-amber-700'">{{ depositReportStatus(row.status) }}</span><span class="mt-1 block text-xs text-slate-500">{{ row.creditedTime ? userReportTime(row.creditedTime) : '尚未入账' }}</span></div></td>
            </tr>
          </tbody>
        </table>
        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm">
          <p role="status">共 {{ report.rows.length }} 条 · 第 {{ page }} / {{ pages }} 页<span v-if="rows.length"> · 当前 {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, report.rows.length) }} 条</span></p>
          <div class="flex flex-wrap items-center gap-2">
            <label class="flex items-center gap-2">每页<select v-model.number="pageSize" class="min-h-11 rounded-lg border border-slate-300 bg-white px-2" @change="page = 1"><option :value="10">10 条</option><option :value="20">20 条</option><option :value="50">50 条</option></select></label>
            <button type="button" class="report-button" :disabled="page <= 1" @click="page--">上一页</button>
            <button type="button" class="report-button" :disabled="page >= pages" @click="page++">下一页</button>
          </div>
        </div>
      </section>
      <p class="text-xs leading-6 text-slate-500">统计口径：每笔充值一行，同一用户的多笔充值分别列出；包含待确认、已入账和已驳回订单，以状态区分。时间均为 UTC+8，折合 USDT 使用订单记录值。未充值用户不生成占位行。</p>
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
.report-field { display: flex; min-width: 0; flex-direction: column; gap: .25rem; font-size: .875rem; font-weight: 500; color: #374151; }
.report-field input { width: 100%; min-width: 0; min-height: 44px; border: 1px solid #cbd5e1; border-radius: .5rem; padding: .5rem .75rem; background: white; color: #0f172a; font-size: 1rem; font-weight: 400; }
.user-deposit-report :deep(.panel-single-select button) { min-height: 44px; }
.report-table th, .report-table td { padding: .875rem .75rem; vertical-align: top; overflow-wrap: anywhere; }
.report-table thead th { font-weight: 500; }
.identity-col { text-align: left; }
.column-settings { position: relative; }
.column-panel { position: absolute; z-index: 20; top: calc(100% + .5rem); right: 0; width: 320px; max-width: calc(100vw - 3rem); background: white; border: 1px solid #e2e8f0; border-radius: .75rem; box-shadow: 0 10px 30px #0f172a26; }
.column-options { padding: .5rem 1rem; max-height: 40vh; max-height: 40dvh; overflow-y: auto; }
.column-option { display: flex; align-items: center; gap: .625rem; min-height: 44px; font-size: .875rem; color: #334155; cursor: pointer; }
.column-option input { width: 16px; height: 16px; accent-color: #2563eb; flex-shrink: 0; }
.column-text-button { min-height: 44px; padding: .5rem; color: #2563eb; font-size: .875rem; }
@media (max-width: 639px), (max-height: 650px) {
  .column-settings { width: 100%; }
  .column-panel { position: static; width: 100%; max-width: none; margin-top: .5rem; }
}
/* At this width the identity/email columns and amounts no longer fit comfortably.
   Reflow the same DOM into labelled records; no field or disclosure is removed. */
@media (max-width: 1199px) {
  .report-table, .report-table tbody, .report-table tr { display: block; }
  .report-table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  .report-table tr { padding: 1rem; }
  .report-table th[scope=row] { display: block; padding: 0 0 .75rem; }
  .report-table td { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr); gap: 1rem; padding: .5rem 0; text-align: right; }
  .report-table td[data-label]::before { content: attr(data-label); text-align: left; color: #64748b; font-size: .75rem; }
}
</style>
