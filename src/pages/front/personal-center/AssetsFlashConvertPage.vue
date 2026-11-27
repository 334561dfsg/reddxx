<script setup>
import { computed, ref, watch } from 'vue'
import FrontStrokeIcon from '../../../components/front/FrontStrokeIcon.vue'
import FrontSearchablePopoverPicker from '../../../components/front/FrontSearchablePopoverPicker.vue'
import {
  FRONT_DEPOSIT_COINS,
  demoFlashConvertEstimate,
  demoFlashConvertRate
} from '../../../constants/frontAssetCenterDemo'

const paySymbol = ref('USDC')
const receiveSymbol = ref('ETH')
const payAmount = ref('')

const payOptions = computed(() =>
  FRONT_DEPOSIT_COINS.map((c) => ({
    value: c.symbol,
    label: c.symbol,
    hint: '演示可用'
  }))
)

const receiveOptions = computed(() =>
  FRONT_DEPOSIT_COINS.filter((c) => c.symbol !== paySymbol.value).map((c) => ({
    value: c.symbol,
    label: c.symbol
  }))
)

const rateInfo = computed(() => demoFlashConvertRate(paySymbol.value, receiveSymbol.value))

const estimate = computed(() =>
  demoFlashConvertEstimate(paySymbol.value, receiveSymbol.value, payAmount.value)
)

watch(paySymbol, (p) => {
  if (receiveSymbol.value === p) {
    const first = FRONT_DEPOSIT_COINS.find((c) => c.symbol !== p)
    if (first) receiveSymbol.value = first.symbol
  }
})

watch(receiveSymbol, (r) => {
  if (r === paySymbol.value) {
    const first = FRONT_DEPOSIT_COINS.find((c) => c.symbol !== paySymbol.value)
    if (first) receiveSymbol.value = first.symbol
  }
})

function swapPayReceive() {
  const p = paySymbol.value
  const r = receiveSymbol.value
  paySymbol.value = r
  receiveSymbol.value = p
  payAmount.value = ''
}

function assetSwatch(symbol) {
  const s = String(symbol)
  if (s === 'USDC' || s === 'USDT') return 'bg-sky-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]'
  if (s === 'ETH') return 'bg-indigo-500'
  if (s === 'BTC') return 'bg-amber-500'
  return 'bg-white/20'
}

const payCoin = computed(
  () => FRONT_DEPOSIT_COINS.find((c) => c.symbol === paySymbol.value) || FRONT_DEPOSIT_COINS[0]
)
const receiveCoin = computed(() =>
  FRONT_DEPOSIT_COINS.find((c) => c.symbol === receiveSymbol.value) || FRONT_DEPOSIT_COINS[1]
)

function onSubmit() {
  // 演示：对接闪兑 / 聚合报价后替换
}

const card = 'rounded-2xl border border-white/[0.06] bg-white/[0.025]'
const fieldLabel = 'text-[10px] font-medium uppercase tracking-[0.08em] text-white/38'
const amtInputClass =
  'w-full min-h-[2.25rem] border-0 bg-transparent px-0 py-px text-lg font-medium font-mono tabular-nums tracking-tight text-white placeholder:text-white/38 focus:outline-none sm:min-h-10 sm:text-xl lg:text-xl'
const amtFieldWrap =
  'mt-2 rounded-lg border border-white/[0.1] bg-black/25 px-2.5 py-1.5 transition-[border-color,box-shadow,background-color] focus-within:bg-black/35,230,53,0.1)] sm:px-3 sm:py-2 lg:rounded-lg'
const outDisplayWrap =
  'mt-2 rounded-lg border border-white/[0.08] bg-black/20 px-2.5 py-1.5 sm:px-3 sm:py-2'

const pickerWrap = 'w-[8.25rem] min-w-0 shrink-0 sm:w-[9rem]'
</script>

