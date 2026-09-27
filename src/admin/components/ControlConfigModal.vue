<script setup>
import { Switch } from 'ant-design-vue'
import { AdminButton, AdminInput, AdminSelect, AdminSlider, nativeControl } from './antd/controls.js'

import { computed, reactive, ref, watch } from 'vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  symbol: {
    type: String,
    default: ''
  },
  config: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['close', 'save'])

const defaults = () => ({
  priceOffset: 5,
  offsetDirection: 'random',
  slippagePct: 0.15,
  latencyMs: 50,
  maxLeverage: 100,
  autoTriggerEnabled: true
})

const form = reactive(defaults())
const selectedPreset = ref('custom')

const presetKeys = ['conservative', 'balanced', 'aggressive']

const presetMap = {
  conservative: {
    label: '保守',
    desc: '低干预，优先稳定',
    values: { priceOffset: 2, offsetDirection: 'random', slippagePct: 0.1, latencyMs: 30, maxLeverage: 75 }
  },
  balanced: {
    label: '均衡',
    desc: '默认建议配置',
    values: { priceOffset: 5, offsetDirection: 'random', slippagePct: 0.2, latencyMs: 80, maxLeverage: 100 }
  },
  aggressive: {
    label: '激进',
    desc: '高干预，快速控险',
    values: { priceOffset: 10, offsetDirection: 'against', slippagePct: 0.35, latencyMs: 150, maxLeverage: 50 }
  }
}

const nearlyEqual = (a, b, eps = 1e-6) => Math.abs(Number(a) - Number(b)) <= eps

const detectPreset = () => {
  const keys = ['conservative', 'balanced', 'aggressive']
  for (const key of keys) {
    const p = presetMap[key].values
    if (
      form.offsetDirection === p.offsetDirection &&
      nearlyEqual(form.priceOffset, p.priceOffset) &&
      nearlyEqual(form.slippagePct, p.slippagePct) &&
      nearlyEqual(form.latencyMs, p.latencyMs) &&
      nearlyEqual(form.maxLeverage, p.maxLeverage)
    ) {
      return key
    }
  }
  return 'custom'
}

const hydrateForm = (next = {}) => {
  const value = { ...defaults(), ...next }
  form.priceOffset = Number(value.priceOffset)
  form.offsetDirection = value.offsetDirection
  form.slippagePct = Number(value.slippagePct)
  form.latencyMs = Number(value.latencyMs)
  form.maxLeverage = Number(value.maxLeverage)
  form.autoTriggerEnabled = Boolean(value.autoTriggerEnabled)
}

watch(
  () => [props.open, props.config],
  ([isOpen]) => {
    if (isOpen) {
      hydrateForm(props.config)
      selectedPreset.value = detectPreset()
    }
  },
  { immediate: true }
)

const clamp = (val, min, max) => Math.min(max, Math.max(min, Number(val || 0)))

const normalize = () => {
  form.priceOffset = clamp(form.priceOffset, 0, 50)
  form.slippagePct = clamp(form.slippagePct, 0, 2)
  form.latencyMs = clamp(form.latencyMs, 0, 5000)
  form.maxLeverage = clamp(form.maxLeverage, 1, 125)
}

const applyPreset = (preset) => {
  const values = presetMap[preset]?.values
  if (!values) return
  form.priceOffset = values.priceOffset
  form.offsetDirection = values.offsetDirection
  form.slippagePct = values.slippagePct
  form.latencyMs = values.latencyMs
  form.maxLeverage = values.maxLeverage
  selectedPreset.value = preset
}

const selectPreset = (preset) => {
  if (!presetMap[preset]) return
  applyPreset(preset)
}

watch(
  () => [form.priceOffset, form.offsetDirection, form.slippagePct, form.latencyMs, form.maxLeverage],
  () => {
    selectedPreset.value = detectPreset()
  }
)

const riskScore = computed(() => {
  const score = form.maxLeverage * 0.35 + form.slippagePct * 55 + form.priceOffset * 1.2 + form.latencyMs * 0.04
  return Math.round(score)
})

const riskLabel = computed(() => {
  if (riskScore.value < 45) return { text: '低风险', className: 'text-emerald-600' }
  if (riskScore.value < 75) return { text: '中风险', className: 'text-amber-600' }
  return { text: '高风险', className: 'text-rose-600' }
})

