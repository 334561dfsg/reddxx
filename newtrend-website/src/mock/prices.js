import {markets} from '../data.js'
// One USDT price snapshot for every domain (valuation, Earn, trading). Stablecoins are 1.
// C2C quotes and the shared lending server keep their own published prices by design.
const STABLE = new Set(['USDT', 'USDC', 'DAI', 'USD'])
export function priceOf(symbol) {
  if (STABLE.has(symbol)) return 1
  const market = markets.find(m => m.symbol === symbol)
  return market && Number.isFinite(Number(market.price)) ? Number(market.price) : 0
}
/** Total USDT value of a {asset: amount} map. */
export const valueInUsdt = balances => Object.entries(balances).reduce((sum, [asset, amount]) => sum + amount * priceOf(asset), 0)
