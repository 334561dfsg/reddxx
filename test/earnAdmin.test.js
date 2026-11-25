import test from 'node:test'
import assert from 'node:assert/strict'
import { createEarnAdminState, getEarnHoldingRewards, submitEarnRedemption, reviewEarnRedemption, earnFundingProgress, quoteEarnRedemption, reviewEarnOrder, settleEarnRedemption, saveEarnProduct, setEarnProductStatus } from '../src/admin/domain/earn.js'
const now=Date.parse('2026-11-25T05:00:00Z')
test('pending subscriptions do not own a holding; approval alone starts the term',()=>{
 const state=createEarnAdminState(now),order=state.orders.find(r=>r.status==='pending_review')
 order.productId='usdt90';order.symbol='USDT';order.productName='USDT 90天定期理财';order.amount=3200
 assert.equal(state.holdings.some(h=>h.orderId===order.id),false)
 assert.equal(order.reviewer,null)
 const approvedAt=now+3*86400000
 reviewEarnOrder(state,order.id,'approve',approvedAt,'审核员甲')
 const holding=state.holdings.find(h=>h.orderId===order.id)
 assert.equal(order.reviewer,'审核员甲')
 assert.equal(state.logs[0].operator,'审核员甲')
 assert.equal(holding.startedAt,approvedAt)
 assert.equal(holding.maturityAt,approvedAt+90*86400000)
 assert.equal(holding.accrued,0)
 assert.equal(order.status,'completed')
 assert.equal(state.logs[0].reason,'审核通过')
 assert.equal(state.logs[0].target,order.id)
 assert.throws(()=>reviewEarnOrder(state,order.id,'approve',approvedAt),/已处理/)
 assert.equal(state.holdings.filter(h=>h.orderId===order.id).length,1)
 assert.equal(order.reviewer,'审核员甲')
 const product=state.products.find(p=>p.id===order.productId)
 product.rate=.9
 assert.notEqual(holding.terms.rate,product.rate)
})
test('rejection needs no reason, logs the decision and never starts a holding',()=>{
 const state=createEarnAdminState(now),order=state.orders.find(r=>r.status==='pending_review'),before=state.holdings.length
 reviewEarnOrder(state,order.id,'reject',now,'审核员乙')
 assert.equal(order.status,'rejected');assert.equal(state.holdings.length,before)
 assert.equal(order.reviewer,'审核员乙')
 assert.equal(state.logs[0].operator,'审核员乙')
 assert.equal(state.logs[0].action,'拒绝申购')
 assert.equal(state.logs[0].reason,'审核拒绝')
 assert.equal(state.logs[0].before,'pending_review')
 assert.equal(state.logs[0].after,'rejected')
 assert.throws(()=>reviewEarnOrder(state,order.id,'reject',now),/已处理/)
 assert.equal(state.rewards.some(row=>row.orderId===order.id),false)
})
test('approval enforces product availability and aggregate user capacity atomically',()=>{
 const state=createEarnAdminState(now),order=state.orders.find(r=>r.status==='pending_review'),product=state.products.find(p=>p.id===order.productId)
 product.status='disabled'
 assert.throws(()=>reviewEarnOrder(state,order.id,'approve',now),/不可申购/)
 product.status='enabled';product.perUser=10
 assert.throws(()=>reviewEarnOrder(state,order.id,'approve',now),/额度/)
 assert.equal(order.status,'pending_review');assert.equal(state.holdings.some(h=>h.orderId===order.id),false)
})
test('redemption settlement updates holding and payout once',()=>{
 const state=createEarnAdminState(now),record=state.redemptions.find(r=>r.status==='pending')
 assert.equal(record.reviewer,null)
 settleEarnRedemption(state,record.id,now,'结算员甲')
 assert.equal(record.reviewer,'结算员甲')
 assert.equal(state.logs[0].operator,'结算员甲')
 assert.equal(record.status,'completed')
 assert.equal(state.logs[0].reason,'赎回结算完成')
 assert.equal(state.holdings.find(h=>h.id===record.holdingId).principal,0)
 assert.equal(state.rewards.filter(r=>r.id===record.id+'-settlement').length,1)
 assert.throws(()=>settleEarnRedemption(state,record.id,now),/已处理/)
})
test('product changes validate capacity, prevent stale saves and preserve existing term identity',()=>{
 const state=createEarnAdminState(now),input=structuredClone(state.products[0])
 assert.throws(()=>saveEarnProduct(state,{...input,max:input.quota+1},now),/额度/)
 assert.throws(()=>saveEarnProduct(state,{...input,days:30},now),/期限不可变更/)
 const next=saveEarnProduct(state,{...input,dailyRateMin:.028,dailyRateMax:.035},now)
 assert.equal(next.version,input.version+1)
 assert.throws(()=>saveEarnProduct(state,input,now),/已更新/)
 setEarnProductStatus(state,next.id,next.version,now)
 assert.equal(next.status,'disabled')
 assert.equal(state.logs[0].reason,'产品下架')
 assert.throws(()=>setEarnProductStatus(state,next.id,input.version+1,now),/状态已变化/)
 setEarnProductStatus(state,next.id,next.version,now)
 assert.equal(next.status,'enabled')
 assert.equal(state.logs[0].reason,'产品上架')
 assert.equal(state.holdings.length,6)
})

