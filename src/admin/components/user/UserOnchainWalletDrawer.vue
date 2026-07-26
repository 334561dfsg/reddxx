<script setup>
import { computed, ref, watch } from 'vue'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  wallet: { type: Object, default: null },
  returnFocus: { type: [Object, Function], default: null }
})
const emit = defineEmits(['close', 'closed'])
const drawerRef = ref(null)
const titleRef = ref(null)
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

const {
  rendered,
  phase,
  layerStyle,
  requestDialogClose,
  onAfterEnter,
  onAfterLeave
} = useDialogLifecycle({
  open: computed(() => props.visible),
  dialogRef: drawerRef,
  initialFocusRef: titleRef,
  returnFocusRef: computed(() => props.returnFocus),
  requestClose: () => emit('close'),
  closeDisabled: copyInProgress
})

const close = createDialogCloseAction(requestDialogClose)
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
const formatTimestamp = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
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
const handleAfterLeave = async () => {
  if (!await onAfterLeave()) return
  resetLocalState()
  emit('closed')
}

watch(() => props.visible, (visible) => {
  if (visible) resetLocalState()
}, { immediate: true })
</script>

<template>
  <Teleport to="body">
    <Transition name="onchain-wallet-drawer" appear @after-enter="onAfterEnter" @after-leave="handleAfterLeave">
      <div
        v-if="rendered && phase !== 'closing'"
        class="fixed inset-0 flex justify-end bg-slate-950/50"
        role="presentation"
        :style="layerStyle"
      >
        <aside
          ref="drawerRef"
          data-testid="user-onchain-wallet-drawer"
          class="onchain-wallet-drawer-panel flex h-[100vh] max-h-[100vh] w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl supports-[height:100dvh]:h-[100dvh] supports-[height:100dvh]:max-h-[100dvh]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-onchain-wallet-title"
          :aria-busy="copyInProgress"
        >
          <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5" style="padding-left: max(1rem, env(safe-area-inset-left)); padding-right: max(1rem, env(safe-area-inset-right));">
            <div class="min-w-0 flex-1">
              <h2 id="user-onchain-wallet-title" ref="titleRef" tabindex="-1" class="onchain-wallet-drawer-title break-words rounded-sm text-xl font-semibold text-slate-900">
                链上钱包
              </h2>
              <p class="mt-1 break-words text-sm text-slate-500">
                {{ user?.username || '未知用户' }} · UID {{ userId || '—' }}
              </p>
            </div>
            <button
              type="button"
              :disabled="copyInProgress"
              class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="关闭"
              @click="close"
            >
              ×
            </button>
          </header>

          <nav class="flex shrink-0 gap-1 border-b border-slate-200 bg-slate-50 px-4 py-2 sm:px-5" aria-label="链上钱包地址类型" style="padding-left: max(1rem, env(safe-area-inset-left)); padding-right: max(1rem, env(safe-area-inset-right));">
            <button
              v-for="segment in [{ id: 'deposit', label: '入金地址' }, { id: 'withdrawal', label: '提现地址' }]"
              :key="segment.id"
              type="button"
              :disabled="copyInProgress"
              class="min-h-10 rounded-lg px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              :class="activeSegment === segment.id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-white'"
              :aria-pressed="activeSegment === segment.id"
              @click="activeSegment = segment.id; copyMessage = ''; copyError = ''"
            >
              {{ segment.label }}
            </button>
          </nav>

          <div
            data-testid="user-onchain-wallet-body"
            class="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5"
            style="padding-bottom: max(1rem, env(safe-area-inset-bottom)); padding-left: max(1rem, env(safe-area-inset-left)); padding-right: max(1rem, env(safe-area-inset-right));"
          >
            <p v-if="copyInProgress" class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800" role="status">
              地址复制中，其他复制、分组和关闭操作暂不可用
            </p>
            <p v-if="copyMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" aria-live="polite">
              {{ copyMessage }}
            </p>
            <p v-if="copyError" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
              {{ copyError }}
            </p>

            <article
              v-for="address in segmentAddresses"
              :key="address.id"
              :data-testid="`wallet-address-${address.id}`"
              class="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div class="min-w-0">
                  <h3 class="break-words text-sm font-semibold text-slate-900">{{ address.label || `${segmentLabel}地址` }}</h3>
                  <p class="mt-1 text-xs text-slate-500">{{ address.coin }} · {{ address.network }}</p>
                </div>
                <span class="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">{{ address.status === 'active' ? '启用' : address.status || '未知' }}</span>
              </div>
              <p :id="`wallet-address-${address.id}-value`" class="mt-3 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm text-slate-800">
                {{ isRevealed(address.id) ? address.address : maskAddress(address.address) }}
              </p>
              <dl class="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                <div class="min-w-0 rounded-lg bg-slate-50 px-3 py-2">
                  <dt class="text-slate-500">首次使用</dt>
                  <dd
                    :data-testid="`wallet-address-${address.id}-first-used-at`"
                    class="mt-1 break-words font-medium text-slate-800"
                  >
                    {{ formatTimestamp(address.firstUsedAt) }}
                  </dd>
                </div>
                <div class="min-w-0 rounded-lg bg-slate-50 px-3 py-2">
                  <dt class="text-slate-500">最后使用</dt>
                  <dd
                    :data-testid="`wallet-address-${address.id}-last-used-at`"
                    class="mt-1 break-words font-medium text-slate-800"
                  >
                    {{ formatTimestamp(address.lastUsedAt) }}
                  </dd>
                </div>
              </dl>
              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  :data-testid="`wallet-address-${address.id}-reveal-toggle`"
                  :aria-controls="`wallet-address-${address.id}-value`"
                  :aria-pressed="isRevealed(address.id) ? 'true' : 'false'"
                  class="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  @click="toggleAddressReveal(address.id)"
                >
                  {{ isRevealed(address.id) ? '隐藏完整地址' : '查看完整地址' }}
                </button>
                <button
                  type="button"
                  :disabled="!isRevealed(address.id) || copyInProgress"
                  class="min-h-10 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="copyAddress(address)"
                >
                  {{ isCopying(address.id) ? '复制中…' : '复制地址' }}
                </button>
              </div>
            </article>

            <div v-if="!segmentAddresses.length" class="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
              <p class="text-sm font-medium text-slate-700">暂无{{ segmentLabel }}地址</p>
              <p class="mt-1 text-xs text-slate-500">该用户当前没有可展示的{{ segmentLabel }}地址记录。</p>
            </div>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.onchain-wallet-drawer-title:focus {
  outline: 3px solid #1d4ed8;
  outline-offset: 4px;
}

