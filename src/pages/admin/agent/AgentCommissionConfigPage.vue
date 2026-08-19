<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  mockAgentCommissionConfig,
  agentCommissionApi,
  normalizeAgentGlobalCommission
} from '../../../admin/mock/agentCommission'
import {
  DEFAULT_AGENT_GLOBAL_COMMISSION,
  normalizeAgentLineRate,
  AGENT_SETTLEMENT_CYCLE,
  AGENT_SETTLEMENT_CYCLE_OPTIONS,
  AGENT_SETTLEMENT_WEEKDAY_OPTIONS,
  getAgentSettlementScheduleSummary,
  getAgentSettlementNotifyLine
} from '../../../admin/constants/agentCommission'
import { REFERRAL_COMMISSION_CREDIT_TO_OPTIONS } from '../../../admin/constants/referral'

const config = ref(normalizeAgentGlobalCommission({ ...mockAgentCommissionConfig }))
/** 记佣规则 | 佣金结算 */
const activeTab = ref('rules')
const isSaving = ref(false)
const demoBaseAmount = ref(10000)

const settlementScheduleLine = computed(() => getAgentSettlementScheduleSummary(config.value))
const settlementNotifyLine = computed(() => getAgentSettlementNotifyLine(config.value))
const currentCycleOption = computed(() =>
  AGENT_SETTLEMENT_CYCLE_OPTIONS.find((o) => o.value === config.value.agentSettlementCycle)
)

const PRODUCT_LINES = [
  {
    key: 'deposit',
    enabledKey: 'agentDepositCommissionEnabled',
    rateKey: 'agentDepositCommissionRate',
    title: '充值',
    baseDesc:
      '计佣基数 A = 代理名下客户该笔充值业务向客户实收并记入「充值手续费」的 USDT 金额；本笔无手续费则 A = 0。',
    formula: '佣金 = A × r',
    firstDepositExtra: true,
    theme: 'blue'
  },
  {
    key: 'perpetual',
    enabledKey: 'agentPerpetualCommissionEnabled',
    rateKey: 'agentPerpetualCommissionRate',
    title: '永续合约',
    baseDesc:
      '计佣基数 A = 代理名下客户该笔永续订单实收的交易手续费 USDT 金额；交易类产品按该笔订单实收的交易手续费记佣，本笔无手续费则 A = 0。',
    formula: '佣金 = A × r',
    theme: 'indigo'
  },
  {
    key: 'delivery',
    enabledKey: 'agentDeliveryCommissionEnabled',
    rateKey: 'agentDeliveryCommissionRate',
    title: '交割合约',
    baseDesc:
      '计佣基数 A = 代理名下客户该笔交割合约订单自开仓至持仓全部了结并完成交割结算期间实收的交易手续费 USDT 金额之总和；不包含已实现盈亏、保证金及其它非手续费科目；无手续费则 A = 0。',
    formula: '佣金 = A × r',
    theme: 'violet'
  },
  {
    key: 'spot',
    enabledKey: 'agentSpotCommissionEnabled',
    rateKey: 'agentSpotCommissionRate',
    title: '现货',
    baseDesc:
      '计佣基数 A = 代理名下客户该笔现货订单实收的交易手续费 USDT 金额；交易类产品按该笔订单实收的交易手续费记佣，本笔无手续费则 A = 0。',
    formula: '佣金 = A × r',
    theme: 'orange'
  },
  {
    key: 'aiQuant',
    enabledKey: 'agentAiQuantCommissionEnabled',
    rateKey: 'agentAiQuantCommissionRate',
    title: 'AI 量化',
    baseDesc:
      '计佣基数 A = 代理名下客户该笔 AI 量化订单实收的认购手续费、违约手续费等 USDT 手续费金额之和；理财类及产品策略按认购手续费、违约手续费记佣。',
    formula: '佣金 = A × r',
    theme: 'amber'
  },
  {
    key: 'portfolio',
    enabledKey: 'agentPortfolioCommissionEnabled',
    rateKey: 'agentPortfolioCommissionRate',
    title: '投资组合',
    baseDesc:
      '计佣基数 A = 代理名下客户该笔投资组合订单实收的认购手续费、提前赎回违约手续费等 USDT 手续费金额之和；无手续费则 A = 0。',
    formula: '佣金 = A × r',
    theme: 'cyan'
  },
  {
    key: 'lending',
    enabledKey: 'agentLendingCommissionEnabled',
    rateKey: 'agentLendingCommissionRate',
    title: '理财产品',
    baseDesc:
      '计佣基数 A = 代理名下客户该笔理财订单实收的认购手续费、提前退出或违约手续费等 USDT 手续费金额之和；理财类产品不按本金记佣。',
    formula: '佣金 = A × r',
    theme: 'emerald'
  },
  {
    key: 'borrowing',
    enabledKey: 'agentBorrowingCommissionEnabled',
    rateKey: 'agentBorrowingCommissionRate',
    title: '借贷产品',
    baseDesc:
      '计佣基数 A = 代理名下客户该笔借贷订单实收的认购手续费、违约手续费、逾期违约金等 USDT 手续费金额之和；无手续费则 A = 0。',
    formula: '佣金 = A × r',
    theme: 'rose'
  }
]

