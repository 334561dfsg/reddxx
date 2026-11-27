import test from 'node:test'
import assert from 'node:assert/strict'
import {seedLending} from '../src/shared/lending/seed.js'
import {transact,accrue} from '../src/shared/lending/domain.js'
import {createLendingService} from '../src/shared/lending/service.js'
const now=1700000000000,day=86400000
const apply=(s=seedLending(),extra={})=>transact(s,'apply',{requestId:'apply',userId:'USR-DEMO',productId:'LND-001',amount:1000,days:7,collateralCurrency:'BTC',...extra},now)
const approve=s=>transact(s,'approve',{requestId:'approve',orderId:s.orders[0].orderId,actor:'管理员（模拟）'},now+day)
test('pending reserves collateral without disbursement, debt or dates',()=>{
 const s=apply();const o=s.orders[0]
 assert.equal(o.totalDebt,0);assert.equal(o.interestStartAt,null);assert.equal(o.maturityAt,null)
 assert.equal(s.balances['USR-DEMO'].USDT,100000);assert.equal(s.balances['USR-DEMO'].BTC,9.97)
 accrue(s,now+100*day);assert.equal(o.interestAccrued,0)
})
test('approval disburses once, sets full term and retains application terms',()=>{
 let s=apply();s.products[0].loanTerms[0].dailyRate=40;s=approve(s)
 assert.equal(s.orders[0].interestRate,7.3);assert.equal(s.orders[0].maturityAt,now+8*day)
 assert.equal(s.balances['USR-DEMO'].USDT,101000)
 assert.throws(()=>transact(s,'approve',{requestId:'again',orderId:s.orders[0].orderId}),/status/)
 assert.throws(()=>transact(s,'approve',{requestId:'approve',orderId:s.orders[0].orderId}),/duplicate/)
})
test('rejection retains record and releases reservations',()=>{
 let s=apply();s=transact(s,'reject',{orderId:s.orders[0].orderId,requestId:'reject'},now)
 assert.equal(s.orders[0].status,'rejected');assert.equal(s.balances['USR-DEMO'].BTC,10)
})
test('failed application and repayment never mutate source',()=>{
 const s=seedLending(),before=structuredClone(s)
 assert.throws(()=>apply(s,{amount:1000000,collateralCurrency:'USDT'}),/balance/);assert.deepEqual(s,before)
 const active=approve(apply());active.balances['USR-DEMO'].USDT=0
 const snapshot=structuredClone(active)
 assert.throws(()=>transact(active,'repay',{requestId:'repay',orderId:active.orders[0].orderId,userId:'USR-DEMO',amount:1000},now+day),/balance/)
 assert.deepEqual(active,snapshot)
})
test('partial and full repayment reconcile balances, principal and collateral',()=>{
 let s=approve(apply()),id=s.orders[0].orderId
 s=transact(s,'repay',{requestId:'partial',orderId:id,userId:'USR-DEMO',amount:400},now+day)
 assert.equal(s.orders[0].principal,600);assert.equal(s.orders[0].collateralStatus,'locked')
 s=transact(s,'repay',{requestId:'full',orderId:id,userId:'USR-DEMO',amount:600},now+day)
 assert.equal(s.orders[0].status,'completed');assert.equal(s.balances['USR-DEMO'].BTC,10)
 assert.equal(s.balances['USR-DEMO'].USDT,100000)
 assert.equal(s.repayments.length,2)
})
test('daily accrual is deterministic across refresh frequencies and repayment prioritizes penalties',()=>{
 let s=approve(apply()),batch=structuredClone(s)
 for(let i=2;i<=12;i++)accrue(s,now+i*day)
 accrue(batch,now+12*day)
 assert.deepEqual(s,batch);assert.equal(s.orders[0].status,'overdue')
 const penalty=s.orders[0].overduePenaltyAccrued
 s=transact(s,'repay',{requestId:'penalty',orderId:s.orders[0].orderId,userId:'USR-DEMO',amount:penalty},now+12*day)
 assert.equal(s.orders[0].principal,1000);assert.equal(s.orders[0].overduePenaltyAccrued,0)
})
test('liquidation enforces threshold and returns surplus or records shortfall',()=>{
 const s=approve(apply()),id=s.orders[0].orderId
 assert.throws(()=>transact(s,'liquidate',{requestId:'liq',orderId:id},now+day),/threshold/)
 s.prices.BTC=34000
 const settled=transact(s,'liquidate',{requestId:'liq',orderId:id},now+day)
 assert.equal(settled.orders[0].status,'liquidated');assert.equal(settled.orders[0].shortfall,0)
 assert.ok(settled.balances['USR-DEMO'].BTC>9.97)
 s.prices.BTC=20000
 const loss=transact(s,'liquidate',{requestId:'liq',orderId:id},now+day)
 assert.equal(loss.orders[0].shortfall,400)
})
test('approval rechecks product; owner cannot repay another account',()=>{
 const s=apply();s.products[0].status='inactive'
 assert.throws(()=>approve(s),/product/)
 const active=approve(apply())
 assert.throws(()=>transact(active,'repay',{requestId:'bad',orderId:active.orders[0].orderId,userId:'OTHER',amount:1},now+day),/owner/)
})
test('Mock service isolates instances, rejects invalid config and returns copies',()=>{
 const a=createLendingService(),b=createLendingService(),p=a.read().products[0]
 a.command('saveProduct',{product:{...p,productName:'Changed'}})
 assert.notEqual(b.read().products[0].productName,'Changed')
 assert.throws(()=>a.command('saveProduct',{product:{...p,loanTerms:[]}}),/terms/)
 const snapshot=a.read(),count=snapshot.orders.length;snapshot.orders.push({});assert.equal(a.read().orders.length,count)
})
test('config save detects a stale product draft after another edit',()=>{
 const service=createLendingService(),p=service.read().products[0]
 service.command('apply',{requestId:'a',userId:'USR-DEMO',productId:p.productId,amount:1000,days:7,collateralCurrency:'BTC'})
 service.command('saveProduct',{product:{...p,productName:'Updated'}})
 assert.throws(()=>service.command('saveProduct',{product:p,expectedProduct:p}),/stale/)
})
test('list status action is guarded and logged; editors cannot publish products',()=>{
 const service=createLendingService(),p=service.read().products[0]
 service.command('setProductStatus',{productId:p.productId,expectedStatus:'active',requestId:'off'})
 let s=service.read();assert.equal(s.products[0].status,'inactive');assert.equal(s.logs[0].action,'unpublishProduct')
 assert.throws(()=>service.command('setProductStatus',{productId:p.productId,expectedStatus:'active',requestId:'stale'}),/stale/)
 assert.throws(()=>service.command('setProductStatus',{productId:p.productId,expectedStatus:'inactive',requestId:'off'}),/duplicate/)
 service.command('saveProduct',{product:{...s.products[0],status:'active'}})
 assert.equal(service.read().products[0].status,'inactive')
 service.command('setProductStatus',{productId:p.productId,expectedStatus:'inactive',requestId:'on'})
 s=service.read();assert.equal(s.products[0].status,'active')
 assert.equal(s.logs.find(l=>l.action==='unpublishProduct').after.status,'inactive')
 service.command('saveProduct',{product:{...p,productId:undefined,status:'active'}})
 assert.equal(service.read().products.at(-1).status,'inactive')
})
test('explicit loan terms reject unconfigured days and preserve pending order term after edits',()=>{
 const s=seedLending();s.products[0].loanTerms=[7,14,30].map(days=>({days,dailyRate:0.1}))
 assert.throws(()=>apply(s,{days:8}),/term/)
 let pending=apply(s,{days:14});pending.products[0].loanTerms=[7,30].map(days=>({days,dailyRate:0.1}))
 const approved=approve(pending)
 assert.equal(approved.orders[0].loanDuration,14)
 assert.equal(approved.orders[0].maturityAt,now+15*day)
})
test('product saves normalize configured terms and reject malformed lists atomically',()=>{
 const service=createLendingService(),p=service.read().products[0]
 service.command('saveProduct',{product:{...p,loanTerms:[30,7,14,7].map(days=>({days,dailyRate:0.1}))}})
 assert.deepEqual(service.read().products[0].loanTerms,[7,14,30].map(days=>({days,dailyRate:0.1})))
 assert.equal('minLoanDuration' in service.read().products[0],false)
 for(const loanTerms of [[],[0],[-7],[1.5],['7'],null]){
  const before=service.read()
  assert.throws(()=>service.command('saveProduct',{product:{...p,loanTerms}}),/terms/)
  assert.deepEqual(service.read(),before)
 }
})

