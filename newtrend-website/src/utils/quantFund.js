// Quant fund prototype logic, modelled on the reference product/subscription flow.
// Pure functions only: the reactive store lives in src/quantFundPortfolio.js.

const TAGS = ['AI Strategy', 'US Equity']

/** Public catalog snapshot (2026-11-26). Quota figures are local mock values. */
export function createQuantFundCatalog() {
  return [
    [0.73, null, 4999, 99999, 83.6, 'LOW'],
    [1.25, 7, 100000, 499999, 79.8, 'LOW'],
    [1.79, 15, 500000, 999999, 75.9, 'LOW'],
    [2.35, 30, 1000000, 4999999, 69.6, 'LOW'],
    [2.93, 60, 5000000, 10000000, 52.8, 'LOW'],
    [3.55, 90, 10000000, 100000000, 43.6, 'MEDIUM'],
  ].map(([rate, termDays, minAmount, maxAmount, progress, riskLevel], vip) => {
    const totalQuota = Math.ceil(maxAmount / 100000) * 100000 * 20
    return {
      id: `qf-vip${vip}`,
      code: `QF-VIP${vip}`,
      name: `AI Fund (Quant Automated Arbitrage) VIP ${vip}`,
      asset: 'USDT',
      averageDailyReturnPercent: rate,
      dailyRate: rate / 100,
      termDays,
      minHoldDays: termDays === null ? 1 : null,
      minAmount,
      maxAmount,
      totalQuota,
      subscribed: Math.round(totalQuota * progress / 100),
      perUserQuota: maxAmount,
      riskLevel,
      strategyTags: [...TAGS],
      description: 'AI-managed quantitative arbitrage strategy. Principal is locked for the stated term and earns the published average daily return.',
    }
  })
}

export const availableQuota = product => Math.max(0, product.totalQuota - product.subscribed)
export const fundProgress = product => Math.min(100, product.subscribed / product.totalQuota * 100)
export const isAmountDraft = value => value === '' || /^\d*(\.\d*)?$/.test(value)

/** Mirrors the reference validation order: invalid → range → remaining quota → balance. */
export function fundSubscriptionError(product, value, balance) {
  const text = String(value ?? '').trim()
  if (!text || text === '.' || !isAmountDraft(text)) return {kind: 'invalid'}
  const amount = Number(text)
  if (!Number.isFinite(amount) || amount <= 0) return {kind: 'invalid'}
  if (amount < product.minAmount || (product.maxAmount !== null && amount > product.maxAmount)) return {kind: 'range'}
  const available = availableQuota(product)
  if (amount > available) return {kind: 'exceedsAvailable', available}
  if (balance !== null && amount > balance) return {kind: 'insufficientBalance', available: balance}
  return null
}

/** Largest amount the MAX button may fill: the smallest of balance, remaining quota and product maximum. */
export function maxFundSubscription(product, balance) {
  return Math.max(0, Math.min(...[balance, availableQuota(product), product.maxAmount].filter(value => value !== null)))
}

const roundDown = value => Math.floor(value * 100) / 100

export function fundEstimate(product, amount, days) {
  const principal = Number(amount)
  if (!Number.isFinite(principal) || principal <= 0) return null
  const daily = roundDown(principal * product.dailyRate)
  return {daily, total: roundDown(principal * product.dailyRate * days)}
}

export function createFundAccount(balances = {real: 0, demo: 100000}) {
  return {balances: {...balances}, orders: [], requests: {}}
}

/**
 * Submits a subscription. It stays pending review: no interest, no maturity date,
 * no term countdown until an explicit approval (not part of this prototype).
 * Balance and product quota are reserved atomically; a repeated request id returns the first order.
 */
export function subscribeFund(account, product, value, {mode, requestId, now = Date.now()}) {
  if (requestId && account.requests[requestId]) return {order: account.orders.find(order => order.id === account.requests[requestId])}
  const balance = account.balances[mode]
  const error = fundSubscriptionError(product, value, balance)
  if (error) return {error}
  const principal = Number(value)
  const order = {
    id: `QFO-${now}-${account.orders.length + 1}`,
    productId: product.id,
    productName: product.name,
    asset: product.asset,
    principal,
    mode,
    status: 'pending_review',
    dailyReturnPercentSnapshot: product.averageDailyReturnPercent,
    termDaysSnapshot: product.termDays,
    minHoldDaysSnapshot: product.minHoldDays,
    subscribedAt: now,
    maturityDate: null,
    interestPaidTotal: 0,
  }
  account.balances[mode] = balance - principal
  product.subscribed += principal
  account.orders.unshift(order)
  if (requestId) account.requests[requestId] = order.id
  return {order}
}

