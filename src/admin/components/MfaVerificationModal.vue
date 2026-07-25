<script setup>
import { useMfaVerification } from '../composables/useMfaVerification.js'

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
  },
  errorAttempt: {
    type: Number,
    default: 0
  },
  returnFocus: {
    type: [Object, Function],
    default: null
  }
})

const emit = defineEmits(['update:open', 'verify', 'cancel'])
const {
  close,
  displayedDialog,
  dialogRef,
  errorSummary,
  handleCancel,
  handleVerify,
  layerStyle,
  onAfterEnter,
  onAfterLeave,
  phase,
  rendered,
  verificationCode,
  verificationInput
} = useMfaVerification(props, emit)
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
            data-testid="mfa-dialog-frame"
            class="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl supports-[height:100dvh]:max-h-[calc(100dvh-2rem)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mfa-dialog-title"
            :aria-busy="displayedDialog.loading"
          >
            <header class="shrink-0 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-violet-50 px-6 py-4">
              <div class="flex items-center justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <h2 id="mfa-dialog-title" class="break-words text-xl font-semibold text-slate-900">{{ displayedDialog.title }}</h2>
                  <p class="mt-0.5 break-words text-xs text-slate-500">{{ displayedDialog.description }}</p>
                </div>
                <button
                  type="button"
                  class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-2xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="关闭"
                  :disabled="displayedDialog.loading || displayedDialog.verifyRequested"
                  :aria-disabled="displayedDialog.loading || displayedDialog.verifyRequested"
                  :title="displayedDialog.loading || displayedDialog.verifyRequested ? '验证进行中，暂时无法关闭' : '关闭'"
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
                  :disabled="displayedDialog.loading"
                  :aria-invalid="Boolean(displayedDialog.errorMessage)"
                  :aria-describedby="displayedDialog.errorMessage ? 'mfa-error mfa-help' : 'mfa-help'"
                  @keyup.enter="handleVerify"
                />
              </label>

              <p
                v-if="displayedDialog.errorMessage"
                id="mfa-error"
                ref="errorSummary"
                tabindex="-1"
                role="alert"
                aria-live="assertive"
                class="mt-2 text-center text-sm text-rose-600"
              >
                {{ displayedDialog.errorMessage }}
              </p>

              <p id="mfa-help" class="mt-3 text-center text-xs text-slate-500">
                请输入您的 Google Authenticator 或其他验证器应用生成的 6 位验证码
              </p>
            </div>

            <footer class="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="displayedDialog.loading || displayedDialog.verifyRequested"
                :aria-label="displayedDialog.loading ? '取消，验证中不可用' : '取消 MFA 验证'"
                @click="handleCancel"
              >
                取消
              </button>
              <button
                type="button"
                class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="displayedDialog.loading || displayedDialog.verifyRequested || !verificationCode"
                :aria-label="displayedDialog.loading ? '验证并继续，验证中' : '验证并继续'"
                @click="handleVerify"
              >
                <span v-if="!displayedDialog.loading">验证并继续</span>
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
