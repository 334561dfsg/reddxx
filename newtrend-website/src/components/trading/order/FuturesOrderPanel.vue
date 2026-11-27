<script setup>
// Futures fields. compact (phone): pick a side first (买入开多 / 卖出开空) and show order type and leverage as
// selects; the desktop form keeps the market/limit tab row and both actions (in TradeOrderForm's footer).
import {computed} from 'vue'
import Skeleton from '../../ui/Skeleton.vue'
import RecordFilter from '../../RecordFilter.vue'
import FeedbackToast from '../../../platform/FeedbackToast.js'
import OrderAmountField from './OrderAmountField.vue'
import {fmt} from '../../../data'
import {useOrderDrafts} from '../../../composables/tradePageState'
import {leverageOptions,orderEstimate} from '../../../utils/orderFormModel'
import {futuresPrice,maxFuturesOpen,orderTypeItems,percentAmount} from './orderPricing.js'

const props=defineProps({pair:Object,compact:Boolean,balances:Object,errors:Object})
const emit=defineEmits(['clear-error','clear-notice'])
const {futures}=useOrderDrafts()

const leverageItems=leverageOptions.map(value=>({value,label:`${value}x`}))
const typeItems=computed(orderTypeItems)
const side=computed(()=>futures.side||'buy')
const estimate=computed(()=>orderEstimate({
 kind:'futures',amount:futures.amount,price:futuresPrice(futures,props.pair),leverage:futures.leverage,
}))
const maxOpen=computed(()=>maxFuturesOpen(props.balances.cash,futures.leverage))

function chooseSide(value){futures.side=value;emit('clear-error','futures');emit('clear-notice')}
function fill(percent){
 if(!props.balances.ready)return
 futures.amount=percentAmount(maxOpen.value,percent)
 emit('clear-error','futures');emit('clear-notice')
}
</script>

<template>
  <div v-if="compact" class="direction-tabs">
    <button
      v-for="value in ['buy','sell']"
      :key="value"
      :class="[value,{active:side===value}]"
      :aria-pressed="side===value"
      @click="chooseSide(value)"
    >{{ $t(value==='buy'?'trade.buyLong':'trade.sellShort') }}</button>
  </div>
  <div v-if="compact" class="compact-selects">
    <RecordFilter id="order-type" v-model="futures.type" variant="field" :label="$t('trade.orderType')" :options="typeItems"/>
    <RecordFilter id="order-leverage" v-model="futures.leverage" variant="field" :label="$t('trade.leverage')" :options="leverageItems"/>
  </div>
  <div v-else class="type-tabs price-tabs">
    <button
      v-for="type in ['market','limit']"
      :key="type"
      :class="{active:futures.type===type}"
      :aria-pressed="futures.type===type"
      @click="futures.type=type"
    >{{ $t('trade.'+type) }}</button>
  </div>

  <dl class="form-summary">
    <dt>{{ $t('trade.form.availableQuantity') }}</dt>
    <dd><template v-if="balances.ready">{{ fmt(balances.cash) }}</template><Skeleton v-else inline width="72px"/> USDT</dd>
  </dl>
  <label v-if="futures.type==='limit'">
    {{ $t('trade.price') }} (USDT)
    <input class="trade-field" v-model="futures.price" inputmode="decimal" :placeholder="$t('trade.enterPrice')"/>
  </label>
  <label v-if="!compact">
    {{ $t('trade.leverage') }}
    <RecordFilter id="order-leverage" v-model="futures.leverage" variant="field" :label="$t('trade.leverage')" :options="leverageItems"/>
  </label>
  <OrderAmountField
    id="futures-order-amount"
    v-model="futures.amount"
    :label="$t('trade.quantity')"
    unit="USDT"
    :invalid="!!errors.futures"
    :describedby="errors.futures?'futures-form-error':undefined"
    @input="emit('clear-error','futures')"
    @percent="fill"
  />

  <dl class="form-summary">
    <dt class="positive">{{ $t('trade.form.maxOpen') }}</dt>
    <dd class="positive">
      <template v-if="balances.ready&&pair.price!==null">{{ fmt(maxOpen) }}</template><Skeleton v-else inline width="72px"/> USDT
    </dd>
    <dt>{{ $t('trade.form.initialMargin') }}</dt>
    <dd>{{ fmt(estimate.margin) }} USDT</dd>
    <dt>{{ $t('trade.fee') }}</dt>
    <dd>{{ fmt(estimate.fee) }} USDT</dd>
  </dl>
  <label class="check-label"><input v-model="futures.stops" type="checkbox"/>{{ $t('trade.form.stops') }}</label>
  <template v-if="futures.stops">
    <label>
      {{ $t('trade.tpPrice') }} (USDT)
      <input class="trade-field" v-model="futures.tp" inputmode="decimal" :placeholder="$t('trade.enterPrice')"/>
    </label>
    <label>
      {{ $t('trade.slPrice') }} (USDT)
      <input class="trade-field" v-model="futures.sl" inputmode="decimal" :placeholder="$t('trade.enterPrice')"/>
    </label>
  </template>
  <FeedbackToast
    v-if="errors.futures"
    id="futures-form-error"
    type="error"
    :source="() => errors.futures ? $t(errors.futures) : ''"
  />
</template>

