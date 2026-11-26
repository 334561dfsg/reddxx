<script setup>
import {coinImage} from '../../utils/coinAssets'
import {computed,h,onBeforeUnmount,ref,watch} from 'vue'
import {ConfigProvider,Select,message,theme} from 'ant-design-vue'
import {path} from '../../data'
import {session} from '../../session'
import {addWalletRecord} from '../../walletRecords'
import {t} from '../../i18n'
import '../../styles/deposit-fidelity.css'

// Coin → supported network list, measured from the source deposit page (2026-11-26).
const coins=[
 {symbol:'USDT',networks:['ETH','TRX','SOL','BASE']},
 {symbol:'ETH',networks:['ETH']},
 {symbol:'BTC',networks:['BTC']},
 {symbol:'USDC',networks:['ETH','SOL','BASE']},
 {symbol:'SOL',networks:['SOL']},
 {symbol:'DAI',networks:['ETH']},
]
const MAX_FILE=10*1024*1024

const coin=ref('USDT'),network=ref('ETH'),amount=ref(''),hash=ref(''),file=ref(null),preview=ref(''),busy=ref(false),attempted=ref(false)
const networks=computed(()=>coins.find(c=>c.symbol===coin.value)?.networks||[])
// Demo-only placeholder: intentionally not a valid on-chain address so nothing can be sent to it.
const address=computed(()=>`DEMO-${network.value}-ADDRESS-NOT-FOR-TRANSFER`)
const amountValue=computed(()=>Number(amount.value))
const amountInvalid=computed(()=>!amount.value.trim()||!Number.isFinite(amountValue.value)||amountValue.value<=0)
const hashInvalid=computed(()=>hash.value.trim().length>128)
const ready=computed(()=>!amountInvalid.value&&!hashInvalid.value&&!!file.value)

watch(coin,()=>{if(!networks.value.includes(network.value))network.value=networks.value[0]})

const coinMark=symbol=>coinImage(symbol,'logo')?h('img',{class:'deposit-coin',src:coinImage(symbol,'logo'),alt:''}):h('span',{class:'deposit-coin deposit-coin-text','aria-hidden':'true'},symbol.slice(0,2))
const coinOptions=computed(()=>coins.map(({symbol})=>({value:symbol,label:symbol,display:h('span',{class:'deposit-option'},[coinMark(symbol),h('span',{class:'deposit-option-text'},[h('strong',symbol),h('small',symbol)])])})))
const networkOptions=computed(()=>networks.value.map(code=>({value:code,label:code,display:h('span',{class:'deposit-option deposit-network'},[h('span',{class:'deposit-dot','aria-hidden':'true'}),h('strong',code),h('small',code)])})))
const selectTheme={algorithm:theme.darkAlgorithm,token:{colorPrimary:'#a5ff4a',colorBgContainer:'#0c1017',colorBgElevated:'#0c1017',colorText:'#ffffff',colorTextPlaceholder:'#a0a1a2',colorBorder:'#191b1f',controlOutline:'transparent',controlOutlineWidth:0,borderRadius:24,borderRadiusLG:24,fontSize:14},components:{Select:{controlHeight:48,optionPadding:'12px 16px',optionSelectedBg:'rgba(165,255,74,.1)',optionSelectedColor:'#a5ff4a',optionActiveBg:'rgba(255,255,255,.04)'}}}

async function copyAddress(){try{await navigator.clipboard.writeText(address.value);message.success(t('deposit.copySuccess'))}catch{message.error(t('deposit.copyFailed'))}}
function clearPreview(){if(preview.value)URL.revokeObjectURL(preview.value);preview.value=''}
function pick(event){
 const f=event.target.files?.[0];event.target.value=''
 if(!f)return
 if(!['image/png','image/jpeg'].includes(f.type)){message.error(t('content.ui.selectAPngOrJpegImage'));return}
 if(f.size>MAX_FILE){message.error(t('content.ui.imageMustNotExceed10Mb'));return}
 clearPreview();file.value=f;preview.value=URL.createObjectURL(f)
}
function submit(){
 if(busy.value)return
 attempted.value=true
 const errors=[]
 if(!amount.value.trim())errors.push('deposit.voucher.amountRequired')
 else if(amountInvalid.value)errors.push('deposit.voucher.amountTooSmall')
 if(hashInvalid.value)errors.push('deposit.voucher.txHashTooLong')
 if(!file.value)errors.push('deposit.voucher.screenshotRequired')
 if(errors.length){message.error(errors.map(k=>t(k)).join(' '));document.querySelector('.deposit-page [aria-invalid="true"]')?.focus();return}
 busy.value=true
 const voucherId='DV'+Date.now().toString(36).toUpperCase()
 addWalletRecord(session.mode,'deposit',{label:'content.ui.demoDepositRequest',amount:amount.value,symbol:coin.value,status:'pending'})
 message.success(`${t('deposit.voucher.submittedTitle')} ${t('deposit.voucher.submittedDesc',{voucherId})}`)
 amount.value='';hash.value='';file.value=null;clearPreview();attempted.value=false;busy.value=false
}
onBeforeUnmount(clearPreview)
</script>

