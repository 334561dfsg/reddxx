import test from 'node:test'
import assert from 'node:assert/strict'
import {transact, advance, validateTemplate, money, DAY, INIT_MS, LIVE} from '../src/shared/strategy/domain.js'
import {seedStrategy} from '../src/shared/strategy/seed.js'

const T0 = Date.parse('2026-11-20T00:00:00Z')
let n = 0
const id = () => `req-${++n}`
const run = (s, action, args = {}, now = T0) => transact(s, action, {requestId: id(), ...args}, now)
const fresh = (patch = {}) => {
  const s = seedStrategy(T0)
  s.policy = {...s.policy, ...patch}
  return s
}
const sub = (s, i = 0) => s.subscriptions[i]
const order = {templateId: 'STG-002', userId: 'USR-DEMO', capital: 1000, days: 10, takeProfit: 20, stopLoss: 10}

test('seed: templates are valid, P&L rows add up and balances are not negative', () => {
  const s = seedStrategy(T0)
  for (const t of s.templates) assert.doesNotThrow(() => validateTemplate(t), t.name)
  for (const x of s.subscriptions.filter(x => ['running', 'paused', 'completed'].includes(x.status))) {
    const total = s.dailyPnl.filter(r => r.subscriptionId === x.subscriptionId).reduce((a, r) => a + r.pnl, 0)
    assert.equal(money(total), x.pnl, x.subscriptionId)
  }
  assert.ok(Object.values(s.balances).every(w => w.USDT >= 0))
  assert.equal(s.subscriptions.filter(x => x.status === 'pending_review').every(x => !x.endAt && !x.runningAt), true)
})

test('subscription waits for review, then initialises and runs on the clock', () => {
  let s = fresh()
  const balance = s.balances['USR-DEMO'].USDT
  s = run(s, 'subscribe', order)
  assert.equal(sub(s).status, 'pending_review')
  assert.equal(sub(s).endAt, null)
  assert.equal(s.balances['USR-DEMO'].USDT, balance - 1000)
  const reqId = id()
  s = transact(s, 'approve', {requestId: reqId, subscriptionId: sub(s).subscriptionId}, T0 + 1000)
  assert.throws(() => transact(s, 'approve', {requestId: reqId, subscriptionId: sub(s).subscriptionId}, T0 + 2000), /duplicate/)
  assert.throws(() => run(s, 'approve', {subscriptionId: sub(s).subscriptionId}), /status/)
  assert.equal(sub(s).status, 'initializing')
  assert.equal(sub(s).reviewer, '管理员（模拟）')
  assert.equal(sub(s).endAt, T0 + 1000 + 10 * DAY)
  advance(s, T0 + 1000 + INIT_MS)
  assert.equal(sub(s).status, 'running')
  advance(s, T0 + 1000 + INIT_MS + 3 * DAY)
  const rows = s.dailyPnl.filter(r => r.subscriptionId === sub(s).subscriptionId)
  assert.ok(rows.length <= 3)
  assert.equal(money(rows.reduce((a, r) => a + r.pnl, 0)), sub(s).pnl)
  const range = sub(s).templateSnapshot.dailyReturn
  for (const r of rows) assert.ok(r.pnl >= money(1000 * range.min / 100) && r.pnl <= money(1000 * range.max / 100))
  const again = structuredClone(s); advance(again, T0 + 1000 + INIT_MS + 3 * DAY)
  assert.deepEqual(again.dailyPnl, s.dailyPnl, 'advance is idempotent')
})

test('rejection returns the capital and keeps the record', () => {
  let s = fresh()
  const balance = s.balances['USR-DEMO'].USDT
  s = run(s, 'subscribe', order)
  s = run(s, 'reject', {subscriptionId: sub(s).subscriptionId})
  assert.equal(sub(s).status, 'rejected')
  assert.equal(s.balances['USR-DEMO'].USDT, balance)
})

test('review can be switched off: new subscriptions start initialising at once', () => {
  let s = fresh({reviewRequired: false})
  s = run(s, 'subscribe', order)
  assert.equal(sub(s).status, 'initializing')
  assert.equal(sub(s).policySnapshot.reviewRequired, false)
})

function withTemplate(range) {
  let s = fresh({reviewRequired: false})
  const t = s.templates.find(x => x.templateId === 'STG-002')
  t.dailyReturn = range
  t.tradeDayRatio = 1
  return run(s, 'subscribe', order)
}

test('take-profit and stop-loss settle automatically with principal plus P&L', () => {
  let s = withTemplate({min: 6, max: 7})
  const balance = s.balances['USR-DEMO'].USDT
  advance(s, T0 + INIT_MS + 5 * DAY)
  assert.equal(sub(s).status, 'completed')
  assert.equal(sub(s).endReason, 'take_profit')
  assert.ok(sub(s).pnl >= 200)
  assert.equal(s.balances['USR-DEMO'].USDT, money(balance + 1000 + sub(s).pnl))
  assert.equal(s.settlements[0].reason, 'take_profit')
  assert.equal(s.settlements[0].returned, money(1000 + sub(s).pnl))

  s = withTemplate({min: -6, max: -5})
  advance(s, T0 + INIT_MS + 5 * DAY)
  assert.equal(sub(s).endReason, 'stop_loss')
  assert.ok(sub(s).pnl <= -100)
})

test('expiry settles at the end date; disabled auto-settlement leaves it for the admin', () => {
  let s = withTemplate({min: 0.1, max: 0.2})
  advance(s, T0 + 30 * DAY)
  assert.equal(sub(s).endReason, 'expired')
  assert.equal(sub(s).stoppedAt, sub(s).endAt)
  assert.equal(s.dailyPnl.filter(r => r.subscriptionId === sub(s).subscriptionId).length, 9, 'no rows after the end date')

  s = fresh({reviewRequired: false, autoSettleOnExpiry: false})
  s = run(s, 'subscribe', order)
  advance(s, T0 + 30 * DAY)
  assert.equal(sub(s).status, 'running')
  s = run(s, 'forceStop', {subscriptionId: sub(s).subscriptionId}, T0 + 30 * DAY)
  assert.equal(sub(s).endReason, 'admin_stop')
})

