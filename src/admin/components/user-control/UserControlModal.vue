<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { USER_CONTROL_MODULES } from '../../../features/user-control/userControl.js'
import {
  buildUserControlPayload,
  getModuleControlOptions,
  isUserControlFormComplete
} from '../../../features/user-control/userControlForm.js'
import { useDialogContentSnapshot, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  scope: {
    type: String,
    default: 'module',
    validator: (value) => ['global', 'module'].includes(value)
  },
  moduleKey: { type: String, default: '' },
  user: { type: Object, default: null },
  existingRules: { type: Object, default: () => ({}) },
  returnFocus: { type: [Object, Function], default: null }
})

const emit = defineEmits(['close', 'submit'])

const dialogRef = ref(null)
const firstControlOption = ref(null)
const initialFocusTarget = computed(() => Array.isArray(firstControlOption.value)
  ? firstControlOption.value[0]
  : firstControlOption.value)
const {
  rendered,
  phase,
  layerStyle,
  requestDialogClose,
  onAfterEnter,
  onAfterLeave
} = useDialogLifecycle({
  open: computed(() => props.open),
  dialogRef,
  initialFocusRef: initialFocusTarget,
  returnFocusRef: computed(() => props.returnFocus),
  requestClose: () => emit('close')
})

const dialogData = computed(() => ({
  scope: props.scope,
  moduleKey: props.moduleKey,
  user: props.user,
  existingRules: props.existingRules
}))
const cloneDialogData = (data) => ({
  scope: data.scope,
  moduleKey: data.moduleKey,
  user: data.user ? { ...data.user } : null,
  existingRules: Object.fromEntries(Object.entries(data.existingRules || {}).map(([key, rule]) => [
    key,
    rule ? { ...rule } : rule
  ]))
})
const { content: displayedDialogData, clear: clearDialogSnapshot } = useDialogContentSnapshot({
  open: computed(() => props.open),
  phase,
  source: dialogData,
  clone: cloneDialogData
})
const displayScope = computed(() => displayedDialogData.value.scope)
const displayModuleKey = computed(() => displayedDialogData.value.moduleKey)
const displayUser = computed(() => displayedDialogData.value.user)
const displayExistingRules = computed(() => displayedDialogData.value.existingRules)
const handleAfterLeave = () => {
  onAfterLeave()
  if (phase.value === 'closed') clearDialogSnapshot()
}

const form = reactive({
  strategy: '',
  value: '',
  duration: '',
  note: ''
})
const noteTouched = ref(false)

const moduleMeta = computed(() => USER_CONTROL_MODULES.find((item) => item.key === displayModuleKey.value) || null)
const selectedUserId = computed(() => String(displayUser.value?.userId ?? displayUser.value?.id ?? ''))
const selectedUserName = computed(() => displayUser.value?.username || displayUser.value?.name || '未选择用户')
const selectedUserEmail = computed(() => displayUser.value?.email || '邮箱未提供')
const currentModuleRule = computed(() => displayExistingRules.value?.[displayModuleKey.value] || null)

const moduleOptions = computed(() => getModuleControlOptions(moduleMeta.value?.family))

const affectedModules = computed(() => displayScope.value === 'global'
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
  if (displayScope.value === 'module') {
    const rule = currentModuleRule.value
    if (!rule) return '当前模块尚未设置用户规则'
    return `${valueLabels[rule.value] || '已设置'} · ${durationLabels[rule.duration] || '—'} · ${statusLabels[rule.status] || rule.status}`
  }

  const rules = Object.values(displayExistingRules.value || {})
  const activeCount = rules.filter((rule) => ['active', 'processing'].includes(rule.status)).length
  return activeCount ? `六个模块中有 ${activeCount} 个当前有效规则，新设置将统一覆盖` : '该用户当前没有生效中的统一规则'
})

