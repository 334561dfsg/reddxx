import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createQuantFundCatalog,fundSubscriptionError,maxFundSubscription,fundEstimate,createFundAccount,subscribeFund,filterFundOrders,fundSummary,availableQuota} from '../src/utils/quantFund.js'

const product=()=>({...createQuantFundCatalog()[0]})

test('validates amount in reference order: invalid, range, remaining quota, balance',()=>{
 const p=product()
 for(const value of ['','.','abc','-5','0'])assert.equal(fundSubscriptionError(p,value,100000).kind,'invalid')
 assert.equal(fundSubscriptionError(p,'4998',100000).kind,'range')
 assert.equal(fundSubscriptionError(p,'100000',100000).kind,'range')
 assert.equal(fundSubscriptionError({...p,subscribed:p.totalQuota-5000},'6000',100000).kind,'exceedsAvailable')
 assert.deepEqual(fundSubscriptionError(p,'6000',5000),{kind:'insufficientBalance',available:5000})
 assert.equal(fundSubscriptionError(p,'4999',100000),null)
})

test('max fill uses the smallest of balance, remaining quota and product maximum',()=>{
 const p=product()
 assert.equal(maxFundSubscription(p,1e9),p.maxAmount)
 assert.equal(maxFundSubscription(p,7000),7000)
 assert.equal(maxFundSubscription({...p,subscribed:p.totalQuota-3000},1e9),3000)
})

test('estimates round down to cents',()=>{
 assert.deepEqual(fundEstimate(product(),'10000',30),{daily:73,total:2190})
 assert.equal(fundEstimate(product(),'0',30),null)
})

test('subscription stays pending review, reserves balance and quota, and is idempotent',()=>{
 const account=createFundAccount(),p=product(),quota=availableQuota(p)
 const {order}=subscribeFund(account,p,'5000',{mode:'demo',requestId:'r1',now:1})
 assert.equal(order.status,'pending_review')
 assert.equal(order.maturityDate,null)
 assert.equal(order.interestPaidTotal,0)
 assert.equal(account.balances.demo,95000)
 assert.equal(availableQuota(p),quota-5000)
 const again=subscribeFund(account,p,'5000',{mode:'demo',requestId:'r1',now:2})
 assert.equal(again.order.id,order.id)
 assert.equal(account.orders.length,1)
 assert.equal(account.balances.demo,95000)
 assert.equal(subscribeFund(account,p,'5000',{mode:'real',requestId:'r2'}).error.kind,'insufficientBalance')
 assert.equal(account.orders.length,1)
})

test('position filters and summary keep pending orders out of active totals',()=>{
 const orders=[{status:'pending_review',principal:5000,dailyReturnPercentSnapshot:1,termDaysSnapshot:7,interestPaidTotal:0},{status:'active',principal:10000,dailyReturnPercentSnapshot:1,termDaysSnapshot:10,interestPaidTotal:50},{status:'settled',principal:2000,dailyReturnPercentSnapshot:1,termDaysSnapshot:5,interestPaidTotal:100}]
 assert.equal(filterFundOrders(orders,'pending').length,1)
 assert.equal(filterFundOrders(orders,'active').length,1)
 assert.equal(filterFundOrders(orders,'history','settled').length,1)
 assert.equal(filterFundOrders(orders,'all').length,3)
 assert.deepEqual(fundSummary(orders),{totalPrincipal:10000,totalProjectedInterest:1000,activeInterestPaidTotal:50,settledTotalReceived:2100,activeCount:1,pendingCount:1})
})
