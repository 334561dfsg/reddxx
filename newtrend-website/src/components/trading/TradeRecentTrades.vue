<script setup>
import {computed} from 'vue'
import {fmt} from '../../data'
const props=defineProps({pair:Object})
const timestamp=Date.now()
const rows=computed(()=>Array.from({length:18},(_,i)=>({id:i,time:new Date(timestamp-i*2300).toLocaleTimeString('en-GB'),side:i%3===0?'sell':'buy',price:props.pair.price*(1+(i%5-2)*.00002),quantity:(i%7+1)*.0027})))
</script>
<template><section class="recent-trades" :aria-label="$t('trade.pages.latestTrades')"><h2 class="panel-heading">{{ $t('trade.pages.latestTrades') }}</h2><div class="prints-head"><span>{{ $t('trade.pages.time') }}</span><span>{{ $t('trade.pages.direction') }}</span><span>{{ $t('trade.price') }}<small>USDT</small></span><span>{{ $t('trade.quantity') }}<small>{{ pair.symbol }}</small></span></div><div class="prints-list"><div v-for="row in rows" :key="row.id" class="print-row"><span>{{ row.time }}</span><span :class="row.side==='buy'?'positive':'negative'">{{ $t('trade.'+row.side) }}</span><span>{{ fmt(row.price) }}</span><span>{{ row.quantity.toFixed(4) }}</span></div></div></section></template>
