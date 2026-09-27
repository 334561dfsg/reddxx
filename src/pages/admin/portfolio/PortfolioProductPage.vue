<script setup>
import { computed, reactive, ref } from 'vue'
import { ASSET_CURRENCY_TYPE, ASSET_STATUS } from '../../../admin/constants/assets'
import { createAssetsCoinsMock } from '../../../admin/mock/assets'
import { getActiveVipLevels } from '../../../admin/mock/vip'
import AdminListPaginationBar from '../../../admin/components/AdminListPaginationBar.vue'
import { useAdminListPagination } from '../../../admin/composables/useAdminListPagination'
import { portfolioProductsCatalog } from '../../../admin/state/financeCatalogs'
import { appendPortfolioOperationLog } from '../../../admin/state/portfolioOperationLogs'
import {
  COMMON_FILTER_ALL,
  EARLY_REDEEM_MODE,
  PRODUCT_STATUS,
  REDEEM_ARRIVAL_MODE,
  earlyRedeemModeMeta,
  formatPortfolioAmount,
  formatPortfolioDuration,
  formatPortfolioRateRange,
  productStatusMeta,
  redeemArrivalModeMeta,
  sortPortfolioProducts
} from '../../../admin/constants/portfolio'

const products = portfolioProductsCatalog
const search = ref('')
const statusFilter = ref(COMMON_FILTER_ALL)
const showModal = ref(false)
const editingId = ref('')
const activeTab = ref('base')
const MAX_PORTFOLIO_ASSETS = 3
const earlyRedeemModeOptions = [
  { value: EARLY_REDEEM_MODE.FORFEIT_YIELD, label: '扣除全部收益和手续费' },
  { value: EARLY_REDEEM_MODE.FEE_ONLY, label: '保留收益扣除手续费' }
]
const activeVipLevels = computed(() => getActiveVipLevels().slice().sort((a, b) => a.level - b.level))
const supportedTradeCoins = computed(() =>
  createAssetsCoinsMock()
    .filter((coin) => coin.type === ASSET_CURRENCY_TYPE.VIRTUAL)
    .map((coin) => ({
      symbol: coin.symbol,
      name: coin.name,
      disabled: coin.status !== ASSET_STATUS.ENABLED
    }))
)

function vipLevelLabel(level) {
  const vip = activeVipLevels.value.find((item) => item.level === Number(level))
  if (!vip) return `VIP${level}`
  return vip.displayName && vip.displayName !== vip.name ? `${vip.name}（${vip.displayName}）` : vip.name
}

const defaultForm = () => ({
  id: `pf-${Date.now()}`,
  name: '',
  quoteCurrency: 'USDT',
  assets: [
    { symbol: 'USDT' },
    { symbol: 'BTC' },
    { symbol: 'ETH' }
  ],
  durationDays: 3,
  baseMinDailyRatePct: 0.2,
  baseMaxDailyRatePct: 0.6,
  minDailyRatePct: 0.2,
  maxDailyRatePct: 0.6,
  yieldAdjustmentRate: 0,
  currentYieldMultiplier: 1,
  subscriptionFeePct: 0.3,
  minAmount: 1000,
  maxAmount: 30000,
  userLimitAmount: 60000,
  monthlyLimitCount: 6,
  minVipLevel: 0,
  isHot: false,
  isRecommended: false,
  sortOrder: 0,
  status: PRODUCT_STATUS.ENABLED,
  earlyRedeemEnabled: true,
  earlyRedeemMode: EARLY_REDEEM_MODE.FORFEIT_YIELD,
  earlyRedeemFeePct: 1,
  redeemArrivalMode: REDEEM_ARRIVAL_MODE.T_PLUS_1
})

const productForm = reactive(defaultForm())

const filteredProducts = computed(() => {
  const kw = search.value.trim().toLowerCase()
  return sortPortfolioProducts(products.value.filter((product) => {
    const matchesSearch =
      !kw ||
      product.name.toLowerCase().includes(kw) ||
      product.id.toLowerCase().includes(kw) ||
      product.assets.some((asset) => asset.symbol.toLowerCase().includes(kw))
    const matchesStatus = statusFilter.value === COMMON_FILTER_ALL || product.status === statusFilter.value
    return matchesSearch && matchesStatus
  }))
})

