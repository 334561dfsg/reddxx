<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { USER_CONTROL_MODULES } from '../../../features/user-control/userControl.js'
import {
  buildUserControlPayload,
  defaultControlMethod,
  getControlMethodOptions,
  getControlTypeOptions,
  isControlMethodForStrategy,
  isUserControlFormComplete,
  targetRangeLabel,
  targetRangeUnitLabel
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
  targetRanges: {
    trade: { min: '', max: '' },
    finance: { min: '', max: '' }
  },
  note: ''
})
const noteTouched = ref(false)
const rangeTouched = reactive({ trade: false, finance: false })

const moduleMeta = computed(() => USER_CONTROL_MODULES.find((item) => item.key === displayModuleKey.value) || null)
const selectedUserId = computed(() => String(displayUser.value?.userId ?? displayUser.value?.id ?? ''))
const selectedUserName = computed(() => displayUser.value?.username || displayUser.value?.name || '未选择用户')
const selectedUserEmail = computed(() => displayUser.value?.email || '邮箱未提供')

const controlTypeOptions = computed(() => getControlTypeOptions())
const controlMethodOptions = computed(() => getControlMethodOptions(form.strategy))
const selectedControlType = computed(() => controlTypeOptions.value.find((option) => option.value === form.strategy) || null)
const selectedControlMethod = computed(() => controlMethodOptions.value.find((option) => option.value === form.method) || null)

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
const activeRangeFamilies = computed(() => {
  const families = [...new Set(affectedModules.value.map((module) => module.family).filter(Boolean))]
  return families.map((family) => ({
    family,
    label: targetRangeLabel(family, form.strategy),
    unit: targetRangeUnitLabel(family, form.strategy),
    modules: affectedModules.value.filter((module) => module.family === family).map((module) => module.label).join('、')
  }))
})
const isRangeInvalid = (family) => {
  const range = form.targetRanges[family] || {}
  const min = Number(String(range.min ?? '').trim())
  const max = Number(String(range.max ?? '').trim())
  return !String(range.min ?? '').trim()
    || !String(range.max ?? '').trim()
    || !Number.isFinite(min)
    || !Number.isFinite(max)
    || min < 0
    || max < min
}

const moduleRuleCatalog = Object.freeze({
  delivery: {
    title: '交割点控规则',
    scope: '影响当前用户的交割合约订单最终结算结果，不影响交割合约产品配置、行情和其他用户订单。',
    effect: '交割订单到期并完成最终结算时读取当前点控规则；模块按目标盈亏范围生成该用户最终结果，内部可通过结算价修正实现。',
    example: '示例：用户自然结果为亏损，命中“盈利 / 做高盈利”且目标盈亏范围为 3% - 5%，最终结算结果应落入该盈利范围。'
  },
  perpetual: {
    title: '永续点控规则',
    scope: '影响当前用户永续合约仓位的最终平仓、强平或结算盈亏，不单独修改K线、盘口行情和实时浮盈亏。',
    effect: '用户平仓、强平或最终结算确认时读取当前点控规则；模块按目标盈亏范围修正该用户已实现盈亏，未平仓浮盈亏不触发。',
    example: '示例：用户平仓 ETH 永续仓位时命中“亏损 / 做低亏损”，最终已实现亏损应落入填写的目标范围。'
  },
  spot: {
    title: '现货点控规则',
    scope: '影响当前用户现货订单成交后的最终收益或损益表现，不改变大盘行情、盘口价格和真实成交撮合记录。',
    effect: '现货订单成交并形成该用户最终交易结果时读取当前点控规则；模块按目标盈亏范围处理用户结果，不改变公共成交数据。',
    example: '示例：用户买入后卖出 BTC 形成结算结果时命中“盈利 / 做低盈利”，最终收益应落入填写的低盈利范围。'
  },
  aiQuant: {
    title: 'AI量化点控规则',
    scope: '影响当前用户 AI 量化订单或策略周期的实际收益入账结果，不影响产品收益规则和其他用户收益。',
    effect: '量化订单完成或周期收益实际入账时读取当前点控规则；模块按目标收益范围计算该用户最终入账收益。',
    example: '示例：用户 AI 量化周期结算时命中“盈利 / 做高盈利”且目标收益范围为 10% - 15%，最终入账收益率应落入该范围。'
  },
  liquidity: {
    title: '流动性挖矿点控规则',
    scope: '影响当前用户流动性挖矿订单的收益发放或结算入账结果，不影响矿池产品规则和全局收益配置。',
    effect: '挖矿收益发放或订单结算入账时读取当前点控规则；模块按目标收益范围处理最终入账收益。',
    example: '示例：用户流动性挖矿收益发放时命中“亏损 / 做低亏损”，最终入账收益按填写的低收益或最低收益范围处理。'
  },
  portfolio: {
    title: '投资组合点控规则',
    scope: '影响当前用户投资组合订单的最终结算或实际收益入账结果，不影响组合产品配置、持仓展示和其他用户收益。',
    effect: '组合订单结算或收益实际入账时读取当前点控规则；模块按目标收益范围处理最终收益，持仓浮动展示不触发。',
    example: '示例：用户投资组合到期结算时命中“盈利 / 做低盈利”，最终入账收益应落入填写的低盈利收益范围。'
  }
})

