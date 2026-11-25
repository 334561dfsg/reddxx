<script setup>
import {computed} from 'vue'
import {c2cState} from '../../utils/c2cState'
import {formatQuote} from '../../utils/c2cQuotes'
const props=defineProps({id:String})
const order=computed(()=>c2cState.orders.find(o=>o.id===props.id))
</script>
<template><div v-if="order" class="c2c-detail">
 <p class="c2c-status">{{ $t('c2c.status.'+order.status) }}</p>
 <div v-if="order.status==='pending_match'" class="c2c-detail-notice"><h3>{{ $t('c2c.pendingMatch.title') }}</h3><p>{{ $t('c2c.pendingMatch.hint') }}</p></div>
 <div v-if="order.status==='asset_locked'" class="c2c-detail-notice"><h3>{{ $t('c2c.sellLocked.title') }}</h3><p>{{ $t('c2c.sellLocked.hint') }}</p></div>
 <dl><div><dt>{{ $t('c2c.detail.orderId') }}</dt><dd>{{ order.id }}</dd></div><div><dt>{{ $t('c2c.detail.side') }}</dt><dd>{{ $t('c2c.side.'+order.side) }}</dd></div><div><dt>{{ $t('c2c.detail.assetAmount') }}</dt><dd>{{ formatQuote(order.quantity) }} {{ order.symbol }}</dd></div><div><dt>{{ $t('c2c.detail.fiatAmount') }}</dt><dd>{{ formatQuote(order.amount) }} USDT</dd></div><div><dt>{{ $t('c2c.detail.priceSnapshot') }}</dt><dd>{{ formatQuote(order.price) }} USDT</dd></div><div><dt>{{ $t('c2c.detail.createdAt') }}</dt><dd>{{ new Date(order.createdAt).toLocaleString() }}</dd></div><div><dt>{{ $t('c2c.detail.agreementVersion') }}</dt><dd>{{ order.agreementVersion }}</dd></div></dl>
 <template v-if="order.account"><h3>{{ $t('c2c.payoutAccount.title') }}</h3><dl><div v-for="key in ['accountName','accountNumber','bankName','branch','swiftCode','routingNumber','phone','bankAddress','accountAddress']" v-show="order.account[key]" :key="key"><dt>{{ $t('c2c.paymentAccount.'+key) }}</dt><dd>{{ order.account[key] }}</dd></div></dl></template>
 <template v-if="order.side==='buy'"><h3>{{ $t('c2c.detail.proofsTitle') }}</h3><p class="muted">{{ $t('c2c.detail.noProofs') }}</p></template>
</div><p v-else>{{ $t('c2c.detail.notFoundHint') }}</p></template>
