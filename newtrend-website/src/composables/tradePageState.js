import { reactive } from 'vue'
import { tradeProducts } from '../utils/tradeProducts.js'

export function createTradePageState(mode) {
  return {symbol:'BTCUSD',query:'',category:'aiQuant.templates.filterAll',sort:mode==='spot'?'change':'',descending:true,
    interval:'trade.interval_1h',record:tradeProducts[mode].tabs[0].id,pages:{},marketsExpanded:false,chartOpen:false}
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