test('term rates are independently quoted, frozen and accrued; stale quotes reject atomically',()=>{
 const s=seedLending();s.products[0].loanTerms=[{days:7,dailyRate:0.1},{days:14,dailyRate:0.09}]
 const before=structuredClone(s)
 assert.throws(()=>apply(s,{days:14,expectedDailyRate:0.1}),/rateChanged/);assert.deepEqual(s,before)
 let p=apply(s,{days:14,expectedDailyRate:0.09,interestRate:999})
 assert.equal(p.orders[0].dailyRate,0.09);assert.equal(p.orders[0].interestRate,32.85)
 p.products[0].loanTerms[1].dailyRate=5;p=approve(p);accrue(p,now+2*day)
 assert.equal(p.orders[0].interestAccrued,0.9)
 const service=createLendingService(),product=service.read().products[0]
 for(const dailyRate of [-1,101,NaN,null,'0.1'])assert.throws(()=>service.command('saveProduct',{product:{...product,loanTerms:[{days:7,dailyRate}]}}),/termRate/)
 assert.throws(()=>service.command('saveProduct',{product:{...product,loanTerms:[{days:7,dailyRate:1},{days:7,dailyRate:2}]}}),/duplicateTerm/)
 service.command('saveProduct',{product:{...product,loanTerms:[{days:7,dailyRate:0}]}})
 assert.equal(service.read().products[0].loanTerms[0].dailyRate,0)
})

