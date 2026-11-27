<template>
  <PageShell>
    <SearchForm name="spot-product-filters" :model="filters" :fields="fields" @search="applySearch" @reset="resetAll" />
    <AdminTable title="现货产品" v-model:page="currentPage" :rows="filteredProducts" :columns="columns" row-key="productId" desktop-only>
      <template #toolbar>
        <Button type="primary" @click="showAddProduct"><template #icon><PlusOutlined /></template>新增产品</Button>
      </template>
      <template #cell="{ column, record: product }">
        <Space v-if="column.key === 'product'" direction="vertical" :size="0">
          <TypographyText strong>{{ product.productName }}</TypographyText>
          <TypographyText type="secondary" class="font-mono">{{ product.productId }}</TypographyText>
        </Space>
        <template v-else-if="column.key === 'pair'">{{ product.baseCurrency }}/{{ product.quoteCurrency }}</template>
        <span v-else-if="column.key === 'precision'" class="font-mono">{{ product.pricePrecision }} / {{ product.quantityPrecision }}</span>
        <span v-else-if="column.key === 'minQty'">{{ formatAmount(product.minOrderQuantity) }} {{ product.baseCurrency }}</span>
        <Space v-else-if="column.key === 'orderValue'" direction="vertical" :size="0" align="end">
          <span>{{ formatAmount(product.minOrderValue) }} – {{ formatAmount(product.maxOrderValue) }}</span>
          <TypographyText type="secondary">{{ product.quoteCurrency }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'fee'" direction="vertical" :size="0" align="end">
          <span>买入 {{ formatRate(product.buyFee) }}</span>
          <span>卖出 {{ formatRate(product.sellFee) }}</span>
        </Space>
        <template v-else-if="column.key === 'sortOrder'">{{ Number(product.sortOrder ?? 0) }}</template>
        <Tag v-else-if="column.key === 'status'" :color="statusColor[product.status]">{{ statusLabel(product.status) }}</Tag>
        <Space v-else-if="column.key === 'actions'" :size="8">
          <Button type="link" class="px-0" @click="editProduct(product)">编辑</Button>
          <Button type="link" class="px-0" :danger="product.status === 'trading'" :disabled="product.status === 'delisted'" @click="togglePause(product)">{{ product.status === 'trading' ? '暂停' : '恢复' }}</Button>
        </Space>
        <template v-else>{{ product[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <a-modal :wrap-props="{ 'aria-modal': true }" transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :open="showModal" :mask-closable="false" :closable="false" :keyboard="false" :width="1152" :destroy-on-close="true" wrap-class-name="admin-trading-modal" :body-style="{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 180px)' }" @cancel="closeModal"><template #title><header class="flex items-center justify-between border-b border-black/[0.06] bg-white px-6 py-4">
            <div>
              <h2 class="text-lg font-semibold text-black/85">{{ isEditing ? '编辑现货产品' : '新增现货产品' }}</h2>
              <p class="mt-1 text-sm text-black/65">配置现货交易产品的基础信息、精度限制与费率</p>
              <p v-if="isEditing" class="mt-1 text-xs text-black/45 font-mono">{{ editingProductId }}</p>
            </div>
            <a-button aria-label="关闭" type="text" html-type="button" class="text-black/45 hover:text-black/85 transition-colors text-2xl leading-none" @click="closeModal">×</a-button>
          </header></template><section class="flex flex-col md:flex-row  w-full max-w-6xl overflow-hidden rounded-lg bg-white shadow-2xl border border-black/[0.06]">
        <div class="flex w-full md:w-3/5 flex-col border-r border-black/[0.06]">


          <div class="flex-1 space-y-6 overflow-y-auto px-6 py-6 bg-[#f0f2f5]">
            <section class="space-y-4 rounded-lg border border-black/[0.06] bg-white p-6 shadow-sm">
              <div class="flex items-center gap-3 mb-2">
                <div class="flex h-8 w-8 items-center justify-center rounded bg-black/5">
                  <svg class="h-4 w-4 text-black/45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <h3 class="text-sm font-semibold text-black/85">基本信息</h3>
              </div>

              <div class="space-y-4">
                <div class="space-y-1.5">
                  <label class="text-sm text-black/85 font-medium">产品名称 <span class="text-rose-500">*</span></label>
                  <p class="text-sm text-black/45">用于列表展示与搜索，建议使用交易对命名（如 BTC/USDT）。</p>
                  <a-input v-model:value="formData.productName" type="text" placeholder="如：BTC/USDT" class="ant-input" />
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                  <div class="space-y-1.5">
                    <label class="text-sm text-black/85 font-medium">状态</label>
                    <p class="text-sm text-black/45">交易中会开放交易；暂停会限制交易行为。</p>
                    <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="formData.status" class="">
                      <a-select-option value="trading">交易中</a-select-option>
                      <a-select-option value="suspended">暂停交易</a-select-option>
                    </a-select>
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-sm text-black/85 font-medium">排序权重</label>
                    <p class="text-sm text-black/45">数值越大越靠前。</p>
                    <a-input v-model:value.number="formData.sortOrder" type="number" placeholder="数值越大越靠前" class="ant-input font-mono" />
                  </div>
                </div>

                <div class="space-y-1.5">
                    <label class="text-sm text-black/85 font-medium">交易对 <span class="text-rose-500">*</span></label>
                    <p class="text-sm text-black/45">选择交易对</p>
                    <a-select :get-popup-container="(trigger) => trigger.parentElement" :value="formData.spotSymbol || undefined" :options="spotSymbolOptions" show-search option-filter-prop="label" not-found-content="无匹配项" :placeholder="spotSymbolLoading ? '加载中...' : '请选择交易对'" :disabled="spotSymbolLoading" @update:value="(value) => (formData.spotSymbol = value ?? '')" />
                </div>
              </div>
            </section>

            <section class="space-y-4 rounded-lg border border-black/[0.06] bg-white p-6 shadow-sm">
              <div class="flex items-center gap-3 mb-2">
                <div class="flex h-8 w-8 items-center justify-center rounded bg-antd-primary/10">
                  <svg class="h-4 w-4 text-antd-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <h3 class="text-sm font-semibold text-black/85">精度与限制</h3>
              </div>

              <div class="space-y-4">
                <div class="grid gap-4 sm:grid-cols-2">
                  <div class="space-y-1.5">
                    <label class="text-sm text-black/85 font-medium">价格精度</label>
                    <p class="text-sm text-black/45">价格允许的小数位数。</p>
                    <a-input v-model:value.number="formData.pricePrecision" type="number" :min="0" :step="1" class="ant-input font-mono" />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-sm text-black/85 font-medium">数量精度</label>
                    <p class="text-sm text-black/45">数量允许的小数位数。</p>
                    <a-input v-model:value.number="formData.quantityPrecision" type="number" :min="0" :step="1" class="ant-input font-mono" />
                  </div>
                </div>

                <div class="grid gap-4 sm:grid-cols-3">
                  <div class="space-y-1.5">
                    <label class="text-sm text-black/85 font-medium">最小下单量</label>
                    <p class="text-sm text-black/45">单笔最小基础币数量。</p>
                    <a-input v-model:value.number="formData.minOrderQuantity" type="number" :min="0" :step="0.00000001" class="ant-input font-mono" />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-sm text-black/85 font-medium">最小下单额</label>
                    <p class="text-sm text-black/45">单笔最小计价币金额。</p>
                    <a-input v-model:value.number="formData.minOrderValue" type="number" :min="0" :step="0.01" class="ant-input font-mono" />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-sm text-black/85 font-medium">最大下单额</label>
                    <p class="text-sm text-black/45">单笔最大计价币金额。</p>
                    <a-input v-model:value.number="formData.maxOrderValue" type="number" :min="0" :step="0.01" class="ant-input font-mono" />
                  </div>
                </div>
              </div>
            </section>

            <section class="space-y-4 rounded-lg border border-black/[0.06] bg-white p-6 shadow-sm">
              <div class="flex items-center gap-3 mb-2">
                <div class="flex h-8 w-8 items-center justify-center rounded bg-violet-100">
                  <svg class="h-4 w-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                </div>
                <h3 class="text-sm font-semibold text-black/85">费率设置</h3>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div class="space-y-1.5">
                  <label class="text-sm text-black/85 font-medium">买入费率 (%)</label>
                  <p class="text-sm text-black/45">对买入成交额收取的费率。</p>
                  <a-input v-model:value.number="formData.buyFee" type="number" :min="0" :step="0.001" class="ant-input font-mono" />
                </div>
                <div class="space-y-1.5">
                  <label class="text-sm text-black/85 font-medium">卖出费率 (%)</label>
                  <p class="text-sm text-black/45">对卖出成交额收取的费率。</p>
                  <a-input v-model:value.number="formData.sellFee" type="number" :min="0" :step="0.001" class="ant-input font-mono" />
                </div>
              </div>
            </section>
          </div>


        </div>

        <div class="flex w-full md:w-2/5 flex-col bg-black/[0.01]">
          <header class="border-b border-black/[0.06] px-6 py-4">
            <h3 class="text-base font-semibold text-black/85">预览</h3>
            <p class="mt-1 text-sm text-black/65">实时预览产品在列表中的展示效果</p>
          </header>

          <div class="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            <article class="rounded-lg border border-black/[0.06] bg-white overflow-hidden shadow-sm">
              <div class="border-b border-black/[0.06] p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h4 class="truncate text-sm font-semibold text-black/85">{{ formData.productName || '未命名产品' }}</h4>
                    <p class="mt-1 text-xs font-mono text-black/45">
                      {{ String(formData.baseCurrency || '-').toUpperCase() }}/{{ String(formData.quoteCurrency || '-').toUpperCase() }}
                    </p>
                  </div>
                  <Tag :color="statusColor[formData.status]">{{ statusLabel(formData.status) }}</Tag>
                </div>

                <div class="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-black/65">
                  <span class="px-2 py-0.5 rounded border border-black/[0.06] bg-black/[0.02] font-mono">
                    精度 {{ Number(formData.pricePrecision || 0) }} / {{ Number(formData.quantityPrecision || 0) }}
                  </span>
                  <span class="px-2 py-0.5 rounded border border-black/[0.06] bg-black/[0.02] font-mono">
                    费率 {{ formatRate(formData.buyFee) }} / {{ formatRate(formData.sellFee) }}
                  </span>
                </div>
              </div>

              <div class="grid gap-0 bg-black/[0.01]">
                <div class="border-b border-black/[0.06] p-4">
                  <p class="text-[10px] font-bold text-black/35 uppercase tracking-wider">交易限制</p>
                  <ul class="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <li class="flex flex-col gap-0.5">
                      <span class="text-black/45 text-xs">最小下单量</span>
                      <span class="text-black/85 font-semibold font-mono">{{ formatAmount(formData.minOrderQuantity) }}</span>
                    </li>
                    <li class="flex flex-col gap-0.5">
                      <span class="text-black/45 text-xs">最小下单额</span>
                      <span class="text-black/85 font-semibold font-mono">{{ formatAmount(formData.minOrderValue) }}</span>
                    </li>
                    <li class="flex flex-col gap-0.5">
                      <span class="text-black/45 text-xs">最大下单额</span>
                      <span class="text-black/85 font-semibold font-mono">{{ formatAmount(formData.maxOrderValue) }}</span>
                    </li>
                    <li class="flex flex-col gap-0.5">
                      <span class="text-black/45 text-xs">深度(买/卖)</span>
                      <span class="text-black/85 font-semibold font-mono">{{ formatVolume(Number(formData.bidDepth || 0)) }} / {{ formatVolume(Number(formData.askDepth || 0)) }}</span>
                    </li>
                  </ul>
                </div>

                <div class="p-4">
                  <p class="text-[10px] font-bold text-black/35 uppercase tracking-wider">市场数据</p>
                  <ul class="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <li class="flex flex-col gap-0.5">
                      <span class="text-black/45 text-xs">24h 成交量</span>
                      <span class="text-black/85 font-semibold font-mono">{{ formatVolume(Number(formData.volume24h || 0)) }}</span>
                    </li>
                    <li class="flex flex-col gap-0.5">
                      <span class="text-black/45 text-xs">24h 涨跌</span>
                      <span class="font-semibold font-mono" :class="Number(formData.priceChange24h || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                        {{ formatSignedPercent(Number(formData.priceChange24h || 0)) }}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section><template #footer><footer class="flex justify-end gap-3 border-t border-black/[0.06] bg-white px-6 py-4">
            <a-button html-type="button" class="ant-btn" @click="closeModal">取消</a-button>
            <a-button type="primary" html-type="button" class="ant-btn ant-btn-primary" @click="saveProduct">保存</a-button>
          </footer></template></a-modal>
  </PageShell>
</template>

<script setup>
// 现货产品 — Ant Design Pro list page (2026-11-28): the status tabs and the combined name/ID/coin keyword box became
// query-card fields (one input each), the product cards became a table card with a create toolbar, pagination, status
// Tags and link actions. Fixes: sortSpotProducts was applied to the page-number buttons instead of the products, so the
// list never followed the sort weight; it now sorts the filtered products before pagination. The editor's 交易对 select
// is searchable, and validation/saves use toast instead of alert().
import { ref, computed, onMounted, watch } from 'vue'
import { Button, Space, Tag, TypographyText, message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import { mockSpotProducts, symbolApi } from '../../../admin/mock/spot'
import { sortSpotProducts } from '../../../admin/constants/spotProduct'

const products = ref([])
const showModal = ref(false)
const isEditing = ref(false)
const editingProductId = ref(null)
const spotSymbolLoading = ref(false)
const spotSymbols = ref([])
const lastSyncedSpotSymbol = ref('')

const blank = () => ({ productName: '', productId: '', status: 'all', currency: 'all' })
const filters = ref(blank())
const currentPage = ref(1)
const currencyOptions = computed(() => [...new Set(products.value.flatMap((p) => [p.baseCurrency, p.quoteCurrency]))].filter(Boolean).sort().map((value) => ({ value, label: value })))
const fields = computed(() => [
  { key: 'productName', label: '产品名称' },
  { key: 'productId', label: '产品 ID' },
  { key: 'status', label: '状态', options: [{ value: 'all', label: '全部状态' }, { value: 'trading', label: '交易中' }, { value: 'suspended', label: '暂停交易' }, { value: 'delisted', label: '已下架' }] },
  { key: 'currency', label: '币种', searchable: true, options: [{ value: 'all', label: '全部币种' }, ...currencyOptions.value] }
])
const columns = [
  { key: 'product', title: '产品', width: 180, fixed: 'left' },
  { key: 'pair', title: '交易对', width: 120 },
  { key: 'precision', title: '价格 / 数量精度', width: 140 },
  { key: 'minQty', title: '最小下单量', width: 150, align: 'right' },
  { key: 'orderValue', title: '下单额范围', width: 180, align: 'right' },
  { key: 'fee', title: '费率', width: 140, align: 'right' },
  { key: 'sortOrder', title: '排序权重', width: 100, align: 'right' },
  { key: 'status', title: '状态', width: 100 },
  { key: 'actions', title: '操作', width: 120, fixed: 'right' }
]
const statusColor = { trading: 'green', suspended: 'orange', delisted: 'default' }

const formData = ref({
  productName: '',
  spotSymbol: '',
  baseCurrency: '',
  quoteCurrency: '',
  pricePrecision: 2,
  quantityPrecision: 6,
  minOrderQuantity: 0.00001,
  minOrderValue: 10,
  maxOrderValue: 1000000,
  buyFee: 0.1,
  sellFee: 0.1,
  status: 'trading',
  sortOrder: 0,
  volume24h: 0,
  priceChange24h: 0,
  bidDepth: 0,
  askDepth: 0
})

onMounted(() => {
  products.value = mockSpotProducts
  loadSpotSymbols()
})

const applySearch = (values) => {
  filters.value = { ...blank(), ...values }
  currentPage.value = 1
}

const spotSymbolOptions = computed(() => {
  const baseOptions = spotSymbols.value
    .map((row) => {
      const symbolName = String(row.symbol_name || '').trim()
      if (!symbolName) return null
      const id = row.symbol_id !== undefined && row.symbol_id !== null ? String(row.symbol_id) : ''
      const label = id ? `${symbolName} (${id})` : symbolName
      return { value: symbolName, label }
    })
    .filter(Boolean)

  const current = String(formData.value.spotSymbol || '').trim()
  if (current && !baseOptions.some((it) => it.value === current)) {
    baseOptions.unshift({ value: current, label: `${current} (未匹配)` })
  }

  return baseOptions
})

const syncSpotSymbolToForm = (val) => {
  const symbolName = String(val || '').trim()
  if (!symbolName) return

  const prev = lastSyncedSpotSymbol.value
  const row = spotSymbols.value.find((it) => String(it.symbol_name || '').trim() === symbolName)
  if (row) {
    formData.value.baseCurrency = String(row.base_coin_name || '').trim().toUpperCase()
    formData.value.quoteCurrency = String(row.quote_coin_name || '').trim().toUpperCase()
    formData.value.quantityPrecision = Number(row.base_coin_prec) || 0
    formData.value.pricePrecision = Number(row.quote_coin_prec) || 0

    const currentName = String(formData.value.productName || '').trim()
    if (!currentName || currentName === prev) {
      formData.value.productName = symbolName
    }
    lastSyncedSpotSymbol.value = symbolName
    return
  }

  const parts = symbolName.split('/')
  const base = String(parts[0] || '').trim()
  const quote = String(parts[1] || '').trim()
  if (base) formData.value.baseCurrency = base.toUpperCase()
  if (quote) formData.value.quoteCurrency = quote.toUpperCase()
  const currentName = String(formData.value.productName || '').trim()
  if (!currentName || currentName === prev) formData.value.productName = symbolName
  lastSyncedSpotSymbol.value = symbolName
}

const ensureDefaultSpotSymbol = () => {
  if (formData.value.spotSymbol) return
  const first = spotSymbolOptions.value[0]?.value || ''
  if (first) formData.value.spotSymbol = first
}

const loadSpotSymbols = async () => {
  spotSymbolLoading.value = true
  try {
    const result = await symbolApi.getSymbolList({
      page: 1,
      pageSize: 1000,
      includeDeleted: false
    })
    if (result?.success) {
      spotSymbols.value = Array.isArray(result.data?.list) ? result.data.list : []
      ensureDefaultSpotSymbol()
      syncSpotSymbolToForm(formData.value.spotSymbol)
    } else {
      spotSymbols.value = []
    }
  } catch {
    spotSymbols.value = []
  } finally {
    spotSymbolLoading.value = false
  }
}

watch(
  () => formData.value.spotSymbol,
  (val) => {
    syncSpotSymbolToForm(val)
  }
)

const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
// Sort by weight (larger first) before pagination.
const filteredProducts = computed(() => sortSpotProducts(products.value.filter((p) => {
  const f = filters.value
  return has(p.productName, f.productName) && has(p.productId, f.productId) &&
    (f.status === 'all' || p.status === f.status) &&
    (f.currency === 'all' || p.baseCurrency === f.currency || p.quoteCurrency === f.currency)
})))

const resetAll = () => {
  filters.value = blank()
  currentPage.value = 1
}

const formatAmount = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '-'
  return Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 8 })
}

const formatRate = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '-'
  return `${Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 6 })}%`
}

const formatSignedPercent = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '-'
  const n = Number(value)
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value)
}

