// Trading REST API used by pages: tradeService bound to the market stream's last prices.
import {marketStream} from './market.js'
import {createTradeApi} from './tradeService.js'
import {errorKey} from './transport.js'

export const {getTradeBalances, listTradeRecords, placeTradeOrder, finishTrade, getTradeOrder} = createTradeApi({lastPrice: marketStream.lastPrice})

/** Locale key for a trade rejection. */
export const tradeErrorKey = error => errorKey(error)
