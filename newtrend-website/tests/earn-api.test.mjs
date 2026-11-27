import test from 'node:test'
import assert from 'node:assert/strict'
import {effectScope, nextTick, ref} from 'vue'
import {ApiError, configureMock, mockCall} from '../src/api/transport.js'
import {createEarnApi} from '../src/api/earnService.js'
import {earnProductFacts} from '../src/mock/catalog.js'
import {earnPortfolios} from '../src/server/earnPortfolio.js'
import {balanceOf} from '../src/mock/ledger.js'
import {invalidate, useMutation, useRequest} from '../src/composables/useRequest.js'

const {getEarnHolding, getEarnPortfolio, getEarnProduct, getEarnSubscriptionContext, listEarnProducts, redeemEarn, subscribeEarn} = createEarnApi(earnProductFacts)
const flush = () => new Promise(resolve => setTimeout(resolve, 0))
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return {promise, resolve, reject} }

test('transport: injected failure, coded errors and latency', async () => {
  const previous = configureMock({delay: 0, fail: ['earn']})
  try {
    await assert.rejects(listEarnProducts(), error => error instanceof ApiError && error.code === 'network')
    configureMock({fail: []})
    await assert.rejects(mockCall('x', () => { throw Object.assign(new Error('minAmount'), {code: 'minAmount', amount: 10}) }),
      error => error.code === 'minAmount' && error.params.amount === 10)
    configureMock({delay: 30})
    const started = Date.now()
    await mockCall('x', () => 1)
    assert.ok(Date.now() - started >= 25, 'latency applied')
  } finally { configureMock(previous) }
})

test('earn API returns snapshots that cannot mutate mock state', async () => {
  const portfolio = await getEarnPortfolio('real')
  const holding = portfolio.holdings[0]
  assert.ok(holding.product?.id, 'rows carry their catalogue product')
  holding.principal = -1
  assert.notEqual(earnPortfolios.real.holdings[0].principal, -1)
  assert.ok(portfolio.holdings.every(row => row.status !== 'redeemed'))
  assert.equal(typeof portfolio.summary.total, 'number')
  await assert.rejects(getEarnProduct('nope'), {code: 'notFound'})
  await assert.rejects(getEarnHolding('nope', 'real'), {code: 'notFound'})
})

test('subscribe goes through validation and leaves a pending order; redeem is idempotent by request id', async () => {
  const product = await getEarnProduct('usdt')
  await assert.rejects(subscribeEarn({productId: 'usdt', amount: 0, mode: 'demo'}), {code: 'invalidAmount'})
  const before = await getEarnSubscriptionContext('usdt', 'demo')
  const order = await subscribeEarn({productId: product.id, amount: product.min, mode: 'demo'})
  assert.equal(order.status, 'pending_review')
  const after = await getEarnSubscriptionContext('usdt', 'demo')
  assert.equal(after.balance, before.balance - product.min)
  assert.equal(after.committed, before.committed + product.min)

  const flexible = earnPortfolios.demo.holdings.find(row => row.productId === 'usdt' && row.status === 'active')
  const balance = balanceOf('demo', 'USDT')
  const args = {holdingId: flexible.id, amount: 1, requestId: 'redeem-test-1', mode: 'demo'}
  const first = await redeemEarn(args)
  const repeat = await redeemEarn(args)
  assert.equal(repeat.id, first.id)
  assert.equal(balanceOf('demo', 'USDT'), balance + 1 + first.reward, 'credited exactly once')
  await assert.rejects(redeemEarn({...args, requestId: 'redeem-test-2', amount: flexible.principal + 1}), {code: 'exceedsPrincipal'})
})

test('useRequest: loading → ready, key change resets, stale responses are ignored, invalidation refreshes in place', async () => {
  const key = ref('a'), calls = []
  const scope = effectScope()
  const request = scope.run(() => useRequest(() => { const d = deferred(); calls.push(d); return d.promise }, {key: () => key.value, tags: ['t']}))
  assert.equal(request.status.value, 'loading')
  calls[0].resolve('A')
  await flush()
  assert.equal(request.status.value, 'ready')
  assert.equal(request.data.value, 'A')

  invalidate('t')
  assert.equal(request.refreshing.value, true)
  assert.equal(request.status.value, 'ready', 'refresh keeps data on screen')
  calls[1].resolve('A2')
  await flush()
  assert.equal(request.data.value, 'A2')

  key.value = 'b'
  await nextTick()
  assert.equal(request.status.value, 'loading', 'key change drops the old data')
  key.value = 'c'
  await nextTick()
  calls[3].resolve('C')
  calls[2].resolve('B (stale)')
  await flush()
  assert.equal(request.data.value, 'C')

  invalidate('t')
  calls[4].reject(new ApiError('network'))
  await flush()
  assert.equal(request.status.value, 'ready', 'a failed refresh keeps the previous data')
  assert.equal(request.error.value.code, 'network')

  scope.stop()
  invalidate('t')
  assert.equal(calls.length, 5, 'disposed requests stop listening')
})

test('useRequest: first-load failure reports error status and retry recovers', async () => {
  let attempt = 0
  const scope = effectScope()
  const request = scope.run(() => useRequest(async () => { if (attempt++ === 0) throw new ApiError('network'); return 'ok' }))
  await flush()
  assert.equal(request.status.value, 'error')
  await request.refresh()
  assert.equal(request.status.value, 'ready')
  scope.stop()
})

test('useMutation ignores a repeat call while pending', async () => {
  const gate = deferred()
  let count = 0
  const scope = effectScope()
  const mutation = scope.run(() => useMutation(() => { count++; return gate.promise }))
  const first = mutation.run()
  assert.equal(mutation.pending.value, true)
  assert.equal(await mutation.run(), undefined)
  gate.resolve('done')
  assert.equal(await first, 'done')
  assert.equal(count, 1)
  assert.equal(mutation.pending.value, false)
  scope.stop()
})
