import test from 'node:test'
import assert from 'node:assert/strict'
import { useMarketFavorites } from '../src/composables/useMarketFavorites.js'

test('favorites survive page recreation, removal persists, and namespaces stay separate', () => {
  const values = new Map()
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  const first = useMarketFavorites('terminal')
  first.favorite('BTCUSD')
  first.favorite('ETHUSD')
  const reloaded = useMarketFavorites('terminal')
  assert.deepEqual([...reloaded.favorites.value], ['BTCUSD', 'ETHUSD'])
  assert.deepEqual([...useMarketFavorites('other-terminal').favorites.value], [])
  reloaded.favorite('BTCUSD')
  assert.deepEqual([...useMarketFavorites('terminal').favorites.value], ['ETHUSD'])
})

test('corrupt storage and browser storage restrictions do not break favorites', () => {
  for (const raw of ['invalid-json', '{}', 'null']) {
    globalThis.localStorage = { getItem: () => raw }
    assert.deepEqual([...useMarketFavorites('terminal').favorites.value], [])
  }
  globalThis.localStorage = { getItem: () => '["BTCUSD",null,123,"BTCUSD",""]' }
  assert.deepEqual([...useMarketFavorites('terminal').favorites.value], ['BTCUSD'])
  globalThis.localStorage = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('quota') } }
  const terminal = useMarketFavorites('terminal')
  terminal.favorite('ETHUSD')
  assert.deepEqual([...terminal.favorites.value], ['ETHUSD'])
})
