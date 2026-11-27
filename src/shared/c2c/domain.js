// C2C ledger for the admin (/admin/c2c/*). Pure functions over a plain state object; the in-page service owns the
// single in-memory instance (static mock data, like lending and Quant Fund: resets on reload, no persistence, no live
// sync with the public site). Every command works on a private copy and is committed only after all checks pass.
//
// Business rules (user decisions, 2026-11-27):
// - There are no payment accounts. A user submits a buy or sell order at the current quote and it waits for admin
//   review (pending_review); payment and payout happen off-platform in the quote's fiat currency (real fiat such as
//   USD or EUR, user decision 2026-11-27 — an exception to the site-wide USDT denomination).
// - Buy: approval credits the bought coin to the user's balance; rejection changes nothing on the balance.
// - Sell: submitting locks the coin (available → locked); approval deducts the locked coin (the platform pays the
//   user off-platform); rejection or the user's cancellation unlocks it.
// - Every order carries the payer's country (free text), remitter name and email from the public order form, so the
//   back office can match the off-platform payment.
// - Users may cancel their own pending orders. Approve / reject / cancel are state-guarded and logged; no reason input.
// - Quotes (per coin, fiat and side): price in that fiat, single-order limits, quote validity, note, enabled switch and sort weight
//   (larger first). Orders snapshot the quote; later quote edits never change existing orders.

