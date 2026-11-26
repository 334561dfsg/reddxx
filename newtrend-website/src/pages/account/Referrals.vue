<script setup>
import {reactive,ref,watch} from 'vue'
import QRCode from 'qrcode'
import Icon from '../../components/Icon.vue'
import {account} from '../../account'
import {path} from '../../data'
import {locale,t} from '../../i18n'
import {copyText as copy,notifyError,notifySuccess} from './accountForm.js'
const locationOrigin=location.origin
const referralQr=ref('')
watch(locale,async()=>{referralQr.value=await QRCode.toDataURL(locationOrigin+'/NewQuantCapital'+path('/register')+'?ref=DEMO10001',{width:160,margin:1})},{immediate:true})
const form=reactive({referral:''})
function submitReferral(){
 if(account.referrer)return notifyError('referral.bind.errors.alreadyBound')
 if(!form.referral.trim()||form.referral==='DEMO10001')return notifyError('referral.bind.errors.invalid')
 account.referrer=form.referral
 notifySuccess('referral.bind.success')
}
</script>
<template><form class="card referral-bind section-gap" @submit.prevent="submitReferral"><h2><Icon name="users" green/>{{t('referral.bind.title')}}</h2><p class="muted">{{t('referral.bind.description')}}</p><div class="referral-bind-input"><input v-model="form.referral" :placeholder="t('referral.bind.placeholder')" :aria-label="t('referral.bind.title')" :disabled="!!account.referrer"/><button class="primary-button" :disabled="!!account.referrer||!form.referral.trim()">{{account.referrer?t('referral.bind.success'):t('referral.bind.submit')}}</button></div></form><div class="referral-stats section-gap"><section class="card referral-code"><h2>{{t('referral.code.title')}}</h2><div class="summary-line"><strong>DEMO10001</strong><button class="secondary-button" @click="copy('DEMO10001')">{{t('referral.code.copy')}}</button></div></section><section v-for="key in ['totalInvited','qualifiedCount','rewardedCount','totalAccumulated']" :key="key" class="card"><small>{{t('referral.stats.'+key)}}</small><p><strong>0</strong><small v-if="key==='totalAccumulated'"> USDT</small></p></section></div><section class="card referral-share section-gap"><h2>{{t('referral.shareLink.title')}}</h2><p class="muted">{{t('referral.shareLink.description')}}</p><div class="referral-share-content"><img v-if="referralQr" :src="referralQr" :alt="t('referral.shareLink.qrAlt')"/><div><div class="demo-key">{{locationOrigin+'/NewQuantCapital'+path('/register')+'?ref=DEMO10001'}}</div><div class="summary-line"><small class="muted">{{t('referral.shareLink.scanHint')}}</small><button class="secondary-button" @click="copy(locationOrigin+'/NewQuantCapital'+path('/register')+'?ref=DEMO10001')">{{t('referral.shareLink.copy')}}</button></div></div></div></section><section class="card referral-invitees section-gap"><h2>{{t('referral.invitees.title')}}</h2><div class="empty"><Icon name="users"/><h3>{{t('referral.empty.title')}}</h3><p>{{t('referral.empty.description')}}</p></div></section></template>
