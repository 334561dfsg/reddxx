<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usersList } from '../../../admin/mock/user.js'
import {
  resetUserControlDemo,
  setUnifiedUserControl,
  setUserControlFailureModule,
  simulateUserControlExecution,
  userControlState
} from '../../../admin/state/userControlState.js'
import {
  getUserControlSimulationValues,
  isUserControlSimulationValue,
  normalizeUserControlLogQuery,
  snapshotUserControlRules,
  USER_CONTROL_MODULES
} from '../../../features/user-control/userControl.js'

const route = useRoute()
const router = useRouter()

const activeTab = ref('operation')
const filters = reactive({
  userId: '',
  module: '',
  source: '',
  action: ''
})
const simulation = reactive({
  userId: '',
  moduleKey: 'delivery',
  ...getUserControlSimulationValues('delivery')
})
const simulationMessage = ref('')
const failureMessage = ref('')
const atomicProof = ref('')

const userMap = computed(() => {
  const map = new Map(usersList.map((user) => [String(user.id), user]))
  Object.keys(userControlState.value.rules).forEach((userId) => {
    if (!map.has(userId)) map.set(userId, { id: userId, username: `demo_user_${userId}` })
  })
  return map
})

const userOptions = computed(() => [...userMap.value.entries()]
  .map(([userId, user]) => ({ userId, label: `${user.username} · UID ${userId}` })))

const moduleMeta = (moduleKey) => USER_CONTROL_MODULES.find((module) => module.key === moduleKey)
const selectedModule = computed(() => moduleMeta(simulation.moduleKey) || USER_CONTROL_MODULES[0])
const selectedRule = computed(() => userControlState.value.rules[simulation.userId]?.[simulation.moduleKey] || null)
const simulationValuesValid = computed(() => (
  isUserControlSimulationValue(simulation.moduleKey, simulation.beforeValue)
  && isUserControlSimulationValue(simulation.moduleKey, simulation.afterValue)
))
const canSimulate = computed(() => simulationValuesValid.value
  && selectedRule.value?.status === 'active'
  && selectedRule.value?.duration === 'once')
const hasSixModuleSnapshot = computed(() => USER_CONTROL_MODULES.every((module) => (
  userControlState.value.rules[simulation.userId]?.[module.key]
)))

const resultOptions = computed(() => selectedModule.value.family === 'finance'
  ? [{ value: 'highYield', label: '高收益' }, { value: 'lowYield', label: '低收益' }]
  : [{ value: 'profit', label: '盈利' }, { value: 'loss', label: '亏损' }])

watch(() => [simulation.userId, simulation.moduleKey], () => {
  Object.assign(simulation, getUserControlSimulationValues(simulation.moduleKey, selectedRule.value?.value))
  simulationMessage.value = ''
  failureMessage.value = ''
  atomicProof.value = ''
}, { immediate: true })

const syncRouteQuery = () => {
  const normalized = normalizeUserControlLogQuery({
    userId: route.query.userId,
    module: route.query.module
  })
  filters.userId = normalized.userId
  filters.module = normalized.module
  simulation.userId = normalized.userId
  simulation.moduleKey = normalized.module || 'delivery'
}

watch(
  () => [route.query.userId, route.query.module],
  syncRouteQuery,
  { immediate: true }
)

const operationLogs = computed(() => userControlState.value.operationLogs.filter((log) => (
  (!filters.userId || log.userId === filters.userId)
  && (!filters.module || log.modules?.includes(filters.module))
  && (!filters.source || log.scope === filters.source)
  && (!filters.action || log.action === filters.action)
)))

const executionLogs = computed(() => userControlState.value.executionLogs.filter((log) => (
  (!filters.userId || log.userId === filters.userId)
  && (!filters.module || log.moduleKey === filters.module)
  && (!filters.source || log.source === filters.source)
  && (!filters.action || filters.action === 'execute')
)))

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

