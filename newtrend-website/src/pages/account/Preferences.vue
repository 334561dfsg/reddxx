<script setup>
// 偏好設定 (after gmxx.io): customer-message alert switch (saved through the profile API), a language row that opens
// the searchable language picker dialog, version, log out (confirmed).
import {computed} from 'vue'
import {useRouter} from 'vue-router'
import {message} from 'ant-design-vue'
import LineIcon from '../../components/ui/LineIcon.vue'
import Skeleton from '../../components/ui/Skeleton.vue'
import {locale,languages,t} from '../../i18n'
import {path} from '../../data'
import {openModal,logout} from '../../session'
import {useMutation,useRequest} from '../../composables/useRequest.js'
import {getPreferences,profileErrorKey,updatePreferences} from '../../api/profile.js'
const VERSION = '1.0.0'
const router = useRouter()
const prefs = useRequest(getPreferences, {tags: ['preferences']})
const saving = useMutation(updatePreferences)
const currentLanguage = computed(() => languages.find(([code]) => code === locale.value)?.[1] || locale.value)
async function toggleAlert() {
  if (!prefs.data.value || saving.pending.value) return
  const next = !prefs.data.value.messageAlert
  try { prefs.data.value = await saving.run({messageAlert: next}); message.success(t('profile.center.preferences.saved')) }
  catch (cause) { message.error(t(profileErrorKey(cause) === 'profile.center.loadFailed' ? 'profile.center.preferences.saveFailed' : profileErrorKey(cause))) }
}
function signOut() {
  openModal('account-confirm', 'profile.logoutConfirmTitle', {description: 'profile.logoutConfirmDescription', onConfirm: () => { logout(); router.push(path('/login')) }})
}
</script>
<template>
<h1 class="pc-title">{{ $t('profile.center.preferences.title') }}</h1>
<section class="pc-card pc-list">
 <div class="pc-row">
  <div><span id="pc-alert-label">{{ $t('profile.center.preferences.messageAlert') }}</span><small id="pc-alert-hint">{{ $t('profile.center.preferences.messageAlertHint') }}</small></div>
  <button v-if="prefs.data.value" type="button" role="switch" class="pc-switch" :aria-checked="prefs.data.value.messageAlert" aria-labelledby="pc-alert-label" aria-describedby="pc-alert-hint" :aria-busy="saving.pending.value||undefined" :disabled="saving.pending.value" @click="toggleAlert"><span></span></button>
  <Skeleton v-else width="44px" height="24px" class="pc-switch-skeleton"/>
 </div>
 <button type="button" class="pc-row pc-row-button" aria-haspopup="dialog" @click="openModal('language','profile.center.preferences.selectLanguage')"><span>{{ $t('profile.center.preferences.language') }}</span><span class="pc-row-value">{{ currentLanguage }}<LineIcon name="chevron-right"/></span></button>
 <div class="pc-row"><span>{{ $t('profile.center.preferences.version') }}</span><span class="pc-muted">{{ VERSION }}</span></div>
</section>
<button type="button" class="pc-logout" @click="signOut">{{ $t('profile.center.preferences.logout') }}</button>
</template>