const formatVolume = (value) => {
  if (value >= 1000000000) {
    return (value / 1000000000).toFixed(2) + 'B'
  }
  if (value >= 1000000) {
    return (value / 1000000).toFixed(2) + 'M'
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(2) + 'K'
  }
  return value.toFixed(2)
}

const statusLabel = (status) => {
  const labels = {
    trading: '交易中',
    suspended: '暂停交易',
    delisted: '已下架'
  }
  return labels[status] || status
}

const resetFormData = () => {
  formData.value = {
    productName: '',
    spotSymbol: '',
    baseCurrency: '',
    quoteCurrency: '',
    pricePrecision: 2,
    quantityPrecision: 6,
    minOrderQuantity: 0.00001,
    minOrderValue: 10,
    maxOrderValue: 1000000,
    buyFee: 0.1,
    sellFee: 0.1,
    status: 'trading',
    sortOrder: 0,
    volume24h: 0,
    priceChange24h: 0,
    bidDepth: 0,
    askDepth: 0
  }
}

const showAddProduct = () => {
  isEditing.value = false
  editingProductId.value = null
  resetFormData()
  formData.value.sortOrder = Math.max(0, ...products.value.map((product) => Number(product.sortOrder) || 0)) + 10
  ensureDefaultSpotSymbol()
  showModal.value = true
}

