// One USDT price source for every domain (valuation, Earn, flash exchange, totals) — review 2026-11-27, replacing the
// static-snapshot / live-stream / Earn-table split. Priority: the live market stream (registered by api/market.js),
// then the page's market snapshot (registered by data.js), then built-in fallbacks so Node tests price without the
// Vite-only modules. Stablecoins are 1. C2C quotes and the shared lending server keep their own published prices.
const STABLE = new Set(['USDT', 'USDC', 'DAI', 'USD'])
const FALLBACK = {BTC: 60742.62, ETH: 1708.29}
const snapshot = {...FALLBACK}
let live = null

/** data.js registers the market snapshot ([symbol, price] pairs) on load. */
export function registerSnapshotPrices(entries) {
  for (const [symbol, price] of entries) if (Number(price) > 0) snapshot[symbol] = Number(price)
}
/** api/market.js registers the live stream: symbol → current price or null. */
export function setLivePrices(lookup) { live = lookup }

export function priceOf(symbol) {
  if (STABLE.has(symbol)) return 1
  const current = live?.(symbol)
  if (Number.isFinite(current) && current > 0) return current
  return snapshot[symbol] || 0
}
/** Total USDT value of a {asset: amount} map. */
export const valueInUsdt = balances => Object.entries(balances).reduce((sum, [asset, amount]) => sum + amount * priceOf(asset), 0)
