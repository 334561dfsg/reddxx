<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import MfaVerificationModal from '../../../admin/components/MfaVerificationModal.vue'
import {
  ADJUSTMENT_STATUS,
  ADJUSTMENT_TYPE,
  adjustmentStatusMeta,
  adjustmentTypeMeta,
  COMMON_FILTER_ALL,
  LOCKED_SECTION,
  ORDER_STATUS,
  orderStatusMeta,
  PRODUCT_STATUS,
  productStatusMeta,
  PURCHASE_LIMIT_TYPE,
  SUPPORTED_CURRENCIES,
  LOCKED_MIN_VIP_OPTIONS,
  LOCKED_MIN_KYC_OPTIONS,
  DEFAULT_LOCKED_LENDABLE_RATIO,
  lockYieldAnnualPct,
  lockedMinKycLabel
} from '../../../admin/constants/liquidityLocked'
import {
  createLockedAdjustmentsMock,
  createLockedOrdersMock,
  createLockedRulesMock
} from '../../../admin/mock/liquidityLocked'
import { lockedProductsCatalog } from '../../../admin/state/financeCatalogs'

const route = useRoute()

const products = lockedProductsCatalog
const orders = ref(createLockedOrdersMock())
const adjustments = ref(createLockedAdjustmentsMock())
const rules = ref(createLockedRulesMock())

const section = computed(() => String(route.meta.section || LOCKED_SECTION.PRODUCTS))

// 通用搜索和筛选
const search = ref('')
const statusFilter = ref(COMMON_FILTER_ALL)

// ========== 产品管理 ==========
const showProductModal = ref(false)
const editingProductId = ref('')
const showMfaModal = ref(false)
const pendingSaveData = ref(null)
const mfaLoading = ref(false)

const productForm = reactive({
  name: '',
  currency: 'USDT',
  periods: [],
  earlyRedeemEnabled: true,
  earlyRedeemFee: 4,
  purchaseLimitType: PURCHASE_LIMIT_TYPE.LIFETIME,
  lifetimeLimit: 50000,
  periodLimit: 10000,
  periodDays: 30,
  minVipLevel: 0,
  minKycLevel: 'none',
  lendableRatio: DEFAULT_LOCKED_LENDABLE_RATIO,
  status: PRODUCT_STATUS.ENABLED
})

const openCreateProduct = () => {
  editingProductId.value = ''
  productForm.name = ''
  productForm.currency = 'USDT'
  productForm.periods = [{ days: 10, annualRate: 12, minAmount: 100, maxAmount: 5000 }]
  productForm.earlyRedeemEnabled = true
  productForm.earlyRedeemFee = 4
  productForm.purchaseLimitType = PURCHASE_LIMIT_TYPE.LIFETIME
  productForm.lifetimeLimit = 50000
  productForm.periodLimit = 10000
  productForm.periodDays = 30
  productForm.minVipLevel = 0
  productForm.minKycLevel = 'none'
  productForm.lendableRatio = DEFAULT_LOCKED_LENDABLE_RATIO
  productForm.status = PRODUCT_STATUS.ENABLED
  showProductModal.value = true
}

const openEditProduct = (product) => {
  editingProductId.value = product.id
  productForm.name = product.name
  productForm.currency = product.currency
  productForm.periods = product.periods.map((p) => ({
    days: p.days,
    annualRate: lockYieldAnnualPct(p),
    minAmount: p.minAmount,
    maxAmount: p.maxAmount
  }))
  productForm.earlyRedeemEnabled = product.earlyRedeemEnabled
  productForm.earlyRedeemFee = product.earlyRedeemFee
  productForm.purchaseLimitType = product.purchaseLimitType
  productForm.lifetimeLimit = product.lifetimeLimit
  productForm.periodLimit = product.periodLimit
  productForm.periodDays = product.periodDays
  productForm.minVipLevel = product.minVipLevel ?? 0
  productForm.minKycLevel = product.minKycLevel ?? 'none'
  productForm.lendableRatio =
    product.lendableRatio != null && product.lendableRatio !== ''
      ? Number(product.lendableRatio)
      : DEFAULT_LOCKED_LENDABLE_RATIO
  productForm.status = product.status
  showProductModal.value = true
}

const addPeriod = () => {
  productForm.periods.push({ days: 10, annualRate: 12, minAmount: 100, maxAmount: 5000 })
}

const removePeriod = (index) => {
  productForm.periods.splice(index, 1)
}

