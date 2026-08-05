<script setup>
import { computed, reactive, ref, watch, onMounted } from 'vue'
import ControlConfigModal from '../../../admin/components/ControlConfigModal.vue'
import CurrencyTypeSelect from '../../../admin/components/CurrencyTypeSelect.vue'
import { ASSET_CURRENCY_TYPE } from '../../../admin/constants/assets'
import {
  PERPETUAL_COMMON_FILTER_ALL,
  PERPETUAL_CONTRACT_STEP,
  PERPETUAL_STATUS,
  sortPerpetualProducts
} from '../../../admin/constants/perpetual'
import {
  createDefaultPerpetualControlConfig,
  createPerpetualControlConfigsMock,
  createPerpetualProductsMock,
  createPerpetualTemplatesMock,
  perpetualLeverageLevels,
  perpetualProductStatusMeta
} from '../../../admin/mock/perpetual'
import { createAssetsCoinsMock } from '../../../admin/mock/assets'
import { symbolApi } from '../../../admin/mock/spot'

const statusTab = ref(PERPETUAL_COMMON_FILTER_ALL)
const searchDraft = ref('')
const currencyTypeDraft = ref('all')
const searchApplied = ref('')
const currencyTypeApplied = ref('all')

const pagination = reactive({
  currentPage: 1,
  pageSize: 5
})

const buildLeverageBadges = (levels = []) => {
  const visible = levels.slice(0, 6)
  const more = levels.length - visible.length
  return more > 0 ? [...visible, `+${more}`] : visible
}
const parseNumeric = (text) => String(text || '').replace(/[^0-9.]/g, '')
const numericLimitValue = (value) => Number(value)
const limitIsUnlimited = (value) => value !== '' && value !== null && value !== undefined && numericLimitValue(value) === 0
const tradeLimitAmountText = (value) => (limitIsUnlimited(value) ? '不限制' : numericLimitValue(value).toLocaleString())
const tradeLimitUsdtText = (value) => (limitIsUnlimited(value) ? '不限制' : fmtUsdt(value))
const tradeLimitRangeText = (minValue, maxValue) => (
  limitIsUnlimited(minValue) && limitIsUnlimited(maxValue)
    ? '不限制'
    : `${tradeLimitAmountText(minValue)} - ${tradeLimitAmountText(maxValue)} USDT`
)
const parsePair = (pair = 'BTC/USDT') => {
  const [baseCurrency = 'BTC', quoteCurrency = 'USDT'] = pair.split('/')
  return { baseCurrency, quoteCurrency }
}
const fmtUsdt = (value) => `${Number(value).toLocaleString()} USDT`
const pctText = (value) => `${(Number(value) * 100).toFixed(3)}%`
const toSymbol = (pair = '') => pair.replace('/', '')
const templates = ref(createPerpetualTemplatesMock())
const products = ref(createPerpetualProductsMock())
const controlConfigs = reactive(createPerpetualControlConfigsMock())
const assetsCoins = createAssetsCoinsMock()

const controlModalOpen = ref(false)
const activeControlSymbol = ref('')
const productStatusMeta = perpetualProductStatusMeta

const applySearch = () => {
  searchApplied.value = searchDraft.value
  currencyTypeApplied.value = currencyTypeDraft.value
  pagination.currentPage = 1
}

const resetSearch = () => {
  currencyTypeDraft.value = 'all'
  searchDraft.value = ''
  applySearch()
}

const normalizeCurrencyType = (value) => {
  if (value === ASSET_CURRENCY_TYPE.VIRTUAL || value === ASSET_CURRENCY_TYPE.METAL || value === ASSET_CURRENCY_TYPE.FIAT) return value
  if (value === 'onchain') return ASSET_CURRENCY_TYPE.VIRTUAL
  if (value === 'offchain') return ASSET_CURRENCY_TYPE.FIAT
  return ASSET_CURRENCY_TYPE.VIRTUAL
}

const coinTypeMap = computed(() => {
  const map = new Map()
  assetsCoins.forEach((coin) => {
    if (!coin?.symbol) return
    map.set(String(coin.symbol).toUpperCase(), normalizeCurrencyType(coin.type))
  })
  return map
})

