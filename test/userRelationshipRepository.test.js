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

test('profile phone accepts optional 7 to 30 continuous digits', () => {
  for (const phone of ['', '13800001001', '8613800001001', '1234567', '1'.repeat(30)]) {
    const errors = validateProfile({
      username: 'unique_phone_user',
      email: 'unique.phone@example.com',
      phone,
      remark: ''
    }, phone === '8613800001001' ? 'user_1001' : 'user_1004')
    assert.equal(errors.phone, undefined)
  }
})

test('profile phone accepts separated configured dial code and national digits', () => {
  const errors = validateProfile({
    username: 'unique_phone_user',
    email: 'unique.phone@example.com',
    phoneDial: '+86',
    phoneNational: '13900001004',
    remark: ''
  }, 'user_1004')
  assert.equal(errors.phoneDial, undefined)
  assert.equal(errors.phone, undefined)
})

test('profile phone rejects non-digits and out-of-range lengths', () => {
  for (const phone of ['+8613800001001', '86 13800001001', '(86)13800001001', '86-13800001001', '123456', '1'.repeat(31)]) {
    const errors = validateProfile({
      username: 'unique_phone_user',
      email: 'unique.phone@example.com',
      phone,
      remark: ''
    }, 'user_1004')
    assert.equal(errors.phone, '手机号格式不正确')
  }
})

test('profile phone rejects separated phone dial outside configured options', () => {
  const errors = validateProfile({
    username: 'unique_phone_user',
    email: 'unique.phone@example.com',
    phoneDial: '+999',
    phoneNational: '13900001004',
    remark: ''
  }, 'user_1004')
  assert.equal(errors.phoneDial, '区号不在后台配置范围内')
})

test('profile validation reports duplicate and malformed fields', () => {
  const errors = validateProfile({
    username: 'vip_zhang',
    email: 'bad',
    phone: '8613800001002',
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
      phone: ' 8613900001004 ',
      remark: ' 已核实 ',
      reason: '资料复核通过'
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

test('profile update composes separated phone fields for storage and audit', () => {
  const before = snapshotUser('user_1004')
  __resetRelationshipAuditLogForTests()
  try {
    const updated = updateProfile('user_1004', {
      username: 'user_chen',
      email: 'chen@example.com',
      phoneDial: '+86',
      phoneNational: '13900001004',
      remark: '',
      reason: '资料复核通过'
    })
    assert.equal(updated.phone, '8613900001004')
    assert.equal(getRelationshipAuditLog()[0].after.phone, '8613900001004')
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
      /不能选择自己的裂变下级作为裂变上级/
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

test('parent reset reports rejected fission relationships with explicit terminology', () => {
  const before = snapshotUser('user_1003')
  const candidateBefore = snapshotUser('user_1009')
  __resetRelationshipAuditLogForTests()
  try {
    getUser('user_1009').status = 'banned'
    for (const [parentId, message] of [
      ['user_1003', '不能选择用户本人作为裂变上级'],
      ['user_1004', '不能选择自己的裂变下级作为裂变上级'],
      ['user_1009', '不能选择已封禁用户作为裂变上级'],
      ['user_1001', '新裂变上级不能与当前裂变上级相同']
    ]) {
      assert.throws(
        () => resetParent({ userId: 'user_1003', parentId, reason: '无效调整' }),
        new RegExp(message)
      )
    }
    assert.deepEqual(getUser('user_1003'), before)
    assert.equal(getRelationshipAuditLog().length, 0)
  } finally {
    restoreUser(before)
    restoreUser(candidateBefore)
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
