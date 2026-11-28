<script setup>
// Login / register form shared by the auth page (/login, /register) and the embedded login dialog (Overlay type
// 'login', user decision 2026-11-29). Owns the method tabs, fields and the auth-mock call; failures are toasts per
// attempt. Emits `success` once the account is accepted (the caller signs in and decides where to go) and `state`
// ({busy}) so a dialog can hold its close paths while the request runs.
import {computed,ref,useId,watch} from 'vue'
import {message} from 'ant-design-vue'
import {path} from '../../data'
import {t} from '../../i18n'
import DialCodePicker from '../ui/DialCodePicker.vue'
import {DEFAULT_DIAL_ISO,DIAL_CODES} from '../../utils/dialCodes.js'
import {loginWithPassword,registerAccount} from '../../api/auth.js'
import {errorKey} from '../../api/transport.js'
import {AUTH_METHODS,authTabs} from '../../utils/authMethods.js'
const props=defineProps({mode:{type:String,default:'login',validator:value=>['login','register'].includes(value)},forgotTo:{type:String,default:'/forgot-password'},submitLabel:String})
const emit=defineEmits(['success','state'])
const tabs=authTabs(),tab=ref(tabs[0]),identifier=ref(''),password=ref(''),show=ref(false),busy=ref(false),dialIso=ref(DEFAULT_DIAL_ISO)
const id=useId()
const identifierPrompt=computed(()=>t(tab.value==='common.email'?'auth.enterEmail':tab.value==='auth.phone'?'auth.enterPhone':'auth.enterUsername'))
watch(busy,value=>emit('state',{busy:value}))
async function submit(){
 if(busy.value)return
 busy.value=true
 const request={method:AUTH_METHODS[tab.value],identifier:identifier.value,dial:DIAL_CODES.find(entry=>entry.iso===dialIso.value)?.dial,password:password.value}
 try{await (props.mode==='register'?registerAccount:loginWithPassword)(request)}
 catch(cause){message.error(t(errorKey(cause),cause?.params||{}));return}
 finally{busy.value=false}
 password.value=''
 emit('success')
}
</script>
<template>
<div class="login-form">
 <div class="auth-tabs" role="group"><button v-for="key in tabs" :key="key" type="button" :class="{active:tab===key}" :aria-pressed="tab===key" @click="tab=key">{{ $t(key) }}</button></div>
 <form class="form-stack" novalidate @submit.prevent="submit">
  <div v-if="tab==='auth.phone'" class="phone-field"><label :for="id+'-phone'">{{ $t(tab) }}</label><div class="phone-row"><DialCodePicker v-model="dialIso" :label="$t('auth.countryCode')"/><input :id="id+'-phone'" v-model="identifier" data-login-initial-focus :placeholder="identifierPrompt" inputmode="tel" autocomplete="off"/></div></div>
  <label v-else>{{ $t(tab) }}<input v-model="identifier" data-login-initial-focus :placeholder="identifierPrompt" :inputmode="tab==='common.email'?'email':'text'" autocomplete="off"/></label>
  <label>{{ $t('auth.password') }}<div class="password-field"><input v-model="password" :type="show?'text':'password'" :placeholder="$t('auth.enterPassword')" autocomplete="off"/><button type="button" :aria-label="$t(show?'auth.ui.hidePassword':'auth.ui.showPassword')" @click="show=!show">{{ $t(show?'assets.hide':'assets.show') }}</button></div></label>
  <RouterLink v-if="mode==='login'" class="green-link" :to="path(forgotTo)">{{ $t('auth.forgotPassword') }}</RouterLink>
  <button class="primary-button wide-button" :disabled="busy" :aria-busy="busy">{{ $t(submitLabel||(mode==='login'?'auth.loginNow':'assets.onboarding.steps.register')) }}</button>
 </form>
</div>
</template>
