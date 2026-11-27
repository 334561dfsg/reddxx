// C2C service. Pages call only these async functions; c2cStore.js stands in for the server.
// Errors keep the existing locale-key codes (e.g. 'c2c.error.OTC_LIMIT_EXCEEDED_SINGLE'); transport failures are
// 'network'. Use c2cErrorKey() to turn any rejection into a locale key.
import {c2cStateFor} from '../c2cStore.js'
import {c2cQuotes, c2cSellQuotes} from '../utils/c2cQuotes.js'
import {cancelC2COrder as cancelOrder, createC2COrder as createOrder} from '../utils/c2cState.js'
import {ApiError, mockCall, snapshot} from './transport.js'

const SERVICE = 'c2c'
const quotesFor = side => side === 'sell' ? c2cSellQuotes : c2cQuotes

/** Locale key for a C2C rejection (codes that already are keys pass through). */
export const c2cErrorKey = error => String(error?.code || '').startsWith('c2c.') ? error.code : 'common.requestFailed'

/** GET /c2c/quotes?side=buy|sell — the current quote snapshot (each with its ttl). */
export const listC2CQuotes = side => mockCall(SERVICE, () => snapshot(quotesFor(side)))

/** GET /c2c/orders?mode= — newest first. */
export const listC2COrders = mode => mockCall(SERVICE, () => snapshot(c2cStateFor(mode).orders))

/** GET /c2c/orders/:id?mode= — ApiError('notFound') when absent in this mode. */
export const getC2COrder = (id, mode) => mockCall(SERVICE, () => {
  const order = c2cStateFor(mode).orders.find(item => item.id === id)
  if (!order) throw new ApiError('notFound')
  return snapshot(order)
})

/**
 * POST /c2c/orders {mode, side, symbol, quantity, requestId} — prices from the server's current quote for that side
 * and symbol. Every order waits for back-office review (pending_review); a sell locks the asset. A repeated
 * requestId is rejected.
 */
export const createC2COrder = ({mode, side, symbol, quantity, requestId}) => mockCall(SERVICE, () => {
  const quote = quotesFor(side).find(item => item.symbol === symbol)
  if (!quote) throw new ApiError('c2c.error.OTC_LIMIT_EXCEEDED_SINGLE')
  return snapshot(createOrder(c2cStateFor(mode), {side, quote, quantity, requestId}))
})

/**
 * POST /c2c/orders/:id/cancel {mode} — the user cancels a pending order; a sell gets its locked asset back once.
 * ApiError('notFound') when absent in this mode; 'c2c.error.OTC_ORDER_NOT_OPERABLE' once it is no longer pending.
 */
export const cancelC2COrder = ({mode, id}) => mockCall(SERVICE, () => {
  try { return snapshot(cancelOrder(c2cStateFor(mode), id)) }
  catch (error) { throw new ApiError(error.message) }
})
