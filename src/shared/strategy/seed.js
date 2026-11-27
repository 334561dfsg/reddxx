import {strategies} from '../../../newtrend-website/src/mock/catalog.js'
import {strategyTerms, buildDailyStats} from '../../../newtrend-website/src/utils/strategyTemplates.js'
import {createStrategyState, templateSnapshot, DEFAULT_POLICY, DAY, INIT_MS, SYSTEM, ADMIN, USER, REASON_TEXT, money} from './domain.js'

// Seed for the shared strategy mock: the public catalogue's nine templates, the 真實 records the public site
// used to keep locally (USR-DEMO, the public demo user) and a few other users so review and settlement can be tried.
// Dates are relative to service start; daily P&L rows sum exactly to each record's P&L. The demo user's running and
// paused strategies carry 30+ trading days so the stats list has enough rows to page / load on scroll (user request).
const code = key => key.split('.').pop()
const returnRange = {conservative: {min: -0.3, max: 0.5}, balanced: {min: -0.6, max: 1}, aggressive: {min: -1.5, max: 2.2}}

export function seedTemplates(now) {
  return strategies.map((s, index) => {
    const [maxCapital, minDays, maxDays, tradesPerDay, symbols] = strategyTerms[index]
    return {
      templateId: `STG-${String(index + 1).padStart(3, '0')}`, sortOrder: (strategies.length - index) * 10, name: s.name, market: code(s.market), style: code(s.style),
      risk: s.risk, sharpe: s.sharpe, winRate: s.win, tradesPerDay, symbols: [...symbols], description: s.description,
      minCapital: s.min, maxCapital, minDays, maxDays, takeProfit: {min: 1, max: 100, default: 10}, stopLoss: {min: 1, max: 50, default: 5},
      feeRate: 0.1, maxOpenTrades: 3, capacity: 0, dailyReturn: {...returnRange[code(s.style)]}, tradeDayRatio: 0.75,
      minVerificationLevel: 'none', minVipLevel: 0, status: 'listed', version: 1, updatedAt: now,
    }
  })
}

const users = {
  'USR-DEMO': {name: '演示用户', verificationLevel: 'basic', vipLevel: 1, simulated: true},
  'USR-1002': {name: '模拟用户 1002', verificationLevel: 'advanced', vipLevel: 2, simulated: true},
  'USR-1003': {name: '模拟用户 1003', verificationLevel: 'basic', vipLevel: 0, simulated: true},
  'USR-1004': {name: '模拟用户 1004', verificationLevel: 'advanced', vipLevel: 3, simulated: true},
}

