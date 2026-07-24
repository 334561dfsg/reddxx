<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { USER_CONTROL_MODULES } from '../../../features/user-control/userControl.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  scope: {
    type: String,
    default: 'module',
    validator: (value) => ['global', 'module'].includes(value)
  },
  moduleKey: { type: String, default: '' },
  user: { type: Object, default: null },
  existingRules: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['close', 'submit'])

const form = reactive({
  strategy: '',
  value: '',
  duration: '',
  note: ''
})
const attempted = ref(false)

const moduleMeta = computed(() => USER_CONTROL_MODULES.find((item) => item.key === props.moduleKey) || null)
const selectedUserId = computed(() => String(props.user?.userId ?? props.user?.id ?? ''))
const selectedUserName = computed(() => props.user?.username || props.user?.name || '未选择用户')
const currentModuleRule = computed(() => props.existingRules?.[props.moduleKey] || null)

const moduleOptions = computed(() => moduleMeta.value?.family === 'finance'
  ? [
      { value: 'highYield', label: '高收益', description: '使用产品允许范围内的较高收益档位' },
      { value: 'lowYield', label: '低收益', description: '使用产品允许范围内的较低收益档位' }
    ]
  : [
      { value: 'profit', label: '盈利', description: '最终结算后的已实现净收益为正' },
      { value: 'loss', label: '亏损', description: '最终结算后的已实现净收益为负' }
    ])

const affectedModules = computed(() => props.scope === 'global'
  ? USER_CONTROL_MODULES
  : moduleMeta.value ? [moduleMeta.value] : [])

const valueLabels = {
  profit: '盈利',
  loss: '亏损',
  highYield: '高收益',
  lowYield: '低收益'
}
const durationLabels = { once: '一次性', permanent: '永久' }
const statusLabels = {
  active: '当前有效',
  processing: '处理中',
  consumed: '已执行',
  cancelled: '已取消',
  superseded: '已覆盖'
}

const existingSummary = computed(() => {
  if (props.scope === 'module') {
    const rule = currentModuleRule.value
    if (!rule) return '当前模块尚未设置用户规则'
    return `${valueLabels[rule.value] || '已设置'} · ${durationLabels[rule.duration] || '—'} · ${statusLabels[rule.status] || rule.status}`
  }

  const rules = Object.values(props.existingRules || {})
  const activeCount = rules.filter((rule) => ['active', 'processing'].includes(rule.status)).length
  return activeCount ? `六个模块中有 ${activeCount} 个当前有效规则，新设置将统一覆盖` : '该用户当前没有生效中的统一规则'
})

const isComplete = computed(() => Boolean(
  selectedUserId.value
  && (props.scope === 'global' ? form.strategy : form.value)
  && form.duration
  && form.note.trim()
))

const resetForm = () => {
  const existing = props.scope === 'module'
    ? currentModuleRule.value
    : Object.values(props.existingRules || {}).find((rule) => rule.strategy)

  form.strategy = existing?.strategy || 'positive'
  form.value = existing?.value || moduleOptions.value[0]?.value || ''
  form.duration = existing?.duration || 'once'
  form.note = ''
  attempted.value = false
}

watch(
  () => [props.open, props.scope, props.moduleKey, props.user, props.existingRules],
  ([open]) => {
    if (open) resetForm()
  },
  { immediate: true, deep: true }
)

const close = () => emit('close')

