import {memoryWallet} from '../mock/ledger.js'
import {nextId} from '../mock/ids.js'
import {clock} from '../mock/clock.js'
// Quant fund prototype logic, modelled on the reference product/subscription flow.
// Pure functions only: the reactive store lives in src/quantFundPortfolio.js.

const TAGS = ['AI Strategy', 'US Equity']

/**
 * Client tiers (confirmed 2026-11-27). termDays is the lock period (null = none, redeemable any time): inside it a
 * redemption pays a fee of earlyRedeemFeeRate% of principal; after it the order keeps earning until redeemed.
 * Quota figures are local mock values; restrictedUids see the product as full.
 */
export function createQuantFundCatalog() {
  return [
    [0.73, null, 4999, 99999, 83.6, 'LOW'],
    [1.25, 7, 100000, 499999, 79.8, 'LOW'],
    [1.79, 15, 500000, 999999, 75.9, 'LOW'],
    [2.35, 30, 1000000, 4999999, 69.6, 'LOW'],
    [2.93, 60, 5000000, 9999999, 52.8, 'LOW'],
    [3.55, 120, 10000000, 100000000, 43.6, 'MEDIUM'],
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
      minHoldDays: null,
      earlyRedeemFeeRate: termDays === null ? 0 : 0.73,
      restrictedUids: [],
      minAmount,
      maxAmount,
      totalQuota,
      subscribed: Math.round(totalQuota * progress / 100),
      perUserQuota: maxAmount,
      riskLevel,
      strategyTags: [...TAGS],
      description: 'AI-managed quantitative arbitrage strategy. Interest accrues daily inside the order and is paid out with the principal on redemption.',
    }
  })
}

export const availableQuota = product => Math.max(0, product.totalQuota - product.subscribed)
/** A user on the product's restricted list sees it full: nothing available to them. */
export const restrictedFor = (product, uid) => uid != null && (product.restrictedUids || []).includes(String(uid))
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

/**
 * Fund account: orders plus one wallet per mode (USDT). `balances` is a read-only view for display and tests; money
 * moves only through the wallets. The default wallets are in-memory (pure tests); the app passes ledger wallets.
 */
export function createFundAccount(balances = {real: 0, demo: 100000}, wallets = {real: memoryWallet({USDT: balances.real}), demo: memoryWallet({USDT: balances.demo})}) {
  return {
    wallets, orders: [], requests: {},
    balances: {get real() { return wallets.real.balance('USDT') }, get demo() { return wallets.demo.balance('USDT') }},
  }
}

/**
 * Submits a subscription. It stays pending review: no interest, no maturity date,
 * no term countdown until an explicit approval (not part of this prototype).
 * Balance and product quota are reserved atomically; a repeated request id returns the first order.
 */
export function subscribeFund(account, product, value, {mode, requestId, now = clock.now(), uid = null}) {
  if (requestId && account.requests[requestId]) return {order: account.orders.find(order => order.id === account.requests[requestId])}
  if (restrictedFor(product, uid)) return {error: {kind: 'exceedsAvailable', available: 0}}
  const balance = account.wallets[mode].balance('USDT')
  const error = fundSubscriptionError(product, value, balance)
  if (error) return {error}
  const principal = Number(value)
  const order = {
    id: nextId('QFO'),
    productId: product.id,
    productName: product.name,
    asset: product.asset,
    principal,
    mode,
    status: 'pending_review',
    dailyReturnPercentSnapshot: product.averageDailyReturnPercent,
    termDaysSnapshot: product.termDays,
    minHoldDaysSnapshot: null,
    earlyRedeemFeeRateSnapshot: product.earlyRedeemFeeRate ?? 0,
    subscribedAt: now,
    maturityDate: null,
    interestPaidTotal: 0,
  }
  if (!account.wallets[mode].debit('USDT', principal)) return {error: {kind: 'insufficientBalance'}}
  // Funding progress counts approved principal only (pending orders do not, review 2026-11-27).
  account.orders.unshift(order)
  if (requestId) account.requests[requestId] = order.id
  return {order}
}

// Same six order statuses as the admin 量化基金 (no cancelled / awaiting top-up flow exists, 2026-11-27).
export const PENDING_STATUSES = ['pending_review', 'redeem_pending_review']
export const HISTORY_STATUSES = ['redeemed', 'rejected']

