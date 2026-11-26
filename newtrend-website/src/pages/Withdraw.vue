<script setup>
import {ref} from 'vue'
import {message} from 'ant-design-vue'
import {path} from '../data'
import {t} from '../i18n'
import {session} from '../session'
import Spinner from '../components/ui/Spinner.vue'
import {requestWithdrawal,walletErrorKey} from '../api/wallet.js'
import {invalidate,useMutation} from '../composables/useRequest.js'
const coin=ref('USDT'),network=ref('ETH'),amount=ref(''),address=ref('')
// Demo withdrawal request through the API: validated there, recorded as a pending wallet row, nothing is sent.
// Feedback is toast-only, one per attempt; the submit button shows busy and repeated submits are ignored.
const submitting=useMutation(requestWithdrawal)
async function submitFunds(){
 if(submitting.pending.value)return
 try{
  await submitting.run({mode:session.mode,coin:coin.value,network:network.value,address:address.value,amount:amount.value})
  message.success(t('content.ui.localDemoCompletedNoDataOrFundsWereSent'))
  amount.value='';invalidate('wallet')
 }catch(cause){message.error(t(walletErrorKey(cause)))}
}
</script>
<template>
<div class="container section-pad"><div class="summary-line"><RouterLink class="muted" :to="path('/assets')">{{ $t("account.ui.back") }}</RouterLink><RouterLink class="muted" :to="path('/assets/records')">{{ $t("deposit.history.entry") }}</RouterLink></div><h1 class="page-title">{{ $t("assets.typeWithdraw") }}</h1><p class="page-desc">{{ $t("content.ui.selectAnAssetAndNetworkThenEnterTheDestination") }}</p><form class="form-stack section-gap" @submit.prevent="submitFunds"><label>{{ $t("assets.withdraw.coin") }}<select v-model="coin"><option :value="&quot;USDT&quot;">{{ $t("USDT") }}</option><option :value="&quot;USDC&quot;">{{ $t("USDC") }}</option><option :value="&quot;BTC&quot;">{{ $t("BTC") }}</option><option :value="&quot;ETH&quot;">{{ $t("ETH") }}</option></select></label><label>{{ $t("deposit.selectNetwork") }}<select v-model="network"><option :value="&quot;ETH&quot;">{{ $t("ETH") }}</option><option :value="&quot;TRON&quot;">{{ $t("TRON") }}</option><option :value="&quot;BTC&quot;">{{ $t("BTC") }}</option></select></label><div class="two-cols"><div class="form-stack"><p class="notice">{{ $t("content.ui.localDemoDoNotTransferToDemoAddressesOr") }}</p><label>{{ $t("assets.withdraw.address") }}<input v-model="address" :placeholder="$t(&quot;assets.withdraw.error.addressRequired&quot;)"/></label><label>{{ $t("deposit.voucher.amountLabel") }}<input v-model="amount" inputmode="decimal" :placeholder="$t(&quot;c2c.order.fiatAmountPlaceholder&quot;)"/></label></div></div><button class="primary-button" :class="{'is-busy':submitting.pending.value}" :aria-disabled="submitting.pending.value||undefined" :aria-busy="submitting.pending.value||undefined"><Spinner v-if="submitting.pending.value"/>{{ $t("content.ui.submitDemo") }}</button></form></div>
</template>
