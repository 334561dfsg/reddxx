<script setup>
import {t} from '../../i18n'
import {reactive} from 'vue'
import Icon from '../../components/Icon.vue'
import {account} from '../../account'
import {DEMO_CODE,copyText as copy,notifyError,notifySuccess} from './accountForm.js'
const form=reactive({code:''})
function toggle2fa(){
 if(form.code!==DEMO_CODE)return notifyError('profile.bindEmailPage.invalidVerificationCode')
 account.twoFactor=!account.twoFactor
 notifySuccess(account.twoFactor?'twoFactor.boundSuccess':'twoFactor.unbindSuccess')
 form.code=''
}
</script>
<template><form class="account-form" @submit.prevent="toggle2fa"><template v-if="!account.twoFactor"><section><h3>{{ $t(t('twoFactor.step1')) }}: {{ $t(t('twoFactor.downloadApp')) }}</h3><div class="two-cols section-gap"><a class="secondary-button" href="https://apps.apple.com/app/google-authenticator/id388497605" target="_blank" rel="noopener"><img class="auth-qr" src="/NewQuantCapital/assets/auth-ios.svg" alt="iOS Google Authenticator"/>{{ $t("iOS ↗") }}</a><a class="secondary-button" href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" target="_blank" rel="noopener"><img class="auth-qr" src="/NewQuantCapital/assets/auth-android.svg" alt="Android Google Authenticator"/>{{ $t("Android ↗") }}</a></div></section><section><h3>{{ $t(t('twoFactor.step2')) }}: {{ $t(t('twoFactor.scanOrCopy')) }}</h3><p class="notice section-gap">{{ $t("account.ui.demoKeyOnlyNotValidForARealAccount") }}</p><img class="auth-qr" src="/NewQuantCapital/assets/demo-auth.svg" alt="Local demo QR code"/><div class="demo-key">{{ $t("DEMO-LOCAL-ONLY-000000 ") }}<button type="button" :aria-label="$t(&quot;c2c.paymentAccount.copy&quot;)" @click="copy('DEMO-LOCAL-ONLY-000000')"><Icon name="layers"/></button></div><p class="muted">{{ $t("twoFactor.copyTip") }}</p></section></template><template v-else><div class="card"><Icon name="shield" green/><h3>{{ $t("common.on") }}</h3><p class="muted section-gap">{{ $t("twoFactor.2faEnabledDesc") }}</p></div></template><label>{{ $t(account.twoFactor?t('twoFactor.enterOtpToUnbind'):t('twoFactor.enterOtp')) }}<input v-model="form.code" inputmode="numeric" maxlength="6" :placeholder="$t(&quot;twoFactor.otpPlaceholder&quot;)"/></label><p class="notice">{{ $t("account.ui.localDemoCode123456") }}</p><button class="primary-button wide-button" :disabled="form.code.length!==6">{{ t('twoFactor.'+(account.twoFactor?'confirmUnbind':'confirm')) }}</button></form></template>
