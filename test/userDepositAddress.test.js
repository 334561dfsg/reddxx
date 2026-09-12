import test from 'node:test'
import assert from 'node:assert/strict'
import { createUserDepositAddressRepository } from '../src/features/user-deposit-address/repository.js'

const a = { coin: 'USDT', network: 'ERC20', address: '0x' + '1'.repeat(40) }
const b = { coin: 'USDT', network: 'TRC20', address: 'T' + 'A'.repeat(33) }
const setup = (extra = {}) => createUserDepositAddressRepository({ userExists: id => ['1', '2'].includes(id), ...extra })
const apply = (r, entries, userIds = ['1', '2'], mode = 'fill') => r.execute(r.preview({ userIds, entries, mode }))

test('preview is read-only; fill skips existing and overwrite changes only specified pairs and users', () => {
  const r = setup()
  const p = r.preview({ userIds: ['1', '2', '1'], entries: [a, b], mode: 'fill' })
  assert.equal(p.userIds.length, 2)
  assert.equal(p.counts.create, 4)
  assert.deepEqual(r.list('1'), [])
  r.execute(p)
  const newA = { ...a, address: '0x' + '2'.repeat(40) }
  assert.equal(apply(r, [newA]).counts.skipped, 2)
  apply(r, [newA], ['1'], 'overwrite')
  assert.equal(r.resolve('1', a.coin, a.network).address, newA.address)
  assert.equal(r.resolve('2', a.coin, a.network).address, a.address)
  assert.equal(r.resolve('1', b.coin, b.network).address, b.address)
})

test('restore removes only named pairs; public fallback never overrides invalid dedicated config', () => {
  const r = setup({ resolvePublic: () => ({ ...a, address: 'public' }) })
  apply(r, [a, b])
  apply(r, [{ coin: a.coin, network: a.network }], ['1'], 'restore')
  assert.equal(r.resolve('1', a.coin, a.network).source, 'public')
  assert.equal(r.resolve('1', b.coin, b.network).source, 'dedicated')
  const invalid = setup({ initialRows: [{ userId: '1', ...a, address: '   ' }], resolvePublic: () => a })
  assert.throws(() => invalid.resolve('1', a.coin, a.network), /失效/)
})

test('rejects unsupported combinations, duplicates, empty sets and empty addresses before any write', () => {
  const r = setup()
  for (const entries of [[{ ...a, coin: 'BTC' }], [a, a], [{ ...a, address: '   ' }], []]) {
    assert.throws(() => r.preview({ userIds: ['1'], entries, mode: 'fill' }))
  }
  assert.throws(() => r.preview({ userIds: [], entries: [a], mode: 'fill' }))
  assert.throws(() => r.preview({ userIds: ['1'], entries: [a], mode: 'oops' }))
  assert.deepEqual(r.list('1'), [])
})

test('frozen preview prevents mutation, conflicts preserve newer edits and replay is idempotent', () => {
  let audits = 0
  const r = setup({ appendAudit: () => { audits++ } })
  const p = r.preview({ userIds: ['1'], entries: [a], mode: 'overwrite' })
  assert.throws(() => { p.entries[0].address = b.address }, TypeError)
  apply(r, [{ ...a, address: '0x' + '3'.repeat(40) }], ['1'])
  const result = r.execute(p)
  assert.equal(result.counts.conflict, 1)
  assert.deepEqual(r.execute(p), result)
  assert.equal(audits, 1)
  assert.throws(() => r.execute({ ...p, requestId: 'fake' }), /预览/)
})

test('partial failures leave failed user unchanged and retry only failed targets', () => {
  let fail = true
  const r = setup({ appendAudit: ({ userId }) => { if (userId === '2' && fail) throw new Error('审计暂不可用') } })
  const result = apply(r, [a])
  assert.equal(result.counts.success, 1)
  assert.equal(result.counts.failed, 1)
  assert.deepEqual(r.list('2'), [])
  fail = false
  const retry = r.execute(r.retryPreview(result.requestId))
  assert.equal(retry.counts.success, 1)
  assert.deepEqual(retry.userIds, ['2'])
})

test('overwrite re-enables an invalid dedicated row even when its address is unchanged', () => {
  const r = setup({ initialRows: [{ userId: '1', ...a, enabled: false }] })
  const result = apply(r, [a], ['1'], 'overwrite')
  assert.equal(result.counts.success, 1)
  assert.equal(r.resolve('1', a.coin, a.network).enabled, true)
})

test('missing public address blocks restoration and preview-time public changes conflict', () => {
  let publicAddress = null
  const r = setup({ resolvePublic: () => publicAddress })
  apply(r, [a], ['1'])
  assert.equal(apply(r, [a], ['1'], 'restore').counts.failed, 1)
  publicAddress = { ...a }
  const p = r.preview({ userIds: ['1'], entries: [a], mode: 'restore' })
  publicAddress = { ...a, address: '0x' + '4'.repeat(40) }
  assert.equal(r.execute(p).counts.conflict, 1)
  assert.equal(r.list('1').length, 1)
})
