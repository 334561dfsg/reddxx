<script setup>
import {computed,ref,watch} from 'vue'
import {c2cState} from '../../utils/c2cState'
import {formatQuote,c2cQuotes} from '../../utils/c2cQuotes'
import {openModal} from '../../session'
const side=ref(''),asset=ref(''),status=ref(''),page=ref(1)
const statuses=computed(()=>side.value==='buy'?['pending_match','pending_payment','proof_uploaded','under_review','completed','rejected','cancelled','expired']:['asset_locked','buyer_matched','under_review','completed','rejected','cancelled','stale'])
watch(side,()=>{status.value=''})
watch([side,asset,status],()=>{page.value=1})
const filtered=computed(()=>c2cState.orders.filter(o=>(!side.value||o.side===side.value)&&(!asset.value||o.symbol===asset.value)&&(!status.value||o.status===status.value)))
const pages=computed(()=>Math.max(1,Math.ceil(filtered.value.length/10)))
const visible=computed(()=>filtered.value.slice((page.value-1)*10,page.value*10))
function detail(order){openModal('c2c-detail','c2c.detail.title',{id:order.id})}
function clear(){side.value='';asset.value='';status.value=''}
</script>
<template>
 <div class="c2c-heading"><div><h1>{{ $t('c2c.orders.title') }}</h1><p>{{ $t('c2c.subtitle') }}</p></div></div>
 <div class="c2c-orders-filters"><div class="c2c-filter"><span>{{ $t('c2c.orders.filterSide') }}</span><div class="c2c-pills"><button v-for="value in ['','buy','sell']" :key="value" :class="{active:side===value}" :aria-pressed="side===value" @click="side=value">{{ $t(value?'c2c.side.'+value:'c2c.orders.all') }}</button></div></div><div class="c2c-filter"><span>{{ $t('c2c.orders.filterAsset') }}</span><div class="c2c-pills"><button :class="{active:!asset}" :aria-pressed="!asset" @click="asset=''">{{ $t('c2c.orders.all') }}</button><button v-for="q in c2cQuotes" :key="q.symbol" :class="{active:asset===q.symbol}" :aria-pressed="asset===q.symbol" @click="asset=q.symbol">{{ q.symbol }}</button></div></div></div>
 <div class="c2c-filter c2c-status-filter"><span>{{ $t('c2c.orders.filterStatus') }}</span><div v-if="side" class="c2c-pills"><button :class="{active:!status}" :aria-pressed="!status" @click="status=''">{{ $t('c2c.orders.all') }}</button><button v-for="value in statuses" :key="value" :class="{active:status===value}" :aria-pressed="status===value" @click="status=value">{{ $t('c2c.status.'+value) }}</button></div><span v-else class="c2c-status-hint">{{ $t('c2c.orders.statusHint',{buy:$t('c2c.side.buy'),sell:$t('c2c.side.sell')}) }}</span></div>
 <div v-if="!filtered.length" class="c2c-empty"><p>{{ $t(c2cState.orders.length?'c2c.orders.emptyFiltered':'c2c.orders.empty') }}</p><small v-if="!c2cState.orders.length">{{ $t('c2c.orders.emptyHint') }}</small><button v-else class="c2c-text-button" @click="clear">{{ $t('c2c.orders.clearFilters') }}</button></div>
 <div v-else class="c2c-orders-list"><div class="c2c-order-row c2c-order-columns"><span>{{ $t('c2c.orders.colSide') }}</span><span>{{ $t('c2c.orders.colAmount') }}</span><span>{{ $t('c2c.orders.colFiat') }}</span><span>{{ $t('c2c.orders.colStatus') }}</span><span>{{ $t('c2c.orders.colCreated') }}</span><span></span></div><article v-for="order in visible" :key="order.id" class="c2c-order-row"><strong :class="order.side==='sell'?'c2c-danger':'c2c-text-button'">{{ $t('c2c.side.'+order.side) }}</strong><span><small>{{ $t('c2c.orders.colAmount') }}</small>{{ formatQuote(order.quantity) }} {{ order.symbol }}</span><span><small>{{ $t('c2c.orders.colFiat') }}</small>{{ formatQuote(order.amount) }} USDT</span><span><small>{{ $t('c2c.orders.colStatus') }}</small>{{ $t('c2c.status.'+order.status) }}</span><span><small>{{ $t('c2c.orders.colCreated') }}</small>{{ new Date(order.createdAt).toLocaleString() }}</span><button class="c2c-text-button" @click="detail(order)">{{ $t('c2c.orders.view') }}</button></article><footer class="c2c-pagination"><button :disabled="page===1" @click="page--">{{ $t('c2c.orders.prev') }}</button><span>{{ $t('c2c.orders.pageInfo',{from:(page-1)*10+1,to:Math.min(page*10,filtered.length),total:filtered.length}) }}</span><button :disabled="page===pages" @click="page++">{{ $t('c2c.orders.next') }}</button></footer></div>
</template>