const formInput = computed(() => ({
  scope: displayScope.value,
  family: moduleMeta.value?.family,
  userId: selectedUserId.value,
  strategy: form.strategy,
  value: form.value,
  duration: form.duration,
  note: form.note
}))

const isComplete = computed(() => isUserControlFormComplete(formInput.value))

const resetForm = (data) => {
  const openingModule = USER_CONTROL_MODULES.find((item) => item.key === data.moduleKey) || null
  const openingOptions = getModuleControlOptions(openingModule?.family)
  const existing = data.scope === 'module'
    ? data.existingRules?.[data.moduleKey]
    : Object.values(data.existingRules || {}).find((rule) => rule?.strategy)

  form.strategy = existing?.strategy || 'positive'
  form.value = existing?.value || openingOptions[0]?.value || ''
  form.duration = existing?.duration || 'once'
  form.note = ''
  noteTouched.value = false
}

watch(
  [() => props.open, dialogData],
  ([open, data]) => {
    if (open) resetForm(data)
  },
  { immediate: true, deep: true }
)

const close = () => requestDialogClose()

const submit = () => {
  if (phase.value !== 'open' || !isComplete.value) return
  emit('submit', buildUserControlPayload(formInput.value))
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-overlay" appear @after-enter="onAfterEnter" @after-leave="handleAfterLeave">
      <div
        v-if="rendered"
        v-show="phase !== 'closing'"
        class="fixed inset-0 flex items-start justify-center bg-slate-950/50 p-3 sm:items-center"
        role="presentation"
        :style="layerStyle"
      >
        <Transition name="dialog-panel" appear>
          <section
            v-show="phase !== 'closing'"
            ref="dialogRef"
            data-testid="user-control-dialog-frame"
            class="flex max-h-[calc(100vh-1.5rem)] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl supports-[height:100dvh]:max-h-[calc(100dvh-1.5rem)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-control-dialog-title"
          >
        <header class="flex shrink-0 items-start justify-between border-b border-slate-200 px-5 py-3">
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold uppercase tracking-wider text-blue-600">
              {{ displayScope === 'global' ? '六模块统一设置' : `${moduleMeta?.label || '当前模块'}独立设置` }}
            </p>
            <h2 id="user-control-dialog-title" class="mt-0.5 break-words text-lg font-semibold text-slate-900">
              {{ displayScope === 'global' ? '设置用户统一控制' : moduleMeta?.actionLabel }}
            </h2>
            <div data-testid="user-control-target-user" class="mt-0.5 flex min-w-0 flex-wrap gap-x-2 break-words text-sm text-slate-500">
              <span>{{ selectedUserName }}</span>
              <span>UID {{ selectedUserId || '—' }}</span>
              <span class="break-all">{{ selectedUserEmail }}</span>
            </div>
          </div>
          <button type="button" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="关闭" @click="close">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div data-testid="user-control-dialog-body" class="min-h-0 flex-1 overflow-y-auto space-y-2.5 px-5 py-3">
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            <p class="text-xs font-medium text-slate-500">现有规则</p>
            <p class="mt-0.5 text-sm font-medium text-slate-800">{{ existingSummary }}</p>
            <p
              v-if="displayScope === 'global'"
              data-testid="user-control-global-atomic-warning"
              class="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs leading-4 text-amber-800"
            >
              保存会覆盖该用户在六个模块中的现有规则；任一模块设置失败，六个模块全部保持原状态。
            </p>
          </div>

          <fieldset>
            <legend class="text-sm font-semibold text-slate-900">控制方向</legend>
            <div v-if="displayScope === 'global'" class="mt-1.5 grid gap-2 sm:grid-cols-2">
              <label
                v-for="(option, index) in [
                  { value: 'positive', label: '正向控制', desc: '交易盈利、理财高收益' },
                  { value: 'negative', label: '负向控制', desc: '交易亏损、理财低收益' }
                ]"
                :key="option.value"
                class="cursor-pointer rounded-xl border p-2.5 transition"
                :class="form.strategy === option.value ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300'"
              >
                <span class="flex items-center gap-2">
                  <input v-if="index === 0" ref="firstControlOption" v-model="form.strategy" type="radio" name="strategy" :value="option.value" class="text-blue-600 focus:ring-blue-500" />
                  <input v-else v-model="form.strategy" type="radio" name="strategy" :value="option.value" class="text-blue-600 focus:ring-blue-500" />
                  <span class="font-medium text-slate-900">{{ option.label }}</span>
                </span>
                <span class="mt-0.5 block pl-6 text-xs text-slate-500">{{ option.desc }}</span>
              </label>
            </div>

            <div v-else class="mt-1.5 grid gap-2 sm:grid-cols-2">
              <label
                v-for="(option, index) in moduleOptions"
                :key="option.value"
                class="cursor-pointer rounded-xl border p-2.5 transition"
                :class="form.value === option.value ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300'"
              >
                <span class="flex items-center gap-2">
                  <input v-if="index === 0" ref="firstControlOption" v-model="form.value" type="radio" name="value" :value="option.value" class="text-blue-600 focus:ring-blue-500" />
                  <input v-else v-model="form.value" type="radio" name="value" :value="option.value" class="text-blue-600 focus:ring-blue-500" />
                  <span class="font-medium text-slate-900">{{ option.label }}</span>
                </span>
                <span class="mt-0.5 block pl-6 text-xs text-slate-500">{{ option.description }}</span>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend class="text-sm font-semibold text-slate-900">生效方式</legend>
            <div class="mt-1.5 grid gap-2 sm:grid-cols-2">
              <label
                v-for="option in [
                  { value: 'once', label: '一次性', desc: '下一次符合条件的结算成功后自动结束' },
                  { value: 'permanent', label: '永久', desc: '持续作用于后续有效结算，直至取消或覆盖' }
                ]"
                :key="option.value"
                class="cursor-pointer rounded-xl border p-2.5 transition"
                :class="form.duration === option.value ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300'"
              >
                <span class="flex items-center gap-2">
                  <input v-model="form.duration" type="radio" name="duration" :value="option.value" class="text-blue-600 focus:ring-blue-500" />
                  <span class="font-medium text-slate-900">{{ option.label }}</span>
                </span>
                <span class="mt-0.5 block pl-6 text-xs text-slate-500">{{ option.desc }}</span>
              </label>
            </div>
          </fieldset>

          <div>
            <p class="text-sm font-semibold text-slate-900">影响模块</p>
            <div class="mt-1 flex flex-wrap gap-1.5">
              <span v-for="item in affectedModules" :key="item.key" class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                {{ item.label }}
              </span>
            </div>
          </div>

          <label class="block">
            <span class="text-sm font-semibold text-slate-900">操作备注 <span class="text-rose-500">*</span></span>
            <textarea
              v-model="form.note"
              rows="2"
              maxlength="200"
              placeholder="请说明设置原因，便于后续审计"
              class="mt-1.5 w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2"
              :class="noteTouched && !form.note.trim() ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'"
              :aria-invalid="noteTouched && !form.note.trim()"
              aria-describedby="user-control-note-help"
              @blur="noteTouched = true"
            />
            <span id="user-control-note-help" class="mt-1 flex justify-between text-xs">
              <span :class="noteTouched && !form.note.trim() ? 'text-rose-600' : 'text-slate-500'">
                {{ noteTouched && !form.note.trim() ? '请填写操作备注后再确认' : '必填，最多 200 字' }}
              </span>
              <span class="text-slate-400">{{ form.note.length }}/200</span>
            </span>
          </label>
        </div>

        <footer class="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button type="button" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" @click="close">
            取消
          </button>
          <button
            type="button"
            :disabled="phase !== 'open' || !isComplete"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            @click="submit"
          >
            确认设置
          </button>
        </footer>
          </section>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
