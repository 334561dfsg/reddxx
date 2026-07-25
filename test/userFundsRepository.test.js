import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { usersList } from '../src/admin/mock/user.js'
import {
  __resetUserFundsStateForTests,
  deductAvailableFunds,
  freezeAllAvailable,
  getFundsAuditLog,
  getFundsSnapshot,
  getWithdrawFlowLimit,
  removeWithdrawFlowLimit,
  setWithdrawFlowLimit,
  unfreezeAdminFunds
} from '../src/admin/repositories/userFundsRepository.js'

const user = usersList.find((row) => row.id === 'user_1004')
const original = { balance: user.balance, frozenBalance: user.frozenBalance }

beforeEach(() => {
  user.balance = 1250.75
  user.frozenBalance = 80.25
  __resetUserFundsStateForTests()
})

afterEach(() => {
  user.balance = original.balance
  user.frozenBalance = original.frozenBalance
  __resetUserFundsStateForTests()
})

test('freeze and admin unfreeze preserve pre-existing business frozen funds', () => {
  const frozen = freezeAllAvailable({
    userId: user.id,
    reason: ' 风险排查 ',
    operatorId: 'admin_current'
  })

  assert.equal(frozen.balance, 0)
  assert.equal(frozen.frozenBalance, 1331)
  assert.equal(frozen.adminFrozenAmount, 1250.75)
  assert.equal(frozen.totalBalance, 1331)

  const unfrozen = unfreezeAdminFunds({
    userId: user.id,
    reason: '排查完成',
    operatorId: 'admin_current'
  })

  assert.equal(unfrozen.balance, 1250.75)
  assert.equal(unfrozen.frozenBalance, 80.25)
  assert.equal(unfrozen.adminFrozenAmount, 0)
  assert.equal(getFundsAuditLog({ userId: user.id }).length, 2)
})

test('deduction creates one transaction and failed commands are atomic', () => {
  const deducted = deductAvailableFunds({
    userId: user.id,
    amount: '25.50',
    reason: '人工纠错',
    operatorId: 'admin_current'
  })

  assert.equal(deducted.balance, 1225.25)
  assert.equal(deducted.frozenBalance, 80.25)
  assert.match(deducted.transactionId, /^UF-/)
  assert.equal(getFundsAuditLog({ userId: user.id, type: 'deduct' }).length, 1)

  const beforeFailure = getFundsSnapshot(user.id)
  const auditCount = getFundsAuditLog({ userId: user.id }).length
  for (const amount of ['0', '-1', '1.234', '999999']) {
    assert.throws(() => deductAvailableFunds({
      userId: user.id,
      amount,
      reason: '无效划扣',
      operatorId: 'admin_current'
    }))
    assert.deepEqual(getFundsSnapshot(user.id), beforeFailure)
    assert.equal(getFundsAuditLog({ userId: user.id }).length, auditCount)
  }
})

test('freeze and unfreeze reject unavailable operations without side effects', () => {
  user.balance = 0
  const before = getFundsSnapshot(user.id)
  assert.throws(() => freezeAllAvailable({ userId: user.id, reason: '测试', operatorId: 'admin_current' }), /没有可冻结/)
  assert.throws(() => unfreezeAdminFunds({ userId: user.id, reason: '测试', operatorId: 'admin_current' }), /没有后台冻结/)
  assert.deepEqual(getFundsSnapshot(user.id), before)
  assert.equal(getFundsAuditLog({ userId: user.id }).length, 0)
})

test('withdraw flow limits expose active, completed, expired and none states', () => {
  const future = '2030-01-02T00:00:00.000Z'
  const active = setWithdrawFlowLimit({
    userId: user.id,
    requiredTurnover: '1000',
    completedTurnover: '250.50',
    expiresAt: future,
    reason: '活动流水要求',
    operatorId: 'admin_current',
    now: '2030-01-01T00:00:00.000Z'
  })
  assert.equal(active.status, 'active')
  assert.equal(active.remainingTurnover, 749.5)
  assert.equal(active.canWithdraw, false)

  const expired = getWithdrawFlowLimit(user.id, '2030-01-03T00:00:00.000Z')
  assert.equal(expired.status, 'expired')
  assert.equal(expired.canWithdraw, true)

  const completed = setWithdrawFlowLimit({
    userId: user.id,
    requiredTurnover: '1000',
    completedTurnover: '1000',
    expiresAt: null,
    reason: '流水已完成',
    operatorId: 'admin_current'
  })
  assert.equal(completed.status, 'completed')
  assert.equal(completed.remainingTurnover, 0)
  assert.equal(completed.canWithdraw, true)

  const removed = removeWithdrawFlowLimit({
    userId: user.id,
    reason: '人工解除',
    operatorId: 'admin_current'
  })
  assert.equal(removed.status, 'none')
  assert.equal(removed.canWithdraw, true)
  assert.equal(getFundsAuditLog({ userId: user.id }).length, 3)
})

test('withdraw flow validation leaves the prior rule and audit unchanged', () => {
  setWithdrawFlowLimit({
    userId: user.id,
    requiredTurnover: '500',
    completedTurnover: '100',
    expiresAt: null,
    reason: '初始规则',
    operatorId: 'admin_current'
  })
  const before = getWithdrawFlowLimit(user.id)
  const auditCount = getFundsAuditLog({ userId: user.id }).length

  assert.throws(() => setWithdrawFlowLimit({
    userId: user.id,
    requiredTurnover: '100',
    completedTurnover: '101',
    expiresAt: null,
    reason: '错误规则',
    operatorId: 'admin_current'
  }), /不能大于要求流水/)
  assert.throws(() => setWithdrawFlowLimit({
    userId: user.id,
    requiredTurnover: '100',
    completedTurnover: '10',
    expiresAt: '2029-12-31T00:00:00.000Z',
    reason: '过期规则',
    operatorId: 'admin_current',
    now: '2030-01-01T00:00:00.000Z'
  }), /必须晚于当前时间/)

  assert.deepEqual(getWithdrawFlowLimit(user.id), before)
  assert.equal(getFundsAuditLog({ userId: user.id }).length, auditCount)
})
