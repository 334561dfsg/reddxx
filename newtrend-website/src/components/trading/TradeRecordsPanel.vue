<script setup>
import EmptyState from '../ui/EmptyState.vue'
import {message} from 'ant-design-vue'
import {computed,onBeforeUnmount,watch} from 'vue'
import {session} from '../../session'
import {tradeProducts} from '../../utils/tradeProducts'
import {historyBuckets} from '../../utils/mockTradeHistory'
import Skeleton from '../ui/Skeleton.vue'
import RequestState from '../ui/RequestState.vue'
import {listTradeRecords} from '../../api/trade.js'
import {useRequest} from '../../composables/useRequest.js'
import '../../styles/trade-records.css'
import CurrentTrades from '../CurrentTrades.vue'
import TradeHistory from '../TradeHistory.vue'
// prices: live price by market name (from the workspace's ticker stream) for open positions' P&L.
// compact: phone layout, records render as cards instead of table rows.
const props=defineProps({mode:String,state:Object,prices:{type:Object,default:()=>({})},compact:Boolean})
const tabs=computed(()=>tradeProducts[props.mode].tabs)
const selected=computed(()=>tabs.value.find(tab=>tab.id===props.state.record)||tabs.value[0])
// One request per tab and mode; a new order, close or cancel invalidates 'trade' and refreshes it in place.
const records=useRequest(()=>listTradeRecords(session.mode,props.mode,selected.value.id),{key:()=>session.mode+'|'+props.mode+'|'+selected.value.id,tags:['trade']})
const rows=computed(()=>records.data.value||[])
const loading=computed(()=>records.status.value==='loading')
const page=computed({get:()=>props.state.pages[selected.value.id]||1,set:value=>props.state.pages[selected.value.id]=value})
// Delivery orders settle when their period ends: refresh the list just after the earliest open one expires.
let expiryTimer=null
watch(rows,list=>{
 clearTimeout(expiryTimer)
 const ends=list.filter(o=>o.bucket==='optionsOrders'&&!o.settled&&o.duration).map(o=>(o.openedAt??o.createdAt)+o.duration*1000)
 if(!ends.length)return
 const delay=Math.min(...ends)-Date.now()+500
 if(delay<2147483647)expiryTimer=setTimeout(()=>records.refresh(),Math.max(500,delay))
})
onBeforeUnmount(()=>clearTimeout(expiryTimer))
// One toast per completed close/cancel, even when the text repeats (AGENTS: call toast explicitly per attempt).
const announce=text=>message.success(text)
</script>
<template>
<section class="terminal-panel records-panel" :aria-label="$t('trade.pages.records')">
  <div class="record-tabs"><button v-for="tab in tabs" :key="tab.id" :class="{active:selected.id===tab.id}" :aria-pressed="selected.id===tab.id" @click="state.record=tab.id">{{ $t(tab.label) }}</button></div>
  <RequestState v-if="records.status.value==='error'" :status="records.status.value" :error="records.error.value" @retry="records.refresh"/>
  <!-- Phone layout: card-shaped placeholders matching the record cards (no table header). -->
  <ul v-else-if="loading&&compact" class="record-cards records-skeleton" aria-busy="true"><li class="sr-only" role="status">{{ $t('common.loading') }}</li><li v-for="n in 3" :key="n" class="record-card" aria-hidden="true"><div class="record-card-head"><Skeleton inline width="96px"/><Skeleton inline width="48px"/></div><dl><div v-for="f in 6" :key="f"><dt><Skeleton inline width="56px"/></dt><dd><Skeleton inline width="72px"/></dd></div></dl></li></ul>
  <div v-else-if="loading" class="current-trades records-skeleton"><span role="status" class="sr-only">{{ $t('common.loading') }}</span><div class="history-list"><table class="record-table" aria-hidden="true"><thead><tr><th>{{ $t('trade.pair') }}</th><th v-for="f in 6" :key="f"><Skeleton inline width="56px"/></th></tr></thead><tbody><tr v-for="n in 6" :key="n"><th class="record-pair"><Skeleton inline width="120px"/></th><td v-for="f in 6" :key="f"><Skeleton inline width="72px"/></td></tr></tbody></table></div></div>
  <EmptyState v-else-if="!rows.length" class="empty" :text="$t('trade.pages.emptyRecords')"/>
  <TradeHistory v-else-if="historyBuckets.includes(selected.bucket)" :key="selected.id" v-model="page" :rows="rows" :bucket="selected.bucket" :compact="compact"/>
  <CurrentTrades v-else :key="selected.id" :rows="rows" :bucket="selected.bucket" :prices="prices" :compact="compact" @complete="announce"/>
</section>
</template>
