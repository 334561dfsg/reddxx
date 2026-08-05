<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import FrontSearchablePopoverPicker from '../../../components/front/FrontSearchablePopoverPicker.vue'
import SecurityCheckDialog from '../../../components/front/SecurityCheckDialog.vue'
import WithdrawAuthDialog from '../../../components/front/WithdrawAuthDialog.vue'
import {
  FRONT_ACCOUNT_TYPE_OPTIONS,
  FRONT_WITHDRAW_ASSETS,
  FRONT_WITHDRAW_NETWORKS,
  networkHintWithdraw
} from '../../../constants/frontAssetCenterDemo'
import { getWithdrawPolicy } from '../../../admin/mock/withdrawPolicy'
import { useFrontAuthStore } from '../../../stores/frontAuth'
import { useFrontSecurityStore } from '../../../stores/frontSecurity'

const prefix = '/front'

const auth = useFrontAuthStore()
const security = useFrontSecurityStore()
security.ensureHydrated()
auth.ensureHydrated()

const phoneBound = computed({
  get: () => security.currentBindings.phoneBound,
  set: (v) => security.updateBindings({ phoneBound: v })
})
const emailBound = computed({
  get: () => security.currentBindings.emailBound,
  set: (v) => security.updateBindings({ emailBound: v })
})
const mfaBound = computed({
  get: () => security.currentBindings.mfaBound,
  set: (v) => security.updateBindings({ mfaBound: v })
})

const securityCheckOpen = ref(false)
const withdrawAuthOpen = ref(false)

/** 至少完成一种验证方式即可提币；认证时仅使用已绑定项 */
const withdrawVerifyChannelReady = computed(
  () => phoneBound.value || emailBound.value || mfaBound.value
)

const submitError = ref('')

const withdrawToast = ref('')
let withdrawToastTimer = null

function showWithdrawToast(message) {
  withdrawToast.value = message
  if (withdrawToastTimer) clearTimeout(withdrawToastTimer)
  withdrawToastTimer = window.setTimeout(() => {
    withdrawToast.value = ''
    withdrawToastTimer = null
  }, 3200)
}

const accountType = ref(FRONT_ACCOUNT_TYPE_OPTIONS[0].value)
const assetSymbol = ref(FRONT_WITHDRAW_ASSETS[0].symbol)
const networkKey = ref(FRONT_WITHDRAW_NETWORKS[0].key)
const address = ref('')
const amount = ref('')
const feeDisplay = ref('0')
const withdrawPolicy = ref(getWithdrawPolicy())
const shouldHideWithdrawableLine = computed(
  () => withdrawPolicy.value?.noRestrictionEnabled !== false
)

const selectedAsset = computed(
  () => FRONT_WITHDRAW_ASSETS.find((a) => a.symbol === assetSymbol.value) || FRONT_WITHDRAW_ASSETS[0]
)

const selectedNetwork = computed(
  () => FRONT_WITHDRAW_NETWORKS.find((n) => n.key === networkKey.value) || FRONT_WITHDRAW_NETWORKS[0]
)

const networkHint = computed(() => networkHintWithdraw(selectedNetwork.value.label))

const balanceLine = computed(
  () => `余额 ${selectedAsset.value.balance} ${selectedAsset.value.symbol}`
)

const withdrawableLine = computed(
  () =>
    `可提币 ${selectedAsset.value.withdrawable ?? selectedAsset.value.balance} ${selectedAsset.value.symbol}`
)

const assetSelectOptions = computed(() =>
  FRONT_WITHDRAW_ASSETS.map((a) => ({
    value: a.symbol,
    label: a.symbol,
    hint: `余额 ${a.balance} · 可提 ${a.withdrawable ?? a.balance}`
  }))
)

watch(assetSymbol, () => {
  amount.value = ''
})

watch([address, amount], () => {
  submitError.value = ''
})

function fillMax() {
  amount.value = selectedAsset.value.withdrawable ?? selectedAsset.value.balance
}

