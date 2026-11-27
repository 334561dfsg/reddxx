import {createQuantFundState, transact, advance, DAY, SYSTEM} from './domain.js'

// Seed for the Quant Fund mock: the public catalogue's six VIP tiers and a history replayed through the real commands
// (subscribe → review → daily payouts → redemption / maturity), so every order status, payout and log is coherent.
// Dates are relative to page load. Users mirror the strategy mock's simulated profiles.

const HOUR = 3600000
const users = {
  'USR-DEMO': {name: '演示用户', verificationLevel: 'basic', vipLevel: 1, simulated: true},
  'USR-1002': {name: '模拟用户 1002', verificationLevel: 'advanced', vipLevel: 2, simulated: true},
  'USR-1003': {name: '模拟用户 1003', verificationLevel: 'basic', vipLevel: 0, simulated: true},
  'USR-1004': {name: '模拟用户 1004', verificationLevel: 'advanced', vipLevel: 3, simulated: true},
}
const REVIEWER = '模拟审核员'

// Client tiers (2026-11-27): [daily %, lock days (null = none), min, max, initial funding %, risk]
const tiers = [
  [0.73, null, 4999, 99999, 60, 'LOW'],
  [1.25, 7, 100000, 499999, 55, 'LOW'],
  [1.79, 15, 500000, 999999, 50, 'LOW'],
  [2.35, 30, 1000000, 4999999, 45, 'LOW'],
  [2.93, 60, 5000000, 9999999, 40, 'LOW'],
  [3.55, 120, 10000000, 100000000, 35, 'MEDIUM'],
]
/** The client's example early-redemption rate; each product's rate is configurable in the admin. */
const EARLY_FEE = 0.73

export function seedProducts(now) {
  return tiers.map(([dailyRate, lockDays, minAmount, maxAmount, initialPercent, riskLevel], vip) => ({
    productId: `QF-VIP${vip}`, code: `QF-VIP${vip}`, name: `AI Fund (Quant Automated Arbitrage) VIP ${vip}`,
    description: 'AI-managed quantitative arbitrage strategy. Interest accrues daily inside the order and is paid out with the principal on redemption.',
    asset: 'USDT', riskLevel, tags: ['AI Strategy', 'US Equity'], sortOrder: (tiers.length - vip) * 10,
    lockDays, earlyRedeemFeeRate: lockDays === null ? 0 : EARLY_FEE, minAmount, maxAmount,
    totalQuota: Math.ceil(maxAmount / 100000) * 100000 * 20, initialPercent, dailyRate,
    // Demo of the restricted list: this user sees VIP 5 as full.
    restrictedUserIds: vip === 5 ? ['USR-1004'] : [],
    minVerificationLevel: 'none', minVipLevel: vip, status: 'listed', version: 1, updatedAt: now,
  }))
}

export function seedQuantFund(now = Date.now()) {
  let s = createQuantFundState({products: seedProducts(now), profiles: structuredClone(users),
    balances: {'USR-DEMO': {USDT: 300000}, 'USR-1002': {USDT: 1500000}, 'USR-1003': {USDT: 30000}, 'USR-1004': {USDT: 5000000}}})
  let n = 0
  const run = (action, args, at) => { s = transact(s, action, {...args, requestId: `seed-${++n}`}, at) }
  const lastOrder = () => s.orders[0].orderId
  const lastRedemption = () => s.redemptions[0].redemptionId
  // Each story: [start (days ago), user, product, amount, steps]; steps run in global time order below.
  const stories = [
    [20, 'USR-DEMO', 'QF-VIP0', 8000, [['approve', 1], ['requestRedeem', 15 * 24], ['approveRedeem', 15 * 24 + 2]]],
    // Lock ended 10 days ago and it kept earning, until VIP 2 reached 100% (see the funding step) and it was auto-redeemed.
    [25, 'USR-1002', 'QF-VIP2', 600000, [['approve', 1]]],
    [12, 'USR-1002', 'QF-VIP0', 20000, [['approve', 1], ['requestRedeem', 11 * 24]]],
    [10, 'USR-1004', 'QF-VIP3', 2000000, [['approve', 2]]],
    [6, 'USR-1004', 'QF-VIP0', 50000, [['approve', 1]]],
    // Inside the 7-day lock: an early redemption waiting for review (fee = principal × 0.73%).
    [3, 'USR-DEMO', 'QF-VIP1', 120000, [['approve', 1], ['requestRedeem', 2 * 24]]],
    [1, 'USR-1003', 'QF-VIP0', 6000, [['reject', 1]]],
    [8 / 24, 'USR-1002', 'QF-VIP1', 150000, []],
    [3 / 24, 'USR-1003', 'QF-VIP0', 5000, []],
    [2 / 24, 'USR-DEMO', 'QF-VIP0', 5000, []],
  ]
  const events = []
  stories.forEach(([daysAgo, userId, productId, amount, steps], story) => {
    const start = now - daysAgo * DAY
    events.push({at: start, story, step: -1, action: 'subscribe', args: {userId, productId, amount}})
    steps.forEach(([action, hours], step) => events.push({at: start + hours * HOUR, story, step, action}))
  })
  events.sort((a, b) => a.at - b.at || a.story - b.story || a.step - b.step)
  const orderOf = {}, redemptionOf = {}
  // Three days ago an operator raised VIP 2's initial funding to 97%: with the 600,000 order it reached 100%,
  // so that order (past its lock period) was redeemed automatically and the quota was released.
  events.push({at: now - 3 * DAY, story: 99, step: 0, action: 'fill'})
  events.sort((a, b) => a.at - b.at || a.story - b.story || a.step - b.step)
  for (const e of events) {
    if (e.action === 'fill') {
      const p = s.products.find(x => x.productId === 'QF-VIP2')
      run('saveProduct', {product: {...p, initialPercent: 97}, expectedVersion: p.version, actor: '模拟运营'}, e.at)
      continue
    }
    if (e.action === 'subscribe') { run('subscribe', e.args, e.at); orderOf[e.story] = lastOrder(); continue }
    if (e.action === 'requestRedeem') { run('requestRedeem', {orderId: orderOf[e.story], userId: s.orders.find(o => o.orderId === orderOf[e.story]).userId}, e.at); redemptionOf[e.story] = lastRedemption(); continue }
    if (e.action === 'approveRedeem') { run('approveRedeem', {redemptionId: redemptionOf[e.story], actor: REVIEWER}, e.at); continue }
    run(e.action, {orderId: orderOf[e.story], actor: REVIEWER}, e.at)
  }
  advance(s, now)
  s.requests = []
  s.logs.unshift({id: 'QL-seed-boot', module: 'system', action: 'seed', summary: '载入模拟数据', operator: SYSTEM, createdAt: now})
  return s
}
