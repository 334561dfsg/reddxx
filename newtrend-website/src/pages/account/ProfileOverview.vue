<script setup>
// 個人中心 overview, laid out after newtrendcapital.com/zh-TW/profile (measured 2026-11-26): a header card (avatar,
// name, UID copy) over metric tiles (實名認證 / VIP / 信用分 — 安全等級 stays removed), then two columns:
// 個人設定 (帳戶 / 安全 / 偏好 rows) and 我的業務 + 支援, with a small 登出 pill. Every current feature is a row here:
// security items open their dialogs, detail sections open their own pages. Data comes from the local mock APIs.
import {computed} from 'vue'
import {useRouter} from 'vue-router'
import {message} from 'ant-design-vue'
import LineIcon from '../../components/ui/LineIcon.vue'
import Skeleton from '../../components/ui/Skeleton.vue'
import {account,DEMO_UID} from '../../account'
import {openModal,logout} from '../../session'
import {path} from '../../data'
import {locale,languages,t} from '../../i18n'
import {invalidateAll,useMutation,useRequest} from '../../composables/useRequest.js'
import {getAuthenticator,getFundPassword,getPreferences,getUnreadCount,profileErrorKey,updatePreferences} from '../../api/profile.js'
import {copyText as copy} from './accountForm.js'

const CREDIT = 100, VERSION = '1.0.0'
const router = useRouter()
const fund = useRequest(getFundPassword, {tags: ['fund-password']})
const mfa = useRequest(getAuthenticator, {tags: ['authenticator']})
const prefs = useRequest(getPreferences, {tags: ['preferences']})
const unread = useRequest(getUnreadCount, {tags: ['notifications']})
const saving = useMutation(updatePreferences)

const kycLabel = () => account.kyc === 'approved' ? 'common.kycVerified' : account.kyc === 'pending' ? 'aiQuant.status.pending_review' : 'common.kycUnverified'
const currentLanguage = computed(() => languages.find(([code]) => code === locale.value)?.[1] || locale.value)

const openPassword = () => openModal('change-password', 'profile.changePassword.title')
const openFund = () => openModal('fund-password', fund.data.value?.set ? 'profile.center.fundPassword.changeTitle' : 'profile.center.fundPassword.setTitle', {set: Boolean(fund.data.value?.set)})
const openMfa = () => openModal('authenticator', mfa.data.value?.enabled ? 'profile.center.authenticator.unbindTitle' : 'profile.center.authenticator.title', {mode: mfa.data.value?.enabled ? 'unbind' : 'bind'})
const openDevices = () => openModal('devices', 'profile.center.devices.title')
const openLanguage = () => openModal('language', 'profile.center.preferences.selectLanguage')
async function toggleAlert() {
  if (!prefs.data.value || saving.pending.value) return
  try { prefs.data.value = await saving.run({messageAlert: !prefs.data.value.messageAlert}); message.success(t('profile.center.preferences.saved')) }
  catch (cause) { message.error(t(profileErrorKey(cause) === 'profile.center.loadFailed' ? 'profile.center.preferences.saveFailed' : profileErrorKey(cause))) }
}
function clearCache() {
  openModal('account-confirm', 'profile.center.clearCache.title', {description: 'profile.center.clearCache.description', confirmLabel: 'profile.center.clearCache.confirm', onConfirm: () => { invalidateAll(); message.success(t('profile.center.clearCache.done')) }})
}
function signOut() {
  openModal('account-confirm', 'profile.logoutConfirmTitle', {description: 'profile.logoutConfirmDescription', onConfirm: () => { logout(); router.push(path('/login')) }})
}
</script>
<template>
<h1 class="pf-title">{{ $t('profile.pageTitle') }}</h1>