const saveProduct = () => {
  const payload = {
    name: productForm.name.trim(),
    currency: productForm.currency,
    icon: productForm.currency === 'USDT' ? '₮' : productForm.currency === 'BTC' ? '₿' : productForm.currency === 'ETH' ? 'Ξ' : productForm.currency,
    periods: productForm.periods.map((p) => ({
      days: Number(p.days),
      annualRate: Number(p.annualRate),
      minAmount: Number(p.minAmount),
      maxAmount: Number(p.maxAmount)
    })),
    earlyRedeemEnabled: productForm.earlyRedeemEnabled,
    earlyRedeemFee: Number(productForm.earlyRedeemFee),
    purchaseLimitType: productForm.purchaseLimitType,
    lifetimeLimit: Number(productForm.lifetimeLimit),
    periodLimit: Number(productForm.periodLimit),
    periodDays: Number(productForm.periodDays),
    minVipLevel: Number(productForm.minVipLevel) || 0,
    minKycLevel: productForm.minKycLevel || 'none',
    lendableRatio: (() => {
      const n = Number(productForm.lendableRatio)
      if (!Number.isFinite(n)) return DEFAULT_LOCKED_LENDABLE_RATIO
      return Math.min(100, Math.max(0, n))
    })(),
    status: productForm.status
  }

  // 保存待提交的数据，先显示 MFA 验证弹窗
  pendingSaveData.value = payload
  showMfaModal.value = true
}

// 处理 MFA 验证
const handleMfaVerify = async (code) => {
  mfaLoading.value = true

  try {
    // TODO: 这里调用后端 API 验证 MFA 验证码
    // const response = await api.verifyMFA(code)

    // 模拟 API 调用延迟
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 验证成功后执行实际的保存操作
    if (pendingSaveData.value) {
      if (editingProductId.value) {
        products.value = products.value.map(p => p.id === editingProductId.value ? { ...p, ...pendingSaveData.value } : p)
      } else {
        products.value.unshift({ id: `prod-${Date.now()}`, ...pendingSaveData.value, totalLocked: 0, totalOrders: 0, createdAt: new Date().toISOString().split('T')[0] })
      }

      showProductModal.value = false
      pendingSaveData.value = null
      showMfaModal.value = false
      alert('产品保存成功！')
    }
  } catch (error) {
    alert('MFA 验证失败：' + (error.message || '请稍后重试'))
  } finally {
    mfaLoading.value = false
  }
}

const filteredProducts = computed(() => {
  const kw = search.value.trim().toLowerCase()
  return products.value.filter(p => {
    const matchStatus = statusFilter.value === COMMON_FILTER_ALL || p.status === statusFilter.value
    const matchKeyword = !kw || `${p.name} ${p.currency}`.toLowerCase().includes(kw)
    return matchStatus && matchKeyword
  })
})

// ========== 订单管理 ==========
const filteredOrders = computed(() => {
  const kw = search.value.trim().toLowerCase()
  return orders.value.filter(o => {
    const matchStatus = statusFilter.value === COMMON_FILTER_ALL || o.status === statusFilter.value
    const matchKeyword = !kw || `${o.id} ${o.userName} ${o.productName} ${o.currency}`.toLowerCase().includes(kw)
    return matchStatus && matchKeyword
  })
})

// ========== 手工调整 ==========
const showAdjustmentModal = ref(false)
const adjustmentForm = reactive({
  orderId: '',
  type: ADJUSTMENT_TYPE.ADD_INTEREST,
  amount: 0,
  reason: ''
})

const openCreateAdjustment = () => {
  adjustmentForm.orderId = ''
  adjustmentForm.type = ADJUSTMENT_TYPE.ADD_INTEREST
  adjustmentForm.amount = 0
  adjustmentForm.reason = ''
  showAdjustmentModal.value = true
}

const saveAdjustment = () => {
  const order = orders.value.find(o => o.id === adjustmentForm.orderId)
  if (!order) return

  adjustments.value.unshift({
    id: `adj-${Date.now()}`,
    orderId: adjustmentForm.orderId,
    userId: order.userId,
    userName: order.userName,
    type: adjustmentForm.type,
    amount: Number(adjustmentForm.amount),
    currency: order.currency,
    reason: adjustmentForm.reason.trim(),
    status: ADJUSTMENT_STATUS.PENDING,
    requestedBy: 'admin@platform.com',
    requestedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    executedAt: null
  })

  showAdjustmentModal.value = false
}

const approveAdjustment = (id) => {
  adjustments.value = adjustments.value.map(a =>
    a.id === id ? { ...a, status: ADJUSTMENT_STATUS.APPROVED } : a
  )
}

const executeAdjustment = (id) => {
  adjustments.value = adjustments.value.map(a =>
    a.id === id ? { ...a, status: ADJUSTMENT_STATUS.EXECUTED, executedAt: new Date().toISOString().replace('T', ' ').substring(0, 19) } : a
  )
}

const rejectAdjustment = (id) => {
  adjustments.value = adjustments.value.map(a =>
    a.id === id ? { ...a, status: ADJUSTMENT_STATUS.REJECTED } : a
  )
}

const filteredAdjustments = computed(() => {
  const kw = search.value.trim().toLowerCase()
  return adjustments.value.filter(a => {
    const matchStatus = statusFilter.value === COMMON_FILTER_ALL || a.status === statusFilter.value
    const matchKeyword = !kw || `${a.orderId} ${a.userName}`.toLowerCase().includes(kw)
    return matchStatus && matchKeyword
  })
})

