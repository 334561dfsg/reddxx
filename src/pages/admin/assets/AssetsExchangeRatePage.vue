<script setup>
import { computed, reactive, ref } from 'vue'
import MfaVerificationModal from '../../../admin/components/MfaVerificationModal.vue'
import {
  EXCHANGE_RATE_SOURCE,
  EXCHANGE_RATE_TYPE
} from '../../../admin/constants/assets'
import { createExchangeRatePairsMock, createFeeTemplatesMock } from '../../../admin/mock/assets'
import { getActiveVipLevels } from '../../../admin/mock/vip'

const statusTab = ref('all')
const search = ref('')
const showEditModal = ref(false)
const editingId = ref('')

// 分页相关
const currentPage = ref(1)
const pageSize = ref(5)

// MFA 验证相关
const showMfaModal = ref(false)
const pendingSaveData = ref(null)
const mfaLoading = ref(false)

const pairs = ref(createExchangeRatePairsMock())
const feeTemplates = ref(createFeeTemplatesMock())
const availableAssets = ref(['USDT', 'BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOT', 'TRX', 'DOGE'])

// 汇率管理表单
const rateForm = reactive({
  baseAsset: '',
  quoteAsset: '',
  source: EXCHANGE_RATE_SOURCE.BINANCE,
  type: EXCHANGE_RATE_TYPE.FLOATING,
  marketRate: 0,
  feeTemplateId: '',
  buyMarkup: 0.005,
  sellMarkup: 0.005,
  enabled: true,
  userLevelRates: {}
})

const filteredPairs = computed(() => {
  const kw = search.value.trim().toLowerCase()
  return pairs.value.filter((pair) => {
    const hitStatus = statusTab.value === 'all' || 
      (statusTab.value === 'enabled' && pair.enabled) || 
      (statusTab.value === 'disabled' && !pair.enabled)
    const hitKeyword = !kw || `${pair.baseAsset}/${pair.quoteAsset}`.toLowerCase().includes(kw)
    return hitStatus && hitKeyword
  })
})

const totalPages = computed(() => Math.ceil(filteredPairs.value.length / pageSize.value))
const pagedPairs = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredPairs.value.slice(start, start + pageSize.value)
})

const goPrev = () => {
  if (currentPage.value > 1) currentPage.value--
}
const goNext = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}

// 当搜索或筛选状态改变时，重置页码
const handleFilterChange = () => {
  currentPage.value = 1
}

const enabledPairsCount = computed(() => pairs.value.filter((p) => p.enabled).length)
const activeVipLevels = computed(() => getActiveVipLevels().slice().sort((a, b) => a.level - b.level))
const selectedRateTemplate = computed(() => feeTemplates.value.find((t) => t.id === rateForm.feeTemplateId) || null)
const ratePreviewPair = computed(() => {
  const base = rateForm.baseAsset.trim().toUpperCase()
  const quote = rateForm.quoteAsset.trim().toUpperCase()
  return `${base || '—'}/${quote || '—'}`
})
const ratePreviewLevelEntries = computed(() => {
  const rates = rateForm.userLevelRates || {}
  const byVip = activeVipLevels.value
    .map((vip) => {
      const key = `vip${vip.level}`
      return rates[key] ? [key, rates[key]] : null
    })
    .filter(Boolean)
  const has = new Set(byVip.map(([key]) => key))
  const rest = Object.entries(rates).filter(([key]) => !has.has(key))
  return [...byVip, ...rest]
})

const RATE_LEVEL_PREVIEW_LIMIT = 5
const rateLevelsExpanded = ref(false)

const getVisibleRatePreviewLevelEntries = () => {
  if (rateLevelsExpanded.value) return ratePreviewLevelEntries.value
  return ratePreviewLevelEntries.value.slice(0, RATE_LEVEL_PREVIEW_LIMIT)
}

const hasMoreRatePreviewLevels = computed(() => ratePreviewLevelEntries.value.length > RATE_LEVEL_PREVIEW_LIMIT)