const submit = () => {
  attempted.value = true
  if (!isComplete.value) return

  emit('submit', {
    userId: selectedUserId.value,
    ...(props.scope === 'global' ? { strategy: form.strategy } : { value: form.value }),
    duration: form.duration,
    note: form.note.trim()
  })
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="presentation"
      @mousedown.self="close"
    >
      <section
        class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        :aria-label="scope === 'global' ? '统一用户控制设置' : `${moduleMeta?.label || ''}用户控制设置`"
      >
        <header class="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-blue-600">
              {{ scope === 'global' ? '六模块统一设置' : `${moduleMeta?.label || '当前模块'}独立设置` }}
            </p>
            <h2 class="mt-1 text-xl font-semibold text-slate-900">
              {{ scope === 'global' ? '设置用户统一控制' : moduleMeta?.actionLabel }}
            </h2>
            <p class="mt-1 text-sm text-slate-500">{{ selectedUserName }} · UID {{ selectedUserId || '—' }}</p>
          </div>
          <button type="button" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="关闭" @click="close">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div class="space-y-5 px-6 py-5">
          <div v-if="scope === 'module'" class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            本次操作只影响当前模块，其他五个模块的用户规则保持不变。
          </div>

          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-xs font-medium text-slate-500">现有规则</p>
            <p class="mt-1 text-sm font-medium text-slate-800">{{ existingSummary }}</p>
          </div>

          <fieldset>
            <legend class="text-sm font-semibold text-slate-900">控制方向</legend>
            <div v-if="scope === 'global'" class="mt-3 grid gap-3 sm:grid-cols-2">
              <label
                v-for="option in [
                  { value: 'positive', label: '正向控制', desc: '交易盈利、理财高收益' },
                  { value: 'negative', label: '负向控制', desc: '交易亏损、理财低收益' }
                ]"
                :key="option.value"
                class="cursor-pointer rounded-xl border p-4 transition"
                :class="form.strategy === option.value ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300'"
              >
                <span class="flex items-center gap-2">
                  <input v-model="form.strategy" type="radio" name="strategy" :value="option.value" class="text-blue-600 focus:ring-blue-500" />
                  <span class="font-medium text-slate-900">{{ option.label }}</span>
                </span>
                <span class="mt-1 block pl-6 text-xs text-slate-500">{{ option.desc }}</span>
              </label>
            </div>

            <div v-else class="mt-3 grid gap-3 sm:grid-cols-2">
              <label
                v-for="option in moduleOptions"
                :key="option.value"
                class="cursor-pointer rounded-xl border p-4 transition"
                :class="form.value === option.value ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300'"
              >
                <span class="flex items-center gap-2">
                  <input v-model="form.value" type="radio" name="value" :value="option.value" class="text-blue-600 focus:ring-blue-500" />
                  <span class="font-medium text-slate-900">{{ option.label }}</span>
                </span>
                <span class="mt-1 block pl-6 text-xs text-slate-500">{{ option.description }}</span>
              </label>
            </div>
          </fieldset>

          <div v-if="scope === 'global'" class="grid gap-3 md:grid-cols-2">
            <div class="rounded-lg border border-slate-200 p-3">
              <p class="text-xs text-slate-500">交易类效果</p>
              <p class="font-medium text-slate-900">{{ form.strategy === 'positive' ? '盈利' : '亏损' }}</p>
            </div>
            <div class="rounded-lg border border-slate-200 p-3">
              <p class="text-xs text-slate-500">理财类效果</p>
              <p class="font-medium text-slate-900">{{ form.strategy === 'positive' ? '高收益' : '低收益' }}</p>
            </div>
          </div>

          <fieldset>
            <legend class="text-sm font-semibold text-slate-900">生效方式</legend>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <label
                v-for="option in [
                  { value: 'once', label: '一次性', desc: '下一次符合条件的结算成功后自动结束' },
                  { value: 'permanent', label: '永久', desc: '持续作用于后续有效结算，直至取消或覆盖' }
                ]"
                :key="option.value"
                class="cursor-pointer rounded-xl border p-4 transition"
                :class="form.duration === option.value ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300'"
              >
                <span class="flex items-center gap-2">
                  <input v-model="form.duration" type="radio" name="duration" :value="option.value" class="text-blue-600 focus:ring-blue-500" />
                  <span class="font-medium text-slate-900">{{ option.label }}</span>
                </span>
                <span class="mt-1 block pl-6 text-xs text-slate-500">{{ option.desc }}</span>
              </label>
            </div>
          </fieldset>

          <div>
            <p class="text-sm font-semibold text-slate-900">影响模块</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <span v-for="item in affectedModules" :key="item.key" class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {{ item.label }}
              </span>
            </div>
          </div>

          <label class="block">
            <span class="text-sm font-semibold text-slate-900">操作备注 <span class="text-rose-500">*</span></span>
            <textarea
              v-model="form.note"
              rows="3"
              maxlength="200"
              placeholder="请说明设置原因，便于后续审计"
              class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <span class="mt-1 flex justify-between text-xs">
              <span :class="attempted && !form.note.trim() ? 'text-rose-600' : 'text-slate-500'">
                {{ attempted && !form.note.trim() ? '请填写操作备注后再确认' : '必填，最多 200 字' }}
              </span>
              <span class="text-slate-400">{{ form.note.length }}/200</span>
            </span>
          </label>

          <p v-if="attempted && !isComplete" class="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            请选择完整的控制内容、生效方式并填写操作备注。
          </p>
        </div>

        <footer class="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button type="button" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" @click="close">
            取消
          </button>
          <button
            type="button"
            :disabled="!isComplete"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            @click="submit"
          >
            确认设置
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
