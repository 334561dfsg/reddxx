import {assertEarnEligibility,earnMockProfile} from './utils/earnEligibility.js'
import { reactive } from 'vue'
import { createEarnPortfolio, redeemLocalHolding } from './utils/mockEarnPortfolio.js'
import { subscriptionError } from './utils/earnProducts.js'

export const earnPortfolio = reactive(createEarnPortfolio())
// Per-mode, per-asset Earn wallet (mock, in memory). 真實 starts empty; 模擬 has demo funds in each product asset.
export const earnWallet = reactive({ real: {}, demo: { USDT: 100000, USDC: 100000, BTC: 2, ETH: 30 } })
const walletKey = mode => mode === 'common.demo.demo' ? 'demo' : 'real'
export const earnBalance = (mode, symbol) => earnWallet[walletKey(mode)][symbol] || 0
/** Amount this user already has in a product: pending subscriptions plus live holdings. */
export function earnCommitted(productId) {
  const pending = earnPortfolio.orders.filter(o => o.productId === productId && o.status === 'pending_review').reduce((s, o) => s + o.amount, 0)
  const held = earnPortfolio.holdings.filter(h => h.productId === productId && ['active', 'redeeming'].includes(h.status)).reduce((s, h) => s + h.principal, 0)
  return pending + held
}
/** Validates against balance, product and cumulative per-user quota, then reserves the balance; nothing changes on error. */
export function recordEarnSubscription(product, amount, mode) {
  assertEarnEligibility(product)
  const balance = earnBalance(mode, product.symbol)
  const error = subscriptionError(product, amount, balance, earnCommitted(product.id))
  if (error) throw Object.assign(new Error(error.code), error)
  earnWallet[walletKey(mode)][product.symbol] = balance - Number(amount)
  const order = { eligibilitySnapshot:{minVerificationLevel:product.minVerificationLevel||'none',minVipLevel:product.minVipLevel||0,...earnMockProfile}, id: crypto.randomUUID(), productId: product.id, symbol: product.symbol, amount: Number(amount), mode: walletKey(mode), status: 'pending_review', createdAt: Date.now(), completedAt: null }
  earnPortfolio.orders.unshift(order)
  return order
}
export function redeemEarnHolding(holdingId, amount, options) {
  return redeemLocalHolding(earnPortfolio, holdingId, amount, options)
}
