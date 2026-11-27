import test from 'node:test'
import assert from 'node:assert/strict'
import {transact, advance, raisedAmount, remainingQuota, displayRate, initialSubscribed, dailyRateFor, DAY, createQuantFundState} from '../src/shared/quantFund/domain.js'
import {seedQuantFund, seedProducts} from '../src/shared/quantFund/seed.js'

const T0 = Date.UTC(2026, 10, 1, 0, 0, 0)
let n = 0
const run = (s, action, args, at = T0) => transact(s, action, {...args, requestId: `t-${++n}`}, at)
const fresh = () => createQuantFundState({products: seedProducts(T0), balances: {U1: {USDT: 1000000}}, profiles: {U1: {name: 'U1', verificationLevel: 'advanced', vipLevel: 5}}})
const order = s => s.orders[0]

test('seed covers every order and redemption status with coherent payouts', () => {
  const s = seedQuantFund(T0)
  const statuses = new Set(s.orders.map(o => o.status))
  for (const status of ['pending_review', 'active', 'redeem_pending_review', 'redeemed', 'settled', 'rejected']) assert.ok(statuses.has(status), status)
  assert.ok(s.redemptions.some(r => r.status === 'approved') && s.redemptions.some(r => r.status === 'pending_review'))
  for (const o of s.orders) {
    const paid = s.payouts.filter(p => p.orderId === o.orderId).reduce((t, p) => t + p.amount, 0)
    assert.equal(Math.round(paid * 100), Math.round(o.interestPaidTotal * 100), o.orderId)
  }
  assert.ok(s.payouts.every(p => {
    const o = s.orders.find(x => x.orderId === p.orderId)
    return p.rate >= o.productSnapshot.dailyRate.min && p.rate <= o.productSnapshot.dailyRate.max
  }))
  assert.equal(displayRate(s.products[0]), 0.73)
})

test('subscription waits for review; approval starts daily payouts inside the rate range', () => {
  let s = run(fresh(), 'subscribe', {userId: 'U1', productId: 'QF-VIP0', amount: 10000})
  assert.equal(order(s).status, 'pending_review')
  assert.equal(s.balances.U1.USDT, 990000)
  advance(s, T0 + 3 * DAY)
  assert.equal(s.payouts.length, 0, 'no interest before approval')
  s = run(s, 'approve', {orderId: order(s).orderId}, T0 + DAY)
  advance(s, T0 + 4 * DAY + 1)
  assert.equal(s.payouts.length, 3)
  assert.equal(dailyRateFor(order(s), T0 + DAY), s.payouts.at(-1).rate)
  advance(s, T0 + 4 * DAY + 1)
  assert.equal(s.payouts.length, 3, 'idempotent')
})

test('rejection refunds; funding and remaining quota use approved principal only', () => {
  let s = run(fresh(), 'subscribe', {userId: 'U1', productId: 'QF-VIP0', amount: 10000})
  const p = s.products.find(x => x.productId === 'QF-VIP0')
  assert.equal(raisedAmount(s, p), initialSubscribed(p))
  s = run(s, 'reject', {orderId: order(s).orderId})
  assert.equal(order(s).status, 'rejected')
  assert.equal(s.balances.U1.USDT, 1000000)
  assert.throws(() => run(s, 'approve', {orderId: order(s).orderId}), /status/)
  const full = structuredClone(fresh()); full.products[0].initialPercent = 100
  assert.throws(() => run(full, 'subscribe', {userId: 'U1', productId: 'QF-VIP0', amount: 10000}), /quota/)
  assert.ok(remainingQuota(s, s.products[0]) > 0)
})

test('flexible redemption needs review; rejection restores the order; fixed terms settle at maturity', () => {
  let s = run(fresh(), 'subscribe', {userId: 'U1', productId: 'QF-VIP0', amount: 10000})
  s = run(s, 'approve', {orderId: order(s).orderId})
  assert.throws(() => run(s, 'requestRedeem', {orderId: order(s).orderId, userId: 'U1'}, T0 + 1000), /minHold/)
  s = run(s, 'requestRedeem', {orderId: order(s).orderId, userId: 'U1'}, T0 + 2 * DAY)
  assert.equal(order(s).status, 'redeem_pending_review')
  s = run(s, 'rejectRedeem', {redemptionId: s.redemptions[0].redemptionId}, T0 + 2 * DAY)
  assert.equal(order(s).status, 'active')
  s = run(s, 'requestRedeem', {orderId: order(s).orderId, userId: 'U1'}, T0 + 3 * DAY)
  const before = s.balances.U1.USDT
  s = run(s, 'approveRedeem', {redemptionId: s.redemptions[0].redemptionId}, T0 + 4 * DAY)
  assert.equal(order(s).status, 'redeemed')
  assert.ok(s.balances.U1.USDT >= before + 10000, 'principal returned (plus the day paid while waiting)')
  assert.throws(() => run(s, 'approveRedeem', {redemptionId: s.redemptions[0].redemptionId}, T0 + 4 * DAY), /status/)

  s = run(s, 'subscribe', {userId: 'U1', productId: 'QF-VIP1', amount: 100000}, T0)
  s = run(s, 'approve', {orderId: order(s).orderId}, T0)
  assert.throws(() => run(s, 'requestRedeem', {orderId: order(s).orderId, userId: 'U1'}, T0 + 2 * DAY), /fixedTerm/)
  advance(s, T0 + 30 * DAY)
  assert.equal(order(s).status, 'settled')
  assert.equal(order(s).payoutCount, 7)
})

test('product saves are versioned and validated; edits never rewrite existing orders', () => {
  let s = run(fresh(), 'subscribe', {userId: 'U1', productId: 'QF-VIP0', amount: 10000})
  const p = structuredClone(s.products[0])
  s = run(s, 'saveProduct', {product: {...p, dailyRate: {min: 1, max: 2}}, expectedVersion: p.version})
  assert.deepEqual(order(s).productSnapshot.dailyRate, {min: 0.58, max: 0.88})
  assert.throws(() => run(s, 'saveProduct', {product: p, expectedVersion: p.version}), /stale/)
  const next = s.products[0]
  assert.throws(() => run(s, 'saveProduct', {product: {...next, dailyRate: {min: 2, max: 1}}, expectedVersion: next.version}), /productRate/)
  assert.throws(() => run(s, 'saveProduct', {product: {...next, code: 'QF-VIP1'}, expectedVersion: next.version}), /productCodeTaken/)
  s = run(s, 'setProductStatus', {productId: next.productId, expectedStatus: 'listed'})
  assert.equal(s.products[0].status, 'unlisted')
  assert.throws(() => run(s, 'approve', {orderId: order(s).orderId}), /product/)
})

test('the identifier coin is display only: subscriptions stay in USDT and the coin is frozen into the order', () => {
  let s = fresh()
  const p = structuredClone(s.products[0])
  s = run(s, 'saveProduct', {product: {...p, asset: 'BTC'}, expectedVersion: p.version})
  s = run(s, 'subscribe', {userId: 'U1', productId: p.productId, amount: 10000})
  assert.equal(order(s).productSnapshot.asset, 'BTC')
  assert.equal(s.balances.U1.USDT, 990000, 'principal leaves the USDT balance')
  const next = s.products[0]
  assert.throws(() => run(s, 'saveProduct', {product: {...next, asset: 'DOGE'}, expectedVersion: next.version}), /productAsset/)
})
