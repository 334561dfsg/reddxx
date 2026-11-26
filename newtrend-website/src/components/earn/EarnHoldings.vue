<script setup>
import FinancePagination from '../FinancePagination.vue'
import {useFinancePagination} from '../../composables/useFinancePagination'
import {computed} from 'vue'
import {products,fmt,path} from '../../data'
import {earnPortfolioFor} from '../../earnPortfolio'
import {openModal,session} from '../../session'
import Coin from '../Coin.vue'
import EarnIcon from './EarnIcon.vue'
const holdings=computed(()=>earnPortfolioFor(session.mode).holdings.filter(row=>row.status!=='redeemed').map(row=>({row,product:products.find(p=>p.id===row.productId)})))
const redeemDisabled=row=>row.status==='redeeming'||(row.maturityAt>Date.now()&&!row.earlyRedemption)
function redeem(row){openModal('earn-redeem','earn.redeem.title',{holdingId:row.id,focusCancel:true})}
const {page,total,shown}=useFinancePagination(holdings)
</script>
<template>
<div v-if="holdings.length" class="earn-panel portfolio-record-table portfolio-holdings-table"><table><thead><tr>
 <th scope="col">{{ $t('earn.myEarnings.table.productName') }}</th><th scope="col">{{ $t('earn.myEarnings.table.principal') }}</th><th scope="col">{{ $t('earn.myEarnings.summary.accruedReward') }}</th><th scope="col">{{ $t('earn.myEarnings.table.dailyRate') }}</th><th scope="col">{{ $t('earn.myEarnings.table.term') }}</th><th scope="col">{{ $t('earn.myEarnings.table.status') }}</th><th scope="col">{{ $t('earn.myEarnings.table.action') }}</th>
</tr></thead><tbody>
<tr v-for="{row,product} in shown" :key="row.id">
 <td><RouterLink class="earn-product-line" :to="path('/earn/simple/'+product.id)"><Coin :symbol="row.symbol"/><div><strong>{{ product.name }}</strong><small>{{ row.symbol }}</small></div></RouterLink></td>
 <td :data-label="$t('earn.myEarnings.table.principal')"><strong class="earn-mono">{{ fmt(row.principal) }} {{ row.symbol }}</strong></td>
 <td :data-label="$t('earn.myEarnings.summary.accruedReward')"><strong class="earn-mono positive">{{ fmt(row.accrued) }} {{ row.symbol }}</strong></td>
 <td :data-label="$t('earn.myEarnings.table.dailyRate')"><strong class="earn-mono earn-accent">{{ product.rate.toFixed(4) }}%</strong></td>
 <td :data-label="$t('earn.myEarnings.table.term')"><div class="portfolio-term"><span>{{ product.days?$t('common.durationDays',{count:product.days}):$t('earn.tabs.flexible') }}</span><button class="portfolio-info" :aria-label="$t('earn.actions.viewDetail')+' — '+product.name" @click="openModal('earn-holding',product.name,{holdingId:row.id})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></svg></button></div><small class="earn-caption"><template v-if="row.status==='redeeming'">{{ $t('earn.myEarnings.holdings.settlingLabel') }}</template><template v-else-if="!product.days">{{ $t('earn.timeline.values.redeemAnytime') }}</template><template v-else-if="row.maturityAt<=Date.now()">{{ $t('earn.myEarnings.holdings.matured') }}</template><template v-else>{{ $t('earn.myEarnings.holdings.daysRemaining',{days:Math.ceil((row.maturityAt-Date.now())/86400000)}) }}</template></small></td>
 <td :data-label="$t('earn.myEarnings.table.status')"><span class="portfolio-status" :class="row.status">{{ $t('earn.myEarnings.status.'+row.status) }}</span></td>
 <td class="portfolio-row-action"><button class="earn-buy" :disabled="redeemDisabled(row)" :aria-describedby="redeemDisabled(row)?'redeem-hint-'+row.id:undefined" @click="redeem(row)">{{ $t('earn.actions.redeem') }}</button><p v-if="redeemDisabled(row)" :id="'redeem-hint-'+row.id" class="earn-caption portfolio-disabled-hint">{{ $t(row.status==='redeeming'?'earn.myEarnings.holdings.settlingLabel':'earn.myEarnings.redeemDisabledTooltip') }}</p></td>
</tr></tbody></table></div>
<div v-else class="earn-panel portfolio-empty"><EarnIcon name="inbox"/><p>{{ $t('earn.myEarnings.empty.holdings') }}</p><RouterLink class="earn-buy" :to="path('/earn/simple')">{{ $t('earn.myEarnings.empty.browseProducts') }}</RouterLink></div>
<FinancePagination v-model:page="page" :total="total"/>
</template>
