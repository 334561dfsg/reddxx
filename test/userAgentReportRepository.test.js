import test from 'node:test'
import assert from 'node:assert/strict'
import { getUserAgentReport } from '../src/admin/repositories/userAgentReportRepository.js'

const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0)

test('builds a complete descending agent report with product totals', () => {
  const report = getUserAgentReport('user_1001')
  const expectedProductLines = [
    ['deposit', '充值'],
    ['perpetual', '永续合约'],
    ['delivery', '交割合约'],
    ['spot', '现货'],
    ['aiQuant', 'AI 量化'],
    ['portfolio', '投资组合'],
    ['lending', '理财产品'],
    ['borrowing', '借贷产品']
  ]

  assert.deepEqual(Object.keys(report).sort(), ['dailyRows', 'productLines', 'summary', 'userId'])
  assert.deepEqual(Object.keys(report.summary).sort(), [
    'activeClientCount',
    'directClientCount',
    'totalCommission',
    'totalVolume'
  ])
  assert.equal(report.userId, 'user_1001')
  assert.ok(report.dailyRows.length >= 21)
  assert.ok(report.dailyRows.every((row, index, rows) => (
    index === 0 || row.date < rows[index - 1].date
  )))
  assert.ok(report.dailyRows.every((row) => (
    JSON.stringify(Object.keys(row).sort()) === JSON.stringify([
      'activeClients',
      'commission',
      'date',
      'newClients',
      'orderCount',
      'volume'
    ])
  )))
  assert.deepEqual(report.productLines.map(({ key, label }) => [key, label]), expectedProductLines)
  for (const row of report.productLines) {
    assert.deepEqual(Object.keys(row).sort(), ['commission', 'key', 'label', 'orderCount', 'volume'])
    assert.equal(Number.isFinite(row.volume), true)
    assert.equal(Number.isFinite(row.commission), true)
    assert.equal(Number.isInteger(row.orderCount), true)
  }
  assert.equal(report.summary.totalVolume, sum(report.productLines, 'volume'))
  assert.equal(report.summary.totalCommission, sum(report.productLines, 'commission'))
})

test('isolates deterministic reports by user ID', () => {
  const first = getUserAgentReport('user_1001')
  const second = getUserAgentReport('user_1002')

  assert.notDeepEqual(first, second)
  assert.deepEqual(getUserAgentReport('user_1001'), first)
})

test('returns detached report copies', () => {
  const report = getUserAgentReport('user_1001')
  report.summary.totalVolume = -1
  report.productLines[0].label = '已修改'
  report.dailyRows[0].volume = -1

  const nextReport = getUserAgentReport('user_1001')
  assert.notEqual(nextReport.summary.totalVolume, -1)
  assert.notEqual(nextReport.productLines[0].label, '已修改')
  assert.notEqual(nextReport.dailyRows[0].volume, -1)
})

test('requires a non-empty user ID', () => {
  for (const userId of [undefined, null, '', '   ']) {
    assert.throws(() => getUserAgentReport(userId), { message: '用户 ID 必填' })
  }
})
