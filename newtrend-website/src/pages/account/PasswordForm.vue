<script setup>
import {computed,reactive} from 'vue'
import {account,passwordValid} from '../../account'
import {path} from '../../data'
import {notifyError,notifySuccess} from './accountForm.js'
// Login password change and 6-digit fund password set/change share one form.
const props=defineProps({fund:{type:Boolean,default:false}})
const isFund=computed(()=>props.fund)
const form=reactive({old:'',password:'',confirm:''})
const validPassword=computed(()=>isFund.value?/^\d{6}$/.test(form.password):passwordValid(form.password))
function passwordSubmit(){
 if(!validPassword.value)return notifyError(isFund.value?'account.ui.exactly6Digits':'account.ui.checkThePasswordRequirements')
 if(form.password!==form.confirm)return notifyError('auth.passwordMismatch')
 if(form.old&&form.old===form.password)return notifyError('profile.fundPasswordPage.passwordSameAsOld')
 if(isFund.value)account.fundPasswordSet=true
 form.old=form.password=form.confirm=''
 notifySuccess(isFund.value?'profile.fundPasswordSet':'profile.changePassword.changed')
}
</script>
<template><form class="account-form" @submit.prevent="passwordSubmit"><label v-if="!isFund||account.fundPasswordSet">{{ $t(isFund?"profile.fundPasswordPage.oldPassword":"profile.changePassword.oldPassword") }}<input v-model="form.old" type="password" :placeholder="$t(isFund?&quot;profile.fundPasswordPage.enterOldPassword&quot;:&quot;profile.changePassword.enterOldPassword&quot;)" autocomplete="off" required/></label><label>{{ $t(isFund?"auth.stepUp.factor.fund_password.label":"auth.newPassword") }}<input v-model="form.password" type="password" :placeholder="$t(isFund?&quot;profile.fundPasswordPage.enterPassword&quot;:&quot;auth.enterNewPassword&quot;)" autocomplete="new-password" :maxlength="isFund?6:30"/></label><ul class="password-rules"><template v-if="isFund"><li :class="{positive:validPassword}">{{ $t("account.ui.exactly6Digits") }}</li></template><template v-else><li :class="{positive:form.password.length>=8&&form.password.length<=30}">{{ $t("account.ui.830Characters") }}</li><li :class="{positive:/[a-z]/i.test(form.password)}">{{ $t("auth.passwordRules.containsLetter") }}</li><li :class="{positive:/[^a-z]/i.test(form.password)}">{{ $t("auth.passwordRules.notAllLetters") }}</li><li :class="{positive:/^[A-Za-z0-9@#$*.]+$/.test(form.password)}">{{ $t("auth.passwordRules.onlyAllowedChars") }}</li></template></ul><label>{{ $t("auth.confirmPassword") }}<input v-model="form.confirm" type="password" :placeholder="$t(isFund?&quot;profile.enterFundPasswordAgain&quot;:&quot;profile.changePassword.enterConfirmPassword&quot;)" autocomplete="new-password"/></label><button class="primary-button wide-button" :disabled="!validPassword||!form.confirm">{{ $t("earn.redeem.success.done") }}</button><RouterLink class="muted center" :to="path('/forgot-password')">{{ $t("profile.changePassword.forgotPassword") }}</RouterLink></form></template>
