<script setup>
import {fmt} from '../../data'
import OptionsChart from '../OptionsChart.vue'
import Skeleton from '../ui/Skeleton.vue'
import Spinner from '../ui/Spinner.vue'
import {computed} from 'vue'
import {useKline} from '../../composables/useMarket.js'
const props=defineProps({pair:Object,modelValue:String})
// Candles for the pair and interval from the market stream; switching either reloads with an overlay on the chart.
const kline=useKline(()=>props.pair.id,()=>props.modelValue)
const last=computed(()=>kline.data.value?.at(-1)||null)
const emit=defineEmits(['update:modelValue'])
const intervals=['trade.interval_1m','trade.interval_5m','trade.interval_15m','trade.interval_30m','trade.interval_1h','trade.interval_1d','trade.interval_1w','trade.interval_1M']
</script>
<template>
<section class="terminal-panel chart-panel" :aria-label="$t('trade.pages.chart')">
  <div class="timeframes"><button v-for="interval in intervals" :key="interval" :class="{active:modelValue===interval}" :aria-pressed="modelValue===interval" @click="emit('update:modelValue',interval)">{{ $t(interval) }}</button></div>
  <div class="ohlc"><span v-for="[label,key] in [['trade.open','open'],['trade.high','high'],['trade.low','low'],['trade.close','close']]" :key="key">{{ $t(label) }} <b><template v-if="last">{{ fmt(last[key]) }}</template><Skeleton v-else inline width="64px"/></b></span></div>
  <div class="chart-stage" :aria-busy="!kline.ready.value||undefined"><OptionsChart :candles="kline.data.value" :price="last?.close??pair.price" :interval="modelValue"/><div v-if="!kline.ready.value" class="chart-loading" role="status"><Spinner/><span>{{ $t('common.loading') }}</span></div></div>
</section>
</template>
<style>.chart-stage{position:relative;display:flex;flex:1;min-height:0;min-width:0}.chart-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:4px;font-size:12px;color:#ffffffa0;background:#05070b66}</style>