const currencyTypeBySymbol = (symbol) => {
  if (!symbol) return ASSET_CURRENCY_TYPE.VIRTUAL
  return coinTypeMap.value.get(String(symbol).toUpperCase()) || ASSET_CURRENCY_TYPE.VIRTUAL
}

const currencyTypeByPair = (pair) => {
  const { baseCurrency } = parsePair(pair)
  return currencyTypeBySymbol(baseCurrency)
}

const currencyTypeLabel = (value) => {
  const type = normalizeCurrencyType(value)
  if (type === ASSET_CURRENCY_TYPE.VIRTUAL) return '虚拟币'
  if (type === ASSET_CURRENCY_TYPE.FIAT) return '法币'
  if (type === ASSET_CURRENCY_TYPE.METAL) return '贵金属'
  return String(type || '')
}

const ensureControlConfig = (symbol) => {
  if (!symbol) return
  if (!controlConfigs[symbol]) controlConfigs[symbol] = createDefaultPerpetualControlConfig()
}

const openControlModal = (item) => {
  const symbol = toSymbol(item.pair)
  ensureControlConfig(symbol)
  activeControlSymbol.value = symbol
  controlModalOpen.value = true
}

const saveControlConfig = (next) => {
  if (!activeControlSymbol.value) return
  controlConfigs[activeControlSymbol.value] = { ...next }
  controlModalOpen.value = false
}

const normalizeProductOrder = () => {
  products.value = sortPerpetualProducts(products.value)
}

const orderedProductIds = computed(() =>
  sortPerpetualProducts(products.value).map((item) => item.id)
)

const canMoveProductUp = (id) => orderedProductIds.value.indexOf(id) > 0
const canMoveProductDown = (id) => {
  const index = orderedProductIds.value.indexOf(id)
  return index > -1 && index < orderedProductIds.value.length - 1
}

const moveProductOrder = (id, direction) => {
  const ordered = sortPerpetualProducts(products.value)
  const index = ordered.findIndex((item) => item.id === id)
  if (index < 0) return
  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= ordered.length) return
  ;[ordered[index], ordered[target]] = [ordered[target], ordered[index]]
  products.value = ordered.map((item, idx) => ({ ...item, sortOrder: ordered.length - idx }))
}

const syncProductsWithTemplates = () => {
  products.value = products.value.map((item) => {
    const template = templates.value.find((tpl) => tpl.id === item.templateId) || templates.value.find((tpl) => tpl.name === item.templateName)
    if (!template) return item
    return {
      ...item,
      templateId: template.id,
      templateName: template.name,
      leverageRange: template.leverageRange,
      leverageBadges: buildLeverageBadges(template.levels)
    }
  })
}

const refreshTemplateUsage = () => {
  templates.value = templates.value.map((tpl) => {
    const linked = products.value.filter((item) => item.templateId === tpl.id)
    return {
      ...tpl,
      inUseCount: linked.length,
      contracts: linked.map((item) => item.name)
    }
  })
}

syncProductsWithTemplates()
refreshTemplateUsage()
normalizeProductOrder()

const filteredProducts = computed(() => {
  const keyword = searchApplied.value.trim().toLowerCase()
  return sortPerpetualProducts(products.value.filter((item) => {
    const matchesStatus = statusTab.value === PERPETUAL_COMMON_FILTER_ALL || item.status === statusTab.value
    const matchesKeyword = !keyword || [item.name, item.code, item.pair].join(' ').toLowerCase().includes(keyword)
    const matchesCurrencyType = currencyTypeApplied.value === 'all' || currencyTypeByPair(item.pair) === currencyTypeApplied.value
    return matchesStatus && matchesKeyword && matchesCurrencyType
  }))
})

