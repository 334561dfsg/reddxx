import { usersList } from '../mock/user.js'
import { appendUserAuditLog } from './userAuditLogRepository.js'

const adminFrozenByUser = new Map()
const withdrawFlowLimits = new Map()
const auditLog = []

const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value))
const userIdOf = (user) => String(user?.id ?? user?.userId ?? '')
const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100

const requireUser = (userId) => {
  const id = String(userId ?? '')
  const user = usersList.find((row) => userIdOf(row) === id)
  if (!user) throw new Error('用户不存在')
  return user
}

const normalizeOptionalText = (value, label = '操作原因') => {
  const text = String(value ?? '').trim()
  if (text.length > 200) throw new Error(`${label}不能超过 200 字`)
  return text
}

const parseMoney = (value, label) => {
  const raw = String(value ?? '').trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw new Error(`${label}最多保留两位小数`)
  const amount = Number(raw)
  if (!Number.isFinite(amount) || amount <= 0) throw new Error(`${label}必须大于 0`)
  return roundMoney(amount)
}

const ACCOUNT_LABELS = Object.freeze({
  market: '市币账户',
  wealth: '理财账户',
  trading: '交易合约账户',
  perp: '永续合约账户'
})

const COIN_LABELS = Object.freeze({
  USDT: 'USDT',
  USDC: 'USDC',
  ETH: 'ETH'
})

const FLOW_SCOPE_LABELS = Object.freeze({
  all: '全部交易',
  spot: '现货交易',
  contract: '合约交易',
  finance: '理财收益'
})

const requireChoice = (value, options, label) => {
  const key = String(value ?? '').trim()
  if (!key) throw new Error(`${label}必填`)
  if (!Object.hasOwn(options, key)) throw new Error(`${label}无效`)
  return key
}

const toNow = (value) => {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) throw new Error('当前时间无效')
  return date
}

const nextIds = () => {
  const sequence = auditLog.length + 1
  const stamp = Date.now()
  return {
    auditId: `funds-${stamp}-${sequence}`,
    transactionId: `UF-${stamp}-${sequence}`
  }
}

const snapshotFor = (user) => {
  const userId = userIdOf(user)
  const balance = roundMoney(user.balance || 0)
  const frozenBalance = roundMoney(user.frozenBalance || 0)
  return {
    userId,
    user: clone(user),
    balance,
    frozenBalance,
    adminFrozenAmount: roundMoney(adminFrozenByUser.get(userId) || 0),
    totalBalance: roundMoney(balance + frozenBalance)
  }
}

const appendAudit = ({ type, userId, before, after, amount = null, reason, operatorId, transactionId, accountKey = '', coinKey = '' }) => {
  const ids = transactionId ? { transactionId, auditId: `funds-${Date.now()}-${auditLog.length + 1}` } : nextIds()
  const row = {
    id: ids.auditId,
    transactionId: ids.transactionId,
    type,
    userId: String(userId),
    before: clone(before),
    after: clone(after),
    amount: amount === null ? null : roundMoney(amount),
    accountKey,
    accountLabel: accountKey ? ACCOUNT_LABELS[accountKey] : '',
    coinKey,
    coinLabel: coinKey ? COIN_LABELS[coinKey] : '',
    reason,
    operatorId: String(operatorId || 'admin_current'),
    createdAt: new Date().toISOString()
  }
  auditLog.push(row)
  const user = usersList.find((item) => userIdOf(item) === String(userId))
  const actionByType = {
    freeze: 'funds.freeze',
    unfreeze: 'funds.unfreeze',
    deduct: 'funds.deduct',
    'flow-limit-set': 'funds.flow-limit.set',
    'flow-limit-remove': 'funds.flow-limit.remove'
  }
  appendUserAuditLog({
    targetUser: { uid: String(userId), name: user?.username, email: user?.email, phone: user?.phone },
    source: 'admin',
    operator: { id: row.operatorId, name: row.operatorId === 'admin_current' ? '当前管理员' : row.operatorId },
    category: 'funds',
    action: actionByType[type],
    result: 'success',
    reason,
    before,
    after,
    related: {
      businessId: ids.transactionId,
      auditReceiptId: ids.auditId
    }
  })
  return ids.transactionId
}

