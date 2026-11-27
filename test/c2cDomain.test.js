import test from 'node:test'
import assert from 'node:assert/strict'
import {createC2CState, transact} from '../src/shared/c2c/domain.js'
import {seedC2C, seedQuotes} from '../src/shared/c2c/seed.js'

const NOW = Date.UTC(2026, 10, 27, 4)
const fresh = () => createC2CState({quotes: seedQuotes(NOW), balances: {U1: {USDT: 10000}}, profiles: {U1: {name: 'U1'}}})
const submit = (s, args) => transact(s, 'submit', {userId: 'U1', ...args}, NOW)

test('a buy waits for review and approval credits the coin once', () => {
  let s = submit(fresh(), {side: 'buy', symbol: 'ETH', quantity: 2})
  const order = s.orders[0]
  assert.equal(order.status, 'pending_review')
  assert.equal(order.amount, Number((2 * 1656.6323).toFixed(8)))
  assert.equal(s.balances.U1.ETH ?? 0, 0)
  s = transact(s, 'approve', {orderId: order.orderId}, NOW + 1)
  assert.equal(s.orders[0].status, 'completed')
  assert.equal(s.balances.U1.ETH, 2)
  assert.ok(s.orders[0].reviewer)
  assert.throws(() => transact(s, 'approve', {orderId: order.orderId}, NOW + 2), /status/)
  assert.throws(() => transact(s, 'reject', {orderId: order.orderId}, NOW + 2), /status/)
})

test('a sell locks the coin; approval deducts it, rejection and cancellation unlock it', () => {
  let s = submit(fresh(), {side: 'sell', symbol: 'USDT', quantity: 4000})
  assert.equal(s.balances.U1.USDT, 6000)
  assert.equal(s.locked.U1.USDT, 4000)
  const approved = transact(s, 'approve', {orderId: s.orders[0].orderId}, NOW + 1)
  assert.equal(approved.balances.U1.USDT, 6000)
  assert.equal(approved.locked.U1.USDT, 0)
  const rejected = transact(s, 'reject', {orderId: s.orders[0].orderId}, NOW + 1)
  assert.equal(rejected.balances.U1.USDT, 10000)
  assert.equal(rejected.locked.U1.USDT, 0)
  const cancelled = transact(s, 'cancel', {orderId: s.orders[0].orderId, userId: 'U1'}, NOW + 1)
  assert.equal(cancelled.orders[0].status, 'cancelled')
  assert.equal(cancelled.balances.U1.USDT, 10000)
  assert.throws(() => transact(s, 'cancel', {orderId: s.orders[0].orderId, userId: 'U2'}, NOW + 1), /owner/)
})

test('orders respect the quote: enabled, limits and balance; failures leave the state untouched', () => {
  const s = fresh()
  assert.throws(() => submit(s, {side: 'sell', symbol: 'USDT', quantity: 20000}), /balance/)
  assert.throws(() => submit(s, {side: 'buy', symbol: 'BTC', quantity: 0.01}), /amount/)
  assert.throws(() => submit(s, {side: 'sell', symbol: 'BTC', quantity: 1}), /quoteOff/)
  assert.equal(s.orders.length, 0)
  assert.equal(s.balances.U1.USDT, 10000)
})

