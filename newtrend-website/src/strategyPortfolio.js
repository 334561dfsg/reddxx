import {computed, reactive} from 'vue'
import {strategies} from './mock/catalog.js'
import {createStrategyAccount, enrichStrategies, subscribeStrategy, changeStrategyStatus, completeExpiredStrategies} from './utils/strategyTemplates.js'
import {bindBalance} from './mock/ledger.js'
import {bootAt, clock} from './mock/clock.js'
import {strategyState, strategyCommand} from './platform/strategyClient.js'

// AI strategy data for both account modes.
// - Catalogue: the listed templates of the shared strategy Mock (/api/mock/strategy), configured in the admin (AI 策略).
// - 真實: records, balance and commands live on the shared Mock (user USR-DEMO), so admin review, force stop and
//   generated daily P&L show up here. Nothing is kept in the browser.
// - 模擬: a local account bound to the demo ledger, as before (the admin does not manage demo play money).
export const REAL_USER = 'USR-DEMO'

const toProduct = (t, index) => ({
  id: index, templateId: t.templateId, version: t.version, name: t.name,
  market: 'aiQuant.market.' + t.market, style: 'aiQuant.style.' + t.style, risk: t.risk, sharpe: t.sharpe, win: t.winRate,
  min: t.minCapital, max: t.maxCapital, minDays: t.minDays, maxDays: t.maxDays, trades: t.tradesPerDay, symbols: [...t.symbols],
  description: t.description, fee: t.feeRate / 100, maxOpenTrades: t.maxOpenTrades,
  takeProfitRange: {...t.takeProfit}, stopLossRange: {...t.stopLoss},
})
/** Listed templates in admin order, shaped like the former local catalogue. Empty until the Mock has answered. */
export const strategyCatalog = computed(() => [...strategyState.value.templates]
  .filter(t => t.status === 'listed').sort((a, b) => b.sortOrder - a.sortOrder).map(toProduct))

// ----- 模擬 (local) -----
const localTemplates = enrichStrategies(strategies)
export const strategyAccounts = reactive({demo: bindBalance(createStrategyAccount(0), 'demo', 'USDT')})
// Seed mirroring the reference demo account's My Strategies: one running conservative stock strategy shown there as
// "Conservative Stock Blue", 500 capital, 14-day term, no P&L yet. Placed relative to page load (single mock clock).
{
  const template = localTemplates.find(s => s.name === 'Blue Chip Index Defender'), demo = strategyAccounts.demo, capital = 500, days = 14
  if (template) {
    demo.records.push({id: 'seed-demo-strategy-1', template: {...template, name: 'Conservative Stock Blue', symbols: [...template.symbols]}, capital, days, takeProfit: 20, stopLoss: 10, status: 'running', mode: 'demo', pnl: 0, createdAt: bootAt, endAt: bootAt + days * 86400000})
    demo.balance -= capital
  }
}

// ----- 真實 (shared Mock) -----
const snapshotTemplate = t => ({templateId: t.templateId, name: t.name, market: 'aiQuant.market.' + t.market, style: 'aiQuant.style.' + t.style, risk: t.risk, symbols: [...t.symbols], fee: t.feeRate / 100, maxOpenTrades: t.maxOpenTrades})
const realAccount = () => {
  const s = strategyState.value
  const daily = {}
  for (const row of s.dailyPnl) if (row.userId === REAL_USER) (daily[row.subscriptionId] ||= []).push({date: row.date, tradeCount: row.tradeCount, pnl: row.pnl})
  return {
    balance: s.balances[REAL_USER]?.USDT ?? 0,
    records: s.subscriptions.filter(sub => sub.userId === REAL_USER).map(sub => ({
      id: sub.subscriptionId, template: snapshotTemplate(sub.templateSnapshot), capital: sub.capital, days: sub.days,
      takeProfit: sub.takeProfit, stopLoss: sub.stopLoss, status: sub.status, endReason: sub.endReason, mode: 'real', pnl: sub.pnl,
      createdAt: sub.createdAt, endAt: sub.endAt, stoppedAt: sub.stoppedAt, dailyStats: (daily[sub.subscriptionId] || []).sort((a, b) => b.date.localeCompare(a.date)),
    })),
  }
}
const isReal = mode => mode !== 'common.demo.demo'
/** {balance, records} for a mode; reactive when read inside a computed. */
export const strategyAccountFor = mode => (isReal(mode) ? realAccount() : strategyAccounts.demo)

/** Subscribes in the given mode. 真實 goes to the server (pending review or initialising per admin policy). */
export async function subscribeFor(mode, product, draft, requestId) {
  if (!isReal(mode)) { const record = subscribeStrategy(strategyAccounts.demo, product, draft, requestId); record.mode = 'demo'; return record }
  await strategyCommand('subscribe', {requestId, userId: REAL_USER, templateId: product.templateId, expectedVersion: product.version,
    capital: Number(draft.capital), days: Number(draft.days), takeProfit: Number(draft.takeProfit), stopLoss: Number(draft.stopLoss)})
  return strategyState.value.subscriptions.find(sub => sub.userId === REAL_USER)
}
/** Pause / resume / stop one record of the given mode. */
export async function changeStatusFor(mode, record, kind) {
  if (!isReal(mode)) return changeStrategyStatus(strategyAccounts.demo, record.id, kind)
  await strategyCommand(kind, {subscriptionId: record.id, userId: REAL_USER})
}

// One-shot success notice raised by the subscribe dialog and shown by the strategy page after the dialog closes.
export const strategyNotice = reactive({key: '', at: 0})
export const strategyFilters = reactive({style: '', market: '', sort: 'sharpe_desc'})
/** Completes local demo strategies whose end date has passed (the server settles 真實 ones itself). */
export const refreshStrategies = () => { completeExpiredStrategies(strategyAccounts.demo, clock.now()) }
refreshStrategies()
