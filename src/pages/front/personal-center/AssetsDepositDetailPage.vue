<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FrontSearchablePopoverPicker from '../../../components/front/FrontSearchablePopoverPicker.vue'
import SecurityCheckDialog from '../../../components/front/SecurityCheckDialog.vue'
import {
  FRONT_DEPOSIT_COINS,
  FRONT_DEPOSIT_DEFAULT_SYMBOL_LOWER,
  FRONT_WITHDRAW_NETWORKS,
  demoDepositAddress,
  networkHintDeposit
} from '../../../constants/frontAssetCenterDemo'
import { browserMinimumDepositRepository, MINIMUM_DEPOSIT_CHANGED } from '../../../features/minimum-deposit/browserRepository.js'
import { calculateMinimumFromUsdPrices } from '../../../features/minimum-deposit/model.js'
import { frontAssetHoldingCoinMarket } from '../../../constants/frontAssetCenterDemo'
import { useFrontAuthStore } from '../../../stores/frontAuth'
import { useFrontSecurityStore } from '../../../stores/frontSecurity'

const prefix = '/front'
const route = useRoute()
const router = useRouter()

const auth = useFrontAuthStore()
const security = useFrontSecurityStore()
auth.ensureHydrated()
security.ensureHydrated()

const securityCheckOpen = ref(false)

const depositSuccessBindHint =
  '检测到你的充币已到账。当前账号尚未绑定任何安全验证方式，为保障账户与资金安全，请至少绑定手机、邮箱或谷歌验证器中的一项。'

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

const networkKey = ref(FRONT_WITHDRAW_NETWORKS[0].key)
const depositAmount = ref('')
const depositVoucher = ref(null)
const depositVoucherPreview = ref('')
const copied = ref(false)
let copyTimer = null

const pickerSymbol = ref('')

const symbol = computed(() => String(route.params.symbol || '').toUpperCase())

const coinMeta = computed(() => FRONT_DEPOSIT_COINS.find((c) => c.symbol === symbol.value))

const minimumUsdt = ref(null)
const minimumLoadError = ref(false)
function refreshMinimumDeposit() {
  try {
    minimumUsdt.value = browserMinimumDepositRepository.read().amountUsdt
    minimumLoadError.value = false
  } catch {
    minimumUsdt.value = null
    minimumLoadError.value = true
  }
}
const minimumQuantity = computed(() => minimumUsdt.value === null ? null : calculateMinimumFromUsdPrices(
  minimumUsdt.value,
  frontAssetHoldingCoinMarket(symbol.value),
  frontAssetHoldingCoinMarket('USDT')?.usdPrice
))
onMounted(() => {
  refreshMinimumDeposit()
  window.addEventListener('storage', refreshMinimumDeposit)
  window.addEventListener('focus', refreshMinimumDeposit)
  window.addEventListener(MINIMUM_DEPOSIT_CHANGED, refreshMinimumDeposit)
})

const depositCoinOptions = computed(() =>
  FRONT_DEPOSIT_COINS.map((c) => ({ value: c.symbol, label: c.symbol }))
)

const selectedNetwork = computed(
  () => FRONT_WITHDRAW_NETWORKS.find((n) => n.key === networkKey.value) || FRONT_WITHDRAW_NETWORKS[0]
)

const networkHint = computed(() => networkHintDeposit(selectedNetwork.value.label))

const address = computed(() =>
  coinMeta.value ? demoDepositAddress(coinMeta.value.symbol, networkKey.value) : ''
)

const shortAddress = computed(() => {
  const a = address.value
  if (a.length < 20) return a
  return `${a.slice(0, 8)}…${a.slice(-6)}`
})

watch(
  () => route.params.symbol,
  (p) => {
    const s = String(p || '').toUpperCase()
    if (s) pickerSymbol.value = s
  },
  { immediate: true }
)

watch(pickerSymbol, (next) => {
  const r = String(route.params.symbol || '').toUpperCase()
  if (!next || next === r) return
  router.replace(`${prefix}/personal-center/assets/deposit/${next.toLowerCase()}`)
})

watch(symbol, () => {
  if (!coinMeta.value) {
    router.replace(`${prefix}/personal-center/assets/deposit/${FRONT_DEPOSIT_DEFAULT_SYMBOL_LOWER}`)
  }
}, { immediate: true })

watch(networkKey, () => {
  copied.value = false
})

const qrCells = computed(() => {
  const seed = `${symbol.value}:${networkKey.value}:${address.value}`
  const cells = []
  for (let i = 0; i < 289; i++) {
    let h = (i + 1) * 2654435761
    for (let j = 0; j < seed.length; j++) {
      h = (h + seed.charCodeAt(j) * (j + 17)) >>> 0
    }
    cells.push((h & 5) !== 0)
  }
  return cells
})

function assetSwatch(sym) {
  const s = String(sym)
  if (s === 'USDC' || s === 'USDT') return 'bg-sky-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]'
  if (s === 'ETH') return 'bg-indigo-500'
  if (s === 'BTC') return 'bg-amber-500'
  return 'bg-white/20'
}

