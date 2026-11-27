<script setup>
// 投资组合产品 — Ant Design Pro list page (2026-11-28): query card (one field per filter), table card with the
// create button in its toolbar, link actions and a guarded enable/disable confirmation dialog (replaces the native confirm box).
// The editor edits the *base* daily-rate range; the current range is always base × the yield-control multiplier,
// so saving no longer leaves a stale base that a later yield adjustment/reset would silently restore.
import { computed, reactive, ref } from 'vue'
import { Button, Card, Checkbox, Col, Descriptions, DescriptionsItem, Form, FormItem, Input, InputNumber, Row, Select, Space, Switch, Tabs, TabPane, Tag, TypographyText, message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import AdminDialog from '../../../admin/components/antd/AdminDialog.vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import { ASSET_CURRENCY_TYPE, ASSET_STATUS } from '../../../admin/constants/assets'
import { createAssetsCoinsMock } from '../../../admin/mock/assets'
import { getActiveVipLevels } from '../../../admin/mock/vip'
import { portfolioProductsCatalog } from '../../../admin/state/financeCatalogs'
import { appendPortfolioOperationLog } from '../../../admin/state/portfolioOperationLogs'
import {
  COMMON_FILTER_ALL,
  EARLY_REDEEM_MODE,
  PRODUCT_STATUS,
  REDEEM_ARRIVAL_MODE,
  applyPortfolioYieldAdjustment,
  earlyRedeemModeMeta,
  formatPortfolioAdjustmentRate,
  formatPortfolioDuration,
  formatPortfolioRateRange,
  getPortfolioBaseRates,
  productStatusMeta,
  redeemArrivalModeMeta,
  sortPortfolioProducts
} from '../../../admin/constants/portfolio'

const products = portfolioProductsCatalog
const page = ref(1)
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
const coinOptions = computed(() => supportedTradeCoins.value.map((coin) => ({ value: coin.symbol, label: `${coin.symbol} · ${coin.name}${coin.disabled ? '（已禁用）' : ''}` })))
const vipOptions = computed(() => activeVipLevels.value.map((vip) => ({ value: vip.level, label: vipLevelLabel(vip.level) })))
const statusOptions = Object.entries(productStatusMeta).map(([value, meta]) => ({ value, label: meta.label }))
const arrivalOptions = Object.entries(redeemArrivalModeMeta).map(([value, meta]) => ({ value, label: meta.label }))

function vipLevelLabel(level) {
  const vip = activeVipLevels.value.find((item) => item.level === Number(level))
  if (!vip) return `VIP${level}`
  return vip.displayName && vip.displayName !== vip.name ? `${vip.name}（${vip.displayName}）` : vip.name
}

// ---- list -------------------------------------------------------------------------------------------------
const blank = () => ({ name: '', id: '', asset: COMMON_FILTER_ALL, status: COMMON_FILTER_ALL, recommended: COMMON_FILTER_ALL })
const filters = ref(blank())
const assetOptions = computed(() => [...new Set(products.value.flatMap((product) => product.assets.map((asset) => asset.symbol)))].map((value) => ({ value, label: value })))
const fields = computed(() => [
  { key: 'name', label: '产品名称' },
  { key: 'id', label: '产品 ID' },
  { key: 'asset', label: '组合币种', searchable: true, options: [{ value: COMMON_FILTER_ALL, label: '全部币种' }, ...assetOptions.value] },
  { key: 'status', label: '状态', options: [{ value: COMMON_FILTER_ALL, label: '全部状态' }, ...statusOptions] },
  { key: 'recommended', label: '推荐', options: [{ value: COMMON_FILTER_ALL, label: '全部' }, { value: 'yes', label: '推荐' }, { value: 'no', label: '未推荐' }] }
])
const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
const money = (value) => Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })

