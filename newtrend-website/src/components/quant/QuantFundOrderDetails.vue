<script setup>
import StatusTag from '../ui/StatusTag.vue'
import {computed} from 'vue'
import {fmt,path} from '../../data'
import Coin from '../Coin.vue'
import Icon from '../Icon.vue'
import {fundDate} from '../../utils/quantFund'
import '../../styles/quant-fidelity.css'
// Reference positions order drawer ($t component): product link, status, principal/rate, term dates, interest and settlement.
const props=defineProps({order:{type:Object,required:true}})
const emit=defineEmits(['close'])
const flexible=computed(()=>props.order.termDaysSnapshot===null)
const settled=computed(()=>['settled','redeemed'].includes(props.order.status)&&props.order.settledAt)
</script>
<template>
<div class="qf-order">
 <section class="qf-order-head">
  <div class="qf-order-product"><Coin :symbol="order.asset"/><div><RouterLink :to="path(`/ai-quant/quant-fund/products/${order.productId}`)" class="qf-order-link" @click="emit('close')"><span>{{ order.productName }}</span><Icon name="arrow-up-right"/><span class="sr-only">{{ $t('aiQuant.quantFund.positions.detail.viewProduct') }}</span></RouterLink><small>{{ order.asset }}</small></div></div>
  <StatusTag domain="quant-fund" :status="order.status"/>
 </section>
 <section class="qf-order-amounts"><div><small>{{ $t('aiQuant.quantFund.positions.fields.principal') }}</small><strong>{{ fmt(order.principal) }}<span>{{ order.asset }}</span></strong></div><div class="qf-order-rate"><small>{{ $t('aiQuant.quantFund.positions.fields.dailyReturn') }}</small><strong>{{ order.dailyReturnPercentSnapshot.toFixed(2) }}%</strong></div></section>
 <section class="qf-order-section"><dl>
  <div><dt>{{ $t('aiQuant.quantFund.positions.fields.term') }}</dt><dd>{{ flexible?$t('aiQuant.quantFund.card.termFlexible'):$t('aiQuant.quantFund.card.termDaysValue',{days:order.termDaysSnapshot}) }}</dd></div>
  <div><dt>{{ $t('aiQuant.quantFund.positions.fields.subscribedAt') }}</dt><dd class="mono">{{ fundDate(order.subscribedAt,true) }}</dd></div>
  <div><dt>{{ $t('aiQuant.quantFund.positions.fields.maturityDate') }}</dt><dd :class="{mono:Boolean(order.maturityDate)}">{{ fundDate(order.maturityDate,true) }}</dd></div>
 </dl></section>
 <section class="qf-order-section"><h3>{{ $t('aiQuant.quantFund.positions.detail.sections.interest') }}</h3><dl>
  <div><dt>{{ $t('aiQuant.quantFund.positions.fields.interestPaidTotal') }}</dt><dd class="mono">{{ fmt(order.interestPaidTotal) }} {{ order.asset }}</dd></div>
  <div v-if="order.interestPaidThrough"><dt>{{ $t('aiQuant.quantFund.positions.fields.interestPaidThrough') }}</dt><dd class="mono">{{ fundDate(order.interestPaidThrough,true) }}</dd></div>
 </dl></section>
 <section v-if="settled" class="qf-order-section"><h3>{{ $t('aiQuant.quantFund.positions.detail.sections.settlement') }}</h3><dl>
  <div><dt>{{ $t('aiQuant.quantFund.positions.fields.settledAt') }}</dt><dd class="mono">{{ fundDate(order.settledAt,true) }}</dd></div>
 </dl></section>
</div>
</template>
