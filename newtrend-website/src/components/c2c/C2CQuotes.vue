<script setup>
import LineIcon from '../ui/LineIcon.vue'
import {computed,ref,onMounted,onUnmounted} from 'vue'
import Coin from '../Coin.vue'
import {formatQuote} from '../../utils/c2cQuotes'
import Skeleton from '../ui/Skeleton.vue'
// quotes is null while loading: headings and filter labels stay, pills and quote cards are skeletons.
// skeletonCount mirrors the usual number of quotes for the side so the grid keeps its loaded height.
const props=defineProps({selected:String,quotes:{type:Array,default:null},skeletonCount:{type:Number,default:4},skeletonNote:Boolean})
const loading=computed(()=>!props.quotes)
const quotes=computed(()=>props.quotes||[])
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
  <div class="c2c-filter"><span>{{ $t('c2c.quotes.filterAsset') }}</span><div class="c2c-pills" role="group" :aria-label="$t('c2c.quotes.filterAsset')"><button role="checkbox" :aria-checked="!assets.length" :class="{active:!assets.length}" @click="assets=[]">{{ $t('c2c.quotes.all') }}</button><template v-if="loading"><Skeleton v-for="n in skeletonCount" :key="n" width="72px" height="32px" class="c2c-skeleton-pill"/></template><button v-for="q in quotes" :key="q.symbol" role="checkbox" :aria-checked="assets.includes(q.symbol)" :class="{active:assets.includes(q.symbol)}" @click="toggle(q.symbol)"><Coin set="logo" :symbol="q.symbol"/>{{ q.symbol }}</button></div></div>
  <div class="c2c-filter"><span>{{ $t('c2c.quotes.filterFiat') }}</span><div class="c2c-pills" role="group" :aria-label="$t('c2c.quotes.filterFiat')"><button role="checkbox" :aria-checked="!fiat" :class="{active:!fiat}" @click="fiat=false">{{ $t('c2c.quotes.all') }}</button><button role="checkbox" :aria-checked="fiat" :class="{active:fiat}" @click="fiat=!fiat"><Coin set="logo" symbol="USDT"/>USDT</button></div></div>
 </div>
 <span v-if="loading" role="status" class="sr-only">{{ $t('common.loading') }}</span>
 <div class="c2c-quote-grid">
  <div v-for="n in (loading?skeletonCount:0)" :key="'s'+n" class="c2c-quote c2c-skeleton-quote" aria-hidden="true"><div class="c2c-quote-top c2c-skeleton-top"><div class="c2c-quote-identity"><Skeleton width="44px" height="28px"/><div class="c2c-skeleton-lines"><Skeleton width="96px" height="16px"/><Skeleton width="120px" height="24px"/></div></div><Skeleton width="56px" height="22px"/></div><div class="c2c-limits c2c-skeleton-limits"><Skeleton width="72px" height="14px"/><Skeleton width="160px" height="14px"/></div><p v-if="skeletonNote" class="c2c-quote-note"><Skeleton inline width="80%"/></p></div>
  <button v-for="q in filtered" :key="q.symbol" class="c2c-quote" :class="{selected:selected===q.symbol}" :aria-pressed="selected===q.symbol" @click="emit('select',q)">
   <div class="c2c-quote-top"><div class="c2c-quote-identity"><span class="c2c-coin-pair"><Coin set="logo" :symbol="q.symbol"/><Coin set="logo" symbol="USDT"/></span><div><div class="c2c-pair-name">{{ q.symbol }}<span> / USDT</span></div><div class="c2c-price">{{ formatQuote(q.price) }}<small>USDT</small></div></div></div><span class="c2c-timer" :class="{warning:remaining(q)<60}" :aria-label="$t('c2c.quotes.expiresIn')+' '+countdown(q)"><LineIcon set="c2c" name="timer"/>{{ countdown(q) }}</span></div>
   <div class="c2c-limits"><span>{{ $t('c2c.quotes.limitRange') }}</span><span>{{ $t('c2c.quotes.minMax',{min:formatQuote(q.min),max:formatQuote(q.max),asset:q.symbol}) }}</span></div>
   <p v-if="q.note" class="c2c-quote-note">{{ q.note }}</p>
  </button>
 </div>
</section>
</template>
<style>.c2c-skeleton-pill{border-radius:999px}.c2c-skeleton-lines{display:grid;gap:6px;min-width:0}.c2c-skeleton-quote{pointer-events:none}.c2c-skeleton-top{height:54.5px;box-sizing:border-box}.c2c-skeleton-limits{height:31.5px;box-sizing:border-box;align-items:center}</style>
