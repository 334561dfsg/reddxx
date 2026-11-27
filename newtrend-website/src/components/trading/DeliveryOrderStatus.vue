<script setup>
import {computed,nextTick,onBeforeUnmount,onMounted,ref,watch} from 'vue'
import FeedbackToast from '../../platform/FeedbackToast.js'
import {getTradeOrder} from '../../api/trade.js'
import {invalidate} from '../../composables/useRequest.js'
import {fmt} from '../../data'
import {t} from '../../i18n'
import {isoDateTime} from '../../utils/format.js'
import {deliveryCountdown as countdown} from '../../utils/deliveryCountdown.js'
// Delivery (交割) order dialog after GMXX: opens right after a delivery order is placed with a countdown ring for
// its period, then asks the server for the order once the period ends and shows the settled result (贏 / 輸 / 平),
// close price, P&L and close time. Closing it early is fine — the order still settles and the records refresh.
const props=defineProps({mode:{type:String,required:true},order:{type:Object,required:true}})
const order=ref(props.order)
const now=ref(Date.now())
const end=computed(()=>(order.value.openedAt??order.value.createdAt)+order.value.duration*1000)
const remaining=computed(()=>Math.max(0,Math.ceil((end.value-now.value)/1000)))
const progress=computed(()=>order.value.settled?0:Math.min(1,remaining.value/order.value.duration))
const R=52,C=2*Math.PI*R
let timer=null,fetching=false
function tick(){
 now.value=Date.now()
 if(order.value.settled){stop();return}
 if(remaining.value===0&&!fetching)settle()
}
async function settle(){
 fetching=true
 try{const next=await getTradeOrder({mode:props.mode,id:order.value.id});order.value=next;if(next.settled){stop();invalidate('trade')}}
 catch{/* the next tick asks again; the records list settles the order on its own as well */}
 finally{fetching=false}
}
function stop(){clearInterval(timer);timer=null}
timer=setInterval(tick,250)
onBeforeUnmount(stop)
function period(seconds){return seconds>=86400?t('trade.form.days',{value:seconds/86400}):t('trade.durationSeconds',{value:seconds})}
const shortId=computed(()=>{const id=String(order.value.id);return id.length>8?`${id.slice(0,3)}…${id.slice(-3)}`:id})
const pnl=computed(()=>order.value.settled?order.value.pnl:null)
const rows=computed(()=>[
 ['trade.quantity',`${fmt(order.value.amount)} USDT`],
 ['trade.history.pnl',pnl.value==null?'—':`${pnl.value>0?'+':''}${fmt(pnl.value)} USDT`,pnl.value>0?'positive':pnl.value<0?'negative':''],
 ['trade.entryPrice',fmt(order.value.price)],
 ['trade.closePrice',order.value.settled?fmt(order.value.closePrice):'—'],
 ['trade.period',period(order.value.duration)],
 ['trade.payoutRate',`${order.value.rate}%`],
])
const copyNotice=ref('')
async function copyId(){
 copyNotice.value='';await nextTick()
 try{await navigator.clipboard.writeText(String(order.value.id));copyNotice.value='common.copied'}catch{copyNotice.value='common.copyFailed'}
}
watch(()=>props.order.id,()=>{order.value=props.order})
// 下單成功 toast: mounted once the dialog is open, so it renders in the dialog's top layer, not under it.
const announce=ref(false)
onMounted(()=>requestAnimationFrame(()=>{announce.value=true}))
</script>
<template>
<div class="delivery-order">
 <div class="delivery-order-tags">
  <span class="delivery-tag" :class="order.direction==='buy'?'up':'down'">{{ $t(order.direction==='buy'?'trade.buyUp':'trade.buyDown') }}</span>
  <span v-if="order.settled" class="delivery-tag" :class="order.result">{{ $t('trade.deliveryResult.'+order.result) }}</span>
 </div>
 <div v-if="!order.settled" class="delivery-ring" role="timer" aria-live="off" :aria-label="$t('trade.deliveryRemaining',{time:countdown(remaining)})">
  <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" :r="R" class="track"/><circle cx="60" cy="60" :r="R" class="bar" :stroke-dasharray="C" :stroke-dashoffset="C*(1-progress)"/></svg>
  <strong v-if="remaining">{{ countdown(remaining) }}</strong>
  <strong v-else class="settling" role="status">{{ $t('trade.deliverySettling') }}</strong>
 </div>
 <dl class="delivery-fields">
  <div v-for="[label,value,tone] in rows" :key="label"><dt>{{ $t(label) }}</dt><dd :class="tone">{{ value }}</dd></div>
  <div><dt>{{ $t('trade.orderId') }}</dt><dd class="delivery-id"><span :title="String(order.id)">{{ shortId }}</span><button type="button" :aria-label="$t('common.copy')+' '+$t('trade.orderId')" @click="copyId"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg></button></dd></div>
  <div><dt>{{ $t('trade.openTime') }}</dt><dd>{{ isoDateTime(order.openedAt??order.createdAt) }}</dd></div>
  <div><dt>{{ $t('trade.closeTime') }}</dt><dd>{{ order.settled?isoDateTime(order.closedAt):'—' }}</dd></div>
 </dl>
 <FeedbackToast v-if="announce" type="success" :source="() => $t('trade.orderSuccess')"/>
 <FeedbackToast v-if="copyNotice" :type="copyNotice==='common.copied'?'success':'error'" :source="() => $t(copyNotice)"/>
