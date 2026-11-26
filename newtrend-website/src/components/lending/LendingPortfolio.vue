<script setup>
import FinancePagination from '../FinancePagination.vue'
import {computed,ref,watch} from 'vue'
import {fmt,path} from '../../data'
import {useRoute,useRouter} from 'vue-router'
import Coin from '../Coin.vue'
import Icon from '../Icon.vue'
import '../../styles/earn-portfolio.css'
const props=defineProps({orders:Array})
const route=useRoute(),router=useRouter()
const filter=ref(['ongoing','completed','other'].includes(route.query.group)?route.query.group:'ongoing'),page=ref(Math.max(1,Number(route.query.page)||1))
const groups={ongoing:['pending','active','repaying','overdue'],completed:['completed'],other:['rejected','cancelled','liquidated']}
const filtered=computed(()=>props.orders.filter(o=>groups[filter.value].includes(o.status)))
const pages=computed(()=>Math.max(1,Math.ceil(filtered.value.length/10)))
const shown=computed(()=>filtered.value.slice((page.value-1)*10,page.value*10))
watch(filter,()=>page.value=1);watch(pages,n=>page.value=Math.min(page.value,n))
const totals=computed(()=>['USDT','USDC'].map(currency=>({currency,debt:props.orders.filter(o=>o.loanCurrency===currency).reduce((n,o)=>n+o.totalDebt,0)})))
const pending=computed(()=>props.orders.filter(o=>o.status==='pending').length)
const active=computed(()=>props.orders.filter(o=>['active','repaying','overdue'].includes(o.status)).length)
function detail(o){router.push({path:path('/earn/loan/order/'+encodeURIComponent(o.orderId)),query:{group:filter.value,page:page.value}})}
</script>
<template>
 <div class="loan-portfolio">
  <header class="portfolio-heading finance-heading"><h1>{{$t('earn.nav.myLoans')}}</h1></header>
  <section class="earn-panel portfolio-summary"><div class="loan-portfolio-summary"><div v-for="total in totals" :key="total.currency" class="portfolio-total"><span class="earn-caption">{{$t('lending.debt')}} · {{total.currency}}</span><strong class="portfolio-total-value earn-mono">{{fmt(total.debt)}} <small>{{total.currency}}</small></strong></div><dl class="portfolio-metrics"><div><dt>{{$t('lending.statuses.pending')}}</dt><dd>{{pending}}</dd></div><div><dt>{{$t('lending.statuses.active')}}</dt><dd>{{active}}</dd></div></dl></div></section>
  <div class="loan-portfolio-toolbar"><div class="portfolio-tabs" :aria-label="$t('lending.status')"><button v-for="group in Object.keys(groups)" :key="group" :aria-pressed="filter===group" @click="filter=group">{{$t('lending.groups.'+group)}}</button></div><RouterLink class="earn-buy" :to="path('/earn/loan')">{{$t('lending.apply')}}</RouterLink></div>
  <div v-if="shown.length" class="earn-panel portfolio-table loan-portfolio-table"><table><thead><tr><th>{{$t('earn.myEarnings.table.productName')}}</th><th>{{$t('lending.amount')}}</th><th>{{$t('lending.debt')}}</th><th>{{$t('lending.daily')}}</th><th>{{$t('lending.term')}}</th><th>{{$t('lending.status')}}</th><th>{{$t('earn.myEarnings.table.action')}}</th></tr></thead><tbody><tr v-for="order in shown" :key="order.orderId"><td><div class="earn-product-line"><Coin :symbol="order.loanCurrency"/><div><strong>{{order.productName}}</strong><small>{{order.orderId}}</small></div></div></td><td :data-label="$t('lending.amount')"><strong class="earn-mono">{{fmt(order.loanAmount)}} {{order.loanCurrency}}</strong></td><td :data-label="$t('lending.debt')"><strong class="earn-mono">{{fmt(order.totalDebt)}} {{order.loanCurrency}}</strong></td><td :data-label="$t('lending.daily')"><span class="earn-accent earn-mono">{{Number((order.dailyRate??order.interestRate/365).toFixed(8))}}%</span></td><td :data-label="$t('lending.term')">{{$t('margin.market.termDays',{days:order.loanDuration})}}</td><td :data-label="$t('lending.status')"><span class="portfolio-status" :class="order.status">{{$t('lending.statuses.'+order.status)}}</span></td><td class="portfolio-row-action"><button class="earn-buy" @click="detail(order)">{{$t('lending.details')}}</button></td></tr></tbody></table></div>
  <div v-else class="earn-panel portfolio-empty"><Icon name="wallet"/><p>{{$t('lending.empty')}}</p><RouterLink class="earn-buy" :to="path('/earn/loan')">{{$t('lending.apply')}}</RouterLink></div>
  <FinancePagination v-model:page="page" :total="filtered.length" :page-size="10"/>
 </div>
</template>
