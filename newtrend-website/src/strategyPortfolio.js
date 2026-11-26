import {reactive} from 'vue'
import {strategies} from './data'
import {createStrategyAccount,enrichStrategies,buildDailyStats} from './utils/strategyTemplates'
export const strategyCatalog=enrichStrategies(strategies)
// Real and demo accounts are kept apart, like the reference lists strategies per account mode.
export const strategyAccounts=reactive({real:createStrategyAccount(0),demo:createStrategyAccount()})
// Seed mirroring the reference demo account's My Strategies on 2026-11-26: one running conservative stock strategy
// (Lv.1, SPX500/US30 template) shown there as "Conservative Stock Blue", 500 capital, 14-day term, no P&L yet.
const SEEDED_AT=Date.parse('2026-11-26T10:00:00+08:00')
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
 seed('seed-real-strategy-3','FX Carry Conservative',{capital:800,days:30,startDaysAgo:40,status:'completed',pnl:12.4,stoppedDaysAgo:10})}