export function filterFundOrders(orders, group, historyStatus = 'all') {
  if (group === 'pending') return orders.filter(order => PENDING_STATUSES.includes(order.status))
  if (group === 'active') return orders.filter(order => order.status === 'active')
  if (group === 'history') return orders.filter(order => historyStatus === 'all' ? HISTORY_STATUSES.includes(order.status) : order.status === historyStatus)
  return orders
}

export function fundSummary(orders) {
  const active = orders.filter(order => order.status === 'active')
  const settled = orders.filter(order => order.status === 'redeemed')
  return {
    totalPrincipal: active.reduce((sum, order) => sum + order.principal, 0),
    totalProjectedInterest: active.reduce((sum, order) => sum + order.principal * order.dailyReturnPercentSnapshot / 100 * (order.termDaysSnapshot ?? 0), 0),
    activeInterestPaidTotal: active.reduce((sum, order) => sum + order.interestPaidTotal, 0),
    settledTotalReceived: settled.reduce((sum, order) => sum + (order.returned ?? order.principal + order.interestPaidTotal), 0),
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
export function heldDays(order, now = clock.now()) {
  return Math.max(0, Math.floor((now - (order.interestStartAt ?? order.subscribedAt)) / DAY_MS))
}

/** Reference "預估" line: interest accrued on an active order but not yet paid out. */
export function accruedInterestEstimate(order, now = clock.now()) {
  if (!['active', 'redeem_pending_review'].includes(order.status)) return 0
  return Math.max(0, round2(order.principal * order.dailyReturnPercentSnapshot / 100 * heldDays(order, now) - order.interestPaidTotal))
}

/** Any running order can be redeemed; inside the lock period the early-redemption fee applies. */
export const canRedeemFund = order => order.status === 'active'
/** maturityDate marks the end of the lock period; after it the order keeps earning until redeemed. */
export const fundInLock = (order, now = clock.now()) => !!order.maturityDate && now < order.maturityDate
/** Early-redemption fee: the snapshot rate on principal while locked, whatever the days left; none after the lock. */
export const earlyRedeemFee = (order, now = clock.now()) => (fundInLock(order, now) ? round2(order.principal * (order.earlyRedeemFeeRateSnapshot ?? 0) / 100) : 0)

/**
 * Redemption needs an admin review (user decision, 2026-11-27): the request only moves a running order to
 * redeem_pending_review and fixes the fee at that moment; interest keeps accruing until the review.
 * A repeated call is a conflict, not a second request.
 */
export function requestRedeemFund(order, now = clock.now()) {
  if (!order || !canRedeemFund(order)) return {error: 'conflict'}
  order.redeemEarly = fundInLock(order, now)
  order.redeemFee = earlyRedeemFee(order, now)
  order.status = 'redeem_pending_review'
  order.redeemRequestedAt = now
  return {order}
}

/**
 * Closes an order: interest accrued in the order (whole held days, on principal) is paid out with the principal,
 * minus any fee, to the order's own account mode; the product quota is released. Status-guarded.
 */
export function closeFundOrder(account, order, product, now = clock.now(), {fee = 0, auto = false} = {}) {
  if (!order || !['active', 'redeem_pending_review'].includes(order.status)) return {error: 'conflict'}
  const days = heldDays(order, now)
  const interest = Math.max(0, round2(order.principal * order.dailyReturnPercentSnapshot / 100 * days - order.interestPaidTotal))
  if (interest > 0) (order.interestRecords ||= []).unshift({interestDate: now, amount: interest, creditedAt: now})
  order.interestPaidTotal = round2(order.interestPaidTotal + interest)
  const returned = round2(order.principal + order.interestPaidTotal - fee)
  Object.assign(order, {status: 'redeemed', settledAt: now, heldDays: days, redeemFee: fee, returned, autoRedeemed: auto})
  account.wallets[order.mode].credit('USDT', returned)
  // Only approved principal was counted toward funding progress.
  if (product && order.interestStartAt != null) product.subscribed = Math.max(0, product.subscribed - order.principal)
  return {order, returned, days}
}

/**
 * While a product is at 100% progress, every order past its lock period is redeemed automatically (no fee) to
 * release quota; locked orders keep running. Returns the redeemed orders; safe to call repeatedly.
 */
export function autoRedeemFullFunds(account, findProduct, now = clock.now()) {
  const redeemed = []
  for (const order of account.orders) {
    const product = findProduct?.(order.productId)
    if (!product || fundProgress(product) < 100 || order.status !== 'active' || fundInLock(order, now)) continue
    closeFundOrder(account, order, product, now, {auto: true})
    redeemed.push(order)
  }
  return redeemed
}
