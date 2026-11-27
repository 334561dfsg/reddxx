<script setup>
import {kycStatus} from '../utils/accountBadge.js'
import {useCopyFeedback} from '../composables/useCopyFeedback.js'
import {isDemo,MODES} from '../utils/accountMode.js'
import {useAmountMask} from '../composables/useAmountMask.js'
import {money} from '../utils/format.js'
import Skeleton from './ui/Skeleton.vue'
import {getAssetsOverview} from '../api/wallet.js'
import {useRequest} from '../composables/useRequest.js'
import { computed, shallowRef, watch, onMounted,onUnmounted,nextTick } from 'vue'
import { useRoute,useRouter } from 'vue-router'
import Icon from './Icon.vue'
import {navGroups,path} from '../data'
import {availableInMode} from '../utils/demoAccess.js'
import {session,openModal,logout,requestModeSwitch} from '../session'
import {locale,languages,t} from '../i18n'
import {useLocaleSwitch} from '../composables/useLocaleSwitch'
import {account,DEMO_UID} from '../account'
import {getUnreadCount} from '../api/profile.js'
import FeedbackToast from '../platform/FeedbackToast.js'
import {openClearCache} from '../utils/clearCache.js'
const route=useRoute(),router=useRouter(),expanded=shallowRef(''),nav=shallowRef(null)
let hoverCloseTimer
function cancelHoverClose(){clearTimeout(hoverCloseTimer)}
function enterMenu(event,label){
 if(event.pointerType!=='mouse')return
 cancelHoverClose()
 expanded.value=label
}
function leaveMenu(event,label){
 if(event.pointerType!=='mouse')return
 cancelHoverClose()
 const group=event.currentTarget
 hoverCloseTimer=setTimeout(()=>{
  if(expanded.value===label&&!group.querySelector('.nav-popover')?.contains(document.activeElement))expanded.value=''
 },120)
}
function toggleMenu(event,label){
 cancelHoverClose()
 // Mouse clicks keep an already hovered menu open; keyboard and touch toggle it.
 if(event.detail>0&&event.pointerType==='mouse'&&expanded.value===label)return
 expanded.value=expanded.value===label?'':label
}
watch(()=>route.fullPath,()=>{cancelHoverClose();expanded.value=''})
function dismiss(e){if(!nav.value?.contains(e.target))expanded.value=''}
onMounted(()=>document.addEventListener('pointerdown',dismiss));onUnmounted(()=>{cancelHoverClose();document.removeEventListener('pointerdown',dismiss)})
// English names stay fixed so every option remains identifiable regardless of the active locale.
const languageSubtitles={'en-US':'English','zh-TW':'Traditional Chinese','fr-FR':'French','de-DE':'German','ja-JP':'Japanese','ko-KR':'Korean'}
const languageTrigger=shallowRef(null)
const {busy:languageBusy,switchTo:switchLocale}=useLocaleSwitch()
async function selectLanguage(code){
 if(await switchLocale(code)){expanded.value='';await nextTick();languageTrigger.value?.focus()}
}
// Header asset/profile menus mirror the reference: hover or keyboard focus reveals them, a pointer click follows the link.
// Bell badge: unread count from the profile API; the notifications page refreshes it via the 'notifications' tag.
const unread=useRequest(()=>session.loggedIn?getUnreadCount():Promise.resolve(0),{key:()=>session.loggedIn,tags:['notifications']})
const {hidden:balanceHidden,toggle:toggleBalance,masked:maskBalance}=useAmountMask()
// Same total as the Assets page (mock ledger + holdings for the current mode).
// Asset menu total: loaded each time the menu opens (and on mode change while open); a skeleton until then.
const assetsMenuOpen=computed(()=>expanded.value==='assets'&&session.loggedIn)
// Profile menu after the GMXX account menu (user reference, 2026-11-26): per-account balances of the current mode,
// loaded when the menu opens and masked with the assets menu's eye toggle.
const profileMenuOpen=computed(()=>expanded.value==='profile'&&session.loggedIn)
const ACCOUNT_KEYS=['assets.tabs.funding','assets.tabs.trading','assets.distribution.earnAccount','assets.distribution.quantFundAccount']
const menuAccounts=useRequest(()=>profileMenuOpen.value?getAssetsOverview(session.mode).then(o=>o.accounts):Promise.resolve(null),{key:()=>profileMenuOpen.value+'|'+session.mode,tags:['wallet']})
const menuTotal=useRequest(()=>assetsMenuOpen.value?getAssetsOverview(session.mode).then(o=>o.total):Promise.resolve(null),{key:()=>assetsMenuOpen.value+'|'+session.mode})
const formatBalance=money
const kycBadge=()=>{const k=kycStatus(account);return [k.key,k.tone]}
function openOnKeyboardFocus(event,label){if(event.target.matches?.(':focus-visible')&&event.target===event.currentTarget.firstElementChild){cancelHoverClose();expanded.value=label}}
const {feedback,copy}=useCopyFeedback()
const copyUid=()=>copy(DEMO_UID)
function signout(){logout();expanded.value='';router.push(path('/'))}
function clearCache(){expanded.value='';openClearCache()}
// 劃轉 opens the transfer dialog in place (user decision, 2026-11-26) instead of navigating to the assets page.
function openTransfer(){expanded.value='';openModal('transfer','assets.transfer')}
</script>
<template>
<a class="skip-link" href="#main-content">{{ $t("header.ui.skipToMainContent") }}</a>
<header class="site-header" ref="nav" @keydown.esc="expanded=''">
 <button class="icon-button mobile-menu" :aria-label="$t(&quot;common.menu&quot;)" aria-haspopup="dialog" @click="openModal('menu','NewQuantCapital')"><Icon name="menu"/></button>
 <RouterLink class="brand" :to="path('/')"><img src="/NewQuantCapital/assets/newquantcapital-mark.svg" :alt="$t(&quot;NewQuantCapital&quot;)"/>{{ $t("NewQuantCapital") }}</RouterLink>
 <nav class="desktop-navigation" :aria-label="$t(&quot;header.ui.mainNavigation&quot;)"><RouterLink :to="path('/')">{{ $t("common.home") }}</RouterLink>
 <div v-for="group in navGroups" :key="group.label" class="nav-group" @pointerenter="enterMenu($event,group.label)" @pointerleave="leaveMenu($event,group.label)" @focusout="e=>{if(!e.currentTarget.contains(e.relatedTarget))expanded=''}">
  <button :aria-expanded="expanded===group.label" :aria-controls="'nav-'+group.label" @click="toggleMenu($event,group.label)">{{ $t(group.label) }}<Icon name="chevron-down"/></button>
  <div v-if="expanded===group.label" :id="'nav-'+group.label" class="nav-popover"><RouterLink v-for="item in group.items.filter(i=>availableInMode(i[2]))" :key="item[0]" :to="path(item[2])"><Icon :name="item[3]" green/><span>{{ $t(item[0]) }}<small>{{ $t(item[1]) }}</small></span></RouterLink></div>
 </div>
 <RouterLink :to="path('/news')">{{ $t("common.news") }}</RouterLink><RouterLink :to="path('/charity')">{{ $t("common.charity") }}</RouterLink></nav>
 <div class="account-actions" v-if="session.loggedIn"><div class="mode-toggle"><button v-for="mode in MODES" :key="mode" :aria-pressed="session.mode===mode" :class="{active:session.mode===mode}" @click="requestModeSwitch(mode)">{{ $t(mode) }}</button></div><div class="nav-group header-menu" @pointerenter="enterMenu($event,'assets')" @pointerleave="leaveMenu($event,'assets')" @focusin="openOnKeyboardFocus($event,'assets')" @focusout="e=>{if(!e.currentTarget.contains(e.relatedTarget))expanded=''}"><RouterLink :to="path('/assets')" class="asset-link" :aria-expanded="expanded==='assets'" aria-controls="nav-assets"><Icon name="wallet"/>{{ $t("assets.pageTitle") }}</RouterLink><div v-if="expanded==='assets'" id="nav-assets" class="nav-popover right header-dropdown assets-dropdown"><div class="assets-summary"><div class="assets-summary-label">{{ $t("common.assetsMenu.total") }}<button type="button" :aria-label="$t('common.assetsMenu.hideBalance')" :aria-pressed="balanceHidden" @click="toggleBalance"><Icon :name="balanceHidden?'eye-off':'eye'"/></button></div><div class="assets-summary-value"><strong><template v-if="menuTotal.data.value!==null">{{ maskBalance(formatBalance(menuTotal.data.value)) }}</template><Skeleton v-else inline width="120px"/></strong><span>USDT</span></div></div><template v-if="!isDemo(session.mode)"><div class="menu-divider" role="separator"></div><div class="assets-quick-actions"><RouterLink :to="path('/deposit')"><Icon name="arrow-down-to-line" green/>{{ $t("common.assetsMenu.deposit") }}</RouterLink><button type="button" aria-haspopup="dialog" @click="openTransfer"><Icon name="arrow-left-right" green/>{{ $t("common.assetsMenu.transfer") }}</button><RouterLink :to="path('/withdraw')"><Icon name="arrow-up-from-line" green/>{{ $t("common.assetsMenu.withdraw") }}</RouterLink></div></template><div class="menu-divider" role="separator"></div><RouterLink :to="path('/assets')" class="menu-row view-all"><span>{{ $t("common.assetsMenu.viewAll") }}</span><Icon name="chevron-right"/></RouterLink></div></div><div class="nav-group header-menu" @pointerenter="enterMenu($event,'profile')" @pointerleave="leaveMenu($event,'profile')" @focusin="openOnKeyboardFocus($event,'profile')" @focusout="e=>{if(!e.currentTarget.contains(e.relatedTarget))expanded=''}"><RouterLink :to="path('/profile')" class="profile-trigger" :aria-label="$t(&quot;common.profile&quot;)" :aria-expanded="expanded==='profile'" aria-controls="nav-profile"><span class="profile-avatar"><Icon name="user"/></span></RouterLink><div v-if="expanded==='profile'" id="nav-profile" class="nav-popover right header-dropdown profile-dropdown"><div class="profile-summary"><span class="profile-avatar large"><Icon name="user"/></span><div><div class="profile-name">{{ account.name||$t('common.unnamed') }}</div><div class="profile-badges"><span class="menu-badge" :class="kycBadge()[1]">{{ $t(kycBadge()[0]) }}</span><span class="menu-badge vip"><Icon name="crown"/>{{ $t('common.vipBadge',{tier:0}) }}</span></div><div class="profile-uid"><span>UID: {{ DEMO_UID }}</span><button type="button" :aria-label="$t('common.copy')" @click="copyUid"><Icon name="copy"/></button></div></div></div><div class="profile-credit">{{ $t('profile.center.overview.credit',{score:100}) }}</div><div class="menu-divider" role="separator"></div><dl class="profile-accounts"><div v-for="key in ACCOUNT_KEYS" :key="key"><dt>{{ $t(key) }}</dt><dd><template v-if="menuAccounts.data.value">{{ maskBalance(formatBalance(menuAccounts.data.value[key]||0)) }}</template><Skeleton v-else inline width="72px"/></dd></div></dl><div class="menu-divider" role="separator"></div><div class="menu-list"><RouterLink :to="path('/profile')" class="menu-row">{{ $t("profile.center.rows.backToProfile") }}</RouterLink><RouterLink :to="{path:path('/profile'),hash:'#security'}" class="menu-row">{{ $t("profile.center.security.title") }}</RouterLink><RouterLink :to="path('/kyc')" class="menu-row">{{ $t("profile.center.nav.identity") }}</RouterLink><button type="button" class="menu-row" aria-haspopup="dialog" @click="clearCache">{{ $t("profile.center.nav.clearCache") }}</button></div><div class="menu-divider" role="separator"></div><button type="button" class="menu-row logout" @click="signout">{{ $t("profile.logout") }}</button></div><FeedbackToast v-if="feedback" :type="feedback.type" :source="() => feedback ? $t(feedback.key) : ''"/></div></div>
 <div v-else class="account-actions"><button class="wallet-button" @click="openModal('wallet',&quot;common.connectWallet&quot;)"><Icon name="wallet"/>{{ $t("common.connectWallet") }}</button><RouterLink :to="path('/login')">{{ $t("auth.login") }}</RouterLink><RouterLink class="pill primary" :to="path('/register')">{{ $t("auth.register") }}</RouterLink></div>
 <div class="header-tools"><div class="nav-group language-menu" @pointerenter="enterMenu($event,'language')" @pointerleave="leaveMenu($event,'language')" @focusout="e=>{if(!e.currentTarget.contains(e.relatedTarget))expanded=''}"><button ref="languageTrigger" class="language-trigger" :aria-label="$t(&quot;common.language&quot;)" :aria-expanded="expanded==='language'" aria-controls="nav-language" @click="toggleMenu($event,'language')"><Icon name="globe"/><span class="language-chevron" aria-hidden="true"><Icon name="chevron-down"/></span></button><div v-if="expanded==='language'" id="nav-language" class="nav-popover right language-popover" :aria-busy="languageBusy"><button v-for="[code,name] in languages" :key="code" :lang="code" :aria-current="locale===code?'true':undefined" :class="{current:locale===code}" :disabled="languageBusy" @click="selectLanguage(code)"><span><span>{{ name }}</span><small lang="en">{{ languageSubtitles[code] }}</small></span><span class="language-check" :class="{hidden:locale!==code}"><Icon name="check" green/></span></button></div></div><button v-if="session.loggedIn" class="icon-button" :aria-label="$t(&quot;customerService.title&quot;)" @click="openModal('support',&quot;common.onlineSupport&quot;)"><Icon name="headset"/></button><RouterLink v-if="session.loggedIn" class="icon-button" :to="path('/notifications')" :aria-label="$t('profile.center.notifications.headerLabel',{count:unread.data.value||0})"><Icon name="bell"/><span v-if="unread.data.value" class="badge">{{ unread.data.value>99?'99+':unread.data.value }}</span></RouterLink></div>
 <div v-if="session.loggedIn" class="mobile-account mobile-tools"><button class="icon-button" :aria-label="$t(&quot;customerService.title&quot;)" @click="openModal('support',&quot;common.onlineSupport&quot;)"><Icon name="headset"/></button><RouterLink class="icon-button" :to="path('/notifications')" :aria-label="$t('profile.center.notifications.headerLabel',{count:unread.data.value||0})"><Icon name="bell"/><span v-if="unread.data.value" class="badge">{{ unread.data.value>99?'99+':unread.data.value }}</span></RouterLink><RouterLink class="icon-button profile-circle" :aria-label="$t(&quot;common.profile&quot;)" :to="path('/profile')"><Icon name="user"/></RouterLink></div><RouterLink v-else class="mobile-account pill primary" :to="path('/login')">{{ $t("auth.login") }}</RouterLink>
</header>
</template>
