<script setup>
import FeedbackToast from '../platform/FeedbackToast.js'
import {computed,reactive,ref,watch} from 'vue'
import {session,openModal} from '../session'
import Skeleton from './ui/Skeleton.vue'
import {getTradeBalances,placeTradeOrder,tradeErrorKey} from '../api/trade.js'
import {invalidate,useRequest} from '../composables/useRequest.js'
import {streamStale} from '../composables/useMarket.js'
import {fmt} from '../data'
import {t} from '../i18n'
import RecordFilter from './RecordFilter.vue'
import {useOrderDrafts} from '../composables/tradePageState'
import {deliveryPeriods,leverageOptions,orderEstimate,validStops,tradeFeeRate} from '../utils/orderFormModel'
const props=defineProps({mode:String,pair:Object})
const {futures,options,spot}=useOrderDrafts()
const errors=reactive({futures:'',options:'',buy:'',sell:''}),notice=ref('')
// Balances come from the trade API for the current mode and pair (skeletons until loaded). `pair.price` is the
// live stream price, null until the first ticker arrives.
const demo=computed(()=>session.mode==='common.demo.demo')
const base=computed(()=>props.pair.name.split('/')[0])
const balances=useRequest(()=>getTradeBalances(session.mode,['USDT',base.value]),{key:()=>session.mode+'|'+base.value,tags:['trade','wallet']})
const balancesReady=computed(()=>balances.status.value==='ready')
const cash=computed(()=>balances.data.value?.USDT??0),holdings=computed(()=>balances.data.value?.[base.value]??0)
const leverageItems=leverageOptions.map(value=>({value,label:`${value}x`}))
const periodItems=computed(()=>deliveryPeriods.map(([value,payout])=>({value,label:`${period(value)} · ${payout}%`})))
const rate=computed(()=>deliveryPeriods.find(p=>p[0]===options.duration)[1])
const futurePrice=computed(()=>futures.type==='market'?props.pair.price:Number(futures.price))
const futureEstimate=computed(()=>orderEstimate({kind:'futures',amount:futures.amount,price:futurePrice.value,leverage:futures.leverage}))
const maxOpen=computed(()=>cash.value/(1/futures.leverage+tradeFeeRate))
const optionEstimate=computed(()=>orderEstimate({kind:'options',amount:options.amount,rate:rate.value}))
function spotPrice(side){return spot.type==='market'?props.pair.price:Number(spot[side].price)}
function spotEstimate(side){return orderEstimate({kind:'spot',side,amount:spot[side].amount,price:spotPrice(side)})}
function period(seconds){return seconds>=86400?t('trade.form.days',{value:seconds/86400}):t('trade.durationSeconds',{value:seconds})}
function percentage(kind,percent,side='buy'){
 if(!balancesReady.value)return
 const capacity=kind==='futures'?maxOpen.value:kind==='options'?cash.value:side==='buy'?cash.value/(1+tradeFeeRate):holdings.value
 const value=Math.floor(capacity*percent/100*1e6)/1e6
 if(kind==='futures')futures.amount=String(value)
 else if(kind==='options')options.amount=String(value)
 else spot[side].amount=String(value)
 errors[kind==='spot'?side:kind]='';notice.value=''
}
watch(()=>[props.mode,props.pair.id,session.mode],()=>{Object.keys(errors).forEach(k=>errors[k]='');notice.value=''})
function submit(side){
 const kind=props.mode,key=kind==='spot'?side:kind
 errors[key]='';notice.value=''
 if(!session.loggedIn){errors[key]='trade.ui.signInToTheLocalDemoFirst';return}
 // No live price or a dropped market connection: hold the order (prices may be outdated).
 if(streamStale.value||props.pair.price===null||!balancesReady.value){errors[key]='trade.stream.unavailable';return}
 const draft=kind==='futures'?futures:kind==='options'?options:spot[side],amount=Number(draft.amount)
 const price=kind==='futures'?futurePrice.value:kind==='spot'?spotPrice(side):props.pair.price
 if(!Number.isFinite(amount)||amount<=0){errors[key]='trade.ui.enterAValidOrderAmount';return}
 if(kind==='options'&&amount<100){errors[key]='trade.amountBelowMinimum';return}
 if(!Number.isFinite(price)||price<=0){errors[key]='trade.spotErrorInvalidSizingInput';return}
 const estimate=orderEstimate({kind,side,amount,price,leverage:futures.leverage,rate:rate.value})
 if(kind==='futures'&&futures.stops&&!validStops(side,price,futures.tp,futures.sl)){errors[key]='trade.form.invalidStops';return}
 const cost=kind==='futures'?estimate.margin+estimate.fee:kind==='options'?amount:side==='buy'?amount+estimate.fee:amount
 const available=kind==='spot'&&side==='sell'?holdings.value:cash.value
 if(cost>available+1e-6){errors[key]=demo.value?'assets.withdraw.error.insufficientBalance':'overlay.ui.insufficientBalanceSwitchToDemoToTryThisLocally';return}
 const pending=kind!=='options'&&(kind==='futures'?futures.type:spot.type)==='limit'
 const action=kind==='spot'?(side==='buy'?'trade.buy':'trade.sell'):(side==='buy'?'trade.buyLong':'trade.sellShort')
 const record={id:crypto.randomUUID(),kind,marketName:props.pair.name,direction:side,price,markPrice:props.pair.price,amount,symbol:'USDT',...estimate,
  leverage:kind==='futures'?futures.leverage:undefined,orderType:pending?'trade.limit':'trade.market',filledQuantity:pending?0:estimate.quantity,
  bucket:kind==='options'?'optionsOrders':kind==='spot'?(pending?'spotOpenOrders':'spotOrdersHistory'):(pending?'openOrders':'positions'),
  duration:kind==='options'?options.duration:undefined,rate:kind==='options'?rate.value:undefined,
  takeProfit:kind==='futures'&&futures.stops?Number(futures.tp)||null:null,stopLoss:kind==='futures'&&futures.stops?Number(futures.sl)||null:null,
  fee:pending?0:estimate.fee,recordStatus:pending?'trade.current.pending':'trade.filled',settled:kind==='spot'&&!pending}
 let committed=false
 openModal('account-confirm',`${t(action)} · ${props.pair.name}`,{focusCancel:true,confirmLabel:'overlay.ui.confirmOrder',
  description:t('trade.form.confirm',{quantity:fmt(estimate.quantity),unit:kind==='options'?'USDT':base.value,price:fmt(price)})+(kind==='options'?` · ${period(options.duration)} · ${rate.value}%`:''),
  // Async confirm: the dialog shows busy and holds its close paths; a rejection keeps it open with a toast.
  onConfirm:async()=>{if(committed)return
   try{await placeTradeOrder({mode:session.mode,order:record,sizing:{kind,side,pending,estimate,amount,base:base.value}})}
   catch(cause){throw new Error(tradeErrorKey(cause))}
   committed=true;notice.value=t('trade.orderSuccess');draft.amount='';invalidate('trade')}
 })
}
</script>
<template><div class="trade-order-form" :class="{'spot-order-form':mode==='spot'}">
<div class="form-body" tabindex="0" role="region" :aria-label="$t(mode==='futures'?'trade.futuresOrder':mode==='options'?'trade.optionsOrder':'common.spot')">
<template v-if="mode==='futures'">
<div class="type-tabs price-tabs"><button v-for="type in ['market','limit']" :key="type" :class="{active:futures.type===type}" :aria-pressed="futures.type===type" @click="futures.type=type">{{ $t('trade.'+type) }}</button></div>
<dl class="form-summary"><dt>{{ $t('trade.form.availableQuantity') }}</dt><dd><template v-if="balancesReady">{{ fmt(cash) }}</template><Skeleton v-else inline width="72px"/> USDT</dd></dl>
<label v-if="futures.type==='limit'">{{ $t('trade.price') }} (USDT)<input class="trade-field" v-model="futures.price" inputmode="decimal" :placeholder="$t('trade.enterPrice')"/></label>
<label>{{ $t('trade.leverage') }}<RecordFilter id="order-leverage" v-model="futures.leverage" variant="field" :label="$t('trade.leverage')" :options="leverageItems"/></label>
<label>{{ $t('trade.quantity') }} (USDT)<input class="trade-field" v-model="futures.amount" inputmode="decimal" :placeholder="$t('trade.enterQuantity')" :aria-invalid="!!errors.futures" :aria-describedby="errors.futures?'futures-form-error':undefined" @input="errors.futures=''"/></label>
<div class="percentages"><button v-for="n in [25,50,75,100]" :key="n" @click="percentage('futures',n)">{{ n }}%</button></div>
<dl class="form-summary"><dt class="positive">{{ $t('trade.form.maxOpen') }}</dt><dd class="positive"><template v-if="balancesReady&&pair.price!==null">{{ fmt(maxOpen) }}</template><Skeleton v-else inline width="72px"/> USDT</dd><dt>{{ $t('trade.form.initialMargin') }}</dt><dd>{{ fmt(futureEstimate.margin) }} USDT</dd><dt>{{ $t('trade.fee') }}</dt><dd>{{ fmt(futureEstimate.fee) }} USDT</dd></dl>
<label class="check-label"><input v-model="futures.stops" type="checkbox"/>{{ $t('trade.form.stops') }}</label>
<template v-if="futures.stops"><label>{{ $t('trade.tpPrice') }} (USDT)<input class="trade-field" v-model="futures.tp" inputmode="decimal" :placeholder="$t('trade.enterPrice')"/></label><label>{{ $t('trade.slPrice') }} (USDT)<input class="trade-field" v-model="futures.sl" inputmode="decimal" :placeholder="$t('trade.enterPrice')"/></label></template>
<FeedbackToast v-if="errors.futures" id="futures-form-error" type="error" :source="() => (errors.futures) ? ($t(errors.futures)) : ''"></FeedbackToast>
</template>
<template v-else-if="mode==='options'">
<div class="direction-tabs"><button v-for="side in ['buy','sell']" :key="side" :class="{active:options.side===side,buy:side==='buy',sell:side==='sell'}" :aria-pressed="options.side===side" @click="options.side=side">{{ $t(side==='buy'?'trade.buyLong':'trade.sellShort') }}</button></div>
<dl class="form-summary"><dt>{{ $t('trade.form.tradingAsset') }}</dt><dd>USDT</dd><dt>{{ $t('trade.form.availableQuantity') }}</dt><dd><template v-if="balancesReady">{{ fmt(cash) }}</template><Skeleton v-else inline width="72px"/></dd><dt>{{ $t('trade.form.minimum') }}</dt><dd>100.00 USDT</dd><dt>{{ $t('trade.fee') }}</dt><dd>{{ fmt(optionEstimate.fee) }} USDT</dd></dl>
<label>{{ $t('trade.period') }} / {{ $t('trade.payoutRate') }}<RecordFilter id="order-period" v-model="options.duration" variant="field" :label="$t('trade.period')" :options="periodItems"/></label>
<label>{{ $t('trade.quantity') }} (USDT)<input class="trade-field" v-model="options.amount" inputmode="decimal" :placeholder="$t('trade.enterQuantity')" :aria-invalid="!!errors.options" :aria-describedby="errors.options?'options-form-error':undefined" @input="errors.options=''"/></label>
<div class="percentages"><button v-for="n in [25,50,75,100]" :key="n" @click="percentage('options',n)">{{ n }}%</button></div>
<dl class="form-summary"><dt>{{ $t('trade.expectedReturn') }}</dt><dd class="positive">{{ options.amount?'+'+fmt(optionEstimate.expected)+' USDT':'—' }}</dd></dl>
<FeedbackToast v-if="errors.options" id="options-form-error" type="error" :source="() => (errors.options) ? ($t(errors.options)) : ''"></FeedbackToast>
</template>
<template v-else>
<div class="direction-tabs"><button v-for="side in ['buy','sell']" :key="side" :class="[side,{active:(spot.side||'buy')===side}]" :aria-pressed="(spot.side||'buy')===side" @click="spot.side=side;notice=''">{{ $t('trade.'+side) }}</button></div>
<div class="type-tabs price-tabs"><button v-for="type in ['market','limit']" :key="type" :class="{active:spot.type===type}" :aria-pressed="spot.type===type" @click="spot.type=type">{{ $t('trade.'+type) }}</button></div>
<section v-for="side in [spot.side||'buy']" :key="side" class="spot-side" :aria-label="$t('trade.'+side)">
<label v-if="spot.type==='limit'">{{ $t(side==='buy'?'trade.form.buyPrice':'trade.form.sellPrice') }} (USDT)<input class="trade-field" v-model="spot[side].price" inputmode="decimal" :placeholder="$t('trade.enterPrice')"/></label>
<label>{{ $t(side==='buy'?'trade.form.buyAmount':'trade.form.sellQuantity') }} ({{ side==='buy'?'USDT':base }})<span class="spot-amount-field"><input class="trade-field" v-model="spot[side].amount" inputmode="decimal" :placeholder="$t('trade.enterQuantity')" :aria-invalid="!!errors[side]" :aria-describedby="errors[side]?'spot-'+side+'-error':undefined" @input="errors[side]=''"/><span aria-hidden="true">{{ side==='buy'?'USDT':base }}</span></span></label>
<div class="percentages"><button v-for="n in [25,50,75,100]" :key="n" @click="percentage('spot',n,side)">{{ n }}%</button></div>

