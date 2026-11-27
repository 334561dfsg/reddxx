import {balancesOf} from './mock/ledger.js'
import {priceOf,valueInUsdt} from './mock/prices.js'
import {tradeOrdersFor} from './tradingFunds.js'
import {earnPortfolioFor} from './earnPortfolio.js'
import {quantFundAccount,fundMode} from './quantFundPortfolio.js'
import {c2cStateFor} from './c2cStore.js'
import {walletRecords,walletMode} from './walletRecords.js'

// USDT value per account for a mode, from the mock stores (one source for the Assets page and the header menu).
// Money that has left the available balance but still belongs to the user counts toward its account (review
// 2026-11-27): funds waiting for review or redemption, margin and order locks, C2C sell locks and pending withdrawals.
const EARN_HELD=['active','redeeming','matured']
const FUND_HELD=['pending_review','active','redeem_pending_review']
const value=(asset,amount)=>(Number(amount)||0)*priceOf(asset)

/** Funding account: available balances plus coins locked by pending C2C sells and pending withdrawals. */
function fundingValue(mode){
 const c2cLocked=c2cStateFor(mode).orders.filter(o=>o.side==='sell'&&o.status==='pending_review').reduce((s,o)=>s+value(o.symbol,o.locked),0)
 const withdrawing=walletRecords[walletMode(mode)].filter(r=>r.kind==='withdraw'&&r.status==='pending').reduce((s,r)=>s+value(r.symbol,Math.abs(r.amount)),0)
 return valueInUsdt(balancesOf(mode))+c2cLocked+withdrawing
}
/** Trading account: open-position margin plus the funds still locked by open orders and running delivery orders. */
function tradingValue(mode){
 return tradeOrdersFor(mode).reduce((s,o)=>{
  if(o.bucket==='positions')return s+(o.margin||0)
  const open=['openOrders','spotOpenOrders'].includes(o.bucket)||(o.bucket==='optionsOrders'&&!o.settled)
  if(!open||!o.reserved)return s
  // A partly filled order still locks only its unfilled share (same rule as releaseTradeFunds).
  const unfilled=o.quantity?1-Math.min(1,(o.filledQuantity||0)/o.quantity):1
  return s+value(o.reserved.asset,o.reserved.amount*(o.bucket==='optionsOrders'?1:unfilled))
 },0)
}
export function accountValues(mode){
 return {
  'assets.tabs.funding':fundingValue(mode),
  'assets.tabs.trading':tradingValue(mode),
  // Holdings plus subscriptions waiting for review (their amount is already debited).
  'assets.distribution.earnAccount':earnPortfolioFor(mode).holdings.filter(h=>EARN_HELD.includes(h.status)).reduce((s,h)=>s+value(h.symbol,h.principal),0)
   +earnPortfolioFor(mode).orders.filter(o=>o.status==='pending_review').reduce((s,o)=>s+value(o.symbol,o.amount),0),
  'assets.distribution.quantFundAccount':quantFundAccount.orders.filter(o=>o.mode===fundMode(mode)&&FUND_HELD.includes(o.status)).reduce((s,o)=>s+o.principal,0),
 }
}
export const totalValue=mode=>Object.values(accountValues(mode)).reduce((s,v)=>s+v,0)