test('daily rate range validates bounds and saves without a reason',()=>{
 const state=createEarnAdminState(now),input=structuredClone(state.products[0])
 for(const [dailyRateMin,dailyRateMax] of [[.03,.02],[-1,.03],[null,.03],[.02,NaN],[.02,101]]) {
  assert.throws(()=>saveEarnProduct(state,{...input,dailyRateMin,dailyRateMax},now),/日利率区间/)
 }
 const product=saveEarnProduct(state,{...input,dailyRateMin:.02,dailyRateMax:.04},now)
 assert.equal(product.dailyRateMin,.02);assert.equal(product.dailyRateMax,.04)
 assert.equal(product.apy,input.apy)
 assert.equal(state.logs[0].action,'编辑产品')
 assert.equal(state.logs[0].reason,'保存产品配置')
 const order=state.orders.find(row=>row.status==='pending_review')
 order.productId=product.id;order.symbol=product.symbol
 reviewEarnOrder(state,order.id,'approve',now)
 const holding=state.holdings.find(row=>row.orderId===order.id)
 assert.equal(holding.dailyRateMin,.02);assert.equal(holding.dailyRateMax,.04)
 assert.equal(holding.rate,null)
 assert.equal(holding.accrued,0)
})

test('early redemption fee uses frozen principal or principal plus unsettled yield',()=>{
 const record={amount:1000,reward:100,type:'fixedEarly'}
 const holding={terms:{earlyRule:'fee',earlyFeeBase:'principal',earlyFeeRate:2}}
 assert.deepEqual(quoteEarnRedemption(record,holding),{feeBase:'principal',feeRate:2,fee:20,receive:1080})
 holding.terms.earlyFeeBase='principal_and_yield'
 assert.equal(quoteEarnRedemption(record,holding).fee,22)
 assert.equal(quoteEarnRedemption(record,holding).receive,1078)
 holding.terms.earlyFeeRate=100
 assert.equal(quoteEarnRedemption(record,holding).receive,0)
 assert.equal(quoteEarnRedemption({...record,type:'fixedMatured'},holding).fee,0)
 for(const rate of [-1,101,null,NaN]){
  holding.terms.earlyFeeRate=rate
  assert.throws(()=>quoteEarnRedemption(record,holding),/手续费/)
 }
 assert.throws(()=>quoteEarnRedemption(record,{}),/手续费/)
})
test('early settlement deducts fees once and ignores later product configuration',()=>{
 const state=createEarnAdminState(now),product=state.products[0]
 product.earlyRule='fee';product.earlyFeeBase='principal_and_yield';product.earlyFeeRate=2
 const holding={id:'fee-holding',productId:product.id,principal:1000,accrued:100,status:'redeeming',terms:structuredClone(product)}
 const record={id:'fee-redemption',holdingId:holding.id,productId:product.id,symbol:product.symbol,userId:'user_1001',amount:1000,reward:100,type:'fixedEarly',status:'pending'}
 state.holdings.push(holding);state.redemptions.push(record)
 product.earlyFeeRate=50
 settleEarnRedemption(state,record.id,now)
 assert.equal(record.fee,22);assert.equal(record.receive,1078)
 assert.equal(holding.principal,0);assert.equal(holding.accrued,0)
 assert.throws(()=>settleEarnRedemption(state,record.id,now),/已处理/)
 assert.equal(state.rewards.filter(row=>row.id===record.id+'-settlement').length,1)
})

