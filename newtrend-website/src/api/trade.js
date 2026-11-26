// Trading REST API used by pages: tradeService bound to the market stream's last prices.
import {marketStream} from './market.js'
import {createTradeApi} from './tradeService.js'

export const {getTradeBalances, listTradeRecords, placeTradeOrder, finishTrade} = createTradeApi({lastPrice: marketStream.lastPrice})

/** Locale key for a trade rejection. */
export const tradeErrorKey = error => /^[a-z]+\.[\w.]+$/i.test(String(error?.code || '')) ? error.code : 'common.requestFailed'