.onchain-wallet-drawer-enter-active { transition: opacity 200ms ease-out; }
.onchain-wallet-drawer-leave-active { transition: opacity 150ms ease-in; }
.onchain-wallet-drawer-enter-active .onchain-wallet-drawer-panel { transition: transform 200ms ease-out; }
.onchain-wallet-drawer-leave-active .onchain-wallet-drawer-panel { transition: transform 150ms ease-in; }
.onchain-wallet-drawer-enter-from,
.onchain-wallet-drawer-leave-to { opacity: 0; }
.onchain-wallet-drawer-enter-from .onchain-wallet-drawer-panel,
.onchain-wallet-drawer-leave-to .onchain-wallet-drawer-panel { transform: translateX(100%); }

@media (prefers-reduced-motion: reduce) {
  .onchain-wallet-drawer-enter-active,
  .onchain-wallet-drawer-leave-active,
  .onchain-wallet-drawer-enter-active .onchain-wallet-drawer-panel,
  .onchain-wallet-drawer-leave-active .onchain-wallet-drawer-panel { transition-duration: 50ms; }
  .onchain-wallet-drawer-enter-from .onchain-wallet-drawer-panel,
  .onchain-wallet-drawer-leave-to .onchain-wallet-drawer-panel { transform: none; }
}

@media (forced-colors: active) {
  .onchain-wallet-drawer-title:focus {
    outline-color: Highlight;
  }
}
</style>
