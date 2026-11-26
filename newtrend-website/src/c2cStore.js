import {reactive} from 'vue'
import {session} from './session'
import {balanceOf,ledger,modeKey} from './mock/ledger.js'

// C2C view used by the components: payment accounts are the user's (shared), orders are kept per account mode,
// and `balances` reads/writes the shared ledger for the current mode (a sell locks USDT there).
const shared=reactive({accounts:[]})
const orders=reactive({real:[],demo:[]})
const balances=new Proxy({},{
 get:(_,asset)=>typeof asset==='string'?balanceOf(session.mode,asset):undefined,
 set:(_,asset,value)=>{ledger[modeKey(session.mode)][asset]=value;return true},
})
export const c2cState={
 get accounts(){return shared.accounts},
 get orders(){return orders[modeKey(session.mode)]},
 balances,
}
