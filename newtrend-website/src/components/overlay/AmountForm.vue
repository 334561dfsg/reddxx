<script setup>
import {computed,shallowRef,watch} from 'vue'
import {message} from 'ant-design-vue'
import Coin from '../Coin.vue'
import {fmt} from '../../data'
import {t} from '../../i18n'
import {session} from '../../session'
import {balanceOf,credit,debit} from '../../mock/ledger.js'
import {money} from '../../utils/format.js'

// Generic amount dialog body for donate (charity) and convert (assets USDT → USDC 1:1).
// Spends from the shared ledger; the shell's footer submits it through form="action-form".
const props=defineProps({kind:{type:String,required:true},data:{type:Object,required:true}})
const emit=defineEmits(['state'])
const amount=shallowRef(String(props.data.amount||'')),invalid=shallowRef(false),done=shallowRef(false)
const symbol=computed(()=>props.data.symbol||'USDT'),min=computed(()=>props.data.min??0.01)
const available=computed(()=>balanceOf(session.mode,symbol.value))
watch([amount,done],()=>emit('state',{dirty:Boolean(amount.value)&&!done.value,valid:Boolean(amount.value),done:done.value}),{immediate:true})

function fail(key,params){invalid.value=true;message.error(t(key,params))}
function submit(){
 if(done.value)return
 const val=Number(amount.value)
 if(!Number.isFinite(val)||val<min.value)return fail('overlay.amountMinimum',{amount:fmt(min.value)})
 if(val>(props.data.max??500000))return fail('trade.spotErrorAboveMaxNotional')
 if(val>available.value)return fail(session.mode==='common.demo.demo'?'assets.withdraw.error.insufficientBalance':'overlay.ui.insufficientBalanceSwitchToDemoToTryThisLocally')
 if(!debit(session.mode,symbol.value,val))return fail('assets.withdraw.error.insufficientBalance')
 if(props.kind==='convert')credit(session.mode,'USDC',val)
 invalid.value=false;done.value=true;amount.value=''
 props.data.onConfirm?.(val)
 message.success(t('overlay.ui.demoCompletedNoRealTransactionWasSent'))
}
</script>
<template>
<div v-if="data.name" class="summary-line product-summary"><div class="coin-label"><Coin :symbol="symbol"/><div><strong>{{ $t(data.name) }}</strong><small class="muted product-meta">{{ symbol }}</small></div></div></div>
<form id="action-form" class="form-stack" @submit.prevent="submit">
 <div class="summary-line"><label for="action-amount">{{ $t("earn.subscribe.amountLabel") }}</label><small class="muted">{{ $t("aiQuant.create.availableBalanceLabel") }}{{ money(available) }} {{ symbol }}</small></div>
 <input id="action-amount" v-model="amount" inputmode="decimal" :placeholder="$t('c2c.order.fiatAmountPlaceholder')" :aria-invalid="invalid" :disabled="done" @input="invalid=false"/>
 <small class="muted">{{ $t("earn.table.columns.minAmount") }}{{ fmt(min) }} {{ symbol }}{{ $t("overlay.ui.localSimulation") }}</small>
</form>
</template>
<style scoped>.product-summary{padding:8px 0 24px;border-bottom:1px solid #ffffff0c;margin-bottom:24px}.product-meta{display:block;margin-top:6px}</style>
