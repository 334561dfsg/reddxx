<script setup>
// 汇率管理 — Ant Design Pro list page (2026-11-28): query card, table card with the 新增交易对 toolbar action, and the
// editor on the shared AdminDialog frame with an Ant Form. Fixes: assets/sources of existing pairs (USD, OKX, …) are
// now selectable when editing, and saving rejects empty, identical or duplicate base/quote assets.
import { computed, reactive, ref } from 'vue'
import { Button, Card, Col, Descriptions, DescriptionsItem, Empty, Form, FormItem, List, ListItem, Row, Select, Space, Switch, Tag, TypographyText, message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminDialog from '../../../admin/components/antd/AdminDialog.vue'
import MfaVerificationModal from '../../../admin/components/MfaVerificationModal.vue'
import {
  EXCHANGE_RATE_SOURCE,
  EXCHANGE_RATE_TYPE
} from '../../../admin/constants/assets'
import { createExchangeRatePairsMock, createFeeTemplatesMock } from '../../../admin/mock/assets'
import { getActiveVipLevels } from '../../../admin/mock/vip'

const showEditModal = ref(false)
const editingId = ref('')

const page = ref(1)

// MFA 验证相关
const showMfaModal = ref(false)
const pendingSaveData = ref(null)
const mfaLoading = ref(false)

const SOURCE_LABELS = {
  [EXCHANGE_RATE_SOURCE.BINANCE]: '币安',
  [EXCHANGE_RATE_SOURCE.OKX]: 'OKX',
  [EXCHANGE_RATE_SOURCE.COINGECKO]: 'CoinGecko',
  [EXCHANGE_RATE_SOURCE.CUSTOM]: '自定义'
}
const sourceOptions = Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label }))
const pairs = ref(createExchangeRatePairsMock())
const feeTemplates = ref(createFeeTemplatesMock())
const baseAssetList = ['USDT', 'BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOT', 'TRX', 'DOGE']
// Include the assets of existing pairs (e.g. USD) so editing them shows a selectable value instead of a raw code.
const availableAssets = computed(() => [...new Set([...baseAssetList, ...pairs.value.flatMap((p) => [p.baseAsset, p.quoteAsset])])])
const assetOptions = computed(() => availableAssets.value.map((value) => ({ value, label: value })))

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

const blankFilters = () => ({ status: 'all', baseAsset: 'all', quoteAsset: 'all', source: 'all' })
const filters = ref(blankFilters())
const filterFields = computed(() => [
  { key: 'status', label: '状态', options: [{ value: 'all', label: '全部状态' }, { value: 'enabled', label: '已启用' }, { value: 'disabled', label: '已禁用' }] },
  { key: 'baseAsset', label: '基础资产', searchable: true, options: [{ value: 'all', label: '全部资产' }, ...assetOptions.value] },
  { key: 'quoteAsset', label: '目标资产', searchable: true, options: [{ value: 'all', label: '全部资产' }, ...assetOptions.value] },
  { key: 'source', label: '数据源', options: [{ value: 'all', label: '全部数据源' }, ...sourceOptions] }
])
const filteredPairs = computed(() => {
  const f = filters.value
  return pairs.value.filter((pair) => {
    const hitStatus = f.status === 'all' || (f.status === 'enabled' && pair.enabled) || (f.status === 'disabled' && !pair.enabled)
    return hitStatus && (f.baseAsset === 'all' || pair.baseAsset === f.baseAsset) &&
      (f.quoteAsset === 'all' || pair.quoteAsset === f.quoteAsset) && (f.source === 'all' || pair.source === f.source)
  })
})
function searchPairs(values) { filters.value = { ...blankFilters(), ...values }; page.value = 1 }
function resetPairs() { filters.value = blankFilters(); page.value = 1 }
const columns = [
  { key: 'pair', title: '交易对', width: 170, fixed: 'left' },
  { key: 'marketRate', title: '市场中间价', width: 140, align: 'right' },
  { key: 'markup', title: '兑换费率加成', width: 220 },
  { key: 'template', title: '费率模板', width: 160 },
  { key: 'status', title: '状态', width: 90 },
  { key: 'lastUpdate', title: '最后更新', width: 170 },
  { key: 'actions', title: '操作', width: 80, fixed: 'right' }
]

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

  if (!payload.baseAsset || !payload.quoteAsset) {
    message.error('请选择基础资产和目标资产')
    return
  }
  if (payload.baseAsset === payload.quoteAsset) {
    message.error('基础资产与目标资产不能相同')
    return
  }
  if (pairs.value.some((pair) => pair.id !== editingId.value && pair.baseAsset === payload.baseAsset && pair.quoteAsset === payload.quoteAsset)) {
    message.error(`交易对 ${payload.baseAsset}/${payload.quoteAsset} 已存在`)
    return
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
      message.success('汇率配置已保存')
    }
  } catch (error) {
    message.error('MFA 验证失败：' + (error.message || '请稍后重试'))
  } finally {
    mfaLoading.value = false
  }
}

