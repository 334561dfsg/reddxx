// AI量化交易常量配置

// 产品状态
export const PRODUCT_STATUS = {
  ENABLED: 'enabled',
  DISABLED: 'disabled',
  SOLD_OUT: 'sold_out',
  MAINTENANCE: 'maintenance'
}

export const productStatusMeta = {
  [PRODUCT_STATUS.ENABLED]: { label: '已启用', color: 'text-green-600 bg-green-50' },
  [PRODUCT_STATUS.DISABLED]: { label: '已禁用', color: 'text-gray-600 bg-gray-50' },
  [PRODUCT_STATUS.SOLD_OUT]: { label: '已售罄', color: 'text-orange-600 bg-orange-50' },
  [PRODUCT_STATUS.MAINTENANCE]: { label: '维护中', color: 'text-blue-600 bg-blue-50' }
}

// 订单状态
export const ORDER_STATUS = {
  RUNNING: 'running',
  COMPLETED: 'completed',
  SETTLED: 'settled',
  EARLY_REDEEMED: 'early_redeemed',
  FORCE_REDEEMED: 'force_redeemed',
  LOCKED: 'locked',
  CANCELLED: 'cancelled'
}

export const orderStatusMeta = {
  [ORDER_STATUS.RUNNING]: { label: '运行中', class: 'bg-blue-100 text-blue-700' },
  [ORDER_STATUS.COMPLETED]: { label: '已完成', class: 'bg-emerald-100 text-emerald-700' },
  [ORDER_STATUS.SETTLED]: { label: '已结算', class: 'bg-slate-100 text-slate-600' },
  [ORDER_STATUS.EARLY_REDEEMED]: { label: '提前赎回', class: 'bg-purple-100 text-purple-700' },
  [ORDER_STATUS.FORCE_REDEEMED]: { label: '强制赎回', class: 'bg-purple-100 text-purple-700' },
  [ORDER_STATUS.LOCKED]: { label: '锁定中', class: 'bg-amber-100 text-amber-700' },
  [ORDER_STATUS.CANCELLED]: { label: '已取消', class: 'bg-rose-100 text-rose-700' }
}

// 收益调整类型
export const ADJUSTMENT_TYPE = {
  INCREASE: 'increase',
  DECREASE: 'decrease',
  BONUS: 'bonus',
  PENALTY: 'penalty',
  CORRECTION: 'correction'
}

export const adjustmentTypeMeta = {
  [ADJUSTMENT_TYPE.BONUS]: {
    label: '奖励补发',
    desc: '为用户补发额外奖励或活动收益',
    class: 'bg-green-100 text-green-700'
  },
  [ADJUSTMENT_TYPE.PENALTY]: {
    label: '违规惩罚',
    desc: '因违规行为扣减用户收益',
    class: 'bg-red-100 text-red-700'
  },
  [ADJUSTMENT_TYPE.CORRECTION]: {
    label: '数据修正',
    desc: '修正系统错误导致的收益偏差',
    class: 'bg-blue-100 text-blue-700'
  },
  [ADJUSTMENT_TYPE.INCREASE]: {
    label: '收益提升',
    desc: '临时或永久提高收益率',
    class: 'bg-purple-100 text-purple-700'
  },
  [ADJUSTMENT_TYPE.DECREASE]: {
    label: '收益降低',
    desc: '临时或永久降低收益率',
    class: 'bg-orange-100 text-orange-700'
  }
}

// 调整状态
export const ADJUSTMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXECUTED: 'executed'
}

export const adjustmentStatusMeta = {
  [ADJUSTMENT_STATUS.PENDING]: { label: '待处理', class: 'bg-amber-100 text-amber-700' },
  [ADJUSTMENT_STATUS.APPROVED]: { label: '已批准', class: 'bg-blue-100 text-blue-700' },
  [ADJUSTMENT_STATUS.REJECTED]: { label: '已拒绝', class: 'bg-slate-100 text-slate-600' },
  [ADJUSTMENT_STATUS.EXECUTED]: { label: '已执行', class: 'bg-emerald-100 text-emerald-700' }
}

// VIP等级
export const VIP_LEVEL = {
  VIP0: 0,
  VIP1: 1,
  VIP2: 2,
  VIP3: 3,
  VIP4: 4,
  VIP5: 5
}