const editProduct = (product) => {
  isEditing.value = true
  editingProductId.value = product.productId
  const spotSymbol = `${String(product.baseCurrency || '').toUpperCase()}/${String(product.quoteCurrency || '').toUpperCase()}`
  formData.value = {
    productName: product.productName,
    spotSymbol,
    baseCurrency: product.baseCurrency,
    quoteCurrency: product.quoteCurrency,
    pricePrecision: product.pricePrecision,
    quantityPrecision: product.quantityPrecision,
    minOrderQuantity: product.minOrderQuantity,
    minOrderValue: product.minOrderValue,
    maxOrderValue: product.maxOrderValue,
    buyFee: product.buyFee,
    sellFee: product.sellFee,
    status: product.status,
    sortOrder: Number(product.sortOrder ?? 0),
    volume24h: product.volume24h,
    priceChange24h: product.priceChange24h,
    bidDepth: product.bidDepth,
    askDepth: product.askDepth
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  resetFormData()
}

const saveProduct = () => {
  if (!formData.value.productName) {
    message.error('请输入产品名称')
    return
  }
  if (!formData.value.spotSymbol) {
    message.error('请选择交易对')
    return
  }
  if (!formData.value.baseCurrency || !formData.value.quoteCurrency) {
    message.error('交易对信息不完整，请重新选择')
    return
  }
  const pricePrecision = Number(formData.value.pricePrecision)
  const quantityPrecision = Number(formData.value.quantityPrecision)
  const minOrderQuantity = Number(formData.value.minOrderQuantity)
  const minOrderValue = Number(formData.value.minOrderValue)
  const maxOrderValue = Number(formData.value.maxOrderValue)
  const buyFee = Number(formData.value.buyFee)
  const sellFee = Number(formData.value.sellFee)

  const isNonNegativeInt = (n) => Number.isFinite(n) && n >= 0 && Math.floor(n) === n

  if (!isNonNegativeInt(pricePrecision) || !isNonNegativeInt(quantityPrecision)) {
    message.error('精度必须为非负整数')
    return
  }
  if (!Number.isFinite(minOrderQuantity) || minOrderQuantity <= 0) {
    message.error('最小下单量必须大于 0')
    return
  }
  if (!Number.isFinite(minOrderValue) || minOrderValue < 0 || !Number.isFinite(maxOrderValue) || maxOrderValue <= 0) {
    message.error('请输入有效的下单额限制')
    return
  }
  if (minOrderValue >= maxOrderValue) {
    message.error('最大下单额必须大于最小下单额')
    return
  }
  if (!Number.isFinite(buyFee) || !Number.isFinite(sellFee) || buyFee < 0 || sellFee < 0) {
    message.error('费率不能为负数')
    return
  }
  if (buyFee > 100 || sellFee > 100) {
    message.error('费率不能超过 100%')
    return
  }

  const { spotSymbol: _spotSymbol, ...formPayload } = formData.value
  const payload = {
    ...formPayload,
    sortOrder: Number(formData.value.sortOrder)
  }

  if (isEditing.value) {
    // 编辑产品
    const index = products.value.findIndex(p => p.productId === editingProductId.value)
    if (index !== -1) {
      products.value[index] = {
        ...products.value[index],
        ...payload
      }
      message.success('产品修改成功')
    }
  } else {
    // 新增产品
    const newProduct = {
      productId: `SPOT${String(products.value.length + 1).padStart(3, '0')}`,
      ...payload,
      volume24h: Math.random() * 10000000,
      priceChange24h: (Math.random() - 0.5) * 20,
      bidDepth: Math.random() * 1000000,
      askDepth: Math.random() * 1000000
    }
    products.value.unshift(newProduct)
    message.success('产品创建成功')
  }

  closeModal()
}

const toggleProductStatus = (product) => {
  const index = products.value.findIndex(p => p.productId === product.productId)
  if (index !== -1) {
    const newStatus = products.value[index].status === 'trading' ? 'suspended' : 'trading'
    products.value[index].status = newStatus
  }
}

const togglePause = (product) => {
  const index = products.value.findIndex(p => p.productId === product.productId)
  if (index === -1) return
  if (products.value[index].status === 'delisted') return
  products.value[index].status = products.value[index].status === 'trading' ? 'suspended' : 'trading'
}
</script>
