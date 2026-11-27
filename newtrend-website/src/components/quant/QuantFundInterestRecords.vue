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
// money comes from the shared site formatters
</script>
<template>
<div class="qf-interest-records">
 <BackLink :to="path('/ai-quant/quant-fund/positions')" class="qf-back">{{ $t('aiQuant.quantFund.interestRecords.back') }}</BackLink>
 <header class="qf-interest-head"><h1>{{ $t('aiQuant.quantFund.interestRecords.title') }}</h1><p>{{ $t('aiQuant.quantFund.interestRecords.subtitle') }}</p></header>
 <span v-if="loading" role="status" class="sr-only">{{ $t('common.loading') }}</span>
 <EmptyState v-if="!loading&&!records.length" class="qf-panel qf-interest-empty" :text="$t('aiQuant.quantFund.interestRecords.empty')"/>
 <div v-else class="qf-panel qf-table-wrap"><table class="qf-table">
  <thead><tr><th scope="col">{{ $t('aiQuant.quantFund.interestRecords.table.interestDate') }}</th><th scope="col" class="num">{{ $t('aiQuant.quantFund.interestRecords.table.amount') }}</th><th scope="col">{{ $t('aiQuant.quantFund.interestRecords.table.creditedAt') }}</th></tr></thead>
  <tbody><template v-if="loading"><tr v-for="n in 5" :key="n" class="qf-skeleton-row-loading" aria-hidden="true"><td><Skeleton width="96px"/></td><td class="num"><Skeleton width="120px"/></td><td><Skeleton width="140px"/></td></tr></template><tr v-else v-for="record in shown" :key="record.interestDate"><td>{{ fundDate(record.interestDate) }}</td><td class="num mono qf-success-text">+{{ money(record.amount) }} {{ order.asset }}</td><td class="qf-credited"><span v-for="(part,i) in fundDate(record.creditedAt,true).split(' ')" :key="i">{{ part }}</span></td></tr></tbody>
 </table></div>
 <FinancePagination v-if="!loading&&records.length" v-model:page="page" :total="total" :page-size="10"/>
</div>
</template>
<style>.qf-interest-records .qf-skeleton-row-loading td{height:55px}.qf-interest-records td.num .nt-skeleton{margin-left:auto}</style>
