<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import FrontSearchablePopoverPicker from '../../../components/front/FrontSearchablePopoverPicker.vue'
import {
  FRONT_DEPOSIT_COINS,
  FRONT_TRANSFER_ACCOUNT_OPTIONS,
  demoTransferAvailable
} from '../../../constants/frontAssetCenterDemo'
import { useFrontAuthStore } from '../../../stores/frontAuth'

const frontAuth = useFrontAuthStore()
const { accountMode } = storeToRefs(frontAuth)
const fromAccount = ref('spot')
const toAccount = ref('perpetual')
const assetSymbol = ref(FRONT_DEPOSIT_COINS[0].symbol)
const amount = ref('')
const remark = ref('')
const visibleTransferAccountOptions = computed(() => (
  accountMode.value === 'demo'
    ? FRONT_TRANSFER_ACCOUNT_OPTIONS.filter((option) => option.value !== 'earn')
    : FRONT_TRANSFER_ACCOUNT_OPTIONS
))

const coinOptions = computed(() =>
  FRONT_DEPOSIT_COINS.map((c) => ({
    value: c.symbol,
    label: c.symbol,
    hint: `可用 ${demoTransferAvailable(fromAccount.value, c.symbol)}`
  }))
)

const availableLine = computed(
  () =>
    `可划转: ${demoTransferAvailable(fromAccount.value, assetSymbol.value)} ${assetSymbol.value}`
)

watch([fromAccount, toAccount], () => {
  if (fromAccount.value === toAccount.value) {
    const alt = visibleTransferAccountOptions.value.find((o) => o.value !== fromAccount.value)
    if (alt) toAccount.value = alt.value
  }
})

watch(
  visibleTransferAccountOptions,
  (options) => {
    const values = options.map((option) => option.value)
    if (!values.includes(fromAccount.value)) {
      fromAccount.value = options[0]?.value || 'spot'
    }
    if (!values.includes(toAccount.value) || toAccount.value === fromAccount.value) {
      toAccount.value = options.find((option) => option.value !== fromAccount.value)?.value || fromAccount.value
    }
  },
  { immediate: true }
)

watch(assetSymbol, () => {
  amount.value = ''
})

watch(fromAccount, () => {
  amount.value = ''
})

function fillMax() {
  amount.value = demoTransferAvailable(fromAccount.value, assetSymbol.value)
}

function assetSwatch(symbol) {
  const s = String(symbol)
  if (s === 'USDC' || s === 'USDT') return 'bg-sky-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]'
  if (s === 'ETH') return 'bg-indigo-500'
  if (s === 'BTC') return 'bg-amber-500'
  return 'bg-white/20'
}

const selectedCoin = computed(
  () => FRONT_DEPOSIT_COINS.find((c) => c.symbol === assetSymbol.value) || FRONT_DEPOSIT_COINS[0]
)

function onSubmit() {
  // 演示：对接站内划转 API 后替换
}

const fieldBase =
  'w-full min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.04] text-[#eaecef] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-white/35 hover:border-white/[0.12] focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30'
const inputBase = `${fieldBase} h-[2.75rem] min-h-[2.75rem] box-border px-3 text-base font-medium leading-normal sm:px-4 sm:text-[15px] lg:rounded-lg`
const labelBase =
  'mb-1 block text-xs font-medium text-white/45 sm:text-[13px] lg:mb-2 lg:text-sm lg:text-white/50'
</script>

