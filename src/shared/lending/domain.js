import {eligibilityFailures} from './eligibility.js'
import {annualLoanRate} from './terms.js'
// Local prototype ledger. All amounts are rounded at the ledger boundary.
export const money = n => Math.round((Number(n) + Number.EPSILON) * 1e8) / 1e8
export const live = ['pending', 'active', 'repaying', 'overdue']
const day = 86400000
const requireValue = (ok, code) => { if (!ok) throw new Error(code) }
export function createLedger(products = []) {
  return { version: 1, products, orders: [], repayments: [], logs: [], entries: [], requests: [],
    profiles: {'USR-DEMO':{verificationLevel:'basic',vipLevel:1,simulated:true}},
    riskPolicy: {collateralWarningThreshold:85,collateralDisposalThreshold:95,overdueDeductEnabled:true},
    balances: {'USR-DEMO': {USDT: 100000, USDC: 100000, BTC: 10, ETH: 100, BNB: 100, SOL: 1000}},
    prices: {USDT: 1, USDC: 1, BUSD: 1, DAI: 1, BTC: 50000, ETH: 3000, BNB: 400, SOL: 150} }
}
function entry(s, o, currency, amount, kind, now) {
  const wallet = s.balances[o.userId] ||= {}
  const next = money((wallet[currency] || 0) + amount)
  requireValue(next >= 0, 'balance')
  wallet[currency] = next
  s.entries.unshift({id: `LE-${s.entries.length+1}`, orderId: o.orderId, userId:o.userId, currency, amount, kind, createdAt:now})
}
function log(s, o, action, actor, now) { s.logs.unshift({id:`LL-${s.logs.length+1}`,refId:o.orderId, targetLabel:o.productName,module:'order',action,summary:action,operator:actor,createdAt:now}) }
function unlock(s,o,now) { if(o.collateralStatus==='locked') { entry(s,o,o.collateralType,o.collateralAmount,'collateral_release',now);o.collateralStatus='released' } }
export function accrue(s, now = Date.now()) {
  for (const o of s.orders) {
    if (!['active','repaying','overdue'].includes(o.status)) continue
    const days = Math.max(0,Math.floor((now-o.accruedAt)/day))
    if(days) {
      for(let i=0;i<days;i++) {
        o.interestAccrued = money(o.interestAccrued + o.principal * (o.dailyRate ?? o.interestRate / 365) / 100)
        if(o.accruedAt+(i+1)*day > o.maturityAt)
          o.overduePenaltyAccrued = money(o.overduePenaltyAccrued + (o.principal+o.interestAccrued)*o.overduePenaltyRate/100)
      }
      o.accruedAt += days*day
    }
    o.totalDebt = money(o.principal + o.interestAccrued + o.overduePenaltyAccrued)
    if(now>=o.maturityAt) o.status='overdue'
  }
}
// Mutate a private draft only; caller commits after every validation succeeds.
export function transact(source, action, args, now = Date.now()) {
  const s = structuredClone(source)
  requireValue(args.requestId && !s.requests.includes(args.requestId), 'duplicate')
  accrue(s,now)
  const actor = args.actor || '用户（模拟）'
  let o = s.orders.find(x=>x.orderId===args.orderId)
  if(action==='apply') {
    const p=s.products.find(x=>x.productId===args.productId)
    const amount=Number(args.amount), days=Number(args.days), uid=args.userId
    requireValue(p?.status==='active','product')
    const eligibility=eligibilityFailures(p,s.profiles[uid]);requireValue(!eligibility.length,eligibility[0])
    requireValue(Number.isFinite(amount)&&money(amount)===amount&&amount>=p.minLoanAmount&&amount<=p.maxLoanAmount,'amount')
    const term=p.loanTerms?.find(t=>t.days===days)
    requireValue(Number.isSafeInteger(days)&&term,'term')
    requireValue(args.expectedDailyRate==null||args.expectedDailyRate===term.dailyRate,'rateChanged')
    const enabled=p.collateralEnabled!==false, currency=args.collateralCurrency
    requireValue(!enabled || (p.collateralCurrencies?.includes(currency)&&s.prices[currency]>0),'collateral')
    const qty=enabled?money(amount*Number(p.collateralMultiplier||1.5)/s.prices[currency]):0
    requireValue(!enabled||(s.balances[uid]?.[currency]||0)>=qty,'balance')
    o={orderId:`LOAN-${now}-${s.orders.length+1}`,userId:uid,userName:'演示用户',productId:p.productId,productName:p.productName,
      eligibilitySnapshot:{minVerificationLevel:p.minVerificationLevel,minVipLevel:p.minVipLevel,...s.profiles[uid]},
      loanCurrency:p.loanCurrency,loanAmount:amount,principal:0,totalDebt:0,loanDuration:days,dailyRate:term.dailyRate,interestRate:annualLoanRate(term.dailyRate),
      overduePenaltyRate:Number(p.overduePenaltyRate||0),collateralWarningThreshold:s.riskPolicy.collateralWarningThreshold,
      collateralDisposalThreshold:s.riskPolicy.collateralDisposalThreshold,overdueDeductEnabled:s.riskPolicy.overdueDeductEnabled,
      collateralType:enabled?currency:'',collateralAmount:qty,collateralStatus:enabled?'locked':'none',
      status:'pending',interestAccrued:0,overduePenaltyAccrued:0,createTime:now,interestStartAt:null,maturityAt:null,reviewer:''}
    if(enabled)entry(s,o,currency,-qty,'collateral_reserve',now)
    s.orders.unshift(o)
  } else {
    requireValue(o,'order')
    if(['repay','cancel'].includes(action))requireValue(o.userId===args.userId,'owner')
    if(action==='approve'||action==='reject'||action==='cancel') {
      requireValue(o.status==='pending','status')
      if(action==='approve') {
        const p=s.products.find(p=>p.productId===o.productId)
        requireValue(p?.status==='active','product')
        o.principal=o.loanAmount;o.totalDebt=o.loanAmount;o.status='active'
        o.interestStartAt=now;o.accruedAt=now;o.maturityAt=now+o.loanDuration*day
        entry(s,o,o.loanCurrency,o.loanAmount,'disbursement',now)
      }else {o.status=action==='reject'?'rejected':'cancelled';unlock(s,o,now)}
      if(action!=='cancel'){o.reviewer=actor;o.reviewedAt=now}
    } else if(action==='repay') {
      requireValue(['active','repaying','overdue'].includes(o.status),'status')
      const amount=Number(args.amount)
      requireValue(Number.isFinite(amount)&&money(amount)===amount&&amount>0&&amount<=o.totalDebt,'amount')
      entry(s,o,o.loanCurrency,-amount,'repayment',now)
      const penalty=Math.min(amount,o.overduePenaltyAccrued),interest=Math.min(amount-penalty,o.interestAccrued),principal=money(amount-penalty-interest)
      o.overduePenaltyAccrued=money(o.overduePenaltyAccrued-penalty);o.interestAccrued=money(o.interestAccrued-interest);o.principal=money(o.principal-principal);o.totalDebt=money(o.totalDebt-amount)
      o.status=o.totalDebt<=0?'completed':o.status==='overdue'?'overdue':'repaying'
      if(o.status==='completed')unlock(s,o,now)
      s.repayments.unshift({repaymentId:`REP-${now}-${s.repayments.length+1}`,orderId:o.orderId,userId:o.userId,loanCurrency:o.loanCurrency,amount,principalPaid:principal,interestPaid:interest,overduePenaltyPaid:penalty,status:'completed',repaymentTime:now,remainingDebt:o.totalDebt})
    }else if(action==='liquidate') {
      requireValue(['active','repaying','overdue'].includes(o.status)&&o.collateralStatus==='locked'&&o.overdueDeductEnabled,'status')
      const value=money(o.collateralAmount*s.prices[o.collateralType])
      requireValue(value>0&&o.totalDebt/value*100>=o.collateralDisposalThreshold,'threshold')
      const surplus=Math.max(0,value-o.totalDebt), recovered=Math.min(value,o.totalDebt)
      if(surplus)entry(s,o,o.collateralType,money(surplus/s.prices[o.collateralType]),'collateral_surplus',now)
      o.shortfall=money(Math.max(0,o.totalDebt-value));o.settledDebt=o.totalDebt;o.collateralStatus='deducted';o.status='liquidated'
      o.totalDebt=0;o.principal=0;o.interestAccrued=0;o.overduePenaltyAccrued=0;o.reviewer=actor
      s.entries.unshift({id:`LE-${s.entries.length+1}`,orderId:o.orderId,userId:o.userId,currency:o.collateralType,amount:-money(recovered/s.prices[o.collateralType]),kind:'collateral_settlement',createdAt:now})
    }else throw new Error('action')
  }
  o.updateTime=now;log(s,o,action,actor,now);s.requests.push(args.requestId)
  return s
}
