import {reactive} from 'vue'

// Funding records (deposit vouchers, withdrawals, transfers) — kept apart from trading orders and per account mode.
// In-memory mock state only: resets on reload, never written to browser storage.
export const walletRecords=reactive({real:[],demo:[]})
export const walletMode=mode=>mode==='common.demo.demo'?'demo':'real'

let sequence=0
/**
 * @param {'deposit'|'withdraw'|'transfer'} kind
 * @param {{label:string|{key:string,params?:object}, amount:number|string, symbol:string, status?:'pending'|'completed'}} entry
 */
export function addWalletRecord(mode,kind,{label,amount,symbol,status='completed'},now=Date.now()){
 const record={id:`WR-${now}-${++sequence}`,kind,label,amount:Number(amount),symbol,status,createdAt:now}
 walletRecords[walletMode(mode)].unshift(record)
 return record
}
