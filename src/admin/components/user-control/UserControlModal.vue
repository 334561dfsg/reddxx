<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { USER_CONTROL_MODULES } from '../../../features/user-control/userControl.js'
import {
  buildUserControlPayload,
  defaultControlMethod,
  getControlMethodOptions,
  getControlTypeOptions,
  isControlMethodForStrategy,
  isUserControlFormComplete
} from '../../../features/user-control/userControlForm.js'
import SelectOnlyCombobox from '../form/SelectOnlyCombobox.vue'
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
const firstControlSelect = ref(null)
const leftPanelRef = ref(null)
const helpPanelMaxHeight = ref('')
let leftPanelResizeObserver = null
const initialFocusTarget = computed(() => firstControlSelect.value)
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
const isGlobalScope = computed(() => displayScope.value === 'global')
const displayModuleKey = computed(() => displayedDialogData.value.moduleKey)
const displayUser = computed(() => displayedDialogData.value.user)
const handleAfterLeave = async () => {
  if (!await onAfterLeave()) return
  clearDialogSnapshot()
}

const form = reactive({
  strategy: '',
  method: '',
  duration: '',
  note: ''
})
const noteTouched = ref(false)

const moduleMeta = computed(() => USER_CONTROL_MODULES.find((item) => item.key === displayModuleKey.value) || null)
const selectedUserId = computed(() => String(displayUser.value?.userId ?? displayUser.value?.id ?? ''))
const selectedUserName = computed(() => displayUser.value?.username || displayUser.value?.name || '未选择用户')
const selectedUserEmail = computed(() => displayUser.value?.email || '邮箱未提供')

const controlTypeOptions = computed(() => getControlTypeOptions())
const controlIntentOptions = computed(() => controlTypeOptions.value.flatMap((typeOption) => (
  getControlMethodOptions(typeOption.value).map((methodOption) => ({
    value: `${typeOption.value}:${methodOption.value}`,
    label: methodOption.label,
    description: `${typeOption.label}：${typeOption.description}；${methodOption.description}`,
    strategy: typeOption.value,
    method: methodOption.value
  }))
)))
const controlIntentValue = computed({
  get: () => (form.strategy && form.method ? `${form.strategy}:${form.method}` : ''),
  set: (value) => {
    const option = controlIntentOptions.value.find((item) => item.value === value)
    if (!option) return
    form.strategy = option.strategy
    form.method = option.method
  }
})
const selectedControlIntent = computed(() => controlIntentOptions.value.find((option) => option.value === controlIntentValue.value) || null)

const affectedModules = computed(() => isGlobalScope.value
  ? USER_CONTROL_MODULES
  : moduleMeta.value ? [moduleMeta.value] : [])

const durationOptions = computed(() => [
  {
    value: 'once',
    label: '只生效一次',
    desc: isGlobalScope.value ? '所有模块只对用户的第一单生效' : '当前模块只对用户的第一单生效'
  },
  {
    value: 'permanent',
    label: '持续生效',
    desc: isGlobalScope.value ? '点控开始后，后续所有模块订单持续生效' : '点控开始后，当前模块后续订单持续生效'
  }
])
const selectedDuration = computed(() => durationOptions.value.find((option) => option.value === form.duration) || null)
const effectiveOrderNotice = '只对点控开始之后产生的订单生效；点控前订单和已完成历史订单不受影响。'

