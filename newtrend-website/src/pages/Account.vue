<script setup>
// Personal centre shell, structured after gmxx.io/personal (2026-11-26) in the new skin: a left sidebar with the
// member card (its name opens the overview, as on GMXX) and section nav (偏好設定 / 安全中心 / 身份認證 / 帳變記錄 (own full-width page) | 邀請好友 / 消息通知 / 幫助中心 /
// 清除快取) and one section component per route. Sub-pages own their drafts and are remounted per route (key).
// All data is local in-memory mock behind src/api/profile.js; nothing is persisted.
import {computed} from 'vue'
import {useRoute} from 'vue-router'
import {message} from 'ant-design-vue'
import LineIcon from '../components/ui/LineIcon.vue'
import {account,DEMO_UID as UID} from '../account'
import {path} from '../data'
import {t} from '../i18n'
import {openModal} from '../session'
import {invalidateAll} from '../composables/useRequest.js'
import {copyText} from './account/accountForm.js'
import ProfileOverview from './account/ProfileOverview.vue'
import Preferences from './account/Preferences.vue'
import SecurityCenter from './account/SecurityCenter.vue'
import PasswordForm from './account/PasswordForm.vue'
import ContactBinding from './account/ContactBinding.vue'
import Kyc from './account/Kyc.vue'
import AccountRecords from './account/AccountRecords.vue'
import Referrals from './account/Referrals.vue'
import Notifications from './account/Notifications.vue'
import HelpCenter from './account/HelpCenter.vue'
import './account/account.css'

const route = useRoute(), page = computed(() => route.params.account), id = computed(() => route.params.id || '')
const views = {
  profile: [ProfileOverview], preferences: [Preferences], security: [SecurityCenter],
  'change-password': [PasswordForm], 'bind-email': [ContactBinding, {channel: 'email'}], 'bind-phone': [ContactBinding, {channel: 'phone'}],
  kyc: [Kyc], records: [AccountRecords], referrals: [Referrals], notifications: [Notifications], 'help-center': [HelpCenter],
}
const view = computed(() => {
  const [component, props = {}] = views[page.value] || views.profile
  return {component, props: page.value === 'kyc' ? {...props, id: id.value} : props}
})
// Forms reached from the security centre keep that nav item active and show a back link to it.
const SECURITY_FORMS = ['change-password', 'bind-email', 'bind-phone']
// 帳變記錄 opens as its own full-width page on GMXX; the other sections share the sidebar shell.
const standalone = computed(() => page.value === 'records')
const section = computed(() => SECURITY_FORMS.includes(page.value) ? 'security' : page.value)
const NAV = [
  [['preferences', 'settings'], ['security', 'shield'], ['kyc', 'id-card'], ['records', 'file-text']],
  [['referrals', 'user-plus'], ['notifications', 'bell'], ['help-center', 'help-circle']],
]
const LABEL = {preferences: 'preferences', security: 'security', kyc: 'identity', records: 'records', referrals: 'invite', notifications: 'notifications', 'help-center': 'helpCenter'}
const formTitle = computed(() => {
  const p = page.value
  if (p === 'change-password') return t('profile.changePassword.title')
  if (p === 'bind-email') return t('profile.bindEmailPage.' + (account.email ? 'titleChange' : 'titleBind'))
  if (p === 'bind-phone') return t('profile.bindPhonePage.' + (account.phone ? 'titleChange' : 'titleBind'))
  return ''
})
const kycLabel = () => account.kyc === 'approved' ? 'common.kycVerified' : account.kyc === 'pending' ? 'aiQuant.status.pending_review' : 'common.kycUnverified'

function clearCache() {
  openModal('account-confirm', 'profile.center.clearCache.title', {
    description: 'profile.center.clearCache.description', confirmLabel: 'profile.center.clearCache.confirm',
    onConfirm: () => { invalidateAll(); message.success(t('profile.center.clearCache.done')) },
  })
}
</script>
<template>
<div class="pc-shell" :class="['account-'+page,{'pc-standalone':standalone}]">
 <aside v-if="!standalone" class="pc-side">
  <div class="pc-member" :class="{active: section==='profile'}">
   <span class="pc-avatar" aria-hidden="true"><LineIcon name="user"/></span>
   <div class="pc-member-text"><RouterLink class="pc-member-name" :to="path('/profile')" :aria-current="section==='profile'?'page':undefined">{{ account.name || $t('common.unnamed') }}</RouterLink><span class="pc-uid">{{ $t('profile.center.overview.uid', {uid: UID}) }}<button type="button" :aria-label="$t('profile.center.overview.copyUid')" :title="$t('profile.center.overview.copyUid')" @click="copyText(UID)"><LineIcon name="copy"/></button></span><span class="pc-badges"><span class="pc-badge vip"><LineIcon name="crown"/>{{ $t('profile.center.overview.vip', {tier: 0}) }}</span><span class="pc-badge" :class="{ok: account.kyc==='approved'}">{{ $t(kycLabel()) }}</span></span></div>
  </div>
  <nav class="pc-nav" :aria-label="$t('profile.center.nav.label')">
   <ul v-for="(group, index) in NAV" :key="index">
    <li v-for="[key, icon] in group" :key="key"><RouterLink :to="path('/'+key)" :aria-current="section===key?'page':undefined" :class="{active: section===key}"><LineIcon :name="icon"/><span>{{ $t('profile.center.nav.'+LABEL[key]) }}</span></RouterLink></li>
    <li v-if="index===NAV.length-1"><button type="button" @click="clearCache"><LineIcon name="eraser"/><span>{{ $t('profile.center.nav.clearCache') }}</span></button></li>
   </ul>
  </nav>
 </aside>
 <main class="pc-main">
  <RouterLink v-if="standalone" class="pc-back" :to="path('/profile')"><LineIcon name="arrow-left"/>{{ $t('profile.center.records.back') }}</RouterLink>
  <template v-if="formTitle">
   <RouterLink class="pc-back" :to="path('/security')"><LineIcon name="arrow-left"/>{{ $t('profile.center.security.back') }}</RouterLink>
   <h1 class="pc-title">{{ formTitle }}</h1>
  </template>
  <component :is="view.component" v-bind="view.props" :key="page+'|'+id"/>
 </main>
</div>
</template>