<section class="pf-card pf-hero">
 <div class="pf-identity">
  <span class="pf-avatar" aria-hidden="true"><LineIcon name="user"/></span>
  <div class="pf-identity-text"><h2>{{ account.name || $t('common.unnamed') }}</h2><p class="pf-uid">UID {{ DEMO_UID }}<button type="button" :aria-label="$t('profile.center.overview.copyUid')" :title="$t('profile.center.overview.copyUid')" @click="copy(DEMO_UID)"><LineIcon name="copy"/></button></p></div>
 </div>
 <div class="pf-tiles">
  <RouterLink class="pf-tile" :to="path('/kyc')"><span class="pf-tile-label">{{ $t('common.kyc') }}<LineIcon name="chevron-right"/></span><strong class="pf-tile-value"><span class="pf-dot" :class="account.kyc==='approved'?'ok':'warn'" aria-hidden="true"></span>{{ $t(kycLabel()) }}</strong><span v-if="account.kyc!=='approved'" class="pf-tile-cta">{{ $t('margin.borrow.gate.advancedCta') }}</span></RouterLink>
  <button type="button" class="pf-tile" @click="openModal('vip','profile.vipLevel')"><span class="pf-tile-label">{{ $t('profile.vipLevel') }}<LineIcon name="chevron-right"/></span><strong class="pf-tile-value">{{ $t('profile.center.overview.vip', {tier: 0}) }}</strong><span class="pf-bar"><span style="width:0"></span></span><span class="pf-tile-sub">{{ t('profile.vip.amountToNext', {tier: 1, amount: '100,000'}) }}</span></button>
  <div class="pf-tile"><span class="pf-tile-label">{{ $t('profile.creditScore') }}</span><strong class="pf-tile-value">{{ CREDIT }} <span class="pf-good">{{ $t('profile.creditScoreLabel.good') }}</span></strong><span class="pf-bar ok"><span style="width:100%"></span></span><span class="pf-tile-sub">{{ t('profile.creditScoreHint', {max: 100}) }}</span></div>
 </div>
</section>

