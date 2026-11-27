<script setup>
import AdminDialog from './antd/AdminDialog.vue'
import FeedbackToast from '../../shared/feedback/FeedbackToast.vue'
import { AdminButton, AdminInput, nativeControl } from './antd/controls.js'

import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useDialogContentSnapshot, useDialogLifecycle } from '../composables/useDialogLifecycle.js'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  saving: {
    type: Boolean,
    default: false
  },
  submitError: {
    type: String,
    default: ''
  },
  returnFocus: {
    type: [Object, Function],
    default: null
  }
})

const emit = defineEmits(['update:open', 'request-mfa'])

const currentPasswordInput = ref(null)
const errorSummary = ref(null)
const submitButton = ref(null)
const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const fieldErrors = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const localSubmitError = ref('')
const hasSubmitted = ref(false)

const submitErrorMessage = computed(() => localSubmitError.value || props.submitError)
const isDirty = computed(() => Boolean(form.currentPassword || form.newPassword || form.confirmPassword))
const closeDisabled = computed(() => props.saving)

const requestClose = () => {
  emit('update:open', false)
}

// Frame: AdminDialog (Ant Modal + useDialogLifecycle), dialog migration 2026-11-27.
const dialogFrame = ref(null)
const phase = computed(() => dialogFrame.value?.phase ?? 'closed')
const initialFocus = computed(() => currentPasswordInput.value)

const displayedDialogSource = computed(() => ({
  saving: props.saving,
  submitErrorMessage: submitErrorMessage.value,
  currentPassword: form.currentPassword,
  newPassword: form.newPassword,
  confirmPassword: form.confirmPassword,
  fieldErrors: { ...fieldErrors },
  hasSubmitted: hasSubmitted.value
}))
const { content: displayedDialog } = useDialogContentSnapshot({
  open: computed(() => props.open),
  phase,
  source: displayedDialogSource,
  clone: (content) => ({ ...content, fieldErrors: { ...content.fieldErrors } })
})

const clearErrors = () => {
  fieldErrors.currentPassword = ''
  fieldErrors.newPassword = ''
  fieldErrors.confirmPassword = ''
  localSubmitError.value = ''
}

const resetForm = () => {
  form.currentPassword = ''
  form.newPassword = ''
  form.confirmPassword = ''
  hasSubmitted.value = false
  clearErrors()
}

watch(() => props.open, (isOpen) => {
  if (isOpen) resetForm()
})

watch(() => props.submitError, async (message) => {
  if (!message || !props.open) return
  await nextTick()
  errorSummary.value?.focus()
})

const validate = () => {
  clearErrors()

  if (!form.currentPassword) fieldErrors.currentPassword = '请输入当前密码'
  if (!form.newPassword) fieldErrors.newPassword = '请输入新密码'
  else if (form.newPassword.length < 8 || form.newPassword.length > 32) {
    fieldErrors.newPassword = '新密码长度需要为 8-32 位'
  } else if (!/[A-Za-z]/.test(form.newPassword) || !/\d/.test(form.newPassword)) {
    fieldErrors.newPassword = '新密码需要同时包含字母和数字'
  } else if (form.newPassword === form.currentPassword) {
    fieldErrors.newPassword = '新密码不能与当前密码相同'
  }

  if (!form.confirmPassword) fieldErrors.confirmPassword = '请再次输入新密码'
  else if (form.confirmPassword !== form.newPassword) fieldErrors.confirmPassword = '两次输入的新密码不一致'

  return !fieldErrors.currentPassword && !fieldErrors.newPassword && !fieldErrors.confirmPassword
}

const focusFirstError = async () => {
  await nextTick()
  errorSummary.value?.focus()
}

const submit = async () => {
  if (props.saving) return
  hasSubmitted.value = true
  if (!validate()) {
    await focusFirstError()
    return
  }

  emit('request-mfa', {
    currentPassword: form.currentPassword,
    newPassword: form.newPassword,
    returnFocus: submitButton.value
  })
}

const close = () => {
  if (props.saving) return
  dialogFrame.value?.close()
}
</script>

