<script setup>
// 用户操作日志 — Ant Design Pro list page (2026-11-28): query card (EarnSearchForm, one input per field, explicit
// 查询/重置, default range = last 7 days), table card with pagination (EarnAdminTable), result as a text Tag and
// inline row details (field diff + related IDs) toggled from the operation column. The audit log stays read-only.
import { computed, ref } from 'vue'
import { Button, Descriptions, DescriptionsItem, Space, Tag, TypographyText } from 'ant-design-vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import {
  USER_AUDIT_ACTIONS,
  USER_AUDIT_CATEGORIES,
  USER_AUDIT_RESULTS
} from '../../../admin/constants/userAuditLog.js'
import { queryUserAuditLogs } from '../../../admin/repositories/userAuditLogRepository.js'

const toDateInput = (date) => date.toISOString().slice(0, 10)
const today = new Date()
const sevenDaysAgo = new Date(today)
sevenDaysAgo.setDate(today.getDate() - 7)

const blank = () => ({
  uid: '',
  username: '',
  email: '',
  phone: '',
  operatorKeyword: '',
  category: 'all',
  action: 'all',
  result: 'all',
  reasonKeyword: '',
  relatedKeyword: '',
  time: [toDateInput(sevenDaysAgo), toDateInput(today)]
})
const filters = ref(blank())
const page = ref(1)
const expandedLogId = ref('')
const queryError = ref('')

const categoryLabel = (value) => USER_AUDIT_CATEGORIES.find((item) => item.value === value)?.label || value
const fields = [
  { key: 'uid', label: '用户 UID' },
  { key: 'username', label: '用户名' },
  { key: 'category', label: '业务分类', options: [{ value: 'all', label: '全部分类' }, ...USER_AUDIT_CATEGORIES] },
  { key: 'action', label: '操作类型', searchable: true, options: [{ value: 'all', label: '全部操作' }, ...USER_AUDIT_ACTIONS.map((item) => ({ value: item.value, label: `${categoryLabel(item.category)} · ${item.label}` }))] },
  { key: 'result', label: '操作结果', options: [{ value: 'all', label: '全部结果' }, ...USER_AUDIT_RESULTS] },
  { key: 'time', label: '操作日期', range: true },
  { key: 'email', label: '用户邮箱' },
  { key: 'phone', label: '用户手机号' },
  { key: 'operatorKeyword', label: '操作人' },
  { key: 'reasonKeyword', label: '操作原因' },
  { key: 'relatedKeyword', label: '关联 ID' }
]

const has = (value, query) => !String(query || '').trim() || String(value || '').toLowerCase().includes(String(query).trim().toLowerCase())

// The repository applies category/action/result/operator/reason/related/time; the separate target-user fields are
// matched here so each input searches exactly one attribute.
const rows = computed(() => {
  const f = filters.value
  try {
    queryError.value = ''
    const result = queryUserAuditLogs({
      filters: {
        operatorKeyword: f.operatorKeyword,
        category: f.category === 'all' ? '' : f.category,
        action: f.action === 'all' ? '' : f.action,
        result: f.result === 'all' ? '' : f.result,
        reasonKeyword: f.reasonKeyword,
        relatedKeyword: f.relatedKeyword,
        timeFrom: f.time?.[0] ? `${f.time[0]}T00:00:00.000Z` : '',
        timeTo: f.time?.[1] ? `${f.time[1]}T23:59:59.999Z` : ''
      },
      page: 1,
      pageSize: Number.MAX_SAFE_INTEGER
    })
    return result.rows.filter((log) => has(log.targetUser.uid, f.uid) && has(log.targetUser.name, f.username) &&
      has(log.targetUser.email, f.email) && has(log.targetUser.phone, f.phone))
  } catch (error) {
    queryError.value = error instanceof Error ? error.message : '审计日志服务不可用'
    return []
  }
})

