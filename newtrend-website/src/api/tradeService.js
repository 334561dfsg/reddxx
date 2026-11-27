// Trading REST service (orders, records, balances); live prices come from the market stream, injected as
// lastPrice(marketName) so the service stays Node-testable. tradingFunds.js and the mock history stand in for
// the server. Pages import the bound functions from ./trade.js.
import {balanceOf} from '../mock/ledger.js'
import {orderFunding, placeTradeOrder as placeOrder, releaseTradeFunds, settleDueOptions, tradeOrdersFor} from '../tradingFunds.js'
import {finishCurrentTrade} from '../utils/mockCurrentTrades.js'
import {mockTradeHistory} from '../utils/mockTradeHistory.js'
import {selectProductRecords} from '../utils/tradeProducts.js'
import {ApiError, mockCall, snapshot} from './transport.js'

const SERVICE = 'trade'
const DEMO = 'common.demo.demo'

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
   * POST /trade/orders {mode, order, sizing: {kind, side, pending, estimate, amount, base}} — locks the funds and
   * records the order atomically. Market orders take the server's last price. Rejects 'insufficient' with the
   * form's locale key.
   */
  const placeTradeOrder = ({mode, order, sizing}) => mockCall(SERVICE, () => {
    const live = lastPrice(order.marketName)
    const filled = sizing.pending ? order : {...order, markPrice: live ?? order.markPrice}
    const record = {...filled, createdAt: Date.now(), openedAt: Date.now()}
    if (!placeOrder(mode, record, orderFunding(sizing))) {
      throw new ApiError(mode === DEMO ? 'assets.withdraw.error.insufficientBalance' : 'overlay.ui.insufficientBalanceSwitchToDemoToTryThisLocally')
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
