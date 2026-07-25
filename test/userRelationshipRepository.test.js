import test from 'node:test'
import assert from 'node:assert/strict'
import { usersList } from '../src/admin/mock/user.js'
import {
  getDirectReferrals,
  getDescendants,
  getParentCandidates,
  validateProfile,
  updateProfile,
  resetParent,
  updateAgentRole,
  getTeamReport,
  getRelationshipAuditLog,
  __resetRelationshipAuditLogForTests
} from '../src/admin/repositories/userRelationshipRepository.js'

const getUser = (id) => usersList.find((user) => user.id === id)
const snapshotUser = (id) => ({ ...getUser(id) })
const restoreUser = (snapshot) => Object.assign(getUser(snapshot.id), snapshot)

test('returns direct children and breadth-first descendants with paths', () => {
  const directIds = getDirectReferrals('user_1001').map((row) => row.id)
  for (const id of ['user_1002', 'user_1003', 'user_1005', 'user_1007']) {
    assert.ok(directIds.includes(id))
  }
  assert.equal(new Set(directIds).size, directIds.length)

  const chen = getDescendants('user_1001').find((row) => row.id === 'user_1004')
  assert.equal(chen.depth, 2)
  assert.deepEqual(chen.path.map((row) => row.id), ['user_1001', 'user_1003', 'user_1004'])
})

test('parent candidates exclude self, descendants, current parent and banned users', () => {
  const ids = getParentCandidates('user_1003').map((row) => row.id)
  assert.equal(ids.includes('user_1003'), false)
  assert.equal(ids.includes('user_1004'), false)
  assert.equal(ids.includes('user_1001'), false)
  assert.equal(ids.includes('user_1008'), false)
})

test('profile validation reports duplicate and malformed fields', () => {
  const errors = validateProfile({
    username: 'vip_zhang',
    email: 'bad',
    phone: '+86 13800001001',
    remark: ''
  }, 'user_1004')
  assert.equal(errors.username, '用户名已存在')
  assert.equal(errors.email, '邮箱格式不正确')
  assert.equal(errors.phone, '手机号已存在')
})

test('profile update trims fields and appends one audit record', () => {
  const before = snapshotUser('user_1004')
  __resetRelationshipAuditLogForTests()
  try {
    const updated = updateProfile('user_1004', {
      username: ' user_chen_updated ',
      email: ' chen.updated@example.com ',
      phone: ' +86 13900001004 ',
      remark: ' 已核实 '
    })
    assert.equal(updated.username, 'user_chen_updated')
    assert.equal(updated.remark, '已核实')
    assert.equal(getRelationshipAuditLog().length, 1)
    assert.equal(getRelationshipAuditLog()[0].type, 'profile')
  } finally {
    restoreUser(before)
    __resetRelationshipAuditLogForTests()
  }
})

test('parent mutation rejects cycles without partial writes and records success', () => {
  const before = snapshotUser('user_1003')
  __resetRelationshipAuditLogForTests()
  try {
    assert.throws(
      () => resetParent({ userId: 'user_1003', parentId: 'user_1004', reason: '无效调整' }),
      /不能选择自己的下级/
    )
    assert.deepEqual(getUser('user_1003'), before)
    assert.equal(getRelationshipAuditLog().length, 0)

    const updated = resetParent({ userId: 'user_1003', parentId: 'user_1009', reason: '组织调整' })
    assert.equal(updated.parentId, 'user_1009')
    assert.equal(updated.parentUsername, 'agent_zhao')
    assert.equal(getRelationshipAuditLog()[0].type, 'parent-reset')
  } finally {
    restoreUser(before)
    __resetRelationshipAuditLogForTests()
  }
})

test('agent demotion reassigns direct children atomically and records affected users', () => {
  const agentBefore = snapshotUser('user_1003')
  const childIds = getDirectReferrals('user_1003').map((row) => row.id)
  const childSnapshots = childIds.map(snapshotUser)
  __resetRelationshipAuditLogForTests()
  try {
    const updated = updateAgentRole({
      userId: 'user_1003',
      role: 'user',
      reason: '代理关系调整',
      successorParentId: 'user_1009'
    })
    assert.equal(updated.role, 'user')
    assert.ok(childIds.every((id) => getUser(id).parentId === 'user_1009'))
    assert.deepEqual(getRelationshipAuditLog()[0].affectedUserIds.sort(), ['user_1003', ...childIds].sort())
  } finally {
    restoreUser(agentBefore)
    childSnapshots.forEach(restoreUser)
    __resetRelationshipAuditLogForTests()
  }
})

test('team report derives totals and direct branch summaries', () => {
  const descendants = getDescendants('user_1001')
  const report = getTeamReport('user_1001')
  assert.equal(report.directCount, getDirectReferrals('user_1001').length)
  assert.equal(report.memberCount, descendants.length)
  assert.equal(report.availableBalance, descendants.reduce((sum, row) => sum + Number(row.balance || 0), 0))
  assert.ok(report.branches.every((branch) => branch.memberCount >= 1))
})