// ========== 通用方法 ==========
const clonePairToForm = (pair) => {
  rateForm.baseAsset = pair.baseAsset
  rateForm.quoteAsset = pair.quoteAsset
  rateForm.source = pair.source || EXCHANGE_RATE_SOURCE.BINANCE
  rateForm.type = EXCHANGE_RATE_TYPE.FLOATING
  rateForm.marketRate = pair.marketRate
  rateForm.feeTemplateId = pair.feeTemplateId || ''
  rateForm.buyMarkup = pair.buyMarkup
  rateForm.sellMarkup = pair.sellMarkup
  rateForm.enabled = pair.enabled
  rateForm.userLevelRates = syncRateVipLevelRatesWithModule(
    JSON.parse(JSON.stringify(pair.userLevelRates || {})),
    pair.buyMarkup,
    pair.sellMarkup
  )
}

const getVipLevelNumber = (level) => {
  const match = String(level || '').toLowerCase().match(/^vip(\d+)$/)
  return match ? Number(match[1]) : null
}

const sortVipLevels = (levels) => {
  return [...levels].sort((a, b) => {
    const aNum = getVipLevelNumber(a)
    const bNum = getVipLevelNumber(b)
    if (aNum !== null && bNum !== null) return aNum - bNum
    if (aNum !== null) return -1
    if (bNum !== null) return 1
    return String(a).localeCompare(String(b))
  })
}

const defaultVipRateFactor = (index) => Math.max(0.2, 1 - index * 0.2)

const normalizeVipLevelRates = (levelRates, baseMarkup) => {
  const baseBuy = Number(baseMarkup.buy) || 0
  const baseSell = Number(baseMarkup.sell) || 0
  const entries = Object.entries(levelRates || {})

  if (!entries.length) {
    return {
      vip0: { buy: baseBuy, sell: baseSell }
    }
  }

  const normalized = {}
  let nextIndex = 0

  sortVipLevels(entries.map(([level]) => level)).forEach((level) => {
    const origin = levelRates[level] || {}
    const vipIndex = getVipLevelNumber(level) ?? nextIndex
    const key = `vip${vipIndex}`
    normalized[key] = {
      buy: Number(origin.buy) || 0,
      sell: Number(origin.sell) || 0
    }
    nextIndex = Math.max(nextIndex, vipIndex + 1)
  })

  return normalized
}

const syncVipLevelRatesWithModule = (levelRates = {}, baseMarkup) => {
  const normalized = normalizeVipLevelRates(levelRates, baseMarkup)
  const baseBuy = Number(baseMarkup.buy) || 0
  const baseSell = Number(baseMarkup.sell) || 0

  return activeVipLevels.value.reduce((acc, vip, index) => {
    const key = `vip${vip.level}`
    const fallbackByOrder = normalized[`vip${index}`] || normalized[`vip${index + 1}`]
    const fallback = normalized[key] || fallbackByOrder
    const factor = defaultVipRateFactor(index)
    acc[key] = {
      buy: Number((Number(fallback?.buy ?? baseBuy * factor) || 0).toFixed(6)),
      sell: Number((Number(fallback?.sell ?? baseSell * factor) || 0).toFixed(6))
    }
    return acc
  }, {})
}

const syncRateVipLevelRatesWithModule = (levelRates = {}, buyMarkup = rateForm.buyMarkup, sellMarkup = rateForm.sellMarkup) => {
  return syncVipLevelRatesWithModule(levelRates, {
    buy: Number(buyMarkup) || 0,
    sell: Number(sellMarkup) || 0
  })
}

const initRateUserLevelRates = () => {
  rateForm.userLevelRates = syncRateVipLevelRatesWithModule({}, rateForm.buyMarkup, rateForm.sellMarkup)
}

const vipLevelLabel = (level) => {
  const number = getVipLevelNumber(level)
  const meta = activeVipLevels.value.find((vip) => vip.level === number)
  if (meta) {
    return meta.displayName ? `${meta.name}（${meta.displayName}）` : meta.name
  }
  return number !== null ? `VIP ${number}` : String(level || '').toUpperCase()
}

const calculateRates = () => {
  rateForm.buyRate = rateForm.marketRate * (1 + rateForm.buyMarkup)
  rateForm.sellRate = rateForm.marketRate * (1 - rateForm.sellMarkup)
}

// ========== 汇率管理操作 ==========
const openEditRate = (pair) => {
  editingId.value = pair.id
  clonePairToForm(pair)
  rateLevelsExpanded.value = false
  showEditModal.value = true
}

