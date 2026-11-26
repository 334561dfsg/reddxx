<script setup>
// 安全中心: login password plus the email / phone verification contacts. Fund password, 2FA and device management
// stay removed (user decision 2026-11-26), unlike the GMXX reference. 修改密碼 opens the password dialog, as on GMXX.
import LineIcon from '../../components/ui/LineIcon.vue'
import {account} from '../../account'
import {path} from '../../data'
import {openModal} from '../../session'
const contacts = () => [['email', 'mail', '/bind-email', account.email], ['phone', 'smartphone', '/bind-phone', account.phone]]
</script>
<template>
<h1 class="pc-title">{{ $t('profile.center.security.title') }}</h1>
<p class="pc-subtitle">{{ $t('profile.center.security.subtitle') }}</p>
<section class="pc-card pc-security">
 <span class="pc-icon-tile" aria-hidden="true"><LineIcon name="key"/></span>
 <div class="pc-security-text"><h2>{{ $t('profile.center.security.loginPassword') }}</h2><p class="pc-muted">{{ $t('profile.center.security.loginPasswordHint') }}</p></div>
 <button type="button" class="pc-button primary" aria-haspopup="dialog" @click="openModal('change-password','profile.changePassword.title')">{{ $t('profile.center.security.changePassword') }}</button>
</section>
<h2 class="pc-section-label">{{ $t('profile.center.security.contacts') }}</h2>
<section class="pc-card pc-list">
 <div v-for="[key, icon, to, value] in contacts()" :key="key" class="pc-row">
  <span class="pc-row-lead"><span class="pc-icon-tile small" aria-hidden="true"><LineIcon :name="icon"/></span><span><span>{{ $t('profile.center.security.'+key) }}</span><small>{{ value || $t('profile.center.security.notBound') }}</small></span></span>
  <RouterLink class="pc-button" :to="path(to)">{{ $t('profile.center.security.'+(value?'change':'bind')) }}</RouterLink>
 </div>
</section>
</template>
