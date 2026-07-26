<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'
import PanelSingleSelect from '../form/PanelSingleSelect.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  mode: { type: String, default: 'credit' },
  snapshot: { type: Object, default: null },
  busy: { type: Boolean, default: false },
  returnFocus: { type: [Object, Function], default: null }
})
const emit = defineEmits(['close', 'closed', 'request-mfa'])
const configs = {
  credit: { title: '修改信用分', action: '修改信用分', type: 'credit-adjust', tone: 'bg-rose-600 hover:bg-rose-700' },
  vip: { title: '编辑会员等级', action: '调整会员等级', type: 'vip-level-set', tone: 'bg-amber-600 hover:bg-amber-700' },
  rebate: { title: '添加返利奖励', action: '发放返利奖励', type: 'rebate-grant', tone: 'bg-rose-600 hover:bg-rose-700' }
}
const dialogRef = ref(null)
const directionFirstRef = ref(null)
const vipSelectRef = ref(null)
const amountRef = ref(null)
const reasonRef = ref(null)
const backRef = ref(null)
const submitButtonRef = ref(null)
const errorRef = ref(null)
const stage = ref('edit')
const errorMessage = ref('')
const vipSelectionError = ref('')
const form = reactive({ direction: 'increase', points: '', vipLevel: null, amount: '', reason: '' })
const config = computed(() => configs[props.mode] || configs.credit)
const userId = computed(() => String(props.user?.id ?? props.user?.userId ?? ''))
const currentScore = computed(() => Number(props.user?.creditScore ?? props.snapshot?.user?.creditScore ?? 0))
const currentVipLevel = computed(() => Number(props.user?.vipLevel ?? props.snapshot?.user?.vipLevel ?? 0))
const currentBalance = computed(() => Number(props.user?.balance ?? props.snapshot?.user?.balance ?? 0))
const enabledVipLevels = computed(() => props.snapshot?.enabledVipLevels || [])
const clean = (value) => String(value ?? '').trim()
const vipPrimaryLabel = (level) => clean(level.displayName) || clean(level.name) || `VIP${level.level}`
const vipSecondaryLabel = (level) => {
  const secondary = clean(level.name)
  return secondary && secondary !== vipPrimaryLabel(level) ? secondary : ''
}
const vipOptions = computed(() => enabledVipLevels.value.map((level) => ({
  value: Number(level.level),
  label: vipPrimaryLabel(level),
  description: vipSecondaryLabel(level),
  status: Number(level.level) === currentVipLevel.value ? '当前等级' : '',
  searchText: `${level.level} ${clean(level.name)} ${clean(level.displayName)}`,
  disabled: Number(level.level) === currentVipLevel.value
})))
const selectedVip = computed(() => (
  form.vipLevel === null
    ? null
    : enabledVipLevels.value.find((level) => Number(level.level) === form.vipLevel) || null
))
const currentVip = computed(() => enabledVipLevels.value.find((level) => Number(level.level) === currentVipLevel.value) || null)
const selectedVipBenefits = computed(() => (selectedVip.value?.benefits || []).map(clean).filter(Boolean))
const targetVipPrimaryLabel = computed(() => (
  selectedVip.value ? vipPrimaryLabel(selectedVip.value) : `VIP${form.vipLevel}`
))
const targetVipSecondaryLabel = computed(() => (
  selectedVip.value ? vipSecondaryLabel(selectedVip.value) : ''
))
const vipSelectionInvalid = computed(() => props.mode === 'vip' && Boolean(vipSelectionError.value))
const parsedPoints = computed(() => Number(form.points))
const parsedAmount = computed(() => Number(form.amount))
const creditDelta = computed(() => (form.direction === 'decrease' ? -1 : 1) * (Number.isFinite(parsedPoints.value) ? parsedPoints.value : 0))
const resultingScore = computed(() => currentScore.value + creditDelta.value)
const resultingBalance = computed(() => currentBalance.value + (Number.isFinite(parsedAmount.value) ? parsedAmount.value : 0))
const vipDirection = computed(() => Number(form.vipLevel) > currentVipLevel.value ? '升级' : '降级')
const money = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const setDirectionRef = (element, index) => {
  if (element && index === 0) directionFirstRef.value = element
}
const resetForm = () => {
  stage.value = 'edit'
  errorMessage.value = ''
  vipSelectionError.value = ''
  form.direction = 'increase'
  form.points = ''
  form.vipLevel = null
  form.amount = ''
  form.reason = ''
}
const initialFocusRef = computed(() => {
  if (props.mode === 'vip') return vipSelectRef.value || reasonRef.value
  if (props.mode === 'rebate') return amountRef.value
  return directionFirstRef.value
})
const closeDisabled = computed(() => props.busy)
const { rendered, phase, layerStyle, requestDialogClose, onAfterEnter, onAfterLeave } = useDialogLifecycle({
  open: computed(() => props.visible),
  dialogRef,
  initialFocusRef,
  returnFocusRef: computed(() => props.returnFocus),
  requestClose: () => emit('close'),
  closeDisabled
})
const close = createDialogCloseAction(requestDialogClose)
const handleAfterLeave = () => { onAfterLeave(); resetForm(); emit('closed') }
const showError = async (message) => { errorMessage.value = message; await nextTick(); errorRef.value?.focus?.() }
const latestVipOption = () => vipOptions.value.find((candidate) => (
  candidate.value === form.vipLevel && !candidate.disabled
)) || null
const clearVipSelectionError = () => {
  const previousSelectionError = vipSelectionError.value
  vipSelectionError.value = ''
  if (previousSelectionError && errorMessage.value === previousSelectionError) errorMessage.value = ''
}
const showVipSelectionError = ({ focus = false } = {}) => {
  const message = form.vipLevel === null
    ? '请选择目标会员等级'
    : '目标会员等级已不可用，请重新选择'
  vipSelectionError.value = message
  errorMessage.value = message
  if (stage.value === 'confirm') stage.value = 'edit'
  if (focus) nextTick(() => vipSelectRef.value?.focus?.())
}
const validateLatestVipSelection = () => {
  const option = latestVipOption()
  if (option) return option
  showVipSelectionError({ focus: true })
  return null
}