// [id, user, template, {capital, days, startDaysAgo, status, pnl, stoppedDaysAgo, endReason, takeProfit?, stopLoss?}]
const records = [
  ['seed-real-strategy-2', 'USR-DEMO', 'Stable Crypto Income', {capital: 1000, days: 90, startDaysAgo: 48, status: 'paused', pnl: -8.5}],
  ['seed-real-strategy-1', 'USR-DEMO', 'Diversified Index Growth', {capital: 2000, days: 90, startDaysAgo: 55, status: 'running', pnl: 36.2}],
  ['seed-real-strategy-3', 'USR-DEMO', 'FX Carry Conservative', {capital: 800, days: 30, startDaysAgo: 40, status: 'completed', pnl: 12.4, stoppedDaysAgo: 10, endReason: 'user_stop'}],
  ['seed-real-strategy-4', 'USR-DEMO', 'Balanced Crypto Alpha', {capital: 1500, days: 21, startDaysAgo: 44, status: 'completed', pnl: -22.8, stoppedDaysAgo: 23, endReason: 'expired'}],
  ['seed-real-strategy-5', 'USR-DEMO', 'FX Momentum Balanced', {capital: 1200, days: 30, startDaysAgo: 48, status: 'completed', pnl: 18.6, stoppedDaysAgo: 18, endReason: 'expired'}],
  ['seed-real-strategy-6', 'USR-DEMO', 'Nasdaq Tech Aggressive', {capital: 3000, days: 14, startDaysAgo: 52, status: 'completed', pnl: 96.4, stoppedDaysAgo: 38, endReason: 'expired'}],
  ['seed-real-strategy-7', 'USR-DEMO', 'High Leverage Crypto Hunter', {capital: 2500, days: 7, startDaysAgo: 55, status: 'completed', pnl: -140.5, stoppedDaysAgo: 48, endReason: 'stop_loss', stopLoss: 5}],
  ['seed-real-strategy-8', 'USR-DEMO', 'FX Scalper Aggressive', {capital: 1000, days: 14, startDaysAgo: 60, status: 'completed', pnl: 31.2, stoppedDaysAgo: 46, endReason: 'expired'}],
  ['seed-real-strategy-9', 'USR-DEMO', 'Blue Chip Index Defender', {capital: 5000, days: 45, startDaysAgo: 70, status: 'completed', pnl: 64, stoppedDaysAgo: 25, endReason: 'expired'}],
  ['seed-real-strategy-10', 'USR-DEMO', 'Stable Crypto Income', {capital: 800, days: 30, startDaysAgo: 75, status: 'completed', pnl: 9.6, stoppedDaysAgo: 45, endReason: 'expired'}],
  ['seed-real-strategy-11', 'USR-DEMO', 'Diversified Index Growth', {capital: 2200, days: 30, startDaysAgo: 82, status: 'completed', pnl: -15.3, stoppedDaysAgo: 52, endReason: 'expired'}],
  ['seed-real-strategy-12', 'USR-DEMO', 'FX Carry Conservative', {capital: 1000, days: 60, startDaysAgo: 90, status: 'completed', pnl: 21.7, stoppedDaysAgo: 30, endReason: 'expired'}],
  // Older finished strategies so 我的策略 has enough rows to load on scroll (user request 2026-11-27).
  ['seed-real-strategy-13', 'USR-DEMO', 'Blue Chip Index Defender', {capital: 800, days: 14, startDaysAgo: 95, status: 'completed', pnl: -36.0, stoppedDaysAgo: 81, endReason: 'user_stop'}],
  ['seed-real-strategy-14', 'USR-DEMO', 'Stable Crypto Income', {capital: 1200, days: 21, startDaysAgo: 102, status: 'completed', pnl: -2.7, stoppedDaysAgo: 81, endReason: 'expired'}],
  ['seed-real-strategy-15', 'USR-DEMO', 'Diversified Index Growth', {capital: 2000, days: 30, startDaysAgo: 109, status: 'completed', pnl: 30.6, stoppedDaysAgo: 79, endReason: 'expired'}],
  ['seed-real-strategy-16', 'USR-DEMO', 'FX Carry Conservative', {capital: 3000, days: 45, startDaysAgo: 116, status: 'completed', pnl: 63.9, stoppedDaysAgo: 71, endReason: 'expired'}],
  ['seed-real-strategy-17', 'USR-DEMO', 'Balanced Crypto Alpha', {capital: 1500, days: 14, startDaysAgo: 123, status: 'completed', pnl: -10.8, stoppedDaysAgo: 109, endReason: 'user_stop'}],
  ['seed-real-strategy-18', 'USR-DEMO', 'FX Momentum Balanced', {capital: 800, days: 21, startDaysAgo: 130, status: 'completed', pnl: 22.5, stoppedDaysAgo: 109, endReason: 'expired'}],
  ['seed-real-strategy-19', 'USR-DEMO', 'Nasdaq Tech Aggressive', {capital: 1200, days: 30, startDaysAgo: 137, status: 'completed', pnl: 55.8, stoppedDaysAgo: 107, endReason: 'expired'}],
  ['seed-real-strategy-20', 'USR-DEMO', 'FX Scalper Aggressive', {capital: 2000, days: 45, startDaysAgo: 144, status: 'completed', pnl: -18.9, stoppedDaysAgo: 99, endReason: 'expired'}],
  ['seed-real-strategy-21', 'USR-DEMO', 'High Leverage Crypto Hunter', {capital: 3000, days: 14, startDaysAgo: 151, status: 'completed', pnl: 14.4, stoppedDaysAgo: 137, endReason: 'user_stop'}],
  ['seed-real-strategy-22', 'USR-DEMO', 'Blue Chip Index Defender', {capital: 1500, days: 21, startDaysAgo: 158, status: 'completed', pnl: 47.7, stoppedDaysAgo: 137, endReason: 'expired'}],
  ['seed-real-strategy-23', 'USR-DEMO', 'Stable Crypto Income', {capital: 800, days: 30, startDaysAgo: 165, status: 'completed', pnl: -27.0, stoppedDaysAgo: 135, endReason: 'expired'}],
  ['seed-real-strategy-24', 'USR-DEMO', 'Diversified Index Growth', {capital: 1200, days: 45, startDaysAgo: 172, status: 'completed', pnl: 6.3, stoppedDaysAgo: 127, endReason: 'expired'}],
  ['seed-real-strategy-25', 'USR-DEMO', 'FX Carry Conservative', {capital: 2000, days: 14, startDaysAgo: 179, status: 'completed', pnl: 39.6, stoppedDaysAgo: 165, endReason: 'user_stop'}],
  ['seed-real-strategy-26', 'USR-DEMO', 'Balanced Crypto Alpha', {capital: 3000, days: 21, startDaysAgo: 186, status: 'completed', pnl: -35.1, stoppedDaysAgo: 165, endReason: 'expired'}],
  ['seed-review-1', 'USR-DEMO', 'Blue Chip Index Defender', {capital: 600, days: 30, startDaysAgo: 0, status: 'pending_review', pnl: 0}],
  ['seed-review-2', 'USR-1002', 'Nasdaq Tech Aggressive', {capital: 12000, days: 21, startDaysAgo: 0, status: 'pending_review', pnl: 0}],
  ['seed-review-3', 'USR-1003', 'Stable Crypto Income', {capital: 2000, days: 14, startDaysAgo: 1, status: 'pending_review', pnl: 0}],
  ['seed-run-1002', 'USR-1002', 'Balanced Crypto Alpha', {capital: 8000, days: 30, startDaysAgo: 9, status: 'running', pnl: -1820, stopLoss: 30}],
  ['seed-run-1004', 'USR-1004', 'Diversified Index Growth', {capital: 20000, days: 45, startDaysAgo: 15, status: 'running', pnl: 412.6}],
  ['seed-rejected-1003', 'USR-1003', 'High Leverage Crypto Hunter', {capital: 5000, days: 7, startDaysAgo: 3, status: 'rejected', pnl: 0}],
]