// ========== 工具函数 ==========
const fmtNumber = (val, decimals = 2) => Number(val).toFixed(decimals)
const fmtCurrency = (val, currency, decimals = 2) => {
  if (currency === 'BTC' || currency === 'ETH') return `${fmtNumber(val, decimals === 2 ? 4 : decimals)} ${currency}`
  return `${Number(val).toLocaleString()} ${currency}`
}
const adjustmentClass = (val) => {
  const n = Number(val) || 0
  if (n > 0) return 'text-emerald-600'
  if (n < 0) return 'text-rose-600'
  return 'text-slate-400'
}
const fmtSignedCurrency = (val, currency) => {
  const n = Number(val) || 0
  if (n === 0) return '-'
  const sign = n > 0 ? '+' : '-'
  return `${sign}${fmtCurrency(Math.abs(n), currency)}`
}
</script>

<template>
  <section class="space-y-4">
    <!-- 产品管理 -->
    <template v-if="section === LOCKED_SECTION.PRODUCTS">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl font-semibold text-slate-900">产品管理</h1>
          <p class="mt-1 text-sm text-slate-500">配置锁仓产品、阶梯收益与限购策略</p>
        </div>
        <a-button type="text" html-type="button" class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" @click="openCreateProduct">+ 新增产品</a-button>
      </header>

      <article class="rounded-xl border border-slate-200 bg-white">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div class="inline-flex items-center gap-3 text-sm">
            <a-button type="text" html-type="button" class="font-medium" :class="statusFilter === COMMON_FILTER_ALL ? 'text-blue-600' : 'text-slate-500'" @click="statusFilter = COMMON_FILTER_ALL">全部</a-button>
            <a-button type="text" html-type="button" class="font-medium" :class="statusFilter === PRODUCT_STATUS.ENABLED ? 'text-blue-600' : 'text-slate-500'" @click="statusFilter = PRODUCT_STATUS.ENABLED">上架中</a-button>
            <a-button type="text" html-type="button" class="font-medium" :class="statusFilter === PRODUCT_STATUS.DISABLED ? 'text-blue-600' : 'text-slate-500'" @click="statusFilter = PRODUCT_STATUS.DISABLED">已下架</a-button>
            <a-button type="text" html-type="button" class="font-medium" :class="statusFilter === PRODUCT_STATUS.SOLD_OUT ? 'text-blue-600' : 'text-slate-500'" @click="statusFilter = PRODUCT_STATUS.SOLD_OUT">已售罄</a-button>
          </div>
          <a-input v-model:value="search" type="text" placeholder="搜索产品名称或币种..." class="w-full max-w-sm rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>

        <div class="space-y-3 p-4">
          <article v-for="product in filteredProducts" :key="product.id" class="rounded-xl border border-slate-200 bg-white p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="flex items-start gap-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-2xl">{{ product.icon }}</div>
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="text-lg font-semibold text-slate-900">{{ product.name }}</h3>
                    <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="productStatusMeta[product.status].class">{{ productStatusMeta[product.status].label }}</span>
                  </div>
                  <p class="mt-0.5 text-sm text-slate-500">{{ product.currency }} · {{ product.periods.length }} 个周期可选</p>
                  <div class="mt-2 flex flex-wrap gap-1.5">
                    <span v-for="(period, idx) in product.periods" :key="idx" class="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {{ period.days }}天 · 年化 {{ lockYieldAnnualPct(period).toFixed(2) }}%
                    </span>
                  </div>
                </div>
              </div>
              <a-button type="text" html-type="button" class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50" @click="openEditProduct(product)">编辑</a-button>
            </div>

            <div class="mt-3 grid gap-3 md:grid-cols-5">
              <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p class="text-xs text-slate-500">总锁仓</p>
                <p class="mt-1 font-semibold text-slate-900">{{ fmtCurrency(product.totalLocked, product.currency) }}</p>
              </div>
              <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p class="text-xs text-slate-500">可借贷比例</p>
                <p class="mt-1 font-semibold text-slate-900">
                  {{ product.lendableRatio != null && product.lendableRatio !== '' ? Number(product.lendableRatio) : DEFAULT_LOCKED_LENDABLE_RATIO }}%
                </p>
              </div>
              <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p class="text-xs text-slate-500">订单数</p>
                <p class="mt-1 font-semibold text-slate-900">{{ product.totalOrders }}</p>
              </div>
              <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p class="text-xs text-slate-500">提前赎回</p>
                <p class="mt-1 font-semibold" :class="product.earlyRedeemEnabled ? 'text-amber-600' : 'text-slate-500'">{{ product.earlyRedeemEnabled ? `${product.earlyRedeemFee}% 违约金` : '不支持' }}</p>
              </div>
              <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p class="text-xs text-slate-500">限购策略</p>
                <p class="mt-1 text-xs font-medium text-slate-700">
                  <span v-if="product.purchaseLimitType === PURCHASE_LIMIT_TYPE.LIFETIME">终身 {{ fmtCurrency(product.lifetimeLimit, product.currency) }}</span>
                  <span v-else-if="product.purchaseLimitType === PURCHASE_LIMIT_TYPE.PERIOD">{{ product.periodDays }}天 {{ fmtCurrency(product.periodLimit, product.currency) }}</span>
                  <span v-else>不限购</span>
                </p>
                <p class="mt-1 text-[11px] text-slate-500">
                  {{ (product.minVipLevel ?? 0) === 0 ? 'VIP 无门槛' : `最低 VIP ${product.minVipLevel}` }} · {{ lockedMinKycLabel(product.minKycLevel) }}
                </p>
              </div>
            </div>
          </article>
        </div>
      </article>
    </template>

    <!-- 订单管理 -->
    <template v-else-if="section === LOCKED_SECTION.ORDERS">
      <header>
        <h1 class="text-3xl font-semibold text-slate-900">订单管理</h1>
        <p class="mt-1 text-sm text-slate-500">审查锁仓订单状态与收益兑现节奏</p>
      </header>

      <article class="rounded-xl border border-slate-200 bg-white">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div class="inline-flex items-center gap-3 text-sm">
            <a-button type="text" html-type="button" class="font-medium" :class="statusFilter === COMMON_FILTER_ALL ? 'text-blue-600' : 'text-slate-500'" @click="statusFilter = COMMON_FILTER_ALL">全部</a-button>
            <a-button type="text" html-type="button" class="font-medium" :class="statusFilter === ORDER_STATUS.LOCKED ? 'text-blue-600' : 'text-slate-500'" @click="statusFilter = ORDER_STATUS.LOCKED">锁定中</a-button>
            <a-button type="text" html-type="button" class="font-medium" :class="statusFilter === ORDER_STATUS.COMPLETED ? 'text-blue-600' : 'text-slate-500'" @click="statusFilter = ORDER_STATUS.COMPLETED">已完成</a-button>
            <a-button type="text" html-type="button" class="font-medium" :class="statusFilter === ORDER_STATUS.EARLY_REDEEMED ? 'text-blue-600' : 'text-slate-500'" @click="statusFilter = ORDER_STATUS.EARLY_REDEEMED">提前赎回</a-button>
          </div>
          <a-input v-model:value="search" type="text" placeholder="搜索订单ID、用户名..." class="w-full max-w-sm rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>

        <div class="overflow-x-auto">
          <a-table  size="small" :pagination="false" :data-source="filteredOrders" :row-key="(order) => order.id" :scroll="{ x: 'max-content' }" :custom-row="(order, rowIndex) => ({ class: [&quot;border-t border-slate-100&quot;] })">
