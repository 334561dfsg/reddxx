import test from 'node:test'
import assert from 'node:assert/strict'
import { canForceRedeemAiQuantOrder, forceRedeemAiQuantOrder } from '../src/admin/domain/aiQuantRedemption.js'
import { ORDER_STATUS } from '../src/admin/constants/aiQuant.js'

const order = { id: 'AIQ-001', status: ORDER_STATUS.RUNNING, principal: 2.5, currency: 'BTC', accumulatedYield: 0.001 }
const input = { now: new Date('2026-11-20T08:00:00Z') }

test('only running orders are eligible, including rejection of missing orders', () => {
  assert.equal(canForceRedeemAiQuantOrder(null), false)
  for (const status of Object.values(ORDER_STATUS)) {
    assert.equal(canForceRedeemAiQuantOrder({ ...order, status }), status === ORDER_STATUS.RUNNING)
  }
})
test('redeems exactly one order without inventing fund settlement or mutating original', () => {
  const result = forceRedeemAiQuantOrder(order, input)
  assert.equal(result.status, ORDER_STATUS.FORCE_REDEEMED)
  assert.equal(result.forceRedeemedAt, input.now.toISOString())
  assert.equal(result.principal, order.principal)
  assert.equal(result.accumulatedYield, order.accumulatedYield)
  assert.equal(order.status, ORDER_STATUS.RUNNING)
  assert.throws(() => forceRedeemAiQuantOrder(result, input), /状态已变化/)
})
test('rejects stale or missing orders without requiring reason or typed confirmation', () => {
  assert.throws(() => forceRedeemAiQuantOrder({ ...order, status: ORDER_STATUS.LOCKED }))
  assert.throws(() => forceRedeemAiQuantOrder(undefined))
  assert.equal(forceRedeemAiQuantOrder(order).status, ORDER_STATUS.FORCE_REDEEMED)
})
