// C2C ledger for the admin (/admin/c2c/*). Pure functions over a plain state object; the in-page service owns the
// single in-memory instance (static mock data, like lending and Quant Fund: resets on reload, no persistence, no live
// sync with the public site). Every command works on a private copy and is committed only after all checks pass.
//
// Business rules (user decisions, 2026-11-27):
// - There are no payment accounts. A user submits a buy or sell order at the current quote and it waits for admin
//   review (pending_review); payment and payout happen off-platform.
// - Buy: approval credits the bought coin to the user's balance; rejection changes nothing on the balance.
// - Sell: submitting locks the coin (available → locked); approval deducts the locked coin (the platform pays the
//   user off-platform); rejection or the user's cancellation unlocks it.
// - Users may cancel their own pending orders. Approve / reject / cancel are state-guarded and logged; no reason input.
// - Quotes (per coin and side): price, single-order limits, quote validity, note, enabled switch and sort weight
//   (larger first). Orders snapshot the quote; later quote edits never change existing orders.

export const SIDES = ['buy', 'sell']
export const ASSETS = ['USDT', 'USDC', 'BTC', 'ETH', 'SOL']
export const ADMIN = '管理员（模拟）'
export const USER = '用户（模拟）'

const fail = (ok, code) => { if (!ok) throw new Error(code) }
const finite = value => typeof value === 'number' && Number.isFinite(value)
/** Coin amounts keep 8 decimals; USDT totals keep 8 too (the quote price has up to 8). */
export const round8 = value => Math.round((Number(value) + Number.EPSILON) * 1e8) / 1e8

export function createC2CState({quotes = [], balances = {}, profiles = {}} = {}) {
  return {version: 1, quotes, orders: [], logs: [], requests: [], balances, locked: {}, profiles}
}

function log(s, entry, now) {
  s.logs.unshift({id: `CL-${now}-${s.logs.length + 1}`, createdAt: now, ...entry})
}
const wallet = (s, userId) => (s.balances[userId] ||= {})
const lockedOf = (s, userId) => (s.locked[userId] ||= {})
function move(bucket, asset, delta) {
  const next = round8((bucket[asset] || 0) + delta)
  fail(next >= 0, 'balance')
  bucket[asset] = next
}

// ---------- quotes ----------

const QUOTE_FIELDS = ['symbol', 'side', 'price', 'min', 'max', 'ttlSeconds', 'note', 'sortWeight']
export function validateQuote(q) {
  fail(SIDES.includes(q.side), 'quoteSide')
  fail(ASSETS.includes(q.symbol), 'quoteSymbol')
  fail(finite(q.price) && q.price > 0, 'quotePrice')
  fail(finite(q.min) && finite(q.max) && q.min > 0 && q.max >= q.min, 'quoteLimits')
  fail(Number.isInteger(q.ttlSeconds) && q.ttlSeconds >= 10 && q.ttlSeconds <= 86400, 'quoteTtl')
  fail(String(q.note || '').length <= 255, 'quoteNote')
  fail(Number.isInteger(q.sortWeight), 'quoteSort')
}
function saveQuote(s, {quote, expectedVersion}, actor, now) {
  const draft = Object.fromEntries(QUOTE_FIELDS.map(key => [key, quote[key]]))
  draft.note = String(draft.note || '').trim()
  validateQuote(draft)
  const existing = quote.quoteId && s.quotes.find(q => q.quoteId === quote.quoteId)
  fail(!quote.quoteId || existing, 'quote')
  // One quote per coin and side.
  fail(!s.quotes.some(q => q.quoteId !== quote.quoteId && q.symbol === draft.symbol && q.side === draft.side), 'quoteTaken')
  if (existing) {
    fail(existing.version === expectedVersion, 'stale')
    const before = Object.fromEntries(QUOTE_FIELDS.map(key => [key, existing[key]]))
    Object.assign(existing, draft, {version: existing.version + 1, updatedAt: now, updatedBy: actor})
    log(s, {module: 'quote', action: 'saveQuote', refId: existing.quoteId, targetLabel: quoteLabel(existing), summary: '保存报价配置', before, after: draft, operator: actor}, now)
    return existing
  }
  // New quotes start disabled; saving never switches a quote on or off.
  const created = {quoteId: `C2CQ-${draft.symbol}-${draft.side.toUpperCase()}`, ...draft, enabled: false, version: 1, updatedAt: now, updatedBy: actor}
  s.quotes.push(created)
  log(s, {module: 'quote', action: 'saveQuote', refId: created.quoteId, targetLabel: quoteLabel(created), summary: '新增报价（未启用）', after: draft, operator: actor}, now)
  return created
}
export const quoteLabel = q => `${q.symbol} / USDT · ${q.side === 'buy' ? '用户买入' : '用户卖出'}`

