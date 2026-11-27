<script setup>
// 收益调控 — Ant Design Pro list page (2026-11-28): query card (the combined keyword box is split into one field per
// filter), the summary as a Statistic card, table card with the 收益调整日志 shortcut in its toolbar, link actions.
// Dialogs use the shared AdminDialog / confirmation modal; reset now asks for confirmation and every change toasts.
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Card, Col, DatePicker, Descriptions, DescriptionsItem, Form, FormItem, Input, Row, Slider, Space, Statistic, Tag, TypographyText, message } from 'ant-design-vue'
import dayjs from 'dayjs'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import AdminDialog from '../../../admin/components/antd/AdminDialog.vue'
import { portfolioProductsCatalog } from '../../../admin/state/financeCatalogs'
import { appendPortfolioOperationLog } from '../../../admin/state/portfolioOperationLogs'
import { appendPortfolioYieldAdjustmentLog } from '../../../admin/state/portfolioYieldAdjustmentLogs'
import {
  applyPortfolioYieldAdjustment,
  formatPortfolioAdjustmentRate,
  formatPortfolioRateRange,
  getPortfolioBaseRates,
  resetPortfolioYieldAdjustment,
  sortPortfolioProducts
} from '../../../admin/constants/portfolio'

const router = useRouter()
const products = portfolioProductsCatalog
const page = ref(1)
const showControlModal = ref(false)
const activeProductId = ref('')
const controlForm = reactive({
  adjustmentRate: 0,
  reason: '',
  validUntil: ''
})

const blank = () => ({ name: '', id: '', asset: 'all', adjusted: 'all' })
const filters = ref(blank())
const assetOptions = computed(() => [...new Set(products.value.flatMap((product) => product.assets.map((asset) => asset.symbol)))].map((value) => ({ value, label: value })))
const fields = computed(() => [
  { key: 'name', label: '产品名称' },
  { key: 'id', label: '产品 ID' },
  { key: 'asset', label: '组合币种', searchable: true, options: [{ value: 'all', label: '全部币种' }, ...assetOptions.value] },
  { key: 'adjusted', label: '调控状态', options: [{ value: 'all', label: '全部' }, { value: 'adjusted', label: '调控中' }, { value: 'base', label: '基准收益' }] }
])
const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
const isAdjusted = (product) => Number(product.yieldAdjustmentRate || 0) !== 0

const rows = computed(() => sortPortfolioProducts(products.value).filter((product) => {
  const f = filters.value
  return has(product.name, f.name) && has(product.id, f.id) &&
    (f.asset === 'all' || product.assets.some((asset) => asset.symbol === f.asset)) &&
    (f.adjusted === 'all' || isAdjusted(product) === (f.adjusted === 'adjusted'))
}))

const averageMultiplier = computed(() => {
  if (!products.value.length) return 1
  const sum = products.value.reduce((acc, product) => acc + Number(product.currentYieldMultiplier || 1), 0)
  return sum / products.value.length
})

const summary = computed(() => [
  { label: '产品总数', value: products.value.length },
  { label: '调控中', value: products.value.filter(isAdjusted).length },
  { label: 'HOT 产品', value: products.value.filter((product) => product.isHot).length },
  { label: '平均倍数', value: averageMultiplier.value.toFixed(2), suffix: '×' }
])

const columns = [
  { key: 'product', title: '产品', width: 260, fixed: 'left' },
  { key: 'base', title: '基准收益', width: 190, align: 'right' },
  { key: 'current', title: '当前收益', width: 190, align: 'right' },
  { key: 'rate', title: '调整比例', width: 110, align: 'right' },
  { key: 'multiplier', title: '倍数', width: 90, align: 'right' },
  { key: 'actions', title: '操作', width: 120, fixed: 'right' }
]

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }

const activeProduct = computed(() => products.value.find((product) => product.id === activeProductId.value) ?? null)

function productTitle(product) {
  return product.assets.map((asset) => asset.symbol).join(' + ')
}

function openControl(product) {
  activeProductId.value = product.id
  controlForm.adjustmentRate = Number(product.yieldAdjustmentRate || 0)
  controlForm.reason = ''
  controlForm.validUntil = ''
  showControlModal.value = true
}

