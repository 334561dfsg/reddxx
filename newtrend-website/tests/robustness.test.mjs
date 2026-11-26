import test from 'node:test'
import assert from 'node:assert/strict'
import {readStorage,writeStorage,removeStorage} from '../src/utils/storage.js'
import {lendingErrorKey} from '../src/utils/lendingErrors.js'
import {subscriptionError,maximumSubscription,earnTerms} from '../src/utils/earnProducts.js'
import {walletRecords,addWalletRecord} from '../src/walletRecords.js'

test('storage helpers survive blocked storage', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, get() { throw new Error('SecurityError') }})
  try {
    assert.equal(readStorage('nt-locale'), null)
    assert.equal(writeStorage('nt-locale', 'en-US'), false)
    assert.doesNotThrow(() => removeStorage('nt-account'))
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else delete globalThis.localStorage
  }
})

test('unknown lending error codes fall back to the generic message', () => {
  assert.equal(lendingErrorKey('balance'), 'lending.errors.balance')
  assert.equal(lendingErrorKey('Failed to fetch'), 'lending.errors.unavailable')
  assert.equal(lendingErrorKey(undefined), 'lending.errors.unavailable')
})

test('Earn per-user quota is cumulative across pending orders and holdings', () => {
  const product = {...earnTerms.usdt90, min: 500, remaining: '7,900,000'} // perUser 200,000
  assert.equal(subscriptionError(product, 150000, 1e9, 0), null)
  assert.deepEqual(subscriptionError(product, 150000, 1e9, 60000), {code: 'perUserQuota', amount: 140000})
  assert.equal(maximumSubscription(product, 1e9, 60000), 140000)
  assert.equal(maximumSubscription(product, 1e9, 250000), 0)
})

test('wallet records are kept per account mode, newest first', () => {
  const demo = 'common.demo.demo', real = 'common.demo.real'
  addWalletRecord(demo, 'transfer', {label: 'a', amount: '10', symbol: 'USDT'}, 1)
  addWalletRecord(demo, 'deposit', {label: 'b', amount: 5, symbol: 'USDT', status: 'pending'}, 2)
  addWalletRecord(real, 'withdraw', {label: 'c', amount: 1, symbol: 'BTC', status: 'pending'}, 3)
  assert.deepEqual(walletRecords.demo.map(r => [r.kind, r.amount, r.status]), [['deposit', 5, 'pending'], ['transfer', 10, 'completed']])
  assert.deepEqual(walletRecords.real.map(r => r.kind), ['withdraw'])
  assert.notEqual(walletRecords.demo[0].id, walletRecords.demo[1].id)
})
