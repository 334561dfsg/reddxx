import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeMinimumUsdt, calculateMinimumQuantity, createMinimumDepositRepository } from '../src/features/minimum-deposit/model.js'

test('normalizes decimal amounts without silently accepting invalid or excessive precision', () => {
  assert.equal(normalizeMinimumUsdt(' 00100.250000 '), '100.25')
  for (const value of ['', '0', '-1', '1e2', '1,000', 'Infinity', '0.0000001', '1000000000000', '1.', null]) {
    assert.throws(() => normalizeMinimumUsdt(value), undefined, String(value))
  }
  assert.equal(normalizeMinimumUsdt('0.000001'), '0.000001')
})

test('rounds converted quantities upward exactly and handles both rate directions', () => {
  const pairs = [
    { baseAsset: 'ETH', quoteAsset: 'USDT', marketRate: '3', enabled: true },
    { baseAsset: 'USDT', quoteAsset: 'BTC', marketRate: '0.000023', enabled: true },
  ]
  assert.equal(calculateMinimumQuantity('100', 'USDT', 6, pairs), '100')
  assert.equal(calculateMinimumQuantity('100', 'ETH', 8, pairs), '33.33333334')
  assert.equal(calculateMinimumQuantity('100', 'BTC', 8, pairs), '0.0023')
  assert.equal(calculateMinimumQuantity('0.000001', 'ETH', 6, pairs), '0.000001')
  assert.equal(calculateMinimumQuantity('0.3', 'ETH', 8, [{ ...pairs[0], marketRate: '0.1' }]), '3')
})

test('never fabricates quantities from missing, disabled or invalid rate and precision data', () => {
  for (const rate of ['0', '-1', 'NaN', 'Infinity']) {
    assert.equal(calculateMinimumQuantity('100', 'ETH', 8, [{ baseAsset: 'ETH', quoteAsset: 'USDT', marketRate: rate, enabled: true }]), null)
  }
  assert.equal(calculateMinimumQuantity('100', 'USDC', 6, []), null)
  assert.equal(calculateMinimumQuantity('100', 'ETH', undefined, []), null)
  assert.equal(calculateMinimumQuantity('100', 'ETH', 8, [{ baseAsset: 'ETH', quoteAsset: 'USDT', marketRate: 3, enabled: false }]), null)
})

test('defaults to 100, persists valid settings, and refuses stale overwrites', () => {
  const map = new Map()
  const storage = { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) }
  const repo = createMinimumDepositRepository(() => storage)
  const initial = repo.read()
  assert.equal(initial.amountUsdt, '100')
  const saved = repo.save('250.50', initial)
  assert.equal(createMinimumDepositRepository(() => storage).read().amountUsdt, '250.5')
  assert.throws(() => repo.save('300', initial), /已更新/)
  assert.throws(() => repo.save('0', saved))
  assert.equal(repo.read().amountUsdt, '250.5')
})

test('storage failures and corrupt configuration do not report success or reset the value', () => {
  const broken = createMinimumDepositRepository(() => ({ getItem: () => '{bad' }))
  assert.throws(() => broken.read(), /读取/)
  const repo = createMinimumDepositRepository(() => ({ getItem: () => null, setItem: () => { throw new Error('quota') } }))
  assert.throws(() => repo.save('200', repo.read()), /保存/)
})

test('MFA gates writes, preserves the frozen amount on retry and rejects duplicate confirmation', async () => {
  const { createMinimumDepositMfaSession } = await import('../src/features/minimum-deposit/model.js')
  let writes = 0
  const repo = { save: (value, snapshot) => { writes++; return { amountUsdt: value, revision: snapshot.revision + 1 } } }
  let release
  const session = createMinimumDepositMfaSession(repo, code => code === '123456' ? new Promise(resolve => { release = resolve }) : Promise.reject(new Error('验证码不正确')))
  const snapshot = { amountUsdt: '100', revision: 0 }
  session.prepare('250', snapshot)
  snapshot.revision = 9
  assert.equal(writes, 0)
  await assert.rejects(session.confirm('000000'), /验证码/)
  assert.equal(writes, 0)
  const pending = session.confirm('123456')
  assert.equal(await session.confirm('123456'), null)
  release()
  assert.deepEqual(await pending, { amountUsdt: '250', revision: 1 })
  assert.equal(writes, 1)
  assert.equal(await session.confirm('123456'), null)
})

test('cancelling or disposing the MFA session prevents a late verification from saving', async () => {
  const { createMinimumDepositMfaSession } = await import('../src/features/minimum-deposit/model.js')
  let release
  let writes = 0
  const session = createMinimumDepositMfaSession({ save: () => { writes++ } }, () => new Promise(resolve => { release = resolve }))
  session.prepare('200', { amountUsdt: '100', revision: 0 })
  const pending = session.confirm('123456')
  session.cancel()
  release()
  assert.equal(await pending, null)
  assert.equal(writes, 0)
})
