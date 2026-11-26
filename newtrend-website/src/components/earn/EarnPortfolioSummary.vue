<script setup>
import {useAmountMask} from '../../composables/useAmountMask.js'
import LineIcon from '../ui/LineIcon.vue'
import Skeleton from '../ui/Skeleton.vue'
import {money as formatMoney} from '../../utils/format.js'
const {hidden,toggle,masked}=useAmountMask()
// summary is null while the portfolio loads: labels stay, values become inline skeletons of the same line height.
defineProps({summary:{type:Object,default:null}})
const metrics=[['principal','principal'],['accruedReward','accrued'],['cumulativeReward','cumulative']]
const money=value=>masked(formatMoney(value)+' USDT')
</script>
<template>
<section class="earn-panel portfolio-summary nt-glow-host"><span class="nt-glow" aria-hidden="true"></span>
 <p class="earn-caption">{{ $t('earn.myEarnings.summary.usdNote') }}</p>
 <div class="portfolio-summary-body"><div class="portfolio-total">
  <div class="portfolio-total-label"><span>{{ $t('earn.myEarnings.summary.totalValue') }}</span><button type="button" :aria-label="$t(hidden?'assets.show':'assets.hide')" :title="$t(hidden?'assets.show':'assets.hide')" :aria-pressed="hidden" @click="toggle"><LineIcon :name="hidden?'eye-off':'eye'" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"/></button></div>
  <strong class="portfolio-total-value earn-mono"><template v-if="summary">{{ money(summary.total) }}</template><Skeleton v-else inline width="280px"/></strong>
  <p class="portfolio-daily"><strong class="earn-mono"><template v-if="summary">{{ masked('+'+money(summary.daily)) }}</template><Skeleton v-else inline width="120px"/></strong><span>{{ $t('earn.myEarnings.summary.dailyEstimatedReward') }}</span></p>
 </div><dl class="portfolio-metrics"><div v-for="[label,key] in metrics" :key="key"><dt>{{ $t('earn.myEarnings.summary.'+label) }}</dt><dd class="earn-mono" :class="{positive:key==='cumulative'}"><template v-if="summary">{{ money(summary[key]) }}</template><Skeleton v-else inline width="140px"/></dd></div></dl></div>
</section>
</template>
