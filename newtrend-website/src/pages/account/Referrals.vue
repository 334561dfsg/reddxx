<script setup>
// 邀請好友, after gmxx.io/personal?type=inviteFriends: invitation code and link (copy), a QR code for the link, and
// invited / pending / settled (USDT) totals from the profile API (local mock).
import {computed,ref,watch} from 'vue'
import QRCode from 'qrcode'
import Skeleton from '../../components/ui/Skeleton.vue'
import RequestState from '../../components/ui/RequestState.vue'
import {path} from '../../data'
import {getInviteSummary} from '../../api/profile.js'
import {useRequest} from '../../composables/useRequest.js'
import {copyText as copy} from './accountForm.js'
const invite = useRequest(getInviteSummary, {tags: ['invite']})
const link = computed(() => invite.data.value ? location.origin + '/NewQuantCapital' + path('/register') + '?ref=' + invite.data.value.code : '')
const qr = ref('')
watch(link, async value => { qr.value = value ? await QRCode.toDataURL(value, {width: 152, margin: 1}) : '' }, {immediate: true})
const usdt = value => Number(value).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})
const STATS = [['invited', 'invited', false], ['pending', 'pending', true], ['settled', 'settled', true]]
</script>
<template>
<h1 class="pc-title">{{ $t('profile.center.invite.title') }}</h1>
<RequestState :status="invite.status.value" :error="invite.error.value" class="pc-card" @retry="invite.refresh">
 <template #loading>
  <section class="pc-card pc-invite"><div class="pc-invite-fields"><h2>{{ $t('profile.center.invite.myCode') }}</h2><div class="pc-field"><span>{{ $t('profile.center.invite.code') }}</span><div class="pc-copy-row"><span class="pc-copy-value"><Skeleton inline width="120px"/></span></div></div><div class="pc-field"><span>{{ $t('profile.center.invite.link') }}</span><div class="pc-copy-row"><span class="pc-copy-value"><Skeleton inline width="70%"/></span></div></div></div><div class="pc-qr"><Skeleton width="152px" height="152px"/></div></section>
  <div class="pc-stats"><div v-for="[key] in STATS" :key="key" class="pc-card pc-stat"><small>{{ $t('profile.center.invite.'+key) }}</small><strong><Skeleton inline width="48px"/></strong></div></div>
 </template>
 <section class="pc-card pc-invite">
  <div class="pc-invite-fields">
   <h2>{{ $t('profile.center.invite.myCode') }}</h2>
   <div class="pc-field"><span>{{ $t('profile.center.invite.code') }}</span><div class="pc-copy-row"><span class="pc-copy-value code">{{ invite.data.value.code }}</span><button type="button" class="pc-button primary" @click="copy(invite.data.value.code)">{{ $t('profile.center.invite.copyCode') }}</button></div></div>
   <div class="pc-field"><span>{{ $t('profile.center.invite.link') }}</span><div class="pc-copy-row"><span class="pc-copy-value">{{ link }}</span><button type="button" class="pc-button" @click="copy(link)">{{ $t('profile.center.invite.copyLink') }}</button></div></div>
  </div>
  <figure class="pc-qr"><img v-if="qr" :src="qr" :alt="$t('profile.center.invite.qrAlt')" width="152" height="152"/><figcaption>{{ $t('profile.center.invite.qr') }}</figcaption></figure>
 </section>
 <div class="pc-stats">
  <div v-for="[key, field, money] in STATS" :key="key" class="pc-card pc-stat" :class="key"><small>{{ $t('profile.center.invite.'+key) }}</small><strong>{{ money ? usdt(invite.data.value[field]) : invite.data.value[field] }}</strong></div>
 </div>
</RequestState>
</template>