const globalRuleCatalog = Object.freeze([
  {
    key: 'trade',
    label: '交割、永续、现货',
    title: '交易模块规则',
    scope: '影响目标用户交易订单的最终成交、平仓或结算结果，不改变公共行情、K线、盘口和其他用户订单。',
    effect: '按填写的目标盈亏范围处理最终已实现盈亏；价格修正、结算价修正等属于模块内部实现。',
    example: '示例：命中“盈利 / 做高盈利”且目标盈亏范围为 3% - 5%，最终交易结果应落入该盈利范围。'
  },
  {
    key: 'finance',
    label: 'AI量化、流动性挖矿、投资组合',
    title: '理财模块规则',
    scope: '影响目标用户理财订单的实际收益入账或最终结算结果，不影响产品基础收益规则和其他用户收益。',
    effect: '按填写的目标收益范围处理最终入账收益；预估收益、运行中收益和未完成订单不触发。',
    example: '示例：命中“亏损 / 做低亏损”时，最终入账收益按填写的低收益或最低收益范围处理。'
  }
])

const fallbackModuleRule = Object.freeze({
  title: '当前模块规则',
  scope: '影响当前用户在当前模块的最终结算或实际入账结果。',
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
  targetRanges: form.targetRanges,
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
  form.targetRanges.trade.min = existing?.targetRanges?.tradePnl?.min ?? ''
  form.targetRanges.trade.max = existing?.targetRanges?.tradePnl?.max ?? ''
  form.targetRanges.finance.min = existing?.targetRanges?.financeYield?.min ?? ''
  form.targetRanges.finance.max = existing?.targetRanges?.financeYield?.max ?? ''
  form.note = ''
  noteTouched.value = false
  rangeTouched.trade = false
  rangeTouched.finance = false
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
  [() => form.strategy, () => form.method, () => form.duration, () => form.note, () => form.targetRanges.trade.min, () => form.targetRanges.trade.max, () => form.targetRanges.finance.min, () => form.targetRanges.finance.max, affectedModules, displayedModuleRules],
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
                    v-model="form.strategy"
                    :options="controlTypeOptions"
                    label="控盘类型"
                    required
                    :hint="selectedControlType?.description || '请选择盈利或亏损的控制方向'"
                    id-base="user-control-strategy"
                  />

                  <SelectOnlyCombobox
                    v-model="form.method"
                    :options="controlMethodOptions"
                    label="控盘方式"
                    required
                    :hint="selectedControlMethod?.description || '请选择默认、做高或做低的处理方式'"
                    id-base="user-control-method"
                  />

                  <SelectOnlyCombobox
                    v-model="form.duration"
                    :options="durationOptions"
                    label="控制周期"
                    required
                    :hint="selectedDuration?.desc || '请选择本次点控生效的订单范围'"
                    id-base="user-control-duration"
                  />

              <section class="rounded-lg border border-slate-200 px-3 py-2" aria-labelledby="user-control-target-range-title">
                <div class="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 id="user-control-target-range-title" class="text-sm font-semibold text-slate-900">点控目标范围 <span class="text-rose-500">*</span></h3>
                  <p class="text-xs text-slate-500">按当前控盘类型填写正数范围，系统自动处理为盈利、亏损或低收益结果。</p>
                </div>

                <div class="mt-2 space-y-1.5">
                  <div v-for="item in activeRangeFamilies" :key="item.family">
                    <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <p class="text-sm font-medium text-slate-800">{{ item.label }}</p>
                      <p class="text-xs text-slate-400">{{ item.modules }}</p>
                    </div>
                    <div class="mt-1 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2">
                      <label class="block">
                        <span class="sr-only">{{ item.label }}最小值</span>
                        <input
                          v-model="form.targetRanges[item.family].min"
                          type="number"
                          min="0"
                          step="0.01"
                          inputmode="decimal"
                          placeholder="最小值"
                          class="w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2"
                          :class="rangeTouched[item.family] && isRangeInvalid(item.family) ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'"
                          :aria-invalid="rangeTouched[item.family] && isRangeInvalid(item.family)"
                          :aria-describedby="`user-control-${item.family}-range-help`"
                          @blur="rangeTouched[item.family] = true"
                        />
                      </label>
                      <span class="text-sm text-slate-400">至</span>
                      <label class="block">
                        <span class="sr-only">{{ item.label }}最大值</span>
                        <input
                          v-model="form.targetRanges[item.family].max"
                          type="number"
                          min="0"
                          step="0.01"
                          inputmode="decimal"
                          placeholder="最大值"
                          class="w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2"
                          :class="rangeTouched[item.family] && isRangeInvalid(item.family) ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'"
                          :aria-invalid="rangeTouched[item.family] && isRangeInvalid(item.family)"
                          :aria-describedby="`user-control-${item.family}-range-help`"
                          @blur="rangeTouched[item.family] = true"
                        />
                      </label>
                      <span class="whitespace-nowrap text-xs text-slate-400">%</span>
                    </div>
                    <p
                      :id="`user-control-${item.family}-range-help`"
                      class="mt-0.5 text-xs"
                      :class="rangeTouched[item.family] && isRangeInvalid(item.family) ? 'text-rose-600' : 'text-slate-500'"
                    >
                      {{ rangeTouched[item.family] && isRangeInvalid(item.family) ? `请填写有效的${item.label}，最大值不能小于最小值` : item.unit }}
                    </p>
                  </div>
                </div>
              </section>

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
