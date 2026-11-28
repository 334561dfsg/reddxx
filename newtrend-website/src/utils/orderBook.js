// Order book rows for the trading pages (pure, shared by the panel and tests).
// Depth like newtrendcapital.com/zh-TW/trade (read 2026-11-26): each row's background bar is the cumulative size from
// the spread out to that level as a share of the visible side, so bars step up away from the spread and are redrawn on
// every push; 累計 is the running total (USDT) in the same direction.

/**
 * Rows for one side. `levels` is [price, quantity][]: asks farthest-first, bids nearest-first, as pushed. Keeps the
 * `count` levels nearest the spread, in display order (asks still farthest-first), each with
 * {price, qty, cumQty, cumValue, share} where share is the cumulative quantity in % of the visible side.
 */
export function bookSide(levels, side, count) {
  const visible = side === 'ask' ? levels.slice(-count) : levels.slice(0, count)
  const fromSpread = side === 'ask' ? [...visible].reverse() : visible
  let qty = 0, value = 0
  const rows = fromSpread.map(([price, q]) => { qty += q; value += q * price; return {price, qty: q, cumQty: qty, cumValue: value} })
  const total = qty || 1
  for (const row of rows) row.share = Math.round(row.cumQty / total * 10000) / 100
  return side === 'ask' ? rows.reverse() : rows
}

/**
 * 累計 is a USDT running total, not a price: 2 decimals from 1 up, at most 4 below (0.0026 rather than the price
 * formatter's 0.00255906) and "<0.0001" for smaller totals, so the column stays one line on narrow desktop books.
 */
export function formatBookTotal(value) {
  if (value >= 1) return value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})
  if (value > 0 && value < 0.0001) return '<0.0001'
  return value.toLocaleString('en-US', {maximumFractionDigits: 4})
}