export const vipLevelMeta = {
  [VIP_LEVEL.VIP0]: { label: 'VIP0', class: 'bg-slate-100 text-slate-600', requirement: '无要求' },
  [VIP_LEVEL.VIP1]: { label: 'VIP1', class: 'bg-blue-100 text-blue-700', requirement: '累计入金 1,000 USDT' },
  [VIP_LEVEL.VIP2]: { label: 'VIP2', class: 'bg-emerald-100 text-emerald-700', requirement: '累计入金 10,000 USDT' },
  [VIP_LEVEL.VIP3]: { label: 'VIP3', class: 'bg-purple-100 text-purple-700', requirement: '累计入金 50,000 USDT' },
  [VIP_LEVEL.VIP4]: { label: 'VIP4', class: 'bg-amber-100 text-amber-700', requirement: '累计入金 100,000 USDT' },
  [VIP_LEVEL.VIP5]: { label: 'VIP5', class: 'bg-rose-100 text-rose-700', requirement: '累计入金 500,000 USDT' }
}

// 支持的币种
export const SUPPORTED_CURRENCIES = ['USDT', 'BTC', 'ETH', 'BNB', 'SOL']

export const currencyMeta = {
  USDT: { symbol: '₮', name: 'Tether USD', decimals: 2 },
  BTC: { symbol: '₿', name: 'Bitcoin', decimals: 8 },
  ETH: { symbol: 'Ξ', name: 'Ethereum', decimals: 6 },
  BNB: { symbol: 'BNB', name: 'Binance Coin', decimals: 4 },
  SOL: { symbol: 'SOL', name: 'Solana', decimals: 4 }
}

export function sortAiQuantProducts(products = []) {
  const sortValue = (product) => {
    const raw = product?.sortOrder
    if (raw === '' || raw == null) return null
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
  }

  return [...products].sort((a, b) => {
    const aValue = sortValue(a)
    const bValue = sortValue(b)
    if (aValue == null && bValue == null) return 0
    if (aValue == null) return 1
    if (bValue == null) return -1
    return bValue - aValue
  })
}

// 运营模式
export const OPERATION_MODE = {
  REAL_HEDGE: 'real_hedge',
  INTERNAL: 'internal',
  HYBRID: 'hybrid'
}

export const operationModeMeta = {
  [OPERATION_MODE.REAL_HEDGE]: { label: '真实对冲', description: '通过API接入外部交易所，执行真实量化策略' },
  [OPERATION_MODE.INTERNAL]: { label: '内盘运作', description: '根据配置收益率在数据库跑数，无真实交易' },
  [OPERATION_MODE.HYBRID]: { label: '混合模式', description: '部分资金真实交易，部分内盘运作' }
}

// 限购类型
export const LIMIT_TYPE = {
  AMOUNT: 'amount',
  COUNT: 'count',
  BOTH: 'both'
}

// 派息周期
export const SETTLEMENT_PERIOD = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  CUSTOM: 'custom'
}

export const settlementPeriodMeta = {
  [SETTLEMENT_PERIOD.DAILY]: { label: '每日派息', days: 1 },
  [SETTLEMENT_PERIOD.WEEKLY]: { label: '每周派息', days: 7 },
  [SETTLEMENT_PERIOD.MONTHLY]: { label: '每月派息', days: 30 },
  [SETTLEMENT_PERIOD.CUSTOM]: { label: '自定义派息周期', days: null }
}

/** 产品编辑表单可选周期（列表/详情仍用 settlementPeriodMeta 全量展示与兼容） */
export const productFormSettlementPeriodMeta = {
  [SETTLEMENT_PERIOD.DAILY]: settlementPeriodMeta[SETTLEMENT_PERIOD.DAILY]
}

// 托管周期：控制用户订单运行/持有期限；0 表示无限期
export const AI_QUANT_DURATION_UNLIMITED = 0

export const aiQuantDurationOptions = [
  { label: '无限期', value: AI_QUANT_DURATION_UNLIMITED },
  { label: '7 天', value: 7 },
  { label: '14 天', value: 14 },
  { label: '30 天', value: 30 },
  { label: '60 天', value: 60 },
  { label: '90 天', value: 90 }
]

export function formatAiQuantDurationLabel(durationDays) {
  const n = Number(durationDays)
  if (!Number.isFinite(n) || n <= 0) return '无限期'
  return `${n} 天`
}

/**
 * 参考年化（%）：与日收益率配置（日化 %）一致，按简单计息日化×365，与后台订单页年化列口径相同。
 * @param {number|string|null|undefined} dailyYieldPct
 */
export function aiQuantAnnualFromDailyPct(dailyYieldPct) {
  const n = Number(dailyYieldPct)
  if (dailyYieldPct == null || dailyYieldPct === '' || Number.isNaN(n)) return 0
  return n * 365
}

// 公共过滤选项
export const COMMON_FILTER_ALL = 'all'