function formatBytes(size) {
  if (!Number.isFinite(size) || size <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
  const value = size / 1024 ** index
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`
}

function resetVoucherPreview() {
  if (depositVoucherPreview.value) {
    URL.revokeObjectURL(depositVoucherPreview.value)
    depositVoucherPreview.value = ''
  }
}

function onPickVoucher(event) {
  const file = event.target.files?.[0] || null
  event.target.value = ''
  if (!file) return
  if (!file.type?.startsWith('image/')) {
    window.alert('请上传图片格式的充值凭证')
    return
  }
  resetVoucherPreview()
  depositVoucher.value = file
  depositVoucherPreview.value = URL.createObjectURL(file)
}

function clearVoucher() {
  depositVoucher.value = null
  resetVoucherPreview()
}

async function copyAddress() {
  try {
    await navigator.clipboard.writeText(address.value)
    copied.value = true
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    copied.value = false
  }
}

function onQuickPay() {
  if (!depositVoucher.value) {
    window.alert('请先上传充值凭证')
    return
  }
  auth.ensureHydrated()
  security.ensureHydrated()
  // 演示：视为提交充值记录；未绑定任一安全方式时引导绑定（与提币校验一致：至少一种）
  if (!security.hasAnyVerifyChannel) {
    securityCheckOpen.value = true
  }
}

onUnmounted(() => {
  window.removeEventListener('storage', refreshMinimumDeposit)
  window.removeEventListener('focus', refreshMinimumDeposit)
  window.removeEventListener(MINIMUM_DEPOSIT_CHANGED, refreshMinimumDeposit)
  if (copyTimer) clearTimeout(copyTimer)
  resetVoucherPreview()
})

/** 与提币页一致 */
const fieldBase =
  'w-full min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.04] text-[#eaecef] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-white/35 hover:border-white/[0.12] focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/30'
const inputBase = `${fieldBase} h-[2.75rem] min-h-[2.75rem] box-border px-3 text-base font-medium leading-normal sm:px-4 sm:text-[15px] lg:rounded-lg`
const labelBase =
  'mb-1 block text-xs font-medium text-white/45 sm:text-[13px] lg:mb-2 lg:text-sm lg:text-white/50'

const addressShell =
  'flex h-[2.75rem] min-h-[2.75rem] w-full min-w-0 items-stretch overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition hover:border-white/[0.12] lg:rounded-lg'
</script>

<template>
  <div v-if="coinMeta" class="min-h-[50vh] min-w-0 text-white">
    <header class="mb-4 hidden md:mb-5 md:block lg:mb-6">
      <h1 class="text-xl font-bold tracking-tight text-white md:text-2xl lg:text-3xl">充币</h1>
      <p class="mt-1 text-sm text-white/55">
        向以下地址转入 <span class="font-medium text-white/85">{{ coinMeta.symbol }}</span>
        ；请确认网络与转出平台一致。演示数据，对接链上后替换。
      </p>
    </header>

    <div
      class="flex flex-col gap-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] lg:max-w-3xl lg:gap-6 lg:pb-8"
    >
      <div
        class="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-3.5 sm:p-4 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0"
      >
        <div class="space-y-3 lg:space-y-5">
          <div class="min-w-0">
            <label :class="labelBase">请选择您要充值的币种</label>
            <FrontSearchablePopoverPicker
              v-model="pickerSymbol"
              field-key="deposit-coin"
              aria-label="充值币种"
              :options="depositCoinOptions"
              panel-hint="搜索或点选充值币种"
              search-placeholder="搜索币种代码，如 BTC、USDC…"
            >
              <template #leading>
                <span
                  class="pointer-events-none grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold leading-none text-white"
                  :class="assetSwatch(coinMeta.symbol)"
                  aria-hidden="true"
                >
                  {{ coinMeta.symbol.slice(0, 1) }}
                </span>
              </template>
            </FrontSearchablePopoverPicker>
          </div>

          <div class="flex justify-center lg:justify-start">
            <div
              class="flex aspect-square w-full max-w-[220px] items-center justify-center rounded-xl border border-white/[0.08] bg-white p-2 sm:max-w-[240px] lg:max-w-[260px] lg:p-3"
            >
              <svg class="h-full w-full" viewBox="0 0 17 17" aria-hidden="true">
                <rect width="17" height="17" fill="#fff" />
                <template v-for="(on, i) in qrCells" :key="i">
                  <rect
                    v-if="on"
                    :x="i % 17"
                    :y="Math.floor(i / 17)"
                    width="1"
                    height="1"
                    fill="#111"
                  />
                </template>
              </svg>
            </div>
          </div>

          <div class="min-w-0">
            <p :class="labelBase">链名称</p>
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
            <label :class="labelBase">地址</label>
            <div :class="addressShell">
              <p
                class="flex min-w-0 flex-1 items-center break-all px-3 font-mono text-[11px] leading-snug text-[#eaecef] sm:text-xs lg:px-4 lg:text-[13px]"
                :title="address"
              >
                {{ shortAddress }}
              </p>
              <button
                type="button"
                class="shrink-0 border-l border-white/[0.08] px-3 text-sm font-semibold text-lime-300 transition hover:bg-lime-400/10 [-webkit-tap-highlight-color:transparent] sm:px-4 sm:text-[15px] lg:text-lime-200"
                @click="copyAddress"
              >
                {{ copied ? '已复制' : '复制' }}
              </button>
            </div>
          </div>

          <div class="min-w-0">
            <label for="deposit-amount" :class="labelBase">充币数量</label>
            <input
              id="deposit-amount"
              aria-describedby="deposit-minimum-hint"
              v-model="depositAmount"
              type="text"
              inputmode="decimal"
              placeholder="请填写充币数量"
              :class="inputBase"
            />
            <p id="deposit-minimum-hint" role="status" class="mt-2 break-words text-xs leading-5 text-white/65 sm:text-sm">
              <template v-if="minimumQuantity !== null">最低充值数量：<span class="font-medium text-lime-300">{{ minimumQuantity }} {{ coinMeta.symbol }}</span>（约 {{ minimumUsdt }} USDT）</template>
              <template v-else>{{ minimumLoadError ? '最低充值金额暂时无法加载' : '当前币种汇率暂不可用，无法计算最低充值数量' }}<button type="button" class="ml-2 inline-flex min-h-11 items-center text-lime-300 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-300" @click="refreshMinimumDeposit">重试</button></template>
            </p>
          </div>

          <div class="min-w-0">
            <label :class="labelBase">上传凭证</label>
            <label
              v-if="!depositVoucher"
              class="grid h-24 w-24 cursor-pointer place-items-center rounded-2xl border border-dashed border-white/[0.14] bg-white/[0.04] text-white/45 transition hover:border-lime-300/45 hover:bg-lime-300/[0.06] hover:text-lime-200 [-webkit-tap-highlight-color:transparent] sm:h-28 sm:w-28 lg:rounded-xl"
              aria-label="上传充值凭证"
            >
              <span class="text-4xl font-light leading-none">+</span>
              <input type="file" accept="image/*" class="hidden" @change="onPickVoucher" />
            </label>

            <div
              v-else
              class="flex min-w-0 gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] lg:max-w-xl lg:rounded-lg"
            >
              <div class="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-white/[0.08] bg-black/30 sm:h-28 sm:w-28">
                <img
                  :src="depositVoucherPreview"
                  :alt="depositVoucher.name"
                  class="h-full w-full object-cover"
                />
              </div>
              <div class="flex min-w-0 flex-1 flex-col justify-between">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-white/90">{{ depositVoucher.name }}</p>
                  <p class="mt-1 text-xs text-white/45">已上传 · {{ formatBytes(depositVoucher.size) }}</p>
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                  <label
                    class="cursor-pointer rounded-full border border-lime-300/35 bg-lime-300/[0.08] px-3 py-1.5 text-xs font-semibold text-lime-100 transition hover:bg-lime-300/[0.14] [-webkit-tap-highlight-color:transparent]"
                  >
                    重传
                    <input type="file" accept="image/*" class="hidden" @change="onPickVoucher" />
                  </label>
                  <button
                    type="button"
                    class="rounded-full border border-white/[0.1] px-3 py-1.5 text-xs font-semibold text-white/55 transition hover:border-white/20 hover:text-white"
                    @click="clearVoucher"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            class="mt-3 border-t border-white/[0.08] pt-3 max-lg:bg-black/15 max-lg:rounded-lg max-lg:px-3 max-lg:py-2.5 lg:mt-2 lg:bg-transparent lg:px-0 lg:pt-5"
          >
            <p class="text-[11px] font-medium text-white/45 sm:text-xs lg:text-sm">重要通知</p>
            <ol
              class="mt-1.5 list-decimal space-y-1 pl-3.5 text-[10px] leading-relaxed text-white/35 sm:space-y-1.5 sm:pl-4 sm:text-[11px] sm:text-white/38 lg:mt-2 lg:space-y-2 lg:text-xs lg:text-white/40"
            >
              <li>请勿向该地址充值非所选网络的资产，否则可能无法找回。</li>
              <li>充值到账需区块确认，时间随网络拥堵变化，请耐心等待。</li>
            </ol>
          </div>
        </div>
      </div>

      <div class="max-lg:mt-1">
        <button
          type="button"
          class="w-full rounded-xl bg-lime-400 py-3 text-base font-semibold text-black transition hover:bg-lime-300 active:scale-[0.99] [-webkit-tap-highlight-color:transparent] sm:py-2.5 sm:text-sm lg:w-auto lg:min-w-[200px] lg:rounded-lg lg:px-8 lg:py-3 lg:text-base"
          @click="onQuickPay"
        >
          提交
        </button>
      </div>
    </div>

    <SecurityCheckDialog
      v-model="securityCheckOpen"
      v-model:phone-bound="phoneBound"
      v-model:email-bound="emailBound"
      v-model:mfa-bound="mfaBound"
      :context-hint="depositSuccessBindHint"
    />
  </div>
</template>
