<script setup>
import FeedbackToast from '../platform/FeedbackToast.js'
import {shallowRef,watch,nextTick,onUnmounted,computed} from 'vue'
import {useRoute,useRouter} from 'vue-router'
import {modal,openModal,closeModal,session,login,logout,requestModeSwitch} from '../session'
import {path} from '../data'
import Icon from './Icon.vue'
import {useLocaleSwitch} from '../composables/useLocaleSwitch'
import SupportChat from './SupportChat.vue'
import C2CAccountForm from './c2c/C2CAccountForm.vue'
import C2COrderDetail from './c2c/C2COrderDetail.vue'
import EarnSubscription from './earn/EarnSubscription.vue'
import StrategyDetails from './strategy/StrategyDetails.vue'
import StrategySubscription from './strategy/StrategySubscription.vue'
import '../styles/strategy-fidelity.css'
import QuantFundSubscription from './quant/QuantFundSubscription.vue'
import QuantFundOrderDetails from './quant/QuantFundOrderDetails.vue'
import EarnRedemption from './earn/EarnRedemption.vue'
import EarnHoldingDetails from './earn/EarnHoldingDetails.vue'
import MenuDrawer from './overlay/MenuDrawer.vue'
import LanguageList from './overlay/LanguageList.vue'
import SupportChannels from './overlay/SupportChannels.vue'
import VipTiers from './overlay/VipTiers.vue'
import AmountForm from './overlay/AmountForm.vue'
import AssetTransfer from './overlay/AssetTransfer.vue'
import PasswordForm from '../pages/account/PasswordForm.vue'
import Spinner from './ui/Spinner.vue'
// State reported by the open flow's body component ({dirty, valid, done, confirmLabel}); drives the unsaved-work guard and footer.
const flow=shallowRef({})
const onFlowState=state=>{flow.value={...state,dirty:state.dirty??Boolean(state.draft)}}
// While a flow's request is in flight ({busy:true}) every close path (×, cancel, Escape) is held so the result can be read.
const busy=computed(()=>Boolean(flow.value.busy))
const dialog=shallowRef(null),current=shallowRef(null),closing=shallowRef(false),error=shallowRef(''),done=shallowRef(false),message=shallowRef('')
const route=useRoute(),router=useRouter();let trigger,previousOverflow,closeTimer,returnFocus
const isSupport=computed(()=>current.value?.type==='support')
const supportView=shallowRef('channels')
const isDrawer=computed(()=>current.value?.type==='menu')
// Generic amount form (overlay/AmountForm): only donate (charity) and convert (assets) open it.
const formType=computed(()=>['donate','convert'].includes(current.value?.type))
watch(modal,async(value)=>{if(!value)return;current.value=value;flow.value={};error.value='';done.value=false;closing.value=false;supportView.value=value.type==='support'&&value.data.supportView==='chat'?'chat':'channels';message.value=value.data.value||'';trigger=document.activeElement;returnFocus=value.data.returnFocus;previousOverflow=document.body.style.overflow;await nextTick();dialog.value.showModal();document.body.style.overflow='hidden';await nextTick();dialog.value.querySelector(value.type==='quant-fund-subscribe'?'[data-fund-initial-focus]':value.type==='strategy-subscribe'?'[data-strategy-initial-focus]':value.type==='earn-subscribe'?'[data-earn-initial-focus]':(value.data.modeSwitch||value.data.focusCancel)?'[data-cancel]':'[data-initial-focus]')?.focus()})
function openStrategySubscription(){const product=current.value.data;const from=route.fullPath;close(()=>{if(route.fullPath===from)openModal('strategy-subscribe',{key:'aiQuant.create.title',params:{name:product.name}},product)})}
function cleanup(){document.body.style.overflow=previousOverflow??'';if(trigger?.isConnected)trigger.focus();else returnFocus?.();clearTimeout(closeTimer)}
function close(afterClose){if(closing.value||!current.value)return;closing.value=true;closeTimer=setTimeout(()=>{dialog.value?.close();current.value=null;closeModal();closing.value=false;cleanup();if(typeof afterClose==='function')afterClose()},matchMedia('(prefers-reduced-motion: reduce)').matches?0:150)}
function cancel(e){e.preventDefault();if(busy.value)return;if(((flow.value.dirty&&!flow.value.done)||(isSupport.value&&message.value.trim()))&&!done.value){error.value="overlay.ui.unsavedContentUseCloseOrCancelToLeave";return}close()}
const {switchTo:switchLocale}=useLocaleSwitch()
async function changeLanguage(l){if(await switchLocale(l))close()}
// onConfirm may return a promise (an API call): the confirm action then shows busy, close paths are held, and a
// rejection keeps the dialog open with a toast (its message is a locale key).
async function accountAction(){if(done.value||closing.value||busy.value)return;error.value='';try{const pending=current.value.data.onConfirm?.();if(pending?.then){flow.value={...flow.value,busy:true};try{await pending}finally{flow.value={...flow.value,busy:false}}}done.value=true;close()}catch(cause){error.value=cause.message||'c2c.error.generic'}}
function switchFromMenu(mode){
  if(mode===session.mode||closing.value)return
  const from=route.fullPath
  close(()=>{if(route.fullPath===from)requestModeSwitch(mode)})
}
function navigate(to){close();router.push(path(to))}
function openSupportChat(){supportView.value='chat';error.value='';nextTick(()=>dialog.value?.querySelector('textarea')?.focus())}
// Footer primary action per flow type; null when the type has none.
const primary=computed(()=>{
 const c=current.value,f=flow.value;if(!c)return null
 const confirmable=['account-confirm','c2c-agreement']
 if(confirmable.includes(c.type))return {form:'account-action',label:c.data.confirmLabel||'earn.redeem.success.done',danger:c.data.destructive,disabled:done.value||closing.value}
 if(formType.value)return {form:'action-form',label:f.done?'assets.statusCompleted':'earn.redeem.success.done',disabled:f.done||!f.valid}
 if(c.type==='c2c-account')return {form:'c2c-account-form',label:c.data.account?'c2c.accounts.form.submitSave':'c2c.accounts.form.submitCreate',disabled:closing.value||!f.valid}
 const flows={'strategy-subscribe':['strategy-subscribe-form','aiQuant.create.submit',false],'quant-fund-subscribe':['quant-fund-subscribe-form','aiQuant.quantFund.subscribe.submit',false],'earn-subscribe':['earn-subscribe-form','earn.subscribe.submit',true],'earn-redeem':['earn-redeem-form',f.confirmLabel||'earn.redeem.submit',true]}
 const entry=flows[c.type];if(!entry||f.done)return null
 return {form:entry[0],label:entry[1],disabled:closing.value||!!f.busy||(entry[2]&&!f.valid)}
})
const cancelLabel=computed(()=>{const c=current.value;if(c?.type==='account-confirm'&&c.data.cancelLabel&&!done.value)return c.data.cancelLabel;return done.value||flow.value.done||c?.type==='c2c-detail'?'aiQuant.detail.close':'aiQuant.create.cancel'})
function keydown(e){if(e.key!=='Tab')return;const els=[...dialog.value.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select,textarea,[tabindex="0"]')].filter(x=>x.getClientRects().length);if(!els.length){e.preventDefault();return}const first=els[0],last=els[els.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
watch(()=>route.fullPath,()=>{if(current.value)close()})
onUnmounted(()=>{dialog.value?.close();cleanup()})
</script>
<template><dialog ref="dialog" class="nt-dialog" :class="{drawer:isDrawer,'support-drawer':isSupport,'strategy-detail-drawer':['strategy-detail','quant-fund-order'].includes(current?.type),'strategy-subscribe-dialog':current?.type==='strategy-subscribe','support-chat-open':isSupport&&supportView==='chat',closing,'mode-confirm':current?.data.modeSwitch,'earn-subscribe-dialog':['quant-fund-subscribe','earn-subscribe','earn-redeem','transfer','language','change-password'].includes(current?.type),'transfer-dialog':['transfer','language','change-password'].includes(current?.type)}" aria-labelledby="overlay-title" @cancel="cancel" @keydown="keydown"><template v-if="current"><header class="overlay-header"><div class="overlay-heading"><h2 id="overlay-title" tabindex="-1" data-initial-focus>{{ $t(isSupport?'customerService.title':current.title) }}</h2><p v-if="isSupport&&supportView==='chat'" class="chat-queue">{{ $t('customerService.status.pending') }}</p></div><button class="overlay-close" :aria-label="$t(&quot;aiQuant.detail.close&quot;)" :aria-disabled="busy||undefined" @click="!busy&&close()">×</button></header><div class="overlay-body">
<MenuDrawer v-if="isDrawer" @close="close" @navigate="navigate" @switch-mode="switchFromMenu" @language="changeLanguage"/>

<LanguageList v-else-if="current.type==='language'" @select="changeLanguage"/>
<template v-else-if="isSupport">
<SupportChannels v-if="supportView==='channels'" @chat="openSupportChat" @unavailable="error='customerService.channelsUnavailable'"/>
<SupportChat v-else @draft-change="message=$event"/>

</template>
<template v-else-if="current.type==='wallet'"><p class="notice">{{ $t("overlay.ui.thisLocalDemoDoesNotRequestWalletPermissionsOr") }}</p><button class="primary-button wide-button section-gap" @click="login();done=true" :disabled="done">{{ $t("overlay.ui.connectDemoWallet") }}</button><FeedbackToast v-if="done" type="success" :source="() => (done) ? ($t('overlay.ui.localDemoAccountConnected')) : ''"/></template>
<C2CAccountForm v-else-if="current.type==='c2c-account'" :account="current.data.account" @state="onFlowState" @saved="current.data.onSaved?.();close()"/>
<C2COrderDetail v-else-if="current.type==='c2c-detail'" :id="current.data.id"/>
<template v-else-if="current.type==='c2c-agreement'"><p class="muted">{{ $t('c2c.agreement.version',{version:'v1-draft'}) }}</p><p class="c2c-agreement-copy">{{ $t('c2c.agreement.body') }}</p><form id="account-action" @submit.prevent="accountAction"></form></template>
<template v-else-if="current.type==='account-confirm'"><p v-if="current.data.subtitle" class="muted confirm-subtitle">{{ current.data.subtitle }}</p><p v-if="current.data.danger" class="confirm-danger">{{ $t(current.data.danger) }}</p><p v-if="current.data.description" class="muted">{{ $t(current.data.description) }}</p><form id="account-action" @submit.prevent="accountAction"></form></template>
<VipTiers v-else-if="current.type==='vip'"/>
<EarnRedemption v-else-if="current.type==='earn-redeem'" :holding-id="current.data.holdingId" :closing="closing" @state="onFlowState" @close="close" @focus-cancel="nextTick(()=>dialog.querySelector('[data-cancel]')?.focus())"/>
<EarnHoldingDetails v-else-if="current.type==='earn-holding'" :holding-id="current.data.holdingId"/>
<StrategyDetails v-else-if="current.type==='strategy-detail'" :product="current.data"/>
<StrategySubscription v-else-if="current.type==='strategy-subscribe'" :product="current.data" :closing="closing" @state="onFlowState" @close="close"/>
<QuantFundOrderDetails v-else-if="current.type==='quant-fund-order'" :order="current.data" @close="close"/>
<QuantFundSubscription v-else-if="current.type==='quant-fund-subscribe'" :product="current.data" :closing="closing" @state="onFlowState" @close="close"/>
<EarnSubscription v-else-if="current.type==='earn-subscribe'" :product="current.data" :closing="closing" @state="onFlowState" @close="close"/>
<AssetTransfer v-else-if="current.type==='transfer'" @state="onFlowState" @close="close"/>
<PasswordForm v-else-if="current.type==='change-password'" in-dialog @state="onFlowState" @close="close"/>
<AmountForm v-else-if="formType" :kind="current.type" :data="current.data" @state="onFlowState"/>
<template v-else><p class="muted">{{ $t(current.data.description||"overlay.ui.localInterfaceDemoNotConnectedToTheOriginalAccount") }}</p></template>
<FeedbackToast v-if="error" id="action-error" type="error" :source="() => (error) ? ($t(error)) : ''"></FeedbackToast>
</div><footer v-if="!isDrawer&&!isSupport&&!['quant-fund-order','transfer','language','change-password'].includes(current.type)" class="overlay-footer"><button v-if="current.type!=='strategy-detail'" class="secondary-button" data-cancel :aria-disabled="busy||undefined" @click="!busy&&close()">{{ $t(cancelLabel) }}</button><button v-if="current.type==='strategy-detail'" class="strategy-cta" :disabled="closing" @click="openStrategySubscription">{{ $t('aiQuant.spotlight.subscribeNow') }}</button><button v-if="primary" :class="[primary.danger?'danger-button':'primary-button',{'is-busy':busy}]" :form="primary.form" type="submit" :disabled="primary.disabled&&!busy" :aria-disabled="busy||undefined" :aria-busy="busy||undefined"><Spinner v-if="busy"/>{{ $t(primary.label) }}</button></footer></template></dialog></template>
<style scoped>
.c2c-agreement-copy{white-space:pre-line;line-height:1.7;color:#b2b5bb;margin-top:16px}

.nt-dialog{margin:auto;padding:0;width:min(512px,calc(100vw - 32px));max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);border:1px solid #ffffff12;border-radius:var(--nt-radius-panel);background:#090d12;color:#fff;overflow:hidden;box-shadow:0 24px 100px #0008}.nt-dialog[open]{display:flex;flex-direction:column;animation:modal-in 200ms ease-out}.nt-dialog::backdrop{background:#0009;backdrop-filter:blur(7px);animation:fade-in 200ms ease-out}.nt-dialog.closing{animation:modal-out 150ms ease-in forwards}.nt-dialog.closing::backdrop{animation:fade-out 150ms ease-in forwards}.overlay-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 16px 8px 24px;flex-shrink:0}.overlay-header h2{font-size:1.125rem;line-height:1.5;overflow-wrap:anywhere}.overlay-close{width:44px;height:44px;border-radius:50%;font-size:1.625rem;flex-shrink:0;color:#fff9}.overlay-body{overflow-y:auto;overscroll-behavior:contain;padding:8px 24px 24px;min-height:0;scroll-padding:24px;padding-bottom:max(24px,env(safe-area-inset-bottom))}.overlay-footer{display:flex;justify-content:flex-end;gap:16px;padding:16px 24px;flex-shrink:0;border-top:1px solid #ffffff08;padding-bottom:max(16px,env(safe-area-inset-bottom))}.drawer{margin:0 auto 0 0;height:100vh;height:100dvh;max-height:100vh;max-height:100dvh;width:min(288px,calc(100vw - 48px));border-radius:0;background:#121415;padding-left:env(safe-area-inset-left)}.drawer[open]{animation:drawer-in 200ms ease-out}.drawer.closing{animation:drawer-out 150ms ease-in forwards}.drawer .overlay-header{padding:8px 8px 8px 20px;border-bottom:1px solid #ffffff05}.drawer .overlay-body{padding:8px 16px 24px}@keyframes modal-in{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}@keyframes modal-out{to{opacity:0;transform:scale(.96)}}@keyframes fade-in{from{opacity:0}to{opacity:1}}@keyframes fade-out{to{opacity:0}}@keyframes drawer-in{from{transform:translateX(-100%)}to{transform:translateX(0)}}@keyframes drawer-out{to{transform:translateX(-100%)}}@media(prefers-reduced-motion:reduce){.nt-dialog[open],.drawer[open]{animation:fade-in 40ms linear}.nt-dialog.closing,.drawer.closing{animation:fade-out 40ms linear}}
.mode-confirm .overlay-header{padding:12px 8px 0 24px}.mode-confirm .overlay-body{padding:0 24px 8px;line-height:1.6}.mode-confirm .overlay-footer{border-top:0;padding:8px 24px 24px}.mode-confirm .overlay-footer button{padding:9px 16px;border-radius:999px}.mode-confirm .secondary-button{background:#202326;border-color:transparent}.mode-confirm .overlay-header h2{font-size:1.125rem}

.support-drawer{position:fixed;inset:0 0 0 auto;margin:0;width:min(448px,100vw);max-width:100vw;height:100vh;height:100dvh;max-height:100vh;max-height:100dvh;border-radius:0;background:var(--nt-bg);padding-right:env(safe-area-inset-right);padding-left:env(safe-area-inset-left)}
.support-drawer[open]{animation:support-in 200ms ease-out}.support-drawer.closing{animation:support-out 150ms ease-in forwards}.support-drawer::backdrop{backdrop-filter:none;background:#0008}
.support-drawer .overlay-header{min-height:52px;padding:4px 8px 4px 16px;padding-top:max(4px,env(safe-area-inset-top));border-bottom:1px solid #ffffff0c}.support-drawer .overlay-header h2{font-size:16px}.support-drawer .overlay-close{font-size:25px}.support-drawer .overlay-body{padding:20px 16px max(20px,env(safe-area-inset-bottom));flex:1}
@keyframes support-in{from{transform:translateX(100%)}to{transform:translateX(0)}}@keyframes support-out{to{transform:translateX(100%)}}
@media(prefers-reduced-motion:reduce){.support-drawer[open]{animation:fade-in 40ms linear}.support-drawer.closing{animation:fade-out 40ms linear}}

.support-chat-open .overlay-body{display:flex;flex-direction:column;padding:0;overflow:hidden}.support-chat-open .overlay-header{align-items:flex-start;padding-top:max(8px,env(safe-area-inset-top));padding-bottom:12px}.support-chat-open .overlay-heading{padding-top:6px}.chat-queue{font-size:12px;line-height:18px;color:#ffffff70;margin:8px 0 0}.overlay-heading{min-width:0}
.earn-subscribe-dialog{border-radius:16px;padding-top:0}.earn-subscribe-dialog .overlay-header{position:relative;padding:24px 60px 16px 24px}.nt-dialog.nt-dialog.earn-subscribe-dialog .overlay-header h2{line-height:18px}.earn-subscribe-dialog .overlay-close{position:absolute;right:2px;top:2px}.earn-subscribe-dialog .overlay-body{padding-top:0;padding-bottom:0}.earn-subscribe-dialog .overlay-footer{padding:16px 24px 24px;border-top:0;gap:16px}.earn-subscribe-dialog .overlay-footer button{border-radius:999px;padding:7px 16px;min-height:36px}.earn-subscribe-dialog .overlay-close{font-size:22px}.earn-subscribe-dialog .overlay-header h2{font-family:inherit}.earn-subscribe-dialog .overlay-body{scrollbar-gutter:auto}
@media(pointer:coarse){.earn-subscribe-dialog .overlay-footer button{min-height:44px}}
.confirm-subtitle{margin-top:-4px}.confirm-danger{margin:12px 0 0;padding:10px 12px;border:1px solid color-mix(in srgb,#f46 30%,transparent);border-radius:4px;background:color-mix(in srgb,#f46 10%,transparent);color:#f46;font-size:14px;line-height:1.6}.danger-button{padding:10px 20px;border-radius:var(--nt-radius-panel);background:#f46;color:#fff;font-weight:600}.danger-button:hover{background:#ff5f7c;color:#fff}.danger-button:focus-visible{outline:none;text-decoration:underline}

.overlay-footer .is-busy{cursor:progress}.overlay-close[aria-disabled=true],.overlay-footer .secondary-button[aria-disabled=true]{opacity:.5;cursor:not-allowed}

.nt-dialog.nt-dialog.transfer-dialog{width:min(440px,calc(100vw - 32px))}.transfer-dialog .overlay-body{padding-bottom:24px}.nt-dialog.nt-dialog.transfer-dialog .overlay-header h2{font-size:18px;font-weight:600}.nt-dialog.nt-dialog.transfer-dialog .overlay-header{padding:22px 60px 18px 24px}.nt-dialog.nt-dialog.transfer-dialog .overlay-header h2{line-height:28px}.nt-dialog.nt-dialog.transfer-dialog .overlay-close{top:14px;right:10px;display:grid;place-items:center}
</style>
