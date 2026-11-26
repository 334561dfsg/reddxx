<script setup>
import LineIcon from '../ui/LineIcon.vue'
import FinancePagination from '../FinancePagination.vue'
import {useFinancePagination} from '../../composables/useFinancePagination'
import {computed,shallowRef,watch} from 'vue'
import {path,fmt} from '../../data'
import Skeleton from '../ui/Skeleton.vue'
import RequestState from '../ui/RequestState.vue'
import {listEarnProducts} from '../../api/earn.js'
import {useRequest} from '../../composables/useRequest.js'
import Coin from '../Coin.vue'
import Icon from '../Icon.vue'
import {session} from '../../session'
const {data,error,status,refresh}=useRequest(listEarnProducts,{tags:['earn']})
const products=computed(()=>data.value||[]),ready=computed(()=>status.value==='ready')
const filter=shallowRef('all'),sort=shallowRef({key:'rate',direction:-1})
const filters=[['all','zap'],['flexible','clock'],['fixed','lock']]
const visible=computed(()=>products.value.filter(p=>filter.value==='all'||(filter.value==='fixed'?p.days>0:!p.days)).toSorted((a,b)=>sort.value.direction*(a[sort.value.key]-b[sort.value.key])))
const featured=computed(()=>products.value.filter(p=>p.hot))
const holdings=['totalHoldings','principal','accruedReward','cumulative','dailyEstimated']
function toggleSort(key){sort.value={key,direction:sort.value.key===key?-sort.value.direction:1}}
function ariaSort(key){return sort.value.key===key?(sort.value.direction===1?'ascending':'descending'):'none'}
watch([filter,sort],()=>page.value=1,{flush:'sync'})
const {page,total,shown}=useFinancePagination(visible)
</script>
<template>
<section class="earn-hero">
 <div class="earn-hero-copy"><div class="earn-eyebrow">{{ $t('earn.header.subtitle') }}</div><h1>{{ $t('earn.header.title') }}</h1><p class="earn-description">{{ $t('earn.header.heroDescription') }}</p><div class="earn-chips"><span><Icon name="sparkles" green/>{{ $t('earn.educational.chip.dailyRateUpTo',{value:'0.0273'}) }}</span><span>{{ $t('earn.educational.chip.types') }}</span></div></div>
 <div v-if="session.loggedIn" class="earn-panel earn-holdings nt-glow-host"><span class="nt-glow" aria-hidden="true"></span><p class="earn-kicker"><LineIcon set="earn" name="sprout"/>{{ $t('earn.holdings.totalHoldings') }}</p><div class="earn-holdings-grid"><div v-for="(label,index) in holdings" :key="label"><p class="earn-kicker">{{ $t('earn.holdings.'+label) }}</p><strong :class="{'earn-accent':index>1}">{{ index===4?'+':'' }}$<span>0<span class="decimal">.00</span></span></strong></div></div></div>
</section>
<!-- Static parts (headings, filters, sort, table header) always render; only data swaps between skeletons and rows,
     so the loading layout keeps the loaded spacing. A first-load failure replaces the data area with retry. -->
<RequestState v-if="status==='error'" :status="status" :error="error" class="earn-request-frame" @retry="refresh"/>
<template v-else>
<span v-if="!ready" role="status" class="sr-only">{{ $t('common.loading') }}</span>
<section class="earn-featured"><div class="earn-section-heading"><h2><LineIcon set="earn" name="flame"/>{{ $t('earn.featured.title') }}</h2><small v-if="ready">{{ $t('earn.featured.productCount',{count:featured.length}) }}</small></div><div class="earn-featured-grid">
 <template v-if="!ready"><div v-for="n in 3" :key="n" class="earn-panel earn-featured-card" aria-hidden="true"><Skeleton width="56px" height="24px"/><div class="earn-product-line"><Skeleton width="32px" height="32px" round/><div class="earn-skeleton-lines"><Skeleton width="140px" height="18px"/><Skeleton width="64px" height="16px"/></div></div><Skeleton width="150px" height="41px" class="earn-skeleton-rate"/><Skeleton width="72px" height="12px" class="earn-skeleton-caption"/><Skeleton width="96px" height="12px" class="earn-skeleton-caption second"/><Skeleton width="56px" height="16px" class="earn-skeleton-cta"/></div></template>
 <RouterLink v-else v-for="p in featured" :key="p.id" :to="path('/earn/simple/'+p.id)" class="earn-panel earn-featured-card nt-glow-host"><span class="nt-glow glow-earn-hot" aria-hidden="true"></span><span class="earn-hot"><LineIcon set="earn" name="flame"/>{{ $t('earn.badge.hot') }}</span><div class="earn-product-line"><Coin :symbol="p.symbol"/><div><strong>{{ p.name }}</strong><small><LineIcon set="earn" name="clock"/>{{ p.days?$t('common.durationDays',{count:p.days}):$t('earn.tabs.flexible') }}</small></div></div><p class="earn-featured-rate">{{ p.rate.toFixed(4) }}<small>%</small></p><p class="earn-caption">{{ $t('earn.dailyRate.label') }}</p><p class="earn-caption earn-mono">{{ $t('earn.apy.approx',{value:p.apy.toFixed(2)}) }}</p><span class="earn-featured-cta">{{ $t('earn.actions.subscribe') }}<Icon name="chevron-right" green/></span></RouterLink>
