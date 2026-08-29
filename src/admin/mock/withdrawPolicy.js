import { WITHDRAW_POLICY_DIMENSION } from '../constants/withdrawPolicy'
import { vipLevels } from './vip'
import { verificationConfig } from './verification'
import { VERIFICATION_LEVEL } from '../../constants/verification'

const nextId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

/** 与 VIP mock 对齐：每个 VIP 等级一条规则 */
export function buildVipRulesFromVipLevels() {
  return [...vipLevels]
    .sort((a, b) => a.level - b.level)
    .map((v) => ({
      id: `vr_vip_${v.id}`,
      vipLevel: v.level,
      minWithdrawUsdt: Math.max(5, 20 - v.level * 2),
      dailyCapUsdt: Math.min(500000, 5000 * (v.level + 1) * (v.level + 1))
    }))
}

const VERIFICATION_LEVEL_ORDER = [
  VERIFICATION_LEVEL.NONE,
  VERIFICATION_LEVEL.BASIC,
  VERIFICATION_LEVEL.ADVANCED
]

/** 按认证等级维度的出金规则初始值（仅等级名与 verificationConfig 对齐，金额在本页/本 mock 维护） */
const DEFAULT_VERIFICATION_WITHDRAW_BY_LEVEL = {
  [VERIFICATION_LEVEL.NONE]: { minWithdrawUsdt: 100, dailyCapUsdt: null },
  [VERIFICATION_LEVEL.BASIC]: { minWithdrawUsdt: 50, dailyCapUsdt: 10000 },
  [VERIFICATION_LEVEL.ADVANCED]: { minWithdrawUsdt: 10, dailyCapUsdt: null }
}

export function buildVerificationRulesFromVerificationConfig() {
  return VERIFICATION_LEVEL_ORDER.map((lvl) => {
    const d = DEFAULT_VERIFICATION_WITHDRAW_BY_LEVEL[lvl] ?? { minWithdrawUsdt: 10, dailyCapUsdt: 10000 }
    return {
      id: `vr_kyc_${lvl}`,
      verificationLevel: lvl,
      minWithdrawUsdt: d.minWithdrawUsdt,
      dailyCapUsdt: d.dailyCapUsdt
    }
  })
}

/**
 * 保存后若 VIP mock 增删等级，同步出金规则行（保留已有等级的编辑值）
 */
export function syncVipRulesFromVipLevels(policy) {
  const byLevel = new Map(policy.vipRules.map((r) => [r.vipLevel, { ...r }]))
  const next = []
  for (const v of [...vipLevels].sort((a, b) => a.level - b.level)) {
    const existing = byLevel.get(v.level)
    if (existing) {
      next.push({ ...existing, vipLevel: v.level, id: existing.id || `vr_vip_${v.id}` })
    } else {
      next.push({
        id: `vr_vip_${v.id}`,
        vipLevel: v.level,
        minWithdrawUsdt: 10,
        dailyCapUsdt: 10000
      })
    }
  }
  policy.vipRules = next
  return policy
}

/**
 * 与认证等级集合对齐（固定三档，保留已编辑数值；新增行用本文件默认出金参数）
 */
export function syncVerificationRulesFromVerificationConfig(policy) {
  const byLevel = new Map(policy.verificationRules.map((r) => [r.verificationLevel, { ...r }]))
  const next = []
  for (const lvl of VERIFICATION_LEVEL_ORDER) {
    const existing = byLevel.get(lvl)
    const d = DEFAULT_VERIFICATION_WITHDRAW_BY_LEVEL[lvl] ?? { minWithdrawUsdt: 10, dailyCapUsdt: 10000 }
    if (existing) {
      next.push({ ...existing, verificationLevel: lvl })
    } else {
      next.push({
        id: `vr_kyc_${lvl}`,
        verificationLevel: lvl,
        minWithdrawUsdt: d.minWithdrawUsdt,
        dailyCapUsdt: d.dailyCapUsdt
      })
    }
  }
  policy.verificationRules = next
  return policy
}

/** 各维度是否参与「优先级」判断（关闭则跳过该维度） */
export const defaultDimensionEnabled = () => ({
  [WITHDRAW_POLICY_DIMENSION.VIP]: true,
  [WITHDRAW_POLICY_DIMENSION.AGENT]: true,
  [WITHDRAW_POLICY_DIMENSION.VERIFICATION]: true,
  [WITHDRAW_POLICY_DIMENSION.CREDIT_SCORE]: true
})

function ensureDimensionEnabled(policy) {
  policy.dimensionEnabled = {
    ...defaultDimensionEnabled(),
    ...(policy.dimensionEnabled || {})
  }
}

function ensureAgentRule(policy) {
  policy.agentRule = {
    minWithdrawUsdt: 10,
    dailyCapUsdt: 200000,
    ...(policy.agentRule || {})
  }
}

