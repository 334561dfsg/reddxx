<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  mockReferralConfig,
  referralApi,
  normalizeReferralConfig,
  normalizeCommissionRatesTriple
} from '../../../admin/mock/referral'
import {
  DEFAULT_REFERRAL_CONFIG,
  REFERRAL_MAX_LEVELS,
  REFERRAL_COMMISSION_CREDIT_TO_OPTIONS,
  getReferralSettlementScheduleLine,
  getReferralSettlementNotifyLine
} from '../../../admin/constants/referral'

const config = ref(normalizeReferralConfig({ ...mockReferralConfig }))
/** 分佣规则 | 佣金结算 */
const activeTab = ref('rules')

const RATE_LEVEL_INDEXES = [0, 1, 2]
const isSaving = ref(false)
const demoBaseAmount = ref(10000)
const settlementScheduleLine = computed(() => getReferralSettlementScheduleLine(config.value))
const settlementNotifyLine = computed(() => getReferralSettlementNotifyLine(config.value))
const currentCreditOption = computed(() =>
  REFERRAL_COMMISSION_CREDIT_TO_OPTIONS.find((o) => o.value === config.value.referralCommissionCreditTo)
)

const PRODUCT_LINES = [
  {
    key: 'deposit',
    enabledKey: 'commissionDepositEnabled',
    ratesKey: 'depositCommissionRates',
    title: '充值',
    baseDesc:
      '计佣基数 A = 被邀请用户该笔充值成功后的实际到账 USDT 金额（与充值入账流水中的到账金额相同）。',
    formula: '佣金ᵢ = A × rᵢ',
    firstDepositExtra: true,
    theme: 'blue'
  },
  {
    key: 'perpetual',
    enabledKey: 'commissionPerpetualEnabled',
    ratesKey: 'perpetualCommissionRates',
    title: '永续合约',
    baseDesc:
      '计佣基数 A = 该笔永续订单实收的交易手续费 USDT 金额；交易类产品按该笔订单实收的交易手续费记佣，本笔无手续费则 A = 0。',
    formula: '佣金ᵢ = A × rᵢ',
    theme: 'indigo'
  },
  {
    key: 'delivery',
    enabledKey: 'commissionDeliveryEnabled',
    ratesKey: 'deliveryCommissionRates',
    title: '交割合约',
    baseDesc:
      '计佣基数 A = 该笔交割合约订单自开仓至持仓全部了结并完成交割结算期间实收的交易手续费 USDT 金额之总和；不包含已实现盈亏、保证金及其它非手续费科目；无手续费则 A = 0。',
    formula: '佣金ᵢ = A × rᵢ',
    theme: 'violet'
  },
  {
    key: 'spot',
    enabledKey: 'commissionSpotEnabled',
    ratesKey: 'spotCommissionRates',
    title: '现货',
    baseDesc:
      '计佣基数 A = 该笔现货订单实收的交易手续费 USDT 金额；交易类产品按该笔订单实收的交易手续费记佣，本笔无手续费则 A = 0。',
    formula: '佣金ᵢ = A × rᵢ',
    theme: 'orange'
  },
  {
    key: 'aiQuant',
    enabledKey: 'commissionAiQuantEnabled',
    ratesKey: 'aiQuantCommissionRates',
    title: 'AI 量化',
    baseDesc:
      '计佣基数 A = 该笔 AI 量化订单实收的认购手续费、违约手续费等 USDT 手续费金额之和；理财类及产品策略按认购手续费、违约手续费记佣。',
    formula: '佣金ᵢ = A × rᵢ',
    theme: 'amber'
  },
  {
    key: 'portfolio',
    enabledKey: 'commissionPortfolioEnabled',
    ratesKey: 'portfolioCommissionRates',
    title: '投资组合',
    baseDesc:
      '计佣基数 A = 该笔投资组合订单实收的认购手续费、提前赎回违约手续费等 USDT 手续费金额之和；无手续费则 A = 0。',
    formula: '佣金ᵢ = A × rᵢ',
    theme: 'cyan'
  },
  {
    key: 'lending',
    enabledKey: 'commissionLendingEnabled',
    ratesKey: 'lendingCommissionRates',
    title: '流动性挖矿',
    baseDesc:
      '计佣基数 A = 该笔流动性挖矿订单实收的认购手续费、提前退出或违约手续费等 USDT 手续费金额之和；流动性挖矿产品不按本金记佣。',
    formula: '佣金ᵢ = A × rᵢ',
    theme: 'emerald'
  },
  {
    key: 'borrowing',
    enabledKey: 'commissionBorrowingEnabled',
    ratesKey: 'borrowingCommissionRates',
    title: '借贷产品',
    baseDesc:
      '计佣基数 A = 该笔借贷订单实收的认购手续费、违约手续费、逾期违约金等 USDT 手续费金额之和；无手续费则 A = 0。',
    formula: '佣金ᵢ = A × rᵢ',
    theme: 'rose'
  }
]

