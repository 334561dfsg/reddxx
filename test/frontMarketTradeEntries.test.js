import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  buildFrontMarketTradeEntries,
  frontMarketPairQuery,
  normalizeFrontMarketTradeModes
} from '../src/constants/frontMarketTradeEntries.js'

test('front market trade entries include only supported modes for a pair', () => {
  const row = {
    assetClass: 'crypto',
    base: 'BTC',
    quote: 'USDT',
    tradeModes: ['spot', 'perpetual']
  }

  assert.deepEqual(buildFrontMarketTradeEntries('/front', row), [
    {
      key: 'spot',
      label: '现货',
      to: '/front/trade/crypto/spot?pair=BTC-USDT'
    },
    {
      key: 'perpetual',
      label: '永续',
      to: '/front/trade/crypto/perpetual?pair=BTC-USDT'
    }
  ])
})

test('front market page opens a trade choice dialog from market rows', () => {
  const pageSource = readFileSync(
    new URL('../src/pages/front/FrontMarketPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(pageSource, /openTradeChoice\(row\)/)
  assert.match(pageSource, /FrontPopupShell/)
  assert.match(pageSource, /tradeChoiceEntries/)
  assert.doesNotMatch(pageSource, /tradeEntryTo/)
})

test('front market trade entries fall back to perpetual when modes are missing', () => {
  const row = {
    assetClass: 'metal',
    symbol: 'XAU',
    quote: 'USD'
  }

  assert.deepEqual(normalizeFrontMarketTradeModes(row), ['perpetual'])
  assert.equal(frontMarketPairQuery(row), 'XAU-USD')
  assert.deepEqual(buildFrontMarketTradeEntries('/front', row), [
    {
      key: 'perpetual',
      label: '永续',
      to: '/front/trade/metal/perpetual?pair=XAU-USD'
    }
  ])
})
