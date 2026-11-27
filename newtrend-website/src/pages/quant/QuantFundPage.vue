<script setup>
import {computed,shallowRef} from 'vue'
import {useRoute,useRouter} from 'vue-router'
import {path} from '../../data'
import Icon from '../../components/Icon.vue'
import QuantFundCard from '../../components/quant/QuantFundCard.vue'
import QuantFundPositions from '../../components/quant/QuantFundPositions.vue'
import RequestState from '../../components/ui/RequestState.vue'
import Skeleton from '../../components/ui/Skeleton.vue'
import {listQuantFunds} from '../../api/quantFund.js'
import {useRequest} from '../../composables/useRequest.js'
import QuantFundLayout from './QuantFundLayout.vue'
// /ai-quant/quant-fund (product list) and /ai-quant/quant-fund/positions (我的倉位); the route only allows those two.
const route=useRoute(),router=useRouter()
const positions=computed(()=>route.params.id==='positions')
const market=shallowRef('all')
// The catalogue is requested only for the list, not for positions.
const catalog=useRequest(()=>positions.value?Promise.resolve([]):listQuantFunds(),{key:()=>!positions.value,tags:['quantFund']})
const quantFunds=computed(()=>catalog.data.value||[])
const assets=computed(()=>[...new Set(quantFunds.value.map(p=>p.asset))].sort())
const funds=computed(()=>market.value==='all'?quantFunds.value:quantFunds.value.filter(p=>p.asset===market.value))
function openFund(product){router.push(path(`/ai-quant/quant-fund/products/${product.id}`))}
</script>
<template>
<QuantFundLayout aurora>
 <QuantFundPositions v-if="positions"/>
 <div v-else class="qf-list">
  <section class="qf-hero">
   <div class="qf-hero-glow" aria-hidden="true"></div>
   <div class="qf-hero-copy">
    <span class="qf-hero-eyebrow"><Icon name="sparkles" green/>{{ $t('aiQuant.quantFund.hero.subtitle') }}</span>
    <h1>{{ $t('aiQuant.quantFund.hero.title') }}</h1>
    <p>{{ $t('aiQuant.quantFund.hero.description') }}</p>
   </div>
   <div class="qf-hero-mark" aria-hidden="true">
    <div class="qf-hero-mark-glow"></div>
    <div class="qf-hero-ring"></div>
    <div class="qf-hero-ring dashed"></div>
    <div class="qf-hero-core"><Icon name="bot" green/></div>
    <div class="qf-hero-badge bottom"><Icon name="shield"/></div>
    <div class="qf-hero-badge top"><Icon name="trending-up-down" green/></div>
   </div>
  </section>
  <section class="qf-catalog">
   <div v-if="catalog.status.value==='loading'" class="qf-filters" aria-hidden="true">
    <Skeleton width="72px" height="26px"/>
    <Skeleton width="56px" height="26px"/>
   </div>
   <div v-if="assets.length" class="qf-filters" role="group" :aria-label="$t('aiQuant.quantFund.filters.assetAll')">
    <button type="button" :aria-pressed="market==='all'" :class="{active:market==='all'}" @click="market='all'">{{ $t('aiQuant.quantFund.filters.assetAll') }}</button>
    <button
     v-for="asset in assets"
     :key="asset"
     type="button"
     :aria-pressed="market===asset"
     :class="{active:market===asset}"
     @click="market=asset"
    >{{ asset }}</button>
   </div>
   <RequestState :status="catalog.status.value" :error="catalog.error.value" class="qf-panel qf-request-frame" @retry="catalog.refresh">
    <template #loading>
     <div class="three-cols qf-grid">
      <div v-for="n in 6" :key="n" class="qf-card qf-skeleton-card">
       <div class="qf-card-head">
        <div class="qf-card-title">
         <Skeleton width="32px" height="32px" round/>
         <div class="qf-skeleton-lines"><Skeleton width="180px" height="18px"/><Skeleton width="48px" height="12px"/></div>
        </div>
        <Skeleton width="56px" height="22px"/>
       </div>
       <div class="qf-card-rate">
        <div class="qf-skeleton-lines"><Skeleton width="80px" height="12px"/><Skeleton width="110px" height="30px"/></div>
        <div class="qf-skeleton-lines"><Skeleton width="56px" height="12px"/><Skeleton width="48px" height="18px"/></div>
       </div>
       <div class="qf-skeleton-lines qf-skeleton-limit"><Skeleton width="140px" height="12px"/><Skeleton width="200px" height="18px"/></div>
       <div class="qf-skeleton-lines qf-skeleton-progress"><Skeleton height="6px"/><Skeleton width="100%" height="14px"/></div>
       <div class="qf-skeleton-tags"><Skeleton width="72px" height="24px"/><Skeleton width="72px" height="24px"/></div>
       <Skeleton height="44px" class="qf-skeleton-cta"/>
      </div>
     </div>
    </template>
    <div class="three-cols qf-grid">
     <QuantFundCard v-for="f in funds" :key="f.id" :product="f" @open="openFund"/>
    </div>
   </RequestState>
  </section>
  <footer class="qf-disclaimer"><Icon name="shield"/><span>{{ $t('aiQuant.quantFund.hero.disclaimer') }}</span></footer>
 </div>
</QuantFundLayout>
</template>
