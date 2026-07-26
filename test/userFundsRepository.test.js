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
    amount: '250.25',
    reason: ' 风险排查 ',
    operatorId: 'admin_current'
  })

  assert.equal(frozen.balance, 1000.5)
  assert.equal(frozen.frozenBalance, 330.5)
  assert.equal(frozen.adminFrozenAmount, 250.25)
  assert.equal(frozen.totalBalance, 1331)

  const unfrozen = unfreezeAdminFunds({
    userId: user.id,
    amount: '100',
    reason: '排查完成',
    operatorId: 'admin_current'
  })

  assert.equal(unfrozen.balance, 1100.5)
  assert.equal(unfrozen.frozenBalance, 230.5)
  assert.equal(unfrozen.adminFrozenAmount, 150.25)
  assert.equal(getFundsAuditLog({ userId: user.id }).length, 2)

  const fullyUnfrozen = unfreezeAdminFunds({
    userId: user.id,
    amount: '150.25',
    reason: '全部解冻',
    operatorId: 'admin_current'
  })
  assert.equal(fullyUnfrozen.balance, 1250.75)
  assert.equal(fullyUnfrozen.frozenBalance, 80.25)
  assert.equal(fullyUnfrozen.adminFrozenAmount, 0)
  assert.equal(getFundsAuditLog({ userId: user.id }).length, 3)
})

test('freeze and unfreeze validate entered amounts without partial writes', () => {
  for (const amount of ['0', '-1', '1.234', '999999']) {
    const before = getFundsSnapshot(user.id)
    const auditCount = getFundsAuditLog({ userId: user.id }).length
    assert.throws(() => freezeAllAvailable({ userId: user.id, amount, reason: '测试', operatorId: 'admin_current' }))
    assert.deepEqual(getFundsSnapshot(user.id), before)
    assert.equal(getFundsAuditLog({ userId: user.id }).length, auditCount)
  }

  freezeAllAvailable({ userId: user.id, amount: '200', reason: '测试冻结', operatorId: 'admin_current' })
  for (const amount of ['0', '-1', '1.234', '200.01']) {
    const before = getFundsSnapshot(user.id)
    const auditCount = getFundsAuditLog({ userId: user.id }).length
    assert.throws(() => unfreezeAdminFunds({ userId: user.id, amount, reason: '测试', operatorId: 'admin_current' }))
    assert.deepEqual(getFundsSnapshot(user.id), before)
    assert.equal(getFundsAuditLog({ userId: user.id }).length, auditCount)
  }
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
  assert.throws(() => freezeAllAvailable({ userId: user.id, amount: '1', reason: '测试', operatorId: 'admin_current' }), /不能超过可用余额/)
  assert.throws(() => unfreezeAdminFunds({ userId: user.id, amount: '1', reason: '测试', operatorId: 'admin_current' }), /没有可解冻的资金/)
  assert.deepEqual(getFundsSnapshot(user.id), before)
  assert.equal(getFundsAuditLog({ userId: user.id }).length, 0)
})

test('withdraw flow limits derive progress instead of accepting operator input', () => {
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
  assert.equal(active.completedTurnover, 0)
  assert.equal(active.remainingTurnover, 1000)
  assert.equal(active.canWithdraw, false)

  const expired = getWithdrawFlowLimit(user.id, '2030-01-03T00:00:00.000Z')
  assert.equal(expired.status, 'expired')
  assert.equal(expired.canWithdraw, true)

  const updated = setWithdrawFlowLimit({
    userId: user.id,
    requiredTurnover: '1200',
    completedTurnover: '1200',
    expiresAt: null,
    reason: '调整目标',
    operatorId: 'admin_current'
  })
  assert.equal(updated.status, 'active')
  assert.equal(updated.completedTurnover, 0)
  assert.equal(updated.remainingTurnover, 1200)
  assert.equal(updated.canWithdraw, false)

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
    expiresAt: null,
    reason: '初始规则',
    operatorId: 'admin_current'
  })
  const before = getWithdrawFlowLimit(user.id)
  const auditCount = getFundsAuditLog({ userId: user.id }).length

  assert.throws(() => setWithdrawFlowLimit({
    userId: user.id,
    requiredTurnover: '0',
    expiresAt: null,
    reason: '错误规则',
    operatorId: 'admin_current'
  }), /必须大于 0/)
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
