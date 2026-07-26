<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  mode: { type: String, default: 'freeze' },
  snapshot: { type: Object, default: null },
  busy: { type: Boolean, default: false },
  returnFocus: { type: [Object, Function], default: null }
})
const emit = defineEmits(['close', 'closed', 'request-mfa'])
const modeToType = { freeze: 'freeze-funds', unfreeze: 'unfreeze-funds', deduct: 'deduct-funds' }
const configs = {
  freeze: { title: '冻结全部资金', action: '冻结', tone: 'bg-rose-600 hover:bg-rose-700', hint: '把当前全部可用资金转为后台冻结，用户总资产不变。' },
  unfreeze: { title: '解冻后台冻结', action: '解冻', tone: 'bg-amber-600 hover:bg-amber-700', hint: '仅解冻由后台操作冻结的资金，不影响业务冻结金额。' },
  deduct: { title: '划扣可用资金', action: '划扣', tone: 'bg-rose-600 hover:bg-rose-700', hint: '永久减少可用资金并生成独立资金记录。' }
}
const dialogRef = ref(null)
const amountRef = ref(null)
const reasonRef = ref(null)
const backRef = ref(null)
const errorRef = ref(null)
const submitButtonRef = ref(null)
const stage = ref('edit')
const errorMessage = ref('')
const form = reactive({ amount: '', reason: '' })
const config = computed(() => configs[props.mode] || configs.freeze)
const userId = computed(() => String(props.user?.id ?? props.user?.userId ?? ''))
const balance = computed(() => Number(props.snapshot?.balance ?? props.user?.balance ?? 0))
const frozenBalance = computed(() => Number(props.snapshot?.frozenBalance ?? props.user?.frozenBalance ?? 0))
const adminFrozenAmount = computed(() => Number(props.snapshot?.adminFrozenAmount ?? 0))
const parsedAmount = computed(() => Number(form.amount))
const operationAmount = computed(() => {
  if (props.mode === 'freeze') return balance.value
  if (props.mode === 'unfreeze') return Math.min(adminFrozenAmount.value, frozenBalance.value)
  return Number.isFinite(parsedAmount.value) ? parsedAmount.value : 0
})
const after = computed(() => {
  const amount = operationAmount.value
  if (props.mode === 'freeze') return { balance: balance.value - amount, frozen: frozenBalance.value + amount }
  if (props.mode === 'unfreeze') return { balance: balance.value + amount, frozen: frozenBalance.value - amount }
  return { balance: balance.value - amount, frozen: frozenBalance.value }
})
const money = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const resetForm = () => {
  stage.value = 'edit'
  errorMessage.value = ''
  form.amount = ''
  form.reason = ''
}
const closeDisabled = computed(() => props.busy)
const { rendered, phase, layerStyle, requestDialogClose, onAfterEnter, onAfterLeave } = useDialogLifecycle({
  open: computed(() => props.visible),
  dialogRef,
  initialFocusRef: computed(() => props.mode === 'deduct' ? amountRef.value : reasonRef.value),
  returnFocusRef: computed(() => props.returnFocus),
  requestClose: () => emit('close'),
  closeDisabled
})
const close = createDialogCloseAction(requestDialogClose)
const handleAfterLeave = () => {
  if (!onAfterLeave()) return
  resetForm()
  emit('closed')
}
const showError = async (message) => {
  errorMessage.value = message
  await nextTick()
  errorRef.value?.focus?.()
}
const startConfirm = async () => {
  errorMessage.value = ''
  const reason = form.reason.trim()
  if (!reason) return showError('操作原因必填')
  if (reason.length > 200) return showError('操作原因不能超过 200 字')
  if (operationAmount.value <= 0) return showError(props.mode === 'unfreeze' ? '当前没有可解冻的后台冻结资金' : '当前没有可操作的可用资金')
  if (props.mode === 'deduct' && (!/^\d+(\.\d{1,2})?$/.test(form.amount.trim()) || parsedAmount.value > balance.value)) {
    return showError('请输入不超过可用资金且最多两位小数的划扣金额')
  }
  stage.value = 'confirm'
  await nextTick()
  backRef.value?.focus?.()
}
const backToEdit = async () => {
  stage.value = 'edit'
  errorMessage.value = ''
  await nextTick()
  ;(props.mode === 'deduct' ? amountRef.value : reasonRef.value)?.focus?.()
}
const requestMfa = () => {
  if (phase.value !== 'open' || props.busy) return
  const payload = { userId: userId.value, reason: form.reason.trim() }
  if (props.mode === 'deduct') payload.amount = parsedAmount.value
  emit('request-mfa', { type: modeToType[props.mode], payload, returnFocus: submitButtonRef.value })
}
watch(() => [props.visible, userId.value, props.mode], ([visible]) => { if (visible) resetForm() })
</script>