const columns = [
  { key: 'time', title: '操作时间', width: 130 },
  { key: 'target', title: '目标用户', width: 170 },
  { key: 'operator', title: '操作人', width: 150 },
  { key: 'category', title: '分类 / 操作', width: 180 },
  { key: 'summary', title: '变更摘要', width: 320 },
  { key: 'reason', title: '原因', width: 200 },
  { key: 'result', title: '结果', width: 100 },
  { key: 'actions', title: '操作', width: 80, fixed: 'right' }
]
const resultColor = { success: 'success', failed: 'error', partial: 'warning', unknown: 'default' }

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1; expandedLogId.value = '' }
function reset() { filters.value = blank(); page.value = 1; expandedLogId.value = '' }
const toggleDetail = (id) => { expandedLogId.value = expandedLogId.value === id ? '' : id }

const formatTime = (value) => {
  if (!value) return '-'
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

const formatDiffValue = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
</script>

<template>
  <PageShell>
    <SearchForm name="user-operation-log-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <AdminTable title="用户操作日志" v-model:page="page" :rows="rows" :columns="columns" row-key="id" desktop-only>
      <template #toolbar>
        <FeedbackToast v-if="queryError" type="error" :source="() => queryError" />
      </template>
      <template #cell="{ column, record: log }">
        <TypographyText v-if="column.key === 'time'" type="secondary">{{ formatTime(log.occurredAt) }}</TypographyText>
        <Space v-else-if="column.key === 'target'" direction="vertical" :size="0">
          <span class="font-mono">{{ log.targetUser.uid }}</span>
          <TypographyText type="secondary">{{ log.targetUser.name || '-' }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'operator'" direction="vertical" :size="0">
          <span>{{ log.operator.name }}</span>
          <TypographyText type="secondary">{{ log.sourceLabel }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'category'" direction="vertical" :size="0">
          <span>{{ log.categoryLabel }}</span>
          <TypographyText type="secondary">{{ log.actionLabel }}</TypographyText>
        </Space>
        <div v-else-if="column.key === 'summary'">
          <div>{{ log.summary }}</div>
          <div v-if="expandedLogId === log.id" :id="`audit-detail-${log.id}`" class="audit-detail">
            <Descriptions :column="1" size="small" bordered title="字段变更">
              <DescriptionsItem v-for="diff in log.diff" :key="diff.field" :label="diff.field === 'accountType' ? '账户类型' : diff.field">
                前：{{ formatDiffValue(diff.before) }}<br />后：{{ formatDiffValue(diff.after) }}
              </DescriptionsItem>
              <DescriptionsItem v-if="!log.diff.length" label="字段">本记录没有可展示字段差异。</DescriptionsItem>
            </Descriptions>
            <Descriptions :column="1" size="small" title="关联信息" class="audit-detail-related">
              <DescriptionsItem label="日志 ID"><span class="font-mono">{{ log.id }}</span></DescriptionsItem>
              <DescriptionsItem label="请求 ID"><span class="font-mono">{{ log.related.requestId || '-' }}</span></DescriptionsItem>
              <DescriptionsItem label="业务 ID"><span class="font-mono">{{ log.related.businessId || '-' }}</span></DescriptionsItem>
              <DescriptionsItem label="规则 ID"><span class="font-mono">{{ log.related.ruleId || '-' }}</span></DescriptionsItem>
            </Descriptions>
          </div>
        </div>
        <template v-else-if="column.key === 'reason'">{{ log.reason }}</template>
        <Tag v-else-if="column.key === 'result'" :color="resultColor[log.result]">{{ log.resultLabel }}</Tag>
        <Button v-else-if="column.key === 'actions'" type="link" class="px-0" :aria-expanded="expandedLogId === log.id" :aria-controls="`audit-detail-${log.id}`" @click="toggleDetail(log.id)">
          {{ expandedLogId === log.id ? '收起' : '详情' }}
        </Button>
        <template v-else>{{ log[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>
  </PageShell>
</template>

<style scoped>
.audit-detail { display: grid; gap: 12px; margin-top: 12px; }
</style>
