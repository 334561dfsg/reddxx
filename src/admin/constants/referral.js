// 分销类型
export const REFERRAL_TYPE = {
  DEPOSIT: 'deposit',           // 充值
  PERIODIC: 'periodic',         // 周期产品
  LENDING: 'lending',           // 理财
  AI_QUANT: 'ai_quant',         // AI量化
  PORTFOLIO: 'portfolio'        // 投资组合
}

export const REFERRAL_TYPE_OPTIONS = [
  { value: REFERRAL_TYPE.DEPOSIT, label: '充值分销' },
  { value: REFERRAL_TYPE.PERIODIC, label: '周期产品' },
  { value: REFERRAL_TYPE.LENDING, label: '理财产品' },
  { value: REFERRAL_TYPE.AI_QUANT, label: 'AI量化' },
  { value: REFERRAL_TYPE.PORTFOLIO, label: '投资组合' }
]

// 分佣状态
export const COMMISSION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed'
}

export const COMMISSION_STATUS_OPTIONS = [
  { value: COMMISSION_STATUS.PENDING, label: '待发放', color: 'yellow' },
  { value: COMMISSION_STATUS.COMPLETED, label: '已入账', color: 'green' }
]

// 分销层级（裂变固定为三级：直属、二级、三级上级）
export const REFERRAL_MAX_LEVELS = 3

export const REFERRAL_LEVEL = {
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3
}

// 分佣记录表格列（裂变邀请链；字段名 agent* 为历史兼容，语义为邀请链上级）
export const COMMISSION_TABLE_COLUMNS = [
  { key: 'id', label: '记录ID', width: 120 },
  { key: 'agentUid', label: '裂变上级 UID', width: 120 },
  { key: 'agentUsername', label: '裂变上级用户名', width: 150 },
  { key: 'referralUid', label: '被邀请人UID', width: 120 },
  { key: 'referralUsername', label: '被邀请人', width: 150 },
  { key: 'type', label: '分销类型', width: 120 },
  { key: 'level', label: '分销层级', width: 100 },
  { key: 'amount', label: '订单金额（USDT）', width: 150 },
  { key: 'commissionRate', label: '佣金比例', width: 100 },
  { key: 'commission', label: '佣金（USDT）', width: 130 },
  { key: 'status', label: '状态', width: 100 },
  { key: 'createdAt', label: '生成时间', width: 180 },
  { key: 'completedAt', label: '完成时间', width: 180 }
]

// 分销统计数据类型
export const STATS_PERIOD = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
  ALL: 'all'
}

export const STATS_PERIOD_OPTIONS = [
  { value: STATS_PERIOD.TODAY, label: '今日' },
  { value: STATS_PERIOD.YESTERDAY, label: '昨日' },
  { value: STATS_PERIOD.WEEK, label: '本周' },
  { value: STATS_PERIOD.MONTH, label: '本月' },
  { value: STATS_PERIOD.YEAR, label: '本年' },
  { value: STATS_PERIOD.ALL, label: '全部' }
]

// 分销配置字段
export const REFERRAL_CONFIG_FIELDS = {
  AUTO_EXECUTE: 'autoExecute',
  DEPOSIT_FIRST_ONLY: 'depositFirstOnly',
  REFERRAL_COMMISSION_CREDIT_TO: 'referralCommissionCreditTo',
  REFERRAL_SETTLEMENT_CYCLE: 'referralSettlementCycle',
  REFERRAL_SETTLEMENT_TIME_LOCAL: 'referralSettlementTimeLocal',
  REFERRAL_NOTIFY_AFTER_SETTLEMENT_EMAIL: 'referralNotifyAfterSettlementEmail',
  REFERRAL_NOTIFY_AFTER_SETTLEMENT_SITE: 'referralNotifyAfterSettlementSite',
  REFERRAL_NOTIFY_AFTER_SETTLEMENT_SMS: 'referralNotifyAfterSettlementSms',
  DEPOSIT_COMMISSION_RATES: 'depositCommissionRates',
  /** 交割合约（旧版 periodicCommissionRates 会迁移至此） */
  DELIVERY_COMMISSION_RATES: 'deliveryCommissionRates',
  PERPETUAL_COMMISSION_RATES: 'perpetualCommissionRates',
  SPOT_COMMISSION_RATES: 'spotCommissionRates',
  LENDING_COMMISSION_RATES: 'lendingCommissionRates',
  BORROWING_COMMISSION_RATES: 'borrowingCommissionRates',
  AI_QUANT_COMMISSION_RATES: 'aiQuantCommissionRates',
  PORTFOLIO_COMMISSION_RATES: 'portfolioCommissionRates'
}

/**
 * 裂变佣金记入上级用户的余额类型（与站内钱包/账务模型对齐；入账路由由账务服务执行）
 */
export const REFERRAL_COMMISSION_CREDIT_TO = {
  SPOT_AVAILABLE: 'spot_available'
}

export const REFERRAL_COMMISSION_CREDIT_TO_OPTIONS = [
  {
    value: REFERRAL_COMMISSION_CREDIT_TO.SPOT_AVAILABLE,
    label: '币币账户',
    hint: '记入裂变上级用户币币账户余额。'
  }
]

