import {eligibilityFailures, validateEligibility} from '../lending/eligibility.js'

// Quant Fund ledger for the admin (/admin/quant-fund/*). Pure functions over a plain state object; the in-page
// service owns the single in-memory instance (static mock data, user decision 2026-11-27).
// Every command works on a private copy and is committed only after all checks pass.
//
// Business rules (client requirements, confirmed 2026-11-27):
// - Every subscription waits for admin review; only approval starts interest and the lock period.
// - Interest accrues inside the order once per full day at the product's fixed daily rate (frozen into the order),
//   always on principal (no compounding). It is not credited to the user's balance; it is paid out with the
//   principal when the order is redeemed.
// - Products may have a lock period (VIP0 has none). Inside it the holder can still redeem early, paying the
//   product's early-redemption fee: a fixed percentage of principal, whatever the days left; accrued interest is
//   kept. After the lock period the order keeps earning until redeemed. Every holder redemption needs admin review
//   and keeps accruing while it waits.
// - Funding progress = (initial funding + approved principal) / total quota; accrued interest never counts. While it
//   is at 100% nobody can subscribe, and every order past its lock period is redeemed automatically (no fee) to
//   release quota.
// - A product's restricted-user list makes it appear full (100%) to those users, who cannot subscribe.

export const DAY = 86400000
export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'EXTREME']
/** Fund identifier coin shown on public cards (icon + asset filter). Display only: subscriptions, interest and
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
export const isFull = (s, p) => raisedAmount(s, p) >= p.totalQuota
/** A user on the product's restricted list sees it as full. */
export const isRestricted = (p, userId) => (p.restrictedUserIds || []).includes(String(userId))
/** Progress (0–100) as a given user sees it: 100 for restricted users. */
export const progressFor = (s, p, userId) => (isRestricted(p, userId) ? 100 : Math.min(100, Math.round(raisedAmount(s, p) / p.totalQuota * 1000) / 10))
export const displayRate = p => p.dailyRate

export function validateProduct(p) {
  fail(typeof p?.name === 'string' && p.name.trim(), 'productName')
  fail(typeof p.code === 'string' && /^[A-Z0-9-]{2,32}$/.test(p.code.trim()), 'productCode')
  fail(ASSETS.includes(p.asset), 'productAsset')
  fail(RISK_LEVELS.includes(p.riskLevel), 'productRisk')
  fail(Array.isArray(p.tags) && p.tags.every(x => typeof x === 'string' && x.trim()), 'productTags')
  fail(p.lockDays === null || (Number.isInteger(p.lockDays) && p.lockDays >= 1), 'productLock')
  fail(p.lockDays === null || (finite(p.earlyRedeemFeeRate) && p.earlyRedeemFeeRate >= 0 && p.earlyRedeemFeeRate <= 100), 'productFee')
  fail(finite(p.minAmount) && p.minAmount > 0 && finite(p.maxAmount) && p.maxAmount >= p.minAmount, 'productAmount')
  fail(finite(p.totalQuota) && p.totalQuota >= p.maxAmount, 'productQuota')
  fail(finite(p.initialPercent) && p.initialPercent >= 0 && p.initialPercent <= 100, 'productInitial')
  fail(finite(p.dailyRate) && p.dailyRate >= 0 && p.dailyRate <= 100, 'productRate')
  fail(Array.isArray(p.restrictedUserIds) && p.restrictedUserIds.every(x => typeof x === 'string' && x.trim()), 'productRestricted')
  fail(Number.isInteger(p.sortOrder), 'productSort')
  validateEligibility(p)
}

/** Terms frozen into an order; later product edits never reach existing orders. */
export const productSnapshot = p => structuredClone({
  productId: p.productId, version: p.version, code: p.code, name: p.name, asset: p.asset, riskLevel: p.riskLevel,
  lockDays: p.lockDays, earlyRedeemFeeRate: p.lockDays === null ? 0 : p.earlyRedeemFeeRate, dailyRate: p.dailyRate,
})

// ---------- daily interest and automatic redemption ----------

/** Whether an approved order is still inside its lock period. */
export const inLock = (order, now) => !!order.lockUntil && now < order.lockUntil
/** Early-redemption fee for redeeming now: the product's rate on principal inside the lock period, none after. */
export const redemptionFee = (order, now) => (inLock(order, now) ? money(order.principal * order.productSnapshot.earlyRedeemFeeRate / 100) : 0)

/** Adds one interest record per completed day to the order (not to the user's balance). */
function accrue(s, order, now) {
  while (order.lastAccruedAt + DAY <= now) {
    const dayStart = order.lastAccruedAt, at = dayStart + DAY, rate = order.productSnapshot.dailyRate
    const amount = money(order.principal * rate / 100)
    s.payouts.unshift({id: `QP-${order.orderId}-${dayKey(dayStart)}`, orderId: order.orderId, userId: order.userId, date: dayKey(dayStart), rate, amount, createdAt: at})
    order.accruedInterest = money(order.accruedInterest + amount)
    order.accrualCount += 1
    order.lastAccruedAt = at
  }
}

/** Closes an order: the user receives principal plus accrued interest, minus any fee. */
function close(s, order, {reason, fee = 0, at}) {
  const returned = money(order.principal + order.accruedInterest - fee)
  Object.assign(order, {status: 'redeemed', endReason: reason, settledAt: at, redeemFee: fee, returned})
  credit(s, order.userId, returned)
  return returned
}

