import { ORDER_STATUS } from '../constants/aiQuant.js'

// Demo policy: redeem the whole running order; locked and terminal orders cannot be redeemed.
export const canForceRedeemAiQuantOrder = (order) => order?.status === ORDER_STATUS.RUNNING

export function forceRedeemAiQuantOrder(order, { now = new Date() } = {}) {
  if (!canForceRedeemAiQuantOrder(order)) throw new Error('订单状态已变化，仅运行中的订单可以强制赎回。')
  return {
    ...order,
    status: ORDER_STATUS.FORCE_REDEEMED,
    forceRedeemedAt: now.toISOString()
  }
}
