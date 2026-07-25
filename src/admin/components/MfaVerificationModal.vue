<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useDialogContentSnapshot, useDialogLifecycle } from '../composables/useDialogLifecycle.js'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'MFA 验证'
  },
  description: {
    type: String,
    default: '请输入您的 MFA 验证码以继续操作'
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:open', 'verify', 'cancel'])
const verificationCode = ref('')
const localError = ref('')
const verifyRequested = ref(false)
const dialogRef = ref(null)
const verificationInput = ref(null)
const errorSummary = ref(null)
const errorMessage = computed(() => localError.value || props.error)
const closeDisabled = computed(() => props.loading || verifyRequested.value)
const dialogSource = computed(() => ({ title: props.title, description: props.description }))

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
  initialFocusRef: verificationInput,
  closeDisabled,
  requestClose: () => {
    emit('cancel')
    emit('update:open', false)
  }
})

const { content: displayedDialog } = useDialogContentSnapshot({
  open: computed(() => props.open),
  phase,
  source: dialogSource,
  clone: (content) => ({ ...content })
})

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    verificationCode.value = ''
    localError.value = ''
    verifyRequested.value = false
  }
})

watch(() => props.loading, (loading, wasLoading) => {
  if (wasLoading && !loading) verifyRequested.value = false
})

watch(errorMessage, async (message) => {
  if (!message || !props.open) return
  await nextTick()
  errorSummary.value?.focus()
})

const showValidationError = async (message) => {
  localError.value = message
  await nextTick()
  errorSummary.value?.focus()
}

const handleVerify = async () => {
  if (props.loading || verifyRequested.value) return
  if (phase.value !== 'open') return

  if (!verificationCode.value) {
    await showValidationError('请输入验证码')
    return
  }

  if (verificationCode.value.length !== 6) {
    await showValidationError('验证码必须是 6 位数字')
    return
  }

  localError.value = ''
  verifyRequested.value = true
  emit('verify', verificationCode.value)
}

const handleCancel = () => {
  if (props.loading || verifyRequested.value) return
  requestDialogClose()
}

const close = () => handleCancel()
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-overlay" @after-enter="onAfterEnter" @after-leave="onAfterLeave">
      <div
        v-if="rendered"
        v-show="phase !== 'closing'"
        class="fixed inset-0 flex min-h-[100vh] min-h-[100dvh] w-full items-center justify-center bg-black/50 p-4 sm:p-6"
        role="presentation"
        :style="layerStyle"
      >
        <Transition name="dialog-panel">
          <section
            v-show="phase !== 'closing'"
            ref="dialogRef"
            data-testid="mfa-dialog-frame"
            class="flex max-h-[calc(100vh-2rem)] max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mfa-dialog-title"
            :aria-busy="loading"
          >
            <header class="shrink-0 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-violet-50 px-6 py-4">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <h2 id="mfa-dialog-title" class="text-xl font-semibold text-slate-900">{{ displayedDialog.title }}</h2>
                  <p class="mt-0.5 text-xs text-slate-500">{{ displayedDialog.description }}</p>
                </div>
                <button
                  type="button"
                  class="shrink-0 text-2xl text-slate-400 transition-colors hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="关闭 MFA 验证"
                  :disabled="loading || verifyRequested"
                  @click="close"
                >
                  ×
                </button>
              </div>
            </header>

            <div data-testid="mfa-dialog-body" class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div class="mb-4 flex justify-center" aria-hidden="true">
                <div class="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                  <svg class="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>

              <label class="block space-y-2">
                <span class="text-sm font-medium text-slate-700">验证码</span>
                <input
                  ref="verificationInput"
                  v-model="verificationCode"
                  type="text"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  maxlength="6"
                  placeholder="请输入 6 位验证码"
                  class="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-center text-lg tracking-widest outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  :disabled="loading"
                  :aria-invalid="Boolean(errorMessage)"
                  :aria-describedby="errorMessage ? 'mfa-error mfa-help' : 'mfa-help'"
                  @keyup.enter="handleVerify"
                />
              </label>

              <p
                v-if="errorMessage"
                id="mfa-error"
                ref="errorSummary"
                tabindex="-1"
                role="alert"
                aria-live="assertive"
                class="mt-2 text-center text-sm text-rose-600"
              >
                {{ errorMessage }}
              </p>

              <p id="mfa-help" class="mt-3 text-center text-xs text-slate-500">
                请输入您的 Google Authenticator 或其他验证器应用生成的 6 位验证码
              </p>
            </div>

            <footer class="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="loading || verifyRequested"
                :aria-label="loading ? '取消，验证中不可用' : '取消 MFA 验证'"
                @click="handleCancel"
              >
                取消
              </button>
              <button
                type="button"
                class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="loading || verifyRequested || !verificationCode"
                :aria-label="loading ? '验证并继续，验证中' : '验证并继续'"
                @click="handleVerify"
              >
                <span v-if="!loading">验证并继续</span>
                <span v-else class="flex items-center justify-center gap-2">
                  <svg class="h-4 w-4 animate-spin" aria-hidden="true" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  验证中...
                </span>
              </button>
            </footer>
          </section>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
