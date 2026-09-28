import test from 'node:test'
import assert from 'node:assert/strict'
import { createDepositExportTasks } from '../src/features/user-staff/depositExportTasks.js'
const report = () => ({ filters: { startDate: '2026-09-01', endDate: '2026-09-28' }, rows: [{ orderId: '1', amount: 12 }], agentLabel: '全部代理', employeeLabel: '全部业务员' })
test('exports a frozen snapshot asynchronously, deduplicates running tasks and retains completed downloads', () => {
  const queue = []
  const service = createDepositExportTasks({ schedule: fn => queue.push(fn), generate: value => String(value.rows[0].amount) })
  const input = report()
  const id = service.create(input)
  assert.equal(service.create(input), id)
  assert.equal(service.list()[0].status, 'running')
  assert.throws(() => service.download(id))
  input.rows[0].amount = 99
  queue.shift()()
  assert.equal(service.list()[0].status, 'succeeded')
  assert.equal(service.download(id).csv, '12')
  assert.equal(service.download(id).csv, '12')
})
test('restores pending tasks after refresh and retries failed generation', () => {
  let saved
  const storage = { getItem: () => saved, setItem: (_, value) => { saved = value } }
  createDepositExportTasks({ storage, schedule: () => {} }).create(report())
  const queue = []
  let fail = true
  const service = createDepositExportTasks({ storage, schedule: fn => queue.push(fn), generate: () => { if (fail) throw new Error('failed'); return 'csv' } })
  const id = service.list()[0].id
  queue.shift()()
  assert.equal(service.list()[0].status, 'failed')
  fail = false
  service.retry(id)
  service.retry(id)
  assert.equal(queue.length, 1)
  queue.shift()()
  assert.equal(service.download(id).csv, 'csv')
  assert.equal(createDepositExportTasks({ storage }).download(id).csv, 'csv')
})
test('storage failure does not leave an unaccepted task', () => {
  const service = createDepositExportTasks({ storage: { setItem() { throw new Error('quota') } } })
  assert.throws(() => service.create(report()), /任务保存失败/)
  assert.equal(service.list().length, 0)
})