/** Moves every funded order forward to `now`: daily accrual, then automatic redemption on full products. Idempotent. */
export function advance(s, now = Date.now()) {
  for (const order of s.orders) if (FUNDED.includes(order.status)) accrue(s, order, now)
  for (const p of s.products) {
    if (!isFull(s, p)) continue
    for (const order of s.orders) {
      if (order.productSnapshot.productId !== p.productId || !FUNDED.includes(order.status) || inLock(order, now)) continue
      // A holder's redemption still waiting is superseded by the automatic one (no fee after the lock period).
      const pending = s.redemptions.find(r => r.orderId === order.orderId && r.status === 'pending_review')
      if (pending) Object.assign(pending, {status: 'cancelled', reviewer: SYSTEM, reviewedAt: now})
      const returned = close(s, order, {reason: 'auto', at: now})
      log(s, {module: 'order', action: 'autoRedeem', refId: order.orderId, targetLabel: order.productSnapshot.name, summary: `产品进度达到 100%，自动赎回，返还本金与收益 ${returned} USDT`, operator: SYSTEM}, now)
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
  fail(!isRestricted(p, a.userId), 'soldOut')
  const failures = eligibilityFailures(p, s.profiles[a.userId])
  fail(!failures.length, failures[0])
  const amount = Number(a.amount)
  fail(finite(amount) && money(amount) === amount && amount >= p.minAmount && amount <= p.maxAmount, 'amount')
  fail(!isFull(s, p), 'soldOut')
  fail(amount <= remainingQuota(s, p), 'quota')
  fail((s.balances[a.userId]?.USDT || 0) >= amount, 'balance')
  credit(s, a.userId, -amount)
  const order = {
    orderId: `QFO-${now}-${s.orders.length + 1}`, userId: a.userId, userName: s.profiles[a.userId]?.name || a.userId,
    productSnapshot: productSnapshot(p), eligibilitySnapshot: {minVerificationLevel: p.minVerificationLevel, minVipLevel: p.minVipLevel, ...s.profiles[a.userId]},
    principal: amount, status: 'pending_review', createdAt: now, reviewer: '', reviewedAt: null,
    interestStartAt: null, lockUntil: null, lastAccruedAt: null, accruedInterest: 0, accrualCount: 0, settledAt: null, endReason: null,
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
      const lockDays = order.productSnapshot.lockDays
      Object.assign(order, {status: 'active', interestStartAt: now, lastAccruedAt: now, lockUntil: lockDays ? now + lockDays * DAY : null})
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
    // The fee is fixed when the holder asks: inside the lock period it is the product's rate on principal.
    const early = inLock(order, now), fee = redemptionFee(order, now)
    const redemption = {redemptionId: `QFR-${now}-${s.redemptions.length + 1}`, orderId: order.orderId, userId: order.userId, userName: order.userName,
      productName: order.productSnapshot.name, principal: order.principal, early, feeRate: early ? order.productSnapshot.earlyRedeemFeeRate : 0, fee,
      interest: null, returned: null, status: 'pending_review', requestedAt: now, reviewer: '', reviewedAt: null}
    s.redemptions.unshift(redemption)
    order.status = 'redeem_pending_review'
    log(s, {module: 'redemption', action, refId: order.orderId, targetLabel: order.productSnapshot.name, summary: early ? `锁定期内申请提前赎回，手续费 ${fee} USDT` : `申请赎回 ${order.principal} USDT`, operator: actor}, now)
  } else if (['approveRedeem', 'rejectRedeem'].includes(action)) {
    const redemption = s.redemptions.find(x => x.redemptionId === args.redemptionId)
    fail(redemption, 'redemption')
    fail(redemption.status === 'pending_review', 'status')
    const order = findOrder(s, {orderId: redemption.orderId})
    fail(order.status === 'redeem_pending_review', 'status')
    Object.assign(redemption, {status: action === 'approveRedeem' ? 'approved' : 'rejected', reviewer: actor, reviewedAt: now})
    if (action === 'approveRedeem') {
      // Interest accrued up to approval is paid out with the principal; the fee was fixed at request time.
      Object.assign(redemption, {interest: order.accruedInterest, returned: close(s, order, {reason: redemption.early ? 'early' : 'manual', fee: redemption.fee, at: now})})
    } else order.status = 'active'
    log(s, {module: 'redemption', action, refId: order.orderId, targetLabel: order.productSnapshot.name, summary: action === 'approveRedeem' ? `赎回通过，返还本金与收益 ${redemption.returned} USDT` : '赎回拒绝，订单恢复持有并继续计息', operator: actor}, now)
  } else if (action === 'saveProduct') {
    const draft = structuredClone(args.product)
    draft.minVerificationLevel ??= 'none'
    draft.minVipLevel ??= 0
    draft.restrictedUserIds = [...new Set((draft.restrictedUserIds || []).map(x => String(x).trim()).filter(Boolean))]
    if (draft.lockDays === null) draft.earlyRedeemFeeRate = 0
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
  // A save or approval can push a product to 100%: settle the resulting automatic redemptions right away.
  advance(s, now)
  s.requests.push(args.requestId)
  return s
}
