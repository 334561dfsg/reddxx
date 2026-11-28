// Trading REST service (orders, records, balances); live prices come from the market stream, injected as
// lastPrice(marketName) so the service stays Node-testable. tradingFunds.js and the mock history stand in for
// the server. Pages import the bound functions from ./trade.js.
import {balanceOf} from '../mock/ledger.js'
import {orderFunding, placeTradeOrder as placeOrder, releaseTradeFunds, settleDueOptions, tradeOrdersFor} from '../server/tradingFunds.js'
import {finishCurrentTrade} from '../utils/mockCurrentTrades.js'
import {mockTradeHistory} from '../utils/mockTradeHistory.js'
import {selectProductRecords} from '../utils/tradeProducts.js'
import {ApiError, mockCall, snapshot} from './transport.js'
import {isDemo} from '../utils/accountMode.js'
import {deliveryPeriods, leverageOptions, orderEstimate, validStops} from '../utils/orderFormModel.js'
import {nextId} from '../mock/ids.js'
import {clock} from '../mock/clock.js'

const SERVICE = 'trade'

export function createTradeApi({lastPrice}) {
  /** GET /trade/balances?mode=&assets= — available amounts of the requested assets. */
  const getTradeBalances = (mode, assets) => mockCall(SERVICE, () => Object.fromEntries(assets.map(asset => [asset, balanceOf(mode, asset)])))

  /**
   * GET /trade/records?mode=&product=&tab= — one records tab of a product, newest first. Open positions carry the
   * server's current mark price (pushed prices keep it live on screen afterwards).
   */
  const listTradeRecords = (mode, product, tabId) => mockCall(SERVICE, () => {
    settleDueOptions(mode, lastPrice)
    const rows = selectProductRecords([...tradeOrdersFor(mode), ...mockTradeHistory], product, tabId)
    return snapshot(rows.map(row => row.bucket === 'positions' ? {...row, markPrice: lastPrice(row.marketName) ?? row.markPrice} : row))
  })

  /**
   * POST /trade/orders {mode, kind, side, marketName, type, amount, price?, leverage?, duration?, takeProfit?, stopLoss?,
   * requestId} — the server owns the order (review 2026-11-27): it validates the parameters, prices market orders at
   * its last price, estimates size/margin/fee, picks the record bucket and payout rate, locks the funds and records
   * the order atomically. A repeated requestId returns the order it already created. Rejections use form locale keys.
   */
  const placeTradeOrder = ({mode, kind, side, marketName, type = 'market', amount, price, leverage = 1, duration, takeProfit = '', stopLoss = '', requestId}) => mockCall(SERVICE, () => {
    if (!['futures', 'options', 'spot'].includes(kind) || !['buy', 'sell'].includes(side) || !marketName) throw new ApiError('trade.spotErrorInvalidSizingInput')
    const seen = requestId && tradeOrdersFor(mode).find(o => o.requestId === requestId)
    if (seen) return snapshot(seen)
    const live = lastPrice(marketName)
    const pending = kind !== 'options' && type === 'limit'
    const fill = pending ? Number(price) : live
    if (!pending && !(live > 0)) throw new ApiError('trade.stream.unavailable')
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) throw new ApiError('trade.ui.enterAValidOrderAmount')
    if (kind === 'options' && value < 100) throw new ApiError('trade.amountBelowMinimum')
    if (!Number.isFinite(fill) || fill <= 0) throw new ApiError('trade.spotErrorInvalidSizingInput')
    const rate = kind === 'options' ? deliveryPeriods.find(([seconds]) => seconds === Number(duration))?.[1] : undefined
    if (kind === 'options' && rate === undefined) throw new ApiError('trade.spotErrorInvalidSizingInput')
    if (kind === 'futures' && !leverageOptions.includes(Number(leverage))) throw new ApiError('trade.spotErrorInvalidSizingInput')
    const stops = kind === 'futures' && (String(takeProfit) !== '' || String(stopLoss) !== '')
    if (stops && !validStops(side, fill, String(takeProfit), String(stopLoss))) throw new ApiError('trade.form.invalidStops')
    const estimate = orderEstimate({kind, side, amount: value, price: fill, leverage: Number(leverage), rate})
    const now = clock.now()
    const record = {
      id: nextId('T'), requestId: requestId || null, kind, marketName, direction: side, price: fill, markPrice: live ?? fill, amount: value, symbol: 'USDT', ...estimate,
      leverage: kind === 'futures' ? Number(leverage) : undefined, orderType: pending ? 'trade.limit' : 'trade.market', filledQuantity: pending ? 0 : estimate.quantity,
      bucket: kind === 'options' ? 'optionsOrders' : kind === 'spot' ? (pending ? 'spotOpenOrders' : 'spotOrdersHistory') : (pending ? 'openOrders' : 'positions'),
      duration: kind === 'options' ? Number(duration) : undefined, rate,
      takeProfit: stops ? Number(takeProfit) || null : null, stopLoss: stops ? Number(stopLoss) || null : null,
      fee: pending ? 0 : estimate.fee, recordStatus: pending ? 'trade.current.pending' : 'trade.filled', settled: kind === 'spot' && !pending,
      createdAt: now, openedAt: now,
    }
    if (!placeOrder(mode, record, orderFunding({kind, side, pending, estimate, amount: value, base: marketName.split('/')[0]}))) {
      throw new ApiError(isDemo(mode) ? 'assets.withdraw.error.insufficientBalance' : 'overlay.ui.insufficientBalanceDeposit')
    }
    return snapshot(record)
  })

  /**
   * POST /trade/orders/:id/finish — closes a position at the server's last price, or cancels an open order, and
   * releases its funds once. ApiError('conflict') when it is no longer open.
   */
  const finishTrade = ({mode, id}) => mockCall(SERVICE, () => {
    const orders = tradeOrdersFor(mode), original = orders.find(o => o.id === id)
    if (!original || !['positions', 'openOrders', 'spotOpenOrders'].includes(original.bucket)) throw new ApiError('conflict')
    if (original.bucket === 'positions') original.markPrice = lastPrice(original.marketName) ?? original.markPrice
    const closed = {...original}
    if (!finishCurrentTrade(orders, id)) throw new ApiError('conflict')
    releaseTradeFunds(mode, closed)
    return snapshot(orders.find(o => o.id === 'closed-' + id))
  })

  /**
   * GET /trade/orders/:id?mode= — one order of the account; a delivery order past its period is settled first
   * (result, close price, P&L). ApiError('notFound') when the account has no such order.
   */
  const getTradeOrder = ({mode, id}) => mockCall(SERVICE, () => {
    settleDueOptions(mode, lastPrice)
    const order = tradeOrdersFor(mode).find(o => o.id === id)
    if (!order) throw new ApiError('notFound')
    return snapshot(order)
  })

  return {getTradeBalances, listTradeRecords, placeTradeOrder, finishTrade, getTradeOrder}
}