function formatLogTime() {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

function rateType(rate) {
  const n = Number(rate)
  if (n > 0) return 'success'
  if (n < 0) return 'danger'
  return undefined
}

function saveControl() {
  const product = activeProduct.value
  if (!product) return
  const before = { ...product }
  const next = applyPortfolioYieldAdjustment(product, controlForm.adjustmentRate)
  const idx = products.value.findIndex((item) => item.id === product.id)
  if (idx >= 0) products.value[idx] = next

  const durationLabel = controlForm.validUntil ? `有效期至 ${controlForm.validUntil}` : '持续生效'
  const reason = controlForm.reason.trim() || '—'
  appendPortfolioYieldAdjustmentLog({
    productId: product.id,
    productName: product.name,
    assetsLabel: productTitle(product),
    beforeRate: Number(before.yieldAdjustmentRate || 0),
    afterRate: Number(next.yieldAdjustmentRate || 0),
    beforeMultiplier: Number(before.currentYieldMultiplier || 1),
    afterMultiplier: Number(next.currentYieldMultiplier || 1),
    beforeRange: formatPortfolioRateRange(before),
    afterRange: formatPortfolioRateRange(next),
    durationLabel,
    actionType: 'adjust',
    operator: 'admin',
    reason,
    createdAt: formatLogTime()
  })
  appendPortfolioOperationLog({
    operator: 'admin',
    action: '收益调控',
    target: product.name,
    summary: `收益调控：${formatPortfolioAdjustmentRate(before.yieldAdjustmentRate || 0)} → ${formatPortfolioAdjustmentRate(next.yieldAdjustmentRate)}；${durationLabel}；${reason}`
  })
  showControlModal.value = false
  message.success('收益调控已保存')
}

const resetTarget = ref(null)
function resetControl(product) {
  if (!product || Number(product.yieldAdjustmentRate || 0) === 0) return
  const before = { ...product }
  const next = resetPortfolioYieldAdjustment(product)
  const idx = products.value.findIndex((item) => item.id === product.id)
  if (idx >= 0) products.value[idx] = next

  appendPortfolioYieldAdjustmentLog({
    productId: product.id,
    productName: product.name,
    assetsLabel: productTitle(product),
    beforeRate: Number(before.yieldAdjustmentRate || 0),
    afterRate: 0,
    beforeMultiplier: Number(before.currentYieldMultiplier || 1),
    afterMultiplier: 1,
    beforeRange: formatPortfolioRateRange(before),
    afterRange: formatPortfolioRateRange(next),
    durationLabel: '—',
    actionType: 'reset',
    operator: 'admin',
    reason: '管理员重置为基准收益',
    createdAt: formatLogTime()
  })
  appendPortfolioOperationLog({
    operator: 'admin',
    action: '收益调控重置',
    target: product.name,
    summary: `收益调控重置：${formatPortfolioAdjustmentRate(before.yieldAdjustmentRate || 0)} → 0%`
  })
  message.success('已重置为基准收益')
}
function confirmReset() {
  const product = products.value.find((item) => item.id === resetTarget.value?.id)
  resetTarget.value = null
  resetControl(product)
}

function baseRateRange(product) {
  const base = getPortfolioBaseRates(product)
  return formatPortfolioRateRange({ minDailyRatePct: base.min, maxDailyRatePct: base.max })
}

const disabledPastDate = (current) => current && current < dayjs().startOf('day')
const presets = [
  { label: '强激励 +50%', value: 50 },
  { label: '温和上调 +20%', value: 20 },
  { label: '成本回收 -20%', value: -20 },
  { label: '恢复基准', value: 0 }
]
</script>

<template>
  <PageShell>
    <SearchForm name="portfolio-yield-control-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />

    <Card :bordered="false">
      <Row :gutter="24">
        <Col v-for="item in summary" :key="item.label" :span="6">
          <Statistic :title="item.label" :value="item.value" :suffix="item.suffix" />
        </Col>
      </Row>
    </Card>

    <AdminTable title="收益调控" v-model:page="page" :rows="rows" :columns="columns" row-key="id" desktop-only>
      <template #toolbar>
        <Button @click="router.push({ name: 'portfolio-yield-adjustment-log' })">收益调整日志</Button>
      </template>
      <template #cell="{ column, record }">
        <Space v-if="column.key === 'product'" direction="vertical" :size="0">
          <TypographyText strong>{{ productTitle(record) }}</TypographyText>
          <TypographyText type="secondary">{{ record.name }}</TypographyText>
          <TypographyText type="secondary" class="font-mono">{{ record.id }}</TypographyText>
        </Space>
        <template v-else-if="column.key === 'base'">{{ baseRateRange(record) }}</template>
        <template v-else-if="column.key === 'current'">{{ formatPortfolioRateRange(record) }}</template>
        <Tag v-else-if="column.key === 'rate'" :color="Number(record.yieldAdjustmentRate || 0) > 0 ? 'green' : Number(record.yieldAdjustmentRate || 0) < 0 ? 'red' : 'default'">{{ formatPortfolioAdjustmentRate(record.yieldAdjustmentRate || 0) }}</Tag>
        <template v-else-if="column.key === 'multiplier'">{{ Number(record.currentYieldMultiplier || 1).toFixed(2) }}×</template>
        <Space v-else-if="column.key === 'actions'" :size="8">
          <Button type="link" class="px-0" @click="openControl(record)">调整</Button>
          <Button v-if="isAdjusted(record)" type="link" class="px-0" danger @click="resetTarget = { ...record }">重置</Button>
        </Space>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <AdminModal :open="!!resetTarget" title="重置收益调控" confirm-text="确认重置" danger :width="480" @close="resetTarget = null" @confirm="confirmReset">
      <TypographyText>确认将 {{ resetTarget ? productTitle(resetTarget) : '' }} 恢复为基准收益？当前调整比例 {{ formatPortfolioAdjustmentRate(resetTarget?.yieldAdjustmentRate || 0) }} 将被清除。</TypographyText>
    </AdminModal>

    <AdminDialog :open="showControlModal" title="收益调控" :width="672" plain @close="showControlModal = false">
      <template #subtitle>{{ activeProduct ? productTitle(activeProduct) : '' }}</template>
      <div class="yield-control-body">
        <Descriptions :column="2" size="small" bordered>
          <DescriptionsItem label="基准收益">{{ activeProduct ? baseRateRange(activeProduct) : '—' }}</DescriptionsItem>
          <DescriptionsItem label="调整后收益">
            <TypographyText type="success" strong>{{ activeProduct ? formatPortfolioRateRange(applyPortfolioYieldAdjustment(activeProduct, controlForm.adjustmentRate)) : '—' }}</TypographyText>
          </DescriptionsItem>
        </Descriptions>
        <Form layout="vertical" :model="controlForm" name="portfolio-yield-control-form">
          <FormItem label="调整比例（%）">
            <Slider v-model:value="controlForm.adjustmentRate" :min="-100" :max="100" :step="5" :marks="{ '-100': '-100%', 0: '0', 100: '+100%' }" aria-label="调整比例" />
            <TypographyText :type="rateType(controlForm.adjustmentRate)" strong>
              {{ formatPortfolioAdjustmentRate(controlForm.adjustmentRate) }} · {{ (1 + controlForm.adjustmentRate / 100).toFixed(2) }}×
            </TypographyText>
          </FormItem>
          <FormItem label="快捷设置">
            <Space :size="8" wrap>
              <Button v-for="preset in presets" :key="preset.value" @click="controlForm.adjustmentRate = preset.value">{{ preset.label }}</Button>
            </Space>
          </FormItem>
          <FormItem label="有效期至" extra="留空表示持续生效，后续可手动重置。">
            <DatePicker v-model:value="controlForm.validUntil" value-format="YYYY-MM-DD" :disabled-date="disabledPastDate" placeholder="持续生效" style="width: 100%" />
          </FormItem>
          <FormItem label="调整原因">
            <Input.TextArea v-model:value="controlForm.reason" :rows="3" :maxlength="200" placeholder="请输入调整原因，便于日志追溯" />
          </FormItem>
        </Form>
      </div>
      <footer>
        <Button @click="showControlModal = false">取消</Button>
        <Button type="primary" @click="saveControl">保存调控</Button>
      </footer>
    </AdminDialog>
  </PageShell>
</template>

<style scoped>
.yield-control-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding-top:24px;display:grid;gap:24px}
</style>
