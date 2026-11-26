<script setup>
// Personal centre shell, laid out after newtrendcapital.com/zh-TW/profile (2026-11-26): /profile is the one overview
// page (ProfileOverview) holding every setting as a row; detail sections (身份認證, 帳變記錄, 邀請好友, 消息通知,
// email/phone binding, the old /change-password link; 幫助中心 is its own channel, pages/HelpCenter.vue) are standalone pages with a 個人中心 back link.
// Sub-pages own their drafts and are remounted per route (key). Data is local in-memory mock (src/api/profile.js).
import {computed} from 'vue'
import {useRoute} from 'vue-router'
import LineIcon from '../components/ui/LineIcon.vue'
import {account} from '../account'
import {path} from '../data'
import {t} from '../i18n'
import ProfileOverview from './account/ProfileOverview.vue'
import PasswordForm from './account/PasswordForm.vue'
import ContactBinding from './account/ContactBinding.vue'
import Kyc from './account/Kyc.vue'
import AccountRecords from './account/AccountRecords.vue'
import Referrals from './account/Referrals.vue'
import Notifications from './account/Notifications.vue'
import './account/account.css'

const route = useRoute(), page = computed(() => route.params.account), id = computed(() => route.params.id || '')
const views = {
  profile: [ProfileOverview],
  'change-password': [PasswordForm], 'bind-email': [ContactBinding, {channel: 'email'}], 'bind-phone': [ContactBinding, {channel: 'phone'}],
  kyc: [Kyc], records: [AccountRecords], referrals: [Referrals], notifications: [Notifications],
}
const view = computed(() => {
  const [component, props = {}] = views[page.value] || views.profile
  return {component, props: page.value === 'kyc' ? {...props, id: id.value} : props}
})
// Form pages have no heading of their own.
const formTitle = computed(() => {
  const p = page.value
  if (p === 'change-password') return t('profile.changePassword.title')
  if (p === 'bind-email') return t('profile.bindEmailPage.' + (account.email ? 'titleChange' : 'titleBind'))
  if (p === 'bind-phone') return t('profile.bindPhonePage.' + (account.phone ? 'titleChange' : 'titleBind'))
  return ''
})
const narrow = computed(() => ['change-password', 'bind-email', 'bind-phone'].includes(page.value))
</script>
<template>
<div class="pc-shell" :class="['account-'+page,{'pc-overview':page==='profile','pc-narrow':narrow}]">
 <div class="pc-main">
  <RouterLink v-if="page!=='profile'" class="pc-back" :to="path('/profile')"><LineIcon name="arrow-left"/>{{ $t('profile.center.rows.backToProfile') }}</RouterLink>
  <h1 v-if="formTitle" class="pc-title">{{ formTitle }}</h1>
  <component :is="view.component" v-bind="view.props" :key="page+'|'+id"/>
 </div>
</div>
</template>
