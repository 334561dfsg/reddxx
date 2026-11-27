import {assertEarnEligibility,earnMockProfile} from '../utils/earnEligibility.js'
import { reactive } from 'vue'
import { createEarnPortfolio, redeemLocalHolding } from '../utils/mockEarnPortfolio.js'
import { subscriptionError } from '../utils/earnProducts.js'
import { balanceOf, credit, debit, modeKey } from '../mock/ledger.js'
import { nextId } from '../mock/ids.js'
import { bootAt, clock } from '../mock/clock.js'

// Earn records are kept per account mode (independent instances of the synthetic fixtures); money moves only
// through the shared mock ledger. In memory only.
export const earnPortfolios = reactive({ real: createEarnPortfolio(bootAt), demo: createEarnPortfolio(bootAt) })
export const earnPortfolioFor = mode => earnPortfolios[modeKey(mode)]
export const earnBalance = (mode, symbol) => balanceOf(mode, symbol)

/** Amount this user already has in a product: pending subscriptions plus live holdings. */
export function earnCommitted(productId, mode) {
  const portfolio = earnPortfolioFor(mode)
  const pending = portfolio.orders.filter(o => o.productId === productId && o.status === 'pending_review').reduce((s, o) => s + o.amount, 0)
  const held = portfolio.holdings.filter(h => h.productId === productId && ['active', 'redeeming'].includes(h.status)).reduce((s, h) => s + h.principal, 0)
  return pending + held
}

/** Validates against balance, product and cumulative per-user quota, then reserves the balance; nothing changes on error. */
export function recordEarnSubscription(product, amount, mode, requestId) {
  // Idempotent per requestId (review 2026-11-27): a retried submission returns the order it already created.
  const portfolio = earnPortfolioFor(mode)
  const seen = requestId && portfolio.orders.find(o => o.requestId === requestId)
  if (seen) return seen
  assertEarnEligibility(product)
  const value = Number(amount)
  const error = subscriptionError(product, value, earnBalance(mode, product.symbol), earnCommitted(product.id, mode))
  if (error) throw Object.assign(new Error(error.code), error)
  if (!debit(mode, product.symbol, value)) throw Object.assign(new Error('insufficientBalance'), { code: 'insufficientBalance' })
  const order = {
    eligibilitySnapshot: { minVerificationLevel: product.minVerificationLevel || 'none', minVipLevel: product.minVipLevel || 0, ...earnMockProfile },
    id: nextId('EARN'), productId: product.id, symbol: product.symbol, amount: value, mode: modeKey(mode),
    status: 'pending_review', createdAt: clock.now(), completedAt: null, requestId: requestId || null,
  }
  portfolio.orders.unshift(order)
  return order
}

/** Completed redemptions credit principal + reward to the ledger exactly once (repeat request ids are idempotent). */
export function redeemEarnHolding(holdingId, amount, options, mode) {
  const portfolio = earnPortfolioFor(mode)
  const repeat = portfolio.redemptions.some(row => row.id === options?.id)
  const result = redeemLocalHolding(portfolio, holdingId, amount, options)
  if (!repeat && result.record?.status === 'completed') credit(mode, result.record.symbol, result.record.amount + (result.record.reward || 0))
  return result
}
