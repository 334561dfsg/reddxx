<script setup>
import { computed, ref } from 'vue'

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
const form = ref({
  depositAccountKey: 'market',
  depositAmount: '',
  remark: ''
})

const depositAccountOptions = computed(() => {
  const a = props.assets
  if (!a) return []
  return [
    { key: 'market', label: '市币账户', value: a.marketAccount },
    { key: 'wealth', label: '理财账户', value: a.wealthAccount },
    { key: 'trading', label: '交易合约', value: a.tradingContract },
    { key: 'perp', label: '永续合约', value: a.perpetualContract }
  ]
})

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

const open = () => {
  form.value = {
    depositAccountKey: 'market',
    depositAmount: '',
    remark: ''
  }
  showModal.value = true
}

defineExpose({ open })

const close = () => {
  showModal.value = false
}

const confirm = () => {
  const amount = String(form.value.depositAmount || '').trim()
  if (!amount || Number.isNaN(Number(amount))) {
    showToast('请输入有效的入金金额')
    return
  }
  if (!form.value.depositAccountKey) {
    showToast('请选择入金账户')
    return
  }
  emit('submit', {
    type: 'deposit',
    amount,
    accountKey: form.value.depositAccountKey,
    remark: form.value.remark || ''
  })
  showToast(`已提交入金：${amount}`)
  close()
}
</script>

<template>
  <button
    v-if="showTrigger"
    type="button"
    class="inline-flex items-center justify-center gap-2 h-8 px-3 text-sm font-medium rounded-lg ring-1 ring-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors"
    @click="open"
  >
    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 1v22" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M17 5l-5-4-5 4" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M7 19l5 4 5-4" />
    </svg>
    入金
  </button>

  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showModal"
        class="fixed inset-0 z-[60] bg-black/40 grid place-items-center p-4"
      >
        <section class="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
          <header class="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-xs font-medium tracking-wide text-slate-500">操作</div>
                <div class="mt-1 text-lg font-semibold text-slate-900">入金</div>
              </div>
              <button
                type="button"
                class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
                @click="close"
                aria-label="关闭弹窗"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </header>

          <div class="px-5 py-4 space-y-3">
            <section class="rounded-xl bg-slate-100 p-5">
              <div class="text-base font-semibold text-slate-900">
                {{ user.username }} 账户资产
              </div>
              <div class="mt-4 grid grid-cols-2 gap-y-3">
                <div class="flex items-center gap-2">
                  <div class="text-sm text-slate-600 whitespace-nowrap">市币账户：</div>
                  <div class="text-sm font-semibold text-slate-900">
                    {{ assets ? formatMoney(assets.marketAccount, { min: 2, max: 2 }) : '-' }}
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <div class="text-sm text-slate-600 whitespace-nowrap">理财账户：</div>
                  <div class="text-sm font-semibold text-slate-900">
                    {{ assets ? formatMoney(assets.wealthAccount, { min: 2, max: 2 }) : '-' }}
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <div class="text-sm text-slate-600 whitespace-nowrap">交易合约：</div>
                  <div class="text-sm font-semibold text-slate-900">
                    {{ assets ? formatMoney(assets.tradingContract, { min: 2, max: 2 }) : '-' }}
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <div class="text-sm text-slate-600 whitespace-nowrap">永续合约：</div>
                  <div class="text-sm font-semibold text-slate-900">
                    {{ assets ? formatMoney(assets.perpetualContract, { min: 2, max: 2 }) : '-' }}
                  </div>
                </div>
              </div>
            </section>

            <div>
              <div class="text-sm font-medium text-slate-700 mb-2">选择入金账户：</div>
              <select
                v-model="form.depositAccountKey"
                class="w-full rounded-xl border-2 border-blue-600 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option v-for="opt in depositAccountOptions" :key="opt.key" :value="opt.key">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div>
              <div class="text-sm font-medium text-slate-700 mb-2">操作入金数量：</div>
              <input
                v-model="form.depositAmount"
                type="number"
                step="0.01"
                class="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:bg-white border border-slate-100"
                placeholder="请输入入金数量"
              />
            </div>

            <div>
              <div class="text-sm font-medium text-slate-700 mb-2">备注：</div>
              <textarea
                v-model="form.remark"
                rows="4"
                class="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:bg-white border border-slate-100"
                placeholder="请输入备注信息（可选）"
              />
            </div>

            <div class="mt-5 flex justify-end">
              <button
                type="button"
                class="px-7 py-3 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
                @click="confirm"
              >
                确认入金操作
              </button>
            </div>
          </div>
        </section>
      </div>
    </Transition>

    <div
      v-if="toast.visible"
      class="fixed top-4 right-4 z-[70] bg-white border border-blue-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3"
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
