<script setup>
import {statusLabelKey} from '../../utils/statusLabels.js'
import StatusTag from '../ui/StatusTag.vue'
import EmptyState from '../ui/EmptyState.vue'
import {amount,money} from '../../utils/format.js'
import {computed,h,shallowRef,watch,onMounted} from 'vue'
import {message} from 'ant-design-vue'
import {useRouter} from 'vue-router'
import {fmt,path} from '../../data'
import {openModal,session} from '../../session'
import {quantFundAccount,fundMode,findQuantFund,refreshQuantFunds} from '../../quantFundPortfolio'
import {filterFundOrders,fundSummary,fundDate,HISTORY_STATUSES,accruedInterestEstimate,canRedeemFund,redeemFund} from '../../utils/quantFund'
import {t} from '../../i18n'
import Coin from '../Coin.vue'
import RecordFilter from '../RecordFilter.vue'
import PortfolioSummaryCard from '../PortfolioSummaryCard.vue'
import FinancePagination from '../FinancePagination.vue'
import {useFinancePagination} from '../../composables/useFinancePagination'
import Icon from '../Icon.vue'
// Reference positions page: tab groups, summary, order table. Orders belong to the current real/demo mode.
const groups=['all','pending','active','history']
// History status filter uses the shared select-only RecordFilter (no native select popup).
const historyOptions=computed(()=>[{value:'all',label:t('aiQuant.quantFund.positions.historyFilter.all')},...HISTORY_STATUSES.map(status=>({value:status,label:t(statusLabelKey('quant-fund',status))}))])
const group=shallowRef('all'),historyStatus=shallowRef('all')
const orders=computed(()=>quantFundAccount.orders.filter(order=>order.mode===fundMode(session.mode)))
const visible=computed(()=>filterFundOrders(orders.value,group.value,historyStatus.value))
// Shared list pager (10 rows); a new tab, status filter or account mode starts again at page 1.
const {page,total,shown}=useFinancePagination(visible,10)
watch([group,historyStatus,()=>session.mode],()=>{page.value=1})
const summary=computed(()=>fundSummary(orders.value))
// Reference table amounts: grouped, up to 2 decimals, no forced trailing zeros (4,999 / 0 / 21.9).
// amount/money come from the shared site formatters

