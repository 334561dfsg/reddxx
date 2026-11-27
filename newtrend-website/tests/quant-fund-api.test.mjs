import test from 'node:test'
import assert from 'node:assert/strict'
import {ApiError, configureMock} from '../src/api/transport.js'
import {getQuantFund, getQuantFundBalance, getQuantFundOrder, getQuantFundPositions, listQuantFunds, redeemQuantFund, subscribeQuantFund} from '../src/api/quantFund.js'
import {quantFunds, quantFundAccount} from '../src/quantFundPortfolio.js'

test('catalogue and order reads are snapshots with not-found codes', async () => {
  const list = await listQuantFunds()
  list[0].subscribed = -1
  assert.notEqual(quantFunds[0].subscribed, -1)
  assert.equal((await getQuantFund('qf-vip1')).id, 'qf-vip1')
  await assert.rejects(getQuantFund('nope'), {code: 'notFound'})
  await assert.rejects(getQuantFundOrder('nope'), {code: 'notFound'})
  const order = await getQuantFundOrder('QFO-seed-real-1')
  assert.ok(order.interestRecords.length > 0)
})

test('positions are per mode and carry the summary', async () => {
  const real = await getQuantFundPositions('common.demo.real')
  const demo = await getQuantFundPositions('common.demo.demo')
  assert.ok(real.orders.every(order => order.mode === 'real'))
  assert.ok(demo.orders.every(order => order.mode === 'demo'))
  assert.equal(typeof real.summary.totalPrincipal, 'number')
})

test('subscribe validates server-side, reserves funds once per request id', async () => {
  const mode = 'common.demo.demo'
  const {balance} = await getQuantFundBalance(mode)
  await assert.rejects(subscribeQuantFund({productId: 'qf-vip0', amount: 1, mode, requestId: 'a'}), error => error instanceof ApiError && error.code === 'range')
  await assert.rejects(subscribeQuantFund({productId: 'qf-vip0', amount: 'x', mode, requestId: 'b'}), {code: 'invalid'})
  const args = {productId: 'qf-vip0', amount: 5000, mode, requestId: 'qf-api-1'}
  const order = await subscribeQuantFund(args)
  assert.equal(order.status, 'pending_review')
  assert.equal((await subscribeQuantFund(args)).id, order.id, 'repeat request returns the same order')
  assert.equal((await getQuantFundBalance(mode)).balance, balance - 5000)
})

test('redeem submits an active flexible order for review once; balance waits for approval; a repeat is a conflict', async () => {
  const before = quantFundAccount.balances.real
  const result = await redeemQuantFund('QFO-seed-real-1')
  assert.equal(result.order.status, 'redeem_pending_review')
  assert.equal(quantFundAccount.balances.real, before, 'nothing is credited until the admin approves')
  await assert.rejects(redeemQuantFund('QFO-seed-real-1'), {code: 'conflict'})
  const locked = await redeemQuantFund('QFO-seed-real-2')
  assert.equal(locked.order.status, 'redeem_pending_review', 'orders inside the lock can redeem early')
  assert.ok(locked.order.redeemFee > 0, 'with the early-redemption fee')
})

test('an injected outage rejects with network', async () => {
  const previous = configureMock({fail: ['quantFund']})
  try { await assert.rejects(listQuantFunds(), {code: 'network'}) } finally { configureMock(previous) }
})
