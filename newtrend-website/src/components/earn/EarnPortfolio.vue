<script setup>
import {shallowRef,watch,nextTick} from 'vue'
import {useRoute} from 'vue-router'
import EarnPortfolioSummary from './EarnPortfolioSummary.vue'
import EarnHoldings from './EarnHoldings.vue'
import EarnRecords from './EarnRecords.vue'
import '../../styles/earn-portfolio.css'
import RequestState from '../ui/RequestState.vue'
import Skeleton from '../ui/Skeleton.vue'
import {session} from '../../session'
import {getEarnPortfolio} from '../../api/earn.js'
import {useRequest} from '../../composables/useRequest.js'
// One portfolio request feeds the summary and every tab; a mode switch reloads it (skeleton), a subscription
// or redemption elsewhere invalidates 'earn' and refreshes it in place.
const {data:portfolio,error,status,refresh}=useRequest(()=>getEarnPortfolio(session.mode),{key:()=>session.mode,tags:['earn']})
const route=useRoute(),tabs=['holdings','orders','redemptions','rewards']
const active=shallowRef('holdings'),tabList=shallowRef(null)
watch(()=>route.query.tab,value=>{if(tabs.includes(value))active.value=value},{immediate:true})
async function moveTab(event,index){
 const key=event.key
 if(!['ArrowLeft','ArrowRight','Home','End'].includes(key))return
 event.preventDefault()
 const next=key==='Home'?0:key==='End'?tabs.length-1:(index+(key==='ArrowRight'?1:-1)+tabs.length)%tabs.length
 active.value=tabs[next]
 await nextTick()
 tabList.value.querySelectorAll('[role=tab]')[next]?.focus()
}
</script>
<template>
<header class="portfolio-heading finance-heading"><h1>{{ $t('earn.myEarnings.title') }}</h1></header>
<RequestState :status="status" :error="error" class="earn-panel" @retry="refresh">
<template #loading>
 <section class="earn-panel portfolio-summary earn-skeleton-lines"><Skeleton width="180px" height="12px"/><Skeleton width="120px" height="14px"/><Skeleton width="220px" height="36px"/><Skeleton width="160px" height="14px"/></section>
 <div class="portfolio-tab-area"><div class="portfolio-tabs" aria-hidden="true"><span v-for="tab in tabs" :key="tab" class="portfolio-tab-placeholder">{{ $t('earn.myEarnings.tabs.'+tab) }}</span></div>
 <div class="earn-panel portfolio-record-table"><table><tbody><tr v-for="n in 4" :key="n"><td><div class="earn-product-line"><Skeleton width="32px" height="32px" round/><div class="earn-skeleton-lines"><Skeleton width="120px"/><Skeleton width="48px" height="12px"/></div></div></td><td v-for="c in 5" :key="c"><Skeleton width="80px"/></td></tr></tbody></table></div></div>
</template>
<EarnPortfolioSummary :summary="portfolio.summary"/>
<div class="portfolio-tab-area"><div ref="tabList" class="portfolio-tabs" role="tablist" :aria-label="$t('earn.myEarnings.title')"><button v-for="(tab,index) in tabs" :id="'portfolio-tab-'+tab" :key="tab" role="tab" :aria-selected="active===tab" :aria-controls="'portfolio-panel-'+tab" :tabindex="active===tab?0:-1" @click="active=tab" @keydown="moveTab($event,index)">{{ $t('earn.myEarnings.tabs.'+tab) }}</button></div>
<div v-for="tab in tabs" v-show="active===tab" :id="'portfolio-panel-'+tab" :key="tab" class="portfolio-tab-panel" role="tabpanel" :aria-labelledby="'portfolio-tab-'+tab" tabindex="0"><EarnHoldings v-if="tab==='holdings'" :holdings="portfolio.holdings"/><EarnRecords v-else :tab="tab" :rows="portfolio[tab]"/></div></div>
</RequestState>
</template>
<style>.earn-skeleton-lines{display:grid;gap:8px;min-width:0}.portfolio-tabs[aria-hidden=true]{gap:24px}.portfolio-tab-placeholder{color:#fff6;padding:8px 0;white-space:nowrap}</style>
