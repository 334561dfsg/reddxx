import {reactive} from 'vue'
export const c2cState=reactive({accounts:[],orders:[],balances:{USDT:100000}})
export const accountFields=['accountName','accountNumber','bankName','branch','swiftCode','routingNumber','phone','bankAddress','accountAddress','remark']
export function saveAccount(state,draft){
 if(!['USDT'].includes(draft.currency)||['accountName','accountNumber','bankName'].some(key=>!draft[key]?.trim())||String(draft.remark||'').length>255)throw new Error('c2c.error.generic')
 const record={currency:draft.currency,...Object.fromEntries(accountFields.map(key=>[key,String(draft[key]||'').trim()]))}
 if(draft.id){const existing=state.accounts.find(a=>a.id===draft.id);if(!existing)throw new Error('c2c.error.OTC_USER_PAYMENT_ACCOUNT_NOT_FOUND');Object.assign(existing,record);return existing}
 const account={...record,id:crypto.randomUUID(),active:true};state.accounts.push(account);return account
}
export function removeAccount(state,id){
 if(state.orders.some(o=>o.accountId===id&&!['completed','rejected','cancelled','expired','stale'].includes(o.status)))throw new Error('c2c.error.OTC_USER_PAYMENT_ACCOUNT_IN_USE')
 const index=state.accounts.findIndex(a=>a.id===id);if(index>=0)state.accounts.splice(index,1)
}
export function createC2COrder(state,{side,quote,quantity,accountId,requestId}){
 if(state.orders.some(o=>o.requestId===requestId))throw new Error('c2c.error.OTC_ORDER_NOT_OPERABLE')
 if(!['buy','sell'].includes(side)||!Number.isFinite(quantity)||quantity<quote.min||quantity>quote.max)throw new Error('c2c.error.OTC_LIMIT_EXCEEDED_SINGLE')
 const account=state.accounts.find(a=>a.id===accountId&&a.active&&a.currency==='USDT')
 if(side==='sell'&&!account)throw new Error('c2c.error.OTC_PAYMENT_ACCOUNT_REQUIRED_FOR_SELL')
 if(side==='sell'&&quantity>(state.balances[quote.symbol]||0))throw new Error('c2c.error.OTC_INSUFFICIENT_FUNDING_BALANCE')
 const order={id:crypto.randomUUID(),requestId,side,symbol:quote.symbol,quantity,amount:Number((quantity*quote.price).toFixed(8)),price:quote.price,status:side==='buy'?'pending_match':'asset_locked',createdAt:Date.now(),accountId:side==='sell'?accountId:null,account:side==='sell'?{...account}:null,agreementVersion:'v1-draft',proofs:[]}
 if(side==='sell')state.balances[quote.symbol]-=quantity
 state.orders.unshift(order);return order
}
