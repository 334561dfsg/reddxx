import assert from 'node:assert/strict'
import test from 'node:test'
import { usersList } from '../src/admin/mock/user.js'
import {
  __resetUserCreditMembershipStateForTests,
  adjustUserCredit,
  decideUserCreditReview,
  getCreditMembershipSnapshot,
  getUserCreditReviews,
  getUserMembershipAuditLog,
  getUserRechargeSummary,
  grantUserRebate,
  setUserVipLevel
} from '../src/admin/repositories/userCreditMembershipRepository.js'

const user = usersList.find((row) => row.id === 'user_1004')
const original = {
  creditScore: user.creditScore,
  vipLevel: user.vipLevel,
  isVip: user.isVip,
  balance: user.balance
}

test.beforeEach(() => {
  Object.assign(user, original)
  __resetUserCreditMembershipStateForTests()
})

test.after(() => {
  Object.assign(user, original)
  __resetUserCreditMembershipStateForTests()
})

test('credit adjustment applies an integer delta and records one detached audit', () => {
  const result = adjustUserCredit({
    userId: user.id,
    direction: 'increase',
    points: 12,
    reason: ' 风险复核完成 ',
    operatorId: 'admin_current'
  })

  assert.equal(result.user.creditScore, original.creditScore + 12)
  assert.equal(result.delta, 12)
  const audits = getUserMembershipAuditLog({ userId: user.id, type: 'credit-adjust' })
  assert.equal(audits.length, 1)
  assert.equal(audits[0].reason, '风险复核完成')
  audits[0].reason = 'tampered'
  assert.equal(getUserMembershipAuditLog({ userId: user.id })[0].reason, '风险复核完成')
})

test('operation reasons and review notes are optional but still length-limited', () => {
  const credited = adjustUserCredit({
    userId: user.id,
    direction: 'increase',
    points: 1,
    reason: '   ',
    operatorId: 'admin_current'
  })
  assert.equal(credited.user.creditScore, original.creditScore + 1)
  assert.equal(getUserMembershipAuditLog({ userId: user.id, type: 'credit-adjust' })[0].reason, '')

  const vip = setUserVipLevel({ userId: user.id, vipLevel: 2, reason: '', operatorId: 'admin_current' })
  assert.equal(vip.user.vipLevel, 2)
  assert.equal(getUserMembershipAuditLog({ userId: user.id, type: 'vip-level-set' })[0].reason, '')

  const rebate = grantUserRebate({ userId: user.id, amount: '1', reason: '', operatorId: 'admin_current' })
  assert.equal(rebate.amount, 1)
  assert.equal(getUserMembershipAuditLog({ userId: user.id, type: 'rebate-grant' })[0].reason, '')

  const review = getUserCreditReviews(user.id).find((row) => row.status === 'pending')
  const decision = decideUserCreditReview({
    userId: user.id,
    reviewId: review.id,
    decision: 'reject',
    note: '   ',
    operatorId: 'admin_current'
  })
  assert.equal(decision.review.decisionNote, '')

  const tooLong = '测'.repeat(201)
  assert.throws(() => adjustUserCredit({ userId: user.id, direction: 'increase', points: 1, reason: tooLong }), /操作原因不能超过 200 字/)
  assert.throws(() => decideUserCreditReview({
    userId: user.id,
    reviewId: getUserCreditReviews(user.id).find((row) => row.status === 'pending').id,
    decision: 'approve',
    note: tooLong
  }), /审核备注不能超过 200 字/)
})

test('credit validation rejects invalid or out-of-range results without partial writes', () => {
  const before = getCreditMembershipSnapshot(user.id)
  const invalidInputs = [
    { direction: 'increase', points: 0, reason: '测试' },
    { direction: 'increase', points: 1.5, reason: '测试' },
    { direction: 'sideways', points: 1, reason: '测试' },
    { direction: 'decrease', points: original.creditScore + 1, reason: '测试' }
  ]

  for (const input of invalidInputs) {
    assert.throws(() => adjustUserCredit({ userId: user.id, operatorId: 'admin_current', ...input }))
  }
  assert.deepEqual(getCreditMembershipSnapshot(user.id), before)
  assert.equal(getUserMembershipAuditLog({ userId: user.id }).length, 0)
})

test('review approval is user-owned, one-time, and atomic with the score change', () => {
  const review = getUserCreditReviews(user.id).find((row) => row.status === 'pending')
  assert.ok(review)

  const result = decideUserCreditReview({
    userId: user.id,
    reviewId: review.id,
    decision: 'approve',
    note: ' 材料有效 ',
    operatorId: 'admin_current'
  })

  assert.equal(result.review.status, 'approved')
  assert.equal(result.review.decisionNote, '材料有效')
  assert.equal(result.user.creditScore, review.proposedScore)
  assert.throws(() => decideUserCreditReview({
    userId: user.id,
    reviewId: review.id,
    decision: 'reject',
    note: '重复处理',
    operatorId: 'admin_current'
  }), /已处理/)
  assert.equal(getUserMembershipAuditLog({ userId: user.id, type: 'credit-review-approve' }).length, 1)
})

