<script setup>
import AdminDialog from '../antd/AdminDialog.vue'
import { AdminButton, AdminTextarea } from '../antd/controls.js'

import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  USER_CONTROL_MODULES,
  USER_CONTROL_UNIFIED_MODULES
} from '../../../features/user-control/userControl.js'
import {
  buildUserControlPayload,
  isUserControlFormComplete
} from '../../../features/user-control/userControlForm.js'
import SelectOnlyCombobox from '../form/SelectOnlyCombobox.vue'
import { useDialogContentSnapshot } from '../../composables/useDialogLifecycle.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  scope: {
    type: String,
    default: 'module',
    validator: (value) => ['global', 'module'].includes(value)
  },
  moduleKey: { type: String, default: '' },
  unifiedModuleKeys: { type: Array, default: () => [] },
  showHelpPanel: { type: Boolean, default: true },
  noteRequired: { type: Boolean, default: true },
  user: { type: Object, default: null },
  existingRules: { type: Object, default: () => ({}) },
  returnFocus: { type: [Object, Function], default: null }
})

const emit = defineEmits(['close', 'submit'])

const firstControlSelect = ref(null)
const leftPanelRef = ref(null)
const helpPanelMaxHeight = ref('')
let leftPanelResizeObserver = null
const initialFocusTarget = computed(() => firstControlSelect.value)
// Frame: AdminDialog (Ant Modal + useDialogLifecycle), dialog migration 2026-11-27.
const dialogFrame = ref(null)
const phase = computed(() => dialogFrame.value?.phase ?? 'closed')
const initialFocus = computed(() => initialFocusTarget.value)

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
const isGlobalScope = computed(() => displayScope.value === 'global')
const displayModuleKey = computed(() => displayedDialogData.value.moduleKey)
const displayUser = computed(() => displayedDialogData.value.user)
const handleClosed = () => {
  clearDialogSnapshot()
}

const form = reactive({
  strategy: '',
  duration: 'permanent',
  note: ''
})
const noteTouched = ref(false)
const DEFAULT_CONTROL_STRATEGY = 'negative'
const SIMPLE_GLOBAL_CONTROL_TYPE_OPTIONS = Object.freeze([
  Object.freeze({ value: 'negative', label: '永久亏损', description: '长期按亏损方向处理该用户点控' }),
  Object.freeze({ value: 'positive', label: '永久盈利', description: '长期按盈利方向处理该用户点控' }),
  Object.freeze({ value: 'normal', label: '正常', description: '恢复为正常结算，不再对该用户执行点控' })
])

const moduleMeta = computed(() => USER_CONTROL_MODULES.find((item) => item.key === displayModuleKey.value) || null)
const globalModules = computed(() => {
  const requestedKeys = new Set(props.unifiedModuleKeys.map((key) => String(key || '')).filter(Boolean))
  const modules = USER_CONTROL_UNIFIED_MODULES.filter((module) => !requestedKeys.size || requestedKeys.has(module.key))
  return modules.length ? modules : USER_CONTROL_UNIFIED_MODULES
})
const selectedUserId = computed(() => String(displayUser.value?.userId ?? displayUser.value?.id ?? ''))
const selectedUserName = computed(() => displayUser.value?.username || displayUser.value?.name || '未选择用户')
const selectedUserEmail = computed(() => displayUser.value?.email || '邮箱未提供')

const controlTypeOptions = computed(() => SIMPLE_GLOBAL_CONTROL_TYPE_OPTIONS)
const selectedControlType = computed(() => controlTypeOptions.value.find((option) => option.value === form.strategy) || null)
const shouldShowHelpPanel = computed(() => props.showHelpPanel)

const affectedModules = computed(() => isGlobalScope.value
  ? globalModules.value
  : moduleMeta.value ? [moduleMeta.value] : [])

const effectiveOrderNotice = '只对点控开始之后产生的订单生效；点控前订单和已完成历史订单不受影响。'

const moduleRuleCatalog = Object.freeze({
  delivery: {
    title: '交割点控规则',
    scope: '影响当前用户交割合约订单的最终结算价格，不影响公共行情、产品配置和其他用户订单。',
    pointMethod: '通过结算价偏移处理：买涨盈利向上偏移、亏损向下偏移；买跌盈利向下偏移、亏损向上偏移。',
    effect: '默认长期生效。盈利时：买涨结算价向上偏移，买跌结算价向下偏移；亏损时：买涨结算价向下偏移，买跌结算价向上偏移。',
    example: '说明：实际按永久盈利或永久亏损方向在结算时处理价格偏移。'
  }
})

