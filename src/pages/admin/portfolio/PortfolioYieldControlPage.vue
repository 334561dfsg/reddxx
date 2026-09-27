<script setup>
import { computed, reactive, ref } from 'vue'
import AdminListPaginationBar from '../../../admin/components/AdminListPaginationBar.vue'
import { useAdminListPagination } from '../../../admin/composables/useAdminListPagination'
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

const products = portfolioProductsCatalog
const keyword = ref('')
const showControlModal = ref(false)
const activeProductId = ref('')
const controlForm = reactive({
  adjustmentRate: 0,
  reason: '',
  validUntil: ''
})

const filteredProducts = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  const rows = sortPortfolioProducts(products.value)
  if (!kw) return rows
  return rows.filter((product) => {
    const text = `${product.name} ${product.id} ${product.assets.map((asset) => asset.symbol).join(' ')}`.toLowerCase()
    return text.includes(kw)
  })
})

const {
  currentPage,
  pageSize,
  totalPages,
  pagedRows: pagedProducts,
  onPageSizeChange
} = useAdminListPagination(filteredProducts, { resetSources: [keyword] })

const summary = computed(() => {
  const total = products.value.length
  const adjusted = products.value.filter((product) => Number(product.yieldAdjustmentRate || 0) !== 0).length
  const hot = products.value.filter((product) => product.isHot).length
  return [
    { label: '产品总数', value: String(total) },
    { label: '调控中', value: String(adjusted) },
    { label: 'HOT 产品', value: String(hot) },
    { label: '平均倍数', value: `${averageMultiplier.value.toFixed(2)}×` }
  ]
})

const averageMultiplier = computed(() => {
  if (!products.value.length) return 1
  const sum = products.value.reduce((acc, product) => acc + Number(product.currentYieldMultiplier || 1), 0)
  return sum / products.value.length
})

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

function rateClass(rate) {
  const n = Number(rate)
  if (n > 0) return 'text-emerald-600'
  if (n < 0) return 'text-rose-600'
  return 'text-slate-600'
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
}

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
}

function baseRateRange(product) {
  const base = getPortfolioBaseRates(product)
  return formatPortfolioRateRange({ minDailyRatePct: base.min, maxDailyRatePct: base.max })
}

const validUntilMin = computed(() => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
})
</script>

<template>
  <section class="space-y-5">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">收益调控</h1>
        <p class="mt-1 text-sm text-slate-500">按投资组合产品调整日收益区间，前台展示与申购预估同步使用调整后的收益。</p>
      </div>
      <RouterLink
        :to="{ name: 'portfolio-yield-adjustment-log' }"
        class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
      >
        收益调整日志
      </RouterLink>
    </header>

    <div class="grid gap-3 md:grid-cols-4">
      <div v-for="item in summary" :key="item.label" class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="text-xs text-slate-500">{{ item.label }}</div>
        <div class="mt-2 text-2xl font-semibold text-slate-900">{{ item.value }}</div>
      </div>
    </div>

    <article class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div class="border-b border-slate-200 bg-slate-50 p-4">
        <a-input
          v-model:value="keyword"
          type="search"
          placeholder="搜索产品名称、ID 或币种"
          class="w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </div>
      <a-table  size="small" :pagination="false" :data-source="pagedProducts" :row-key="(product) => product.id" :scroll="{ x: 'max-content' }" :custom-row="(product, rowIndex) => ({ class: [&quot;border-t border-slate-100 hover:bg-slate-50&quot;] })">
<a-table-column key="column-0" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>产品</template>
<template #default="{ record: product, index: rowIndex }">
              <div class="font-medium text-slate-900">{{ productTitle(product) }}</div>
              <div class="font-mono text-xs text-slate-400">{{ product.id }}</div>
            </template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-4 py-3 text-slate-600&quot;] })">
<template #title>基准收益</template>
<template #default="{ record: product, index: rowIndex }">{{ baseRateRange(product) }}</template>
</a-table-column>
<a-table-column key="column-2" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-4 py-3 font-medium text-emerald-600&quot;] })">
<template #title>当前收益</template>
<template #default="{ record: product, index: rowIndex }">{{ formatPortfolioRateRange(product) }}</template>
</a-table-column>
<a-table-column key="column-3" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>调整比例</template>
<template #default="{ record: product, index: rowIndex }">
              <span :class="['font-medium', rateClass(product.yieldAdjustmentRate)]">
                {{ formatPortfolioAdjustmentRate(product.yieldAdjustmentRate || 0) }}
              </span>
            </template>
