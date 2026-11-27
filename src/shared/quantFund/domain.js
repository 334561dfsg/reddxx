import {eligibilityFailures, validateEligibility} from '../lending/eligibility.js'

// Quant Fund ledger for the admin (/admin/quant-fund/*). Pure functions over a plain state object; the in-page
// service owns the single in-memory instance (static mock data, user decision 2026-11-27).
// Every command works on a private copy and is committed only after all checks pass.
//
// Business rules (user decisions, 2026-11-27):
// - Subscriptions stay pending review with no interest or maturity until an explicit approval.
// - Daily interest is paid once per full day after approval, at a rate drawn inside the product's configured
//   daily-rate range (frozen into the order at subscription). The public site shows the range average.
// - Flexible orders may request redemption after the minimum holding days; redemption needs an admin review.
//   Interest keeps accruing while the request waits. Approval returns the principal; rejection restores the order.
// - Fixed-term orders settle automatically at maturity (principal returned; interest was already paid daily).

export const DAY = 86400000
export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'EXTREME']
/** Fund identifier coin shown on public cards (icon + asset filter). Display only: subscriptions, payouts and
 * redemptions are always USDT (user decision, 2026-11-27). */
export const ASSETS = ['USDT', 'USDC', 'BTC', 'ETH', 'SOL']
/** Statuses whose principal is approved and counts toward the product's funded amount. */
export const FUNDED = ['active', 'redeem_pending_review']
export const ADMIN = '管理员（模拟）'
export const SYSTEM = '系统'
export const USER = '用户（模拟）'

export const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100
const fail = (ok, code) => { if (!ok) throw new Error(code) }
const finite = value => typeof value === 'number' && Number.isFinite(value)
/** Calendar day in the site's display zone (UTC+8). */
export const dayKey = ms => new Date(ms + 8 * 3600000).toISOString().slice(0, 10)

export function createQuantFundState({products = [], balances = {}, profiles = {}} = {}) {
  return {version: 1, products, orders: [], redemptions: [], payouts: [], logs: [], requests: [], balances, profiles}
}

function log(s, entry, now) {
  s.logs.unshift({id: `QL-${now}-${s.logs.length + 1}`, createdAt: now, ...entry})
}
function credit(s, userId, amount) {
  const wallet = s.balances[userId] ||= {USDT: 0}
  const next = money((wallet.USDT || 0) + amount)
  fail(next >= 0, 'balance')
  wallet.USDT = next
}

// ---------- products ----------

/** Mock base amount shown as already raised; operators enter it as a percentage of the total quota. */
export const initialSubscribed = p => money(p.totalQuota * (p.initialPercent || 0) / 100)
/** Approved principal still invested (active or waiting for redemption review). */
export const fundedPrincipal = (s, productId) => money(s.orders.filter(o => o.productSnapshot.productId === productId && FUNDED.includes(o.status)).reduce((t, o) => t + o.principal, 0))
/** Funding progress and remaining quota use the mock base plus approved principal only. */
export const raisedAmount = (s, p) => money(initialSubscribed(p) + fundedPrincipal(s, p.productId))
export const remainingQuota = (s, p) => Math.max(0, money(p.totalQuota - raisedAmount(s, p)))
/** The single rate the public site displays: the middle of the configured range. */
export const displayRate = p => Number(((p.dailyRate.min + p.dailyRate.max) / 2).toFixed(4))

export function validateProduct(p) {
  fail(typeof p?.name === 'string' && p.name.trim(), 'productName')
  fail(typeof p.code === 'string' && /^[A-Z0-9-]{2,32}$/.test(p.code.trim()), 'productCode')
  fail(ASSETS.includes(p.asset), 'productAsset')
  fail(RISK_LEVELS.includes(p.riskLevel), 'productRisk')
  fail(Array.isArray(p.tags) && p.tags.every(x => typeof x === 'string' && x.trim()), 'productTags')
  fail(p.termDays === null || (Number.isInteger(p.termDays) && p.termDays >= 1), 'productTerm')
  fail(p.termDays !== null || (Number.isInteger(p.minHoldDays) && p.minHoldDays >= 0), 'productMinHold')
  fail(finite(p.minAmount) && p.minAmount > 0 && finite(p.maxAmount) && p.maxAmount >= p.minAmount, 'productAmount')
  fail(finite(p.totalQuota) && p.totalQuota >= p.maxAmount, 'productQuota')
  fail(finite(p.initialPercent) && p.initialPercent >= 0 && p.initialPercent <= 100, 'productInitial')
  const r = p.dailyRate
  fail(r && finite(r.min) && finite(r.max) && r.min >= 0 && r.min <= r.max && r.max <= 100, 'productRate')
  fail(Number.isInteger(p.sortOrder), 'productSort')
  validateEligibility(p)
}

