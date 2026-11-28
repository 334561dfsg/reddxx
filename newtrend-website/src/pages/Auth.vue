<script setup>
import {computed,ref} from 'vue'
import {message} from 'ant-design-vue'
import {useRoute,useRouter} from 'vue-router'
import {path} from '../data'
import {login,openModal} from '../session'
import {t} from '../i18n'
import Icon from '../components/Icon.vue'
import LoginForm from '../components/auth/LoginForm.vue'
import ResetPasswordForm from '../components/auth/ResetPasswordForm.vue'
import {safeRedirect} from '../utils/redirect'
import {authTabs} from '../utils/authMethods.js'
import {useMediaQuery} from '../composables/useMediaQuery.js'
const route=useRoute(),router=useRouter()
// Single-column screens (≤900px, phones) show only the login/register form: the marketing intro is left out (user
// decision 2026-11-29). Wide screens keep it on the left.
const showIntro=useMediaQuery('(min-width: 901px)')
const mode=computed(()=>route.params.auth),title=computed(()=>mode.value==='register'?"assets.onboarding.steps.register":mode.value==='forgot-password'?"auth.ui.resetPassword":"auth.login")
// Password reset keeps its own method tabs; login and register use the shared LoginForm (also in the login dialog).
const resetTabs=authTabs(),resetTab=ref(resetTabs[0])
// The redirect query survives switching between login and register.
const other=computed(()=>({path:path(mode.value==='register'?'/login':'/register'),query:route.query.redirect?{redirect:route.query.redirect}:{}}))
function done(){
 if(mode.value==='register')message.success(t('auth.registerSuccess'))
 login();router.push(safeRedirect(route.query.redirect)||path('/assets'))
}
// Form first in source order (user request, 2026-11-28): phones show it before the intro; wide screens keep the
// intro on the left through grid placement.
</script>
<template><div class="auth-layout"><section class="auth-form"><div class="summary-line"><h2>{{ $t(title) }}</h2><RouterLink class="green-link" :to="other">{{ $t(mode==='register'?"auth.login":"auth.register") }} →</RouterLink></div><template v-if="mode==='forgot-password'"><div class="auth-tabs"><button v-for="key in resetTabs" :key="key" :class="{active:resetTab===key}" @click="resetTab=key">{{ $t(key) }}</button></div><ResetPasswordForm :key="resetTab" :tab="resetTab"/></template><LoginForm v-else :key="mode" :mode="mode" @success="done"/><div class="divider"><span>{{ $t("auth.or") }}</span></div><button class="secondary-button wide-button" @click="openModal('wallet',&quot;common.connectWallet&quot;)"><Icon name="wallet"/>{{ $t("common.connectWallet") }}</button></section><section v-if="showIntro" class="auth-intro"><h1>{{ $t("auth.panelHeadline") }}</h1><p class="page-desc">{{ $t("auth.ui.exploreGlobalMarketsAndSmarterTradingTools") }}</p><div class="auth-features"><article v-for="[icon,name,desc] in [['layers',&quot;home.whyNvdx.features.multiAsset.title&quot;,&quot;home.cobalt.hero.phoneAlt&quot;],['sparkles',&quot;home.whyNvdx.features.aiAssisted.title&quot;,&quot;home.whyNvdx.features.aiAssisted.desc&quot;],['shield',&quot;home.whyNvdx.features.web3Custody.title&quot;,&quot;home.whyNvdx.features.web3Custody.desc&quot;],['zap',&quot;home.whyNvdx.features.liquidity.title&quot;,&quot;home.whyNvdx.features.liquidity.desc&quot;]]" :key="name"><Icon :name="icon" green/><h3>{{ $t(name) }}</h3><p>{{ $t(desc) }}</p></article></div><RouterLink class="green-link" :to="path('/regulatory-information')">{{ $t("common.regulatoryInformation") }}</RouterLink></section></div></template>
