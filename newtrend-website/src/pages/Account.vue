<script setup>
// Account centre shell: one header (title/subtitle per route) and one sub-page component per route.
// Sub-pages own their drafts and are remounted per route (key), so leaving a route discards its draft.
import {computed} from 'vue'
import {useRoute} from 'vue-router'
import BackLink from '../components/ui/BackLink.vue'
import {account} from '../account'
import {path} from '../data'
import {t} from '../i18n'
import ProfileOverview from './account/ProfileOverview.vue'
import PasswordForm from './account/PasswordForm.vue'
import ContactBinding from './account/ContactBinding.vue'
import TwoFactor from './account/TwoFactor.vue'
import Devices from './account/Devices.vue'
import Kyc from './account/Kyc.vue'
import Referrals from './account/Referrals.vue'
import HelpCenter from './account/HelpCenter.vue'
import './account/account.css'
const route=useRoute(),page=computed(()=>route.params.account),id=computed(()=>route.params.id||'')
const views={
 'profile':[ProfileOverview],'change-password':[PasswordForm],'fund-password':[PasswordForm,{fund:true}],
 'bind-email':[ContactBinding,{channel:'email'}],'bind-phone':[ContactBinding,{channel:'phone'}],'2fa':[TwoFactor],
 'devices':[Devices],'kyc':[Kyc],'referrals':[Referrals],
 'help-center':[HelpCenter],
}
const view=computed(()=>{const [component,props={}]=views[page.value]||views.profile;return {component,props:page.value==='kyc'?{...props,id:id.value}:props}})
const title=computed(()=>{const p=page.value;return p==='change-password'?t('profile.changePassword.title'):p==='fund-password'?t('profile.fundPasswordPage.'+(account.fundPasswordSet?'changeTitle':'setTitle')):p==='bind-email'?t('profile.bindEmailPage.'+(account.email?'titleChange':'titleBind')):p==='bind-phone'?t('profile.bindPhonePage.'+(account.phone?'titleChange':'titleBind')):p==='2fa'?t('twoFactor.'+(account.twoFactor?'2faStatus':'bind2fa')):p==='kyc'?t(id.value==='basic'?'kyc.kycTitle':id.value==='advanced'?'kyc.advanced.pageTitle':'kyc.center.title'):p==='referrals'?t('referral.page.title'):p==='devices'?t('devices.title'):p==='help-center'?t('profile.helpCenterPage.title'):t('profile.pageTitle')})
const subtitle=computed(()=>{const p=page.value;return p==='change-password'?t('profile.changePassword.subtitle'):p==='fund-password'?t('profile.fundPasswordPage.'+(account.fundPasswordSet?'changeSubtitle':'setSubtitle')):p==='bind-email'?t('profile.bindEmailPage.subtitleChange'):p==='bind-phone'?t('profile.bindPhonePage.subtitleBind'):p==='2fa'?t('twoFactor.bind2faDesc'):p==='kyc'?t(id.value==='basic'?'kyc.kycDesc':id.value==='advanced'?'kyc.advanced.pageDesc':'kyc.center.subtitle'):p==='referrals'?t('referral.page.description'):p==='devices'?t('devices.subtitle'):p==='help-center'?t('profile.helpCenterPage.subtitle'):''})
</script>
<template><div :class="[page==='profile'?'account-center':'account-page','account-'+page]"><BackLink v-if="page!=='profile'" :to="path('/profile')" class="back-link">{{ $t("account.ui.back") }}</BackLink><header class="account-heading" :class="{'account-banner':page==='referrals'}"><small v-if="page==='referrals'" class="page-kicker">{{t('referral.page.subtitle')}}</small><h1>{{title}}</h1><p v-if="subtitle" class="account-subtitle">{{subtitle}}</p><p v-if="page==='referrals'" class="tag-chip section-gap">{{t('referral.page.qualificationHint',{amount:'2,000'})}}</p></header><component :is="view.component" v-bind="view.props" :key="page+'|'+id"/></div></template>