<div class="pf-columns">
 <section class="pf-card pf-box" aria-labelledby="pf-settings">
  <header class="pf-box-head"><h2 id="pf-settings">{{ $t('profile.personalSettings') }}</h2><small>{{ $t('profile.personalSettingsHint') }}</small></header>
  <div class="pf-group">
   <h3>{{ $t('profile.groupAccount') }}</h3>
   <RouterLink class="pf-row" :to="path('/kyc')"><LineIcon name="shield"/><span class="pf-row-label">{{ $t('common.kyc') }}</span><span class="pf-row-value"><span class="pf-dot" :class="account.kyc==='approved'?'ok':'warn'" aria-hidden="true"></span>{{ $t(kycLabel()) }}</span><LineIcon name="chevron-right" class="pf-chev"/></RouterLink>
   <RouterLink class="pf-row" :to="path('/bind-email')"><LineIcon name="mail"/><span class="pf-row-label">{{ $t('auth.email') }}</span><span class="pf-row-value">{{ account.email || $t('profile.notBound') }}</span><LineIcon name="chevron-right" class="pf-chev"/></RouterLink>
   <RouterLink class="pf-row" :to="path('/bind-phone')"><LineIcon name="smartphone"/><span class="pf-row-label">{{ $t('auth.phone') }}</span><span class="pf-row-value">{{ account.phone || $t('profile.notBound') }}</span><LineIcon name="chevron-right" class="pf-chev"/></RouterLink>
  </div>
  <div id="security" class="pf-group">
   <h3>{{ $t('common.security') }}</h3>
   <button type="button" class="pf-row" aria-haspopup="dialog" @click="openPassword"><LineIcon name="key"/><span class="pf-row-label">{{ $t('profile.loginPassword') }}</span><span class="pf-row-value">{{ $t('profile.set') }}</span><LineIcon name="chevron-right" class="pf-chev"/></button>
   <button type="button" class="pf-row" aria-haspopup="dialog" :disabled="!fund.data.value" @click="openFund"><LineIcon name="wallet"/><span class="pf-row-label">{{ $t('profile.center.fundPassword.name') }}</span><span class="pf-row-value"><template v-if="fund.data.value"><span v-if="!fund.data.value.set" class="pf-dot warn" aria-hidden="true"></span>{{ $t(fund.data.value.set?'profile.center.fundPassword.isSet':'profile.center.fundPassword.notSet') }}</template><Skeleton v-else inline width="48px"/></span><LineIcon name="chevron-right" class="pf-chev"/></button>
   <button type="button" class="pf-row" aria-haspopup="dialog" :disabled="!mfa.data.value" @click="openMfa"><LineIcon name="lock"/><span class="pf-row-label">{{ $t('profile.center.rows.twoFactor') }}</span><span class="pf-row-value"><template v-if="mfa.data.value"><span v-if="!mfa.data.value.enabled" class="pf-dot warn" aria-hidden="true"></span>{{ $t(mfa.data.value.enabled?'profile.center.authenticator.on':'profile.center.authenticator.off') }}</template><Skeleton v-else inline width="48px"/></span><LineIcon name="chevron-right" class="pf-chev"/></button>
   <button type="button" class="pf-row" aria-haspopup="dialog" @click="openDevices"><LineIcon name="monitor"/><span class="pf-row-label">{{ $t('profile.center.devices.button') }}</span><span class="pf-row-value"></span><LineIcon name="chevron-right" class="pf-chev"/></button>
  </div>
  <div class="pf-group">
   <h3>{{ $t('profile.groupPreferences') }}</h3>
   <button type="button" class="pf-row" aria-haspopup="dialog" @click="openLanguage"><LineIcon name="globe"/><span class="pf-row-label">{{ $t('common.language') }}</span><span class="pf-row-value">{{ currentLanguage }}</span><LineIcon name="chevron-down" class="pf-chev"/></button>
   <div class="pf-row static"><LineIcon name="message-circle"/><span id="pf-alert" class="pf-row-label">{{ $t('profile.center.preferences.messageAlert') }}</span><button v-if="prefs.data.value" type="button" role="switch" class="pf-switch" :aria-checked="prefs.data.value.messageAlert" aria-labelledby="pf-alert" :aria-busy="saving.pending.value||undefined" :disabled="saving.pending.value" @click="toggleAlert"><span></span></button><Skeleton v-else width="40px" height="22px" class="pf-switch-skeleton"/></div>
   <button type="button" class="pf-row" aria-haspopup="dialog" @click="clearCache"><LineIcon name="eraser"/><span class="pf-row-label">{{ $t('profile.center.nav.clearCache') }}</span><span class="pf-row-value"></span><LineIcon name="chevron-right" class="pf-chev"/></button>
   <div class="pf-row static"><LineIcon name="info"/><span class="pf-row-label">{{ $t('profile.center.preferences.version') }}</span><span class="pf-row-value">{{ VERSION }}</span></div>
  </div>
 </section>

 <div class="pf-side">
  <section class="pf-card pf-box" aria-labelledby="pf-business">
   <header class="pf-box-head"><h2 id="pf-business">{{ $t('profile.myBusiness') }}</h2><small>{{ $t('profile.myBusinessHint') }}</small></header>
   <div class="pf-group">
    <button type="button" class="pf-row" aria-haspopup="dialog" @click="openModal('vip','profile.vipLevel')"><LineIcon name="crown"/><span class="pf-row-label">{{ $t('profile.vipLevel') }}</span><span class="pf-row-value">{{ $t('profile.center.overview.vip', {tier: 0}) }}</span><LineIcon name="chevron-right" class="pf-chev"/></button>
    <RouterLink class="pf-row" :to="path('/referrals')"><LineIcon name="user-plus"/><span class="pf-row-label">{{ $t('profile.center.nav.invite') }}</span><span class="pf-row-value"></span><LineIcon name="chevron-right" class="pf-chev"/></RouterLink>
    <RouterLink class="pf-row" :to="path('/records')"><LineIcon name="file-text"/><span class="pf-row-label">{{ $t('profile.center.nav.records') }}</span><span class="pf-row-value"></span><LineIcon name="chevron-right" class="pf-chev"/></RouterLink>
    <RouterLink class="pf-row" :to="path('/notifications')"><LineIcon name="bell"/><span class="pf-row-label">{{ $t('profile.center.nav.notifications') }}</span><span class="pf-row-value"><template v-if="unread.data.value"><span class="pf-dot accent" aria-hidden="true"></span>{{ $t('profile.center.rows.unread', {count: unread.data.value}) }}</template></span><LineIcon name="chevron-right" class="pf-chev"/></RouterLink>
   </div>
  </section>
  <section class="pf-card pf-box" aria-labelledby="pf-support">
   <header class="pf-box-head"><h2 id="pf-support">{{ $t('profile.support') }}</h2></header>
   <div class="pf-group">
    <RouterLink class="pf-row" :to="path('/help-center')"><LineIcon name="help-circle"/><span class="pf-row-label">{{ $t('profile.helpCenter') }}</span><span class="pf-row-value"></span><LineIcon name="chevron-right" class="pf-chev"/></RouterLink>
    <button type="button" class="pf-row" aria-haspopup="dialog" @click="openModal('support','common.onlineSupport')"><LineIcon name="message-circle"/><span class="pf-row-label">{{ $t('profile.contactSupport') }}</span><span class="pf-row-value"></span><LineIcon name="chevron-right" class="pf-chev"/></button>
    <RouterLink class="pf-row" :to="path('/about')"><LineIcon name="info"/><span class="pf-row-label">{{ $t('profile.aboutUs') }}</span><span class="pf-row-value"></span><LineIcon name="chevron-right" class="pf-chev"/></RouterLink>
   </div>
  </section>
  <button type="button" class="pf-logout" @click="signOut"><LineIcon name="log-out"/>{{ $t('profile.logout') }}</button>
 </div>
</div>
</template>
