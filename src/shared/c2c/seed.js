import {createC2CState, transact, ADMIN} from './domain.js'
import {seedAgreementContents} from './agreementSeed.js'

// Seed for the C2C mock: the public site's quote snapshot (buy: USDT/USD, USDT/EUR, BTC, ETH, USDC, SOL in USD;
// sell: USDT/USD, USDT/EUR) and an order
// history replayed through the real commands (submit → approve / reject / cancel), so balances, locks and logs agree.
// Dates are relative to page load. Users mirror the other mocks' simulated profiles.

const HOUR = 3600000, DAY = 24 * HOUR
const users = {
  'USR-DEMO': {name: '演示用户', simulated: true},
  'USR-1002': {name: '模拟用户 1002', simulated: true},
  'USR-1003': {name: '模拟用户 1003', simulated: true},
  'USR-1004': {name: '模拟用户 1004', simulated: true},
}
const REVIEWER = '模拟审核员'
// [symbol, fiat, side, price, min, max, ttl seconds, note] — the same quotes the public site shows (real fiat,
// user decision 2026-11-27).
const BANK = 'Bank transfer only. Reference your order id in the transfer memo.'
const PAYOUT = 'Platform pays out to your bank account after review.'
const quotes = [
  ['USDT', 'USD', 'buy', 1.0012, 100, 1000000, 720, BANK],
  ['USDT', 'EUR', 'buy', 0.9235, 100, 500000, 720, BANK],
  ['BTC', 'USD', 'buy', 59125.34, 0.01, 50, 60, ''],
  ['ETH', 'USD', 'buy', 1656.63, 0.1, 1000, 60, ''],
  ['USDC', 'USD', 'buy', 1.0008, 100, 1000000, 60, ''],
  ['SOL', 'USD', 'buy', 68.18, 1, 5000, 60, ''],
  ['USDT', 'USD', 'sell', 0.9965, 100, 1000000, 720, PAYOUT],
  ['USDT', 'EUR', 'sell', 0.9180, 100, 500000, 720, PAYOUT],
]
export function seedQuotes(now) {
  return quotes.map(([symbol, fiat, side, price, min, max, ttlSeconds, note], i) => ({
    quoteId: `C2CQ-${symbol}-${fiat}-${side.toUpperCase()}`, symbol, fiat, side, price, min, max, ttlSeconds, note,
    sortWeight: (quotes.length - i) * 10, enabled: true, version: 1, updatedAt: now, updatedBy: ADMIN,
  }))
}

// [hours ago, user, side, symbol, fiat, quantity, outcome: approve | reject | cancel | pending]
const history = [
  [30 * 24, 'USR-1002', 'buy', 'BTC', 'USD', 0.25, 'approve'],
  [26 * 24, 'USR-DEMO', 'buy', 'USDT', 'USD', 5000, 'approve'],
  [22 * 24, 'USR-1003', 'sell', 'USDT', 'EUR', 8000, 'approve'],
  [19 * 24, 'USR-1004', 'buy', 'ETH', 'USD', 3, 'reject'],
  [16 * 24, 'USR-DEMO', 'sell', 'USDT', 'USD', 4000, 'cancel'],
  [13 * 24, 'USR-1002', 'buy', 'SOL', 'USD', 150, 'approve'],
  [10 * 24, 'USR-1003', 'buy', 'USDC', 'USD', 2500, 'approve'],
  [8 * 24, 'USR-1004', 'sell', 'USDT', 'USD', 12000, 'reject'],
  [6 * 24, 'USR-DEMO', 'buy', 'ETH', 'USD', 1.5, 'approve'],
  [4 * 24, 'USR-1002', 'sell', 'USDT', 'EUR', 6000, 'approve'],
  [3 * 24, 'USR-1003', 'buy', 'BTC', 'USD', 0.12, 'cancel'],
  [2 * 24, 'USR-1004', 'buy', 'USDT', 'EUR', 3500, 'approve'],
  [30, 'USR-DEMO', 'buy', 'SOL', 'USD', 120, 'pending'],
  [20, 'USR-1002', 'sell', 'USDT', 'USD', 5000, 'pending'],
  [9, 'USR-1003', 'buy', 'ETH', 'USD', 2, 'pending'],
  [3, 'USR-1004', 'sell', 'USDT', 'EUR', 3200, 'pending'],
  [1, 'USR-DEMO', 'buy', 'BTC', 'USD', 0.2, 'pending'],
]

// Payer details as entered on the public order form (country, remitter name, email).
const payers = {
  'USR-DEMO': {country: 'SG', name: 'Demo User', email: 'demo.user@example.com'},
  'USR-1002': {country: 'US', name: 'Alex Morgan', email: 'alex.morgan@example.com'},
  'USR-1003': {country: 'DE', name: 'Lena Fischer', email: 'lena.fischer@example.com'},
  'USR-1004': {country: 'HK', name: 'Chan Tai Man', email: 'tm.chan@example.com'},
}

export function seedC2C(now = Date.now()) {
  let s = createC2CState({
    quotes: seedQuotes(now - 40 * DAY), profiles: structuredClone(users),
    balances: {'USR-DEMO': {USDT: 20000}, 'USR-1002': {USDT: 30000}, 'USR-1003': {USDT: 15000}, 'USR-1004': {USDT: 25000}},
    // The public site shows this text as v1-draft.
    agreement: {version: 1, versionLabel: 'v1-draft', contents: structuredClone(seedAgreementContents), updatedAt: now - 40 * DAY, updatedBy: ADMIN},
  })
  for (const [hoursAgo, userId, side, symbol, fiat, quantity, outcome] of history) {
    const at = now - hoursAgo * HOUR
    s = transact(s, 'submit', {userId, side, symbol, fiat, quantity, payer: payers[userId]}, at)
    const orderId = s.orders[0].orderId
    if (outcome === 'approve' || outcome === 'reject') s = transact(s, outcome, {orderId, actor: REVIEWER}, at + 2 * HOUR)
    else if (outcome === 'cancel') s = transact(s, 'cancel', {orderId, userId}, at + HOUR)
  }
  // Newest first by submission time, whatever order the replay produced.
  s.orders.sort((a, b) => b.createdAt - a.createdAt)
  s.logs.sort((a, b) => b.createdAt - a.createdAt)
  return s
}
