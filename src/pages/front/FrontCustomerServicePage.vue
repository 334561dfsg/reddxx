<script setup>
import FeedbackToast from '../../shared/feedback/FeedbackToast.vue'
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import CustomerServiceImagePreview from '../../components/customer-service/CustomerServiceImagePreview.vue'
import {
  MAX_CUSTOMER_SERVICE_IMAGE_BYTES,
  WELCOME_MESSAGE_TEXT
} from '../../features/customer-service/customerService.js'
import { customerServiceRepository } from '../../features/customer-service/customerServiceRepository.js'
import { useFrontAuthStore } from '../../stores/frontAuth.js'

const router = useRouter()
const auth = useFrontAuthStore()
auth.ensureHydrated()
const { email, nickname } = storeToRefs(auth)
const listRef = ref(null)
const fileInputRef = ref(null)
const draft = ref('')
const pendingImageUrl = ref('')
const pendingImageName = ref('')
const errorMessage = ref('')
const previewImageUrl = ref('')
const snapshot = ref(customerServiceRepository.getSnapshot())
let unsubscribe = null

const userId = computed(() => email.value || 'front-demo-user')
const userSnapshot = computed(() => ({
  uid: email.value === 'demo@fex.local' ? '143' : userId.value,
  email: email.value || '',
  nickname: nickname.value || email.value?.split('@')[0] || '演示用户',
  vip: 2,
  kyc: '初级认证',
  creditScore: 72,
  registeredAt: '2026-01-01T00:00:00.000Z',
  lastLoginAt: new Date().toISOString(),
  accountStatus: '正常'
}))

const thread = computed(() => snapshot.value.threads.find((item) => item.userId === userId.value) || null)
const messages = computed(() => [
  { id: 'welcome', sender: 'agent', text: WELCOME_MESSAGE_TEXT, imageDataUrl: '' },
  ...(thread.value?.messages || [])
])
const canSend = computed(() => Boolean(draft.value.trim() || pendingImageUrl.value))

async function scrollToLatest() {
  await nextTick()
  if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
}

function goBack() {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }
  router.push('/front/home')
}

function openImagePicker() {
  fileInputRef.value?.click()
}

function onImageSelected(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  errorMessage.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    errorMessage.value = '仅支持选择图片文件。'
    return
  }
  if (file.size > MAX_CUSTOMER_SERVICE_IMAGE_BYTES) {
    errorMessage.value = '图片不能超过 1 MB。'
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    pendingImageUrl.value = String(reader.result || '')
    pendingImageName.value = file.name
  }
  reader.onerror = () => {
    errorMessage.value = '图片读取失败，请重新选择。'
  }
  reader.readAsDataURL(file)
}

function clearPendingImage() {
  pendingImageUrl.value = ''
  pendingImageName.value = ''
}

function previewImage(url) {
  previewImageUrl.value = url
}

async function sendMessage() {
  if (!canSend.value) return
  errorMessage.value = ''
  try {
    customerServiceRepository.sendUserMessage({
      userId: userId.value,
      user: userSnapshot.value,
      text: draft.value,
      imageDataUrl: pendingImageUrl.value
    })
    draft.value = ''
    clearPendingImage()
    await scrollToLatest()
  } catch (error) {
    errorMessage.value = error?.name === 'QuotaExceededError'
      ? '演示消息存储空间不足，请清理浏览器站点数据后重试。'
      : `消息发送失败：${error?.message || '未知错误'}`
  }
}

function onComposerKeydown(event) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  event.preventDefault()
  sendMessage()
}

onMounted(() => {
  unsubscribe = customerServiceRepository.subscribe((next) => {
    snapshot.value = next
    const current = next.threads.find((item) => item.userId === userId.value)
    if (current?.userUnread) {
      customerServiceRepository.markRead({ threadId: current.id, reader: 'user' })
      return
    }
    scrollToLatest()
  })
})

onUnmounted(() => unsubscribe?.())
</script>

