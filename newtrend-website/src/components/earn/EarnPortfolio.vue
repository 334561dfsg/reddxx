<script setup>
import {shallowRef,watch,nextTick} from 'vue'
import {useRoute} from 'vue-router'
import EarnPortfolioSummary from './EarnPortfolioSummary.vue'
import EarnHoldings from './EarnHoldings.vue'
import EarnRecords from './EarnRecords.vue'
import '../../styles/earn-portfolio.css'
import RequestState from '../ui/RequestState.vue'
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
<!-- Labels, tabs and table headers always render; values and rows show skeletons until the portfolio loads,
     so the loading layout keeps the loaded spacing. A first-load failure replaces it with retry. -->
<RequestState v-if="status==='error'" :status="status" :error="error" class="earn-panel" @retry="refresh"/>
<template v-else>
<span v-if="!portfolio" role="status" class="sr-only">{{ $t('common.loading') }}</span>
<EarnPortfolioSummary :summary="portfolio?.summary||null"/>
<div class="portfolio-tab-area"><div ref="tabList" class="portfolio-tabs" role="tablist" :aria-label="$t('earn.myEarnings.title')"><button v-for="(tab,index) in tabs" :id="'portfolio-tab-'+tab" :key="tab" role="tab" :aria-selected="active===tab" :aria-controls="'portfolio-panel-'+tab" :tabindex="active===tab?0:-1" @click="active=tab" @keydown="moveTab($event,index)">{{ $t('earn.myEarnings.tabs.'+tab) }}</button></div>
<div v-for="tab in tabs" v-show="active===tab" :id="'portfolio-panel-'+tab" :key="tab" class="portfolio-tab-panel" role="tabpanel" :aria-labelledby="'portfolio-tab-'+tab" :aria-busy="!portfolio||undefined" tabindex="0"><EarnHoldings v-if="tab==='holdings'" :holdings="portfolio?.holdings||null"/><EarnRecords v-else :tab="tab" :rows="portfolio?.[tab]||null"/></div></div>
</template>
</template>
