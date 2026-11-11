import test from 'node:test'
import assert from 'node:assert/strict'
import { FRONT_ASSET_ACCOUNT_HOLDINGS } from '../src/constants/frontAssetCenterDemo.js'
import { USER_WALLETS, createMockWalletHoldings } from '../src/admin/mock/userWalletHoldings.js'

test('each wallet breakdown reconciles with its displayed total, including rounding and tiny balances', () => {
  for (const wallet of USER_WALLETS) {
    for (const total of [0, 0.01, 0.02, 123.456, 987654.32]) {
      const rows = createMockWalletHoldings(wallet.key, total)
      assert.equal(rows.reduce((sum, row) => sum + Math.round(row.valueUsd * 100), 0), Math.round(total * 100))
      const source = FRONT_ASSET_ACCOUNT_HOLDINGS[wallet.frontAccountKey]
      assert.deepEqual(rows.map(row => row.coin), source.map(row => row.symbol))
      assert.ok(rows.every(row => row.quantity >= 0 && row.frozen >= 0))
      rows.forEach((row, index) => {
        assert.equal(row.latestPrice, source[index].latestPrice)
        assert.equal(row.precision, source[index].precision)
        assert.ok(Math.abs((row.quantity + row.frozen) * row.latestPrice - row.valueUsd) < 1e-8)
        if (Number(source[index].amount) === 0) assert.equal(row.quantity, 0)
        if (Number(source[index].frozen) === 0) assert.equal(row.frozen, 0)
      })
      assert.deepEqual(rows, createMockWalletHoldings(wallet.key, total))
    }
    assert.ok(createMockWalletHoldings(wallet.key, 0).every(row => row.quantity === 0 && row.frozen === 0))
  }
})

test('invalid wallet or totals are not presented as empty holdings', () => {
  assert.throws(() => createMockWalletHoldings('unknown', 10))
  for (const total of [-1, NaN, Infinity]) assert.throws(() => createMockWalletHoldings('marketAccount', total))
})

import { readFileSync } from 'node:fs'

test('wallet detail uses Ant Design components and shared modal protection contracts', () => {
  const source = readFileSync(new URL('../src/admin/components/user/UserWalletHoldingsDialog.vue', import.meta.url), 'utf8')
  for (const component of ['Modal', 'Table', 'Statistic', 'Empty', 'Button']) {
    assert.ok(source.includes(`<${component}`), `missing Ant Design ${component}`)
  }
  assert.match(source, /:mask-closable="false"/)
  assert.match(source, /:focus-trigger-after-close="false"/)
  assert.match(source, /:after-close="afterLeave"/)
  assert.match(source, /useDialogLifecycle/)
  assert.doesNotMatch(source, /<Teleport|<section|<button|bg-slate/)
})

test('wallet-specific frozen positions and funded currencies follow the frontend', () => {
  const spot = createMockWalletHoldings('marketAccount', 10000)
  const earn = createMockWalletHoldings('wealthAccount', 10000)
  const delivery = createMockWalletHoldings('tradingContract', 10000)
  const perp = createMockWalletHoldings('perpetualContract', 10000)
  assert.ok(spot.find(row => row.coin === 'PEPE').frozen > 0)
  assert.ok(earn.find(row => row.coin === 'ETH').frozen > 0)
  assert.ok(delivery.every(row => row.frozen === 0))
  assert.ok(perp.find(row => row.coin === 'USDC').frozen > 0)
  assert.notDeepEqual(spot, earn)
  assert.notDeepEqual(delivery, perp)
})
