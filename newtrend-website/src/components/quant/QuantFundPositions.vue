<script setup>
import {statusLabelKey} from '../../utils/statusLabels.js'
import StatusTag from '../ui/StatusTag.vue'
import EmptyState from '../ui/EmptyState.vue'
import {amount,money} from '../../utils/format.js'
import {computed,h,nextTick,shallowRef,watch} from 'vue'
import {message} from 'ant-design-vue'
import {useRouter} from 'vue-router'
import {fmt,path} from '../../data'
import {openModal,session} from '../../session'
import {filterFundOrders,fundDate,HISTORY_STATUSES,accruedInterestEstimate,canRedeemFund,earlyRedeemFee,fundInLock} from '../../utils/quantFund'
import RequestState from '../ui/RequestState.vue'
import Skeleton from '../ui/Skeleton.vue'
import {getQuantFundPositions,redeemQuantFund} from '../../api/quantFund.js'
import {invalidate,useRequest} from '../../composables/useRequest.js'
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
// Positions for the current mode (the API settles matured orders first); a mode switch reloads with skeletons.
const positions=useRequest(()=>getQuantFundPositions(session.mode),{key:()=>session.mode,tags:['quantFund']})
const loading=computed(()=>positions.status.value==='loading')
const orders=computed(()=>positions.data.value?.orders||[])
const visible=computed(()=>filterFundOrders(orders.value,group.value,historyStatus.value))
// Shared list pager (10 rows); a new tab, status filter or account mode starts again at page 1.
const {page,total,shown}=useFinancePagination(visible,10)
watch([group,historyStatus,()=>session.mode],()=>{page.value=1})
const summary=computed(()=>positions.data.value?.summary)
// Reference table amounts: grouped, up to 2 decimals, no forced trailing zeros (4,999 / 0 / 21.9).
// amount/money come from the shared site formatters

