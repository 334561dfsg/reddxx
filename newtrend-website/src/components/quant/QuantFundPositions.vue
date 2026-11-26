<script setup>
import {computed,shallowRef} from 'vue'
import {fmt,path} from '../../data'
import {session} from '../../session'
import {quantFundAccount,fundMode} from '../../quantFundPortfolio'
import {filterFundOrders,fundSummary,HISTORY_STATUSES} from '../../utils/quantFund'
import Coin from '../Coin.vue'
import Icon from '../Icon.vue'
// Reference positions page: tab groups, summary, order table. Orders belong to the current real/demo mode.
const groups=['all','pending','active','history']
const group=shallowRef('all'),historyStatus=shallowRef('all')
const orders=computed(()=>quantFundAccount.orders.filter(order=>order.mode===fundMode(session.mode)))
const visible=computed(()=>filterFundOrders(orders.value,group.value,historyStatus.value))
const summary=computed(()=>fundSummary(orders.value))
const money=value=>Number(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})
const date=value=>value?new Date(value).toLocaleString('en-GB',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).replace(',',''):'--'
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
  <div class="qf-summary-main"><div><small id="qf-summary-principal">{{ $t('aiQuant.quantFund.positions.summary.totalPrincipal') }}</small><p class="qf-summary-value">{{ money(summary.totalPrincipal) }}<span>USDT</span></p></div><div><small>{{ $t('aiQuant.quantFund.positions.summary.activeInterestPaidTotal') }}</small><p class="qf-summary-value qf-success-text">{{ summary.activeInterestPaidTotal>0?'+':'' }}{{ money(summary.activeInterestPaidTotal) }}<span>USDT</span></p></div></div>
  <dl class="qf-summary-stats"><div><dt>{{ $t('aiQuant.quantFund.positions.summary.totalProjectedInterest') }}</dt><dd class="qf-success-text">{{ money(summary.totalProjectedInterest) }} <span>USDT</span></dd></div><div><dt>{{ $t('aiQuant.quantFund.positions.summary.settledTotalReceived') }}</dt><dd>{{ money(summary.settledTotalReceived) }} <span>USDT</span></dd></div><div><dt>{{ $t('aiQuant.quantFund.positions.summary.activeCount') }}</dt><dd>{{ summary.activeCount }}</dd></div></dl>
 </section>
 <div class="qf-positions-toolbar">
  <div class="qf-tabs" role="tablist" :aria-label="$t('aiQuant.quantFund.positions.title')"><button v-for="(item,index) in groups" :id="'qf-tab-'+item" :key="item" type="button" role="tab" :aria-selected="group===item" aria-controls="qf-positions-panel" :tabindex="group===item?0:-1" :class="{active:group===item}" @click="group=item" @keydown="selectGroup($event,index)">{{ $t('aiQuant.quantFund.positions.tabGroups.'+item) }}<span v-if="item==='pending'&&summary.pendingCount" class="qf-tab-count">{{ summary.pendingCount }}</span></button></div>
  <label v-if="group==='history'" class="qf-history-filter"><span class="sr-only">{{ $t('aiQuant.quantFund.positions.historyFilter.all') }}</span><select v-model="historyStatus"><option value="all">{{ $t('aiQuant.quantFund.positions.historyFilter.all') }}</option><option v-for="status in HISTORY_STATUSES" :key="status" :value="status">{{ $t('aiQuant.quantFund.positions.tabs.'+status) }}</option></select></label>
 </div>
 <div id="qf-positions-panel" role="tabpanel" :aria-labelledby="'qf-tab-'+group">
  <div v-if="!visible.length" class="qf-panel qf-positions-empty"><Icon name="briefcase"/><p>{{ $t('aiQuant.quantFund.positions.empty') }}</p><RouterLink :to="path('/ai-quant/quant-fund')" class="qf-inline-link">{{ $t('aiQuant.quantFund.title') }}</RouterLink></div>
  <div v-else class="qf-panel qf-table-wrap"><table class="qf-table">
   <thead><tr><th scope="col">{{ $t('aiQuant.quantFund.positions.table.status') }}</th><th scope="col">{{ $t('aiQuant.quantFund.positions.table.productName') }}</th><th scope="col" class="num">{{ $t('aiQuant.quantFund.positions.table.principal') }}</th><th scope="col" class="num">{{ $t('aiQuant.quantFund.positions.table.dailyReturn') }}</th><th scope="col">{{ $t('aiQuant.quantFund.positions.table.term') }}</th><th scope="col" class="num">{{ $t('aiQuant.quantFund.positions.table.interestPaidTotal') }}</th><th scope="col">{{ $t('aiQuant.quantFund.positions.table.maturityDate') }}</th></tr></thead>
   <tbody><tr v-for="order in visible" :key="order.id">
    <td><span class="qf-status" :class="order.status">{{ $t('aiQuant.quantFund.positions.tabs.'+order.status) }}</span></td>
    <td><div class="qf-table-product"><Coin :symbol="order.asset"/><span>{{ order.productName }}</span></div></td>
    <td class="num mono">{{ fmt(order.principal) }} {{ order.asset }}</td>
    <td class="num mono qf-success-text">{{ order.dailyReturnPercentSnapshot.toFixed(2) }}%</td>
    <td>{{ $t(...term(order)) }}</td>
    <td class="num mono">{{ money(order.interestPaidTotal) }} {{ order.asset }}</td>
    <td><div>{{ order.maturityDate?date(order.maturityDate):$t('aiQuant.quantFund.positions.maturityPending') }}</div><small>{{ $t('aiQuant.quantFund.positions.table.subscribedAt') }} {{ date(order.subscribedAt) }}</small></td>
   </tr></tbody>
  </table></div>
 </div>
</div>
</template>
