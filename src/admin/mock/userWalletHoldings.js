import { FRONT_ASSET_ACCOUNT_HOLDINGS } from '../../constants/frontAssetCenterDemo.js'

export const USER_WALLETS = Object.freeze([
  { key: 'marketAccount', label: '市值账户', frontAccountKey: 'spot' },
  { key: 'wealthAccount', label: '理财账户', frontAccountKey: 'earn' },
  { key: 'tradingContract', label: '交易合约', frontAccountKey: 'delivery' },
  { key: 'perpetualContract', label: '永续合约', frontAccountKey: 'perpetual' }
])

// Reuse each frontend wallet's demo composition, prices and precision. Scale
// available + frozen holdings to this admin user's existing wallet valuation.
// Zero-balance currencies remain visible, matching the frontend detail view.
export function createMockWalletHoldings(key, total) {
  const wallet = USER_WALLETS.find(wallet => wallet.key === key)
  if (!wallet) throw new Error('未知钱包类型')
  const cents = Math.round(Number(total) * 100)
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('钱包总额无效')
  const source = FRONT_ASSET_ACCOUNT_HOLDINGS[wallet.frontAccountKey]
  const weights = source.map(row => (Number(row.amount) + Number(row.frozen)) * row.latestPrice)
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  const lastFundedIndex = weights.findLastIndex(weight => weight > 0)
  let remaining = cents
  return source.map((row, index) => {
    const value = weights[index] === 0 ? 0 : index === lastFundedIndex ? remaining : Math.floor(cents * weights[index] / totalWeight)
    remaining -= value
    const combined = Number(row.amount) + Number(row.frozen)
    const units = value / 100 / row.latestPrice
    const frozen = combined > 0 ? units * (Number(row.frozen) / combined) : 0
    return {
      coin: row.symbol,
      name: row.name,
      quantity: units - frozen,
      frozen,
      latestPrice: row.latestPrice,
      precision: row.precision,
      valueUsd: value / 100
    }
  })
}
