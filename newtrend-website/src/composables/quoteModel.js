// Local demonstration quotes. No external market feed or trading state is mutated.
export function nextQuote(quote, direction, magnitude = 1) {
  const decimals = quote.price < 1 ? 6 : quote.price < 10 ? 4 : quote.price < 1000 ? 3 : 2
  const tick = 10 ** -decimals
  const price = Number(Math.max(tick, quote.price + direction * Math.max(tick, quote.price * .00012 * magnitude)).toFixed(decimals))
  const reference = quote.reference ?? quote.price / (1 + quote.change / 100)
  return { ...quote, reference, price, change: (price / reference - 1) * 100, delta: price - reference }
}
export function priceDirection(previous, current) {
  if (!Number.isFinite(previous) || !Number.isFinite(current) || previous === current) return null
  return current > previous ? 'up' : 'down'
}
