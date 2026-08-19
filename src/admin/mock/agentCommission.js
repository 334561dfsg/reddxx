import {
  DEFAULT_AGENT_GLOBAL_COMMISSION,
  AGENT_PRODUCT_LINE_DEFS,
  normalizeAgentLineRate,
  normalizeAgentSettlementCycle,
  normalizeAgentSettlementWeekday,
  normalizeAgentSettlementMonthDay,
  normalizeAgentSettlementTimeLocal,
  normalizeAgentCommissionCreditTo
} from '../constants/agentCommission.js'

const GLOBAL_BOOL_KEYS = ['agentCommissionAutoExecute', 'agentCommissionDepositFirstOnly']

const AGENT_NOTIFY_KEYS = [
  'agentNotifyAfterSettlementEmail',
  'agentNotifyAfterSettlementSite',
  'agentNotifyAfterSettlementSms'
]

function rateKeys() {
  return AGENT_PRODUCT_LINE_DEFS.map((l) => l.rateKey)
}

function enabledKeys() {
  return AGENT_PRODUCT_LINE_DEFS.map((l) => l.enabledKey)
}

/** 代理记佣全局配置归一化（总开关 + 各线一级比例） */
export function normalizeAgentGlobalCommission(raw) {
  const base = { ...DEFAULT_AGENT_GLOBAL_COMMISSION }
  const o = { ...base, ...(raw && typeof raw === 'object' ? raw : {}) }
  for (const k of GLOBAL_BOOL_KEYS) {
    if (typeof o[k] !== 'boolean') o[k] = base[k]
  }
  for (const k of enabledKeys()) {
    if (typeof o[k] !== 'boolean') o[k] = base[k]
  }
  for (const k of rateKeys()) {
    o[k] = normalizeAgentLineRate(o[k])
  }
  o.agentSettlementCycle = normalizeAgentSettlementCycle(o.agentSettlementCycle)
  o.agentSettlementWeekday = normalizeAgentSettlementWeekday(o.agentSettlementWeekday)
  o.agentSettlementMonthDay = normalizeAgentSettlementMonthDay(o.agentSettlementMonthDay)
  o.agentSettlementTimeLocal = normalizeAgentSettlementTimeLocal(o.agentSettlementTimeLocal)
  o.agentCommissionCreditTo = normalizeAgentCommissionCreditTo(o.agentCommissionCreditTo)
  for (const k of AGENT_NOTIFY_KEYS) {
    o[k] = o[k] === true
  }
  return o
}

/** 单个代理上的产品线记佣（与裂变字段完全独立） */
export function normalizeAgentProductCommission(raw) {
  const g = getDefaultAgentProductCommissionBaseline()
  const o = { ...g, ...(raw && typeof raw === 'object' ? raw : {}) }
  for (const k of enabledKeys()) {
    if (typeof o[k] !== 'boolean') o[k] = g[k]
  }
  for (const k of rateKeys()) {
    o[k] = normalizeAgentLineRate(o[k])
  }
  return o
}

let mockAgentGlobalCommission = normalizeAgentGlobalCommission({ ...DEFAULT_AGENT_GLOBAL_COMMISSION })

export function getDefaultAgentProductCommissionBaseline() {
  return sliceProductFromGlobal(mockAgentGlobalCommission)
}

function sliceProductFromGlobal(global) {
  const o = {}
  for (const line of AGENT_PRODUCT_LINE_DEFS) {
    o[line.enabledKey] = global[line.enabledKey]
    o[line.rateKey] = global[line.rateKey]
  }
  return o
}

export const mockAgentCommissionConfig = mockAgentGlobalCommission

export const agentCommissionApi = {
  getAgentCommissionConfig: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const data = normalizeAgentGlobalCommission(mockAgentGlobalCommission)
        Object.assign(mockAgentGlobalCommission, data)
        resolve({ success: true, data: { ...data } })
      }, 300)
    })
  },

  updateAgentCommissionConfig: (config) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const next = normalizeAgentGlobalCommission(config)
        mockAgentGlobalCommission = next
        resolve({ success: true, message: '代理记佣全局配置已保存' })
      }, 500)
    })
  }
}
