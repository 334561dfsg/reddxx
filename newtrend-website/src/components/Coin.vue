<script setup>
import { computed } from 'vue'
import { markets,asset } from '../data'
const props=defineProps({symbol:String})
const coin=computed(()=>markets.find(m=>m.symbol===props.symbol))
</script>
<template><img v-if="coin?.image" :src="asset(coin.image)" :alt="$tr(symbol)" class="coin"/><img v-else-if="symbol==='USDT'" src="/newtrend/assets/usdt.svg" :alt="$tr(&quot;USDT&quot;)" class="coin"/><span v-else class="coin coin-text" aria-hidden="true">{{ $tr(symbol?.slice(0,2)) }}</span></template>
