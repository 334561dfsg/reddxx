<script setup>
import EmptyState from '../ui/EmptyState.vue'
import BackLink from '../ui/BackLink.vue'
import {money} from '../../utils/format.js'
import {computed} from 'vue'
import {path} from '../../data'
import {quantFundAccount} from '../../quantFundPortfolio'
import {fundDate} from '../../utils/quantFund'
import FinancePagination from '../FinancePagination.vue'
import {useFinancePagination} from '../../composables/useFinancePagination'
// Reference /quant-fund/positions/:orderId/interest-records: back link, title, subtitle, then records or an empty card.
const props=defineProps({orderId:{type:String,required:true}})
const order=computed(()=>quantFundAccount.orders.find(item=>item.id===props.orderId)||null)
const records=computed(()=>order.value?.interestRecords||[])
const {page,total,shown}=useFinancePagination(records,10)
// money comes from the shared site formatters
</script>
<template>
<div class="qf-interest-records">
 <BackLink :to="path('/ai-quant/quant-fund/positions')" class="qf-back">{{ $t('aiQuant.quantFund.interestRecords.back') }}</BackLink>
 <header class="qf-interest-head"><h1>{{ $t('aiQuant.quantFund.interestRecords.title') }}</h1><p>{{ $t('aiQuant.quantFund.interestRecords.subtitle') }}</p></header>
 <EmptyState v-if="!records.length" class="qf-panel qf-interest-empty" :text="$t('aiQuant.quantFund.interestRecords.empty')"/>
 <div v-else class="qf-panel qf-table-wrap"><table class="qf-table">
  <thead><tr><th scope="col">{{ $t('aiQuant.quantFund.interestRecords.table.interestDate') }}</th><th scope="col" class="num">{{ $t('aiQuant.quantFund.interestRecords.table.amount') }}</th><th scope="col">{{ $t('aiQuant.quantFund.interestRecords.table.creditedAt') }}</th></tr></thead>
  <tbody><tr v-for="record in shown" :key="record.interestDate"><td>{{ fundDate(record.interestDate) }}</td><td class="num mono qf-success-text">+{{ money(record.amount) }} {{ order.asset }}</td><td>{{ fundDate(record.creditedAt,true) }}</td></tr></tbody>
 </table></div>
 <FinancePagination v-if="records.length" v-model:page="page" :total="total" :page-size="10"/>
</div>
</template>
