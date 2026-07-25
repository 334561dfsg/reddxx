import { usersList } from '../mock/user.js'
import { getActiveVipLevels } from '../mock/vip.js'

const SCORE_MIN = 0
const SCORE_MAX = 1000
const VIP_RECHARGE_TARGETS = Object.freeze({ 0: 0, 1: 100000, 2: 300000, 3: 600000, 4: 1000000, 5: 2000000 })
const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value))
const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100
const userIdOf = (user) => String(user?.id ?? user?.userId ?? '')

let creditReviews = []
let rechargeRecords = []
const auditLog = []
let sequence = 0

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

const requireMoney = (value, label) => {
  const raw = String(value ?? '').trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw new Error(`${label}最多保留两位小数`)
  const amount = roundMoney(raw)
  if (!Number.isFinite(amount) || amount <= 0) throw new Error(`${label}必须大于 0`)
  return amount
}

const nextId = (prefix) => {
  sequence += 1
  return `${prefix}-${Date.now()}-${sequence}`
}

const appendAudit = ({ type, userId, before, after, reason, operatorId, transactionId = null, metadata = null }) => {
  const row = {
    id: nextId('MEM'),
    transactionId,
    type,
    userId: String(userId),
    before: clone(before),
    after: clone(after),
    reason,
    operatorId: String(operatorId || 'admin_current'),
    metadata: clone(metadata),
    createdAt: new Date().toISOString()
  }
  auditLog.push(row)
  return row
}

const makeRechargeRecords = () => usersList.flatMap((user, index) => {
  const userId = userIdOf(user)
  if (userId === 'user_1004') {
    return [
      { id: 'RCG-user_1004-001', userId, amount: 125000, qualifyingAmount: 120000, source: '链上充值', transactionId: 'DEP-1004-001', createdAt: '2026-06-18T08:30:00.000Z' },
      { id: 'RCG-user_1004-002', userId, amount: 45000, qualifyingAmount: 40000, source: '人工入金', transactionId: 'DEP-1004-002', createdAt: '2026-05-06T11:20:00.000Z' }
    ]
  }
  const amount = roundMoney(50000 + index * 25000)
  return [{
    id: `RCG-${userId}-001`, userId, amount, qualifyingAmount: amount,
    source: '链上充值', transactionId: `DEP-${userId}-001`, createdAt: '2026-06-01T09:00:00.000Z'
  }]
})

const makeCreditReviews = () => [{
  id: 'CR-user_1004-001',
  userId: 'user_1004',
  beforeScore: 680,
  proposedScore: 695,
  delta: 15,
  reason: '完成补充身份核验，申请恢复信用分',
  applicantId: 'risk_operator_01',
  applicantName: '风控专员',
  appliedAt: '2026-07-23T09:20:00.000Z',
  status: 'pending',
  decisionNote: null,
  decidedAt: null,
  operatorId: null
}]

const resetSupportingState = () => {
  creditReviews = makeCreditReviews()
  rechargeRecords = makeRechargeRecords()
  auditLog.splice(0)
  sequence = 0
}

resetSupportingState()

export const getUserRechargeSummary = (userId) => {
  const user = requireUser(userId)
  const id = userIdOf(user)
  const records = rechargeRecords
    .filter((row) => row.userId === id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const cumulativeRecharge = roundMoney(records.reduce((sum, row) => sum + row.amount, 0))
  const qualifyingRecharge = roundMoney(records.reduce((sum, row) => sum + row.qualifyingAmount, 0))
  const nextLevel = getActiveVipLevels()
    .filter((level) => level.level > 0 && Number(VIP_RECHARGE_TARGETS[level.level]) > qualifyingRecharge)
    .sort((a, b) => a.level - b.level)[0] || null

  return clone({
    userId: id,
    cumulativeRecharge,
    qualifyingRecharge,
    currentVipLevel: Number(user.vipLevel || 0),
    nextLevel: nextLevel ? {
      level: nextLevel.level,
      name: nextLevel.name,
      displayName: nextLevel.displayName,
      targetRecharge: VIP_RECHARGE_TARGETS[nextLevel.level],
      remainingRecharge: roundMoney(VIP_RECHARGE_TARGETS[nextLevel.level] - qualifyingRecharge),
      progressPercent: Math.min(100, roundMoney(qualifyingRecharge / VIP_RECHARGE_TARGETS[nextLevel.level] * 100))
    } : null,
    records
  })
}

export const getUserCreditReviews = (userId) => {
  const user = requireUser(userId)
  const id = userIdOf(user)
  return creditReviews
    .filter((row) => row.userId === id)
    .sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (a.status !== 'pending' && b.status === 'pending') return 1
      return new Date(b.appliedAt) - new Date(a.appliedAt)
    })
    .map(clone)
}

export const getUserMembershipAuditLog = ({ userId, type } = {}) => auditLog
  .filter((row) => !userId || row.userId === String(userId))
  .filter((row) => !type || row.type === type)
  .map(clone)

