<script setup>
import {computed,reactive,watch} from 'vue'
import {passwordValid} from '../../account'
import {path} from '../../data'
import {notifyError,notifySuccess} from './accountForm.js'
// Login password change (the fund password was removed, user decision 2026-11-26). The security centre opens it as a
// dialog like gmxx.io (security notice, current / new / confirm, full-width confirm); /change-password still renders
// it as a page for old links. In the dialog it reports unsaved input to the overlay and closes on success.
const props=defineProps({inDialog:Boolean})
const emit=defineEmits(['state','close'])
const form=reactive({old:'',password:'',confirm:''})
const validPassword=computed(()=>passwordValid(form.password))
watch(form,()=>emit('state',{dirty:Boolean(form.old||form.password||form.confirm)}),{immediate:true})
function passwordSubmit(){
 if(!form.old)return notifyError('profile.changePassword.enterOldPassword')
 if(!validPassword.value)return notifyError('account.ui.checkThePasswordRequirements')
 if(form.password!==form.confirm)return notifyError('auth.passwordMismatch')
 if(form.old===form.password)return notifyError('profile.fundPasswordPage.passwordSameAsOld')
 form.old=form.password=form.confirm=''
 notifySuccess('profile.changePassword.changed')
 if(props.inDialog)emit('close')
}
</script>
<template><form id="password-form" class="account-form" :class="{'password-dialog-form':inDialog}" novalidate @submit.prevent="passwordSubmit"><p v-if="inDialog" class="password-notice">{{ $t('profile.center.security.passwordNotice') }}</p><label>{{ $t("profile.changePassword.oldPassword") }}<input v-model="form.old" type="password" :placeholder="$t(&quot;profile.changePassword.enterOldPassword&quot;)" autocomplete="current-password"/></label><label>{{ $t("auth.newPassword") }}<input v-model="form.password" type="password" :placeholder="$t(&quot;auth.enterNewPassword&quot;)" autocomplete="new-password" :maxlength="30"/></label><ul class="password-rules"><li :class="{positive:form.password.length>=8&&form.password.length<=30}">{{ $t("account.ui.830Characters") }}</li><li :class="{positive:/[a-z]/i.test(form.password)}">{{ $t("auth.passwordRules.containsLetter") }}</li><li :class="{positive:/[^a-z]/i.test(form.password)}">{{ $t("auth.passwordRules.notAllLetters") }}</li><li :class="{positive:/^[A-Za-z0-9@#$*.]+$/.test(form.password)}">{{ $t("auth.passwordRules.onlyAllowedChars") }}</li></ul><label>{{ $t("auth.confirmPassword") }}<input v-model="form.confirm" type="password" :placeholder="$t(&quot;profile.changePassword.enterConfirmPassword&quot;)" autocomplete="new-password"/></label><button class="primary-button wide-button">{{ $t(inDialog?'profile.center.security.confirmChange':'earn.redeem.success.done') }}</button><RouterLink v-if="!inDialog" class="muted center" :to="path('/forgot-password')">{{ $t("profile.changePassword.forgotPassword") }}</RouterLink></form></template>
<style>
/* Dialog variant: the overlay body is the frame, so no card chrome; fields and rules follow the transfer dialog. */
.account-form.password-dialog-form{display:grid;gap:16px;padding:0;border:0;background:none;max-width:none}
.password-dialog-form label{display:grid;gap:8px;font-size:14px;line-height:20px;color:#e6e7e9}
.password-dialog-form input{min-height:48px;padding:0 14px;border:1px solid #ffffff1f;border-radius:var(--nt-radius-panel);background:#0c0e10;color:#fff;font-size:14px}
.password-dialog-form input:focus-visible{outline:none;background:#11151a}
.password-dialog-form .password-notice{margin:0;color:var(--nt-accent);font-size:13px;line-height:20px}
.password-dialog-form .password-rules{margin:-6px 0 0;padding:0;list-style:none;color:var(--nt-text-dim);font-size:12px;line-height:1.8}
.password-dialog-form .password-rules li:before{content:'○';margin-right:8px}
.password-dialog-form .password-rules .positive{color:var(--nt-up)}
.password-dialog-form .primary-button{min-height:48px;margin-top:8px;border-radius:var(--nt-radius-panel);font-weight:600}
</style>
