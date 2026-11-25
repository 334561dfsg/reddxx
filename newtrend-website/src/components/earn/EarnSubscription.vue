<script setup>
import FeedbackToast from '../../../../src/shared/feedback/FeedbackToast.vue'
import EarnConditions from './EarnConditions.vue'
import {earnEligibilityError} from '../../utils/earnEligibility'
import {computed,shallowRef,watch} from 'vue'
import {session} from '../../session'
import {recordEarnSubscription} from '../../earnPortfolio'
import {fmt,path} from '../../data'
import {subscriptionError,maximumSubscription} from '../../utils/earnProducts'
import Coin from '../Coin.vue'
import Icon from '../Icon.vue'
import EarnTimeline from './EarnTimeline.vue'
const props=defineProps({product:{type:Object,required:true},closing:Boolean})
const emit=defineEmits(['state','close'])
const amount=shallowRef(''),touched=shallowRef(false),done=shallowRef(false)
const balance=computed(()=>session.mode==='common.demo.demo'?100000:0)
const validation=computed(()=>{const code=earnEligibilityError(props.product);return code?{code}:subscriptionError(props.product,amount.value,balance.value)})
const error=computed(()=>touched.value&&validation.value?{key:(['verificationRequired','vipRequired'].includes(validation.value.code)?'lending.errors.':'earn.subscribe.errors.')+validation.value.code,params:{amount:fmt(validation.value.amount),asset:props.product.symbol}}:null)
const estimate=computed(()=>Number(amount.value)*props.product.rate/100*(props.product.days||1))
watch([amount,validation,done],()=>emit('state',{draft:amount.value,valid:!validation.value,done:done.value}),{immediate:true})
function fillMax(){amount.value=String(maximumSubscription(props.product,balance.value));touched.value=true}
function submit(){
 if(done.value||props.closing)return
 touched.value=true
 if(validation.value)return
 // The existing prototype keeps subscriptions local; no reference-site request.
 recordEarnSubscription(props.product,Number(amount.value))
 done.value=true
}
</script>
<template>
<div class="earn-subscription-summary"><div class="earn-product-line"><Coin :symbol="product.symbol"/><div><strong>{{ product.name }}</strong><small>{{ product.symbol }} · {{ product.days?$t('common.durationDays',{count:product.days}):$t('earn.tabs.flexible') }}</small></div></div><div class="earn-subscription-rate"><p><strong>{{ product.rate.toFixed(4) }}%</strong> <small>{{ $t('earn.dailyRate.suffix') }}</small></p><small>{{ $t('earn.apy.approx',{value:product.apy.toFixed(2)}) }}</small></div></div>
<EarnConditions :product="product" @navigate="emit('close')"/>
<form id="earn-subscribe-form" class="earn-subscription-form" @submit.prevent="submit">
 <template v-if="!done"><div class="earn-amount-heading"><label for="earn-amount" :class="{'negative':error}">{{ $t('earn.subscribe.amountLabel') }}</label><button type="button" class="earn-balance" @click="fillMax"><Icon name="wallet"/><span>{{ $t('earn.subscribe.availableBalanceLabel') }}</span><b>{{ fmt(balance) }} {{ product.symbol }}</b></button></div>
 <div class="earn-amount-input"><input id="earn-amount" v-model="amount" data-earn-initial-focus inputmode="decimal" autocomplete="off" :placeholder="$t('earn.subscribe.amountPlaceholder')" :aria-invalid="Boolean(error)" aria-required="true" aria-describedby="earn-amount-hint" @input="touched=true"/><button type="button" @click="fillMax">{{ $t('earn.subscribe.maxButton') }}</button><span>{{ product.symbol }}</span></div>
 <div id="earn-amount-hint" class="earn-amount-hint"><FeedbackToast v-if="error" type="error" :source="() => (error) ? (([String(($t(error)) ?? ''),&quot; &quot;,''].join(''))) : ''"><RouterLink v-if="validation?.code==='insufficientBalance'" :to="path('/deposit')" @click="emit('close')">{{ $t('earn.subscribe.goDeposit') }}</RouterLink></FeedbackToast><p v-else>{{ $t('earn.products.min',{amount:fmt(product.min)+' '+product.symbol}) }} · {{ $t('earn.products.max',{amount:fmt(product.max)+' '+product.symbol}) }}</p></div>
 <div class="earn-estimate"><p class="earn-caption">{{ $t('earn.subscribe.estReward') }}</p><p v-if="!validation" class="earn-accent earn-mono">{{ fmt(estimate) }} {{ product.symbol }}</p><p v-else class="earn-estimate-empty">{{ $t('earn.subscribe.estRewardEmpty') }}</p><EarnTimeline :days="product.days" vertical/></div></template>
 <div v-else class="earn-success"><FeedbackToast type="success" :source="() => $t('earn.subscribe.success.title')"/><RouterLink :to="path('/earn/my-earnings')+'?tab=orders'" @click="emit('close')">{{ $t('earn.subscribe.success.viewHoldings') }}</RouterLink></div>