</div>
</template>
<style>
.delivery-order{display:grid;gap:16px}
.delivery-order-tags{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:24px}
.delivery-tag{display:inline-flex;align-items:center;padding:2px 10px;border-radius:6px;font-size:12px;line-height:20px;font-weight:600}
.delivery-tag.up,.delivery-tag.win{background:color-mix(in srgb,var(--nt-green,var(--nt-up)) 16%,transparent);color:var(--nt-green,var(--nt-up))}
.delivery-tag.down,.delivery-tag.lose{background:color-mix(in srgb,var(--nt-red,#e34a68) 16%,transparent);color:var(--nt-red,#e34a68)}
.delivery-tag.draw{background:var(--nt-border-strong);color:#c5c7cb}
.delivery-tag.win,.delivery-tag.lose,.delivery-tag.draw{margin-left:auto}
.delivery-ring{position:relative;justify-self:center;width:112px;height:112px}
.delivery-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.delivery-ring circle{fill:none;stroke-width:8}
.delivery-ring .track{stroke:var(--nt-border-strong)}
.delivery-ring .bar{stroke:var(--nt-accent,#b3ff60);stroke-linecap:round;transition:stroke-dashoffset 250ms linear}
.delivery-ring strong{position:absolute;inset:0;display:grid;place-items:center;font-size:22px;line-height:28px;font-weight:700;font-variant-numeric:tabular-nums;color:#fff}
/* At the end of the period the ring shows 結算中… in its centre, so the dialog keeps its height. */
.delivery-ring strong.settling{padding:0 14px;font-size:13px;line-height:18px;font-weight:600;text-align:center;color:#c5c7cb}
.delivery-fields{display:grid;gap:10px;margin:0}
.delivery-fields>div{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:20px}
.delivery-fields dt{font-size:13px;line-height:20px;color:var(--nt-text-quiet)}
.delivery-fields dd{margin:0;font-size:13px;line-height:20px;color:#fff;font-variant-numeric:tabular-nums;text-align:right}
.delivery-fields dd.positive{color:var(--nt-green,var(--nt-up))}.delivery-fields dd.negative{color:var(--nt-red,#e34a68)}
.delivery-id{display:inline-flex;align-items:center;gap:4px}
.delivery-id button{display:grid;place-items:center;width:32px;height:32px;margin:-6px -8px -6px 0;padding:0;border:0;border-radius:8px;background:none;color:#c5c7cb}
.delivery-id button:hover,.delivery-id button:focus-visible{outline:none;background:var(--nt-border-strong);color:#fff}
.delivery-id svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
@media(prefers-reduced-motion:reduce){.delivery-ring .bar{transition:none}}
</style>