test('products omit liquidity and lending needs no product funding pool',()=>{
 const service=createLendingService(),p=service.read().products[0]
 assert.equal('availableLiquidity' in p,false)
 service.command('saveProduct',{product:{...p,availableLiquidity:0}})
 assert.equal('availableLiquidity' in service.read().products[0],false)
 let s=approve(apply(service.read()))
 assert.equal(s.orders[0].status,'active')
 s=transact(s,'repay',{requestId:'paid',orderId:s.orders[0].orderId,userId:'USR-DEMO',amount:1000},now+day)
 assert.equal(s.orders[0].status,'completed')
 assert.equal('availableLiquidity' in s.products[0],false)
})
test('shared risk settings validate atomically, log and snapshot only new applications',()=>{
 const service=createLendingService(),before=service.read().riskPolicy
 assert.throws(()=>service.command('saveRiskPolicy',{policy:{...before,collateralWarningThreshold:96}}),/riskPolicy/)
 assert.deepEqual(service.read().riskPolicy,before)
 service.command('apply',{requestId:'old',userId:'USR-DEMO',productId:'LND-001',amount:1000,days:7,collateralCurrency:'BTC'})
 const policy={collateralWarningThreshold:75,collateralDisposalThreshold:90,overdueDeductEnabled:false}
 service.command('saveRiskPolicy',{policy,expectedPolicy:before})
 assert.equal(service.read().logs[0].action,'saveRiskPolicy')
 assert.throws(()=>service.command('saveRiskPolicy',{policy:before,expectedPolicy:before}),/stale/)
 service.command('apply',{requestId:'new',userId:'USR-DEMO',productId:'LND-001',amount:1000,days:7,collateralCurrency:'BTC'})
 const [latest,old]=service.read().orders
 assert.equal(latest.collateralWarningThreshold,75);assert.equal(latest.overdueDeductEnabled,false)
 assert.equal(old.collateralWarningThreshold,85);assert.equal(old.overdueDeductEnabled,true)
})
test('unsecured products skip collateral validation and reservation; secured products require valid collateral',()=>{
 const service=createLendingService(),p=service.read().products[0]
 const btcBefore=service.read().balances['USR-DEMO'].BTC
 service.command('saveProduct',{product:{...p,collateralEnabled:false,collateralMultiplier:null,collateralCurrencies:[],collateralWarningThreshold:1}})
 assert.equal('collateralWarningThreshold' in service.read().products[0],false)
 service.command('apply',{requestId:'unsecured',userId:'USR-DEMO',productId:p.productId,amount:1000,days:7})
 const s=service.read();assert.equal(s.orders[0].collateralStatus,'none');assert.equal(s.orders[0].collateralAmount,0)
 assert.equal(s.balances['USR-DEMO'].BTC,btcBefore)
 assert.throws(()=>service.command('saveProduct',{product:{...p,collateralMultiplier:null}}),/product/)
 assert.throws(()=>service.command('saveProduct',{product:{...p,collateralCurrencies:[]}}),/product/)
})

