// Trading page routes. A market is addressed by its slug, the pair name without the slash (BTC/USDT → BTCUSDT).
// Crypto markets keep a legacy id (BTCUSD) for old links, so lookups accept either; every link the site builds uses
// the slug, so one pair has one canonical URL whichever control (pair panel, drawer, product switch) led there.
export const marketSlug = market => market.name.replace('/', '')

/** The market for a route symbol (slug or legacy id), or null when it is unknown. */
export function findTradingMarket(markets, symbol) {
  if (!symbol) return null
  return markets.find(market => market.id === symbol || marketSlug(market) === symbol) || null
}

/** `/trade/:mode/:slug`, or the phone chart page under it with `{chart: true}`. */
export function tradePath(mode, market, {chart = false} = {}) {
  return `/trade/${mode}/${marketSlug(market)}${chart ? '/chart' : ''}`
}
