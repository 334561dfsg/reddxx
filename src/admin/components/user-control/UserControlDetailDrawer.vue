<script setup>
import { computed } from 'vue'
import {
  summarizeUserControl,
  USER_CONTROL_MODULES
} from '../../../features/user-control/userControl.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  user: { type: Object, default: null },
  rules: { type: Object, default: () => ({}) },
  operationLogs: { type: Array, default: () => [] },
  executionLogs: { type: Array, default: () => [] }
})

const emit = defineEmits(['close'])

const userId = computed(() => String(props.user?.userId ?? props.user?.id ?? ''))
const summary = computed(() => summarizeUserControl({ rules: { [userId.value]: props.rules } }, userId.value))

const valueLabel = (value) => ({
  profit: '盈利',
  loss: '亏损',
  highYield: '高收益',
  lowYield: '低收益'
})[value] || '未设置'

const durationLabel = (duration) => ({ once: '一次性', permanent: '永久' })[duration] || '—'

const statusMeta = (rule) => {
  if (!rule) return { label: '未设置', classes: 'bg-slate-100 text-slate-600' }
  if (rule.status === 'active' && rule.duration === 'once') return { label: '待执行', classes: 'bg-amber-100 text-amber-700' }
  if (rule.status === 'active') return { label: '生效中', classes: 'bg-emerald-100 text-emerald-700' }
  return ({
    processing: { label: '处理中', classes: 'bg-blue-100 text-blue-700' },
    consumed: { label: '已执行', classes: 'bg-slate-100 text-slate-600' },
    cancelled: { label: '已取消', classes: 'bg-rose-100 text-rose-700' },
    superseded: { label: '已覆盖', classes: 'bg-violet-100 text-violet-700' }
  })[rule.status] || { label: rule.status, classes: 'bg-slate-100 text-slate-600' }
}

const sourceLabel = (source) => ({
  global: '用户管理统一设置',
  module: '模块独立设置'
})[source] || '—'

const lastExecution = (moduleKey) => props.executionLogs.find((log) => (
  String(log.userId) === userId.value && log.moduleKey === moduleKey
)) || null

const userOperations = computed(() => props.operationLogs
  .filter((log) => String(log.userId) === userId.value)
  .slice(0, 3))

const summaryMeta = computed(() => {
  if (summary.value.kind === 'divergent') {
    return {
      classes: 'border-amber-200 bg-amber-50 text-amber-800',
      description: '存在差异：模块独立设置、取消或覆盖使当前六模块配置不再完全一致。'
    }
  }
  if (summary.value.kind === 'progress') {
    return {
      classes: 'border-slate-200 bg-slate-50 text-slate-700',
      description: '一次性规则正按模块陆续完成；已执行属于正常进度，不代表配置存在差异。'
    }
  }
  return {
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    description: summary.value.kind === 'synced' ? '六个模块沿用同一批统一配置。' : '当前没有生效中的统一控制。'
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex justify-end bg-slate-950/40" @mousedown.self="emit('close')">
      <aside class="flex h-full w-full max-w-5xl flex-col bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="用户控制详情">
        <header class="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-blue-600">六模块统一控制详情</p>
            <h2 class="mt-1 text-xl font-semibold text-slate-900">{{ user?.username || '用户' }}</h2>
            <p class="mt-1 text-sm text-slate-500">UID {{ userId || '—' }} · {{ user?.email || '—' }}</p>
          </div>
          <button type="button" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="关闭" @click="emit('close')">×</button>
        </header>

        <div class="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <section class="rounded-xl border p-4" :class="summaryMeta.classes">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="font-semibold">模块状态：{{ summary.label }}</p>
              <span class="rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium">{{ summary.total }} 个模块</span>
            </div>
            <p class="mt-1 text-sm leading-6">{{ summaryMeta.description }}</p>
          </section>

          <section class="overflow-hidden rounded-xl border border-slate-200">
            <div class="overflow-x-auto">
              <table class="w-full min-w-[940px] text-left text-sm">
                <thead class="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th class="px-4 py-3">模块</th>
                    <th class="px-4 py-3">当前控制</th>
                    <th class="px-4 py-3">生效方式</th>
                    <th class="px-4 py-3">状态</th>
                    <th class="px-4 py-3">规则来源</th>
                    <th class="px-4 py-3">更新时间</th>
                    <th class="px-4 py-3">最近执行</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="module in USER_CONTROL_MODULES" :key="module.key">
                    <td class="px-4 py-4">
                      <p class="font-medium text-slate-900">{{ module.label }}</p>
                      <p class="mt-0.5 text-xs text-slate-400">{{ module.actionLabel }}</p>
                    </td>
                    <td class="px-4 py-4 font-medium" :class="rules[module.key] ? 'text-slate-900' : 'text-slate-400'">{{ valueLabel(rules[module.key]?.value) }}</td>
                    <td class="px-4 py-4 text-slate-600">{{ durationLabel(rules[module.key]?.duration) }}</td>
                    <td class="px-4 py-4">
                      <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium" :class="statusMeta(rules[module.key]).classes">
                        {{ statusMeta(rules[module.key]).label }}
                      </span>
                    </td>
                    <td class="px-4 py-4 text-slate-600">{{ sourceLabel(rules[module.key]?.source) }}</td>
                    <td class="px-4 py-4 text-slate-500">{{ rules[module.key]?.updatedAt || '—' }}</td>
                    <td class="px-4 py-4 text-slate-500">
                      <template v-if="lastExecution(module.key)">
                        <p class="font-medium text-slate-700">{{ valueLabel(lastExecution(module.key).afterValue) }}</p>
                        <p class="mt-0.5 text-xs">{{ lastExecution(module.key).createdAt }}</p>
                      </template>
                      <span v-else>暂无执行记录</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 class="text-sm font-semibold text-slate-900">最近操作</h3>
            <div v-if="userOperations.length" class="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
              <div v-for="log in userOperations" :key="log.id" class="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                <div>
                  <p class="font-medium text-slate-800">{{ log.action === 'cancel' ? '取消控制' : '设置控制' }}</p>
                  <p class="mt-0.5 text-xs text-slate-500">{{ log.note }}</p>
                </div>
                <time class="shrink-0 text-xs text-slate-400">{{ log.createdAt }}</time>
              </div>
            </div>
            <p v-else class="mt-2 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">暂无操作记录</p>
          </section>
        </div>
      </aside>
    </div>
  </Teleport>
</template>