export const getCreditMembershipSnapshot = (userId) => {
  const user = requireUser(userId)
  const id = userIdOf(user)
  const recharge = getUserRechargeSummary(id)
  const reviews = getUserCreditReviews(id)
  return clone({
    userId: id,
    user,
    enabledVipLevels: getActiveVipLevels(),
    recharge,
    pendingReviewCount: reviews.filter((row) => row.status === 'pending').length,
    recentAudits: getUserMembershipAuditLog({ userId: id }).slice(-5).reverse()
  })
}

export const adjustUserCredit = ({ userId, direction, points, reason, operatorId }) => {
  const user = requireUser(userId)
  if (!['increase', 'decrease'].includes(direction)) throw new Error('信用分调整方向无效')
  const parsedPoints = Number(points)
  if (!Number.isInteger(parsedPoints) || parsedPoints <= 0) throw new Error('信用分值必须为正整数')
  const cleanReason = requireText(reason)
  const beforeScore = Number(user.creditScore || 0)
  const delta = direction === 'increase' ? parsedPoints : -parsedPoints
  const afterScore = beforeScore + delta
  if (afterScore < SCORE_MIN || afterScore > SCORE_MAX) throw new Error(`调整后信用分必须在 ${SCORE_MIN} 至 ${SCORE_MAX} 之间`)

  user.creditScore = afterScore
  appendAudit({ type: 'credit-adjust', userId: userIdOf(user), before: { creditScore: beforeScore }, after: { creditScore: afterScore }, reason: cleanReason, operatorId, metadata: { direction, points: parsedPoints, delta } })
  return clone({ user, beforeScore, afterScore, delta })
}

export const setUserVipLevel = ({ userId, vipLevel, reason, operatorId }) => {
  const user = requireUser(userId)
  const targetLevel = Number(vipLevel)
  const target = getActiveVipLevels().find((level) => level.level === targetLevel)
  if (!target) throw new Error('目标会员等级不存在或未启用')
  const cleanReason = requireText(reason)
  const beforeLevel = Number(user.vipLevel || 0)
  if (beforeLevel === targetLevel) throw new Error('目标等级与当前等级相同')
  const direction = targetLevel > beforeLevel ? 'upgrade' : 'downgrade'

  user.vipLevel = targetLevel
  user.isVip = targetLevel > 0
  appendAudit({ type: 'vip-level-set', userId: userIdOf(user), before: { vipLevel: beforeLevel, isVip: beforeLevel > 0 }, after: { vipLevel: targetLevel, isVip: targetLevel > 0 }, reason: cleanReason, operatorId, metadata: { direction, targetName: target.name } })
  return clone({ user, beforeLevel, targetLevel, direction, target })
}

export const decideUserCreditReview = ({ userId, reviewId, decision, note, operatorId }) => {
  const user = requireUser(userId)
  const review = creditReviews.find((row) => row.id === String(reviewId))
  if (!review) throw new Error('信用分审核记录不存在')
  if (review.userId !== userIdOf(user)) throw new Error('审核记录不属于当前用户')
  if (review.status !== 'pending') throw new Error('该审核记录已处理')
  if (!['approve', 'reject'].includes(decision)) throw new Error('审核决定无效')
  const cleanNote = requireText(note, '审核备注')
  const beforeScore = Number(user.creditScore || 0)
  const afterScore = decision === 'approve' ? Number(review.proposedScore) : beforeScore
  if (!Number.isInteger(afterScore) || afterScore < SCORE_MIN || afterScore > SCORE_MAX) throw new Error('审核后的信用分超出允许范围')

  if (decision === 'approve') user.creditScore = afterScore
  Object.assign(review, {
    status: decision === 'approve' ? 'approved' : 'rejected',
    decisionNote: cleanNote,
    decidedAt: new Date().toISOString(),
    operatorId: String(operatorId || 'admin_current')
  })
  appendAudit({ type: `credit-review-${decision}`, userId: userIdOf(user), before: { creditScore: beforeScore, reviewStatus: 'pending' }, after: { creditScore: afterScore, reviewStatus: review.status }, reason: cleanNote, operatorId, metadata: { reviewId: review.id } })
  return clone({ user, review })
}

export const grantUserRebate = ({ userId, amount, reason, operatorId }) => {
  const user = requireUser(userId)
  const parsedAmount = requireMoney(amount, '返利金额')
  const cleanReason = requireText(reason)
  const beforeBalance = roundMoney(user.balance || 0)
  const afterBalance = roundMoney(beforeBalance + parsedAmount)
  const transactionId = nextId('REB')

  user.balance = afterBalance
  appendAudit({ type: 'rebate-grant', userId: userIdOf(user), before: { balance: beforeBalance }, after: { balance: afterBalance }, reason: cleanReason, operatorId, transactionId, metadata: { amount: parsedAmount } })
  return clone({ user, amount: parsedAmount, beforeBalance, afterBalance, transactionId })
}

export const __resetUserCreditMembershipStateForTests = () => {
  resetSupportingState()
}
