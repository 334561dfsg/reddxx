<script setup>
import {computed,h,shallowRef,watch} from 'vue'
import {message} from 'ant-design-vue'
import Coin from '../Coin.vue'
import NtSelect from '../ui/NtSelect.vue'
import Skeleton from '../ui/Skeleton.vue'
import Spinner from '../ui/Spinner.vue'
import LineIcon from '../ui/LineIcon.vue'
import {fmt} from '../../data'
import {t} from '../../i18n'
import {session} from '../../session'
import {getAssetsOverview,transferFunds,walletErrorKey} from '../../api/wallet.js'
import {invalidate,useMutation,useRequest} from '../../composables/useRequest.js'

// Transfer dialog body (Overlay type 'transfer'), laid out like the user's reference: From/To account selects joined
// by a rail with a swap button, then currency, quantity with an inline "All" and the available amount, and a
// full-width submit. With two accounts, choosing one side sets the other to the opposite account. Balances and the
// submission go through the wallet API; while submitting every close path is held. Success closes with a toast.
const emit=defineEmits(['state','close'])
const ACCOUNTS=['assets.tabs.funding','assets.tabs.trading']
const ASSETS=['USDT','BTC','ETH']
const from=shallowRef(),to=shallowRef(),asset=shallowRef(),amount=shallowRef(''),invalid=shallowRef('')
// Short account names in the selects (資金帳戶 / Funding); records keep the full account names.
const SHORT={'assets.tabs.funding':'assets.accountFunding','assets.tabs.trading':'assets.accountTrading'}
const accountOptions=computed(()=>ACCOUNTS.map(value=>({value,label:t(SHORT[value])})))
const assetOptions=ASSETS.map(value=>({value,label:value,display:h('span',{class:'at-option'},[h(Coin,{symbol:value}),value])}))
const overview=useRequest(()=>getAssetsOverview(session.mode),{key:()=>session.mode,tags:['wallet']})
const ready=computed(()=>overview.status.value==='ready')
// Funding holds every asset; the trading account holds USDT margin only. Zero until account and currency are chosen.
const available=computed(()=>{
 const data=overview.data.value;if(!data||!from.value||!asset.value)return 0
 return from.value==='assets.tabs.funding'?(data.balances[asset.value]||0):asset.value==='USDT'?(data.accounts['assets.tabs.trading']||0):0
})
const submitting=useMutation(transferFunds),busy=submitting.pending
watch([amount,from,asset,busy],()=>emit('state',{dirty:Boolean(amount.value||from.value||asset.value),busy:busy.value}),{immediate:true})
// Popups must render inside the native <dialog> (top layer); in document.body they would sit beneath it.
const popupHost=trigger=>trigger.closest('dialog')||document.body
const other=key=>ACCOUNTS.find(value=>value!==key)
function pickFrom(value){from.value=value;to.value=other(value);invalid.value=''}
function pickTo(value){to.value=value;from.value=other(value);invalid.value=''}
function pickAsset(value){asset.value=value;invalid.value=''}
function swap(){if(busy.value||!from.value)return;[from.value,to.value]=[to.value,from.value];invalid.value=''}
function fillAll(){if(!ready.value||busy.value)return;amount.value=String(Math.floor(available.value*1e8)/1e8);invalid.value=''}
function fail(field,key){invalid.value=field;message.error(t(key))}
async function submit(){
 if(busy.value)return
 if(!from.value||!to.value)return fail('accounts','assets.transferDialog.accountsRequired')
 if(!asset.value)return fail('asset','assets.transferDialog.currencyRequired')
 const value=Number(amount.value)
 if(!amount.value.trim()||!Number.isFinite(value)||value<=0)return fail('amount','assets.transferAmountRequired')
 if(!ready.value)return
 if(value>available.value)return fail('amount','assets.transferAmountExceeds')
 try{
  await submitting.run({mode:session.mode,from:from.value,to:to.value,currency:asset.value,amount:value,labels:{from:t(from.value),to:t(to.value)}})
 }catch(cause){return fail('amount',walletErrorKey(cause))}
 invalidate('wallet')
 message.success(t('assets.ui.demoTransferCompletedAndAddedToRecords'))
 amount.value=''
 emit('close')
}
</script>
<template>
<form id="asset-transfer-form" class="asset-transfer" novalidate @submit.prevent="submit">
 <div class="at-route">
  <div class="at-rail" aria-hidden="true"><span class="at-dot from"></span><span class="at-line"></span><span class="at-dot to"></span></div>
  <button type="button" class="at-swap" :aria-label="$t('assets.transferDialog.swap')" :title="$t('assets.transferDialog.swap')" :disabled="busy||!from" @click="swap"><LineIcon name="swap-vertical" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></button>
  <div class="at-route-fields">
   <div class="at-field"><span id="at-from-label" class="at-label">{{ $t('assets.transferDialog.from') }}</span>
    <NtSelect variant="dialog" :value="from" class="at-select" popup-class-name="at-select-popup" :get-popup-container="popupHost" aria-labelledby="at-from-label" :aria-invalid="invalid==='accounts'||undefined" :placeholder="$t('assets.transferDialog.select')" :show-search="false" :options="accountOptions" :disabled="busy" @change="pickFrom"><template #suffixIcon><LineIcon name="chevron-down" class="at-chevron" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></template></NtSelect>
   </div>
   <div class="at-field"><span id="at-to-label" class="at-label">{{ $t('assets.transferDialog.to') }}</span>
    <NtSelect variant="dialog" :value="to" class="at-select" popup-class-name="at-select-popup" :get-popup-container="popupHost" aria-labelledby="at-to-label" :aria-invalid="invalid==='accounts'||undefined" :placeholder="$t('assets.transferDialog.select')" :show-search="false" :options="accountOptions" :disabled="busy" @change="pickTo"><template #suffixIcon><LineIcon name="chevron-down" class="at-chevron" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></template></NtSelect>
   </div>
  </div>
 </div>
 <hr class="at-divider"/>
 <div class="at-field"><span id="at-asset-label" class="at-label">{{ $t('assets.transferDialog.currency') }}</span>
  <NtSelect variant="dialog" :value="asset" class="at-select" popup-class-name="at-select-popup" :get-popup-container="popupHost" aria-labelledby="at-asset-label" :aria-invalid="invalid==='asset'||undefined" :placeholder="$t('assets.transferDialog.select')" :show-search="false" :options="assetOptions" option-label-prop="display" :disabled="busy" @change="pickAsset">
   <template #option="{value}"><span class="at-option"><Coin :symbol="value"/>{{ value }}</span></template>
   <template #suffixIcon><LineIcon name="chevron-down" class="at-chevron" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></template>
  </NtSelect>
 </div>
 <div class="at-field"><label for="at-amount" class="at-label">{{ $t('assets.transferDialog.quantity') }}</label>
  <div class="at-amount"><input id="at-amount" v-model="amount" inputmode="decimal" autocomplete="off" :placeholder="$t('assets.transferDialog.quantityPlaceholder')" :readonly="busy" :aria-invalid="invalid==='amount'||undefined" aria-describedby="at-available" @input="invalid=''"/><button type="button" class="at-all" :disabled="!ready||busy||!from||!asset" @click="fillAll">{{ $t('assets.transferDialog.all') }}</button></div>
  <p id="at-available" class="at-available"><span>{{ $t('assets.transferDialog.available') }}:</span><b><template v-if="ready">{{ fmt(available) }}{{ asset?' '+asset:'' }}</template><Skeleton v-else inline width="56px"/></b></p>
 </div>
 <button type="submit" class="at-submit" :class="{'is-busy':busy}" :aria-disabled="busy||undefined" :aria-busy="busy||undefined"><Spinner v-if="busy"/>{{ $t('assets.transferDialog.submit') }}</button>