</form>
</template>
<style scoped>
.earn-subscription-summary{display:flex;gap:16px;align-items:center;justify-content:space-between;padding:0 0 16px;border-bottom:1px solid #ffffff0c;margin-bottom:16px}.earn-subscription-summary .earn-product-line{gap:12px;min-width:0}.earn-subscription-summary :deep(.coin){width:36px;height:36px}.earn-subscription-summary strong{font-size:14px;font-weight:600;line-height:20px}.earn-subscription-summary small{display:block;color:#fff6;font-size:12px;margin-top:4px}.earn-subscription-rate{text-align:right;flex-shrink:0}.earn-subscription-rate p{white-space:nowrap}.earn-subscription-rate p strong{color:var(--nt-accent);font:600 18px 'IBM Plex Mono',monospace}.earn-subscription-rate p small{display:inline}.earn-subscription-rate>small{font-family:'IBM Plex Mono',monospace}.earn-amount-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;font-size:14px}.earn-balance{display:flex;align-items:center;gap:6px;font-size:12px;padding:0;min-height:20px}.earn-balance span{color:#fff6}.earn-balance b{font:500 12px 'IBM Plex Mono',monospace}.earn-balance .nt-icon{width:14px;height:14px;opacity:.5}.earn-amount-input{display:flex;align-items:center;gap:8px;background:#202226;border:1px solid #ffffff08;border-radius:12px;padding-right:12px}.earn-amount-input:focus-within{background:#292c30}.earn-amount-input input{min-width:0;width:100%;background:transparent;border:0;outline:none;min-height:36px;line-height:18px;padding:8px 12px}.earn-amount-input input[aria-invalid=true]{color:#e34a68}.earn-amount-input button{color:var(--nt-accent);white-space:nowrap;font-size:12px;padding:0}.earn-amount-input>span{font-size:12px;color:#fff6}.earn-amount-hint{font-size:12px;color:#fff6;margin-top:6px;min-height:18px;line-height:18px}.earn-amount-hint a{color:var(--nt-accent);text-decoration:underline}.earn-estimate{padding:16px;margin-top:16px;border:1px solid #ffffff05;border-radius:24px;background:#141619}.earn-estimate-empty{color:#fff6;font-size:14px;margin-top:4px}.earn-success{text-align:center;padding:32px 0}.earn-success h3{margin:16px 0}.earn-success a{color:var(--nt-accent)}
@media(max-width:480px){.earn-subscription-summary{flex-wrap:wrap}.earn-subscription-rate{margin-left:auto}.earn-amount-heading{align-items:flex-start;flex-wrap:wrap}.earn-balance{margin-left:auto}}
@media(pointer:coarse){.earn-amount-input input,.earn-amount-input button,.earn-balance{min-height:44px}}
</style>
