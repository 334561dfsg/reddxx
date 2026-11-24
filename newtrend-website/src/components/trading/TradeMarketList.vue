<script setup>
import {computed} from 'vue'
import {markets,path,fmt} from '../../data'
defineProps({pair:Object})
const rows=computed(()=>[...markets].sort((a,b)=>b.change-a.change))
</script>
<template>
<div class="market-browser spot-quote-browser">
  <div class="spot-market-head"><span>{{ $t('trade.pages.tradingPair') }}</span><span>{{ $t('trade.pages.latestPrice') }}</span><span>{{ $t('trade.chg') }}</span></div>
  <div class="pair-list spot-market-list">
    <div v-for="market in rows" :key="market.id" class="pair-row" :class="{selected:market.id===pair.id}">
      <RouterLink :to="path('/trade/spot/'+market.id)" :aria-current="market.id===pair.id?'page':undefined"><span>{{ market.name }}</span><span>{{ fmt(market.price) }}</span><span :class="market.change<0?'negative':'positive'">{{ market.change>=0?'+':'' }}{{ market.change.toFixed(2) }}%</span></RouterLink>
    </div>
  </div>
</div>
</template>
