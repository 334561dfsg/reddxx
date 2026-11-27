import test from 'node:test'
import assert from 'node:assert/strict'
import {configureMock} from '../src/api/transport.js'
import {c2cErrorKey, cancelC2COrder, createC2COrder, getC2COrder, listC2COrders, listC2CQuotes} from '../src/api/c2c.js'
import {balanceOf} from '../src/mock/ledger.js'

const DEMO = 'common.demo.demo', REAL = 'common.demo.real'

const payer = {country: 'Hong Kong', name: 'Chan Tai Man', email: 'chan@example.com'}

test('quotes per side are snapshots', async () => {
  const buy = await listC2CQuotes('buy'), sell = await listC2CQuotes('sell')
  assert.ok(buy.length > 1)
  assert.deepEqual(sell.map(q => q.symbol), ['USDT', 'USDT'])
  buy[0].price = -1
  assert.notEqual((await listC2CQuotes('buy'))[0].price, -1)
})

test('sell locks balance in its mode, prices from the server quote, cancel refunds once', async () => {
  const before = balanceOf('demo', 'USDT')
  const order = await createC2COrder({mode: DEMO, side: 'sell', quoteId: 'USDT-USD', quantity: 3000, requestId: 'c2c-api-1', payer})
  assert.equal(order.status, 'pending_review')
  assert.equal(order.price, 0.9965)
  assert.equal(order.fiat, 'USD')
  assert.deepEqual(order.payer, payer)
  assert.equal(order.amount, 2989.5)
  assert.equal(balanceOf('demo', 'USDT'), before - 3000)
  // A retry with the same requestId returns the same order and locks nothing more.
  const again = await createC2COrder({mode: DEMO, side: 'sell', quoteId: 'USDT-USD', quantity: 3000, requestId: 'c2c-api-1', payer})
  assert.equal(again.id, order.id)
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

test('buy waits for review in the quote fiat; unknown quotes and out-of-range amounts are rejected', async () => {
  const order = await createC2COrder({mode: DEMO, side: 'buy', quoteId: 'ETH-USD', quantity: 2, requestId: 'c2c-api-2', payer})
  assert.equal(order.status, 'pending_review')
  assert.equal(order.amount, 3313.26)
  await assert.rejects(createC2COrder({mode: DEMO, side: 'buy', quoteId: 'ETH-USD', quantity: 0.01, requestId: 'c2c-api-3', payer}), {code: 'c2c.error.OTC_LIMIT_EXCEEDED_SINGLE'})
  await assert.rejects(createC2COrder({mode: DEMO, side: 'sell', quoteId: 'BTC-USD', quantity: 1, requestId: 'c2c-api-4', payer}), {code: 'c2c.error.OTC_LIMIT_EXCEEDED_SINGLE'})
})

test('quotes are per coin and fiat with unique ids, matching the admin seed', async () => {
  const buy = await listC2CQuotes('buy'), sell = await listC2CQuotes('sell')
  assert.deepEqual(buy.map(q => q.id), ['USDT-USD', 'USDT-EUR', 'BTC-USD', 'ETH-USD', 'USDC-USD', 'SOL-USD'])
  assert.deepEqual(sell.map(q => [q.id, q.price]), [['USDT-USD', 0.9965], ['USDT-EUR', 0.918]])
  assert.ok([...buy, ...sell].every(q => q.fiat !== 'USDT'))
})

test('every order needs payer details: country (free text), name up to 64 characters and a valid email', async () => {
  const base = {mode: DEMO, side: 'buy', quoteId: 'ETH-USD', quantity: 1}
  for (const [i, bad] of [{}, {...payer, country: '  '}, {...payer, name: ' '}, {...payer, name: 'x'.repeat(65)}, {...payer, email: 'nope'}].entries())
    await assert.rejects(createC2COrder({...base, requestId: 'c2c-payer-' + i, payer: bad}), {code: 'c2c.error.payerInvalid'})
  const order = await createC2COrder({...base, requestId: 'c2c-payer-ok', payer: {country: ' Singapore ', name: '  Tan Wei Ming ', email: 'tan@example.com '}})
  assert.deepEqual(order.payer, {country: 'Singapore', name: 'Tan Wei Ming', email: 'tan@example.com'})
  assert.ok((await listC2COrders(REAL)).every(o => o.payer?.country && o.payer.name && o.payer.email))
})

test('error keys and injected outage', async () => {
  assert.equal(c2cErrorKey({code: 'c2c.error.generic'}), 'c2c.error.generic')
  assert.equal(c2cErrorKey({code: 'network'}), 'common.requestFailed')
  const previous = configureMock({fail: ['c2c']})
  try { await assert.rejects(listC2COrders(DEMO), {code: 'network'}) } finally { configureMock(previous) }
})
