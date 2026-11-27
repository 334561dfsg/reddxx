<script setup>
// 用户点控日志 — Ant Design Pro list page (2026-11-28): query card (EarnSearchForm), table card with pagination
// (EarnAdminTable), status as a text Tag. The route query (userId/module, from module point-control rows) seeds the
// applied UID/module filters; later route changes update only those two and keep the other applied filters. The
// shared UserControlLogContent stays as it is for the per-user Drawer in the user list.
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Tag, TypographyText } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import { userControlState } from '../../../admin/state/userControlState.js'
import {
  filterUserControlLogsByDate,
  normalizeUserControlLogQuery,
  USER_CONTROL_MODULES
} from '../../../features/user-control/userControl.js'

const route = useRoute()
const router = useRouter()
const normalizedQuery = computed(() => normalizeUserControlLogQuery({
  userId: route.query.userId,
  module: route.query.module
}))

const blank = () => ({ userId: '', module: 'all', source: 'all', action: 'all', date: null })
const filters = ref({ ...blank(), userId: normalizedQuery.value.userId, module: normalizedQuery.value.module || 'all' })
const page = ref(1)

watch(normalizedQuery, ({ userId, module }) => {
  filters.value = { ...filters.value, userId, module: module || 'all' }
  page.value = 1
})

const sourceOptions = [{ value: 'global', label: '用户点控设置' }, { value: 'module', label: '当前模块点控' }]
const actionOptions = [{ value: 'apply', label: '设置控制' }, { value: 'cancel', label: '取消控制' }, { value: 'execute', label: '执行规则' }]
const fields = [
  { key: 'userId', label: 'UID' },
  { key: 'module', label: '模块', options: [{ value: 'all', label: '全部模块' }, ...USER_CONTROL_MODULES.map((module) => ({ value: module.key, label: module.label }))] },
  { key: 'source', label: '规则来源', options: [{ value: 'all', label: '全部来源' }, ...sourceOptions] },
  { key: 'action', label: '操作类型', options: [{ value: 'all', label: '全部操作' }, ...actionOptions] },
  { key: 'date', label: '操作日期', range: true }
]

const moduleMeta = (moduleKey) => USER_CONTROL_MODULES.find((module) => module.key === moduleKey)
const valueLabel = (value) => ({ profit: '盈利', loss: '亏损' })[value] || value || '—'
const methodLabel = (method, fallbackValue) => ({ profit: '盈利', loss: '亏损' })[method] || valueLabel(fallbackValue)
const sourceLabel = (source) => sourceOptions.find((item) => item.value === source)?.label || '—'
const actionLabel = (action) => actionOptions.find((item) => item.value === action)?.label || action
const durationLabel = (duration) => ({ once: '只生效一次', permanent: '持续生效', mixed: '混合' })[duration] || '—'
const statusLabel = (status) => ({ success: '成功', failed: '失败' })[status] || status || '—'

const formatRule = (rule) => {
  if (!rule) return '—'
  if (rule.value) return `${methodLabel(rule.method, rule.value)} · ${durationLabel(rule.duration)}`
  const entries = USER_CONTROL_MODULES
    .filter((module) => rule[module.key])
    .map((module) => `${module.label} ${methodLabel(rule[module.key].method, rule[module.key].value)}`)
  return entries.join('；') || '—'
}

const formatOperationAfter = (log) => {
  if (log.after) return formatRule(log.after)
  if (log.action === 'cancel') return '当前有效规则已取消'
  if (log.strategy === 'positive') return methodLabel(log.method, 'profit')
  if (log.strategy === 'negative') return methodLabel(log.method, 'loss')
  return '—'
}

