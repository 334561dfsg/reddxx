<script setup>
import NavigationLink from './NavigationLink.vue'
import { shallowRef, watch, onMounted,onUnmounted } from 'vue'
import { useRoute,useRouter } from 'vue-router'
import Icon from './Icon.vue'
import {navGroups,path} from '../data'
import {session,openModal,logout,requestModeSwitch} from '../session'
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
function signout(){logout();expanded.value='';router.push(path('/'))}
</script>
<template>
<a class="skip-link" href="#main-content">{{ $t("header.ui.skipToMainContent") }}</a>
<header class="site-header" ref="nav" @keydown.esc="expanded=''">
 <button class="icon-button mobile-menu" :aria-label="$t(&quot;common.menu&quot;)" aria-haspopup="dialog" @click="openModal('menu','NewQuantCapital')"><Icon name="menu"/></button>
 <NavigationLink class="brand" :to="path('/')"><img src="/trade-v2/assets/newquantcapital-mark.svg" :alt="$t(&quot;NewQuantCapital&quot;)"/>{{ $t("NewQuantCapital") }}</NavigationLink>
 <nav class="desktop-navigation" :aria-label="$t(&quot;header.ui.mainNavigation&quot;)"><NavigationLink :to="path('/')">{{ $t("common.home") }}</NavigationLink>
 <div v-for="group in navGroups" :key="group.label" class="nav-group" @pointerenter="enterMenu($event,group.label)" @pointerleave="leaveMenu($event,group.label)" @focusout="e=>{if(!e.currentTarget.contains(e.relatedTarget))expanded=''}">
  <button :aria-expanded="expanded===group.label" :aria-controls="'nav-'+group.label" @click="toggleMenu($event,group.label)">{{ $t(group.label) }}<Icon name="chevron-down"/></button>
  <div v-if="expanded===group.label" :id="'nav-'+group.label" class="nav-popover"><NavigationLink v-if="group.path" :to="path(group.path)" class="nav-overview">{{ $t("aiQuant.landing.eyebrow") }}</NavigationLink><NavigationLink v-for="item in group.items" :key="item[0]" :to="path(item[2])"><Icon :name="item[3]" green/><span>{{ $t(item[0]) }}<small>{{ $t(item[1]) }}</small></span></NavigationLink></div>
 </div>
 <NavigationLink :to="path('/news')">{{ $t("common.news") }}</NavigationLink><NavigationLink :to="path('/charity')">{{ $t("common.charity") }}</NavigationLink></nav>
 <div class="account-actions" v-if="session.loggedIn"><div class="mode-toggle"><button v-for="mode in [&quot;common.demo.real&quot;,&quot;common.demo.demo&quot;]" :key="mode" :aria-pressed="session.mode===mode" :class="{active:session.mode===mode}" @click="requestModeSwitch(mode)">{{ $t(mode) }}</button></div><NavigationLink :to="path('/assets')" class="asset-link"><Icon name="wallet"/>{{ $t("assets.pageTitle") }}</NavigationLink><div class="nav-group"><button class="icon-button" :aria-label="$t(&quot;common.profile&quot;)" :aria-expanded="expanded==='profile'" @click="expanded=expanded==='profile'?'':'profile'"><Icon name="user"/></button><div v-if="expanded==='profile'" class="nav-popover right"><NavigationLink :to="path('/profile')">{{ $t("common.profile") }}</NavigationLink><NavigationLink :to="path('/referrals')">{{ $t("promotion.cta.invite") }}</NavigationLink><NavigationLink :to="path('/promotions/tasks')">{{ $t("promotion.nav.menuEntry") }}</NavigationLink><NavigationLink :to="path('/kyc')">{{ $t("common.kyc") }}</NavigationLink><NavigationLink :to="path('/joint-account')">{{ $t("jointAccount.nav.menuEntry") }}</NavigationLink><NavigationLink :to="path('/assets')">{{ $t("header.ui.assetsOverview") }}</NavigationLink><button @click="signout">{{ $t("profile.logout") }}</button></div></div></div>
 <div v-else class="account-actions"><button class="wallet-button" @click="openModal('wallet',&quot;common.connectWallet&quot;)"><Icon name="wallet"/>{{ $t("common.connectWallet") }}</button><NavigationLink :to="path('/login')">{{ $t("auth.login") }}</NavigationLink><NavigationLink class="pill primary" :to="path('/register')">{{ $t("auth.register") }}</NavigationLink></div>
 <div class="header-tools"><button class="icon-button" :aria-label="$t(&quot;common.language&quot;)" @click="openModal('language',&quot;common.language&quot;)"><Icon name="globe"/></button><button v-if="session.loggedIn" class="icon-button" :aria-label="$t(&quot;customerService.title&quot;)" @click="openModal('support',&quot;common.onlineSupport&quot;)"><Icon name="headset"/></button><button v-if="session.loggedIn" class="icon-button" :aria-label="$t(&quot;common.message&quot;)" @click="openModal('messages',&quot;common.message&quot;)"><Icon name="bell"/><span class="badge">3</span></button></div>
 <div v-if="session.loggedIn" class="mobile-account mobile-tools"><button class="icon-button" :aria-label="$t(&quot;customerService.title&quot;)" @click="openModal('support',&quot;common.onlineSupport&quot;)"><Icon name="headset"/></button><button class="icon-button" :aria-label="$t(&quot;common.message&quot;)" @click="openModal('messages',&quot;common.message&quot;)"><Icon name="bell"/><span class="badge">3</span></button><NavigationLink class="icon-button profile-circle" :aria-label="$t(&quot;common.profile&quot;)" :to="path('/profile')"><Icon name="user"/></NavigationLink></div><NavigationLink v-else class="mobile-account pill primary" :to="path('/login')">{{ $t("auth.login") }}</NavigationLink>
</header>
</template>