/** 裂变佣金结算：仅支持按自然日日结（周/月为历史兼容，读入时一律收敛为日结） */
export const REFERRAL_SETTLEMENT_CYCLE = {
  CALENDAR_DAY: 'calendar_day'
}

const LEGACY_SETTLEMENT_CYCLE_TO_DAY = {
  calendar_week: REFERRAL_SETTLEMENT_CYCLE.CALENDAR_DAY,
  calendar_month: REFERRAL_SETTLEMENT_CYCLE.CALENDAR_DAY
}

export function normalizeReferralSettlementTimeLocal(raw) {
  const fallback = '02:00'
  const s = String(raw ?? '').trim()
  const m = /^(\d{1,2}):(\d{2})$/.exec(s)
  if (!m) return fallback
  let h = parseInt(m[1], 10)
  let min = parseInt(m[2], 10)
  if (!Number.isFinite(h) || !Number.isFinite(min)) return fallback
  h = Math.max(0, Math.min(23, h))
  min = Math.max(0, Math.min(59, min))
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export function getReferralSettlementCycleLabel(value) {
  const v = LEGACY_SETTLEMENT_CYCLE_TO_DAY[value] ?? value
  if (v === REFERRAL_SETTLEMENT_CYCLE.CALENDAR_DAY) return '每自然日'
  return String(value)
}

/** 每自然日 + 日结时刻（后台约定为平台默认时区，与账务任务一致） */
export function getReferralSettlementScheduleLine(cfg) {
  if (!cfg || typeof cfg !== 'object') return ''
  const time = normalizeReferralSettlementTimeLocal(cfg.referralSettlementTimeLocal)
  return `每自然日，每日 ${time} 执行日结（平台默认时区）`
}

export function getReferralSettlementNotifyLine(cfg) {
  if (!cfg || typeof cfg !== 'object') return ''
  const parts = []
  if (cfg.referralNotifyAfterSettlementEmail === true) parts.push('邮件')
  if (cfg.referralNotifyAfterSettlementSite === true) parts.push('站内信')
  if (cfg.referralNotifyAfterSettlementSms === true) parts.push('手机短信')
  if (parts.length === 0) return '结算完成后不向用户推送通知。'
  return `结算完成后向用户发送：${parts.join('、')}。`
}

/** 列表等紧凑展示 */
export function getReferralSettlementNotifyShort(cfg) {
  if (!cfg || typeof cfg !== 'object') return '推送：无'
  const parts = []
  if (cfg.referralNotifyAfterSettlementEmail === true) parts.push('邮件')
  if (cfg.referralNotifyAfterSettlementSite === true) parts.push('站内信')
  if (cfg.referralNotifyAfterSettlementSms === true) parts.push('短信')
  return parts.length ? `推送：${parts.join('、')}` : '推送：无'
}

// 默认「裂变邀请链」分销配置（含各产品线是否参与记佣；与代理等级配置无关）
export const DEFAULT_REFERRAL_CONFIG = {
  autoExecute: true,
  depositFirstOnly: false,
  referralCommissionCreditTo: REFERRAL_COMMISSION_CREDIT_TO.SPOT_AVAILABLE,
  referralSettlementCycle: REFERRAL_SETTLEMENT_CYCLE.CALENDAR_DAY,
  /** 自然日日结触发时刻，24 小时制 HH:mm，与平台默认时区一致 */
  referralSettlementTimeLocal: '02:00',
  referralNotifyAfterSettlementEmail: false,
  referralNotifyAfterSettlementSite: false,
  referralNotifyAfterSettlementSms: false,
  /** 是否对该产品线产生的订单/流水记佣 */
  commissionDepositEnabled: true,
  commissionPerpetualEnabled: false,
  commissionDeliveryEnabled: false,
  commissionSpotEnabled: false,
  commissionAiQuantEnabled: false,
  commissionPortfolioEnabled: false,
  commissionLendingEnabled: false,
  commissionBorrowingEnabled: false,
  /** 各线均为「一级,二级,三级」三个比例（0～1），不足补 0 */
  depositCommissionRates: '0.1,0.05,0.02',
  perpetualCommissionRates: '0,0,0',
  deliveryCommissionRates: '0,0,0',
  spotCommissionRates: '0,0,0',
  aiQuantCommissionRates: '0,0,0',
  portfolioCommissionRates: '0,0,0',
  lendingCommissionRates: '0,0,0',
  borrowingCommissionRates: '0,0,0'
}

/** 已下线的入账类型在展示时映射到仍在用的枚举，便于旧数据展示 */
const LEGACY_REFERRAL_CREDIT_TO = {
  commission_wallet: REFERRAL_COMMISSION_CREDIT_TO.SPOT_AVAILABLE,
  pending_ledger: REFERRAL_COMMISSION_CREDIT_TO.SPOT_AVAILABLE
}

export function getReferralCreditToLabel(value) {
  const key = LEGACY_REFERRAL_CREDIT_TO[value] ?? value
  return REFERRAL_COMMISSION_CREDIT_TO_OPTIONS.find((o) => o.value === key)?.label ?? String(value)
}
