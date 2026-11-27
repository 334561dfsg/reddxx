<script setup>
import { message } from 'ant-design-vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import { AdminButton, AdminInput } from '../antd/controls.js'

import { computed, ref } from 'vue'
import AdminDialog from '../antd/AdminDialog.vue'
import SelectOnlyCombobox from '../form/SelectOnlyCombobox.vue'

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
const returnFocusRef = ref(null)

const form = ref({
  fromAccountKey: 'market',
  toAccountKey: 'trading',
  coinKey: null,
  amount: ''
})

const transferAccountOptions = computed(() => props.assets ? [
  { value: 'market', label: '市币' },
  { value: 'wealth', label: '理财' },
  { value: 'trading', label: '交易合约' },
  { value: 'perp', label: '永续合约' }
] : [])

const destinationOptions = computed(() => transferAccountOptions.value.map((option) => ({
  ...option,
  disabled: option.value === form.value.fromAccountKey
})))

const destinationConflict = computed(() => (
  Boolean(form.value.toAccountKey) && form.value.fromAccountKey === form.value.toAccountKey
))

const coinOptions = [
  { value: 'USDT', label: 'USDT' },
  { value: 'USDC', label: 'USDC' },
  { value: 'ETH', label: 'ETH' }
]

const coinSubmissionAttempted = ref(false)
const coinError = computed(() => coinSubmissionAttempted.value && !form.value.coinKey)

const updateCoin = (value) => {
  form.value.coinKey = value
  if (coinOptions.some((option) => option.value === value && !option.disabled)) coinSubmissionAttempted.value = false
}

const isEnabledOption = (options, value) => options.some((option) => (
  option.value === value && !option.disabled
))

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

// Operation feedback goes through Ant message (AGENTS.md toast rule): validation errors and submitted results.
const showError = (text) => { message.error(text) }
const showSuccess = (text) => { message.success(text) }

// Frame: AdminDialog (Ant Modal + useDialogLifecycle), dialog migration 2026-11-27.
const dialogFrame = ref(null)
const phase = computed(() => dialogFrame.value?.phase ?? 'closed')

const open = (returnFocus = null) => {
  if (phase.value !== 'closed') return false
  form.value = {
    fromAccountKey: 'market',
    toAccountKey: 'trading',
    coinKey: null,
    amount: ''
  }
  coinSubmissionAttempted.value = false
  returnFocusRef.value = returnFocus
  showModal.value = true
  return true
}

defineExpose({ open })

const close = () => dialogFrame.value?.close()

const confirm = () => {
  const amount = String(form.value.amount || '').trim()
  if (!form.value.fromAccountKey) return showError('请选择“从”账户')
  if (!form.value.toAccountKey) return showError('请选择“到”账户')
  if (form.value.fromAccountKey === form.value.toAccountKey) return showError('“从”账户和“到”账户不能相同，请重新选择“到”账户')
  if (!isEnabledOption(transferAccountOptions.value, form.value.fromAccountKey) || !isEnabledOption(destinationOptions.value, form.value.toAccountKey)) {
    return showError('所选账户已失效，请重新选择账户')
  }
  if (!form.value.coinKey) {
    coinSubmissionAttempted.value = true
    return showError('请选择币种')
  }
  if (!amount || Number.isNaN(Number(amount))) return showError('请输入有效的划转数量')

  emit('submit', {
    type: 'transfer',
    amount,
    fromAccountKey: form.value.fromAccountKey,
    toAccountKey: form.value.toAccountKey,
    coinKey: form.value.coinKey
  })

  showSuccess(`已提交划转：${amount} ${coinOptions.find((c) => c.value === form.value.coinKey)?.label || form.value.coinKey}`)
  close()
}
</script>

<template>
  <AdminButton
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
  </AdminButton>

  <AdminDialog :open="showModal" title="划转" title-id="user-transfer-title" :return-focus="returnFocusRef" :width="448" plain ref="dialogFrame" @close="showModal = false">

          <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5">
            <SelectOnlyCombobox
              v-model="form.fromAccountKey"
              :options="transferAccountOptions"
              label="从"
              required
              id-base="transfer-from"
            />
            <div>
              <SelectOnlyCombobox
                v-model="form.toAccountKey"
                :options="destinationOptions"
                label="到"
                required
                :invalid="destinationConflict"
                :error-id="destinationConflict ? 'transfer-to-error' : ''"
                id-base="transfer-to"
              />
              <FeedbackToast v-if="destinationConflict" id="transfer-to-error" type="error" :source="() => (destinationConflict) ? (([&quot; “从”账户和“到”账户不能相同，请重新选择“到”账户。 &quot;].join(''))) : ''"></FeedbackToast>
            </div>
            <div>
              <SelectOnlyCombobox
                :model-value="form.coinKey"
                :options="coinOptions"
                label="币种"
                placeholder="请选择"
                required
                :invalid="coinError"
                error-id="transfer-coin-error"
                id-base="transfer-coin"
                @update:model-value="updateCoin"
              />
              <FeedbackToast v-if="coinError" id="transfer-coin-error" type="error" :source="() => (coinError) ? (([&quot; 请选择币种。 &quot;].join(''))) : ''"></FeedbackToast>
            </div>

            <div>
              <div class="text-sm font-medium text-slate-700 mb-2">划转数量</div>
              <div class="relative">
                <AdminInput
                  v-model="form.amount"
                  type="number"
                  step="0.01"
                  class="w-full"
                  placeholder="请输入划转的数量"
                />
                <AdminButton
                  type="button"
                  @click="setAll"
                >
                  全部
                </AdminButton>
              </div>
              <div class="mt-2 text-sm text-slate-600">
                余额: {{ fromBalance !== null ? formatMoney(fromBalance, { min: 2, max: 2 }) : '-' }}
              </div>
            </div>
          </div>
    <footer>
      <AdminButton type="button" @click="close">取消</AdminButton>
      <AdminButton
              type="button"
              variant="primary"
              @click="confirm"
            >
              划转
            </AdminButton>
    </footer>
  </AdminDialog>
</template>

