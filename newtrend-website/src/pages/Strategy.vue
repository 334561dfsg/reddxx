<script setup>
import QuantAmbient from '../components/quant/QuantAmbient.vue'
import StrategyStatsPage from '../components/strategy/StrategyStatsPage.vue'
import {computed} from 'vue'
import {useRoute} from 'vue-router'
import {path} from '../data'
import {openModal,session} from '../session'
import {strategyFilters as filters} from '../server/strategyPortfolio'
import {getMyStrategies,listStrategyTemplates} from '../api/strategy.js'
import {useRequest} from '../composables/useRequest.js'
import RequestState from '../components/ui/RequestState.vue'
import Skeleton from '../components/ui/Skeleton.vue'
import NotFound from './NotFound.vue'
import {filterStrategies,pickFeatured} from '../utils/strategyTemplates'
import MyStrategies from '../components/strategy/MyStrategies.vue'
import {t} from '../i18n'
import StrategyCard from '../components/strategy/StrategyCard.vue'
import RecordFilter from '../components/RecordFilter.vue'
import Icon from '../components/Icon.vue'
import ChannelSectionSwitch from '../components/ui/ChannelSectionSwitch.vue'
import '../styles/quant-fidelity.css'
import '../styles/strategy-fidelity.css'
import '../styles/quant-system.css'
const route=useRoute(),mine=computed(()=>route.params.id==='mine'),recordId=computed(()=>route.params.recordId||'')
// Catalogue (list view only) and the current mode's account (records, balance, daily stats). Both poll while shown so
// admin changes (listing, review, force stop, generated P&L) appear without a reload.
const wantsCatalog=computed(()=>!mine.value&&!recordId.value)
const catalog=useRequest(()=>wantsCatalog.value?listStrategyTemplates():Promise.resolve([]),{key:wantsCatalog,tags:['strategy'],poll:5000})
// Signed out there is no account: nothing is requested (我的策略 shows the guest prompt, the hero counts 0).
const mineRequest=useRequest(()=>session.loggedIn?getMyStrategies(session.mode):Promise.resolve(null),{key:()=>session.loggedIn+'|'+session.mode,tags:['strategy'],poll:3000})
const strategyCatalog=computed(()=>catalog.data.value||[])
const catalogReady=computed(()=>catalog.status.value==='ready')
const account=computed(()=>mineRequest.data.value)
// Stats page: not-found only once the account has loaded and has no such record.
const statsRecord=computed(()=>account.value?.records.find(item=>item.id===recordId.value)||null)
const statsMissing=computed(()=>Boolean(recordId.value)&&mineRequest.status.value==='ready'&&!statsRecord.value)
const visible=computed(()=>filterStrategies(strategyCatalog.value,filters.style,filters.market,filters.sort))
const sortOptions=computed(()=>['sharpe','winRate','minCapital','period'].flatMap(key=>['desc','asc'].map(order=>({value:`${key}_${order}`,label:t(`aiQuant.templates.sortBy.${key}_${order}`)}))))
const median=computed(()=>{const values=strategyCatalog.value.map(s=>s.sharpe).sort((a,b)=>a-b);return values.length?values[Math.floor(values.length/2)].toFixed(2):'—'})
const featured=computed(()=>pickFeatured(strategyCatalog.value))
const catalogCount=computed(()=>strategyCatalog.value.length)
const heroReady=computed(()=>catalogReady.value&&mineRequest.status.value!=='loading')
// Hero stat switches to the running count once the current account has a running strategy (reference behaviour).
const runningCount=computed(()=>account.value?.records.filter(r=>r.status==='running').length||0)
const sections=computed(()=>[
 {to:path('/ai-quant/strategy'),label:t('aiQuant.nav.strategy'),icon:'bot',active:!mine.value},
 {to:path('/ai-quant/strategy/mine'),label:t('aiQuant.nav.myStrategies'),icon:'chart-candlestick',active:mine.value},
])
function subscribe(product){
 openModal('strategy-subscribe',{key:'aiQuant.create.title',params:{name:product.name}},product)
}
function detail(product){openModal('strategy-detail','aiQuant.detail.title',product)}
</script>
<template>
<div class="strategy-page"><QuantAmbient/>
<NotFound v-if="statsMissing"/><div v-else-if="recordId&&mineRequest.status.value==='error'" class="strategy-container strategy-stats-page"><RequestState :status="mineRequest.status.value" :error="mineRequest.error.value" class="strategy-request-frame" @retry="mineRequest.refresh"/></div><StrategyStatsPage v-else-if="recordId" :record="statsRecord"/><template v-else>
 <div class="strategy-container">
  <ChannelSectionSwitch class="strategy-nav" :items="sections" :aria-label="$t('aiQuant.nav.ariaLabel')"/>
 </div>
 <template v-if="!mine">
 <section class="strategy-hero-section"><div class="strategy-container strategy-hero-grid"><div><p class="strategy-eyebrow">{{ $t('aiQuant.hero.subtitle') }}</p><h1>{{ $t('aiQuant.hero.title') }}</h1><p class="strategy-hero-description">{{ $t('aiQuant.hero.description') }}</p><div class="strategy-hero-actions"><a href="#templates" class="strategy-cta">{{ $t('aiQuant.hero.browseStrategies') }}<Icon name="arrow-right"/></a></div><div class="strategy-stats"><div><small>{{ $t(heroReady&&runningCount?'aiQuant.hero.statActive':'aiQuant.hero.statActiveFallback') }}</small><strong><template v-if="heroReady">{{ runningCount||catalogCount }}</template><Skeleton v-else inline width="48px"/></strong><small>{{ $t(heroReady&&runningCount?'aiQuant.hero.statActiveSub':'aiQuant.hero.statActiveFallbackSub') }}</small></div><div><small>{{ $t('aiQuant.hero.statAvgSharpe') }}</small><strong><template v-if="catalogReady">{{ median }}</template><Skeleton v-else inline width="72px"/></strong><small>{{ $t('aiQuant.hero.statAvgSharpeSub') }}</small></div></div></div><div class="strategy-graph"><p class="strategy-eyebrow">{{ $t('aiQuant.hero.modelsRunning') }}</p><svg class="strategy-hero-chart" viewBox="0 0 360 320" role="img" :aria-label="$t('aiQuant.hero.modelsRunning')"><defs><pattern id="strategy-chart-grid" width="36" height="32" patternUnits="userSpaceOnUse"><path d="M36 0H0V32" fill="none" stroke="currentColor" stroke-width="0.5"/></pattern><linearGradient id="strategy-fit-fade" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stop-color="#a5ff4a" stop-opacity="0"/><stop offset="22%" stop-color="#a5ff4a" stop-opacity="0.9"/><stop offset="100%" stop-color="#a5ff4a" stop-opacity="1"/></linearGradient><linearGradient id="strategy-trace-fade" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stop-color="currentColor" stop-opacity="0"/><stop offset="40%" stop-color="currentColor" stop-opacity="1"/><stop offset="100%" stop-color="currentColor" stop-opacity="0.7"/></linearGradient></defs><g class="chart-faint" opacity="0.55"><rect x="22" y="34" width="316" height="232" fill="url(#strategy-chart-grid)" opacity="0.35"/><line x1="22" y1="266" x2="338" y2="266" stroke="currentColor" stroke-width="0.7"/><line x1="22" y1="34" x2="22" y2="266" stroke="currentColor" stroke-width="0.7"/></g><g class="chart-muted" fill="none" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M28 220 L70 208 L112 200 L160 190 L208 196 L256 180 L304 168 L334 150" stroke="url(#strategy-trace-fade)" opacity="0.35"/><path d="M28 232 L70 224 L112 212 L160 206 L208 200 L256 198 L304 190 L334 178" stroke="url(#strategy-trace-fade)" opacity="0.28"/><path d="M28 244 L70 236 L112 230 L160 222 L208 220 L256 212 L304 206 L334 196" stroke="url(#strategy-trace-fade)" opacity="0.22"/><path d="M28 198 L70 184 L112 192 L160 178 L208 166 L256 172 L304 158 L334 142" stroke="url(#strategy-trace-fade)" opacity="0.42"/><path d="M28 252 L70 256 L112 246 L160 238 L208 230 L256 224 L304 218 L334 212" stroke="url(#strategy-trace-fade)" opacity="0.18"/></g><g class="chart-muted" fill="currentColor" opacity="0.55"><circle cx="70" cy="200" r="1.6"/><circle cx="112" cy="186" r="1.6"/><circle cx="160" cy="172" r="1.6"/><circle cx="208" cy="156" r="1.6"/><circle cx="256" cy="138" r="1.6"/><circle cx="304" cy="118" r="1.6"/></g><g><path d="M28 216 Q90 200 160 168 T334 92" fill="none" stroke="#a5ff4a" stroke-width="2.4" stroke-linecap="round" opacity="0.18"/><path d="M28 216 Q90 200 160 168 T334 92" fill="none" stroke="url(#strategy-fit-fade)" stroke-width="1.5" stroke-linecap="round"/></g><g><circle class="chart-pulse" cx="334" cy="92" r="11" fill="#a5ff4a" opacity="0.18"><animate attributeName="r" values="9;14;9" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.18;0.05;0.18" dur="2.6s" repeatCount="indefinite"/></circle><circle cx="334" cy="92" r="4" fill="#a5ff4a"/></g><g class="chart-faint" font-family="'IBM Plex Mono',monospace" font-size="7.5" text-anchor="middle" opacity="0.5"><text x="70" y="282" fill="currentColor">D-60</text><text x="160" y="282" fill="currentColor">D-30</text><text x="256" y="282" fill="currentColor">D-10</text><text x="328" y="282" fill="currentColor">NOW</text></g></svg></div></div></section>
 <section class="strategy-featured-section"><div class="strategy-container"><h2>{{ $t('aiQuant.sections.featured') }}</h2><p class="strategy-section-description">{{ $t('aiQuant.spotlight.subtitle') }}</p><RequestState v-if="catalog.status.value==='error'" :status="catalog.status.value" :error="catalog.error.value" class="strategy-request-frame" @retry="catalog.refresh"/><div v-else class="strategy-grid strategy-featured-grid"><template v-if="!catalogReady"><span role="status" class="sr-only">{{ $t('common.loading') }}</span><div v-for="n in 3" :key="n" class="sc-card sc-featured sc-skeleton-featured" aria-hidden="true"><div class="sc-skeleton-row"><Skeleton width="44px" height="44px" round/><div class="sc-skeleton-lines"><Skeleton width="140px" height="20px"/><Skeleton width="180px" height="22px"/></div></div><div class="sc-skeleton-lines"><Skeleton/><Skeleton width="70%"/></div><div class="sc-skeleton-grid"><Skeleton v-for="c in 4" :key="c" height="44px"/></div><Skeleton height="44px" class="sc-skeleton-button"/></div></template><StrategyCard v-else v-for="product in featured" :key="product.id" :product="product" featured @detail="detail" @subscribe="subscribe"/></div></div></section>
 <section id="templates" class="strategy-catalog-section"><div class="strategy-container"><h2>{{ $t('aiQuant.templates.title') }}</h2><p class="strategy-section-description">{{ $t('aiQuant.templates.subtitle') }}</p><div class="strategy-filters"><div class="strategy-filter-group"><span>{{ $t('aiQuant.templates.filterByStyle') }}</span><button v-for="value in ['', 'conservative','balanced','aggressive']" :key="value" :aria-pressed="filters.style===(value?'aiQuant.style.'+value:'')" @click="filters.style=value?'aiQuant.style.'+value:''">{{ $t(value?'aiQuant.style.'+value:'aiQuant.templates.filterAll') }}</button></div><div class="strategy-filter-group"><span>{{ $t('aiQuant.templates.filterByMarket') }}</span><button v-for="value in ['', 'crypto','stock','forex','indices']" :key="value" :aria-pressed="filters.market===(value?'aiQuant.market.'+value:'')" @click="filters.market=value?'aiQuant.market.'+value:''">{{ $t(value?'aiQuant.market.'+value:'aiQuant.templates.filterAll') }}</button></div><div class="strategy-sort"><span>{{ $t('aiQuant.templates.sortBy.label') }}</span><RecordFilter id="strategy-sort" v-model="filters.sort" variant="field" :label="$t('aiQuant.templates.sortBy.label')" :options="sortOptions"/></div></div><div v-if="catalog.status.value!=='error'" class="strategy-grid"><template v-if="!catalogReady"><div v-for="n in 9" :key="n" class="sc-card sc-catalog sc-skeleton-catalog" aria-hidden="true"><Skeleton width="60%" height="20px"/><div class="sc-skeleton-row"><Skeleton width="64px" height="22px"/><Skeleton width="64px" height="22px"/><Skeleton width="56px" height="22px"/></div><div class="sc-skeleton-row"><Skeleton width="72px" height="40px"/><Skeleton width="72px" height="40px"/></div><Skeleton width="85%"/><Skeleton height="48px"/><Skeleton height="40px"/><Skeleton height="32px"/></div></template><StrategyCard v-else v-for="product in visible" :key="product.id" :product="product" @detail="detail" @subscribe="subscribe"/><div v-if="visible.length||!catalogReady" class="strategy-guide"><span class="strategy-guide-icon" aria-hidden="true"><Icon name="shield"/></span><div><h3>{{ $t('aiQuant.templates.guideCard.title') }}</h3><p>{{ $t('aiQuant.templates.guideCard.description') }}</p></div><RouterLink class="strategy-outline" :to="path('/ai-quant/quant-fund')">{{ $t('aiQuant.templates.guideCard.cta') }}<Icon name="arrow-right"/></RouterLink></div></div><p v-if="catalogReady&&!visible.length" class="strategy-empty">{{ $t('aiQuant.templates.empty') }}</p></div></section>
 <aside class="strategy-container strategy-risk"><Icon name="shield"/><div><strong>{{ $t('aiQuant.risk.title') }}</strong><p>{{ $t('aiQuant.risk.body') }}</p></div></aside>
 </template>
 <div v-else class="strategy-container strategy-mine"><MyStrategies :account="account" :status="mineRequest.status.value" :error="mineRequest.error.value" @retry="mineRequest.refresh"/></div>
</template>
</div>
</template>
<style>.sc-skeleton-featured,.sc-skeleton-catalog{display:flex;flex-direction:column;gap:16px;pointer-events:none;box-sizing:border-box;overflow:hidden}.sc-skeleton-featured{height:329px}.sc-skeleton-catalog{height:414px}.sc-skeleton-row{display:flex;gap:12px;align-items:center}.sc-skeleton-lines{display:grid;gap:8px;flex:1;min-width:0}.sc-skeleton-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.sc-skeleton-button{margin-top:auto;border-radius:var(--nt-radius-pill)}.strategy-request-frame.nt-request-error{border:1px solid var(--nt-surface-2);border-radius:32px;background:#14161a}</style>
