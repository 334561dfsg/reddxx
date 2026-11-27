// Quant Fund service. Pages call only these async functions; quantFundPortfolio.js stands in for the server.
// Product names are plain catalogue strings, so this module needs no locale binding and is Node-testable as is.
import {quantFunds, quantFundAccount, fundMode, findQuantFund, refreshQuantFunds} from '../quantFundPortfolio.js'
import {fundSummary, requestRedeemFund, restrictedFor, subscribeFund} from '../utils/quantFund.js'
import {DEMO_UID} from '../account.js'
import {ApiError, mockCall, snapshot} from './transport.js'

const SERVICE = 'quantFund'
const requireProduct = id => {
  const product = findQuantFund(id)
  if (!product) throw new ApiError('notFound')
  return product
}

// The signed-in user's view: a product whose restricted list holds this UID shows as full (100%).
const viewFor = product => (restrictedFor(product, DEMO_UID) ? {...product, subscribed: product.totalQuota} : product)

/** GET /quant-fund/products */
export const listQuantFunds = () => mockCall(SERVICE, () => snapshot(quantFunds.map(viewFor)))

/** GET /quant-fund/products/:id — ApiError('notFound') for an unknown id. */
export const getQuantFund = id => mockCall(SERVICE, () => snapshot(viewFor(requireProduct(id))))

/** GET /quant-fund/positions?mode= — this mode's orders (newest first) and the summary card figures. Settles matured orders first. */
export const getQuantFundPositions = mode => mockCall(SERVICE, () => {
  refreshQuantFunds()
  const orders = snapshot(quantFundAccount.orders.filter(order => order.mode === fundMode(mode)))
  return {orders, summary: fundSummary(orders)}
})

/** Finds an order of this account mode only (review 2026-11-27: ids never resolve across real/demo). */
const findOrder = (orderId, mode) => quantFundAccount.orders.find(item => item.id === orderId && item.mode === fundMode(mode))

/** GET /quant-fund/orders/:id?mode= — one order with its interest records; ApiError('notFound') for an unknown id. */
export const getQuantFundOrder = (orderId, mode) => mockCall(SERVICE, () => {
  refreshQuantFunds()
  const order = findOrder(orderId, mode)
  if (!order) throw new ApiError('notFound')
  return snapshot(order)
})

/** GET /quant-fund/balance?mode= — USDT available for subscriptions. */
export const getQuantFundBalance = mode => mockCall(SERVICE, () => ({balance: quantFundAccount.balances[fundMode(mode)]}))

/**
 * POST /quant-fund/subscriptions {productId, amount, mode, requestId} — creates a pending-review order and reserves
 * the principal. A repeated requestId returns the original order. Validation failures reject with the
 * fundSubscriptionError() kind as code ('invalid' | 'range' | 'exceedsAvailable' | 'insufficientBalance') and its fields.
 */
export const subscribeQuantFund = ({productId, amount, mode, requestId}) => mockCall(SERVICE, () => {
  const result = subscribeFund(quantFundAccount, requireProduct(productId), amount, {mode: fundMode(mode), requestId, uid: DEMO_UID})
  if (result.error) {
    const {kind, ...params} = result.error
    throw new ApiError(kind, params)
  }
  return snapshot(result.order)
})

/**
 * POST /quant-fund/orders/:id/redeem {mode} — submits a redemption for admin review: the order moves to redeem_pending_review
 * and keeps earning until approved. ApiError('conflict') when the order is not redeemable (already requested,
 * fixed term, not active).
 */
export const redeemQuantFund = (orderId, mode) => mockCall(SERVICE, () => {
  const order = findOrder(orderId, mode)
  if (!order) throw new ApiError('notFound')
  const result = requestRedeemFund(order)
  if (result.error) throw new ApiError(result.error)
  return snapshot(result)
})