const summary = computed(() => {
  const directionText = {
    random: '随机偏移',
    up: '向上偏移',
    down: '向下偏移',
    against: '逆势偏移'
  }[form.offsetDirection] || '随机偏移'
  return [
    `价格偏移: ${form.priceOffset} 点 (${directionText})`,
    `滑点率: ${form.slippagePct.toFixed(2)}%`,
    `成交延迟: ${form.latencyMs}ms`,
    `杠杆上限: ${form.maxLeverage}x`,
    `自动触发规则: ${form.autoTriggerEnabled ? '启用' : '关闭'}`
  ]
})

// 示例计算
const examplePrice = 50000 // BTC示例价格
const exampleAmount = 1 // 示例数量

const exampleCalc = computed(() => {
  const basePrice = examplePrice
  const offset = form.priceOffset
  let adjustedPrice = basePrice

  // 根据偏移方向计算价格
  if (form.offsetDirection === 'up') {
    adjustedPrice = basePrice + offset
  } else if (form.offsetDirection === 'down') {
    adjustedPrice = basePrice - offset
  } else if (form.offsetDirection === 'random') {
    adjustedPrice = basePrice + (Math.random() > 0.5 ? offset : -offset)
  } else if (form.offsetDirection === 'against') {
    adjustedPrice = basePrice - offset // 假设逆势
  }

  // 计算滑点影响
  const slippageAmount = adjustedPrice * (form.slippagePct / 100)
  const finalPrice = adjustedPrice + slippageAmount

  // 计算实际成本
  const baseCost = basePrice * exampleAmount
  const actualCost = finalPrice * exampleAmount
  const difference = actualCost - baseCost
  const differencePercent = ((difference / baseCost) * 100).toFixed(2)

  return {
    basePrice: basePrice.toFixed(2),
    adjustedPrice: adjustedPrice.toFixed(2),
    slippageAmount: slippageAmount.toFixed(2),
    finalPrice: finalPrice.toFixed(2),
    baseCost: baseCost.toFixed(2),
    actualCost: actualCost.toFixed(2),
    difference: difference.toFixed(2),
    differencePercent,
    delayTime: form.latencyMs
  }
})

// 数据计算预览
const calculatedPreview = computed(() => {
  const basePrice = examplePrice
  const offset = Number(form.priceOffset || 0)
  const slippage = Number(form.slippagePct || 0) / 100

  // 根据偏移方向计算价格
  let buyPrice = basePrice
  let sellPrice = basePrice

  if (form.offsetDirection === 'against') {
    // 逆势：买入价提高，卖出价降低
    buyPrice = basePrice + offset
    sellPrice = basePrice - offset
  } else if (form.offsetDirection === 'up') {
    // 向上偏移：买入价提高，卖出价提高
    buyPrice = basePrice + offset
    sellPrice = basePrice + offset
  } else if (form.offsetDirection === 'down') {
    // 向下偏移：买入价降低，卖出价降低
    buyPrice = basePrice - offset
    sellPrice = basePrice - offset
  } else {
    // 随机：保持市场价
    buyPrice = basePrice
    sellPrice = basePrice
  }

  // 加上滑点影响
  const buySlippage = buyPrice * slippage
  const sellSlippage = sellPrice * slippage

  // 基于 10,000 USDT 的成本影响分析
  const orderAmount = 10000
  const btcAmount = orderAmount / basePrice

  // 价格偏移成本（买卖双向平均）
  const priceOffsetCost = Math.abs((buyPrice - basePrice) + (basePrice - sellPrice)) * btcAmount / 2

  // 滑点成本
  const slippageCost = (buySlippage + sellSlippage) * btcAmount / 2

  // 总额外成本
  const totalExtraCost = priceOffsetCost + slippageCost
  const totalExtraCostPct = (totalExtraCost / orderAmount) * 100

  return {
    buyPrice: buyPrice + buySlippage,
    sellPrice: sellPrice - sellSlippage,
    priceOffsetCost,
    slippageCost,
    totalExtraCost,
    totalExtraCostPct
  }
})

