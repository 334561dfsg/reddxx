import test from 'node:test'
import assert from 'node:assert/strict'
import { getUserAgentSubordinates } from '../src/admin/repositories/userAgentSubordinateRepository.js'

test('builds complete first-level agent subordinate records', () => {
  const rows = getUserAgentSubordinates('user_1001')

  assert.ok(rows.length >= 21)
  assert.deepEqual(Object.keys(rows[0]).sort(), [
    'commissionContribution',
    'id',
    'registeredAt',
    'status',
    'totalVolume',
    'uid',
    'username'
  ])
  assert.ok(rows.every((row) => ['active', 'suspended', 'banned'].includes(row.status)))
  assert.ok(rows.every((row) => Number.isFinite(row.totalVolume) && row.totalVolume >= 0))
  assert.ok(rows.every((row) => Number.isFinite(row.commissionContribution) && row.commissionContribution >= 0))
})

test('isolates deterministic subordinate lists by agent ID', () => {
  const first = getUserAgentSubordinates('user_1001')

  assert.deepEqual(getUserAgentSubordinates('user_1001'), first)
  assert.notDeepEqual(getUserAgentSubordinates('user_1002'), first)
})

test('returns detached subordinate copies', () => {
  const rows = getUserAgentSubordinates('user_1001')
  rows[0].username = 'changed'

  assert.notEqual(getUserAgentSubordinates('user_1001')[0].username, 'changed')
})

test('requires a non-empty agent user ID', () => {
  for (const userId of [undefined, null, '', '   ']) {
    assert.throws(() => getUserAgentSubordinates(userId), { message: '用户 ID 必填' })
  }
})
