import {reactive} from 'vue'
import {balanceOf,ledger,modeKey} from './mock/ledger.js'

// C2C mock state (stands in for the server behind src/api/c2c.js): payment accounts are the user's (shared across
// account modes), orders are kept per mode, and a mode's `balances` read/write the shared ledger (a sell locks USDT).
// Mode is explicit so this module stays importable in Node tests. In memory only.
const shared=reactive({accounts:[]})
const orders=reactive({real:[],demo:[]})
const balanceViews={}
const balancesFor=mode=>balanceViews[modeKey(mode)]||=new Proxy({},{
 get:(_,asset)=>typeof asset==='string'?balanceOf(mode,asset):undefined,
 set:(_,asset,value)=>{ledger[modeKey(mode)][asset]=value;return true},
})
/** {accounts, orders, balances} for one account mode, in the shape the rules in utils/c2cState.js expect. */
export const c2cStateFor=mode=>({accounts:shared.accounts,orders:orders[modeKey(mode)],balances:balancesFor(mode)})
/** Every mode's orders (payment-account deletion must not orphan an open order in any mode). */
export const allC2COrders=()=>[...orders.real,...orders.demo]
