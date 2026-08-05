import test from 'node:test'
import assert from 'node:assert/strict'
import {
  findUserIdsByWalletAddress,
  getUserOnchainWallet
} from '../src/admin/repositories/userOnchainWalletRepository.js'

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
  assert.equal(result.addresses.length, 8)
  assert.equal(result.addresses.filter((address) => address.kind === 'deposit').length, 4)
  assert.equal(result.addresses.filter((address) => address.kind === 'withdrawal').length, 4)
  assert.equal(new Set(result.addresses.map((address) => address.id)).size, 8)
  const expectedPairs = new Set(['USDT:TRC20', 'USDT:ERC20', 'BTC:Bitcoin', 'ETH:Ethereum'])
  assert.deepEqual(new Set(result.addresses.map((address) => `${address.coin}:${address.network}`)), expectedPairs)
  assert.deepEqual(new Set(result.addresses.map((address) => address.status)), new Set(['active', 'inactive']))
  for (const kind of ['deposit', 'withdrawal']) {
    const pairs = result.addresses
      .filter((address) => address.kind === kind)
      .map((address) => `${address.coin}:${address.network}`)
    assert.deepEqual(new Set(pairs), expectedPairs)
  }
  for (const address of result.addresses) {
    assert.deepEqual(Object.keys(address).sort(), [...REQUIRED_FIELDS].sort())
    assert.equal(address.userId, 'user_1004')
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
  assert.equal(second.addresses.length, 8)
})

test('finds user IDs by exact or partial wallet address without case sensitivity', () => {
  assert.deepEqual(findUserIdsByWalletAddress('0x7a4e9c2d5f18b6a3'), ['user_1004'])
  assert.deepEqual(findUserIdsByWalletAddress('  TRxKJ8TmqVe9Hv7uL6VJ  '), ['user_1004'])
  assert.deepEqual(findUserIdsByWalletAddress('missing-wallet-address'), [])
})
