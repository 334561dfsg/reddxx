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
