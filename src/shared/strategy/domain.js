import {eligibilityFailures, validateEligibility} from '../lending/eligibility.js'

// AI strategy ledger shared by the admin (/admin/strategy/*) and the public site's 真實 mode.
// Pure functions over a plain state object; the server service owns the single in-memory instance.
// Every command works on a private copy and is committed only after all checks pass.

export const DAY = 86400000
/** Delay between approval and the first trading cycle (the reference shows 初始化中 in between). */
export const INIT_MS = 60000
export const MARKETS = ['stock', 'crypto', 'forex']
export const STYLES = ['conservative', 'balanced', 'aggressive']
export const LIVE = ['pending_review', 'initializing', 'running', 'paused']
export const END_REASONS = ['user_stop', 'expired', 'take_profit', 'stop_loss', 'admin_stop']
const REASON_TEXT = {user_stop: '用户停止', expired: '到期结束', take_profit: '止盈结束', stop_loss: '止损结束', admin_stop: '后台强制停止'}
export const DEFAULT_POLICY = {
  reviewRequired: true,
  maxRunningPerUser: 5,
  maxCapitalPerUser: 1000000,
  autoSettleOnExpiry: true,
  autoTakeProfitStopLoss: true,
  lossAlertPercent: 20,
}
export const ADMIN = '管理员（模拟）'
export const SYSTEM = '系统'
export const USER = '用户（模拟）'

export const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100
const fail = (ok, code) => { if (!ok) throw new Error(code) }
const finite = value => typeof value === 'number' && Number.isFinite(value)
/** Calendar day in the site's display zone (UTC+8). */
export const dayKey = ms => new Date(ms + 8 * 3600000).toISOString().slice(0, 10)

export function createStrategyState({templates = [], policy = DEFAULT_POLICY, balances = {}, profiles = {}} = {}) {
  return {version: 1, templates, subscriptions: [], dailyPnl: [], settlements: [], logs: [], requests: [], policy: {...policy}, balances, profiles}
}

function log(s, entry, now) {
  s.logs.unshift({id: `SL-${now}-${s.logs.length + 1}`, createdAt: now, ...entry})
}
function credit(s, userId, amount) {
  const wallet = s.balances[userId] ||= {USDT: 0}
  const next = money((wallet.USDT || 0) + amount)
  fail(next >= 0, 'balance')
  wallet.USDT = next
}

// ---------- templates ----------

export function validateTemplate(t) {
  fail(typeof t?.name === 'string' && t.name.trim(), 'templateName')
  fail(MARKETS.includes(t.market) && STYLES.includes(t.style), 'templateCategory')
  fail(Number.isInteger(t.risk) && t.risk >= 1 && t.risk <= 5, 'templateRisk')
  fail(finite(t.sharpe) && finite(t.winRate) && t.winRate >= 0 && t.winRate <= 100 && finite(t.tradesPerDay) && t.tradesPerDay > 0, 'templateMetrics')
  fail(Array.isArray(t.symbols) && t.symbols.length && t.symbols.every(x => typeof x === 'string' && x.trim()), 'templateSymbols')
  fail(finite(t.minCapital) && t.minCapital > 0 && finite(t.maxCapital) && t.maxCapital >= t.minCapital, 'templateCapital')
  fail(Number.isInteger(t.minDays) && t.minDays >= 1 && Number.isInteger(t.maxDays) && t.maxDays >= t.minDays, 'templateDays')
  for (const [key, ceiling] of [['takeProfit', 100], ['stopLoss', 100]]) {
    const r = t[key]
    fail(r && [r.min, r.max, r.default].every(finite) && r.min >= 1 && r.min <= r.default && r.default <= r.max && r.max <= ceiling, key === 'takeProfit' ? 'templateTakeProfit' : 'templateStopLoss')
  }
  fail(finite(t.feeRate) && t.feeRate >= 0 && t.feeRate <= 5, 'templateFee')
  fail(Number.isInteger(t.maxOpenTrades) && t.maxOpenTrades >= 1, 'templateOpenTrades')
  fail(finite(t.capacity) && t.capacity >= 0, 'templateCapacity')
  const r = t.dailyReturn
  fail(r && finite(r.min) && finite(r.max) && r.min < r.max && r.min >= -20 && r.max <= 20, 'templateReturn')
  fail(finite(t.tradeDayRatio) && t.tradeDayRatio > 0 && t.tradeDayRatio <= 1, 'templateTradeDays')
  fail(Number.isInteger(t.sortOrder), 'templateSort')
  validateEligibility(t)
}