export function seedStrategy(now = Date.now()) {
  const templates = seedTemplates(now)
  const s = createStrategyState({templates, policy: DEFAULT_POLICY, profiles: structuredClone(users),
    balances: {'USR-DEMO': {USDT: 20000}, 'USR-1002': {USDT: 50000}, 'USR-1003': {USDT: 8000}, 'USR-1004': {USDT: 120000}}})
  records.forEach(([id, userId, name, r], index) => {
    const t = templates.find(x => x.name === name)
    const createdAt = now - r.startDaysAgo * DAY - (r.status === 'pending_review' ? (index + 1) * 3600000 : 2 * 3600000)
    const reviewed = r.status !== 'pending_review'
    const approvedAt = reviewed ? createdAt + 3600000 : null
    const running = ['running', 'paused', 'completed'].includes(r.status)
    const runningAt = running ? approvedAt + INIT_MS : null
    const stoppedAt = r.stoppedDaysAgo != null ? now - r.stoppedDaysAgo * DAY : null
    const sub = {
      subscriptionId: id, userId, userName: users[userId].name, templateSnapshot: templateSnapshot(t), policySnapshot: {...DEFAULT_POLICY},
      eligibilitySnapshot: {minVerificationLevel: t.minVerificationLevel, minVipLevel: t.minVipLevel, ...users[userId]},
      capital: r.capital, days: r.days, takeProfit: r.takeProfit ?? 20, stopLoss: r.stopLoss ?? 10, pnl: money(r.pnl), tradeCount: 0, status: r.status,
      createdAt, reviewer: reviewed ? '模拟审核员' : '', reviewedAt: approvedAt, initializedAt: running ? approvedAt : null, runningAt,
      endAt: running ? approvedAt + r.days * DAY : null, lastGeneratedAt: running ? (stoppedAt ?? now) : null,
      pausedAt: r.status === 'paused' ? now - DAY : null, stoppedAt, endReason: r.endReason || null,
    }
    if (running) {
      const days = buildDailyStats({startAt: runningAt, endAt: stoppedAt ?? now, totalPnl: r.pnl, seed: id.length * 7919 + r.capital})
      for (const d of days) s.dailyPnl.push({id: `PNL-${id}-${d.date}`, subscriptionId: id, userId, date: d.date, tradeCount: d.tradeCount, pnl: d.pnl, source: 'system', operator: SYSTEM, createdAt: Date.parse(d.date) + DAY})
      sub.tradeCount = days.reduce((total, d) => total + d.tradeCount, 0)
    }
    if (r.status === 'completed') s.settlements.push({settlementId: `SET-${id}`, subscriptionId: id, userId, userName: users[userId].name, templateName: t.name, reason: r.endReason, capital: r.capital, pnl: sub.pnl, returned: money(r.capital + sub.pnl), settledAt: stoppedAt, operator: r.endReason === 'user_stop' ? '用户（模拟）' : SYSTEM})
    // Operation log as the live flow would have written it: submit → review → pause → settlement.
    const entry = (action, summary, operator, createdAt) => s.logs.push({id: `SL-seed-${id}-${action}`, module: 'subscription', action, refId: id, targetLabel: t.name, summary, operator, createdAt})
    entry('subscribe', `订阅策略 ${r.capital} USDT / ${r.days} 天`, USER, createdAt)
    if (r.status === 'rejected') entry('reject', '审核拒绝，退回本金', '模拟审核员', approvedAt)
    else if (reviewed) entry('approve', '审核通过，开始初始化', '模拟审核员', approvedAt)
    if (r.status === 'paused') entry('pause', '暂停策略', USER, sub.pausedAt)
    if (r.status === 'completed') entry('settle', `结算策略（${REASON_TEXT[r.endReason]}），返还 ${money(r.capital + sub.pnl)} USDT`, r.endReason === 'user_stop' ? USER : SYSTEM, stoppedAt)
    s.subscriptions.push(sub)
  })
  s.subscriptions.sort((a, b) => b.createdAt - a.createdAt)
  s.dailyPnl.sort((a, b) => b.createdAt - a.createdAt)
  s.settlements.sort((a, b) => b.settledAt - a.settledAt)
  s.logs.sort((a, b) => b.createdAt - a.createdAt)
  s.logs.unshift({id: 'SL-seed-boot', module: 'system', action: 'seed', summary: '载入模拟数据', operator: ADMIN, createdAt: now})
  return s
}
