const clone = (value) => JSON.parse(JSON.stringify(value))

const USER_1004_WALLET = Object.freeze({
  userId: 'user_1004',
  addresses: Object.freeze([
    Object.freeze({
      id: 'wallet_user_1004_deposit_usdt_trc20',
      userId: 'user_1004',
      kind: 'deposit',
      coin: 'USDT',
      network: 'TRC20',
      address: 'TQp4YdHg9MSrMWz6p8LcuKf6Y1mJYVvnE5',
      label: '主入金地址',
      status: 'active',
      firstUsedAt: '2025-04-12T08:30:00.000Z',
      lastUsedAt: '2026-07-20T12:15:00.000Z'
    }),
    Object.freeze({
      id: 'wallet_user_1004_withdrawal_usdt_trc20',
      userId: 'user_1004',
      kind: 'withdrawal',
      coin: 'USDT',
      network: 'TRC20',
      address: 'TRxKJ8TmqVe9Hv7uL6VJgWkFq5K2UE1aPZ',
      label: '常用提现地址',
      status: 'active',
      firstUsedAt: '2025-05-03T14:20:00.000Z',
      lastUsedAt: '2026-07-18T03:45:00.000Z'
    })
  ])
})

const walletByUserId = new Map([
  [USER_1004_WALLET.userId, USER_1004_WALLET]
])

const normalizeUserId = (userId) => {
  const normalized = String(userId ?? '').trim()
  if (!normalized) throw new Error('用户 ID 必填')
  return normalized
}

const fallbackWallet = (userId) => ({ userId, addresses: [] })

export const getUserOnchainWallet = (userId) => {
  const normalizedUserId = normalizeUserId(userId)
  return clone(walletByUserId.get(normalizedUserId) || fallbackWallet(normalizedUserId))
}
