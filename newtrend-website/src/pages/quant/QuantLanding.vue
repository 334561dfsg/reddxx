<script setup>
import {path} from '../../data'
import Icon from '../../components/Icon.vue'
import QuantAmbient from '../../components/quant/QuantAmbient.vue'
import '../../styles/quant-fidelity.css'
import '../../styles/quant-system.css'
// AI 量化 channel home (/ai-quant): hero plus one card per product line (策略 and 量化基金), each with a browse action
// and a "mine" footer. Markup and scale are shared with the Finance landing (.quant-landing in quant-fidelity.css).
const lines=[
 {key:'strategy',icon:'bot',to:'/ai-quant/strategy',mineTo:'/ai-quant/strategy/mine',mineHint:'quant.ui.runningInstances'},
 {key:'quantFund',icon:'shield',to:'/ai-quant/quant-fund',mineTo:'/ai-quant/quant-fund/positions',mineHint:'quant.ui.subscriptionsAndInterest',green:true},
]
</script>
<template>
<div class="page-wrap quant-page quant-landing">
 <QuantAmbient/>
 <div class="page-hero">
  <small class="page-kicker">{{ $t('aiQuant.landing.eyebrow') }}</small>
  <h1 class="page-title">{{ $t('aiQuant.landing.title') }}</h1>
  <p class="page-desc">{{ $t('aiQuant.landing.subtitle') }}</p>
 </div>
 <div class="two-cols quant-intro">
  <div v-for="line in lines" :key="line.key" class="card nt-glow-host">
   <span class="nt-glow glow-quant-channel" :class="{green:line.green}" aria-hidden="true"></span>
   <div class="coin-label">
    <Icon :name="line.icon" green/>
    <div>
     <small class="page-kicker">{{ $t(`aiQuant.landing.${line.key}.kicker`) }}</small>
     <h2>{{ $t(`aiQuant.landing.${line.key}.name`) }}</h2>
    </div>
   </div>
   <p>{{ $t(`aiQuant.landing.${line.key}.valueProp`) }}</p>
   <div class="quant-chips">
    <span class="tag-chip">{{ $t(`aiQuant.landing.${line.key}.chipA`) }}</span> <span class="tag-chip">{{ $t(`aiQuant.landing.${line.key}.chipB`) }}</span>
   </div>
   <RouterLink class="pill primary" :to="path(line.to)">{{ $t(`aiQuant.landing.${line.key}.browse`) }} <Icon name="arrow-right"/></RouterLink>
   <RouterLink class="card-footer" :to="path(line.mineTo)">
    <span>{{ $t(`aiQuant.landing.${line.key}.mine`) }}</span>
    <small>{{ $t('quant.ui.private') }}{{ $t(line.mineHint) }}</small>
   </RouterLink>
  </div>
 </div>
</div>
</template>
