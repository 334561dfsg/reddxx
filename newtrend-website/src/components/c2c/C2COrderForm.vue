<script setup>
import {isDemo} from '../../utils/accountMode.js'
import FeedbackToast from '../../platform/FeedbackToast.js'
import {computed,ref,watch} from 'vue'
import Coin from '../Coin.vue'
import {formatQuote,quoteAmount} from '../../utils/c2cQuotes'
import {openModal,session} from '../../session'
import {t} from '../../i18n'
import NtSelect from '../ui/NtSelect.vue'
import {c2cErrorKey,createC2COrder} from '../../api/c2c.js'
import {invalidate} from '../../composables/useRequest.js'
const props=defineProps({quote:{type:Object,required:true},side:{type:String,default:'buy'}})
const orderId=ref('')
let requestId=crypto.randomUUID()
const submitLabel=computed(()=>props.side==='sell'?'c2c.order.submitSell':'c2c.order.submitBuy')
const mode=ref('asset'),amount=ref(''),agreed=ref(false),completed=ref(false),error=ref('')
// Payer details (user request 2026-11-27, after the reference 創建 C2C 訂單 form): country, remitter name and email are
// required (country is a plain text field, user decision 2026-11-27). Checked on submit (toast + aria-invalid), stored on the order as `payer`.
const payer=ref({country:'',name:'',email:''}),invalid=ref({})
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/
function payerError(){
 const p=payer.value,bad={country:!p.country.trim()||p.country.trim().length>64,name:!p.name.trim()||p.name.trim().length>64,email:!EMAIL.test(p.email.trim())}
 invalid.value=bad
 return bad.country?'c2c.order.countryRequired':bad.name?'c2c.order.payerNameRequired':bad.email?'c2c.order.emailInvalid':''
}
const result=computed(()=>quoteAmount(props.quote,amount.value,mode.value))
const unit=computed(()=>mode.value==='asset'?props.quote.symbol:props.quote.fiat)
watch(()=>props.quote.id,()=>{amount.value='';completed.value=false;error.value='';orderId.value='';requestId=crypto.randomUUID()})
function changeMode(next){if(completed.value||mode.value===next)return;const old=result.value;mode.value=next;if(Number(amount.value)>0)amount.value=String(Number((next==='fiat'?old.total:old.quantity).toFixed(8)));error.value=''}
function resetOrder(){invalid.value={};amount.value='';completed.value=false;agreed.value=false;orderId.value='';error.value='';requestId=crypto.randomUUID()}
function agreement(){openModal('c2c-agreement','c2c.agreement.title',{confirmLabel:'c2c.agreement.agree',onConfirm:()=>{agreed.value=true}})}
function submit(){
 if(result.value.error||!agreed.value||completed.value)return
 const payerKey=payerError()
 if(payerKey){error.value=payerKey;return}
 if(!session.loggedIn){error.value='auth.login';return}
 if(!isDemo(session.mode)){error.value='overlay.ui.insufficientBalanceSwitchToDemoToTryThisLocally';return}
 error.value=''
 const snapshot={...result.value,symbol:props.quote.symbol,fiat:props.quote.fiat,price:props.quote.price}
 openModal('account-confirm',submitLabel.value,{focusCancel:true,description:t(props.side==='sell'?'c2c.order.confirmSellSummary':'c2c.order.confirmSummary',{amount:formatQuote(snapshot.quantity),asset:snapshot.symbol,total:formatQuote(snapshot.total),fiat:snapshot.fiat}),confirmLabel:submitLabel.value,
  // Async confirm: the dialog shows busy and holds its close paths; a rejection keeps it open with a toast.
  onConfirm:async()=>{
   if(completed.value)return
   try{
    const order=await createC2COrder({mode:session.mode,side:props.side,quoteId:props.quote.id,quantity:snapshot.quantity,requestId,payer:{country:payer.value.country.trim(),name:payer.value.name.trim(),email:payer.value.email.trim()}})
    orderId.value=order.id;completed.value=true;error.value='';invalidate('c2c')
   }catch(cause){throw new Error(c2cErrorKey(cause))}
  }})
}
</script>
<template>
<form class="c2c-order-form" novalidate @submit.prevent="submit">
 <h2><Coin set="logo" :symbol="quote.symbol"/>{{ $t(side==='sell'?'c2c.order.formTitleSell':'c2c.order.formTitleBuy',{asset:quote.symbol}) }}</h2>
 <div class="c2c-unit-price"><span>{{ $t('c2c.order.price') }}</span><strong>{{ formatQuote(quote.price) }} <span class="c2c-fiat-code">{{ quote.fiat }}</span></strong></div>
 <div class="c2c-pills c2c-mode" role="group" :aria-label="$t('c2c.order.amountModeAsset')+' / '+$t('c2c.order.amountModeFiat')"><button type="button" :class="{active:mode==='asset'}" :aria-pressed="mode==='asset'" @click="changeMode('asset')">{{ $t('c2c.order.amountModeAsset') }}</button><button type="button" :class="{active:mode==='fiat'}" :aria-pressed="mode==='fiat'" @click="changeMode('fiat')">{{ $t('c2c.order.amountModeFiat') }}</button></div>
 <label for="c2c-amount">{{ $t(mode==='asset'?'c2c.order.assetAmount':'c2c.order.fiatAmount',{asset:quote.symbol,fiat:quote.fiat}) }}</label>
 <div class="c2c-amount-field"><input id="c2c-amount" v-model="amount" type="number" inputmode="decimal" min="0" step="any" :disabled="completed" :placeholder="$t(mode==='asset'?'c2c.order.assetAmountPlaceholder':'c2c.order.fiatAmountPlaceholder')" :aria-invalid="Boolean(amount&&result.error)" aria-describedby="c2c-amount-feedback"/><span><Coin v-if="mode==='asset'" set="logo" :symbol="unit"/><span v-else class="c2c-fiat-code">{{ unit }}</span><template v-if="mode==='asset'">{{ unit }}</template></span></div>
 <div id="c2c-amount-feedback"><FeedbackToast v-if="amount&&result.error" type="error" :source="() => (amount&amp;&amp;result.error) ? ($t(result.error)) : ''"></FeedbackToast><div v-else-if="Number(amount)>0" class="c2c-estimate"><span>{{ $t(side==='sell'?'c2c.order.estimatedReceive':mode==='asset'?'c2c.order.estimatedPay':'c2c.order.estimatedReceive') }}</span><strong>{{ formatQuote(mode==='asset'?result.total:result.quantity) }} {{ mode==='asset'?quote.fiat:quote.symbol }}</strong></div></div>
 <div class="c2c-payer">
  <label for="c2c-country">{{ $t('c2c.order.countryLabel') }}</label>
  <input id="c2c-country" v-model="payer.country" class="c2c-text-field" maxlength="64" autocomplete="country-name" :disabled="completed" :placeholder="$t('c2c.order.countryPlaceholder')" :aria-invalid="invalid.country||undefined" @input="invalid={...invalid,country:false}"/>
  <label for="c2c-payer-name">{{ $t('c2c.order.payerNameLabel') }}</label>
  <input id="c2c-payer-name" v-model="payer.name" class="c2c-text-field" maxlength="64" autocomplete="name" :disabled="completed" :placeholder="$t('c2c.order.payerNamePlaceholder')" :aria-invalid="invalid.name||undefined" @input="invalid={...invalid,name:false}"/>
  <label for="c2c-payer-email">{{ $t('c2c.order.emailLabel') }}</label>
  <input id="c2c-payer-email" v-model="payer.email" class="c2c-text-field" type="email" inputmode="email" autocomplete="email" :disabled="completed" :placeholder="$t('c2c.order.emailPlaceholder')" :aria-invalid="invalid.email||undefined" @input="invalid={...invalid,email:false}"/>
 </div>
 <div class="c2c-agreement"><label><input v-model="agreed" type="checkbox" :disabled="completed"/>{{ $t('c2c.order.agreementCheckbox') }}</label><button type="button" @click="agreement">{{ $t('c2c.order.agreementLink') }}</button></div>
 <FeedbackToast v-if="error" type="error" :source="() => (error) ? ($t(error)) : ''"></FeedbackToast>
 <FeedbackToast v-if="completed" type="success" :source="() => (completed) ? ($t('c2c.order.submitted')) : ''"/>
 <button class="c2c-submit" :class="{sell:side==='sell'}" :disabled="!agreed||Boolean(result.error)||completed">{{ $t(completed?'assets.statusCompleted':submitLabel) }}</button>
<button v-if="completed" type="button" class="c2c-text-button" @click="resetOrder">{{ $t('c2c.order.newOrder') }}</button>
<button v-if="orderId" class="c2c-text-button" type="button" @click="openModal('c2c-detail','c2c.detail.title',{id:orderId})">{{ $t('c2c.order.viewOrder') }}</button>
</form>
</template>
