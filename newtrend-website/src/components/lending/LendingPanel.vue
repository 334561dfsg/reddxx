<script setup>
import {lendingErrorKey} from '../../utils/lendingErrors.js'
import FeedbackToast from '../../../../src/shared/feedback/FeedbackToast.vue'
import {computed,ref,watch} from 'vue'
import {message} from 'ant-design-vue'
import {t} from '../../i18n'
import {useRoute} from 'vue-router'
import {useLendingFeed,lendingCommand} from '../../../../src/shared/lending/client.js'
import {eligibilityFailures} from '../../../../src/shared/lending/eligibility.js'
import {session} from '../../session'
import {path} from '../../data'
import Coin from '../Coin.vue'
import Icon from '../Icon.vue'
import LendingBorrowForm from './LendingBorrowForm.vue'
import '../../styles/earn-fidelity.css'
import LendingPortfolio from './LendingPortfolio.vue'
import LendingCatalog from './LendingCatalog.vue'
import '../../styles/lending-fidelity.css'
const route=useRoute(),{state,error,busy,refresh}=useLendingFeed(),uid='USR-DEMO'
const productId=ref(''),amount=ref(''),days=ref(30),collateral=ref('USDT'),failure=ref('')
const mine=computed(()=>route.params.id==='my')
const borrowing=computed(()=>route.params.id==='borrow')
const products=computed(()=>state.value.products.filter(p=>p.status==='active').sort((a,b)=>b.sortOrder-a.sortOrder))
const product=computed(()=>state.value.products.find(p=>p.productId===productId.value))
const selectedTerm=computed(()=>product.value?.loanTerms.find(t=>t.days===Number(days.value)))
const estimated=computed(()=>Number(amount.value||0)*(selectedTerm.value?.dailyRate||0)/100*Number(days.value))
async function submitApplication(){
 if(busy.value)return
 failure.value=''
 const p=product.value,n=Number(amount.value)
 const code=!session.loggedIn?'login':p?.status!=='active'?'product':eligibility.value[0]||(!Number.isFinite(n)||n<p.minLoanAmount||n>p.maxLoanAmount?'amount':!selectedTerm.value?'term':p.collateralEnabled&&!p.collateralCurrencies.includes(collateral.value)?'collateral':p.collateralEnabled&&required.value>Number(wallet.value[collateral.value]||0)?'balance':null)
 if(code){failure.value=code;message.error(t(lendingErrorKey(code)));return}
 try{await lendingCommand('apply',{userId:uid,productId:p.productId,amount:n,days:Number(days.value),expectedDailyRate:selectedTerm.value.dailyRate,collateralCurrency:collateral.value});message.success(t('lending.success'));amount.value=''}catch(e){failure.value=e.message;message.error(t(lendingErrorKey(e.message)))}
}
const eligibility=computed(()=>eligibilityFailures(product.value,state.value.profiles?.[uid]))
const wallet=computed(()=>state.value.balances[uid]||{})
const required=computed(()=>product.value?.collateralEnabled?Number(amount.value||0)*product.value.collateralMultiplier/(state.value.prices[collateral.value]||1):0)
function choose(p){if(productId.value!==p.productId){productId.value=p.productId;days.value=p.loanTerms[0].days;collateral.value=p.collateralCurrencies?.[0]||'';amount.value=''}failure.value=''}
watch([borrowing,()=>route.query.product,()=>route.query.currency,products],()=>{
 if(!borrowing.value)return
 const p=products.value.find(p=>route.query.product?p.productId===route.query.product:p.loanCurrency===route.query.currency)
 if(p&&p.productId!==productId.value)choose(p)
},{immediate:true})
watch(()=>route.params.id,()=>{failure.value=''})

</script>
<template>
 <section class="loan-module">

  <template v-if="borrowing"><RouterLink :to="path('/earn/loan')" class="loan-borrow-back"><Icon name="arrow-left"/>{{$t('margin.borrow.back')}}</RouterLink><h1 v-if="!product" class="loan-borrow-title"><Coin v-if="product" :symbol="product.loanCurrency"/>{{$t('margin.borrow.titleWithCurrency',{currency:product?.loanCurrency||route.query.currency||''})}}</h1></template>
  <LendingCatalog v-if="!mine&&!borrowing" :products="products" @borrow="choose"/>
  <FeedbackToast v-if="error" type="error" :source="() => (error) ? (([String(($t('lending.errors.unavailable')) ?? ''),&quot; &quot;,''].join(''))) : ''"><button class="green-link" @click="refresh">{{$t('lending.refresh')}}</button></FeedbackToast>
  <p v-if="!session.loggedIn"><RouterLink :to="path('/login')">{{$t('lending.login')}}</RouterLink></p>
  <template v-else>
   <template v-if="!mine">
    <p v-if="!products.length&&!error">{{$t('margin.market.empty')}}</p>
    <p v-if="borrowing&&!product&&!error">{{$t('margin.borrow.notAvailable')}}</p>
    <LendingBorrowForm v-if="product&&borrowing" :product="product" v-model:amount="amount" v-model:days="days" v-model:collateral="collateral" :profile="state.profiles?.[uid]" :wallet="wallet" :required="required" :estimated="estimated" :eligibility="eligibility" :busy="busy" :failure="failure" @submit="submitApplication"/>

   </template>
   <LendingPortfolio v-else :orders="state.orders.filter(o=>o.userId===uid)"/>

  </template>
 </section>
</template>
<style scoped>
.loan-module{display:grid;gap:24px}.loan-products{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:24px}.loan-wallet{display:flex;flex-wrap:wrap;gap:16px}.loan-form{scroll-margin-top:90px;display:grid;gap:16px;max-width:800px}.loan-form label,.loan-filter{display:grid;gap:8px}.loan-form input,.loan-form select,.loan-filter select{width:100%;background:#11151c;color:inherit;border:1px solid #ffffff25;border-radius:10px;padding:12px}.loan-filter{max-width:240px}.loan-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px;padding:20px 0;border-bottom:1px solid #ffffff14}.loan-row small,.loan-row b{display:block}.loan-row small{overflow-wrap:anywhere;color:#9ca3af}.loan-actions{display:flex;flex-wrap:wrap;gap:12px}.details-list dd{overflow-wrap:anywhere}.loan-module button:focus-visible,.loan-module input:focus-visible,.loan-module select:focus-visible{outline:2px solid #c6ff00;outline-offset:3px}@media(max-width:600px){.loan-row>div{flex:1 1 40%}.loan-form{max-width:100%}.loan-module .card{padding:20px}}
</style>
