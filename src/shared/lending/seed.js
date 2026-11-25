import { createLedger } from './domain.js'
import { mockProducts } from '../../admin/mock/cryptoLending.js'
// Daily percentage rates are the source of truth for these mock products.
const dailyRates={'LND-001':0.02,'LND-002':0.025,'LND-003':0.015,'LND-004':0.03,'LND-005':0.035,'LND-006':0.03}
export function seedLending() { return createLedger(structuredClone(mockProducts).map(product=>{
 const {minLoanDuration,maxLoanDuration,interestRate,availableLiquidity,collateralWarningThreshold,collateralDisposalThreshold,overdueDeductEnabled,...rest}=product
 // One-time migration of the legacy fixture, retaining its previously displayed choices.
 const loanTerms=[...new Set([minLoanDuration,...[7,14,30,60,90,180].filter(n=>n>=minLoanDuration&&n<=maxLoanDuration),maxLoanDuration])].sort((a,b)=>a-b)
 return {...rest,minVerificationLevel:'none',minVipLevel:0,loanTerms:loanTerms.map(days=>({days,dailyRate:dailyRates[product.productId]}))}
})) }
