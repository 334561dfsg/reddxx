import {balancesOf} from './mock/ledger.js'
import {priceOf,valueInUsdt} from './mock/prices.js'
import {tradeOrdersFor} from './tradingFunds.js'
import {earnPortfolioFor} from './earnPortfolio'
import {quantFundAccount,fundMode} from './quantFundPortfolio'

// USDT value per account for a mode, from the mock stores (one source for the Assets page and the header menu).
export function accountValues(mode){
 return {
  'assets.tabs.funding':valueInUsdt(balancesOf(mode)),
  'assets.tabs.trading':tradeOrdersFor(mode).filter(o=>o.bucket==='positions').reduce((s,o)=>s+(o.margin||0),0),
  'assets.distribution.earnAccount':earnPortfolioFor(mode).holdings.filter(h=>['active','redeeming','matured'].includes(h.status)).reduce((s,h)=>s+h.principal*priceOf(h.symbol),0),
  'assets.distribution.quantFundAccount':quantFundAccount.orders.filter(o=>o.mode===fundMode(mode)&&['active','pending_review'].includes(o.status)).reduce((s,o)=>s+o.principal,0),
 }
}
export const totalValue=mode=>Object.values(accountValues(mode)).reduce((s,v)=>s+v,0)
