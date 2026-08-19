import { REFERRAL_COMMISSION_CREDIT_TO } from './referral.js'

/**
 * 代理产品线记佣字段（与裂变多级无关：代理线仅一级比例）
 */
export const AGENT_PRODUCT_LINE_DEFS = [
  {
    key: 'deposit',
    enabledKey: 'agentDepositCommissionEnabled',
    rateKey: 'agentDepositCommissionRate',
    title: '充值',
    theme: 'blue',
    group: 'fund'
  },
  {
    key: 'perpetual',
    enabledKey: 'agentPerpetualCommissionEnabled',
    rateKey: 'agentPerpetualCommissionRate',
    title: '永续合约',
    theme: 'indigo',
    group: 'trade'
  },
  {
    key: 'delivery',
    enabledKey: 'agentDeliveryCommissionEnabled',
    rateKey: 'agentDeliveryCommissionRate',
    title: '交割合约',
    theme: 'violet',
    group: 'trade'
  },
  {
    key: 'spot',
    enabledKey: 'agentSpotCommissionEnabled',
    rateKey: 'agentSpotCommissionRate',
    title: '现货',
    theme: 'orange',
    group: 'trade'
  },
  {
    key: 'aiQuant',
    enabledKey: 'agentAiQuantCommissionEnabled',
    rateKey: 'agentAiQuantCommissionRate',
    title: 'AI 量化',
    theme: 'amber',
    group: 'fin'
  },
  {
    key: 'portfolio',
    enabledKey: 'agentPortfolioCommissionEnabled',
    rateKey: 'agentPortfolioCommissionRate',
    title: '投资组合',
    theme: 'cyan',
    group: 'fin'
  },
  {
    key: 'lending',
    enabledKey: 'agentLendingCommissionEnabled',
    rateKey: 'agentLendingCommissionRate',
    title: '理财产品',
    theme: 'emerald',
    group: 'fin'
  },
  {
    key: 'borrowing',
    enabledKey: 'agentBorrowingCommissionEnabled',
    rateKey: 'agentBorrowingCommissionRate',
    title: '借贷产品',
    theme: 'rose',
    group: 'fin'
  }
]

export const AGENT_PRODUCT_GROUPS = [
  { id: 'fund', name: '入金', blurb: '含链上与站内 USDT 充值', lineKeys: ['deposit'] },
  { id: 'trade', name: '交易', blurb: '合约与现货订单', lineKeys: ['perpetual', 'delivery', 'spot'] },
  { id: 'fin', name: '产品与策略', blurb: '量化、投资组合、理财、借贷', lineKeys: ['aiQuant', 'portfolio', 'lending', 'borrowing'] }
]

/**
 * 代理记佣全局默认（一级比例；与裂变 DEFAULT_REFERRAL_CONFIG 独立）
 * 比例存为字符串，与表单/JSON 一致，归一化见 normalizeAgentLineRate
 */
/** 代理账期佣金结算周期（与裂变「按自然日日结」独立） */
export const AGENT_SETTLEMENT_CYCLE = {
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly'
}

export const AGENT_SETTLEMENT_CYCLE_OPTIONS = [
  { value: AGENT_SETTLEMENT_CYCLE.WEEKLY, label: '单周', desc: '每周固定星期结算一次' },
  { value: AGENT_SETTLEMENT_CYCLE.BIWEEKLY, label: '双周', desc: '每两周固定星期结算一次' },
  { value: AGENT_SETTLEMENT_CYCLE.MONTHLY, label: '月度', desc: '每自然月固定日期结算一次' }
]

/** 1 = 周一 … 7 = 周日（与账务周计划常用约定一致） */
export const AGENT_SETTLEMENT_WEEKDAY_OPTIONS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 7, label: '周日' }
]

const VALID_AGENT_COMMISSION_CREDIT_TO = new Set(Object.values(REFERRAL_COMMISSION_CREDIT_TO))

export function normalizeAgentSettlementCycle(raw) {
  const s = String(raw ?? '').trim()
  if (
    s === AGENT_SETTLEMENT_CYCLE.WEEKLY ||
    s === AGENT_SETTLEMENT_CYCLE.BIWEEKLY ||
    s === AGENT_SETTLEMENT_CYCLE.MONTHLY
  ) {
    return s
  }
  return AGENT_SETTLEMENT_CYCLE.MONTHLY
}

export function normalizeAgentSettlementWeekday(raw) {
  const n = parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(n) || n < 1 || n > 7) return 5
  return n
}

export function normalizeAgentSettlementMonthDay(raw) {
  const n = parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(n) || n < 1 || n > 31) return 5
  return n
}

