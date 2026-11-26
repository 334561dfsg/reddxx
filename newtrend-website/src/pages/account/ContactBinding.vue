<script setup>
import {t} from '../../i18n'
import {computed,reactive} from 'vue'
import {account} from '../../account'
import {DEMO_CODE,notifyError,notifySuccess,useCodeCountdown} from './accountForm.js'
// Bind/change email or phone with a demo verification code.
const props=defineProps({channel:{type:String,required:true}})
const isEmail=computed(()=>props.channel==='email')
const form=reactive({email:'',phone:'',prefix:'+1',code:''})
const {sent,count,start}=useCodeCountdown()
const validContact=computed(()=>isEmail.value?/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email):/^\d{6,15}$/.test(form.phone))
function sendCode(){
 if(!validContact.value)return
 if(isEmail.value&&form.email===account.email)return notifyError('profile.bindEmailPage.sameAsCurrentEmail')
 start()
}
function bind(){
 if(form.code!==DEMO_CODE)return notifyError('profile.bindEmailPage.invalidVerificationCode')
 if(isEmail.value)account.email=form.email;else account.phone=form.prefix+' '+form.phone
 notifySuccess(isEmail.value?'profile.bindEmailPage.changeSuccess':'profile.bindPhonePage.bindSuccess')
 form.code='';sent.value=false
}
</script>
<template><form class="account-form binding-form" @submit.prevent="sent?bind():sendCode()"><label v-if="isEmail&&account.email">{{ $t("profile.bindEmailPage.currentEmailLabel") }}<input :value="account.email" disabled/></label><label>{{ $t(isEmail?"auth.email":"auth.phone") }}<input v-if="isEmail" v-model="form.email" type="email" :placeholder="$t(&quot;auth.enterEmail&quot;)" :disabled="sent"/><div v-else class="phone-input"><select v-model="form.prefix" :aria-label="$t(&quot;auth.countryCode&quot;)" :disabled="sent"><option v-for="p in ['+1','+44','+49','+33','+81','+82','+86','+852','+886','+63']" :value="p">{{ $t(p) }}</option></select><input v-model="form.phone" inputmode="tel" :placeholder="$t(&quot;auth.enterPhone&quot;)" :disabled="sent"/></div></label><template v-if="sent"><label>{{ $t("auth.verificationCode") }}<input v-model="form.code" inputmode="numeric" maxlength="6" :placeholder="$t(&quot;profile.bindEmailPage.verificationCodePlaceholder&quot;)" autocomplete="one-time-code"/></label><p class="notice">{{ $t("account.ui.localDemoCode123456") }}</p><button type="button" class="green-link" :disabled="count>0" @click="sendCode">{{ $t(count>0?t('profile.bindEmailPage.resendInSeconds',{count}):t('profile.bindEmailPage.resend')) }}</button><button type="button" class="muted" @click="sent=false">{{ $t("profile.changeFundPasswordShort") }}</button></template><button class="primary-button wide-button" :disabled="!validContact||(sent&&form.code.length!==6)">{{ t('profile.'+(isEmail?'bindEmailPage':'bindPhonePage')+'.'+(sent?((isEmail?account.email:account.phone)?'submitChange':'submitBind'):'sendCode')) }}</button></form></template>
