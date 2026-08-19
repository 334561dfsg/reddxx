<script setup>
import { ref } from 'vue'

const props = defineProps({
  delivery: { type: Object, default: null },
  title: { type: String, default: '代理创建成功，以下信息可发送给代理' },
  description: {
    type: String,
    default: '初始密码只在本次创建结果中展示；下方卡片可截图发送给代理完成 MFA 绑定。'
  },
  textClass: { type: String, default: 'text-sm leading-6 text-slate-800' }
})

const copied = ref(false)
const error = ref('')

const copyDelivery = async () => {
  if (!props.delivery?.message) return
  error.value = ''
  try {
    if (!globalThis.navigator?.clipboard?.writeText) throw new Error('clipboard-unavailable')
    await globalThis.navigator.clipboard.writeText(props.delivery.message)
    copied.value = true
  } catch {
    copied.value = false
    error.value = '复制失败，请手动选择下方内容复制'
  }
}
</script>

<template>
  <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h4 class="text-sm font-semibold text-emerald-900">{{ title }}</h4>
        <p class="mt-1 text-xs leading-relaxed text-emerald-800">{{ description }}</p>
      </div>
      <button
        type="button"
        class="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        @click="copyDelivery"
      >
        {{ copied ? '已复制' : '复制通知内容' }}
      </button>
    </div>

    <p v-if="error" class="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-rose-700" role="alert">{{ error }}</p>

    <div class="mt-3 rounded-lg border border-emerald-200 bg-white p-3" aria-label="代理账号和 MFA 二维码截图发送区域">
      <pre class="whitespace-pre-wrap break-words" :class="textClass">{{ delivery?.message }}</pre>
      <div v-if="delivery?.mfaSetup?.qrCodeUrl" class="mt-3 flex flex-col gap-3 border-t border-slate-200 pt-3 sm:flex-row sm:items-center">
        <div class="flex h-40 w-40 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white p-2">
          <img :src="delivery.mfaSetup.qrCodeUrl" alt="MFA 绑定二维码" class="h-36 w-36" />
        </div>
        <div class="min-w-0 text-sm text-slate-700">
          <p class="font-semibold text-slate-900">MFA 绑定二维码</p>
          <p class="mt-1 text-xs leading-5 text-slate-500">截图发送给代理；代理可用验证器扫码，或手动输入下方密钥。</p>
          <p class="mt-2 break-all rounded-md bg-slate-50 px-2 py-1.5 font-mono text-xs text-slate-800">{{ delivery.mfaSetup.secret }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
