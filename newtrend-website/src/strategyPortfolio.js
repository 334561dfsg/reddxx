import {reactive} from 'vue'
import {strategies} from './mock/catalog.js'
import {createStrategyAccount,enrichStrategies,buildDailyStats,completeExpiredStrategies} from './utils/strategyTemplates.js'
import {bindBalance} from './mock/ledger.js'
import {bootAt,clock} from './mock/clock.js'
export const strategyCatalog=enrichStrategies(strategies)
// Real and demo accounts are kept apart, like the reference lists strategies per account mode.
// Each account's `balance` is a live view of the shared ledger's USDT for that mode.
export const strategyAccounts=reactive({real:bindBalance(createStrategyAccount(0),'real','USDT'),demo:bindBalance(createStrategyAccount(0),'demo','USDT')})
// Seed mirroring the reference demo account's My Strategies: one running conservative stock strategy
// (Lv.1, SPX500/US30 template) shown there as "Conservative Stock Blue", 500 capital, 14-day term, no P&L yet.
// Seeds are placed relative to page load (single mock clock), so end dates never go stale.
const SEEDED_AT=bootAt
{const template=strategyCatalog.find(s=>s.name==='Blue Chip Index Defender');if(template){const demo=strategyAccounts.demo,capital=500,days=14
 demo.records.push({id:'seed-demo-strategy-1',template:{...template,name:'Conservative Stock Blue',symbols:[...template.symbols]},capital,days,takeProfit:20,stopLoss:10,status:'running',mode:'demo',pnl:0,createdAt:SEEDED_AT,endAt:SEEDED_AT+days*86400000})
 demo.balance-=capital}}
export const strategyAccountFor=mode=>strategyAccounts[mode==='common.demo.demo'?'demo':'real']
// One-shot success notice raised by the subscribe dialog and shown by the strategy page after the dialog closes.
export const strategyNotice=reactive({key:'',at:0})
export const strategyFilters=reactive({style:'',market:'',sort:'sharpe_desc'})
// Synthetic 真實-mode records (the reference real account is empty): one per status so every row state is visible.
{const real=strategyAccounts.real,DAY=86400000,find=name=>strategyCatalog.find(s=>s.name===name)
 const seed=(id,name,{capital,days,startDaysAgo,status,pnl,stoppedDaysAgo})=>{const template=find(name);if(!template)return
  const createdAt=SEEDED_AT-startDaysAgo*DAY
  const stoppedAt=stoppedDaysAgo!=null?SEEDED_AT-stoppedDaysAgo*DAY:null
  // Synthetic closed-trade history up to today (or the stop date) that adds up to the record's P&L.
  const dailyStats=buildDailyStats({startAt:createdAt,endAt:stoppedAt??SEEDED_AT,totalPnl:pnl,seed:id.length*7919+capital})
  real.records.push({id,template:{...template,symbols:[...template.symbols]},capital,days,takeProfit:20,stopLoss:10,status,mode:'real',pnl,createdAt,endAt:createdAt+days*DAY,dailyStats,...(stoppedAt!=null?{stoppedAt}:{})})}
 seed('seed-real-strategy-2','Stable Crypto Income',{capital:1000,days:14,startDaysAgo:6,status:'paused',pnl:-8.5})
 seed('seed-real-strategy-1','Diversified Index Growth',{capital:2000,days:30,startDaysAgo:12,status:'running',pnl:36.2})
 seed('seed-real-strategy-3','FX Carry Conservative',{capital:800,days:30,startDaysAgo:40,status:'completed',pnl:12.4,stoppedDaysAgo:10})
 // Older completed runs so the list spans more than one page (10 rows per page); one per catalog template.
 seed('seed-real-strategy-4','Balanced Crypto Alpha',{capital:1500,days:21,startDaysAgo:44,status:'completed',pnl:-22.8,stoppedDaysAgo:23})
 seed('seed-real-strategy-5','FX Momentum Balanced',{capital:1200,days:30,startDaysAgo:48,status:'completed',pnl:18.6,stoppedDaysAgo:18})
 seed('seed-real-strategy-6','Nasdaq Tech Aggressive',{capital:3000,days:14,startDaysAgo:52,status:'completed',pnl:96.4,stoppedDaysAgo:38})
 seed('seed-real-strategy-7','High Leverage Crypto Hunter',{capital:2500,days:7,startDaysAgo:55,status:'completed',pnl:-140.5,stoppedDaysAgo:48})
 seed('seed-real-strategy-8','FX Scalper Aggressive',{capital:1000,days:14,startDaysAgo:60,status:'completed',pnl:31.2,stoppedDaysAgo:46})
 seed('seed-real-strategy-9','Blue Chip Index Defender',{capital:5000,days:45,startDaysAgo:70,status:'completed',pnl:64.0,stoppedDaysAgo:25})
 seed('seed-real-strategy-10','Stable Crypto Income',{capital:800,days:30,startDaysAgo:75,status:'completed',pnl:9.6,stoppedDaysAgo:45})
 seed('seed-real-strategy-11','Diversified Index Growth',{capital:2200,days:30,startDaysAgo:82,status:'completed',pnl:-15.3,stoppedDaysAgo:52})
 seed('seed-real-strategy-12','FX Carry Conservative',{capital:1000,days:60,startDaysAgo:90,status:'completed',pnl:21.7,stoppedDaysAgo:30})}
/** Completes strategies whose end date has passed and returns their capital + P&L (call on view; idempotent). */
export const refreshStrategies=()=>{completeExpiredStrategies(strategyAccounts.real,clock.now());completeExpiredStrategies(strategyAccounts.demo,clock.now())}
refreshStrategies()
