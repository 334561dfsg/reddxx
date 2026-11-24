<script setup>
import {computed,ref,watch} from 'vue'
import {fmt} from '../data'
import {historyFields} from '../utils/mockTradeHistory'
const props=defineProps({rows:{type:Array,required:true},bucket:String,modelValue:{type:Number,default:1}})
const emit=defineEmits(['update:modelValue'])
const page=computed({get:()=>props.modelValue,set:value=>emit('update:modelValue',value)}),scroller=ref(null),size=5
const pages=computed(()=>Math.max(1,Math.ceil(props.rows.length/size)))
const visible=computed(()=>props.rows.slice((page.value-1)*size,page.value*size))

watch(pages,n=>page.value=Math.min(page.value,n))
function go(n){page.value=n;scroller.value?.scrollTo({top:0,behavior:'instant'})}
function date(value){if(!value)return '—';return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(value))}
function direction(o){return o.kind==='spot'?(o.direction==='buy'?'trade.buy':'trade.sell'):(o.direction==='buy'?'trade.buyLong':'trade.sellShort')}
</script>
<template><div class="trade-history"><div ref="scroller" class="history-list">
<article v-for="o in visible" :key="o.id||o.createdAt" class="history-card">
<header><strong>{{ o.marketName }}</strong><span class="direction" :class="o.direction==='buy'?'positive':'negative'">{{ $t(o.bucket==='positionHistory'&&o.event?o.event:direction(o)) }}</span><span v-if="o.kind==='options'" class="history-tag">{{ o.duration ? $t('trade.durationSeconds',{value:o.duration}) : $t('trade.inProgress') }} · {{ $t(o.settled?'trade.settled':'trade.inProgress') }}</span><span v-else-if="o.kind==='futures'&&o.leverage" class="history-tag">{{ o.leverage }}x</span><span v-else-if="o.kind==='spot'" class="history-tag">{{ $t(o.recordStatus||'trade.orderPlaced') }}</span></header>
<dl><div v-for="f in historyFields(o)" :key="f.label"><dt>{{ $t(f.label) }}</dt><dd :class="f.type==='pnl'&&f.value!=null?(f.value>0?'positive':f.value<0?'negative':''):''">{{ f.value==null?'—':f.type==='date'?date(f.value):f.type==='key'?$t(f.value):(f.type==='pnl'&&f.value>0?'+':'')+fmt(f.value) }}<small v-if="f.unit&&f.value!=null"> {{ f.unit }}</small></dd></div></dl>
</article></div>
<nav v-if="pages>1" class="history-pagination" :aria-label="$t('trade.history.pagination')"><button :disabled="page===1" :aria-label="$t('trade.history.previousPage')" @click="go(page-1)">‹</button><button v-for="n in pages" :key="n" :aria-current="n===page?'page':undefined" :aria-label="$t('trade.history.page',{value:n})" @click="go(n)">{{ n }}</button><button :disabled="page===pages" :aria-label="$t('trade.history.nextPage')" @click="go(page+1)">›</button></nav>
</div></template>
<style scoped src="../styles/trade-records.css"></style>
