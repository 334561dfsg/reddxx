import {createC2CState, transact, ADMIN} from './domain.js'

// Seed for the C2C mock: the public site's quote snapshot (buy: ETH, USDC, BTC, USDT, SOL; sell: USDT) and an order
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
// [symbol, side, price, min, max, ttl seconds, note]
const quotes = [
  ['ETH', 'buy', 1656.6323, 1, 1000, 60, ''],
  ['USDC', 'buy', 1.0110605, 1000, 1e9, 60, ''],
  ['BTC', 'buy', 59125.3394, 0.1, 1000, 60, ''],
  ['USDT', 'buy', 1.01, 3000, 1e8, 720, 'Bank transfer only. Reference your order id in the transfer memo.'],
  ['SOL', 'buy', 68.175, 100, 5000, 60, ''],
  ['USDT', 'sell', 0.99, 3000, 1e8, 720, 'Platform pays out to your verified bank account after review.'],
]
export function seedQuotes(now) {
  return quotes.map(([symbol, side, price, min, max, ttlSeconds, note], i) => ({
    quoteId: `C2CQ-${symbol}-${side.toUpperCase()}`, symbol, side, price, min, max, ttlSeconds, note,
    sortWeight: (quotes.length - i) * 10, enabled: true, version: 1, updatedAt: now, updatedBy: ADMIN,
  }))
}

// [hours ago, user, side, symbol, quantity, outcome: approve | reject | cancel | pending]
const history = [
  [30 * 24, 'USR-1002', 'buy', 'BTC', 0.25, 'approve'],
  [26 * 24, 'USR-DEMO', 'buy', 'USDT', 5000, 'approve'],
  [22 * 24, 'USR-1003', 'sell', 'USDT', 8000, 'approve'],
  [19 * 24, 'USR-1004', 'buy', 'ETH', 3, 'reject'],
  [16 * 24, 'USR-DEMO', 'sell', 'USDT', 4000, 'cancel'],
  [13 * 24, 'USR-1002', 'buy', 'SOL', 150, 'approve'],
  [10 * 24, 'USR-1003', 'buy', 'USDC', 2500, 'approve'],
  [8 * 24, 'USR-1004', 'sell', 'USDT', 12000, 'reject'],
  [6 * 24, 'USR-DEMO', 'buy', 'ETH', 1.5, 'approve'],
  [4 * 24, 'USR-1002', 'sell', 'USDT', 6000, 'approve'],
  [3 * 24, 'USR-1003', 'buy', 'BTC', 0.12, 'cancel'],
  [2 * 24, 'USR-1004', 'buy', 'USDT', 3500, 'approve'],
  [30, 'USR-DEMO', 'buy', 'SOL', 120, 'pending'],
  [20, 'USR-1002', 'sell', 'USDT', 5000, 'pending'],
  [9, 'USR-1003', 'buy', 'ETH', 2, 'pending'],
  [3, 'USR-1004', 'sell', 'USDT', 3200, 'pending'],
  [1, 'USR-DEMO', 'buy', 'BTC', 0.2, 'pending'],
]

export function seedC2C(now = Date.now()) {
  let s = createC2CState({
    quotes: seedQuotes(now - 40 * DAY), profiles: structuredClone(users),
    balances: {'USR-DEMO': {USDT: 20000}, 'USR-1002': {USDT: 30000}, 'USR-1003': {USDT: 15000}, 'USR-1004': {USDT: 25000}},
  })
  for (const [hoursAgo, userId, side, symbol, quantity, outcome] of history) {
    const at = now - hoursAgo * HOUR
    s = transact(s, 'submit', {userId, side, symbol, quantity}, at)
    const orderId = s.orders[0].orderId
    if (outcome === 'approve' || outcome === 'reject') s = transact(s, outcome, {orderId, actor: REVIEWER}, at + 2 * HOUR)
    else if (outcome === 'cancel') s = transact(s, 'cancel', {orderId, userId}, at + HOUR)
  }
  // Newest first by submission time, whatever order the replay produced.
  s.orders.sort((a, b) => b.createdAt - a.createdAt)
  s.logs.sort((a, b) => b.createdAt - a.createdAt)
  return s
}
