<script setup>
import BackLink from '../ui/BackLink.vue'
// Reference detail card glow uses the coin's brand colour at ~33% alpha (USDT measured: #26a17b55).
const COIN_GLOW={USDT:'#26a17b',USDC:'#2775ca',BTC:'#f7931a',ETH:'#627eea',SOL:'#9945ff'}
const coinGlow=symbol=>(COIN_GLOW[symbol]||'#a5ff4a')+'55'
import EarnConditions from './EarnConditions.vue'
import {path,fmt} from '../../data'
import {openModal} from '../../session'
import {quotaPercent} from '../../utils/earnProducts'
import Coin from '../Coin.vue'
import Icon from '../Icon.vue'
import EarnIcon from './EarnIcon.vue'
import EarnTimeline from './EarnTimeline.vue'
defineProps({product:{type:Object,required:true}})
</script>
<template><article class="earn-detail">
<BackLink class="earn-back" :to="path('/earn/simple')">{{ $t('earn.productDetail.back') }}</BackLink>
<div class="earn-panel earn-detail-summary nt-glow-host"><span class="nt-glow glow-earn-detail" :style="{'--glow-color':coinGlow(product.symbol)}" aria-hidden="true"></span><div class="earn-product-line"><Coin :symbol="product.symbol"/><div><div class="earn-title-line"><h1>{{ product.name }}</h1><span v-if="product.hot" class="earn-hot"><EarnIcon name="flame"/>{{ $t('earn.badge.hot') }}</span></div><p class="earn-caption">{{ product.symbol }} · {{ product.days?$t('common.durationDays',{count:product.days}):$t('earn.tabs.flexible') }}</p></div></div><div class="earn-detail-rate"><div><strong>{{ product.rate.toFixed(4) }}%</strong><span>{{ $t('earn.dailyRate.label') }}</span></div><p class="earn-caption earn-mono">{{ $t('earn.apy.approx',{value:product.apy.toFixed(2)}) }}</p></div></div>
<section class="earn-panel"><h2><EarnIcon name="calendar"/>{{ $t('earn.timeline.title') }}</h2><EarnTimeline :days="product.days"/></section>
<div class="earn-detail-columns"><section class="earn-panel"><h2><Icon name="coins"/>{{ $t('earn.productDetail.groups.rules') }}</h2><dl><dt>{{ $t('earn.productDetail.keyFacts.min') }}</dt><dd>{{ fmt(product.min) }} {{ product.symbol }}</dd><dt>{{ $t('earn.productDetail.keyFacts.max') }}</dt><dd>{{ fmt(product.max) }} {{ product.symbol }}</dd><dt>{{ $t('earn.productDetail.keyFacts.perUserQuota') }}</dt><dd>{{ product.perUser==null?$t('earn.productDetail.unlimited'):fmt(product.perUser)+' '+product.symbol }}</dd></dl></section>
<section class="earn-panel"><h2><Icon name="layers"/>{{ $t('earn.productDetail.groups.quota') }}</h2><div class="earn-quota" role="progressbar" :aria-label="$t('earn.productDetail.quotaFilled',{percent:quotaPercent(product)})" :aria-valuenow="quotaPercent(product)" aria-valuemin="0" aria-valuemax="100"><span :style="{width:quotaPercent(product)+'%'}"></span></div><p class="earn-caption">{{ $t('earn.productDetail.quotaFilled',{percent:quotaPercent(product)}) }}</p><dl><dt>{{ $t('earn.productDetail.keyFacts.availableQuota') }}</dt><dd>{{ product.remaining }} {{ product.symbol }}</dd><dt>{{ $t('earn.productDetail.keyFacts.totalSubscribed') }}</dt><dd>{{ fmt(product.subscribed) }} {{ product.symbol }}</dd></dl></section></div>
<section class="earn-panel earn-risk"><h2>{{ $t('earn.productDetail.risk.title') }}</h2><ul><li>{{ product.risk }}</li><li>{{ $t('earn.productDetail.risk.notGuaranteed') }}</li><li v-if="product.days">{{ $t('earn.productDetail.risk.earlyRedemption') }}</li></ul></section>
<EarnConditions :product="product"/>
<div class="earn-detail-action"><div><strong class="earn-accent earn-mono">{{ product.rate.toFixed(4) }}%</strong><small>{{ $t('earn.dailyRate.suffix') }} · {{ product.days?$t('common.durationDays',{count:product.days}):$t('earn.tabs.flexible') }} · {{ $t('earn.products.min',{amount:fmt(product.min)+' '+product.symbol}) }}</small></div><button class="earn-buy" @click="openModal('earn-subscribe','earn.subscribe.title',product)">{{ $t('earn.actions.subscribe') }}</button></div>
</article></template>
