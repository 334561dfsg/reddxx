import {reactive} from 'vue'
import {modeKey,walletOf} from '../mock/ledger.js'
import {clock} from '../mock/clock.js'

// C2C mock state (stands in for the server behind src/api/c2c.js): orders are kept per mode, and a mode's
// `wallet` moves money through the shared ledger (a sell locks its coin). No payment accounts (removed 2026-11-27).
// Mode is explicit so this module stays importable in Node tests. In memory only.
// 真實 starts with finished buy history (completed / cancelled / rejected) so 我的訂單 has enough rows to load
// on scroll (user request 2026-11-27); these never touch the ledger. Demo starts empty.
const DAY=86400000
const PAYERS=[['Hong Kong','Chan Tai Man','chan.taiman@example.com'],['Singapore','Tan Wei Ming','weiming.tan@example.com'],['United Kingdom','Oliver Smith','oliver.smith@example.com'],['Germany','Lena Fischer','lena.fischer@example.com'],['United States','Emily Johnson','emily.johnson@example.com'],['Japan','Sato Yuki','yuki.sato@example.com']]
const seedOrders=(now=clock.now())=>Array.from({length:24},(_,i)=>{
 const [symbol,fiat,price,quantity]=[['USDT','USD',1.0012,1500],['ETH','USD',1656.63,0.8],['BTC','USD',59125.34,0.03],['USDT','EUR',0.9235,2000],['SOL','USD',68.18,25],['USDC','USD',1.0008,2000]][i%6]
 const status=['completed','completed','cancelled','completed','rejected','completed','cancelled'][i%7],createdAt=now-(2+i*3)*DAY-i*3600000
 return {id:`c2c-seed-${i+1}`,requestId:`c2c-seed-${i+1}`,side:'buy',symbol,fiat,quoteId:`${symbol}-${fiat}`,payer:(([country,name,email])=>({country,name,email}))(PAYERS[i%PAYERS.length]),quantity,amount:Number((quantity*price).toFixed(2)),price,status,createdAt,updatedAt:createdAt+1800000,locked:0,agreementVersion:'v1-draft'}
})
const orders=reactive({real:seedOrders(),demo:[]})
/** {orders, wallet} for one account mode, in the shape the rules in utils/c2cState.js expect. */
export const c2cStateFor=mode=>({orders:orders[modeKey(mode)],wallet:walletOf(mode)})