<template>
  <AdminDialog :open="open" title="修改登录密码" title-id="admin-change-password-title" :busy="closeDisabled" :return-focus="returnFocus" testid="admin-change-password-dialog-frame" :width="512" plain :request-close="requestClose" ref="dialogFrame" :initial-focus="initialFocus" @close="emit('close')">
      <template #subtitle>提交后需要完成 MFA 验证才会生效</template>
      <form class="min-h-0 flex-1 overflow-y-auto px-6 py-5" @submit.prevent="submit">
              <FeedbackToast v-if="displayedDialog.hasSubmitted && (displayedDialog.submitErrorMessage || displayedDialog.fieldErrors.currentPassword || displayedDialog.fieldErrors.newPassword || displayedDialog.fieldErrors.confirmPassword)" ref="errorSummary" type="error" :source="() => (displayedDialog.hasSubmitted &amp;&amp; (displayedDialog.submitErrorMessage || displayedDialog.fieldErrors.currentPassword || displayedDialog.fieldErrors.newPassword || displayedDialog.fieldErrors.confirmPassword)) ? (displayedDialog.submitErrorMessage || '请修复表单中的错误后再继续') : ''"></FeedbackToast>

              <div class="space-y-4">
                <label class="block space-y-1.5">
                  <span class="text-sm font-medium text-slate-700">当前密码</span>
                  <AdminInput
                    :ref="element => { currentPasswordInput = nativeControl(element) }"
                    v-model="form.currentPassword"
                    type="password"
                    autocomplete="current-password"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition"
                    :disabled="displayedDialog.saving"
                    :aria-invalid="Boolean(displayedDialog.fieldErrors.currentPassword)"
                    :aria-describedby="displayedDialog.fieldErrors.currentPassword ? 'admin-current-password-error' : undefined"
                  />
                  <FeedbackToast v-if="displayedDialog.fieldErrors.currentPassword" id="admin-current-password-error" type="error" :source="() => (displayedDialog.fieldErrors.currentPassword) ? (displayedDialog.fieldErrors.currentPassword) : ''"></FeedbackToast>
                </label>

                <label class="block space-y-1.5">
                  <span class="text-sm font-medium text-slate-700">新密码</span>
                  <AdminInput
                    v-model="form.newPassword"
                    type="password"
                    autocomplete="new-password"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition"
                    :disabled="displayedDialog.saving"
                    :aria-invalid="Boolean(displayedDialog.fieldErrors.newPassword)"
                    :aria-describedby="displayedDialog.fieldErrors.newPassword ? 'admin-new-password-error admin-password-help' : 'admin-password-help'"
                  />
                  <span id="admin-password-help" class="block text-xs text-slate-500">8-32 位，需同时包含字母和数字</span>
                  <FeedbackToast v-if="displayedDialog.fieldErrors.newPassword" id="admin-new-password-error" type="error" :source="() => (displayedDialog.fieldErrors.newPassword) ? (displayedDialog.fieldErrors.newPassword) : ''"></FeedbackToast>
                </label>

                <label class="block space-y-1.5">
                  <span class="text-sm font-medium text-slate-700">确认新密码</span>
                  <AdminInput
                    v-model="form.confirmPassword"
                    type="password"
                    autocomplete="new-password"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition"
                    :disabled="displayedDialog.saving"
                    :aria-invalid="Boolean(displayedDialog.fieldErrors.confirmPassword)"
                    :aria-describedby="displayedDialog.fieldErrors.confirmPassword ? 'admin-confirm-password-error' : undefined"
                  />
                  <FeedbackToast v-if="displayedDialog.fieldErrors.confirmPassword" id="admin-confirm-password-error" type="error" :source="() => (displayedDialog.fieldErrors.confirmPassword) ? (displayedDialog.fieldErrors.confirmPassword) : ''"></FeedbackToast>
                </label>
              </div>
            </form>

            <footer class="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <AdminButton
                type="button"
                class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="displayedDialog.saving"
                @click="close"
              >
                取消
              </AdminButton>
              <AdminButton
                :ref="element => { submitButton = nativeControl(element) }"
                type="button"
                class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="displayedDialog.saving"
                :aria-label="displayedDialog.saving ? '继续 MFA 验证，提交中' : '继续 MFA 验证'"
                @click="submit"
              >
                <span v-if="!displayedDialog.saving">继续 MFA 验证</span>
                <span v-else>提交中...</span>
              </AdminButton>
            </footer>
    </AdminDialog>
</template>
