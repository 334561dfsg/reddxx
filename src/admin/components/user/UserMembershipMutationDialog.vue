<script setup>
import AdminDialog from '../antd/AdminDialog.vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import { AdminButton, AdminInput, AdminRadio, AdminTextarea, nativeControl } from '../antd/controls.js'

import { computed, nextTick, reactive, ref, watch } from 'vue'
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
const reasonPreview = computed(() => form.reason.trim() || '未填写')
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
// Frame: AdminDialog (Ant Modal + useDialogLifecycle), dialog migration 2026-11-27.
const dialogFrame = ref(null)
const phase = computed(() => dialogFrame.value?.phase ?? 'closed')

const close = () => dialogFrame.value?.close()
const handleClosed = () => {
  resetForm()
  emit('closed')
}
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
  if (vipSelectionError.value) {
    showVipSelectionError({ focus: true })
    return null
  }
  const option = latestVipOption()
  if (option) return option
  showVipSelectionError({ focus: true })
  return null
}

const startConfirm = async () => {
  if (props.mode !== 'vip') {
    errorMessage.value = ''
    vipSelectionError.value = ''
  }
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
  if (reason.length > 200) return showError('操作原因不能超过 200 字')
  stage.value = 'confirm'
  await nextTick()
  backRef.value?.focus?.()
}
const handleVipSelectionCommit = () => {
  if (latestVipOption()) clearVipSelectionError()
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
  [() => props.visible, () => props.mode, () => form.vipLevel],
  ([visible, mode, vipLevel]) => {
    if (!visible || mode !== 'vip') return
    if (vipLevel === null) return
    if (latestVipOption()) return
    const returnToEdit = stage.value === 'confirm'
    showVipSelectionError({ focus: returnToEdit })
  },
  { flush: 'post' }
)
watch(
  [() => props.visible, () => props.mode, vipOptions],
  ([visible, mode]) => {
    if (!visible || mode !== 'vip' || form.vipLevel === null || latestVipOption()) return
    const returnToEdit = stage.value === 'confirm'
    showVipSelectionError({ focus: returnToEdit })
  },
  { deep: true, flush: 'post' }
)
</script>