<template>
  <main class="customer-service-page bg-[#f5f6f8] text-[#161a1e] lg:bg-[#050505] lg:px-6 lg:py-8 lg:text-white">
    <section class="mx-auto flex h-full min-h-0 w-full flex-col overflow-hidden bg-white lg:max-w-4xl lg:rounded-2xl lg:border lg:border-white/[0.08] lg:bg-[#0b0e11] lg:shadow-2xl lg:shadow-black/40">
      <header class="relative flex h-14 shrink-0 items-center justify-center border-b border-black/[0.06] bg-black px-4 text-white lg:h-16 lg:border-white/[0.08] lg:bg-[#11151a]">
        <button type="button" class="absolute left-3 grid h-10 w-10 place-items-center rounded-full text-white transition hover:bg-white/10 focus:outline-none" aria-label="返回" @click="goBack">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <div class="text-center">
          <h1 class="text-lg font-semibold tracking-wide">客服</h1>
          <p class="mt-0.5 hidden text-[11px] text-white/45 lg:block">在线服务 · 人工客服演示</p>
        </div>
      </header>

      <div ref="listRef" class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 lg:bg-[#0d1116] lg:px-8 lg:py-7" aria-live="polite">
        <div class="space-y-4">
          <article v-for="message in messages" :key="message.id" class="flex" :class="message.sender === 'user' ? 'justify-end' : 'justify-start'">
            <div class="max-w-[82%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm sm:max-w-[70%]" :class="message.sender === 'user' ? 'rounded-br-md bg-[#1597e5] text-white lg:bg-sky-500' : 'rounded-bl-md bg-[#f0f1f3] text-[#161a1e] lg:bg-white/[0.08] lg:text-white/90'">
              <button v-if="message.imageDataUrl" type="button" class="mb-2 block cursor-zoom-in overflow-hidden rounded-xl" aria-label="放大消息图片" @click="previewImage(message.imageDataUrl)">
                <img :src="message.imageDataUrl" alt="消息图片" class="max-h-64 w-auto max-w-full object-contain transition hover:opacity-90" />
              </button>
              <p v-if="message.text" class="whitespace-pre-wrap break-words">{{ message.text }}</p>
            </div>
          </article>
        </div>
      </div>

      <footer class="shrink-0 border-t border-black/[0.08] bg-white px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3 sm:px-5 lg:border-white/[0.08] lg:bg-[#11151a] lg:pb-4 lg:pt-4">
        <FeedbackToast v-if="errorMessage" type="error" :source="() => (errorMessage) ? (errorMessage) : ''"></FeedbackToast>
        <div v-if="pendingImageUrl" class="mb-3 flex items-center gap-3 rounded-xl bg-black/[0.04] p-2 lg:bg-white/[0.05]">
          <img :src="pendingImageUrl" alt="待发送图片" class="h-12 w-12 rounded-lg object-cover" />
          <span class="min-w-0 flex-1 truncate text-xs text-black/55 lg:text-white/55">{{ pendingImageName }}</span>
          <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-black/45 hover:bg-black/5 lg:text-white/50 lg:hover:bg-white/10" aria-label="移除图片" @click="clearPendingImage">×</button>
        </div>

        <div class="flex items-end gap-2.5">
          <div class="flex min-w-0 flex-1 items-end rounded-[1.65rem] border border-black/20 bg-white px-4 py-1.5 lg:border-white/15 lg:bg-black/20">
            <textarea v-model="draft" rows="1" class="max-h-28 min-h-10 min-w-0 flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-black outline-none placeholder:text-black/40 lg:text-white lg:placeholder:text-white/35" placeholder="请输入" aria-label="输入客服消息" @keydown="onComposerKeydown" />
            <button type="button" class="mb-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#1597e5] text-white transition disabled:cursor-not-allowed disabled:opacity-35" :disabled="!canSend" aria-label="发送消息" @click="sendMessage">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" /></svg>
            </button>
          </div>
          <button type="button" class="mb-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-[#1597e5] transition hover:bg-sky-50 focus:outline-none lg:hover:bg-white/[0.06]" aria-label="选择图片" @click="openImagePicker">
            <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m20.5 11.5-8.9 8.9a5 5 0 0 1-7.1-7.1l9.6-9.6a3.5 3.5 0 0 1 5 5l-9.7 9.7a2 2 0 0 1-2.8-2.8l8.9-8.9" /></svg>
          </button>
          <input ref="fileInputRef" type="file" accept="image/*" class="sr-only" @change="onImageSelected" />
        </div>
        <p class="mt-2 hidden text-center text-[11px] text-white/30 lg:block">Enter 发送 · Shift + Enter 换行 · 图片上限 1 MB</p>
      </footer>
    </section>
    <CustomerServiceImagePreview :src="previewImageUrl" @close="previewImageUrl = ''" />
  </main>
</template>

<style scoped>
.customer-service-page { height: 100dvh; min-height: 32rem; }
@media (min-width: 1024px) {
  .customer-service-page { height: 100vh; min-height: 38rem; }
}
</style>