// ========== 工具函数 ==========
const sourceLabel = (source) => SOURCE_LABELS[source] || source

const feeTemplateOptions = computed(() => [
  { value: '', label: '未选择模板（手动配置）' },
  ...feeTemplates.value.filter((t) => t.enabled || t.id === rateForm.feeTemplateId).map((template) => ({
    value: template.id,
    label: `${template.name}（逆：${(template.baseMarkup.buy * 100).toFixed(2)}% | 正：${(template.baseMarkup.sell * 100).toFixed(2)}%）`
  }))
])
const percent = (value) => `${((Number(value) || 0) * 100).toFixed(2)}%`

const getFeeTemplateName = (templateId) => {
  if (!templateId) return '手动配置'
  const template = feeTemplates.value.find(t => t.id === templateId)
  return template ? template.name : '未知模板'
}
</script>

<template>
  <PageShell>
    <SearchForm name="exchange-rate-filters" :model="filters" :fields="filterFields" @search="searchPairs" @reset="resetPairs" />

    <AdminTable :title="`交易对（已启用 ${enabledPairsCount}）`" v-model:page="page" :rows="filteredPairs" :columns="columns" row-key="id" desktop-only>
      <template #toolbar>
        <Button type="primary" @click="openCreateRate()"><template #icon><PlusOutlined /></template>新增交易对</Button>
      </template>
      <template #cell="{ column, record: pair }">
        <Space v-if="column.key === 'pair'" direction="vertical" :size="0">
          <TypographyText strong>{{ pair.baseAsset }}/{{ pair.quoteAsset }}</TypographyText>
          <TypographyText type="secondary">数据源 {{ sourceLabel(pair.source) }}</TypographyText>
        </Space>
        <template v-else-if="column.key === 'marketRate'">{{ pair.marketRate }}</template>
        <Space v-else-if="column.key === 'markup'" direction="vertical" :size="0">
          <span>→{{ pair.quoteAsset }}（兑换）{{ percent(pair.sellMarkup) }}</span>
          <span>→{{ pair.baseAsset }}（回兑）{{ percent(pair.buyMarkup) }}</span>
        </Space>
        <template v-else-if="column.key === 'template'">{{ getFeeTemplateName(pair.feeTemplateId) }}</template>
        <Tag v-else-if="column.key === 'status'" :color="pair.enabled ? 'green' : 'default'">{{ pair.enabled ? '已启用' : '已禁用' }}</Tag>
        <Button v-else-if="column.key === 'actions'" type="link" class="px-0" @click="openEditRate(pair)">编辑</Button>
        <template v-else>{{ pair[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <!-- 编辑/新增弹窗 -->
    <AdminDialog :open="showEditModal" :title="editingId ? '编辑汇率配置' : '新增交易对'" :width="960" plain @close="showEditModal = false">
      <template #subtitle>左侧配置基本信息，费率详情请参考右侧预览</template>
      <div class="exchange-rate-dialog-body">
        <Row :gutter="24">
          <Col :xs="24" :lg="14">
            <Form layout="vertical" name="exchange-rate-editor" :model="rateForm">
              <FormItem label="费率模板" extra="选择模板后，基础费率和 VIP 分级费率将自动从模板同步，无需手动配置">
                <Select v-model:value="rateForm.feeTemplateId" :options="feeTemplateOptions" show-search option-filter-prop="label" not-found-content="无匹配模板" aria-label="费率模板" @change="applyFeeTemplate(rateForm.feeTemplateId)" />
              </FormItem>
              <Row :gutter="16">
                <Col :xs="24" :sm="12">
                  <FormItem label="基础资产" required extra="交易对的主体资产（如 USDT）">
                    <Select v-model:value="rateForm.baseAsset" :options="assetOptions" show-search option-filter-prop="label" placeholder="请选择资产" not-found-content="无匹配资产" aria-label="基础资产" />
                  </FormItem>
                </Col>
                <Col :xs="24" :sm="12">
                  <FormItem label="目标资产" required extra="交易对的兑换资产（如 BTC）">
                    <Select v-model:value="rateForm.quoteAsset" :options="assetOptions" show-search option-filter-prop="label" placeholder="请选择资产" not-found-content="无匹配资产" aria-label="目标资产" />
                  </FormItem>
                </Col>
              </Row>
              <FormItem label="市场汇率来源" extra="实时获取市场中间价的价格接口来源">
                <Select v-model:value="rateForm.source" :options="sourceOptions" aria-label="市场汇率来源" />
              </FormItem>
              <FormItem label="启用该交易对" extra="是否允许用户在前端看到并交易此币对">
                <Switch v-model:checked="rateForm.enabled" aria-label="启用该交易对" checked-children="启用" un-checked-children="禁用" />
              </FormItem>
            </Form>
          </Col>
          <Col :xs="24" :lg="10">
            <Space direction="vertical" :size="16" class="exchange-rate-preview">
              <Card size="small" title="交易对概览">
                <template #extra><Tag :color="rateForm.enabled ? 'green' : 'default'">{{ rateForm.enabled ? '已启用' : '已禁用' }}</Tag></template>
                <Descriptions :column="1" size="small">
                  <DescriptionsItem label="交易对">{{ ratePreviewPair }}</DescriptionsItem>
                  <DescriptionsItem label="数据源">{{ sourceLabel(rateForm.source) }}</DescriptionsItem>
                </Descriptions>
              </Card>
              <Card size="small" title="费率配置预览">
                <TypographyText strong>{{ selectedRateTemplate?.name || '未选择模板（当前为手动配置）' }}</TypographyText>
                <div><TypographyText type="secondary">{{ selectedRateTemplate?.description || '可直接编辑当前交易对的基础费率与 VIP 分级费率' }}</TypographyText></div>
                <Descriptions :column="1" size="small" class="exchange-rate-preview-rates">
                  <DescriptionsItem :label="`${rateForm.quoteAsset || '目标币'} → ${rateForm.baseAsset || '基础币'}（回兑）`">{{ percent(rateForm.buyMarkup) }}</DescriptionsItem>
                  <DescriptionsItem :label="`${rateForm.baseAsset || '基础币'} → ${rateForm.quoteAsset || '目标币'}（兑换）`">{{ percent(rateForm.sellMarkup) }}</DescriptionsItem>
                </Descriptions>
              </Card>
              <Card size="small" title="分级费率预览">
                <template #extra><TypographyText type="secondary">共 {{ ratePreviewLevelEntries.length }} 级</TypographyText></template>
                <Empty v-if="ratePreviewLevelEntries.length === 0" description="暂无分级费率数据" />
                <List v-else size="small" :data-source="getVisibleRatePreviewLevelEntries()">
                  <template #renderItem="{ item: [level, rates] }">
                    <ListItem>
                      <TypographyText strong>{{ vipLevelLabel(level) }}</TypographyText>
                      <TypographyText type="secondary">回兑 {{ percent(rates.buy) }} / 兑换 {{ percent(rates.sell) }}</TypographyText>
                    </ListItem>
                  </template>
                </List>
                <Button v-if="hasMoreRatePreviewLevels" type="link" block @click="rateLevelsExpanded = !rateLevelsExpanded">
                  {{ rateLevelsExpanded ? '收起' : `展开剩余 ${ratePreviewLevelEntries.length - RATE_LEVEL_PREVIEW_LIMIT} 级` }}
                </Button>
              </Card>
            </Space>
          </Col>
        </Row>
      </div>
      <footer>
        <Button @click="showEditModal = false">取消</Button>
        <Button type="primary" @click="saveRate()">保存</Button>
      </footer>
    </AdminDialog>

    <!-- MFA 验证弹窗 -->
    <MfaVerificationModal
      v-model:open="showMfaModal"
      :loading="mfaLoading"
      title="安全验证"
      description="编辑汇率配置属于敏感操作，请输入 MFA 验证码"
      @verify="handleMfaVerify"
      @cancel="pendingSaveData = null"
    />
  </PageShell>
</template>

<style scoped>
.exchange-rate-dialog-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding-top: 24px; padding-bottom: 24px; }
.exchange-rate-preview { width: 100%; }
.exchange-rate-preview-rates { margin-top: 12px; }
</style>
