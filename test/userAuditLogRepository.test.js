import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import {
  appendUserAuditLog,
  createUserAuditDiff,
  queryUserAuditLogs,
  resetUserAuditLogsForTests
} from '../src/admin/repositories/userAuditLogRepository.js'
import {
  USER_AUDIT_ACTIONS,
  USER_AUDIT_CATEGORIES,
  USER_AUDIT_RESULTS,
  USER_AUDIT_SOURCES
} from '../src/admin/constants/userAuditLog.js'

describe('user operation audit log repository', () => {
  beforeEach(() => resetUserAuditLogsForTests())

  it('requires a reason for manual admin changes', () => {
    assert.throws(() => appendUserAuditLog({
      targetUser: { uid: 'user_1001', name: 'Alice' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'profile',
      action: 'profile.update',
      result: 'success',
      before: { nickname: 'A' },
      after: { nickname: 'B' }
    }), /操作原因/)
  })

  it('creates normalized append-only records with changed-field diffs', () => {
    const diff = createUserAuditDiff(
      { nickname: 'Alice', phone: '13800138000' },
      { nickname: 'Alice Chen', phone: '13800138000' },
      ['nickname', 'phone']
    )
    assert.deepEqual(diff, [{ field: 'nickname', before: 'Alice', after: 'Alice Chen' }])

    const record = appendUserAuditLog({
      targetUser: { uid: 'user_1001', name: 'Alice', email: 'alice@example.com' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'profile',
      action: 'profile.update',
      result: 'success',
      reason: '用户提交实名资料修正',
      before: { nickname: 'Alice', phone: '13800138000' },
      after: { nickname: 'Alice Chen', phone: '13800138000' },
      related: { requestId: 'REQ-1' }
    })

    assert.equal(record.targetUser.uid, 'user_1001')
    assert.equal(record.diff.length, 1)
    assert.equal(record.diff[0].field, 'nickname')
    assert.equal(record.related.requestId, 'REQ-1')
    assert.throws(() => { record.diff.push({ field: 'x' }) }, TypeError)
  })

  it('filters and paginates newest first with a stable id tie-breaker', () => {
    appendUserAuditLog({
      id: 'AUD-2',
      occurredAt: '2026-07-27T09:00:00.000Z',
      targetUser: { uid: 'user_2001', name: 'Bob' },
      source: 'admin',
      operator: { id: 'risk_admin', name: '风控管理员' },
      category: 'risk',
      action: 'risk.control.apply',
      result: 'success',
      reason: '用户点控复核通过',
      before: { riskLevel: 'low' },
      after: { riskLevel: 'medium' },
      related: { businessId: 'CTRL-1' }
    })
    appendUserAuditLog({
      id: 'AUD-3',
      occurredAt: '2026-07-27T09:00:00.000Z',
      targetUser: { uid: 'user_1001', name: 'Alice' },
      source: 'admin',
      operator: { id: 'admin_current', name: '当前管理员' },
      category: 'funds',
      action: 'funds.freeze',
      result: 'success',
      reason: '异常出金复核',
      before: { frozenUsdt: '0' },
      after: { frozenUsdt: '100' },
      related: { businessId: 'FUNDS-1' }
    })

    const result = queryUserAuditLogs({
      filters: {
        keyword: 'user_1001',
        operatorKeyword: '管理员',
        category: 'funds',
        reasonKeyword: '复核',
        relatedKeyword: 'FUNDS',
        result: 'success'
      },
      page: 1,
      pageSize: 20
    })

    assert.equal(result.total, 1)
    assert.equal(result.rows[0].id, 'AUD-3')
  })

  it('seed data does not invent unavailable login risk rules', () => {
    resetUserAuditLogsForTests({ seed: true })

    const result = queryUserAuditLogs({ page: 1, pageSize: 50 })

    assert.equal(result.rows.some((row) => row.source === 'risk-rule'), false)
    assert.equal(result.rows.some((row) => /异地登录|登录风控规则/.test(`${row.operator.name}${row.reason}`)), false)
  })

  it('seed data covers current user mutation capabilities', () => {
    resetUserAuditLogsForTests({ seed: true })

    const result = queryUserAuditLogs({ page: 1, pageSize: 100 })
    const actions = new Set(result.rows.map((row) => row.action))

    for (const action of USER_AUDIT_ACTIONS.map((row) => row.value)) {
      assert.equal(actions.has(action), true, action)
    }
  })

  it('seed data covers all audit facets and result states for query testing', () => {
    resetUserAuditLogsForTests({ seed: true })

    const result = queryUserAuditLogs({ page: 1, pageSize: 100 })
    const valuesFor = (field) => new Set(result.rows.map((row) => row[field]))

    assert.ok(result.total >= 40)
    for (const category of USER_AUDIT_CATEGORIES.map((row) => row.value)) {
      assert.equal(valuesFor('category').has(category), true, category)
    }
    for (const source of USER_AUDIT_SOURCES.map((row) => row.value)) {
      assert.equal(valuesFor('source').has(source), true, source)
    }
    for (const resultState of USER_AUDIT_RESULTS.map((row) => row.value)) {
      assert.equal(valuesFor('result').has(resultState), true, resultState)
    }
  })
})