<template>
  <Teleport to="body">
    <Transition name="funds-mutation-dialog" appear @after-enter="onAfterEnter" @after-leave="handleAfterLeave">
      <div v-if="rendered" v-show="phase !== 'closing'" class="fixed inset-0 grid place-items-center bg-slate-950/50 p-3 sm:p-4" :style="layerStyle" role="presentation">
        <section ref="dialogRef" data-testid="user-funds-mutation-dialog" class="funds-mutation-dialog-panel flex max-h-[calc(100vh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl supports-[height:100dvh]:max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100vh-2rem)]" role="dialog" aria-modal="true" aria-labelledby="user-funds-mutation-title" :aria-busy="busy">
          <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
            <div class="min-w-0 flex-1">
              <h2 id="user-funds-mutation-title" class="text-lg font-semibold text-slate-900">{{ config.title }}</h2>
              <p class="mt-0.5 truncate text-sm text-slate-500">{{ user?.username || '未知用户' }} · UID {{ userId || '—' }}</p>
            </div>
            <button type="button" :disabled="busy" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-2xl text-slate-400 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40" aria-label="关闭" @click="close">×</button>
          </header>

          <div data-testid="user-funds-mutation-body" class="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
            <p v-if="errorMessage" ref="errorRef" tabindex="-1" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 outline-none" role="alert">{{ errorMessage }}</p>
            <p class="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{{ config.hint }}</p>

            <template v-if="stage === 'edit'">
              <dl class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <div class="rounded-lg border border-slate-200 p-3"><dt class="text-xs text-slate-500">可用资金</dt><dd class="mt-1 font-semibold text-slate-900">{{ money(balance) }}</dd></div>
                <div class="rounded-lg border border-slate-200 p-3"><dt class="text-xs text-slate-500">冻结资金</dt><dd class="mt-1 font-semibold text-slate-900">{{ money(frozenBalance) }}</dd></div>
                <div class="rounded-lg border border-slate-200 p-3"><dt class="text-xs text-slate-500">后台冻结</dt><dd class="mt-1 font-semibold text-slate-900">{{ money(adminFrozenAmount) }}</dd></div>
              </dl>
              <label v-if="mode === 'deduct'" class="block">
                <span class="text-sm font-medium text-slate-800">划扣金额 <span class="text-rose-500">*</span></span>
                <input ref="amountRef" v-model="form.amount" type="text" inputmode="decimal" autocomplete="off" class="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="最多两位小数" />
              </label>
              <label class="block">
                <span class="text-sm font-medium text-slate-800">操作原因 <span class="text-rose-500">*</span></span>
                <textarea ref="reasonRef" v-model="form.reason" rows="3" maxlength="200" class="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" :placeholder="`请说明${config.action}原因`" />
                <span class="mt-1 block text-right text-xs text-slate-500">{{ form.reason.length }}/200</span>
              </label>
            </template>

            <template v-else>
              <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <h3 class="font-semibold">确认{{ config.title }}</h3>
                <dl class="mt-3 grid grid-cols-[5rem_1fr] gap-y-2">
                  <dt class="text-amber-800">操作金额</dt><dd>{{ money(operationAmount) }}</dd>
                  <dt class="text-amber-800">可用资金</dt><dd>{{ money(balance) }} → <strong>{{ money(after.balance) }}</strong></dd>
                  <dt class="text-amber-800">冻结资金</dt><dd>{{ money(frozenBalance) }} → <strong>{{ money(after.frozen) }}</strong></dd>
                  <dt class="text-amber-800">操作原因</dt><dd class="break-words">{{ form.reason.trim() }}</dd>
                </dl>
              </div>
              <p class="text-xs text-slate-500">提交后还需通过 MFA 验证，验证成功才会执行本次操作。</p>
            </template>
          </div>

          <footer class="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
            <template v-if="stage === 'edit'">
              <button type="button" :disabled="busy" class="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 disabled:opacity-40" @click="close">取消</button>
              <button type="button" :disabled="busy" class="rounded-lg px-3.5 py-2 text-sm font-medium text-white disabled:opacity-40" :class="config.tone" @click="startConfirm">下一步</button>
            </template>
            <template v-else>
              <button ref="backRef" type="button" :disabled="busy" class="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 disabled:opacity-40" @click="backToEdit">返回修改</button>
              <button ref="submitButtonRef" type="button" :disabled="busy" class="rounded-lg px-3.5 py-2 text-sm font-medium text-white disabled:opacity-40" :class="config.tone" @click="requestMfa">{{ busy ? '验证中…' : '提交并验证' }}</button>
            </template>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.funds-mutation-dialog-enter-active { transition: opacity 200ms ease-out; }
.funds-mutation-dialog-leave-active { transition: opacity 150ms ease-in; }
.funds-mutation-dialog-enter-active .funds-mutation-dialog-panel { transition: opacity 200ms ease-out, transform 200ms ease-out; }
.funds-mutation-dialog-leave-active .funds-mutation-dialog-panel { transition: opacity 150ms ease-in, transform 150ms ease-in; }
.funds-mutation-dialog-enter-from,
.funds-mutation-dialog-leave-to { opacity: 0; }
.funds-mutation-dialog-enter-from .funds-mutation-dialog-panel,
.funds-mutation-dialog-leave-to .funds-mutation-dialog-panel { opacity: 0; transform: scale(0.96); }
@media (prefers-reduced-motion: reduce) {
  .funds-mutation-dialog-enter-active,
  .funds-mutation-dialog-leave-active,
  .funds-mutation-dialog-enter-active .funds-mutation-dialog-panel,
  .funds-mutation-dialog-leave-active .funds-mutation-dialog-panel { transition-duration: 50ms; }
  .funds-mutation-dialog-enter-from .funds-mutation-dialog-panel,
  .funds-mutation-dialog-leave-to .funds-mutation-dialog-panel { transform: none; }
}
</style>
