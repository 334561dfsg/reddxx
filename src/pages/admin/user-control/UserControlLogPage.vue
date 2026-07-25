<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { userControlState } from '../../../admin/state/userControlState.js'
import {
  filterUserControlLogsByDate,
  normalizeUserControlLogQuery,
  USER_CONTROL_MODULES
} from '../../../features/user-control/userControl.js'

const route = useRoute()
const router = useRouter()

const activeTab = ref('operation')
const filters = reactive({
  userId: '',
  module: '',
  source: '',
  action: '',
  dateFrom: '',
  dateTo: ''
})

const moduleMeta = (moduleKey) => USER_CONTROL_MODULES.find((module) => module.key === moduleKey)

const syncRouteQuery = () => {
  const normalized = normalizeUserControlLogQuery({
    userId: route.query.userId,
    module: route.query.module
  })
  filters.userId = normalized.userId
  filters.module = normalized.module
}

watch(
  () => [route.query.userId, route.query.module],
  syncRouteQuery,
  { immediate: true }
)

const operationLogs = computed(() => filterUserControlLogsByDate(userControlState.value.operationLogs.filter((log) => (
  (!filters.userId || log.userId === filters.userId)
  && (!filters.module || log.modules?.includes(filters.module))
  && (!filters.source || log.scope === filters.source)
  && (!filters.action || log.action === filters.action)
)), filters))

const executionLogs = computed(() => filterUserControlLogsByDate(userControlState.value.executionLogs.filter((log) => (
  (!filters.userId || log.userId === filters.userId)
  && (!filters.module || log.moduleKey === filters.module)
  && (!filters.source || log.source === filters.source)
  && (!filters.action || filters.action === 'execute')
)), filters))

const valueLabel = (value) => ({
  profit: '盈利',
  loss: '亏损',
  highYield: '高收益',
  lowYield: '低收益'
})[value] || value || '—'

const sourceLabel = (source) => ({
  global: '用户管理统一设置',
  module: '当前模块独立设置'
})[source] || '—'

const actionLabel = (action) => ({ apply: '设置控制', cancel: '取消控制', execute: '执行规则' })[action] || action
const durationLabel = (duration) => ({ once: '一次性', permanent: '永久', mixed: '混合' })[duration] || '—'
const statusLabel = (status) => ({ success: '成功', failed: '失败' })[status] || status || '—'
const executionStatusClasses = (status) => status === 'failed'
  ? 'bg-rose-100 text-rose-700'
  : 'bg-emerald-100 text-emerald-700'

const formatRule = (rule) => {
  if (!rule) return '—'
  if (rule.value) return `${valueLabel(rule.value)} · ${rule.duration === 'once' ? '一次性' : '永久'}`
  const entries = USER_CONTROL_MODULES
    .filter((module) => rule[module.key])
    .map((module) => `${module.label} ${valueLabel(rule[module.key].value)}`)
  return entries.join('；') || '—'
}

const formatOperationAfter = (log) => {
  if (log.after) return formatRule(log.after)
  if (log.action === 'cancel') return '当前有效规则已取消'
  if (log.strategy === 'positive') return '交易盈利；理财高收益'
  if (log.strategy === 'negative') return '交易亏损；理财低收益'
  return '—'
}

