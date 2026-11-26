<script setup>
import FeedbackToast from '../../platform/FeedbackToast.js'
import {computed,nextTick,shallowRef,watch} from 'vue'
import {useRouter} from 'vue-router'
import {fmt,path} from '../../data'
import {session} from '../../session'
import {fundSubscriptionError,maxFundSubscription,fundEstimate,isAmountDraft} from '../../utils/quantFund'
import Skeleton from '../ui/Skeleton.vue'
import {getQuantFundBalance,subscribeQuantFund} from '../../api/quantFund.js'
import {invalidate,useMutation,useRequest} from '../../composables/useRequest.js'
import Coin from '../Coin.vue'
import Icon from '../Icon.vue'
import '../../styles/quant-fidelity.css'
// Reference subscribe dialog: summary, amount with balance/MAX, risk acknowledgement, success view.
// Errors are reported by toast (project rule) while the field keeps aria-invalid and its static range hint.
const props=defineProps({product:{type:Object,required:true},closing:Boolean})
const emit=defineEmits(['state','close'])
const amount=shallowRef(String(props.product.minAmount)),ack=shallowRef(false),attempted=shallowRef(false),done=shallowRef(null)
// Balance comes from the API; the form cannot submit until it has loaded. `busy` = the subscription request in flight.
const wallet=useRequest(()=>getQuantFundBalance(session.mode),{key:()=>session.mode})
const submission=useMutation(subscribeQuantFund),busy=submission.pending
const ready=computed(()=>wallet.status.value==='ready')
const failure=shallowRef(null)
const router=useRouter(),riskHref=router.resolve(path('/risk-disclosure')).href
const requestId=`qf-${Date.now()}-${Math.random().toString(36).slice(2)}`
const balance=computed(()=>wallet.data.value?.balance??0)
const validation=computed(()=>fundSubscriptionError(props.product,amount.value,balance.value))
const maxAmount=computed(()=>maxFundSubscription(props.product,balance.value))
const estimate=computed(()=>validation.value?null:fundEstimate(props.product,amount.value,1))
const term=computed(()=>props.product.termDays===null?'aiQuant.quantFund.card.termFlexible':'aiQuant.quantFund.card.termDaysValue')
const asset=computed(()=>props.product.asset)
const amountError=computed(()=>{
 if(failure.value)return failure.value.code==='network'||failure.value.code==='unknown'||failure.value.code==='notFound'?['common.requestFailed']:null
 const v=validation.value
 if(!attempted.value||!v)return ''
 if(v.kind==='invalid')return ['aiQuant.quantFund.subscribe.errorAmountInvalid']
 if(v.kind==='range')return ['aiQuant.quantFund.subscribe.errorAmountRange',{min:fmt(props.product.minAmount),max:fmt(props.product.maxAmount),currency:asset.value}]
 if(v.kind==='exceedsAvailable')return ['aiQuant.quantFund.subscribe.errorExceedsAvailable',{available:fmt(v.available),currency:asset.value}]
 return ['aiQuant.quantFund.subscribe.errorInsufficientBalance',{available:fmt(v.available),currency:asset.value}]
})
const ackError=computed(()=>attempted.value&&!validation.value&&!ack.value)
const feedback=computed(()=>amountError.value||(ackError.value?['aiQuant.quantFund.subscribe.errorRequireRiskAck']:''))
watch([amount,ack,done,busy,ready],()=>emit('state',{dirty:amount.value!==String(props.product.minAmount)||ack.value,done:Boolean(done.value),busy:busy.value,valid:ready.value}),{immediate:true})
const walletFailure=computed(()=>wallet.status.value==='error'?'common.loadFailed':'')
function onInput(event){if(isAmountDraft(event.target.value)){amount.value=event.target.value;failure.value=null}else event.target.value=amount.value}
function fillMax(){if(!busy.value&&ready.value&&maxAmount.value>0){amount.value=String(maxAmount.value);failure.value=null}}
async function submit(){
 if(busy.value||done.value||props.closing||!ready.value)return
 failure.value=null
 attempted.value=true
 if(validation.value){await nextTick();document.getElementById('qf-subscribe-amount')?.focus();return}
 if(!ack.value){await nextTick();document.getElementById('qf-subscribe-ack')?.focus();return}
 // Creates a pending-review order only (mock API); the same requestId makes a retried submission idempotent.
 try{
  done.value=await submission.run({productId:props.product.id,amount:amount.value,mode:session.mode,requestId})
  invalidate('quantFund')
 }catch(cause){
  failure.value=cause
  // Business rejections reuse the local validation codes: reload the balance so the field shows the current reason.
  wallet.refresh()
 }
}
</script>
<template>
<div v-if="done" class="qf-success">
 <span class="qf-success-icon" aria-hidden="true"><Icon name="check" green/></span>
 <h3>{{ $t('aiQuant.quantFund.subscribe.success') }}</h3>
 <p>{{ product.name }} · {{ fmt(done.principal) }} {{ asset }}</p>
 <p class="qf-success-status">{{ $t('aiQuant.quantFund.positions.tabs.pending_review') }}</p>
 <RouterLink class="qf-success-link" :to="path('/ai-quant/quant-fund/positions')" @click="emit('close')">{{ $t('aiQuant.quantFund.hero.viewPositionsCta') }}</RouterLink>