// ---------- orders ----------

function submit(s, {userId, userName, side, symbol, quantity}, now) {
  const quote = s.quotes.find(q => q.side === side && q.symbol === symbol)
  fail(quote?.enabled, 'quoteOff')
  fail(finite(quantity) && quantity >= quote.min && quantity <= quote.max, 'amount')
  if (side === 'sell') {
    move(wallet(s, userId), symbol, -quantity)
    move(lockedOf(s, userId), symbol, quantity)
  }
  const order = {orderId: `C2C-${now}-${s.orders.length + 1}`, userId, userName: userName || s.profiles[userId]?.name || userId, side, symbol,
    quantity: round8(quantity), price: quote.price, amount: round8(quantity * quote.price),
    quoteSnapshot: {quoteId: quote.quoteId, version: quote.version, price: quote.price, min: quote.min, max: quote.max},
    status: 'pending_review', createdAt: now, reviewer: '', reviewedAt: null, cancelledAt: null}
  s.orders.unshift(order)
  log(s, {module: 'order', action: 'submit', refId: order.orderId, targetLabel: orderLabel(order), summary: `${side === 'buy' ? '提交买单' : '提交卖单，冻结 ' + order.quantity + ' ' + symbol}，待审核`, operator: USER}, now)
  return order
}
export const orderLabel = o => `${o.side === 'buy' ? '买入' : '卖出'} ${o.quantity} ${o.symbol}`
function findOrder(s, orderId) {
  const order = s.orders.find(o => o.orderId === orderId)
  fail(order, 'order')
  return order
}
function review(s, {orderId}, approve, actor, now) {
  const order = findOrder(s, orderId)
  fail(order.status === 'pending_review', 'status')
  if (order.side === 'buy' && approve) move(wallet(s, order.userId), order.symbol, order.quantity)
  if (order.side === 'sell') {
    move(lockedOf(s, order.userId), order.symbol, -order.quantity)
    if (!approve) move(wallet(s, order.userId), order.symbol, order.quantity)
  }
  Object.assign(order, {status: approve ? 'completed' : 'rejected', reviewer: actor, reviewedAt: now})
  const summary = approve
    ? (order.side === 'buy' ? `审核通过，入账 ${order.quantity} ${order.symbol}` : `审核通过，扣除冻结 ${order.quantity} ${order.symbol}，线下打款 ${order.amount} USDT`)
    : (order.side === 'buy' ? '审核拒绝' : `审核拒绝，解冻 ${order.quantity} ${order.symbol}`)
  log(s, {module: 'order', action: approve ? 'approve' : 'reject', refId: order.orderId, targetLabel: orderLabel(order), summary, operator: actor}, now)
}
function cancel(s, {orderId, userId}, now) {
  const order = findOrder(s, orderId)
  fail(order.userId === userId, 'owner')
  fail(order.status === 'pending_review', 'status')
  if (order.side === 'sell') {
    move(lockedOf(s, order.userId), order.symbol, -order.quantity)
    move(wallet(s, order.userId), order.symbol, order.quantity)
  }
  Object.assign(order, {status: 'cancelled', cancelledAt: now})
  log(s, {module: 'order', action: 'cancel', refId: order.orderId, targetLabel: orderLabel(order), summary: order.side === 'sell' ? `用户取消，解冻 ${order.quantity} ${order.symbol}` : '用户取消', operator: USER}, now)
}

/** Applies one command to a copy of the state and returns the copy; throws the error code and leaves `source` untouched. */
export function transact(source, action, args = {}, now = Date.now()) {
  const s = structuredClone(source)
  fail(!args.requestId || !s.requests.includes(args.requestId), 'duplicate')
  const actor = args.actor || ADMIN
  if (action === 'submit') submit(s, args, now)
  else if (action === 'cancel') cancel(s, args, now)
  else if (action === 'approve' || action === 'reject') review(s, args, action === 'approve', actor, now)
  else if (action === 'saveQuote') saveQuote(s, args, actor, now)
  else if (action === 'setQuoteStatus') {
    const quote = s.quotes.find(q => q.quoteId === args.quoteId)
    fail(quote, 'quote')
    fail(quote.enabled === args.expectedEnabled, 'stale')
    quote.enabled = !quote.enabled
    quote.version += 1
    log(s, {module: 'quote', action: quote.enabled ? 'enableQuote' : 'disableQuote', refId: quote.quoteId, targetLabel: quoteLabel(quote),
      summary: quote.enabled ? '启用报价，用户可按此报价下单' : '停用报价，不能再按此报价下单；待审核订单不受影响', operator: actor}, now)
  } else fail(false, 'action')
  if (args.requestId) s.requests.push(args.requestId)
  if (s.requests.length > 500) s.requests.splice(0, s.requests.length - 500)
  s.version += 1
  return s
}