<template>
  <AdminDialog :open="visible" :title="config.title" title-id="user-membership-mutation-title" :busy="closeDisabled" :return-focus="returnFocus" testid="user-membership-mutation-dialog" :width="576" plain ref="dialogFrame" :initial-focus="initialFocusRef" @close="emit('close')" @closed="handleClosed">
      <template #subtitle>{{ user?.username || '未知用户' }} · UID {{ userId || '—' }}</template>
      <div data-testid="user-membership-mutation-body" class="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            <FeedbackToast v-if="errorMessage" :id="vipSelectionInvalid ? 'membership-vip-level-error' : null" ref="errorRef" type="error" :source="() => (errorMessage) ? (errorMessage) : ''"></FeedbackToast>

            <template v-if="stage === 'edit'">
              <template v-if="mode === 'credit'">
                <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><span class="text-slate-500">当前信用分</span><strong class="float-right text-slate-900">{{ currentScore }}</strong></div>
                <fieldset aria-labelledby="credit-direction-label">
                  <legend id="credit-direction-label" class="text-sm font-medium text-slate-800"><span aria-hidden="true" class="text-rose-500 mr-1">*</span>调整方向</legend>
                  <div class="mt-2 grid grid-cols-2 gap-2">
                    <AdminRadio v-for="(option, index) in [{ value: 'increase', label: '增加信用分' }, { value: 'decrease', label: '扣减信用分' }]" :key="option.value" class="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm has-[:checked]:bg-blue-50" :ref="(element) => setDirectionRef(nativeControl(element), index)" v-model="form.direction" name="credit-direction" :value="option.value">
                      {{ option.label }}
                    </AdminRadio>
                  </div>
                </fieldset>
                <label class="block"><span class="text-sm font-medium text-slate-800"><span aria-hidden="true" class="text-rose-500 mr-1">*</span>调整分值</span><AdminInput data-testid="membership-mutation-points" v-model="form.points" type="text" inputmode="numeric" autocomplete="off" class="mt-1.5 w-full" placeholder="请输入正整数" /></label>
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
                  @change="handleVipSelectionCommit"
                />
              </template>

              <template v-else>
                <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><span class="text-slate-500">入账账户</span><strong class="float-right text-slate-900">可用资金账户</strong></div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><span class="text-slate-500">当前余额</span><strong class="float-right text-slate-900">{{ money(currentBalance) }} USDT</strong></div>
                <label class="block"><span class="text-sm font-medium text-slate-800"><span aria-hidden="true" class="text-rose-500 mr-1">*</span>返利金额</span><AdminInput :ref="element => { amountRef = nativeControl(element) }" data-testid="membership-mutation-amount" v-model="form.amount" type="text" inputmode="decimal" autocomplete="off" class="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none" placeholder="最多两位小数" /></label>
              </template>

              <label class="block"><span class="text-sm font-medium text-slate-800">操作原因（可选）</span><AdminTextarea :ref="element => { reasonRef = nativeControl(element) }" data-testid="membership-mutation-reason" v-model="form.reason" rows="3" maxlength="200" class="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none" :placeholder="`可填写${config.action}原因`" /><span class="mt-1 block text-right text-xs text-slate-500">{{ form.reason.length }}/200</span></label>
            </template>

            <template v-else>
              <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <h3 class="font-semibold">确认{{ config.action }}</h3>
                <dl v-if="mode === 'credit'" class="mt-3 grid grid-cols-[5.5rem_1fr] gap-y-2"><dt>当前信用分</dt><dd>{{ currentScore }}</dd><dt>调整幅度</dt><dd>{{ creditDelta > 0 ? '+' : '' }}{{ creditDelta }}</dd><dt>调整后</dt><dd class="font-semibold">{{ resultingScore }}</dd><dt>操作原因</dt><dd class="break-words">{{ reasonPreview }}</dd></dl>
                <dl v-else-if="mode === 'vip'" class="mt-3 grid grid-cols-[5.5rem_1fr] gap-y-2"><dt>变更方向</dt><dd>{{ vipDirection }}</dd><dt>当前等级</dt><dd>{{ currentVip ? vipPrimaryLabel(currentVip) : `VIP${currentVipLevel}` }}</dd><dt>目标等级</dt><dd class="font-semibold">{{ targetVipPrimaryLabel }}<span v-if="targetVipSecondaryLabel"> · {{ targetVipSecondaryLabel }}</span></dd><template v-if="selectedVipBenefits.length"><dt>目标权益</dt><dd>{{ selectedVipBenefits.join('、') }}</dd></template><dt>操作原因</dt><dd class="break-words">{{ reasonPreview }}</dd></dl>
                <dl v-else class="mt-3 grid grid-cols-[5.5rem_1fr] gap-y-2"><dt>返利金额</dt><dd>{{ money(parsedAmount) }} USDT</dd><dt>入账前</dt><dd>{{ money(currentBalance) }} USDT</dd><dt>入账后</dt><dd class="font-semibold">{{ money(resultingBalance) }} USDT</dd><dt>操作原因</dt><dd class="break-words">{{ reasonPreview }}</dd></dl>
              </div>
              <p class="text-xs text-slate-500">提交后还需通过 MFA 验证，验证成功才会执行。</p>
            </template>
          </div>

          <footer class="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
            <template v-if="stage === 'edit'"><AdminButton type="button" :disabled="busy" @click="close">取消</AdminButton><AdminButton type="button" :disabled="busy" :class="config.tone" @click="startConfirm">下一步</AdminButton></template>
            <template v-else><AdminButton :ref="element => { backRef = nativeControl(element) }" type="button" :disabled="busy" class="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 disabled:opacity-40" @click="backToEdit">返回修改</AdminButton><AdminButton :ref="element => { submitButtonRef = nativeControl(element) }" type="button" :disabled="busy" class="rounded-lg px-3.5 py-2 text-sm font-medium text-white disabled:opacity-40" :class="config.tone" @click="requestMfa">{{ busy ? '验证中…' : '提交并验证' }}</AdminButton></template>
          </footer>
    </AdminDialog>
</template>

