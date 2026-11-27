import {validateEligibility} from './eligibility.js'
import { normalizeLoanTerms } from './terms.js'
import { seedLending, seedLendingOrders } from './seed.js'
import { transact, accrue } from './domain.js'
// One in-memory instance per page (resets on reload). No disk or browser persistence.
export function createLendingService() {
 let state = seedLendingOrders(seedLending())
 return {
  read() { accrue(state);return structuredClone(state) },
  command(action,args) {
   if(action==='saveRiskPolicy') {
    const p=args.policy,before=structuredClone(state.riskPolicy)
    if(args.expectedPolicy&&JSON.stringify(args.expectedPolicy)!==JSON.stringify(before))throw new Error('stale')
    if(!p||!Number.isFinite(p.collateralWarningThreshold)||!Number.isFinite(p.collateralDisposalThreshold)||p.collateralWarningThreshold<=0||p.collateralDisposalThreshold<=p.collateralWarningThreshold||p.collateralDisposalThreshold>100||typeof p.overdueDeductEnabled!=='boolean')throw new Error('riskPolicy')
    state.riskPolicy={collateralWarningThreshold:p.collateralWarningThreshold,collateralDisposalThreshold:p.collateralDisposalThreshold,overdueDeductEnabled:p.overdueDeductEnabled}
    state.logs.unshift({id:`RISK-${Date.now()}-${state.logs.length}`,module:'risk',action:'saveRiskPolicy',summary:'保存风控设置',before,after:structuredClone(state.riskPolicy),operator:'管理员（模拟）',createdAt:Date.now()})
   }else if(action==='setProductStatus') {
    const index=state.products.findIndex(p=>p.productId===args.productId)
    if(index<0)throw new Error('product')
    const before=structuredClone(state.products[index])
    if(!args.requestId||state.requests.includes(args.requestId))throw new Error('duplicate')
    if(before.status!==args.expectedStatus)throw new Error('stale')
    const status=before.status==='active'?'inactive':'active'
    const after={...before,status,updateTime:Date.now()}
    state.products[index]=after
    state.requests.push(args.requestId)
    state.logs.unshift({id:`STATUS-${Date.now()}-${state.logs.length}`,module:'product',refId:before.productId,targetLabel:before.productName,action:status==='active'?'publishProduct':'unpublishProduct',summary:`${status==='active'?'上架':'下架'}产品：${before.productName}`,before,after:structuredClone(after),operator:'管理员（模拟）',createdAt:Date.now()})
   }else if(action==='saveProduct') {
    const p=structuredClone(args.product)
    p.minVerificationLevel??='none';p.minVipLevel??=0;validateEligibility(p)
    p.loanTerms=normalizeLoanTerms(p.loanTerms)
    delete p.minLoanDuration;delete p.maxLoanDuration;delete p.interestRate;delete p.availableLiquidity;delete p.collateralWarningThreshold;delete p.collateralDisposalThreshold;delete p.overdueDeductEnabled
    const existing=state.products.find(row=>row.productId===p.productId)
    p.status=existing?.status||'inactive'
    for(const key of ['minLoanAmount','maxLoanAmount','overduePenaltyRate'])if(!Number.isFinite(Number(p[key]))||Number(p[key])<0)throw new Error('amount')
    if(!p.productName?.trim()||!['USDT','USDC'].includes(p.loanCurrency)||!['active','inactive','suspended'].includes(p.status)||p.minLoanAmount<=0||p.maxLoanAmount<p.minLoanAmount||typeof p.collateralEnabled!=='boolean'||(p.collateralEnabled&&(!Number.isFinite(p.collateralMultiplier)||p.collateralMultiplier<1||!Array.isArray(p.collateralCurrencies)||!p.collateralCurrencies.length||p.collateralCurrencies.some(c=>!state.prices[c]))))throw new Error('product')
    const index=state.products.findIndex(x=>x.productId===p.productId)
    if(index>=0&&args.expectedProduct&&JSON.stringify(state.products[index])!==JSON.stringify(args.expectedProduct))throw new Error('stale')
    if(index<0)p.productId=`LND-${Date.now()}`
    if(index>=0 && state.orders.some(o=>o.productId===p.productId)&&state.products[index].loanCurrency!==p.loanCurrency)throw new Error('currency')
    const before=index<0?null:structuredClone(state.products[index])
    if(index<0)state.products.push(p);else state.products[index]=p
    state.logs.unshift({id:`CFG-${Date.now()}`,module:'product',refId:p.productId,targetLabel:p.productName,action:'saveProduct',summary:'保存产品',before,after:structuredClone(p),operator:'管理员（模拟）',createdAt:Date.now()})
   }else {
    if(!['apply','approve','reject','cancel','repay','liquidate'].includes(action))throw new Error('action')
    state=transact(state,action,args)
   }
   return this.read()
  }
 }
}