test('quote edits are versioned, logged, and never change existing orders; new quotes start disabled', () => {
  let s = submit(fresh(), {side: 'buy', symbol: 'SOL', quantity: 120})
  const quote = s.quotes.find(q => q.quoteId === 'C2CQ-SOL-BUY')
  s = transact(s, 'saveQuote', {quote: {...quote, price: 70}, expectedVersion: quote.version}, NOW + 1)
  assert.equal(s.quotes.find(q => q.quoteId === quote.quoteId).price, 70)
  assert.equal(s.orders[0].price, 68.175)
  assert.throws(() => transact(s, 'saveQuote', {quote: {...quote, price: 71}, expectedVersion: quote.version}, NOW + 2), /stale/)
  assert.throws(() => transact(s, 'saveQuote', {quote: {...quote, quoteId: undefined}}, NOW + 2), /quoteTaken/)
  s = transact(s, 'saveQuote', {quote: {symbol: 'BTC', side: 'sell', price: 58000, min: 0.01, max: 10, ttlSeconds: 60, note: '', sortWeight: 0}}, NOW + 3)
  assert.equal(s.quotes.find(q => q.quoteId === 'C2CQ-BTC-SELL').enabled, false)
  assert.ok(s.logs.some(l => l.action === 'saveQuote' && l.before && l.after))
  s = transact(s, 'setQuoteStatus', {quoteId: 'C2CQ-BTC-SELL', expectedEnabled: false}, NOW + 4)
  assert.equal(s.quotes.find(q => q.quoteId === 'C2CQ-BTC-SELL').enabled, true)
  assert.throws(() => transact(s, 'saveQuote', {quote: {symbol: 'BTC', side: 'buy', price: 1, min: 2, max: 1, ttlSeconds: 60, sortWeight: 0}}, NOW), /quoteTaken|quoteLimits/)
})

test('a repeated requestId is rejected', () => {
  const s = transact(fresh(), 'submit', {userId: 'U1', side: 'buy', symbol: 'ETH', quantity: 1, requestId: 'r1'}, NOW)
  assert.throws(() => transact(s, 'submit', {userId: 'U1', side: 'buy', symbol: 'ETH', quantity: 1, requestId: 'r1'}, NOW), /duplicate/)
})

test('the seed covers every order status and keeps balances and locks consistent', () => {
  const s = seedC2C(NOW)
  assert.deepEqual(new Set(s.orders.map(o => o.status)), new Set(['pending_review', 'completed', 'rejected', 'cancelled']))
  assert.ok(s.orders.some(o => o.side === 'sell' && o.status === 'pending_review'))
  for (const [userId, wallet] of Object.entries(s.locked)) {
    const pendingSells = s.orders.filter(o => o.userId === userId && o.side === 'sell' && o.status === 'pending_review').reduce((t, o) => t + o.quantity, 0)
    assert.equal(wallet.USDT ?? 0, pendingSells)
  }
  assert.ok(s.orders.every((o, i, all) => i === 0 || all[i - 1].createdAt >= o.createdAt))
  assert.ok(s.logs.length >= s.orders.length)
})

test('the agreement keeps six languages with English required, versions each save and logs the change', () => {
  let s = seedC2C(NOW)
  const {version, contents} = s.agreement
  assert.equal(s.agreement.versionLabel, 'v1-draft')
  assert.deepEqual(Object.keys(contents), ['en-US', 'zh-TW', 'fr-FR', 'de-DE', 'ja-JP', 'ko-KR'])
  const edited = {...structuredClone(contents), 'zh-TW': {title: 'C2C 交易協議', body: '新條款'}, 'ko-KR': {title: '', body: ''}}
  s = transact(s, 'saveAgreement', {contents: edited, expectedVersion: version}, NOW + 1)
  assert.equal(s.agreement.version, version + 1)
  assert.equal(s.agreement.versionLabel, 'v2')
  assert.equal(s.agreement.contents['zh-TW'].body, '新條款')
  assert.equal(s.agreement.contents['ko-KR'], undefined)
  assert.match(s.logs[0].summary, /zh-TW.*ko-KR|ko-KR.*zh-TW/)
  assert.throws(() => transact(s, 'saveAgreement', {contents: edited, expectedVersion: version}, NOW + 2), /stale/)
  assert.throws(() => transact(s, 'saveAgreement', {contents: {...edited, 'en-US': {title: 'X', body: ' '}}, expectedVersion: s.agreement.version}, NOW + 2), /agreementDefault/)
  assert.throws(() => transact(s, 'saveAgreement', {contents: {...edited, 'ja-JP': {title: 'T', body: ''}}, expectedVersion: s.agreement.version}, NOW + 2), /agreementPartial/)
})
