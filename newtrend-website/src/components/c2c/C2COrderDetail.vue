<script setup>
import {dateTime} from '../../utils/format.js'
import {locale} from '../../i18n'
import {computed} from 'vue'
import {session} from '../../session'
import Skeleton from '../ui/Skeleton.vue'
import RequestState from '../ui/RequestState.vue'
import {getC2COrder} from '../../api/c2c.js'
import {useRequest} from '../../composables/useRequest.js'
import {formatQuote} from '../../utils/c2cQuotes'
const props=defineProps({id:String})
const request=useRequest(()=>getC2COrder(props.id,session.mode),{tags:['c2c']})
const order=computed(()=>request.data.value)
const missing=computed(()=>request.status.value==='error'&&request.error.value?.code==='notFound')
</script>
<template><div v-if="request.status.value==='loading'" class="c2c-detail"><span role="status" class="sr-only">{{ $t('common.loading') }}</span><div aria-hidden="true"><p class="c2c-status"><Skeleton inline width="96px"/></p><dl><div v-for="n in 7" :key="n"><dt><Skeleton inline width="88px"/></dt><dd><Skeleton inline width="160px"/></dd></div></dl></div></div>
<RequestState v-else-if="request.status.value==='error'&&!missing" :status="request.status.value" :error="request.error.value" @retry="request.refresh"/>
<div v-else-if="order" class="c2c-detail">
 <p class="c2c-status">{{ $t('c2c.status.'+order.status) }}</p>
 <p v-if="order.status==='pending_review'" class="muted">{{ $t(order.side==='sell'?'c2c.detail.pendingSellHint':'c2c.detail.pendingBuyHint') }}</p>
 <dl><div><dt>{{ $t('c2c.detail.orderId') }}</dt><dd>{{ order.id }}</dd></div><div><dt>{{ $t('c2c.detail.side') }}</dt><dd>{{ $t('c2c.side.'+order.side) }}</dd></div><div><dt>{{ $t('c2c.detail.assetAmount') }}</dt><dd>{{ formatQuote(order.quantity) }} {{ order.symbol }}</dd></div><div><dt>{{ $t('c2c.detail.fiatAmount') }}</dt><dd>{{ formatQuote(order.amount) }} USDT</dd></div><div><dt>{{ $t('c2c.detail.priceSnapshot') }}</dt><dd>{{ formatQuote(order.price) }} USDT</dd></div><div><dt>{{ $t('c2c.detail.createdAt') }}</dt><dd>{{ dateTime(order.createdAt,locale) }}</dd></div><div><dt>{{ $t('c2c.detail.agreementVersion') }}</dt><dd>{{ order.agreementVersion }}</dd></div></dl>
</div><p v-else>{{ $t('c2c.detail.notFoundHint') }}</p></template>