const moduleRuleCatalog = Object.freeze({
  delivery: {
    title: '交割点控规则',
    scope: '影响当前用户交割合约订单的最终结算价格，不影响公共行情、产品配置和其他用户订单。',
    pointMethod: '通过结算价偏移处理：买涨控赢向上偏移、控输向下偏移；买跌控赢向下偏移、控输向上偏移。',
    effect: '控赢时：买涨结算价向上偏移，买跌结算价向下偏移；控输时：买涨结算价向下偏移，买跌结算价向上偏移。',
    example: '说明：控盘方式只作为操作标记，不参与结算逻辑；实际按控赢或控输方向在结算时处理价格偏移。'
  },
  perpetual: {
    title: '永续点控规则',
    scope: '影响当前用户永续合约仓位的最终平仓或结算价格，不单独修改K线、盘口行情和实时浮盈亏。',
    pointMethod: '通过平仓价或结算价偏移处理：做多控赢价格更高、控输价格更低；做空控赢价格更低、控输价格更高。',
    effect: '控赢时：做多结算价更高，做空结算价更低；控输时：做多结算价更低，做空结算价更高。',
    example: '说明：控盘方式只作为操作标记，不参与结算逻辑；未平仓浮盈亏不触发点控。'
  },
  spot: {
    title: '现货点控规则',
    scope: '影响当前用户现货下单成交价格；现货订单成交即结束，不再做后续盈亏结算。',
    pointMethod: '通过成交价偏移处理：买单控赢用更低成交价、控输用更高成交价；卖单控赢用更高成交价、控输用更低成交价。',
    effect: '控赢时：买单以更低价格成交，卖单以更高价格成交；控输时：买单以更高价格成交，卖单以更低价格成交。',
    example: '说明：现货点控只控制本次下单成交价格，控盘方式不参与逻辑运算。'
  },
  aiQuant: {
    title: 'AI量化点控规则',
    scope: '影响当前用户 AI 量化订单最终收益率调整，不影响产品基础收益率和其他用户收益。',
    pointMethod: '通过收益率调整处理：控赢使用点控收益率提升数值，控输使用点控收益率降低数值。',
    effect: '控赢时替换为点控收益率提升数值；控输时替换为点控收益率降低数值。',
    example: '说明：控盘方式只作为操作标记，不参与收益计算逻辑。'
  },
  liquidity: {
    title: '流动性挖矿点控规则',
    scope: '影响当前用户流动性挖矿订单收益率调整，不影响矿池基础收益规则和其他用户收益。',
    pointMethod: '通过收益率调整处理：控赢使用点控收益率提升数值，控输使用点控收益率降低数值。',
    effect: '控赢时替换为点控收益率提升数值；控输时替换为点控收益率降低数值。',
    example: '说明：控盘方式只作为操作标记，不参与收益计算逻辑。'
  },
  portfolio: {
    title: '投资组合点控规则',
    scope: '影响当前用户投资组合订单最终收益率调整，不影响组合产品基础规则、持仓展示和其他用户收益。',
    pointMethod: '通过收益率调整处理：控赢使用点控收益率提升数值，控输使用点控收益率降低数值。',
    effect: '控赢时替换为点控收益率提升数值；控输时替换为点控收益率降低数值。',
    example: '说明：控盘方式只作为操作标记，不参与收益计算逻辑。'
  }
})

const globalRuleCatalog = Object.freeze([
  {
    key: 'trade',
    label: '交割、永续、现货',
    title: '交易模块规则',
    scope: '只影响目标用户订单价格，不改变公共行情、K线、盘口和其他用户订单。',
    pointMethod: '交易类统一通过价格偏移处理：现货控制成交价，交割和永续控制最终结算价。',
    effect: '现货在成交时控制成交价；交割和永续在结算时按方向控制结算价。',
    example: '说明：控盘方式只作为操作标记，不参与价格偏移逻辑。'
  },
  {
    key: 'finance',
    label: 'AI量化、流动性挖矿、投资组合',
    title: '理财模块规则',
    scope: '只影响目标用户理财订单收益率调整，不改变产品基础收益率和其他用户收益。',
    pointMethod: '理财类统一通过收益率调整处理：控赢提升收益率，控输降低收益率。',
    effect: '控赢使用点控收益率提升数值；控输使用点控收益率降低数值。',
    example: '说明：控盘方式只作为操作标记，不参与收益率计算逻辑。'
  }
])

const fallbackModuleRule = Object.freeze({
  title: '当前模块规则',
  scope: '影响当前用户在当前模块的最终结算或实际入账结果。',
  pointMethod: '当前模块在最终结算或实际入账时读取点控规则，并按模块自身规则处理。',
  effect: '当前模块在最终结算或实际入账时读取点控规则；未完成、失败或预估数据不触发。',
  example: '示例：用户产生最终结算时，模块按当前选择的盈利或亏损方向生成结果。'
})

