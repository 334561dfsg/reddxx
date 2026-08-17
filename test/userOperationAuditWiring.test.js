import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { usersList } from '../src/admin/mock/user.js'
import {
  __resetRelationshipAuditLogForTests,
  resetParent,
  updateProfile
} from '../src/admin/repositories/userRelationshipRepository.js'
import {
  __resetUserCreditMembershipStateForTests,
  adjustUserCredit,
  setUserVipLevel
} from '../src/admin/repositories/userCreditMembershipRepository.js'
import {
  __resetUserFundsStateForTests,
  freezeAllAvailable
} from '../src/admin/repositories/userFundsRepository.js'
import {
  applyUnifiedControl,
  createUserControlState
} from '../src/features/user-control/userControl.js'
import {
  queryUserAuditLogs,
  resetUserAuditLogsForTests
} from '../src/admin/repositories/userAuditLogRepository.js'

const snapshotUsers = () => usersList.map((user) => ({ id: user.id, snapshot: { ...user } }))
let userSnapshots = []

beforeEach(() => {
  userSnapshots = snapshotUsers()
  resetUserAuditLogsForTests()
  __resetRelationshipAuditLogForTests()
  __resetUserFundsStateForTests()
  __resetUserCreditMembershipStateForTests()
})

afterEach(() => {
  for (const { id, snapshot } of userSnapshots) {
    Object.assign(usersList.find((user) => user.id === id), snapshot)
  }
  resetUserAuditLogsForTests()
  __resetRelationshipAuditLogForTests()
  __resetUserFundsStateForTests()
  __resetUserCreditMembershipStateForTests()
})

const allLogs = () => queryUserAuditLogs({ page: 1, pageSize: 50 }).rows

test('profile and relationship mutations append unified user operation logs', () => {
  updateProfile('user_1004', {
    username: 'user_chen_audit',
    email: 'chen.audit@example.com',
    phone: '8613900001004',
    remark: '已核实',
    reason: '编辑用户资料'
  })
  resetParent({ userId: 'user_1003', parentId: 'user_1009', reason: '组织调整' })

  const logs = allLogs()
  assert.ok(logs.some((log) => (
    log.category === 'profile' &&
    log.action === 'profile.update' &&
    log.targetUser.uid === 'user_1004' &&
    log.reason === '编辑用户资料' &&
    log.diff.some((item) => item.field === 'email')
  )))
  assert.ok(logs.some((log) => (
    log.category === 'permission' &&
    log.action === 'relationship.parent.reset' &&
    log.targetUser.uid === 'user_1003' &&
    log.reason === '组织调整'
  )))
})

test('funds and membership mutations append unified user operation logs', () => {
  const user = usersList.find((row) => row.id === 'user_1004')
  user.balance = 1250.75
  user.frozenBalance = 80.25

  freezeAllAvailable({
    userId: user.id,
    accountKey: 'market',
    coinKey: 'USDT',
    amount: '100',
    reason: '异常出金复核',
    operatorId: 'admin_current'
  })
  setUserVipLevel({ userId: user.id, vipLevel: 2, reason: '运营调整', operatorId: 'admin_current' })
  adjustUserCredit({ userId: user.id, direction: 'increase', points: 5, reason: '风险复核完成', operatorId: 'admin_current' })

  const logs = allLogs()
  assert.ok(logs.some((log) => log.category === 'funds' && log.action === 'funds.freeze' && log.reason === '异常出金复核'))
  assert.ok(logs.some((log) => log.category === 'membership' && log.action === 'membership.vip.set' && log.reason === '运营调整'))
  assert.ok(logs.some((log) => log.category === 'membership' && log.action === 'membership.credit.adjust' && log.reason === '风险复核完成'))
})

test('user control mutations append unified risk result logs', () => {
  applyUnifiedControl(createUserControlState(), {
    userId: 'user_1001',
    strategy: 'positive',
    duration: 'once',
    note: '复核符合，批次带盈',
    now: '2026-07-27 12:00:00',
    batchId: 'audit-control-b1',
    operator: 'risk_admin'
  })

  const logs = allLogs()
  assert.ok(logs.some((log) => (
    log.category === 'risk' &&
    log.action === 'risk.control.apply' &&
    log.targetUser.uid === 'user_1001' &&
    log.operator.id === 'risk_admin' &&
    log.reason === '复核符合，批次带盈' &&
    log.related.businessId === 'audit-control-b1'
  )))
})
