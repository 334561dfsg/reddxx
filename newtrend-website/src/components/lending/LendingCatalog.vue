<script setup>
import FinancePagination from '../FinancePagination.vue'
import {useFinancePagination} from '../../composables/useFinancePagination'
import {loanRateRange} from '../../platform/lendingRules.js'
import {path,fmt} from '../../data'
import Coin from '../Coin.vue'
import Icon from './LendingIcon.vue'
const props=defineProps({products:{type:Array,default:()=>[]}})
defineEmits(['borrow'])

const {page,total,shown}=useFinancePagination(()=>props.products,6)
</script>
<template>
 <header class="loan-market-hero">
  <div><span class="loan-market-eyebrow">{{$t('margin.market.subtitle')}}</span><h1>{{$t('margin.market.title')}}</h1><p>{{$t('margin.market.description')}}</p></div>
  <RouterLink :to="path('/earn/loan/my')" class="loan-market-mine">{{$t('margin.market.myLoans')}}<Icon name="arrow-right"/></RouterLink>
 </header>
 <div class="loan-market-grid">
  <article v-for="p in shown" :key="p.productId" class="loan-market-card">
   <div class="loan-market-coin"><Coin :symbol="p.loanCurrency"/><span :title="p.productName">{{p.loanCurrency}}</span></div>
   <div class="loan-market-rate"><div><span>{{$t('margin.market.dailyRate')}}</span><strong>{{loanRateRange(p.loanTerms)}}<small>%</small></strong></div><span>{{$t('lending.apr')}} {{loanRateRange(p.loanTerms,true)}}%</span></div>
   <dl class="loan-market-facts"><div><dt>{{$t('margin.market.borrowRange')}}</dt><dd>{{fmt(p.minLoanAmount)}} – {{fmt(p.maxLoanAmount)}} {{p.loanCurrency}}</dd></div><div><dt>{{$t('margin.market.term')}}</dt><dd class="loan-market-terms"><span v-for="term in p.loanTerms" :key="term.days">{{$t('margin.market.termDays',{days:term.days})}}</span></dd></div></dl>
   <RouterLink :to="path('/earn/loan/borrow')+'?product='+encodeURIComponent(p.productId)+'&currency='+encodeURIComponent(p.loanCurrency)" class="loan-market-cta" :aria-label="$t('margin.market.borrowCta')+' · '+p.productName" @click="$emit('borrow',p)">{{$t('margin.market.borrowCta')}}<Icon name="arrow-right"/></RouterLink>
  </article>
 </div>
 <FinancePagination v-model:page="page" :total="total" :page-size="6"/>
</template>
