<script setup>
import { message } from 'ant-design-vue'
import { AdminButton, AdminInput, AdminRadio, AdminTextarea } from '../antd/controls.js'

import { computed, ref } from 'vue'
import AdminDialog from '../antd/AdminDialog.vue'

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

// Operation feedback goes through Ant message (AGENTS.md toast rule): validation errors and submitted results.
const showError = (text) => { message.error(text) }
const showSuccess = (text) => { message.success(text) }

// Frame: AdminDialog (Ant Modal + useDialogLifecycle), dialog migration 2026-11-27.
const dialogFrame = ref(null)
const phase = computed(() => dialogFrame.value?.phase ?? 'closed')

const open = (returnFocus = null) => {
  if (phase.value !== 'closed') return false
  form.value = {
    depositAccountKey: 'market',
    depositAmount: '',
    remark: ''
  }
  returnFocusRef.value = returnFocus
  showModal.value = true
  return true
}

defineExpose({ open })

const close = () => dialogFrame.value?.close()

const confirm = () => {
  const amount = String(form.value.depositAmount || '').trim()
  if (!amount || Number.isNaN(Number(amount))) {
    showError('请输入有效的入金金额')
    return
  }
  if (!form.value.depositAccountKey) {
    showError('请选择入金账户')
    return
  }
  emit('submit', {
    type: 'deposit',
    amount,
    accountKey: form.value.depositAccountKey,
    remark: form.value.remark || ''
  })
  showSuccess(`已提交入金：${amount}`)
  close()
}
</script>

<template>
  <AdminButton
    v-if="showTrigger"
    type="button"
    class="inline-flex items-center justify-center gap-2 h-8 px-3 text-sm font-medium rounded-lg ring-1 ring-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors"
    @click="open($event.currentTarget)"
  >
    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 1v22" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M17 5l-5-4-5 4" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M7 19l5 4 5-4" />
    </svg>
    入金
  </AdminButton>

  <AdminDialog :open="showModal" title="入金" title-id="user-deposit-title" :return-focus="returnFocusRef" :width="576" plain ref="dialogFrame" @close="showModal = false">
    <template #eyebrow>操作</template>

          <div class="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
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

            <fieldset class="m-0 min-w-0 border-0 p-0">
              <legend class="mb-2 text-sm font-medium text-slate-700">选择入金账户</legend>
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <AdminRadio v-for="opt in depositAccountOptions" :key="opt.key" class="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2 text-sm transition-colors" :class="form.depositAccountKey === opt.key ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-700 hover:border-blue-300'" v-model="form.depositAccountKey" name="deposit-account" :value="opt.key">
                  <span class="font-medium">{{ opt.label }}</span>
                  <span class="flex items-center gap-2">
                    <span class="text-xs tabular-nums text-slate-500">{{ formatMoney(opt.value, { min: 2, max: 2 }) }}</span>
                    <span
                      v-if="form.depositAccountKey === opt.key"
                      class="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-800"
                    >已选择</span>
                  </span>

                </AdminRadio>
              </div>
            </fieldset>

            <div>
              <div class="text-sm font-medium text-slate-700 mb-2">操作入金数量：</div>
              <AdminInput
                v-model="form.depositAmount"
                type="number"
                step="0.01"
                class="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:bg-white border border-slate-100"
                placeholder="请输入入金数量"
              />
            </div>

            <div>
              <div class="text-sm font-medium text-slate-700 mb-2">备注：</div>
              <AdminTextarea
                v-model="form.remark"
                rows="4"
                class="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:bg-white border border-slate-100"
                placeholder="请输入备注信息（可选）"
              />
            </div>

            <div class="mt-5 flex justify-end">
              <AdminButton
                type="button"
                class="px-7 py-3 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
                @click="confirm"
              >
                确认入金操作
              </AdminButton>
            </div>
          </div>
  </AdminDialog>
</template>

