<script setup>
import { shallowRef, watch, onMounted,onUnmounted } from 'vue'
import { useRoute,useRouter } from 'vue-router'
import Icon from './Icon.vue'
import {navGroups,path} from '../data'
import {session,openModal,logout,requestModeSwitch} from '../session'
const route=useRoute(),router=useRouter(),expanded=shallowRef(''),nav=shallowRef(null)
watch(()=>route.fullPath,()=>expanded.value='')
function dismiss(e){if(!nav.value?.contains(e.target))expanded.value=''}
onMounted(()=>document.addEventListener('pointerdown',dismiss));onUnmounted(()=>document.removeEventListener('pointerdown',dismiss))
function signout(){logout();expanded.value='';router.push(path('/'))}
</script>
<template>
<a class="skip-link" href="#main-content">{{ $t("header.ui.skipToMainContent") }}</a>
<header class="site-header" ref="nav" @keydown.esc="expanded=''">
 <button class="icon-button mobile-menu" :aria-label="$t(&quot;common.menu&quot;)" aria-haspopup="dialog" @click="openModal('menu','NewQuantCapital')"><Icon name="menu"/></button>
 <RouterLink class="brand" :to="path('/')"><img src="/newtrend/assets/newquantcapital-mark.svg" :alt="$t(&quot;NewQuantCapital&quot;)"/>{{ $t("NewQuantCapital") }}</RouterLink>
 <nav class="desktop-navigation" :aria-label="$t(&quot;header.ui.mainNavigation&quot;)"><RouterLink :to="path('/')">{{ $t("common.home") }}</RouterLink>
 <div v-for="group in navGroups" :key="group.label" class="nav-group" @focusout="e=>{if(!e.currentTarget.contains(e.relatedTarget))expanded=''}">
  <button :aria-expanded="expanded===group.label" :aria-controls="'nav-'+group.label" @click="expanded=expanded===group.label?'':group.label">{{ $t(group.label) }}<Icon name="chevron-down"/></button>
  <div v-if="expanded===group.label" :id="'nav-'+group.label" class="nav-popover"><RouterLink v-if="group.path" :to="path(group.path)" class="nav-overview">{{ $t("aiQuant.landing.eyebrow") }}</RouterLink><RouterLink v-for="item in group.items" :key="item[0]" :to="path(item[2])"><Icon :name="item[3]" green/><span>{{ $t(item[0]) }}<small>{{ $t(item[1]) }}</small></span></RouterLink></div>
 </div>
 <RouterLink :to="path('/news')">{{ $t("common.news") }}</RouterLink><RouterLink :to="path('/charity')">{{ $t("common.charity") }}</RouterLink></nav>
 <div class="account-actions" v-if="session.loggedIn"><div class="mode-toggle"><button v-for="mode in [&quot;common.demo.real&quot;,&quot;common.demo.demo&quot;]" :key="mode" :aria-pressed="session.mode===mode" :class="{active:session.mode===mode}" @click="requestModeSwitch(mode)">{{ $t(mode) }}</button></div><RouterLink :to="path('/assets')" class="asset-link"><Icon name="wallet"/>{{ $t("assets.pageTitle") }}</RouterLink><div class="nav-group"><button class="icon-button" :aria-label="$t(&quot;common.profile&quot;)" :aria-expanded="expanded==='profile'" @click="expanded=expanded==='profile'?'':'profile'"><Icon name="user"/></button><div v-if="expanded==='profile'" class="nav-popover right"><RouterLink :to="path('/profile')">{{ $t("common.profile") }}</RouterLink><RouterLink :to="path('/referrals')">{{ $t("promotion.cta.invite") }}</RouterLink><RouterLink :to="path('/promotions/tasks')">{{ $t("promotion.nav.menuEntry") }}</RouterLink><RouterLink :to="path('/kyc')">{{ $t("common.kyc") }}</RouterLink><RouterLink :to="path('/joint-account')">{{ $t("jointAccount.nav.menuEntry") }}</RouterLink><RouterLink :to="path('/assets')">{{ $t("header.ui.assetsOverview") }}</RouterLink><button @click="signout">{{ $t("profile.logout") }}</button></div></div></div>
 <div v-else class="account-actions"><button class="wallet-button" @click="openModal('wallet',&quot;common.connectWallet&quot;)"><Icon name="wallet"/>{{ $t("common.connectWallet") }}</button><RouterLink :to="path('/login')">{{ $t("auth.login") }}</RouterLink><RouterLink class="pill primary" :to="path('/register')">{{ $t("auth.register") }}</RouterLink></div>
 <div class="header-tools"><button class="icon-button" :aria-label="$t(&quot;common.language&quot;)" @click="openModal('language',&quot;common.language&quot;)"><Icon name="globe"/></button><button v-if="session.loggedIn" class="icon-button" :aria-label="$t(&quot;customerService.title&quot;)" @click="openModal('support',&quot;common.onlineSupport&quot;)"><Icon name="headset"/></button><button v-if="session.loggedIn" class="icon-button" :aria-label="$t(&quot;common.message&quot;)" @click="openModal('messages',&quot;common.message&quot;)"><Icon name="bell"/><span class="badge">3</span></button></div>
 <div v-if="session.loggedIn" class="mobile-account mobile-tools"><button class="icon-button" :aria-label="$t(&quot;customerService.title&quot;)" @click="openModal('support',&quot;common.onlineSupport&quot;)"><Icon name="headset"/></button><button class="icon-button" :aria-label="$t(&quot;common.message&quot;)" @click="openModal('messages',&quot;common.message&quot;)"><Icon name="bell"/><span class="badge">3</span></button><RouterLink class="icon-button profile-circle" :aria-label="$t(&quot;common.profile&quot;)" :to="path('/profile')"><Icon name="user"/></RouterLink></div><RouterLink v-else class="mobile-account pill primary" :to="path('/login')">{{ $t("auth.login") }}</RouterLink>
</header>
</template>
