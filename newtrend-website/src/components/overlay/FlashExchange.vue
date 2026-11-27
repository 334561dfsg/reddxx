<script setup>
// 閃兌 dialog body (Overlay type 'flash-exchange'), with the GMXX Flash Exchange content (兌出 / 兌入 joined by a rail
// with a swap button, divider, quantity with 全部) in the transfer dialog's look. Below the quantity: available
// balance, the live rate and the estimated amount received. Assets, quote and the exchange go through the wallet API
// (local mock, price snapshot, no fee); choosing the same asset on both sides swaps them. Toast-only feedback;
// close paths are held while submitting; success closes the dialog.
import {computed,h,onBeforeUnmount,shallowRef,watch} from 'vue'
import {message} from 'ant-design-vue'
import Coin from '../Coin.vue'
import NtSelect from '../ui/NtSelect.vue'
import Skeleton from '../ui/Skeleton.vue'
import Spinner from '../ui/Spinner.vue'
import LineIcon from '../ui/LineIcon.vue'
import {fmt} from '../../data'
import {t} from '../../i18n'
import {session} from '../../session'
import {flashExchange,listFlashAssets,quoteFlashExchange,walletErrorKey} from '../../api/wallet.js'
import {invalidate,useMutation,useRequest} from '../../composables/useRequest.js'
const emit=defineEmits(['state','close'])
const from=shallowRef(),to=shallowRef(),amount=shallowRef(''),invalid=shallowRef('')
const assets=useRequest(()=>listFlashAssets(session.mode),{key:()=>session.mode,tags:['wallet']})
const ready=computed(()=>assets.status.value==='ready')
const options=computed(()=>(assets.data.value||[]).map(({asset})=>({value:asset,label:asset,display:h('span',{class:'at-option'},[h(Coin,{symbol:asset}),asset])})))
const available=computed(()=>assets.data.value?.find(a=>a.asset===from.value)?.available||0)
const value=computed(()=>Number(amount.value))
const hasAmount=computed(()=>amount.value.trim()!==''&&Number.isFinite(value.value)&&value.value>0)
// Quote: refreshed when the pair or amount changes (debounced); stale answers are ignored by useRequest.
const quoteKey=shallowRef('')
let timer
watch([from,to,amount],()=>{clearTimeout(timer);timer=setTimeout(()=>{quoteKey.value=from.value&&to.value?`${from.value}|${to.value}|${hasAmount.value?value.value:0}`:''},250)},{immediate:true})
onBeforeUnmount(()=>clearTimeout(timer))
const quote=useRequest(()=>quoteKey.value?quoteFlashExchange({from:from.value,to:to.value,amount:hasAmount.value?value.value:0}):Promise.resolve(null),{key:()=>quoteKey.value})
const submitting=useMutation(flashExchange),busy=submitting.pending
watch([amount,from,to,busy],()=>emit('state',{dirty:Boolean(amount.value||from.value||to.value),busy:busy.value}),{immediate:true})
// Popups must render inside the native <dialog> (top layer); in document.body they would sit beneath it.
const popupHost=trigger=>trigger.closest('dialog')||document.body
function pickFrom(next){if(next===to.value)to.value=from.value;from.value=next;invalid.value=''}
function pickTo(next){if(next===from.value)from.value=to.value;to.value=next;invalid.value=''}
function swap(){if(busy.value||!from.value||!to.value)return;[from.value,to.value]=[to.value,from.value];invalid.value=''}
function fillAll(){if(!ready.value||busy.value||!from.value)return;amount.value=String(Math.floor(available.value*1e8)/1e8);invalid.value=''}
function fail(field,key,params){invalid.value=field;message.error(t(key,params))}
const digits=asset=>['USDT','USDC'].includes(asset)?2:asset==='SOL'?4:6
const rateText=computed(()=>quote.data.value?Number(quote.data.value.rate).toLocaleString('en-US',{maximumFractionDigits:to.value&&['USDT','USDC'].includes(to.value)?4:8}):'')
async function submit(){
 if(busy.value)return
 if(!from.value||!to.value)return fail('assets','assets.convert.assetsRequired')
 if(!hasAmount.value)return fail('amount','assets.convert.amountRequired')
 if(!ready.value)return
 if(value.value>available.value)return fail('amount','assets.convert.amountExceeds')
 let result
 try{result=await submitting.run({mode:session.mode,from:from.value,to:to.value,amount:value.value})}
 catch(cause){return fail('amount',walletErrorKey(cause),cause?.params)}
 invalidate('wallet')
 message.success(t('assets.convert.success',{fromAmount:fmt(result.amount),fromAsset:result.from,toAmount:Number(result.receive).toLocaleString('en-US',{maximumFractionDigits:8}),toAsset:result.to}))
 amount.value=''
 emit('close')
}
</script>
<template>
<form id="flash-exchange-form" class="flash-exchange asset-transfer" novalidate @submit.prevent="submit">
 <div class="at-route">
  <div class="at-rail" aria-hidden="true"><span class="at-dot from"></span><span class="at-line"></span><span class="at-dot to"></span></div>
  <button type="button" class="at-swap" :aria-label="$t('assets.convert.swap')" :title="$t('assets.convert.swap')" :disabled="busy||!from||!to" @click="swap"><LineIcon name="swap-vertical" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></button>
  <div class="at-route-fields">
   <div class="at-field"><span id="fx-from-label" class="at-label">{{ $t('assets.convert.fromLabel') }}</span>
    <NtSelect variant="dialog" :value="from" class="at-select" popup-class-name="at-select-popup" :get-popup-container="popupHost" aria-labelledby="fx-from-label" :aria-invalid="invalid==='assets'||undefined" :placeholder="$t('assets.transferDialog.select')" :show-search="false" :options="options" option-label-prop="display" :disabled="busy||!ready" @change="pickFrom">
     <template #option="{value:asset}"><span class="at-option"><Coin :symbol="asset"/>{{ asset }}</span></template>
     <template #suffixIcon><LineIcon name="chevron-down" class="at-chevron" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></template>
    </NtSelect>
   </div>
   <div class="at-field"><span id="fx-to-label" class="at-label">{{ $t('assets.convert.toLabel') }}</span>
    <NtSelect variant="dialog" :value="to" class="at-select" popup-class-name="at-select-popup" :get-popup-container="popupHost" aria-labelledby="fx-to-label" :aria-invalid="invalid==='assets'||undefined" :placeholder="$t('assets.transferDialog.select')" :show-search="false" :options="options" option-label-prop="display" :disabled="busy||!ready" @change="pickTo">
     <template #option="{value:asset}"><span class="at-option"><Coin :symbol="asset"/>{{ asset }}</span></template>
     <template #suffixIcon><LineIcon name="chevron-down" class="at-chevron" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></template>
    </NtSelect>
   </div>
  </div>
 </div>
 <hr class="at-divider"/>
 <div class="at-field"><label for="fx-amount" class="at-label">{{ $t('assets.convert.quantity') }}</label>
  <div class="at-amount"><input id="fx-amount" v-model="amount" inputmode="decimal" autocomplete="off" :placeholder="$t('assets.transferDialog.quantityPlaceholder')" :readonly="busy" :aria-invalid="invalid==='amount'||undefined" aria-describedby="fx-available fx-quote" @input="invalid=''"/><span v-if="from" class="fx-unit">{{ from }}</span><button type="button" class="at-all" :disabled="!ready||busy||!from" @click="fillAll">{{ $t('assets.transferDialog.all') }}</button></div>
  <p id="fx-available" class="at-available"><span>{{ $t('assets.transferDialog.available') }}:</span><b><template v-if="ready">{{ from?Number(available).toLocaleString('en-US',{maximumFractionDigits:digits(from)})+' '+from:'--' }}</template><Skeleton v-else inline width="56px"/></b></p>
 </div>
 <dl id="fx-quote" class="fx-quote" aria-live="polite">
  <div><dt>{{ $t('assets.convert.rateLabel') }}</dt><dd><template v-if="from&&to"><template v-if="quote.data.value">1 {{ from }} ≈ {{ rateText }} {{ to }}</template><Skeleton v-else inline width="120px"/></template><template v-else>--</template></dd></div>
  <div class="receive"><dt>{{ $t('assets.convert.convertedAmount') }}</dt><dd><template v-if="from&&to&&hasAmount"><template v-if="quote.data.value&&quote.data.value.receive">≈ {{ Number(quote.data.value.receive).toLocaleString('en-US',{maximumFractionDigits:8}) }} {{ to }}</template><Skeleton v-else inline width="96px"/></template><template v-else>--</template></dd></div>
 </dl>
 <button type="submit" class="at-submit" :class="{'is-busy':busy}" :aria-disabled="busy||undefined" :aria-busy="busy||undefined"><Spinner v-if="busy"/>{{ $t('assets.convert.title') }}</button>
