<script setup>
import {computed,h,shallowRef} from 'vue'
import {message} from 'ant-design-vue'
import {useRouter} from 'vue-router'
import {fmt,path} from '../../data'
import {openModal,session} from '../../session'
import {quantFundAccount,fundMode,findQuantFund} from '../../quantFundPortfolio'
import {filterFundOrders,fundSummary,fundDate,interestProgress,HISTORY_STATUSES,PENDING_STATUSES,accruedInterestEstimate,canRedeemFund,redeemFund} from '../../utils/quantFund'
import {t} from '../../i18n'
import Coin from '../Coin.vue'
import Icon from '../Icon.vue'
// Reference positions page: tab groups, summary, order table. Orders belong to the current real/demo mode.
const groups=['all','pending','active','history']
const group=shallowRef('all'),historyStatus=shallowRef('all')
const orders=computed(()=>quantFundAccount.orders.filter(order=>order.mode===fundMode(session.mode)))
const visible=computed(()=>filterFundOrders(orders.value,group.value,historyStatus.value))
const summary=computed(()=>fundSummary(orders.value))
const money=value=>Number(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})
const progress=computed(()=>interestProgress(summary.value.activeInterestPaidTotal,summary.value.totalProjectedInterest))
// 30-day cumulative payout trend. Pending orders accrue nothing yet, so the local series stays flat at zero.
const TREND_DAYS=30
const trend=computed(()=>Array.from({length:TREND_DAYS},()=>summary.value.activeInterestPaidTotal))
const trendPath=computed(()=>{const values=trend.value,max=Math.max(...values,0),step=120/(values.length-1);return values.map((v,i)=>`${i?'L':'M'}${(i*step).toFixed(1)} ${(max?32-v/max*28:30).toFixed(1)}`).join(' ')})
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
</script>
<template>
<div class="qf-positions">
 <header class="qf-positions-head"><h1>{{ $t('aiQuant.quantFund.positions.title') }}</h1><p>{{ $t('aiQuant.quantFund.positions.subtitle') }}</p></header>
 <section class="qf-panel qf-summary" aria-labelledby="qf-summary-principal">
  <div class="qf-summary-main"><div><small id="qf-summary-principal">{{ $t('aiQuant.quantFund.positions.summary.totalPrincipal') }}</small><p class="qf-summary-value">{{ money(summary.totalPrincipal) }}<span>USDT</span></p></div><div><small>{{ $t('aiQuant.quantFund.positions.summary.activeInterestPaidTotal') }}</small><p class="qf-summary-value qf-success-text">{{ summary.activeInterestPaidTotal>0?'+':'' }}{{ money(summary.activeInterestPaidTotal) }}<span>USDT</span></p><div v-if="progress!==null" class="qf-summary-progress"><div class="qf-progress-track" role="progressbar" :aria-valuenow="Math.round(progress)" aria-valuemin="0" aria-valuemax="100" :aria-label="$t('aiQuant.quantFund.positions.summary.interestProgress',{percent:Math.round(progress)})"><span :style="{width:progress+'%'}"></span></div><small>{{ $t('aiQuant.quantFund.positions.summary.interestProgress',{percent:Math.round(progress)}) }}</small></div></div><figure class="qf-trend"><figcaption>{{ $t('aiQuant.quantFund.positions.summary.earningsTrend',{days:TREND_DAYS}) }}</figcaption><svg viewBox="0 0 120 34" preserveAspectRatio="none" role="img" :aria-label="$t('aiQuant.quantFund.positions.summary.earningsTrend',{days:TREND_DAYS})+': '+money(summary.activeInterestPaidTotal)+' USDT'"><path :d="trendPath" fill="none" stroke="#2bc287" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg></figure></div>
  <dl class="qf-summary-stats"><div><dt>{{ $t('aiQuant.quantFund.positions.summary.totalProjectedInterest') }}</dt><dd class="qf-success-text">{{ money(summary.totalProjectedInterest) }} <span>USDT</span></dd></div><div><dt>{{ $t('aiQuant.quantFund.positions.summary.settledTotalReceived') }}</dt><dd>{{ money(summary.settledTotalReceived) }} <span>USDT</span></dd></div><div><dt>{{ $t('aiQuant.quantFund.positions.summary.activeCount') }}</dt><dd>{{ summary.activeCount }}</dd></div></dl>
 </section>
 <div class="qf-positions-toolbar">
  <div class="qf-tabs" role="tablist" :aria-label="$t('aiQuant.quantFund.positions.title')"><button v-for="(item,index) in groups" :id="'qf-tab-'+item" :key="item" type="button" role="tab" :aria-selected="group===item" aria-controls="qf-positions-panel" :tabindex="group===item?0:-1" :class="{active:group===item}" @click="group=item" @keydown="selectGroup($event,index)">{{ $t('aiQuant.quantFund.positions.tabGroups.'+item) }}<span v-if="item==='pending'&&summary.pendingCount" class="qf-tab-count">{{ summary.pendingCount }}</span></button></div>
  <label v-if="group==='history'" class="qf-history-filter"><span class="sr-only">{{ $t('aiQuant.quantFund.positions.historyFilter.all') }}</span><select v-model="historyStatus"><option value="all">{{ $t('aiQuant.quantFund.positions.historyFilter.all') }}</option><option v-for="status in HISTORY_STATUSES" :key="status" :value="status">{{ $t('aiQuant.quantFund.positions.tabs.'+status) }}</option></select></label>
 </div>
 <div id="qf-positions-panel" role="tabpanel" :aria-labelledby="'qf-tab-'+group">
  <div v-if="!visible.length" class="qf-panel qf-positions-empty"><Icon name="briefcase"/><p>{{ $t('aiQuant.quantFund.positions.empty') }}</p><RouterLink :to="path('/ai-quant/quant-fund')" class="qf-inline-link">{{ $t('aiQuant.quantFund.title') }}</RouterLink></div>
  <div v-else class="qf-panel qf-table-wrap"><table class="qf-table">
   <thead><tr><th scope="col">{{ $t('aiQuant.quantFund.positions.table.status') }}</th><th scope="col">{{ $t('aiQuant.quantFund.positions.table.productName') }}</th><th scope="col" class="num">{{ $t('aiQuant.quantFund.positions.table.principal') }}</th><th scope="col" class="num">{{ $t('aiQuant.quantFund.positions.table.dailyReturn') }}</th><th scope="col">{{ $t('aiQuant.quantFund.positions.table.term') }}</th><th scope="col" class="num">{{ $t('aiQuant.quantFund.positions.table.interestPaidTotal') }}</th><th scope="col">{{ $t('aiQuant.quantFund.positions.table.maturityDate') }}</th><th scope="col" class="num">{{ $t('aiQuant.quantFund.positions.table.action') }}</th></tr></thead>
   <tbody><tr v-for="order in visible" :key="order.id" class="qf-row" @click="openOrder(order)">
    <td><span class="qf-status" :class="order.status">{{ $t('aiQuant.quantFund.positions.tabs.'+order.status) }}</span></td>
    <td><div class="qf-table-product"><Coin :symbol="order.asset"/><button type="button" class="qf-row-link" aria-haspopup="dialog" @click.stop="openOrder(order)">{{ order.productName }}</button></div></td>
    <td class="num mono">{{ fmt(order.principal) }} {{ order.asset }}</td>
    <td class="num mono qf-success-text">{{ order.dailyReturnPercentSnapshot.toFixed(2) }}%</td>
    <td>{{ $t(...term(order)) }}</td>
    <td class="num mono"><div>{{ money(order.interestPaidTotal) }} {{ order.asset }}</div><small v-if="order.status==='active'" class="qf-accrued-estimate">{{ $t('aiQuant.quantFund.positions.table.accruedInterestEstimate') }} {{ money(accruedInterestEstimate(order)) }} {{ order.asset }}</small></td>
    <td><div>{{ order.maturityDate?fundDate(order.maturityDate):PENDING_STATUSES.includes(order.status)?$t('aiQuant.quantFund.positions.maturityPending'):'—' }}</div><small>{{ $t('aiQuant.quantFund.positions.table.subscribedAt') }} {{ fundDate(order.subscribedAt) }}</small></td>
    <td class="num"><div class="qf-row-actions" @click.stop><button v-if="canRedeemFund(order)" type="button" class="qf-row-action primary" aria-haspopup="dialog" @click="confirmRedeem(order)">{{ $t('aiQuant.quantFund.redeem.button') }}</button><button v-if="hasPayouts(order)" type="button" class="qf-row-action" @click="openPayouts(order)">{{ $t('aiQuant.quantFund.interestRecords.entry') }}</button></div></td>
   </tr></tbody>
  </table></div>
 </div>
</div>
</template>