<a-table-column key="column-0" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3 font-mono text-xs text-slate-600&quot;] })">
<template #title>订单ID</template>
<template #default="{ record: order, index: rowIndex }">{{ order.id }}</template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3 text-slate-700&quot;] })">
<template #title>用户</template>
<template #default="{ record: order, index: rowIndex }">{{ order.userName }}</template>
</a-table-column>
<a-table-column key="column-2" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3 text-slate-700&quot;] })">
<template #title>产品</template>
<template #default="{ record: order, index: rowIndex }">{{ order.productName }}</template>
</a-table-column>
<a-table-column key="column-3" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3 font-medium text-slate-900&quot;] })">
<template #title>金额</template>
<template #default="{ record: order, index: rowIndex }">{{ fmtCurrency(order.amount, order.currency) }}</template>
</a-table-column>
<a-table-column key="column-4" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3 text-slate-700&quot;] })">
<template #title>周期</template>
<template #default="{ record: order, index: rowIndex }">{{ order.lockDays }} 天</template>
</a-table-column>
<a-table-column key="column-5" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3 font-medium text-emerald-600&quot;] })">
<template #title>年化收益率</template>
<template #default="{ record: order, index: rowIndex }">{{ lockYieldAnnualPct(order).toFixed(2) }}%</template>
</a-table-column>
<a-table-column key="column-6" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3 font-medium text-slate-700&quot;] })">
<template #title>基础预计收益</template>
<template #default="{ record: order, index: rowIndex }">{{ fmtCurrency(order.baseInterest, order.currency) }}</template>
</a-table-column>
<a-table-column key="column-7" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3 font-medium&quot;, adjustmentClass(order.executedInterestAdjustment)] })">
<template #title>已执行调整</template>
<template #default="{ record: order, index: rowIndex }">
                  {{ fmtSignedCurrency(order.executedInterestAdjustment, order.currency) }}
                </template>