const startConfirm = async () => {
  errorMessage.value = ''
  vipSelectionError.value = ''
  if (props.mode === 'credit') {
    if (!/^\d+$/.test(String(form.points).trim()) || parsedPoints.value <= 0) return showError('信用分值必须为正整数')
    if (resultingScore.value < 0 || resultingScore.value > 1000) return showError('调整后信用分必须在 0 至 1000 之间')
  }
  if (props.mode === 'vip') {
    if (!validateLatestVipSelection()) return
  }
  if (props.mode === 'rebate' && (!/^\d+(\.\d{1,2})?$/.test(String(form.amount).trim()) || parsedAmount.value <= 0)) {
    return showError('返利金额必须大于 0 且最多两位小数')
  }
  const reason = form.reason.trim()
  if (!reason) return showError('操作原因必填')
  if (reason.length > 200) return showError('操作原因不能超过 200 字')
  stage.value = 'confirm'
  await nextTick()
  backRef.value?.focus?.()
}
const backToEdit = async () => {
  stage.value = 'edit'
  errorMessage.value = ''
  vipSelectionError.value = ''
  await nextTick()
  initialFocusRef.value?.focus?.()
}
const requestMfa = () => {
  if (phase.value !== 'open' || props.busy) return
  const vipOption = props.mode === 'vip' ? validateLatestVipSelection() : null
  if (props.mode === 'vip' && !vipOption) return
  const payload = { userId: userId.value }
  if (props.mode === 'credit') Object.assign(payload, { direction: form.direction, points: parsedPoints.value })
  if (props.mode === 'vip') Object.assign(payload, { vipLevel: vipOption.value })
  if (props.mode === 'rebate') Object.assign(payload, { amount: parsedAmount.value })
  payload.reason = form.reason.trim()
  emit('request-mfa', { type: config.value.type, payload, returnFocus: submitButtonRef.value })
}

watch(() => [props.visible, userId.value, props.mode], ([visible]) => { if (visible) resetForm() }, { immediate: true })
watch(
  [() => props.visible, () => props.mode, () => form.vipLevel, vipOptions],
  ([visible, mode, vipLevel]) => {
    if (!visible || mode !== 'vip') return
    if (vipLevel === null || latestVipOption()) {
      clearVipSelectionError()
      return
    }
    const returnToEdit = stage.value === 'confirm'
    showVipSelectionError({ focus: returnToEdit })
  },
  { deep: true, flush: 'post' }
)
</script>

