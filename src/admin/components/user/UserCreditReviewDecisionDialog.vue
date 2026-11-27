<script setup>
import AdminDialog from '../antd/AdminDialog.vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import { AdminButton, AdminRadio, AdminTextarea, nativeControl } from '../antd/controls.js'

import { computed, nextTick, reactive, ref, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  review: { type: Object, default: null },
  busy: { type: Boolean, default: false },
  returnFocus: { type: [Object, Function], default: null }
})
const emit = defineEmits(['close', 'closed', 'request-mfa'])
const backRef = ref(null)
const submitButtonRef = ref(null)
const errorRef = ref(null)
const stage = ref('edit')
const errorMessage = ref('')
const form = reactive({ decision: '', note: '' })
const userId = computed(() => String(props.user?.id ?? props.user?.userId ?? ''))
const notePreview = computed(() => form.note.trim() || '未填写')
const formatTime = (value) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—'
const resetForm = () => { stage.value = 'edit'; errorMessage.value = ''; form.decision = ''; form.note = '' }
const closeDisabled = computed(() => props.busy)
// Frame: AdminDialog (Ant Modal + useDialogLifecycle), dialog migration 2026-11-27.
const dialogFrame = ref(null)
const phase = computed(() => dialogFrame.value?.phase ?? 'closed')
const titleRef = computed(() => dialogFrame.value?.titleEl ?? null)

const close = () => dialogFrame.value?.close()
const handleClosed = () => {
  resetForm()
  emit('closed')
}
const showError = async (message) => { errorMessage.value = message; await nextTick(); errorRef.value?.focus?.() }
const startConfirm = async () => {
  errorMessage.value = ''
  if (!['approve', 'reject'].includes(form.decision)) return showError('请选择审核决定')
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
  <AdminDialog :open="visible" title="处理信用分审核" title-id="user-credit-review-decision-title" :busy="Boolean(busy)" :return-focus="returnFocus" testid="user-credit-review-decision-dialog" :width="512" plain ref="dialogFrame" @close="emit('close')" @closed="handleClosed">
      <template #subtitle>{{ user?.username || '未知用户' }} · UID {{ userId || '—' }}</template>
      <div data-testid="user-credit-review-decision-body" class="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            <FeedbackToast v-if="errorMessage" ref="errorRef" type="error" :source="() => (errorMessage) ? (errorMessage) : ''"></FeedbackToast>
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <dl class="grid grid-cols-[5rem_1fr] gap-y-2"><dt class="text-slate-500">信用分</dt><dd class="font-semibold text-slate-900">{{ review?.beforeScore }} → {{ review?.proposedScore }} <span :class="review?.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'">({{ review?.delta >= 0 ? '+' : '' }}{{ review?.delta }})</span></dd><dt class="text-slate-500">申请原因</dt><dd class="break-words text-slate-700">{{ review?.reason || '—' }}</dd><dt class="text-slate-500">申请人</dt><dd class="text-slate-700">{{ review?.applicantName || review?.applicantId || '—' }}</dd><dt class="text-slate-500">申请时间</dt><dd class="text-slate-700">{{ formatTime(review?.appliedAt) }}</dd></dl>
            </div>

            <template v-if="stage === 'edit'">
              <fieldset aria-labelledby="review-decision-label">
                <legend id="review-decision-label" class="text-sm font-medium text-slate-800">审核决定 <span class="text-rose-500">*</span></legend>
                <div class="mt-2 grid grid-cols-2 gap-2">
                  <AdminRadio class="flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50" v-model="form.decision" name="review-decision" value="approve">审核通过</AdminRadio>
                  <AdminRadio class="flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm has-[:checked]:border-rose-500 has-[:checked]:bg-rose-50" v-model="form.decision" name="review-decision" value="reject">审核拒绝</AdminRadio>
                </div>
              </fieldset>
              <label class="block"><span class="text-sm font-medium text-slate-800">审核备注（可选）</span><AdminTextarea data-testid="credit-review-decision-note" v-model="form.note" rows="3" maxlength="200" class="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none" placeholder="可填写审核依据" /><span class="mt-1 block text-right text-xs text-slate-500">{{ form.note.length }}/200</span></label>
            </template>

            <template v-else>
              <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <h3 class="font-semibold">确认{{ form.decision === 'approve' ? '通过' : '拒绝' }}本次审核</h3>
                <p v-if="form.decision === 'approve'" class="mt-2">通过后，信用分将从 {{ review?.beforeScore }} 调整为 {{ review?.proposedScore }}。</p>
                <p v-else class="mt-2">拒绝后，当前信用分保持不变，该申请将不能再次处理。</p>
                <p class="mt-2 break-words">审核备注：{{ notePreview }}</p>
              </div>
              <p class="text-xs text-slate-500">审核决定不可撤回，提交后还需完成 MFA 验证。</p>
            </template>
          </div>

          <footer class="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
            <template v-if="stage === 'edit'"><AdminButton type="button" :disabled="busy" class="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 disabled:opacity-40" @click="close">取消</AdminButton><AdminButton type="button" :disabled="busy" class="rounded-lg bg-amber-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-40" @click="startConfirm">下一步</AdminButton></template>
            <template v-else><AdminButton :ref="element => { backRef = nativeControl(element) }" type="button" :disabled="busy" class="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 disabled:opacity-40" @click="backToEdit">返回修改</AdminButton><AdminButton :ref="element => { submitButtonRef = nativeControl(element) }" type="button" :disabled="busy" class="rounded-lg bg-rose-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-40" @click="requestMfa">{{ busy ? '验证中…' : '提交并验证' }}</AdminButton></template>
          </footer>
    </AdminDialog>
</template>

