import test from 'node:test'
import assert from 'node:assert/strict'
import {transact, advance, raisedAmount, initialSubscribed, progressFor, redemptionFee, DAY, createQuantFundState} from '../src/shared/quantFund/domain.js'
import {seedQuantFund, seedProducts} from '../src/shared/quantFund/seed.js'

const T0 = Date.UTC(2026, 10, 1, 0, 0, 0)
let n = 0
const run = (s, action, args, at = T0) => transact(s, action, {...args, requestId: `t-${++n}`}, at)
const fresh = () => createQuantFundState({products: seedProducts(T0), balances: {U1: {USDT: 1000000}, U2: {USDT: 1000000}},
  profiles: {U1: {name: 'U1', verificationLevel: 'advanced', vipLevel: 5}, U2: {name: 'U2', verificationLevel: 'advanced', vipLevel: 5}}})
const order = s => s.orders[0]
const product = (s, id) => s.products.find(p => p.productId === id)

test('seed matches the client tiers and covers every status, early and automatic redemption', () => {
  const s = seedQuantFund(T0)
  assert.deepEqual(s.products.map(p => [p.dailyRate, p.lockDays, p.minAmount, p.maxAmount]), [
    [0.73, null, 4999, 99999], [1.25, 7, 100000, 499999], [1.79, 15, 500000, 999999],
    [2.35, 30, 1000000, 4999999], [2.93, 60, 5000000, 9999999], [3.55, 120, 10000000, 100000000]])
  const statuses = new Set(s.orders.map(o => o.status))
  for (const status of ['pending_review', 'active', 'redeem_pending_review', 'redeemed', 'rejected']) assert.ok(statuses.has(status), status)
  assert.ok(s.orders.some(o => o.endReason === 'auto'), 'a full product auto-redeemed an order')
  assert.ok(s.redemptions.some(r => r.early && r.status === 'pending_review' && r.fee > 0), 'an early redemption waits for review')
  for (const o of s.orders) {
    const accrued = s.payouts.filter(p => p.orderId === o.orderId).reduce((t, p) => t + p.amount, 0)
    assert.equal(Math.round(accrued * 100), Math.round(o.accruedInterest * 100), o.orderId)
  }
})

test('interest accrues in the order at the fixed rate, never in the balance, and only after approval', () => {
  let s = run(fresh(), 'subscribe', {userId: 'U1', productId: 'QF-VIP0', amount: 10000})
  assert.equal(order(s).status, 'pending_review')
  advance(s, T0 + 3 * DAY)
  assert.equal(order(s).accruedInterest, 0, 'no interest before approval')
  s = run(s, 'approve', {orderId: order(s).orderId}, T0 + DAY)
  advance(s, T0 + 4 * DAY + 1)
  assert.equal(order(s).accrualCount, 3)
  assert.equal(order(s).accruedInterest, 219, '3 × 10,000 × 0.73%, on principal only')
  assert.equal(s.balances.U1.USDT, 990000, 'balance untouched until redemption')
})

test('early redemption inside the lock costs a fixed share of principal and keeps the interest', () => {
  let s = run(fresh(), 'subscribe', {userId: 'U1', productId: 'QF-VIP1', amount: 150000})
  s = run(s, 'approve', {orderId: order(s).orderId})
  assert.equal(redemptionFee(order(s), T0 + DAY), 1095, '150,000 × 0.73%, whatever the days left')
  assert.equal(redemptionFee(order(s), T0 + 6 * DAY), 1095)
  s = run(s, 'requestRedeem', {orderId: order(s).orderId, userId: 'U1'}, T0 + 2 * DAY)
  const r = s.redemptions[0]
  assert.equal(r.early, true)
  s = run(s, 'approveRedeem', {redemptionId: r.redemptionId}, T0 + 3 * DAY)
  // Interest keeps accruing during the review: 3 days × 1,875.
  assert.equal(order(s).accruedInterest, 5625)
  assert.equal(s.redemptions[0].returned, 150000 + 5625 - 1095)
  assert.equal(s.balances.U1.USDT, 1000000 - 150000 + 154530)
  assert.equal(order(s).endReason, 'early')
})

test('after the lock the order keeps earning with no fee until redeemed; rejection restores it', () => {
  let s = run(fresh(), 'subscribe', {userId: 'U1', productId: 'QF-VIP1', amount: 100000})
  s = run(s, 'approve', {orderId: order(s).orderId})
  advance(s, T0 + 20 * DAY)
  assert.equal(order(s).status, 'active', 'no automatic settlement at the end of the lock')
  assert.equal(order(s).accrualCount, 20)
  s = run(s, 'requestRedeem', {orderId: order(s).orderId, userId: 'U1'}, T0 + 20 * DAY)
  assert.equal(s.redemptions[0].fee, 0)
  s = run(s, 'rejectRedeem', {redemptionId: s.redemptions[0].redemptionId}, T0 + 20 * DAY)
  assert.equal(order(s).status, 'active')
})

