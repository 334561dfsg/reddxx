<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  COMMON_FILTER_ALL,
  DELIVERY_CONTRACT_TAB,
  DELIVERY_STATUS,
  sortDeliveryProducts
} from '../../../admin/constants/delivery'
import { ASSET_CURRENCY_TYPE } from '../../../admin/constants/assets'
import CurrencyTypeSelect from '../../../admin/components/CurrencyTypeSelect.vue'
import { createDeliveryProductsMock, createDeliveryTemplatesMock } from '../../../admin/mock/delivery'
import { createAssetsCoinsMock } from '../../../admin/mock/assets'
import { symbolApi } from '../../../admin/mock/spot'

const statusTab = ref(COMMON_FILTER_ALL)
const searchDraft = ref('')
const currencyTypeDraft = ref('all')
const searchApplied = ref('')
const currencyTypeApplied = ref('all')

const templates = ref(createDeliveryTemplatesMock())
const products = ref(createDeliveryProductsMock())
const assetsCoins = createAssetsCoinsMock()

// 分页状态
const pagination = reactive({
  currentPage: 1,
  pageSize: 5,
  total: 0
})

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
  const [baseCurrency] = String(pair || '').split('/')
  return currencyTypeBySymbol(baseCurrency)
}

const currencyTypeLabel = (value) => {
  const type = normalizeCurrencyType(value)
  if (type === ASSET_CURRENCY_TYPE.VIRTUAL) return '虚拟币'
  if (type === ASSET_CURRENCY_TYPE.FIAT) return '法币'
  if (type === ASSET_CURRENCY_TYPE.METAL) return '贵金属'
  return String(type || '')
}

const allFilteredProducts = computed(() => {
  const kw = searchApplied.value.trim().toLowerCase()
  return sortDeliveryProducts(products.value.filter((p) => {
    const hitStatus = statusTab.value === COMMON_FILTER_ALL || p.status === statusTab.value
    const hitKw = !kw || `${p.name} ${p.code} ${p.pair}`.toLowerCase().includes(kw)
    const hitCurrencyType = currencyTypeApplied.value === 'all' || currencyTypeByPair(p.pair) === currencyTypeApplied.value
    return hitStatus && hitKw && hitCurrencyType
  }))
})

