<script setup>
// 安全中心: login password, fund password, the Google Authenticator verification method and the email / phone contacts. 修改密碼 and 裝置管理 open dialogs, as on GMXX (device management restored
// at the user's request, 2026-11-26).
import LineIcon from '../../components/ui/LineIcon.vue'
import {account} from '../../account'
import {path} from '../../data'
import {openModal} from '../../session'
import Skeleton from '../../components/ui/Skeleton.vue'
import {getAuthenticator,getFundPassword} from '../../api/profile.js'
import {useRequest} from '../../composables/useRequest.js'
// Verification method (谷歌驗證器), restored after GMXX at the user's request (2026-11-26).
const mfa = useRequest(getAuthenticator, {tags: ['authenticator']})
// 資金密碼 (restored at the user's request, 2026-11-26): set / change dialog; withdrawals ask for it.
const fund = useRequest(getFundPassword, {tags: ['fund-password']})
const openFund = () => openModal('fund-password', fund.data.value?.set ? 'profile.center.fundPassword.changeTitle' : 'profile.center.fundPassword.setTitle', {set: Boolean(fund.data.value?.set)})
const openMfa = () => openModal('authenticator', mfa.data.value?.enabled ? 'profile.center.authenticator.unbindTitle' : 'profile.center.authenticator.title', {mode: mfa.data.value?.enabled ? 'unbind' : 'bind'})
const contacts = () => [['email', 'mail', '/bind-email', account.email], ['phone', 'smartphone', '/bind-phone', account.phone]]
</script>
<template>
<h1 class="pc-title">{{ $t('profile.center.security.title') }}</h1>
<p class="pc-subtitle">{{ $t('profile.center.security.subtitle') }}</p>
<section class="pc-card pc-security">
 <span class="pc-icon-tile" aria-hidden="true"><LineIcon name="key"/></span>
 <div class="pc-security-text"><h2>{{ $t('profile.center.security.loginPassword') }}</h2><p class="pc-muted">{{ $t('profile.center.security.loginPasswordHint') }}</p></div>
 <div class="pc-actions"><button type="button" class="pc-button primary" aria-haspopup="dialog" @click="openModal('change-password','profile.changePassword.title')">{{ $t('profile.center.security.changePassword') }}</button><button type="button" class="pc-button" aria-haspopup="dialog" @click="openModal('devices','profile.center.devices.title')">{{ $t('profile.center.devices.button') }}</button></div>
</section>
<section class="pc-card pc-security">
 <span class="pc-icon-tile" aria-hidden="true"><LineIcon name="shield"/></span>
 <div class="pc-security-text"><h2>{{ $t('profile.center.fundPassword.name') }}</h2><p class="pc-muted">{{ $t('profile.center.fundPassword.hint') }}</p></div>
 <div class="pc-actions">
  <span v-if="fund.data.value" class="pc-chip" :class="fund.data.value.set?'ok':'warn'">{{ $t(fund.data.value.set?'profile.center.fundPassword.isSet':'profile.center.fundPassword.notSet') }}</span>
  <Skeleton v-else inline width="52px"/>
  <button type="button" class="pc-button" :class="{primary: fund.data.value&&!fund.data.value.set}" aria-haspopup="dialog" :disabled="!fund.data.value" @click="openFund">{{ $t(fund.data.value?.set?'profile.center.fundPassword.change':'profile.center.fundPassword.set') }}</button>
 </div>
</section>
<h2 class="pc-section-label">{{ $t('profile.center.authenticator.section') }}</h2>
<section class="pc-card pc-security">
 <span class="pc-icon-tile" aria-hidden="true"><LineIcon name="lock"/></span>
 <div class="pc-security-text"><h2>{{ $t('profile.center.authenticator.name') }}</h2><p class="pc-muted"><template v-if="mfa.data.value">{{ $t(mfa.data.value.enabled?'profile.center.authenticator.onHint':'profile.center.authenticator.offHint') }}</template><Skeleton v-else inline width="180px"/></p></div>
 <div class="pc-actions">
  <span v-if="mfa.data.value" class="pc-chip" :class="mfa.data.value.enabled?'ok':'warn'">{{ $t(mfa.data.value.enabled?'profile.center.authenticator.on':'profile.center.authenticator.off') }}</span>
  <button type="button" class="pc-button" :class="{primary: mfa.data.value&&!mfa.data.value.enabled}" aria-haspopup="dialog" :disabled="!mfa.data.value" @click="openMfa">{{ $t(mfa.data.value?.enabled?'profile.center.authenticator.unbind':'profile.center.authenticator.bind') }}</button>
 </div>
</section>
<section class="pc-card pc-hint"><h2>{{ $t('profile.center.authenticator.hintTitle') }}</h2><p class="pc-muted">{{ $t('profile.center.authenticator.hint') }}</p></section>
<h2 class="pc-section-label">{{ $t('profile.center.security.contacts') }}</h2>
<section class="pc-card pc-list">
 <div v-for="[key, icon, to, value] in contacts()" :key="key" class="pc-row">
  <span class="pc-row-lead"><span class="pc-icon-tile small" aria-hidden="true"><LineIcon :name="icon"/></span><span><span>{{ $t('profile.center.security.'+key) }}</span><small>{{ value || $t('profile.center.security.notBound') }}</small></span></span>
  <RouterLink class="pc-button" :to="path(to)">{{ $t('profile.center.security.'+(value?'change':'bind')) }}</RouterLink>
 </div>
</section>
</template>
