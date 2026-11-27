<script setup>
// Spot fields for the selected side: buy spends USDT, sell spends the base asset. compact (phone) shows the order
// type as a select instead of the tab row.
import {computed} from 'vue'
import Skeleton from '../../ui/Skeleton.vue'
import RecordFilter from '../../RecordFilter.vue'
import FeedbackToast from '../../../platform/FeedbackToast.js'
import OrderAmountField from './OrderAmountField.vue'
import {fmt} from '../../../data'
import {useOrderDrafts} from '../../../composables/tradePageState'
import {tradeFeeRate} from '../../../utils/orderFormModel'
import {orderTypeItems,percentAmount,spotCapacity,spotPrice} from './orderPricing.js'

const props=defineProps({pair:Object,compact:Boolean,balances:Object,errors:Object})
const emit=defineEmits(['clear-error','clear-notice'])
const {spot}=useOrderDrafts()

const typeItems=computed(orderTypeItems)
const price=side=>spotPrice(spot,side,props.pair)
const unit=side=>side==='buy'?'USDT':props.balances.base
// What the balance can buy (in the base asset) or sell for (in USDT) at the current price.
function reach(side){
 const p=price(side),{cash,holdings}=props.balances
 return p>0?fmt(side==='buy'?cash/(1+tradeFeeRate)/p:holdings*p):'—'
}

function chooseSide(value){spot.side=value;emit('clear-notice')}
function fill(side,percent){
 if(!props.balances.ready)return
 spot[side].amount=percentAmount(spotCapacity(side,props.balances.cash,props.balances.holdings),percent)
 emit('clear-error',side);emit('clear-notice')
}
</script>

<template>
  <div class="direction-tabs">
    <button
      v-for="side in ['buy','sell']"
      :key="side"
      :class="[side,{active:(spot.side||'buy')===side}]"
      :aria-pressed="(spot.side||'buy')===side"
      @click="chooseSide(side)"
    >{{ $t('trade.'+side) }}</button>
  </div>
  <RecordFilter v-if="compact" id="spot-order-type" v-model="spot.type" variant="field" :label="$t('trade.orderType')" :options="typeItems"/>
  <div v-else class="type-tabs price-tabs">
    <button
      v-for="type in ['market','limit']"
      :key="type"
      :class="{active:spot.type===type}"
      :aria-pressed="spot.type===type"
      @click="spot.type=type"
    >{{ $t('trade.'+type) }}</button>
  </div>
  <section v-for="side in [spot.side||'buy']" :key="side" class="spot-side" :aria-label="$t('trade.'+side)">
    <label v-if="spot.type==='limit'">
      {{ $t(side==='buy'?'trade.form.buyPrice':'trade.form.sellPrice') }} (USDT)
      <input class="trade-field" v-model="spot[side].price" inputmode="decimal" :placeholder="$t('trade.enterPrice')"/>
    </label>
    <OrderAmountField
      :id="'spot-'+side+'-amount'"
      v-model="spot[side].amount"
      :label="$t(side==='buy'?'trade.form.buyAmount':'trade.form.sellQuantity')"
      :unit="unit(side)"
      suffix
      :invalid="!!errors[side]"
      :describedby="errors[side]?'spot-'+side+'-error':undefined"
      @input="emit('clear-error',side)"
      @percent="fill(side,$event)"
    />
    <dl class="form-summary">
      <dt>{{ $t('trade.available') }}</dt>
      <dd>
        <template v-if="balances.ready">{{ fmt(side==='buy'?balances.cash:balances.holdings) }}</template><Skeleton v-else inline width="72px"/> {{ unit(side) }}
      </dd>
      <dt>{{ $t(side==='buy'?'trade.form.canBuy':'trade.form.canSell') }}</dt>
      <dd>{{ reach(side) }} {{ side==='buy'?balances.base:'USDT' }}</dd>
    </dl>
    <FeedbackToast
      v-if="errors[side]"
      :id="'spot-'+side+'-error'"
      type="error"
      :source="() => errors[side] ? $t(errors[side]) : ''"
    />
  </section>
</template>

