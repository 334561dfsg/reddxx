import test from 'node:test'
import assert from 'node:assert/strict'
import {earnProductFacts, findEarnProduct} from '../src/mock/catalog.js'
import {balanceOf, resetLedger, DEMO_FUNDS} from '../src/mock/ledger.js'
import {earnEligibilityError, earnMockProfile} from '../src/utils/earnEligibility.js'
import {earnPortfolios, earnPortfolioFor, recordEarnSubscription} from '../src/server/earnPortfolio.js'
import {strategyAccounts} from '../src/server/strategyPortfolio.js'
import {strategies} from '../src/mock/catalog.js'
import {enrichStrategies} from '../src/utils/strategyTemplates.js'
const localTemplates = enrichStrategies(strategies)
import {tradeOrdersFor, placeTradeOrder} from '../src/server/tradingFunds.js'

const DAY = 86400000
const now = Date.now()

test('Earn fixtures reference real products and respect their limits and terms', () => {
  for (const mode of ['real', 'demo']) {
    const portfolio = earnPortfolios[mode]
    for (const holding of portfolio.holdings) {
      const product = findEarnProduct(holding.productId)
      assert.ok(product, `${holding.id} product`)
      assert.equal(holding.symbol, product.symbol, `${holding.id} symbol`)
      assert.ok(holding.principal >= product.min && holding.principal <= product.max, `${holding.id} principal`)
      assert.equal(Boolean(holding.maturityAt), product.days > 0, `${holding.id} maturity vs term`)
      if (holding.status === 'active' && holding.maturityAt) assert.ok(holding.maturityAt > now, `${holding.id} active past maturity`)
      if (holding.status === 'matured') assert.ok(holding.maturityAt <= now, `${holding.id} matured in the future`)
      assert.ok(holding.startedAt <= now && holding.subscribedAt <= holding.startedAt, `${holding.id} dates`)
    }
    for (const order of portfolio.orders) {
      assert.ok(findEarnProduct(order.productId), `${order.id} product`)
      assert.ok(order.createdAt <= now, `${order.id} created in the future`)
      assert.equal(order.completedAt == null, order.status === 'pending_review', `${order.id} completion vs status`)
    }
    for (const row of portfolio.rewards) assert.ok(row.paidAt == null || row.paidAt <= now, `${row.id} paid in the future`)
  }
})

test('strategy seeds fit their templates and lifecycle', () => {
  // 模擬 records are local; 真實 ones live on the shared strategy Mock (validated in the root strategyDomain tests).
  for (const mode of ['demo']) for (const record of strategyAccounts[mode].records) {
    const template = localTemplates.find(item => item.id === record.template.id)
    assert.ok(template, `${record.id} template`)
    assert.ok(record.capital >= template.min && record.capital <= template.max, `${record.id} capital`)
    assert.ok(record.days >= template.minDays && record.days <= template.maxDays, `${record.id} days`)
    assert.equal(record.mode, mode)
    if (['running', 'paused'].includes(record.status)) assert.ok(record.endAt > now, `${record.id} live past its end`)
    if (record.status === 'completed' && record.stoppedAt) assert.ok(record.stoppedAt <= now, `${record.id} stopped in the future`)
    if (record.dailyStats) {
      const sum = record.dailyStats.reduce((total, day) => total + day.pnl, 0)
      assert.ok(Math.abs(sum - record.pnl) < 0.005, `${record.id} daily stats sum`)
    }
  }
})

test('Earn eligibility uses the simulated profile and blocks without side effects', () => {
  resetLedger()
  assert.equal(earnMockProfile.simulated, true)
  const open = findEarnProduct('usdt90')
  assert.equal(earnEligibilityError(open), null)
  assert.equal(earnEligibilityError({...open, minVerificationLevel: 'advanced'}), 'verificationRequired')
  assert.equal(earnEligibilityError({...open, minVipLevel: earnMockProfile.vipLevel + 1}), 'vipRequired')
  assert.ok(earnProductFacts.every(product => earnEligibilityError(product) === null), 'catalogue defaults are unrestricted')

  const orders = earnPortfolioFor('common.demo.demo').orders.length
  assert.throws(() => recordEarnSubscription({...open, minVipLevel: 9}, 500, 'common.demo.demo'), /vipRequired/)
  assert.equal(earnPortfolioFor('common.demo.demo').orders.length, orders)
  assert.equal(balanceOf('demo', 'USDT'), DEMO_FUNDS.USDT)
  resetLedger()
})

test('a subscription stays pending, snapshots eligibility and touches only its own mode', () => {
  resetLedger()
  const product = findEarnProduct('usdt90')
  const realOrders = earnPortfolioFor('common.demo.real').orders.length
  const order = recordEarnSubscription(product, 500, 'common.demo.demo')
  assert.equal(order.status, 'pending_review')
  assert.equal(order.mode, 'demo')
  assert.deepEqual({level: order.eligibilitySnapshot.verificationLevel, vip: order.eligibilitySnapshot.vipLevel}, {level: earnMockProfile.verificationLevel, vip: earnMockProfile.vipLevel})
  assert.equal(earnPortfolioFor('common.demo.demo').orders[0].id, order.id)
  assert.equal(earnPortfolioFor('common.demo.real').orders.length, realOrders)
  assert.equal(balanceOf('demo', 'USDT'), DEMO_FUNDS.USDT - 500)
  assert.equal(balanceOf('real', 'USDT'), 0)
  // 真實 starts empty, so the same request fails there without creating anything.
  assert.throws(() => recordEarnSubscription(product, 500, 'common.demo.real'), /insufficientBalance/)
  assert.equal(earnPortfolioFor('common.demo.real').orders.length, realOrders)
  earnPortfolioFor('common.demo.demo').orders.shift()
  resetLedger()
})

test('trading records and locks are kept per mode', () => {
  resetLedger()
  const demoBefore = tradeOrdersFor('common.demo.demo').length, realBefore = tradeOrdersFor('common.demo.real').length
  const funding = {lock: {asset: 'USDT', amount: 100}, fill: null}
  assert.equal(placeTradeOrder('common.demo.real', {id: 't-real'}, funding), false)
  assert.equal(placeTradeOrder('common.demo.demo', {id: 't-demo'}, funding), true)
  assert.equal(tradeOrdersFor('common.demo.demo').length, demoBefore + 1)
  assert.equal(tradeOrdersFor('common.demo.real').length, realBefore)
  assert.equal(balanceOf('demo', 'USDT'), DEMO_FUNDS.USDT - 100)
  tradeOrdersFor('common.demo.demo').shift()
  resetLedger()
})

test('strategy balances are live views of each mode’s ledger', () => {
  resetLedger()
  assert.equal(strategyAccounts.demo.balance, DEMO_FUNDS.USDT)
  assert.equal(balanceOf('real', 'USDT'), 0)
  assert.ok(strategyAccounts.demo.wallet.debit('USDT', 250))
  assert.equal(balanceOf('demo', 'USDT'), DEMO_FUNDS.USDT - 250)
  assert.equal(balanceOf('real', 'USDT'), 0)
  resetLedger()
})

test('seeded dates sit relative to now, not a fixed calendar day', () => {
  const holding = earnPortfolios.demo.holdings.find(row => row.id === 'mock-fixed-90')
  assert.ok(holding.maturityAt - now > 70 * DAY && holding.maturityAt - now < 80 * DAY)
})
