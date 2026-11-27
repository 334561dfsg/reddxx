// Order submission for TradeOrderForm: balances, validation, the account-confirm overlay and its feedback.
// The server builds and prices the order (review 2026-11-27); the form only sends the parameters.
import {computed,reactive,ref,watch} from 'vue'
import {session,openModal} from '../../../session'
import {isDemo} from '../../../utils/accountMode.js'
import {getTradeBalances,placeTradeOrder,tradeErrorKey} from '../../../api/trade.js'
import {invalidate,useRequest} from '../../../composables/useRequest.js'
import {streamStale} from '../../../composables/useMarket.js'
import {useOrderDrafts} from '../../../composables/tradePageState'
import {fmt} from '../../../data'
import {t} from '../../../i18n'
import {orderEstimate,validStops} from '../../../utils/orderFormModel'
import {deliveryRate,futuresPrice,periodLabel,spotPrice} from './orderPricing.js'

// Balances come from the trade API for the current account mode and pair (panels show skeletons until ready).
// `pair` is a getter. Returns a reactive {base, ready, cash, holdings}.
export function useOrderBalances(pair){
 const base=computed(()=>pair().name.split('/')[0])
 const request=useRequest(()=>getTradeBalances(session.mode,['USDT',base.value]),{
  key:()=>session.mode+'|'+base.value,tags:['trade','wallet'],
 })
 return reactive({
  base,
  ready:computed(()=>request.status.value==='ready'),
  cash:computed(()=>request.data.value?.USDT??0),
  holdings:computed(()=>request.data.value?.[base.value]??0),
 })
}

// mode/pair are getters; balances is useOrderBalances(); focusAmount returns focus after the delivery dialog.
// Error keys: futures, options, and buy/sell for spot.
export function useOrderSubmit({mode,pair,balances,focusAmount}){
 const drafts=useOrderDrafts()
 const errors=reactive({futures:'',options:'',buy:'',sell:''}),notice=ref('')
 const clearError=key=>{errors[key]=''}
 const clearNotice=()=>{notice.value=''}
 // A string key: an array getter would fire on every price tick (new pair object) and wipe the success toast.
 watch(()=>`${mode()}|${pair().id}|${session.mode}`,()=>{Object.keys(errors).forEach(clearError);clearNotice()})

 // Returns an error key, or the checked order figures.
 function check(kind,side){
  const {futures,options,spot}=drafts,p=pair()
  if(!session.loggedIn)return 'trade.ui.signInToTheLocalDemoFirst'
  // No live price or a dropped market connection: hold the order (prices may be outdated).
  if(streamStale.value||p.price===null||!balances.ready)return 'trade.stream.unavailable'
  const draft=kind==='futures'?futures:kind==='options'?options:spot[side],amount=Number(draft.amount)
  const price=kind==='futures'?futuresPrice(futures,p):kind==='spot'?spotPrice(spot,side,p):p.price
  if(!Number.isFinite(amount)||amount<=0)return 'trade.ui.enterAValidOrderAmount'
  if(kind==='options'&&amount<100)return 'trade.amountBelowMinimum'
  if(!Number.isFinite(price)||price<=0)return 'trade.spotErrorInvalidSizingInput'
  const rate=deliveryRate(options.duration)
  const estimate=orderEstimate({kind,side,amount,price,leverage:futures.leverage,rate})
  if(kind==='futures'&&futures.stops&&!validStops(side,price,futures.tp,futures.sl))return 'trade.form.invalidStops'
  const cost=kind==='futures'?estimate.margin+estimate.fee
   :kind==='options'?amount
   :side==='buy'?amount+estimate.fee:amount
  const available=kind==='spot'&&side==='sell'?balances.holdings:balances.cash
  if(cost>available+1e-6){
   return isDemo(session.mode)?'assets.withdraw.error.insufficientBalance':'overlay.ui.insufficientBalanceSwitchToDemoToTryThisLocally'
  }
  return {draft,amount,price,estimate,rate}
 }

 function confirm(kind,side,{draft,amount,price,estimate,rate}){
  const {futures,options,spot}=drafts,name=pair().name
  const pending=kind!=='options'&&(kind==='futures'?futures.type:spot.type)==='limit'
  const action=kind==='spot'?(side==='buy'?'trade.buy':'trade.sell'):(side==='buy'?'trade.buyLong':'trade.sellShort')
  // One request id per confirmation, so a retried call cannot place a second order.
  const params={kind,side,marketName:name,type:pending?'limit':'market',amount,price:pending?price:undefined,
   leverage:kind==='futures'?futures.leverage:undefined,duration:kind==='options'?options.duration:undefined,
   takeProfit:kind==='futures'&&futures.stops?futures.tp:'',stopLoss:kind==='futures'&&futures.stops?futures.sl:'',
   requestId:crypto.randomUUID()}
  const summary=t('trade.form.confirm',{quantity:fmt(estimate.quantity),unit:kind==='options'?'USDT':balances.base,price:fmt(price)})
  let committed=false,placed=null
  const placedMode=session.mode
  openModal('account-confirm',`${t(action)} · ${name}`,{focusCancel:true,confirmLabel:'overlay.ui.confirmOrder',
   description:summary+(kind==='options'?` · ${periodLabel(options.duration)} · ${rate}%`:''),
   // Async confirm: the dialog shows busy and holds its close paths; a rejection keeps it open with a toast.
   onConfirm:async()=>{
    if(committed)return
    try{placed=await placeTradeOrder({mode:session.mode,...params})}
    catch(cause){throw new Error(tradeErrorKey(cause))}
    committed=true
    if(kind!=='options')notice.value=t('trade.orderSuccess')
    draft.amount=''
    invalidate('trade')
   },
   // Delivery orders (GMXX): once the confirmation has closed, open the order dialog with its countdown and result;
   // its 下單成功 toast is shown there so it sits in the dialog's top layer.
   afterDone:kind==='options'?()=>{
    if(placed)openModal('delivery-order',pair().name,{mode:placedMode,order:placed,returnFocus:focusAmount})
   }:undefined,
  })
 }

 function submit(side){
  const kind=mode(),key=kind==='spot'?side:kind
  clearError(key);clearNotice()
  const order=check(kind,side)
  if(typeof order==='string'){errors[key]=order;return}
  confirm(kind,side,order)
 }

 return {errors,notice,clearError,clearNotice,submit}
}