export const getFundsSnapshot = (userId) => snapshotFor(requireUser(userId))

export const freezeAllAvailable = ({ userId, accountKey, coinKey, amount, reason, operatorId }) => {
  const user = requireUser(userId)
  const cleanAccountKey = requireChoice(accountKey, ACCOUNT_LABELS, '操作账户')
  const cleanCoinKey = requireChoice(coinKey, COIN_LABELS, '操作币种')
  const parsedAmount = parseMoney(amount, '冻结金额')
  const cleanReason = normalizeOptionalText(reason)
  const before = snapshotFor(user)
  if (parsedAmount > before.balance) throw new Error('冻结金额不能超过可用余额')

  const nextAdminFrozen = roundMoney(before.adminFrozenAmount + parsedAmount)
  user.balance = roundMoney(before.balance - parsedAmount)
  user.frozenBalance = roundMoney(before.frozenBalance + parsedAmount)
  adminFrozenByUser.set(before.userId, nextAdminFrozen)
  const after = snapshotFor(user)
  const transactionId = appendAudit({ type: 'freeze', userId: before.userId, before, after, amount: parsedAmount, reason: cleanReason, operatorId, accountKey: cleanAccountKey, coinKey: cleanCoinKey })
  return { ...after, transactionId, accountKey: cleanAccountKey, accountLabel: ACCOUNT_LABELS[cleanAccountKey], coinKey: cleanCoinKey, coinLabel: COIN_LABELS[cleanCoinKey] }
}

export const unfreezeAdminFunds = ({ userId, accountKey, coinKey, amount, reason, operatorId }) => {
  const user = requireUser(userId)
  const cleanAccountKey = requireChoice(accountKey, ACCOUNT_LABELS, '操作账户')
  const cleanCoinKey = requireChoice(coinKey, COIN_LABELS, '操作币种')
  const parsedAmount = parseMoney(amount, '解冻金额')
  const cleanReason = normalizeOptionalText(reason)
  const before = snapshotFor(user)
  if (before.adminFrozenAmount <= 0) throw new Error('当前没有可解冻的资金')
  const releasableAmount = roundMoney(Math.min(before.adminFrozenAmount, before.frozenBalance))
  if (releasableAmount <= 0) throw new Error('当前没有可释放的资金')
  if (parsedAmount > releasableAmount) throw new Error('解冻金额不能超过可解冻余额')

  user.balance = roundMoney(before.balance + parsedAmount)
  user.frozenBalance = roundMoney(before.frozenBalance - parsedAmount)
  adminFrozenByUser.set(before.userId, roundMoney(before.adminFrozenAmount - parsedAmount))
  const after = snapshotFor(user)
  const transactionId = appendAudit({ type: 'unfreeze', userId: before.userId, before, after, amount: parsedAmount, reason: cleanReason, operatorId, accountKey: cleanAccountKey, coinKey: cleanCoinKey })
  return { ...after, transactionId, accountKey: cleanAccountKey, accountLabel: ACCOUNT_LABELS[cleanAccountKey], coinKey: cleanCoinKey, coinLabel: COIN_LABELS[cleanCoinKey] }
}

export const deductAvailableFunds = ({ userId, accountKey, coinKey, amount, reason, operatorId }) => {
  const user = requireUser(userId)
  const cleanAccountKey = requireChoice(accountKey, ACCOUNT_LABELS, '操作账户')
  const cleanCoinKey = requireChoice(coinKey, COIN_LABELS, '操作币种')
  const parsedAmount = parseMoney(amount, '扣减金额')
  const cleanReason = normalizeOptionalText(reason)
  const before = snapshotFor(user)
  if (parsedAmount > before.balance) throw new Error('扣减金额不能超过可用余额')

  user.balance = roundMoney(before.balance - parsedAmount)
  const after = snapshotFor(user)
  const transactionId = appendAudit({ type: 'deduct', userId: before.userId, before, after, amount: parsedAmount, reason: cleanReason, operatorId, accountKey: cleanAccountKey, coinKey: cleanCoinKey })
  return { ...after, transactionId, accountKey: cleanAccountKey, accountLabel: ACCOUNT_LABELS[cleanAccountKey], coinKey: cleanCoinKey, coinLabel: COIN_LABELS[cleanCoinKey] }
}