const PRODUCT_GROUPS = [
  { id: 'fund', name: '入金', blurb: '含链上与站内 USDT 充值', lineKeys: ['deposit'] },
  { id: 'trade', name: '交易', blurb: '合约与现货订单', lineKeys: ['perpetual', 'delivery', 'spot'] },
  { id: 'fin', name: '产品与策略', blurb: '量化、投资组合、理财、借贷', lineKeys: ['aiQuant', 'portfolio', 'lending', 'borrowing'] }
]

const BORDER_ACCENT = {
  blue: 'border-l-blue-500',
  indigo: 'border-l-indigo-500',
  violet: 'border-l-violet-500',
  orange: 'border-l-orange-500',
  amber: 'border-l-amber-500',
  cyan: 'border-l-cyan-500',
  emerald: 'border-l-emerald-500',
  rose: 'border-l-rose-500'
}

function lineByKey(key) {
  return PRODUCT_LINES.find((p) => p.key === key)
}

function linesInGroup(group) {
  return group.lineKeys.map((k) => lineByKey(k)).filter(Boolean)
}

function groupGridClass(group) {
  const n = group.lineKeys.length
  if (n <= 1) return 'grid-cols-1'
  if (n === 2) return 'grid-cols-1 md:grid-cols-2'
  return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
}

function rateNum(line) {
  return parseFloat(normalizeAgentLineRate(config.value[line.rateKey]))
}

function setRate(line, raw) {
  config.value[line.rateKey] = normalizeAgentLineRate(raw)
}