const globalRuleCatalog = Object.freeze([
  {
    key: 'trade',
    label: '交割',
    title: '交易模块规则',
    scope: '只影响目标用户交割合约订单，不改变公共行情、K线、盘口和其他用户订单。',
    pointMethod: '交割通过结算价偏移处理。',
    effect: '默认长期生效。交割在结算时按方向控制结算价。',
    example: '说明：实际按永久盈利或永久亏损方向在结算时处理价格偏移。'
  }
])

const fallbackModuleRule = Object.freeze({
  title: '当前模块规则',
  scope: '影响当前用户在当前模块的最终结算或实际入账结果。',
  pointMethod: '当前模块在最终结算或实际入账时读取点控规则，并按模块自身规则处理。',
  effect: '默认长期生效。当前模块在最终结算或实际入账时读取点控规则；未完成、失败或预估数据不触发。',
  example: '示例：用户产生最终结算时，模块按当前选择的盈利或亏损方向生成结果。'
})

const ruleModules = computed(() => isGlobalScope.value
  ? globalModules.value
  : moduleMeta.value ? [moduleMeta.value] : [])

const displayedModuleRules = computed(() => {
  if (isGlobalScope.value && ruleModules.value.length === USER_CONTROL_UNIFIED_MODULES.length) return globalRuleCatalog
  return ruleModules.value.map((module) => ({
    key: module.key,
    label: module.label,
    ...(moduleRuleCatalog[module.key] || fallbackModuleRule)
  }))
})

const formInput = computed(() => ({
  scope: displayScope.value,
  moduleKey: displayModuleKey.value,
  modules: isGlobalScope.value ? globalModules.value.map((module) => module.key) : undefined,
  family: moduleMeta.value?.family,
  userId: selectedUserId.value,
  strategy: form.strategy,
  intensity: {},
  duration: form.duration,
  noteRequired: props.noteRequired,
  note: form.note
}))

const isComplete = computed(() => isUserControlFormComplete(formInput.value))

const resetForm = (data) => {
  const existing = data.scope === 'module'
    ? data.existingRules?.[data.moduleKey]
    : Object.values(data.existingRules || {}).find((rule) => rule?.strategy)

  const inferredStrategy = ['loss', 'lowYield'].includes(existing?.value)
    ? 'negative'
    : DEFAULT_CONTROL_STRATEGY
  form.strategy = existing?.strategy || inferredStrategy
  form.duration = 'permanent'
  form.note = ''
  noteTouched.value = false
}

const syncHelpPanelHeight = () => {
  if (typeof window === 'undefined') return

  const isSideBySide = typeof window.matchMedia === 'function'
    ? window.matchMedia('(min-width: 1024px)').matches
    : true
  if (!isSideBySide) {
    helpPanelMaxHeight.value = ''
    return
  }

  const leftHeight = leftPanelRef.value?.getBoundingClientRect?.().height || 0
  helpPanelMaxHeight.value = leftHeight > 0 ? `${Math.ceil(leftHeight)}px` : ''
}

const queueHelpPanelHeightSync = () => nextTick(syncHelpPanelHeight)

const observeLeftPanelHeight = () => {
  leftPanelResizeObserver?.disconnect?.()
  leftPanelResizeObserver = null

  if (typeof ResizeObserver === 'undefined' || !leftPanelRef.value) return
  leftPanelResizeObserver = new ResizeObserver(syncHelpPanelHeight)
  leftPanelResizeObserver.observe(leftPanelRef.value)
}

watch(
  [() => props.open, dialogData],
  ([open, data]) => {
    if (open) resetForm(data)
  },
  { immediate: true, deep: true }
)

watch(() => phase.value !== 'closed', (isRendered) => {
  if (!isRendered) {
    helpPanelMaxHeight.value = ''
    leftPanelResizeObserver?.disconnect?.()
    leftPanelResizeObserver = null
    return
  }

  queueHelpPanelHeightSync()
  nextTick(observeLeftPanelHeight)
})

watch(
  [
    () => form.strategy,
    () => form.note,
    affectedModules,
    displayedModuleRules
  ],
  queueHelpPanelHeightSync
)

onMounted(() => {
  queueHelpPanelHeightSync()
  observeLeftPanelHeight()
  window.addEventListener?.('resize', syncHelpPanelHeight)
})

onBeforeUnmount(() => {
  window.removeEventListener?.('resize', syncHelpPanelHeight)
  leftPanelResizeObserver?.disconnect?.()
})

const close = () => dialogFrame.value?.close()

const submit = () => {
  if (phase.value !== 'open' || !isComplete.value) return
  emit('submit', buildUserControlPayload(formInput.value))
}
</script>

