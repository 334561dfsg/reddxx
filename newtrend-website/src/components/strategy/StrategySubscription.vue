<script setup>
import {computed,reactive,ref,watch} from 'vue'
import FeedbackToast from '../../platform/FeedbackToast.js'
import {session} from '../../session'
import {strategyAccountFor,strategyNotice,subscribeFor} from '../../strategyPortfolio'
import {strategyValidation} from '../../utils/strategyTemplates'
import {fmt,path} from '../../data'
const props=defineProps({product:{type:Object,required:true},closing:Boolean})
const emit=defineEmits(['state','close'])
const defaults={takeProfit:props.product.takeProfitRange?.default??10,stopLoss:props.product.stopLossRange?.default??5}
const draft=reactive({capital:'',days:props.product.minDays,...defaults}),error=ref(null),done=ref(false),submitting=ref(false)
const requestId=crypto.randomUUID()
const account=computed(()=>strategyAccountFor(session.mode)),demo=computed(()=>session.mode==='common.demo.demo')
const balance=computed(()=>account.value.balance)
watch([()=>JSON.stringify(draft),done,submitting],()=>emit('state',{busy:submitting.value,dirty:!!draft.capital||draft.days!==props.product.minDays||draft.takeProfit!==defaults.takeProfit||draft.stopLoss!==defaults.stopLoss,done:done.value}),{immediate:true})
// Server (真實) error codes → existing form messages; anything else is a generic failure.
const serverErrors={template:'notFound',templateChanged:'templateChanged',balance:'paymentRequired',capital:'validation',days:'periodOutOfRange',takeProfit:'takeProfitOutOfRange',stopLoss:'stopLossOutOfRange',userLimit:'userLimit',userCapital:'userCapital',capacity:'capacity',verificationRequired:'verificationRequired',vipRequired:'vipRequired',unavailable:'unavailable'}
async function submit(){
 if(done.value||props.closing||submitting.value)return
 error.value=null
 if(!session.loggedIn){error.value={code:'unauthorized'};return}
 const validation=strategyValidation(props.product,draft,balance.value)
 if(validation){error.value=validation;return}
 submitting.value=true
 try{
  const record=await subscribeFor(session.mode,props.product,draft,requestId)
  done.value=true
  // Reference behaviour: close the dialog and announce the result with a toast on the page.
  strategyNotice.key=record?.status==='pending_review'?'aiQuant.create.submitPendingReview':'aiQuant.create.submitSuccess';strategyNotice.at=Date.now()
  emit('close')
 }catch(cause){
  const code=cause.message
  error.value=code==='periodOutOfRange'||code==='days'?{code:'periodOutOfRange',params:{min:props.product.minDays,max:props.product.maxDays}}:{code:serverErrors[code]||(['conflict','paymentRequired'].includes(code)?code:'createFailed')}
 }finally{submitting.value=false}
}
</script>
<template>
<form id="strategy-subscribe-form" class="strategy-subscription" @submit.prevent="submit">
 <p class="muted">{{ $t('aiQuant.create.subtitle') }}</p>
 <template v-if="!done">
 <div class="strategy-form-field"><div class="strategy-balance"><label for="strategy-capital">{{ $t('aiQuant.create.capitalLabel',{asset:'USDT'}) }}</label><small>{{ $t('aiQuant.create.availableBalanceLabel') }} {{ fmt(balance) }} USDT</small></div><div class="strategy-amount"><input id="strategy-capital" v-model="draft.capital" data-strategy-initial-focus inputmode="decimal" placeholder="0.00" aria-required="true" :aria-invalid="error?.field==='capital'" aria-describedby="strategy-validation"/><button type="button" @click="draft.capital=String(Math.min(balance,product.max))">{{ $t('aiQuant.create.maxButton') }}</button><span>USDT</span></div><small>{{ $t('aiQuant.create.capitalHint',{min:fmt(product.min),max:fmt(product.max)}) }}</small></div>
 <div class="strategy-form-pair"><div v-for="field in ['takeProfit','stopLoss']" :key="field" class="strategy-form-field"><label :for="'strategy-'+field">{{ $t('aiQuant.create.'+field+'Label') }}</label><input :id="'strategy-'+field" v-model="draft[field]" inputmode="decimal" aria-required="true" :aria-invalid="error?.field===field" aria-describedby="strategy-validation"/></div></div>
 <div class="strategy-form-field"><label for="strategy-days">{{ $t('aiQuant.create.periodLabel') }}</label><input id="strategy-days" v-model="draft.days" inputmode="numeric" aria-required="true" :aria-invalid="error?.field==='days'" aria-describedby="strategy-validation"/><small>{{ $t('aiQuant.create.periodHint',{min:product.minDays,max:product.maxDays}) }}</small></div>
 <section class="strategy-fees"><small>{{ $t('aiQuant.create.fees.title') }}</small><dl class="strategy-card-facts"><div><dt>{{ $t('aiQuant.create.fees.feePerTrade') }}</dt><dd>{{ product.fee }} USDT</dd></div><div><dt>{{ $t('aiQuant.create.fees.maxOpenTrades') }}</dt><dd>{{ $t('aiQuant.create.fees.maxOpenTradesValue',{n:product.maxOpenTrades}) }}</dd></div></dl></section>
 <p class="strategy-settlement">{{ $t('aiQuant.create.settlementNote') }}</p>
 <FeedbackToast v-if="error" id="strategy-validation" :source="()=>error?$t(error.key||'aiQuant.create.errors.'+error.code,error.params):''"/>
 
 </template>
</form>
</template>