const {
  currentPage,
  pageSize,
  totalPages,
  pagedRows: pagedProducts,
  onPageSizeChange
} = useAdminListPagination(filteredProducts, { resetSources: [search, statusFilter] })

function resetForm(next = defaultForm()) {
  Object.assign(productForm, JSON.parse(JSON.stringify(next)))
}

function openCreate() {
  editingId.value = ''
  activeTab.value = 'base'
  resetForm()
  productForm.sortOrder = Math.max(0, ...products.value.map((product) => Number(product.sortOrder) || 0)) + 10
  showModal.value = true
}

function openEdit(product) {
  editingId.value = product.id
  activeTab.value = 'base'
  resetForm(product)
  showModal.value = true
}

function addAsset() {
  if (productForm.assets.length >= MAX_PORTFOLIO_ASSETS) return
  const usedSymbols = new Set(productForm.assets.map((asset) => asset.symbol))
  const nextCoin = supportedTradeCoins.value.find((coin) => !usedSymbols.has(coin.symbol)) ?? supportedTradeCoins.value[0]
  if (!nextCoin) return
  productForm.assets.push({ symbol: nextCoin.symbol })
}

function removeAsset(index) {
  if (productForm.assets.length <= 1) return
  productForm.assets.splice(index, 1)
}

function saveProduct() {
  const row = {
    ...JSON.parse(JSON.stringify(productForm)),
    sortOrder: Number(productForm.sortOrder)
  }
  row.baseMinDailyRatePct = Number(row.baseMinDailyRatePct ?? row.minDailyRatePct) || 0
  row.baseMaxDailyRatePct = Number(row.baseMaxDailyRatePct ?? row.maxDailyRatePct) || 0
  row.yieldAdjustmentRate = Number(row.yieldAdjustmentRate || 0)
  row.currentYieldMultiplier = Number(row.currentYieldMultiplier || 1)
  const idx = products.value.findIndex((product) => product.id === editingId.value)
  if (idx >= 0) {
    products.value[idx] = row
  } else {
    products.value = [row, ...products.value]
  }
  appendPortfolioOperationLog({
    operator: 'admin',
    action: idx >= 0 ? '编辑产品' : '创建产品',
    target: row.name,
    summary: `保存投资组合产品：${row.name}`
  })
  showModal.value = false
}

function toggleStatus(product) {
  const nextStatus = product.status === PRODUCT_STATUS.ENABLED ? PRODUCT_STATUS.DISABLED : PRODUCT_STATUS.ENABLED
  const confirmMessage =
    nextStatus === PRODUCT_STATUS.DISABLED ? '确认禁用该投资组合产品？' : '确认启用该投资组合产品？'
  const confirmed = window.confirm(confirmMessage)
  if (!confirmed) return

  product.status = nextStatus
  appendPortfolioOperationLog({
    operator: 'admin',
    action: '切换状态',
    target: product.name,
    summary: `状态切换为 ${productStatusMeta[nextStatus]?.label}`
  })
}

function statusClass(status) {
  return productStatusMeta[status]?.color ?? 'text-gray-600 bg-gray-50'
}
</script>

<template>
  <section class="space-y-5">
    <header class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">投资组合产品管理</h1>
        <p class="mt-1 text-sm text-slate-500">配置组合币种、收益区间、费用与提前赎回规则</p>
      </div>
      <a-button type="text" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700" @click="openCreate">
        + 创建组合
      </a-button>
    </header>

    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="grid gap-4 md:grid-cols-3">
        <a-input
          v-model:value="search"
          placeholder="搜索产品名称、ID 或币种"
          class="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
        <a-select :get-popup-container="(trigger) => trigger.parentElement"
          v-model:value="statusFilter"
          class="transition"
        >
          <a-select-option :value="COMMON_FILTER_ALL">全部状态</a-select-option>
          <a-select-option v-for="(meta, key) in productStatusMeta" :key="key" :value="key">{{ meta.label }}</a-select-option>
        </a-select>
        <div class="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
          当前 {{ filteredProducts.length }} 款组合产品
        </div>
      </div>
    </div>

    <article class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <a-table  size="small" :pagination="false" :data-source="pagedProducts" :row-key="(product) => product.id" :scroll="{ x: 'max-content' }" :custom-row="(product, rowIndex) => ({ class: [&quot;transition hover:bg-slate-50&quot;] })">
