<script setup>
import {fmt} from '../../data'
import OptionsChart from '../OptionsChart.vue'
defineProps({pair:Object,modelValue:String})
const emit=defineEmits(['update:modelValue'])
const intervals=['trade.interval_1m','trade.interval_5m','trade.interval_15m','trade.interval_30m','trade.interval_1h','trade.interval_1d','trade.interval_1w','trade.interval_1M']
</script>
<template>
<section class="terminal-panel chart-panel" :aria-label="$t('trade.pages.chart')">
  <div class="timeframes"><button v-for="interval in intervals" :key="interval" :class="{active:modelValue===interval}" :aria-pressed="modelValue===interval" @click="emit('update:modelValue',interval)">{{ $t(interval) }}</button></div>
  <div class="ohlc"><span>{{ $t('trade.open') }} <b>{{ fmt(pair.price*1.0041) }}</b></span><span>{{ $t('trade.high') }} <b>{{ fmt(pair.price*1.0042) }}</b></span><span>{{ $t('trade.low') }} <b>{{ fmt(pair.price*.996) }}</b></span><span>{{ $t('trade.close') }} <b>{{ fmt(pair.price) }}</b></span></div>
  <OptionsChart :price="pair.price" :interval="modelValue"/>
</section>
</template>
