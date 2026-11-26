<script setup>
import {computed,ref} from 'vue'
import {fmt} from '../../data'
import Skeleton from '../ui/Skeleton.vue'
import {useDepth} from '../../composables/useMarket.js'
const props=defineProps({pair:Object})
const display=ref('both')
// Pushed book for the pair (full book per push). Rows keep their count while loading so the panel never jumps.
const depth=useDepth(()=>props.pair.id)
const count=computed(()=>display.value==='both'?7:14)
// Asks are farthest-first; show the `count` nearest to the spread. Bids are nearest-first.
const rows=side=>{const book=depth.data.value;if(!book)return null;return side==='ask'?book.asks.slice(-count.value):book.bids.slice(0,count.value)}
const maxQty=computed(()=>{const book=depth.data.value;return book?Math.max(...book.asks.map(l=>l[1]),...book.bids.map(l=>l[1])):1})
</script>
<template>
<section class="terminal-panel orderbook" :aria-label="$t('trade.orderBook')">
  <div class="book-controls"><button v-for="view in ['both','bid','ask']" :key="view" :aria-pressed="display===view" :aria-label="$t('trade.pages.'+view)" :title="$t('trade.pages.'+view)" @click="display=view"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><rect x="1" y="1" width="22" height="22" rx="1" fill="none" stroke="currentColor"/><rect v-for="row in 3" :key="'left-'+row" x="3" :y="3+(row-1)*6" width="5" height="5" :fill="view==='bid'?'var(--nt-green)':view==='ask'?'var(--nt-red)':row===1?'var(--nt-red)':'var(--nt-green)'"/><rect v-for="row in 3" :key="'right-'+row" x="10" :y="3+(row-1)*6" width="11" height="5" fill="currentColor" opacity=".65"/></svg></button></div>
  <div class="book-head"><span>{{ $t('trade.ui.priceUsd') }}</span><span>{{ $t('trade.quantity') }}<small>{{ pair.symbol }}</small></span><span>{{ $t('trade.total') }}<small>USDT</small></span></div>
  <div class="book-body" :aria-busy="!depth.ready.value||undefined">
    <div v-for="side in (display==='both'?['ask','bid']:[display])" :key="side" class="book-side">
      <div v-if="(side==='bid'||display==='ask')" class="book-price" :class="pair.change<0?'negative':'positive'"><template v-if="pair.price!==null">{{ fmt(pair.price) }} {{ pair.change<0?'↓':'↑' }}</template><Skeleton v-else inline width="96px"/></div>
      <template v-if="rows(side)"><div v-for="[price,qty] in rows(side)" :key="price" class="book-row" :class="{bid:side==='bid'}" :style="{'--depth':Math.round(qty/maxQty*100)+'%'}"><span :class="side==='bid'?'positive':'negative'">{{ fmt(price) }}</span><span>{{ qty.toFixed(4) }}</span><span>{{ fmt(qty*price) }}</span></div></template>
      <template v-else><div v-for="n in count" :key="n" class="book-row book-skeleton-row" aria-hidden="true"><span><Skeleton inline width="64px"/></span><span><Skeleton inline width="44px"/></span><span><Skeleton inline width="56px"/></span></div></template>
    </div>
  </div>
</section>
</template>