export function normalizeAgentSettlementTimeLocal(raw) {
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

export function normalizeAgentCommissionCreditTo(raw) {
  const s = String(raw ?? '').trim()
  if (VALID_AGENT_COMMISSION_CREDIT_TO.has(s)) return s
  return REFERRAL_COMMISSION_CREDIT_TO.SPOT_AVAILABLE
}

function weekdayLabel(n) {
  return AGENT_SETTLEMENT_WEEKDAY_OPTIONS.find((o) => o.value === n)?.label ?? '周五'
}

/** 与后台表单一致的调度说明（平台默认时区） */
export function getAgentSettlementScheduleSummary(cfg) {
  if (!cfg || typeof cfg !== 'object') return ''
  const cycle = normalizeAgentSettlementCycle(cfg.agentSettlementCycle)
  const time = normalizeAgentSettlementTimeLocal(cfg.agentSettlementTimeLocal)
  const wd = weekdayLabel(normalizeAgentSettlementWeekday(cfg.agentSettlementWeekday))
  const md = normalizeAgentSettlementMonthDay(cfg.agentSettlementMonthDay)
  if (cycle === AGENT_SETTLEMENT_CYCLE.MONTHLY) {
    return `每自然月 ${md} 日 ${time} 触发上一完整月账期的汇总与结算（平台默认时区）。`
  }
  if (cycle === AGENT_SETTLEMENT_CYCLE.BIWEEKLY) {
    return `每双周，于「${wd}」${time} 触发账期汇总与结算（与账务双周历对齐；平台默认时区）。`
  }
  return `每周「${wd}」${time} 触发上一完整自然周账期的汇总与结算（平台默认时区）。`
}

export function getAgentSettlementNotifyLine(cfg) {
  if (!cfg || typeof cfg !== 'object') return ''
  const parts = []
  if (cfg.agentNotifyAfterSettlementEmail === true) parts.push('邮件')
  if (cfg.agentNotifyAfterSettlementSite === true) parts.push('站内信')
  if (cfg.agentNotifyAfterSettlementSms === true) parts.push('手机短信')
  if (parts.length === 0) return '账期结算完成后不向代理推送通知。'
  return `账期结算完成后向代理发送：${parts.join('、')}。`
}

export const DEFAULT_AGENT_GLOBAL_COMMISSION = {
  agentCommissionAutoExecute: true,
  agentCommissionDepositFirstOnly: false,

  /** 代理账期结算：周期、星期/日期、触发时刻（与裂变日结字段独立） */
  agentSettlementCycle: AGENT_SETTLEMENT_CYCLE.MONTHLY,
  agentSettlementWeekday: 5,
  agentSettlementMonthDay: 5,
  agentSettlementTimeLocal: '02:00',
  agentCommissionCreditTo: REFERRAL_COMMISSION_CREDIT_TO.SPOT_AVAILABLE,
  agentNotifyAfterSettlementEmail: false,
  agentNotifyAfterSettlementSite: true,
  agentNotifyAfterSettlementSms: false,

  agentDepositCommissionEnabled: true,
  agentDepositCommissionRate: '0.08',

  agentPerpetualCommissionEnabled: false,
  agentPerpetualCommissionRate: '0',

  agentDeliveryCommissionEnabled: false,
  agentDeliveryCommissionRate: '0',

  agentSpotCommissionEnabled: false,
  agentSpotCommissionRate: '0',

  agentAiQuantCommissionEnabled: false,
  agentAiQuantCommissionRate: '0',

  agentPortfolioCommissionEnabled: false,
  agentPortfolioCommissionRate: '0',

  agentLendingCommissionEnabled: false,
  agentLendingCommissionRate: '0',

  agentBorrowingCommissionEnabled: false,
  agentBorrowingCommissionRate: '0'
}

/** 单级比例 0～1；若历史为逗号串则取第一段 */
export function normalizeAgentLineRate(val) {
  const s = String(val ?? '').trim()
  const first = (s.split(',')[0] ?? '').trim()
  const n = parseFloat(first)
  if (!Number.isFinite(n) || Number.isNaN(n)) return '0'
  const c = Math.max(0, Math.min(1, n))
  return String(c)
}

/** 仅从全局配置对象中取出各产品线开关与一级比例 */
export function sliceAgentProductCommissionFromGlobal(global = DEFAULT_AGENT_GLOBAL_COMMISSION) {
  const o = {}
  for (const line of AGENT_PRODUCT_LINE_DEFS) {
    o[line.enabledKey] = global[line.enabledKey]
    o[line.rateKey] = global[line.rateKey]
  }
  return o
}