</div></section>
<div class="earn-filters"><button v-for="[key,icon] in filters" :key="key" :class="{active:filter===key}" :aria-pressed="filter===key" @click="filter=key"><Icon v-if="icon==='zap'" name="zap"/><LineIcon set="earn" v-else :name="icon"/>{{ $t('earn.tabs.'+key) }}</button></div>
<div class="earn-sort-mobile"><button @click="toggleSort('days')">{{ $t('earn.table.columns.term') }} <span aria-hidden="true">{{ sort.key==='days'?(sort.direction===1?'↑':'↓'):'↑↓' }}</span></button><button @click="toggleSort('min')">{{ $t('earn.table.columns.minAmount') }} <span aria-hidden="true">{{ sort.key==='min'?(sort.direction===1?'↑':'↓'):'↑↓' }}</span></button></div>
<div class="earn-panel earn-table"><table><thead><tr><th>{{ $t('earn.table.columns.product') }}</th><th>{{ $t('earn.table.columns.category') }}</th><th :aria-sort="ariaSort('days')"><button @click="toggleSort('days')">{{ $t('earn.table.columns.term') }}<span aria-hidden="true">{{ sort.key==='days'?(sort.direction===1?'↑':'↓'):'↑↓' }}</span></button></th><th :aria-sort="ariaSort('min')"><button @click="toggleSort('min')">{{ $t('earn.table.columns.minAmount') }}<span aria-hidden="true">{{ sort.key==='min'?(sort.direction===1?'↑':'↓'):'↑↓' }}</span></button></th><th>{{ $t('earn.table.columns.totalSubscribed') }}</th><th>{{ $t('earn.table.columns.availableQuota') }}</th><th>{{ $t('earn.table.columns.dailyRate') }}</th><th>{{ $t('earn.table.columns.action') }}</th></tr></thead><tbody>
<template v-if="!ready"><tr v-for="n in 6" :key="n" class="earn-skeleton-row" aria-hidden="true"><td><div class="earn-product-line"><Skeleton width="32px" height="32px" round/><div class="earn-skeleton-lines"><Skeleton width="150px"/><Skeleton width="44px" height="12px"/></div></div></td><td><Skeleton width="56px" height="24px"/></td><td><Skeleton width="56px"/></td><td><Skeleton width="80px"/></td><td><Skeleton width="96px"/></td><td><Skeleton width="104px"/></td><td><Skeleton width="72px" height="18px"/><Skeleton width="64px" height="12px" class="earn-skeleton-caption"/></td><td><Skeleton width="64px" height="36px"/></td></tr></template>
<tr v-else v-for="p in shown" :key="p.id"><td><RouterLink :to="path('/earn/simple/'+p.id)" class="earn-product-line"><Coin :symbol="p.symbol"/><span><strong>{{ p.name }}</strong><small>{{ p.symbol }}</small></span></RouterLink></td><td :data-label="$t('earn.table.columns.category')"><span class="earn-type">{{ $t(p.days?'earn.tabs.fixed':'earn.tabs.flexible') }}</span></td><td :data-label="$t('earn.table.columns.term')">{{ p.days?$t('common.durationDays',{count:p.days}):$t('earn.tabs.flexible') }}</td><td class="earn-mono" :data-label="$t('earn.table.columns.minAmount')">{{ fmt(p.min) }} {{ p.symbol }}</td><td class="earn-mono" :data-label="$t('earn.table.columns.totalSubscribed')">{{ p.days?fmt(p.subscribed)+' '+p.symbol:'—' }}</td><td class="earn-mono" :data-label="$t('earn.table.columns.availableQuota')">{{ p.remaining }} {{ p.symbol }}</td><td :data-label="$t('earn.table.columns.dailyRate')"><strong class="earn-accent earn-mono">{{ p.rate.toFixed(4) }}%</strong><small class="earn-caption earn-mono">{{ $t('earn.apy.approx',{value:p.apy.toFixed(2)}) }}</small></td><td><RouterLink class="earn-buy" :to="path('/earn/simple/'+p.id)">{{ $t('earn.actions.subscribe') }}</RouterLink></td></tr>
</tbody></table></div>
<FinancePagination v-if="ready" v-model:page="page" :total="total"/>
</template>
<footer class="earn-page-footer"><span>{{ $t('earn.security.footer') }}</span><p>{{ $t('earn.security.disclaimer') }}</p></footer>
</template>
<style>.earn-skeleton-lines{display:grid;gap:8px;min-width:0}.earn-featured-card[aria-hidden=true]{display:flex;flex-direction:column;align-items:flex-start}.earn-featured-card[aria-hidden=true] .earn-product-line{align-self:stretch}.earn-featured-card .earn-skeleton-lines{gap:6px}.earn-featured-card .earn-skeleton-rate{margin-bottom:8px}.earn-featured-card .earn-skeleton-caption{margin:3px 0}.earn-featured-card .earn-skeleton-caption.second{margin-top:5px}.earn-featured-card .earn-skeleton-cta{margin-top:16px}.earn-table td .earn-skeleton-caption{margin-top:6px}.earn-table td:nth-child(n+5) .nt-skeleton{margin-left:auto}.earn-skeleton-row td{height:76.6px}@media(max-width:900px){.earn-table td:nth-child(n+5) .nt-skeleton{margin-left:0}.earn-skeleton-row td{height:auto}.earn-table .earn-skeleton-row td:last-child .nt-skeleton{margin-left:auto}}.earn-request-frame.nt-request-error{border:1px solid #ffffff0c;border-radius:var(--nt-radius-panel);margin-top:24px}</style>