const openOrder=order=>openModal('quant-fund-order','aiQuant.quantFund.positions.detail.title',order)
const router=useRouter()
const hasPayouts=order=>['active','redeem_pending_review','settled','redeemed'].includes(order.status)
const openPayouts=order=>router.push(path(`/ai-quant/quant-fund/positions/${encodeURIComponent(order.id)}/interest-records`))
// Reference redeem dialog: title, principal, review notice, cancel / confirm. The request waits for the admin's review
// (赎回审核, user decision 2026-11-27); interest keeps accruing until it is approved.
// A redeemed row loses its 贖回 button when the refreshed list arrives, possibly after the dialog has already
// returned focus to it: focus then moves to the same row's remaining action (or its product button).
let refocusOrder=null
const focusRow=id=>document.querySelector(`[data-order-id="${CSS.escape(id)}"] .qf-row-action, [data-order-id="${CSS.escape(id)}"] .qf-row-link`)?.focus()
watch(()=>positions.data.value,async()=>{
 const id=refocusOrder;if(!id)return
 refocusOrder=null;await nextTick()
 const active=document.activeElement
 if(!active||active===document.body||!active.isConnected)focusRow(id)
})
function confirmRedeem(order){
 openModal('account-confirm','aiQuant.quantFund.redeem.title',{
  returnFocus:()=>focusRow(order.id),
  subtitle:`${fmt(order.principal)} ${order.asset}`,
  // Inside the lock period the notice states the fixed fee (principal × rate, whatever the days left).
  description:fundInLock(order)?{key:'aiQuant.quantFund.redeem.earlyFeeNotice',params:{rate:order.earlyRedeemFeeRateSnapshot,fee:fmt(earlyRedeemFee(order)),currency:order.asset}}:'aiQuant.quantFund.redeem.reviewNotice',
  cancelLabel:'aiQuant.quantFund.redeem.cancel',confirmLabel:'aiQuant.quantFund.redeem.confirm',
  // Async confirm: the dialog shows a busy confirm action and keeps every close path held until this settles.
  async onConfirm(){
   try{await redeemQuantFund(order.id)}
   catch(cause){invalidate('quantFund');throw new Error(cause.code==='conflict'?'c2c.error.generic':'common.requestFailed')}
   refocusOrder=order.id
   invalidate('quantFund')
   message.success({content:h('span',{class:'qf-redeem-toast'},[h('strong',t('aiQuant.quantFund.redeem.pendingTitle')),' ',t('aiQuant.quantFund.redeem.pendingDescription')])})
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
</script>
<template>
<div class="qf-positions">
 <header class="qf-positions-head"><h1>{{ $t('aiQuant.quantFund.positions.title') }}</h1><p>{{ $t('aiQuant.quantFund.positions.subtitle') }}</p></header>
 <!-- Labels, tabs and the table header always render; figures and rows show skeletons until positions load, so the
      loading layout keeps the loaded spacing. A first-load failure replaces the content with retry. -->
 <RequestState v-if="positions.status.value==='error'" :status="positions.status.value" :error="positions.error.value" class="qf-panel qf-request-frame" @retry="positions.refresh"/>
 <template v-else>
 <span v-if="loading" role="status" class="sr-only">{{ $t('common.loading') }}</span>
 <PortfolioSummaryCard :loading="loading" label-id="qf-summary-principal" :label="$t('aiQuant.quantFund.positions.summary.totalPrincipal')" :value="money(summary?.totalPrincipal??0)" unit="USDT"
  :accent="{value:(summary?.activeInterestPaidTotal>0?'+':'')+money(summary?.activeInterestPaidTotal??0),unit:'USDT',label:$t('aiQuant.quantFund.positions.summary.activeInterestPaidTotal'),tone:'success'}"
  :stats="[{label:$t('aiQuant.quantFund.positions.summary.totalProjectedInterest'),value:money(summary?.totalProjectedInterest??0),unit:'USDT',tone:'success'},{label:$t('aiQuant.quantFund.positions.summary.settledTotalReceived'),value:money(summary?.settledTotalReceived??0),unit:'USDT'},{label:$t('aiQuant.quantFund.positions.summary.activeCount'),value:String(summary?.activeCount??''),sensitive:false}]"/>
 <div class="qf-positions-toolbar">
  <div class="qf-tabs" role="tablist" :aria-label="$t('aiQuant.quantFund.positions.title')"><button v-for="(item,index) in groups" :id="'qf-tab-'+item" :key="item" type="button" role="tab" :aria-selected="group===item" aria-controls="qf-positions-panel" :tabindex="group===item?0:-1" :class="{active:group===item}" @click="group=item" @keydown="selectGroup($event,index)">{{ $t('aiQuant.quantFund.positions.tabGroups.'+item) }}</button></div>
  <div v-if="group==='history'" class="qf-history-filter"><RecordFilter id="qf-history-status" v-model="historyStatus" variant="field" :label="$t('aiQuant.quantFund.positions.historyFilter.all')" :options="historyOptions"/></div>
 </div>
 <div id="qf-positions-panel" role="tabpanel" :aria-labelledby="'qf-tab-'+group">
  <EmptyState v-if="!loading&&!visible.length" class="qf-panel qf-positions-empty" :text="$t('aiQuant.quantFund.positions.empty')"><RouterLink :to="path('/ai-quant/quant-fund')" class="qf-inline-link">{{ $t('aiQuant.quantFund.title') }}</RouterLink></EmptyState>
  <div v-else class="qf-panel qf-table-wrap"><table class="qf-table">
   <thead><tr><th scope="col">{{ $t('aiQuant.quantFund.positions.table.status') }}</th><th scope="col">{{ $t('aiQuant.quantFund.positions.table.productName') }}</th><th scope="col" class="num">{{ $t('aiQuant.quantFund.positions.table.principal') }}</th><th scope="col" class="num">{{ $t('aiQuant.quantFund.positions.table.dailyReturn') }}</th><th scope="col">{{ $t('aiQuant.quantFund.positions.table.term') }}</th><th scope="col" class="num">{{ $t('aiQuant.quantFund.positions.table.interestPaidTotal') }}</th><th scope="col">{{ $t('aiQuant.quantFund.positions.table.maturityDate') }}</th><th scope="col" class="num">{{ $t('aiQuant.quantFund.positions.table.action') }}</th></tr></thead>
   <tbody><template v-if="loading"><tr v-for="n in 5" :key="n" class="qf-skeleton-row-loading" aria-hidden="true"><td><Skeleton width="56px" height="22px"/></td><td><div class="qf-table-product"><Skeleton width="28px" height="28px" round/><Skeleton width="220px"/></div></td><td class="num"><Skeleton width="80px"/></td><td class="num"><Skeleton width="48px"/></td><td><Skeleton width="40px"/></td><td class="num"><Skeleton width="72px"/></td><td><div class="qf-skeleton-lines"><Skeleton width="80px"/><Skeleton width="120px" height="12px"/></div></td><td class="num"><Skeleton width="64px" height="28px"/></td></tr></template><tr v-else v-for="order in shown" :key="order.id" class="qf-row" :data-order-id="order.id" @click="openOrder(order)">
    <td><StatusTag domain="quant-fund" :status="order.status"/></td>
    <td><div class="qf-table-product"><Coin :symbol="order.asset"/><button type="button" class="qf-row-link" aria-haspopup="dialog" @click.stop="openOrder(order)">{{ order.productName }}</button></div></td>
    <td class="num" :data-label="$t('aiQuant.quantFund.positions.table.principal')"><span class="qf-num">{{ amount(order.principal) }}</span><span class="qf-unit">{{ order.asset }}</span></td>
    <td class="num qf-num qf-success-text" :data-label="$t('aiQuant.quantFund.positions.table.dailyReturn')">{{ order.dailyReturnPercentSnapshot.toFixed(2) }}%</td>
    <td :data-label="$t('aiQuant.quantFund.positions.table.term')">{{ $t(...term(order)) }}</td>
    <td class="num" :data-label="$t('aiQuant.quantFund.positions.table.interestPaidTotal')"><div><span class="qf-num">{{ amount(order.interestPaidTotal) }}</span><span class="qf-unit">{{ order.asset }}</span></div><small v-if="order.status==='active'" class="qf-accrued-estimate">{{ $t('aiQuant.quantFund.positions.table.accruedInterestEstimate') }} {{ amount(accruedInterestEstimate(order)) }} {{ order.asset }}</small></td>
    <td class="qf-cell-dates" :data-label="$t('aiQuant.quantFund.positions.table.maturityDate')"><div>{{ fundDate(order.maturityDate) }}</div><small>{{ $t('aiQuant.quantFund.positions.table.subscribedAt') }} {{ fundDate(order.subscribedAt) }}</small></td>
    <td class="num qf-cell-actions"><div class="qf-row-actions" @click.stop><button v-if="canRedeemFund(order)" type="button" class="qf-row-action primary" aria-haspopup="dialog" @click="confirmRedeem(order)">{{ $t('aiQuant.quantFund.redeem.button') }}</button><button v-if="hasPayouts(order)" type="button" class="qf-row-action" @click="openPayouts(order)">{{ $t('aiQuant.quantFund.interestRecords.entry') }}</button></div></td>
   </tr></tbody>
  </table></div><FinancePagination v-if="!loading" v-model:page="page" :total="total" :page-size="10"/>
 </div>
 </template>
</div>
</template>
<style>.qf-skeleton-row-loading td{height:75px}.qf-table td.num .nt-skeleton{margin-left:auto}.qf-skeleton-lines{display:grid;gap:8px}</style>