/** 可编辑的出金策略（U 本位）；多维度仅采用「按优先级首条命中」 */
export let withdrawPolicyState = {
  dimensionPriority: [
    WITHDRAW_POLICY_DIMENSION.VIP,
    WITHDRAW_POLICY_DIMENSION.AGENT,
    WITHDRAW_POLICY_DIMENSION.VERIFICATION,
    WITHDRAW_POLICY_DIMENSION.CREDIT_SCORE
  ],
  dimensionEnabled: defaultDimensionEnabled(),
  defaultPolicy: {
    minWithdrawUsdt: 10,
    dailyCapUsdt: 10000
  },
  vipRules: buildVipRulesFromVipLevels(),
  agentRule: {
    minWithdrawUsdt: 10,
    dailyCapUsdt: 200000
  },
  verificationRules: buildVerificationRulesFromVerificationConfig(),
  creditScoreRules: [
    { id: 'vr_cs_1', minScore: 0, maxScore: 59, minWithdrawUsdt: 50, dailyCapUsdt: 5000 },
    { id: 'vr_cs_2', minScore: 60, maxScore: 69, minWithdrawUsdt: 30, dailyCapUsdt: 15000 },
    { id: 'vr_cs_3', minScore: 70, maxScore: 79, minWithdrawUsdt: 15, dailyCapUsdt: 50000 },
    { id: 'vr_cs_4', minScore: 80, maxScore: 100, minWithdrawUsdt: 10, dailyCapUsdt: 200000 }
  ]
}

export function getWithdrawPolicy() {
  const p = JSON.parse(JSON.stringify(withdrawPolicyState))
  syncVipRulesFromVipLevels(p)
  syncVerificationRulesFromVerificationConfig(p)
  ensureDimensionEnabled(p)
  ensureAgentRule(p)
  if (p.mergeMode !== undefined) delete p.mergeMode
  if (p.enabled !== undefined) delete p.enabled
  return p
}

export function saveWithdrawPolicy(next) {
  const raw = JSON.parse(JSON.stringify(next))
  if (raw.mergeMode !== undefined) delete raw.mergeMode
  if (raw.enabled !== undefined) delete raw.enabled
  ensureDimensionEnabled(raw)
  ensureAgentRule(raw)
  withdrawPolicyState = raw
  return getWithdrawPolicy()
}

export function createEmptyVipRule(vipLevel = 0) {
  return {
    id: nextId('vip'),
    vipLevel,
    minWithdrawUsdt: 10,
    dailyCapUsdt: 10000
  }
}

export function createEmptyCreditScoreRule() {
  return {
    id: nextId('cs'),
    minScore: 0,
    maxScore: 100,
    minWithdrawUsdt: 10,
    dailyCapUsdt: 10000
  }
}