test('review rejection preserves the score and invalid decisions are atomic', () => {
  const review = getUserCreditReviews(user.id).find((row) => row.status === 'pending')
  const beforeScore = user.creditScore
  assert.throws(() => decideUserCreditReview({ userId: 'user_1003', reviewId: review.id, decision: 'approve', note: '错误用户' }), /不属于/)
  assert.throws(() => decideUserCreditReview({ userId: user.id, reviewId: review.id, decision: 'maybe', note: '无效' }), /审核决定/)
  assert.equal(getUserMembershipAuditLog().length, 0)

  const result = decideUserCreditReview({ userId: user.id, reviewId: review.id, decision: 'reject', note: '证据不足' })
  assert.equal(result.user.creditScore, beforeScore)
  assert.equal(result.review.status, 'rejected')
})

test('credit review demo data covers pending increase and decrease plus processed history', () => {
  const reviews = getUserCreditReviews(user.id)

  assert.equal(reviews.length, 4)
  assert.deepEqual(reviews.map((row) => row.status), ['pending', 'pending', 'approved', 'rejected'])
  assert.equal(reviews.filter((row) => row.status === 'pending' && row.delta > 0).length, 1)
  assert.equal(reviews.filter((row) => row.status === 'pending' && row.delta < 0).length, 1)
  assert.equal(new Set(reviews.map((row) => row.id)).size, 4)
  assert.ok(reviews.every((row) => row.delta === row.proposedScore - row.beforeScore))

  const pendingTimes = reviews.filter((row) => row.status === 'pending').map((row) => row.appliedAt)
  const processedTimes = reviews.filter((row) => row.status !== 'pending').map((row) => row.appliedAt)
  assert.deepEqual(pendingTimes, [...pendingTimes].sort((a, b) => new Date(b) - new Date(a)))
  assert.deepEqual(processedTimes, [...processedTimes].sort((a, b) => new Date(b) - new Date(a)))

  reviews[0].reason = 'tampered'
  assert.notEqual(getUserCreditReviews(user.id)[0].reason, 'tampered')
})

test('VIP changes keep vipLevel and isVip coherent and reject unavailable targets', () => {
  const result = setUserVipLevel({ userId: user.id, vipLevel: 2, reason: ' 运营调整 ', operatorId: 'admin_current' })
  assert.equal(result.user.vipLevel, 2)
  assert.equal(result.user.isVip, true)
  assert.equal(result.direction, 'upgrade')
  assert.throws(() => setUserVipLevel({ userId: user.id, vipLevel: 2, reason: '重复' }), /当前等级相同/)
  assert.throws(() => setUserVipLevel({ userId: user.id, vipLevel: 99, reason: '不存在' }), /会员等级/)

  const downgraded = setUserVipLevel({ userId: user.id, vipLevel: 0, reason: '降级' })
  assert.equal(downgraded.user.isVip, false)
  assert.equal(downgraded.direction, 'downgrade')
})

test('rebate grants available balance with two-decimal validation and a transaction ID', () => {
  const result = grantUserRebate({ userId: user.id, amount: '25.50', reason: ' 活动返利 ', operatorId: 'admin_current' })
  assert.equal(result.user.balance, original.balance + 25.5)
  assert.equal(result.amount, 25.5)
  assert.match(result.transactionId, /^REB-/)
  assert.equal(getUserMembershipAuditLog({ userId: user.id, type: 'rebate-grant' }).length, 1)

  const before = result.user.balance
  for (const amount of ['0', '-1', '1.001', 'abc']) {
    assert.throws(() => grantUserRebate({ userId: user.id, amount, reason: '测试' }))
  }
  assert.equal(user.balance, before)
  assert.equal(getUserMembershipAuditLog({ userId: user.id, type: 'rebate-grant' }).length, 1)
})

test('recharge and membership snapshots return deterministic detached progress', () => {
  const summary = getUserRechargeSummary(user.id)
  assert.equal(summary.cumulativeRecharge, 170000)
  assert.equal(summary.qualifyingRecharge, 160000)
  assert.equal(summary.records.length, 2)
  assert.equal(summary.nextLevel.level, 2)
  assert.equal(summary.nextLevel.targetRecharge, 300000)
  assert.equal(summary.nextLevel.remainingRecharge, 140000)

  summary.records[0].amount = 0
  assert.notEqual(getUserRechargeSummary(user.id).records[0].amount, 0)
  const snapshot = getCreditMembershipSnapshot(user.id)
  snapshot.user.username = 'tampered'
  assert.notEqual(getCreditMembershipSnapshot(user.id).user.username, 'tampered')
})

test('user_1001 exposes enough recharge records for pagination', () => {
  const summary = getUserRechargeSummary('user_1001')

  assert.equal(summary.records.length, 7)
  assert.equal(new Set(summary.records.map((row) => row.id)).size, 7)
  assert.equal(new Set(summary.records.map((row) => row.transactionId)).size, 7)
  assert.deepEqual(
    summary.records.map((row) => row.createdAt),
    [...summary.records.map((row) => row.createdAt)].sort((a, b) => new Date(b) - new Date(a))
  )
  assert.equal(summary.cumulativeRecharge, 50000)
  assert.equal(summary.qualifyingRecharge, 48000)
})