</a-table-column>
<a-table-column key="column-8" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3 font-medium text-blue-600&quot;] })">
<template #title>应发收益</template>
<template #default="{ record: order, index: rowIndex }">{{ fmtCurrency(order.payableInterest, order.currency) }}</template>
</a-table-column>
<a-table-column key="column-9" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>状态</template>
<template #default="{ record: order, index: rowIndex }"><span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="orderStatusMeta[order.status].class">{{ orderStatusMeta[order.status].label }}</span></template>
</a-table-column>
<a-table-column key="column-10" :custom-cell="(order, rowIndex) => ({ class: [&quot;px-4 py-3 text-slate-700&quot;] })">
<template #title>剩余天数</template>
<template #default="{ record: order, index: rowIndex }">{{ order.daysRemaining > 0 ? `${order.daysRemaining} 天` : '-' }}</template>
</a-table-column>
</a-table>
        </div>
      </article>
    </template>

    <!-- 手工调整 -->
    <template v-else-if="section === LOCKED_SECTION.ADJUSTMENTS">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl font-semibold text-slate-900">手工调整</h1>
          <p class="mt-1 text-sm text-slate-500">处理补息、扣息、展期与提前赎回</p>
        </div>
        <a-button type="text" html-type="button" class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" @click="openCreateAdjustment">+ 新建调整</a-button>
      </header>

      <article class="rounded-xl border border-slate-200 bg-white">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div class="inline-flex items-center gap-3 text-sm">
            <a-button type="text" html-type="button" class="font-medium" :class="statusFilter === COMMON_FILTER_ALL ? 'text-blue-600' : 'text-slate-500'" @click="statusFilter = COMMON_FILTER_ALL">全部</a-button>
            <a-button type="text" html-type="button" class="font-medium" :class="statusFilter === ADJUSTMENT_STATUS.PENDING ? 'text-blue-600' : 'text-slate-500'" @click="statusFilter = ADJUSTMENT_STATUS.PENDING">待处理</a-button>
            <a-button type="text" html-type="button" class="font-medium" :class="statusFilter === ADJUSTMENT_STATUS.APPROVED ? 'text-blue-600' : 'text-slate-500'" @click="statusFilter = ADJUSTMENT_STATUS.APPROVED">已批准</a-button>
            <a-button type="text" html-type="button" class="font-medium" :class="statusFilter === ADJUSTMENT_STATUS.EXECUTED ? 'text-blue-600' : 'text-slate-500'" @click="statusFilter = ADJUSTMENT_STATUS.EXECUTED">已执行</a-button>
          </div>
          <a-input v-model:value="search" type="text" placeholder="搜索订单ID、用户名..." class="w-full max-w-sm rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>

        <div class="space-y-3 p-4">
          <article v-for="adj in filteredAdjustments" :key="adj.id" class="rounded-xl border border-slate-200 bg-white p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="adjustmentTypeMeta[adj.type].class">{{ adjustmentTypeMeta[adj.type].label }}</span>
                  <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="adjustmentStatusMeta[adj.status].class">{{ adjustmentStatusMeta[adj.status].label }}</span>
                  <span class="text-sm text-slate-500">{{ adj.requestedAt }}</span>
                </div>
                <div class="mt-2 text-sm text-slate-700">
                  <p><span class="font-medium">订单:</span> {{ adj.orderId }} · <span class="font-medium">用户:</span> {{ adj.userName }}</p>
                  <p class="mt-1"><span class="font-medium">金额:</span> {{ fmtCurrency(adj.amount, adj.currency) }}</p>
                  <p class="mt-1"><span class="font-medium">原因:</span> {{ adj.reason }}</p>
                  <p class="mt-1 text-xs text-slate-500">操作人: {{ adj.requestedBy }}</p>
                </div>
              </div>
              <div v-if="adj.status === ADJUSTMENT_STATUS.PENDING" class="flex gap-2">
                <a-button type="text" html-type="button" class="rounded-lg border border-emerald-500 px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50" @click="approveAdjustment(adj.id)">批准</a-button>
                <a-button type="text" html-type="button" class="rounded-lg border border-rose-500 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50" @click="rejectAdjustment(adj.id)">拒绝</a-button>
              </div>
              <div v-else-if="adj.status === ADJUSTMENT_STATUS.APPROVED" class="flex gap-2">
                <a-button type="text" html-type="button" class="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700" @click="executeAdjustment(adj.id)">执行</a-button>
              </div>
            </div>
          </article>
        </div>
      </article>
    </template>

    <!-- 规则说明 -->
    <template v-else>
      <header>
        <h1 class="text-3xl font-semibold text-slate-900">规则说明</h1>
        <p class="mt-1 text-sm text-slate-500">展示锁仓版收益、赎回、限购与资金用途规则</p>
      </header>

      <article class="space-y-4">
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-lg font-semibold text-slate-900">产品定位</h2>
          <p class="mt-2 text-sm leading-relaxed text-slate-700">{{ rules.positioning.description }}</p>
          <p class="mt-2 text-sm leading-relaxed text-slate-600">{{ rules.positioning.note }}</p>
          <div class="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p class="text-sm font-medium text-blue-900">资金用途说明</p>
            <ul class="mt-2 space-y-1 text-sm text-blue-800">
              <li v-for="item in rules.positioning.capitalUsage" :key="item">• {{ item }}</li>
            </ul>
          </div>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-lg font-semibold text-slate-900">提前赎回规则</h2>
          <div class="mt-3 grid gap-3 md:grid-cols-3">
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p class="text-sm text-slate-500">提前赎回开关</p>
              <p class="mt-1 font-semibold">{{ rules.earlyRedeem.enabled ? '开启' : '关闭' }}</p>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p class="text-sm text-slate-500">违约金比例</p>
              <p class="mt-1 font-semibold text-rose-600">{{ rules.earlyRedeem.feePct }}%</p>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p class="text-sm text-slate-500">最短持有</p>
              <p class="mt-1 font-semibold">{{ rules.earlyRedeem.minHoldDays }} 天</p>
            </div>
          </div>
          <p class="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">{{ rules.earlyRedeem.note }}</p>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-lg font-semibold text-slate-900">限购策略（赔付控制核心）</h2>
          <div class="mt-3 grid gap-3 md:grid-cols-3">
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p class="text-sm text-slate-500">终身限购</p>
              <p class="mt-1 font-semibold">{{ rules.purchaseLimit.lifetimeEnabled ? `${rules.purchaseLimit.lifetimeAmount.toLocaleString()} USDT` : '关闭' }}</p>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p class="text-sm text-slate-500">周期限购</p>
              <p class="mt-1 font-semibold">{{ rules.purchaseLimit.cycleEnabled ? `${rules.purchaseLimit.cycleDays} 天 / ${rules.purchaseLimit.cycleAmount.toLocaleString()} USDT` : '关闭' }}</p>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p class="text-sm text-slate-500">风险分层限额</p>
              <p class="mt-1 font-semibold">{{ rules.purchaseLimit.userRiskCapEnabled ? '开启' : '关闭' }}</p>
            </div>
          </div>
          <div class="mt-3 overflow-x-auto rounded-lg border border-slate-200">
            <a-table  size="small" :pagination="false" :data-source="rules.purchaseLimit.riskCaps" :row-key="(item) => item.level" :scroll="{ x: 'max-content' }" :custom-row="(item, rowIndex) => ({ class: [&quot;border-t border-slate-100&quot;] })">
