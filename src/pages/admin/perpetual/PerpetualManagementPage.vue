<script setup>
// 永续合约管理 — Ant Design Pro list page (2026-11-28): the status tabs, currency-type select and the combined
// name/code/pair keyword box became query-card fields (one input each); the product cards became a table card with a
// create toolbar, pagination (10 rows, was 5), status Tags and link actions. The editor and 线控设置 dialogs are unchanged.
import { computed, reactive, ref, watch, onMounted } from 'vue'
import { Button, Space, Tag, TypographyText } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import ControlConfigModal from '../../../admin/components/ControlConfigModal.vue'
import { ASSET_CURRENCY_TYPE } from '../../../admin/constants/assets'
import {
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

const blank = () => ({ name: '', code: '', pair: 'all', currencyType: 'all', status: 'all' })
const filters = ref(blank())
const currentPage = ref(1)

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

const applySearch = (values) => {
  filters.value = { ...blank(), ...values }
  currentPage.value = 1
}

const resetSearch = () => {
  filters.value = blank()
  currentPage.value = 1
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

const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
const fields = computed(() => [
  { key: 'name', label: '产品名称' },
  { key: 'code', label: '产品代码' },
  { key: 'pair', label: '交易对', searchable: true, options: [{ value: 'all', label: '全部交易对' }, ...[...new Set(products.value.map((item) => item.pair))].sort().map((value) => ({ value, label: value }))] },
  { key: 'currencyType', label: '币种类型', options: [{ value: 'all', label: '全部币种类型' }, { value: ASSET_CURRENCY_TYPE.VIRTUAL, label: '虚拟币' }, { value: ASSET_CURRENCY_TYPE.FIAT, label: '法币' }, { value: ASSET_CURRENCY_TYPE.METAL, label: '贵金属' }] },
  { key: 'status', label: '状态', options: [{ value: 'all', label: '全部状态' }, ...Object.entries(productStatusMeta).map(([value, meta]) => ({ value, label: meta.text }))] }
])
const columns = [
  { key: 'product', title: '合约', width: 160, fixed: 'left' },
  { key: 'pair', title: '交易对', width: 120 },
  { key: 'template', title: '杠杆模板', width: 300 },
  { key: 'limits', title: '交易限制', width: 220, align: 'right' },
  { key: 'fee', title: '费率', width: 130, align: 'right' },
  { key: 'sortOrder', title: '排序权重', width: 100, align: 'right' },
  { key: 'status', title: '状态', width: 90 },
  { key: 'actions', title: '操作', width: 140, fixed: 'right' }
]

const filteredProducts = computed(() => {
  const f = filters.value
  return sortPerpetualProducts(products.value.filter((item) =>
    has(item.name, f.name) && has(item.code, f.code) &&
    (f.pair === 'all' || item.pair === f.pair) &&
    (f.status === 'all' || item.status === f.status) &&
    (f.currencyType === 'all' || currencyTypeByPair(item.pair) === f.currencyType)
  ))
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
  <PageShell>
    <SearchForm name="perpetual-product-filters" :model="filters" :fields="fields" @search="applySearch" @reset="resetSearch" />
    <AdminTable title="永续合约产品" v-model:page="currentPage" :rows="filteredProducts" :columns="columns" row-key="id" desktop-only>
      <template #toolbar>
        <Button type="primary" @click="openCreateContract"><template #icon><PlusOutlined /></template>新增合约</Button>
      </template>
      <template #cell="{ column, record: item }">
        <Space v-if="column.key === 'product'" direction="vertical" :size="0">
          <TypographyText strong>{{ item.name }}</TypographyText>
          <TypographyText type="secondary" class="font-mono">{{ item.code }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'pair'" direction="vertical" :size="0">
          <span>{{ item.pair }}</span>
          <TypographyText type="secondary">{{ currencyTypeLabel(currencyTypeByPair(item.pair)) }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'template'" direction="vertical" :size="4">
          <span>{{ item.templateName }} <TypographyText type="secondary">{{ item.leverageRange }}</TypographyText></span>
          <span><Tag v-for="tag in item.leverageBadges" :key="tag">{{ tag }}</Tag></span>
        </Space>
        <Space v-else-if="column.key === 'limits'" direction="vertical" :size="0" align="end">
          <span>最低买入: {{ item.minBuy }}</span>
          <span>最大买入: {{ item.maxBuy }}</span>
          <span>最大持仓: {{ item.maxPosition }}</span>
        </Space>
        <Space v-else-if="column.key === 'fee'" direction="vertical" :size="0" align="end">
          <span>买入 {{ item.buyFee }}</span>
          <span>卖出 {{ item.sellFee }}</span>
        </Space>
        <template v-else-if="column.key === 'sortOrder'">{{ Number(item.sortOrder ?? 0) }}</template>
        <Tag v-else-if="column.key === 'status'" :color="item.status === PERPETUAL_STATUS.ENABLED ? 'green' : 'default'">{{ productStatusMeta[item.status]?.text || '未知状态' }}</Tag>
        <Space v-else-if="column.key === 'actions'" :size="8">
          <Button type="link" class="px-0" @click="openEditContract(item)">编辑</Button>
          <Button type="link" class="px-0" @click="openControlModal(item)">线控设置</Button>
        </Space>
        <template v-else>{{ item[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>
  </PageShell>

  <a-modal :wrap-props="{ 'aria-modal': true }" transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :open="Boolean(showContractModal)" :mask-closable="false" :closable="false" :keyboard="false" :width="768"  :destroy-on-close="true" wrap-class-name="admin-trading-modal" :body-style="{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 180px)' }" @cancel="showContractModal = false">
<template #title><template v-if="showContractModal"><header class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 class="text-2xl font-semibold text-slate-900">{{ editingContractId ? '编辑永续合约' : '新增永续合约' }}</h2>
        <a-button aria-label="关闭" type="text" html-type="button" class="text-2xl text-slate-400 hover:text-slate-700" @click="showContractModal = false">×</a-button>
      </header></template></template>
<template v-if="showContractModal">

      <div class="px-6 pt-4">
        <div class="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <a-button type="text"
            v-for="step in steps"
            :key="step.key"
            html-type="button"
            class="rounded-md px-4 py-1.5 text-sm"
            :class="contractStep === step.key ? 'bg-white font-medium text-blue-600 shadow-sm' : 'text-slate-600'"
            @click="contractStep = step.key"
          >
            {{ step.label }}
          </a-button>
        </div>
      </div>

      <div class="space-y-5 px-6 py-5">
        <div v-if="contractStep === PERPETUAL_CONTRACT_STEP.BASE" class="grid gap-4 md:grid-cols-2">
          <label class="space-y-2">
            <span class="text-sm font-medium">产品名称 <span class="text-rose-500">*</span></span>
            <a-input v-model:value="contractForm.productName" type="text" class="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none" />
          </label>
          <label class="space-y-2">
            <span class="text-sm font-medium">产品代码 <span class="text-rose-500">*</span></span>
            <a-input v-model:value="contractForm.productCode" type="text" class="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none" />
          </label>
          <label class="space-y-2 md:col-span-2">
            <span class="text-sm font-medium">选择交易对 <span class="text-rose-500">*</span></span>
            <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="contractForm.spotSymbol" class="w-full" :options="pairOptions.map((opt) => ({ value: opt, label: opt }))" show-search option-filter-prop="label" not-found-content="无匹配项" />
          </label>
          <div class="space-y-2">
            <span class="text-sm font-medium">产品状态</span>
            <div class="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              <a-button type="text"
                html-type="button"
                class="rounded-md px-4 py-1.5 text-sm"
                :class="contractForm.status === PERPETUAL_STATUS.ENABLED ? 'bg-emerald-100 font-medium text-emerald-700' : 'text-slate-600'"
                @click="contractForm.status = PERPETUAL_STATUS.ENABLED"
              >
                已启用
              </a-button>
              <a-button type="text"
                html-type="button"
                class="rounded-md px-4 py-1.5 text-sm"
                :class="contractForm.status === PERPETUAL_STATUS.DISABLED ? 'bg-rose-100 font-medium text-rose-700' : 'text-slate-600'"
                @click="contractForm.status = PERPETUAL_STATUS.DISABLED"
              >
                已禁用
              </a-button>
            </div>
          </div>
          <label class="space-y-2">
            <span class="text-sm font-medium">排序权重</span>
            <a-input v-model:value.number="contractForm.sortOrder" type="number" placeholder="数值越大越靠前" class="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none" />
          </label>
        </div>

        <div v-if="contractStep === PERPETUAL_CONTRACT_STEP.LEVERAGE" class="space-y-4">
          <label class="block max-w-md space-y-2">
            <span class="text-sm font-medium">选择杠杆模板 <span class="text-rose-500">*</span></span>
            <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="contractForm.templateId" class="w-full">
              <a-select-option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</a-select-option>
            </a-select>
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
              <a-input v-model:value="contractForm.minBuy" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none" />
              <span class="block text-xs leading-5 text-slate-500">输入 0 表示最低买入量不限制。</span>
            </label>
            <label class="space-y-2">
              <span class="text-sm font-medium">最大买入量 (USDT) <span class="text-rose-500">*</span></span>
              <a-input v-model:value="contractForm.maxBuy" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none" />
              <span class="block text-xs leading-5 text-slate-500">输入 0 表示最大买入量不限制。</span>
            </label>
            <label class="space-y-2">
              <span class="text-sm font-medium">最大持仓量 (USDT) <span class="text-rose-500">*</span></span>
              <a-input v-model:value="contractForm.maxPosition" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none" />
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
              <a-input v-model:value="contractForm.buyFee" type="number" :step="0.001" class="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none" />
            </label>
            <label class="space-y-2">
              <span class="text-sm font-medium">卖出费率 <span class="text-rose-500">*</span></span>
              <a-input v-model:value="contractForm.sellFee" type="number" :step="0.001" class="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none" />
            </label>
          </div>

          <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p class="font-medium text-slate-800">费率说明</p>
            <p class="mt-2">- 买入费率: {{ pctText(contractForm.buyFee) }}</p>
            <p>- 卖出费率: {{ pctText(contractForm.sellFee) }}</p>
          </div>
        </div>
      </div>

      </template>
<template #footer><template v-if="showContractModal"><footer class="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <a-button type="text" html-type="button" class="rounded-lg border border-slate-200 px-4 py-2" @click="showContractModal = false">取消</a-button>
        <a-button type="text"
          html-type="button"
          class="rounded-lg px-4 py-2 font-medium text-white"
          :class="isContractValid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300'"
          :disabled="!isContractValid"
          @click="submitContract"
        >
          {{ editingContractId ? '保存' : '创建' }}
        </a-button>
      </footer></template></template>
</a-modal>

  <ControlConfigModal
    :open="controlModalOpen"
    :symbol="activeControlSymbol"
    :config="controlConfigs[activeControlSymbol] || createDefaultPerpetualControlConfig()"
    @close="controlModalOpen = false"
    @save="saveControlConfig"
  />
</template>