<a-table-column key="column-0" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-6 py-4&quot;] })">
<template #title>产品信息</template>
<template #default="{ record: product, index: rowIndex }">
              <div class="font-medium text-slate-900">{{ product.name }}</div>
              <div class="mt-1 font-mono text-xs text-slate-400">{{ product.id }}</div>
              <div class="mt-1 text-xs text-slate-500">{{ vipLevelLabel(product.minVipLevel) }}+</div>
            </template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-6 py-4 text-sm text-slate-600&quot;] })">
<template #title>排序/推荐</template>
<template #default="{ record: product, index: rowIndex }">
              <div>{{ Number(product.sortOrder) || 0 }}</div>
              <span
                v-if="product.isRecommended"
                class="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-600"
              >
                推荐
              </span>
            </template>
</a-table-column>
<a-table-column key="column-2" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-6 py-4&quot;] })">
<template #title>组合币种</template>
<template #default="{ record: product, index: rowIndex }">
              <div class="flex max-w-xs flex-wrap gap-1.5">
                <span v-for="asset in product.assets" :key="asset.symbol" class="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                  {{ asset.symbol }}
                </span>
              </div>
            </template>
</a-table-column>
<a-table-column key="column-3" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-6 py-4 text-sm text-slate-600&quot;] })">
<template #title>收益与费用</template>
<template #default="{ record: product, index: rowIndex }">
              <div>{{ formatPortfolioDuration(product.durationDays) }}</div>
              <div class="font-medium text-emerald-600">{{ formatPortfolioRateRange(product) }}</div>
              <div>手续费 {{ product.subscriptionFeePct }}%</div>
            </template>
</a-table-column>
<a-table-column key="column-4" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-6 py-4 text-sm text-slate-600&quot;] })">
<template #title>限额规则</template>
<template #default="{ record: product, index: rowIndex }">
              <div>{{ formatPortfolioAmount(product.minAmount) }} - {{ formatPortfolioAmount(product.maxAmount) }}</div>
              <div>单用户上限 {{ formatPortfolioAmount(product.userLimitAmount) }}</div>
            </template>
</a-table-column>
<a-table-column key="column-5" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-6 py-4 text-sm text-slate-600&quot;] })">
<template #title>赎回规则</template>
<template #default="{ record: product, index: rowIndex }">
              <div>{{ product.earlyRedeemEnabled ? earlyRedeemModeMeta[product.earlyRedeemMode]?.label : '不支持' }}</div>
              <div>{{ product.earlyRedeemFeePct }}% · {{ redeemArrivalModeMeta[product.redeemArrivalMode]?.label }}</div>
            </template>
</a-table-column>
<a-table-column key="column-6" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-6 py-4&quot;] })">
<template #title>状态</template>
<template #default="{ record: product, index: rowIndex }">
              <span class="rounded-full px-2 py-1 text-xs" :class="statusClass(product.status)">
                {{ productStatusMeta[product.status]?.label }}
              </span>
            </template>
</a-table-column>
<a-table-column key="column-7" align="right" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-6 py-4 text-right&quot;] })">
<template #title>操作</template>
<template #default="{ record: product, index: rowIndex }">
              <a-button type="text" class="mr-3 text-sm font-medium text-blue-600 transition hover:text-blue-800" @click="openEdit(product)">编辑</a-button>
              <a-button type="text" class="text-sm font-medium text-slate-600 transition hover:text-slate-900" @click="toggleStatus(product)">
                {{ product.status === PRODUCT_STATUS.ENABLED ? '禁用' : '启用' }}
              </a-button>
            </template>
</a-table-column>
</a-table>
      <div v-if="filteredProducts.length === 0" class="py-12 text-center text-slate-500">暂无产品数据</div>
      <AdminListPaginationBar
        :current-page="currentPage"
        :total-pages="totalPages"
        :total-count="filteredProducts.length"
        :page-size="pageSize"
        @update:current-page="currentPage = $event"
        @update:page-size="onPageSizeChange"
      />
    </article>

    <Teleport to="body">
      <a-modal :wrap-props="{ 'aria-modal': true }" transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :open="Boolean(showModal)" :mask-closable="false" :closable="false" :keyboard="false" :width="1152"  :destroy-on-close="true" wrap-class-name="admin-trading-modal" :body-style="{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 180px)' }" @cancel="showModal = false">
