<script setup>
// Imported from script (not <style src>): RecordFilter also loads this sheet as a <style src> block, and the Vue
// plugin mixes up a src block shared by two SFCs at different block indexes in production builds.
import '../styles/trade-form-controls.css'
import './trading/order/orderForm.css'
// Order form shell: picks the product panel by `mode` and owns the submit footer. Fields live in
// trading/order/*OrderPanel.vue; validation, confirmation and feedback in trading/order/useOrderSubmit.js.
// compact: phone layout. Futures then picks a side first (买入开多 / 卖出开空) and shows one action for it, like
// spot and options; the desktop form keeps both futures actions side by side.
import {ref} from 'vue'
import FeedbackToast from '../platform/FeedbackToast.js'
import {useOrderDrafts} from '../composables/tradePageState'
import FuturesOrderPanel from './trading/order/FuturesOrderPanel.vue'
import OptionsOrderPanel from './trading/order/OptionsOrderPanel.vue'
import SpotOrderPanel from './trading/order/SpotOrderPanel.vue'
import {useOrderBalances,useOrderSubmit} from './trading/order/useOrderSubmit.js'

const props=defineProps({mode:String,pair:Object,compact:Boolean})
const {futures,options,spot}=useOrderDrafts()
const formRoot=ref(null)
const balances=useOrderBalances(()=>props.pair)
const {errors,notice,clearError,clearNotice,submit}=useOrderSubmit({
 mode:()=>props.mode,
 pair:()=>props.pair,
 balances,
 focusAmount:()=>formRoot.value?.querySelector('input.trade-field')?.focus(),
})
const regionLabel={futures:'trade.futuresOrder',options:'trade.optionsOrder'}
</script>

<template>
  <div ref="formRoot" class="trade-order-form" :class="{'spot-order-form':mode==='spot',compact}">
    <div class="form-body" tabindex="0" role="region" :aria-label="$t(regionLabel[mode]||'common.spot')">
      <FuturesOrderPanel
        v-if="mode==='futures'"
        :pair="pair"
        :compact="compact"
        :balances="balances"
        :errors="errors"
        @clear-error="clearError"
        @clear-notice="clearNotice"
      />
      <OptionsOrderPanel
        v-else-if="mode==='options'"
        :balances="balances"
        :errors="errors"
        @clear-error="clearError"
        @clear-notice="clearNotice"
      />
      <SpotOrderPanel
        v-else
        :pair="pair"
        :compact="compact"
        :balances="balances"
        :errors="errors"
        @clear-error="clearError"
        @clear-notice="clearNotice"
      />
    </div>
    <footer class="form-actions">
      <FeedbackToast v-if="notice" type="success" :source="() => notice || ''"/>
      <div :class="{'action-pair':mode==='futures'&&!compact}">
        <button v-if="mode==='futures'&&compact" :class="futures.side==='sell'?'sell':'buy'" @click="submit(futures.side||'buy')">
          {{ $t(futures.side==='sell'?'trade.sellShort':'trade.buyLong') }}
        </button>
        <button v-else-if="mode==='options'" :class="options.side==='buy'?'buy':'sell'" @click="submit(options.side)">
          {{ $t(options.side==='buy'?'trade.buyLong':'trade.sellShort') }}
        </button>
        <button v-else-if="mode==='spot'" :class="spot.side==='sell'?'sell':'buy'" @click="submit(spot.side||'buy')">
          {{ $t(spot.side==='sell'?'trade.sell':'trade.buy') }}
        </button>
        <template v-else>
          <button class="buy" @click="submit('buy')">{{ $t('trade.buyLong') }}</button>
          <button class="sell" @click="submit('sell')">{{ $t('trade.sellShort') }}</button>
        </template>
      </div>
    </footer>
  </div>
</template>