const unifiedLogs = computed(() => {
  const operationRows = userControlState.value.operationLogs.map((log) => ({
    id: `operation-${log.id}`,
    createdAt: log.createdAt,
    operator: log.operator || '—',
    userId: log.userId,
    moduleKeys: log.modules || [],
    moduleLabels: (log.modules || []).map((key) => moduleMeta(key)?.label || key).join('、'),
    action: log.action,
    source: log.scope,
    duration: log.duration,
    referenceId: log.batchId || '—',
    before: formatRule(log.before),
    after: formatOperationAfter(log),
    status: log.status || '',
    note: log.errorMessage || log.note || '—'
  }))
  const executionRows = userControlState.value.executionLogs.map((log) => ({
    id: `execution-${log.id}`,
    createdAt: log.createdAt,
    operator: '—',
    userId: log.userId,
    moduleKeys: [log.moduleKey],
    moduleLabels: moduleMeta(log.moduleKey)?.label || log.moduleKey,
    action: 'execute',
    source: log.source,
    duration: log.duration,
    referenceId: log.businessId || '—',
    before: valueLabel(log.beforeValue),
    after: methodLabel(log.method, log.afterValue),
    status: log.status,
    note: log.errorMessage || '—'
  }))
  return [...operationRows, ...executionRows]
})

const rows = computed(() => {
  const f = filters.value
  const userId = String(f.userId || '').trim()
  const matched = unifiedLogs.value.filter((log) => (
    (!userId || log.userId === userId)
    && (f.module === 'all' || log.moduleKeys.includes(f.module))
    && (f.source === 'all' || log.source === f.source)
    && (f.action === 'all' || log.action === f.action)
  ))
  return filterUserControlLogsByDate(matched, { dateFrom: f.date?.[0] || '', dateTo: f.date?.[1] || '' })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
})

const columns = [
  { key: 'createdAt', title: '操作时间', width: 170 },
  { key: 'operator', title: '操作人', width: 140 },
  { key: 'userId', title: 'UID', width: 130 },
  { key: 'module', title: '模块', width: 90 },
  { key: 'action', title: '日志类型', width: 100 },
  { key: 'source', title: '规则来源', width: 130 },
  { key: 'duration', title: '控制周期', width: 110 },
  { key: 'referenceId', title: '业务/批次号', width: 190 },
  { key: 'change', title: '变更前 → 变更后', width: 240 },
  { key: 'status', title: '状态', width: 80 },
  { key: 'note', title: '备注', width: 200 }
]

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() {
  filters.value = blank()
  page.value = 1
  if (route.query.userId || route.query.module) router.replace({ name: route.name, query: {} })
}
</script>

<template>
  <PageShell data-testid="user-control-log-page">
    <SearchForm name="user-control-log-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <AdminTable title="用户点控日志" v-model:page="page" :rows="rows" :columns="columns" row-key="id" desktop-only>
      <template #cell="{ column, record }">
        <TypographyText v-if="column.key === 'createdAt'" type="secondary">{{ record.createdAt }}</TypographyText>
        <span v-else-if="column.key === 'operator'" data-testid="user-control-unified-operator-value">{{ record.operator }}</span>
        <span v-else-if="column.key === 'userId'" class="font-mono">{{ record.userId }}</span>
        <template v-else-if="column.key === 'module'">{{ record.moduleLabels || '—' }}</template>
        <Tag v-else-if="column.key === 'action'">{{ actionLabel(record.action) }}</Tag>
        <template v-else-if="column.key === 'source'">{{ sourceLabel(record.source) }}</template>
        <span v-else-if="column.key === 'duration'" data-testid="user-control-unified-duration-value">{{ durationLabel(record.duration) }}</span>
        <span v-else-if="column.key === 'referenceId'" data-testid="user-control-unified-reference-value" class="font-mono">{{ record.referenceId }}</span>
        <div v-else-if="column.key === 'change'">
          <TypographyText type="secondary">{{ record.before }}</TypographyText>
          <div>{{ record.after }}</div>
        </div>
        <template v-else-if="column.key === 'status'">
          <Tag v-if="record.status" :color="record.status === 'failed' ? 'error' : 'success'">{{ statusLabel(record.status) }}</Tag>
          <TypographyText v-else type="secondary">—</TypographyText>
        </template>
        <template v-else-if="column.key === 'note'">{{ record.note }}</template>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>
  </PageShell>
</template>