const openCreateRate = () => {
  editingId.value = ''
  Object.assign(rateForm, {
    baseAsset: '',
    quoteAsset: '',
    source: EXCHANGE_RATE_SOURCE.BINANCE,
    type: EXCHANGE_RATE_TYPE.FLOATING,
    marketRate: 0,
    feeTemplateId: '',
    buyMarkup: 0.005,
    sellMarkup: 0.005,
    enabled: true,
    userLevelRates: {}
  })
  initRateUserLevelRates()
  rateLevelsExpanded.value = false
  showEditModal.value = true
}

const applyFeeTemplate = (templateId) => {
  const template = feeTemplates.value.find(t => t.id === templateId)
  if (template) {
    rateForm.feeTemplateId = templateId
    rateForm.buyMarkup = template.baseMarkup.buy
    rateForm.sellMarkup = template.baseMarkup.sell
    rateForm.userLevelRates = syncRateVipLevelRatesWithModule(
      JSON.parse(JSON.stringify(template.userLevelRates || {})),
      template.baseMarkup.buy,
      template.baseMarkup.sell
    )
    calculateRates()
  }
}

const saveRate = () => {
  calculateRates()
  
  const payload = {
    baseAsset: rateForm.baseAsset.trim().toUpperCase(),
    quoteAsset: rateForm.quoteAsset.trim().toUpperCase(),
    source: rateForm.source,
    type: EXCHANGE_RATE_TYPE.FLOATING,
    marketRate: Number(rateForm.marketRate),
    feeTemplateId: rateForm.feeTemplateId || null,
    buyMarkup: Number(rateForm.buyMarkup),
    sellMarkup: Number(rateForm.sellMarkup),
    buyRate: Number(rateForm.buyRate),
    sellRate: Number(rateForm.sellRate),
    enabled: Boolean(rateForm.enabled),
    autoReverse: false,
    userLevelRates: rateForm.userLevelRates,
    lastUpdate: new Date().toISOString().replace('T', ' ').substring(0, 19)
  }

  pendingSaveData.value = payload
  showMfaModal.value = true
}

// ========== MFA 验证处理 ==========
const handleMfaVerify = async (code) => {
  mfaLoading.value = true
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (pendingSaveData.value) {
      // 保存汇率配置
      if (editingId.value) {
        pairs.value = pairs.value.map((pair) => 
          pair.id === editingId.value ? { ...pair, ...pendingSaveData.value } : pair
        )
      } else {
        pairs.value.unshift({ id: `pair-${Date.now()}`, ...pendingSaveData.value })
      }

      showEditModal.value = false
      pendingSaveData.value = null
      showMfaModal.value = false
      alert('汇率配置保存成功！')
    }
  } catch (error) {
    alert('MFA 验证失败：' + (error.message || '请稍后重试'))
  } finally {
    mfaLoading.value = false
  }
}

// ========== 工具函数 ==========
const sourceLabel = (source) => {
  const map = {
    [EXCHANGE_RATE_SOURCE.BINANCE]: '币安',
    [EXCHANGE_RATE_SOURCE.OKX]: 'OKX',
    [EXCHANGE_RATE_SOURCE.COINGECKO]: 'CoinGecko',
    [EXCHANGE_RATE_SOURCE.CUSTOM]: '自定义'
  }
  return map[source] || source
}

const getFeeTemplateName = (templateId) => {
  if (!templateId) return '手动配置'
  const template = feeTemplates.value.find(t => t.id === templateId)
  return template ? template.name : '未知模板'
}
</script>