export const PENDING_STATUSES = ['awaiting_top_up', 'pending_review', 'redeem_pending_review']
export const HISTORY_STATUSES = ['settled', 'redeemed', 'rejected', 'cancelled']

export function filterFundOrders(orders, group, historyStatus = 'all') {
  if (group === 'pending') return orders.filter(order => PENDING_STATUSES.includes(order.status))
  if (group === 'active') return orders.filter(order => order.status === 'active')
  if (group === 'history') return orders.filter(order => historyStatus === 'all' ? HISTORY_STATUSES.includes(order.status) : order.status === historyStatus)
  return orders
}

export function fundSummary(orders) {
  const active = orders.filter(order => order.status === 'active')
  const settled = orders.filter(order => ['settled', 'redeemed'].includes(order.status))
  return {
    totalPrincipal: active.reduce((sum, order) => sum + order.principal, 0),
    totalProjectedInterest: active.reduce((sum, order) => sum + order.principal * order.dailyReturnPercentSnapshot / 100 * (order.termDaysSnapshot ?? 0), 0),
    activeInterestPaidTotal: active.reduce((sum, order) => sum + order.interestPaidTotal, 0),
    settledTotalReceived: settled.reduce((sum, order) => sum + order.principal + order.interestPaidTotal, 0),
    activeCount: active.length,
    pendingCount: orders.filter(order => PENDING_STATUSES.includes(order.status)).length,
  }
}

const pad = value => String(value).padStart(2, '0')
/** Reference positions dates: ISO calendar date in tables, date + time in the order drawer; a missing date is a single em dash. */
export function fundDate(value, withTime = false) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return withTime ? `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}` : day
}

/** Interest progress shown in the positions summary; null when nothing is projected yet. */
export function interestProgress(paid, projected) {
  if (!(projected > 0)) return null
  return Math.max(0, Math.min(100, paid / projected * 100))
}

const DAY_MS = 86400000
const round2 = value => Math.round(value * 100) / 100

/** Whole days an approved order has been earning, counted from interest start (approval) or subscription. */
export function heldDays(order, now = Date.now()) {
  return Math.max(0, Math.floor((now - (order.interestStartAt ?? order.subscribedAt)) / DAY_MS))
}

/** Reference "預估" line: interest accrued on an active order but not yet paid out. */
export function accruedInterestEstimate(order, now = Date.now()) {
  if (order.status !== 'active') return 0
  return Math.max(0, round2(order.principal * order.dailyReturnPercentSnapshot / 100 * heldDays(order, now) - order.interestPaidTotal))
}

/** Only running flexible orders expose redemption, matching the reference positions row. */
export const canRedeemFund = order => order.status === 'active' && order.termDaysSnapshot == null

/**
 * Settles a flexible redemption locally in one step: interest for whole held days (none below the minimum
 * hold), minus interest already paid, credited with principal to the order's own account mode.
 * The status guard makes a repeated call a no-op conflict instead of a second payout.
 */
export function redeemFund(account, order, product, now = Date.now()) {
  if (!order || !canRedeemFund(order)) return {error: 'conflict'}
  const days = heldDays(order, now)
  const eligible = days > 0 && days >= (order.minHoldDaysSnapshot ?? 0)
  const interest = eligible ? Math.max(0, round2(order.principal * order.dailyReturnPercentSnapshot / 100 * days - order.interestPaidTotal)) : 0
  order.status = 'redeemed'
  order.settledAt = now
  order.heldDays = days
  order.settledInterest = interest
  order.interestPaidTotal = round2(order.interestPaidTotal + interest)
  if (interest > 0) (order.interestRecords ||= []).unshift({interestDate: now, amount: interest, creditedAt: now})
  account.balances[order.mode] = round2((account.balances[order.mode] || 0) + order.principal + interest)
  if (product) product.subscribed = Math.max(0, product.subscribed - order.principal)
  return {order, principal: order.principal, interest, days}
}
