import test from 'node:test'
import assert from 'node:assert/strict'
import { createPublicDepositAddressRepository } from '../src/admin/mock/publicDepositAddress.js'
import { createUserDepositAddressRepository } from '../src/features/user-deposit-address/repository.js'
import { createDepositAddressRotation } from '../src/features/user-deposit-address/rotation.js'
const old = { id: 'p1', coin: 'USDT', network: 'ERC20', address: '0x' + '1'.repeat(40), enabled: true }
const next = '0x' + '2'.repeat(40)
function setup(verify = async code => { if (code !== '123456') throw new Error('验证码错误') }) {
  const publicRepo = createPublicDepositAddressRepository([old])
  const userRepo = createUserDepositAddressRepository({ userExists: id => id === 'u1', resolvePublic: (...args) => publicRepo.resolve(...args) })
  const rotation = createDepositAddressRotation({ publicRepo, userRepo, verify, userExists: id => id === 'u1' })
  return { publicRepo, userRepo, rotation }
}
test('verification precedes writes; changed public address is pinned to the user and replaced for others', async () => {
  const { rotation, publicRepo, userRepo } = setup()
  const session = rotation.open('u1')
  const plan = rotation.prepare(session, [{ id: old.id, address: next }])
  assert.equal(publicRepo.resolve('USDT', 'ERC20').address, old.address)
  assert.equal(userRepo.list('u1').length, 0)
  await assert.rejects(rotation.confirm(plan, 'bad'), /验证码/)
  assert.equal(publicRepo.resolve('USDT', 'ERC20').address, old.address)
  await rotation.confirm(plan, '123456')
  assert.equal(userRepo.resolve('u1', 'USDT', 'ERC20').address, old.address)
  assert.equal(userRepo.resolve('someone-else', 'USDT', 'ERC20').address, next)
  assert.equal(publicRepo.list().filter(row => row.enabled).length, 1)
  const logCount = publicRepo.listLogs('p1').length
  await rotation.confirm(plan, '123456')
  assert.equal(publicRepo.listLogs('p1').length, logCount)
})
test('no edits, invalid address and stale public snapshot never write', async () => {
  const { rotation, publicRepo, userRepo } = setup()
  const session = rotation.open('u1')
  assert.throws(() => rotation.prepare(session, [{ id: old.id, address: old.address }]), /未修改/)
  assert.throws(() => rotation.prepare(session, [{ id: old.id, address: 'bad' }]), /格式/)
  const plan = rotation.prepare(session, [{ id: old.id, address: next }])
  publicRepo.save({ ...old, address: '0x' + '3'.repeat(40) })
  await assert.rejects(rotation.confirm(plan, '123456'), /变化/)
  assert.equal(userRepo.list('u1').length, 0)
})
test('write failure rolls back public, private and repository receipts', async () => {
  const { rotation, publicRepo, userRepo } = setup()
  const plan = rotation.prepare(rotation.open('u1'), [{ id: old.id, address: next }])
  const save = publicRepo.save
  publicRepo.save = payload => { save(payload); throw new Error('写入失败') }
  await assert.rejects(rotation.confirm(plan, '123456'), /写入失败/)
  assert.equal(publicRepo.resolve('USDT', 'ERC20').address, old.address)
  assert.deepEqual(publicRepo.listLogs('p1'), [])
  assert.equal(userRepo.list('u1').length, 0)
  publicRepo.save = save
  await rotation.confirm(plan, '123456')
  assert.equal(userRepo.list('u1').length, 1)
})
test('cancel during verification invalidates the plan and duplicate requests share one execution', async () => {
  let finish
  let calls = 0
  const { rotation, publicRepo } = setup(() => { calls++; return new Promise(resolve => { finish = resolve }) })
  const plan = rotation.prepare(rotation.open('u1'), [{ id: old.id, address: next }])
  const first = rotation.confirm(plan, '123456')
  const second = rotation.confirm(plan, '123456')
  assert.equal(calls, 1)
  rotation.cancel(plan)
  finish()
  await assert.rejects(first, /取消/)
  await assert.rejects(second, /取消/)
  assert.equal(publicRepo.resolve('USDT', 'ERC20').address, old.address)
})

test('multiple changed networks commit together; later failure rolls back audit and leaves untouched coins inherited', async () => {
  const second = { ...old, id: 'p2', coin: 'USDC' }
  const untouched = { ...old, id: 'p3', coin: 'ETH', network: 'Ethereum' }
  const publicRepo = createPublicDepositAddressRepository([old, second, untouched])
  const audit = []
  const userRepo = createUserDepositAddressRepository({ userExists: () => true, resolvePublic: (...args) => publicRepo.resolve(...args), appendAudit: row => audit.push(row) })
  const rotation = createDepositAddressRotation({ publicRepo, userRepo, userExists: () => true, verify: async () => {}, auditTransaction: work => {
    const length = audit.length
    try { return work() } catch (error) { audit.length = length; throw error }
  } })
  const session = rotation.open('u1')
  const plan = rotation.prepare(session, session.addresses.map(row => ({ ...row, address: row.id === 'p3' ? row.address : next })))
  const save = publicRepo.save
  publicRepo.save = row => { const saved = save(row); if (row.id === 'p2') throw new Error('第二项失败'); return saved }
  await assert.rejects(rotation.confirm(plan, '123456'), /第二项失败/)
  assert.deepEqual(publicRepo.list(), createPublicDepositAddressRepository([old, second, untouched]).list())
  assert.equal(userRepo.list('u1').length, 0)
  assert.equal(audit.length, 0)
  publicRepo.save = save
  await rotation.confirm(plan, '123456')
  assert.equal(userRepo.list('u1').length, 2)
  assert.equal(audit.length, 2)
  assert.equal(publicRepo.resolve('USDT', 'ERC20').address, next)
  assert.equal(publicRepo.resolve('USDC', 'ERC20').address, next)
  assert.equal(publicRepo.resolve('ETH', 'Ethereum').address, untouched.address)
  assert.equal(userRepo.list('u1').some(row => row.coin === 'ETH'), false)
})
