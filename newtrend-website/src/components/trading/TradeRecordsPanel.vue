<script setup>
import {message} from 'ant-design-vue'
import {computed} from 'vue'
import {session} from '../../session'
import {tradeProducts,selectProductRecords} from '../../utils/tradeProducts'
import {mockTradeHistory,historyBuckets} from '../../utils/mockTradeHistory'
import CurrentTrades from '../CurrentTrades.vue'
import TradeHistory from '../TradeHistory.vue'
const props=defineProps({mode:String,state:Object})
const tabs=computed(()=>tradeProducts[props.mode].tabs)
const selected=computed(()=>tabs.value.find(tab=>tab.id===props.state.record)||tabs.value[0])
const rows=computed(()=>selectProductRecords([...session.orders,...mockTradeHistory],props.mode,selected.value.id))
const page=computed({get:()=>props.state.pages[selected.value.id]||1,set:value=>props.state.pages[selected.value.id]=value})
// One toast per completed close/cancel, even when the text repeats (AGENTS: call toast explicitly per attempt).
const announce=text=>message.success(text)
</script>
<template>
<section class="terminal-panel records-panel" :aria-label="$t('trade.pages.records')">
  <div class="record-tabs"><button v-for="tab in tabs" :key="tab.id" :class="{active:selected.id===tab.id}" :aria-pressed="selected.id===tab.id" @click="state.record=tab.id">{{ $t(tab.label) }}</button></div>
  <div v-if="!rows.length" class="empty" role="status">{{ $t('trade.pages.emptyRecords') }}</div>
  <TradeHistory v-else-if="historyBuckets.includes(selected.bucket)" :key="selected.id" v-model="page" :rows="rows" :bucket="selected.bucket"/>
  <CurrentTrades v-else :key="selected.id" :rows="rows" :bucket="selected.bucket" @complete="announce"/>
</section>
</template>
