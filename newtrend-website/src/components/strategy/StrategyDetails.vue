<script setup>
import {fmt} from '../../data'
defineProps({product:{type:Object,required:true}})
</script>
<template>
<div class="strategy-details">
 <section><h3>{{ product.name }}</h3><div class="strategy-badges"><span class="strategy-market">{{ $t(product.market) }}</span><span>{{ $t(product.style) }}</span><span>Lv.{{ product.risk }}</span></div></section>
 <section class="strategy-metrics"><div><small>{{ $t('aiQuant.templates.fields.sharpeRatio') }}</small><strong>{{ product.sharpe.toFixed(2) }}</strong><p>{{ $t('aiQuant.detail.explain.sharpeRatio') }}</p></div><div><small>{{ $t('aiQuant.templates.fields.winRate') }}</small><strong>{{ product.win }}%</strong><p>{{ $t('aiQuant.detail.explain.winRate') }}</p></div></section>
 <section><h4>{{ $t('aiQuant.detail.descriptionTitle') }}</h4><p>{{ product.description }}</p></section>
 <section><h4>{{ $t('aiQuant.detail.paramsTitle') }}</h4><dl class="strategy-card-facts"><div><dt>{{ $t('aiQuant.templates.fields.capital',{asset:'USDT'}) }}</dt><dd>{{ fmt(product.min) }} – {{ fmt(product.max) }}</dd></div><div><dt>{{ $t('aiQuant.templates.fields.period') }}</dt><dd>{{ $t('aiQuant.detail.periodValue',{min:product.minDays,max:product.maxDays}) }}</dd></div><div><dt>{{ $t('aiQuant.templates.fields.aiModel') }}</dt><dd>{{ $t('aiQuant.aiModelNames.local') }}</dd></div><div><dt>{{ $t('aiQuant.templates.fields.tradesPerDay') }}</dt><dd>{{ $t('aiQuant.templates.fields.tradesPerDayValue',{n:product.trades}) }}</dd></div><div><dt>{{ $t('aiQuant.templates.fields.riskLevel') }}</dt><dd>Lv.{{ product.risk }}</dd></div></dl><small>{{ $t('aiQuant.detail.explain.riskLevel') }}</small></section>
 <section><h4>{{ $t('aiQuant.templates.fields.supportedSymbols') }}</h4><div class="strategy-symbols"><span v-for="symbol in product.symbols" :key="symbol">{{ symbol }}</span></div></section>
</div>
</template>