<a-table-column key="column-0" :custom-cell="(item, rowIndex) => ({ class: [&quot;px-3 py-2&quot;] })">
<template #title>用户层级</template>
<template #default="{ record: item, index: rowIndex }">{{ item.level }}</template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(item, rowIndex) => ({ class: [&quot;px-3 py-2 font-medium&quot;] })">
<template #title>限购上限</template>
<template #default="{ record: item, index: rowIndex }">{{ item.maxAmount.toLocaleString() }} USDT</template>
</a-table-column>
</a-table>
          </div>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-lg font-semibold text-slate-900">风险预警与运营监控</h2>
          <div class="mt-3 grid gap-3 md:grid-cols-3">
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p class="text-sm text-slate-500">赔付预警</p>
              <p class="mt-1 font-semibold">{{ rules.riskAlert.payoutWarningEnabled ? `超过 ${rules.riskAlert.payoutWarningAmount.toLocaleString()} USDT 告警` : '关闭' }}</p>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p class="text-sm text-slate-500">流动性预警</p>
              <p class="mt-1 font-semibold">{{ rules.riskAlert.liquidityWarningEnabled ? `占用率 > ${rules.riskAlert.liquidityWarningRatio}%` : '关闭' }}</p>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p class="text-sm text-slate-500">到期集中预警</p>
              <p class="mt-1 font-semibold">{{ rules.riskAlert.maturityWarningEnabled ? `${rules.riskAlert.maturityWindowHours} 小时窗口` : '关闭' }}</p>
            </div>
          </div>
        </div>
      </article>
    </template>

    <!-- 产品编辑弹窗：Teleport 到 body，遮罩铺满视口 -->
    <Teleport to="body">
      <a-modal :wrap-props="{ 'aria-modal': true }" transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :open="Boolean(showProductModal)" :mask-closable="false" :closable="false" :keyboard="false" :width="672"  :destroy-on-close="true" wrap-class-name="admin-trading-modal" :body-style="{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 180px)' }" @cancel="showProductModal = false">
<template #title><template v-if="showProductModal"><header class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 class="text-xl font-semibold text-slate-900">{{ editingProductId ? '编辑产品' : '新增产品' }}</h2>
          <a-button aria-label="关闭" type="text" html-type="button" class="text-2xl text-slate-400" @click="showProductModal = false">×</a-button>
        </header></template></template>