function effectiveDailyCap(value) {
  if (value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

function num(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function formatCapText(v) {
  if (v === null || v === undefined) return '无限制'
  const n = Number(v)
  if (Number.isFinite(n) && n === 0) return '无限制'
  return Number.isFinite(n) ? `${n} USDT` : '—'
}

function vipLevelLabel(level) {
  const v = vipLevels.find((x) => x.level === level)
  return v ? `${v.level} · ${v.displayName}` : `等级 ${level}`
}

function verificationLevelLabel(lvl) {
  return verificationConfig[lvl]?.levelName ?? String(lvl)
}

/**
 * 根据用户画像与「当前 policy 对象」试算有效出金限额。
 * 多维度：对每个已启用且命中的维度各取一条规则后，按最严格模式合并——单笔最低取各维度最大值，每日上限取各维度中的最小值（无限制不参与「取最小」比较，若全部无限制则为无限制）。
 */
export function computeEffectiveWithdrawPolicy(user, policy) {
  if (!policy || !policy.defaultPolicy) {
    return {
      minWithdrawUsdt: 0,
      dailyCapUsdt: null,
      mode: 'invalid',
      explain: '配置数据不完整。'
    }
  }

  const vipLevel = num(user?.vipLevel, 0)
  const isAgent = user?.isAgent === true
  const verificationLevel = user?.verificationLevel ?? VERIFICATION_LEVEL.NONE
  const creditScore = num(user?.creditScore, 0)

  const def = policy.defaultPolicy
  const defMin = num(def.minWithdrawUsdt, 0)
  const defDaily = effectiveDailyCap(def.dailyCapUsdt)

  const vipRules = policy.vipRules ?? []
  const agentRule = policy.agentRule ?? null
  const verificationRules = policy.verificationRules ?? []
  const creditScoreRules = policy.creditScoreRules ?? []

  const findVip = () => {
    const row = vipRules.find((r) => num(r.vipLevel, -1) === vipLevel) ?? null
    if (!row) return null
    return {
      ...row,
      minWithdrawUsdt: num(row.minWithdrawUsdt, 0),
      dailyCapUsdt: effectiveDailyCap(row.dailyCapUsdt)
    }
  }

  const findVerification = () => {
    const row = verificationRules.find((r) => r.verificationLevel === verificationLevel) ?? null
    if (!row) return null
    return {
      ...row,
      minWithdrawUsdt: num(row.minWithdrawUsdt, 0),
      dailyCapUsdt: effectiveDailyCap(row.dailyCapUsdt)
    }
  }

  const findAgent = () => {
    if (!isAgent || !agentRule) return null
    return {
      ...agentRule,
      minWithdrawUsdt: num(agentRule.minWithdrawUsdt, 0),
      dailyCapUsdt: effectiveDailyCap(agentRule.dailyCapUsdt)
    }
  }

  const findCredit = () => {
    const sorted = [...creditScoreRules]
      .map((r) => ({
        ...r,
        minScore: num(r.minScore, 0),
        maxScore: num(r.maxScore, 100),
        minWithdrawUsdt: num(r.minWithdrawUsdt, 0),
        dailyCapUsdt: effectiveDailyCap(r.dailyCapUsdt)
      }))
      .sort((a, b) => a.minScore - b.minScore)
    return sorted.find((r) => creditScore >= r.minScore && creditScore <= r.maxScore) ?? null
  }

  const pickers = {
    [WITHDRAW_POLICY_DIMENSION.VIP]: findVip,
    [WITHDRAW_POLICY_DIMENSION.AGENT]: findAgent,
    [WITHDRAW_POLICY_DIMENSION.VERIFICATION]: findVerification,
    [WITHDRAW_POLICY_DIMENSION.CREDIT_SCORE]: findCredit
  }

  const enabled = policy.dimensionEnabled || defaultDimensionEnabled()
  const isOn = (dim) => enabled[dim] !== false

  const anyEnabled = (policy.dimensionPriority ?? []).some((dim) => isOn(dim))
  if (!anyEnabled) {
    return {
      minWithdrawUsdt: defMin,
      dailyCapUsdt: effectiveDailyCap(defDaily),
      mode: 'default',
      explain: `未启用任何维度判断，使用左侧「全局默认」：单笔最低 ${defMin} USDT，每日上限 ${formatCapText(defDaily)}。`
    }
  }

  const dimLabel = (dim) =>
    ({ vip: 'VIP', agent: '代理', verification: '认证', credit_score: '信用分' }[dim] || dim)

  const candidates = []
  for (const dim of policy.dimensionPriority ?? []) {
    if (!isOn(dim)) continue
    const rule = pickers[dim]?.() ?? null
    if (!rule) continue
    const minW = num(rule.minWithdrawUsdt, 0)
    const daily = effectiveDailyCap(rule.dailyCapUsdt)
    let detail = ''
    if (dim === WITHDRAW_POLICY_DIMENSION.VIP) {
      detail = `${vipLevelLabel(vipLevel)} → 单笔最低 ${minW} / 每日 ${formatCapText(daily)}`
    } else if (dim === WITHDRAW_POLICY_DIMENSION.AGENT) {
      detail = `代理身份 → 单笔最低 ${minW} / 每日 ${formatCapText(daily)}`
    } else if (dim === WITHDRAW_POLICY_DIMENSION.VERIFICATION) {
      detail = `${verificationLevelLabel(verificationLevel)} → 单笔最低 ${minW} / 每日 ${formatCapText(daily)}`
    } else {
      detail = `信用分 ${creditScore}，区间 [${rule.minScore}, ${rule.maxScore}] → 单笔最低 ${minW} / 每日 ${formatCapText(daily)}`
    }
    candidates.push({ dim, rule, minW, daily, detail })
  }

  if (candidates.length === 0) {
    return {
      minWithdrawUsdt: defMin,
      dailyCapUsdt: effectiveDailyCap(defDaily),
      mode: 'default',
      explain: `已启用维度均未匹配到规则（请检查试算用户的 VIP / 代理身份 / 认证 / 信用分是否在表格中有对应行或区间），使用「全局默认」：单笔最低 ${defMin} USDT，每日上限 ${formatCapText(defDaily)}。`
    }
  }

  const strictMin = Math.max(...candidates.map((c) => c.minW))
  const finiteDailies = candidates.map((c) => c.daily).filter((d) => d !== null && d !== undefined)
  const strictDaily = finiteDailies.length === 0 ? null : Math.min(...finiteDailies)

  const parts = candidates.map((c) => `${dimLabel(c.dim)}：${c.detail}`)
  const explain = `最严格模式：在已启用且命中的各维度上分别取值后合并——单笔最低取各维度要求中的最大值 ${strictMin} USDT；每日上限取各维度上限中的最小值${strictDaily === null ? '（均为无限制则无上限）' : `（${strictDaily} USDT）`}。分项：${parts.join('；')}。`

  return {
    minWithdrawUsdt: strictMin,
    dailyCapUsdt: strictDaily,
    mode: 'strictest',
    explain
  }
}
