// Deposit/withdraw chain catalogue (measured from newtrendcapital.com/zh-TW/deposit and /withdraw, 2026-11-26).
// Shared by the deposit and withdraw pages and the wallet service. Withdraw fees are 0 on the reference;
// change them here and both the page summary and the server-side settlement follow.
export const CHAIN_COINS = [
  {symbol: 'USDT', networks: ['ETH', 'TRX', 'SOL', 'BASE']},
  {symbol: 'ETH', networks: ['ETH']},
  {symbol: 'BTC', networks: ['BTC']},
  {symbol: 'USDC', networks: ['ETH', 'SOL', 'BASE']},
  {symbol: 'SOL', networks: ['SOL']},
  {symbol: 'DAI', networks: ['ETH']},
]
export const networksOf = symbol => CHAIN_COINS.find(coin => coin.symbol === symbol)?.networks || []

/** Withdraw fee in the coin's own unit for a coin/network pair (all 0, as on the reference). */
export const withdrawFee = (/* symbol, network */) => 0

/** Address formats per network; the withdraw API rejects anything else. */
export const ADDRESS_FORMATS = {
  ETH: /^0x[0-9a-fA-F]{40}$/,
  BASE: /^0x[0-9a-fA-F]{40}$/,
  TRX: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
  SOL: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  BTC: /^(bc1[02-9ac-hj-np-z]{11,71}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/,
}
export const ADDRESS_MAX_LENGTH = 128
export const validAddress = (network, address) => Boolean(ADDRESS_FORMATS[network]?.test(String(address || '').trim()))