<template>
<div class="deposit-page">
 <div class="deposit-top">
  <RouterLink :to="path('/assets')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 19-7-7 7-7M19 12H5"/></svg>{{ $t('deposit.back') }}</RouterLink>
  <RouterLink :to="path('/assets/records')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5M12 7v5l4 2"/></svg>{{ $t('deposit.history.entry') }}</RouterLink>
 </div>
 <h1>{{ $t('deposit.pageTitle') }}</h1>
 <p class="deposit-subtitle">{{ $t('deposit.subtitle') }}</p>

 <form class="deposit-form" novalidate @submit.prevent="submit">
  <ConfigProvider :theme="selectTheme">
   <div class="deposit-field">
    <label id="deposit-coin-label" for="deposit-coin">{{ $t('deposit.selectCoin') }}</label>
    <Select id="deposit-coin" v-model:value="coin" class="deposit-select" popup-class-name="deposit-select-popup" aria-labelledby="deposit-coin-label" :show-search="false" :options="coinOptions" option-label-prop="display" :disabled="busy" :list-height="384">
     <template #option="{display}"><component :is="display"/></template>
     <template #suffixIcon><svg class="deposit-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></template>
    </Select>
   </div>
   <div class="deposit-field">
    <label id="deposit-network-label" for="deposit-network">{{ $t('deposit.selectNetwork') }}</label>
    <Select id="deposit-network" v-model:value="network" class="deposit-select" popup-class-name="deposit-select-popup" aria-labelledby="deposit-network-label" :show-search="false" :options="networkOptions" option-label-prop="display" :disabled="busy">
     <template #option="{display}"><component :is="display"/></template>
     <template #suffixIcon><svg class="deposit-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></template>
    </Select>
   </div>
  </ConfigProvider>

  <div class="deposit-grid">
   <div class="deposit-left">
    <p class="deposit-warning"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4M12 17h.01"/></svg><span>{{ $t('deposit.voucher.sharedAddressWarning') }}</span></p>
    <div class="deposit-address-block">
     <div class="deposit-caption" id="deposit-address-label">{{ $t('deposit.depositAddress') }}</div>
     <div class="deposit-address" role="group" aria-labelledby="deposit-address-label">
      <code>{{ address }}</code>
      <button type="button" class="deposit-copy" :aria-label="$t('deposit.copyAddress')" :title="$t('deposit.copyAddress')" @click="copyAddress"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg></button>
     </div>
     <div class="deposit-trust"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1zM9 12l2 2 4-4"/></svg><span>{{ $t('deposit.addressTrust') }}</span></div>
    </div>
    <div class="deposit-field">
     <label for="deposit-amount">{{ $t('deposit.voucher.amountLabel') }}</label>
     <div class="deposit-input-wrap">
      <input id="deposit-amount" v-model="amount" inputmode="decimal" autocomplete="off" :placeholder="$t('deposit.voucher.amountPlaceholder')" :disabled="busy" aria-required="true" :aria-invalid="attempted&&amountInvalid" :aria-describedby="attempted&&amountInvalid?'deposit-amount-error':undefined"/>
      <span aria-hidden="true">{{ coin }}</span>
     </div>
     <span v-if="attempted&&amountInvalid" id="deposit-amount-error" class="feedback-accessible-description">{{ $t(amount.trim()?'deposit.voucher.amountTooSmall':'deposit.voucher.amountRequired') }}</span>
    </div>
    <div class="deposit-field">
     <label for="deposit-hash">{{ $t('deposit.voucher.txHashLabel') }}</label>
     <input id="deposit-hash" v-model="hash" autocomplete="off" spellcheck="false" :placeholder="$t('deposit.voucher.txHashPlaceholder')" :disabled="busy" :aria-invalid="hashInvalid" :aria-describedby="hashInvalid?'deposit-hash-error':undefined"/>
     <span v-if="hashInvalid" id="deposit-hash-error" class="feedback-accessible-description">{{ $t('deposit.voucher.txHashTooLong') }}</span>
    </div>
   </div>

   <div class="deposit-field deposit-right">
    <span id="deposit-file-label" class="deposit-label">{{ $t('deposit.voucher.screenshotLabel') }}</span>
    <label class="deposit-drop" :class="{filled:preview}">
     <input type="file" accept="image/png,image/jpeg" class="deposit-file" aria-labelledby="deposit-file-label" aria-required="true" :aria-invalid="attempted&&!file" :aria-describedby="attempted&&!file?'deposit-file-error':undefined" :disabled="busy" @change="pick"/>
     <img v-if="preview" :src="preview" :alt="file?.name||''"/>
     <template v-else>
      <span class="deposit-drop-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/></svg></span>
      <span class="deposit-drop-title">{{ $t('deposit.voucher.screenshotLabel') }}</span>
      <span class="deposit-drop-hint"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M17 8l-5-5-5 5M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/></svg>{{ $t('deposit.voucher.screenshotHint') }}</span>
     </template>
     <span v-if="preview" class="deposit-drop-name">{{ file?.name }}</span>
    </label>
    <span v-if="attempted&&!file" id="deposit-file-error" class="feedback-accessible-description">{{ $t('deposit.voucher.screenshotRequired') }}</span>
   </div>
  </div>

  <button type="submit" class="deposit-submit" :class="{incomplete:!ready}" :aria-busy="busy" :disabled="busy">{{ $t(busy?'deposit.voucher.submitting':'deposit.voucher.submit') }}</button>
 </form>
</div>
</template>
