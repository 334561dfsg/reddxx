<script setup>
import FeedbackToast from '../../platform/FeedbackToast.js'
import {computed} from 'vue'
import NtSelect from '../ui/NtSelect.vue'
import {path,fmt} from '../../data'
import {annualLoanRate,loanRateRange} from '../../platform/lendingRules.js'
import Coin from '../Coin.vue'
import Icon from '../Icon.vue'
const props=defineProps({product:Object,amount:[String,Number],days:Number,collateral:String,profile:Object,wallet:Object,required:Number,estimated:Number,eligibility:Array,busy:Boolean,failure:String})
const emit=defineEmits(['update:amount','update:days','update:collateral','submit'])
const term=computed(()=>props.product.loanTerms.find(t=>t.days===Number(props.days)))
</script>
<template>
 <div class="loan-application">
  <header class="earn-panel loan-application-hero">
   <div class="earn-product-line"><Coin :symbol="product.loanCurrency"/><div><span class="earn-caption">{{$t('margin.market.subtitle')}}</span><h1>{{$t('margin.borrow.titleWithCurrency',{currency:product.loanCurrency})}}</h1><p class="earn-caption">{{product.productName}}</p></div></div>
   <div class="loan-application-rate"><span class="earn-caption">{{$t('lending.daily')}}</span><strong>{{term?loanRateRange([term]):'—'}}<small>%</small></strong><span class="earn-caption">{{$t('lending.apr')}} {{term?Number(annualLoanRate(term.dailyRate).toFixed(2)):'—'}}%</span></div>
  </header>
  <form class="loan-application-grid" novalidate @submit.prevent="emit('submit')">
   <div class="loan-application-main">
    <section class="earn-panel loan-application-fields">
     <h2><Icon name="coins"/>{{$t('lending.apply')}}</h2>
     <div class="loan-field"><label for="loan-amount">{{$t('lending.amount')}}</label><div class="loan-amount-control"><input id="loan-amount" :value="amount" @input="emit('update:amount',$event.target.value)" type="number" inputmode="decimal" :min="product.minLoanAmount" :max="product.maxLoanAmount" step="0.00000001" required :disabled="busy" placeholder="0.00" aria-describedby="loan-amount-range"/><span>{{product.loanCurrency}}</span></div><p id="loan-amount-range" class="earn-caption">{{$t('lending.range')}}: {{fmt(product.minLoanAmount)}} – {{fmt(product.maxLoanAmount)}} {{product.loanCurrency}}</p></div>
     <div class="loan-field"><label for="loan-term">{{$t('lending.term')}}</label><NtSelect variant="field" id="loan-term" class="loan-collateral-select" :value="days" :disabled="busy" :aria-label="$t('lending.term')" aria-required="true" :aria-invalid="!term" :show-search="false" :options="product.loanTerms.map(option=>({value:option.days,label:$t('margin.market.termDays',{days:option.days}),dailyRate:option.dailyRate}))" popup-class-name="loan-currency-popup" @change="emit('update:days',$event)"><template #option="{label,dailyRate}"><span class="loan-term-option"><span>{{label}}</span><small>{{$t('lending.daily')}} {{loanRateRange([{dailyRate}])}}%</small></span></template><template #suffixIcon><span aria-hidden="true">⌄</span></template></NtSelect><FeedbackToast v-if="!term" type="error" :source="() => (!term) ? ($t('lending.errors.term')) : ''"></FeedbackToast></div>
     <div v-if="product.collateralEnabled" class="loan-field"><label for="loan-collateral">{{$t('lending.collateral')}}</label><NtSelect variant="field" id="loan-collateral" class="loan-collateral-select" :value="collateral||undefined" :disabled="busy" :aria-label="$t('lending.collateral')" aria-required="true" :aria-invalid="!product.collateralCurrencies.includes(collateral)" :options="product.collateralCurrencies.map(value=>({value,label:value}))" :show-search="false" popup-class-name="loan-currency-popup" @change="emit('update:collateral',$event)"><template #option="{value}"><span class="loan-currency-option"><Coin :symbol="value"/><span>{{value}}</span></span></template><template #suffixIcon><span aria-hidden="true">⌄</span></template></NtSelect><div class="loan-field-meta"><span class="earn-caption">{{$t('lending.available')}}: {{fmt(wallet[collateral]||0)}} {{collateral}}</span><span class="earn-caption">{{$t('lending.initialCollateral')}}: {{Number((product.collateralMultiplier*100).toFixed(4))}}%</span></div><div class="loan-reserve"><span>{{$t('lending.reserve')}}</span><strong>{{fmt(required)}} {{collateral}}</strong></div></div>
    </section>
    <section class="earn-panel loan-application-conditions"><h2><Icon name="layers"/>{{$t('lending.requirements')}}</h2><dl><dt>{{$t('lending.verification')}}</dt><dd>{{!product.minVerificationLevel||product.minVerificationLevel==='none'?$t('lending.unrestricted'):$t('lending.levels.'+product.minVerificationLevel)}}</dd><dt>VIP</dt><dd>{{product.minVipLevel?'VIP'+product.minVipLevel:$t('lending.unrestricted')}}</dd></dl><p class="earn-caption">{{$t('lending.mockProfile')}}: {{$t('lending.levels.'+(profile?.verificationLevel||'none'))}} · VIP {{profile?.vipLevel||0}}</p><p v-for="reason in eligibility" :key="reason" class="earn-caption"><RouterLink :to="path(reason==='verificationRequired'?'/kyc':'/profile')">{{$t(reason==='verificationRequired'?'lending.goVerify':'lending.goVip')}}</RouterLink></p></section>
   </div>
   <aside class="earn-panel loan-application-summary">
    <h2>{{$t('lending.summary')}}</h2>
    <div class="loan-interest"><span class="earn-caption">{{$t('lending.estimated')}}</span><strong>{{fmt(estimated)}} <small>{{product.loanCurrency}}</small></strong></div>
    <dl><dt>{{$t('lending.amount')}}</dt><dd>{{amount?fmt(Number(amount)):'—'}} {{product.loanCurrency}}</dd><dt>{{$t('lending.term')}}</dt><dd>{{$t('margin.market.termDays',{days})}}</dd><dt>{{$t('lending.daily')}}</dt><dd>{{term?loanRateRange([term]):'—'}}%</dd><dt>{{$t('lending.apr')}}</dt><dd>{{term?Number(annualLoanRate(term.dailyRate).toFixed(2)):'—'}}%</dd><dt>{{$t('lending.penalty')}}</dt><dd>{{product.overduePenaltyRate}}%</dd><template v-if="product.collateralEnabled"><dt>{{$t('lending.reserve')}}</dt><dd>{{fmt(required)}} {{collateral}}</dd></template></dl>
    <p class="earn-caption">{{$t('lending.estimateNote')}}</p><p class="loan-application-note">{{$t('lending.pendingNote')}}</p>

    <button class="earn-buy nt-float-action" type="submit" :disabled="busy" :aria-busy="busy">{{$t('lending.submit')}}</button>
   </aside>
  </form>
 </div>
</template>
