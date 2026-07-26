<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  review: { type: Object, default: null },
  busy: { type: Boolean, default: false },
  returnFocus: { type: [Object, Function], default: null }
})
const emit = defineEmits(['close', 'closed', 'request-mfa'])
const dialogRef = ref(null)
const titleRef = ref(null)
const backRef = ref(null)
const submitButtonRef = ref(null)
const errorRef = ref(null)
const stage = ref('edit')
const errorMessage = ref('')
const form = reactive({ decision: '', note: '' })
const userId = computed(() => String(props.user?.id ?? props.user?.userId ?? ''))
const formatTime = (value) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—'
const resetForm = () => { stage.value = 'edit'; errorMessage.value = ''; form.decision = ''; form.note = '' }
const closeDisabled = computed(() => props.busy)
const { rendered, phase, layerStyle, requestDialogClose, onAfterEnter, onAfterLeave } = useDialogLifecycle({
  open: computed(() => props.visible), dialogRef, initialFocusRef: titleRef,
  returnFocusRef: computed(() => props.returnFocus), requestClose: () => emit('close'), closeDisabled
})
const close = createDialogCloseAction(requestDialogClose)
const handleAfterLeave = () => {
  if (!onAfterLeave()) return
  resetForm()
  emit('closed')
}
const showError = async (message) => { errorMessage.value = message; await nextTick(); errorRef.value?.focus?.() }
const startConfirm = async () => {
  errorMessage.value = ''
  if (!['approve', 'reject'].includes(form.decision)) return showError('请选择审核决定')
  if (!form.note.trim()) return showError('审核备注必填')
  if (form.note.trim().length > 200) return showError('审核备注不能超过 200 字')
  stage.value = 'confirm'; await nextTick(); backRef.value?.focus?.()
}
const backToEdit = async () => { stage.value = 'edit'; errorMessage.value = ''; await nextTick(); titleRef.value?.focus?.() }
const requestMfa = () => {
  if (phase.value !== 'open' || props.busy) return
  emit('request-mfa', {
    type: 'credit-review-decide',
    payload: { userId: userId.value, reviewId: props.review?.id, decision: form.decision, note: form.note.trim() },
    returnFocus: submitButtonRef.value
  })
}
watch(() => [props.visible, props.review?.id], ([visible]) => { if (visible) resetForm() }, { immediate: true })
</script>

