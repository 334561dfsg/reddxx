import {reactive} from 'vue'
import {modeKey} from '../utils/accountMode.js'
import {bootAt,clock,DAY,HOUR} from '../mock/clock.js'

// Funding records (deposit vouchers, withdrawals, transfers, flash exchanges) — kept apart from trading orders and per
// account mode. In-memory mock state only: resets on reload, never written to browser storage.

// Seed history (channel conventions: 20+ records per history list so phones exercise load-on-scroll). Dates are
// relative to page load. Withdrawals are seeded completed only: a pending one counts toward the account total
// (server/accountValue.js) and would need a matching debit.
const FUNDING='assets.tabs.funding',TRADING='assets.tabs.trading'
const DEPOSITS=[['USDT',5000],['BTC',0.05],['USDT',12000],['ETH',1.2],['USDC',3000],['SOL',40]]
function seedRecords(mode){
 return Array.from({length:24},(_,i)=>{
  const createdAt=bootAt-Math.round(i*2.6*DAY+(i%5)*3*HOUR+HOUR),id=`WR-SEED-${mode}-${String(i+1).padStart(2,'0')}`
  switch(i%4){
   case 0:{const [symbol,amount]=DEPOSITS[(i/4)%DEPOSITS.length];return {id,kind:'deposit',label:'content.ui.demoDepositRequest',amount,symbol,status:i===0?'pending':'completed',createdAt}}
   case 1:{const toTrading=i%8===1;return {id,kind:'transfer',label:{key:'assets.transferRecord',params:{from:toTrading?FUNDING:TRADING,to:toTrading?TRADING:FUNDING}},amount:toTrading?2000:500,symbol:'USDT',status:'completed',createdAt}}
   case 2:return {id,kind:'withdraw',label:'content.ui.demoWithdrawalRequest',amount:[800,1500,300][i%3],symbol:'USDT',status:'completed',createdAt}
   default:return {id,kind:'exchange',label:{key:'assets.convert.recordLabel',params:{from:'USDT',to:'BTC',receive:'0.0102'}},amount:1000,symbol:'USDT',status:'completed',createdAt}
  }
 })
}
export const walletRecords=reactive({real:seedRecords('real'),demo:seedRecords('demo')})
/** Same as modeKey (kept for existing imports). */
export const walletMode=modeKey

let sequence=0
/**
 * @param {'deposit'|'withdraw'|'transfer'|'exchange'} kind
 * @param {{label:string|{key:string,params?:object}, amount:number|string, symbol:string, status?:'pending'|'completed'}} entry
 */
export function addWalletRecord(mode,kind,{label,amount,symbol,status='completed'},now=clock.now()){
 const record={id:`WR-${now}-${++sequence}`,kind,label,amount:Number(amount),symbol,status,createdAt:now}
 walletRecords[walletMode(mode)].unshift(record)
 return record
}
