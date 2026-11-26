<script setup>
import FeedbackToast from '../../../../src/shared/feedback/FeedbackToast.vue'
import {computed,ref,watch} from 'vue'
import Coin from './C2CCoin.vue'
import {formatQuote,quoteAmount} from '../../utils/c2cQuotes'
import {openModal,session} from '../../session'
import {t} from '../../i18n'
import {path} from '../../data'
import {createC2COrder} from '../../utils/c2cState'
import {c2cState} from '../../c2cStore'
const props=defineProps({quote:{type:Object,required:true},side:{type:String,default:'buy'}})
const accountId=ref(''),orderId=ref('')
let requestId=crypto.randomUUID()
const accounts=computed(()=>c2cState.accounts.filter(a=>a.active&&a.currency==='USDT'))
const submitLabel=computed(()=>props.side==='sell'?'c2c.order.submitSell':'c2c.order.submitBuy')
const mode=ref('asset'),amount=ref(''),agreed=ref(false),completed=ref(false),error=ref('')
const result=computed(()=>quoteAmount(props.quote,amount.value,mode.value))
const unit=computed(()=>mode.value==='asset'?props.quote.symbol:'USDT')
watch(()=>props.quote.symbol,()=>{amount.value='';completed.value=false;error.value='';orderId.value='';requestId=crypto.randomUUID()})
function changeMode(next){if(completed.value||mode.value===next)return;const old=result.value;mode.value=next;if(Number(amount.value)>0)amount.value=String(Number((next==='fiat'?old.total:old.quantity).toFixed(8)));error.value=''}
function resetOrder(){amount.value='';completed.value=false;agreed.value=false;orderId.value='';error.value='';requestId=crypto.randomUUID()}
function agreement(){openModal('c2c-agreement','c2c.agreement.title',{confirmLabel:'c2c.agreement.agree',onConfirm:()=>{agreed.value=true}})}
function submit(){
 if(result.value.error||!agreed.value||completed.value)return
 if(props.side==='sell'&&!accounts.value.some(a=>a.id===accountId.value)){error.value='c2c.error.OTC_PAYMENT_ACCOUNT_REQUIRED_FOR_SELL';return}
 if(!session.loggedIn){error.value='auth.login';return}
 if(session.mode!=='common.demo.demo'){error.value='overlay.ui.insufficientBalanceSwitchToDemoToTryThisLocally';return}
 error.value=''
 const snapshot={...result.value,symbol:props.quote.symbol,price:props.quote.price}
 openModal('account-confirm',submitLabel.value,{focusCancel:true,description:t(props.side==='sell'?'c2c.order.confirmSellSummary':'c2c.order.confirmSummary',{amount:formatQuote(snapshot.quantity),asset:snapshot.symbol,total:formatQuote(snapshot.total)}),confirmLabel:submitLabel.value,onConfirm:()=>{
  if(completed.value)return
  const order=createC2COrder(c2cState,{side:props.side,quote:props.quote,quantity:snapshot.quantity,accountId:accountId.value,requestId});orderId.value=order.id;completed.value=true;error.value=''
 }})
}
</script>
<template>
<form class="c2c-order-form" @submit.prevent="submit">
 <h2><Coin :symbol="quote.symbol"/>{{ $t(side==='sell'?'c2c.order.formTitleSell':'c2c.order.formTitleBuy',{asset:quote.symbol}) }}</h2>
 <div class="c2c-unit-price"><span>{{ $t('c2c.order.price') }}</span><strong>{{ formatQuote(quote.price) }} <Coin symbol="USDT"/><span>USDT</span></strong></div>
 <div class="c2c-pills c2c-mode" role="group" :aria-label="$t('c2c.order.amountModeAsset')+' / '+$t('c2c.order.amountModeFiat')"><button type="button" :class="{active:mode==='asset'}" :aria-pressed="mode==='asset'" @click="changeMode('asset')">{{ $t('c2c.order.amountModeAsset') }}</button><button type="button" :class="{active:mode==='fiat'}" :aria-pressed="mode==='fiat'" @click="changeMode('fiat')">{{ $t('c2c.order.amountModeFiat') }}</button></div>
 <label for="c2c-amount">{{ $t(mode==='asset'?'c2c.order.assetAmount':'c2c.order.fiatAmount',{asset:quote.symbol,fiat:'USDT'}) }}</label>
 <div class="c2c-amount-field"><input id="c2c-amount" v-model="amount" type="number" inputmode="decimal" min="0" step="any" :disabled="completed" :placeholder="$t(mode==='asset'?'c2c.order.assetAmountPlaceholder':'c2c.order.fiatAmountPlaceholder')" :aria-invalid="Boolean(amount&&result.error)" aria-describedby="c2c-amount-feedback"/><span><Coin :symbol="unit"/>{{ unit }}</span></div>
 <div id="c2c-amount-feedback"><FeedbackToast v-if="amount&&result.error" type="error" :source="() => (amount&amp;&amp;result.error) ? ($t(result.error)) : ''"></FeedbackToast><div v-else-if="Number(amount)>0" class="c2c-estimate"><span>{{ $t(side==='sell'?'c2c.order.estimatedReceive':mode==='asset'?'c2c.order.estimatedPay':'c2c.order.estimatedReceive') }}</span><strong>{{ formatQuote(mode==='asset'?result.total:result.quantity) }} {{ mode==='asset'?'USDT':quote.symbol }}</strong></div></div>
 <div v-if="side==='sell'" class="c2c-payout-field"><label for="c2c-payout">{{ $t('c2c.order.payoutAccount') }}</label><select v-if="accounts.length" id="c2c-payout" v-model="accountId" :disabled="completed" required><option value="" disabled>{{ $t('c2c.order.payoutAccountPlaceholder') }}</option><option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.bankName }} · {{ a.accountName }} · {{ a.accountNumber }}</option></select><p v-else class="muted">{{ $t('c2c.order.payoutAccountEmpty',{fiat:'USDT'}) }}</p><RouterLink class="c2c-text-button" :to="path('/c2c/payment-accounts')">{{ $t(accounts.length?'c2c.order.payoutAccountManage':'c2c.order.payoutAccountEmptyCta') }}</RouterLink></div>
 <div class="c2c-agreement"><label><input v-model="agreed" type="checkbox" :disabled="completed"/>{{ $t('c2c.order.agreementCheckbox') }}</label><button type="button" @click="agreement">{{ $t('c2c.order.agreementLink') }}</button></div>
 <FeedbackToast v-if="error" type="error" :source="() => (error) ? ($t(error)) : ''"></FeedbackToast>
 <FeedbackToast v-if="completed" type="success" :source="() => (completed) ? ($t('overlay.ui.demoCompletedNoRealTransactionWasSent')) : ''"/>
 <button class="c2c-submit" :class="{sell:side==='sell'}" :disabled="!agreed||Boolean(result.error)||completed||(side==='sell'&&!accounts.some(a=>a.id===accountId))">{{ $t(completed?'assets.statusCompleted':submitLabel) }}</button>
<button v-if="completed" type="button" class="c2c-text-button" @click="resetOrder">{{ $t('c2c.order.newOrder') }}</button>
<button v-if="orderId" class="c2c-text-button" type="button" @click="openModal('c2c-detail','c2c.detail.title',{id:orderId})">{{ $t('c2c.order.viewOrder') }}</button>
</form>
</template>
