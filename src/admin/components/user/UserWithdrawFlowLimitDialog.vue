<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  limit: { type: Object, default: null },
  busy: { type: Boolean, default: false },
  returnFocus: { type: [Object, Function], default: null }
})
const emit = defineEmits(['close', 'closed', 'request-mfa'])
const dialogRef = ref(null)
const requiredRef = ref(null)
const backRef = ref(null)
const errorRef = ref(null)
const submitButtonRef = ref(null)
const stage = ref('edit')
const errorMessage = ref('')
const form = reactive({ requiredTurnover: '', expiresAt: '', reason: '', removeReason: '' })
const userId = computed(() => String(props.user?.id ?? props.user?.userId ?? ''))
const hasLimit = computed(() => Boolean(props.limit && props.limit.status !== 'none'))
const completedTurnover = computed(() => Number(props.limit?.completedTurnover || 0))
const remainingTurnover = computed(() => {
  const required = Number(form.requiredTurnover)
  return Number.isFinite(required) ? Math.max(0, required - completedTurnover.value) : 0
})
const statusText = computed(() => ({ active: '生效中', completed: '已完成', expired: '已过期' }[props.limit?.status] || '未设置'))
const money = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const toLocalDateTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
const resetForm = () => {
  stage.value = 'edit'
  errorMessage.value = ''
  form.requiredTurnover = props.limit?.requiredTurnover ?? ''
  form.expiresAt = toLocalDateTime(props.limit?.expiresAt)
  form.reason = ''
  form.removeReason = ''
}
const closeDisabled = computed(() => props.busy)
const { rendered, phase, layerStyle, requestDialogClose, onAfterEnter, onAfterLeave } = useDialogLifecycle({
  open: computed(() => props.visible), dialogRef, initialFocusRef: requiredRef,
  returnFocusRef: computed(() => props.returnFocus), requestClose: () => emit('close'), closeDisabled
})
const close = createDialogCloseAction(requestDialogClose)
const handleAfterLeave = async () => {
  if (!await onAfterLeave()) return
  resetForm()
  emit('closed')
}
const showError = async (message) => { errorMessage.value = message; await nextTick(); errorRef.value?.focus?.() }
const validMoney = (value) => /^\d+(\.\d{1,2})?$/.test(String(value).trim())
const startSetConfirm = async () => {
  errorMessage.value = ''
  const required = Number(form.requiredTurnover)
  if (!validMoney(form.requiredTurnover) || required <= 0) return showError('所需流水必须为大于 0 且最多两位小数的金额')
  if (required <= completedTurnover.value) return showError('所需流水必须大于当前已完成流水')
  if (form.expiresAt && new Date(form.expiresAt).getTime() <= Date.now()) return showError('到期时间必须晚于当前时间')
  if (!form.reason.trim()) return showError('设置原因必填')
  if (form.reason.trim().length > 200) return showError('设置原因不能超过 200 字')
  stage.value = 'confirm-set'; await nextTick(); backRef.value?.focus?.()
}
const startRemoveConfirm = async () => {
  errorMessage.value = ''
  if (!form.removeReason.trim()) return showError('解除原因必填')
  if (form.removeReason.trim().length > 200) return showError('解除原因不能超过 200 字')
  stage.value = 'confirm-remove'; await nextTick(); backRef.value?.focus?.()
}
const backToEdit = async () => { stage.value = 'edit'; errorMessage.value = ''; await nextTick(); requiredRef.value?.focus?.() }
const requestMfa = () => {
  if (phase.value !== 'open' || props.busy) return
  if (stage.value === 'confirm-remove') {
    emit('request-mfa', { type: 'flow-limit-remove', payload: { userId: userId.value, reason: form.removeReason.trim() }, returnFocus: submitButtonRef.value })
    return
  }
  emit('request-mfa', {
    type: 'flow-limit-set',
    payload: {
      userId: userId.value,
      requiredTurnover: Number(form.requiredTurnover),
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      reason: form.reason.trim()
    },
    returnFocus: submitButtonRef.value
  })
}
watch(() => [props.visible, userId.value, props.limit], ([visible]) => { if (visible) resetForm() }, { deep: true })
</script>

