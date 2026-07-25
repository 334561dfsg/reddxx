<script setup>
import { computed, ref } from 'vue'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'

const props = defineProps({
  user: { type: Object, required: true },
  assets: { type: Object, default: null },
  showTrigger: { type: Boolean, default: true }
})

const emit = defineEmits(['submit'])

const formatMoney = (value, opts = {}) => {
  const num = Number(value || 0)
  const { min = 0, max = 2 } = opts
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: min,
    maximumFractionDigits: max
  }).format(num)
}

const showModal = ref(false)
const dialogRef = ref(null)
const titleRef = ref(null)
const returnFocusRef = ref(null)

const form = ref({
  fromAccountKey: 'market',
  toAccountKey: 'trading',
  coinKey: '',
  amount: ''
})

const transferAccountOptions = computed(() => {
  const a = props.assets
  if (!a) return []
  return [
    { key: 'market', label: '市币' },
    { key: 'wealth', label: '理财' },
    { key: 'trading', label: '交易合约' },
    { key: 'perp', label: '永续合约' }
  ]
})

const coinOptions = [
  { key: 'USDT', label: 'USDT' },
  { key: 'USDC', label: 'USDC' },
  { key: 'ETH', label: 'ETH' }
]

const fromBalance = computed(() => {
  const a = props.assets
  if (!a) return null
  const k = form.value.fromAccountKey
  if (k === 'market') return a.marketAccount
  if (k === 'wealth') return a.wealthAccount
  if (k === 'trading') return a.tradingContract
  if (k === 'perp') return a.perpetualContract
  return null
})

const setAll = () => {
  const v = fromBalance.value
  if (v === null) return
  form.value.amount = String(v.toFixed(2))
}

const toast = ref({ visible: false, message: '' })
let toastTimer = null

const showToast = (message) => {
  toast.value.message = message
  toast.value.visible = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value.visible = false
  }, 2500)
}

const {
  rendered,
  phase,
  layerStyle,
  requestDialogClose,
  onAfterEnter,
  onAfterLeave
} = useDialogLifecycle({
  open: showModal,
  dialogRef,
  initialFocusRef: titleRef,
  returnFocusRef,
  requestClose: () => { showModal.value = false }
})

const open = (returnFocus = null) => {
  if (phase.value !== 'closed') return false
  form.value = {
    fromAccountKey: 'market',
    toAccountKey: 'trading',
    coinKey: '',
    amount: ''
  }
  returnFocusRef.value = returnFocus
  showModal.value = true
  return true
}

defineExpose({ open })

const close = createDialogCloseAction(requestDialogClose)

const confirm = () => {
  const amount = String(form.value.amount || '').trim()
  if (!form.value.fromAccountKey) return showToast('请选择“从”账户')
  if (!form.value.toAccountKey) return showToast('请选择“到”账户')
  if (!form.value.coinKey) return showToast('请选择币种')
  if (!amount || Number.isNaN(Number(amount))) return showToast('请输入有效的划转数量')

  emit('submit', {
    type: 'transfer',
    amount,
    fromAccountKey: form.value.fromAccountKey,
    toAccountKey: form.value.toAccountKey,
    coinKey: form.value.coinKey
  })

  showToast(`已提交划转：${amount} ${coinOptions.find((c) => c.key === form.value.coinKey)?.label || form.value.coinKey}`)
  close()
}
</script>

