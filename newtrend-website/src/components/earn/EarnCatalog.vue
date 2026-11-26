<script setup>
import FinancePagination from '../FinancePagination.vue'
import {useFinancePagination} from '../../composables/useFinancePagination'
import {computed,shallowRef,watch} from 'vue'
import {products,path,fmt} from '../../data'
import Coin from '../Coin.vue'
import Icon from '../Icon.vue'
import EarnIcon from './EarnIcon.vue'
import {session} from '../../session'
const filter=shallowRef('all'),sort=shallowRef({key:'rate',direction:-1})
const filters=[['all','zap'],['flexible','clock'],['fixed','lock']]
const visible=computed(()=>products.filter(p=>filter.value==='all'||(filter.value==='fixed'?p.days>0:!p.days)).toSorted((a,b)=>sort.value.direction*(a[sort.value.key]-b[sort.value.key])))
const featured=products.filter(p=>p.hot)
const holdings=['totalHoldings','principal','accruedReward','cumulative','dailyEstimated']
function toggleSort(key){sort.value={key,direction:sort.value.key===key?-sort.value.direction:1}}
function ariaSort(key){return sort.value.key===key?(sort.value.direction===1?'ascending':'descending'):'none'}
watch([filter,sort],()=>page.value=1,{flush:'sync'})
const {page,total,shown}=useFinancePagination(visible)
</script>
<template>
<section class="earn-hero">
 <div class="earn-hero-copy"><div class="earn-eyebrow">{{ $t('earn.header.subtitle') }}</div><h1>{{ $t('earn.header.title') }}</h1><p class="earn-description">{{ $t('earn.header.heroDescription') }}</p><div class="earn-chips"><span><Icon name="sparkles" green/>{{ $t('earn.educational.chip.dailyRateUpTo',{value:'0.0273'}) }}</span><span>{{ $t('earn.educational.chip.types') }}</span></div></div>
 <div v-if="session.loggedIn" class="earn-panel earn-holdings"><p class="earn-kicker"><EarnIcon name="sprout"/>{{ $t('earn.holdings.totalHoldings') }}</p><div class="earn-holdings-grid"><div v-for="(label,index) in holdings" :key="label"><p class="earn-kicker">{{ $t('earn.holdings.'+label) }}</p><strong :class="{'earn-accent':index>1}">{{ index===4?'+':'' }}$<span>0<span class="decimal">.00</span></span></strong></div></div></div>
</section>
<section class="earn-featured"><div class="earn-section-heading"><h2><EarnIcon name="flame"/>{{ $t('earn.featured.title') }}</h2><small>{{ $t('earn.featured.productCount',{count:featured.length}) }}</small></div><div class="earn-featured-grid">
 <RouterLink v-for="p in featured" :key="p.id" :to="path('/earn/simple/'+p.id)" class="earn-panel earn-featured-card"><span class="earn-hot"><EarnIcon name="flame"/>{{ $t('earn.badge.hot') }}</span><div class="earn-product-line"><Coin :symbol="p.symbol"/><div><strong>{{ p.name }}</strong><small><EarnIcon name="clock"/>{{ p.days?$t('common.durationDays',{count:p.days}):$t('earn.tabs.flexible') }}</small></div></div><p class="earn-featured-rate">{{ p.rate.toFixed(4) }}<small>%</small></p><p class="earn-caption">{{ $t('earn.dailyRate.label') }}</p><p class="earn-caption earn-mono">{{ $t('earn.apy.approx',{value:p.apy.toFixed(2)}) }}</p><span class="earn-featured-cta">{{ $t('earn.actions.subscribe') }}<Icon name="chevron-right" green/></span></RouterLink>
</div></section>
<div class="earn-filters"><button v-for="[key,icon] in filters" :key="key" :class="{active:filter===key}" :aria-pressed="filter===key" @click="filter=key"><Icon v-if="icon==='zap'" name="zap"/><EarnIcon v-else :name="icon"/>{{ $t('earn.tabs.'+key) }}</button></div>
<div class="earn-sort-mobile"><button @click="toggleSort('days')">{{ $t('earn.table.columns.term') }} <span aria-hidden="true">{{ sort.key==='days'?(sort.direction===1?'↑':'↓'):'↑↓' }}</span></button><button @click="toggleSort('min')">{{ $t('earn.table.columns.minAmount') }} <span aria-hidden="true">{{ sort.key==='min'?(sort.direction===1?'↑':'↓'):'↑↓' }}</span></button></div>
<div class="earn-panel earn-table"><table><thead><tr><th>{{ $t('earn.table.columns.product') }}</th><th>{{ $t('earn.table.columns.category') }}</th><th :aria-sort="ariaSort('days')"><button @click="toggleSort('days')">{{ $t('earn.table.columns.term') }}<span aria-hidden="true">{{ sort.key==='days'?(sort.direction===1?'↑':'↓'):'↑↓' }}</span></button></th><th :aria-sort="ariaSort('min')"><button @click="toggleSort('min')">{{ $t('earn.table.columns.minAmount') }}<span aria-hidden="true">{{ sort.key==='min'?(sort.direction===1?'↑':'↓'):'↑↓' }}</span></button></th><th>{{ $t('earn.table.columns.totalSubscribed') }}</th><th>{{ $t('earn.table.columns.availableQuota') }}</th><th>{{ $t('earn.table.columns.dailyRate') }}</th><th>{{ $t('earn.table.columns.action') }}</th></tr></thead><tbody>
<tr v-for="p in shown" :key="p.id"><td><RouterLink :to="path('/earn/simple/'+p.id)" class="earn-product-line"><Coin :symbol="p.symbol"/><span><strong>{{ p.name }}</strong><small>{{ p.symbol }}</small></span></RouterLink></td><td :data-label="$t('earn.table.columns.category')"><span class="earn-type">{{ $t(p.days?'earn.tabs.fixed':'earn.tabs.flexible') }}</span></td><td :data-label="$t('earn.table.columns.term')">{{ p.days?$t('common.durationDays',{count:p.days}):$t('earn.tabs.flexible') }}</td><td class="earn-mono" :data-label="$t('earn.table.columns.minAmount')">{{ fmt(p.min) }} {{ p.symbol }}</td><td class="earn-mono" :data-label="$t('earn.table.columns.totalSubscribed')">{{ p.days?fmt(p.subscribed)+' '+p.symbol:'—' }}</td><td class="earn-mono" :data-label="$t('earn.table.columns.availableQuota')">{{ p.remaining }} {{ p.symbol }}</td><td :data-label="$t('earn.table.columns.dailyRate')"><strong class="earn-accent earn-mono">{{ p.rate.toFixed(4) }}%</strong><small class="earn-caption earn-mono">{{ $t('earn.apy.approx',{value:p.apy.toFixed(2)}) }}</small></td><td><RouterLink class="earn-buy" :to="path('/earn/simple/'+p.id)">{{ $t('earn.actions.subscribe') }}</RouterLink></td></tr>
</tbody></table></div>
<FinancePagination v-model:page="page" :total="total"/>
<footer class="earn-page-footer"><span>{{ $t('earn.security.footer') }}</span><p>{{ $t('earn.security.disclaimer') }}</p></footer>
</template>