<dl class="form-summary"><dt>{{ $t('trade.available') }}</dt><dd><template v-if="balancesReady">{{ fmt(side==='buy'?cash:holdings) }}</template><Skeleton v-else inline width="72px"/> {{ side==='buy'?'USDT':base }}</dd><dt>{{ $t(side==='buy'?'trade.form.canBuy':'trade.form.canSell') }}</dt><dd>{{ spotPrice(side)>0?fmt(side==='buy'?cash/(1+tradeFeeRate)/spotPrice(side):holdings*spotPrice(side)):'—' }} {{ side==='buy'?base:'USDT' }}</dd></dl>
<FeedbackToast v-if="errors[side]" :id="'spot-'+side+'-error'" type="error" :source="() => (errors[side]) ? ($t(errors[side])) : ''"></FeedbackToast>
</section>
</template>

</div>
<footer class="form-actions"><FeedbackToast v-if="notice" type="success" :source="() => (notice) ? (notice) : ''"/><div :class="{'action-pair':mode==='futures'}"><button v-if="mode==='options'" :class="options.side==='buy'?'buy':'sell'" @click="submit(options.side)">{{ $t(options.side==='buy'?'trade.buyLong':'trade.sellShort') }}</button><button v-else-if="mode==='spot'" :class="spot.side==='sell'?'sell':'buy'" @click="submit(spot.side||'buy')">{{ $t(spot.side==='sell'?'trade.sell':'trade.buy') }}</button><template v-else><button class="buy" @click="submit('buy')">{{ $t(mode==='spot'?'trade.buy':'trade.buyLong') }}</button><button class="sell" @click="submit('sell')">{{ $t(mode==='spot'?'trade.sell':'trade.sellShort') }}</button></template></div></footer>
</div></template>
<style scoped>
.spot-amount-field{position:relative;display:block}.spot-amount-field input{padding-right:65px}.spot-amount-field>span{position:absolute;right:12px;top:50%;transform:translateY(-50%)}
.trade-order-form{display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;font-size:12px;line-height:16px;color:var(--terminal-secondary)}
.form-body{display:flex;flex-direction:column;gap:12px;flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:8px 16px;scroll-padding:12px}
.form-body>*{flex-shrink:0}.account-line{display:flex;justify-content:space-between;align-items:center;color:var(--terminal-muted)}.account-tag{border:1px solid var(--terminal-divider);border-radius:var(--nt-radius-panel);padding:2px 8px}
.type-tabs,.percentages{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}.type-tabs button{padding:8px 12px;border-radius:var(--nt-radius-sm);background:#0c1017;font-size:14px;line-height:20px;min-height:36px;color:var(--terminal-muted)}.type-tabs button.active{color:#fff;background:var(--nt-green)}.direction-tabs button.active.sell{background:var(--nt-red)}
label{display:grid;gap:4px;font-size:12px;line-height:16px;color:var(--terminal-secondary)}
.percentages{grid-template-columns:repeat(4,minmax(0,1fr))}.percentages button{background:#0c1017;border:1px solid var(--terminal-divider);border-radius:var(--nt-radius-sm);min-height:28px;padding:4px;font-size:12px;line-height:16px}.percentages button:hover{background:var(--terminal-input)}
.form-summary{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px 12px;margin:0;font-size:12px;line-height:16px}.form-summary dt{color:var(--terminal-muted)}.form-summary dd{text-align:right;margin:0;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.form-summary .positive{color:var(--nt-green)}
.check-label{display:flex;align-items:center;gap:8px;min-height:28px}.check-label input{width:14px;height:14px;padding:0;min-height:0;margin:0;accent-color:var(--nt-accent)}
.spot-side{display:flex;flex-direction:column;gap:12px}.spot-side+.spot-side{border-top:1px solid var(--terminal-divider);padding-top:12px}.spot-side h3{font-family:inherit;font-weight:500;font-size:14px;line-height:20px;margin:0}
.form-actions{flex:none;padding:8px 16px max(12px,env(safe-area-inset-bottom));background:var(--nt-bg)}.form-actions>p{font-size:12px;margin:0 0 8px}.action-pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}.form-actions button{width:100%;min-height:40px;padding:10px 12px;border-radius:999px;font-size:14px;line-height:20px;color:#fff}.buy{background:var(--nt-green)}.sell{background:var(--nt-red)}.form-error{font-size:12px;line-height:18px;color:var(--nt-red)}button:focus-visible,a:focus-visible,.form-body:focus-visible{outline:none}
@media(pointer:coarse){.percentages button,.type-tabs button,.form-actions button{min-height:44px}}
</style>

<style src="../styles/trade-form-controls.css"></style>
