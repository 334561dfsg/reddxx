import {reactive} from 'vue'
import {createQuantFundCatalog,createFundAccount,autoRedeemFullFunds} from './utils/quantFund.js'
import {boundBalances} from './mock/ledger.js'
import {bootAt,clock,DAY,HOUR} from './mock/clock.js'

// Local mock state only: resets on reload and never contacts the reference site or a backend.
// Balances are a live view of the shared ledger's USDT, so subscribe/redeem/maturity move the same money
// the Assets page and other domains see.
export const quantFunds=reactive(createQuantFundCatalog())
export const quantFundAccount=reactive(Object.assign(createFundAccount(),{balances:boundBalances('USDT')}))
export const fundMode=mode=>mode==='common.demo.demo'?'demo':'real'
export const findQuantFund=id=>quantFunds.find(product=>product.id===id)||null
/** Auto-redeems orders past their lock period on products at 100% progress (call on view; idempotent). */
export const refreshQuantFunds=()=>autoRedeemFullFunds(quantFundAccount,findQuantFund,clock.now())

// Seeds are placed relative to page load so dates, accrual and maturity stay coherent on any day.
const round2=v=>Math.round(v*100)/100
const payouts=(principal,rate,start,days)=>Array.from({length:days},(_,i)=>({interestDate:start+i*DAY,amount:round2(principal*rate/100),creditedAt:start+i*DAY+2*HOUR})).reverse()
function seed(id,productId,mode,{principal,startDaysAgo,status,paidDays=0,settledDaysAgo}){
 const product=findQuantFund(productId);if(!product)return
 if(principal<product.minAmount||principal>product.maxAmount)throw new Error(`seed ${id} violates ${productId} limits`)
 const approved=['active','redeemed'].includes(status),start=bootAt-startDaysAgo*DAY,interestRecords=payouts(principal,product.averageDailyReturnPercent,start,paidDays)
 quantFundAccount.orders.push({id,productId,productName:product.name,asset:product.asset,principal,mode,status,
  dailyReturnPercentSnapshot:product.averageDailyReturnPercent,termDaysSnapshot:product.termDays,minHoldDaysSnapshot:null,earlyRedeemFeeRateSnapshot:product.earlyRedeemFeeRate,
  subscribedAt:start-HOUR,interestStartAt:approved?start:undefined,
  maturityDate:product.termDays&&approved?start+product.termDays*DAY:null,
  interestPaidTotal:round2(interestRecords.reduce((sum,r)=>sum+r.amount,0)),interestPaidThrough:paidDays?start+(paidDays-1)*DAY:undefined,interestRecords,
  ...(settledDaysAgo!=null?{settledAt:bootAt-settledDaysAgo*DAY,returned:round2(principal+interestRecords.reduce((sum,r)=>sum+r.amount,0)),redeemFee:0}:{})})
}
// 模擬 mirrors the reference demo account: one running flexible VIP 0 order (4,999, no payouts yet), paid from demo funds.
seed('QFO-seed-demo-1','qf-vip0','demo',{principal:4999,startDaysAgo:0,status:'active'})
quantFundAccount.balances.demo-=4999
// 真實 carries synthetic history (the reference real account is empty) so every status and paging is exercised.
seed('QFO-seed-real-3','qf-vip0','real',{principal:5000,startDaysAgo:0,status:'pending_review'})
seed('QFO-seed-real-2','qf-vip1','real',{principal:120000,startDaysAgo:3,status:'active',paidDays:3})
seed('QFO-seed-real-1','qf-vip0','real',{principal:8000,startDaysAgo:33,status:'active',paidDays:33})
seed('QFO-seed-real-4','qf-vip0','real',{principal:5000,startDaysAgo:25,status:'redeemed',paidDays:20,settledDaysAgo:5})
seed('QFO-seed-real-5','qf-vip1','real',{principal:100000,startDaysAgo:30,status:'redeemed',paidDays:7,settledDaysAgo:23})
seed('QFO-seed-real-6','qf-vip0','real',{principal:6500,startDaysAgo:34,status:'redeemed',paidDays:12,settledDaysAgo:22})
seed('QFO-seed-real-7','qf-vip1','real',{principal:150000,startDaysAgo:38,status:'redeemed',paidDays:7,settledDaysAgo:31})
seed('QFO-seed-real-8','qf-vip0','real',{principal:5000,startDaysAgo:41,status:'rejected'})
seed('QFO-seed-real-9','qf-vip0','real',{principal:12000,startDaysAgo:45,status:'redeemed',paidDays:9,settledDaysAgo:36})
seed('QFO-seed-real-11','qf-vip1','real',{principal:120000,startDaysAgo:56,status:'redeemed',paidDays:7,settledDaysAgo:49})
seed('QFO-seed-real-12','qf-vip0','real',{principal:4999,startDaysAgo:62,status:'redeemed',paidDays:15,settledDaysAgo:47})
// Older redeemed history so the positions list has enough rows to load on scroll (user request 2026-11-27).
seed('QFO-seed-real-13','qf-vip0','real',{principal:5000,startDaysAgo:66,status:'redeemed',paidDays:5,settledDaysAgo:61})
seed('QFO-seed-real-14','qf-vip0','real',{principal:8000,startDaysAgo:72,status:'redeemed',paidDays:8,settledDaysAgo:63})
seed('QFO-seed-real-15','qf-vip1','real',{principal:200000,startDaysAgo:78,status:'redeemed',paidDays:11,settledDaysAgo:67})
seed('QFO-seed-real-16','qf-vip0','real',{principal:20000,startDaysAgo:84,status:'redeemed',paidDays:14,settledDaysAgo:70})
seed('QFO-seed-real-17','qf-vip0','real',{principal:6500,startDaysAgo:90,status:'redeemed',paidDays:17,settledDaysAgo:72})
seed('QFO-seed-real-18','qf-vip1','real',{principal:150000,startDaysAgo:96,status:'redeemed',paidDays:20,settledDaysAgo:76})
seed('QFO-seed-real-19','qf-vip0','real',{principal:5000,startDaysAgo:102,status:'redeemed',paidDays:5,settledDaysAgo:97})
seed('QFO-seed-real-20','qf-vip0','real',{principal:8000,startDaysAgo:108,status:'redeemed',paidDays:8,settledDaysAgo:99})
seed('QFO-seed-real-21','qf-vip1','real',{principal:100000,startDaysAgo:114,status:'redeemed',paidDays:11,settledDaysAgo:103})
seed('QFO-seed-real-22','qf-vip0','real',{principal:20000,startDaysAgo:120,status:'redeemed',paidDays:14,settledDaysAgo:106})
seed('QFO-seed-real-23','qf-vip0','real',{principal:6500,startDaysAgo:126,status:'redeemed',paidDays:17,settledDaysAgo:108})
seed('QFO-seed-real-24','qf-vip1','real',{principal:120000,startDaysAgo:132,status:'redeemed',paidDays:20,settledDaysAgo:112})
seed('QFO-seed-real-25','qf-vip0','real',{principal:5000,startDaysAgo:138,status:'redeemed',paidDays:5,settledDaysAgo:133})
seed('QFO-seed-real-26','qf-vip0','real',{principal:8000,startDaysAgo:144,status:'redeemed',paidDays:8,settledDaysAgo:135})
refreshQuantFunds()