const openOrder=order=>openModal('quant-fund-order','aiQuant.quantFund.positions.detail.title',order)
const router=useRouter()
const hasPayouts=order=>['active','settled','redeemed'].includes(order.status)
const openPayouts=order=>router.push(path(`/ai-quant/quant-fund/positions/${encodeURIComponent(order.id)}/interest-records`))
// Reference redeem dialog: title, principal, interest-settlement notice, cancel / confirm. Settlement is local and immediate.
function confirmRedeem(order){
 const min=order.minHoldDaysSnapshot
 openModal('account-confirm','aiQuant.quantFund.redeem.title',{
  subtitle:`${fmt(order.principal)} ${order.asset}`,
  description:min?{key:'aiQuant.quantFund.redeem.confirmNotice',params:{minHoldDays:min}}:'aiQuant.quantFund.redeem.confirmNoticeNoMin',
  cancelLabel:'aiQuant.quantFund.redeem.cancel',confirmLabel:'aiQuant.quantFund.redeem.confirm',
  onConfirm(){
   const result=redeemFund(quantFundAccount,order,findQuantFund(order.productId))
   if(result.error)throw new Error('c2c.error.generic')
   message.success({content:h('span',{class:'qf-redeem-toast'},[h('strong',t('aiQuant.quantFund.redeem.resultTitle')),' ',t('aiQuant.quantFund.redeem.fundsReturned')])})
  },
 })
}
const term=order=>order.termDaysSnapshot===null?['aiQuant.quantFund.card.termFlexible']:['aiQuant.quantFund.card.termDaysValue',{days:order.termDaysSnapshot}]
function selectGroup(event,index){
 const next=event.key==='ArrowRight'?index+1:event.key==='ArrowLeft'?index-1:null
 if(next===null)return
 event.preventDefault()
 const target=(next+groups.length)%groups.length
 group.value=groups[target]
 event.currentTarget.parentElement.children[target]?.focus()
}
// Settle anything whose term ended while the page was away (mock clock lifecycle).
onMounted(refreshQuantFunds)
</script>
<template>
<div class="qf-positions">
 <header class="qf-positions-head"><h1>{{ $t('aiQuant.quantFund.positions.title') }}</h1><p>{{ $t('aiQuant.quantFund.positions.subtitle') }}</p></header>
 <PortfolioSummaryCard label-id="qf-summary-principal" :label="$t('aiQuant.quantFund.positions.summary.totalPrincipal')" :value="money(summary.totalPrincipal)" unit="USDT"
  :accent="{value:(summary.activeInterestPaidTotal>0?'+':'')+money(summary.activeInterestPaidTotal),unit:'USDT',label:$t('aiQuant.quantFund.positions.summary.activeInterestPaidTotal'),tone:'success'}"
  :stats="[{label:$t('aiQuant.quantFund.positions.summary.totalProjectedInterest'),value:money(summary.totalProjectedInterest),unit:'USDT',tone:'success'},{label:$t('aiQuant.quantFund.positions.summary.settledTotalReceived'),value:money(summary.settledTotalReceived),unit:'USDT'},{label:$t('aiQuant.quantFund.positions.summary.activeCount'),value:String(summary.activeCount),sensitive:false}]"/>
 <div class="qf-positions-toolbar">
  <div class="qf-tabs" role="tablist" :aria-label="$t('aiQuant.quantFund.positions.title')"><button v-for="(item,index) in groups" :id="'qf-tab-'+item" :key="item" type="button" role="tab" :aria-selected="group===item" aria-controls="qf-positions-panel" :tabindex="group===item?0:-1" :class="{active:group===item}" @click="group=item" @keydown="selectGroup($event,index)">{{ $t('aiQuant.quantFund.positions.tabGroups.'+item) }}</button></div>
  <div v-if="group==='history'" class="qf-history-filter"><RecordFilter id="qf-history-status" v-model="historyStatus" variant="field" :label="$t('aiQuant.quantFund.positions.historyFilter.all')" :options="historyOptions"/></div>
 </div>
 <div id="qf-positions-panel" role="tabpanel" :aria-labelledby="'qf-tab-'+group">
  <EmptyState v-if="!visible.length" class="qf-panel qf-positions-empty" :text="$t('aiQuant.quantFund.positions.empty')"><RouterLink :to="path('/ai-quant/quant-fund')" class="qf-inline-link">{{ $t('aiQuant.quantFund.title') }}</RouterLink></EmptyState>
  <div v-else class="qf-panel qf-table-wrap"><table class="qf-table">
   <thead><tr><th scope="col">{{ $t('aiQuant.quantFund.positions.table.status') }}</th><th scope="col">{{ $t('aiQuant.quantFund.positions.table.productName') }}</th><th scope="col" class="num">{{ $t('aiQuant.quantFund.positions.table.principal') }}</th><th scope="col" class="num">{{ $t('aiQuant.quantFund.positions.table.dailyReturn') }}</th><th scope="col">{{ $t('aiQuant.quantFund.positions.table.term') }}</th><th scope="col" class="num">{{ $t('aiQuant.quantFund.positions.table.interestPaidTotal') }}</th><th scope="col">{{ $t('aiQuant.quantFund.positions.table.maturityDate') }}</th><th scope="col" class="num">{{ $t('aiQuant.quantFund.positions.table.action') }}</th></tr></thead>
   <tbody><tr v-for="order in shown" :key="order.id" class="qf-row" @click="openOrder(order)">
    <td><StatusTag domain="quant-fund" :status="order.status"/></td>
    <td><div class="qf-table-product"><Coin :symbol="order.asset"/><button type="button" class="qf-row-link" aria-haspopup="dialog" @click.stop="openOrder(order)">{{ order.productName }}</button></div></td>
    <td class="num"><span class="qf-num">{{ amount(order.principal) }}</span><span class="qf-unit">{{ order.asset }}</span></td>
    <td class="num qf-num qf-success-text">{{ order.dailyReturnPercentSnapshot.toFixed(2) }}%</td>
    <td>{{ $t(...term(order)) }}</td>
    <td class="num"><div><span class="qf-num">{{ amount(order.interestPaidTotal) }}</span><span class="qf-unit">{{ order.asset }}</span></div><small v-if="order.status==='active'" class="qf-accrued-estimate">{{ $t('aiQuant.quantFund.positions.table.accruedInterestEstimate') }} {{ amount(accruedInterestEstimate(order)) }} {{ order.asset }}</small></td>
    <td><div>{{ fundDate(order.maturityDate) }}</div><small>{{ $t('aiQuant.quantFund.positions.table.subscribedAt') }} {{ fundDate(order.subscribedAt) }}</small></td>
    <td class="num"><div class="qf-row-actions" @click.stop><button v-if="canRedeemFund(order)" type="button" class="qf-row-action primary" aria-haspopup="dialog" @click="confirmRedeem(order)">{{ $t('aiQuant.quantFund.redeem.button') }}</button><button v-if="hasPayouts(order)" type="button" class="qf-row-action" @click="openPayouts(order)">{{ $t('aiQuant.quantFund.interestRecords.entry') }}</button></div></td>
   </tr></tbody>
  </table></div><FinancePagination v-model:page="page" :total="total" :page-size="10"/>
 </div>
</div>
</template>