test('funding totals combine initial funds with approved subscriptions only',()=>{
 const state=createEarnAdminState(now),order=state.orders.find(row=>row.status==='pending_review')
 const product=state.products.find(row=>row.id===order.productId)
 product.initialSubscribed=1000
 const before=earnFundingProgress(product)
 assert.equal(before.total,1000+product.subscribed)
 reviewEarnOrder(state,order.id,'approve',now)
 const after=earnFundingProgress(product)
 assert.equal(after.total,before.total+order.amount)
 assert.equal(after.remaining,product.quota-after.total)
 assert.equal(after.percent,after.total/product.quota*100)
 const rejected={...order,id:'funding-reject',status:'pending_review'}
 state.orders.push(rejected)
 reviewEarnOrder(state,rejected.id,'reject',now)
 assert.deepEqual(earnFundingProgress(product),after)
 const saved=saveEarnProduct(state,{...product,initialSubscribed:2000,subscribed:999999999},now)
 assert.equal(saved.subscribed,product.subscribed)
 assert.equal(earnFundingProgress(saved).total,2000+product.subscribed)
})
test('initial funds consume capacity and validate before any state mutation',()=>{
 const state=createEarnAdminState(now),order=state.orders.find(row=>row.status==='pending_review')
 const product=state.products.find(row=>row.id===order.productId)
 for(const value of [-1,null,NaN,Infinity,product.quota+1]){
  assert.throws(()=>saveEarnProduct(state,{...product,initialSubscribed:value},now),/初始已募集/)
 }
 product.initialSubscribed=product.quota-product.subscribed-order.amount+1
 assert.throws(()=>reviewEarnOrder(state,order.id,'approve',now),/额度/)
 assert.equal(order.status,'pending_review')
 product.initialSubscribed-=1
 reviewEarnOrder(state,order.id,'approve',now)
 assert.equal(earnFundingProgress(product).remaining,0)
 assert.equal(earnFundingProgress(product).percent,100)
})

test('manual redemption waits for review; rejection restores holding without payout',()=>{
 const state=createEarnAdminState(now),holding=state.holdings.find(h=>h.status==='active'&&!h.terms.days)
 const principal=holding.principal, accrued=holding.accrued, rewardCount=state.rewards.length
 const record=submitEarnRedemption(state,holding.id,principal/2,'manual-redemption',now)
 assert.equal(record.status,'pending');assert.equal(record.reviewer,null)
 assert.equal(holding.principal,principal);assert.equal(holding.accrued,accrued)
 assert.equal(state.rewards.length,rewardCount)
 assert.throws(()=>submitEarnRedemption(state,holding.id,1,'duplicate-holding',now),/不可提交/)
 reviewEarnRedemption(state,record.id,'reject',now,'Reviewer')
 assert.equal(record.status,'rejected');assert.equal(holding.status,'active')
 assert.equal(holding.principal,principal);assert.equal(state.rewards.length,rewardCount)
 assert.throws(()=>reviewEarnRedemption(state,record.id,'approve',now),/已处理/)
 assert.equal(record.reviewer,'Reviewer')
})
test('automatic redemption records system reviewer and is idempotent',()=>{
 const state=createEarnAdminState(now),holding=state.holdings.find(h=>h.status==='active'&&!h.terms.days)
 state.products.find(p=>p.id===holding.productId).redemptionReviewRequired=false
 const amount=holding.principal/2
 const record=submitEarnRedemption(state,holding.id,amount,'auto-redemption',now)
 assert.equal(record.status,'completed');assert.equal(record.reviewer,'系统自动处理')
 assert.equal(holding.principal,amount)
 assert.equal(state.logs[0].operator,'系统自动处理')
 assert.equal(submitEarnRedemption(state,holding.id,amount,'auto-redemption',now),record)
 assert.equal(holding.principal,amount)
 assert.throws(()=>submitEarnRedemption(state,holding.id,amount/2,'auto-redemption',now),/编号/)
})
test('changing review setting never processes already pending applications',()=>{
 const state=createEarnAdminState(now),holding=state.holdings.find(h=>h.status==='active'&&!h.terms.days)
 const product=state.products.find(p=>p.id===holding.productId)
 const record=submitEarnRedemption(state,holding.id,holding.principal,'pending-stays',now)
 saveEarnProduct(state,{...product,redemptionReviewRequired:false},now)
 assert.equal(record.status,'pending');assert.equal(record.reviewRequired,true)
 reviewEarnRedemption(state,record.id,'approve',now,'Reviewer')
 assert.equal(record.status,'completed');assert.equal(record.reviewer,'Reviewer')
 assert.equal(holding.status,'redeemed')
})

test('holding rewards are isolated by holding ID, including settlement payouts',()=>{
 const state=createEarnAdminState(now),holding=state.holdings[0]
 state.rewards.push({id:'other-same-product',holdingId:'another-holding',productId:holding.productId,amount:123,rewardAt:now})
 assert.equal(getEarnHoldingRewards(state,holding.id).some(row=>row.id==='other-same-product'),false)
 assert.deepEqual(getEarnHoldingRewards(state,'missing'),[])
 const pending=state.redemptions.find(row=>row.status==='pending')
 settleEarnRedemption(state,pending.id,now)
 const rows=getEarnHoldingRewards(state,pending.holdingId)
 assert.equal(rows.some(row=>row.id===pending.id+'-settlement'),true)
 assert.equal(rows.some(row=>row.status==='accrued'),false)
})
