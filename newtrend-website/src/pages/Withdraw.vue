<script setup>
import {computed,ref,watch} from 'vue'
import {message} from 'ant-design-vue'
import {fmt,path} from '../data'
import {t} from '../i18n'
import {openModal,session} from '../session'
import LineIcon from '../components/ui/LineIcon.vue'
import NtSelect from '../components/ui/NtSelect.vue'
import Skeleton from '../components/ui/Skeleton.vue'
import Spinner from '../components/ui/Spinner.vue'
import {coinOptions as coinOptionsFor,networkOptions as networkOptionsFor} from '../components/deposit/chainOptions.js'
import {ADDRESS_MAX_LENGTH,networksOf,withdrawFee} from '../mock/chains.js'
import {checkWithdrawal,getAssetsOverview,requestWithdrawal,walletErrorKey} from '../api/wallet.js'
import {invalidate,useMutation,useRequest} from '../composables/useRequest.js'
import '../styles/deposit-fidelity.css'
import '../styles/withdraw-fidelity.css'

// Withdraw page, laid out after newtrendcapital.com/zh-TW/withdraw (measured 2026-11-26): available balance card,
// coin / network / address (paste) / amount (unit + 最大) on the left; a 380px column with the 合計扣除 / 手續費 /
// 實際到帳 summary and the 安全提示 card; full-width submit. Validation and the balance lock happen in the wallet API
// (address format per network, amount, balance) and the fund password is asked for in a dialog before the request;
// results are toast-only. Nothing is ever sent on-chain.
const coin=ref('USDT'),network=ref('ETH'),address=ref(''),amount=ref(''),invalid=ref('')
const networks=computed(()=>networksOf(coin.value))
const coinOptions=coinOptionsFor()
const networkOptions=computed(()=>networkOptionsFor(networks.value,{dot:false}))
watch(coin,()=>{if(!networks.value.includes(network.value))network.value=networks.value[0];invalid.value=''})

const overview=useRequest(()=>getAssetsOverview(session.mode),{key:()=>session.mode,tags:['wallet']})
const ready=computed(()=>overview.status.value==='ready')
const available=computed(()=>overview.data.value?.balances[coin.value]||0)
const value=computed(()=>Number(amount.value))
const hasAmount=computed(()=>amount.value.trim()!==''&&Number.isFinite(value.value)&&value.value>0)
const fee=computed(()=>withdrawFee(coin.value,network.value))
const received=computed(()=>hasAmount.value?Math.max(0,value.value-fee.value):0)

