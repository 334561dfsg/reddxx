import { usersList } from '../mock/user.js'

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

const requireText = (value, label = '操作原因') => {
  const text = String(value ?? '').trim()
  if (!text) throw new Error(`${label}必填`)
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

const parseNonNegativeMoney = (value, label) => {
  const raw = String(value ?? '').trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw new Error(`${label}最多保留两位小数`)
  const amount = Number(raw)
  if (!Number.isFinite(amount) || amount < 0) throw new Error(`${label}不能小于 0`)
  return roundMoney(amount)
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

const appendAudit = ({ type, userId, before, after, amount = null, reason, operatorId, transactionId }) => {
  const ids = transactionId ? { transactionId, auditId: `funds-${Date.now()}-${auditLog.length + 1}` } : nextIds()
  auditLog.push({
    id: ids.auditId,
    transactionId: ids.transactionId,
    type,
    userId: String(userId),
    before: clone(before),
    after: clone(after),
    amount: amount === null ? null : roundMoney(amount),
    reason,
    operatorId: String(operatorId || 'admin_current'),
    createdAt: new Date().toISOString()
  })
  return ids.transactionId
}

export const getFundsSnapshot = (userId) => snapshotFor(requireUser(userId))

export const freezeAllAvailable = ({ userId, reason, operatorId }) => {
  const user = requireUser(userId)
  const cleanReason = requireText(reason)
  const before = snapshotFor(user)
  const amount = before.balance
  if (amount <= 0) throw new Error('当前没有可冻结的可用资金')

  const nextAdminFrozen = roundMoney(before.adminFrozenAmount + amount)
  user.balance = 0
  user.frozenBalance = roundMoney(before.frozenBalance + amount)
  adminFrozenByUser.set(before.userId, nextAdminFrozen)
  const after = snapshotFor(user)
  const transactionId = appendAudit({ type: 'freeze', userId: before.userId, before, after, amount, reason: cleanReason, operatorId })
  return { ...after, transactionId }
}

export const unfreezeAdminFunds = ({ userId, reason, operatorId }) => {
  const user = requireUser(userId)
  const cleanReason = requireText(reason)
  const before = snapshotFor(user)
  if (before.adminFrozenAmount <= 0) throw new Error('当前没有人工冻结资金')
  const amount = roundMoney(Math.min(before.adminFrozenAmount, before.frozenBalance))
  if (amount <= 0) throw new Error('当前没有可释放的人工冻结资金')

  user.balance = roundMoney(before.balance + amount)
  user.frozenBalance = roundMoney(before.frozenBalance - amount)
  adminFrozenByUser.set(before.userId, 0)
  const after = snapshotFor(user)
  const transactionId = appendAudit({ type: 'unfreeze', userId: before.userId, before, after, amount, reason: cleanReason, operatorId })
  return { ...after, transactionId }
}

export const deductAvailableFunds = ({ userId, amount, reason, operatorId }) => {
  const user = requireUser(userId)
  const parsedAmount = parseMoney(amount, '划扣金额')
  const cleanReason = requireText(reason)
  const before = snapshotFor(user)
  if (parsedAmount > before.balance) throw new Error('划扣金额不能超过可用余额')

  user.balance = roundMoney(before.balance - parsedAmount)
  const after = snapshotFor(user)
  const transactionId = appendAudit({ type: 'deduct', userId: before.userId, before, after, amount: parsedAmount, reason: cleanReason, operatorId })
  return { ...after, transactionId }
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
  requiredTurnover,
  completedTurnover,
  expiresAt,
  reason,
  operatorId,
  now
}) => {
  const user = requireUser(userId)
  const id = userIdOf(user)
  const required = parseMoney(requiredTurnover, '要求流水')
  const completed = parseNonNegativeMoney(completedTurnover, '已完成流水')
  const cleanReason = requireText(reason)
  if (completed > required) throw new Error('已完成流水不能大于要求流水')

  const currentTime = toNow(now)
  let normalizedExpiry = null
  if (expiresAt) {
    const expiry = new Date(expiresAt)
    if (Number.isNaN(expiry.getTime())) throw new Error('有效期格式不正确')
    if (expiry.getTime() <= currentTime.getTime()) throw new Error('有效期必须晚于当前时间')
    normalizedExpiry = expiry.toISOString()
  }

  const before = withdrawFlowLimits.get(id) || null
  const next = {
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
  const cleanReason = requireText(reason, '解除原因')
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