function parseAmountNum(raw) {
  const n = Number(String(raw || '').replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : NaN
}

function onSubmit() {
  const addr = String(address.value || '').trim()
  if (!addr) {
    submitError.value = '请填写提币地址'
    return
  }
  const amt = parseAmountNum(amount.value)
  if (!Number.isFinite(amt) || amt <= 0) {
    submitError.value = '请输入有效的提币数量'
    return
  }
  const maxWd = parseAmountNum(selectedAsset.value.withdrawable ?? selectedAsset.value.balance)
  if (Number.isFinite(maxWd) && amt > maxWd) {
    submitError.value = '提币数量不能超过可提币数量'
    return
  }
  submitError.value = ''

  if (!withdrawVerifyChannelReady.value) {
    securityCheckOpen.value = true
    return
  }

  withdrawAuthOpen.value = true
}

function onWithdrawAuthConfirmed({ method }) {
  // 演示：提交提币 API 时一并上传验证码等字段（见 WithdrawAuthDialog @confirmed 载荷）
  const label =
    method === 'mfa' ? '验证器' : method === 'email' ? '邮箱' : '短信'
  showWithdrawToast(
    `已通过${label}验证，提币申请已提交。演示未上链，接入 API 后以接口结果为准。`
  )
}

onUnmounted(() => {
  if (withdrawToastTimer) clearTimeout(withdrawToastTimer)
})

function assetSwatch(symbol) {
  const s = String(symbol)
  if (s === 'USDC' || s === 'USDT') return 'bg-sky-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]'
  if (s === 'ETH') return 'bg-indigo-500'
  if (s === 'BTC') return 'bg-amber-500'
  return 'bg-white/20'
}

/** 与 FrontAdaptiveSelect comfortable 对齐：44px 行高、玻璃底、内高光 */
const fieldBase =
  'w-full min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.04] text-[#eaecef] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-white/35 hover:border-white/[0.12] focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30'
const inputBase = `${fieldBase} h-[2.75rem] min-h-[2.75rem] box-border px-3 text-base font-medium leading-normal sm:px-4 sm:text-[15px] lg:rounded-lg`
const labelBase =
  'mb-1 block text-xs font-medium text-white/45 sm:text-[13px] lg:mb-2 lg:text-sm lg:text-white/50'
</script>

<template>
  <div class="min-h-[50vh] min-w-0 text-white">
    <header class="mb-4 hidden md:mb-5 md:block lg:mb-6">
      <h1 class="text-xl font-bold tracking-tight text-white md:text-2xl lg:text-3xl">提币</h1>
      <p class="mt-1 text-sm text-white/55">
        提交链上提币申请前请核对网络与地址；演示数据，对接接口后替换。
      </p>
    </header>

    <div class="flex flex-col gap-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] lg:max-w-3xl lg:gap-6 lg:pb-8">
      <div
        v-if="!withdrawVerifyChannelReady"
        class="rounded-xl border border-amber-400/30 bg-amber-400/[0.08] px-3.5 py-3 text-xs leading-relaxed text-amber-50/95 sm:text-[13px] md:flex md:items-center md:justify-between md:gap-4 md:py-3.5"
      >
        <p class="min-w-0 md:flex-1">
          提币前请至少绑定一种安全方式（手机、邮箱或谷歌验证器可任选）。绑定成功后即可用于验证；若已绑定多种，提币时默认优先验证器并可切换。
        </p>
        <div class="mt-2 flex shrink-0 flex-wrap items-center gap-2 md:mt-0">
          <button
            type="button"
            class="rounded-lg bg-amber-400/90 px-3 py-2 text-xs font-semibold text-black transition hover:bg-amber-300"
            @click="securityCheckOpen = true"
          >
            去完善
          </button>
          <RouterLink
            :to="`${prefix}/personal-center/security`"
            class="rounded-lg border border-white/25 px-3 py-2 text-xs font-medium text-white/90 transition hover:bg-white/10"
          >
            安全中心
          </RouterLink>
        </div>
      </div>
      <!-- 移动端：整块卡片；PC：去掉外壳，字段直接铺在页面上 -->
      <div
        class="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-3.5 sm:p-4 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0"
      >
        <div class="space-y-3 lg:space-y-5">
          <div class="grid gap-3 lg:grid-cols-2 lg:gap-6">
            <div class="min-w-0">
              <label :class="labelBase">账户类型</label>
              <FrontSearchablePopoverPicker
                v-model="accountType"
                field-key="withdraw-account-type"
                aria-label="账户类型"
                :searchable="false"
                :options="FRONT_ACCOUNT_TYPE_OPTIONS"
                panel-hint="选择划出资金的账户类型"
              />
            </div>

            <div class="min-w-0">
              <label :class="labelBase">请选择您要提币的币种</label>
              <FrontSearchablePopoverPicker
                v-model="assetSymbol"
                field-key="withdraw-asset"
                aria-label="提币币种"
                :options="assetSelectOptions"
                panel-hint="搜索或点选币种；演示余额仅供展示"
                search-placeholder="搜索币种代码，如 BTC、USDC…"
              >
                <template #leading>
                  <span
                    class="pointer-events-none grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold leading-none text-white"
                    :class="assetSwatch(selectedAsset.symbol)"
                    aria-hidden="true"
                  >
                    {{ selectedAsset.symbol.slice(0, 1) }}
                  </span>
                </template>
              </FrontSearchablePopoverPicker>
            </div>
          </div>

          <div class="min-w-0">
            <p :class="labelBase">网络</p>
            <div class="grid grid-cols-2 gap-2 xl:grid-cols-4">
              <button
                v-for="n in FRONT_WITHDRAW_NETWORKS"
                :key="n.key"
                type="button"
                class="flex h-[2.75rem] min-h-[2.75rem] items-center justify-center rounded-lg border px-3 text-center text-xs font-medium leading-snug transition [-webkit-tap-highlight-color:transparent] sm:text-[13px] lg:text-sm"
                :class="
                  networkKey === n.key
                    ? 'border-lime-400/55 bg-lime-400/[0.1] text-lime-100 shadow-[inset_0_0_0_1px_rgba(163,230,53,0.15)]'
                    : 'border-white/[0.12] text-white/60 hover:border-white/22 hover:text-white/85'
                "
                @click="networkKey = n.key"
              >
                {{ n.label }}
              </button>
            </div>
            <p
              class="mt-1.5 text-[11px] leading-snug text-white/38 sm:text-xs lg:mt-2 lg:text-[13px] lg:text-white/40"
            >
              {{ networkHint }}
            </p>
          </div>

          <div class="min-w-0">
            <label :class="labelBase">提币地址</label>
            <input
              v-model="address"
              type="text"
              autocomplete="off"
              placeholder="请输入或粘贴钱包地址"
              :class="inputBase"
            />
          </div>

          <div class="grid gap-3 lg:grid-cols-2 lg:gap-6">
            <div class="min-w-0">
              <label :class="labelBase">提币数量</label>
              <div class="relative">
                <input
                  v-model="amount"
                  type="text"
                  inputmode="decimal"
                  placeholder="请输入提币数量"
                  :class="[
                    inputBase,
                    'pr-[3.5rem] sm:pr-[4rem] lg:pr-[4.5rem]'
                  ]"
                />
                <button
                  type="button"
                  class="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1.5 text-xs font-semibold text-lime-300 transition hover:bg-lime-400/10 sm:text-sm lg:right-3 lg:px-2 lg:text-[15px] lg:text-lime-200"
                  @click="fillMax"
                >
                  全部
                </button>
              </div>
              <p
                class="mt-1.5 flex flex-nowrap items-center justify-between gap-2 text-[11px] leading-snug text-white/38 sm:text-xs lg:text-[13px] lg:text-white/42"
              >
                <span class="min-w-0 truncate">{{ balanceLine }}</span>
                <span
                  v-if="!shouldHideWithdrawableLine"
                  class="shrink-0 font-medium text-lime-300/85"
                >
                  {{ withdrawableLine }}
                </span>
              </p>
            </div>

            <div class="min-w-0">
              <label :class="labelBase">手续费</label>
              <input
                :value="feeDisplay"
                type="text"
                readonly
                :class="[
                  inputBase,
                  'cursor-not-allowed border-white/[0.06] bg-white/[0.02] text-white/55'
                ]"
              />
            </div>
          </div>
        </div>

        <div
          class="mt-3 border-t border-white/[0.08] pt-3 max-lg:bg-black/15 max-lg:rounded-lg max-lg:px-3 max-lg:py-2.5 lg:mt-6 lg:bg-transparent lg:px-0 lg:pt-5"
        >
          <p class="text-[11px] font-medium text-white/45 sm:text-xs lg:text-sm">重要通知</p>
          <ol
            class="mt-1.5 list-decimal space-y-1 pl-3.5 text-[10px] leading-relaxed text-white/35 sm:space-y-1.5 sm:pl-4 sm:text-[11px] sm:text-white/38 lg:mt-2 lg:space-y-2 lg:text-xs lg:leading-relaxed lg:text-white/40"
          >
            <li>链上拥堵时到账时间可能延长，请耐心等待区块确认。</li>
            <li>提币申请处理期间，相应余额将暂时冻结，直至完成或失败退回。</li>
          </ol>
        </div>
      </div>

      <div class="max-lg:mt-1 space-y-2">
        <p v-if="submitError" class="text-xs font-medium text-amber-200/90">{{ submitError }}</p>
        <button
          type="button"
          class="w-full rounded-xl bg-lime-400 py-3 text-base font-semibold text-black transition hover:bg-lime-300 active:scale-[0.99] [-webkit-tap-highlight-color:transparent] sm:py-2.5 sm:text-sm lg:w-auto lg:min-w-[200px] lg:rounded-lg lg:px-8 lg:py-3 lg:text-base"
          @click="onSubmit"
        >
          提币
        </button>
      </div>
    </div>

    <SecurityCheckDialog
      v-model="securityCheckOpen"
      v-model:phone-bound="phoneBound"
      v-model:email-bound="emailBound"
      v-model:mfa-bound="mfaBound"
    />

    <WithdrawAuthDialog
      v-model="withdrawAuthOpen"
      :phone-bound="phoneBound"
      :email-bound="emailBound"
      :mfa-bound="mfaBound"
      @confirmed="onWithdrawAuthConfirmed"
    />

    <Teleport to="body">
      <Transition name="withdraw-toast-fade">
        <div
          v-if="withdrawToast"
          class="fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-[80] max-w-[min(92vw,24rem)] -translate-x-1/2 px-3"
          role="status"
        >
          <p
            class="rounded-xl border border-emerald-400/25 bg-[#1e2329] px-4 py-2.5 text-center text-sm leading-snug text-white shadow-lg ring-1 ring-white/10"
          >
            {{ withdrawToast }}
          </p>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.withdraw-toast-fade-enter-active,
.withdraw-toast-fade-leave-active {
  transition: opacity 0.2s ease;
}

.withdraw-toast-fade-enter-from,
.withdraw-toast-fade-leave-to {
  opacity: 0;
}
</style>