const paginatedProducts = computed(() => {
  const start = (pagination.currentPage - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return filteredProducts.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(filteredProducts.value.length / pagination.pageSize))

watch([statusTab, searchApplied, currencyTypeApplied], () => {
  pagination.currentPage = 1
})

const showContractModal = ref(false)
const editingContractId = ref(null)
const contractStep = ref(PERPETUAL_CONTRACT_STEP.BASE)

const contractForm = reactive({
  productName: '',
  productCode: '',
  baseCurrency: 'BTC',
  quoteCurrency: 'USDT',
  spotSymbol: '',
  status: PERPETUAL_STATUS.ENABLED,
  sortOrder: 0,
  templateId: 'all-levels',
  minBuy: '10',
  maxBuy: '100000',
  maxPosition: '500000',
  buyFee: '0.02',
  sellFee: '0.05'
})

const resetContractForm = () => {
  contractForm.productName = ''
  contractForm.productCode = ''
  contractForm.baseCurrency = 'BTC'
  contractForm.quoteCurrency = 'USDT'
  contractForm.spotSymbol = ''
  contractForm.status = PERPETUAL_STATUS.ENABLED
  contractForm.sortOrder = Math.max(0, ...products.value.map((item) => Number(item.sortOrder) || 0)) + 10
  contractForm.templateId = templates.value[0]?.id || 'all-levels'
  contractForm.minBuy = '10'
  contractForm.maxBuy = '100000'
  contractForm.maxPosition = '500000'
  contractForm.buyFee = '0.02'
  contractForm.sellFee = '0.05'
}

const steps = [
  { key: PERPETUAL_CONTRACT_STEP.BASE, label: '基本信息' },
  { key: PERPETUAL_CONTRACT_STEP.LEVERAGE, label: '杠杆设置' },
  { key: PERPETUAL_CONTRACT_STEP.LIMIT, label: '交易限制' },
  { key: PERPETUAL_CONTRACT_STEP.FEE, label: '费率' }
]

const selectedTemplate = computed(() => templates.value.find((item) => item.id === contractForm.templateId) || null)

const limitValid = computed(() => (
  Number(contractForm.maxBuy) <= 0 ||
  Number(contractForm.maxPosition) <= 0 ||
  Number(contractForm.maxBuy) <= Number(contractForm.maxPosition)
))
const tradeLimitValuesValid = computed(() => {
  const minBuy = Number(contractForm.minBuy)
  const maxBuy = Number(contractForm.maxBuy)
  const maxPosition = Number(contractForm.maxPosition)
  if (![minBuy, maxBuy, maxPosition].every((value) => Number.isFinite(value) && value >= 0)) return false
  if (minBuy > 0 && maxBuy > 0 && maxBuy < minBuy) return false
  if (maxBuy > 0 && maxPosition > 0 && maxPosition < maxBuy) return false
  return true
})

const isContractValid = computed(() => {
  const requiredOk = contractForm.productName.trim() && contractForm.productCode.trim() && selectedTemplate.value
  const feeOk = Number(contractForm.buyFee) >= 0 && Number(contractForm.sellFee) >= 0
  return Boolean(requiredOk && tradeLimitValuesValid.value && feeOk)
})

const openCreateContract = () => {
  editingContractId.value = null
  resetContractForm()
  showContractModal.value = true
  contractStep.value = PERPETUAL_CONTRACT_STEP.BASE
}

const openEditContract = (item) => {
  const { baseCurrency, quoteCurrency } = parsePair(item.pair)
  editingContractId.value = item.id
  contractForm.productName = item.name
  contractForm.productCode = item.code
  contractForm.baseCurrency = baseCurrency
  contractForm.quoteCurrency = quoteCurrency
  contractForm.spotSymbol = `${baseCurrency}/${quoteCurrency}`
  contractForm.status = item.status
  contractForm.sortOrder = Number(item.sortOrder ?? 0)
  contractForm.templateId = item.templateId || templates.value.find((tpl) => tpl.name === item.templateName)?.id || templates.value[0]?.id || ''
  contractForm.minBuy = parseNumeric(item.minBuy)
  contractForm.maxBuy = parseNumeric(item.maxBuy)
  contractForm.maxPosition = parseNumeric(item.maxPosition)
  contractForm.buyFee = parseNumeric(item.buyFee)
  contractForm.sellFee = parseNumeric(item.sellFee)
  contractStep.value = PERPETUAL_CONTRACT_STEP.BASE
  showContractModal.value = true
}

const submitContract = () => {
  if (!isContractValid.value || !selectedTemplate.value) return
  const payload = {
    name: contractForm.productName.trim(),
    code: contractForm.productCode.trim(),
    pair: `${contractForm.baseCurrency}/${contractForm.quoteCurrency}`,
    status: contractForm.status,
    sortOrder: Number(contractForm.sortOrder),
    templateId: selectedTemplate.value.id,
    templateName: selectedTemplate.value.name,
    leverageRange: selectedTemplate.value.leverageRange,
    buyRange: tradeLimitRangeText(contractForm.minBuy, contractForm.maxBuy),
    maxPosition: tradeLimitUsdtText(contractForm.maxPosition),
    minBuy: tradeLimitUsdtText(contractForm.minBuy),
    maxBuy: tradeLimitUsdtText(contractForm.maxBuy),
    buyFee: `${Number(contractForm.buyFee).toFixed(3)}%`,
    sellFee: `${Number(contractForm.sellFee).toFixed(3)}%`,
    leverageBadges: buildLeverageBadges(selectedTemplate.value.levels)
  }

  if (editingContractId.value) {
    products.value = products.value.map((item) => (item.id === editingContractId.value ? { ...item, ...payload } : item))
  } else {
    products.value.unshift({
      id: `prod-${Date.now()}`,
      ...payload
    })
  }

  ensureControlConfig(toSymbol(payload.pair))

  syncProductsWithTemplates()
  normalizeProductOrder()
  refreshTemplateUsage()
  showContractModal.value = false
  editingContractId.value = null
  resetContractForm()
}

const stepText = computed(() => {
  if (!selectedTemplate.value) return []
  return selectedTemplate.value.levels
})

const pairOptions = ref([])

const syncPairToCurrencies = (pair) => {
  const { baseCurrency, quoteCurrency } = parsePair(pair || '')
  if (baseCurrency) contractForm.baseCurrency = baseCurrency
  if (quoteCurrency) contractForm.quoteCurrency = quoteCurrency
}

const loadSpotSymbols = async () => {
  try {
    const result = await symbolApi.getSymbolList({
      page: 1,
      pageSize: 1000,
      is_open: '1',
      includeDeleted: false
    })
    if (result?.success) {
      const list = Array.isArray(result.data?.list) ? result.data.list : []
      const pairs = Array.from(
        new Set(
          list
            .map((it) => String(it.symbol_name || '').trim())
            .filter(Boolean)
        )
      )
      pairOptions.value = pairs
      if (!contractForm.spotSymbol || !pairOptions.value.includes(contractForm.spotSymbol)) {
        contractForm.spotSymbol = pairOptions.value[0] || ''
      }
      syncPairToCurrencies(contractForm.spotSymbol)
    }
  } catch (e) {
  }
}

watch(
  () => contractForm.spotSymbol,
  (val) => {
    syncPairToCurrencies(val)
  }
)

onMounted(() => {
  loadSpotSymbols()
})
</script>

<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">永续合约管理</h1>
        <p class="mt-1 text-sm text-slate-500">管理永续合约产品配置</p>
      </div>
    </header>

    <article class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex w-full flex-wrap items-center gap-2 md:w-auto">
          <div class="flex items-center gap-2">
            <span class="text-sm text-slate-600 whitespace-nowrap">币种类型</span>
            <CurrencyTypeSelect v-model="currencyTypeDraft" class="shrink-0" />
          </div>

          <div class="flex items-center gap-2 w-full sm:w-auto">
            <span class="text-sm text-slate-600 whitespace-nowrap">产品名称</span>
            <div class="relative w-full sm:w-80">
              <input
                v-model="searchDraft"
                type="text"
                class="ant-input w-full pl-9 !h-8"
                placeholder="搜索产品名称或代码..."
                @keyup.enter="applySearch"
              />
              <svg viewBox="0 0 20 20" class="pointer-events-none absolute left-3 top-2 h-4 w-4 text-slate-400" fill="none">
                <circle cx="9" cy="9" r="5.8" stroke="currentColor" stroke-width="1.6" />
                <path d="M13.6 13.6L16.4 16.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button type="button" class="ant-btn !h-8" @click="resetSearch">
            <span>重置</span>
          </button>
          <button type="button" class="ant-btn ant-btn-primary !h-8" @click="applySearch">
            <span>搜索</span>
          </button>
        </div>
      </div>
    </article>

    <article class="rounded-xl border border-slate-200 bg-white">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div class="inline-flex items-center gap-2 text-sm">
          <button type="button" class="font-medium" :class="statusTab === PERPETUAL_COMMON_FILTER_ALL ? 'text-blue-600' : 'text-slate-500'" @click="statusTab = PERPETUAL_COMMON_FILTER_ALL">全部</button>
          <button
            type="button"
            class="font-medium"
            :class="statusTab === PERPETUAL_STATUS.ENABLED ? 'text-blue-600' : 'text-slate-500'"
            @click="statusTab = PERPETUAL_STATUS.ENABLED"
          >
            已启用
          </button>
          <button
            type="button"
            class="font-medium"
            :class="statusTab === PERPETUAL_STATUS.DISABLED ? 'text-blue-600' : 'text-slate-500'"
            @click="statusTab = PERPETUAL_STATUS.DISABLED"
          >
            已禁用
          </button>
          <span class="ml-2 text-slate-400">|</span>
          <span class="text-slate-500">共 <span class="font-medium text-slate-700">{{ filteredProducts.length }}</span> 个</span>
        </div>

        <button type="button" class="ant-btn ant-btn-primary !h-8 shrink-0" @click="openCreateContract">
          <span>+ 新增合约</span>
        </button>
      </div>

      <div class="space-y-4 p-4">
        <article v-for="item in paginatedProducts" :key="item.id" class="rounded-xl border border-slate-200 bg-white">
          <div class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">#{{ item.sortOrder }}</span>
                <h3 class="text-lg font-semibold text-slate-900">{{ item.name }}</h3>
                <span class="text-sm text-slate-500">{{ item.code }}</span>
                <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="productStatusMeta[item.status]?.badgeClass">
                  {{ productStatusMeta[item.status]?.text || '未知状态' }}
                </span>
                <span class="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{{ currencyTypeLabel(currencyTypeByPair(item.pair)) }}</span>
              </div>
              <p class="mt-2 text-sm text-slate-700">
                交易对: {{ item.pair }}
                <span class="mx-3 text-slate-300">|</span>
                杠杆范围: {{ item.leverageRange }}
                <span class="mx-3 text-slate-300">|</span>
                买入范围: {{ item.buyRange }}
                <span class="mx-3 text-slate-300">|</span>
                最大持仓: {{ item.maxPosition }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <!-- <div class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  class="rounded px-2 py-1 text-xs"
                  :class="canMoveProductUp(item.id) ? 'text-slate-700 hover:bg-white' : 'cursor-not-allowed text-slate-300'"
                  :disabled="!canMoveProductUp(item.id)"
                  @click="moveProductOrder(item.id, 'up')"
                >
                  上移
                </button>
                <button
                  type="button"
                  class="rounded px-2 py-1 text-xs"
                  :class="canMoveProductDown(item.id) ? 'text-slate-700 hover:bg-white' : 'cursor-not-allowed text-slate-300'"
                  :disabled="!canMoveProductDown(item.id)"
                  @click="moveProductOrder(item.id, 'down')"
                >
                  下移
                </button>
              </div> -->
              <button
                type="button"
                class="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm text-violet-600"
                @click="openControlModal(item)"
              >
                线控设置
              </button>
              <button type="button" class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700" @click="openEditContract(item)">编辑</button>
            </div>
          </div>

          <div class="grid gap-0 md:grid-cols-3">
            <div class="border-b border-slate-200 p-4 md:border-b-0 md:border-r">
              <p class="text-sm text-slate-500">杠杆模板</p>
              <p class="mt-2 font-medium text-slate-900">{{ item.templateName }}</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <span v-for="tag in item.leverageBadges" :key="tag" class="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">{{ tag }}</span>
              </div>
            </div>
            <div class="border-b border-slate-200 p-4 md:border-b-0 md:border-r">
              <p class="text-sm text-slate-500">交易限制</p>
              <ul class="mt-2 space-y-1 text-sm text-slate-700">
                <li><span class="font-medium">最低买入:</span> {{ item.minBuy }}</li>
                <li><span class="font-medium">最大买入:</span> {{ item.maxBuy }}</li>
                <li><span class="font-medium">最大持仓:</span> {{ item.maxPosition }}</li>
              </ul>
            </div>
            <div class="p-4">
              <p class="text-sm text-slate-500">费率</p>
              <ul class="mt-2 space-y-1 text-sm text-slate-700">
                <li><span class="font-medium">买入费率:</span> {{ item.buyFee }}</li>
                <li><span class="font-medium">卖出费率:</span> {{ item.sellFee }}</li>
              </ul>
            </div>
          </div>
        </article>

        <!-- 分页 -->
        <div v-if="totalPages > 1" class="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <div class="text-sm text-slate-500">
            共 <span class="font-medium">{{ filteredProducts.length }}</span> 个产品，第 <span class="font-medium">{{ pagination.currentPage }}</span> / <span class="font-medium">{{ totalPages }}</span> 页
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="pagination.currentPage === 1"
              @click="pagination.currentPage--"
            >
              上一页
            </button>
            <button
              type="button"
              class="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="pagination.currentPage === totalPages"
              @click="pagination.currentPage++"
            >
              下一页
            </button>
          </div>
        </div>

        <p v-if="filteredProducts.length === 0" class="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">没有匹配的合约产品</p>
      </div>
    </article>
  </section>

  <div v-if="showContractModal" class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
    <section class="w-full max-w-3xl rounded-xl bg-white">
      <header class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 class="text-2xl font-semibold text-slate-900">{{ editingContractId ? '编辑永续合约' : '新增永续合约' }}</h2>
        <button type="button" class="text-2xl text-slate-400 hover:text-slate-700" @click="showContractModal = false">×</button>
      </header>

      <div class="px-6 pt-4">
        <div class="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            v-for="step in steps"
            :key="step.key"
            type="button"
            class="rounded-md px-4 py-1.5 text-sm"
            :class="contractStep === step.key ? 'bg-white font-medium text-blue-600 shadow-sm' : 'text-slate-600'"
            @click="contractStep = step.key"
          >
            {{ step.label }}
          </button>
        </div>
      </div>

      <div class="space-y-5 px-6 py-5">
        <div v-if="contractStep === PERPETUAL_CONTRACT_STEP.BASE" class="grid gap-4 md:grid-cols-2">
          <label class="space-y-2">
            <span class="text-sm font-medium">产品名称 <span class="text-rose-500">*</span></span>
            <input v-model="contractForm.productName" type="text" class="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
          </label>
          <label class="space-y-2">
            <span class="text-sm font-medium">产品代码 <span class="text-rose-500">*</span></span>
            <input v-model="contractForm.productCode" type="text" class="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
          </label>
          <label class="space-y-2 md:col-span-2">
            <span class="text-sm font-medium">选择交易对 <span class="text-rose-500">*</span></span>
            <select v-model="contractForm.spotSymbol" class="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500">
              <option v-for="opt in pairOptions" :key="`pair-${opt}`" :value="opt">{{ opt }}</option>
            </select>
          </label>
          <div class="space-y-2">
            <span class="text-sm font-medium">产品状态</span>
            <div class="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                class="rounded-md px-4 py-1.5 text-sm"
                :class="contractForm.status === PERPETUAL_STATUS.ENABLED ? 'bg-emerald-100 font-medium text-emerald-700' : 'text-slate-600'"
                @click="contractForm.status = PERPETUAL_STATUS.ENABLED"
              >
                已启用
              </button>
              <button
                type="button"
                class="rounded-md px-4 py-1.5 text-sm"
                :class="contractForm.status === PERPETUAL_STATUS.DISABLED ? 'bg-rose-100 font-medium text-rose-700' : 'text-slate-600'"
                @click="contractForm.status = PERPETUAL_STATUS.DISABLED"
              >
                已禁用
              </button>
            </div>
          </div>
          <label class="space-y-2">
            <span class="text-sm font-medium">产品排序</span>
            <input v-model.number="contractForm.sortOrder" type="number" placeholder="数字越大越靠前" class="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
          </label>
        </div>

        <div v-if="contractStep === PERPETUAL_CONTRACT_STEP.LEVERAGE" class="space-y-4">
          <label class="block max-w-md space-y-2">
            <span class="text-sm font-medium">选择杠杆模板 <span class="text-rose-500">*</span></span>
            <select v-model="contractForm.templateId" class="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500">
              <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
            </select>
          </label>

          <article v-if="selectedTemplate" class="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h4 class="font-medium text-slate-900">模板详情: {{ selectedTemplate.name }}</h4>
            <div class="mt-3 flex flex-wrap gap-2">
              <span v-for="lv in stepText" :key="`modal-${lv}`" class="rounded-md bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600">{{ lv }}</span>
            </div>
            <p class="mt-3 text-sm text-slate-600">- 用户可在以上 {{ selectedTemplate.leverageCount }} 个档位中选择杠杆倍数</p>
            <p class="text-sm text-slate-600">- 杠杆范围: {{ selectedTemplate.leverageRange }}</p>
          </article>

          <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p class="font-medium">杠杆模板说明:</p>
            <p class="mt-1">- 杠杆模板定义了该合约产品可用的杠杆倍数档位</p>
            <p>- 用户在交易时可以从模板中选择任意档位</p>
            <p>- 不同的杠杆模板以便不同风险偏好的用户</p>
            <p class="mt-1 font-medium text-rose-500">杠杆越高，强制平仓风险越大</p>
          </div>
        </div>

        <div v-if="contractStep === PERPETUAL_CONTRACT_STEP.LIMIT" class="space-y-4">
          <div class="grid gap-4 md:grid-cols-3">
            <label class="space-y-2">
              <span class="text-sm font-medium">最低买入量 (USDT) <span class="text-rose-500">*</span></span>
              <input v-model="contractForm.minBuy" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
              <span class="block text-xs leading-5 text-slate-500">输入 0 表示最低买入量不限制。</span>
            </label>
            <label class="space-y-2">
              <span class="text-sm font-medium">最大买入量 (USDT) <span class="text-rose-500">*</span></span>
              <input v-model="contractForm.maxBuy" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
              <span class="block text-xs leading-5 text-slate-500">输入 0 表示最大买入量不限制。</span>
            </label>
            <label class="space-y-2">
              <span class="text-sm font-medium">最大持仓量 (USDT) <span class="text-rose-500">*</span></span>
              <input v-model="contractForm.maxPosition" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
              <span class="block text-xs leading-5 text-slate-500">输入 0 表示最大持仓量不限制。</span>
            </label>
          </div>

          <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p class="font-medium text-slate-800">交易限制说明</p>
            <p class="mt-2">- 单笔交易范围: {{ tradeLimitRangeText(contractForm.minBuy, contractForm.maxBuy) }}</p>
            <p>- 最大持仓: {{ tradeLimitUsdtText(contractForm.maxPosition) }}</p>
            <p>- 上述限制输入 0 表示不限制。</p>
            <p class="mt-1" :class="limitValid ? 'text-slate-500' : 'font-medium text-rose-500'">注意: 最大买入量不能超过最大持仓量；任一项填 0 时不做大小比较。</p>
          </div>
        </div>

        <div v-if="contractStep === PERPETUAL_CONTRACT_STEP.FEE" class="space-y-4">
          <div class="grid gap-4 md:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-medium">买入费率 <span class="text-rose-500">*</span></span>
              <input v-model="contractForm.buyFee" type="number" step="0.001" class="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
            </label>
            <label class="space-y-2">
              <span class="text-sm font-medium">卖出费率 <span class="text-rose-500">*</span></span>
              <input v-model="contractForm.sellFee" type="number" step="0.001" class="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
            </label>
          </div>

          <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p class="font-medium text-slate-800">费率说明</p>
            <p class="mt-2">- 买入费率: {{ pctText(contractForm.buyFee) }}</p>
            <p>- 卖出费率: {{ pctText(contractForm.sellFee) }}</p>
          </div>
        </div>
      </div>

      <footer class="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <button type="button" class="rounded-lg border border-slate-200 px-4 py-2" @click="showContractModal = false">取消</button>
        <button
          type="button"
          class="rounded-lg px-4 py-2 font-medium text-white"
          :class="isContractValid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300'"
          :disabled="!isContractValid"
          @click="submitContract"
        >
          {{ editingContractId ? '保存' : '创建' }}
        </button>
      </footer>
    </section>
  </div>

  <ControlConfigModal
    :open="controlModalOpen"
    :symbol="activeControlSymbol"
    :config="controlConfigs[activeControlSymbol] || createDefaultPerpetualControlConfig()"
    @close="controlModalOpen = false"
    @save="saveControlConfig"
  />
</template>
