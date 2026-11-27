<script setup>
import {computed} from 'vue'
import {fmt} from '../../data'
import icons from '../../icons.json'
const props=defineProps({product:{type:Object,required:true},featured:Boolean})
const emit=defineEmits(['detail','subscribe'])
// Layout and tokens follow the reference spotlight card (featured) and template card (catalog).
const style=computed(()=>props.product.style.split('.').at(-1))
const styleIcon=computed(()=>({conservative:'shield',balanced:'scale',aggressive:'flame'})[style.value])
const maxSymbols=computed(()=>props.featured?2:3)
const shownSymbols=computed(()=>props.product.symbols.slice(0,maxSymbols.value))
const hiddenSymbols=computed(()=>props.product.symbols.length-shownSymbols.value.length)
const winRate=computed(()=>Number(props.product.win).toFixed(1)+'%')
const capital=computed(()=>`${fmt(props.product.min)}–${fmt(props.product.max)}`)
// Mask icons inherit currentColor, so badge/button icons can use the reference tones.
const mask=name=>({'--sc-icon':`url(/NewQuantCapital/assets/${icons[name]})`})
</script>
<template>
<article v-if="featured" class="sc-card sc-featured" :class="'sc-'+style" @click="emit('detail',product)">
 <div class="sc-glow" aria-hidden="true"></div>
 <div class="sc-featured-head">
  <span class="sc-style-icon" aria-hidden="true"><span class="sc-icon" :style="mask(styleIcon)"></span></span>
  <div class="sc-featured-copy">
   <span class="sc-style-name">{{ $t('aiQuant.spotlight.styleBadge.'+style) }}</span>
   <div class="sc-badges"><span class="sc-badge sc-style-badge">{{ $t(product.style) }}</span><span class="sc-badge sc-risk" :title="$t('aiQuant.templates.fields.riskLevel')">{{ $t('aiQuant.templates.riskLevelValue',{level:product.risk}) }}</span></div>
  </div>
  <div class="sc-sharpe"><strong>{{ product.sharpe.toFixed(2) }}</strong><small>{{ $t('aiQuant.templates.fields.sharpeRatio') }}</small></div>
 </div>
 <h3 class="sc-featured-name"><button class="sc-title" :aria-label="$t('aiQuant.detail.openAria',{name:product.name})" @click.stop="emit('detail',product)">{{ product.name }}</button></h3>
 <p class="sc-description sc-clamp-2">{{ product.description }}</p>
 <dl class="sc-chip-fields">
  <div><dt>{{ $t('aiQuant.templates.fields.supportedSymbols') }}</dt><dd class="sc-symbols"><span v-for="symbol in shownSymbols" :key="symbol" class="sc-chip">{{ symbol }}</span><span v-if="hiddenSymbols" class="sc-chip sc-more">+{{ hiddenSymbols }}</span></dd></div>
  <div><dt>{{ $t('aiQuant.templates.fields.winRate') }}</dt><dd><span class="sc-chip">{{ winRate }}</span></dd></div>
  <div><dt>{{ $t('aiQuant.templates.fields.capital',{asset:'USDT'}) }}</dt><dd><span class="sc-chip">{{ capital }}</span></dd></div>
  <div><dt>{{ $t('aiQuant.templates.fields.aiModel') }}</dt><dd><span class="sc-chip">{{ $t('aiQuant.aiModelNames.local') }} · {{ $t('aiQuant.templates.fields.tradesPerDayValue',{n:product.trades}) }}</span></dd></div>
 </dl>
 <div class="sc-featured-action"><button type="button" class="sc-button sc-button-lg" @click.stop="emit('subscribe',product)">{{ $t('aiQuant.spotlight.subscribeNow') }}</button></div>
</article>
<article v-else class="sc-card sc-catalog" :class="'sc-'+style" @click="emit('detail',product)">
 <div class="sc-catalog-head">
  <h3><button class="sc-title" :aria-label="$t('aiQuant.detail.openAria',{name:product.name})" @click.stop="emit('detail',product)">{{ product.name }}</button></h3>
  <div class="sc-badges"><span class="sc-badge sc-market">{{ $t(product.market) }}</span><span class="sc-badge sc-style-badge">{{ $t(product.style) }}</span><span class="sc-badge sc-risk" :title="$t('aiQuant.templates.fields.riskLevel')">{{ $t('aiQuant.templates.riskLevelValue',{level:product.risk}) }}</span></div>
 </div>
 <div class="sc-metrics"><div><strong class="sc-accent">{{ product.sharpe.toFixed(2) }}</strong><small>{{ $t('aiQuant.templates.fields.sharpeRatio') }}</small></div><div><strong class="sc-signal">{{ winRate }}</strong><small>{{ $t('aiQuant.templates.fields.winRate') }}</small></div></div>
 <p class="sc-description sc-clamp-1">{{ product.description }}</p>
 <dl class="sc-facts">
  <div><dt>{{ $t('aiQuant.templates.fields.capital',{asset:'USDT'}) }}</dt><dd>{{ capital }}</dd></div>
  <div><dt>{{ $t('aiQuant.templates.fields.period') }}</dt><dd>{{ $t('aiQuant.detail.periodValue',{min:product.minDays,max:product.maxDays}) }}</dd></div>
 </dl>
 <div class="sc-symbol-block"><div class="sc-label">{{ $t('aiQuant.templates.fields.supportedSymbols') }}</div><div class="sc-symbols"><span v-for="symbol in shownSymbols" :key="symbol" class="sc-chip">{{ symbol }}</span><span v-if="hiddenSymbols" class="sc-chip sc-more">+{{ hiddenSymbols }}</span></div></div>
 <div class="sc-footer"><span class="sc-model"><span class="sc-icon sc-signal" :style="mask('bot')" aria-hidden="true"></span>{{ $t('aiQuant.aiModelNames.local') }} · {{ $t('aiQuant.templates.fields.tradesPerDayValue',{n:product.trades}) }}</span><button type="button" class="sc-button sc-button-sm" @click.stop="emit('subscribe',product)">{{ $t('aiQuant.templates.subscribe') }}<span class="sc-icon" :style="mask('arrow-up-right')" aria-hidden="true"></span></button></div>
</article>
</template>
