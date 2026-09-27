<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import UserDetailDrawer from '../../../admin/components/user/UserDetailDrawer.vue'
import { USER_KYC_STATUS, USER_ROLE, USER_STATUS } from '../../../admin/constants/user.js'
import CustomerServiceImagePreview from '../../../components/customer-service/CustomerServiceImagePreview.vue'
import {
  filterCustomerServiceThreads,
  summarizeCustomerServiceThreads
} from '../../../features/customer-service/customerService.js'
import { customerServiceRepository } from '../../../features/customer-service/customerServiceRepository.js'

const snapshot = ref(customerServiceRepository.getSnapshot())
const selectedId = ref('')
const query = ref('')
const unreadOnly = ref(false)
const draft = ref('')
const errorMessage = ref('')
const listOpen = ref(false)
const profileOpen = ref(false)
const previewImageUrl = ref('')
const messageListRef = ref(null)
let unsubscribe = null

const threads = computed(() =>
  filterCustomerServiceThreads(snapshot.value.threads, { query: query.value, unreadOnly: unreadOnly.value })
)
const summary = computed(() => summarizeCustomerServiceThreads(snapshot.value.threads))
const selected = computed(() =>
  snapshot.value.threads.find((item) => item.id === selectedId.value) || null
)
const detailUser = computed(() => {
  const thread = selected.value
  if (!thread) return null

  const user = thread.user || {}
  const uid = user.uid || thread.userId
  const vipLevel = Number(user.vip || 0)

  return {
    id: `user_${uid}`,
    username: user.nickname || user.email || `user_${uid}`,
    email: user.email || '',
    phone: user.phone || '-',
    role: USER_ROLE.USER,
    status: user.accountStatus === '正常' ? USER_STATUS.ACTIVE : USER_STATUS.INACTIVE,
    kycStatus: user.kyc === '高级认证' ? USER_KYC_STATUS.VERIFIED : USER_KYC_STATUS.NOT_VERIFIED,
    isVip: vipLevel > 0,
    vipLevel,
    creditScore: Number(user.creditScore || 0),
    balance: 0,
    frozenBalance: 0,
    totalProfit: 0,
    tradingVolume: 0,
    registerTime: thread.createdAt,
    lastLoginTime: thread.updatedAt,
    lastLoginIp: '-',
    remark: ''
  }
})
const canReply = computed(() => Boolean(selected.value && draft.value.trim()))

function formatTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function lastPreview(thread) {
  const message = thread.messages.at(-1)
  if (!message) return '暂无消息'
  return message.text || (message.imageDataUrl ? '[图片]' : '暂无消息')
}

function previewImage(url) {
  previewImageUrl.value = url
}

async function scrollToLatest() {
  await nextTick()
  if (messageListRef.value) messageListRef.value.scrollTop = messageListRef.value.scrollHeight
}

function selectThread(thread) {
  selectedId.value = thread.id
  listOpen.value = false
  if (thread.adminUnread) {
    customerServiceRepository.markRead({ threadId: thread.id, reader: 'admin' })
  }
  scrollToLatest()
}

function sendReply() {
  if (!canReply.value) return
  errorMessage.value = ''
  try {
    customerServiceRepository.sendAgentMessage({
      threadId: selected.value.id,
      text: draft.value
    })
    draft.value = ''
    scrollToLatest()
  } catch (error) {
    errorMessage.value = `回复失败：${error?.message || '未知错误'}`
  }
}

function onReplyKeydown(event) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  event.preventDefault()
  sendReply()
}

watch(selected, (thread) => {
  if (!thread) return
  profileOpen.value = false
  scrollToLatest()
})

onMounted(() => {
  customerServiceRepository.seedDemoData()
  unsubscribe = customerServiceRepository.subscribe((next) => {
    snapshot.value = next
    if (!selectedId.value || !next.threads.some((item) => item.id === selectedId.value)) {
      selectedId.value = filterCustomerServiceThreads(next.threads, {})[0]?.id || ''
    }
  })
})

onUnmounted(() => unsubscribe?.())
</script>

