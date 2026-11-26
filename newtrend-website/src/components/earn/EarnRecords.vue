<script setup>
import {dateTime,money} from '../../utils/format.js'
import {session} from '../../session'
import FinancePagination from '../FinancePagination.vue'
import {useFinancePagination} from '../../composables/useFinancePagination'
import {computed} from 'vue'
import {products,fmt,path} from '../../data'
import {locale} from '../../i18n'
import {earnPortfolioFor} from '../../earnPortfolio'
import {earnPrices} from '../../utils/mockEarnPortfolio'
import Coin from '../Coin.vue'
import EarnIcon from './EarnIcon.vue'
const props=defineProps({tab:{type:String,required:true}})
const rows=computed(()=>earnPortfolioFor(session.mode)[props.tab].map(row=>({...row,product:products.find(p=>p.id===row.productId)})))
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
<div v-if="rows.length" class="portfolio-records">
 <div class="earn-panel portfolio-record-table"><table><thead><tr><th scope="col">{{ $t('earn.myEarnings.table.productName') }}</th><th v-for="[key,label] in columns" :key="key" scope="col">{{ $t(label) }}</th></tr></thead><tbody><tr v-for="row in shown" :key="row.id">
  <td><RouterLink class="earn-product-line" :to="path('/earn/simple/'+row.productId)"><Coin :symbol="row.symbol"/><div><strong>{{ row.product?.name }}</strong><small>{{ row.symbol }}</small></div></RouterLink></td>
  <td v-for="[key,label] in columns" :key="key" :data-label="$t(label)"><template v-if="key==='amount'||key==='reward'"><strong class="earn-mono" :class="{positive:tab==='rewards'||key==='reward'}">{{ fmt(row[key]) }} {{ row.symbol }}</strong><small v-if="key==='amount'&&tab==='orders'" class="earn-caption">{{ $t('earn.myEarnings.orders.valueUsd',{value:money(row.amount*earnPrices[row.symbol])}) }}</small></template><span v-else-if="key==='status'" class="portfolio-status" :class="row.status">{{ $t('earn.myEarnings.status.'+row.status) }}</span><span v-else-if="key==='type'">{{ $t('earn.myEarnings.redemptionType.'+row.type) }}</span><time v-else :datetime="row[key]?new Date(row[key]).toISOString():undefined">{{ date(row[key]) }}</time></td>
 </tr></tbody></table></div>

</div>
<div v-else class="earn-panel portfolio-empty"><EarnIcon name="inbox"/><p>{{ $t('earn.myEarnings.empty.'+tab) }}</p><RouterLink class="earn-buy" :to="path('/earn/simple')">{{ $t('earn.myEarnings.empty.browseProducts') }}</RouterLink></div>
<FinancePagination v-model:page="page" :total="total"/>
</template>