<template v-if="showProductModal">

        <div class="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-4">
          <div class="grid gap-x-5 gap-y-4 md:grid-cols-2">
            <div class="lb-stack">
              <div class="lb-label-row">
                <span class="lb-label">产品名称</span>
                <span class="lb-label-aux">必填</span>
              </div>
              <a-input v-model:value="productForm.name" type="text" class="lb-ctrl" autocomplete="off" />
            </div>
            <div class="lb-stack">
              <div class="lb-label-row">
                <span class="lb-label">计价币种</span>
              </div>
              <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="productForm.currency" class="lb-ctrl lb-select">
                <a-select-option v-for="curr in SUPPORTED_CURRENCIES" :key="curr" :value="curr">{{ curr }}</a-select-option>
              </a-select>
            </div>
          </div>

          <div class="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <div class="mb-3 flex items-center justify-between gap-2">
              <div class="lb-label-row flex-1 !justify-start gap-2">
                <span class="lb-label">锁仓与年化收益</span>
                <span class="lb-label-aux !text-left">每行一档</span>
              </div>
              <a-button type="text" html-type="button" class="h-9 shrink-0 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700" @click="addPeriod">+ 添加档位</a-button>
            </div>
            <div class="space-y-2">
              <div v-for="(period, idx) in productForm.periods" :key="idx" class="flex flex-wrap items-center gap-2">
                <a-input v-model:value.number="period.days" type="number" placeholder="天数" inputmode="numeric" class="lb-cell-in w-[4.5rem]" />
                <a-input v-model:value.number="period.annualRate" type="number" step="0.01" min="0" placeholder="年化%" inputmode="decimal" class="lb-cell-in w-[6.25rem]" />
                <a-input v-model:value.number="period.minAmount" type="number" placeholder="单笔最小" inputmode="decimal" class="lb-cell-in min-w-[6rem] flex-1" />
                <a-input v-model:value.number="period.maxAmount" type="number" placeholder="单笔最大" inputmode="decimal" class="lb-cell-in min-w-[6rem] flex-1" />
                <a-button type="text" html-type="button" class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-rose-600 hover:border-rose-200 hover:bg-rose-50" title="删除" @click="removePeriod(idx)">×</a-button>
              </div>
            </div>
          </div>

          <div class="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <div class="lb-stack max-w-xl">
              <div class="lb-label-row">
                <span class="lb-label">提前赎回</span>
              </div>
              <label class="flex h-10 cursor-pointer items-center gap-2.5">
                <a-checkbox v-model:checked="productForm.earlyRedeemEnabled" class="" />
                <span class="text-sm text-slate-700">允许提前赎回</span>
              </label>
            </div>
            <div v-if="productForm.earlyRedeemEnabled" class="lb-stack mt-4 max-w-xs border-t border-slate-200 pt-4">
              <div class="lb-label-row">
                <span class="lb-label">违约金</span>
                <span class="lb-label-aux">% · 本金</span>
              </div>
              <a-input v-model:value.number="productForm.earlyRedeemFee" type="number" class="lb-ctrl w-32 tabular-nums" />
            </div>
          </div>

          <div class="space-y-4">
            <div class="lb-stack max-w-lg">
              <div class="lb-label-row">
                <span class="lb-label">限购类型</span>
              </div>
              <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="productForm.purchaseLimitType" class="lb-ctrl lb-select">
                <a-select-option :value="PURCHASE_LIMIT_TYPE.NONE">不限购</a-select-option>
                <a-select-option :value="PURCHASE_LIMIT_TYPE.LIFETIME">终身限购</a-select-option>
                <a-select-option :value="PURCHASE_LIMIT_TYPE.PERIOD">周期限购</a-select-option>
              </a-select>
            </div>
            <div v-if="productForm.purchaseLimitType === PURCHASE_LIMIT_TYPE.LIFETIME" class="lb-stack max-w-lg">
              <div class="lb-label-row">
                <span class="lb-label">终身限购额度</span>
              </div>
              <a-input v-model:value.number="productForm.lifetimeLimit" type="number" class="lb-ctrl tabular-nums" />
            </div>
            <div v-if="productForm.purchaseLimitType === PURCHASE_LIMIT_TYPE.PERIOD" class="grid gap-x-5 gap-y-4 sm:grid-cols-2">
              <div class="lb-stack">
                <div class="lb-label-row">
                  <span class="lb-label">周期天数</span>
                </div>
                <a-input v-model:value.number="productForm.periodDays" type="number" class="lb-ctrl tabular-nums" />
              </div>
              <div class="lb-stack">
                <div class="lb-label-row">
                  <span class="lb-label">周期限购额度</span>
                </div>
                <a-input v-model:value.number="productForm.periodLimit" type="number" class="lb-ctrl tabular-nums" />
              </div>
            </div>
            <div class="grid gap-x-5 gap-y-4 sm:grid-cols-2">
              <div class="lb-stack">
                <div class="lb-label-row">
                  <span class="lb-label">最低 VIP</span>
                </div>
                <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value.number="productForm.minVipLevel" class="lb-ctrl lb-select">
                  <a-select-option v-for="opt in LOCKED_MIN_VIP_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</a-select-option>
                </a-select>
              </div>
              <div class="lb-stack">
                <div class="lb-label-row">
                  <span class="lb-label">最低认证</span>
                </div>
                <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="productForm.minKycLevel" class="lb-ctrl lb-select">
                  <a-select-option v-for="opt in LOCKED_MIN_KYC_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</a-select-option>
                </a-select>
              </div>
            </div>
            <div class="lb-stack max-w-xs">
              <div class="lb-label-row">
                <span class="lb-label">可借贷比例</span>
                <span class="lb-label-aux">0–100 · %</span>
              </div>
              <p class="mb-1 text-xs text-slate-500">锁仓额中可按该比例计入与借出币种相同的借贷资金池（前台借贷详情可借余额按此推算）。</p>
              <a-input
                v-model:value.number="productForm.lendableRatio"
                type="number"
                min="0"
                max="100"
                step="0.1"
                class="lb-ctrl w-32 tabular-nums"
              />
            </div>
          </div>

          <div class="lb-stack max-w-lg">
            <div class="lb-label-row">
              <span class="lb-label">产品状态</span>
            </div>
            <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="productForm.status" class="lb-ctrl lb-select">
              <a-select-option :value="PRODUCT_STATUS.ENABLED">上架中</a-select-option>
              <a-select-option :value="PRODUCT_STATUS.DISABLED">已下架</a-select-option>
              <a-select-option :value="PRODUCT_STATUS.SOLD_OUT">已售罄</a-select-option>
            </a-select>
          </div>
        </div>

        </template>
