<script setup>
import {ref} from 'vue'
import {message} from 'ant-design-vue'
import {path} from '../data'
import {t} from '../i18n'
import {session} from '../session'
import {addWalletRecord} from '../walletRecords'
const coin=ref('USDT'),network=ref('ETH'),amount=ref(''),address=ref('')
// Demo withdrawal request: validates, records a pending wallet row, sends nothing. Feedback is toast-only, one per attempt.
function submitFunds(){
 if(!Number.isFinite(Number(amount.value))||Number(amount.value)<=0){message.error(t('aiQuant.quantFund.subscribe.errorAmountInvalid'));return}
 if(!address.value.trim()){message.error(t('assets.withdraw.error.addressRequired'));return}
 addWalletRecord(session.mode,'withdraw',{label:'content.ui.demoWithdrawalRequest',amount:amount.value,symbol:coin.value,status:'pending'})
 message.success(t('content.ui.localDemoCompletedNoDataOrFundsWereSent'))
 amount.value=''
}
</script>
<template>
<div class="container section-pad"><div class="summary-line"><RouterLink class="muted" :to="path('/assets')">{{ $t("account.ui.back") }}</RouterLink><RouterLink class="muted" :to="path('/assets/records')">{{ $t("deposit.history.entry") }}</RouterLink></div><h1 class="page-title">{{ $t("assets.typeWithdraw") }}</h1><p class="page-desc">{{ $t("content.ui.selectAnAssetAndNetworkThenEnterTheDestination") }}</p><form class="form-stack section-gap" @submit.prevent="submitFunds"><label>{{ $t("assets.withdraw.coin") }}<select v-model="coin"><option :value="&quot;USDT&quot;">{{ $t("USDT") }}</option><option :value="&quot;USDC&quot;">{{ $t("USDC") }}</option><option :value="&quot;BTC&quot;">{{ $t("BTC") }}</option><option :value="&quot;ETH&quot;">{{ $t("ETH") }}</option></select></label><label>{{ $t("deposit.selectNetwork") }}<select v-model="network"><option :value="&quot;ETH&quot;">{{ $t("ETH") }}</option><option :value="&quot;TRON&quot;">{{ $t("TRON") }}</option><option :value="&quot;BTC&quot;">{{ $t("BTC") }}</option></select></label><div class="two-cols"><div class="form-stack"><p class="notice">{{ $t("content.ui.localDemoDoNotTransferToDemoAddressesOr") }}</p><label>{{ $t("assets.withdraw.address") }}<input v-model="address" :placeholder="$t(&quot;assets.withdraw.error.addressRequired&quot;)"/></label><label>{{ $t("deposit.voucher.amountLabel") }}<input v-model="amount" inputmode="decimal" :placeholder="$t(&quot;c2c.order.fiatAmountPlaceholder&quot;)"/></label></div></div><button class="primary-button">{{ $t("content.ui.submitDemo") }}</button></form></div>
</template>