<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">汇率管理</h1>
        <p class="mt-1 text-sm text-slate-500">管理闪兑模块各交易对的市场汇率及加成配置</p>
      </div>
      <a-button html-type="button" class="inline-flex items-center gap-2 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700" @click="openCreateRate()" type="primary">
        <span class="text-base">+</span>
        <span>新增交易对</span>
      </a-button>
    </header>

    <article class="rounded-xl border border-slate-200 bg-white">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-4">
        <div class="flex flex-wrap items-center gap-4">
          <!-- Status Filter -->
          <div class="inline-flex items-center gap-2 text-sm">
            <a-button html-type="button" class="font-medium" :class="statusTab === 'all' ? 'text-blue-600' : 'text-slate-500'" @click="statusTab = 'all'; handleFilterChange()">全部</a-button>
            <a-button html-type="button" class="font-medium" :class="statusTab === 'enabled' ? 'text-blue-600' : 'text-slate-500'" @click="statusTab = 'enabled'; handleFilterChange()">已启用</a-button>
            <a-button html-type="button" class="font-medium" :class="statusTab === 'disabled' ? 'text-blue-600' : 'text-slate-500'" @click="statusTab = 'disabled'; handleFilterChange()">已禁用</a-button>
          </div>
        </div>

        <!-- Search -->
        <div class="flex w-full max-w-2xl flex-wrap items-center justify-end gap-2">
          <div class="relative w-full max-w-sm">
            <a-input v-model:value="search" type="text" class="w-full pl-9 pr-3" placeholder="搜索交易对..." @input="handleFilterChange" />
            <svg viewBox="0 0 20 20" class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none">
              <circle cx="9" cy="9" r="5.8" stroke="currentColor" stroke-width="1.6" />
              <path d="M13.6 13.6L16.4 16.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </div>
        </div>
      </div>

      <!-- 汇率管理内容 -->
      <div class="space-y-3 p-4">
        <div class="flex items-center justify-between pb-2">
          <p class="text-sm text-slate-500">
            共 <span class="font-semibold text-slate-900">{{ filteredPairs.length }}</span> 个交易对，已启用 <span class="font-semibold text-emerald-600">{{ enabledPairsCount }}</span>
          </p>
        </div>

        <div
          v-for="pair in pagedPairs"
          :key="pair.id"
          class="group flex flex-col items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-blue-200 hover:shadow-md md:flex-row md:items-center"
        >
          <!-- 交易对基础信息 -->
          <div class="flex w-full items-center gap-4 border-b border-slate-100 bg-slate-50/50 p-4 md:w-1/4 md:border-b-0 md:border-r md:bg-white">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-lg font-bold text-blue-600">
              {{ pair.baseAsset[0] }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h3 class="truncate text-lg font-bold text-slate-900">{{ pair.baseAsset }}/{{ pair.quoteAsset }}</h3>
                <span class="rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider" :class="pair.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'">
                  {{ pair.enabled ? 'ON' : 'OFF' }}
                </span>
              </div>
              <div class="mt-1 flex flex-wrap gap-1.5">
                <span class="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-600">{{ sourceLabel(pair.source) }}</span>
              </div>
            </div>
          </div>

          <!-- 核心汇率数据 -->
          <div class="grid flex-1 grid-cols-2 gap-4 p-4 md:grid-cols-4">
            <div class="space-y-1">
              <p class="text-xs  text-slate-400">市场中间价</p>
              <p class="text-base font-bold text-slate-900">{{ pair.marketRate }}</p>
              <p class="text-xs text-slate-500">数据源 {{ sourceLabel(pair.source) }}</p>
            </div>
            <div class="space-y-1 border-r border-slate-50 md:border-r-0">
              <p class="text-xs font-medium uppercase tracking-wider text-slate-400">兑换费率加成</p>
              <p class="text-sm font-bold text-blue-600">
                <span class="text-emerald-600">→{{ pair.quoteAsset }} {{ (pair.sellMarkup * 100).toFixed(2) }}%</span> / 
                <span class="text-rose-600">→{{ pair.baseAsset }} {{ (pair.buyMarkup * 100).toFixed(2) }}%</span>
              </p>
              <p class="text-xs text-slate-500">{{ getFeeTemplateName(pair.feeTemplateId) }}</p>
            </div>
            <div class="space-y-1 md:col-span-2">
              <p class="text-xs font-medium uppercase tracking-wider text-slate-400">状态与更新</p>
              <p class="text-sm font-medium text-slate-600">{{ pair.lastUpdate }}</p>
            </div>
          </div>

          <!-- 操作区 -->
          <div class="flex items-center justify-end border-t border-slate-100 bg-slate-50/30 p-4 md:w-32 md:border-t-0 md:bg-white">
            <a-button html-type="button" class="flex w-full items-center justify-center gap-2 border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-blue-600 hover:text-white hover:border-blue-600 active:scale-95 md:w-20" @click="openEditRate(pair)" type="primary">
              <span>编辑</span>
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a-button>
          </div>
        </div>

        <div v-if="filteredPairs.length === 0" class="p-12 text-center text-slate-500">
          未找到匹配的交易对
        </div>
      </div>

      <!-- 分页栏 -->
      <footer v-if="totalPages > 1" class="flex items-center justify-between border-t border-slate-200 px-6 py-4 text-sm">
        <p class="text-slate-500">共 {{ filteredPairs.length }} 个交易对</p>
        <a-pagination  size="small" :current="currentPage" :page-size="pageSize" :total="filteredPairs.length" :show-size-changer="false"  @change="currentPage = $event" />
      </footer>
    </article>
  </section>

  <!-- 编辑/新增弹窗 -->
  <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(showEditModal)" :mask-closable="false" :keyboard="false" :closable="false" :footer="null" width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="showEditModal = false"><template #title><template v-if="showEditModal"><header class="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-4">
          <div>
            <h2 class="text-xl font-semibold text-slate-900">{{ editingId ? '编辑汇率配置' : '新增交易对' }}</h2>
            <p class="mt-0.5 text-xs text-slate-500">左侧配置基本信息，费率详情请参考右侧预览</p>
          </div>
          <a-button aria-label="关闭" html-type="button" class="text-2xl text-slate-400 transition-colors hover:text-slate-600" @click="showEditModal = false">×</a-button>
        </header></template></template><template v-if="showEditModal"><div class="grid gap-4 lg:grid-cols-[3fr_2fr]"><div class="min-w-0"><div class="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <section class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-center gap-2">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                <svg class="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 class="text-base font-semibold text-slate-900">基本信息</h3>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <label class="space-y-2 md:col-span-2">
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-slate-700">费率模板</span>
                  <span class="text-xs text-slate-500">选择模板后，基础费率和 VIP 分级费率将自动从模板同步，无需手动配置</span>
                </div>
                <a-select v-model:value="rateForm.feeTemplateId" @change="applyFeeTemplate(rateForm.feeTemplateId)" class="w-full transition">
                  <a-select-option value="">请选择费率模板</a-select-option>
                  <a-select-option v-for="template in feeTemplates.filter(t => t.enabled)" :key="template.id" :value="template.id">
                {{ template.name }} (逆：{{ (template.baseMarkup.buy * 100).toFixed(2) }}% | 正：{{ (template.baseMarkup.sell * 100).toFixed(2) }}%)
              </a-select-option>
                </a-select>
              </label>
              <label class="space-y-2">
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-slate-700">基础资产</span>
                  <span class="text-xs text-slate-500">交易对的主体资产（如 USDT）</span>
                </div>
                <a-select v-model:value="rateForm.baseAsset" class="w-full transition">
                  <a-select-option value="">请选择资产</a-select-option>
                  <a-select-option v-for="asset in availableAssets" :key="asset" :value="asset">{{ asset }}</a-select-option>
                </a-select>
              </label>
              <label class="space-y-2">
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-slate-700">目标资产</span>
                  <span class="text-xs text-slate-500">交易对的兑换资产（如 BTC）</span>
                </div>
                <a-select v-model:value="rateForm.quoteAsset" class="w-full transition">
                  <a-select-option value="">请选择资产</a-select-option>
                  <a-select-option v-for="asset in availableAssets" :key="asset" :value="asset">{{ asset }}</a-select-option>
                </a-select>
              </label>
              <label class="space-y-2 md:col-span-2">
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-slate-700">市场汇率来源</span>
                  <span class="text-xs text-slate-500">实时获取 market 中间价的价格接口来源</span>
                </div>
                <a-select v-model:value="rateForm.source" class="w-full transition">
                  <a-select-option :value="EXCHANGE_RATE_SOURCE.BINANCE">币安 (Binance)</a-select-option>
                </a-select>
              </label>
              <label class="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/50 px-4 py-3 md:col-span-2">
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-emerald-900">启用该交易对</span>
                  <span class="text-xs text-emerald-700">是否允许用户在前端看到并交易此币对</span>
                </div>
                <a-checkbox v-model:checked="rateForm.enabled" class="w-5 text-emerald-600" />
              </label>
            </div>
          </section>
        </div></div><div class="flex min-w-0 flex-col bg-gradient-to-br from-slate-50 to-slate-100">
        <header class="border-b border-slate-200 px-5 py-4">
          <h3 class="text-lg font-semibold text-slate-900">实时预览</h3>
          <p class="mt-0.5 text-xs text-slate-500">调整左侧配置后即时更新</p>
        </header>

        <div class="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-semibold text-slate-900">交易对概览</h4>
              <span class="rounded-md px-2 py-1 text-xs font-medium" :class="rateForm.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'">
                {{ rateForm.enabled ? '已启用' : '已禁用' }}
              </span>
            </div>
            <div class="mt-3 space-y-2 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-slate-500">交易对</span>
                <span class="font-semibold text-slate-900">{{ ratePreviewPair }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500">数据源</span>
                <span class="font-medium text-slate-900">{{ sourceLabel(rateForm.source) }}</span>
              </div>
            </div>
          </div>

          <div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 class="text-sm font-semibold text-blue-900">费率配置预览</h4>
            <div class="mt-3 rounded-md border border-blue-100 bg-white p-3 text-sm">
              <p class="font-medium text-slate-900">{{ selectedRateTemplate?.name || '未选择模板（当前为手动配置）' }}</p>
              <p class="mt-1 text-xs text-slate-500">{{ selectedRateTemplate?.description || '可直接编辑当前交易对的基础费率与 VIP 分级费率' }}</p>
              <div class="mt-2 space-y-1 text-xs text-slate-600">
                <p>{{ rateForm.quoteAsset || '目标币' }} → {{ rateForm.baseAsset || '基础币' }} (回兑)：<span class="font-semibold text-emerald-600">{{ ((Number(rateForm.buyMarkup) || 0) * 100).toFixed(2) }}%</span></p>
                <p>{{ rateForm.baseAsset || '基础币' }} → {{ rateForm.quoteAsset || '目标币' }} (兑换)：<span class="font-semibold text-rose-600">{{ ((Number(rateForm.sellMarkup) || 0) * 100).toFixed(2) }}%</span></p>
              </div>
            </div>
          </div>

          <div class="rounded-lg border border-violet-200 bg-violet-50 p-4">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-semibold text-violet-900">分级费率预览</h4>
              <span class="text-xs text-violet-700">共 {{ ratePreviewLevelEntries.length }} 级</span>
            </div>
            <div class="mt-3 space-y-2">
              <div v-if="ratePreviewLevelEntries.length === 0" class="rounded-md border border-dashed border-violet-200 bg-white p-3 text-xs text-slate-500">
                暂无分级费率数据
              </div>
              <div v-for="([level, rates]) in getVisibleRatePreviewLevelEntries()" :key="level" class="rounded-md border border-violet-100 bg-white p-3 text-xs">
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-slate-700">{{ vipLevelLabel(level) }}</span>
                  <span class="text-slate-500">回兑 {{ ((Number(rates.buy) || 0) * 100).toFixed(2) }}% / 兑换 {{ ((Number(rates.sell) || 0) * 100).toFixed(2) }}%</span>
                </div>
              </div>
              <a-button v-if="hasMoreRatePreviewLevels" html-type="button" class="w-full border border-violet-200 bg-white text-xs font-medium text-violet-700 transition hover:bg-violet-100" @click="rateLevelsExpanded = !rateLevelsExpanded">
                {{ rateLevelsExpanded ? '收起' : `展开剩余 ${ratePreviewLevelEntries.length - RATE_LEVEL_PREVIEW_LIMIT} 级` }}
              </a-button>
            </div>
          </div>
        </div>
      </div></div></template><template #footer><template v-if="showEditModal"><footer class="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <a-button html-type="button" class="border border-slate-300 text-sm font-medium text-slate-700 transition hover:bg-white" @click="showEditModal = false">取消</a-button>
          <a-button html-type="button" class="bg-blue-600 text-sm font-medium text-white transition hover:bg-blue-700" @click="saveRate()" type="primary">保存</a-button>
        </footer></template></template></a-modal>

  <!-- MFA 验证弹窗 -->
  <MfaVerificationModal
    v-model:open="showMfaModal"
    :loading="mfaLoading"
    title="安全验证"
    description="编辑汇率配置属于敏感操作，请输入 MFA 验证码"
    @verify="handleMfaVerify"
    @cancel="pendingSaveData = null"
  />
</template>
