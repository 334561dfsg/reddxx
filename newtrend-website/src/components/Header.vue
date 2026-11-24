<script setup>
import { shallowRef, watch, onMounted,onUnmounted } from 'vue'
import { useRoute,useRouter } from 'vue-router'
import Icon from './Icon.vue'
import {navGroups,path} from '../data'
import {session,openModal,logout} from '../session'
const route=useRoute(),router=useRouter(),expanded=shallowRef(''),nav=shallowRef(null)
watch(()=>route.fullPath,()=>expanded.value='')
function dismiss(e){if(!nav.value?.contains(e.target))expanded.value=''}
onMounted(()=>document.addEventListener('pointerdown',dismiss));onUnmounted(()=>document.removeEventListener('pointerdown',dismiss))
function signout(){logout();expanded.value='';router.push(path('/'))}
</script>
<template>
<a class="skip-link" href="#main-content">{{ $tr("跳至主要內容") }}</a>
<header class="site-header" ref="nav" @keydown.esc="expanded=''">
 <button class="icon-button mobile-menu" :aria-label="$tr(&quot;選單&quot;)" aria-haspopup="dialog" @click="openModal('menu','NewQuantCapital')"><Icon name="menu"/></button>
 <RouterLink class="brand" :to="path('/')"><img src="/newtrend/assets/newquantcapital-mark.svg" :alt="$tr(&quot;NewQuantCapital&quot;)"/>{{ $tr("NewQuantCapital") }}</RouterLink>
 <nav class="desktop-navigation" :aria-label="$tr(&quot;主要導覽&quot;)"><RouterLink :to="path('/')">{{ $tr("首頁") }}</RouterLink>
 <div v-for="group in navGroups" :key="group.label" class="nav-group" @focusout="e=>{if(!e.currentTarget.contains(e.relatedTarget))expanded=''}">
  <button :aria-expanded="expanded===group.label" :aria-controls="'nav-'+group.label" @click="expanded=expanded===group.label?'':group.label">{{ $tr(group.label) }}<Icon name="chevron-down"/></button>
  <div v-if="expanded===group.label" :id="'nav-'+group.label" class="nav-popover"><RouterLink v-if="group.path" :to="path(group.path)" class="nav-overview">{{ $tr("AI 量化總覽") }}</RouterLink><RouterLink v-for="item in group.items" :key="item[0]" :to="path(item[2])"><Icon :name="item[3]" green/><span>{{ $tr(item[0]) }}<small>{{ $tr(item[1]) }}</small></span></RouterLink></div>
 </div>
 <RouterLink :to="path('/news')">{{ $tr("新聞") }}</RouterLink><RouterLink :to="path('/charity')">{{ $tr("公益") }}</RouterLink></nav>
 <div class="account-actions" v-if="session.loggedIn"><div class="mode-toggle"><button v-for="mode in ['真實','模擬']" :key="mode" :aria-pressed="session.mode===mode" :class="{active:session.mode===mode}" @click="session.mode=mode">{{ $tr(mode) }}</button></div><RouterLink :to="path('/assets')" class="asset-link"><Icon name="wallet"/>{{ $tr("資產") }}</RouterLink><div class="nav-group"><button class="icon-button" :aria-label="$tr(&quot;個人資料&quot;)" :aria-expanded="expanded==='profile'" @click="expanded=expanded==='profile'?'':'profile'"><Icon name="user"/></button><div v-if="expanded==='profile'" class="nav-popover right"><RouterLink :to="path('/profile')">{{ $tr("個人資料") }}</RouterLink><RouterLink :to="path('/referrals')">{{ $tr("邀請好友") }}</RouterLink><RouterLink :to="path('/promotions/tasks')">{{ $tr("我的活動") }}</RouterLink><RouterLink :to="path('/kyc')">{{ $tr("實名認證") }}</RouterLink><RouterLink :to="path('/joint-account')">{{ $tr("聯名帳戶") }}</RouterLink><RouterLink :to="path('/assets')">{{ $tr("資產總覽") }}</RouterLink><button @click="signout">{{ $tr("登出") }}</button></div></div></div>
 <div v-else class="account-actions"><button class="wallet-button" @click="openModal('wallet','連接錢包')"><Icon name="wallet"/>{{ $tr("連接錢包") }}</button><RouterLink :to="path('/login')">{{ $tr("登入") }}</RouterLink><RouterLink class="pill primary" :to="path('/register')">{{ $tr("註冊") }}</RouterLink></div>
 <div class="header-tools"><button class="icon-button" :aria-label="$tr(&quot;語言&quot;)" @click="openModal('language','語言')"><Icon name="globe"/></button><button v-if="session.loggedIn" class="icon-button" :aria-label="$tr(&quot;客服&quot;)" @click="openModal('support','線上客服')"><Icon name="headset"/></button><button v-if="session.loggedIn" class="icon-button" :aria-label="$tr(&quot;站內信&quot;)" @click="openModal('messages','站內信')"><Icon name="bell"/><span class="badge">3</span></button></div>
 <div v-if="session.loggedIn" class="mobile-account mobile-tools"><button class="icon-button" :aria-label="$tr(&quot;客服&quot;)" @click="openModal('support','線上客服')"><Icon name="headset"/></button><button class="icon-button" :aria-label="$tr(&quot;站內信&quot;)" @click="openModal('messages','站內信')"><Icon name="bell"/><span class="badge">3</span></button><RouterLink class="icon-button profile-circle" :aria-label="$tr(&quot;個人資料&quot;)" :to="path('/profile')"><Icon name="user"/></RouterLink></div><RouterLink v-else class="mobile-account pill primary" :to="path('/login')">{{ $tr("登入") }}</RouterLink>
</header>
</template>