test('at 100% progress nobody can buy and orders past their lock are redeemed automatically', () => {
  let s = fresh()
  const vip1 = () => product(s, 'QF-VIP1')
  s = run(s, 'subscribe', {userId: 'U1', productId: 'QF-VIP1', amount: 400000})
  s = run(s, 'approve', {orderId: order(s).orderId})
  const locked = order(s).orderId
  s = run(s, 'subscribe', {userId: 'U2', productId: 'QF-VIP1', amount: 300000}, T0 + 10 * DAY)
  s = run(s, 'approve', {orderId: order(s).orderId}, T0 + 10 * DAY)
  // Fill to exactly 100%: initial funding + approved principal = total quota.
  const p = vip1(), percent = (p.totalQuota - 700000) / p.totalQuota * 100
  s = run(s, 'saveProduct', {product: {...p, initialPercent: percent}, expectedVersion: p.version}, T0 + 12 * DAY)
  const first = s.orders.find(o => o.orderId === locked), second = order(s)
  assert.equal(first.status, 'redeemed', 'past its lock → redeemed')
  assert.equal(first.endReason, 'auto')
  assert.equal(first.redeemFee, 0)
  assert.equal(second.status, 'active', 'still locked (until day 17) → kept')
  assert.equal(raisedAmount(s, vip1()), initialSubscribed(vip1()) + 300000)
  // Once the second order's lock ends while the product is full again, it is redeemed too.
  const q = vip1()
  s = run(s, 'saveProduct', {product: {...q, initialPercent: 100}, expectedVersion: q.version}, T0 + 13 * DAY)
  assert.throws(() => run(s, 'subscribe', {userId: 'U1', productId: 'QF-VIP1', amount: 100000}, T0 + 13 * DAY), /soldOut/)
  assert.equal(order(s).status, 'active')
  advance(s, T0 + 17 * DAY + 1)
  assert.equal(order(s).status, 'redeemed')
  assert.equal(order(s).returned, 300000 + order(s).accruedInterest)
})

test('restricted users see the product full and cannot subscribe; others can', () => {
  let s = fresh()
  const p = product(s, 'QF-VIP0')
  s = run(s, 'saveProduct', {product: {...p, restrictedUserIds: ['U2', ' U2 ']}, expectedVersion: p.version})
  assert.deepEqual(product(s, 'QF-VIP0').restrictedUserIds, ['U2'])
  assert.equal(progressFor(s, product(s, 'QF-VIP0'), 'U2'), 100)
  assert.equal(progressFor(s, product(s, 'QF-VIP0'), 'U1'), 60)
  assert.throws(() => run(s, 'subscribe', {userId: 'U2', productId: 'QF-VIP0', amount: 10000}), /soldOut/)
  s = run(s, 'subscribe', {userId: 'U1', productId: 'QF-VIP0', amount: 10000})
  assert.equal(order(s).userId, 'U1')
})

test('product saves are versioned and validated; edits never rewrite existing orders', () => {
  let s = run(fresh(), 'subscribe', {userId: 'U1', productId: 'QF-VIP1', amount: 100000})
  const p = product(s, 'QF-VIP1')
  s = run(s, 'saveProduct', {product: {...p, dailyRate: 2, earlyRedeemFeeRate: 1}, expectedVersion: p.version})
  assert.equal(order(s).productSnapshot.dailyRate, 1.25)
  assert.equal(order(s).productSnapshot.earlyRedeemFeeRate, 0.73)
  assert.throws(() => run(s, 'saveProduct', {product: p, expectedVersion: p.version}), /stale/)
  const next = product(s, 'QF-VIP1')
  assert.throws(() => run(s, 'saveProduct', {product: {...next, lockDays: 0}, expectedVersion: next.version}), /productLock/)
  assert.throws(() => run(s, 'saveProduct', {product: {...next, earlyRedeemFeeRate: 120}, expectedVersion: next.version}), /productFee/)
  assert.throws(() => run(s, 'saveProduct', {product: {...next, code: 'QF-VIP0'}, expectedVersion: next.version}), /productCodeTaken/)
  s = run(s, 'setProductStatus', {productId: 'QF-VIP1', expectedStatus: 'listed'})
  assert.throws(() => run(s, 'approve', {orderId: order(s).orderId}), /product/)
})
