import {reactive} from 'vue'
import {balanceOf,ledger,modeKey} from './mock/ledger.js'

// C2C mock state (stands in for the server behind src/api/c2c.js): orders are kept per mode, and a mode's
// `balances` read/write the shared ledger (a sell locks its coin). No payment accounts (removed 2026-11-27).
// Mode is explicit so this module stays importable in Node tests. In memory only.
// 真實 starts with finished buy history (completed / cancelled / rejected) so 我的訂單 has enough rows to load
// on scroll (user request 2026-11-27); these never touch the ledger. Demo starts empty.
const DAY=86400000
const seedOrders=(now=Date.now())=>Array.from({length:24},(_,i)=>{
 const [symbol,price,quantity]=[['USDT',1,1500],['ETH',1650,0.8],['BTC',59000,0.03],['USDC',1.01,2000],['SOL',68,25]][i%5]
 const status=['completed','completed','cancelled','completed','rejected','completed','cancelled'][i%7],createdAt=now-(2+i*3)*DAY-i*3600000
 return {id:`c2c-seed-${i+1}`,requestId:`c2c-seed-${i+1}`,side:'buy',symbol,quantity,amount:Number((quantity*price).toFixed(8)),price,status,createdAt,updatedAt:createdAt+1800000,locked:0,agreementVersion:'v1-draft'}
})
const orders=reactive({real:seedOrders(),demo:[]})
const balanceViews={}
const balancesFor=mode=>balanceViews[modeKey(mode)]||=new Proxy({},{
 get:(_,asset)=>typeof asset==='string'?balanceOf(mode,asset):undefined,
 set:(_,asset,value)=>{ledger[modeKey(mode)][asset]=value;return true},
})
/** {orders, balances} for one account mode, in the shape the rules in utils/c2cState.js expect. */
export const c2cStateFor=mode=>({orders:orders[modeKey(mode)],balances:balancesFor(mode)})
