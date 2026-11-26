<script setup>
// 總覽: the member card (avatar, name, UID, VIP / verification badges, credit score) and the three status tiles.
import LineIcon from '../../components/ui/LineIcon.vue'
import {account,DEMO_UID} from '../../account'
import {openModal} from '../../session'
import {path} from '../../data'
import {t} from '../../i18n'
import {copyText as copy} from './accountForm.js'
const CREDIT = 100
const kycLabel = () => account.kyc === 'approved' ? 'common.kycVerified' : account.kyc === 'pending' ? 'aiQuant.status.pending_review' : 'common.kycUnverified'
</script>
<template>
<h1 class="pc-title">{{ $t('profile.pageTitle') }}</h1>
<section class="pc-card pc-hero">
 <span class="pc-avatar large" aria-hidden="true"><LineIcon name="user"/></span>
 <div class="pc-hero-text">
  <h2>{{ account.name || $t('common.unnamed') }}</h2>
  <p class="pc-uid">{{ $t('profile.center.overview.uid', {uid: DEMO_UID}) }}<button type="button" :aria-label="$t('profile.center.overview.copyUid')" :title="$t('profile.center.overview.copyUid')" @click="copy(DEMO_UID)"><LineIcon name="copy"/></button></p>
  <p class="pc-badges"><span class="pc-badge vip"><LineIcon name="crown"/>{{ $t('profile.center.overview.vip', {tier: 0}) }}</span><span class="pc-badge" :class="{ok: account.kyc==='approved'}">{{ $t(kycLabel()) }}</span></p>
  <p class="pc-muted">{{ $t('profile.center.overview.credit', {score: CREDIT}) }}</p>
 </div>
</section>
<div class="pc-tiles">
 <RouterLink class="pc-card pc-tile" :to="path('/kyc')"><small>{{ $t('common.kyc') }}</small><strong>{{ $t(kycLabel()) }}</strong><span class="pc-link">{{ $t('margin.borrow.gate.advancedCta') }}<LineIcon name="chevron-right"/></span></RouterLink>
 <button type="button" class="pc-card pc-tile" @click="openModal('vip','profile.vipLevel')"><small>{{ $t('profile.vipLevel') }}</small><strong>{{ $t('profile.center.overview.vip', {tier: 0}) }}</strong><span class="pc-progress"><span style="width:0"></span></span><small>{{ t('profile.vip.amountToNext', {tier: 1, amount: '100,000'}) }}</small></button>
 <div class="pc-card pc-tile"><small>{{ $t('profile.creditScore') }}</small><strong>{{ CREDIT }} <span class="pc-good">{{ $t('profile.creditScoreLabel.good') }}</span></strong><span class="pc-progress"><span style="width:100%"></span></span><small>{{ t('profile.creditScoreHint', {max: 100}) }}</small></div>
</div>
</template>