const evaluateLimit = (raw, nowValue) => {
  if (!raw) {
    return {
      status: 'none',
      canWithdraw: true,
      requiredTurnover: 0,
      completedTurnover: 0,
      remainingTurnover: 0,
      expiresAt: null,
      reason: '',
      flowScope: 'all',
      flowScopeLabel: FLOW_SCOPE_LABELS.all,
      updatedAt: null
    }
  }
  const now = toNow(nowValue)
  const remainingTurnover = roundMoney(Math.max(0, raw.requiredTurnover - raw.completedTurnover))
  const completed = remainingTurnover === 0
  const expired = Boolean(raw.expiresAt && new Date(raw.expiresAt).getTime() <= now.getTime())
  const status = completed ? 'completed' : expired ? 'expired' : 'active'
  return {
    ...clone(raw),
    flowScope: raw.flowScope || 'all',
    flowScopeLabel: FLOW_SCOPE_LABELS[raw.flowScope || 'all'],
    remainingTurnover,
    status,
    canWithdraw: status !== 'active'
  }
}

export const getWithdrawFlowLimit = (userId, now) => {
  const user = requireUser(userId)
  return evaluateLimit(withdrawFlowLimits.get(userIdOf(user)) || null, now)
}

export const setWithdrawFlowLimit = ({
  userId,
  flowScope,
  requiredTurnover,
  expiresAt,
  reason,
  operatorId,
  now
}) => {
  const user = requireUser(userId)
  const id = userIdOf(user)
  const cleanFlowScope = requireChoice(flowScope || 'all', FLOW_SCOPE_LABELS, '流水范围')
  const required = parseMoney(requiredTurnover, '要求流水')
  const cleanReason = normalizeOptionalText(reason)
  const before = withdrawFlowLimits.get(id) || null
  const completed = before?.completedTurnover ?? 0
  if (required <= completed) throw new Error('要求流水必须大于当前已完成流水')

  const currentTime = toNow(now)
  let normalizedExpiry = null
  if (expiresAt) {
    const expiry = new Date(expiresAt)
    if (Number.isNaN(expiry.getTime())) throw new Error('有效期格式不正确')
    if (expiry.getTime() <= currentTime.getTime()) throw new Error('有效期必须晚于当前时间')
    normalizedExpiry = expiry.toISOString()
  }

  const next = {
    flowScope: cleanFlowScope,
    flowScopeLabel: FLOW_SCOPE_LABELS[cleanFlowScope],
    requiredTurnover: required,
    completedTurnover: completed,
    expiresAt: normalizedExpiry,
    reason: cleanReason,
    updatedAt: currentTime.toISOString()
  }
  withdrawFlowLimits.set(id, next)
  const after = evaluateLimit(next, currentTime)
  appendAudit({ type: 'flow-limit-set', userId: id, before, after, reason: cleanReason, operatorId })
  return after
}

export const removeWithdrawFlowLimit = ({ userId, reason, operatorId }) => {
  const user = requireUser(userId)
  const id = userIdOf(user)
  const cleanReason = normalizeOptionalText(reason, '解除原因')
  const before = withdrawFlowLimits.get(id) || null
  if (!before) throw new Error('当前没有出金流水限制')

  withdrawFlowLimits.delete(id)
  const after = evaluateLimit(null)
  appendAudit({ type: 'flow-limit-remove', userId: id, before, after, reason: cleanReason, operatorId })
  return after
}

export const getFundsAuditLog = ({ userId, type } = {}) => auditLog
  .filter((row) => !userId || row.userId === String(userId))
  .filter((row) => !type || row.type === type)
  .map((row) => clone(row))

export const __resetUserFundsStateForTests = () => {
  adminFrozenByUser.clear()
  withdrawFlowLimits.clear()
  auditLog.splice(0)
}
