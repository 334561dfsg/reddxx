<script setup>
import { computed } from 'vue'
import { markets,asset } from '../data'
const props=defineProps({symbol:String})
const coin=computed(()=>markets.find(m=>m.symbol===props.symbol))
</script>
<template><img v-if="coin?.image" :src="asset(coin.image)" :alt="$t(symbol)" class="coin"/><img v-else-if="symbol==='USDT'" src="/NewQuantCapital/assets/usdt.svg" :alt="$t(&quot;USDT&quot;)" class="coin"/><span v-else class="coin coin-text" aria-hidden="true">{{ $t(symbol?.slice(0,2)) }}</span></template>
