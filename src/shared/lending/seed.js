import { createLedger, transact, accrue } from './domain.js'
import { mockProducts } from '../../admin/mock/cryptoLending.js'
// Daily percentage rates are the source of truth for these mock products.
const dailyRates={'LND-001':0.02,'LND-002':0.025,'LND-003':0.015,'LND-004':0.03,'LND-005':0.035,'LND-006':0.03}
export function seedLending() { return createLedger(structuredClone(mockProducts).map(product=>{
 const {minLoanDuration,maxLoanDuration,interestRate,availableLiquidity,collateralWarningThreshold,collateralDisposalThreshold,overdueDeductEnabled,...rest}=product
 // One-time migration of the legacy fixture, retaining its previously displayed choices.
 const loanTerms=[...new Set([minLoanDuration,...[7,14,30,60,90,180].filter(n=>n>=minLoanDuration&&n<=maxLoanDuration),maxLoanDuration])].sort((a,b)=>a-b)
 return {...rest,minVerificationLevel:'none',minVipLevel:0,loanTerms:loanTerms.map(days=>({days,dailyRate:dailyRates[product.productId]}))}
})) }

// Demo loan history for USR-DEMO, replayed through the real commands (apply → approve → repay / reject) at past
// timestamps so every figure, lock and log is consistent. Enough rows for list paging / load-on-scroll (user request
// 2026-11-27). Applied by the in-page service only; seedLending() itself stays empty for the ledger tests.
export function seedLendingOrders(state, now = Date.now()) {
  const DAY = 86400000
  const plan = [
    // [daysAgo, productId, amount, days, collateral, outcome]
    [120, 'LND-001', 5000, 30, 'BTC', 'repaid'], [112, 'LND-002', 2000, 14, 'ETH', 'repaid'], [105, 'LND-003', 800, 30, 'USDT', 'repaid'],
    [98, 'LND-001', 12000, 60, 'ETH', 'repaid'], [90, 'LND-004', 20000, 30, 'BTC', 'repaid'], [84, 'LND-002', 1500, 7, 'USDT', 'rejected'],
    [77, 'LND-003', 2500, 14, 'BTC', 'repaid'], [70, 'LND-001', 3000, 14, 'BTC', 'repaid'], [63, 'LND-002', 6000, 30, 'ETH', 'repaid'],
    [56, 'LND-004', 8000, 30, 'ETH', 'repaid'], [49, 'LND-001', 1500, 7, 'USDT', 'repaid'], [42, 'LND-003', 1200, 30, 'USDC', 'repaid'],
    [35, 'LND-002', 4000, 60, 'BTC', 'active'], [28, 'LND-001', 9000, 90, 'ETH', 'active'], [20, 'LND-004', 15000, 60, 'BTC', 'active'],
    [12, 'LND-003', 600, 30, 'USDT', 'partial'], [5, 'LND-001', 2500, 30, 'BTC', 'active'], [0, 'LND-002', 1000, 14, 'ETH', 'pending'],
  ]
  let s = state
  plan.forEach(([daysAgo, productId, amount, days, collateralCurrency, outcome], index) => {
    const at = now - daysAgo * DAY - 3600000
    s = transact(s, 'apply', {requestId: `seed-loan-apply-${index}`, userId: 'USR-DEMO', productId, amount, days, collateralCurrency}, at)
    const order = s.orders.find(o => o.orderId.startsWith(`LOAN-${at}-`))
    if (outcome === 'pending') return
    if (outcome === 'rejected') { s = transact(s, 'reject', {requestId: `seed-loan-review-${index}`, orderId: order.orderId, actor: '模拟审核员'}, at + 1800000); return }
    s = transact(s, 'approve', {requestId: `seed-loan-review-${index}`, orderId: order.orderId, actor: '模拟审核员'}, at + 1800000)
    if (outcome === 'active') return
    const payAt = outcome === 'partial' ? now - 2 * DAY : Math.min(now - DAY, at + Math.max(1, days - 2) * DAY)
    const probe = structuredClone(s); accrue(probe, payAt)
    const debt = probe.orders.find(o => o.orderId === order.orderId).totalDebt
    const amountToPay = outcome === 'partial' ? Math.round(debt * 40) / 100 : debt
    s = transact(s, 'repay', {requestId: `seed-loan-repay-${index}`, orderId: order.orderId, userId: 'USR-DEMO', amount: amountToPay}, payAt)
  })
  return s
}
