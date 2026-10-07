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
  { id: 'd2', userId: 'c1', submitTime: '2026-09-30T15:59:59Z', coin: 'USDT', amount: 200.01, usdtValue: 200.01, status: 'credited' },
  { id: 'pending', userId: 'c1', submitTime: '2026-09-15T04:00:00Z', coin: 'USDT', amount: 5, status: 'review' },
  { id: 'd3', userId: 'c1', submitTime: '2026-09-15T04:00:00Z', coin: 'USDT', amount: 3, usdtValue: 3, status: 'rejected' },
  { id: 'before', userId: 'c1', submitTime: '2026-08-31T15:59:59Z', coin: 'USDT', amount: 1, status: 'credited' },
  { id: 'after', userId: 'c1', submitTime: '2026-09-30T16:00:00Z', coin: 'USDT', amount: 1, status: 'credited' }
]
const build = (extra = {}, list = orders) => reportApi.buildUserDepositReport(users, list, { ...filters, ...extra })

test('type totals use all filtered approved rows and distinguish missing USDT valuations', () => {
  const deposits = Array.from({ length: 15 }, (_, i) => ({ ...orders[0], id: `sum-${i}`, usdtValue: 10 }))
  deposits.push(
    { ...orders[0], id: 'sales', userId: 's1', amount: 1000, usdtValue: 25.5 },
    { ...orders[0], id: 'agent', userId: 'a1', usdtValue: null },
    { ...orders[0], id: 'unknown', userId: 'archived', usdtValue: 5 },
    { ...orders[0], id: 'pending-sum', status: 'review', usdtValue: 999 },
    { ...orders[0], id: 'old-sum', submitTime: '2020-01-01', usdtValue: 999 }
  )
  const totals = build({}, deposits).typeTotals
  assert.deepEqual(totals.map(({ userType, totalUsdt, missingCount }) => ({ userType, totalUsdt, missingCount })), [
    { userType: 'user', totalUsdt: 150, missingCount: 0 },
    { userType: 'salesperson', totalUsdt: 25.5, missingCount: 0 },
    { userType: 'agent', totalUsdt: null, missingCount: 1 },
    { userType: 'unknown', totalUsdt: 5, missingCount: 0 }
  ])
  assert.deepEqual(build({ userType: 'salesperson' }, deposits).typeTotals.map(item => item.totalUsdt), [0, 25.5, 0])
  assert.deepEqual(build({ keyword: 'no-match' }, deposits).typeTotals.map(item => item.totalUsdt), [0, 0, 0])
  const partial = build({}, [...deposits, { ...orders[0], id: 'missing', usdtValue: null }]).typeTotals[0]
  assert.equal(partial.totalUsdt, 150)
  assert.equal(partial.missingCount, 1)
})

test('each recharge is a separate row, only approved orders, with no synthetic zero-activity row', () => {
  assert.equal(typeof reportApi.buildUserDepositReport, 'function')
  const result = build()
  assert.deepEqual(result.rows.map(row => row.orderId), ['d2', 'd1'])
  assert.deepEqual(result.rows.map(row => row.userId), ['c1', 'c1'])
  assert.equal(result.rows[1].amount, 0.00012345)
  assert.equal(result.rows[1].coin, 'BTC')
  assert.equal(result.rows[1].agentEmail, 'agent@example.com')
  assert.equal(result.rows[1].employeeEmail, 'sales@example.com')
})

test('agent, salesperson and keyword filters intersect on current customer ownership', () => {
  assert.equal(build({ agentId: 'a1', employeeId: 's1', keyword: ' C1 ' }).rows.length, 2)
  assert.equal(build({ employeeId: 's1', keyword: '客户' }).rows.length, 2)
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
  assert.ok(csv.includes('全部 2 笔充值'))
  assert.ok(csv.includes('"d1"') && csv.includes('"d2"'))
  assert.ok(csv.includes('0.00012345'))
  assert.ok(csv.includes('"\'=1+1"'))
  assert.ok(csv.includes('审核成功'))
  assert.ok(!csv.includes('待确认') && !csv.includes('已驳回'))
  assert.ok(!csv.includes('"pending"') && !csv.includes('"d3"'))
  assert.ok(!csv.includes('交易金额'))
})

test('default range includes 30 dates in UTC+8', () => {
  assert.deepEqual(reportApi.defaultUserReportFilters(new Date('2026-09-30T16:30:00Z')), {
    startDate: '2026-09-02', endDate: '2026-10-01', agentId: '', employeeId: '', keyword: '', userType: ''
  })
})

test('type filters classify the depositor, not their owner, and preserve unknown profiles', () => {
  const profiles = [...users, { id: 'both', role: 'agent', isSalesperson: true }, { id: 'other', role: 'future' }]
  const deposits = ['c1', 's1', 'a1', 'both', 'archived', 'other'].map((userId, index) => ({ ...orders[0], id: `type-${index}`, userId }))
  const query = extra => reportApi.buildUserDepositReport(profiles, deposits, { ...filters, ...extra })
  assert.deepEqual(query({}).rows.map(row => row.userType), ['user', 'salesperson', 'agent', 'agent', 'unknown', 'unknown'])
  for (const [userType, ids] of [['user', ['c1']], ['salesperson', ['s1']], ['agent', ['a1', 'both']]]) {
    assert.deepEqual(query({ userType }).rows.map(row => row.userId), ids)
  }
  assert.equal(query({ userType: 'user', agentId: 'a1', employeeId: 's1', keyword: '客户' }).rows.length, 1)
  assert.equal(query({ userType: 'salesperson', employeeId: 's1' }).rows.length, 0)
  assert.throws(() => query({ userType: 'invalid' }), /用户类型/)
  const report = query({ userType: 'salesperson' })
  assert.equal(report.userTypeLabel, '业务员')
  assert.match(reportApi.userDepositCsv(report), /"用户类型","业务员"/)
  assert.match(reportApi.userDepositCsv(report), /"s1","业务员"/)
})
