<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { USER_CONTROL_MODULES } from '../../../features/user-control/userControl.js'
import {
  buildUserControlPayload,
  controlMethodLabel,
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
const controlMethodOptions = computed(() => getControlMethodOptions(form.strategy))
const selectedControlType = computed(() => controlTypeOptions.value.find((option) => option.value === form.strategy) || null)
const selectedControlMethod = computed(() => controlMethodOptions.value.find((option) => option.value === form.method) || null)
const selectedMethodLabel = computed(() => selectedControlMethod.value?.label || controlMethodLabel(form.method) || '—')

const affectedModules = computed(() => isGlobalScope.value
  ? USER_CONTROL_MODULES
  : moduleMeta.value ? [moduleMeta.value] : [])

const durationOptions = computed(() => [
  {
    value: 'once',
    label: '一次性控制',
    desc: isGlobalScope.value ? '每个模块各控制 1 次' : '当前模块控制 1 次'
  },
  {
    value: 'permanent',
    label: '永久控制',
    desc: '后续有效结算持续控制'
  }
])
const selectedDuration = computed(() => durationOptions.value.find((option) => option.value === form.duration) || null)

const durationRuleHint = computed(() => form.duration === 'once'
  ? (isGlobalScope.value
    ? '六个模块分别等待自己的首次有效结算或实际入账；某个模块成功后仅该模块结束，其他模块继续等待。'
    : '当前模块首次有效结算或实际入账成功后，本次控制自动结束。')
  : '后续每次有效结算或实际入账都会使用当前规则，直到管理员取消或新规则覆盖。')

const moduleRuleCatalog = Object.freeze({
  global: {
    title: '六模块统一规则',
    items: [
      '从用户管理设置时，会一次性写入交割、永续、现货、AI量化、流动性挖矿、投资组合六个模块。',
      '统一设置只统一方向、方式和周期；具体金额、收益或亏损由各模块在最终结算时处理。',
      '后续如果在单个模块里修改，只覆盖该模块，其他模块保留原规则。'
    ]
  },
  delivery: {
    title: '交割点控规则',
    items: [
      '只在交割合约订单到期并完成最终结算时生效。',
      '未到期、未结算、撤销或失败订单不触发点控，也不消耗一次性控制。',
      '盈利、亏损及高低档位由交割模块按结算规则计算具体结果。'
    ]
  },
  perpetual: {
    title: '永续点控规则',
    items: [
      '不针对单个用户修改K线或行情，不影响实时浮盈亏展示。',
      '在用户平仓、强平或最终结算确认时按点控规则处理盈亏方向。',
      '未平仓持仓、预估盈亏和行情波动不消耗一次性控制。'
    ]
  },
  spot: {
    title: '现货点控规则',
    items: [
      '不改变大盘行情、盘口价格和真实成交撮合记录。',
      '订单成交并形成该用户最终交易结果时，按点控规则处理收益或亏损表现。',
      '未成交、部分未完成、撤单或失败订单不消耗一次性控制。'
    ]
  },
  aiQuant: {
    title: 'AI量化点控规则',
    items: [
      '在量化订单完成或周期收益实际入账时生效。',
      '预估收益、运行中收益和未完成策略不触发点控。',
      '盈利类方式对应收益提高处理，亏损类方式按低收益或最低收益处理。'
    ]
  },
  liquidity: {
    title: '流动性挖矿点控规则',
    items: [
      '在挖矿收益发放或订单结算入账时生效。',
      '未到发放周期、预估收益和未确认收益不触发点控。',
      '盈利类方式对应高/默认/低收益，亏损类方式按低收益或最低收益处理。'
    ]
  },
  portfolio: {
    title: '投资组合点控规则',
    items: [
      '在组合订单结算或收益实际入账时生效。',
      '持仓中的浮动收益、预估收益和未完成订单不触发点控。',
      '盈利类方式对应高/默认/低收益，亏损类方式按低收益或最低收益处理。'
    ]
  }
})

const selectedModuleRule = computed(() => moduleRuleCatalog[
  isGlobalScope.value ? 'global' : displayModuleKey.value
] || {
  title: '当前模块规则',
  items: ['当前模块在最终结算或实际入账时执行点控规则。']
})

const financeRuleHint = computed(() => {
  const hasFinanceModule = affectedModules.value.some((item) => item.family === 'finance')
  if (!hasFinanceModule) return ''
  return '理财模块按产品规则解释控盘方式：盈利类方式对应高/默认/低收益；亏损类方式默认按低收益或最低收益处理，不直接填写收益率或金额。'
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
  [() => form.strategy, () => form.method, () => form.duration, () => form.note, affectedModules, financeRuleHint, selectedModuleRule],
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
            class="flex max-h-[calc(100vh-1.5rem)] w-full max-w-[920px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl supports-[height:100dvh]:max-h-[calc(100dvh-1.5rem)]"
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
          <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div ref="leftPanelRef" class="min-w-0 space-y-2.5">
              <SelectOnlyCombobox
                ref="firstControlSelect"
                v-model="form.strategy"
                :options="controlTypeOptions"
                label="控盘类型"
                required
                described-by="user-control-strategy-help"
                id-base="user-control-strategy"
              />

              <SelectOnlyCombobox
                v-model="form.method"
                :options="controlMethodOptions"
                label="控盘方式"
                required
                described-by="user-control-method-help"
                id-base="user-control-method"
              />

              <SelectOnlyCombobox
                v-model="form.duration"
                :options="durationOptions"
                label="控制周期"
                required
                described-by="user-control-duration-help"
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
              <div class="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800">
                <p class="font-semibold">{{ selectedModuleRule.title }}</p>
                <ul class="mt-1 list-disc space-y-1 pl-4">
                  <li v-for="item in selectedModuleRule.items" :key="item">
                    {{ item }}
                  </li>
                </ul>
              </div>

              <div v-if="isGlobalScope" class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p class="text-xs font-semibold text-slate-800">当前选择说明</p>
                <dl class="mt-2 space-y-2 text-xs leading-5 text-slate-600">
                  <div>
                    <dt class="font-semibold text-slate-700">控盘类型</dt>
                    <dd id="user-control-strategy-help">{{ selectedControlType?.description || '请选择盈利或亏损' }}</dd>
                  </div>
                  <div>
                    <dt class="font-semibold text-slate-700">控盘方式</dt>
                    <dd id="user-control-method-help">{{ selectedControlMethod?.description || '请选择控盘方式' }}</dd>
                    <dd>当前选择：{{ selectedMethodLabel }}</dd>
                  </div>
                  <div>
                    <dt class="font-semibold text-slate-700">控制周期</dt>
                    <dd id="user-control-duration-help">{{ selectedDuration?.desc || '请选择控制周期' }}</dd>
                    <dd>{{ durationRuleHint }}</dd>
                  </div>
                </dl>
              </div>

              <div v-else class="sr-only">
                <p id="user-control-strategy-help">{{ selectedControlType?.description || '请选择盈利或亏损' }}</p>
                <p id="user-control-method-help">{{ selectedControlMethod?.description || '请选择控盘方式' }}</p>
                <p id="user-control-duration-help">{{ selectedDuration?.desc || '请选择控制周期' }}。{{ durationRuleHint }}</p>
              </div>

              <div v-if="isGlobalScope" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-600">
                <p class="font-semibold text-slate-800">通用结算说明</p>
                <p class="mt-0.5">具体盈利金额、亏损金额或理财收益由各模块在最终结算时计算。</p>
                <p class="mt-0.5">失败、预估收益、浮动盈亏、未完成订单和重复通知不消耗一次性控制规则。</p>
              </div>

              <div v-if="isGlobalScope && financeRuleHint" class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800">
                {{ financeRuleHint }}
              </div>

              <div v-if="isGlobalScope" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-600">
                状态规则：一次性控制显示“待执行”，成功后显示“已执行”；永久控制显示“生效中”，取消或被新规则覆盖后结束。
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
