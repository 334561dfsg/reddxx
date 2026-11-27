import test from 'node:test'
import assert from 'node:assert/strict'
import {effectScope} from 'vue'
import {configureMock} from '../src/api/transport.js'
import {changeStrategyStatus, getMyStrategies, subscribeStrategy} from '../src/api/strategy.js'
import {strategyAccounts} from '../src/server/strategyPortfolio.js'
import {enrichStrategies} from '../src/utils/strategyTemplates.js'
import {strategies} from '../src/mock/catalog.js'
import {useRequest} from '../src/composables/useRequest.js'

const DEMO = 'common.demo.demo'
const product = enrichStrategies(strategies)[0]
const flush = ms => new Promise(resolve => setTimeout(resolve, ms))

test('demo account reads are snapshots', async () => {
  const account = await getMyStrategies(DEMO)
  assert.ok(account.records.length > 0)
  account.records[0].capital = -1
  assert.notEqual(strategyAccounts.demo.records[0].capital, -1)
})

test('demo subscribe validates, reserves capital and is idempotent per request id', async () => {
  const before = (await getMyStrategies(DEMO)).balance
  await assert.rejects(subscribeStrategy({mode: DEMO, product, draft: {capital: '', days: product.minDays, takeProfit: 10, stopLoss: 5}, requestId: 'x'}), {code: 'capitalRequired'})
  const draft = {capital: product.min, days: product.minDays, takeProfit: product.takeProfitRange?.default ?? 10, stopLoss: product.stopLossRange?.default ?? 5}
  const record = await subscribeStrategy({mode: DEMO, product, draft, requestId: 'strategy-api-1'})
  assert.equal(record.status, 'running')
  assert.equal((await getMyStrategies(DEMO)).balance, before - product.min)
  assert.equal((await subscribeStrategy({mode: DEMO, product, draft, requestId: 'strategy-api-1'})).id, record.id)
})

test('status changes are guarded; stop returns capital plus P&L', async () => {
  const {records} = await getMyStrategies(DEMO)
  const running = records.find(record => record.status === 'running')
  await changeStrategyStatus({mode: DEMO, record: running, kind: 'pause'})
  await assert.rejects(changeStrategyStatus({mode: DEMO, record: running, kind: 'pause'}), {code: 'conflict'})
  const balance = (await getMyStrategies(DEMO)).balance
  await changeStrategyStatus({mode: DEMO, record: running, kind: 'stop'})
  const after = await getMyStrategies(DEMO)
  assert.equal(after.records.find(record => record.id === running.id).status, 'completed')
  assert.equal(after.balance, Number((balance + running.capital + running.pnl).toFixed(8)))
})

test('an injected outage rejects with network', async () => {
  const previous = configureMock({fail: ['strategy']})
  try { await assert.rejects(getMyStrategies(DEMO), {code: 'network'}) } finally { configureMock(previous) }
})

test('useRequest poll refreshes in the background and stops on dispose', async () => {
  let calls = 0
  const scope = effectScope()
  const request = scope.run(() => useRequest(async () => ++calls, {poll: 20}))
  await flush(70)
  assert.ok(calls >= 3, `polled ${calls} times`)
  assert.equal(request.status.value, 'ready')
  scope.stop()
  const settled = calls
  await flush(60)
  assert.equal(calls, settled)
})
