import test from 'node:test'
import assert from 'node:assert/strict'
import {configureMock} from '../src/api/transport.js'
import {c2cErrorKey, createC2COrder, deletePaymentAccount, getC2COrder, listC2COrders, listC2CQuotes, listPaymentAccounts, savePaymentAccount} from '../src/api/c2c.js'
import {balanceOf} from '../src/mock/ledger.js'

const DEMO = 'common.demo.demo', REAL = 'common.demo.real'
const draft = {currency: 'USDT', accountName: 'Demo Customer', accountNumber: 'DEMO-001', bankName: 'Demo Bank'}

test('quotes per side are snapshots', async () => {
  const buy = await listC2CQuotes('buy'), sell = await listC2CQuotes('sell')
  assert.ok(buy.length > 1)
  assert.deepEqual(sell.map(q => q.symbol), ['USDT'])
  buy[0].price = -1
  assert.notEqual((await listC2CQuotes('buy'))[0].price, -1)
})

test('accounts: validation, save, update', async () => {
  await assert.rejects(savePaymentAccount({...draft, accountName: ' '}), {code: 'c2c.error.generic'})
  const account = await savePaymentAccount(draft)
  await savePaymentAccount({...account, bankName: 'Renamed'})
  assert.equal((await listPaymentAccounts()).find(a => a.id === account.id).bankName, 'Renamed')
})

test('sell locks balance in its mode, prices from the server quote, blocks deleting the account', async () => {
  const account = (await listPaymentAccounts())[0]
  const before = balanceOf('demo', 'USDT')
  const order = await createC2COrder({mode: DEMO, side: 'sell', symbol: 'USDT', quantity: 3000, accountId: account.id, requestId: 'c2c-api-1'})
  assert.equal(order.status, 'asset_locked')
  assert.equal(order.price, 0.99)
  assert.equal(balanceOf('demo', 'USDT'), before - 3000)
  await assert.rejects(createC2COrder({mode: DEMO, side: 'sell', symbol: 'USDT', quantity: 3000, accountId: account.id, requestId: 'c2c-api-1'}), {code: 'c2c.error.OTC_ORDER_NOT_OPERABLE'})
  assert.equal((await listC2COrders(DEMO)).length, 1)
  assert.ok(!(await listC2COrders(REAL)).some(o => o.id === order.id), 'orders are per mode')
  assert.equal((await getC2COrder(order.id, DEMO)).id, order.id)
  await assert.rejects(getC2COrder(order.id, REAL), {code: 'notFound'})
  await assert.rejects(deletePaymentAccount(account.id), {code: 'c2c.error.OTC_USER_PAYMENT_ACCOUNT_IN_USE'})
})

test('buy stays pending; unknown symbols and out-of-range amounts are rejected', async () => {
  const order = await createC2COrder({mode: DEMO, side: 'buy', symbol: 'ETH', quantity: 2, requestId: 'c2c-api-2'})
  assert.equal(order.status, 'pending_match')
  await assert.rejects(createC2COrder({mode: DEMO, side: 'buy', symbol: 'ETH', quantity: 0.1, requestId: 'c2c-api-3'}), {code: 'c2c.error.OTC_LIMIT_EXCEEDED_SINGLE'})
  await assert.rejects(createC2COrder({mode: DEMO, side: 'sell', symbol: 'BTC', quantity: 1, requestId: 'c2c-api-4'}), {code: 'c2c.error.OTC_LIMIT_EXCEEDED_SINGLE'})
})

test('error keys and injected outage', async () => {
  assert.equal(c2cErrorKey({code: 'c2c.error.generic'}), 'c2c.error.generic')
  assert.equal(c2cErrorKey({code: 'network'}), 'common.requestFailed')
  const previous = configureMock({fail: ['c2c']})
  try { await assert.rejects(listC2COrders(DEMO), {code: 'network'}) } finally { configureMock(previous) }
})
