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
      id: 'wallet_user_1004_deposit_usdt_erc20',
      userId: 'user_1004',
      kind: 'deposit',
      coin: 'USDT',
      network: 'ERC20',
      address: '0x7A4e9C2D5f18B6a3E1d0F8c47b92A6D34e5C7B10',
      label: '以太坊 USDT 入金地址',
      status: 'active',
      firstUsedAt: '2025-08-09T10:25:00.000Z',
      lastUsedAt: '2026-07-19T06:50:00.000Z'
    }),
    Object.freeze({
      id: 'wallet_user_1004_deposit_btc_bitcoin',
      userId: 'user_1004',
      kind: 'deposit',
      coin: 'BTC',
      network: 'Bitcoin',
      address: 'bc1q8z7y6x5w4v3u2t1s0r9q8p7n6m5k4j3h2g1f0d',
      label: '比特币入金地址',
      status: 'active',
      firstUsedAt: '2025-11-16T02:40:00.000Z',
      lastUsedAt: '2026-07-15T21:30:00.000Z'
    }),
    Object.freeze({
      id: 'wallet_user_1004_deposit_eth_ethereum',
      userId: 'user_1004',
      kind: 'deposit',
      coin: 'ETH',
      network: 'Ethereum',
      address: '0x3C8F1bA902dE7654cB10A98f67eD54C3210bFE76',
      label: '历史 ETH 入金地址',
      status: 'inactive',
      firstUsedAt: '2025-06-28T17:10:00.000Z',
      lastUsedAt: '2026-02-12T09:05:00.000Z'
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
    }),
    Object.freeze({
      id: 'wallet_user_1004_withdrawal_usdt_erc20',
      userId: 'user_1004',
      kind: 'withdrawal',
      coin: 'USDT',
      network: 'ERC20',
      address: '0x9D2a7E4C1b65F803eA42C9d17B6fE5018c34A7D2',
      label: '历史 ERC20 提现地址',
      status: 'inactive',
      firstUsedAt: '2025-09-21T11:35:00.000Z',
      lastUsedAt: '2026-03-30T04:20:00.000Z'
    }),
    Object.freeze({
      id: 'wallet_user_1004_withdrawal_btc_bitcoin',
      userId: 'user_1004',
      kind: 'withdrawal',
      coin: 'BTC',
      network: 'Bitcoin',
      address: 'bc1q4m8n2b6v0c9x3z7l5k1j8h2g6f0d4s9a7p5q3w',
      label: 'BTC 冷钱包',
      status: 'active',
      firstUsedAt: '2025-12-08T05:55:00.000Z',
      lastUsedAt: '2026-07-11T13:40:00.000Z'
    }),
    Object.freeze({
      id: 'wallet_user_1004_withdrawal_eth_ethereum',
      userId: 'user_1004',
      kind: 'withdrawal',
      coin: 'ETH',
      network: 'Ethereum',
      address: '0x5B1cD8E43fA9076b2C10D5e89A34fB6712cE08D4',
      label: 'ETH 常用钱包',
      status: 'active',
      firstUsedAt: '2025-10-14T19:15:00.000Z',
      lastUsedAt: '2026-07-17T08:25:00.000Z'
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

export const findUserIdsByWalletAddress = (addressKeyword) => {
  const normalizedKeyword = String(addressKeyword ?? '').trim().toLowerCase()
  if (!normalizedKeyword) return []

  const matchedUserIds = []
  for (const wallet of walletByUserId.values()) {
    const hasMatch = wallet.addresses.some((address) =>
      String(address.address).toLowerCase().includes(normalizedKeyword)
    )
    if (hasMatch) matchedUserIds.push(wallet.userId)
  }
  return matchedUserIds
}