<template>
  <Teleport to="body">
    <Transition name="membership-mutation-dialog" appear @after-enter="onAfterEnter" @after-leave="handleAfterLeave">
      <div v-if="rendered" v-show="phase !== 'closing'" class="fixed inset-0 grid place-items-center bg-slate-950/50 p-3 sm:p-4" :style="layerStyle" role="presentation">
        <section ref="dialogRef" data-testid="user-membership-mutation-dialog" class="membership-mutation-dialog-panel flex max-h-[calc(100vh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl supports-[height:100dvh]:max-h-[calc(100dvh-1.5rem)]" role="dialog" aria-modal="true" aria-labelledby="user-membership-mutation-title" :aria-busy="busy">
          <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
            <div class="min-w-0 flex-1"><h2 id="user-membership-mutation-title" class="text-lg font-semibold text-slate-900">{{ config.title }}</h2><p class="mt-0.5 break-words text-sm text-slate-500">{{ user?.username || '未知用户' }} · UID {{ userId || '—' }}</p></div>
            <button type="button" :disabled="busy" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-2xl text-slate-400 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40" aria-label="关闭" @click="close">×</button>
          </header>

          <div data-testid="user-membership-mutation-body" class="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            <p v-if="errorMessage" :id="vipSelectionInvalid ? 'membership-vip-level-error' : null" ref="errorRef" tabindex="-1" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 outline-none" role="alert">{{ errorMessage }}</p>

            <template v-if="stage === 'edit'">
              <template v-if="mode === 'credit'">
                <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><span class="text-slate-500">当前信用分</span><strong class="float-right text-slate-900">{{ currentScore }}</strong></div>
                <fieldset aria-labelledby="credit-direction-label">
                  <legend id="credit-direction-label" class="text-sm font-medium text-slate-800">调整方向 <span class="text-rose-500">*</span></legend>
                  <div class="mt-2 grid grid-cols-2 gap-2">
                    <label v-for="(option, index) in [{ value: 'increase', label: '增加信用分' }, { value: 'decrease', label: '扣减信用分' }]" :key="option.value" class="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                      <input :ref="(element) => setDirectionRef(element, index)" v-model="form.direction" type="radio" name="credit-direction" :value="option.value" class="h-4 w-4" />{{ option.label }}
                    </label>
                  </div>
                </fieldset>
                <label class="block"><span class="text-sm font-medium text-slate-800">调整分值 <span class="text-rose-500">*</span></span><input data-testid="membership-mutation-points" v-model="form.points" type="text" inputmode="numeric" autocomplete="off" class="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="请输入正整数" /></label>
              </template>

              <template v-else-if="mode === 'vip'">
                <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><span class="text-slate-500">当前等级</span><strong class="float-right text-slate-900">{{ currentVip ? vipPrimaryLabel(currentVip) : `VIP${currentVipLevel}` }}</strong></div>
                <PanelSingleSelect
                  ref="vipSelectRef"
                  v-model="form.vipLevel"
                  data-testid="membership-vip-level-select"
                  :options="vipOptions"
                  label="目标会员等级"
                  placeholder="请选择目标会员等级"
                  search-label="搜索目标会员等级"
                  required
                  :invalid="vipSelectionInvalid"
                  error-id="membership-vip-level-error"
                  id-base="membership-vip-level"
                />
              </template>

              <template v-else>
                <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><span class="text-slate-500">入账账户</span><strong class="float-right text-slate-900">可用资金账户</strong></div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><span class="text-slate-500">当前余额</span><strong class="float-right text-slate-900">{{ money(currentBalance) }} USDT</strong></div>
                <label class="block"><span class="text-sm font-medium text-slate-800">返利金额 <span class="text-rose-500">*</span></span><input ref="amountRef" data-testid="membership-mutation-amount" v-model="form.amount" type="text" inputmode="decimal" autocomplete="off" class="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="最多两位小数" /></label>
              </template>

              <label class="block"><span class="text-sm font-medium text-slate-800">操作原因 <span class="text-rose-500">*</span></span><textarea ref="reasonRef" data-testid="membership-mutation-reason" v-model="form.reason" rows="3" maxlength="200" class="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" :placeholder="`请说明${config.action}原因`" /><span class="mt-1 block text-right text-xs text-slate-500">{{ form.reason.length }}/200</span></label>
            </template>

            <template v-else>
              <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <h3 class="font-semibold">确认{{ config.action }}</h3>
                <dl v-if="mode === 'credit'" class="mt-3 grid grid-cols-[5.5rem_1fr] gap-y-2"><dt>当前信用分</dt><dd>{{ currentScore }}</dd><dt>调整幅度</dt><dd>{{ creditDelta > 0 ? '+' : '' }}{{ creditDelta }}</dd><dt>调整后</dt><dd class="font-semibold">{{ resultingScore }}</dd><dt>操作原因</dt><dd class="break-words">{{ form.reason.trim() }}</dd></dl>
                <dl v-else-if="mode === 'vip'" class="mt-3 grid grid-cols-[5.5rem_1fr] gap-y-2"><dt>变更方向</dt><dd>{{ vipDirection }}</dd><dt>当前等级</dt><dd>{{ currentVip ? vipPrimaryLabel(currentVip) : `VIP${currentVipLevel}` }}</dd><dt>目标等级</dt><dd class="font-semibold">{{ targetVipPrimaryLabel }}<span v-if="targetVipSecondaryLabel"> · {{ targetVipSecondaryLabel }}</span></dd><template v-if="selectedVipBenefits.length"><dt>目标权益</dt><dd>{{ selectedVipBenefits.join('、') }}</dd></template><dt>操作原因</dt><dd class="break-words">{{ form.reason.trim() }}</dd></dl>
                <dl v-else class="mt-3 grid grid-cols-[5.5rem_1fr] gap-y-2"><dt>返利金额</dt><dd>{{ money(parsedAmount) }} USDT</dd><dt>入账前</dt><dd>{{ money(currentBalance) }} USDT</dd><dt>入账后</dt><dd class="font-semibold">{{ money(resultingBalance) }} USDT</dd><dt>操作原因</dt><dd class="break-words">{{ form.reason.trim() }}</dd></dl>
              </div>
              <p class="text-xs text-slate-500">提交后还需通过 MFA 验证，验证成功才会执行。</p>
            </template>
          </div>

          <footer class="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
            <template v-if="stage === 'edit'"><button type="button" :disabled="busy" class="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 disabled:opacity-40" @click="close">取消</button><button type="button" :disabled="busy" class="rounded-lg px-3.5 py-2 text-sm font-medium text-white disabled:opacity-40" :class="config.tone" @click="startConfirm">下一步</button></template>
            <template v-else><button ref="backRef" type="button" :disabled="busy" class="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 disabled:opacity-40" @click="backToEdit">返回修改</button><button ref="submitButtonRef" type="button" :disabled="busy" class="rounded-lg px-3.5 py-2 text-sm font-medium text-white disabled:opacity-40" :class="config.tone" @click="requestMfa">{{ busy ? '验证中…' : '提交并验证' }}</button></template>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.membership-mutation-dialog-enter-active { transition: opacity 200ms ease-out; }
.membership-mutation-dialog-leave-active { transition: opacity 150ms ease-in; }
.membership-mutation-dialog-enter-active .membership-mutation-dialog-panel { transition: opacity 200ms ease-out, transform 200ms ease-out; }
.membership-mutation-dialog-leave-active .membership-mutation-dialog-panel { transition: opacity 150ms ease-in, transform 150ms ease-in; }
.membership-mutation-dialog-enter-from, .membership-mutation-dialog-leave-to { opacity: 0; }
.membership-mutation-dialog-enter-from .membership-mutation-dialog-panel, .membership-mutation-dialog-leave-to .membership-mutation-dialog-panel { opacity: 0; transform: scale(0.96); }
@media (prefers-reduced-motion: reduce) {
  .membership-mutation-dialog-enter-active, .membership-mutation-dialog-leave-active,
  .membership-mutation-dialog-enter-active .membership-mutation-dialog-panel, .membership-mutation-dialog-leave-active .membership-mutation-dialog-panel { transition-duration: 50ms; }
  .membership-mutation-dialog-enter-from .membership-mutation-dialog-panel, .membership-mutation-dialog-leave-to .membership-mutation-dialog-panel { transform: none; }
}
</style>
