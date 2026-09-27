import test from 'node:test'
import assert from 'node:assert/strict'
import * as reportApi from '../src/features/user-staff/userDepositReport.js'

const filters = { startDate: '2026-09-01', endDate: '2026-09-30' }
const users = [
  { id: 'a1', role: 'agent', username: '代理', email: 'agent@example.com' },
  { id: 's1', role: 'user', isSalesperson: true, agentParentId: 'a1', username: '业务员', email: 'sales@example.com' },
  { id: 'c1', role: 'user', username: '客户', agentParentId: 'a1', employeeId: 's1' },
  { id: 'c2', role: 'user', username: '无充值用户' }
]
const orders = [
  { id: 'd1', userId: 'c1', submitTime: '2026-08-31T16:00:00Z', coin: 'BTC', amount: 0.00012345, usdtValue: 12.10, status: 'credited', creditedTime: '2026-09-01T02:00:00Z' },
  { id: 'd2', userId: 'c1', submitTime: '2026-09-30T15:59:59Z', coin: 'USDT', amount: 200.01, usdtValue: 200.01, status: 'review' },
  { id: 'd3', userId: 'c1', submitTime: '2026-09-15T04:00:00Z', coin: 'USDT', amount: 3, usdtValue: 3, status: 'rejected' },
  { id: 'before', userId: 'c1', submitTime: '2026-08-31T15:59:59Z', coin: 'USDT', amount: 1, status: 'credited' },
  { id: 'after', userId: 'c1', submitTime: '2026-09-30T16:00:00Z', coin: 'USDT', amount: 1, status: 'credited' }
]
const build = (extra = {}, list = orders) => reportApi.buildUserDepositReport(users, list, { ...filters, ...extra })

test('each recharge is a separate row, including pending/rejected, with no synthetic zero-activity row', () => {
  assert.equal(typeof reportApi.buildUserDepositReport, 'function')
  const result = build()
  assert.deepEqual(result.rows.map(row => row.orderId), ['d2', 'd3', 'd1'])
  assert.deepEqual(result.rows.map(row => row.userId), ['c1', 'c1', 'c1'])
  assert.equal(result.rows[2].amount, 0.00012345)
  assert.equal(result.rows[2].coin, 'BTC')
  assert.equal(result.rows[2].agentEmail, 'agent@example.com')
  assert.equal(result.rows[2].employeeEmail, 'sales@example.com')
})

test('agent, salesperson and keyword filters intersect on current customer ownership', () => {
  assert.equal(build({ agentId: 'a1', employeeId: 's1', keyword: ' C1 ' }).rows.length, 3)
  assert.equal(build({ employeeId: 's1', keyword: '客户' }).rows.length, 3)
  assert.equal(build({ agentId: 'unassigned' }).rows.length, 0)
  assert.equal(build({ keyword: '无充值用户' }).rows.length, 0)
})

test('invalid dates and stale selections fail explicitly', () => {
  for (const extra of [{ startDate: '' }, { startDate: '2026-02-30' }, { startDate: '2026-10-01' }, { agentId: 'missing' }, { employeeId: 'missing' }, { agentId: 'unassigned', employeeId: 's1' }]) {
    assert.throws(() => build(extra), /日期|代理|业务员/)
  }
})

test('missing user profiles do not remove existing recharge orders', () => {
  const result = build({}, [{ ...orders[0], userId: 'archived', username: '历史用户' }])
  assert.equal(result.rows[0].userId, 'archived')
  assert.equal(result.rows[0].nickname, '历史用户')
})

test('CSV exports all individual orders, preserves crypto precision and neutralizes formula text', () => {
  const result = build()
  result.rows[0].nickname = '=1+1'
  const csv = reportApi.userDepositCsv(result)
  assert.ok(csv.startsWith('\ufeff'))
  assert.ok(csv.includes('用户充值报表'))
  assert.ok(csv.includes('全部 3 笔充值'))
  assert.ok(csv.includes('"d1"') && csv.includes('"d2"') && csv.includes('"d3"'))
  assert.ok(csv.includes('0.00012345'))
  assert.ok(csv.includes('"\'=1+1"'))
  assert.ok(csv.includes('已入账') && csv.includes('待确认') && csv.includes('已驳回'))
  assert.ok(!csv.includes('交易金额'))
})

test('default range includes 30 dates in UTC+8', () => {
  assert.deepEqual(reportApi.defaultUserReportFilters(new Date('2026-09-30T16:30:00Z')), {
    startDate: '2026-09-02', endDate: '2026-10-01', agentId: '', employeeId: '', keyword: ''
  })
})
