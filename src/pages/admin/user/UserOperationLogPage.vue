<script setup>
import { computed, reactive, ref } from 'vue'
import {
  USER_AUDIT_ACTIONS,
  USER_AUDIT_CATEGORIES,
  USER_AUDIT_RESULTS,
  userAuditActionLabel
} from '../../../admin/constants/userAuditLog.js'
import { queryUserAuditLogs } from '../../../admin/repositories/userAuditLogRepository.js'

const PAGE_SIZE = 20

const toDateInput = (date) => date.toISOString().slice(0, 10)
const today = new Date()
const sevenDaysAgo = new Date(today)
sevenDaysAgo.setDate(today.getDate() - 7)

const defaultFilters = Object.freeze({
  keyword: '',
  operatorKeyword: '',
  category: '',
  action: '',
  result: '',
  reasonKeyword: '',
  relatedKeyword: '',
  timeFrom: toDateInput(sevenDaysAgo),
  timeTo: toDateInput(today)
})

const filterDraft = reactive({ ...defaultFilters })
const appliedFilters = ref({ ...defaultFilters })
const currentPage = ref(1)
const expandedLogId = ref('')
const requestPhase = ref('ready')
const queryError = ref('')

const queryResult = computed(() => {
  try {
    requestPhase.value = 'ready'
    queryError.value = ''
    return queryUserAuditLogs({
      filters: {
        ...appliedFilters.value,
        timeFrom: appliedFilters.value.timeFrom ? `${appliedFilters.value.timeFrom}T00:00:00.000Z` : '',
        timeTo: appliedFilters.value.timeTo ? `${appliedFilters.value.timeTo}T23:59:59.999Z` : ''
      },
      page: currentPage.value,
      pageSize: PAGE_SIZE
    })
  } catch (error) {
    requestPhase.value = 'refresh-error'
    queryError.value = error instanceof Error ? error.message : '审计日志服务不可用'
    return { rows: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1 }
  }
})

const actionOptions = computed(() => {
  if (!filterDraft.category) return USER_AUDIT_ACTIONS
  return USER_AUDIT_ACTIONS.filter((item) => item.category === filterDraft.category)
})

const hasAppliedFilters = computed(() => Object.entries(appliedFilters.value).some(([key, value]) => (
  value !== defaultFilters[key]
)))

const appliedFilterItems = computed(() => Object.entries(appliedFilters.value)
  .filter(([key, value]) => value && value !== defaultFilters[key])
  .map(([key, value]) => {
    const labels = {
      keyword: '目标用户',
      operatorKeyword: '操作人',
      category: '分类',
      action: '操作',
      result: '结果',
      reasonKeyword: '原因',
      relatedKeyword: '关联ID',
      timeFrom: '开始时间',
      timeTo: '结束时间'
    }
    const displayValue = key === 'category'
      ? USER_AUDIT_CATEGORIES.find((item) => item.value === value)?.label || value
      : key === 'action'
        ? userAuditActionLabel(value)
        : key === 'result'
          ? USER_AUDIT_RESULTS.find((item) => item.value === value)?.label || value
          : value
    return { key, label: labels[key], value: displayValue }
  }))

const applyFilters = () => {
  appliedFilters.value = { ...filterDraft }
  currentPage.value = 1
  expandedLogId.value = ''
}

const resetFilters = () => {
  Object.assign(filterDraft, defaultFilters)
  appliedFilters.value = { ...defaultFilters }
  currentPage.value = 1
  expandedLogId.value = ''
}

const removeAppliedFilter = (key) => {
  filterDraft[key] = defaultFilters[key]
  appliedFilters.value = { ...appliedFilters.value, [key]: defaultFilters[key] }
  currentPage.value = 1
  expandedLogId.value = ''
}

const toggleDetail = (id) => {
  expandedLogId.value = expandedLogId.value === id ? '' : id
}

const createPageNumbers = (page, totalPages) => {
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, start + 4)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

const pageNumbers = computed(() => createPageNumbers(queryResult.value.page, queryResult.value.totalPages))

