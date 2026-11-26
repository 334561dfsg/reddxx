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

test('positions dates use ISO calendar format and interest progress needs a projection',async()=>{
 const {fundDate,interestProgress}=await import('../src/utils/quantFund.js')
 const at=new Date(2026,10,26,9,5).getTime()
 assert.equal(fundDate(at),'2026-11-26')
 assert.equal(fundDate(at,true),'2026-11-26 09:05')
 assert.equal(fundDate(null),'--')
 assert.equal(interestProgress(0,0),null)
 assert.equal(interestProgress(25,100),25)
 assert.equal(interestProgress(150,100),100)
})

test('redeemFund settles a running flexible order once and credits its own mode', async () => {
  const {createFundAccount, redeemFund, accruedInterestEstimate, canRedeemFund} = await import('../src/utils/quantFund.js')
  const DAY = 86400000, start = Date.UTC(2026, 10, 1)
  const account = createFundAccount({real: 0, demo: 1000})
  const product = {subscribed: 10000}
  const order = {id: 'o1', mode: 'demo', status: 'active', principal: 1000, dailyReturnPercentSnapshot: 1, termDaysSnapshot: null, minHoldDaysSnapshot: 1, subscribedAt: start, interestPaidTotal: 2}
  assert.equal(canRedeemFund(order), true)
  assert.equal(accruedInterestEstimate(order, start + 3 * DAY), 28)
  const result = redeemFund(account, order, product, start + 3 * DAY)
  assert.equal(result.interest, 28) // 3 days × 10 minus 2 already paid
  assert.equal(order.status, 'redeemed')
  assert.equal(order.interestPaidTotal, 30)
  assert.equal(account.balances.demo, 2028)
  assert.equal(account.balances.real, 0)
  assert.equal(product.subscribed, 9000)
  assert.deepEqual(redeemFund(account, order, product, start + 4 * DAY), {error: 'conflict'})
  assert.equal(account.balances.demo, 2028)
})

test('redeemFund pays no interest below the minimum hold and rejects fixed-term or pending orders', async () => {
  const {createFundAccount, redeemFund} = await import('../src/utils/quantFund.js')
  const account = createFundAccount({real: 0, demo: 0}), now = Date.UTC(2026, 10, 26)
  const sameDay = {mode: 'demo', status: 'active', principal: 500, dailyReturnPercentSnapshot: 1, termDaysSnapshot: null, minHoldDaysSnapshot: 1, subscribedAt: now, interestPaidTotal: 0}
  assert.equal(redeemFund(account, sameDay, null, now + 3600000).interest, 0)
  assert.equal(account.balances.demo, 500)
  assert.deepEqual(redeemFund(account, {...sameDay, status: 'active', termDaysSnapshot: 30}, null, now), {error: 'conflict'})
  assert.deepEqual(redeemFund(account, {...sameDay, status: 'pending_review'}, null, now), {error: 'conflict'})
})
