<script setup>
import {computed} from 'vue'
import {path} from '../../data'
import {quantFundAccount} from '../../quantFundPortfolio'
import {fundDate} from '../../utils/quantFund'
// Reference /quant-fund/positions/:orderId/interest-records: back link, title, subtitle, then records or an empty card.
const props=defineProps({orderId:{type:String,required:true}})
const order=computed(()=>quantFundAccount.orders.find(item=>item.id===props.orderId)||null)
const records=computed(()=>order.value?.interestRecords||[])
const money=value=>Number(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})
</script>
<template>
<div class="qf-interest-records">
 <RouterLink :to="path('/ai-quant/quant-fund/positions')" class="qf-back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 19-7-7 7-7M19 12H5"/></svg>{{ $t('aiQuant.quantFund.interestRecords.back') }}</RouterLink>
 <header class="qf-interest-head"><h1>{{ $t('aiQuant.quantFund.interestRecords.title') }}</h1><p>{{ $t('aiQuant.quantFund.interestRecords.subtitle') }}</p></header>
 <div v-if="!records.length" class="qf-panel qf-interest-empty"><span class="qf-interest-empty-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11"/></svg></span><p>{{ $t('aiQuant.quantFund.interestRecords.empty') }}</p></div>
 <div v-else class="qf-panel qf-table-wrap"><table class="qf-table">
  <thead><tr><th scope="col">{{ $t('aiQuant.quantFund.interestRecords.table.interestDate') }}</th><th scope="col" class="num">{{ $t('aiQuant.quantFund.interestRecords.table.amount') }}</th><th scope="col">{{ $t('aiQuant.quantFund.interestRecords.table.creditedAt') }}</th></tr></thead>
  <tbody><tr v-for="(record,index) in records" :key="index"><td>{{ fundDate(record.interestDate) }}</td><td class="num mono qf-success-text">+{{ money(record.amount) }} {{ order.asset }}</td><td>{{ fundDate(record.creditedAt,true) }}</td></tr></tbody>
 </table></div>
</div>
</template>
