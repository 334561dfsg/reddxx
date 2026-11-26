import {reactive} from 'vue'
import {createQuantFundCatalog,createFundAccount} from './utils/quantFund'

// Local mock state only: resets on reload and never contacts the reference site or a backend.
export const quantFunds=reactive(createQuantFundCatalog())
export const quantFundAccount=reactive(createFundAccount())
// Seed mirroring the reference demo account's positions on 2026-11-26: one running flexible VIP 0 order,
// 4,999 principal at the 0.73% snapshot rate, no interest paid yet (its payout records are empty).
{const product=quantFunds.find(fund=>fund.id==='qf-vip0');if(product){const principal=4999
 quantFundAccount.orders.push({id:'QFO-seed-demo-1',productId:product.id,productName:product.name,asset:product.asset,principal,mode:'demo',status:'active',dailyReturnPercentSnapshot:product.averageDailyReturnPercent,termDaysSnapshot:product.termDays,minHoldDaysSnapshot:product.minHoldDays,subscribedAt:Date.parse('2026-11-26T10:00:00+08:00'),maturityDate:null,interestPaidTotal:0})
 quantFundAccount.balances.demo-=principal}}
export const fundMode=mode=>mode==='common.demo.demo'?'demo':'real'
export const findQuantFund=id=>quantFunds.find(product=>product.id===id)||null
// Synthetic 真實-mode orders (the reference real account is empty), covering active flexible/fixed, pending review,
// redeemed and matured orders. Daily payout rows feed the 派息明細 page; totals are derived from those rows.
{const NOW=Date.parse('2026-11-26T10:00:00+08:00'),DAY=86400000,round2=v=>Math.round(v*100)/100
 const payouts=(principal,rate,start,days)=>Array.from({length:days},(_,i)=>({interestDate:start+i*DAY,amount:round2(principal*rate/100),creditedAt:start+(i+1)*DAY+3600000})).reverse()
 const seed=(id,productId,{principal,startDaysAgo,status,paidDays=0,settledDaysAgo})=>{const product=findQuantFund(productId);if(!product)return
  const approved=['active','settled','redeemed'].includes(status),start=NOW-startDaysAgo*DAY,interestRecords=payouts(principal,product.averageDailyReturnPercent,start,paidDays)
  const paid=round2(interestRecords.reduce((sum,r)=>sum+r.amount,0))
  quantFundAccount.orders.push({id,productId,productName:product.name,asset:product.asset,principal,mode:'real',status,
   dailyReturnPercentSnapshot:product.averageDailyReturnPercent,termDaysSnapshot:product.termDays,minHoldDaysSnapshot:product.minHoldDays,
   subscribedAt:start-3600000,interestStartAt:approved?start:undefined,
   maturityDate:product.termDays&&approved?start+product.termDays*DAY:null,
   interestPaidTotal:paid,interestPaidThrough:paidDays?start+(paidDays-1)*DAY:undefined,interestRecords,
   ...(settledDaysAgo!=null?{settledAt:NOW-settledDaysAgo*DAY}:{})})}
 seed('QFO-seed-real-3','qf-vip0',{principal:5000,startDaysAgo:0,status:'pending_review'})
 seed('QFO-seed-real-2','qf-vip1',{principal:120000,startDaysAgo:3,status:'active',paidDays:3})
 seed('QFO-seed-real-1','qf-vip0',{principal:8000,startDaysAgo:10,status:'active',paidDays:10})
 seed('QFO-seed-real-4','qf-vip0',{principal:3000,startDaysAgo:25,status:'redeemed',paidDays:20,settledDaysAgo:5})
 seed('QFO-seed-real-5','qf-vip1',{principal:100000,startDaysAgo:30,status:'settled',paidDays:7,settledDaysAgo:23})
 // Older history so the positions list spans more than one page (10 rows per page).
 seed('QFO-seed-real-6','qf-vip0',{principal:6500,startDaysAgo:34,status:'redeemed',paidDays:12,settledDaysAgo:22})
 seed('QFO-seed-real-7','qf-vip1',{principal:150000,startDaysAgo:38,status:'settled',paidDays:7,settledDaysAgo:31})
 seed('QFO-seed-real-8','qf-vip0',{principal:5000,startDaysAgo:41,status:'rejected'})
 seed('QFO-seed-real-9','qf-vip0',{principal:12000,startDaysAgo:45,status:'redeemed',paidDays:9,settledDaysAgo:36})
 seed('QFO-seed-real-10','qf-vip1',{principal:200000,startDaysAgo:50,status:'cancelled'})
 seed('QFO-seed-real-11','qf-vip1',{principal:120000,startDaysAgo:56,status:'settled',paidDays:7,settledDaysAgo:49})
 seed('QFO-seed-real-12','qf-vip0',{principal:4999,startDaysAgo:62,status:'redeemed',paidDays:15,settledDaysAgo:47})}
