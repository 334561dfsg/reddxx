<script setup>
import BackLink from '../ui/BackLink.vue'
import RequestState from '../ui/RequestState.vue'
import Skeleton from '../ui/Skeleton.vue'
import {computed,shallowRef,watch} from 'vue'
import {useRoute,useRouter} from 'vue-router'
import {loginPath} from '../../utils/redirect'
import {fmt,path} from '../../data'
import {openModal,session} from '../../session'
import {availableQuota,fundProgress,fundEstimate,isAmountDraft} from '../../utils/quantFund'
import {getQuantFund,listQuantFunds} from '../../api/quantFund.js'
import {useRequest} from '../../composables/useRequest.js'
import Icon from '../Icon.vue'
import QuantFundCard from './QuantFundCard.vue'
import QuantSlider from './QuantSlider.vue'
import NotFound from '../../pages/NotFound.vue'
import QuantFundLayout from '../../pages/quant/QuantFundLayout.vue'
// Layout follows the reference product detail page: hero, calculator, flow, quota, sticky summary, more products.
// Loads its product (unknown ids render the not-found page, like EarnDetail) and the catalogue for "more products",
// which may still be empty while it loads. While the product loads, skeleton panels mirror the loaded layout.
const props=defineProps({productId:{type:String,required:true}})
const router=useRouter(),route=useRoute()
const request=useRequest(()=>getQuantFund(props.productId),{key:()=>props.productId,tags:['quantFund']})
const catalog=useRequest(()=>listQuantFunds(),{tags:['quantFund']})
const notFound=computed(()=>request.status.value==='error'&&request.error.value?.code==='notFound')
const product=computed(()=>request.data.value)
const calcAmount=shallowRef(''),calcDays=shallowRef(30)
// Reset the calculator only when a different product is shown, not when a refresh brings new quota figures.
watch(()=>product.value?.id,id=>{if(!id)return;calcAmount.value=String(product.value.minAmount);calcDays.value=product.value.termDays??30},{immediate:true})
const days=computed(()=>calcDays.value)
const estimate=computed(()=>product.value?fundEstimate(product.value,calcAmount.value,days.value):null)
const progress=computed(()=>product.value?fundProgress(product.value):0)
const soldOut=computed(()=>product.value?availableQuota(product.value)<=0:false)
const termLabel=p=>p.termDays===null?'aiQuant.quantFund.card.termFlexible':'aiQuant.quantFund.card.termDaysValue'
const quotaRows=computed(()=>{const p=product.value;return [['aiQuant.quantFund.detail.quotaTotal',p.totalQuota],['aiQuant.quantFund.card.subscribedDisplayed',p.subscribed],['aiQuant.quantFund.card.availableQuota',availableQuota(p)],['aiQuant.quantFund.detail.quotaPerUser',p.perUserQuota]]})
const flow=computed(()=>{const flexible=product.value.termDays===null;return [
 ['wallet','aiQuant.quantFund.detail.flowStep1Title','aiQuant.quantFund.detail.flowStep1Desc'],
 ['calendar-clock','aiQuant.quantFund.detail.flowStep2Title','aiQuant.quantFund.detail.flowStep2Desc'],
 ['hand-coins','aiQuant.quantFund.detail.flowStep3Title','aiQuant.quantFund.detail.flowStep3Desc'],
 ['undo-2','aiQuant.quantFund.detail.flowStep4Title',flexible?'aiQuant.quantFund.detail.flowStep4DescFlexible':'aiQuant.quantFund.detail.flowStep4DescFixed']]})
