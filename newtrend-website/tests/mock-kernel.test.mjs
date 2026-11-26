import test from 'node:test'
import assert from 'node:assert/strict'
import {ledger,balanceOf,debit,credit,modeKey,boundBalances,bindBalance,resetLedger,DEMO_FUNDS} from '../src/mock/ledger.js'
import {createFundAccount,createQuantFundCatalog,subscribeFund,settleMaturedFunds} from '../src/utils/quantFund.js'
import {createStrategyAccount,completeExpiredStrategies} from '../src/utils/strategyTemplates.js'
import {orderFunding} from '../src/tradingFunds.js'

const DAY = 86400000

test('ledger keeps modes apart and never goes negative', () => {
  resetLedger()
  assert.equal(modeKey('common.demo.demo'), 'demo')
  assert.equal(modeKey('common.demo.real'), 'real')
  assert.equal(balanceOf('demo', 'USDT'), DEMO_FUNDS.USDT)
  assert.equal(balanceOf('real', 'USDT'), 0)
  assert.equal(debit('real', 'USDT', 1), false)
  assert.equal(debit('demo', 'USDT', -5), false)
  assert.equal(debit('demo', 'USDT', 'x'), false)
  assert.equal(debit('demo', 'BTC', 2), true)
  assert.equal(balanceOf('demo', 'BTC'), 0)
  assert.equal(credit('real', 'ETH', 0.1), true)
  assert.equal(ledger.real.ETH, 0.1)
  assert.equal(balanceOf('demo', 'ETH'), DEMO_FUNDS.ETH)
  resetLedger()
})

test('domain accounts bound to the ledger move the same money', () => {
  resetLedger()
  const account = Object.assign(createFundAccount(), {balances: boundBalances('USDT')})
  const [product] = createQuantFundCatalog()
  const {order, error} = subscribeFund(account, product, String(product.minAmount), {mode: 'demo', requestId: 'r1', now: 0})
  assert.equal(error, undefined)
  assert.equal(order.status, 'pending_review')
  assert.equal(balanceOf('demo', 'USDT'), DEMO_FUNDS.USDT - product.minAmount)
  const strategy = bindBalance(createStrategyAccount(0), 'demo', 'USDT')
  assert.equal(strategy.balance, DEMO_FUNDS.USDT - product.minAmount)
  strategy.balance -= 500
  assert.equal(balanceOf('demo', 'USDT'), DEMO_FUNDS.USDT - product.minAmount - 500)
  resetLedger()
})

test('matured fixed-term fund orders settle once with the full term interest', () => {
  resetLedger()
  const account = Object.assign(createFundAccount(), {balances: boundBalances('USDT')})
  const product = {id: 'fx', subscribed: 1000}
  account.orders.push({id: 'a', productId: 'fx', mode: 'real', status: 'active', principal: 1000, dailyReturnPercentSnapshot: 1, termDaysSnapshot: 7, maturityDate: 7 * DAY, interestPaidTotal: 30, interestRecords: []})
  account.orders.push({id: 'b', productId: 'fx', mode: 'real', status: 'active', principal: 1000, dailyReturnPercentSnapshot: 1, termDaysSnapshot: null, maturityDate: null, interestPaidTotal: 0})
  assert.deepEqual(settleMaturedFunds(account, () => product, 6 * DAY).map(o => o.id), [])
  assert.deepEqual(settleMaturedFunds(account, () => product, 8 * DAY).map(o => o.id), ['a'])
  assert.equal(account.orders[0].status, 'settled')
  assert.equal(account.orders[0].interestPaidTotal, 70)
  assert.equal(balanceOf('real', 'USDT'), 1040) // principal + remaining 40 interest
  assert.equal(product.subscribed, 0)
  assert.deepEqual(settleMaturedFunds(account, () => product, 9 * DAY), [])
  assert.equal(account.orders[1].status, 'active')
  resetLedger()
})

test('expired strategies complete and return capital plus P&L once', () => {
  const account = createStrategyAccount(0)
  account.records.push({id: 's1', status: 'running', capital: 1000, pnl: 25, endAt: 10})
  account.records.push({id: 's2', status: 'running', capital: 500, pnl: 0, endAt: 100})
  assert.equal(completeExpiredStrategies(account, 50).length, 1)
  assert.equal(account.balance, 1025)
  assert.equal(account.records[0].status, 'completed')
  assert.equal(completeExpiredStrategies(account, 60).length, 0)
  assert.equal(account.balance, 1025)
})

test('order funding locks the right asset and pays out market fills', () => {
  const estimate = {quantity: 0.5, notional: 1000, margin: 100, fee: 0.5}
  assert.deepEqual(orderFunding({kind: 'futures', side: 'buy', pending: false, estimate, amount: 1000, base: 'BTC'}), {lock: {asset: 'USDT', amount: 100.5}, fill: null})
  assert.deepEqual(orderFunding({kind: 'futures', side: 'buy', pending: true, estimate, amount: 1000, base: 'BTC'}).lock, {asset: 'USDT', amount: 100})
  assert.deepEqual(orderFunding({kind: 'options', side: 'buy', pending: false, estimate, amount: 300, base: 'BTC'}).lock, {asset: 'USDT', amount: 300})
  assert.deepEqual(orderFunding({kind: 'spot', side: 'buy', pending: false, estimate, amount: 1000, base: 'BTC'}), {lock: {asset: 'USDT', amount: 1000.5}, fill: {asset: 'BTC', amount: 0.5}})
  assert.deepEqual(orderFunding({kind: 'spot', side: 'sell', pending: false, estimate, amount: 0.5, base: 'BTC'}), {lock: {asset: 'BTC', amount: 0.5}, fill: {asset: 'USDT', amount: 999.5}})
  assert.equal(orderFunding({kind: 'spot', side: 'sell', pending: true, estimate, amount: 0.5, base: 'BTC'}).fill, null)
})

test('Quant Fund seeds satisfy product limits and never credit payouts in the future', async () => {
  const {quantFundAccount, findQuantFund} = await import('../src/quantFundPortfolio.js')
  const now = Date.now()
  assert.ok(quantFundAccount.orders.length >= 12)
  for (const order of quantFundAccount.orders) {
    const product = findQuantFund(order.productId)
    assert.ok(order.principal >= product.minAmount && order.principal <= product.maxAmount, `${order.id} principal`)
    for (const row of order.interestRecords || []) assert.ok(row.creditedAt <= now, `${order.id} payout in future`)
    if (order.status === 'active' && order.maturityDate) assert.ok(order.maturityDate > now, `${order.id} active past maturity`)
  }
})