const filteredProducts = computed(() => {
  const start = (pagination.currentPage - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return allFilteredProducts.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(allFilteredProducts.value.length / pagination.pageSize))

// 监听筛选变化，重置页码
watch([statusTab, searchApplied, currencyTypeApplied], () => {
  pagination.currentPage = 1
})

const durationLabel = (sec) => {
  if (sec < 60) return `${sec}秒`
  if (sec % 60 === 0) return `${sec / 60}分钟`
  return `${sec}s`
}

const templateById = computed(() => Object.fromEntries(templates.value.map((t) => [t.id, t])))
const productCycles = (product) => templateById.value[product.templateId]?.cycles || []
const productTradeLimitUnlimited = (product) => templateById.value[product.templateId]?.tradeLimitUnlimited === true

const showContractModal = ref(false)
const editingContractId = ref('')
const contractTab = ref(DELIVERY_CONTRACT_TAB.BASIC)
const contractDialogRef = ref(null)
const contractDialogTitleRef = ref(null)
const contractErrorSummaryRef = ref(null)
const lastContractTrigger = ref(null)
const contractDialogClosing = ref(false)

const contractForm = reactive({
  name: '',
  code: '',
  baseCurrency: 'BTC',
  quoteCurrency: 'USDT',
  spotSymbol: '',
  status: DELIVERY_STATUS.ENABLED,
  sortOrder: 0,
  templateId: 'tpl-standard',
  minBuy: '10',
  maxBuy: '10000',
  maxHold: '50000',
  buyFee: '0',
  sellFee: '0.2'
})

const contractErrors = reactive({
  name: '',
  code: '',
  spotSymbol: '',
  templateId: '',
  sortOrder: '',
  minBuy: '',
  maxBuy: '',
  maxHold: '',
  sellFee: ''
})

const selectedTemplate = computed(() => templates.value.find((t) => t.id === contractForm.templateId) || null)
const selectedTemplateCycles = computed(() => selectedTemplate.value?.cycles || [])
const selectedTemplateTradeLimitUnlimited = computed(() => selectedTemplate.value?.tradeLimitUnlimited === true)

const clearContractErrors = () => {
  Object.keys(contractErrors).forEach((key) => {
    contractErrors[key] = ''
  })
}

const contractErrorItems = computed(() => Object.entries(contractErrors)
  .filter(([, message]) => Boolean(message))
  .map(([field, message]) => ({ field, message })))

const contractDialogTitleId = 'delivery-contract-dialog-title'
const contractErrorSummaryId = 'delivery-contract-error-summary'
const contractFieldId = (field) => `delivery-contract-${field}`
const contractFieldErrorId = (field) => `delivery-contract-${field}-error`
const contractFieldDescribedBy = (field, helpId = '') => {
  const ids = []
  if (helpId) ids.push(helpId)
  if (contractErrors[field]) ids.push(contractFieldErrorId(field))
  return ids.length ? ids.join(' ') : undefined
}

const validatePositiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0
const validateNonNegativeNumber = (value) => Number.isFinite(Number(value)) && Number(value) >= 0

const validateContractForm = () => {
  clearContractErrors()

  if (!contractForm.name.trim()) contractErrors.name = '请输入合约名称'
  if (!contractForm.code.trim()) contractErrors.code = '请输入合约代码'
  if (!contractForm.spotSymbol) contractErrors.spotSymbol = '请选择交易对'
  if (!contractForm.templateId) contractErrors.templateId = '请选择周期模板'
  if (!validateNonNegativeNumber(contractForm.sortOrder)) contractErrors.sortOrder = '产品排序必须是大于等于 0 的数字'

  if (!selectedTemplateTradeLimitUnlimited.value) {
    if (!validatePositiveNumber(contractForm.minBuy)) contractErrors.minBuy = '最低买入额必须大于 0'
    if (!validatePositiveNumber(contractForm.maxBuy)) contractErrors.maxBuy = '最高买入额必须大于 0'
    if (!validatePositiveNumber(contractForm.maxHold)) contractErrors.maxHold = '最大持仓额必须大于 0'
    if (!contractErrors.minBuy && !contractErrors.maxBuy && Number(contractForm.maxBuy) < Number(contractForm.minBuy)) {
      contractErrors.maxBuy = '最高买入额不能小于最低买入额'
    }
    if (!contractErrors.maxBuy && !contractErrors.maxHold && Number(contractForm.maxHold) < Number(contractForm.maxBuy)) {
      contractErrors.maxHold = '最大持仓额不能小于最高买入额'
    }
  }

  if (!validateNonNegativeNumber(contractForm.sellFee) || Number(contractForm.sellFee) > 100) {
    contractErrors.sellFee = '交割手续费率必须在 0 到 100 之间'
  }

  return contractErrorItems.value.length === 0
}

const focusFirstContractError = async () => {
  await nextTick()
  contractErrorSummaryRef.value?.focus()
}

const focusContractField = async (field) => {
  contractTab.value = field === 'templateId' ? DELIVERY_CONTRACT_TAB.CYCLE
    : ['minBuy', 'maxBuy', 'maxHold'].includes(field) ? DELIVERY_CONTRACT_TAB.LIMIT
      : field === 'sellFee' ? DELIVERY_CONTRACT_TAB.FEE
        : DELIVERY_CONTRACT_TAB.BASIC
  await nextTick()
  document.getElementById(contractFieldId(field))?.focus()
}

const closeContractModal = () => {
  if (contractDialogClosing.value) return
  contractDialogClosing.value = true
  showContractModal.value = false
}

const openContractModal = async (event) => {
  if (contractDialogClosing.value) return
  lastContractTrigger.value = event?.currentTarget || document.activeElement
  clearContractErrors()
  contractDialogClosing.value = false
  showContractModal.value = true
  await nextTick()
  contractDialogTitleRef.value?.focus()
}

const handleContractModalAfterLeave = () => {
  contractDialogClosing.value = false
  document.body.style.overflow = ''
  lastContractTrigger.value?.focus?.()
  lastContractTrigger.value = null
}

const getContractFocusableElements = () => {
  const dialog = contractDialogRef.value
  if (!dialog) return []
  return Array.from(dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
    .filter((element) => !element.hasAttribute('disabled') && element.offsetParent !== null)
}

const handleContractDialogKeydown = (event) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeContractModal()
    return
  }
  if (event.key !== 'Tab') return

  const focusable = getContractFocusableElements()
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

const openCreateContract = (event) => {
  editingContractId.value = ''
  contractTab.value = DELIVERY_CONTRACT_TAB.BASIC
  contractForm.name = ''
  contractForm.code = ''
  contractForm.baseCurrency = 'BTC'
  contractForm.quoteCurrency = 'USDT'
  contractForm.spotSymbol = ''
  contractForm.status = DELIVERY_STATUS.ENABLED
  contractForm.sortOrder = Math.max(0, ...products.value.map((item) => Number(item.sortOrder) || 0)) + 10
  contractForm.templateId = templates.value[0]?.id || ''
  contractForm.minBuy = '10'
  contractForm.maxBuy = '10000'
  contractForm.maxHold = '50000'
  contractForm.buyFee = '0'
  contractForm.sellFee = '0.2'
  openContractModal(event)
}

const openEditContract = (item, event) => {
  editingContractId.value = item.id
  contractTab.value = DELIVERY_CONTRACT_TAB.BASIC
  contractForm.name = item.name
  contractForm.code = item.code
  const [baseCurrency, quoteCurrency] = item.pair.split('/')
  contractForm.baseCurrency = baseCurrency
  contractForm.quoteCurrency = quoteCurrency
  contractForm.spotSymbol = `${baseCurrency}/${quoteCurrency}`
  contractForm.status = item.status
  contractForm.sortOrder = Number(item.sortOrder ?? 0)
  contractForm.templateId = item.templateId
  contractForm.minBuy = item.minBuy
  contractForm.maxBuy = item.maxBuy
  contractForm.maxHold = item.maxHold
  contractForm.buyFee = '0'
  contractForm.sellFee = item.sellFee ?? item.deliveryFee ?? '0'
  openContractModal(event)
}

const saveContract = async () => {
  if (!validateContractForm()) {
    await focusFirstContractError()
    return
  }

  const payload = {
    name: contractForm.name.trim(),
    code: contractForm.code.trim().toUpperCase(),
    pair: `${contractForm.baseCurrency}/${contractForm.quoteCurrency}`,
    status: contractForm.status,
    sortOrder: Number(contractForm.sortOrder),
    templateId: contractForm.templateId,
    templateName: selectedTemplate.value?.name || '-',
    buyRange: `${Number(contractForm.minBuy).toLocaleString()} - ${Number(contractForm.maxBuy).toLocaleString()} USDT`,
    maxPosition: `${Number(contractForm.maxHold).toLocaleString()} USDT`,
    minBuy: contractForm.minBuy,
    maxBuy: contractForm.maxBuy,
    maxHold: contractForm.maxHold,
    buyFee: '0',
    sellFee: contractForm.sellFee
  }

  if (editingContractId.value) {
    products.value = products.value.map((item) => (item.id === editingContractId.value ? { ...item, ...payload } : item))
  } else {
    products.value.unshift({ id: `prod-${Date.now()}`, ...payload })
  }

  closeContractModal()
}

const statusClass = (status) =>
  status === DELIVERY_STATUS.ENABLED
    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
    : 'bg-rose-50 text-rose-600 border-rose-100'

const pairOptions = ref([])

const syncPairToCurrencies = (pair) => {
  const parts = String(pair || '').split('/')
  const base = parts[0] || ''
  const quote = parts[1] || ''
  if (base) contractForm.baseCurrency = base
  if (quote) contractForm.quoteCurrency = quote
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

watch(showContractModal, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  }
})

onMounted(() => {
  loadSpotSymbols()
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <section class="space-y-4">
    <!-- Page Header -->
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">交割合约管理</h1>
        <p class="mt-1 text-sm text-slate-500">管理平台交割合约产品的核心配置，包括周期模板、交易限额及手续费率</p>
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
                id="delivery-contract-search"
                v-model="searchDraft"
                type="text"
                class="ant-input w-full pl-9 !h-8"
                placeholder="搜索产品名称或代码..."
                aria-label="搜索交割合约产品名称或代码"
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
        <div class="inline-flex items-center gap-6 text-sm" role="tablist" aria-label="交割合约产品状态筛选">
          <button
            type="button"
            role="tab"
            :aria-selected="statusTab === COMMON_FILTER_ALL"
            class="relative py-2 font-medium transition-colors"
            :class="statusTab === COMMON_FILTER_ALL ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600' : 'text-slate-500 hover:text-slate-700'"
            @click="statusTab = COMMON_FILTER_ALL"
          >
            全部
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="statusTab === DELIVERY_STATUS.ENABLED"
            class="relative py-2 font-medium transition-colors"
            :class="statusTab === DELIVERY_STATUS.ENABLED ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600' : 'text-slate-500 hover:text-slate-700'"
            @click="statusTab = DELIVERY_STATUS.ENABLED"
          >
            已启用
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="statusTab === DELIVERY_STATUS.DISABLED"
            class="relative py-2 font-medium transition-colors"
            :class="statusTab === DELIVERY_STATUS.DISABLED ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600' : 'text-slate-500 hover:text-slate-700'"
            @click="statusTab = DELIVERY_STATUS.DISABLED"
          >
            已禁用
          </button>
          <span class="text-slate-400">|</span>
          <span class="text-slate-500">共 <span class="font-medium text-slate-700">{{ allFilteredProducts.length }}</span> 个</span>
        </div>

        <button type="button" class="ant-btn ant-btn-primary !h-8 shrink-0" @click="openCreateContract($event)">
          <span>+ 新增合约</span>
        </button>
      </div>

      <div class="p-4 space-y-4">
        <article
          v-for="item in filteredProducts"
          :key="item.id"
          class="rounded-lg border border-slate-200 bg-white transition-all hover:border-blue-500/30 hover:shadow-md"
        >
          <div class="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-4">
            <div class="flex-1">
              <div class="flex items-center gap-3 flex-wrap">
                <h3 class="text-base font-semibold text-slate-900">{{ item.name }}</h3>
                <span class="text-sm font-mono text-slate-500">{{ item.code }}</span>
                <span
                  class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border"
                  :class="statusClass(item.status)"
                >
                  {{ item.status === DELIVERY_STATUS.ENABLED ? '已启用' : '已禁用' }}
                </span>
                <span class="px-2 py-0.5 text-xs text-slate-600 bg-slate-100 border border-slate-200 rounded">
                  {{ currencyTypeLabel(currencyTypeByPair(item.pair)) }}
                </span>
                <span class="px-2 py-0.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded">
                  {{ item.templateName }}
                </span>
              </div>
              <p class="mt-2 text-sm text-slate-600">
                交易对: <span class="text-slate-900 font-medium">{{ item.pair }}</span>
                <span class="mx-3 text-slate-200">|</span>
                <template v-if="productTradeLimitUnlimited(item)">
                  交易限制: <span class="font-medium text-blue-600">不限制</span>
                </template>
                <template v-else>
                  买入范围: <span class="text-slate-900 font-medium">{{ item.buyRange }}</span>
                  <span class="mx-3 text-slate-200">|</span>
                  最大持仓: <span class="text-slate-900 font-medium">{{ item.maxPosition }}</span>
                </template>
              </p>
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <span class="text-xs text-slate-400">可选周期:</span>
                <span
                  v-for="cycle in productCycles(item)"
                  :key="cycle.id"
                  class="px-2 py-0.5 text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded"
                >
                  {{ durationLabel(cycle.durationSec) }} ({{ cycle.payoutPct.toFixed(1) }}%)
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="ant-btn "
                @click="openEditContract(item, $event)"
              >
                编辑
              </button>
            </div>
          </div>

          <div class="grid gap-0 md:grid-cols-2 bg-slate-50/30">
            <div class="border-b border-slate-100 p-4 md:border-b-0 md:border-r">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">交易限制</p>
              <div v-if="productTradeLimitUnlimited(item)" class="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                <p class="font-medium">不限制</p>
                <p class="mt-1 text-xs text-blue-600">由周期模版统一声明为不限额。</p>
              </div>
              <ul v-else class="mt-3 grid grid-cols-3 gap-4 text-sm">
                <li class="flex flex-col gap-1">
                  <span class="text-slate-500 text-xs">最低买入</span>
                  <span class="text-slate-900 font-semibold font-mono">{{ Number(item.minBuy).toLocaleString() }}</span>
                </li>
                <li class="flex flex-col gap-1">
                  <span class="text-slate-500 text-xs">最大买入</span>
                  <span class="text-slate-900 font-semibold font-mono">{{ Number(item.maxBuy).toLocaleString() }}</span>
                </li>
                <li class="flex flex-col gap-1">
                  <span class="text-slate-500 text-xs">最大持仓</span>
                  <span class="text-slate-900 font-semibold font-mono">{{ Number(item.maxHold).toLocaleString() }}</span>
                </li>
              </ul>
            </div>
            <div class="p-4">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">手续费率</p>
              <ul class="mt-3 grid grid-cols-1 gap-4 text-sm">
                <li class="flex flex-col gap-1">
                  <span class="text-slate-500 text-xs">交割费率</span>
                  <span class="text-rose-600 font-bold font-mono">{{ Number(item.sellFee).toFixed(2) }}%</span>
                </li>
              </ul>
            </div>
          </div>
        </article>
      </div>

      <!-- 分页组件 -->
      <div v-if="totalPages > 1" class="flex items-center justify-between border-t border-slate-100 p-4">
        <div class="text-sm text-slate-500">
          共 <span class="font-medium text-slate-900">{{ allFilteredProducts.length }}</span> 条记录
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="ant-btn ant-btn-sm"
            :disabled="pagination.currentPage === 1"
            @click="pagination.currentPage--"
          >
            上一页
          </button>
          <div class="flex items-center gap-1">
            <button
              v-for="p in totalPages"
              :key="p"
              type="button"
              class="ant-btn ant-btn-sm w-8 p-0"
              :class="pagination.currentPage === p ? 'ant-btn-primary' : ''"
              @click="pagination.currentPage = p"
            >
              {{ p }}
            </button>
          </div>
          <button
            type="button"
            class="ant-btn ant-btn-sm"
            :disabled="pagination.currentPage === totalPages"
            @click="pagination.currentPage++"
          >
            下一页
          </button>
        </div>
      </div>
    </article>

    <!-- 编辑模态框 -->
    <Transition name="modal" @after-leave="handleContractModalAfterLeave">
      <div
        v-if="showContractModal"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      >
        <section
          ref="contractDialogRef"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="contractDialogTitleId"
          class="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl sm:max-h-[calc(100dvh-2rem)]"
          @keydown="handleContractDialogKeydown"
        >
          <header class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2
                :id="contractDialogTitleId"
                ref="contractDialogTitleRef"
                tabindex="-1"
                class="text-lg font-semibold text-slate-900 outline-none"
              >
                {{ editingContractId ? '编辑交割合约' : '新增交割合约' }}
              </h2>
            </div>
            <button
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded-lg text-2xl leading-none text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="关闭"
              @click="closeContractModal"
            >
              ×
            </button>
          </header>

          <div class="px-6 border-b border-slate-100 bg-white">
            <div class="flex gap-8 overflow-x-auto" role="tablist" aria-label="交割合约编辑步骤">
              <button
                v-for="(label, key) in {
                  [DELIVERY_CONTRACT_TAB.BASIC]: '基本信息',
                  [DELIVERY_CONTRACT_TAB.CYCLE]: '周期设置',
                  [DELIVERY_CONTRACT_TAB.LIMIT]: '交易限制',
                  [DELIVERY_CONTRACT_TAB.FEE]: '费率设置'
                }"
                :key="key"
                type="button"
                role="tab"
                :id="`delivery-contract-tab-${key}`"
                :aria-selected="contractTab === key"
                :aria-controls="`delivery-contract-panel-${key}`"
                class="relative py-3 text-sm transition-all"
                :class="
                  contractTab === key
                    ? 'text-blue-600 font-medium after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                "
                @click="contractTab = key"
              >
                {{ label }}
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto bg-white p-6 space-y-6">
            <div
              v-if="contractErrorItems.length"
              :id="contractErrorSummaryId"
              ref="contractErrorSummaryRef"
              tabindex="-1"
              class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 outline-none focus:ring-2 focus:ring-rose-400"
            >
              <p class="font-medium">请修复以下 {{ contractErrorItems.length }} 项后再保存</p>
              <ul class="mt-2 list-disc space-y-1 pl-5">
                <li v-for="error in contractErrorItems" :key="error.field">
                  <button type="button" class="text-left underline underline-offset-2" @click="focusContractField(error.field)">
                    {{ error.message }}
                  </button>
                </li>
              </ul>
            </div>

            <div class="space-y-6">
              <div
                v-if="contractTab === DELIVERY_CONTRACT_TAB.BASIC"
                :id="`delivery-contract-panel-${DELIVERY_CONTRACT_TAB.BASIC}`"
                role="tabpanel"
                :aria-labelledby="`delivery-contract-tab-${DELIVERY_CONTRACT_TAB.BASIC}`"
                class="grid gap-6 md:grid-cols-2"
              >
                <div class="space-y-1.5">
                  <label class="text-sm text-slate-900" :for="contractFieldId('name')">合约名称 <span class="text-rose-500">*</span></label>
                  <input
                    :id="contractFieldId('name')"
                    v-model="contractForm.name"
                    type="text"
                    class="ant-input"
                    placeholder="如：BTC 周期合约"
                    :aria-invalid="Boolean(contractErrors.name)"
                    :aria-describedby="contractFieldDescribedBy('name')"
                  />
                  <p v-if="contractErrors.name" :id="contractFieldErrorId('name')" class="text-xs text-rose-600">{{ contractErrors.name }}</p>
                </div>
                <div class="space-y-1.5">
                  <label class="text-sm text-slate-900" :for="contractFieldId('code')">合约代码 <span class="text-rose-500">*</span></label>
                  <input
                    :id="contractFieldId('code')"
                    v-model="contractForm.code"
                    type="text"
                    class="ant-input uppercase"
                    placeholder="如：BTC_DELIVERY"
                    :aria-invalid="Boolean(contractErrors.code)"
                    :aria-describedby="contractFieldDescribedBy('code')"
                  />
                  <p v-if="contractErrors.code" :id="contractFieldErrorId('code')" class="text-xs text-rose-600">{{ contractErrors.code }}</p>
                </div>
                <div class="space-y-1.5 md:col-span-2">
                  <label class="text-sm text-slate-900" :for="contractFieldId('spotSymbol')">选择交易对 <span class="text-rose-500">*</span></label>
                  <select
                    :id="contractFieldId('spotSymbol')"
                    v-model="contractForm.spotSymbol"
                    class="ant-select w-full"
                    :aria-invalid="Boolean(contractErrors.spotSymbol)"
                    :aria-describedby="contractFieldDescribedBy('spotSymbol')"
                  >
                    <option v-for="opt in pairOptions" :key="`pair-${opt}`" :value="opt">{{ opt }}</option>
                  </select>
                  <p v-if="contractErrors.spotSymbol" :id="contractFieldErrorId('spotSymbol')" class="text-xs text-rose-600">{{ contractErrors.spotSymbol }}</p>
                </div>
                <div class="space-y-1.5">
                  <span id="delivery-contract-status-label" class="block text-sm text-slate-900">产品状态</span>
                  <div class="inline-flex rounded border border-slate-200 p-0.5 bg-slate-50 mt-1" role="radiogroup" aria-labelledby="delivery-contract-status-label">
                    <button
                      type="button"
                      role="radio"
                      :aria-checked="contractForm.status === DELIVERY_STATUS.ENABLED"
                      class="px-4 py-1 text-xs rounded transition-all"
                      :class="
                        contractForm.status === DELIVERY_STATUS.ENABLED
                          ? 'bg-white shadow-sm text-blue-600 font-medium'
                          : 'text-slate-500 hover:text-slate-700'
                      "
                      @click="contractForm.status = DELIVERY_STATUS.ENABLED"
                    >
                      已启用
                    </button>
                    <button
                      type="button"
                      role="radio"
                      :aria-checked="contractForm.status === DELIVERY_STATUS.DISABLED"
                      class="px-4 py-1 text-xs rounded transition-all"
                      :class="
                        contractForm.status === DELIVERY_STATUS.DISABLED
                          ? 'bg-white shadow-sm text-blue-600 font-medium'
                          : 'text-slate-500 hover:text-slate-700'
                      "
                      @click="contractForm.status = DELIVERY_STATUS.DISABLED"
                    >
                      已禁用
                    </button>
                  </div>
                </div>
                <div class="space-y-1.5">
                  <label class="block text-sm text-slate-900" :for="contractFieldId('sortOrder')">产品排序</label>
                  <input
                    :id="contractFieldId('sortOrder')"
                    v-model.number="contractForm.sortOrder"
                    type="number"
                    min="0"
                    inputmode="numeric"
                    class="ant-input font-mono"
                    placeholder="数字越大越靠前"
                    :aria-invalid="Boolean(contractErrors.sortOrder)"
                    :aria-describedby="contractFieldDescribedBy('sortOrder', 'delivery-contract-sort-help')"
                  />
                  <p id="delivery-contract-sort-help" class="text-xs text-slate-400">数字越大越靠前，必须为大于等于 0 的数字。</p>
                  <p v-if="contractErrors.sortOrder" :id="contractFieldErrorId('sortOrder')" class="text-xs text-rose-600">{{ contractErrors.sortOrder }}</p>
                </div>
              </div>

              <div
                v-if="contractTab === DELIVERY_CONTRACT_TAB.CYCLE"
                :id="`delivery-contract-panel-${DELIVERY_CONTRACT_TAB.CYCLE}`"
                role="tabpanel"
                :aria-labelledby="`delivery-contract-tab-${DELIVERY_CONTRACT_TAB.CYCLE}`"
                class="space-y-6"
              >
                <div class="space-y-1.5">
                  <label class="text-sm text-slate-900" :for="contractFieldId('templateId')">选择周期模板 <span class="text-rose-500">*</span></label>
                  <select
                    :id="contractFieldId('templateId')"
                    v-model="contractForm.templateId"
                    class="ant-select"
                    :aria-invalid="Boolean(contractErrors.templateId)"
                    :aria-describedby="contractFieldDescribedBy('templateId')"
                  >
                    <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
                  </select>
                  <p v-if="contractErrors.templateId" :id="contractFieldErrorId('templateId')" class="text-xs text-rose-600">{{ contractErrors.templateId }}</p>
                </div>
                <article v-if="selectedTemplate" class="rounded border border-blue-100 bg-blue-50/30 p-4 space-y-4">
                  <div class="flex items-center justify-between">
                    <h4 class="text-sm font-semibold text-slate-900">模板详情: {{ selectedTemplate.name }}</h4>
                    <span class="text-xs text-blue-600">{{ selectedTemplateCycles.length }} 个预设周期</span>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <div
                      v-for="cycle in selectedTemplateCycles"
                      :key="cycle.id"
                      class="px-3 py-1.5 rounded bg-white border border-blue-100 text-xs flex items-center gap-2"
                    >
                      <span class="text-slate-500">时长:</span>
                      <span class="font-bold text-slate-900">{{ durationLabel(cycle.durationSec) }}</span>
                      <span class="text-slate-200">|</span>
                      <span class="text-slate-500">收益:</span>
                      <span class="font-bold text-emerald-600">{{ cycle.payoutPct }}%</span>
                    </div>
                  </div>
                </article>
              </div>

              <div
                v-if="contractTab === DELIVERY_CONTRACT_TAB.LIMIT"
                :id="`delivery-contract-panel-${DELIVERY_CONTRACT_TAB.LIMIT}`"
                role="tabpanel"
                :aria-labelledby="`delivery-contract-tab-${DELIVERY_CONTRACT_TAB.LIMIT}`"
                class="space-y-6"
              >
                <article
                  v-if="selectedTemplateTradeLimitUnlimited"
                  class="rounded-lg border border-blue-100 bg-blue-50 p-4"
                >
                  <h3 class="text-sm font-semibold text-blue-700">不限交易额度已经打开</h3>
                  <p class="mt-1 text-xs leading-5 text-blue-600">
                    如需调整，在周期模版中进行处理。
                  </p>
                </article>
                <div v-else class="grid gap-6 md:grid-cols-3">
                  <div class="space-y-1.5">
                    <label class="text-sm text-slate-900" :for="contractFieldId('minBuy')">最低买入额 (USDT)</label>
                    <input
                      :id="contractFieldId('minBuy')"
                      v-model="contractForm.minBuy"
                      type="number"
                      min="0"
                      step="0.000001"
                      inputmode="decimal"
                      class="ant-input font-mono"
                      :aria-invalid="Boolean(contractErrors.minBuy)"
                      :aria-describedby="contractFieldDescribedBy('minBuy', 'delivery-contract-limit-help')"
                    />
                    <p v-if="contractErrors.minBuy" :id="contractFieldErrorId('minBuy')" class="text-xs text-rose-600">{{ contractErrors.minBuy }}</p>
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-sm text-slate-900" :for="contractFieldId('maxBuy')">最高买入额 (USDT)</label>
                    <input
                      :id="contractFieldId('maxBuy')"
                      v-model="contractForm.maxBuy"
                      type="number"
                      min="0"
                      step="0.000001"
                      inputmode="decimal"
                      class="ant-input font-mono"
                      :aria-invalid="Boolean(contractErrors.maxBuy)"
                      :aria-describedby="contractFieldDescribedBy('maxBuy', 'delivery-contract-limit-help')"
                    />
                    <p v-if="contractErrors.maxBuy" :id="contractFieldErrorId('maxBuy')" class="text-xs text-rose-600">{{ contractErrors.maxBuy }}</p>
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-sm text-slate-900" :for="contractFieldId('maxHold')">最大持仓额 (USDT)</label>
                    <input
                      :id="contractFieldId('maxHold')"
                      v-model="contractForm.maxHold"
                      type="number"
                      min="0"
                      step="0.000001"
                      inputmode="decimal"
                      class="ant-input font-mono"
                      :aria-invalid="Boolean(contractErrors.maxHold)"
                      :aria-describedby="contractFieldDescribedBy('maxHold', 'delivery-contract-limit-help')"
                    />
                    <p v-if="contractErrors.maxHold" :id="contractFieldErrorId('maxHold')" class="text-xs text-rose-600">{{ contractErrors.maxHold }}</p>
                  </div>
                  <p id="delivery-contract-limit-help" class="text-xs text-slate-400 md:col-span-3">金额单位为 USDT；最高买入额不能小于最低买入额，最大持仓额不能小于最高买入额。</p>
                </div>
              </div>

              <div
                v-if="contractTab === DELIVERY_CONTRACT_TAB.FEE"
                :id="`delivery-contract-panel-${DELIVERY_CONTRACT_TAB.FEE}`"
                role="tabpanel"
                :aria-labelledby="`delivery-contract-tab-${DELIVERY_CONTRACT_TAB.FEE}`"
                class="grid gap-6 md:grid-cols-1"
              >
                <div class="space-y-1.5">
                  <label class="text-sm text-slate-900" :for="contractFieldId('sellFee')">交割手续费率 (%)</label>
                  <div class="relative">
                    <input
                      :id="contractFieldId('sellFee')"
                      v-model="contractForm.sellFee"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      inputmode="decimal"
                      class="ant-input font-mono pr-8"
                      :aria-invalid="Boolean(contractErrors.sellFee)"
                      :aria-describedby="contractFieldDescribedBy('sellFee', 'delivery-contract-fee-help')"
                    />
                    <span class="absolute right-3 top-1.5 text-slate-400 text-sm">%</span>
                  </div>
                  <p id="delivery-contract-fee-help" class="text-xs text-slate-400">费率单位为百分比，允许 0 到 100。</p>
                  <p v-if="contractErrors.sellFee" :id="contractFieldErrorId('sellFee')" class="text-xs text-rose-600">{{ contractErrors.sellFee }}</p>
                </div>
              </div>
            </div>
          </div>

          <footer class="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              class="ant-btn"
              @click="closeContractModal"
            >
              取消
            </button>
            <button
              type="button"
              class="ant-btn ant-btn-primary"
              @click="saveContract"
            >
              保存合约
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 200ms ease-out;
}
.modal-leave-active {
  transition-duration: 150ms;
  transition-timing-function: ease-in;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active > section,
.modal-leave-active > section {
  transition: opacity 200ms ease-out, transform 200ms ease-out;
}
.modal-leave-active > section {
  transition-duration: 150ms;
  transition-timing-function: ease-in;
}
.modal-enter-from > section,
.modal-leave-to > section {
  opacity: 0;
  transform: scale(0.96);
}
@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active > section,
  .modal-leave-active > section {
    transition-duration: 50ms;
  }
  .modal-enter-from > section,
  .modal-leave-to > section {
    transform: none;
  }
}
</style>
