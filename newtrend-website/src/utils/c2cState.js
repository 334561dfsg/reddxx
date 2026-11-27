import {clock} from '../mock/clock.js'
import {nextId} from '../mock/ids.js'
// Pure C2C rules over a state object ({orders, wallet}); the app's state lives in src/c2cStore.js. Money moves only
// through the wallet (mock/ledger.js walletOf / memoryWallet).
// Price and amount are in the quote's fiat (paid / received off-platform, user decision 2026-11-27).
// Lifecycle (user decision, 2026-11-27 — no payment accounts): every buy and sell is submitted for back-office review
// (pending_review). A sell locks its coin at submission. The back office completes (buy credits the coin, the sell's
// locked coin is deducted) or rejects (sell unlocks); the user may cancel while it is pending (sell unlocks).
export const OPEN_STATUSES=['pending_review']
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** Payer details are required on every order: ISO country code, remitter name (≤ 64) and a valid email. */
export function validPayer(payer){
 const country=String(payer?.country||'').trim(),name=String(payer?.name||'').trim(),email=String(payer?.email||'').trim()
 return country.trim().length>0&&country.trim().length<=64&&name.length>0&&name.length<=64&&EMAIL.test(email)?{country,name,email}:null
}
export function createC2COrder(state,{side,quote,quantity,requestId,payer}){
 // Idempotent (review 2026-11-27): a retried submission returns the order it already created.
 const seen=state.orders.find(o=>o.requestId===requestId)
 if(seen)return seen
 if(!['buy','sell'].includes(side)||!Number.isFinite(quantity)||quantity<quote.min||quantity>quote.max)throw new Error('c2c.error.OTC_LIMIT_EXCEEDED_SINGLE')
 const details=validPayer(payer)
 if(!details)throw new Error('c2c.error.payerInvalid')
 if(side==='sell'&&quantity>state.wallet.balance(quote.symbol))throw new Error('c2c.error.OTC_INSUFFICIENT_FUNDING_BALANCE')
 const now=clock.now()
 const order={id:nextId('C2C'),requestId,side,symbol:quote.symbol,fiat:quote.fiat,quoteId:quote.id,payer:details,quantity,amount:Number((quantity*quote.price).toFixed(2)),price:quote.price,status:'pending_review',createdAt:now,updatedAt:now,locked:side==='sell'?quantity:0,agreementVersion:'v1-draft'}
 if(side==='sell'&&!state.wallet.debit(quote.symbol,quantity))throw new Error('c2c.error.OTC_INSUFFICIENT_FUNDING_BALANCE')
 state.orders.unshift(order);return order
}
/** User cancel: only while pending review; a sell's locked coin goes back once. */
export function cancelC2COrder(state,id){
 const order=state.orders.find(o=>o.id===id)
 if(!order)throw new Error('notFound')
 if(order.status!=='pending_review')throw new Error('c2c.error.OTC_ORDER_NOT_OPERABLE')
 if(order.side==='sell'&&order.locked)state.wallet.credit(order.symbol,order.locked)
 Object.assign(order,{status:'cancelled',locked:0,updatedAt:clock.now()})
 return order
}
