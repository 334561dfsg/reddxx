<script setup>
import {isoDateTime} from '../utils/format.js'
import {computed,onBeforeUnmount,ref,watch} from 'vue'
import {t} from '../i18n'
import {deliveryCountdown} from '../utils/deliveryCountdown.js'
import {fmt} from '../data'
import {deliveryRemaining,deliveryResult,historyFields} from '../utils/mockTradeHistory'
// compact: phone layout, one card per record with the same fields.
const props=defineProps({rows:{type:Array,required:true},bucket:String,modelValue:{type:Number,default:1},compact:Boolean})
const emit=defineEmits(['update:modelValue'])
const page=computed({get:()=>props.modelValue,set:value=>emit('update:modelValue',value)}),scroller=ref(null),size=10
const pages=computed(()=>Math.max(1,Math.ceil(props.rows.length/size)))
const visible=computed(()=>props.rows.slice((page.value-1)*size,page.value*size))

watch(pages,n=>page.value=Math.min(page.value,n))
function go(n){page.value=n;scroller.value?.scrollTo({top:0,behavior:'instant'})}
const date=isoDateTime
// One line per record (user decision, 2026-11-26): the same fields as before, as table columns. A tab holds one product
// and record type, so the header is the union of the visible rows' field labels in order; a missing field shows —.
const columns=computed(()=>{const seen=new Map();for(const o of visible.value)for(const f of historyFields(o))if(!seen.has(f.label))seen.set(f.label,f.type);return [...seen].map(([label,type])=>({label,type}))})
const cell=(o,label)=>historyFields(o).find(f=>f.label===label)
// Delivery countdowns: one 1s clock while any visible delivery order is still running.
const now=ref(Date.now())
let clock=null
watch(visible,list=>{
 const running=list.some(o=>o.kind==='options'&&!o.settled&&o.duration)
 if(running&&!clock)clock=setInterval(()=>{now.value=Date.now()},1000)
 if(!running&&clock){clearInterval(clock);clock=null}
},{immediate:true})
onBeforeUnmount(()=>clearInterval(clock))
function period(seconds){return seconds>=86400?t('trade.form.days',{value:seconds/86400}):t('trade.durationSeconds',{value:seconds})}
// Display value of a field; `result` cells are rendered by the template (tag or countdown).
function show(f){
 if(!f||f.value==null)return '—'
 if(f.type==='date')return date(f.value)
 if(f.type==='key')return t(f.value)
 if(f.type==='duration')return period(f.value)
 if(f.type==='percent')return f.value+'%'
 return (f.type==='pnl'&&f.value>0?'+':'')+fmt(f.value)
}
function countdown(o){const left=deliveryRemaining(o,now.value);return left?deliveryCountdown(left):t('trade.deliverySettling')}
const tone=f=>f&&f.type==='pnl'&&f.value!=null?(f.value>0?'positive':f.value<0?'negative':''):''
function direction(o){return o.kind==='spot'?(o.direction==='buy'?'trade.buy':'trade.sell'):(o.direction==='buy'?'trade.buyLong':'trade.sellShort')}
</script>
<template><div class="trade-history"><div ref="scroller" class="history-list">
<ul v-if="compact" class="record-cards">
<li v-for="o in visible" :key="o.id||o.createdAt" class="record-card">
<div class="record-card-head"><strong>{{ o.marketName }}</strong><span class="direction" :class="o.direction==='buy'?'positive':'negative'">{{ $t(o.bucket==='positionHistory'&&o.event?o.event:direction(o)) }}</span><span v-if="o.kind==='futures'&&o.leverage" class="history-tag">{{ o.leverage }}x</span><span v-else-if="o.kind==='spot'" class="history-tag">{{ $t(o.recordStatus||'trade.orderPlaced') }}</span><span v-if="o.kind==='options'" class="record-card-result" :aria-label="$t('trade.deliveryResultLabel')"><span v-if="o.settled" class="result-tag" :class="deliveryResult(o)">{{ $t('trade.deliveryResult.'+deliveryResult(o)) }}</span><span v-else class="result-countdown" role="timer">{{ countdown(o) }}</span></span></div>
<dl><div v-for="f in historyFields(o).filter(f=>f.type!=='result')" :key="f.label" :class="{wide:f.type==='date'}"><dt>{{ $t(f.label) }}</dt><dd :class="tone(f)">{{ show(f) }}<small v-if="f.unit&&f.value!=null"> {{ f.unit }}</small></dd></div></dl>
</li>
</ul>
<table v-else class="record-table">
<thead><tr><th scope="col">{{ $t('trade.pair') }}</th><th v-for="c in columns" :key="c.label" scope="col" :class="{num:!['date','key','result'].includes(c.type)}">{{ $t(c.label) }}</th></tr></thead>
<tbody><tr v-for="o in visible" :key="o.id||o.createdAt">
<th scope="row" class="record-pair"><strong>{{ o.marketName }}</strong><span class="direction" :class="o.direction==='buy'?'positive':'negative'">{{ $t(o.bucket==='positionHistory'&&o.event?o.event:direction(o)) }}</span><span v-if="o.kind==='futures'&&o.leverage" class="history-tag">{{ o.leverage }}x</span><span v-else-if="o.kind==='spot'" class="history-tag">{{ $t(o.recordStatus||'trade.orderPlaced') }}</span></th>
<td v-for="c in columns" :key="c.label" :class="[{num:!['date','key','result'].includes(c.type)},tone(cell(o,c.label))]"><template v-for="f in [cell(o,c.label)]" :key="c.label"><template v-if="f&&f.type==='result'"><span v-if="o.settled" class="result-tag" :class="deliveryResult(o)">{{ $t('trade.deliveryResult.'+deliveryResult(o)) }}</span><span v-else class="result-countdown" role="timer">{{ countdown(o) }}</span></template><template v-else>{{ show(f) }}<small v-if="f&&f.unit&&f.value!=null"> {{ f.unit }}</small></template></template></td>
</tr></tbody>
</table></div>
<nav v-if="pages>1" class="history-pagination" :aria-label="$t('trade.history.pagination')"><button :disabled="page===1" :aria-label="$t('trade.history.previousPage')" @click="go(page-1)">‹</button><button v-for="n in pages" :key="n" :aria-current="n===page?'page':undefined" :aria-label="$t('trade.history.page',{value:n})" @click="go(n)">{{ n }}</button><button :disabled="page===pages" :aria-label="$t('trade.history.nextPage')" @click="go(page+1)">›</button></nav>
</div></template>