const formatTime = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const simulateOnce = () => {
  if (!simulationValuesValid.value) {
    simulationMessage.value = '模拟结果与所选模块类型不匹配，未写入执行日志。'
    return
  }
  if (!canSimulate.value) {
    simulationMessage.value = '仅可模拟当前有效且尚未消费的一次性规则。'
    return
  }
  const businessId = `demo-${simulation.moduleKey}-${Date.now()}`
  simulateUserControlExecution({
    userId: simulation.userId,
    moduleKey: simulation.moduleKey,
    beforeValue: simulation.beforeValue,
    afterValue: simulation.afterValue,
    businessId,
    now: formatTime()
  })
  simulationMessage.value = `已生成执行日志 ${businessId}；该一次性规则已消费，不能重复执行。`
}

const cloneModuleRules = () => snapshotUserControlRules(userControlState.value, simulation.userId)

const simulateFailure = () => {
  if (!hasSixModuleSnapshot.value) {
    failureMessage.value = '所选用户没有完整六模块旧状态，无法执行原子失败演示。'
    atomicProof.value = ''
    return
  }

  const before = cloneModuleRules()
  setUserControlFailureModule(simulation.moduleKey)
  setUnifiedUserControl({
    userId: simulation.userId,
    strategy: 'positive',
    duration: 'once',
    note: 'Demo 原子写入失败演示',
    now: formatTime(),
    batchId: `demo-failure-${Date.now()}`
  })
  const after = cloneModuleRules()
  const unchanged = USER_CONTROL_MODULES.every((module) => (
    JSON.stringify(before[module.key]) === JSON.stringify(after[module.key])
  ))
  failureMessage.value = userControlState.value.lastError
    || `模块 ${simulation.moduleKey} 写入失败，六个模块均未更新`
  atomicProof.value = unchanged
    ? '原子性校验通过：失败前后六个模块旧状态完全一致。'
    : '原子性校验失败：检测到模块状态发生变化。'
}

const clearFailure = () => {
  setUserControlFailureModule('')
  failureMessage.value = '失败开关已清除，可再次进行普通 Demo 操作。'
}

const restoreDemo = () => {
  if (!window.confirm('确认恢复用户控制演示数据？当前前端 Demo 改动将被覆盖。')) return
  resetUserControlDemo()
  filters.source = ''
  filters.action = ''
  syncRouteQuery()
  simulationMessage.value = '演示数据已恢复。'
  failureMessage.value = ''
  atomicProof.value = ''
}

