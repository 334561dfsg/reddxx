import test from 'node:test'
import assert from 'node:assert/strict'
import * as model from '../src/features/minimum-deposit/model.js'
import { frontAssetHoldingCoinMarket } from '../src/constants/frontAssetCenterDemo.js'

test('front deposit uses configured USDT value and the selected coin price/precision', () => {
  const usdt = frontAssetHoldingCoinMarket('USDT').usdPrice
  assert.equal(model.calculateMinimumFromUsdPrices('100', frontAssetHoldingCoinMarket('USDC'), usdt), '100')
  assert.equal(model.calculateMinimumFromUsdPrices('250', frontAssetHoldingCoinMarket('USDC'), usdt), '250')
  assert.equal(model.calculateMinimumFromUsdPrices('100', frontAssetHoldingCoinMarket('ETH'), usdt), '0.03125')
  assert.equal(model.calculateMinimumFromUsdPrices('100', frontAssetHoldingCoinMarket('BTC'), usdt), '0.00102041')
  assert.equal(model.calculateMinimumFromUsdPrices('100', frontAssetHoldingCoinMarket('TRX'), usdt), '434.782609')
})

test('USD conversion respects the USDT quote price and does not fabricate unavailable prices', () => {
  assert.equal(model.calculateMinimumFromUsdPrices('100', { usdPrice: '3', precision: 6 }, '1.02'), '34')
  for (const coin of [undefined, { usdPrice: 0, precision: 6 }, { usdPrice: -1, precision: 6 }, { usdPrice: 1 }]) {
    assert.equal(model.calculateMinimumFromUsdPrices('100', coin, 1), null)
  }
  assert.equal(model.calculateMinimumFromUsdPrices('100', { usdPrice: 1, precision: 6 }, 0), null)
})
