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
 const orders=[{status:'pending_review',principal:5000,dailyReturnPercentSnapshot:1,termDaysSnapshot:7,interestPaidTotal:0},{status:'active',principal:10000,dailyReturnPercentSnapshot:1,termDaysSnapshot:10,interestPaidTotal:50},{status:'redeemed',principal:2000,dailyReturnPercentSnapshot:1,termDaysSnapshot:5,interestPaidTotal:100,returned:2085}]
 assert.equal(filterFundOrders(orders,'pending').length,1)
 assert.equal(filterFundOrders(orders,'active').length,1)
 assert.equal(filterFundOrders(orders,'history','redeemed').length,1)
 assert.equal(filterFundOrders(orders,'all').length,3)
 assert.deepEqual(fundSummary(orders),{totalPrincipal:10000,totalProjectedInterest:1000,activeInterestPaidTotal:50,settledTotalReceived:2085,activeCount:1,pendingCount:1})
})

test('positions dates use ISO calendar format and interest progress needs a projection',async()=>{
 const {fundDate,interestProgress}=await import('../src/utils/quantFund.js')
 const at=new Date(2026,10,26,9,5).getTime()
 assert.equal(fundDate(at),'2026-11-26')
 assert.equal(fundDate(at,true),'2026-11-26 09:05')
 assert.equal(fundDate(null),'—')
 assert.equal(interestProgress(0,0),null)
 assert.equal(interestProgress(25,100),25)
 assert.equal(interestProgress(150,100),100)
})

test('any running order can ask for redemption; inside the lock the fee is a fixed share of principal', async () => {
  const {requestRedeemFund, earlyRedeemFee, fundInLock, canRedeemFund} = await import('../src/utils/quantFund.js')
  const DAY = 86400000, start = Date.UTC(2026, 10, 1)
  const locked = {status: 'active', principal: 150000, dailyReturnPercentSnapshot: 1.25, earlyRedeemFeeRateSnapshot: 0.73, subscribedAt: start, interestStartAt: start, maturityDate: start + 7 * DAY, interestPaidTotal: 0}
  assert.equal(canRedeemFund(locked), true, 'fixed-lock orders are redeemable too')
  assert.equal(fundInLock(locked, start + DAY), true)
  assert.equal(earlyRedeemFee(locked, start + DAY), 1095)
  assert.equal(earlyRedeemFee(locked, start + 6 * DAY), 1095, 'whatever the days left')
  assert.equal(earlyRedeemFee(locked, start + 8 * DAY), 0, 'no fee after the lock')
  const result = requestRedeemFund(locked, start + 2 * DAY)
  assert.equal(result.order.status, 'redeem_pending_review')
  assert.equal(locked.redeemFee, 1095)
  assert.equal(locked.redeemEarly, true)
  assert.deepEqual(requestRedeemFund(locked, start + 2 * DAY), {error: 'conflict'})
})

test('closing pays accrued interest with principal minus the fee; full products auto-redeem unlocked orders', async () => {
  const {createFundAccount, closeFundOrder, autoRedeemFullFunds} = await import('../src/utils/quantFund.js')
  const DAY = 86400000, start = Date.UTC(2026, 10, 1)
  const account = createFundAccount({real: 0, demo: 0})
  const product = {id: 'p', subscribed: 100000, totalQuota: 100000}
  const order = {id: 'o1', productId: 'p', mode: 'demo', status: 'redeem_pending_review', principal: 1000, dailyReturnPercentSnapshot: 1, subscribedAt: start, interestStartAt: start, interestPaidTotal: 2}
  const closed = closeFundOrder(account, order, product, start + 3 * DAY, {fee: 5})
  assert.equal(order.interestPaidTotal, 30, '3 days × 10 accrued in the order')
  assert.equal(closed.returned, 1025)
  assert.equal(account.balances.demo, 1025)
  assert.equal(product.subscribed, 99000)
  assert.deepEqual(closeFundOrder(account, order, product, start + 4 * DAY), {error: 'conflict'})

  const full = {id: 'f', subscribed: 50000, totalQuota: 50000}
  const unlocked = {id: 'u', productId: 'f', mode: 'demo', status: 'active', principal: 1000, dailyReturnPercentSnapshot: 1, interestStartAt: start, maturityDate: start + 7 * DAY, interestPaidTotal: 0}
  const stillLocked = {...unlocked, id: 'l', maturityDate: start + 30 * DAY}
  account.orders.push(unlocked, stillLocked)
  autoRedeemFullFunds(account, id => (id === 'f' ? full : null), start + 10 * DAY)
  assert.equal(unlocked.status, 'redeemed')
  assert.equal(unlocked.autoRedeemed, true)
  assert.equal(unlocked.redeemFee, 0)
  assert.equal(stillLocked.status, 'active', 'locked orders keep running')
})