<template #footer><template v-if="showProductModal"><footer class="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
          <a-button type="text" html-type="button" class="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="showProductModal = false">取消</a-button>
          <a-button type="text" html-type="button" class="h-10 rounded-md bg-blue-600 px-5 text-sm font-medium text-white shadow-sm hover:bg-blue-700" @click="saveProduct">保存</a-button>
        </footer></template></template>
</a-modal>
    </Teleport>

    <!-- 调整申请弹窗 -->
    <Teleport to="body">
      <a-modal :wrap-props="{ 'aria-modal': true }" transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :open="Boolean(showAdjustmentModal)" :mask-closable="false" :closable="false" :keyboard="false" :width="448"  :destroy-on-close="true" wrap-class-name="admin-trading-modal" :body-style="{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 180px)' }" @cancel="showAdjustmentModal = false">
<template #title><template v-if="showAdjustmentModal"><header class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 class="text-xl font-semibold text-slate-900">新建调整</h2>
          <a-button aria-label="关闭" type="text" html-type="button" class="text-2xl text-slate-400" @click="showAdjustmentModal = false">×</a-button>
        </header></template></template>
<template v-if="showAdjustmentModal">

        <div class="space-y-4 px-5 py-4">
          <label class="space-y-1">
            <span class="text-sm font-medium">订单ID</span>
            <a-input v-model:value="adjustmentForm.orderId" type="text" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>

          <label class="space-y-1">
            <span class="text-sm font-medium">调整类型</span>
            <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="adjustmentForm.type" class="w-full">
              <a-select-option :value="ADJUSTMENT_TYPE.ADD_INTEREST">补息</a-select-option>
              <a-select-option :value="ADJUSTMENT_TYPE.DEDUCT_INTEREST">扣息</a-select-option>
              <a-select-option :value="ADJUSTMENT_TYPE.EXTEND">展期</a-select-option>
              <a-select-option :value="ADJUSTMENT_TYPE.EARLY_REDEEM">提前赎回</a-select-option>
            </a-select>
          </label>

          <label class="space-y-1">
            <span class="text-sm font-medium">金额</span>
            <a-input v-model:value.number="adjustmentForm.amount" type="number" step="0.0001" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>

          <label class="space-y-1">
            <span class="text-sm font-medium">原因说明</span>
            <a-textarea v-model:value="adjustmentForm.reason" rows="3" class="w-full rounded-lg border border-slate-300 px-3 py-2"></a-textarea>
          </label>
        </div>

        </template>
<template #footer><template v-if="showAdjustmentModal"><footer class="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
          <a-button type="text" html-type="button" class="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="showAdjustmentModal = false">取消</a-button>
          <a-button type="text" html-type="button" class="h-10 rounded-md bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700" @click="saveAdjustment">提交</a-button>
        </footer></template></template>
</a-modal>
    </Teleport>

    <!-- MFA 验证弹窗 -->
    <MfaVerificationModal
      v-model:open="showMfaModal"
      :loading="mfaLoading"
      title="安全验证"
      description="编辑产品比重配置属于敏感操作，请输入 MFA 验证码"
      @verify="handleMfaVerify"
      @cancel="pendingSaveData = null"
    />
  </section>
</template>

<style scoped>
.lb-stack {
  @apply flex flex-col gap-1.5;
}
.lb-label-row {
  @apply flex min-h-[1.125rem] items-baseline justify-between gap-2;
}
.lb-label {
  @apply text-sm font-medium tracking-tight text-slate-700;
}
.lb-label-aux {
  @apply shrink-0 text-right text-xs font-normal tabular-nums text-slate-400;
}
.lb-ctrl {
  @apply h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm leading-5 text-slate-900 shadow-sm;
  @apply transition-[border-color,box-shadow] placeholder:text-slate-400;
  @apply focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20;
}
.lb-select {
  @apply cursor-pointer bg-white pr-9;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-size: 1.25rem 1.25rem;
  background-repeat: no-repeat;
  -webkit-appearance: none;
  appearance: none;
}
.lb-cell-in {
  @apply h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2.5 text-sm tabular-nums text-slate-900 shadow-sm;
  @apply focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30;
}
</style>
