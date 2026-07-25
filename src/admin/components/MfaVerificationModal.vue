<script setup>
import { ref, computed, watch } from 'vue'

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
  }
})

const emit = defineEmits(['update:open', 'verify', 'cancel'])

// 验证码输入
const verificationCode = ref('')

// 错误信息
const errorMessage = ref('')

// 计算标题
const modalTitle = computed(() => props.title)

// 监听打开状态，重置表单
watch(() => props.open, (newVal) => {
  if (newVal) {
    verificationCode.value = ''
    errorMessage.value = ''
  }
})

// 处理验证
const handleVerify = () => {
  if (!verificationCode.value) {
    errorMessage.value = '请输入验证码'
    return
  }

  if (verificationCode.value.length !== 6) {
    errorMessage.value = '验证码必须是 6 位数字'
    return
  }

  errorMessage.value = ''
  emit('verify', verificationCode.value)
}

// 处理取消
const handleCancel = () => {
  verificationCode.value = ''
  errorMessage.value = ''
  emit('cancel')
  emit('update:open', false)
}

// 关闭弹窗
const close = () => {
  handleCancel()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-show="open"
        class="fixed inset-0 z-[9999] flex min-h-[100dvh] w-full items-center justify-center bg-black/50 p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
      >
      <section
        data-testid="mfa-dialog-frame"
        class="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <!-- 头部 -->
        <header class="shrink-0 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-violet-50 px-6 py-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-semibold text-slate-900">{{ modalTitle }}</h2>
              <p class="mt-0.5 text-xs text-slate-500">{{ description }}</p>
            </div>
            <button
              type="button"
              class="text-2xl text-slate-400 hover:text-slate-600 transition-colors"
              @click="close"
            >
              ×
            </button>
          </div>
        </header>

        <!-- 内容 -->
        <div data-testid="mfa-dialog-body" class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <!-- 图标 -->
          <div class="mb-4 flex justify-center">
            <div class="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <svg class="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          <!-- 验证码输入框 -->
          <label class="block space-y-2">
            <span class="text-sm font-medium text-slate-700">验证码</span>
            <input
              v-model="verificationCode"
              type="text"
              maxlength="6"
              placeholder="请输入 6 位验证码"
              class="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-center text-lg tracking-widest outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              :disabled="loading"
              @keyup.enter="handleVerify"
            />
          </label>

          <!-- 错误提示 -->
          <p v-if="errorMessage" class="mt-2 text-center text-sm text-rose-600">
            {{ errorMessage }}
          </p>

          <!-- 说明文字 -->
          <p class="mt-3 text-center text-xs text-slate-500">
            请输入您的 Google Authenticator 或其他验证器应用生成的 6 位验证码
          </p>
        </div>

        <!-- 底部按钮 -->
        <footer class="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            :disabled="loading"
            @click="handleCancel"
          >
            取消
          </button>
          <button
            type="button"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            :disabled="loading || !verificationCode"
            @click="handleVerify"
          >
            <span v-if="!loading">验证并继续</span>
            <span v-else class="flex items-center justify-center gap-2">
              <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              验证中...
            </span>
          </button>
        </footer>
      </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.modal-enter-to,
.modal-leave-from {
  opacity: 1;
  transform: scale(1);
}
</style>