<template #title><template v-if="showModal"><div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 class="text-xl font-semibold text-slate-900">{{ editingId ? '编辑组合产品' : '创建组合产品' }}</h2>
              <p class="mt-1 text-sm text-slate-500">左侧配置，右侧实时预览前台展示口径</p>
            </div>
            <a-button aria-label="关闭" type="text" class="text-2xl leading-none text-slate-400 hover:text-slate-700" @click="showModal = false">×</a-button>
          </div></template></template>
<template v-if="showModal">
          <div class="flex min-h-0 flex-1">
            <div class="w-3/5 border-r border-slate-200">
              <div class="border-b border-slate-200 px-6">
                <a-button type="text"
                  v-for="tab in [
                    ['base', '基础信息'],
                    ['assets', '组合币种'],
                    ['yield', '收益费用'],
                    ['redeem', '赎回限额']
                  ]"
                  :key="tab[0]"
                  class="border-b-2 px-4 py-3 text-sm font-medium transition"
                  :class="activeTab === tab[0] ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600'"
                  @click="activeTab = tab[0]"
                >
                  {{ tab[1] }}
                </a-button>
              </div>
              <div class="max-h-[66vh] overflow-y-auto p-6">
                <div v-show="activeTab === 'base'" class="grid grid-cols-2 gap-4">
                  <label class="block">
                    <span class="mb-1 block text-sm font-medium text-slate-700">产品 ID</span>
                    <a-input v-model:value="productForm.id" :disabled="Boolean(editingId)" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-500" />
                  </label>
                  <label class="block">
                    <span class="mb-1 block text-sm font-medium text-slate-700">计价币种</span>
                    <a-input v-model:value="productForm.quoteCurrency" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                  <label class="block">
                    <span class="mb-1 block text-sm font-medium text-slate-700">产品名称</span>
                    <a-input v-model:value="productForm.name" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                  <label class="block">
                    <span class="mb-1 block text-sm font-medium text-slate-700">最低 VIP 等级</span>
                    <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value.number="productForm.minVipLevel" class="w-full">
                      <a-select-option v-for="vip in activeVipLevels" :key="vip.id" :value="vip.level">
                        {{ vipLevelLabel(vip.level) }}
                      </a-select-option>
                    </a-select>
                  </label>
                  <label class="flex items-center gap-2 text-sm text-slate-700">
                    <a-checkbox v-model:checked="productForm.isHot" class="" />
                    HOT 角标
                  </label>
                  <label class="flex items-center gap-2 text-sm text-slate-700">
                    <a-checkbox v-model:checked="productForm.isRecommended" class="" />
                    加到推荐
                  </label>
                  <label class="block">
                    <span class="mb-1 block text-sm font-medium text-slate-700">产品状态</span>
                    <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="productForm.status" class="w-full">
                      <a-select-option v-for="(meta, key) in productStatusMeta" :key="key" :value="key">{{ meta.label }}</a-select-option>
                    </a-select>
                  </label>
                  <label class="block">
                    <span class="mb-1 block text-sm font-medium text-slate-700">产品排序</span>
                    <a-input v-model:value.number="productForm.sortOrder" type="number" placeholder="数字越大越靠前" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    <span class="mt-1 block text-xs text-slate-500">数字越大越靠前</span>
                  </label>
                </div>

                <div v-show="activeTab === 'assets'" class="space-y-3">
                  <p class="text-xs text-slate-500">组合币种从资产管理 / 币种管理中已配置的虚拟币选择，最多选择 {{ MAX_PORTFOLIO_ASSETS }} 个币种。</p>
                  <div v-for="(asset, idx) in productForm.assets" :key="idx" class="grid grid-cols-[1fr_auto] gap-3 rounded-lg bg-slate-50 p-3">
                    <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="asset.symbol" class="">
                      <a-select-option v-for="coin in supportedTradeCoins" :key="coin.symbol" :value="coin.symbol">
                        {{ coin.symbol }} · {{ coin.name }}{{ coin.disabled ? '（已禁用）' : '' }}
                      </a-select-option>
                    </a-select>
                    <a-button type="text" class="text-sm text-red-600" @click="removeAsset(idx)">删除</a-button>
                  </div>
                  <a-button type="text"
                    class="text-sm font-medium text-blue-600 disabled:cursor-not-allowed disabled:text-slate-400"
                    :disabled="productForm.assets.length >= MAX_PORTFOLIO_ASSETS"
                    @click="addAsset"
                  >
                    + 添加资产
                  </a-button>
                </div>

                <div v-show="activeTab === 'yield'" class="grid grid-cols-2 gap-4">
                  <label class="block"><span class="mb-1 block text-sm font-medium text-slate-700">运行天数</span><a-input v-model:value.number="productForm.durationDays" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                  <label class="block"><span class="mb-1 block text-sm font-medium text-slate-700">最低日收益率 %</span><a-input v-model:value.number="productForm.minDailyRatePct" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                  <label class="block"><span class="mb-1 block text-sm font-medium text-slate-700">最高日收益率 %</span><a-input v-model:value.number="productForm.maxDailyRatePct" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                  <label class="block"><span class="mb-1 block text-sm font-medium text-slate-700">认购手续费 %</span><a-input v-model:value.number="productForm.subscriptionFeePct" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                </div>

                <div v-show="activeTab === 'redeem'" class="grid grid-cols-2 gap-4">
                  <label class="block"><span class="mb-1 block text-sm font-medium text-slate-700">最低金额</span><a-input v-model:value.number="productForm.minAmount" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                  <label class="block"><span class="mb-1 block text-sm font-medium text-slate-700">最高金额</span><a-input v-model:value.number="productForm.maxAmount" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                  <label class="block"><span class="mb-1 block text-sm font-medium text-slate-700">单用户持仓上限</span><a-input v-model:value.number="productForm.userLimitAmount" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                  <label class="block"><span class="mb-1 block text-sm font-medium text-slate-700">每月申购次数</span><a-input v-model:value.number="productForm.monthlyLimitCount" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                  <label class="flex items-center gap-2 text-sm text-slate-700"><a-checkbox v-model:checked="productForm.earlyRedeemEnabled" />允许提前赎回</label>
                  <label class="block"><span class="mb-1 block text-sm font-medium text-slate-700">赎回模式</span><a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="productForm.earlyRedeemMode" class="w-full"><a-select-option v-for="option in earlyRedeemModeOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option></a-select></label>
                  <label class="block"><span class="mb-1 block text-sm font-medium text-slate-700">赎回费率 %</span><a-input v-model:value.number="productForm.earlyRedeemFeePct" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                  <label class="block"><span class="mb-1 block text-sm font-medium text-slate-700">到账时间</span><a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="productForm.redeemArrivalMode" class="w-full"><a-select-option v-for="(meta, key) in redeemArrivalModeMeta" :key="key" :value="key">{{ meta.label }}</a-select-option></a-select></label>
                </div>

              </div>
            </div>

            <aside class="flex-1 bg-slate-50 p-6">
              <div class="relative rounded-xl border border-slate-200 bg-white p-5">
                <span v-if="productForm.isHot" class="absolute right-4 top-4 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">HOT</span>
                <h3 class="pr-12 text-xl font-semibold text-slate-900">{{ productForm.name || '未命名组合' }}</h3>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span v-for="asset in productForm.assets" :key="asset.symbol" class="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    {{ asset.symbol }}
                  </span>
                </div>
                <dl class="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div><dt class="text-slate-500">周期</dt><dd class="font-semibold text-slate-900">{{ formatPortfolioDuration(productForm.durationDays) }}</dd></div>
                  <div><dt class="text-slate-500">收益</dt><dd class="font-semibold text-emerald-600">{{ formatPortfolioRateRange(productForm) }}</dd></div>
                  <div><dt class="text-slate-500">区间</dt><dd class="font-semibold text-slate-900">{{ productForm.minAmount }} - {{ productForm.maxAmount }}</dd></div>
                  <div><dt class="text-slate-500">单用户上限</dt><dd class="font-semibold text-slate-900">{{ productForm.userLimitAmount }}</dd></div>
                </dl>
              </div>
            </aside>
          </div>
          </template>
<template #footer><template v-if="showModal"><div class="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <a-button type="text" class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700" @click="showModal = false">取消</a-button>
            <a-button type="text" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" @click="saveProduct">保存产品</a-button>
          </div></template></template>
</a-modal>
    </Teleport>
  </section>
</template>