const ruleModules = computed(() => isGlobalScope.value
  ? USER_CONTROL_MODULES
  : moduleMeta.value ? [moduleMeta.value] : [])

const displayedModuleRules = computed(() => {
  if (isGlobalScope.value) return globalRuleCatalog
  return ruleModules.value.map((module) => ({
    key: module.key,
    label: module.label,
    ...(moduleRuleCatalog[module.key] || fallbackModuleRule)
  }))
})

const formInput = computed(() => ({
  scope: displayScope.value,
  family: moduleMeta.value?.family,
  userId: selectedUserId.value,
  strategy: form.strategy,
  method: form.method,
  duration: form.duration,
  note: form.note
}))

const isComplete = computed(() => isUserControlFormComplete(formInput.value))

const resetForm = (data) => {
  const existing = data.scope === 'module'
    ? data.existingRules?.[data.moduleKey]
    : Object.values(data.existingRules || {}).find((rule) => rule?.strategy)

  form.strategy = existing?.strategy || (['loss', 'lowYield'].includes(existing?.value) ? 'negative' : 'positive')
  form.method = existing?.method && isControlMethodForStrategy(form.strategy, existing.method)
    ? existing.method
    : defaultControlMethod(form.strategy)
  form.duration = existing?.duration || 'once'
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
  () => form.strategy,
  (strategy) => {
    if (!isControlMethodForStrategy(strategy, form.method)) form.method = defaultControlMethod(strategy)
  }
)

watch(
  [() => props.open, dialogData],
  ([open, data]) => {
    if (open) resetForm(data)
  },
  { immediate: true, deep: true }
)

watch(rendered, (isRendered) => {
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
  [() => form.strategy, () => form.method, () => form.duration, () => form.note, affectedModules, displayedModuleRules],
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
            class="flex max-h-[calc(100vh-1.5rem)] w-full max-w-[1080px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl supports-[height:100dvh]:max-h-[calc(100dvh-1.5rem)]"
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

        <div data-testid="user-control-dialog-body" class="min-h-0 flex-1 overflow-y-auto px-5 py-3 lg:flex-none lg:overflow-hidden">
          <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
            <div ref="leftPanelRef" class="min-w-0 space-y-2.5">
                  <SelectOnlyCombobox
                    ref="firstControlSelect"
                    v-model="controlIntentValue"
                    :options="controlIntentOptions"
                    label="控盘类型与方式"
                    required
                    :hint="selectedControlIntent?.description || '请选择盈利或亏损意图及具体处理方式'"
                    id-base="user-control-intent"
                  />

                  <SelectOnlyCombobox
                    v-model="form.duration"
                    :options="durationOptions"
                    label="控制周期"
                    required
                    :hint="selectedDuration?.desc || '请选择本次点控生效的订单范围'"
                    id-base="user-control-duration"
                  />

              <div>
                <p class="text-sm font-semibold text-slate-900">影响模块</p>
                <div class="mt-1 flex flex-wrap gap-1.5">
                  <span v-for="item in affectedModules" :key="item.key" class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    {{ item.label }}
                  </span>
                </div>
              </div>

              <label class="block">
                <span class="text-sm font-semibold text-slate-900">点控备注 <span class="text-rose-500">*</span></span>
                <textarea
                  v-model="form.note"
                  rows="2"
                  maxlength="200"
                  placeholder="请填写点控原因，便于后续审计"
                  class="mt-1.5 w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2"
                  :class="noteTouched && !form.note.trim() ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'"
                  :aria-invalid="noteTouched && !form.note.trim()"
                  aria-describedby="user-control-note-help"
                  @blur="noteTouched = true"
                />
                <span id="user-control-note-help" class="mt-1 flex justify-between text-xs">
                  <span :class="noteTouched && !form.note.trim() ? 'text-rose-600' : 'text-slate-500'">
                    {{ noteTouched && !form.note.trim() ? '请填写点控备注后再确认' : '必填，最多 200 字' }}
                  </span>
                  <span class="text-slate-400">{{ form.note.length }}/200</span>
                </span>
              </label>
            </div>

            <aside
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
                    <dt class="font-semibold">点控方式</dt>
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
