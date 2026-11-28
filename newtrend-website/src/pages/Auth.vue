<script setup>
import {computed,ref} from 'vue'
import {message} from 'ant-design-vue'
import {useRoute,useRouter} from 'vue-router'
import {path} from '../data'
import {login,openModal} from '../session'
import {t} from '../i18n'
import Icon from '../components/Icon.vue'
import DialCodePicker from '../components/ui/DialCodePicker.vue'
import ResetPasswordForm from '../components/auth/ResetPasswordForm.vue'
import {DEFAULT_DIAL_ISO,DIAL_CODES} from '../utils/dialCodes.js'
import {loginWithPassword,registerAccount} from '../api/auth.js'
import {errorKey} from '../api/transport.js'
import {safeRedirect} from '../utils/redirect'
import {readLoginSettings} from '../utils/siteLoginConfig.js'
const route=useRoute(),router=useRouter(),tab=ref("common.email"),identifier=ref(''),password=ref(''),show=ref(false),busy=ref(false),dialIso=ref(DEFAULT_DIAL_ISO)
const identifierPrompt=computed(()=>t(tab.value==="common.email"?'auth.enterEmail':tab.value==="auth.phone"?'auth.enterPhone':'auth.enterUsername'))
const mode=computed(()=>route.params.auth),title=computed(()=>mode.value==='register'?"assets.onboarding.steps.register":mode.value==='forgot-password'?"auth.ui.resetPassword":"auth.login")
const METHOD={'common.email':'email','auth.phone':'phone','auth.username':'username'}
// Admin 用户名登录 switch: off hides the username tab for login, register and password reset.
const loginSettings=readLoginSettings()
const tabs=computed(()=>Object.keys(METHOD).filter(key=>key!=='auth.username'||loginSettings.usernameLoginEnabled))
if(!tabs.value.includes(tab.value))tab.value=tabs.value[0]
// Login and register go through the auth mock (user request, 2026-11-28): unknown account, wrong password
// (attempts left), lock, taken identifier, username format and password length are toasts per attempt.
async function submit(){
 if(busy.value)return
 busy.value=true
 const request={method:METHOD[tab.value],identifier:identifier.value,dial:DIAL_CODES.find(entry=>entry.iso===dialIso.value)?.dial,password:password.value}
 try{await (mode.value==='register'?registerAccount:loginWithPassword)(request)}
 catch(cause){message.error(t(errorKey(cause),cause?.params||{}));return}
 finally{busy.value=false}
 if(mode.value==='register')message.success(t('auth.registerSuccess'))
 password.value='';login();router.push(safeRedirect(route.query.redirect)||path('/assets'))
}
// Form first in source order (user request, 2026-11-28): phones show it before the intro; wide screens keep the
// intro on the left through grid placement.
</script>
<template><div class="auth-layout"><section class="auth-form"><div class="summary-line"><h2>{{ $t(title) }}</h2><RouterLink class="green-link" :to="path(mode==='register'?'/login':'/register')">{{ $t(mode==='register'?"auth.login":"auth.register") }} →</RouterLink></div><div class="auth-tabs"><button v-for="t in tabs" :key="t" :class="{active:tab===t}" @click="tab=t">{{ $t(t) }}</button></div><ResetPasswordForm v-if="mode==='forgot-password'" :key="tab" :tab="tab"/><form v-else class="form-stack" novalidate @submit.prevent="submit"><div v-if="tab===&quot;auth.phone&quot;" class="phone-field"><label for="auth-phone">{{ $t(tab) }}</label><div class="phone-row"><DialCodePicker v-model="dialIso" :label="$t(&quot;auth.countryCode&quot;)"/><input id="auth-phone" v-model="identifier" :placeholder="identifierPrompt" inputmode="tel" autocomplete="off"/></div></div><label v-else>{{ $t(tab) }}<input v-model="identifier" :placeholder="identifierPrompt" :inputmode="tab===&quot;common.email&quot;?'email':'text'" autocomplete="off"/></label><label>{{ $t("auth.password") }}<div class="password-field"><input v-model="password" :type="show?'text':'password'" :placeholder="$t(&quot;auth.enterPassword&quot;)" autocomplete="off"/><button type="button" :aria-label="$t(show?&quot;auth.ui.hidePassword&quot;:&quot;auth.ui.showPassword&quot;)" @click="show=!show">{{ $t(show?"assets.hide":"assets.show") }}</button></div></label><RouterLink v-if="mode==='login'" class="green-link" :to="path('/forgot-password')">{{ $t("auth.forgotPassword") }}</RouterLink><button class="primary-button wide-button" :disabled="busy" :aria-busy="busy">{{ $t(mode==='login'?"auth.loginNow":title) }}</button></form><div class="divider"><span>{{ $t("auth.or") }}</span></div><button class="secondary-button wide-button" @click="openModal('wallet',&quot;common.connectWallet&quot;)"><Icon name="wallet"/>{{ $t("common.connectWallet") }}</button></section><section class="auth-intro"><h1>{{ $t("auth.panelHeadline") }}</h1><p class="page-desc">{{ $t("auth.ui.exploreGlobalMarketsAndSmarterTradingTools") }}</p><div class="auth-features"><article v-for="[icon,name,desc] in [['layers',&quot;home.whyNvdx.features.multiAsset.title&quot;,&quot;home.cobalt.hero.phoneAlt&quot;],['sparkles',&quot;home.whyNvdx.features.aiAssisted.title&quot;,&quot;home.whyNvdx.features.aiAssisted.desc&quot;],['shield',&quot;home.whyNvdx.features.web3Custody.title&quot;,&quot;home.whyNvdx.features.web3Custody.desc&quot;],['zap',&quot;home.whyNvdx.features.liquidity.title&quot;,&quot;home.whyNvdx.features.liquidity.desc&quot;]]" :key="name"><Icon :name="icon" green/><h3>{{ $t(name) }}</h3><p>{{ $t(desc) }}</p></article></div><RouterLink class="green-link" :to="path('/regulatory-information')">{{ $t("common.regulatoryInformation") }}</RouterLink></section></div></template>
