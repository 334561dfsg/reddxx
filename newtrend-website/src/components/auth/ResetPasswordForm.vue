<script setup>
import {computed, nextTick, onBeforeUnmount, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import {message} from 'ant-design-vue'
import {t} from '../../i18n'
import {path} from '../../data'
import {openModal} from '../../session'
import {errorKey} from '../../api/transport.js'
import {DEMO_RESET_CODE, requestResetCode, resetPassword} from '../../api/passwordReset.js'
import {DEFAULT_DIAL_ISO, DIAL_CODES} from '../../utils/dialCodes.js'
import DialCodePicker from '../ui/DialCodePicker.vue'
// 重設密碼 (user decision, 2026-11-28): find the account by email, phone or username; the code always goes to the
// account's bound email (shown masked), then the code and the new password reset it. Every result is a toast;
// 聯繫客服 stays visible for accounts without a bound email. The parent keys this component by method, so
// switching tabs starts over.
const props = defineProps({tab: {type: String, required: true}})
const router = useRouter()
const METHOD = {'common.email': 'email', 'auth.phone': 'phone', 'auth.username': 'username'}
const method = computed(() => METHOD[props.tab])
const identifier = ref(''), dialIso = ref(DEFAULT_DIAL_ISO)
const ticket = ref(''), maskedEmail = ref(null), countdown = ref(0)
const code = ref(''), password = ref(''), confirm = ref(''), show = ref(false)
const sending = ref(false), submitting = ref(false)
const codeInput = ref(null)
let timer = null

const prompt = computed(() => t(method.value === 'email' ? 'auth.enterEmail' : method.value === 'phone' ? 'auth.enterPhone' : 'auth.enterUsername'))
const fail = cause => message.error(t(errorKey(cause), cause?.params || {}))

function tick(seconds) {
  clearInterval(timer)
  countdown.value = seconds
  timer = setInterval(() => { if (--countdown.value <= 0) clearInterval(timer) }, 1000)
}
async function send() {
  if (sending.value || countdown.value > 0) return
  sending.value = true
  try {
    const dial = DIAL_CODES.find(entry => entry.iso === dialIso.value)?.dial
    const result = await requestResetCode({method: method.value, identifier: identifier.value, dial})
    ticket.value = result.ticket
    maskedEmail.value = result.maskedEmail
    tick(result.resendIn)
    message.success(t('auth.reset.sentToast', {code: DEMO_RESET_CODE}))
    await nextTick()
    codeInput.value?.focus()
  } catch (cause) {
    if (cause?.code === 'auth.reset.tooSoon') tick(cause.params.count)
    fail(cause)
  } finally {
    sending.value = false
  }
}
async function submit() {
  if (submitting.value) return
  submitting.value = true
  try {
    await resetPassword({ticket: ticket.value, code: code.value.trim(), password: password.value, confirm: confirm.value})
    password.value = confirm.value = ''
    message.success(t('auth.reset.success'))
    router.push(path('/login'))
  } catch (cause) {
    fail(cause)
  } finally {
    submitting.value = false
  }
}
function changeAccount() {
  ticket.value = ''
  maskedEmail.value = null
  code.value = password.value = confirm.value = ''
  clearInterval(timer)
  countdown.value = 0
}
// The account field stays editable after sending; changing it (or the dial code) starts over (user decision,
// 2026-11-28: no 更換帳戶 action). Email shows no 已發送至 notice since the code goes to the address just typed.
watch([identifier, dialIso], () => { if (ticket.value) changeAccount() })
onBeforeUnmount(() => clearInterval(timer))
</script>
<template><form class="form-stack reset-form" novalidate @submit.prevent="ticket ? submit() : send()">
 <div v-if="method === 'phone'" class="phone-field"><label for="reset-phone">{{ $t(tab) }}</label><div class="phone-row"><DialCodePicker v-model="dialIso" :label="$t('auth.countryCode')"/><input id="reset-phone" v-model="identifier" :placeholder="prompt" inputmode="tel" autocomplete="tel-national"/></div></div>
 <label v-else>{{ $t(tab) }}<input v-model="identifier" :placeholder="prompt" :type="method === 'email' ? 'email' : 'text'" :autocomplete="method === 'email' ? 'email' : 'username'"/></label>
 <p v-if="!ticket" class="muted reset-hint">{{ $t('auth.reset.codeGoesToEmail') }}</p>
 <template v-else>
  <p v-if="method !== 'email'" class="reset-sent">{{ $t('auth.reset.sentTo', {email: maskedEmail}) }}</p>
  <label>{{ $t('auth.reset.code') }}<div class="code-field"><input ref="codeInput" v-model="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" :placeholder="$t('auth.reset.codePlaceholder')"/><button type="button" :disabled="countdown > 0 || sending" @click="send">{{ countdown > 0 ? $t('auth.reset.resendIn', {count: countdown}) : $t('auth.reset.resend') }}</button></div></label>
  <label>{{ $t('auth.reset.newPassword') }}<div class="password-field"><input v-model="password" :type="show ? 'text' : 'password'" :placeholder="$t('auth.reset.newPasswordPlaceholder')" autocomplete="new-password"/><button type="button" :aria-label="$t(show ? 'auth.ui.hidePassword' : 'auth.ui.showPassword')" @click="show = !show">{{ $t(show ? 'assets.hide' : 'assets.show') }}</button></div></label>
  <label>{{ $t('auth.reset.confirmPassword') }}<input v-model="confirm" :type="show ? 'text' : 'password'" :placeholder="$t('auth.reset.confirmPlaceholder')" autocomplete="new-password"/></label>
 </template>
 <button class="primary-button wide-button" :disabled="sending || submitting" :aria-busy="sending || submitting">{{ ticket ? $t(submitting ? 'auth.reset.resetting' : 'auth.ui.resetPassword') : $t(sending ? 'auth.reset.sending' : 'auth.reset.sendCode') }}</button>
 <p class="reset-support muted">{{ $t('auth.reset.noEmailQuestion') }}<button type="button" class="green-link" aria-haspopup="dialog" @click="openModal('support', 'common.onlineSupport')">{{ $t('auth.reset.contactSupport') }}</button></p>
</form></template>
<style>
#main-content .reset-form .reset-hint{margin-top:-8px;font-size:var(--nt-text-caption);line-height:18px}
#main-content .reset-form .reset-sent{padding:12px 14px;border-radius:var(--nt-radius-control);background:#ffffff08;font-size:var(--nt-text-body);line-height:20px;overflow-wrap:anywhere}
#main-content .reset-form .code-field{display:flex;align-items:center;background:#202226;border-radius:var(--nt-radius-control)}
#main-content .reset-form .code-field input{flex:1;min-width:0;letter-spacing:.1em}
#main-content .reset-form .code-field button{padding:10px 14px;color:var(--nt-accent);white-space:nowrap;font-variant-numeric:tabular-nums}
#main-content .reset-form .code-field button:disabled{color:var(--nt-muted);cursor:not-allowed}
#main-content .reset-form .reset-support{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:4px;font-size:var(--nt-text-caption);line-height:18px}
#main-content .reset-form .reset-support .green-link{font-weight:400}
</style>
