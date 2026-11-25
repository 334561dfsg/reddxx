<script setup>
import {computed} from 'vue'
import {products,fmt,path} from '../../data'
import {locale} from '../../i18n'
import {earnPortfolio} from '../../earnPortfolio'
import {earnPrices} from '../../utils/mockEarnPortfolio'
import Coin from '../Coin.vue'
import EarnIcon from './EarnIcon.vue'
const props=defineProps({tab:{type:String,required:true},limit:{type:Number,default:6}})
const emit=defineEmits(['load-more'])
const rows=computed(()=>earnPortfolio[props.tab].map(row=>({...row,product:products.find(p=>p.id===row.productId)})))
const columns=computed(()=>props.tab==='orders'
 ?[['amount','earn.myEarnings.table.amount'],['status','earn.myEarnings.table.status'],['createdAt','earn.myEarnings.table.subscribedAt'],['completedAt','earn.myEarnings.table.completedAt']]
 :props.tab==='redemptions'
 ?[['amount','earn.myEarnings.table.amount'],['type','earn.myEarnings.table.redemptionType'],['reward','earn.myEarnings.table.eligibleReward'],['status','earn.myEarnings.table.status'],['createdAt','earn.myEarnings.table.createdAt'],['completedAt','earn.myEarnings.table.completedAt']]
 :[['amount','earn.myEarnings.table.rewardAmount'],['status','earn.myEarnings.table.status'],['rewardAt','earn.myEarnings.table.rewardDate'],['paidAt','earn.myEarnings.table.paidAt']])
const date=value=>value?new Date(value).toLocaleString(locale.value,{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):'—'
const money=value=>value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})
</script>
<template>
<div v-if="rows.length" class="portfolio-records">
 <div class="earn-panel portfolio-record-table"><table><thead><tr><th scope="col">{{ $t('earn.myEarnings.table.productName') }}</th><th v-for="[key,label] in columns" :key="key" scope="col">{{ $t(label) }}</th></tr></thead><tbody><tr v-for="row in rows.slice(0,limit)" :key="row.id">
  <td><RouterLink class="earn-product-line" :to="path('/earn/simple/'+row.productId)"><Coin :symbol="row.symbol"/><div><strong>{{ row.product?.name }}</strong><small>{{ row.symbol }}</small></div></RouterLink></td>
  <td v-for="[key,label] in columns" :key="key" :data-label="$t(label)"><template v-if="key==='amount'||key==='reward'"><strong class="earn-mono" :class="{positive:tab==='rewards'||key==='reward'}">{{ fmt(row[key]) }} {{ row.symbol }}</strong><small v-if="key==='amount'&&tab==='orders'" class="earn-caption">{{ $t('earn.myEarnings.orders.valueUsd',{value:money(row.amount*earnPrices[row.symbol])}) }}</small></template><span v-else-if="key==='status'" class="portfolio-status" :class="row.status">{{ $t('earn.myEarnings.status.'+row.status) }}</span><span v-else-if="key==='type'">{{ $t('earn.myEarnings.redemptionType.'+row.type) }}</span><time v-else :datetime="row[key]?new Date(row[key]).toISOString():undefined">{{ date(row[key]) }}</time></td>
 </tr></tbody></table></div>
 <button v-if="rows.length>limit" class="secondary-button portfolio-load-more" @click="emit('load-more')">{{ $t('earn.myEarnings.loadMore') }}</button>
</div>
<div v-else class="earn-panel portfolio-empty"><EarnIcon name="inbox"/><p>{{ $t('earn.myEarnings.empty.'+tab) }}</p><RouterLink class="earn-buy" :to="path('/earn/simple')">{{ $t('earn.myEarnings.empty.browseProducts') }}</RouterLink></div>
</template>