<template>
  <section class="relative h-full min-h-0">
    <p v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{{ errorMessage }}</p>

    <div class="grid h-full min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside
        class="fixed inset-y-0 left-0 z-50 flex w-[min(86vw,320px)] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform lg:static lg:z-auto lg:w-auto lg:translate-x-0 lg:shadow-none"
        :class="listOpen ? 'translate-x-0' : '-translate-x-full'"
        aria-label="客服用户消息列表"
      >
        <div class="border-b border-slate-200 p-4">
          <div class="flex items-center justify-between">
            <h2 class="font-semibold text-slate-900">用户消息</h2>
            <a-button html-type="button" class="text-xl text-slate-400 lg:hidden" aria-label="关闭用户消息列表" @click="listOpen = false">×</a-button>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
            <a-button style="height: auto !important; padding: 8px !important" html-type="button" class="" :class="unreadOnly ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' : 'bg-slate-50 text-slate-600'" @click="unreadOnly = true"><b class="block text-base">{{ summary.unread }}</b>新消息</a-button>
            <a-button style="height: auto !important; padding: 8px !important" html-type="button" class="" :class="!unreadOnly ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'bg-slate-50 text-slate-600'" @click="unreadOnly = false"><b class="block text-base">{{ summary.all }}</b>全部用户</a-button>
          </div>
          <a-input v-model:value="query" type="search" placeholder="搜索邮箱、UID 或消息" class="mt-3 w-full transition" />
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-2">
          <a-button style="height: auto !important; padding: 12px !important; white-space: normal" v-for="thread in threads" :key="thread.id" html-type="button" class="mb-1 w-full border text-left transition" :class="selectedId === thread.id ? 'border-blue-200 bg-blue-50/70' : 'border-transparent hover:bg-slate-50'" @click="selectThread(thread)">
            <div class="flex items-start gap-3">
              <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-800 text-sm font-semibold text-white">{{ (thread.user.nickname || thread.user.email || '?').slice(0, 1).toUpperCase() }}</span>
              <span class="min-w-0 flex-1">
                <span class="flex items-center justify-between gap-2">
                  <span class="truncate text-sm font-medium text-slate-900">{{ thread.user.nickname || thread.user.email }}</span>
                  <span class="shrink-0 text-[10px] text-slate-400">{{ formatTime(thread.updatedAt) }}</span>
                </span>
                <span class="mt-1 flex items-center gap-2">
                  <span class="min-w-0 flex-1 truncate text-xs text-slate-500">{{ lastPreview(thread) }}</span>
                  <span v-if="thread.adminUnread" class="grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">{{ thread.adminUnread }}</span>
                </span>
              </span>
            </div>
          </a-button>
          <p v-if="!threads.length" class="px-4 py-10 text-center text-sm text-slate-400">没有匹配的用户消息</p>
        </div>
      </aside>

      <main class="flex min-w-0 flex-col bg-slate-50/50">
        <template v-if="selected">
          <header class="flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
            <a-button html-type="button" class="border border-slate-200 text-xs text-slate-600 lg:hidden" @click="listOpen = true">用户</a-button>
            <div class="min-w-0">
              <h2 class="truncate font-semibold text-slate-900">{{ selected.user.nickname || selected.user.email }}</h2>
              <p class="mt-1 text-xs text-slate-400">UID {{ selected.user.uid || selected.userId }} · {{ selected.user.email }}</p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <a-button html-type="button" class="border border-slate-200 text-xs text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700" @click="profileOpen = true">用户信息</a-button>
            </div>
          </header>

          <div ref="messageListRef" class="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            <div class="space-y-4">
              <article v-for="message in selected.messages" :key="message.id" class="flex" :class="message.sender === 'agent' ? 'justify-end' : 'justify-start'">
                <div class="max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm" :class="message.sender === 'agent' ? 'rounded-br-md bg-blue-600 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'">
                  <a-button v-if="message.imageDataUrl" html-type="button" class="mb-2 block cursor-zoom-in overflow-hidden" aria-label="放大消息图片" @click="previewImage(message.imageDataUrl)">
                    <img :src="message.imageDataUrl" alt="消息图片" class="max-h-52 object-contain transition hover:opacity-90" />
                  </a-button>
                  <p v-if="message.text" class="whitespace-pre-wrap break-words">{{ message.text }}</p>
                  <p class="mt-1 text-[10px]" :class="message.sender === 'agent' ? 'text-blue-100' : 'text-slate-400'">{{ formatTime(message.createdAt) }}</p>
                </div>
              </article>
            </div>
          </div>

          <footer class="border-t border-slate-200 bg-white p-3 md:p-4">
            <div class="flex items-end gap-2">
              <a-textarea v-model:value="draft" rows="2" class="min-w-0 flex-1 resize-none transition" placeholder="输入回复内容，Enter 发送" aria-label="客服回复" @keydown="onReplyKeydown" />
              <a-button html-type="button" class="bg-blue-600 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300" :disabled="!canReply" @click="sendReply" type="primary">发送</a-button>
            </div>
          </footer>
        </template>
        <div v-else class="grid h-full min-h-80 place-items-center text-center text-slate-400">
          <div><p class="text-base font-medium text-slate-500">请选择一个用户</p><p class="mt-1 text-sm">从左侧列表开始处理用户消息</p></div>
        </div>
      </main>

    </div>

    <div v-if="listOpen" class="fixed inset-0 z-40 bg-black/30 lg:hidden" aria-hidden="true" />
    <UserDetailDrawer :visible="profileOpen" :user="detailUser" @close="profileOpen = false" />
    <CustomerServiceImagePreview :src="previewImageUrl" @close="previewImageUrl = ''" />
  </section>
</template>