test('lending has no credit cap or credit policy command',()=>{
 const service=createLendingService(),p=service.read().products[0]
 assert.equal('policy' in service.read(),false)
 assert.throws(()=>service.command('savePolicy',{policy:{}}),/action/)
 service.command('saveProduct',{product:{...p,maxLoanAmount:4000000,collateralEnabled:false}})
 service.command('apply',{requestId:'no-credit',productId:p.productId,userId:'USR-DEMO',amount:3000000,days:7})
 service.command('approve',{requestId:'approved',orderId:service.read().orders[0].orderId})
 assert.equal(service.read().orders[0].status,'active')
})

test('mock daily rate is primary and yields simple daily interest',()=>{
 const seed=seedLending()
 assert.equal(seed.products[0].loanTerms[0].dailyRate,0.02)
 assert.equal('interestRate' in seed.products[0],false)
 const s=approve(apply(seed,{amount:10000}))
 accrue(s,now+8*day)
 assert.equal(s.orders[0].dailyRate,0.02)
 assert.equal(s.orders[0].interestRate,7.3)
 assert.equal(s.orders[0].interestAccrued,14)
})
test('application gates require both server-held levels and cannot be forged by request',()=>{
 const s=seedLending(),p=s.products[0]
 p.minVerificationLevel='advanced';p.minVipLevel=2
 const before=structuredClone(s)
 assert.throws(()=>apply(s,{verificationLevel:'advanced',vipLevel:5}),/verificationRequired/)
 assert.deepEqual(s,before)
 s.profiles['USR-DEMO'].verificationLevel='advanced'
 assert.throws(()=>apply(s),/vipRequired/)
 s.profiles['USR-DEMO'].vipLevel=2
 let pending=apply(s)
 assert.equal(pending.orders[0].eligibilitySnapshot.minVipLevel,2)
 pending.products[0].minVipLevel=5
 assert.equal(approve(pending).orders[0].status,'active')
 s.profiles['USR-DEMO'].vipLevel=5
 assert.equal(apply(s).orders[0].status,'pending')
})
test('eligibility options validate and unrestricted products accept lowest profile',()=>{
 const service=createLendingService(),p=service.read().products[0]
 for(const patch of [{minVipLevel:99},{minVipLevel:'1'},{minVerificationLevel:'unknown'}]){
  assert.throws(()=>service.command('saveProduct',{product:{...p,...patch}}),/eligibilityConfig/)
 }
 const s=seedLending();s.profiles['USR-DEMO']={verificationLevel:'none',vipLevel:0,simulated:true}
 assert.equal(apply(s).orders[0].status,'pending')
})
