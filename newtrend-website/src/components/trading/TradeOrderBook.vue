<script setup>
import {ref} from 'vue'
import {fmt} from '../../data'
defineProps({pair:Object})
const display=ref('both')
</script>
<template>
<section class="terminal-panel orderbook" :aria-label="$t('trade.orderBook')">
  <div class="book-controls"><button v-for="view in ['both','bid','ask']" :key="view" :aria-pressed="display===view" :aria-label="$t('trade.pages.'+view)" :title="$t('trade.pages.'+view)" @click="display=view"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><rect x="1" y="1" width="22" height="22" rx="1" fill="none" stroke="currentColor"/><rect v-for="row in 3" :key="'left-'+row" x="3" :y="3+(row-1)*6" width="5" height="5" :fill="view==='bid'?'var(--nt-green)':view==='ask'?'var(--nt-red)':row===1?'var(--nt-red)':'var(--nt-green)'"/><rect v-for="row in 3" :key="'right-'+row" x="10" :y="3+(row-1)*6" width="11" height="5" fill="currentColor" opacity=".65"/></svg></button></div>
  <div class="book-head"><span>{{ $t('trade.ui.priceUsd') }}</span><span>{{ $t('trade.quantity') }}<small>{{ pair.symbol }}</small></span><span>{{ $t('trade.total') }}<small>USDT</small></span></div>
  <div class="book-body">
    <div v-for="side in (display==='both'?['ask','bid']:[display])" :key="side" class="book-side">
      <div v-if="(side==='bid'||display==='ask')" class="book-price" :class="pair.change<0?'negative':'positive'">{{ fmt(pair.price) }} {{ pair.change<0?'↓':'↑' }}</div>
      <div v-for="n in (display==='both'?7:14)" :key="n" class="book-row" :class="{bid:side==='bid'}" :style="{'--depth':(n*7+13)+'%'}"><span :class="side==='bid'?'positive':'negative'">{{ fmt(pair.price+(side==='ask'?(display==='both'?8:15)-n:-n)*pair.price*.00002) }}</span><span>{{ (n*.0017).toFixed(4) }}</span><span>{{ fmt(n*.0017*(pair.price+(side==='ask'?(display==='both'?8:15)-n:-n)*pair.price*.00002)) }}</span></div>
    </div>
  </div>
</section>
</template>