/** Terms frozen into an order; later product edits never reach existing orders. */
export const productSnapshot = p => structuredClone({
  productId: p.productId, version: p.version, code: p.code, name: p.name, asset: p.asset, riskLevel: p.riskLevel,
  termDays: p.termDays, minHoldDays: p.termDays === null ? p.minHoldDays : null, dailyRate: p.dailyRate,
})

// ---------- daily interest and maturity ----------

function rng(seed) {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
/** Deterministic daily rate for one order-day inside the frozen range (same day → same rate). */
export function dailyRateFor(order, dayStart) {
  const {min, max} = order.productSnapshot.dailyRate
  return Number((min + (max - min) * rng(`${order.orderId}:${dayKey(dayStart)}`)()).toFixed(4))
}

/** Moves every funded order forward to `now`: one payout per completed day, then fixed-term maturity. Idempotent. */
export function advance(s, now = Date.now()) {
  for (const order of s.orders) {
    if (!FUNDED.includes(order.status)) continue
    const end = order.maturityAt ?? Infinity
    while (order.lastPaidAt + DAY <= Math.min(now, end)) {
      const dayStart = order.lastPaidAt, paidAt = dayStart + DAY
      const rate = dailyRateFor(order, dayStart)
      const amount = money(order.principal * rate / 100)
      s.payouts.unshift({id: `QP-${order.orderId}-${dayKey(dayStart)}`, orderId: order.orderId, userId: order.userId, date: dayKey(dayStart), rate, amount, createdAt: paidAt})
      credit(s, order.userId, amount)
      order.interestPaidTotal = money(order.interestPaidTotal + amount)
      order.payoutCount += 1
      order.lastPaidAt = paidAt
    }
    if (order.maturityAt && now >= order.maturityAt) {
      // A redemption still waiting at maturity is closed by the maturity settlement.
      const pending = s.redemptions.find(r => r.orderId === order.orderId && r.status === 'pending_review')
      if (pending) Object.assign(pending, {status: 'cancelled', reviewer: SYSTEM, reviewedAt: order.maturityAt})
      order.status = 'settled'
      order.settledAt = order.maturityAt
      credit(s, order.userId, order.principal)
      log(s, {module: 'order', action: 'mature', refId: order.orderId, targetLabel: order.productSnapshot.name, summary: `到期结算，返还本金 ${order.principal} USDT`, operator: SYSTEM}, order.maturityAt)
    }
  }
  return s
}

/** Whole days an approved order has been invested. */
export const heldDays = (order, now) => order.interestStartAt ? Math.max(0, Math.floor((now - order.interestStartAt) / DAY)) : 0

// ---------- commands ----------

function findOrder(s, a) {
  const order = s.orders.find(x => x.orderId === a.orderId)
  fail(order, 'order')
  return order
}

function subscribe(s, a, now) {
  const p = s.products.find(x => x.productId === a.productId)
  fail(p?.status === 'listed', 'product')
  fail(a.expectedVersion == null || a.expectedVersion === p.version, 'productChanged')
  const failures = eligibilityFailures(p, s.profiles[a.userId])
  fail(!failures.length, failures[0])
  const amount = Number(a.amount)
  fail(finite(amount) && money(amount) === amount && amount >= p.minAmount && amount <= p.maxAmount, 'amount')
  fail(amount <= remainingQuota(s, p), 'quota')
  fail((s.balances[a.userId]?.USDT || 0) >= amount, 'balance')
  credit(s, a.userId, -amount)
  const order = {
    orderId: `QFO-${now}-${s.orders.length + 1}`, userId: a.userId, userName: s.profiles[a.userId]?.name || a.userId,
    productSnapshot: productSnapshot(p), eligibilitySnapshot: {minVerificationLevel: p.minVerificationLevel, minVipLevel: p.minVipLevel, ...s.profiles[a.userId]},
    principal: amount, status: 'pending_review', createdAt: now, reviewer: '', reviewedAt: null,
    interestStartAt: null, maturityAt: null, lastPaidAt: null, interestPaidTotal: 0, payoutCount: 0, settledAt: null,
  }
  s.orders.unshift(order)
  log(s, {module: 'order', action: 'subscribe', refId: order.orderId, targetLabel: p.name, summary: `申购 ${amount} USDT`, operator: a.actor || USER}, now)
}

export function transact(source, action, args = {}, now = Date.now()) {
  const s = structuredClone(source)
  fail(args.requestId && !s.requests.includes(args.requestId), 'duplicate')
  advance(s, now)
  const actor = args.actor || (['subscribe', 'requestRedeem'].includes(action) ? USER : ADMIN)
  if (action === 'subscribe') subscribe(s, args, now)
  else if (['approve', 'reject'].includes(action)) {
    const order = findOrder(s, args)
    fail(order.status === 'pending_review', 'status')
    if (action === 'approve') {
      const p = s.products.find(x => x.productId === order.productSnapshot.productId)
      fail(p?.status === 'listed', 'product')
      fail(raisedAmount(s, p) + order.principal <= p.totalQuota, 'quota')
      const termDays = order.productSnapshot.termDays
      Object.assign(order, {status: 'active', interestStartAt: now, lastPaidAt: now, maturityAt: termDays ? now + termDays * DAY : null})
    } else {
      order.status = 'rejected'
      credit(s, order.userId, order.principal)
    }
    Object.assign(order, {reviewer: actor, reviewedAt: now})
    log(s, {module: 'order', action, refId: order.orderId, targetLabel: order.productSnapshot.name, summary: action === 'approve' ? '审核通过，开始计息' : '审核拒绝，退回本金', operator: actor}, now)
  } else if (action === 'requestRedeem') {
    const order = findOrder(s, args)
    fail(order.userId === args.userId, 'owner')
    fail(order.status === 'active', 'status')
    fail(order.productSnapshot.termDays === null, 'fixedTerm')
    fail(heldDays(order, now) >= (order.productSnapshot.minHoldDays || 0), 'minHold')
    const redemption = {redemptionId: `QFR-${now}-${s.redemptions.length + 1}`, orderId: order.orderId, userId: order.userId, userName: order.userName,
      productName: order.productSnapshot.name, principal: order.principal, status: 'pending_review', requestedAt: now, reviewer: '', reviewedAt: null}
    s.redemptions.unshift(redemption)
    order.status = 'redeem_pending_review'
    log(s, {module: 'redemption', action, refId: order.orderId, targetLabel: order.productSnapshot.name, summary: `申请赎回 ${order.principal} USDT`, operator: actor}, now)
  } else if (['approveRedeem', 'rejectRedeem'].includes(action)) {
    const redemption = s.redemptions.find(x => x.redemptionId === args.redemptionId)
    fail(redemption, 'redemption')
    fail(redemption.status === 'pending_review', 'status')
    const order = findOrder(s, {orderId: redemption.orderId})
    fail(order.status === 'redeem_pending_review', 'status')
    Object.assign(redemption, {status: action === 'approveRedeem' ? 'approved' : 'rejected', reviewer: actor, reviewedAt: now})
    if (action === 'approveRedeem') {
      Object.assign(order, {status: 'redeemed', settledAt: now})
      credit(s, order.userId, order.principal)
    } else order.status = 'active'
    log(s, {module: 'redemption', action, refId: order.orderId, targetLabel: order.productSnapshot.name, summary: action === 'approveRedeem' ? `赎回通过，返还本金 ${order.principal} USDT` : '赎回拒绝，订单恢复持有并继续计息', operator: actor}, now)
  } else if (action === 'saveProduct') {
    const draft = structuredClone(args.product)
    draft.minVerificationLevel ??= 'none'
    draft.minVipLevel ??= 0
    if (draft.termDays !== null) draft.minHoldDays = null
    validateProduct(draft)
    const index = s.products.findIndex(x => x.productId === draft.productId)
    const before = index < 0 ? null : structuredClone(s.products[index])
    if (before) fail(args.expectedVersion === before.version, 'stale')
    fail(!s.products.some(x => x.code === draft.code.trim() && x.productId !== draft.productId), 'productCodeTaken')
    const saved = {...draft, name: draft.name.trim(), code: draft.code.trim(), tags: draft.tags.map(x => x.trim()),
      productId: before?.productId || `QF-${now}-${s.products.length + 1}`,
      status: before?.status || 'unlisted', version: (before?.version || 0) + 1, updatedAt: now}
    if (before) s.products[index] = saved; else s.products.push(saved)
    log(s, {module: 'product', action, refId: saved.productId, targetLabel: saved.name, summary: before ? '保存产品' : '新增产品', before, after: structuredClone(saved), operator: actor}, now)
  } else if (action === 'setProductStatus') {
    const product = s.products.find(x => x.productId === args.productId)
    fail(product, 'product')
    fail(product.status === args.expectedStatus, 'stale')
    const before = structuredClone(product)
    product.status = product.status === 'listed' ? 'unlisted' : 'listed'
    product.updatedAt = now
    log(s, {module: 'product', action: product.status === 'listed' ? 'listProduct' : 'unlistProduct', refId: product.productId, targetLabel: product.name, summary: product.status === 'listed' ? '上架产品' : '下架产品', before, after: structuredClone(product), operator: actor}, now)
  } else throw new Error('action')
  s.requests.push(args.requestId)
  return s
}
