// Small pure helpers shared by the order panels and useOrderSubmit, so the figures shown in a panel and the
// figures validated on submit come from one definition.
import {t} from '../../../i18n'
import {deliveryPeriods,tradeFeeRate} from '../../../utils/orderFormModel'

// `pair.price` is the live stream price (null until the first ticker); limit orders use the typed price.
export function futuresPrice(futures,pair){return futures.type==='market'?pair.price:Number(futures.price)}
export function spotPrice(spot,side,pair){return spot.type==='market'?pair.price:Number(spot[side].price)}

export function deliveryRate(duration){return deliveryPeriods.find(p=>p[0]===duration)[1]}
export function periodLabel(seconds){
 return seconds>=86400?t('trade.form.days',{value:seconds/86400}):t('trade.durationSeconds',{value:seconds})
}

// Largest futures size the cash balance can open at this leverage, margin plus fee included.
export function maxFuturesOpen(cash,leverage){return cash/(1/leverage+tradeFeeRate)}
// Spot buy spends cash including the fee; spot sell is limited by the base-asset holding.
export function spotCapacity(side,cash,holdings){return side==='buy'?cash/(1+tradeFeeRate):holdings}

// Percentage buttons fill the amount rounded down to 6 decimals.
export function percentAmount(capacity,percent){return String(Math.floor(capacity*percent/100*1e6)/1e6)}

export function orderTypeItems(){return ['market','limit'].map(value=>({value,label:t('trade.'+value)}))}
