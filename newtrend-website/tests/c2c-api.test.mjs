import test from 'node:test'
import assert from 'node:assert/strict'
import {configureMock} from '../src/api/transport.js'
import {c2cErrorKey, cancelC2COrder, createC2COrder, getC2COrder, listC2COrders, listC2CQuotes} from '../src/api/c2c.js'
import {balanceOf} from '../src/mock/ledger.js'

const DEMO = 'common.demo.demo', REAL = 'common.demo.real'

test('quotes per side are snapshots', async () => {
  const buy = await listC2CQuotes('buy'), sell = await listC2CQuotes('sell')
  assert.ok(buy.length > 1)
  assert.deepEqual(sell.map(q => q.symbol), ['USDT'])
  buy[0].price = -1
  assert.notEqual((await listC2CQuotes('buy'))[0].price, -1)
})

test('sell locks balance in its mode, prices from the server quote, cancel refunds once', async () => {
  const before = balanceOf('demo', 'USDT')
  const order = await createC2COrder({mode: DEMO, side: 'sell', symbol: 'USDT', quantity: 3000, requestId: 'c2c-api-1'})
  assert.equal(order.status, 'pending_review')
  assert.equal(order.price, 0.99)
  assert.equal(balanceOf('demo', 'USDT'), before - 3000)
  await assert.rejects(createC2COrder({mode: DEMO, side: 'sell', symbol: 'USDT', quantity: 3000, requestId: 'c2c-api-1'}), {code: 'c2c.error.OTC_ORDER_NOT_OPERABLE'})
  assert.equal((await listC2COrders(DEMO)).length, 1)
  assert.ok(!(await listC2COrders(REAL)).some(o => o.id === order.id), 'orders are per mode')
  assert.equal((await getC2COrder(order.id, DEMO)).id, order.id)
  await assert.rejects(getC2COrder(order.id, REAL), {code: 'notFound'})
  await assert.rejects(cancelC2COrder({mode: REAL, id: order.id}), {code: 'notFound'})
  assert.equal((await cancelC2COrder({mode: DEMO, id: order.id})).status, 'cancelled')
  assert.equal(balanceOf('demo', 'USDT'), before)
  await assert.rejects(cancelC2COrder({mode: DEMO, id: order.id}), {code: 'c2c.error.OTC_ORDER_NOT_OPERABLE'})
  assert.equal(balanceOf('demo', 'USDT'), before)
})

test('buy waits for review; unknown symbols and out-of-range amounts are rejected', async () => {
  const order = await createC2COrder({mode: DEMO, side: 'buy', symbol: 'ETH', quantity: 2, requestId: 'c2c-api-2'})
  assert.equal(order.status, 'pending_review')
  await assert.rejects(createC2COrder({mode: DEMO, side: 'buy', symbol: 'ETH', quantity: 0.1, requestId: 'c2c-api-3'}), {code: 'c2c.error.OTC_LIMIT_EXCEEDED_SINGLE'})
  await assert.rejects(createC2COrder({mode: DEMO, side: 'sell', symbol: 'BTC', quantity: 1, requestId: 'c2c-api-4'}), {code: 'c2c.error.OTC_LIMIT_EXCEEDED_SINGLE'})
})

test('error keys and injected outage', async () => {
  assert.equal(c2cErrorKey({code: 'c2c.error.generic'}), 'c2c.error.generic')
  assert.equal(c2cErrorKey({code: 'network'}), 'common.requestFailed')
  const previous = configureMock({fail: ['c2c']})
  try { await assert.rejects(listC2COrders(DEMO), {code: 'network'}) } finally { configureMock(previous) }
})
