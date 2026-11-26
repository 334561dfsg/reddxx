<script setup>
import {computed} from 'vue'
import {fmt} from '../../data'
import {fundProgress} from '../../utils/quantFund'
import Coin from '../Coin.vue'
import Icon from '../Icon.vue'
// Matches the reference QuantFundProductCard: the whole card and its CTA both open the product detail page.
const props=defineProps({product:{type:Object,required:true}})
const emit=defineEmits(['open'])
const progress=computed(()=>fundProgress(props.product))
</script>
<template>
<article class="qf-card" @click="emit('open',product)">
 <div class="qf-card-glow" aria-hidden="true"></div>
 <div class="qf-card-head"><div class="qf-card-title"><Coin :symbol="product.asset"/><div><h3><button type="button" class="qf-card-link" @click.stop="emit('open',product)">{{ product.name }}</button></h3><span>{{ product.asset }}</span></div></div><span class="qf-risk" :class="product.riskLevel.toLowerCase()">{{ $t('aiQuant.quantFund.riskLevel.'+product.riskLevel) }}</span></div>
 <div class="qf-card-rate"><div><small>{{ $t('aiQuant.quantFund.card.dailyReturn') }}</small><p class="qf-rate">{{ product.averageDailyReturnPercent.toFixed(2) }}<span>%</span></p></div><div class="qf-term"><small><Icon name="calendar-clock"/>{{ $t('aiQuant.quantFund.card.term') }}</small><p>{{ product.termDays===null?$t('aiQuant.quantFund.card.termFlexible'):$t('aiQuant.quantFund.card.termDaysValue',{days:product.termDays}) }}</p></div></div>
 <div class="qf-limit"><small><Icon name="coins"/>{{ $t('aiQuant.quantFund.card.investmentLimit',{currency:product.asset}) }}</small><p>{{ fmt(product.minAmount) }} ~ {{ fmt(product.maxAmount) }} {{ product.asset }}</p></div>
 <div class="qf-progress"><div class="qf-progress-track" role="progressbar" :aria-valuenow="Math.round(progress)" aria-valuemin="0" aria-valuemax="100" :aria-label="$t('aiQuant.quantFund.card.projectProgress')"><span :style="{width:progress+'%'}"></span></div><div class="qf-progress-meta"><span>{{ $t('aiQuant.quantFund.card.projectProgress') }}</span><strong>{{ progress.toFixed(1) }}%</strong></div></div>
 <div class="qf-tags"><template v-if="product.termDays===null"><span class="accent">{{ $t('aiQuant.quantFund.card.tagFlexible') }}</span><span class="accent">{{ $t('aiQuant.quantFund.card.tagRedeemable') }}</span></template><span v-for="tag in product.strategyTags" :key="tag">{{ tag }}</span></div>
 <button type="button" class="qf-cta" @click.stop="emit('open',product)">{{ $t('aiQuant.quantFund.card.cta') }}</button>
</article>
</template>
