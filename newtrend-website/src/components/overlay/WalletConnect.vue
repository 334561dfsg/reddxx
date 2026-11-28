<script setup>
import {ref} from 'vue'
import {message} from 'ant-design-vue'
import {t} from '../../i18n'
import {path} from '../../data'
import {login} from '../../session'
import {WALLETS, walletLink} from '../../utils/walletLinks.js'
// Connect-wallet dialog body: a radio list of wallet apps (check mark on the chosen one), 確認 opens the site in
// that wallet's DApp browser, 複製 copies the site link; the local demo connection stays below (user request,
// 2026-11-28). Native radios keep arrow-key selection; the focused row gets a background wash, no ring.
const emit = defineEmits(['close'])
const chosen = ref(WALLETS[0].id)
const siteUrl = () => location.origin + path('/')

function openWallet() {
  const link = walletLink(chosen.value, siteUrl())
  if (link.startsWith('https://')) window.open(link, '_blank', 'noopener')
  else location.href = link
}
async function copyLink() {
  try { await navigator.clipboard.writeText(siteUrl()); message.success(t('overlay.wallet.linkCopied')) }
  catch { message.error(t('common.copyFailed')) }
}
function connectDemo() {
  login()
  emit('close', () => message.success(t('overlay.ui.localDemoAccountConnected')))
}
</script>
<template><div class="wallet-connect">
 <fieldset class="wallet-options"><legend class="wallet-legend">{{ t('overlay.wallet.choose') }}</legend>
  <label v-for="wallet in WALLETS" :key="wallet.id" class="wallet-option" :class="{chosen: chosen === wallet.id}">
   <input v-model="chosen" type="radio" name="wallet-app" :value="wallet.id"/>
   <svg class="wallet-logo" viewBox="0 0 40 40" aria-hidden="true">
    <template v-if="wallet.id === 'coinbase'"><circle cx="20" cy="20" r="20" fill="#0052ff"/><circle cx="20" cy="20" r="17" fill="#fff"/><circle cx="20" cy="20" r="14" fill="#0052ff"/><path d="M26 15.5a8 8 0 1 0 0 9" fill="none" stroke="#fff" stroke-width="5"/></template>
    <template v-else-if="wallet.id === 'trust'"><path d="M20 4 33 9v11c0 8-6 13.5-13 16C13 33.5 7 28 7 20V9Z" fill="#0500ff"/><path d="M20 4 33 9v11c0 8-6 13.5-13 16Z" fill="#48ff91" opacity=".85"/></template>
    <template v-else-if="wallet.id === 'imtoken'"><rect width="40" height="40" rx="8" fill="#11c4d1"/><rect width="40" height="40" rx="8" fill="#0062ad" opacity=".35"/><path d="M9 19c2 8 13 11 20 5 3-3 3-9 1-11-3 5-8 6-11 5 2-1 2-4 0-5s-5 0-6 2" fill="#fff"/></template>
    <template v-else-if="wallet.id === 'tokenpocket'"><rect width="40" height="40" rx="6" fill="#2980fe"/><path d="M8 11h13v6h-4v13h-5V17H8Zm15 0h4a7 7 0 0 1 0 14h-4Z" fill="#fff"/></template>
    <template v-else><path d="M5 6l13 9-2.5-6Zm30 0-13 9 2.5-6Z" fill="#e2761b"/><path d="M7 7 5 17l3 9 7 3h10l7-3 3-9-2-10-10 8h-6Z" fill="#f6851b"/><path d="M15 29h10l-1.5 4h-7Z" fill="#c0ad9e"/><path d="M13 21l3 2-3 1Zm14 0-3 2 3 1Z" fill="#233447"/><path d="M17 26h6l-1 3h-4Z" fill="#161616"/></template>
   </svg>
   <span class="wallet-name">{{ wallet.name }}</span>
   <span class="wallet-check" aria-hidden="true"><svg v-if="chosen === wallet.id" viewBox="0 0 24 24"><path d="m6 12 4 4 8-8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
  </label>
 </fieldset>
 <div class="wallet-actions">
  <button type="button" class="primary-button wide-button" data-wallet-initial-focus @click="openWallet">{{ t('overlay.wallet.confirm') }}</button>
  <button type="button" class="primary-button wide-button" @click="copyLink">{{ t('overlay.wallet.copy') }}</button>
 </div>
 <div class="divider"><span>{{ t('auth.or') }}</span></div>
 <button type="button" class="secondary-button wide-button" @click="connectDemo">{{ t('overlay.ui.connectDemoWallet') }}</button>
 <p class="muted wallet-hint">{{ t('overlay.ui.thisLocalDemoDoesNotRequestWalletPermissionsOr') }}</p>
</div></template>
<style>
.wallet-connect{display:grid}
.wallet-options{border:0;margin:0;padding:0;min-width:0}
.wallet-legend{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.wallet-option{display:flex;align-items:center;gap:14px;padding:14px 8px;min-height:60px;border-bottom:1px solid #ffffff0d;border-radius:var(--nt-radius-control);cursor:pointer}
.wallet-option input{position:absolute;opacity:0;pointer-events:none}
.wallet-option:hover,.wallet-option:has(input:focus-visible){background:#ffffff08}
.wallet-option:has(input:focus-visible) .wallet-name{text-decoration:underline;text-underline-offset:4px}
.wallet-logo{width:32px;height:32px;flex-shrink:0}
.wallet-name{flex:1;min-width:0;font-size:var(--nt-text-body,14px);overflow-wrap:anywhere}
.wallet-option.chosen .wallet-name{font-weight:600}
.wallet-check{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;flex-shrink:0}
.wallet-option.chosen .wallet-check{background:var(--nt-accent);color:#081000}
.wallet-check svg{width:16px;height:16px}
.wallet-actions{display:grid;gap:12px;margin-top:20px}
.wallet-connect .divider{margin:24px 0 20px}
.wallet-connect .divider span{background:#090d12}
.wallet-hint{margin-top:10px;font-size:var(--nt-text-caption,12px);line-height:18px;text-align:center}
@media(forced-colors:active){.wallet-option:has(input:focus-visible){outline:2px solid CanvasText}}
</style>