<template>
  <div class="min-h-[50vh] min-w-0 text-white">
    <header class="mb-4 hidden border-b border-white/[0.06] pb-4 md:mb-5 md:block lg:mb-6 lg:pb-5">
      <h1 class="text-xl font-semibold tracking-tight text-white lg:text-[1.35rem]">闪兑</h1>
      <p class="mt-1 max-w-xl text-xs leading-relaxed text-white/42">
        即时兑换数字资产；演示汇率为静态参考，实盘以提交时为准。
      </p>
    </header>

    <div
      class="pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start lg:gap-8 lg:pb-8 xl:grid-cols-[minmax(0,1fr)_19rem]"
    >
      <div class="min-w-0 space-y-4 lg:space-y-5">
        <!-- lg+ 锚点下拉超出卡片底部时，父级 overflow-hidden 会裁切弹层 -->
        <div :class="`${card} max-lg:overflow-hidden lg:overflow-visible`">
          <div class="px-3.5 py-3.5 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
            <div class="flex items-start justify-between gap-3">
              <span :class="fieldLabel + ' pt-0.5'">支付</span>
              <div :class="pickerWrap">
                <FrontSearchablePopoverPicker
                  v-model="paySymbol"
                  field-key="flash-pay"
                  sheet-title="支付币种"
                  aria-label="支付币种"
                  :options="payOptions"
                  panel-hint="卖出"
                  search-placeholder="搜索币种"
                >
                  <template #leading>
                    <span
                      class="pointer-events-none grid h-6 w-6 shrink-0 place-items-center rounded-full text-[9px] font-bold leading-none text-white"
                      :class="assetSwatch(payCoin.symbol)"
                      aria-hidden="true"
                    >
                      {{ payCoin.symbol.slice(0, 1) }}
                    </span>
                  </template>
                  <template #option-leading="{ option }">
                    <span
                      class="pointer-events-none grid h-5 w-5 shrink-0 place-items-center rounded-full text-[8px] font-bold leading-none text-white lg:h-6 lg:w-6 lg:text-[9px]"
                      :class="assetSwatch(option.value)"
                      aria-hidden="true"
                    >
                      {{ String(option.label).slice(0, 1) }}
                    </span>
                  </template>
                </FrontSearchablePopoverPicker>
              </div>
            </div>
            <div :class="amtFieldWrap">
              <label for="flash-pay-amount" class="sr-only">支付数量（{{ paySymbol }}）</label>
              <input
                id="flash-pay-amount"
                v-model="payAmount"
                type="text"
                inputmode="decimal"
                :placeholder="`输入 ${paySymbol} 数量`"
                :class="amtInputClass"
                autocomplete="off"
              />
            </div>
          </div>

          <div class="relative flex justify-center py-0">
            <div
              class="pointer-events-none absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-white/[0.06] sm:left-5 sm:right-5 lg:left-5 lg:right-5"
              aria-hidden="true"
            />
            <button
              type="button"
              class="relative z-[1] flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#050505] bg-white/[0.07] text-lime-200/90 transition hover:border-lime-400/35 hover:bg-lime-400/12 hover:text-lime-50 [-webkit-tap-highlight-color:transparent] sm:h-10 sm:w-10"
              aria-label="交换支付与获得币种"
              @click="swapPayReceive"
            >
              <FrontStrokeIcon name="arrows-swap" size-class="h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]" />
            </button>
          </div>

          <div class="border-t border-white/[0.06] px-3.5 py-3.5 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
            <div class="flex items-start justify-between gap-3">
              <span :class="fieldLabel + ' pt-0.5'">获得</span>
              <div :class="pickerWrap">
                <FrontSearchablePopoverPicker
                  v-model="receiveSymbol"
                  field-key="flash-receive"
                  sheet-title="获得币种"
                  aria-label="获得币种"
                  :options="receiveOptions"
                  panel-hint="买入"
                  search-placeholder="搜索币种"
                >
                  <template #leading>
                    <span
                      class="pointer-events-none grid h-6 w-6 shrink-0 place-items-center rounded-full text-[9px] font-bold leading-none text-white"
                      :class="assetSwatch(receiveCoin.symbol)"
                      aria-hidden="true"
                    >
                      {{ receiveCoin.symbol.slice(0, 1) }}
                    </span>
                  </template>
                  <template #option-leading="{ option }">
                    <span
                      class="pointer-events-none grid h-5 w-5 shrink-0 place-items-center rounded-full text-[8px] font-bold leading-none text-white lg:h-6 lg:w-6 lg:text-[9px]"
                      :class="assetSwatch(option.value)"
                      aria-hidden="true"
                    >
                      {{ String(option.label).slice(0, 1) }}
                    </span>
                  </template>
                </FrontSearchablePopoverPicker>
              </div>
            </div>
            <div :class="outDisplayWrap">
              <p
                class="min-h-[2.125rem] break-all font-mono text-lg font-medium tabular-nums leading-snug tracking-tight text-lime-100/88 sm:min-h-10 sm:text-xl lg:text-xl"
              >
                {{ estimate.receive || '—' }}
              </p>
            </div>
            <p class="mt-2 text-[11px] leading-snug text-white/38">
              {{ rateInfo.ok ? estimate.rateLabel : rateInfo.message }}
            </p>
          </div>
        </div>

        <div
          v-if="rateInfo.ok"
          :class="`${card} px-3.5 py-3 sm:px-4 lg:hidden`"
        >
          <p :class="fieldLabel">参考汇率</p>
          <p class="mt-2 font-mono text-xs font-medium leading-relaxed text-lime-100/85">
            {{ rateInfo.forwardText }}
          </p>
          <p class="mt-1.5 font-mono text-[11px] leading-relaxed text-white/48">
            {{ rateInfo.inverseText }}
          </p>
        </div>
        <div
          v-else
          :class="`${card} px-3.5 py-3 text-sm text-white/42 lg:hidden`"
        >
          {{ rateInfo.message }}
        </div>

        <p class="text-[11px] leading-relaxed text-white/35 lg:max-w-xl">
          演示环境汇价仅供展示；市价与风控可能导致实际成交与预览不同。
        </p>

        <div>
          <button
            type="button"
            class="w-full rounded-lg bg-lime-400 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300 active:scale-[0.99] [-webkit-tap-highlight-color:transparent] lg:w-auto lg:min-w-[11rem] lg:px-8"
            @click="onSubmit"
          >
            闪兑
          </button>
        </div>
      </div>

      <aside
        class="mt-3 hidden min-w-0 lg:sticky lg:top-24 lg:mt-0 lg:block"
        aria-label="参考汇率"
      >
        <div :class="`${card} p-4 xl:p-5`">
          <h2 :class="fieldLabel">参考汇率</h2>

          <template v-if="rateInfo.ok">
            <p class="mt-3 font-mono text-sm font-medium tabular-nums tracking-tight text-white/88">
              {{ paySymbol }}<span class="px-1 text-white/28">/</span>{{ receiveSymbol }}
            </p>

            <div class="mt-4 space-y-3.5 border-t border-white/[0.06] pt-4">
              <div>
                <p class="text-[10px] font-medium text-white/38">基准</p>
                <p
                  class="mt-1 break-words font-mono text-xs font-medium leading-relaxed text-lime-100/88"
                >
                  {{ rateInfo.forwardText }}
                </p>
              </div>
              <div>
                <p class="text-[10px] font-medium text-white/38">反向</p>
                <p class="mt-1 break-words font-mono text-[11px] leading-relaxed text-white/65">
                  {{ rateInfo.inverseText }}
                </p>
              </div>
            </div>
          </template>
          <p v-else class="mt-4 text-sm leading-relaxed text-white/42">
            {{ rateInfo.message }}
          </p>

          <p class="mt-5 border-t border-white/[0.06] pt-4 text-[10px] leading-relaxed text-white/32">
            演示数据，不构成价格承诺。
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>