export const SIDES = ['buy', 'sell']
/** Agreement languages: English first and required (the public fallback), then the site's other five locales. */
/** Fiat currencies a quote can be priced in; the order amount is in the same fiat. */
export const FIATS = ['USD', 'EUR', 'GBP', 'HKD', 'SGD', 'JPY', 'AUD', 'CNY']
export const AGREEMENT_LOCALES = ['en-US', 'zh-TW', 'fr-FR', 'de-DE', 'ja-JP', 'ko-KR']
export const AGREEMENT_FALLBACK = 'en-US'
/** Coins a quote can be set up for (the public C2C shows the first five today). */
export const ASSETS = ['USDT', 'USDC', 'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'TRX', 'LTC', 'ADA', 'TON']
export const ADMIN = '管理员（模拟）'
export const USER = '用户（模拟）'

const fail = (ok, code) => { if (!ok) throw new Error(code) }
const finite = value => typeof value === 'number' && Number.isFinite(value)
/** Coin amounts keep 8 decimals; USDT totals keep 8 too (the quote price has up to 8). */
export const round8 = value => Math.round((Number(value) + Number.EPSILON) * 1e8) / 1e8

export function createC2CState({quotes = [], balances = {}, profiles = {}, agreement = null} = {}) {
  return {version: 1, quotes, orders: [], logs: [], requests: [], balances, locked: {}, profiles, agreement}
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

const QUOTE_FIELDS = ['symbol', 'fiat', 'side', 'price', 'min', 'max', 'ttlSeconds', 'note', 'sortWeight']
export function validateQuote(q) {
  fail(SIDES.includes(q.side), 'quoteSide')
  fail(ASSETS.includes(q.symbol), 'quoteSymbol')
  fail(FIATS.includes(q.fiat), 'quoteFiat')
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
  // One quote per coin, fiat and side; coin, fiat and side identify the quote and cannot change.
  fail(!s.quotes.some(q => q.quoteId !== quote.quoteId && q.symbol === draft.symbol && q.fiat === draft.fiat && q.side === draft.side), 'quoteTaken')
  fail(!existing || (existing.symbol === draft.symbol && existing.fiat === draft.fiat && existing.side === draft.side), 'quoteIdentity')
  if (existing) {
    fail(existing.version === expectedVersion, 'stale')
    const before = Object.fromEntries(QUOTE_FIELDS.map(key => [key, existing[key]]))
    Object.assign(existing, draft, {version: existing.version + 1, updatedAt: now, updatedBy: actor})
    log(s, {module: 'quote', action: 'saveQuote', refId: existing.quoteId, targetLabel: quoteLabel(existing), summary: '保存报价配置', before, after: draft, operator: actor}, now)
    return existing
  }
  // New quotes start disabled; saving never switches a quote on or off.
  const created = {quoteId: quoteIdOf(draft), ...draft, enabled: false, version: 1, updatedAt: now, updatedBy: actor}
  s.quotes.push(created)
  log(s, {module: 'quote', action: 'saveQuote', refId: created.quoteId, targetLabel: quoteLabel(created), summary: '新增报价（未启用）', after: draft, operator: actor}, now)
  return created
}
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function validatePayer(payer) {
  const country = String(payer?.country || '').trim(), name = String(payer?.name || '').trim(), email = String(payer?.email || '').trim()
  fail(country && country.length <= 64, 'payerCountry')
  fail(name && name.length <= 64, 'payerName')
  fail(EMAIL.test(email) && email.length <= 254, 'payerEmail')
  return {country, name, email}
}
export const quoteIdOf = q => `C2CQ-${q.symbol}-${q.fiat}-${q.side.toUpperCase()}`
export const quoteLabel = q => `${q.symbol} / ${q.fiat} · ${q.side === 'buy' ? '用户买入' : '用户卖出'}`

// ---------- agreement ----------

/**
 * Saves the C2C trading agreement (one record, six language versions). English title and body are required; another
 * language left fully empty is dropped and falls back to English on the public site, a half-filled one is rejected.
 * Each save is versioned (v1, v2 …), checked against the version the editor loaded, and logged before/after.
 */
function saveAgreement(s, {contents, expectedVersion}, actor, now) {
  const current = s.agreement
  fail(current, 'agreement')
  fail(current.version === expectedVersion, 'stale')
  const next = {}
  for (const locale of AGREEMENT_LOCALES) {
    const title = String(contents?.[locale]?.title || '').trim(), body = String(contents?.[locale]?.body || '').trim()
    if (locale === AGREEMENT_FALLBACK) fail(title && body, 'agreementDefault')
    if (!title && !body) continue
    fail(title && body, 'agreementPartial')
    fail(title.length <= 120 && body.length <= 20000, 'agreementLength')
    next[locale] = {title, body}
  }
  const before = current.contents
  Object.assign(current, {contents: next, version: current.version + 1, versionLabel: `v${current.version + 1}`, updatedAt: now, updatedBy: actor})
  const changed = AGREEMENT_LOCALES.filter(l => JSON.stringify(before[l] || null) !== JSON.stringify(next[l] || null))
  log(s, {module: 'agreement', action: 'saveAgreement', refId: current.versionLabel, targetLabel: next[AGREEMENT_FALLBACK].title,
    summary: changed.length ? `保存交易协议 ${current.versionLabel}（修改：${changed.join('、')}）` : `保存交易协议 ${current.versionLabel}（内容未变）`, before, after: next, operator: actor}, now)
}

// ---------- orders ----------

function submit(s, {userId, userName, side, symbol, fiat, quantity, payer}, now) {
  const payerInfo = validatePayer(payer)
  const quote = s.quotes.find(q => q.side === side && q.symbol === symbol && q.fiat === fiat)
  fail(quote?.enabled, 'quoteOff')
  fail(finite(quantity) && quantity >= quote.min && quantity <= quote.max, 'amount')
  if (side === 'sell') {
    move(wallet(s, userId), symbol, -quantity)
    move(lockedOf(s, userId), symbol, quantity)
  }
  const order = {orderId: `C2C-${now}-${s.orders.length + 1}`, userId, userName: userName || s.profiles[userId]?.name || userId, side, symbol, fiat,
    quantity: round8(quantity), price: quote.price, amount: round8(quantity * quote.price),
    quoteSnapshot: {quoteId: quote.quoteId, version: quote.version, price: quote.price, min: quote.min, max: quote.max},
    payer: payerInfo,
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
    ? (order.side === 'buy' ? `审核通过，入账 ${order.quantity} ${order.symbol}` : `审核通过，扣除冻结 ${order.quantity} ${order.symbol}，线下打款 ${order.amount} ${order.fiat}`)
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
  else if (action === 'saveAgreement') saveAgreement(s, args, actor, now)
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