</form>
</template>
<style scoped>
/* Same geometry as the transfer dialog (AssetTransfer's rules are scoped, so they are repeated here); the Select
   value/arrow alignment comes from AssetTransfer's unscoped .asset-transfer rules, which this form also carries. */
.asset-transfer{display:grid;gap:20px;padding-top:4px;padding-bottom:4px}
.at-field{display:grid;gap:8px}
.at-label{font-size:14px;line-height:20px;color:#e6e7e9}
.at-select{width:100%}
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
.at-amount{display:flex;align-items:center;gap:12px;min-height:48px;padding-right:14px;border:1px solid #ffffff1f;border-radius:12px;background:#0c0e10}
.at-amount:focus-within{background:#11151a}
.at-amount input{flex:1;min-width:0;min-height:46px;padding:0 12px;border:0;background:transparent;color:#fff;outline:none;font-size:14px}
.at-amount input::placeholder{color:#8a8c90}
.at-amount input[aria-invalid=true]{color:#ff6b84}
.fx-unit{color:#87888a;font-size:13px}
.at-all{padding:0;font-size:14px;color:#a5ff4a}
.at-all:disabled{color:#87888a;cursor:not-allowed}
.at-all:focus-visible{outline:none;text-decoration:underline}
.at-available{display:flex;justify-content:space-between;margin:0;font-size:13px;line-height:18px;color:#87888a}
.at-available b{color:#fff;font-weight:500;font-variant-numeric:tabular-nums}
.fx-quote{display:grid;gap:8px;margin:0;padding:12px 14px;border-radius:12px;background:#ffffff06}
.fx-quote>div{display:flex;justify-content:space-between;gap:12px;font-size:13px;line-height:18px}
.fx-quote dt{color:#87888a}
.fx-quote dd{margin:0;color:#fff;text-align:right;font-variant-numeric:tabular-nums}
.fx-quote .receive dd{color:#2bc287;font-weight:600}
.at-submit{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;margin-top:4px;border-radius:12px;background:#a5ff4a;color:#0a0d12;font-weight:600;font-size:15px}
.at-submit:hover{background:#b6ff6a}
.at-submit.is-busy{opacity:.8;cursor:progress}
.at-submit:focus-visible{outline:none;text-decoration:underline}
</style>
