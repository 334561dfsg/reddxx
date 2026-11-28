<script setup>
import {computed,ref} from 'vue'
import {fmt} from '../../data'
import Skeleton from '../ui/Skeleton.vue'
import {useDepth} from '../../composables/useMarket.js'
// compact: phone layout (price and quantity only, like the GMXX mobile book). pickable: rows are buttons that emit
// their price so the order form can use it as the limit price.
const props=defineProps({pair:Object,compact:Boolean,pickable:Boolean})
const emit=defineEmits(['pick-price'])
const chosen=ref('both')
// The phone layout has no view switch (user decision, 2026-11-27) and always shows both sides.
const display=computed(()=>props.compact?'both':chosen.value)
// Pushed book for the pair (full book per push). Rows keep their count while loading so the panel never jumps.
const depth=useDepth(()=>props.pair.id)
const count=computed(()=>display.value==='both'?7:14)
// Asks are farthest-first; show the `count` nearest to the spread. Bids are nearest-first.
const rows=side=>{const book=depth.data.value;if(!book)return null;return side==='ask'?book.asks.slice(-count.value):book.bids.slice(0,count.value)}
// Depth like newtrendcapital.com/zh-TW/trade (read 2026-11-26): each row's background bar is the cumulative size from
// the spread out to that level as a share of the visible side, so bars step up away from the spread and are redrawn
// on every push (the reference's "background change"); 累計 is the running total (USDT) in the same direction.
const sideRows=side=>{
 const list=rows(side);if(!list)return null
 const order=side==='ask'?[...list].reverse():list
 let qty=0,value=0
 const out=order.map(([price,q])=>{qty+=q;value+=q*price;return {price,qty:q,cumQty:qty,cumValue:value}})
 const total=qty||1
 for(const row of out)row.share=Math.round(row.cumQty/total*10000)/100
 return side==='ask'?out.reverse():out
}
// 累計 is a USDT running total, not a price: 2 decimals from 1 up, at most 4 below (0.0026 instead of the price
// formatter's 0.00255906) and "<0.0001" for smaller totals, so the column stays one line on narrow desktop books.
const total=v=>v>=1?v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):v>0&&v<0.0001?'<0.0001':v.toLocaleString('en-US',{maximumFractionDigits:4})
</script>
<template>
<section class="terminal-panel orderbook" :aria-label="$t('trade.orderBook')">
  <div v-if="!compact" class="book-controls"><button v-for="view in ['both','bid','ask']" :key="view" :aria-pressed="display===view" :aria-label="$t('trade.pages.'+view)" :title="$t('trade.pages.'+view)" @click="chosen=view"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><rect x="1" y="1" width="22" height="22" rx="1" fill="none" stroke="currentColor"/><rect v-for="row in 3" :key="'left-'+row" x="3" :y="3+(row-1)*6" width="5" height="5" :fill="view==='bid'?'var(--nt-green)':view==='ask'?'var(--nt-red)':row===1?'var(--nt-red)':'var(--nt-green)'"/><rect v-for="row in 3" :key="'right-'+row" x="10" :y="3+(row-1)*6" width="11" height="5" fill="currentColor" opacity=".65"/></svg></button></div>
  <div class="book-head"><span>{{ $t('trade.ui.priceUsd') }}</span><span>{{ $t('trade.quantity') }}<small>{{ pair.symbol }}</small></span><span v-if="!compact">{{ $t('trade.total') }}<small>USDT</small></span></div>
  <div class="book-body" :aria-busy="!depth.ready.value||undefined">
    <div v-for="side in (display==='both'?['ask','bid']:[display])" :key="side" class="book-side">
      <div v-if="(side==='bid'||display==='ask')" class="book-price" :class="pair.change<0?'negative':'positive'"><template v-if="pair.price!==null">{{ fmt(pair.price) }} {{ pair.change<0?'↓':'↑' }}</template><Skeleton v-else inline width="96px"/></div>
      <template v-if="rows(side)"><component :is="pickable?'button':'div'" v-for="(row,i) in sideRows(side)" :key="side+i" class="book-row" :class="{bid:side==='bid'}" :style="{'--depth':row.share+'%'}" :type="pickable?'button':undefined" :aria-label="pickable?$t('trade.pages.usePrice',{price:fmt(row.price)}):undefined" @click="pickable&&emit('pick-price',row.price)"><span :class="side==='bid'?'positive':'negative'">{{ fmt(row.price) }}</span><span>{{ row.qty.toFixed(4) }}</span><span v-if="!compact">{{ total(row.cumValue) }}</span></component></template>
      <template v-else><div v-for="n in count" :key="n" class="book-row book-skeleton-row" aria-hidden="true"><span><Skeleton inline width="64px"/></span><span><Skeleton inline width="44px"/></span><span v-if="!compact"><Skeleton inline width="56px"/></span></div></template>
    </div>
  </div>
</section>
</template>
