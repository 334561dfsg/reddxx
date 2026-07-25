import test from 'node:test'
import assert from 'node:assert/strict'
import { getUserOnchainWallet } from '../src/admin/repositories/userOnchainWalletRepository.js'

const REQUIRED_FIELDS = [
  'id',
  'userId',
  'kind',
  'coin',
  'network',
  'address',
  'label',
  'status',
  'firstUsedAt',
  'lastUsedAt'
]

test('returns deterministic deposit and withdrawal wallet records for user_1004', () => {
  const result = getUserOnchainWallet('user_1004')

  assert.equal(result.userId, 'user_1004')
  assert.deepEqual(result.addresses.map((address) => address.id), [
    'wallet_user_1004_deposit_usdt_trc20',
    'wallet_user_1004_withdrawal_usdt_trc20'
  ])
  assert.deepEqual(result.addresses.map((address) => address.kind), ['deposit', 'withdrawal'])
  for (const address of result.addresses) {
    assert.deepEqual(Object.keys(address).sort(), [...REQUIRED_FIELDS].sort())
    assert.equal(address.userId, 'user_1004')
    assert.equal(address.coin, 'USDT')
    assert.equal(address.network, 'TRC20')
  }
})

test('returns an empty address list for an unknown user', () => {
  assert.deepEqual(getUserOnchainWallet('user_unknown'), {
    userId: 'user_unknown',
    addresses: []
  })
})

test('normalizes user IDs and rejects empty IDs', () => {
  assert.equal(getUserOnchainWallet({ toString: () => 'user_1004' }).userId, 'user_1004')
  assert.throws(() => getUserOnchainWallet('  '), /用户 ID 必填/)
})

test('returns isolated copies of wallet data', () => {
  const first = getUserOnchainWallet('user_1004')
  first.addresses[0].label = 'mutated'
  first.addresses.push({ id: 'mutated' })

  const second = getUserOnchainWallet('user_1004')
  assert.equal(second.addresses[0].label, '主入金地址')
  assert.equal(second.addresses.length, 2)
})
