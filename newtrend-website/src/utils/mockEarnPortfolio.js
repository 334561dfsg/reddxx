// Synthetic, session-local fixtures. No reference-account records or network writes.
const DAY = 86400000
export const earnPrices = { USDT: 1, USDC: 1, BTC: 60742.62, ETH: 1708.29 }
const round = value => Math.round((value + Number.EPSILON) * 1e8) / 1e8

export function createEarnPortfolio(now = Date.now()) {
  const rows = [
    ['flex-usdt', 'usdt', 'USDT', 12000, 36.9, 'active', 25, 0, true],
    ['fixed-90', 'usdt90', 'USDT', 15000, 48.72, 'active', 14, 90, false],
    ['fixed-180', 'usdt180', 'USDT', 20000, 81.9, 'active', 15, 180, true],
    ['matured-30', 'usdt30', 'USDT', 5000, 24.6, 'matured', 32, 30, true],
    ['flex-btc', 'btc', 'BTC', .18, .0002646, 'active', 30, 0, true],
    ['redeeming-eth', 'eth', 'ETH', 2, .0012, 'redeeming', 10, 0, true],
  ]
  const holdings = rows.map(([id, productId, symbol, principal, accrued, status, age, days, earlyRedemption]) => ({
    id: 'mock-' + id, productId, symbol, principal, accrued, status, earlyRedemption,
    subscribedAt: now - (age + 1) * DAY,
    startedAt: now - age * DAY,
    maturityAt: days ? now + (days - age) * DAY : null,
    lastAccruedAt: now - 6 * 3600000,
    nextAccrualAt: now + 18 * 3600000,
  }))
  const orders = holdings.map((holding, index) => ({
    id: `mock-order-${index + 1}`, productId: holding.productId, symbol: holding.symbol,
    amount: holding.principal, status: 'completed', createdAt: holding.subscribedAt,
    completedAt: holding.startedAt,
  }))
  orders.unshift(
    { id: 'mock-order-review', productId: 'usdc', symbol: 'USDC', amount: 3200, status: 'pending_review', createdAt: now - 2 * 3600000, completedAt: null },
    { id: 'mock-order-rejected', productId: 'usdt30', symbol: 'USDT', amount: 1800, status: 'rejected', createdAt: now - 2 * DAY, completedAt: now - DAY },
  )
  // Older finished subscriptions (redeemed since) so the order list has enough rows to load on scroll (2026-11-27).
  const history = [['usdt', 'USDT', 3000], ['usdt30', 'USDT', 5000], ['btc', 'BTC', .05], ['usdt90', 'USDT', 8000], ['eth', 'ETH', 1.5], ['usdt', 'USDT', 1200], ['usdc', 'USDC', 2500], ['usdt180', 'USDT', 10000]]
  for (let i = 0; i < 16; i++) {
    const [productId, symbol, amount] = history[i % history.length], at = now - (40 + i * 5) * DAY
    orders.push({ id: `mock-order-history-${i + 1}`, productId, symbol, amount, status: 'completed', createdAt: at, completedAt: at + 3600000 })
  }
  const redemptions = [
    { id: 'mock-redeem-pending', holdingId: 'mock-redeeming-eth', productId: 'eth', symbol: 'ETH', amount: 2, reward: .0012, type: 'flexibleFull', status: 'pending', createdAt: now - 3600000, completedAt: null },
    { id: 'mock-redeem-usdt', productId: 'usdt', symbol: 'USDT', amount: 2500, reward: 8.61, type: 'flexiblePartial', status: 'completed', createdAt: now - 3 * DAY, completedAt: now - 3 * DAY + 600000 },
    { id: 'mock-redeem-maturity', productId: 'usdt30', symbol: 'USDT', amount: 3000, reward: 14.76, type: 'fixedMatured', status: 'completed', createdAt: now - 7 * DAY, completedAt: now - 7 * DAY + 600000 },
    { id: 'mock-redeem-early', productId: 'usdt180', symbol: 'USDT', amount: 1000, reward: 0, type: 'fixedEarly', status: 'completed', createdAt: now - 12 * DAY, completedAt: now - 12 * DAY + 600000 },
    ...Array.from({ length: 14 }, (_, i) => ({ id: `mock-redeem-history-${i + 1}`, productId: i % 2 ? 'usdt' : 'usdt30', symbol: 'USDT',
      amount: [1500, 2000, 800, 5000][i % 4], reward: [4.2, 6.9, 2.1, 24.6][i % 4], type: i % 2 ? 'flexiblePartial' : 'fixedMatured', status: 'completed',
      createdAt: now - (16 + i * 4) * DAY, completedAt: now - (16 + i * 4) * DAY + 600000 })),
  ]
  const rewards = Array.from({ length: 40 }, (_, index) => ({
    id: `mock-reward-${index + 1}`, productId: index % 3 === 0 ? 'btc' : 'usdt',
    symbol: index % 3 === 0 ? 'BTC' : 'USDT', amount: index % 3 === 0 ? .00000882 : 1.476,
    status: index === 0 ? 'accrued' : 'paid', rewardAt: now - (index + 1) * DAY,
    paidAt: index === 0 ? null : now - (index + 1) * DAY + 600000,
  }))
  rewards.push(...redemptions.filter(row => row.status === 'completed' && row.reward > 0).map(row => ({
    id: row.id + '-reward', productId: row.productId, symbol: row.symbol,
    amount: row.reward, status: 'paid', rewardAt: row.createdAt, paidAt: row.completedAt,
  })))
  return { holdings, orders, redemptions, rewards }
}