/** 分组展示，阅读顺序更清晰 */
const PRODUCT_GROUPS = [
  {
    id: 'fund',
    name: '入金',
    blurb: '含链上与站内 USDT 充值',
    lineKeys: ['deposit']
  },
  {
    id: 'trade',
    name: '交易',
    blurb: '合约与现货订单',
    lineKeys: ['perpetual', 'delivery', 'spot']
  },
  {
    id: 'fin',
    name: '产品与策略',
    blurb: '量化、投资组合、理财、借贷',
    lineKeys: ['aiQuant', 'portfolio', 'lending', 'borrowing']
  }
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

/** 全宽布局下按每组卡片数量拉满列数 */
function groupGridClass(group) {
  const n = group.lineKeys.length
  if (n <= 1) return 'grid-cols-1'
  if (n === 2) return 'grid-cols-1 md:grid-cols-2'
  return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
}

/** 固定三级，每项为 0～1 */
function parseRatesString(str) {
  const normalized = normalizeCommissionRatesTriple(str)
  return normalized.split(',').map((v) => parseFloat(v))
}

function ratesFor(line) {
  return parseRatesString(config.value[line.ratesKey])
}

function clampRate01(n) {
  if (!Number.isFinite(n) || Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function setRateAt(line, index, raw) {
  const parts = parseRatesString(config.value[line.ratesKey])
  const v = raw == null ? '' : String(raw).trim()
  let n = parseFloat(v)
  if (v === '' || Number.isNaN(n)) n = 0
  parts[index] = clampRate01(n)
  config.value[line.ratesKey] = parts.join(',')
}

function formatUsdt(n) {
  const x = Number(n)
  if (Number.isNaN(x)) return '—'
  return x.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function commissionPreviewLines(rates, base) {
  const b = Number(base)
  if (Number.isNaN(b) || b <= 0) return []
  const triple = rates.slice(0, REFERRAL_MAX_LEVELS)
  while (triple.length < REFERRAL_MAX_LEVELS) triple.push(0)
  return triple.map((r, i) => ({
    level: i + 1,
    rate: r,
    ratePct: (r * 100).toFixed(2),
    commission: b * r
  }))
}

function isLineEnabled(line) {
  return config.value[line.enabledKey] === true
}

function toggleLine(line) {
  config.value[line.enabledKey] = !config.value[line.enabledKey]
}

const loadConfig = async () => {
  try {
    const result = await referralApi.getReferralConfig()
    if (result.success) {
      config.value = normalizeReferralConfig(result.data)
    }
  } catch (error) {
    console.error('Failed to load config:', error)
  }
}

const saveConfig = async () => {
  const validateTriple = (ratesStr) => {
    const triple = parseRatesString(ratesStr)
    return (
      triple.length === REFERRAL_MAX_LEVELS &&
      triple.every((n) => !Number.isNaN(n) && n >= 0 && n <= 1)
    )
  }

  for (const line of PRODUCT_LINES) {
    if (!config.value[line.enabledKey]) continue
    const rates = normalizeCommissionRatesTriple(config.value[line.ratesKey])
    config.value[line.ratesKey] = rates
    if (!validateTriple(rates)) {
      alert(`「${line.title}」已开启记佣：一级 / 二级 / 三级比例须均为 0～1 之间的小数。`)
      return
    }
  }

  for (const line of PRODUCT_LINES) {
    if (config.value[line.enabledKey]) continue
    const raw = config.value[line.ratesKey]
    if (raw != null && String(raw).trim() && !validateTriple(normalizeCommissionRatesTriple(raw))) {
      alert(`「${line.title}」比例格式有误，请修正后再保存。`)
      return
    }
  }

  const payload = normalizeReferralConfig({ ...config.value })

  isSaving.value = true
  try {
    const result = await referralApi.updateReferralConfig(payload)
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
  if (confirm('确认重置为默认配置？')) {
    config.value = normalizeReferralConfig({ ...DEFAULT_REFERRAL_CONFIG })
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<template>
  <div class="w-full min-w-0 space-y-8 pb-8">
    <!-- 页头 -->
    <header class="flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0 flex-1">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">裂变分销设置</h1>
        <p class="mt-2 text-sm leading-relaxed text-slate-600">
          邀请链分佣比例、全局规则与佣金结算方式。使用下方 Tab 切换。
        </p>
      </div>
      <div class="flex shrink-0 gap-2">
        <button type="button" class="ant-btn" @click="resetConfig">重置为默认</button>
        <button type="button" class="ant-btn ant-btn-primary" :disabled="isSaving" @click="saveConfig">
          {{ isSaving ? '保存中…' : '保存配置' }}
        </button>
      </div>
    </header>

    <nav class="flex gap-0 border-b border-slate-200" aria-label="裂变分销设置分区">
      <button
        type="button"
        class="border-b-2 px-4 py-3 text-sm font-medium transition-colors -mb-px"
        :class="
          activeTab === 'rules'
            ? 'border-blue-600 text-blue-700'
            : 'border-transparent text-slate-500 hover:text-slate-800'
        "
        @click="activeTab = 'rules'"
      >
        分佣规则
      </button>
      <button
        type="button"
        class="border-b-2 px-4 py-3 text-sm font-medium transition-colors -mb-px"
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
    <!-- ① 公式说明 -->
    <section class="rounded-xl border border-slate-200 bg-white">
      <div class="flex items-baseline gap-2 border-b border-slate-100 px-5 py-4">
        <span class="text-xs font-semibold text-slate-400">①</span>
        <h2 class="text-base font-semibold text-slate-900">计佣公式</h2>
      </div>
      <div class="grid gap-6 p-5 lg:grid-cols-2 lg:gap-8">
        <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">核心式</p>
          <p class="mt-3 font-mono text-sm leading-relaxed text-slate-900">
            第 i 级上级佣金
            <span class="block pt-2 text-base">
              <span class="text-violet-600">佣金ᵢ</span>
              <span class="mx-2 text-slate-400">=</span>
              <span class="text-sky-600">A</span>
              <span class="mx-2 text-slate-400">×</span>
              <span class="text-emerald-600">rᵢ</span>
            </span>
          </p>
          <p class="mt-3 text-xs leading-relaxed text-slate-600">
            <strong class="text-slate-700">A</strong>：本条业务单实收手续费形成的计佣基数，币种为 USDT；各产品线对 A 的取值定义见下方对应卡片，每条订单对应一个 A。<br />
            <strong class="text-slate-700">rᵢ</strong>：第 i 级邀请链上级的分佣比例，i ∈ {1, 2, 3}，取值范围为闭区间 [0, 1]；例如 0.1 表示 10%。
          </p>
        </div>
        <div class="text-sm leading-relaxed text-slate-600">
          <p class="font-medium text-slate-800">操作要点</p>
          <ul class="mt-3 space-y-2.5">
            <li class="flex gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
              <span>每条产品线可单独<strong class="text-slate-800">关闭记佣</strong>；关闭后该业务不产生裂变佣金（比例可保留）。</span>
            </li>
            <li class="flex gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
              <span>每条产品线固定<strong class="text-slate-800">三个比例</strong>：一级、二级、三级上级；某级可为 0。</span>
            </li>
            <li class="flex gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
              <span>
                下方「示例」使用统一的假设基数，仅用于核对「A × rᵢ」的乘法关系；线上环境每一条真实订单单独计算，其 A
                取自账务系统为该笔订单记录的实收手续费。
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ② 全局规则 -->
    <section class="rounded-xl border border-slate-200 bg-white">
      <div class="flex items-baseline gap-2 border-b border-slate-100 px-5 py-4">
        <span class="text-xs font-semibold text-slate-400">②</span>
        <h2 class="text-base font-semibold text-slate-900">裂变全局规则</h2>
        <p class="mt-1 text-xs text-slate-500">以下规则仅作用于邀请链分佣。</p>
      </div>
      <div class="divide-y divide-slate-100">
        <div class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm font-medium text-slate-900">仅首笔充值参与裂变分佣</p>
            <p class="mt-1 text-sm text-slate-500">
              仅作用于「充值」产品线：开启时，被邀请用户仅其第一笔充值成功订单参与本条线的 A 与分佣计算；该用户后续充值订单不参与本条线分佣。
            </p>
          </div>
          <button
            type="button"
            :class="config.depositFirstOnly ? 'bg-blue-600' : 'bg-slate-200'"
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none"
            @click="config.depositFirstOnly = !config.depositFirstOnly"
          >
            <span
              :class="config.depositFirstOnly ? 'translate-x-5' : 'translate-x-0'"
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition"
            />
          </button>
        </div>
      </div>
    </section>

    <!-- ③ 产品线 -->
    <section class="rounded-xl border border-slate-200 bg-white">
      <div class="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-baseline gap-2">
          <span class="text-xs font-semibold text-slate-400">③</span>
          <div>
            <h2 class="text-base font-semibold text-slate-900">产品线 · 邀请链记佣</h2>
            <p class="mt-0.5 text-sm text-slate-500">
              邀请链固定三级：直属上级为一级，其上为二级，再其上为三级；每条订单按本页配置的比例分别计算三级佣金。
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
          <span class="text-xs text-slate-400">下方各线「示例佣金」均按此基数 × rᵢ 计算</span>
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
                    已开启「仅首笔充值」时：仅被邀请用户第一笔充值成功订单产生本条线的 A 与佣金；其余充值不产生本条线佣金。
                  </span>
                </div>

                <template v-if="isLineEnabled(line)">
                  <p class="mt-4 text-xs font-medium text-slate-700">三级比例（0～1，可为 0）</p>
                  <div class="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label
                      v-for="idx in RATE_LEVEL_INDEXES"
                      :key="line.key + '-lvl-' + idx"
                      :for="line.key + '-rate-' + idx"
                      class="block"
                    >
                      <span class="text-xs text-slate-600">{{ idx + 1 }} 级上级</span>
                      <input
                        :id="line.key + '-rate-' + idx"
                        type="number"
                        min="0"
                        max="1"
                        step="0.001"
                        class="ant-input mt-1 w-full text-sm"
                        :value="ratesFor(line)[idx]"
                        @input="setRateAt(line, idx, $event.target.value)"
                      />
                    </label>
                  </div>

                  <div class="mt-4 space-y-2">
                    <p class="text-[11px] font-medium text-slate-500">比例预览</p>
                    <div class="flex flex-wrap gap-1.5">
                      <span
                        v-for="(rate, index) in ratesFor(line)"
                        :key="line.key + '-r-' + index"
                        class="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                      >
                        {{ index + 1 }} 级 {{ (rate * 100).toFixed(2) }}%
                      </span>
                    </div>
                    <div class="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-800">
                      <p class="font-medium text-slate-700">示例 · 基数 {{ formatUsdt(demoBaseAmount) }} USDT</p>
                      <ul class="mt-1.5 space-y-0.5 font-mono text-[11px]">
                        <li
                          v-for="row in commissionPreviewLines(ratesFor(line), demoBaseAmount)"
                          :key="line.key + '-ex-' + row.level"
                        >
                          {{ row.level }} 级上级：{{ formatUsdt(row.commission) }} USDT
                        </li>
                      </ul>
                    </div>
                  </div>
                </template>
                <p v-else class="mt-3 text-sm text-slate-500">未参与记佣，不产生裂变佣金。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <footer class="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
      <p class="font-medium text-slate-800">保存前请确认</p>
      <ul class="mt-2 list-inside list-disc space-y-1 text-slate-600">
        <li>已开启记佣的产品线须填写一级、二级、三级比例（均为 0～1，某级可为 0）。</li>
        <li>裂变分销固定三级；发放方式、日结时刻与结算后通知请在「佣金结算」Tab 配置。</li>
      </ul>
    </footer>
    </div>

    <div v-show="activeTab === 'settlement'" class="space-y-6">
      <section class="rounded-xl border border-slate-200 bg-white">
        <div class="border-b border-slate-100 px-5 py-4">
          <h2 class="text-base font-semibold text-slate-900">佣金结算</h2>
          <p class="mt-1 text-sm text-slate-500">
            配置裂变佣金的发放方式、入账账户、日结时刻与结算后通知；默认入账至用户币币账户。
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
                开启后：日结汇总单生成后系统自动划转至上级用户账户。关闭后：汇总单进入「裂变佣金结算」，由运营手动发放。
              </p>
            </div>
            <button
              type="button"
              :class="config.autoExecute ? 'bg-blue-600' : 'bg-slate-200'"
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none"
              @click="config.autoExecute = !config.autoExecute"
            >
              <span
                :class="config.autoExecute ? 'translate-x-5' : 'translate-x-0'"
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition"
              />
            </button>
          </div>

          <div class="grid gap-6 lg:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-slate-800">结算周期</label>
              <div class="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
                每自然日
              </div>
              <p class="mt-1 text-xs text-slate-500">
                裂变佣金按自然日汇总成结算单；充值、交易产生的明细会归入对应上级用户的日结批次。
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-800">结算触发时刻</label>
              <p class="mt-1 text-xs text-slate-500">24 小时制，与平台默认时区一致（与代理账期结算配置方式一致）。</p>
              <input
                v-model="config.referralSettlementTimeLocal"
                type="time"
                step="60"
                class="ant-input mt-2 w-full max-w-[12rem] text-sm"
              />
            </div>
          </div>

          <div class="max-w-md">
            <label class="block text-sm font-medium text-slate-800">佣金入账账户</label>
            <select v-model="config.referralCommissionCreditTo" class="ant-input mt-2 w-full text-sm">
              <option v-for="opt in REFERRAL_COMMISSION_CREDIT_TO_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <p class="mt-1.5 text-xs leading-relaxed text-slate-500">
              {{ currentCreditOption?.hint }}
            </p>
          </div>

          <div class="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3">
            <p class="text-sm font-medium text-slate-800">结算完成后通知用户</p>
            <p class="mt-1 text-xs text-slate-500">
              日结批次完成入账后，按勾选渠道向获得佣金的上级用户发送通知（需站内消息 / 短信 / 邮件服务已开通；与代理「结算完成后通知代理」一致）。
            </p>
            <ul class="mt-3 space-y-2 text-sm text-slate-700">
              <li class="flex items-center gap-2">
                <input
                  id="ref-notify-email"
                  v-model="config.referralNotifyAfterSettlementEmail"
                  type="checkbox"
                  class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label for="ref-notify-email" class="cursor-pointer select-none">发送邮件</label>
              </li>
              <li class="flex items-center gap-2">
                <input
                  id="ref-notify-site"
                  v-model="config.referralNotifyAfterSettlementSite"
                  type="checkbox"
                  class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label for="ref-notify-site" class="cursor-pointer select-none">发送站内信</label>
              </li>
              <li class="flex items-center gap-2">
                <input
                  id="ref-notify-sms"
                  v-model="config.referralNotifyAfterSettlementSms"
                  type="checkbox"
                  class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label for="ref-notify-sms" class="cursor-pointer select-none">发送手机短信</label>
              </li>
            </ul>
          </div>
        </div>
      </section>
      <footer class="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
        <p class="font-medium text-slate-800">保存前请确认</p>
        <ul class="mt-2 list-inside list-disc space-y-1 text-slate-600">
          <li>裂变佣金固定按自然日汇总，不配置周/月账期；手动模式下在「裂变佣金结算」按汇总单发放。</li>
          <li>自动入账、入账账户、触发时刻与通知渠道保存后由账务与消息服务按平台时区执行（演示为前端 mock）。</li>
        </ul>
        <p class="mt-3 text-xs text-slate-500">与「分佣规则」共用右上角保存与重置。</p>
      </footer>
    </div>
  </div>
</template>

<style scoped>
button:focus {
  outline: none;
}
</style>
