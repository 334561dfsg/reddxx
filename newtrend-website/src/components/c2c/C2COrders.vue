<script setup>
import EmptyState from '../ui/EmptyState.vue'
import {dateTime} from '../../utils/format.js'
import {locale} from '../../i18n'
import {computed,ref,watch} from 'vue'
import {formatQuote,c2cQuotes} from '../../utils/c2cQuotes'
import {openModal,session} from '../../session'
import Skeleton from '../ui/Skeleton.vue'
import RequestState from '../ui/RequestState.vue'
import {listC2COrders} from '../../api/c2c.js'
import {useRequest} from '../../composables/useRequest.js'
import FinancePagination from '../FinancePagination.vue'
import {useFinancePagination} from '../../composables/useFinancePagination'
// Orders of the current mode; filters stay usable while rows are skeletons. The asset filter lists the buy catalogue.
const side=ref(''),asset=ref(''),status=ref('')
const statuses=computed(()=>side.value==='buy'?['pending_match','pending_payment','proof_uploaded','under_review','completed','rejected','cancelled','expired']:['asset_locked','buyer_matched','under_review','completed','rejected','cancelled','stale'])
watch(side,()=>{status.value=''})
watch([side,asset,status],()=>{page.value=1})
const request=useRequest(()=>listC2COrders(session.mode),{key:()=>session.mode,tags:['c2c']})
const loading=computed(()=>request.status.value==='loading')
const orders=computed(()=>request.data.value||[])
const filtered=computed(()=>orders.value.filter(o=>(!side.value||o.side===side.value)&&(!asset.value||o.symbol===asset.value)&&(!status.value||o.status===status.value)))
// Shared paging: numbered pages on desktop, load on scroll on phones (channel convention).
const {page,total,shown:visible}=useFinancePagination(filtered,10)
function detail(order){openModal('c2c-detail','c2c.detail.title',{id:order.id})}
function clear(){side.value='';asset.value='';status.value=''}
</script>
<template>
 <div class="c2c-heading"><div><h1>{{ $t('c2c.orders.title') }}</h1><p>{{ $t('c2c.subtitle') }}</p></div></div>
 <div class="c2c-orders-filters"><div class="c2c-filter"><span>{{ $t('c2c.orders.filterSide') }}</span><div class="c2c-pills"><button v-for="value in ['','buy','sell']" :key="value" :class="{active:side===value}" :aria-pressed="side===value" @click="side=value">{{ $t(value?'c2c.side.'+value:'c2c.orders.all') }}</button></div></div><div class="c2c-filter"><span>{{ $t('c2c.orders.filterAsset') }}</span><div class="c2c-pills"><button :class="{active:!asset}" :aria-pressed="!asset" @click="asset=''">{{ $t('c2c.orders.all') }}</button><button v-for="q in c2cQuotes" :key="q.symbol" :class="{active:asset===q.symbol}" :aria-pressed="asset===q.symbol" @click="asset=q.symbol">{{ q.symbol }}</button></div></div></div>
 <div class="c2c-filter c2c-status-filter"><span>{{ $t('c2c.orders.filterStatus') }}</span><div v-if="side" class="c2c-pills"><button :class="{active:!status}" :aria-pressed="!status" @click="status=''">{{ $t('c2c.orders.all') }}</button><button v-for="value in statuses" :key="value" :class="{active:status===value}" :aria-pressed="status===value" @click="status=value">{{ $t('c2c.status.'+value) }}</button></div><span v-else class="c2c-status-hint">{{ $t('c2c.orders.statusHint',{buy:$t('c2c.side.buy'),sell:$t('c2c.side.sell')}) }}</span></div>
 <RequestState v-if="request.status.value==='error'" :status="request.status.value" :error="request.error.value" class="c2c-request-frame" @retry="request.refresh"/>
 <div v-else-if="loading" class="c2c-orders-list"><span role="status" class="sr-only">{{ $t('common.loading') }}</span><div class="c2c-order-row c2c-order-columns"><span>{{ $t('c2c.orders.colSide') }}</span><span>{{ $t('c2c.orders.colAmount') }}</span><span>{{ $t('c2c.orders.colFiat') }}</span><span>{{ $t('c2c.orders.colStatus') }}</span><span>{{ $t('c2c.orders.colCreated') }}</span><span></span></div><div v-for="n in 4" :key="n" class="c2c-order-row c2c-skeleton-row" aria-hidden="true"><Skeleton width="32px" height="16px"/><Skeleton width="96px" height="16px"/><Skeleton width="96px" height="16px"/><Skeleton width="72px" height="16px"/><Skeleton width="120px" height="16px"/><Skeleton width="40px" height="16px"/></div></div>
 <EmptyState v-else-if="!filtered.length" class="c2c-empty" :text="$t(orders.length?'c2c.orders.emptyFiltered':'c2c.orders.empty')" :hint="orders.length?undefined:$t('c2c.orders.emptyHint')"><button v-if="orders.length" class="c2c-text-button" @click="clear">{{ $t('c2c.orders.clearFilters') }}</button></EmptyState>
 <div v-else class="c2c-orders-list"><div class="c2c-order-row c2c-order-columns"><span>{{ $t('c2c.orders.colSide') }}</span><span>{{ $t('c2c.orders.colAmount') }}</span><span>{{ $t('c2c.orders.colFiat') }}</span><span>{{ $t('c2c.orders.colStatus') }}</span><span>{{ $t('c2c.orders.colCreated') }}</span><span></span></div><article v-for="order in visible" :key="order.id" class="c2c-order-row"><strong :class="order.side==='sell'?'c2c-danger':'c2c-text-button'">{{ $t('c2c.side.'+order.side) }}</strong><span><small>{{ $t('c2c.orders.colAmount') }}</small>{{ formatQuote(order.quantity) }} {{ order.symbol }}</span><span><small>{{ $t('c2c.orders.colFiat') }}</small>{{ formatQuote(order.amount) }} USDT</span><span><small>{{ $t('c2c.orders.colStatus') }}</small>{{ $t('c2c.status.'+order.status) }}</span><span><small>{{ $t('c2c.orders.colCreated') }}</small>{{ dateTime(order.createdAt,locale) }}</span><button class="c2c-text-button" @click="detail(order)">{{ $t('c2c.orders.view') }}</button></article><FinancePagination scroll v-model:page="page" :total="total" :page-size="10"/></div>
</template>
<style>.c2c-skeleton-row{min-height:73px;box-sizing:border-box;align-items:center}</style>