<template>
  <AdminDialog :open="open" :title="displayScope === 'global' ? '设置用户点控' : moduleMeta?.actionLabel" title-id="user-control-dialog-title" :return-focus="returnFocus" testid="user-control-dialog-frame" :width="shouldShowHelpPanel ? 1080 : 720" plain ref="dialogFrame" :initial-focus="initialFocus" @close="emit('close')" @closed="handleClosed">
      <template #subtitle><div data-testid="user-control-target-user" class="mt-0.5 flex min-w-0 flex-wrap gap-x-2 break-words text-sm text-slate-500">
              <span>{{ selectedUserName }}</span>
              <span>UID {{ selectedUserId || '—' }}</span>
              <span class="break-all">{{ selectedUserEmail }}</span></div></template>
      <div data-testid="user-control-dialog-body" class="min-h-0 flex-1 overflow-y-auto px-5 py-3 lg:flex-none lg:overflow-hidden">
          <div
            class="grid items-start gap-4"
            :class="shouldShowHelpPanel ? 'lg:grid-cols-[minmax(0,1fr)_400px]' : ''"
          >
            <div ref="leftPanelRef" class="min-w-0 space-y-2.5">
                  <SelectOnlyCombobox
                    ref="firstControlSelect"
                    v-model="form.strategy"
                    :options="controlTypeOptions"
                    label="控盘类型"
                    required
                    :hint="selectedControlType?.description || '请选择点控类型'"
                    id-base="user-control-strategy"
                  />

              <div v-if="affectedModules.length">
                <p class="text-sm font-semibold text-slate-900">影响模块</p>
                <div class="mt-1 flex flex-wrap gap-1.5">
                  <span v-for="item in affectedModules" :key="item.key" class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    {{ item.label }}
                  </span>
                </div>
              </div>

              <label class="block">
                <span class="text-sm font-semibold text-slate-900">点控备注 <span v-if="noteRequired" class="text-rose-500">*</span></span>
                <AdminTextarea
                  v-model="form.note"
                  rows="2"
                  maxlength="200"
                  placeholder="请填写点控原因，便于后续审计"
                  class="mt-1.5 w-full"
                  :class="noteRequired && noteTouched && !form.note.trim() ? 'border-rose-400' : 'border-slate-300'"
                  :aria-invalid="noteRequired && noteTouched && !form.note.trim()"
                  aria-describedby="user-control-note-help"
                  @blur="noteTouched = true"
                />
                <span id="user-control-note-help" class="mt-1 flex justify-between text-xs">
                  <span :class="noteRequired && noteTouched && !form.note.trim() ? 'text-rose-600' : 'text-slate-500'">
                    {{ noteRequired && noteTouched && !form.note.trim() ? '请填写点控备注后再确认' : noteRequired ? '必填，最多 200 字' : '选填，最多 200 字' }}
                  </span>
                  <span class="text-slate-400">{{ form.note.length }}/200</span>
                </span>
              </label>
            </div>

            <aside
              v-if="shouldShowHelpPanel"
              data-testid="user-control-help-panel"
              class="min-w-0 space-y-2 overflow-y-auto pr-1"
              :style="{ maxHeight: helpPanelMaxHeight || undefined }"
              aria-label="点控说明备注"
            >
              <div
                v-for="rule in displayedModuleRules"
                :key="rule.key"
                class="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800"
              >
                <p class="font-semibold">{{ rule.title }}</p>
                <dl class="mt-1 space-y-1">
                  <div>
                    <dt class="font-semibold">影响范围</dt>
                    <dd>{{ rule.scope }}</dd>
                  </div>
                  <div>
                    <dt class="font-semibold">执行说明</dt>
                    <dd>{{ rule.pointMethod }}</dd>
                  </div>
                  <div>
                    <dt class="font-semibold">生效方式</dt>
                    <dd>{{ rule.effect }}</dd>
                  </div>
                  <div>
                    <dt class="font-semibold">特殊说明</dt>
                    <dd>{{ effectiveOrderNotice }}</dd>
                  </div>
                  <div>
                    <dt class="font-semibold">示例</dt>
                    <dd>{{ rule.example }}</dd>
                  </div>
                </dl>
              </div>

            </aside>
          </div>
        </div>

        <footer class="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <AdminButton type="button" @click="close">
            取消
          </AdminButton>
          <AdminButton
            type="button"
            :disabled="phase !== 'open' || !isComplete"
            variant="primary"
            @click="submit"
          >
            确认设置
          </AdminButton>
        </footer>
    </AdminDialog>
</template>