const rows = computed(() => sortPortfolioProducts(products.value.filter((product) => {
  const f = filters.value
  return has(product.name, f.name) && has(product.id, f.id) &&
    (f.asset === COMMON_FILTER_ALL || product.assets.some((asset) => asset.symbol === f.asset)) &&
    (f.status === COMMON_FILTER_ALL || product.status === f.status) &&
    (f.recommended === COMMON_FILTER_ALL || Boolean(product.isRecommended) === (f.recommended === 'yes'))
})))

const columns = [
  { key: 'name', title: '产品', width: 260, fixed: 'left' },
  { key: 'assets', title: '组合币种', width: 180 },
  { key: 'yield', title: '日收益率', width: 190, align: 'right' },
  { key: 'amount', title: '申购金额（USDT）', width: 190, align: 'right' },
  { key: 'redeem', title: '赎回规则', width: 190 },
  { key: 'sortOrder', title: '排序权重', width: 100, align: 'right' },
  { key: 'status', title: '状态', width: 90 },
  { key: 'actions', title: '操作', width: 130, fixed: 'right' }
]

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }

// ---- editor dialog ----------------------------------------------------------------------------------------
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
const previewProduct = computed(() => applyPortfolioYieldAdjustment(productForm, productForm.yieldAdjustmentRate))

