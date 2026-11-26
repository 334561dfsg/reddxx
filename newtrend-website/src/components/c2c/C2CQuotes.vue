<script setup>
import {computed,ref,onMounted,onUnmounted} from 'vue'
import Coin from '../Coin.vue'
import C2CIcon from './C2CIcon.vue'
import {c2cQuotes,c2cSellQuotes,formatQuote} from '../../utils/c2cQuotes'
const props=defineProps({selected:String,side:{type:String,default:'buy'}})
const quotes=computed(()=>props.side==='sell'?c2cSellQuotes:c2cQuotes)
const emit=defineEmits(['select'])
const assets=ref([]),fiat=ref(false),now=ref(Date.now())
const started=Date.now()
let clock
onMounted(()=>{clock=setInterval(()=>{now.value=Date.now()},1000)})
onUnmounted(()=>clearInterval(clock))
const filtered=computed(()=>quotes.value.filter(q=>(!assets.value.length||assets.value.includes(q.symbol))&&(!fiat.value||q.fiat==='USDT')))
function toggle(symbol){assets.value=assets.value.includes(symbol)?assets.value.filter(s=>s!==symbol):[...assets.value,symbol]}
function remaining(q){return q.ttl-Math.floor((now.value-started)/1000)%q.ttl}
function countdown(q){const seconds=remaining(q);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`}
</script>
<template>
<section class="c2c-quotes" aria-labelledby="c2c-quotes-title">
 <h2 id="c2c-quotes-title">{{ $t('c2c.quotes.title') }}</h2>
 <div class="c2c-filters">
  <div class="c2c-filter"><span>{{ $t('c2c.quotes.filterAsset') }}</span><div class="c2c-pills" role="group" :aria-label="$t('c2c.quotes.filterAsset')"><button role="checkbox" :aria-checked="!assets.length" :class="{active:!assets.length}" @click="assets=[]">{{ $t('c2c.quotes.all') }}</button><button v-for="q in quotes" :key="q.symbol" role="checkbox" :aria-checked="assets.includes(q.symbol)" :class="{active:assets.includes(q.symbol)}" @click="toggle(q.symbol)"><Coin set="logo" :symbol="q.symbol"/>{{ q.symbol }}</button></div></div>
  <div class="c2c-filter"><span>{{ $t('c2c.quotes.filterFiat') }}</span><div class="c2c-pills" role="group" :aria-label="$t('c2c.quotes.filterFiat')"><button role="checkbox" :aria-checked="!fiat" :class="{active:!fiat}" @click="fiat=false">{{ $t('c2c.quotes.all') }}</button><button role="checkbox" :aria-checked="fiat" :class="{active:fiat}" @click="fiat=!fiat"><Coin set="logo" symbol="USDT"/>USDT</button></div></div>
 </div>
 <div class="c2c-quote-grid">
  <button v-for="q in filtered" :key="q.symbol" class="c2c-quote" :class="{selected:selected===q.symbol}" :aria-pressed="selected===q.symbol" @click="emit('select',q)">
   <div class="c2c-quote-top"><div class="c2c-quote-identity"><span class="c2c-coin-pair"><Coin set="logo" :symbol="q.symbol"/><Coin set="logo" symbol="USDT"/></span><div><div class="c2c-pair-name">{{ q.symbol }}<span> / USDT</span></div><div class="c2c-price">{{ formatQuote(q.price) }}<small>USDT</small></div></div></div><span class="c2c-timer" :class="{warning:remaining(q)<60}" :aria-label="$t('c2c.quotes.expiresIn')+' '+countdown(q)"><C2CIcon name="timer"/>{{ countdown(q) }}</span></div>
   <div class="c2c-limits"><span>{{ $t('c2c.quotes.limitRange') }}</span><span>{{ $t('c2c.quotes.minMax',{min:formatQuote(q.min),max:formatQuote(q.max),asset:q.symbol}) }}</span></div>
   <p v-if="q.note" class="c2c-quote-note">{{ q.note }}</p>
  </button>
 </div>
</section>
</template>
