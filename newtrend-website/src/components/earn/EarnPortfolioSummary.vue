<script setup>
import {money as formatMoney} from '../../utils/format.js'
import {session} from '../../session'
import {computed,shallowRef} from 'vue'
import {products} from '../../data'
import {earnPortfolioFor} from '../../earnPortfolio'
import {earnSummary} from '../../utils/mockEarnPortfolio'
const hidden=shallowRef(false)
const summary=computed(()=>earnSummary(earnPortfolioFor(session.mode),products))
const metrics=[['principal','principal'],['accruedReward','accrued'],['cumulativeReward','cumulative']]
const money=value=>hidden.value?'****':formatMoney(value)+' USDT'
</script>
<template>
<section class="earn-panel portfolio-summary nt-glow-host"><span class="nt-glow" aria-hidden="true"></span>
 <p class="earn-caption">{{ $t('earn.myEarnings.summary.usdNote') }}</p>
 <div class="portfolio-summary-body"><div class="portfolio-total">
  <div class="portfolio-total-label"><span>{{ $t('earn.myEarnings.summary.totalValue') }}</span><button type="button" :aria-label="$t(hidden?'assets.show':'assets.hide')" :title="$t(hidden?'assets.show':'assets.hide')" :aria-pressed="hidden" @click="hidden=!hidden"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path v-if="hidden" d="m2 2 20 20"/></svg></button></div>
  <strong class="portfolio-total-value earn-mono">{{ money(summary.total) }}</strong>
  <p class="portfolio-daily"><strong class="earn-mono">{{ hidden?'****':'+'+money(summary.daily) }}</strong><span>{{ $t('earn.myEarnings.summary.dailyEstimatedReward') }}</span></p>
 </div><dl class="portfolio-metrics"><div v-for="[label,key] in metrics" :key="key"><dt>{{ $t('earn.myEarnings.summary.'+label) }}</dt><dd class="earn-mono" :class="{positive:key==='cumulative'}">{{ money(summary[key]) }}</dd></div></dl></div>
</section>
</template>
