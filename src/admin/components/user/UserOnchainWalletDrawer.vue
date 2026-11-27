<script setup>
import AdminDrawer from '../antd/AdminDrawer.vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import { AdminButton } from '../antd/controls.js'

import { computed, ref, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  wallet: { type: Object, default: null },
  returnFocus: { type: [Object, Function], default: null }
})
const emit = defineEmits(['close', 'closed'])
const activeSegment = ref('deposit')
const revealedIds = ref(new Set())
const copyingId = ref(null)
const copyMessage = ref('')
const copyError = ref('')
let openingVersion = 0
const userId = computed(() => String(props.user?.id ?? props.user?.userId ?? props.wallet?.userId ?? ''))
const addresses = computed(() => (Array.isArray(props.wallet?.addresses) ? props.wallet.addresses : []))
const segmentAddresses = computed(() => addresses.value.filter((address) => address.kind === activeSegment.value))
const segmentLabel = computed(() => activeSegment.value === 'deposit' ? '入金' : '提现')
const copyInProgress = computed(() => copyingId.value !== null)

// Frame: AdminDrawer (Ant Drawer + useDialogLifecycle), drawer migration 2026-11-27.
const drawerFrame = ref(null)
const phase = computed(() => drawerFrame.value?.phase ?? 'closed')

const resetLocalState = () => {
  openingVersion += 1
  activeSegment.value = 'deposit'
  revealedIds.value = new Set()
  copyingId.value = null
  copyMessage.value = ''
  copyError.value = ''
}
const maskAddress = (address) => {
  const value = String(address || '')
  if (!value) return '—'
  if (value.length <= 2) return '…'
  if (value.length <= 14) {
    const visibleLength = Math.min(4, Math.max(1, value.length - 2))
    return `${value.slice(0, visibleLength)}…${value.slice(-1)}`
  }
  return `${value.slice(0, 8)}…${value.slice(-6)}`
}
const isRevealed = (id) => revealedIds.value.has(id)
const toggleAddressReveal = (id) => {
  const next = new Set(revealedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  revealedIds.value = next
  copyMessage.value = ''
  copyError.value = ''
}
const isCopying = (id) => copyingId.value === id
const copyAddress = async (address) => {
  if (!isRevealed(address.id) || copyInProgress.value) return
  const requestVersion = openingVersion
  copyMessage.value = ''
  copyError.value = ''
  copyingId.value = address.id
  try {
    if (!globalThis.navigator?.clipboard?.writeText) throw new Error('clipboard-unavailable')
    await globalThis.navigator.clipboard.writeText(address.address)
    if (requestVersion !== openingVersion || !props.visible || phase.value === 'closing') return
    copyMessage.value = '地址已复制'
  } catch {
    if (requestVersion !== openingVersion || !props.visible || phase.value === 'closing') return
    copyError.value = '复制失败，请手动复制地址'
  } finally {
    if (requestVersion !== openingVersion || !props.visible || phase.value === 'closing') return
    copyingId.value = null
  }
}
const handleClosed = () => {
  resetLocalState()
  emit('closed')
}

watch(() => props.visible, (visible) => {
  if (visible) resetLocalState()
}, { immediate: true })
</script>

<template>
  <AdminDrawer :open="visible" title="链上钱包" title-id="user-onchain-wallet-title" :busy="Boolean(copyInProgress)" :return-focus="returnFocus" testid="user-onchain-wallet-drawer" :width="576" plain ref="drawerFrame" @close="emit('close')" @closed="handleClosed">
      <template #subtitle>
                {{ user?.username || '未知用户' }} · UID {{ userId || '—' }}
              </template>
      <nav class="flex shrink-0 gap-1 border-b border-slate-200 bg-slate-50 px-4 py-2 sm:px-5" aria-label="链上钱包地址类型" style="padding-left: max(1rem, env(safe-area-inset-left)); padding-right: max(1rem, env(safe-area-inset-right));">
            <AdminButton
              v-for="segment in [{ id: 'deposit', label: '入金地址' }, { id: 'withdrawal', label: '提现地址' }]"
              :key="segment.id"
              type="button"
              :disabled="copyInProgress"
              class="min-h-10 rounded-lg px-3 text-sm font-medium focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              :class="activeSegment === segment.id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-white'"
              :aria-pressed="activeSegment === segment.id"
              @click="activeSegment = segment.id; copyMessage = ''; copyError = ''"
            >
              {{ segment.label }}
            </AdminButton>
          </nav>

          <div
            data-testid="user-onchain-wallet-body"
            class="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5"
            style="padding-bottom: max(1rem, env(safe-area-inset-bottom)); padding-left: max(1rem, env(safe-area-inset-left)); padding-right: max(1rem, env(safe-area-inset-right));"
          >
            <p v-if="copyInProgress" class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800" role="status">
              地址复制中，其他复制、分组和关闭操作暂不可用
            </p>
            <FeedbackToast v-if="copyMessage" type="success" data-testid="wallet-copy-success" :source="() => copyMessage"></FeedbackToast>
            <FeedbackToast v-if="copyError" type="error" data-testid="wallet-copy-error" :source="() => copyError"></FeedbackToast>

            <article
              v-for="address in segmentAddresses"
              :key="address.id"
              :data-testid="`wallet-address-${address.id}`"
              class="rounded-xl border border-slate-200 bg-white p-4"
            >
              <p class="break-words text-sm font-medium text-slate-700">{{ address.coin }} · {{ address.network }}</p>
              <p :id="`wallet-address-${address.id}-value`" class="mt-3 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm text-slate-800">
                {{ isRevealed(address.id) ? address.address : maskAddress(address.address) }}
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                <AdminButton
                  type="button"
                  :data-testid="`wallet-address-${address.id}-reveal-toggle`"
                  :aria-controls="`wallet-address-${address.id}-value`"
                  :aria-pressed="isRevealed(address.id) ? 'true' : 'false'"
                  class="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none"
                  @click="toggleAddressReveal(address.id)"
                >
                  {{ isRevealed(address.id) ? '隐藏完整地址' : '查看完整地址' }}
                </AdminButton>
                <AdminButton
                  type="button"
                  :disabled="!isRevealed(address.id) || copyInProgress"
                  class="min-h-10 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  @click="copyAddress(address)"
                >
                  {{ isCopying(address.id) ? '复制中…' : '复制地址' }}
                </AdminButton>
              </div>
            </article>

            <div v-if="!segmentAddresses.length" class="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
              <p class="text-sm font-medium text-slate-700">暂无{{ segmentLabel }}地址</p>
              <p class="mt-1 text-xs text-slate-500">该用户当前没有可展示的{{ segmentLabel }}地址记录。</p>
            </div>
          </div>
    </AdminDrawer>
</template>

<style scoped>
@media (forced-colors: active) {
  .onchain-wallet-drawer-title:focus {
    outline-color: Highlight;
  }
}
</style>
