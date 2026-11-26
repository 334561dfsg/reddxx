// C2C service. Pages call only these async functions; c2cStore.js stands in for the server.
// Errors keep the existing locale-key codes (e.g. 'c2c.error.OTC_LIMIT_EXCEEDED_SINGLE'); transport failures are
// 'network'. Use c2cErrorKey() to turn any rejection into a locale key.
import {c2cStateFor, allC2COrders} from '../c2cStore.js'
import {c2cQuotes, c2cSellQuotes} from '../utils/c2cQuotes.js'
import {createC2COrder as createOrder, removeAccount, saveAccount} from '../utils/c2cState.js'
import {ApiError, mockCall, snapshot} from './transport.js'

const SERVICE = 'c2c'
const OPEN = order => !['completed', 'rejected', 'cancelled', 'expired', 'stale'].includes(order.status)
const quotesFor = side => side === 'sell' ? c2cSellQuotes : c2cQuotes

/** Locale key for a C2C rejection (codes that already are keys pass through). */
export const c2cErrorKey = error => String(error?.code || '').startsWith('c2c.') ? error.code : 'common.requestFailed'

/** GET /c2c/quotes?side=buy|sell — the current quote snapshot (each with its ttl). */
export const listC2CQuotes = side => mockCall(SERVICE, () => snapshot(quotesFor(side)))

/** GET /c2c/payment-accounts */
export const listPaymentAccounts = () => mockCall(SERVICE, () => snapshot(c2cStateFor('demo').accounts))

/** PUT /c2c/payment-accounts — creates (no id) or updates an account. */
export const savePaymentAccount = draft => mockCall(SERVICE, () => snapshot(saveAccount(c2cStateFor('demo'), {...draft})))

/** DELETE /c2c/payment-accounts/:id — rejected while any open order in either mode still uses it. */
export const deletePaymentAccount = id => mockCall(SERVICE, () => {
  removeAccount({accounts: c2cStateFor('demo').accounts, orders: allC2COrders().filter(OPEN)}, id)
  return true
})

/** GET /c2c/orders?mode= — newest first. */
export const listC2COrders = mode => mockCall(SERVICE, () => snapshot(c2cStateFor(mode).orders))

/** GET /c2c/orders/:id?mode= — ApiError('notFound') when absent in this mode. */
export const getC2COrder = (id, mode) => mockCall(SERVICE, () => {
  const order = c2cStateFor(mode).orders.find(item => item.id === id)
  if (!order) throw new ApiError('notFound')
  return snapshot(order)
})

/**
 * POST /c2c/orders {mode, side, symbol, quantity, accountId, requestId} — prices from the server's current quote
 * for that side and symbol. Buy stays pending_match; sell locks the asset. A repeated requestId is rejected.
 */
export const createC2COrder = ({mode, side, symbol, quantity, accountId, requestId}) => mockCall(SERVICE, () => {
  const quote = quotesFor(side).find(item => item.symbol === symbol)
  if (!quote) throw new ApiError('c2c.error.OTC_LIMIT_EXCEEDED_SINGLE')
  return snapshot(createOrder(c2cStateFor(mode), {side, quote, quantity, accountId, requestId}))
})
