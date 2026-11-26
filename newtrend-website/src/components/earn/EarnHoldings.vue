<script setup>
import StatusTag from '../ui/StatusTag.vue'
import LineIcon from '../ui/LineIcon.vue'
import FinancePagination from '../FinancePagination.vue'
import {useFinancePagination} from '../../composables/useFinancePagination'
import {computed} from 'vue'
import {fmt,path} from '../../data'
import {openModal} from '../../session'
import Coin from '../Coin.vue'
import Skeleton from '../ui/Skeleton.vue'
// holdings is null while loading: the table keeps its header and shows skeleton rows.
const props=defineProps({holdings:{type:Array,default:null}})
const loading=computed(()=>props.holdings===null)
const rows=computed(()=>(props.holdings||[]).map(row=>({row,product:row.product})))
const redeemDisabled=row=>row.status==='redeeming'||(row.maturityAt>Date.now()&&!row.earlyRedemption)
function redeem(row){openModal('earn-redeem','earn.redeem.title',{holdingId:row.id,focusCancel:true})}
const {page,total,shown}=useFinancePagination(rows)
</script>
<template>
<div v-if="loading||rows.length" class="earn-panel portfolio-record-table portfolio-holdings-table"><table><thead><tr>
 <th scope="col">{{ $t('earn.myEarnings.table.productName') }}</th><th scope="col">{{ $t('earn.myEarnings.table.principal') }}</th><th scope="col">{{ $t('earn.myEarnings.summary.accruedReward') }}</th><th scope="col">{{ $t('earn.myEarnings.table.dailyRate') }}</th><th scope="col">{{ $t('earn.myEarnings.table.term') }}</th><th scope="col">{{ $t('earn.myEarnings.table.status') }}</th><th scope="col">{{ $t('earn.myEarnings.table.action') }}</th>
</tr></thead><tbody>
<template v-if="loading"><tr v-for="n in 4" :key="n" class="portfolio-skeleton-row" aria-hidden="true"><td><div class="earn-product-line"><Skeleton width="32px" height="32px" round/><div class="portfolio-skeleton-lines"><Skeleton width="150px"/><Skeleton width="44px" height="12px"/></div></div></td><td v-for="w in [100,90,70]" :key="w"><Skeleton :width="w+'px'"/></td><td><div class="portfolio-skeleton-lines"><Skeleton width="56px"/><Skeleton width="80px" height="12px"/></div></td><td><Skeleton width="56px" height="24px"/></td><td><Skeleton width="64px" height="36px"/></td></tr></template>
<tr v-else v-for="{row,product} in shown" :key="row.id">
 <td><RouterLink class="earn-product-line" :to="path('/earn/simple/'+product.id)"><Coin :symbol="row.symbol"/><div><strong>{{ product.name }}</strong><small>{{ row.symbol }}</small></div></RouterLink></td>
 <td :data-label="$t('earn.myEarnings.table.principal')"><strong class="earn-mono">{{ fmt(row.principal) }} {{ row.symbol }}</strong></td>
 <td :data-label="$t('earn.myEarnings.summary.accruedReward')"><strong class="earn-mono positive">{{ fmt(row.accrued) }} {{ row.symbol }}</strong></td>
 <td :data-label="$t('earn.myEarnings.table.dailyRate')"><strong class="earn-mono earn-accent">{{ product.rate.toFixed(4) }}%</strong></td>
 <td :data-label="$t('earn.myEarnings.table.term')"><div class="portfolio-term"><span>{{ product.days?$t('common.durationDays',{count:product.days}):$t('earn.tabs.flexible') }}</span><button class="portfolio-info" :aria-label="$t('earn.actions.viewDetail')+' — '+product.name" @click="openModal('earn-holding',product.name,{holdingId:row.id})"><LineIcon name="info" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"/></button></div><small class="earn-caption"><template v-if="row.status==='redeeming'">{{ $t('earn.myEarnings.holdings.settlingLabel') }}</template><template v-else-if="!product.days">{{ $t('earn.timeline.values.redeemAnytime') }}</template><template v-else-if="row.maturityAt<=Date.now()">{{ $t('earn.myEarnings.holdings.matured') }}</template><template v-else>{{ $t('earn.myEarnings.holdings.daysRemaining',{days:Math.ceil((row.maturityAt-Date.now())/86400000)}) }}</template></small></td>
 <td :data-label="$t('earn.myEarnings.table.status')"><StatusTag domain="earn" :status="row.status"/></td>
 <td class="portfolio-row-action"><button class="earn-buy" :disabled="redeemDisabled(row)" :aria-describedby="redeemDisabled(row)?'redeem-hint-'+row.id:undefined" @click="redeem(row)">{{ $t('earn.actions.redeem') }}</button><p v-if="redeemDisabled(row)" :id="'redeem-hint-'+row.id" class="earn-caption portfolio-disabled-hint">{{ $t(row.status==='redeeming'?'earn.myEarnings.holdings.settlingLabel':'earn.myEarnings.redeemDisabledTooltip') }}</p></td>
</tr></tbody></table></div>
<div v-else class="earn-panel portfolio-empty"><LineIcon set="earn" name="inbox"/><p>{{ $t('earn.myEarnings.empty.holdings') }}</p><RouterLink class="earn-buy" :to="path('/earn/simple')">{{ $t('earn.myEarnings.empty.browseProducts') }}</RouterLink></div>
<FinancePagination v-if="!loading" v-model:page="page" :total="total"/>
</template>
<style>.portfolio-skeleton-lines{display:grid;gap:8px;min-width:0}.portfolio-skeleton-row td{height:95px}@media(max-width:1100px){.portfolio-skeleton-row td{height:auto}}</style>
