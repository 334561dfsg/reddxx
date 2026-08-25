import test from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { useFrontAuthStore } from '../src/stores/frontAuth.js'
import {
  FRONT_DEMO_ACCOUNT_ASSET_CONFIG,
  frontDemoAssetClaimMonthKey
} from '../src/constants/frontAssetCenterDemo.js'

function installStorage(name) {
  const data = new Map()
  globalThis[name] = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    clear: () => data.clear()
  }
  return data
}

test('front account mode defaults to demo and persists confirmed switches', () => {
  const localData = installStorage('localStorage')
  installStorage('sessionStorage')
  setActivePinia(createPinia())

  const auth = useFrontAuthStore()
  auth.ensureHydrated()
  assert.equal(auth.accountMode, 'demo')
  assert.equal(auth.accountModeLabel, '模拟账户')
  assert.equal(auth.nextAccountMode, 'real')
  assert.equal(auth.nextAccountModeLabel, '正式账户')
  assert.equal(auth.login('demo@fex.local', 'Demo123456').ok, true)

  auth.setAccountMode('real')
  assert.equal(auth.accountMode, 'real')
  assert.equal(auth.accountModeLabel, '正式账户')
  assert.equal(auth.nextAccountMode, 'demo')

  setActivePinia(createPinia())
  const restored = useFrontAuthStore()
  restored.ensureHydrated()
  assert.equal(restored.accountMode, 'real')
  assert.equal(JSON.parse(localData.get('fex-front-session-v1')).accountMode, 'real')

  assert.throws(() => restored.setAccountMode('paper'), /账户模式无效/)
})

test('front demo account asset claim mock exposes monthly limit config', () => {
  assert.equal(FRONT_DEMO_ACCOUNT_ASSET_CONFIG.monthlyClaimLimit, 3)
  assert.equal(FRONT_DEMO_ACCOUNT_ASSET_CONFIG.claimAmountUsd, 500000)
  assert.equal(FRONT_DEMO_ACCOUNT_ASSET_CONFIG.currency, 'USDT')
  assert.equal(frontDemoAssetClaimMonthKey(new Date('2026-08-25T00:00:00Z')), '2026-08')
})
