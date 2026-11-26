<script setup>
import {computed,reactive,ref,watch} from 'vue'
import FeedbackToast from '../../../../src/shared/feedback/FeedbackToast.vue'
import {session} from '../../session'
import {strategyAccount} from '../../strategyPortfolio'
import {strategyValidation,subscribeStrategy} from '../../utils/strategyTemplates'
import {fmt,path} from '../../data'
const props=defineProps({product:{type:Object,required:true},closing:Boolean})
const emit=defineEmits(['state','close'])
const draft=reactive({capital:'',days:props.product.minDays,takeProfit:10,stopLoss:5}),error=ref(null),done=ref(false)
const requestId=crypto.randomUUID()
const balance=computed(()=>session.mode==='common.demo.demo'?strategyAccount.balance:0)
watch([()=>JSON.stringify(draft),done],()=>emit('state',{dirty:!!draft.capital||draft.days!==props.product.minDays||draft.takeProfit!==10||draft.stopLoss!==5,done:done.value}),{immediate:true})
function submit(){
 if(done.value||props.closing)return
 error.value=null
 if(!session.loggedIn){error.value={code:'unauthorized'};return}
 if(session.mode!=='common.demo.demo'){error.value={key:'overlay.ui.insufficientBalanceSwitchToDemoToTryThisLocally'};return}
 const validation=strategyValidation(props.product,draft,balance.value)
 if(validation){error.value=validation;return}
 try{subscribeStrategy(strategyAccount,props.product,draft,requestId);done.value=true}catch(cause){error.value={code:cause.message}}
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
 <RouterLink v-if="error?.code==='paymentRequired'" :to="path('/deposit')" @click="emit('close')">{{ $t('earn.subscribe.goDeposit') }}</RouterLink>
 </template>
 <template v-else><FeedbackToast type="success" :source="()=>$t('aiQuant.create.submitSuccess')"/><RouterLink class="strategy-cta" :to="path('/ai-quant/strategy/mine')" @click="emit('close')">{{ $t('aiQuant.nav.myStrategies') }}</RouterLink></template>
</form>
</template>