<template>
  <div class="min-h-[50vh] min-w-0 text-white">
    <header class="mb-4 hidden md:mb-5 md:block lg:mb-6">
      <h1 class="text-xl font-bold tracking-tight text-white md:text-2xl lg:text-3xl">划转</h1>
      <p class="mt-1 text-sm text-white/55">
        在账户之间调拨资产；实时到账，无链上网络费。演示数据，对接接口后替换。
      </p>
    </header>

    <div class="flex flex-col gap-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] lg:max-w-3xl lg:gap-6 lg:pb-8">
      <div
        class="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-3.5 sm:p-4 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0"
      >
        <div class="space-y-3 lg:space-y-5">
          <div class="grid gap-3 lg:grid-cols-2 lg:gap-6">
            <div class="min-w-0">
              <label :class="labelBase">转出账户</label>
              <FrontSearchablePopoverPicker
                v-model="fromAccount"
                field-key="transfer-from"
                sheet-title="转出账户"
                aria-label="转出账户"
                :searchable="false"
                :options="visibleTransferAccountOptions"
                panel-hint="选择扣减余额的账户"
              />
            </div>
            <div class="min-w-0">
              <label :class="labelBase">转入账户</label>
              <FrontSearchablePopoverPicker
                v-model="toAccount"
                field-key="transfer-to"
                sheet-title="转入账户"
                aria-label="转入账户"
                :searchable="false"
                :options="visibleTransferAccountOptions"
                panel-hint="选择增加余额的账户，不能与转出相同"
              />
            </div>
          </div>

          <div class="min-w-0">
            <label :class="labelBase">币种</label>
            <FrontSearchablePopoverPicker
              v-model="assetSymbol"
              field-key="transfer-coin"
              sheet-title="选择币种"
              aria-label="划转币种"
              :options="coinOptions"
              panel-hint="列表展示当前转出账户可用数量"
              search-placeholder="搜索币种"
            >
              <template #leading>
                <span
                  class="pointer-events-none grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold leading-none text-white"
                  :class="assetSwatch(selectedCoin.symbol)"
                  aria-hidden="true"
                >
                  {{ selectedCoin.symbol.slice(0, 1) }}
                </span>
              </template>
            </FrontSearchablePopoverPicker>
          </div>

          <div class="min-w-0">
            <label :class="labelBase">数量</label>
            <div class="relative">
              <input
                v-model="amount"
                type="text"
                inputmode="decimal"
                placeholder="请输入划转数量"
                :class="[inputBase, 'pr-[3.5rem] sm:pr-[4rem] lg:pr-[4.5rem]']"
              />
              <button
                type="button"
                class="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1.5 text-xs font-semibold text-lime-300 transition hover:bg-lime-400/10 sm:text-sm lg:right-3 lg:px-2 lg:text-[15px] lg:text-lime-200"
                @click="fillMax"
              >
                全部
              </button>
            </div>
            <p class="mt-1.5 text-[11px] text-white/38 sm:text-xs lg:text-[13px] lg:text-white/42">
              {{ availableLine }}
            </p>
          </div>

          <div class="min-w-0">
            <label :class="labelBase">备注（可选）</label>
            <input
              v-model="remark"
              type="text"
              autocomplete="off"
              placeholder="选填，便于对账"
              :class="inputBase"
            />
          </div>

          <div
            class="mt-3 border-t border-white/[0.08] pt-3 max-lg:bg-black/15 max-lg:rounded-lg max-lg:px-3 max-lg:py-2.5 lg:mt-6 lg:bg-transparent lg:px-0 lg:pt-5"
          >
            <p class="text-[11px] font-medium text-white/45 sm:text-xs lg:text-sm">提示</p>
            <ol
              class="mt-1.5 list-decimal space-y-1 pl-3.5 text-[10px] leading-relaxed text-white/35 sm:space-y-1.5 sm:pl-4 sm:text-[11px] sm:text-white/38 lg:mt-2 lg:space-y-2 lg:text-xs lg:text-white/40"
            >
              <li>划转成功后不可撤销，请确认账户与币种。</li>
              <li>部分风控场景下可能需二次验证，以实际接入为准。</li>
            </ol>
          </div>
        </div>
      </div>

      <div class="max-lg:mt-1">
        <button
          type="button"
          class="w-full rounded-xl bg-lime-400 py-3 text-base font-semibold text-black transition hover:bg-lime-300 active:scale-[0.99] [-webkit-tap-highlight-color:transparent] sm:py-2.5 sm:text-sm lg:w-auto lg:min-w-[200px] lg:rounded-lg lg:px-8 lg:py-3 lg:text-base"
          @click="onSubmit"
        >
          确认划转
        </button>
      </div>
    </div>
  </div>
</template>
