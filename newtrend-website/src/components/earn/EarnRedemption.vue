<script setup>
import FeedbackToast from '../../../../src/shared/feedback/FeedbackToast.vue'
import {computed,shallowRef,watch} from 'vue'
import {earnPortfolio,redeemEarnHolding} from '../../earnPortfolio'
import {redemptionQuote} from '../../utils/mockEarnPortfolio'
import {products,fmt,path} from '../../data'
import Coin from '../Coin.vue'
import Icon from '../Icon.vue'
const props=defineProps({holdingId:{type:String,required:true},closing:Boolean})
const emit=defineEmits(['state','close','focus-cancel'])
const holding=computed(()=>earnPortfolio.holdings.find(row=>row.id===props.holdingId))
const product=computed(()=>products.find(row=>row.id===holding.value?.productId))
const mode=shallowRef('full'),amount=shallowRef(String(holding.value?.principal||'')),touched=shallowRef(false)
const confirming=shallowRef(false),done=shallowRef(false),failure=shallowRef(null),result=shallowRef(null)
const requestId=crypto.randomUUID()
const quote=computed(()=>redemptionQuote(holding.value,mode.value==='full'?holding.value?.principal:amount.value))
const error=computed(()=>done.value?null:failure.value||(touched.value&&quote.value.error?quote.value:null))
watch([amount,mode,quote,confirming,done],()=>emit('state',{
 draft:touched.value&&!done.value?'changed':'',valid:!quote.value.error,done:done.value,
 confirmLabel:confirming.value?'earn.redeem.confirm.acknowledge':'earn.redeem.submit',
}),{immediate:true})
function changeMode(value){mode.value=value;touched.value=true;failure.value=null;confirming.value=false}
function editAmount(){touched.value=true;failure.value=null;confirming.value=false}
function submit(){
 if(done.value||props.closing)return
 touched.value=true
 if(quote.value.error)return
 if(quote.value.early&&!confirming.value){confirming.value=true;emit('focus-cancel');return}
 const response=redeemEarnHolding(props.holdingId,quote.value.amount,{id:requestId,acknowledgeEarly:confirming.value})
 if(response.error){failure.value=response;return}
 result.value=response.record
 done.value=true
}
</script>
<template><form id="earn-redeem-form" class="portfolio-redeem" @submit.prevent="submit">
<template v-if="holding&&product&&!done">
 <div class="earn-product-line"><Coin :symbol="holding.symbol"/><div><strong>{{ product.name }}</strong><small>{{ $t(!product.days?'earn.redeem.subtitle.flexible':quote.early?'earn.redeem.subtitle.fixedEarly':'earn.redeem.subtitle.fixedMatured') }}</small></div></div>
 <template v-if="!confirming">
  <div v-if="!product.days" class="portfolio-redeem-modes"><label><input type="radio" name="redeem-mode" value="full" :checked="mode==='full'" @change="changeMode('full')"/>{{ $t('earn.redeem.redeemInFull') }}</label><label><input type="radio" name="redeem-mode" value="partial" :checked="mode==='partial'" @change="changeMode('partial')"/>{{ $t('earn.redeem.redeemPartial') }}</label></div>
  <label v-if="mode==='partial'" class="portfolio-redeem-field">{{ $t('earn.redeem.amountLabel') }}<div><input v-model="amount" inputmode="decimal" autocomplete="off" :aria-invalid="Boolean(error)" aria-required="true" aria-describedby="redeem-error" @input="editAmount"/><span>{{ holding.symbol }}</span></div></label>
  <dl><dt>{{ $t('earn.redeem.principal') }}</dt><dd>{{ fmt(holding.principal) }} {{ holding.symbol }}</dd><dt>{{ $t('earn.redeem.eligibleReward') }}</dt><dd class="positive">{{ quote.error?'—':fmt(quote.reward)+' '+holding.symbol }}</dd><dt>{{ $t('earn.redeem.remainingPrincipal') }}</dt><dd>{{ quote.error?'—':fmt(quote.remaining)+' '+holding.symbol }}</dd><dt>{{ $t('earn.redeem.estimatedReceive') }}</dt><dd>{{ quote.error?'—':fmt(quote.receive)+' '+holding.symbol }}</dd></dl>
  <p v-if="quote.early" class="portfolio-redeem-warning">{{ $t('earn.redeem.warning.fixedEarly') }}</p><p v-else-if="mode==='partial'" class="earn-caption">{{ $t('earn.redeem.continueAccrue') }}</p>
  <p class="earn-caption">{{ $t('earn.redeem.fundingNote') }}</p>
 </template>
 <div v-else class="portfolio-redeem-confirm"><h3>{{ $t('earn.redeem.confirm.title') }}</h3><p>{{ $t('earn.redeem.confirm.body',{amount:fmt(quote.accruedShare),asset:holding.symbol}) }}</p><dl><dt>{{ $t('earn.redeem.confirm.youReceive') }}</dt><dd>{{ fmt(quote.receive) }} {{ holding.symbol }}</dd><dt>{{ $t('earn.redeem.confirm.youForfeit') }}</dt><dd class="negative">{{ fmt(quote.accruedShare) }} {{ holding.symbol }}</dd></dl></div>
</template>
<div v-else-if="done" class="portfolio-redeem-success"><FeedbackToast type="success" :source="() => $t('earn.redeem.success.title')"/><p>{{ $t('earn.redeem.success.received') }} {{ fmt(result.amount+result.reward) }} {{ result.symbol }}</p><RouterLink class="earn-accent" :to="path('/earn/my-earnings')+'?tab=redemptions'" @click="emit('close')">{{ $t('earn.redeem.success.viewRedemptions') }}</RouterLink></div>
<FeedbackToast v-if="error" id="redeem-error" type="error" :source="() => (error) ? ($t('earn.redeem.errors.'+error.error,{amount:fmt(error.amount),asset:holding?.symbol})) : ''"></FeedbackToast>
</form></template>
<style scoped>
.portfolio-redeem dl{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;margin:24px 0;font-size:14px}.portfolio-redeem dt{color:#fff6}.portfolio-redeem dd{text-align:right;margin:0;overflow-wrap:anywhere;font:500 13px/20px 'IBM Plex Mono',monospace}.portfolio-redeem-modes{display:flex;flex-wrap:wrap;gap:20px;margin:24px 0}.portfolio-redeem-modes label{display:flex;align-items:center;gap:8px;min-height:36px;cursor:pointer}.portfolio-redeem-modes input{accent-color:var(--nt-accent);min-height:0;margin:0}.portfolio-redeem-field{margin:16px 0}.portfolio-redeem-field>div{display:flex;align-items:center;background:#202226;border-radius:8px;padding-right:12px}.portfolio-redeem-field input{width:100%;min-width:0}.portfolio-redeem-field span{font-size:12px;color:#fff6}.portfolio-redeem-warning{padding:12px 16px;border:1px solid #e34a6840;background:#e34a680d;color:#ff92a6;border-radius:12px;margin-bottom:16px}.portfolio-redeem-confirm{margin-top:24px}.portfolio-redeem-confirm h3{font-size:18px;margin-bottom:12px}.portfolio-redeem-confirm p{color:#fff9;line-height:1.7}.portfolio-redeem-success{display:grid;gap:16px;justify-items:center;text-align:center;padding:24px 0}.portfolio-redeem .form-error{margin-top:16px}
@media(pointer:coarse){.portfolio-redeem-modes label{min-height:44px}}
</style>