<template>
  <button
    v-if="showTrigger"
    type="button"
    class="inline-flex items-center justify-center gap-2 h-8 px-3 text-sm font-medium rounded-lg ring-1 ring-blue-200 text-blue-700 bg-white hover:bg-blue-50 transition-colors"
    @click="open($event.currentTarget)"
  >
    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M7 17L17 7" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h10v10" />
    </svg>
    划转
  </button>

  <Teleport to="body">
    <Transition name="user-action-dialog" appear @after-enter="onAfterEnter" @after-leave="onAfterLeave">
      <div
        v-if="rendered"
        v-show="phase !== 'closing'"
        class="fixed inset-0 grid place-items-center bg-black/40 p-4"
        :style="layerStyle"
      >
        <section ref="dialogRef" class="user-action-dialog-panel flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg supports-[height:100dvh]:max-h-[calc(100dvh-2rem)]" role="dialog" aria-modal="true" aria-labelledby="user-transfer-title">
          <header class="px-5 py-4 bg-white">
            <div class="flex items-start justify-between gap-4">
              <div id="user-transfer-title" ref="titleRef" tabindex="-1" class="text-lg font-semibold text-slate-900 outline-none">划转</div>
              <button
                type="button"
                class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                @click="close"
                aria-label="关闭"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </header>

          <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5">
            <div>
              <div class="text-sm font-medium text-slate-700 mb-2">从</div>
              <select
                v-model="form.fromAccountKey"
                class="w-full rounded-xl border-2 border-blue-600 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option v-for="opt in transferAccountOptions" :key="opt.key" :value="opt.key">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div>
              <div class="text-sm font-medium text-slate-700 mb-2">到</div>
              <select
                v-model="form.toAccountKey"
                class="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none"
              >
                <option v-for="opt in transferAccountOptions" :key="opt.key" :value="opt.key">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div>
              <div class="text-sm font-medium text-slate-700 mb-2">币种</div>
              <select
                v-model="form.coinKey"
                class="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none"
              >
                <option disabled value="">请选择</option>
                <option v-for="c in coinOptions" :key="c.key" :value="c.key">
                  {{ c.label }}
                </option>
              </select>
            </div>

            <div>
              <div class="text-sm font-medium text-slate-700 mb-2">划转数量</div>
              <div class="relative">
                <input
                  v-model="form.amount"
                  type="number"
                  step="0.01"
                  class="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none border border-slate-100 pr-20"
                  placeholder="请输入划转的数量"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-blue-600 hover:text-blue-700"
                  @click="setAll"
                >
                  全部
                </button>
              </div>
              <div class="mt-2 text-sm text-slate-600">
                余额: {{ fromBalance !== null ? formatMoney(fromBalance, { min: 2, max: 2 }) : '-' }}
              </div>
            </div>

            <button
              type="button"
              class="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-base font-medium py-4 transition-colors"
              @click="confirm"
            >
              划转
            </button>
          </div>
        </section>
      </div>
    </Transition>

    <div
      v-if="toast.visible"
      class="fixed right-4 top-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-white px-4 py-3 shadow-lg"
      :style="{ zIndex: Number(layerStyle.zIndex || 1000) + 1 }"
    >
      <div class="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
        <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <span class="text-sm font-medium text-slate-900">{{ toast.message }}</span>
    </div>
  </Teleport>
</template>

<style scoped>
.user-action-dialog-enter-active { transition: opacity 200ms ease-out; }
.user-action-dialog-leave-active { transition: opacity 150ms ease-in; }
.user-action-dialog-enter-active .user-action-dialog-panel { transition: opacity 200ms ease-out, transform 200ms ease-out; }
.user-action-dialog-leave-active .user-action-dialog-panel { transition: opacity 150ms ease-in, transform 150ms ease-in; }
.user-action-dialog-enter-from,
.user-action-dialog-leave-to { opacity: 0; }
.user-action-dialog-enter-from .user-action-dialog-panel,
.user-action-dialog-leave-to .user-action-dialog-panel { opacity: 0; transform: scale(0.96); }
@media (prefers-reduced-motion: reduce) {
  .user-action-dialog-enter-active,
  .user-action-dialog-leave-active,
  .user-action-dialog-enter-active .user-action-dialog-panel,
  .user-action-dialog-leave-active .user-action-dialog-panel { transition-duration: 50ms; }
  .user-action-dialog-enter-from .user-action-dialog-panel,
  .user-action-dialog-leave-to .user-action-dialog-panel { transform: none; }
}
</style>
