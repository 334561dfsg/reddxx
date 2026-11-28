import { reactive } from 'vue'
import { tradeProducts } from '../utils/tradeProducts.js'

export function createTradePageState(mode) {
  // symbol: last pair shown on this product; interval: chart interval; record / pages: records tab and per-tab page.
  return {symbol:'BTCUSD',interval:'trade.interval_1h',record:tradeProducts[mode].tabs[0].id,pages:{}}
}
export function createOrderDrafts() {
  return {
    futures:{side:'buy',type:'market',amount:'',price:'',leverage:200,stops:false,tp:'',sl:''},
    options:{side:'buy',amount:'',duration:30},
    spot:{side:'buy',type:'market',buy:{amount:'',price:''},sell:{amount:'',price:''}},
  }
}
// Lifetime is one website session: page changes retain drafts; reload resets them.
const pageStates=new Map()
const drafts=reactive(createOrderDrafts())
export function useTradePageState(mode) {
  if(!pageStates.has(mode))pageStates.set(mode,reactive(createTradePageState(mode)))
  return pageStates.get(mode)
}
export function useOrderDrafts(){return drafts}

// A price picked from the order book (phone layout) becomes the limit price of the futures or spot form; delivery
// orders trade at market, so they ignore it.
export function fillLimitPrice(mode,price){
  const value=String(price)
  if(mode==='futures'){drafts.futures.type='limit';drafts.futures.price=value}
  else if(mode==='spot'){drafts.spot.type='limit';drafts.spot[drafts.spot.side||'buy'].price=value}
}
