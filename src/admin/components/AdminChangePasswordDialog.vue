<script setup>
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

const dialogRef = ref(null)
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
  initialFocusRef: currentPasswordInput,
  returnFocusRef: computed(() => props.returnFocus),
  closeDisabled,
  requestClose
})

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
  requestDialogClose()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-overlay" appear @after-enter="onAfterEnter" @after-leave="onAfterLeave">
      <div
        v-if="rendered"
        v-show="phase !== 'closing'"
        class="fixed inset-0 flex min-h-[100vh] w-full items-center justify-center bg-black/50 p-4 supports-[height:100dvh]:min-h-[100dvh] sm:p-6"
        role="presentation"
        :style="layerStyle"
      >
        <Transition name="dialog-panel" appear>
          <section
            v-show="phase !== 'closing'"
            ref="dialogRef"
            data-testid="admin-change-password-dialog-frame"
            class="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl supports-[height:100dvh]:max-h-[calc(100dvh-2rem)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-change-password-title"
            :aria-busy="displayedDialog.saving"
          >
            <header class="shrink-0 border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div class="flex items-center justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <h2 id="admin-change-password-title" class="break-words text-xl font-semibold text-slate-900">修改登录密码</h2>
                  <p class="mt-0.5 break-words text-xs text-slate-500">提交后需要完成 MFA 验证才会生效</p>
                </div>
                <button
                  type="button"
                  class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-2xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="关闭"
                  :disabled="displayedDialog.saving"
                  :aria-disabled="displayedDialog.saving"
                  :title="displayedDialog.saving ? '提交中，暂时无法关闭' : '关闭'"
                  @click="close"
                >
                  ×
                </button>
              </div>
            </header>

            <form class="min-h-0 flex-1 overflow-y-auto px-6 py-5" @submit.prevent="submit">
              <div
                v-if="displayedDialog.hasSubmitted && (displayedDialog.submitErrorMessage || displayedDialog.fieldErrors.currentPassword || displayedDialog.fieldErrors.newPassword || displayedDialog.fieldErrors.confirmPassword)"
                ref="errorSummary"
                tabindex="-1"
                role="alert"
                aria-live="assertive"
                class="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
              >
                {{ displayedDialog.submitErrorMessage || '请修复表单中的错误后再继续' }}
              </div>

              <div class="space-y-4">
                <label class="block space-y-1.5">
                  <span class="text-sm font-medium text-slate-700">当前密码</span>
                  <input
                    ref="currentPasswordInput"
                    v-model="form.currentPassword"
                    type="password"
                    autocomplete="current-password"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    :disabled="displayedDialog.saving"
                    :aria-invalid="Boolean(displayedDialog.fieldErrors.currentPassword)"
                    :aria-describedby="displayedDialog.fieldErrors.currentPassword ? 'admin-current-password-error' : undefined"
                  />
                  <span v-if="displayedDialog.fieldErrors.currentPassword" id="admin-current-password-error" class="block text-xs text-rose-600">
                    {{ displayedDialog.fieldErrors.currentPassword }}
                  </span>
                </label>

                <label class="block space-y-1.5">
                  <span class="text-sm font-medium text-slate-700">新密码</span>
                  <input
                    v-model="form.newPassword"
                    type="password"
                    autocomplete="new-password"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    :disabled="displayedDialog.saving"
                    :aria-invalid="Boolean(displayedDialog.fieldErrors.newPassword)"
                    :aria-describedby="displayedDialog.fieldErrors.newPassword ? 'admin-new-password-error admin-password-help' : 'admin-password-help'"
                  />
                  <span id="admin-password-help" class="block text-xs text-slate-500">8-32 位，需同时包含字母和数字</span>
                  <span v-if="displayedDialog.fieldErrors.newPassword" id="admin-new-password-error" class="block text-xs text-rose-600">
                    {{ displayedDialog.fieldErrors.newPassword }}
                  </span>
                </label>

                <label class="block space-y-1.5">
                  <span class="text-sm font-medium text-slate-700">确认新密码</span>
                  <input
                    v-model="form.confirmPassword"
                    type="password"
                    autocomplete="new-password"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    :disabled="displayedDialog.saving"
                    :aria-invalid="Boolean(displayedDialog.fieldErrors.confirmPassword)"
                    :aria-describedby="displayedDialog.fieldErrors.confirmPassword ? 'admin-confirm-password-error' : undefined"
                  />
                  <span v-if="displayedDialog.fieldErrors.confirmPassword" id="admin-confirm-password-error" class="block text-xs text-rose-600">
                    {{ displayedDialog.fieldErrors.confirmPassword }}
                  </span>
                </label>
              </div>
            </form>

            <footer class="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="displayedDialog.saving"
                @click="close"
              >
                取消
              </button>
              <button
                ref="submitButton"
                type="button"
                class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="displayedDialog.saving"
                :aria-label="displayedDialog.saving ? '继续 MFA 验证，提交中' : '继续 MFA 验证'"
                @click="submit"
              >
                <span v-if="!displayedDialog.saving">继续 MFA 验证</span>
                <span v-else>提交中...</span>
              </button>
            </footer>
          </section>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