const clearFilters = async () => {
  filters.source = ''
  filters.action = ''
  filters.dateFrom = ''
  filters.dateTo = ''
  await router.replace({ name: route.name, query: {} })
}
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p class="text-sm font-medium text-blue-600">用户管理</p>
        <h1 class="mt-1 text-3xl font-semibold text-slate-900">用户控制日志</h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-500">集中查看设置、取消与最终执行记录。页面仅使用前端 Mock 数据，不连接 API、服务器或真实结算。</p>
      </div>
      <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p class="font-semibold">Demo 演示页</p>
        <p class="mt-1 text-xs">所有模拟只在当前浏览器内存中生效</p>
      </div>
    </header>

    <article class="rounded-xl border border-slate-200 bg-white p-5">
      <div class="flex flex-wrap gap-2 border-b border-slate-200 pb-4" role="tablist" aria-label="用户控制日志类型">
        <button id="user-control-operation-tab" type="button" role="tab" :aria-selected="activeTab === 'operation'" aria-controls="user-control-operation-panel" class="rounded-lg px-4 py-2 text-sm font-medium" :class="activeTab === 'operation' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'" @click="activeTab = 'operation'">操作日志</button>
        <button id="user-control-execution-tab" type="button" role="tab" :aria-selected="activeTab === 'execution'" aria-controls="user-control-execution-panel" class="rounded-lg px-4 py-2 text-sm font-medium" :class="activeTab === 'execution' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'" @click="activeTab = 'execution'">执行日志</button>
      </div>
      <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        <label class="space-y-1 text-xs font-medium text-slate-600">
          <span>UID</span>
          <input v-model.trim="filters.userId" type="search" placeholder="输入 UID" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500" />
        </label>
        <label class="space-y-1 text-xs font-medium text-slate-600">
          <span>模块</span>
          <select v-model="filters.module" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500">
            <option value="">全部模块</option>
            <option v-for="module in USER_CONTROL_MODULES" :key="module.key" :value="module.key">{{ module.label }}</option>
          </select>
        </label>
        <label class="space-y-1 text-xs font-medium text-slate-600">
          <span>规则来源</span>
          <select v-model="filters.source" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500">
            <option value="">全部来源</option>
            <option value="global">用户管理统一设置</option>
            <option value="module">当前模块独立设置</option>
          </select>
        </label>
        <label class="space-y-1 text-xs font-medium text-slate-600">
          <span>操作类型</span>
          <select v-model="filters.action" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500">
            <option value="">全部操作</option>
            <option value="apply">设置控制</option>
            <option value="cancel">取消控制</option>
            <option value="execute">执行规则</option>
          </select>
        </label>
        <label class="space-y-1 text-xs font-medium text-slate-600">
          <span>开始日期</span>
          <input v-model="filters.dateFrom" data-testid="user-control-log-date-from" type="date" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500" />
        </label>
        <label class="space-y-1 text-xs font-medium text-slate-600">
          <span>结束日期</span>
          <input v-model="filters.dateTo" data-testid="user-control-log-date-to" type="date" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500" />
        </label>
        <div class="flex items-end">
          <button type="button" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50" @click="clearFilters">清除筛选</button>
        </div>
      </div>
    </article>

    <article class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div v-if="activeTab === 'operation'" id="user-control-operation-panel" role="tabpanel" aria-labelledby="user-control-operation-tab" tabindex="0" class="overflow-x-auto">
        <table class="w-full min-w-[1540px] text-left text-sm">
          <thead class="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th class="px-4 py-3">操作时间</th><th class="px-4 py-3">操作人</th><th class="px-4 py-3">UID</th><th class="px-4 py-3">模块</th><th class="px-4 py-3">规则来源</th><th class="px-4 py-3">操作类型</th><th class="px-4 py-3">生效方式</th><th class="px-4 py-3">模拟批次号</th><th class="px-4 py-3">变更前</th><th class="px-4 py-3">变更后</th><th class="px-4 py-3">操作备注</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="log in operationLogs" :key="log.id" class="align-top hover:bg-slate-50">
              <td class="whitespace-nowrap px-4 py-4 text-slate-500">{{ log.createdAt }}</td>
              <td data-testid="user-control-operation-operator-value" class="whitespace-nowrap px-4 py-4 text-slate-700">{{ log.operator || '—' }}</td>
              <td class="px-4 py-4 font-mono text-xs text-slate-700">{{ log.userId }}</td>
              <td class="px-4 py-4 text-slate-700">{{ log.modules.map((key) => moduleMeta(key)?.label || key).join('、') }}</td>
              <td class="px-4 py-4 text-slate-600">{{ sourceLabel(log.scope) }}</td>
              <td class="px-4 py-4 font-medium text-slate-900">{{ actionLabel(log.action) }}</td>
              <td class="px-4 py-4 text-slate-600">{{ durationLabel(log.duration) }}</td>
              <td data-testid="user-control-operation-batch-value" class="px-4 py-4 font-mono text-xs text-slate-700">{{ log.batchId || '—' }}</td>
              <td class="max-w-xs px-4 py-4 text-xs leading-5 text-slate-500">{{ formatRule(log.before) }}</td>
              <td class="max-w-xs px-4 py-4 text-xs leading-5 text-slate-700">{{ formatOperationAfter(log) }}</td>
              <td class="max-w-xs px-4 py-4 text-slate-600">{{ log.note }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="operationLogs.length === 0" class="px-6 py-14 text-center text-sm text-slate-500">没有符合筛选条件的操作日志</p>
      </div>

      <div v-else id="user-control-execution-panel" role="tabpanel" aria-labelledby="user-control-execution-tab" tabindex="0" class="overflow-x-auto">
        <table class="w-full min-w-[1320px] text-left text-sm">
          <thead class="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th class="px-4 py-3">操作时间</th><th class="px-4 py-3">UID</th><th class="px-4 py-3">模块</th><th class="px-4 py-3">规则内容</th><th class="px-4 py-3">生效方式</th><th class="px-4 py-3">规则来源</th><th class="px-4 py-3">业务单号</th><th class="px-4 py-3">自然/全局结果 · 基础收益档位</th><th class="px-4 py-3">用户最终结果 · 用户收益档位</th><th class="px-4 py-3">执行状态</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="log in executionLogs" :key="log.id" class="hover:bg-slate-50">
              <td class="whitespace-nowrap px-4 py-4 text-slate-500">{{ log.createdAt }}</td>
              <td class="px-4 py-4 font-mono text-xs text-slate-700">{{ log.userId }}</td>
              <td class="px-4 py-4 text-slate-700">{{ moduleMeta(log.moduleKey)?.label || log.moduleKey }}</td>
              <td data-testid="user-control-execution-rule-value" class="px-4 py-4 font-medium text-slate-900">{{ valueLabel(log.value) }}</td>
              <td data-testid="user-control-execution-duration-value" class="px-4 py-4 text-slate-600">{{ durationLabel(log.duration) }}</td>
              <td class="px-4 py-4 text-slate-600">{{ sourceLabel(log.source) }}</td>
              <td class="px-4 py-4 font-mono text-xs text-slate-700">{{ log.businessId }}</td>
              <td class="px-4 py-4"><span class="block text-xs text-slate-400">{{ moduleMeta(log.moduleKey)?.family === 'finance' ? '基础收益档位' : '自然/全局结果' }}</span><span class="font-medium text-slate-900">{{ valueLabel(log.beforeValue) }}</span></td>
              <td class="px-4 py-4"><span class="block text-xs text-slate-400">{{ moduleMeta(log.moduleKey)?.family === 'finance' ? '用户收益档位' : '用户最终结果' }}</span><span class="font-medium text-blue-700">{{ valueLabel(log.afterValue) }}</span></td>
              <td class="px-4 py-4"><span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="executionStatusClasses(log.status)">{{ statusLabel(log.status) }}</span></td>
            </tr>
          </tbody>
        </table>
        <p v-if="executionLogs.length === 0" class="px-6 py-14 text-center text-sm text-slate-500">没有符合筛选条件的执行日志</p>
      </div>
    </article>

  </section>
</template>
