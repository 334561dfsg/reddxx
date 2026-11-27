<script setup>
// Options (delivery) fields: direction, period with its payout rate, USDT amount and the expected return.
import {computed} from 'vue'
import Skeleton from '../../ui/Skeleton.vue'
import RecordFilter from '../../RecordFilter.vue'
import FeedbackToast from '../../../platform/FeedbackToast.js'
import OrderAmountField from './OrderAmountField.vue'
import {fmt} from '../../../data'
import {useOrderDrafts} from '../../../composables/tradePageState'
import {deliveryPeriods,orderEstimate} from '../../../utils/orderFormModel'
import {deliveryRate,percentAmount,periodLabel} from './orderPricing.js'

const props=defineProps({balances:Object,errors:Object})
const emit=defineEmits(['clear-error','clear-notice'])
const {options}=useOrderDrafts()

const periodItems=computed(()=>deliveryPeriods.map(([value,payout])=>({value,label:`${periodLabel(value)} · ${payout}%`})))
const estimate=computed(()=>orderEstimate({kind:'options',amount:options.amount,rate:deliveryRate(options.duration)}))

function fill(percent){
 if(!props.balances.ready)return
 options.amount=percentAmount(props.balances.cash,percent)
 emit('clear-error','options');emit('clear-notice')
}
</script>

<template>
  <div class="direction-tabs">
    <button
      v-for="side in ['buy','sell']"
      :key="side"
      :class="{active:options.side===side,buy:side==='buy',sell:side==='sell'}"
      :aria-pressed="options.side===side"
      @click="options.side=side"
    >{{ $t(side==='buy'?'trade.buyLong':'trade.sellShort') }}</button>
  </div>
  <dl class="form-summary">
    <dt>{{ $t('trade.form.tradingAsset') }}</dt>
    <dd>USDT</dd>
    <dt>{{ $t('trade.form.availableQuantity') }}</dt>
    <dd><template v-if="balances.ready">{{ fmt(balances.cash) }}</template><Skeleton v-else inline width="72px"/></dd>
    <dt>{{ $t('trade.form.minimum') }}</dt>
    <dd>100.00 USDT</dd>
    <dt>{{ $t('trade.fee') }}</dt>
    <dd>{{ fmt(estimate.fee) }} USDT</dd>
  </dl>
  <label>
    {{ $t('trade.period') }} / {{ $t('trade.payoutRate') }}
    <RecordFilter id="order-period" v-model="options.duration" variant="field" :label="$t('trade.period')" :options="periodItems"/>
  </label>
  <OrderAmountField
    id="options-order-amount"
    v-model="options.amount"
    :label="$t('trade.quantity')"
    unit="USDT"
    :invalid="!!errors.options"
    :describedby="errors.options?'options-form-error':undefined"
    @input="emit('clear-error','options')"
    @percent="fill"
  />
  <dl class="form-summary">
    <dt>{{ $t('trade.expectedReturn') }}</dt>
    <dd class="positive">{{ options.amount?'+'+fmt(estimate.expected)+' USDT':'—' }}</dd>
  </dl>
  <FeedbackToast
    v-if="errors.options"
    id="options-form-error"
    type="error"
    :source="() => errors.options ? $t(errors.options) : ''"
  />
</template>

