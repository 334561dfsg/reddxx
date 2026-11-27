<script setup>
import {computed} from 'vue'
import Markets from '../components/Markets.vue'
import {useTickers} from '../composables/useMarket.js'
import {streamMarkets} from '../api/market.js'
import {hotStocks} from '../data'
// 行情: the full market list (search + every market) for the mobile tab bar, sharing the home table and its stream.
const tickers=useTickers()
const quotes=computed(()=>streamMarkets.map(m=>{const q=tickers.data.value?.[m.id];return {...m,price:q?.price??null,change:q?q.change:null,reference:q?.reference}}))
const stocks=computed(()=>hotStocks.map(([symbol])=>{const q=quotes.value.find(m=>m.symbol===symbol);return {symbol,price:q?.price??null,change:q?.change??null,delta:q&&q.price!==null?q.price-q.reference:null}}))
</script>
<template><div class="markets-page"><Markets all :rows="quotes" :stocks="stocks"/></div></template>
<style scoped>.markets-page{padding-top:24px}</style>