export function earnSummary(portfolio, products) {
  const owned = portfolio.holdings.filter(row => ['active', 'matured', 'redeeming'].includes(row.status))
  const principal = owned.reduce((sum, row) => sum + row.principal * earnPrices[row.symbol], 0)
  const accrued = owned.reduce((sum, row) => sum + row.accrued * earnPrices[row.symbol], 0)
  const daily = owned.filter(row => row.status === 'active').reduce((sum, row) => {
    const product = products.find(item => item.id === row.productId)
    return sum + row.principal * (product?.rate || 0) / 100 * earnPrices[row.symbol]
  }, 0)
  const cumulative = portfolio.rewards.filter(row => row.status === 'paid').reduce((sum, row) => sum + row.amount * earnPrices[row.symbol], 0)
  return { principal, accrued, total: principal + accrued, daily, cumulative }
}

export function redemptionQuote(holding, rawAmount, now = Date.now()) {
  if (!holding || !['active', 'matured'].includes(holding.status)) return { error: 'holdingInactive' }
  const amount = Number(rawAmount)
  if (!Number.isFinite(amount) || amount <= 0 || round(amount) !== amount) return { error: 'invalidAmount' }
  if (amount > holding.principal) return { error: 'exceedsPrincipal', amount: holding.principal }
  const fixed = holding.maturityAt != null
  const early = fixed && holding.maturityAt > now
  if (early && !holding.earlyRedemption) return { error: 'disabled' }
  if (fixed && amount !== holding.principal) return { error: 'invalidAmount' }
  const full = amount === holding.principal
  const accruedShare = round(holding.accrued * amount / holding.principal)
  const reward = early ? 0 : accruedShare
  return {
    amount, reward, accruedShare, early, full,
    receive: round(amount + reward),
    remaining: round(holding.principal - amount),
    type: fixed ? (early ? 'fixedEarly' : 'fixedMatured') : (full ? 'flexibleFull' : 'flexiblePartial'),
  }
}

export function redeemLocalHolding(portfolio, holdingId, amount, { id, now = Date.now(), acknowledgeEarly = false } = {}) {
  // A repeated submission is idempotent, including when only part was redeemed.
  const existing = portfolio.redemptions.find(row => row.id === id)
  if (existing) return { record: existing }
  const holding = portfolio.holdings.find(row => row.id === holdingId)
  const quote = redemptionQuote(holding, amount, now)
  if (quote.error) return quote
  if (quote.early && !acknowledgeEarly) return { error: 'earlyConfirmationRequired' }
  const record = { id, holdingId, productId: holding.productId, symbol: holding.symbol, amount: quote.amount, reward: quote.reward, type: quote.type, status: 'completed', createdAt: now, completedAt: now }
  holding.principal = quote.remaining
  holding.accrued = round(holding.accrued - quote.accruedShare)
  if (quote.full) holding.status = 'redeemed'
  portfolio.redemptions.unshift(record)
  if (quote.reward > 0) portfolio.rewards.unshift({ id: id + '-reward', productId: holding.productId, symbol: holding.symbol, amount: quote.reward, status: 'paid', rewardAt: now, paidAt: now })
  return { record }
}