const formatTime = (value) => {
  if (!value) return '-'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

const formatDiffValue = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const goToPage = (page) => {
  currentPage.value = Math.min(Math.max(1, page), queryResult.value.totalPages)
  expandedLogId.value = ''
}
</script>

<template>
  <section class="space-y-5">
    <header class="space-y-2">
      <p class="text-sm text-slate-500">用户管理</p>
      <div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900">用户操作日志</h1>
          <p class="mt-1 text-sm text-slate-500">只记录会改变用户资料、权限、资金、等级、状态或风控结果的操作。</p>
        </div>
        <div class="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          审计服务可用，日志只读且追加保存
        </div>
      </div>
    </header>

    <form class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" @submit.prevent="applyFilters">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label class="space-y-1 text-sm text-slate-600">
          <span>目标用户</span>
          <input v-model="filterDraft.keyword" class="ant-input" placeholder="UID / 用户名 / 邮箱 / 手机" />
        </label>
        <label class="space-y-1 text-sm text-slate-600">
          <span>操作人或来源</span>
          <input v-model="filterDraft.operatorKeyword" class="ant-input" placeholder="管理员 / 系统规则 / 任务" />
        </label>
        <label class="space-y-1 text-sm text-slate-600">
          <span>业务分类</span>
          <select v-model="filterDraft.category" class="ant-input" @change="filterDraft.action = ''">
            <option value="">全部分类</option>
            <option v-for="item in USER_AUDIT_CATEGORIES" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
        <label class="space-y-1 text-sm text-slate-600">
          <span>操作类型</span>
          <select v-model="filterDraft.action" class="ant-input">
            <option value="">全部操作</option>
            <option v-for="item in actionOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
        <label class="space-y-1 text-sm text-slate-600">
          <span>操作结果</span>
          <select v-model="filterDraft.result" class="ant-input">
            <option value="">全部结果</option>
            <option v-for="item in USER_AUDIT_RESULTS" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
        <label class="space-y-1 text-sm text-slate-600">
          <span>操作原因</span>
          <input v-model="filterDraft.reasonKeyword" class="ant-input" placeholder="复核 / 规则 / 备注关键词" />
        </label>
        <label class="space-y-1 text-sm text-slate-600">
          <span>关联 ID</span>
          <input v-model="filterDraft.relatedKeyword" class="ant-input" placeholder="业务 / 请求 / 规则 / 任务 ID" />
        </label>
        <div class="grid grid-cols-2 gap-2">
          <label class="space-y-1 text-sm text-slate-600">
            <span>开始时间</span>
            <input v-model="filterDraft.timeFrom" class="ant-input" type="date" />
          </label>
          <label class="space-y-1 text-sm text-slate-600">
            <span>结束时间</span>
            <input v-model="filterDraft.timeTo" class="ant-input" type="date" />
          </label>
        </div>
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-2">
        <button type="submit" class="ant-btn ant-btn-primary">查询</button>
        <button type="button" class="ant-btn" @click="resetFilters">重置</button>
      </div>
    </form>

    <div v-if="hasAppliedFilters" class="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
      <span class="text-slate-500">已应用条件</span>
      <button
        v-for="item in appliedFilterItems"
        :key="item.key"
        type="button"
        class="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:border-blue-300 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        @click="removeAppliedFilter(item.key)"
      >
        {{ item.label }}：{{ item.value }} ×
      </button>
    </div>

    <div class="rounded-lg border border-slate-200 bg-white shadow-sm" aria-live="polite" :aria-busy="requestPhase !== 'ready'">
      <div class="flex flex-col gap-2 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-base font-semibold text-slate-900">审计结果</h2>
          <p class="text-sm text-slate-500">共 {{ queryResult.total }} 条，按操作时间倒序展示。</p>
        </div>
        <p class="text-sm text-slate-500">第 {{ queryResult.page }} / {{ queryResult.totalPages }} 页</p>
      </div>

      <div v-if="queryError" class="p-8 text-center text-sm text-red-600">
        {{ queryError }}
      </div>
      <div v-else-if="!queryResult.rows.length" class="p-8 text-center text-sm text-slate-500">
        {{ hasAppliedFilters ? '当前筛选条件没有匹配的用户操作日志。' : '暂无用户操作日志。' }}
      </div>

      <div v-else>
        <div class="hidden overflow-x-auto md:block">
          <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th class="px-4 py-3">时间</th>
                <th class="px-4 py-3">目标用户</th>
                <th class="px-4 py-3">操作人</th>
                <th class="px-4 py-3">分类 / 操作</th>
                <th class="px-4 py-3">变更摘要</th>
                <th class="px-4 py-3">原因</th>
                <th class="px-4 py-3">结果</th>
                <th class="px-4 py-3">详情</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <template v-for="log in queryResult.rows" :key="log.id">
                <tr class="align-top">
                  <td class="whitespace-nowrap px-4 py-3 text-slate-600">{{ formatTime(log.occurredAt) }}</td>
                  <td class="px-4 py-3">
                    <div class="font-medium text-slate-900">{{ log.targetUser.uid }}</div>
                    <div class="text-xs text-slate-500">{{ log.targetUser.name || '-' }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-medium text-slate-900">{{ log.operator.name }}</div>
                    <div class="text-xs text-slate-500">{{ log.sourceLabel }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-medium text-slate-900">{{ log.categoryLabel }}</div>
                    <div class="text-xs text-slate-500">{{ log.actionLabel }}</div>
                  </td>
                  <td class="max-w-xs px-4 py-3 text-slate-700">{{ log.summary }}</td>
                  <td class="max-w-xs px-4 py-3 text-slate-600">{{ log.reason }}</td>
                  <td class="px-4 py-3">
                    <span class="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{{ log.resultLabel }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <button
                      type="button"
                      class="text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      :aria-expanded="expandedLogId === log.id"
                      :aria-controls="`audit-detail-${log.id}`"
                      @click="toggleDetail(log.id)"
                    >
                      {{ expandedLogId === log.id ? '收起' : '查看' }}
                    </button>
                  </td>
                </tr>
                <tr v-if="expandedLogId === log.id" :id="`audit-detail-${log.id}`" class="bg-slate-50">
                  <td colspan="8" class="px-4 py-4">
                    <div class="grid gap-3 lg:grid-cols-[1fr_280px]">
                      <div class="rounded-md border border-slate-200 bg-white p-3">
                        <h3 class="text-sm font-semibold text-slate-900">字段变更</h3>
                        <div class="mt-2 divide-y divide-slate-100">
                          <div v-for="diff in log.diff" :key="diff.field" class="grid gap-2 py-2 text-sm md:grid-cols-3">
                            <span class="font-medium text-slate-700">{{ diff.field }}</span>
                            <span class="text-slate-500">前：{{ formatDiffValue(diff.before) }}</span>
                            <span class="text-slate-500">后：{{ formatDiffValue(diff.after) }}</span>
                          </div>
                          <p v-if="!log.diff.length" class="py-2 text-sm text-slate-500">本记录没有可展示字段差异。</p>
                        </div>
                      </div>
                      <div class="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-600">
                        <h3 class="font-semibold text-slate-900">关联信息</h3>
                        <p class="mt-2">日志ID：{{ log.id }}</p>
                        <p>请求ID：{{ log.related.requestId || '-' }}</p>
                        <p>业务ID：{{ log.related.businessId || '-' }}</p>
                        <p>规则ID：{{ log.related.ruleId || '-' }}</p>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div class="divide-y divide-slate-100 md:hidden">
          <article v-for="log in queryResult.rows" :key="log.id" class="p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-semibold text-slate-900">{{ log.targetUser.uid }}</p>
                <p class="text-sm text-slate-500">{{ log.targetUser.name || '-' }} · {{ formatTime(log.occurredAt) }}</p>
              </div>
              <span class="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{{ log.resultLabel }}</span>
            </div>
            <div class="mt-3 space-y-1 text-sm text-slate-600">
              <p>{{ log.categoryLabel }} / {{ log.actionLabel }}</p>
              <p>操作人：{{ log.operator.name }}（{{ log.sourceLabel }}）</p>
              <p>原因：{{ log.reason }}</p>
              <p>摘要：{{ log.summary }}</p>
            </div>
            <button
              type="button"
              class="mt-3 text-sm font-medium text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :aria-expanded="expandedLogId === log.id"
              :aria-controls="`mobile-audit-detail-${log.id}`"
              @click="toggleDetail(log.id)"
            >
              {{ expandedLogId === log.id ? '收起详情' : '查看详情' }}
            </button>
            <div v-if="expandedLogId === log.id" :id="`mobile-audit-detail-${log.id}`" class="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
              <div v-for="diff in log.diff" :key="diff.field" class="border-b border-slate-200 py-2 last:border-0">
                <p class="font-medium text-slate-800">{{ diff.field }}</p>
                <p>前：{{ formatDiffValue(diff.before) }}</p>
                <p>后：{{ formatDiffValue(diff.after) }}</p>
              </div>
              <p class="mt-2">请求ID：{{ log.related.requestId || '-' }}</p>
              <p>业务ID：{{ log.related.businessId || '-' }}</p>
              <p>规则ID：{{ log.related.ruleId || '-' }}</p>
            </div>
          </article>
        </div>
      </div>

      <nav v-if="queryResult.totalPages > 1" class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4" aria-label="用户操作日志分页">
        <button type="button" class="ant-btn" :disabled="queryResult.page <= 1" @click="goToPage(queryResult.page - 1)">上一页</button>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="pageNumber in pageNumbers"
            :key="pageNumber"
            type="button"
            class="rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            :class="pageNumber === queryResult.page ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700'"
            :aria-current="pageNumber === queryResult.page ? 'page' : undefined"
            @click="goToPage(pageNumber)"
          >
            {{ pageNumber }}
          </button>
        </div>
        <button type="button" class="ant-btn" :disabled="queryResult.page >= queryResult.totalPages" @click="goToPage(queryResult.page + 1)">下一页</button>
      </nav>
    </div>
  </section>
</template>