test('pause stops generation, resume continues, stop settles; users act only on their own strategies', () => {
  let s = withTemplate({min: 0.1, max: 0.2})
  advance(s, T0 + INIT_MS)
  const subscriptionId = sub(s).subscriptionId
  s = run(s, 'pause', {subscriptionId, userId: 'USR-DEMO'}, T0 + INIT_MS)
  assert.throws(() => run(s, 'pause', {subscriptionId, userId: 'USR-DEMO'}, T0 + INIT_MS), /status/)
  assert.throws(() => run(s, 'stop', {subscriptionId, userId: 'USR-1002'}, T0 + INIT_MS), /owner/)
  advance(s, T0 + 3 * DAY)
  assert.equal(sub(s).pnl, 0)
  s = run(s, 'resume', {subscriptionId, userId: 'USR-DEMO'}, T0 + 3 * DAY)
  advance(s, T0 + 5 * DAY + 1)
  assert.ok(sub(s).pnl > 0)
  s = run(s, 'stop', {subscriptionId, userId: 'USR-DEMO'}, T0 + 5 * DAY + 1)
  assert.equal(sub(s).endReason, 'user_stop')
})

test('subscriptions keep their template snapshot; template edits are versioned and stale saves rejected', () => {
  let s = run(fresh(), 'subscribe', order)
  const template = structuredClone(s.templates.find(x => x.templateId === 'STG-002'))
  s = run(s, 'saveTemplate', {template: {...template, dailyReturn: {min: -9, max: 9}, maxCapital: 999999}, expectedVersion: template.version})
  assert.equal(s.templates.find(x => x.templateId === 'STG-002').version, template.version + 1)
  assert.deepEqual(sub(s).templateSnapshot.dailyReturn, template.dailyReturn)
  assert.throws(() => run(s, 'saveTemplate', {template, expectedVersion: template.version}), /stale/)
  assert.throws(() => run(s, 'subscribe', {...order, expectedVersion: template.version}), /templateChanged/)

  const created = run(s, 'saveTemplate', {template: {...template, templateId: undefined, name: 'New template'}})
  const added = created.templates.at(-1)
  assert.equal(added.status, 'unlisted')
  assert.throws(() => run(created, 'subscribe', {...order, templateId: added.templateId}), /template/)
  assert.throws(() => run(s, 'saveTemplate', {template: {...template, minCapital: 0}, expectedVersion: template.version + 1}), /templateCapital/)
})

test('listing is guarded by the expected status', () => {
  let s = fresh()
  s = run(s, 'setTemplateStatus', {templateId: 'STG-001', expectedStatus: 'listed'})
  assert.equal(s.templates[0].status, 'unlisted')
  assert.throws(() => run(s, 'setTemplateStatus', {templateId: 'STG-001', expectedStatus: 'listed'}), /stale/)
  assert.throws(() => run(s, 'subscribe', {...order, templateId: 'STG-001', capital: 1000, days: 14}), /template/)
})

test('limits: terms, balance, per-user count and capital, template capacity, eligibility', () => {
  const s = fresh()
  assert.throws(() => run(s, 'subscribe', {...order, capital: 10}), /capital/)
  assert.throws(() => run(s, 'subscribe', {...order, days: 1}), /days/)
  assert.throws(() => run(s, 'subscribe', {...order, takeProfit: 0}), /takeProfit/)
  assert.throws(() => run(s, 'subscribe', {...order, stopLoss: 80}), /stopLoss/)
  assert.throws(() => run(s, 'subscribe', {...order, capital: 50000}), /balance/)
  assert.throws(() => run({...s, policy: {...s.policy, maxRunningPerUser: 3}}, 'subscribe', order), /userLimit/)
  assert.throws(() => run({...s, policy: {...s.policy, maxCapitalPerUser: 3000}}, 'subscribe', order), /userCapital/)
  const full = structuredClone(s); full.templates.find(x => x.templateId === 'STG-002').capacity = 500
  assert.throws(() => run(full, 'subscribe', order), /capacity/)
  const vip = structuredClone(s); vip.templates.find(x => x.templateId === 'STG-002').minVipLevel = 5
  assert.throws(() => run(vip, 'subscribe', order), /vipRequired/)
})

test('P&L cannot be adjusted manually; policy saves are version-checked', () => {
  let s = fresh()
  const running = s.subscriptions.find(x => x.subscriptionId === 'seed-run-1004')
  assert.throws(() => run(s, 'adjustPnl', {subscriptionId: running.subscriptionId, amount: -12.5, note: '修正'}))
  assert.equal(s.subscriptions.find(x => x.subscriptionId === 'seed-run-1004').pnl, running.pnl)

  const policy = {...s.policy, reviewRequired: false}
  s = run(s, 'savePolicy', {policy, expectedPolicy: s.policy})
  assert.equal(s.policy.reviewRequired, false)
  assert.throws(() => run(s, 'savePolicy', {policy, expectedPolicy: {...policy, reviewRequired: true}}), /stale/)
  assert.throws(() => run(s, 'savePolicy', {policy: {...policy, maxRunningPerUser: 0}, expectedPolicy: s.policy}), /policy/)
  assert.equal(s.logs.filter(l => l.action === 'savePolicy').length, 1)
})

test('pending reviews count as live subscriptions for limits', () => {
  assert.ok(LIVE.includes('pending_review'))
})