<template>
  <Teleport to="body">
    <Transition name="credit-review-decision-dialog" appear @after-enter="onAfterEnter" @after-leave="handleAfterLeave">
      <div v-if="rendered" v-show="phase !== 'closing'" class="fixed inset-0 grid place-items-center bg-slate-950/50 p-3 sm:p-4" :style="layerStyle" role="presentation">
        <section ref="dialogRef" data-testid="user-credit-review-decision-dialog" class="credit-review-decision-dialog-panel flex max-h-[calc(100vh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl supports-[height:100dvh]:max-h-[calc(100dvh-1.5rem)]" role="dialog" aria-modal="true" aria-labelledby="user-credit-review-decision-title" :aria-busy="busy">
          <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
            <div class="min-w-0 flex-1"><h2 id="user-credit-review-decision-title" ref="titleRef" tabindex="-1" class="text-lg font-semibold text-slate-900 outline-none">处理信用分审核</h2><p class="mt-0.5 break-words text-sm text-slate-500">{{ user?.username || '未知用户' }} · UID {{ userId || '—' }}</p></div>
            <button type="button" :disabled="busy" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-2xl text-slate-400 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40" aria-label="关闭" @click="close">×</button>
          </header>

          <div data-testid="user-credit-review-decision-body" class="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            <p v-if="errorMessage" ref="errorRef" tabindex="-1" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 outline-none" role="alert">{{ errorMessage }}</p>
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <dl class="grid grid-cols-[5rem_1fr] gap-y-2"><dt class="text-slate-500">信用分</dt><dd class="font-semibold text-slate-900">{{ review?.beforeScore }} → {{ review?.proposedScore }} <span :class="review?.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'">({{ review?.delta >= 0 ? '+' : '' }}{{ review?.delta }})</span></dd><dt class="text-slate-500">申请原因</dt><dd class="break-words text-slate-700">{{ review?.reason || '—' }}</dd><dt class="text-slate-500">申请人</dt><dd class="text-slate-700">{{ review?.applicantName || review?.applicantId || '—' }}</dd><dt class="text-slate-500">申请时间</dt><dd class="text-slate-700">{{ formatTime(review?.appliedAt) }}</dd></dl>
            </div>

            <template v-if="stage === 'edit'">
              <fieldset aria-labelledby="review-decision-label">
                <legend id="review-decision-label" class="text-sm font-medium text-slate-800">审核决定 <span class="text-rose-500">*</span></legend>
                <div class="mt-2 grid grid-cols-2 gap-2">
                  <label class="flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50"><input v-model="form.decision" type="radio" name="review-decision" value="approve" class="h-4 w-4" />审核通过</label>
                  <label class="flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm has-[:checked]:border-rose-500 has-[:checked]:bg-rose-50"><input v-model="form.decision" type="radio" name="review-decision" value="reject" class="h-4 w-4" />审核拒绝</label>
                </div>
              </fieldset>
              <label class="block"><span class="text-sm font-medium text-slate-800">审核备注 <span class="text-rose-500">*</span></span><textarea data-testid="credit-review-decision-note" v-model="form.note" rows="3" maxlength="200" class="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="请说明审核依据" /><span class="mt-1 block text-right text-xs text-slate-500">{{ form.note.length }}/200</span></label>
            </template>

            <template v-else>
              <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <h3 class="font-semibold">确认{{ form.decision === 'approve' ? '通过' : '拒绝' }}本次审核</h3>
                <p v-if="form.decision === 'approve'" class="mt-2">通过后，信用分将从 {{ review?.beforeScore }} 调整为 {{ review?.proposedScore }}。</p>
                <p v-else class="mt-2">拒绝后，当前信用分保持不变，该申请将不能再次处理。</p>
                <p class="mt-2 break-words">审核备注：{{ form.note.trim() }}</p>
              </div>
              <p class="text-xs text-slate-500">审核决定不可撤回，提交后还需完成 MFA 验证。</p>
            </template>
          </div>

          <footer class="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
            <template v-if="stage === 'edit'"><button type="button" :disabled="busy" class="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 disabled:opacity-40" @click="close">取消</button><button type="button" :disabled="busy" class="rounded-lg bg-amber-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-40" @click="startConfirm">下一步</button></template>
            <template v-else><button ref="backRef" type="button" :disabled="busy" class="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 disabled:opacity-40" @click="backToEdit">返回修改</button><button ref="submitButtonRef" type="button" :disabled="busy" class="rounded-lg bg-rose-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-40" @click="requestMfa">{{ busy ? '验证中…' : '提交并验证' }}</button></template>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.credit-review-decision-dialog-enter-active { transition: opacity 200ms ease-out; }
.credit-review-decision-dialog-leave-active { transition: opacity 150ms ease-in; }
.credit-review-decision-dialog-enter-active .credit-review-decision-dialog-panel { transition: opacity 200ms ease-out, transform 200ms ease-out; }
.credit-review-decision-dialog-leave-active .credit-review-decision-dialog-panel { transition: opacity 150ms ease-in, transform 150ms ease-in; }
.credit-review-decision-dialog-enter-from, .credit-review-decision-dialog-leave-to { opacity: 0; }
.credit-review-decision-dialog-enter-from .credit-review-decision-dialog-panel, .credit-review-decision-dialog-leave-to .credit-review-decision-dialog-panel { opacity: 0; transform: scale(0.96); }
@media (prefers-reduced-motion: reduce) {
  .credit-review-decision-dialog-enter-active, .credit-review-decision-dialog-leave-active,
  .credit-review-decision-dialog-enter-active .credit-review-decision-dialog-panel, .credit-review-decision-dialog-leave-active .credit-review-decision-dialog-panel { transition-duration: 50ms; }
  .credit-review-decision-dialog-enter-from .credit-review-decision-dialog-panel, .credit-review-decision-dialog-leave-to .credit-review-decision-dialog-panel { transform: none; }
}
</style>
