// Pure C2C rules over a state object ({orders, balances}); the app's state lives in src/c2cStore.js.
// Lifecycle (user decision, 2026-11-27 — no payment accounts): every buy and sell is submitted for back-office review
// (pending_review). A sell locks its coin at submission. The back office completes (buy credits the coin, the sell's
// locked coin is deducted) or rejects (sell unlocks); the user may cancel while it is pending (sell unlocks).
export const OPEN_STATUSES=['pending_review']
export function createC2COrder(state,{side,quote,quantity,requestId}){
 if(state.orders.some(o=>o.requestId===requestId))throw new Error('c2c.error.OTC_ORDER_NOT_OPERABLE')
 if(!['buy','sell'].includes(side)||!Number.isFinite(quantity)||quantity<quote.min||quantity>quote.max)throw new Error('c2c.error.OTC_LIMIT_EXCEEDED_SINGLE')
 if(side==='sell'&&quantity>(state.balances[quote.symbol]||0))throw new Error('c2c.error.OTC_INSUFFICIENT_FUNDING_BALANCE')
 const now=Date.now()
 const order={id:crypto.randomUUID(),requestId,side,symbol:quote.symbol,quantity,amount:Number((quantity*quote.price).toFixed(8)),price:quote.price,status:'pending_review',createdAt:now,updatedAt:now,locked:side==='sell'?quantity:0,agreementVersion:'v1-draft'}
 if(side==='sell')state.balances[quote.symbol]-=quantity
 state.orders.unshift(order);return order
}
/** User cancel: only while pending review; a sell's locked coin goes back once. */
export function cancelC2COrder(state,id){
 const order=state.orders.find(o=>o.id===id)
 if(!order)throw new Error('notFound')
 if(order.status!=='pending_review')throw new Error('c2c.error.OTC_ORDER_NOT_OPERABLE')
 if(order.side==='sell'&&order.locked)state.balances[order.symbol]=(state.balances[order.symbol]||0)+order.locked
 Object.assign(order,{status:'cancelled',locked:0,updatedAt:Date.now()})
 return order
}
