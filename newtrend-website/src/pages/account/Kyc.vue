<script setup>
// 身份認證, after gmxx.io/personal?type=identity: a four-step progress (submit basic → basic review → submit
// advanced → advanced review) and the card for the current step (the "what you need to do" list was removed at the
// user's request, 2026-11-26). Basic = personal
// details + ID images in one form; advanced = handheld photo + proof of assets. Review is local mock state: a
// clearly-labelled demo button approves the pending level so the whole flow can be walked through.
import {computed,reactive} from 'vue'
import LineIcon from '../../components/ui/LineIcon.vue'
import NtSelect from '../../components/ui/NtSelect.vue'
import {account} from '../../account'
import {t} from '../../i18n'
import {notifyError,notifySuccess,useUploads} from './accountForm.js'
defineProps({id: {type: String, default: ''}})
const STEPS = ['submitBasic', 'basicReview', 'submitAdvanced', 'advancedReview']
const COUNTRIES = ['United States', 'United Kingdom', 'Taiwan', 'Hong Kong', 'Japan', 'Korea', 'Germany', 'France', 'Philippines', 'Singapore']
const ID_TYPES = ['kyc.idCard', 'kyc.passport', 'kyc.driverLicense']
// 0-based index of the current step; 4 = everything approved.
const current = computed(() => account.kyc === 'none' ? 0 : account.kyc === 'pending' ? 1 : account.advanced === 'none' ? 2 : account.advanced === 'pending' ? 3 : 4)
const statusKey = computed(() => 'profile.center.identity.status.' + (STEPS[current.value] || 'done'))
const form = reactive({country: undefined, fullName: '', idType: undefined, idNumber: ''})
const {files, selectFile} = useUploads()
const countryOptions = COUNTRIES.map(value => ({value, label: value}))
const idTypeOptions = computed(() => ID_TYPES.map(value => ({value, label: t(value)})))
const uploads = computed(() => current.value === 0 ? [['front', 'kyc.idFront'], ['back', 'kyc.idBack'], ['selfie', 'kyc.selfie']] : [['handheld', 'kyc.advanced.handheldLabel'], ['proof', 'kyc.advanced.assetProofTitle']])
function submit() {
  if (current.value === 0 && (!form.fullName.trim() || !form.idType || !form.idNumber.trim() || !form.country)) return notifyError('kyc.fillAllFields')
  if (uploads.value.some(([key]) => !files[key])) return notifyError('kyc.allUploadsRequired')
  if (current.value === 0) account.kyc = 'pending'; else account.advanced = 'pending'
  for (const key of Object.keys(files)) delete files[key]
  notifySuccess('kyc.advanced.submitSuccess')
}
function approve() {
  if (current.value === 1) account.kyc = 'approved'; else if (current.value === 3) account.advanced = 'approved'
  notifySuccess('profile.center.identity.approved')
}
</script>
<template>
<header class="pc-identity-head">
 <div><h1 class="pc-title">{{ $t('profile.center.identity.title') }}</h1><p class="pc-subtitle">{{ $t('profile.center.identity.subtitle') }}</p></div>
 <div class="pc-card pc-current"><small>{{ $t('profile.center.identity.currentProgress') }}</small><strong>{{ $t(statusKey) }}</strong></div>
</header>
<section class="pc-card pc-steps-card" aria-labelledby="pc-steps-title">
 <h2 id="pc-steps-title">{{ $t('profile.center.identity.progress') }}</h2>
 <ol class="pc-steps">
  <li v-for="(step, index) in STEPS" :key="step" :class="{done: index<current, active: index===current}" :aria-current="index===current?'step':undefined">
   <span class="pc-step-dot"><LineIcon v-if="index<current" name="check"/><template v-else>{{ index+1 }}</template></span>
   <span><strong>{{ $t('profile.center.identity.steps.'+step) }}</strong><small>{{ $t('profile.center.identity.stepHints.'+step) }}</small></span>
  </li>
 </ol>
</section>
<div class="pc-identity-body">
 <section class="pc-card pc-step-card">
  <template v-if="current===0||current===2">
   <div class="pc-step-head"><div><small class="pc-muted">{{ $t('profile.center.identity.stepOf', {step: current===0?1:2, total: 2}) }}</small><h2>{{ $t('profile.center.identity.'+(current===0?'basicTitle':'advancedTitle')) }}</h2></div><span class="pc-chip">{{ $t('profile.center.identity.toSubmit') }}</span></div>
   <p class="pc-muted">{{ $t(current===0?'kyc.basic.description':'kyc.advanced.description') }}</p>
   <form class="pc-kyc-form" novalidate @submit.prevent="submit">
    <div v-if="current===0" class="pc-fields">
     <label class="pc-field"><span id="pc-kyc-country">{{ $t('kyc.country') }}</span><NtSelect variant="pill" v-model:value="form.country" class="pc-select" aria-labelledby="pc-kyc-country" :placeholder="$t('kyc.enterCountry')" :options="countryOptions" :show-search="false"/></label>
     <label class="pc-field"><span>{{ $t('kyc.fullName') }}</span><input v-model="form.fullName" class="pc-input" autocomplete="off" :placeholder="$t('kyc.enterFullName')"/></label>
     <label class="pc-field"><span id="pc-kyc-idtype">{{ $t('kyc.idType') }}</span><NtSelect variant="pill" v-model:value="form.idType" class="pc-select" aria-labelledby="pc-kyc-idtype" :placeholder="$t('kyc.selectIdType')" :options="idTypeOptions" :show-search="false"/></label>
     <label class="pc-field"><span>{{ $t('kyc.idNumber') }}</span><input v-model="form.idNumber" class="pc-input" autocomplete="off" :placeholder="$t('kyc.enterIdNumber')"/></label>
    </div>
    <div class="pc-uploads">
     <label v-for="[key, label] in uploads" :key="key" class="pc-upload" :class="{filled: files[key]}"><span>{{ $t(label) }}</span><span class="pc-upload-box"><LineIcon :name="files[key]?'check':'upload'"/><small>{{ files[key] || $t('kyc.clickToUpload') }}</small><input type="file" accept="image/png,image/jpeg,application/pdf" :aria-label="$t(label)" @change="selectFile(key,$event)"/></span></label>
    </div>
    <p class="pc-muted small">{{ $t('account.ui.useFictionalDetailsAndDemoImagesFilesStayOn') }}</p>
    <div class="pc-form-foot"><span class="pc-muted">{{ $t('profile.center.identity.reviewHint') }}</span><button type="submit" class="pc-button primary nt-float-action">{{ $t('kyc.submit') }}</button></div>
   </form>
  </template>
  <template v-else-if="current===1||current===3">
   <div class="pc-step-head"><div><small class="pc-muted">{{ $t('profile.center.identity.stepOf', {step: current===1?1:2, total: 2}) }}</small><h2>{{ $t('profile.center.identity.'+(current===1?'basicTitle':'advancedTitle')) }}</h2></div><span class="pc-chip warn">{{ $t('profile.center.identity.inReview') }}</span></div>
   <p class="pc-muted">{{ $t('profile.center.identity.reviewHint') }}</p>
   <div class="pc-form-foot"><span></span><button type="button" class="pc-button" @click="approve">{{ $t('profile.center.identity.simulateApprove') }}</button></div>
  </template>
  <div v-else class="pc-done"><span class="pc-icon-tile ok" aria-hidden="true"><LineIcon name="check"/></span><h2>{{ $t('profile.center.identity.status.done') }}</h2></div>
 </section>
</div>
</template>