function resetForm(next = defaultForm()) {
  Object.assign(productForm, JSON.parse(JSON.stringify(next)))
  const base = getPortfolioBaseRates(productForm)
  productForm.baseMinDailyRatePct = base.min
  productForm.baseMaxDailyRatePct = base.max
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

function validateProduct() {
  if (!String(productForm.id || '').trim()) return ['base', '请输入产品 ID']
  if (!editingId.value && products.value.some((product) => product.id === productForm.id.trim())) return ['base', '产品 ID 已存在']
  if (!String(productForm.name || '').trim()) return ['base', '请输入产品名称']
  const symbols = productForm.assets.map((asset) => asset.symbol)
  if (!symbols.length || symbols.some((symbol) => !symbol)) return ['assets', '请至少选择一个组合币种']
  if (new Set(symbols).size !== symbols.length) return ['assets', '组合币种不能重复']
  if (!(Number(productForm.durationDays) > 0)) return ['yield', '运行天数须大于 0']
  if (Number(productForm.baseMinDailyRatePct) < 0 || Number(productForm.baseMaxDailyRatePct) < Number(productForm.baseMinDailyRatePct)) return ['yield', '最高日收益率不能低于最低日收益率']
  if (Number(productForm.maxAmount) < Number(productForm.minAmount)) return ['redeem', '最高金额不能低于最低金额']
  return null
}

function saveProduct() {
  const invalid = validateProduct()
  if (invalid) {
    activeTab.value = invalid[0]
    message.error(invalid[1])
    return
  }
  const draft = {
    ...JSON.parse(JSON.stringify(productForm)),
    id: productForm.id.trim(),
    name: productForm.name.trim(),
    sortOrder: Number(productForm.sortOrder)
  }
  draft.baseMinDailyRatePct = Number(draft.baseMinDailyRatePct) || 0
  draft.baseMaxDailyRatePct = Number(draft.baseMaxDailyRatePct) || 0
  const row = applyPortfolioYieldAdjustment(draft, Number(draft.yieldAdjustmentRate || 0))
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
  message.success(idx >= 0 ? '产品已保存' : '产品已创建')
}

// ---- enable / disable -------------------------------------------------------------------------------------
const statusTarget = ref(null)
function toggleStatus() {
  const product = products.value.find((item) => item.id === statusTarget.value?.id)
  if (!product) { statusTarget.value = null; return }
  const nextStatus = product.status === PRODUCT_STATUS.ENABLED ? PRODUCT_STATUS.DISABLED : PRODUCT_STATUS.ENABLED
  product.status = nextStatus
  appendPortfolioOperationLog({
    operator: 'admin',
    action: '切换状态',
    target: product.name,
    summary: `状态切换为 ${productStatusMeta[nextStatus]?.label}`
  })
  statusTarget.value = null
  message.success(nextStatus === PRODUCT_STATUS.ENABLED ? '产品已启用' : '产品已禁用')
}
</script>

<template>
  <PageShell>
    <SearchForm name="portfolio-product-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <AdminTable title="投资组合产品" v-model:page="page" :rows="rows" :columns="columns" row-key="id" desktop-only>
      <template #toolbar>
        <Button type="primary" @click="openCreate"><template #icon><PlusOutlined /></template>创建组合</Button>
      </template>
      <template #cell="{ column, record }">
        <Space v-if="column.key === 'name'" direction="vertical" :size="0">
          <span><TypographyText strong>{{ record.name }}</TypographyText> <Tag v-if="record.isHot" color="red">HOT</Tag><Tag v-if="record.isRecommended" color="gold">推荐</Tag></span>
          <TypographyText type="secondary" class="font-mono">{{ record.id }}</TypographyText>
          <TypographyText type="secondary">{{ vipLevelLabel(record.minVipLevel) }} 及以上 · {{ formatPortfolioDuration(record.durationDays) }}</TypographyText>
        </Space>
        <span v-else-if="column.key === 'assets'"><Tag v-for="asset in record.assets" :key="asset.symbol">{{ asset.symbol }}</Tag></span>
        <Space v-else-if="column.key === 'yield'" direction="vertical" :size="0" align="end">
          <span>{{ formatPortfolioRateRange(record) }}</span>
          <TypographyText type="secondary">手续费 {{ record.subscriptionFeePct }}%<template v-if="Number(record.yieldAdjustmentRate || 0) !== 0"> · 调控 {{ formatPortfolioAdjustmentRate(record.yieldAdjustmentRate) }}</template></TypographyText>
        </Space>
        <Space v-else-if="column.key === 'amount'" direction="vertical" :size="0" align="end">
          <span>{{ money(record.minAmount) }} ~ {{ money(record.maxAmount) }}</span>
          <TypographyText type="secondary">单用户上限 {{ money(record.userLimitAmount) }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'redeem'" direction="vertical" :size="0">
          <span>{{ record.earlyRedeemEnabled ? earlyRedeemModeMeta[record.earlyRedeemMode]?.label : '不支持提前赎回' }}</span>
          <TypographyText type="secondary"><template v-if="record.earlyRedeemEnabled">{{ record.earlyRedeemFeePct }}% · </template>{{ redeemArrivalModeMeta[record.redeemArrivalMode]?.label }}</TypographyText>
        </Space>
        <template v-else-if="column.key === 'sortOrder'">{{ Number(record.sortOrder) || 0 }}</template>
        <Tag v-else-if="column.key === 'status'" :color="record.status === PRODUCT_STATUS.ENABLED ? 'green' : 'default'">{{ productStatusMeta[record.status]?.label ?? record.status }}</Tag>
        <Space v-else-if="column.key === 'actions'" :size="8">
          <Button type="link" class="px-0" @click="openEdit(record)">编辑</Button>
          <Button type="link" class="px-0" :danger="record.status === PRODUCT_STATUS.ENABLED" @click="statusTarget = { ...record }">{{ record.status === PRODUCT_STATUS.ENABLED ? '禁用' : '启用' }}</Button>
        </Space>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <AdminModal
      :open="!!statusTarget"
      :title="statusTarget?.status === PRODUCT_STATUS.ENABLED ? '禁用投资组合产品' : '启用投资组合产品'"
      :confirm-text="statusTarget?.status === PRODUCT_STATUS.ENABLED ? '确认禁用' : '确认启用'"
      :danger="statusTarget?.status === PRODUCT_STATUS.ENABLED"
      :width="480"
      @close="statusTarget = null"
      @confirm="toggleStatus"
    >
      <TypographyText>{{ statusTarget?.status === PRODUCT_STATUS.ENABLED ? '确认禁用该投资组合产品？禁用后前台不可认购。' : '确认启用该投资组合产品？' }}</TypographyText>
      <TypographyText type="secondary">{{ statusTarget?.name }}</TypographyText>
    </AdminModal>

    <AdminDialog :open="showModal" :title="editingId ? '编辑组合产品' : '创建组合产品'" :width="1152" plain @close="showModal = false">
      <div class="portfolio-editor-body">
      <Row :gutter="24" :wrap="false">
        <Col flex="3" class="portfolio-editor-main">
          <Form layout="vertical" :model="productForm" name="portfolio-product-editor">
            <Tabs v-model:activeKey="activeTab">
              <TabPane key="base" tab="基础信息">
                <Row :gutter="16">
                  <Col :span="12"><FormItem label="产品 ID" required><Input v-model:value="productForm.id" :disabled="Boolean(editingId)" /></FormItem></Col>
                  <Col :span="12"><FormItem label="计价币种"><Input v-model:value="productForm.quoteCurrency" /></FormItem></Col>
                  <Col :span="12"><FormItem label="产品名称" required><Input v-model:value="productForm.name" :maxlength="80" /></FormItem></Col>
                  <Col :span="12"><FormItem label="最低 VIP 等级"><Select v-model:value="productForm.minVipLevel" :options="vipOptions" show-search option-filter-prop="label" /></FormItem></Col>
                  <Col :span="12"><FormItem label="产品状态"><Select v-model:value="productForm.status" :options="statusOptions" /></FormItem></Col>
                  <Col :span="12"><FormItem label="排序权重" extra="数值越大越靠前"><InputNumber v-model:value.number="productForm.sortOrder" :precision="0" placeholder="数值越大越靠前" style="width: 100%" /></FormItem></Col>
                  <Col :span="12"><FormItem><Checkbox v-model:checked="productForm.isHot">HOT 角标</Checkbox></FormItem></Col>
                  <Col :span="12"><FormItem><Checkbox v-model:checked="productForm.isRecommended">加到推荐</Checkbox></FormItem></Col>
                </Row>
              </TabPane>
              <TabPane key="assets" tab="组合币种">
                <TypographyText type="secondary">组合币种从资产管理 / 币种管理中已配置的虚拟币选择，最多选择 {{ MAX_PORTFOLIO_ASSETS }} 个币种。</TypographyText>
                <Space direction="vertical" :size="8" class="portfolio-asset-list">
                  <Space v-for="(asset, idx) in productForm.assets" :key="idx" :size="8" class="portfolio-asset-row">
                    <Select v-model:value="asset.symbol" :options="coinOptions" show-search option-filter-prop="label" not-found-content="无匹配币种" :aria-label="`组合币种 ${idx + 1}`" class="portfolio-asset-select" />
                    <Button type="link" danger :disabled="productForm.assets.length <= 1" @click="removeAsset(idx)">删除</Button>
                  </Space>
                  <Button :disabled="productForm.assets.length >= MAX_PORTFOLIO_ASSETS" @click="addAsset"><template #icon><PlusOutlined /></template>添加资产</Button>
                </Space>
              </TabPane>
              <TabPane key="yield" tab="收益费用">
                <Row :gutter="16">
                  <Col :span="12"><FormItem label="运行天数" required><InputNumber v-model:value="productForm.durationDays" :min="1" :precision="0" style="width: 100%" /></FormItem></Col>
                  <Col :span="12"><FormItem label="认购手续费（%）"><InputNumber v-model:value="productForm.subscriptionFeePct" :min="0" :max="100" style="width: 100%" /></FormItem></Col>
                  <Col :span="12"><FormItem label="基准最低日收益率（%）" required><InputNumber v-model:value="productForm.baseMinDailyRatePct" :min="0" style="width: 100%" /></FormItem></Col>
                  <Col :span="12"><FormItem label="基准最高日收益率（%）" required><InputNumber v-model:value="productForm.baseMaxDailyRatePct" :min="0" style="width: 100%" /></FormItem></Col>
                </Row>
                <TypographyText type="secondary">当前收益调控 {{ formatPortfolioAdjustmentRate(productForm.yieldAdjustmentRate || 0) }}，前台展示 {{ formatPortfolioRateRange(previewProduct) }}；调控比例在「收益调控」中修改。</TypographyText>
              </TabPane>
              <TabPane key="redeem" tab="赎回限额">
                <Row :gutter="16">
                  <Col :span="12"><FormItem label="最低金额"><InputNumber v-model:value="productForm.minAmount" :min="0" style="width: 100%" /></FormItem></Col>
                  <Col :span="12"><FormItem label="最高金额"><InputNumber v-model:value="productForm.maxAmount" :min="0" style="width: 100%" /></FormItem></Col>
                  <Col :span="12"><FormItem label="单用户持仓上限"><InputNumber v-model:value="productForm.userLimitAmount" :min="0" style="width: 100%" /></FormItem></Col>
                  <Col :span="12"><FormItem label="每月申购次数"><InputNumber v-model:value="productForm.monthlyLimitCount" :min="0" :precision="0" style="width: 100%" /></FormItem></Col>
                  <Col :span="24"><FormItem label="允许提前赎回"><Switch v-model:checked="productForm.earlyRedeemEnabled" checked-children="允许" un-checked-children="不允许" aria-label="允许提前赎回" /></FormItem></Col>
                  <Col :span="12"><FormItem label="赎回模式"><Select v-model:value="productForm.earlyRedeemMode" :options="earlyRedeemModeOptions" :disabled="!productForm.earlyRedeemEnabled" /></FormItem></Col>
                  <Col :span="12"><FormItem label="赎回费率（%）"><InputNumber v-model:value="productForm.earlyRedeemFeePct" :min="0" :max="100" :disabled="!productForm.earlyRedeemEnabled" style="width: 100%" /></FormItem></Col>
                  <Col :span="12"><FormItem label="到账时间"><Select v-model:value="productForm.redeemArrivalMode" :options="arrivalOptions" /></FormItem></Col>
                </Row>
              </TabPane>
            </Tabs>
          </Form>
        </Col>
        <Col flex="2" class="portfolio-editor-preview">
          <Card size="small" title="前台展示预览">
            <template #extra><Tag v-if="productForm.isHot" color="red">HOT</Tag></template>
            <TypographyText strong>{{ productForm.name || '未命名组合' }}</TypographyText>
            <div class="portfolio-preview-assets"><Tag v-for="asset in productForm.assets" :key="asset.symbol">{{ asset.symbol }}</Tag></div>
            <Descriptions :column="2" size="small">
              <DescriptionsItem label="周期">{{ formatPortfolioDuration(productForm.durationDays) }}</DescriptionsItem>
              <DescriptionsItem label="收益">{{ formatPortfolioRateRange(previewProduct) }}</DescriptionsItem>
              <DescriptionsItem label="区间">{{ money(productForm.minAmount) }} - {{ money(productForm.maxAmount) }}</DescriptionsItem>
              <DescriptionsItem label="单用户上限">{{ money(productForm.userLimitAmount) }}</DescriptionsItem>
            </Descriptions>
          </Card>
        </Col>
      </Row>
      </div>
      <footer>
        <Button @click="showModal = false">取消</Button>
        <Button type="primary" @click="saveProduct">保存产品</Button>
      </footer>
    </AdminDialog>
  </PageShell>
</template>

<style scoped>
.portfolio-editor-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding-bottom:24px}
.portfolio-editor-main{min-width:0}
.portfolio-editor-preview{min-width:0;padding-top:16px}
.portfolio-asset-list{width:100%;margin-top:12px}
.portfolio-asset-row{width:100%}
.portfolio-asset-row :deep(.ant-space-item:first-child){flex:1}
.portfolio-asset-select{width:100%;min-width:240px}
.portfolio-preview-assets{margin:12px 0}
</style>
