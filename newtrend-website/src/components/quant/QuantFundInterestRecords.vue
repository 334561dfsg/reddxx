<script setup>
import EmptyState from '../ui/EmptyState.vue'
import Skeleton from '../ui/Skeleton.vue'
import BackLink from '../ui/BackLink.vue'
import {money} from '../../utils/format.js'
import {computed} from 'vue'
import {path} from '../../data'
import {fundDate} from '../../utils/quantFund'
import FinancePagination from '../FinancePagination.vue'
import {useFinancePagination} from '../../composables/useFinancePagination'
// Reference /quant-fund/positions/:orderId/interest-records: back link, title, subtitle, then records or an empty card.
// The order (with its interest records) is loaded by pages/Quant.vue.
// null while loading: the heading and table header stay, rows become skeletons (same row height).
const props=defineProps({order:{type:Object,default:null}})
const order=computed(()=>props.order)
const loading=computed(()=>!props.order)
const records=computed(()=>order.value?.interestRecords||[])
const {page,total,shown}=useFinancePagination(records,10)
// Summary card, as on the strategy stats page: total interest, covered dates, interest days and the order's daily rate.
const summary=computed(()=>{const list=records.value;return {total:list.reduce((t,r)=>t+r.amount,0),days:list.length,
 range:list.length?`${fundDate(list.at(-1).interestDate)} – ${fundDate(list[0].interestDate)}`:'',rate:order.value?.dailyReturnPercentSnapshot}})
// money comes from the shared site formatters
</script>
<template>
<div class="qf-interest-records">
 <BackLink :to="path('/ai-quant/quant-fund/positions')" :title="$t('aiQuant.quantFund.interestRecords.title')" class="qf-back">{{ $t('aiQuant.quantFund.interestRecords.back') }}</BackLink>
 <header class="qf-interest-head"><h1>{{ $t('aiQuant.quantFund.interestRecords.title') }}</h1><p>{{ $t('aiQuant.quantFund.interestRecords.subtitle') }}</p></header>
 <span v-if="loading" role="status" class="sr-only">{{ $t('common.loading') }}</span>
 <section v-if="loading||records.length" class="qf-ir-summary" :aria-label="$t('aiQuant.quantFund.interestRecords.summary.total')">
  <div class="qf-ir-total"><span>{{ $t('aiQuant.quantFund.interestRecords.summary.total') }}</span><strong><Skeleton v-if="loading" inline width="140px"/><template v-else>+{{ money(summary.total) }}<small>{{ order.asset }}</small></template></strong><small><Skeleton v-if="loading" inline width="180px"/><template v-else>{{ summary.range }}</template></small></div>
  <dl class="qf-ir-counts"><div><dt>{{ $t('aiQuant.quantFund.interestRecords.summary.days') }}</dt><dd><Skeleton v-if="loading" inline width="32px"/><template v-else>{{ summary.days }}</template></dd></div><div><dt>{{ $t('aiQuant.quantFund.interestRecords.summary.rate') }}</dt><dd><Skeleton v-if="loading" inline width="40px"/><template v-else>{{ summary.rate!=null?summary.rate.toFixed(2)+'%':'—' }}</template></dd></div></dl>
 </section>
 <!-- Phones: the column header sits outside the scrolling list (like the strategy stats page), so rows never show above it. -->
 <div v-if="loading||records.length" class="qf-ir-head" aria-hidden="true"><span>{{ $t('aiQuant.quantFund.interestRecords.table.interestDate') }}</span><span>{{ $t('aiQuant.quantFund.interestRecords.table.amount') }}</span><span>{{ $t('aiQuant.quantFund.interestRecords.table.creditedAt') }}</span></div>
 <div class="qf-interest-scroll">
 <EmptyState v-if="!loading&&!records.length" class="qf-panel qf-interest-empty" :text="$t('aiQuant.quantFund.interestRecords.empty')"/>
 <div v-else class="qf-panel qf-table-wrap"><table class="qf-table"><colgroup><col class="qf-ir-col-date"><col class="qf-ir-col-amount"><col class="qf-ir-col-time"></colgroup>
  <thead><tr><th scope="col">{{ $t('aiQuant.quantFund.interestRecords.table.interestDate') }}</th><th scope="col" class="num">{{ $t('aiQuant.quantFund.interestRecords.table.amount') }}</th><th scope="col">{{ $t('aiQuant.quantFund.interestRecords.table.creditedAt') }}</th></tr></thead>
  <tbody><template v-if="loading"><tr v-for="n in 5" :key="n" class="qf-skeleton-row-loading" aria-hidden="true"><td><Skeleton width="96px"/></td><td class="num"><Skeleton width="120px"/></td><td><Skeleton width="140px"/></td></tr></template><tr v-else v-for="record in shown" :key="record.interestDate"><td>{{ fundDate(record.interestDate) }}</td><td class="num mono qf-success-text">+{{ money(record.amount) }} {{ order.asset }}</td><td class="qf-credited"><span v-for="(part,i) in fundDate(record.creditedAt,true).split(' ')" :key="i">{{ part }}</span></td></tr></tbody>
 </table></div>
 <FinancePagination scroll v-if="!loading&&records.length" v-model:page="page" :total="total" :page-size="10"/>
 </div>
</div>
</template>
<style>.qf-ir-head{display:none}
.qf-ir-summary{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px 24px;margin:0 0 16px;padding:14px 16px;border:1px solid #191b1f;border-radius:16px;background:#1b1e22}
.qf-ir-total{display:grid;gap:4px}.qf-ir-total>span,.qf-ir-counts dt{font-size:12px;line-height:16px;color:#8c8f96}
.qf-ir-total strong{font-family:var(--nt-font-mono);font-size:24px;line-height:1.2;font-weight:700;color:var(--qf-success,#2bc287)}.qf-ir-total strong small{margin-left:4px;font-size:13px;font-weight:500;color:#8c8f96}
.qf-ir-total>small{font-size:12px;line-height:16px;color:#8c8f96}
.qf-ir-counts{display:flex;gap:24px;margin:0}.qf-ir-counts>div{display:grid;gap:4px}.qf-ir-counts dd{margin:0;font-family:var(--nt-font-mono);font-size:16px;line-height:20px;font-weight:600;color:#fff}
.qf-interest-records .qf-skeleton-row-loading td{height:55px}.qf-interest-records td.num .nt-skeleton{margin-left:auto}</style>