const moreProducts=computed(()=>(catalog.data.value||[]).filter(p=>p.id!==product.value.id).slice(0,3))
const marks=[30,90,180,365]
function onCalcInput(event){if(isAmountDraft(event.target.value))calcAmount.value=event.target.value;else event.target.value=calcAmount.value}
function openProduct(p){router.push(path(`/ai-quant/quant-fund/products/${p.id}`))}
function subscribe(){
 if(soldOut.value)return
 if(!session.loggedIn){router.push(loginPath(route.fullPath));return}
 openModal('quant-fund-subscribe',{key:'aiQuant.quantFund.subscribe.title',params:{name:product.value.name}},product.value)
}
</script>
<template>
<NotFound v-if="notFound"/>
<QuantFundLayout v-else product-active>
 <RequestState :status="request.status.value" :error="request.error.value" class="qf-panel qf-request-frame" @retry="request.refresh">
  <template #loading>
   <div class="qf-detail-page">
    <BackLink :to="path('/ai-quant/quant-fund')" :title="$t('aiQuant.quantFund.title')" class="qf-back">{{ $t('aiQuant.quantFund.title') }}</BackLink>
    <div class="qf-detail">
     <div class="qf-detail-grid">
      <div class="qf-detail-main">
       <section class="qf-panel qf-skeleton-panel qf-skeleton-hero">
        <Skeleton width="160px" height="22px"/>
        <Skeleton width="70%" height="40px"/>
        <Skeleton width="90%"/>
        <Skeleton width="60%"/>
        <div class="qf-skeleton-tags"><Skeleton width="80px" height="24px"/><Skeleton width="80px" height="24px"/></div>
       </section>
       <section class="qf-panel qf-skeleton-panel qf-skeleton-calc">
        <h2 class="qf-panel-title"><Icon name="calculator"/>{{ $t('aiQuant.quantFund.detail.calcTitle') }}</h2>
        <Skeleton height="72px"/>
        <Skeleton height="96px"/>
        <Skeleton width="80%" height="12px"/>
       </section>
       <section class="qf-panel qf-skeleton-panel qf-skeleton-flow">
        <h2 class="qf-panel-title"><Icon name="route"/>{{ $t('aiQuant.quantFund.detail.flowTitle') }}</h2>
        <Skeleton v-for="n in 4" :key="n" width="70%" height="18px"/>
       </section>
       <section class="qf-panel qf-skeleton-panel qf-skeleton-quota">
        <h2 class="qf-panel-title"><Icon name="shield"/>{{ $t('aiQuant.quantFund.detail.quotaTitle') }}</h2>
        <Skeleton height="64px"/>
        <Skeleton height="6px"/>
        <Skeleton width="100%" height="14px"/>
       </section>
      </div>
      <aside class="qf-panel qf-detail-aside qf-skeleton-panel qf-skeleton-aside">
       <Skeleton height="64px"/>
       <Skeleton width="80px" height="12px"/>
       <Skeleton width="150px" height="44px"/>
       <Skeleton height="6px"/>
       <Skeleton width="100%" height="14px"/>
       <Skeleton height="48px" class="qf-skeleton-cta"/>
      </aside>
     </div>
    </div>
   </div>
  </template>
   <div class="qf-detail-page">
    <BackLink :to="path('/ai-quant/quant-fund')" :title="product.name" class="qf-back">{{ $t('aiQuant.quantFund.title') }}</BackLink>
    <div class="qf-detail">
     <div class="qf-detail-grid">
      <div class="qf-detail-main">
       <section class="qf-panel qf-detail-hero"><div class="qf-card-glow qf-detail-glow" aria-hidden="true"></div>
        <div class="qf-detail-meta"><span class="qf-risk" :class="product.riskLevel.toLowerCase()">{{ $t('aiQuant.quantFund.riskLevel.'+product.riskLevel) }}</span><span>{{ product.code }} · {{ product.asset }}</span></div>
        <h1>{{ product.name }}</h1>
        <p class="qf-detail-description">{{ product.description }}</p>
        <div class="qf-tags"><span v-for="tag in product.strategyTags" :key="tag">{{ tag }}</span></div>
       </section>
       <section class="qf-panel" aria-labelledby="qf-calc-title"><h2 id="qf-calc-title" class="qf-panel-title"><Icon name="calculator"/>{{ $t('aiQuant.quantFund.detail.calcTitle') }}</h2>
        <div class="qf-calc-grid">
         <div class="qf-field"><label for="qf-calc-amount">{{ $t('aiQuant.quantFund.subscribe.amountLabel',{currency:product.asset}) }}</label><div class="qf-input"><input id="qf-calc-amount" :value="calcAmount" inputmode="decimal" autocomplete="off" @input="onCalcInput"/><span>{{ product.asset }}</span></div></div>
         <div class="qf-field"><div class="qf-days-head"><span id="qf-calc-days-label">{{ $t('aiQuant.quantFund.detail.calcDaysLabel') }}</span><strong>{{ $t('aiQuant.quantFund.card.termDaysValue',{days}) }}</strong></div>
          <template v-if="product.termDays===null"><QuantSlider v-model="calcDays" :min="1" :max="365" :marks="marks" labelledby="qf-calc-days-label" :value-text="$t('aiQuant.quantFund.card.termDaysValue',{days})"/><small v-if="product.minHoldDays!==null">{{ $t('aiQuant.quantFund.detail.calcAccrualNote',{days:product.minHoldDays}) }}</small></template>
         </div>
        </div>
        <div class="qf-estimate"><div><span>{{ $t('aiQuant.quantFund.subscribe.estDailyEarnings') }}</span><strong class="qf-success-mono">{{ estimate?`≈ ${fmt(estimate.daily)} ${product.asset}`:'--' }}</strong></div><div class="qf-estimate-total"><span>{{ $t('aiQuant.quantFund.detail.calcEstTotal') }}</span><strong>{{ estimate?`≈ ${fmt(estimate.total)} ${product.asset}`:'--' }}</strong></div></div>
        <p class="qf-faint">{{ $t('aiQuant.quantFund.detail.calcDisclaimer') }}</p>
       </section>
       <section class="qf-panel" aria-labelledby="qf-flow-title"><h2 id="qf-flow-title" class="qf-panel-title"><Icon name="route"/>{{ $t('aiQuant.quantFund.detail.flowTitle') }}</h2>
        <ol class="qf-flow"><li v-for="([icon,title,desc],i) in flow" :key="title"><span class="qf-flow-icon"><Icon :name="icon" green/></span><div><strong>{{ i+1 }}. {{ $t(title) }}</strong><span>{{ $t(desc) }}<template v-if="i===1&&product.termDays===null&&product.minHoldDays!==null"> {{ $t('aiQuant.quantFund.detail.calcAccrualNote',{days:product.minHoldDays}) }}</template></span></div></li></ol>
       </section>
       <section class="qf-panel" aria-labelledby="qf-quota-title"><h2 id="qf-quota-title" class="qf-panel-title"><Icon name="shield"/>{{ $t('aiQuant.quantFund.detail.quotaTitle') }}</h2>
        <dl class="qf-quota"><div v-for="[label,amount] in quotaRows" :key="label"><dt>{{ $t(label) }}</dt><dd>{{ fmt(amount) }}</dd><dd class="qf-unit">{{ product.asset }}</dd></div></dl>
        <div class="qf-progress"><div class="qf-progress-track" role="progressbar" :aria-valuenow="Math.round(progress)" aria-valuemin="0" aria-valuemax="100" :aria-label="$t('aiQuant.quantFund.card.projectProgress')"><span :style="{width:progress+'%'}"></span></div><div class="qf-progress-meta"><span>{{ $t('aiQuant.quantFund.card.projectProgress') }}</span><strong>{{ progress.toFixed(1) }}%</strong></div></div>
       </section>
      </div>
      <aside class="qf-panel qf-detail-aside">
       <div class="qf-aside-facts"><div><small><Icon name="coins"/>{{ $t('aiQuant.quantFund.detail.investmentRange') }}</small><p>{{ fmt(product.minAmount) }} ~ {{ fmt(product.maxAmount) }}</p><span class="qf-unit">{{ product.asset }}</span></div><div><small><Icon name="calendar-clock"/>{{ $t('aiQuant.quantFund.card.term') }}</small><p>{{ $t(termLabel(product),{days:product.termDays}) }}</p><span v-if="product.termDays===null&&product.minHoldDays!==null" class="qf-muted">{{ $t('aiQuant.quantFund.detail.minHoldDays',{days:product.minHoldDays}) }}</span></div></div>
       <div class="qf-aside-rate"><small>{{ $t('aiQuant.quantFund.card.dailyReturn') }}</small><p class="qf-rate qf-rate-lg">{{ product.averageDailyReturnPercent.toFixed(2) }}<span>%</span></p></div>
       <div class="qf-progress"><div class="qf-progress-track" role="progressbar" :aria-valuenow="Math.round(progress)" aria-valuemin="0" aria-valuemax="100" :aria-label="$t('aiQuant.quantFund.card.projectProgress')"><span :style="{width:progress+'%'}"></span></div><div class="qf-progress-meta"><span>{{ $t('aiQuant.quantFund.card.projectProgress') }}</span><strong>{{ progress.toFixed(1) }}%</strong></div></div>
       <button type="button" class="qf-cta qf-cta-lg nt-float-action" :disabled="soldOut" aria-haspopup="dialog" @click="subscribe">{{ $t(soldOut?'aiQuant.quantFund.card.ctaSoldOut':'aiQuant.quantFund.detail.subscribeCta') }}</button>
      </aside>
     </div>
     <section v-if="moreProducts.length" class="qf-more"><h2>{{ $t('aiQuant.quantFund.detail.moreTitle') }}</h2><div class="three-cols qf-grid"><QuantFundCard v-for="p in moreProducts" :key="p.id" :product="p" @open="openProduct"/></div></section>
    </div>
   </div>
 </RequestState>
</QuantFundLayout>
</template>
