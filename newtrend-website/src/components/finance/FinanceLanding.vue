<script setup>
import '../../styles/quant-fidelity.css'
import Icon from '../Icon.vue'
import QuantAmbient from '../quant/QuantAmbient.vue'
import {computed} from 'vue'
import {path} from '../../data'
import {availableInMode} from '../../utils/demoAccess.js'
// Finance home (/earn), user request 2026-11-27: the 金融 tab gets its own landing like AI Quant instead of opening
// Earn directly. Same markup and scale as the AI Quant landing (.quant-landing): hero (hidden on phones) and one card
// per product line — Earn, C2C, Loans — with kicker, name, value line, two chips, a browse action and a "mine" footer.
const allLines=[
 {key:'earn',icon:'piggy-bank',to:'/earn/simple',mine:'/earn/my-earnings'},
 {key:'c2c',icon:'users',to:'/c2c/buy',mine:'/c2c/orders'},
 {key:'loan',icon:'hand-coins',to:'/earn/loan',mine:'/earn/loan/my'},
]
// The demo account shows Earn only (no C2C or lending).
const lines=computed(()=>allLines.filter(line=>availableInMode(line.to)))
</script>
<template>
<div class="page-wrap quant-page quant-landing finance-landing"><QuantAmbient/>
 <div class="page-hero"><small class="page-kicker">{{ $t('finance.landing.eyebrow') }}</small><h1 class="page-title">{{ $t('finance.landing.title') }}</h1><p class="page-desc">{{ $t(lines.length===1?'finance.landing.subtitleDemo':'finance.landing.subtitle') }}</p></div>
 <div class="two-cols quant-intro finance-intro" :class="{single:lines.length===1}">
  <div v-for="(line,i) in lines" :key="line.key" class="card nt-glow-host"><span class="nt-glow glow-quant-channel" :class="{green:i%2}" aria-hidden="true"></span>
   <div class="coin-label"><Icon :name="line.icon" green/><div><small class="page-kicker">{{ $t('finance.landing.'+line.key+'.kicker') }}</small><h2>{{ $t('finance.landing.'+line.key+'.name') }}</h2></div></div>
   <p>{{ $t('finance.landing.'+line.key+'.valueProp') }}</p>
   <div class="quant-chips"><span class="tag-chip">{{ $t('finance.landing.'+line.key+'.chipA') }}</span> <span class="tag-chip">{{ $t('finance.landing.'+line.key+'.chipB') }}</span></div>
   <RouterLink class="pill primary" :to="path(line.to)">{{ $t('finance.landing.'+line.key+'.browse') }} <Icon name="arrow-right"/></RouterLink>
   <RouterLink class="card-footer" :to="path(line.mine)"><span>{{ $t('finance.landing.'+line.key+'.mine') }}</span><small>{{ $t('finance.landing.'+line.key+'.mineHint') }}</small></RouterLink>
  </div>
 </div>
</div>
</template>
<style>
#main-content .finance-landing .finance-intro{grid-template-columns:repeat(3,minmax(0,1fr))}
#main-content .finance-landing .finance-intro.single{grid-template-columns:minmax(0,480px)}
@media(max-width:1023px){#main-content .finance-landing .finance-intro{grid-template-columns:1fr}}
</style>