const clearFilters = async () => {
  filters.source = ''
  filters.action = ''
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
      <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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
        <div class="flex items-end">
          <button type="button" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50" @click="clearFilters">清除筛选</button>
        </div>
      </div>
    </article>

    <article class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div v-if="activeTab === 'operation'" id="user-control-operation-panel" role="tabpanel" aria-labelledby="user-control-operation-tab" tabindex="0" class="overflow-x-auto">
        <table class="w-full min-w-[1180px] text-left text-sm">
          <thead class="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th class="px-4 py-3">操作时间</th><th class="px-4 py-3">UID</th><th class="px-4 py-3">模块</th><th class="px-4 py-3">规则来源</th><th class="px-4 py-3">操作类型</th><th class="px-4 py-3">变更前</th><th class="px-4 py-3">变更后</th><th class="px-4 py-3">操作备注</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="log in operationLogs" :key="log.id" class="align-top hover:bg-slate-50">
              <td class="whitespace-nowrap px-4 py-4 text-slate-500">{{ log.createdAt }}</td>
              <td class="px-4 py-4 font-mono text-xs text-slate-700">{{ log.userId }}</td>
              <td class="px-4 py-4 text-slate-700">{{ log.modules.map((key) => moduleMeta(key)?.label || key).join('、') }}</td>
              <td class="px-4 py-4 text-slate-600">{{ sourceLabel(log.scope) }}</td>
              <td class="px-4 py-4 font-medium text-slate-900">{{ actionLabel(log.action) }}</td>
              <td class="max-w-xs px-4 py-4 text-xs leading-5 text-slate-500">{{ formatRule(log.before) }}</td>
              <td class="max-w-xs px-4 py-4 text-xs leading-5 text-slate-700">{{ formatOperationAfter(log) }}</td>
              <td class="max-w-xs px-4 py-4 text-slate-600">{{ log.note }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="operationLogs.length === 0" class="px-6 py-14 text-center text-sm text-slate-500">没有符合筛选条件的操作日志</p>
      </div>

      <div v-else id="user-control-execution-panel" role="tabpanel" aria-labelledby="user-control-execution-tab" tabindex="0" class="overflow-x-auto">
        <table class="w-full min-w-[1080px] text-left text-sm">
          <thead class="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th class="px-4 py-3">操作时间</th><th class="px-4 py-3">UID</th><th class="px-4 py-3">模块</th><th class="px-4 py-3">规则来源</th><th class="px-4 py-3">业务单号</th><th class="px-4 py-3">自然/全局结果 · 基础收益档位</th><th class="px-4 py-3">用户最终结果 · 用户收益档位</th><th class="px-4 py-3">执行状态</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="log in executionLogs" :key="log.id" class="hover:bg-slate-50">
              <td class="whitespace-nowrap px-4 py-4 text-slate-500">{{ log.createdAt }}</td>
              <td class="px-4 py-4 font-mono text-xs text-slate-700">{{ log.userId }}</td>
              <td class="px-4 py-4 text-slate-700">{{ moduleMeta(log.moduleKey)?.label || log.moduleKey }}</td>
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

    <article class="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/60 p-5">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="text-lg font-semibold text-amber-950">Demo 模拟工具</h2>
          <p class="mt-1 text-sm text-amber-800">仅用于演示一次性消费和原子失败；不发送请求，也不会触发真实订单、收益或结算。</p>
        </div>
        <span class="rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold text-amber-900">非生产操作</span>
      </div>

      <div class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label class="space-y-1 text-xs font-medium text-amber-900"><span>演示用户</span><select v-model="simulation.userId" class="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-normal text-slate-900"><option value="">请选择演示用户</option><option v-for="user in userOptions" :key="user.userId" :value="user.userId">{{ user.label }}</option></select></label>
        <label class="space-y-1 text-xs font-medium text-amber-900"><span>演示模块</span><select v-model="simulation.moduleKey" class="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-normal text-slate-900"><option v-for="module in USER_CONTROL_MODULES" :key="module.key" :value="module.key">{{ module.label }}</option></select></label>
        <label class="space-y-1 text-xs font-medium text-amber-900"><span>{{ selectedModule.family === 'finance' ? '基础收益档位' : '自然/全局结果' }}</span><select v-model="simulation.beforeValue" class="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-normal text-slate-900"><option v-for="option in resultOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
        <label class="space-y-1 text-xs font-medium text-amber-900"><span>{{ selectedModule.family === 'finance' ? '用户收益档位' : '用户最终结果' }}</span><select v-model="simulation.afterValue" class="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-normal text-slate-900"><option v-for="option in resultOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
      </div>

      <div class="mt-4 rounded-lg border border-amber-200 bg-white/80 p-4 text-sm text-slate-700">
        <p>当前规则：<span class="font-medium">{{ selectedRule ? `${valueLabel(selectedRule.value)} · ${selectedRule.duration === 'once' ? '一次性' : '永久'} · ${selectedRule.status}` : '未设置' }}</span></p>
        <p class="mt-1 text-xs text-slate-500">一次性执行按钮仅在规则状态为 active 且 duration 为 once 时可用。</p>
      </div>

      <div class="mt-4 flex flex-wrap gap-3">
        <button type="button" :disabled="!canSimulate" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40" @click="simulateOnce">模拟一次性执行</button>
        <button type="button" :disabled="!hasSixModuleSnapshot" class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40" @click="simulateFailure">模拟写入失败</button>
        <button type="button" :disabled="!userControlState.failureModule" class="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 disabled:cursor-not-allowed disabled:opacity-40" @click="clearFailure">清除失败开关</button>
        <button type="button" class="rounded-lg border border-amber-400 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100" @click="restoreDemo">恢复演示数据</button>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <p v-if="simulationMessage" role="status" aria-live="polite" class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">{{ simulationMessage }}</p>
        <div role="status" aria-live="polite" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          <p>失败开关：<span class="font-semibold">{{ userControlState.failureModule || '未开启' }}</span></p>
          <p v-if="failureMessage" class="mt-1">{{ failureMessage }}</p>
          <p v-if="atomicProof" class="mt-1 font-medium">{{ atomicProof }}</p>
        </div>
      </div>
    </article>
  </section>
</template>