const save = () => {
  normalize()
  emit('save', {
    priceOffset: Number(form.priceOffset),
    offsetDirection: form.offsetDirection,
    slippagePct: Number(form.slippagePct),
    latencyMs: Number(form.latencyMs),
    maxLeverage: Number(form.maxLeverage),
    autoTriggerEnabled: Boolean(form.autoTriggerEnabled)
  })
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
    <section class="flex h-[88vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl">
      <!-- 左侧配置区域 -->
      <div class="flex w-3/5 flex-col border-r border-slate-200">
        <header class="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-4">
          <div>
            <h2 class="text-xl font-semibold text-slate-900">配置 {{ symbol }} 线控参数</h2>
            <p class="mt-0.5 text-xs text-slate-500">调整参数后可在右侧查看实时影响</p>
          </div>
          <AdminButton type="button" class="text-2xl text-slate-400 hover:text-slate-600 transition-colors" @click="emit('close')">×</AdminButton>
        </header>

        <div class="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <!-- 快速预设 -->
          <section class="space-y-4 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80">
                  <svg class="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div class="flex-1">
                  <h3 class="text-base font-semibold text-slate-900">快速预设</h3>
                  <p class="text-xs text-slate-600">选择预设方案快速配置</p>
                </div>
              </div>
              <span class="rounded-lg px-2.5 py-1 text-xs font-bold shadow-sm"
                :class="{
                  'bg-gradient-to-r from-rose-500 to-pink-500 text-white': riskLabel.text === '高风险',
                  'bg-gradient-to-r from-amber-500 to-orange-500 text-white': riskLabel.text === '中风险',
                  'bg-gradient-to-r from-emerald-500 to-teal-500 text-white': riskLabel.text === '低风险'
                }"
              >
                {{ riskLabel.text === '高风险' ? '⚠ 高风险' : riskLabel.text === '中风险' ? '⚠ 中风险' : '✓ 低风险' }}
              </span>
            </div>

            <!-- 预设选项 -->
            <div class="grid gap-3 sm:grid-cols-3">
              <AdminButton
                v-for="key in presetKeys"
                :key="key"
                type="button"
                class="group relative overflow-hidden rounded-lg border p-3 text-left transition-all hover:shadow-md"
                :class="selectedPreset === key ? 'border-white bg-white shadow-md ring-2 ring-blue-500' : 'border-white/60 bg-white/60 hover:bg-white/80'"
                @click="selectPreset(key)"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-slate-900">{{ presetMap[key].label }}</p>
                    <p class="mt-1 text-xs text-slate-600">{{ presetMap[key].desc }}</p>
                  </div>
                  <span
                    class="ml-2 mt-0.5 h-3 w-3 flex-shrink-0 rounded-full border-2 transition-colors"
                    :class="selectedPreset === key ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white group-hover:border-slate-400'"
                  />
                </div>
              </AdminButton>
            </div>

            <p class="text-xs text-slate-600">
              <svg class="inline h-3 w-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              点选预设会覆盖当前参数；手动修改任一参数会自动切换为"自定义"
            </p>
          </section>

          <!-- 价格控制 -->
          <section class="space-y-4 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-5 shadow-sm">
            <div class="flex items-center gap-2">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
                <svg class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-base font-semibold text-slate-900">价格控制</h3>
                <p class="text-xs text-slate-600">影响用户看到的价格</p>
              </div>
            </div>

            <div class="space-y-4 rounded-lg bg-white p-4">
              <label class="block space-y-2">
                <div class="flex items-center justify-between text-sm">
                  <span class="font-medium text-slate-700">价格偏移 (点)</span>
                  <AdminInput
                    v-model.number="form.priceOffset"
                    type="number"
                    min="0"
                    max="50"
                    class="ant-input !w-20 !h-8 !px-2 !text-right"
                  />
                </div>
                <AdminSlider v-model.number="form.priceOffset" min="0" max="50" step="1" class="w-full accent-blue-600" />
                <p class="text-xs text-slate-500 font-medium">范围 0-50，建议先从 3-10 点测试</p>
              </label>

              <label class="block space-y-2">
                <span class="text-sm font-medium text-slate-700">偏移方向</span>
                <AdminSelect v-model="form.offsetDirection" class="ant-select">
                  <option value="random">随机偏移</option>
                  <option value="against">逆势偏移</option>
                  <option value="up">向上偏移</option>
                  <option value="down">向下偏移</option>
                </AdminSelect>
              </label>
            </div>
          </section>

          <!-- 成交控制 -->
          <section class="space-y-4 rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50 p-5 shadow-sm">
            <div class="flex items-center gap-2">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
                <svg class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-base font-semibold text-slate-900">成交控制</h3>
                <p class="text-xs text-slate-600">影响订单成交质量和速度</p>
              </div>
            </div>

            <div class="space-y-4 rounded-lg bg-white p-4">
              <label class="block space-y-2">
                <div class="flex items-center justify-between text-sm">
                  <span class="font-medium text-slate-700">滑点率 (%)</span>
                  <AdminInput
                    v-model.number="form.slippagePct"
                    type="number"
                    min="0"
                    max="2"
                    step="0.01"
                    class="ant-input !w-20 !h-8 !px-2 !text-right"
                  />
                </div>
                <AdminSlider v-model.number="form.slippagePct" min="0" max="2" step="0.01" class="w-full accent-violet-600" />
              </label>

              <label class="block space-y-2">
                <div class="flex items-center justify-between text-sm">
                  <span class="font-medium text-slate-700">成交延迟 (ms)</span>
                  <AdminInput
                    v-model.number="form.latencyMs"
                    type="number"
                    min="0"
                    max="5000"
                    step="10"
                    class="ant-input !w-20 !h-8 !px-2 !text-right"
                  />
                </div>
                <AdminSlider v-model.number="form.latencyMs" min="0" max="5000" step="10" class="w-full accent-violet-600" />
              </label>
            </div>
          </section>

          <!-- 杠杆限制 -->
          <section class="space-y-4 rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm">
            <div class="flex items-center gap-2">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500">
                <svg class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-base font-semibold text-slate-900">杠杆限制</h3>
                <p class="text-xs text-slate-600">限制该合约可使用的最大杠杆倍数</p>
              </div>
            </div>

            <div class="space-y-4 rounded-lg bg-white p-4">
              <label class="block space-y-2">
                <div class="flex items-center justify-between text-sm">
                  <span class="font-medium text-slate-700">最大杠杆限制</span>
                  <AdminInput
                    v-model.number="form.maxLeverage"
                    type="number"
                    min="1"
                    max="125"
                    step="1"
                    class="ant-input !w-20 !h-8 !px-2 !text-right"
                  />
                </div>
                <AdminSlider v-model.number="form.maxLeverage" min="1" max="125" step="1" class="w-full accent-amber-600" />
                <p class="text-xs text-slate-500 font-medium">范围 1-125x，保存后对新开仓位生效</p>
              </label>
            </div>
          </section>

          <!-- 自动触发 -->
          <section class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                  <svg class="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div class="flex-1">
                  <h3 class="text-base font-semibold text-slate-900">启用自动触发规则</h3>
                </div>
              </div>
              <Switch v-model:checked="form.autoTriggerEnabled" aria-label="启用自动触发规则" />
            </div>
          </section>
        </div>

        <footer class="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <AdminButton type="button" class="ant-btn !h-10 !px-6" @click="emit('close')">取消</AdminButton>
          <AdminButton type="button" class="ant-btn ant-btn-primary !h-10 !px-8" @click="save">保存配置</AdminButton>
        </footer>
      </div>
      <!-- 右侧数据计算预览 -->
      <div class="flex w-2/5 flex-col bg-gradient-to-br from-slate-50 to-slate-100">
        <header class="border-b border-slate-200 px-5 py-4">
          <h3 class="text-lg font-semibold text-slate-900">实时预览</h3>
          <p class="mt-0.5 text-xs text-slate-500">调整参数后即时显示效果</p>
        </header>

        <div class="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <!-- 配置概览 -->
          <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-semibold text-slate-900">配置概览</h4>
              <span class="rounded-md px-2 py-1 text-xs font-medium" :class="form.autoTriggerEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'">
                {{ form.autoTriggerEnabled ? '自动触发' : '手动触发' }}
              </span>
            </div>
            <div class="mt-3 space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-500">作用合约</span>
                <span class="font-medium text-slate-900">{{ props.symbol || 'BTC/USDT' }}</span>
              </div>
              <div class="pt-2 border-t border-slate-100">
                <div class="flex items-start gap-1.5 text-xs">
                  <svg class="h-3.5 w-3.5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <span class="font-medium text-slate-700">影响参数: </span>
                    <span class="text-slate-600">
                      {{ (() => {
                        const affects = [];
                        if (Number(form.priceOffset) > 0) affects.push('价格偏移');
                        if (Number(form.slippagePct) > 0) affects.push('滑点');
                        if (Number(form.latencyMs) > 0) affects.push('延迟');
                        return affects.length > 0 ? affects.join('、') : '无影响';
                      })() }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 数据计算预览 -->
          <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-semibold text-emerald-900">数据计算预览</h4>
              <span
                class="rounded-md px-2 py-1 text-xs font-medium"
                :class="{
                  'bg-rose-100 text-rose-700': riskScore >= 75,
                  'bg-amber-100 text-amber-700': riskScore >= 45 && riskScore < 75,
                  'bg-emerald-100 text-emerald-700': riskScore < 45
                }"
              >
                {{ riskScore >= 75 ? '高风险' : riskScore >= 45 ? '中风险' : '低风险' }}
              </span>
            </div>
            <div class="mt-3 space-y-3">
              <!-- 价格影响 -->
              <div class="rounded-md border border-emerald-200 bg-white p-3">
                <p class="text-xs font-medium text-slate-500">基于模拟价格计算</p>
                <div class="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p class="text-xs text-slate-500">市场价</p>
                    <p class="mt-1 text-sm font-bold text-slate-900">${{ examplePrice.toLocaleString() }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-rose-600">用户买入价</p>
                    <p class="mt-1 text-sm font-bold text-rose-600">${{ calculatedPreview.buyPrice.toFixed(2) }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-emerald-600">用户卖出价</p>
                    <p class="mt-1 text-sm font-bold text-emerald-600">${{ calculatedPreview.sellPrice.toFixed(2) }}</p>
                  </div>
                </div>
              </div>

              <!-- 成本影响分析 -->
              <div class="rounded-md border border-emerald-200 bg-white p-3">
                <p class="text-xs font-medium text-slate-500">10,000 USDT 订单成本影响</p>
                <div class="mt-2 space-y-1.5">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-slate-600">价格偏移成本</span>
                    <span class="font-semibold text-slate-900">${{ calculatedPreview.priceOffsetCost.toFixed(2) }}</span>
                  </div>
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-slate-600">滑点成本</span>
                    <span class="font-semibold text-slate-900">${{ calculatedPreview.slippageCost.toFixed(2) }}</span>
                  </div>
                  <div class="flex items-center justify-between rounded bg-rose-50 px-2 py-1 text-xs border-t border-emerald-200 pt-1.5">
                    <span class="font-medium text-rose-700">总额外成本</span>
                    <span class="font-bold text-rose-700">${{ calculatedPreview.totalExtraCost.toFixed(2) }} ({{ calculatedPreview.totalExtraCostPct.toFixed(3) }}%)</span>
                  </div>
                </div>
              </div>

              <!-- 执行延迟 -->
              <div class="rounded-md border border-emerald-200 bg-white p-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <svg class="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="text-xs font-medium text-slate-500">执行延迟</span>
                  </div>
                  <span class="text-sm font-bold text-amber-700">{{ form.latencyMs }}ms</span>
                </div>
              </div>

              <!-- 风险指标 -->
              <div class="rounded-md border border-emerald-200 bg-white p-3">
                <p class="text-xs font-medium text-slate-500">风险指标</p>
                <div class="mt-2 space-y-2">
                  <div class="text-xs">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-slate-600">综合风险评分</span>
                      <span class="font-semibold text-slate-900">{{ riskScore }}</span>
                    </div>
                    <div class="text-xs text-slate-500">
                      <span v-if="riskScore < 45">✓ 参数配置较为温和，对用户体验影响较小</span>
                      <span v-else-if="riskScore < 75">⚠ 参数配置会明显影响交易成本</span>
                      <span v-else>⚠ 参数配置较为激进，建议谨慎使用</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 效果说明 -->
          <div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div class="flex items-start gap-2">
              <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
              <div class="text-xs text-amber-900">
                <p class="font-medium">提示</p>
                <p class="mt-1">配置生效后，系统将自动应用上述线控参数，影响用户的交易体验。请谨慎配置各项参数值。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
