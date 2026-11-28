<script setup>
import {computed,shallowRef,watch} from 'vue'
import {message} from 'ant-design-vue'
import Coin from '../Coin.vue'
import {fmt} from '../../data'
import {t} from '../../i18n'
import {session} from '../../session'
import Skeleton from '../ui/Skeleton.vue'
import {getAssetsOverview,spendFunds,walletErrorKey} from '../../api/wallet.js'
import {donate} from '../../api/charity.js'
import {invalidate,useMutation,useRequest} from '../../composables/useRequest.js'
import {money} from '../../utils/format.js'

// Generic amount dialog body for donate (charity). 閃兌 has its own dialog (FlashExchange).
// Spends from the shared ledger; the shell's footer submits it through form="action-form". A campaign donation
// (data.projectId) goes through api/charity.js, which checks the campaign, debits the ledger and records the donation.
const props=defineProps({kind:{type:String,required:true},data:{type:Object,required:true}})
const emit=defineEmits(['state'])
const amount=shallowRef(String(props.data.amount||'')),invalid=shallowRef(false),done=shallowRef(false)
const symbol=computed(()=>props.data.symbol||'USDT'),min=computed(()=>props.data.min??0.01)
// Balance from the API; spending goes through it too (the dialog shows busy and holds its close paths meanwhile).
const overview=useRequest(()=>getAssetsOverview(session.mode),{key:()=>session.mode})
const ready=computed(()=>overview.status.value==='ready')
const available=computed(()=>overview.data.value?.balances[symbol.value]||0)
const spending=useMutation(props.data.projectId?donate:spendFunds)
watch([amount,done,ready,spending.pending],()=>emit('state',{dirty:Boolean(amount.value)&&!done.value,valid:Boolean(amount.value)&&ready.value,done:done.value,busy:spending.pending.value}),{immediate:true})

function fail(key,params){invalid.value=true;message.error(t(key,params))}
async function submit(){
 if(done.value||spending.pending.value||!ready.value)return
 const val=Number(amount.value)
 try{await spending.run({mode:session.mode,kind:props.kind,projectId:props.data.projectId,symbol:symbol.value,amount:val,min:min.value,max:props.data.max??500000})}
 catch(cause){const key=walletErrorKey(cause);return fail(key,key==='overlay.amountMinimum'?{amount:fmt(min.value)}:undefined)}
 invalidate('wallet')
 invalid.value=false;done.value=true;amount.value=''
 props.data.onConfirm?.(val)
 message.success(t('overlay.ui.demoCompletedNoRealTransactionWasSent'))
}
</script>
<template>
<div v-if="data.name" class="summary-line product-summary"><div class="coin-label"><Coin :symbol="symbol"/><div><strong>{{ $t(data.name) }}</strong><small class="muted product-meta">{{ symbol }}</small></div></div></div>
<form id="action-form" class="form-stack" @submit.prevent="submit">
 <div class="summary-line"><label for="action-amount">{{ $t("earn.subscribe.amountLabel") }}</label><small class="muted">{{ $t("aiQuant.create.availableBalanceLabel") }}<template v-if="ready">{{ money(available) }}</template><Skeleton v-else inline width="72px"/> {{ symbol }}</small></div>
 <input id="action-amount" v-model="amount" inputmode="decimal" :placeholder="$t('c2c.order.fiatAmountPlaceholder')" :aria-invalid="invalid" :disabled="done" :readonly="spending.pending.value" @input="invalid=false"/>
 <small class="muted">{{ $t("earn.table.columns.minAmount") }}{{ fmt(min) }} {{ symbol }}{{ $t("overlay.ui.localSimulation") }}</small>
</form>
</template>
<style scoped>.product-summary{padding:8px 0 24px;border-bottom:1px solid #ffffff0c;margin-bottom:24px}.product-meta{display:block;margin-top:6px}</style>