</div>
<form v-else id="quant-fund-subscribe-form" class="qf-subscribe" novalidate @submit.prevent="submit">
 <div class="qf-subscribe-product"><Coin :symbol="asset"/><p>{{ product.name }} · {{ asset }} · {{ $t(term,{days:product.termDays}) }}</p></div>
 <div class="qf-subscribe-summary">
  <div><span>{{ $t('aiQuant.quantFund.card.dailyReturn') }}</span><strong class="qf-success-mono">{{ product.averageDailyReturnPercent.toFixed(2) }}%</strong></div>
  <div><span>{{ $t('aiQuant.quantFund.card.term') }}</span><strong>{{ $t(term,{days:product.termDays}) }}<template v-if="product.termDays===null&&product.minHoldDays!==null"> · {{ $t('aiQuant.quantFund.detail.minHoldDays',{days:product.minHoldDays}) }}</template></strong></div>
  <div class="qf-subscribe-estimate"><span>{{ $t('aiQuant.quantFund.subscribe.estDailyEarnings') }}</span><strong class="qf-success-mono">{{ estimate?`≈ ${fmt(estimate.daily)} ${asset}`:'--' }}</strong></div>
 </div>
 <div class="qf-field">
  <div class="qf-amount-head"><label for="qf-subscribe-amount">{{ $t('aiQuant.quantFund.subscribe.amountLabel',{currency:asset}) }}</label><template v-if="wallet.status.value==='error'"><button type="button" class="qf-balance" @click="wallet.refresh"><span>{{ $t('aiQuant.quantFund.subscribe.availableBalanceLabel') }}</span><b>{{ $t('common.retry') }}</b></button><FeedbackToast type="error" :source="() => $t(walletFailure)"/></template><button v-else type="button" class="qf-balance" :disabled="busy||!ready" :aria-busy="!ready||undefined" @click="fillMax"><span>{{ $t('aiQuant.quantFund.subscribe.availableBalanceLabel') }}</span><b v-if="ready">{{ fmt(balance) }} {{ asset }}</b><Skeleton v-else width="96px" height="12px"/><span v-if="!ready" class="sr-only">{{ $t('common.loading') }}</span></button></div>
  <div class="qf-input"><input id="qf-subscribe-amount" data-fund-initial-focus :value="amount" inputmode="decimal" autocomplete="off" aria-required="true" :aria-invalid="Boolean(amountError)" aria-describedby="qf-subscribe-hint qf-subscribe-feedback" :readonly="busy" @input="onInput"/><button type="button" class="qf-max" :disabled="busy||!ready||maxAmount<=0" @click="fillMax">{{ $t('aiQuant.quantFund.subscribe.maxButton') }}</button><span class="qf-input-divider" aria-hidden="true"></span><span>{{ asset }}</span></div>
  <p id="qf-subscribe-hint" class="qf-faint">{{ $t('aiQuant.quantFund.subscribe.amountHint',{min:fmt(product.minAmount),max:fmt(product.maxAmount),currency:asset}) }}</p>
 </div>
 <label class="qf-ack"><input id="qf-subscribe-ack" v-model="ack" type="checkbox" :disabled="busy" :aria-invalid="ackError" aria-describedby="qf-subscribe-feedback"/><span>{{ $t('aiQuant.quantFund.subscribe.riskAckPrefix') }}<a :href="riskHref" target="_blank" rel="noopener" class="qf-inline-link" @click.stop>{{ $t('aiQuant.quantFund.subscribe.riskAckLink') }}</a>{{ $t('aiQuant.quantFund.subscribe.riskAckSuffix') }}</span></label>
 <FeedbackToast v-if="feedback" id="qf-subscribe-feedback" type="error" :source="() => feedback ? $t(feedback[0],feedback[1]) : ''"/>
</form>
</template>