function formatUsdt(n) {
  const x = Number(n)
  if (Number.isNaN(x)) return '—'
  return x.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function previewCommission(line, base) {
  const b = Number(base)
  if (Number.isNaN(b) || b <= 0) return null
  const r = rateNum(line)
  return b * r
}

function isLineEnabled(line) {
  return config.value[line.enabledKey] === true
}

function toggleLine(line) {
  config.value[line.enabledKey] = !config.value[line.enabledKey]
}

const loadConfig = async () => {
  try {
    const result = await agentCommissionApi.getAgentCommissionConfig()
    if (result.success) {
      config.value = normalizeAgentGlobalCommission(result.data)
    }
  } catch (error) {
    console.error('Failed to load agent commission config:', error)
  }
}

const saveConfig = async () => {
  const validateOne = (rateStr) => {
    const n = parseFloat(normalizeAgentLineRate(rateStr))
    return !Number.isNaN(n) && n >= 0 && n <= 1
  }

  for (const line of PRODUCT_LINES) {
    if (!config.value[line.enabledKey]) continue
    config.value[line.rateKey] = normalizeAgentLineRate(config.value[line.rateKey])
    if (!validateOne(config.value[line.rateKey])) {
      alert(`「${line.title}」已开启记佣：比例须为 0～1 之间的小数。`)
      return
    }
  }

  for (const line of PRODUCT_LINES) {
    if (config.value[line.enabledKey]) continue
    const raw = config.value[line.rateKey]
    if (raw != null && String(raw).trim() && !validateOne(raw)) {
      alert(`「${line.title}」比例格式有误，请修正后再保存。`)
      return
    }
  }

  const payload = normalizeAgentGlobalCommission({ ...config.value })

  isSaving.value = true
  try {
    const result = await agentCommissionApi.updateAgentCommissionConfig(payload)
    if (result.success) {
      alert(result.message)
    }
  } catch (error) {
    alert('保存失败：' + error.message)
  } finally {
    isSaving.value = false
  }
}

const resetConfig = () => {
  if (confirm('确认重置为代理记佣默认配置？')) {
    config.value = normalizeAgentGlobalCommission({ ...DEFAULT_AGENT_GLOBAL_COMMISSION })
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<template>
  <div class="w-full min-w-0 space-y-8 pb-8">
    <header class="flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0 flex-1">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">代理记佣配置</h1>
        <p class="mt-2 text-sm leading-relaxed text-slate-600">
          配置各产品线代理一级分佣比例 r、代理线全局开关，以及账期佣金结算（单周/双周/月度）、入账与结算后通知。使用下方 Tab 切换；本页为全站默认，单个代理可在代理列表「记佣配置」中覆盖。
        </p>
        <p class="mt-2 text-sm leading-relaxed text-slate-600">
          「记佣规则」步骤：<span class="font-medium text-slate-800">① 理解计佣公式</span> →
          <span class="font-medium text-slate-800">② 代理线全局规则</span> →
          <span class="font-medium text-slate-800">③ 各产品线一级比例</span>。
        </p>
      </div>
      <div class="flex shrink-0 gap-2">
        <button type="button" class="ant-btn" @click="resetConfig">重置为默认</button>
        <button type="button" class="ant-btn ant-btn-primary" :disabled="isSaving" @click="saveConfig">
          {{ isSaving ? '保存中…' : '保存配置' }}
        </button>
      </div>
    </header>

    <nav class="flex gap-0 border-b border-slate-200" aria-label="代理记佣配置分区">
      <button
        type="button"
        class="-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors"
        :class="
          activeTab === 'rules'
            ? 'border-blue-600 text-blue-700'
            : 'border-transparent text-slate-500 hover:text-slate-800'
        "
        @click="activeTab = 'rules'"
      >
        记佣规则
      </button>
      <button
        type="button"
        class="-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors"
        :class="
          activeTab === 'settlement'
            ? 'border-blue-600 text-blue-700'
            : 'border-transparent text-slate-500 hover:text-slate-800'
        "
        @click="activeTab = 'settlement'"
      >
        佣金结算
      </button>
    </nav>

    <div v-show="activeTab === 'rules'" class="space-y-8">
    <section class="rounded-xl border border-slate-200 bg-white">
      <div class="flex items-baseline gap-2 border-b border-slate-100 px-5 py-4">
        <span class="text-xs font-semibold text-slate-400">①</span>
        <h2 class="text-base font-semibold text-slate-900">计佣公式</h2>
      </div>
      <div class="grid gap-6 p-5 lg:grid-cols-2 lg:gap-8">
        <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">核心式（代理线）</p>
          <p class="mt-3 font-mono text-sm leading-relaxed text-slate-900">
            <span class="text-violet-600">佣金</span>
            <span class="mx-2 text-slate-400">=</span>
            <span class="text-sky-600">A</span>
            <span class="mx-2 text-slate-400">×</span>
            <span class="text-emerald-600">r</span>
          </p>
          <p class="mt-3 text-xs leading-relaxed text-slate-600">
            <strong class="text-slate-700">A</strong>：本条业务单实收手续费形成的计佣基数，币种为 USDT；各产品线对 A 的取值定义见下方对应卡片，每条订单对应一个 A。<br />
            <strong class="text-slate-700">r</strong>：该产品线下代理的一级分佣比例，取值范围为闭区间 [0, 1]；例如 0.1 表示 10%。
          </p>
        </div>
        <div class="text-sm leading-relaxed text-slate-600">
          <p class="font-medium text-slate-800">操作要点</p>
          <ul class="mt-3 space-y-2.5">
            <li class="flex gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
              <span>每条产品线可单独关闭记佣；关闭后该业务不产生代理线佣金（比例可保留）。</span>
            </li>

            <li class="flex gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
              <span>
                下方示例使用统一的假设基数，仅用于核对「A × r」的乘法关系；线上环境每一条真实订单单独计算，其 A
                取自账务系统为该笔订单记录的实收手续费。
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white">
      <div class="flex items-baseline gap-2 border-b border-slate-100 px-5 py-4">
        <span class="text-xs font-semibold text-slate-400">②</span>
        <h2 class="text-base font-semibold text-slate-900">代理线全局规则</h2>
        <p class="mt-1 text-xs text-slate-500">仅影响代理渠道分佣与结算。</p>
      </div>
      <div class="divide-y divide-slate-100">
        <div class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm font-medium text-slate-900">仅首笔充值参与代理线记佣</p>
            <p class="mt-1 text-sm text-slate-500">
              仅作用于「充值」产品线：开启时，代理名下客户仅其第一笔充值成功订单参与本条线的 A 与佣金计算；该客户后续充值订单不参与本条线记佣。
            </p>
          </div>
          <button
            type="button"
            :class="config.agentCommissionDepositFirstOnly ? 'bg-blue-600' : 'bg-slate-200'"
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none"
            @click="config.agentCommissionDepositFirstOnly = !config.agentCommissionDepositFirstOnly"
          >
            <span
              :class="config.agentCommissionDepositFirstOnly ? 'translate-x-5' : 'translate-x-0'"
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition"
            />
          </button>
        </div>
      </div>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white">
      <div class="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-baseline gap-2">
          <span class="text-xs font-semibold text-slate-400">③</span>
          <div>
            <h2 class="text-base font-semibold text-slate-900">产品线 · 代理记佣（全局默认）</h2>
            <p class="mt-0.5 text-sm text-slate-500">
              代理线仅一级分佣：每条产品线一个比例 r。新代理默认使用本页数值；单个代理可在代理列表中覆盖。
            </p>
          </div>
        </div>
        <div class="flex flex-col gap-1 sm:items-end">
          <label class="flex items-center gap-2 text-sm text-slate-600">
            <span class="whitespace-nowrap">示例手续费基数（USDT）</span>
            <input
              v-model.number="demoBaseAmount"
              type="number"
              min="0"
              step="100"
              class="ant-input w-36 text-right"
            />
          </label>
          <span class="text-xs text-slate-400">示例佣金 = 基数 × r</span>
        </div>
      </div>

      <div class="space-y-10 p-5">
        <div v-for="group in PRODUCT_GROUPS" :key="group.id">
          <div class="mb-4 flex flex-wrap items-end gap-2 border-b border-slate-100 pb-2">
            <h3 class="text-sm font-semibold text-slate-900">{{ group.name }}</h3>
            <span class="text-xs text-slate-500">{{ group.blurb }}</span>
          </div>

          <div class="grid w-full gap-4" :class="groupGridClass(group)">
            <div
              v-for="line in linesInGroup(group)"
              :key="line.key"
              class="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
              :class="['border-l-4', BORDER_ACCENT[line.theme]]"
            >
              <div class="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-4 py-3">
                <div class="min-w-0">
                  <h4 class="text-sm font-semibold text-slate-900">{{ line.title }}</h4>
                  <p class="mt-1 text-xs leading-snug text-slate-600">{{ line.baseDesc }}</p>
                </div>
                <div class="flex shrink-0 flex-col items-end gap-0.5">
                  <span class="text-[10px] font-medium uppercase tracking-wide text-slate-400">记佣</span>
                  <button
                    type="button"
                    :class="isLineEnabled(line) ? 'bg-blue-600' : 'bg-slate-200'"
                    class="relative inline-flex h-6 w-11 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none"
                    @click="toggleLine(line)"
                  >
                    <span
                      :class="isLineEnabled(line) ? 'translate-x-5' : 'translate-x-0'"
                      class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition"
                    />
                  </button>
                </div>
              </div>

              <div class="flex flex-1 flex-col p-4" :class="{ 'bg-slate-50/40': !isLineEnabled(line) }">
                <div class="rounded border border-slate-100 bg-white px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-700">
                  {{ line.formula }}
                  <span v-if="line.firstDepositExtra && line.key === 'deposit'" class="mt-1 block text-slate-500">
                    已开启「仅首笔充值」时：仅代理名下客户第一笔充值成功订单产生本条线的 A 与佣金；其余充值不产生本条线佣金。
                  </span>
                </div>

                <template v-if="isLineEnabled(line)">
                  <label class="mt-4 block text-xs font-medium text-slate-700" :for="'agcr-' + line.key">比例 r（0～1）</label>
                  <input
                    :id="'agcr-' + line.key"
                    type="number"
                    min="0"
                    max="1"
                    step="0.001"
                    class="ant-input mt-1 w-full max-w-[220px] text-sm"
                    :value="rateNum(line)"
                    @input="setRate(line, $event.target.value)"
                  />
                  <div class="mt-3 flex flex-wrap gap-1.5">
                    <span class="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      r = {{ (rateNum(line) * 100).toFixed(2) }}%
                    </span>
                  </div>
                  <div class="mt-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-800">
                    <p class="font-medium text-slate-700">示例 · 基数 {{ formatUsdt(demoBaseAmount) }} USDT</p>
                    <p class="mt-1 font-mono">
                      佣金 ≈ {{ formatUsdt(previewCommission(line, demoBaseAmount) ?? 0) }} USDT
                    </p>
                  </div>
                </template>
                <p v-else class="mt-3 text-sm text-slate-500">未参与记佣，不产生代理线佣金。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <footer class="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
      <p class="font-medium text-slate-800">保存前请确认</p>
      <ul class="mt-2 list-inside list-disc space-y-1 text-slate-600">
        <li>已开启记佣的产品线须填写比例 r（0～1）。</li>
        <li>账期结算周期、发放方式与结算后通知请在「佣金结算」Tab 配置。</li>
        <li>此处为代理体系全局默认；单个代理的覆盖请在代理列表「记佣配置」中维护。</li>
      </ul>
      <p class="mt-3 text-xs text-slate-500">与「佣金结算」共用右上角保存与重置。</p>
    </footer>
    </div>

    <div v-show="activeTab === 'settlement'" class="space-y-6">
      <section class="rounded-xl border border-slate-200 bg-white">
        <div class="border-b border-slate-100 px-5 py-4">
          <h2 class="text-base font-semibold text-slate-900">佣金结算</h2>
          <p class="mt-1 text-sm text-slate-500">
            配置代理账期佣金的汇总周期、发放方式、入账账户与结算完成后通知；默认入账至代理人币币账户。
          </p>
        </div>
        <div class="space-y-6 p-5">
          <div class="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
            <p class="font-medium text-slate-800">当前规则摘要</p>
            <p class="mt-1 text-xs leading-relaxed text-slate-600">{{ settlementScheduleLine }}</p>
            <p class="mt-1 text-xs leading-relaxed text-slate-600">{{ settlementNotifyLine }}</p>
          </div>

          <div class="flex max-w-2xl flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-medium text-slate-900">自动入账</p>
              <p class="mt-1 text-xs leading-relaxed text-slate-500">
                开启后：账期汇总单生成后系统自动划转至代理人账户。关闭后：汇总单进入「佣金结算」，由运营审核通过后入账。
              </p>
            </div>
            <button
              type="button"
              :class="config.agentCommissionAutoExecute ? 'bg-blue-600' : 'bg-slate-200'"
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none"
              @click="config.agentCommissionAutoExecute = !config.agentCommissionAutoExecute"
            >
              <span
                :class="config.agentCommissionAutoExecute ? 'translate-x-5' : 'translate-x-0'"
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition"
              />
            </button>
          </div>

          <div class="grid gap-6 lg:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-slate-800">结算周期</label>
              <select v-model="config.agentSettlementCycle" class="ant-input mt-2 w-full max-w-md text-sm">
                <option v-for="opt in AGENT_SETTLEMENT_CYCLE_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <p class="mt-1 text-xs text-slate-500">{{ currentCycleOption?.desc }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-800">结算触发时刻</label>
              <p class="mt-1 text-xs text-slate-500">24 小时制，与平台默认时区一致（与裂变日结时刻配置方式相同）。</p>
              <input
                v-model="config.agentSettlementTimeLocal"
                type="time"
                step="60"
                class="ant-input mt-2 w-full max-w-[12rem] text-sm"
              />
            </div>
          </div>

          <div v-if="config.agentSettlementCycle !== AGENT_SETTLEMENT_CYCLE.MONTHLY" class="max-w-md">
            <label class="block text-sm font-medium text-slate-800">结算日 · 星期</label>
            <p class="mt-1 text-xs text-slate-500">
              <template v-if="config.agentSettlementCycle === AGENT_SETTLEMENT_CYCLE.WEEKLY">单周：每个自然周在指定星期触发上一完整周账期。</template>
              <template v-else>双周：每两个自然周在指定星期触发账期汇总（与账务双周历对齐）。</template>
            </p>
            <select v-model.number="config.agentSettlementWeekday" class="ant-input mt-2 w-full text-sm">
              <option v-for="d in AGENT_SETTLEMENT_WEEKDAY_OPTIONS" :key="d.value" :value="d.value">
                {{ d.label }}
              </option>
            </select>
          </div>
          <div v-else class="max-w-md">
            <label class="block text-sm font-medium text-slate-800">结算日 · 每月几号</label>
            <p class="mt-1 text-xs text-slate-500">按自然月；若某月无该日（如 31 号），由账务任务按月末规则处理。</p>
            <input
              v-model.number="config.agentSettlementMonthDay"
              type="number"
              min="1"
              max="31"
              step="1"
              class="ant-input mt-2 w-full max-w-[8rem] text-sm"
            />
          </div>

          <div class="max-w-md">
            <label class="block text-sm font-medium text-slate-800">佣金入账账户</label>
            <select v-model="config.agentCommissionCreditTo" class="ant-input mt-2 w-full text-sm">
              <option v-for="opt in REFERRAL_COMMISSION_CREDIT_TO_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <p class="mt-1.5 text-xs leading-relaxed text-slate-500">
              {{
                REFERRAL_COMMISSION_CREDIT_TO_OPTIONS.find((o) => o.value === config.agentCommissionCreditTo)?.hint
              }}
            </p>
          </div>

          <div class="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3">
            <p class="text-sm font-medium text-slate-800">结算完成后通知代理</p>
            <p class="mt-1 text-xs text-slate-500">
              账期批次完成入账后，按勾选渠道向对应代理发送通知（需站内消息 / 短信 / 邮件服务已开通；与裂变「结算完成后通知用户」一致）。
            </p>
            <ul class="mt-3 space-y-2 text-sm text-slate-700">
              <li class="flex items-center gap-2">
                <input
                  id="agent-notify-email"
                  v-model="config.agentNotifyAfterSettlementEmail"
                  type="checkbox"
                  class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label for="agent-notify-email" class="cursor-pointer select-none">发送邮件</label>
              </li>
              <li class="flex items-center gap-2">
                <input
                  id="agent-notify-site"
                  v-model="config.agentNotifyAfterSettlementSite"
                  type="checkbox"
                  class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label for="agent-notify-site" class="cursor-pointer select-none">发送站内信</label>
              </li>
              <li class="flex items-center gap-2">
                <input
                  id="agent-notify-sms"
                  v-model="config.agentNotifyAfterSettlementSms"
                  type="checkbox"
                  class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label for="agent-notify-sms" class="cursor-pointer select-none">发送手机短信</label>
              </li>
            </ul>
          </div>
        </div>
      </section>
      <footer class="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
        <p class="font-medium text-slate-800">保存前请确认</p>
        <ul class="mt-2 list-inside list-disc space-y-1 text-slate-600">
          <li>结算周期、星期或月内日期、触发时刻与通知渠道保存后由账务与消息服务按平台时区调度（演示为前端 mock）。</li>
        </ul>
        <p class="mt-3 text-xs text-slate-500">与「记佣规则」共用右上角保存与重置。</p>
      </footer>
    </div>
  </div>
</template>

<style scoped>
button:focus {
  outline: none;
}
</style>
