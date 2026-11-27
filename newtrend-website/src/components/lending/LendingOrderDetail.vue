<script setup>
import StatusTag from '../ui/StatusTag.vue'
import EmptyState from '../ui/EmptyState.vue'
import {dateTime} from '../../utils/format.js'
import {locale} from '../../i18n'
import {lendingErrorKey} from '../../utils/lendingErrors.js'
import FeedbackToast from '../../platform/FeedbackToast.js'
import {computed,nextTick,ref,watch} from 'vue'
import {message} from 'ant-design-vue'
import {useLendingFeed,lendingCommand} from '../../platform/lendingClient.js'
import {fmt} from '../../data'
import {t} from '../../i18n'
import Coin from '../Coin.vue'
import BottomSheet from '../ui/BottomSheet.vue'
import FinancePagination from '../FinancePagination.vue'
import {useFinancePagination} from '../../composables/useFinancePagination'
const props=defineProps({orderId:String,closing:Boolean})
const emit=defineEmits(['state'])
const {state,busy,error,refresh}=useLendingFeed(),amount=ref(''),action=ref('')
// 還款 opens a sheet (dialog on wide screens) with the amount form, user feedback 2026-11-27: the page only shows
// the debt and the action, so tapping 還款 always leads straight to where the amount is entered.
const repayOpen=ref(false),repayError=ref('')
function openRepay(){if(busy.value||props.closing)return;amount.value='';repayError.value='';repayOpen.value=true}
// Errors are shown inside the sheet's layer; clearing first re-announces a repeated failure.
async function repayFail(key){repayError.value='';await nextTick();repayError.value=key}
const order=computed(()=>state.value.orders.find(o=>o.orderId===props.orderId&&o.userId==='USR-DEMO'))
const records=computed(()=>state.value.repayments.filter(r=>r.orderId===props.orderId))
const {page:recordPage,total:recordTotal,shown:shownRecords}=useFinancePagination(records)
const cancelTrigger=ref(null),cancelBack=ref(null),detailHeader=ref(null)
watch(action,async value=>{await nextTick();if(value==='cancel')cancelBack.value?.focus();else if(order.value?.status==='pending')cancelTrigger.value?.focus()})
const canRepay=computed(()=>['active','repaying','overdue'].includes(order.value?.status))
watch([busy,amount,action],()=>emit('state',{busy:busy.value,dirty:!!amount.value||!!action.value}),{immediate:true})
const date=value=>dateTime(value,locale.value)
async function run(kind){
 if(busy.value||props.closing)return
 if(kind==='repay'&&(!Number.isFinite(Number(amount.value))||Number(amount.value)<=0||Number(amount.value)>order.value.totalDebt)){repayFail('lending.errors.amount');return}
 try{
  await lendingCommand(kind,{userId:'USR-DEMO',orderId:props.orderId,amount:Number(amount.value)})
  amount.value='';action.value='';repayError.value=''
  if(kind==='repay'){repayOpen.value=false;message.success(t('lending.success'));return}
  message.success(t('lending.success'));await nextTick();detailHeader.value?.focus()
 }catch(e){if(kind==='repay')repayFail(lendingErrorKey(e.message));else message.error(t(lendingErrorKey(e.message)))}
}
</script>
<template>
 <div class="loan-detail-content">
  <FeedbackToast v-if="error" type="error" :source="() => (error) ? (([String(($t('lending.errors.unavailable')) ?? ''),&quot; &quot;,''].join(''))) : ''"><button @click="refresh">{{$t('lending.refresh')}}</button></FeedbackToast>
  <template v-if="order">
   <header ref="detailHeader" tabindex="-1" class="loan-detail-header"><div class="earn-product-line"><Coin :symbol="order.loanCurrency"/><div><strong>{{order.productName}}</strong><small>{{order.orderId}}</small></div></div><StatusTag domain="lending" :status="order.status"/></header>
   <div class="loan-detail-amounts"><div><span class="earn-caption">{{$t('lending.amount')}}</span><strong class="earn-mono">{{fmt(order.loanAmount)}} <small>{{order.loanCurrency}}</small></strong></div><div><span class="earn-caption">{{$t('lending.debt')}}</span><strong class="earn-mono earn-accent">{{fmt(order.totalDebt)}} <small>{{order.loanCurrency}}</small></strong></div></div>
   <div class="loan-detail-grid">
    <section class="loan-detail-section loan-detail-card"><h3>{{$t('lending.breakdown')}}</h3><dl><dt>{{$t('lending.principal')}}</dt><dd>{{fmt(order.principal)}} {{order.loanCurrency}}</dd><dt>{{$t('lending.interest')}}</dt><dd>{{fmt(order.interestAccrued)}} {{order.loanCurrency}}</dd><dt>{{$t('lending.penalty')}}</dt><dd>{{fmt(order.overduePenaltyAccrued)}} {{order.loanCurrency}}</dd></dl></section>
    <section class="loan-detail-section loan-detail-card"><h3>{{$t('lending.termRates')}}</h3><dl><dt>{{$t('lending.term')}}</dt><dd>{{$t('margin.market.termDays',{days:order.loanDuration})}}</dd><dt>{{$t('lending.daily')}}</dt><dd class="earn-accent">{{Number((order.dailyRate??order.interestRate/365).toFixed(8))}}%</dd><dt>{{$t('lending.apr')}}</dt><dd>{{Number(order.interestRate.toFixed(2))}}%</dd><dt>{{$t('lending.penaltyRate')}}</dt><dd>{{order.overduePenaltyRate}}%</dd></dl></section>
    <section class="loan-detail-section loan-detail-card"><h3>{{$t('lending.schedule')}}</h3><dl><dt>{{$t('lending.appliedAt')}}</dt><dd>{{date(order.createTime)}}</dd><dt>{{$t('lending.start')}}</dt><dd>{{order.status==='pending'?$t('lending.afterApproval'):date(order.interestStartAt)}}</dd><dt>{{$t('lending.due')}}</dt><dd>{{date(order.maturityAt)}}</dd></dl></section>
    <section class="loan-detail-section loan-detail-card"><h3>{{$t('lending.collateral')}}</h3><div class="loan-detail-collateral"><Coin v-if="order.collateralType" :symbol="order.collateralType"/><strong class="earn-mono">{{order.collateralType?fmt(order.collateralAmount)+' '+order.collateralType:'—'}}</strong><span class="portfolio-status">{{$t('lending.collateralStates.'+order.collateralStatus)}}</span></div></section>
   </div>
   <section v-if="order.status==='pending'" class="loan-detail-section loan-order-pending"><p class="earn-caption">{{$t('lending.pendingNote')}}</p><button ref="cancelTrigger" v-if="action!=='cancel'" class="outline-button nt-float-action" :disabled="busy||closing" @click="action='cancel'">{{$t('lending.cancel')}}</button><div v-else class="loan-detail-confirm nt-float-bar"><p>{{$t('lending.confirm')}} · {{$t('lending.cancel')}}</p><button ref="cancelBack" :disabled="busy||closing" class="outline-button" @click="action=''">{{$t('lending.back')}}</button><button :disabled="busy||closing" class="earn-buy" @click="run('cancel')">{{$t('lending.confirm')}}</button></div></section>
   <section v-if="canRepay" class="loan-detail-section loan-detail-card loan-repay">
    <h3>{{$t('lending.repay')}}</h3>
    <dl class="loan-repay-facts"><div><dt>{{$t('lending.debt')}}</dt><dd>{{fmt(order.totalDebt)}} {{order.loanCurrency}}</dd></div><div><dt>{{$t('lending.available')}}</dt><dd>{{fmt(state.balances['USR-DEMO']?.[order.loanCurrency]||0)}} {{order.loanCurrency}}</dd></div></dl>
    <button type="button" class="earn-buy nt-float-action" aria-haspopup="dialog" :disabled="busy||closing" @click="openRepay">{{$t('lending.repay')}}</button>
   </section>
   <!-- Kept mounted while the order is shown: a full repayment settles the order mid-close and the sheet must finish. -->
   <BottomSheet v-model:open="repayOpen" :title="$t('lending.repay')" :busy="busy" class="loan-repay-sheet" @closed="e=>{if(e.triggerGone)detailHeader?.focus()}">
    <form class="loan-repay" @submit.prevent="run('repay')" novalidate>
     <label class="loan-repay-title" for="loan-repayment">{{$t('lending.repayAmount')}}</label>
     <!-- One field like the other amount inputs: value, a 全部還清 shortcut that fills the full debt, and the currency. -->
     <div class="loan-repay-field"><input id="loan-repayment" v-model="amount" type="number" inputmode="decimal" min="0.00000001" :max="order.totalDebt" step="0.00000001" :placeholder="$t('lending.repayPlaceholder')" :disabled="busy" :aria-invalid="!!repayError||undefined" data-initial-focus required @input="repayError=''"/><button type="button" class="loan-repay-max" :disabled="busy" @click="amount=String(order.totalDebt);repayError=''">{{$t('lending.full')}}</button><span class="loan-repay-unit">{{order.loanCurrency}}</span></div>
     <dl class="loan-repay-facts"><div><dt>{{$t('lending.available')}}</dt><dd>{{fmt(state.balances['USR-DEMO']?.[order.loanCurrency]||0)}} {{order.loanCurrency}}</dd></div><div><dt>{{$t('lending.debt')}}</dt><dd>{{fmt(order.totalDebt)}} {{order.loanCurrency}}</dd></div></dl>
     <p class="earn-caption loan-repay-note">{{$t('lending.repayNote')}}</p>
     <button class="earn-buy loan-repay-submit" :disabled="busy" :aria-busy="busy">{{$t('lending.repay')}}</button>
     <FeedbackToast v-if="repayError" type="error" :source="() => (repayError ? $t(repayError) : '')"/>
    </form>
   </BottomSheet>
   <section class="loan-detail-section loan-detail-card"><h3>{{$t('lending.records')}} <span class="earn-caption">{{records.length}}</span></h3><EmptyState v-if="!records.length" class="loan-records-empty" :text="$t('lending.empty')"/><article v-for="record in shownRecords" :key="record.repaymentId" class="loan-detail-record"><div><time>{{date(record.repaymentTime)}}</time><strong class="earn-mono">{{fmt(record.amount)}} {{record.loanCurrency}}</strong></div><p class="earn-caption">{{$t('lending.principal')}} {{fmt(record.principalPaid)}} · {{$t('lending.interest')}} {{fmt(record.interestPaid)}} · {{$t('lending.penalty')}} {{fmt(record.overduePenaltyPaid)}}</p></article><FinancePagination scroll v-if="records.length" v-model:page="recordPage" :total="recordTotal"/></section>
  </template><p v-else-if="!error">{{$t('lending.empty')}}</p>
 </div>
</template>