<template>
  <Teleport to="body">
    <Transition name="withdraw-flow-dialog" appear @after-enter="onAfterEnter" @after-leave="handleAfterLeave">
      <div v-if="rendered" v-show="phase !== 'closing'" class="fixed inset-0 grid place-items-center bg-slate-950/50 p-3 sm:p-4" :style="layerStyle" role="presentation">
        <section ref="dialogRef" class="withdraw-flow-dialog-panel flex max-h-[calc(100vh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl supports-[height:100dvh]:max-h-[calc(100dvh-1.5rem)]" role="dialog" aria-modal="true" aria-labelledby="user-withdraw-flow-limit-title" :aria-busy="busy">
          <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
            <div class="min-w-0"><h2 id="user-withdraw-flow-limit-title" class="text-lg font-semibold text-slate-900">出金流水限制</h2><p class="mt-0.5 truncate text-sm text-slate-500">{{ user?.username || '未知用户' }} · UID {{ userId || '—' }}</p></div>
            <button type="button" :disabled="busy" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-2xl text-slate-400 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40" aria-label="关闭" @click="close">×</button>
          </header>

          <div data-testid="user-withdraw-flow-limit-body" class="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
            <p v-if="errorMessage" ref="errorRef" tabindex="-1" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 outline-none" role="alert">{{ errorMessage }}</p>
            <div class="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><span class="text-slate-500">当前状态</span><strong class="text-slate-900">{{ statusText }}</strong></div>

            <template v-if="stage === 'edit'">
              <label class="block"><span class="text-sm font-medium text-slate-800">流水要求金额 <span class="text-rose-500">*</span></span><div class="relative mt-1.5"><input ref="requiredRef" v-model="form.requiredTurnover" type="text" inputmode="decimal" class="h-10 w-full rounded-lg border border-slate-300 px-3 pr-16 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /><span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-500">USDT</span></div></label>
              <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <dl class="grid grid-cols-2 gap-3 text-sm">
                  <div><dt class="text-xs text-slate-500">已完成有效流水</dt><dd class="mt-0.5 font-semibold text-slate-900">{{ money(completedTurnover) }} <span class="text-xs font-normal text-slate-500">USDT</span></dd></div>
                  <div><dt class="text-xs text-slate-500">剩余所需流水</dt><dd class="mt-0.5 font-semibold text-slate-900">{{ money(remainingTurnover) }} <span class="text-xs font-normal text-slate-500">USDT</span></dd></div>
                </dl>
                <p class="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-500">已完成有效流水由系统自动累计，不可人工修改。</p>
              </div>
              <label class="block"><span class="text-sm font-medium text-slate-800">到期时间 <span class="font-normal text-slate-400">（可选）</span></span><input v-model="form.expiresAt" type="datetime-local" class="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
              <label class="block"><span class="text-sm font-medium text-slate-800">设置原因 <span class="text-rose-500">*</span></span><textarea v-model="form.reason" rows="3" maxlength="200" class="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
              <div v-if="hasLimit" class="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <p class="text-sm font-medium text-rose-900">解除现有限制</p>
                <textarea v-model="form.removeReason" rows="2" maxlength="200" class="mt-2 w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100" placeholder="请输入解除原因" />
                <button type="button" :disabled="busy" class="mt-2 rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-medium text-rose-700 disabled:opacity-40" @click="startRemoveConfirm">解除限制</button>
              </div>
            </template>

            <template v-else>
              <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <h3 class="font-semibold">{{ stage === 'confirm-remove' ? '确认解除出金流水限制' : '确认设置出金流水限制' }}</h3>
                <dl v-if="stage === 'confirm-set'" class="mt-3 grid grid-cols-[7rem_1fr] gap-y-2"><dt>流水要求金额</dt><dd>{{ money(form.requiredTurnover) }} USDT</dd><dt>已完成有效流水</dt><dd>{{ money(completedTurnover) }} USDT</dd><dt>剩余所需流水</dt><dd>{{ money(remainingTurnover) }} USDT</dd><dt>到期时间</dt><dd>{{ form.expiresAt || '长期有效' }}</dd><dt>设置原因</dt><dd class="break-words">{{ form.reason.trim() }}</dd></dl>
                <p v-else class="mt-3 break-words">解除原因：{{ form.removeReason.trim() }}</p>
              </div>
              <p class="text-xs text-slate-500">提交后还需通过 MFA 验证，验证成功才会执行。</p>
            </template>
          </div>

          <footer class="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
            <template v-if="stage === 'edit'"><button type="button" :disabled="busy" class="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 disabled:opacity-40" @click="close">取消</button><button type="button" :disabled="busy" class="rounded-lg bg-amber-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-40" @click="startSetConfirm">下一步</button></template>
            <template v-else><button ref="backRef" type="button" :disabled="busy" class="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 disabled:opacity-40" @click="backToEdit">返回修改</button><button ref="submitButtonRef" type="button" :disabled="busy" class="rounded-lg bg-rose-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-40" @click="requestMfa">{{ busy ? '验证中…' : '提交并验证' }}</button></template>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.withdraw-flow-dialog-enter-active { transition: opacity 200ms ease-out; }
.withdraw-flow-dialog-leave-active { transition: opacity 150ms ease-in; }
.withdraw-flow-dialog-enter-active .withdraw-flow-dialog-panel { transition: opacity 200ms ease-out, transform 200ms ease-out; }
.withdraw-flow-dialog-leave-active .withdraw-flow-dialog-panel { transition: opacity 150ms ease-in, transform 150ms ease-in; }
.withdraw-flow-dialog-enter-from, .withdraw-flow-dialog-leave-to { opacity: 0; }
.withdraw-flow-dialog-enter-from .withdraw-flow-dialog-panel, .withdraw-flow-dialog-leave-to .withdraw-flow-dialog-panel { opacity: 0; transform: scale(0.96); }
@media (prefers-reduced-motion: reduce) {
  .withdraw-flow-dialog-enter-active, .withdraw-flow-dialog-leave-active,
  .withdraw-flow-dialog-enter-active .withdraw-flow-dialog-panel, .withdraw-flow-dialog-leave-active .withdraw-flow-dialog-panel { transition-duration: 50ms; }
  .withdraw-flow-dialog-enter-from .withdraw-flow-dialog-panel, .withdraw-flow-dialog-leave-to .withdraw-flow-dialog-panel { transform: none; }
}
</style>