/** Terms frozen into a subscription; later template edits never reach existing subscriptions. */
export const templateSnapshot = t => structuredClone({
  templateId: t.templateId, version: t.version, name: t.name, market: t.market, style: t.style, risk: t.risk, symbols: t.symbols,
  feeRate: t.feeRate, maxOpenTrades: t.maxOpenTrades, tradesPerDay: t.tradesPerDay, dailyReturn: t.dailyReturn, tradeDayRatio: t.tradeDayRatio,
})

// ---------- daily P&L generation and settlement ----------

function rng(seed) {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
/** Deterministic trading result for one subscription-day, inside the template's configured daily-return range. */
export function dailyResult(sub, dayStart) {
  const t = sub.templateSnapshot, random = rng(`${sub.subscriptionId}:${dayKey(dayStart)}`)
  if (random() > t.tradeDayRatio) return null
  const percent = t.dailyReturn.min + (t.dailyReturn.max - t.dailyReturn.min) * random()
  return {pnl: money(sub.capital * percent / 100), tradeCount: 1 + Math.floor(random() * Math.max(1, Math.round(t.tradesPerDay * 2)))}
}

function settle(s, sub, reason, at, operator) {
  sub.status = 'completed'
  sub.endReason = reason
  sub.stoppedAt = at
  const returned = money(sub.capital + sub.pnl)
  credit(s, sub.userId, Math.max(0, returned))
  s.settlements.unshift({
    settlementId: `SET-${at}-${s.settlements.length + 1}`, subscriptionId: sub.subscriptionId, userId: sub.userId, userName: sub.userName,
    templateName: sub.templateSnapshot.name, reason, capital: sub.capital, pnl: sub.pnl, returned: Math.max(0, returned), settledAt: at, operator,
  })
  log(s, {module: 'subscription', action: 'settle', refId: sub.subscriptionId, targetLabel: sub.templateSnapshot.name, summary: `结算策略（${REASON_TEXT[reason]}），返还 ${Math.max(0, returned)} USDT`, operator}, at)
}

function hitLimit(sub) {
  if (!sub.policySnapshot.autoTakeProfitStopLoss) return null
  if (sub.pnl >= money(sub.capital * sub.takeProfit / 100)) return 'take_profit'
  if (sub.pnl <= -money(sub.capital * sub.stopLoss / 100)) return 'stop_loss'
  return null
}

/** Moves every subscription forward to `now`: initialisation, daily generation, take-profit/stop-loss and expiry. Idempotent. */
export function advance(s, now = Date.now()) {
  for (const sub of s.subscriptions) {
    if (sub.status === 'initializing' && now >= sub.initializedAt + INIT_MS) {
      sub.status = 'running'
      sub.runningAt = sub.initializedAt + INIT_MS
      sub.lastGeneratedAt = sub.runningAt
    }
    if (sub.status === 'running') {
      while (sub.status === 'running' && sub.lastGeneratedAt + DAY <= Math.min(now, sub.endAt)) {
        const dayStart = sub.lastGeneratedAt, closedAt = dayStart + DAY
        const result = dailyResult(sub, dayStart)
        if (result) {
          s.dailyPnl.unshift({id: `PNL-${sub.subscriptionId}-${dayKey(dayStart)}`, subscriptionId: sub.subscriptionId, userId: sub.userId, date: dayKey(dayStart), tradeCount: result.tradeCount, pnl: result.pnl, source: 'system', operator: SYSTEM, createdAt: closedAt})
          sub.pnl = money(sub.pnl + result.pnl)
          sub.tradeCount += result.tradeCount
        }
        sub.lastGeneratedAt = closedAt
        const reason = hitLimit(sub)
        if (reason) settle(s, sub, reason, closedAt, SYSTEM)
      }
    }
    if (['running', 'paused', 'initializing'].includes(sub.status) && sub.endAt && now >= sub.endAt && sub.policySnapshot.autoSettleOnExpiry)
      settle(s, sub, 'expired', sub.endAt, SYSTEM)
  }
  return s
}

// ---------- commands ----------

function subscribe(s, a, now) {
  const t = s.templates.find(x => x.templateId === a.templateId)
  fail(t?.status === 'listed', 'template')
  fail(a.expectedVersion == null || a.expectedVersion === t.version, 'templateChanged')
  const failures = eligibilityFailures(t, s.profiles[a.userId])
  fail(!failures.length, failures[0])
  const capital = Number(a.capital), days = Number(a.days), takeProfit = Number(a.takeProfit), stopLoss = Number(a.stopLoss)
  fail(finite(capital) && money(capital) === capital && capital >= t.minCapital && capital <= t.maxCapital, 'capital')
  fail(Number.isInteger(days) && days >= t.minDays && days <= t.maxDays, 'days')
  fail(finite(takeProfit) && takeProfit >= t.takeProfit.min && takeProfit <= t.takeProfit.max, 'takeProfit')
  fail(finite(stopLoss) && stopLoss >= t.stopLoss.min && stopLoss <= t.stopLoss.max, 'stopLoss')
  const live = s.subscriptions.filter(x => x.userId === a.userId && LIVE.includes(x.status))
  fail(live.length < s.policy.maxRunningPerUser, 'userLimit')
  fail(live.reduce((total, x) => total + x.capital, 0) + capital <= s.policy.maxCapitalPerUser, 'userCapital')
  const used = s.subscriptions.filter(x => x.templateSnapshot.templateId === t.templateId && LIVE.includes(x.status)).reduce((total, x) => total + x.capital, 0)
  fail(!t.capacity || used + capital <= t.capacity, 'capacity')
  fail((s.balances[a.userId]?.USDT || 0) >= capital, 'balance')
  credit(s, a.userId, -capital)
  const review = s.policy.reviewRequired
  const sub = {
    subscriptionId: `STR-${now}-${s.subscriptions.length + 1}`, userId: a.userId, userName: s.profiles[a.userId]?.name || a.userId,
    templateSnapshot: templateSnapshot(t), policySnapshot: {...s.policy},
    eligibilitySnapshot: {minVerificationLevel: t.minVerificationLevel, minVipLevel: t.minVipLevel, ...s.profiles[a.userId]},
    capital, days, takeProfit, stopLoss, pnl: 0, tradeCount: 0, status: review ? 'pending_review' : 'initializing',
    createdAt: now, reviewer: '', reviewedAt: null, initializedAt: review ? null : now, runningAt: null, endAt: review ? null : now + days * DAY,
    lastGeneratedAt: null, pausedAt: null, stoppedAt: null, endReason: null,
  }
  s.subscriptions.unshift(sub)
  log(s, {module: 'subscription', action: 'subscribe', refId: sub.subscriptionId, targetLabel: t.name, summary: `订阅策略 ${capital} USDT / ${days} 天`, operator: a.actor || USER}, now)
  return sub
}

function findSub(s, a) {
  const sub = s.subscriptions.find(x => x.subscriptionId === a.subscriptionId)
  fail(sub, 'subscription')
  return sub
}

export function transact(source, action, args = {}, now = Date.now()) {
  const s = structuredClone(source)
  fail(args.requestId && !s.requests.includes(args.requestId), 'duplicate')
  advance(s, now)
  const actor = args.actor || (['subscribe', 'pause', 'resume', 'stop'].includes(action) ? USER : ADMIN)
  if (action === 'subscribe') subscribe(s, args, now)
  else if (['approve', 'reject'].includes(action)) {
    const sub = findSub(s, args)
    fail(sub.status === 'pending_review', 'status')
    sub.reviewer = actor
    sub.reviewedAt = now
    if (action === 'approve') {
      fail(s.templates.find(x => x.templateId === sub.templateSnapshot.templateId)?.status === 'listed', 'template')
      Object.assign(sub, {status: 'initializing', initializedAt: now, endAt: now + sub.days * DAY})
    } else {
      sub.status = 'rejected'
      credit(s, sub.userId, sub.capital)
    }
    log(s, {module: 'subscription', action, refId: sub.subscriptionId, targetLabel: sub.templateSnapshot.name, summary: action === 'approve' ? '审核通过，开始初始化' : '审核拒绝，退回本金', operator: actor}, now)
  } else if (['pause', 'resume', 'stop'].includes(action)) {
    const sub = findSub(s, args)
    fail(sub.userId === args.userId, 'owner')
    const allowed = {pause: ['running'], resume: ['paused'], stop: ['running', 'paused']}[action]
    fail(allowed.includes(sub.status), 'status')
    if (action === 'pause') Object.assign(sub, {status: 'paused', pausedAt: now})
    else if (action === 'resume') Object.assign(sub, {status: 'running', pausedAt: null, lastGeneratedAt: Math.max(sub.lastGeneratedAt || now, now)})
    if (action === 'stop') settle(s, sub, 'user_stop', now, actor)
    else log(s, {module: 'subscription', action, refId: sub.subscriptionId, targetLabel: sub.templateSnapshot.name, summary: action === 'pause' ? '暂停策略' : '恢复策略', operator: actor}, now)
  } else if (action === 'forceStop') {
    const sub = findSub(s, args)
    fail(['initializing', 'running', 'paused'].includes(sub.status), 'status')
    settle(s, sub, 'admin_stop', now, actor)
  } else if (action === 'adjustPnl') {
    const sub = findSub(s, args)
    fail(['running', 'paused'].includes(sub.status), 'status')
    const amount = Number(args.amount)
    fail(finite(amount) && amount !== 0 && money(amount) === amount && Math.abs(amount) <= sub.capital, 'adjustAmount')
    s.dailyPnl.unshift({id: `ADJ-${now}-${s.dailyPnl.length + 1}`, subscriptionId: sub.subscriptionId, userId: sub.userId, date: dayKey(now), tradeCount: 0, pnl: amount, source: 'manual', operator: actor, note: String(args.note || '').slice(0, 200), createdAt: now})
    const before = sub.pnl
    sub.pnl = money(sub.pnl + amount)
    log(s, {module: 'pnl', action, refId: sub.subscriptionId, targetLabel: sub.templateSnapshot.name, summary: `调整盈亏 ${amount > 0 ? '+' : ''}${amount} USDT`, before: {pnl: before}, after: {pnl: sub.pnl}, operator: actor}, now)
  } else if (action === 'saveTemplate') {
    const draft = structuredClone(args.template)
    draft.minVerificationLevel ??= 'none'
    draft.minVipLevel ??= 0
    validateTemplate(draft)
    const index = s.templates.findIndex(x => x.templateId === draft.templateId)
    const before = index < 0 ? null : structuredClone(s.templates[index])
    if (before) fail(args.expectedVersion === before.version, 'stale')
    const saved = {...draft, name: draft.name.trim(), symbols: draft.symbols.map(x => x.trim()),
      templateId: before?.templateId || `STG-${String(s.templates.length + 1).padStart(3, '0')}-${now}`,
      status: before?.status || 'unlisted', version: (before?.version || 0) + 1, updatedAt: now}
    if (before) s.templates[index] = saved; else s.templates.push(saved)
    log(s, {module: 'template', action, refId: saved.templateId, targetLabel: saved.name, summary: before ? '保存策略模板' : '新增策略模板', before, after: structuredClone(saved), operator: actor}, now)
  } else if (action === 'setTemplateStatus') {
    const template = s.templates.find(x => x.templateId === args.templateId)
    fail(template, 'template')
    fail(template.status === args.expectedStatus, 'stale')
    const before = structuredClone(template)
    template.status = template.status === 'listed' ? 'unlisted' : 'listed'
    template.updatedAt = now
    log(s, {module: 'template', action: template.status === 'listed' ? 'listTemplate' : 'unlistTemplate', refId: template.templateId, targetLabel: template.name, summary: template.status === 'listed' ? '上架策略模板' : '下架策略模板', before, after: structuredClone(template), operator: actor}, now)
  } else if (action === 'savePolicy') {
    const p = args.policy, before = structuredClone(s.policy)
    fail(JSON.stringify(args.expectedPolicy) === JSON.stringify(before), 'stale')
    fail(p && ['reviewRequired', 'autoSettleOnExpiry', 'autoTakeProfitStopLoss'].every(k => typeof p[k] === 'boolean'), 'policy')
    fail(Number.isInteger(p.maxRunningPerUser) && p.maxRunningPerUser >= 1 && finite(p.maxCapitalPerUser) && p.maxCapitalPerUser > 0 && finite(p.lossAlertPercent) && p.lossAlertPercent > 0 && p.lossAlertPercent <= 100, 'policy')
    s.policy = {reviewRequired: p.reviewRequired, maxRunningPerUser: p.maxRunningPerUser, maxCapitalPerUser: p.maxCapitalPerUser, autoSettleOnExpiry: p.autoSettleOnExpiry, autoTakeProfitStopLoss: p.autoTakeProfitStopLoss, lossAlertPercent: p.lossAlertPercent}
    log(s, {module: 'policy', action, summary: '保存风控设置', before, after: structuredClone(s.policy), operator: actor}, now)
  } else throw new Error('action')
  s.requests.push(args.requestId)
  return s
}

/** Loss alert for the admin lists: open subscriptions whose loss reached the policy threshold of their capital. */
export const lossAlert = (sub, policy) => ['running', 'paused'].includes(sub.status) && sub.pnl < 0 && -sub.pnl >= sub.capital * policy.lossAlertPercent / 100
