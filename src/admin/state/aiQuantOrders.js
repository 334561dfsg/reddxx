import { forceRedeemAiQuantOrder } from '../domain/aiQuantRedemption.js'
import { appendAiQuantOperationLog } from './aiQuantOperationLogs'
import { AI_QUANT_OP_ACTION, AI_QUANT_OP_MODULE } from '../constants/aiQuantOperationLog'
import { createAiQuantOrdersMock } from '../mock/aiQuant'

const redeemedOrders = new Map()

/**
 * 生成订单列表快照（每次调用新数组）。运营后台订单页应使用本地 ref 持有结果，勿用全局单例 ref，以免 HMR/热更新把列表清空。
 */
export function getAiQuantAdminOrdersSnapshot() {
	try {
		const data = createAiQuantOrdersMock()
		return Array.isArray(data) ? data.map((order) => redeemedOrders.get(order.id) || order) : []
	} catch (e) {
		console.warn('[aiQuant] createAiQuantOrdersMock failed', e)
		return []
	}
}

/** Session-local demo mutation. Replace with an authorized, idempotent backend transaction before production use. */
export function redeemAiQuantAdminOrder(orderId, input) {
  const order = getAiQuantAdminOrdersSnapshot().find((item) => item.id === orderId)
  const updated = forceRedeemAiQuantOrder(order, input)
  appendAiQuantOperationLog({
    module: AI_QUANT_OP_MODULE.ORDER,
    action: AI_QUANT_OP_ACTION.ORDER_FORCE_REDEEM,
    refId: orderId,
    targetLabel: updated.productName,
    summary: `强制赎回订单；用户 ${updated.userName}（${updated.userId}）；本金 ${updated.principal} ${updated.currency}`
  })
  redeemedOrders.set(orderId, updated)
  return updated
}