// 提現 first asks the wallet API to validate the form (no funds locked), then asks for the 6-digit fund password in
// a dialog; the request itself re-validates and checks the password server-side. Without a fund password the
// set-password dialog opens instead (user decision 2026-11-26).
const checking=useMutation(checkWithdrawal),submitting=useMutation(requestWithdrawal)
const busy=computed(()=>checking.pending.value||submitting.pending.value)
const markInvalid=key=>{invalid.value=key.includes('ddress')?'address':key.includes('mount')||key.includes('alance')||key.includes('fee')?'amount':''}
async function paste(){
 if(busy.value)return
 try{const text=(await navigator.clipboard.readText()).trim();if(text){address.value=text.slice(0,ADDRESS_MAX_LENGTH);invalid.value=''}}
 catch{message.error(t('common.copyFailed'))}
}
function fillMax(){if(!ready.value||busy.value)return;amount.value=String(Math.floor(available.value*1e8)/1e8);invalid.value=''}
async function submit(){
 if(busy.value)return
 invalid.value=''
 const request={mode:session.mode,coin:coin.value,network:network.value,address:address.value,amount:amount.value}
 let check
 try{check=await checking.run(request)}
 catch(cause){const key=walletErrorKey(cause);markInvalid(key);return message.error(t(key,cause.params))}
 if(!check.fundPasswordSet){
  message.error(t('assets.withdraw.error.fundPasswordNotSet'))
  return openModal('fund-password','profile.center.fundPassword.setTitle',{set:false})
 }
 openModal('fund-password-verify','assets.withdraw.fundPasswordTitle',{
  summary:{coin:coin.value,amount:fmt(check.amount),fee:fmt(check.fee),received:fmt(check.received),address:address.value.trim()},
  onSubmit:async fundPassword=>{
   try{await submitting.run({...request,fundPassword})}
   catch(cause){markInvalid(walletErrorKey(cause));throw cause}
   message.success(t('assets.withdraw.success'))
   amount.value='';address.value='';invalidate('wallet')
  },
 })
}
</script>
<template>
<div class="deposit-page withdraw-page">
 <div class="deposit-top">
  <RouterLink :to="path('/assets')"><LineIcon name="arrow-left" aria-hidden="true"/>{{ $t('assets.withdraw.back') }}</RouterLink>
  <RouterLink :to="path('/assets/records')"><LineIcon name="history" aria-hidden="true"/>{{ $t('deposit.history.entry') }}</RouterLink>
 </div>
 <h1>{{ $t('assets.withdraw.title') }}</h1>
 <p class="deposit-subtitle withdraw-subtitle">{{ $t('assets.withdraw.subtitle') }}</p>

 <section class="wd-card wd-balance" :aria-busy="!ready||undefined">
  <span class="wd-balance-icon" aria-hidden="true"><LineIcon set="lending" name="wallet"/></span>
  <div><div class="wd-caption">{{ $t('assets.withdraw.available') }}</div><div class="wd-balance-value"><template v-if="ready"><span class="wd-num">{{ fmt(available) }}</span></template><Skeleton v-else inline width="96px"/><span class="wd-unit">{{ coin }}</span></div></div>
 </section>

 <form class="wd-form" novalidate @submit.prevent="submit">
  <div class="wd-grid">
   <div class="wd-main">
    <div class="wd-field">
     <label id="wd-coin-label">{{ $t('assets.withdraw.coin') }}</label>
     <NtSelect variant="pill" v-model:value="coin" class="deposit-select" popup-class-name="deposit-select-popup" aria-labelledby="wd-coin-label" :show-search="false" :options="coinOptions" option-label-prop="display" :disabled="busy" :list-height="384">
      <template #option="{display}"><component :is="display"/></template>
      <template #suffixIcon><LineIcon name="chevron-down" class="deposit-chevron" aria-hidden="true"/></template>
     </NtSelect>
    </div>
    <div class="wd-field">
     <label id="wd-network-label">{{ $t('assets.withdraw.network') }}</label>
     <NtSelect variant="pill" v-model:value="network" class="deposit-select wd-network-select" popup-class-name="deposit-select-popup" aria-labelledby="wd-network-label" :show-search="false" :options="networkOptions" option-label-prop="display" :disabled="busy" @change="invalid=''">
      <template #option="{display}"><component :is="display"/></template>
      <template #suffixIcon><LineIcon name="chevron-down" class="deposit-chevron" aria-hidden="true"/></template>
     </NtSelect>
    </div>
    <div class="wd-field">
     <label for="wd-address">{{ $t('assets.withdraw.address') }}</label>
     <div class="wd-input wd-input-address">
      <input id="wd-address" v-model="address" autocomplete="off" spellcheck="false" :maxlength="ADDRESS_MAX_LENGTH" :placeholder="$t('assets.withdraw.addressPlaceholder')" :readonly="busy" :aria-invalid="invalid==='address'||undefined" @input="invalid=''"/>
      <div class="wd-input-actions">
       <button v-if="address" type="button" class="wd-clear" :aria-label="$t('assets.withdraw.clear')" :title="$t('assets.withdraw.clear')" :disabled="busy" @click="address='';invalid=''">×</button>
       <button type="button" class="wd-action" :disabled="busy" @click="paste"><LineIcon name="clipboard" aria-hidden="true"/>{{ $t('assets.withdraw.paste') }}</button>
      </div>
     </div>
    </div>
    <div class="wd-field">
     <label for="wd-amount">{{ $t('assets.withdraw.amount') }}</label>
     <div class="wd-input wd-input-amount">
      <input id="wd-amount" v-model="amount" inputmode="decimal" autocomplete="off" placeholder="0.00" :readonly="busy" :aria-invalid="invalid==='amount'||undefined" @input="invalid=''"/>
      <div class="wd-input-actions"><span class="wd-unit">{{ coin }}</span><button type="button" class="wd-max" :disabled="!ready||busy" @click="fillMax">{{ $t('assets.withdraw.max') }}</button></div>
     </div>
    </div>
   </div>

   <aside class="wd-side">
    <dl class="wd-card wd-summary">
     <div><dt>{{ $t('assets.withdraw.totalDeduct') }}</dt><dd><span class="wd-num">{{ hasAmount?fmt(value):'--' }}</span> {{ coin }}</dd></div>
     <div><dt>{{ $t('assets.withdraw.fee') }}</dt><dd><span class="wd-num">{{ fmt(fee) }}</span> {{ coin }}</dd></div>
     <div class="wd-summary-total"><dt>{{ $t('assets.withdraw.received') }}</dt><dd><span class="wd-num">{{ fmt(received) }}</span> {{ coin }}</dd></div>
    </dl>
    <section class="wd-card wd-tips" aria-labelledby="wd-tips-title">
     <span class="wd-tips-icon" aria-hidden="true"><LineIcon name="shield-alert"/></span>
     <div><h2 id="wd-tips-title">{{ $t('assets.withdraw.tips.title') }}</h2><ul><li>{{ $t('assets.withdraw.tips.checkAddress') }}</li><li>{{ $t('assets.withdraw.tips.irreversible') }}</li><li>{{ $t('assets.withdraw.tips.networkMatch') }}</li></ul></div>
    </section>
   </aside>
  </div>

  <button type="submit" class="wd-submit" :class="{'is-busy':busy}" :aria-disabled="busy||undefined" :aria-busy="busy||undefined"><Spinner v-if="busy"/>{{ $t(busy?'assets.withdraw.submitting':'assets.withdraw.submit') }}</button>
 </form>
</div>
</template>
