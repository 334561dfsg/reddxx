import test from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { useFrontAuthStore } from '../src/stores/frontAuth.js'

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
