<script setup>
import {isoDateTime} from '../utils/format.js'
import {computed,ref,watch} from 'vue'
import {fmt} from '../data'
import {t} from '../i18n'
import {session,openModal} from '../session'
import {positionPnl} from '../utils/mockCurrentTrades'
import {finishTrade,tradeErrorKey} from '../api/trade.js'
import {invalidate} from '../composables/useRequest.js'
// prices: live price by market name; open positions mark to it so unrealised P&L moves with the stream.
const props=defineProps({rows:{type:Array,required:true},bucket:String,prices:{type:Object,default:()=>({})}})
const marked=o=>o.bucket==='positions'&&props.prices[o.marketName]?{...o,markPrice:props.prices[o.marketName]}:o
const liveRows=computed(()=>props.rows.map(marked))
const emit=defineEmits(['complete'])
const list=ref(null)
watch(()=>props.bucket,()=>{list.value?.scrollTo({top:0})})
function fields(o){
 const f=(label,value,type='number',unit='')=>({label,value,type,unit})
 return o.bucket==='positions'?[
  f('trade.history.positionValue',o.notional,'number','USDT'),f('trade.quantity',o.quantity),
  f('trade.entryPrice',o.price),f('trade.markPrice',o.markPrice),f('trade.margin',o.margin,'number','USDT'),
  f('trade.current.unrealized',positionPnl(o),'pnl','USDT'),f('trade.openTime',o.createdAt,'date')
 ]:[f('trade.orderTime',o.createdAt,'date'),f('trade.history.orderQuantity',o.quantity),
 f('trade.orderPrice',o.price),f('trade.history.filledQuantity',o.filledQuantity||0),
 f('trade.current.remaining',o.quantity-(o.filledQuantity||0)),f('trade.orderType',o.orderType,'key'),f('trade.status',o.recordStatus,'key')]
}
function value(f){if(f.value==null)return '—';if(f.type==='key')return t(f.value);if(f.type==='date')return isoDateTime(f.value);return (f.type==='pnl'&&f.value>0?'+':'')+fmt(f.value)}
function act(o){
 const closing=o.bucket==='positions',action=closing?'trade.closePosition':'trade.cancelOrder'
 openModal('account-confirm',`${t(action)} · ${o.marketName}`,{
  focusCancel:true,returnFocus:()=>document.querySelector('.record-tabs .active')?.focus(),confirmLabel:action,
  description:t(closing?'trade.current.confirmClose':'trade.current.confirmCancel',{pair:o.marketName,quantity:fmt(closing?o.quantity:o.quantity-(o.filledQuantity||0)),price:fmt(closing?o.markPrice:o.price)}),
  // Async confirm: closes at the server's last price; busy dialog, close paths held, rejection keeps it open with a toast.
  onConfirm:async()=>{
   try{await finishTrade({mode:session.mode,id:o.id})}
   catch(cause){invalidate('trade');throw new Error(cause.code==='conflict'?'c2c.error.generic':tradeErrorKey(cause))}
   invalidate('trade');emit('complete',t(closing?'trade.current.closed':'trade.current.cancelled',{pair:o.marketName}))
  }
 })
}
</script>
<template><div class="current-trades"><div ref="list" class="history-list">
<article v-for="o in liveRows" :key="o.id" class="history-card"><header><strong>{{ o.marketName }}</strong><span class="direction" :class="o.direction==='buy'?'positive':'negative'">{{ $t(o.kind==='spot'?(o.direction==='buy'?'trade.buy':'trade.sell'):(o.direction==='buy'?'trade.buyLong':'trade.sellShort')) }}</span><span v-if="o.kind==='futures'" class="history-tag">{{ o.leverage }}x</span><button class="record-action" :aria-label="$t(o.bucket==='positions'?'trade.closePosition':'trade.cancelOrder')+' '+o.marketName" @click="act(o)">{{ $t(o.bucket==='positions'?'trade.closePosition':'trade.cancelOrder') }}</button></header>
<dl><div v-for="f in fields(o)" :key="f.label"><dt>{{ $t(f.label) }}</dt><dd :class="f.type==='pnl'?(f.value>0?'positive':f.value<0?'negative':''):''">{{ value(f) }}<small v-if="f.unit"> {{ f.unit }}</small></dd></div></dl>
</article></div></div></template>

<style scoped src="../styles/trade-records.css"></style>