</a-table-column>
<a-table-column key="column-4" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-4 py-3 tabular-nums text-slate-700&quot;] })">
<template #title>倍数</template>
<template #default="{ record: product, index: rowIndex }">{{ Number(product.currentYieldMultiplier || 1).toFixed(2) }}×</template>
</a-table-column>
<a-table-column key="column-5" align="right" :custom-cell="(product, rowIndex) => ({ class: [&quot;px-4 py-3 text-right&quot;] })">
<template #title>操作</template>
<template #default="{ record: product, index: rowIndex }">
              <a-button type="text" class="text-sm font-medium text-blue-600 hover:text-blue-800" @click="openControl(product)">调整</a-button>
              <template v-if="Number(product.yieldAdjustmentRate || 0) !== 0">
                <span class="mx-2 text-slate-200">|</span>
                <a-button type="text" class="text-sm font-medium text-slate-600 hover:text-slate-900" @click="resetControl(product)">重置</a-button>
              </template>
            </template>
</a-table-column>
</a-table>
      <div v-if="filteredProducts.length === 0" class="py-12 text-center text-sm text-slate-500">暂无产品</div>
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
      <a-modal :wrap-props="{ 'aria-modal': true }" transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :open="Boolean(showControlModal)" :mask-closable="false" :closable="false" :keyboard="false" :width="672"  :destroy-on-close="true" wrap-class-name="admin-trading-modal" :body-style="{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 180px)' }" @cancel="showControlModal = false">
<template #title><template v-if="showControlModal"><div class="flex items-start justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 class="text-xl font-semibold text-slate-900">收益调控</h2>
              <p class="mt-1 text-sm text-slate-500">{{ activeProduct ? productTitle(activeProduct) : '' }}</p>
            </div>
            <a-button aria-label="关闭" type="text" class="text-2xl leading-none text-slate-400 hover:text-slate-700" @click="showControlModal = false">×</a-button>
          </div></template></template>
<template v-if="showControlModal">
          <div class="space-y-5 p-6">
            <div class="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm md:grid-cols-2">
              <div>
                <div class="text-slate-500">基准收益</div>
                <div class="mt-1 font-semibold text-slate-900">{{ activeProduct ? baseRateRange(activeProduct) : '—' }}</div>
              </div>
              <div>
                <div class="text-slate-500">调整后收益</div>
                <div class="mt-1 font-semibold text-emerald-600">
                  {{ activeProduct ? formatPortfolioRateRange(applyPortfolioYieldAdjustment(activeProduct, controlForm.adjustmentRate)) : '—' }}
                </div>
              </div>
            </div>

            <label class="block">
              <span class="mb-1 block text-sm font-medium text-slate-700">调整比例（%）</span>
              <a-slider v-model:value.number="controlForm.adjustmentRate" :min="-100" :max="100" :step="5" class="w-full" />
              <div class="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>-100%</span>
                <span :class="['text-base font-semibold', rateClass(controlForm.adjustmentRate)]">
                  {{ formatPortfolioAdjustmentRate(controlForm.adjustmentRate) }} · {{ (1 + controlForm.adjustmentRate / 100).toFixed(2) }}×
                </span>
                <span>+100%</span>
              </div>
            </label>

            <div class="grid gap-3 md:grid-cols-4">
              <a-button type="text" class="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50" @click="controlForm.adjustmentRate = 50">强激励 +50%</a-button>
              <a-button type="text" class="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50" @click="controlForm.adjustmentRate = 20">温和上调 +20%</a-button>
              <a-button type="text" class="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50" @click="controlForm.adjustmentRate = -20">成本回收 -20%</a-button>
              <a-button type="text" class="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50" @click="controlForm.adjustmentRate = 0">恢复基准</a-button>
            </div>

            <label class="block">
              <span class="mb-1 block text-sm font-medium text-slate-700">有效期至</span>
              <a-input v-model:value="controlForm.validUntil" type="date" :min="validUntilMin" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <span class="mt-1 block text-xs text-slate-500">留空表示持续生效，后续可手动重置。</span>
            </label>

            <label class="block">
              <span class="mb-1 block text-sm font-medium text-slate-700">调整原因</span>
              <a-textarea v-model:value="controlForm.reason" rows="3" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="请输入调整原因，便于日志追溯"></a-textarea>
            </label>
          </div>
          </template>
<template #footer><template v-if="showControlModal"><div class="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <a-button type="text" class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700" @click="showControlModal = false">取消</a-button>
            <a-button type="text" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" @click="saveControl">保存调控</a-button>
          </div></template></template>
</a-modal>
    </Teleport>
  </section>
</template>
