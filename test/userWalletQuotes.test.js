import test from 'node:test'
import assert from 'node:assert/strict'
import { valueMockWalletHoldings } from '../src/admin/mock/userWalletQuotes.js'

test('USDT value includes frozen quantity and refresh never changes holdings', () => {
  const rows = [{ coin: 'ETH', quantity: 2, frozen: 1, latestPrice: 3200 }, { coin: 'USDT', quantity: 10, frozen: 5, latestPrice: 1 }]
  const original = structuredClone(rows)
  const initial = valueMockWalletHoldings(rows)
  const refreshed = valueMockWalletHoldings(rows, 1)
  assert.equal(initial[0].valueUsdt, 9600)
  assert.notEqual(refreshed[0].latestPrice, initial[0].latestPrice)
  assert.equal(refreshed[0].valueUsdt, 3 * refreshed[0].latestPrice)
  assert.equal(refreshed[1].valueUsdt, 15)
  assert.deepEqual(rows, original)
  assert.equal(refreshed[0].quantity, 2)
  assert.equal(refreshed[0].frozen, 1)
  assert.deepEqual(valueMockWalletHoldings(rows), initial)
})
