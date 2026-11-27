<script setup>
import {computed} from 'vue'
import {useRoute} from 'vue-router'
import QuantFundInterestRecords from '../../components/quant/QuantFundInterestRecords.vue'
import RequestState from '../../components/ui/RequestState.vue'
import {getQuantFundOrder} from '../../api/quantFund.js'
import {session} from '../../session'
import {useRequest} from '../../composables/useRequest.js'
import NotFound from '../NotFound.vue'
import QuantFundLayout from './QuantFundLayout.vue'
// /ai-quant/quant-fund/positions/:orderId/interest-records — loads the current mode's order (an unknown id renders
// the not-found page) and passes it to the records view, which shows skeleton rows while it is null.
const route=useRoute()
const orderId=computed(()=>String(route.params.orderId||''))
const order=useRequest(()=>getQuantFundOrder(orderId.value,session.mode),{key:()=>orderId.value+'|'+session.mode,tags:['quantFund']})
const notFound=computed(()=>order.status.value==='error'&&order.error.value?.code==='notFound')
</script>
<template>
<NotFound v-if="notFound"/>
<QuantFundLayout v-else :section-switch="false">
 <RequestState
  v-if="order.status.value==='error'"
  :status="order.status.value"
  :error="order.error.value"
  class="qf-panel qf-request-frame"
  @retry="order.refresh"
 />
 <QuantFundInterestRecords v-else :order="order.data.value"/>
</QuantFundLayout>
</template>
