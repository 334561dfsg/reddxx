import {reactive} from 'vue'
import {strategies} from './data'
import {createStrategyAccount,enrichStrategies} from './utils/strategyTemplates'
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