</form>
</template>
<style>
/* Unscoped: the selected value and popup rows are rendered inside the Ant Select, outside this component's scope. */

.at-option{display:inline-flex;align-items:center;gap:10px;line-height:20px}
.ant-select .at-option .coin,.at-select-popup .at-option .coin,.asset-transfer .at-option .coin{width:20px;height:20px;flex-shrink:0}
/* Centre the selected value (incl. the coin row) and the chevron in the 48px field. */
.asset-transfer .at-select .ant-select-selection-item,.asset-transfer .at-select .ant-select-selection-placeholder{display:flex;align-items:center}
.asset-transfer .at-select .ant-select-arrow{display:flex;align-items:center;height:16px;margin-top:-8px;color:#8a8c90}
.asset-transfer .at-chevron{display:block}
</style>
<style scoped>
.asset-transfer{display:grid;gap:20px;padding-top:4px;padding-bottom:4px}
.at-field{display:grid;gap:8px}
.at-label{font-size:14px;line-height:20px;color:#e6e7e9}
.at-select{width:100%}
/* From/To rail. Geometry: label 20 + gap 8 + select 48 → a select's centre is 52px below its field's top, and the
   fields are 96px apart (76 + 20 gap). Dots sit on the two select centres (52, 148); the swap button is centred
   on the rail halfway between them (100). Labels stay on one line so this holds in every language. */
.at-route{position:relative;display:grid;grid-template-columns:28px minmax(0,1fr);column-gap:12px}
.at-route-fields{grid-column:2;grid-row:1;display:grid;gap:20px}
.at-route-fields .at-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.at-rail{position:relative;grid-column:1;grid-row:1}
.at-dot{position:absolute;left:8px;width:12px;height:12px;border-radius:50%;border:2px solid;box-sizing:border-box}
.at-dot.from{top:46px;border-color:#2bc287}.at-dot.to{top:142px;border-color:#f46}
.at-line{position:absolute;left:13.5px;top:58px;height:84px;width:1px;background:#ffffff24}
.at-swap{position:absolute;left:0;top:86px;z-index:1;display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#1d2733;color:#a5ff4a}
.at-swap:hover:not(:disabled){background:#253242}
.at-swap:disabled{color:#87888a;cursor:not-allowed}
.at-swap:focus-visible{outline:none;background:#2c3b4d}
.at-divider{margin:0;border:0;border-top:1px solid #ffffff0f}
.at-amount{display:flex;align-items:center;min-height:48px;padding-right:14px;border:1px solid #ffffff1f;border-radius:12px;background:#0c0e10}
.at-amount:focus-within{background:#11151a}
.at-amount input{flex:1;min-width:0;min-height:46px;padding:0 12px;border:0;background:transparent;color:#fff;outline:none;font-size:14px}
.at-amount input::placeholder{color:#8a8c90}
.at-amount input[aria-invalid=true]{color:#ff6b84}
.at-all{padding:0;font-size:14px;color:#a5ff4a}
.at-all:disabled{color:#87888a;cursor:not-allowed}
.at-all:focus-visible{outline:none;text-decoration:underline}
.at-available{display:flex;justify-content:space-between;margin:0;font-size:13px;line-height:18px;color:#87888a}
.at-available b{color:#fff;font-weight:500;font-variant-numeric:tabular-nums}
.at-submit{display:inline-flex;align-items:center;justify-content:center;min-height:48px;margin-top:12px;border-radius:12px;background:#a5ff4a;color:#0a0d12;font-weight:600;font-size:15px}
.at-submit:hover{background:#b6ff6a}
.at-submit.is-busy{opacity:.8;cursor:progress}
.at-submit:focus-visible{outline:none;text-decoration:underline}
@media(pointer:coarse){.at-amount input,.at-submit{min-height:48px}}
</style>
