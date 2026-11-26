<script setup>
import {useAmountMask} from '../../composables/useAmountMask.js'
import LineIcon from '../ui/LineIcon.vue'
import {money as formatMoney} from '../../utils/format.js'
import {session} from '../../session'
import {computed} from 'vue'
import {products} from '../../data'
import {earnPortfolioFor} from '../../earnPortfolio'
import {earnSummary} from '../../utils/mockEarnPortfolio'
const {hidden,toggle,masked}=useAmountMask()
const summary=computed(()=>earnSummary(earnPortfolioFor(session.mode),products))
const metrics=[['principal','principal'],['accruedReward','accrued'],['cumulativeReward','cumulative']]
const money=value=>masked(formatMoney(value)+' USDT')
</script>
<template>
<section class="earn-panel portfolio-summary nt-glow-host"><span class="nt-glow" aria-hidden="true"></span>
 <p class="earn-caption">{{ $t('earn.myEarnings.summary.usdNote') }}</p>
 <div class="portfolio-summary-body"><div class="portfolio-total">
  <div class="portfolio-total-label"><span>{{ $t('earn.myEarnings.summary.totalValue') }}</span><button type="button" :aria-label="$t(hidden?'assets.show':'assets.hide')" :title="$t(hidden?'assets.show':'assets.hide')" :aria-pressed="hidden" @click="toggle"><LineIcon :name="hidden?'eye-off':'eye'" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"/></button></div>
  <strong class="portfolio-total-value earn-mono">{{ money(summary.total) }}</strong>
  <p class="portfolio-daily"><strong class="earn-mono">{{ masked('+'+money(summary.daily)) }}</strong><span>{{ $t('earn.myEarnings.summary.dailyEstimatedReward') }}</span></p>
 </div><dl class="portfolio-metrics"><div v-for="[label,key] in metrics" :key="key"><dt>{{ $t('earn.myEarnings.summary.'+label) }}</dt><dd class="earn-mono" :class="{positive:key==='cumulative'}">{{ money(summary[key]) }}</dd></div></dl></div>
</section>
</template>
