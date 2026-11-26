<script setup>
import {computed,reactive} from 'vue'
import {passwordValid} from '../../account'
import {path} from '../../data'
import {notifyError,notifySuccess} from './accountForm.js'
// Login password change (the fund password was removed, user decision 2026-11-26).
const form=reactive({old:'',password:'',confirm:''})
const validPassword=computed(()=>passwordValid(form.password))
function passwordSubmit(){
 if(!validPassword.value)return notifyError('account.ui.checkThePasswordRequirements')
 if(form.password!==form.confirm)return notifyError('auth.passwordMismatch')
 if(form.old&&form.old===form.password)return notifyError('profile.fundPasswordPage.passwordSameAsOld')
 form.old=form.password=form.confirm=''
 notifySuccess('profile.changePassword.changed')
}
</script>
<template><form class="account-form" @submit.prevent="passwordSubmit"><label>{{ $t("profile.changePassword.oldPassword") }}<input v-model="form.old" type="password" :placeholder="$t(&quot;profile.changePassword.enterOldPassword&quot;)" autocomplete="off" required/></label><label>{{ $t("auth.newPassword") }}<input v-model="form.password" type="password" :placeholder="$t(&quot;auth.enterNewPassword&quot;)" autocomplete="new-password" :maxlength="30"/></label><ul class="password-rules"><li :class="{positive:form.password.length>=8&&form.password.length<=30}">{{ $t("account.ui.830Characters") }}</li><li :class="{positive:/[a-z]/i.test(form.password)}">{{ $t("auth.passwordRules.containsLetter") }}</li><li :class="{positive:/[^a-z]/i.test(form.password)}">{{ $t("auth.passwordRules.notAllLetters") }}</li><li :class="{positive:/^[A-Za-z0-9@#$*.]+$/.test(form.password)}">{{ $t("auth.passwordRules.onlyAllowedChars") }}</li></ul><label>{{ $t("auth.confirmPassword") }}<input v-model="form.confirm" type="password" :placeholder="$t(&quot;profile.changePassword.enterConfirmPassword&quot;)" autocomplete="new-password"/></label><button class="primary-button wide-button" :disabled="!validPassword||!form.confirm">{{ $t("earn.redeem.success.done") }}</button><RouterLink class="muted center" :to="path('/forgot-password')">{{ $t("profile.changePassword.forgotPassword") }}</RouterLink></form></template>
