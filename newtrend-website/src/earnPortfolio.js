import { reactive } from 'vue'
import { createEarnPortfolio, redeemLocalHolding } from './utils/mockEarnPortfolio'

export const earnPortfolio = reactive(createEarnPortfolio())
export function recordEarnSubscription(product, amount) {
  const order = { id: crypto.randomUUID(), productId: product.id, symbol: product.symbol, amount, status: 'pending_review', createdAt: Date.now(), completedAt: null }
  earnPortfolio.orders.unshift(order)
  return order
}
export function redeemEarnHolding(holdingId, amount, options) {
  return redeemLocalHolding(earnPortfolio, holdingId, amount, options)
}
