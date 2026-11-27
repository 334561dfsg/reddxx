<script setup>
import StatusTag from '../ui/StatusTag.vue'
import LineIcon from '../ui/LineIcon.vue'
import {dateTime,money} from '../../utils/format.js'
import FinancePagination from '../FinancePagination.vue'
import {useFinancePagination} from '../../composables/useFinancePagination'
import {computed} from 'vue'
import {fmt,path} from '../../data'
import {locale} from '../../i18n'
import {earnPrices} from '../../utils/mockEarnPortfolio'
import Coin from '../Coin.vue'
import Skeleton from '../ui/Skeleton.vue'
// rows is null while loading: the table keeps its header and shows skeleton rows.
const props=defineProps({tab:{type:String,required:true},rows:{type:Array,default:null}})
const loading=computed(()=>props.rows===null)
const rows=computed(()=>props.rows||[])
const columns=computed(()=>props.tab==='orders'
 ?[['amount','earn.myEarnings.table.amount'],['status','earn.myEarnings.table.status'],['createdAt','earn.myEarnings.table.subscribedAt'],['completedAt','earn.myEarnings.table.completedAt']]
 :props.tab==='redemptions'
 ?[['amount','earn.myEarnings.table.amount'],['type','earn.myEarnings.table.redemptionType'],['reward','earn.myEarnings.table.eligibleReward'],['status','earn.myEarnings.table.status'],['createdAt','earn.myEarnings.table.createdAt'],['completedAt','earn.myEarnings.table.completedAt']]
 :[['amount','earn.myEarnings.table.rewardAmount'],['status','earn.myEarnings.table.status'],['rewardAt','earn.myEarnings.table.rewardDate'],['paidAt','earn.myEarnings.table.paidAt']])
const date=value=>dateTime(value,locale.value)
// money/date come from the shared site formatters
const {page,total,shown}=useFinancePagination(rows)
</script>
<template>
<div v-if="loading||rows.length" class="portfolio-records">
 <div class="earn-panel portfolio-record-table"><table><thead><tr><th scope="col">{{ $t('earn.myEarnings.table.productName') }}</th><th v-for="[key,label] in columns" :key="key" scope="col">{{ $t(label) }}</th></tr></thead><tbody><template v-if="loading"><tr v-for="n in 4" :key="n" class="portfolio-skeleton-row" :class="tab" aria-hidden="true"><td><div class="earn-product-line"><Skeleton width="32px" height="32px" round/><div class="portfolio-skeleton-lines"><Skeleton width="150px"/><Skeleton width="44px" height="12px"/></div></div></td><td v-for="[key] in columns" :key="key"><Skeleton :width="key==='status'?'56px':'96px'" :height="key==='status'?'24px':undefined"/></td></tr></template>
<tr v-else v-for="row in shown" :key="row.id">
  <td><RouterLink class="earn-product-line" :to="path('/earn/simple/'+row.productId)"><Coin :symbol="row.symbol"/><div><strong>{{ row.product?.name }}</strong><small>{{ row.symbol }}</small></div></RouterLink></td>
  <td v-for="[key,label] in columns" :key="key" :data-label="$t(label)"><template v-if="key==='amount'||key==='reward'"><strong class="earn-mono" :class="{positive:tab==='rewards'||key==='reward'}">{{ fmt(row[key]) }} {{ row.symbol }}</strong><small v-if="key==='amount'&&tab==='orders'" class="earn-caption">{{ $t('earn.myEarnings.orders.valueUsd',{value:money(row.amount*earnPrices[row.symbol])}) }}</small></template><StatusTag v-else-if="key==='status'" domain="earn" :status="row.status"/><span v-else-if="key==='type'">{{ $t('earn.myEarnings.redemptionType.'+row.type) }}</span><time v-else :datetime="row[key]?new Date(row[key]).toISOString():undefined">{{ date(row[key]) }}</time></td>
 </tr></tbody></table></div>

</div>
<div v-else class="earn-panel portfolio-empty"><LineIcon set="earn" name="inbox"/><p>{{ $t('earn.myEarnings.empty.'+tab) }}</p><RouterLink class="earn-buy" :to="path('/earn/simple')">{{ $t('earn.myEarnings.empty.browseProducts') }}</RouterLink></div>
<FinancePagination scroll v-if="!loading" v-model:page="page" :total="total"/>
</template>
<style>.portfolio-skeleton-lines{display:grid;gap:8px;min-width:0}.portfolio-records .portfolio-skeleton-row td{height:73px}.portfolio-records .portfolio-skeleton-row.orders td{height:84px}@media(max-width:1100px){.portfolio-records .portfolio-skeleton-row td{height:auto}}</style>
