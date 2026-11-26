<script setup>
import {t} from '../../i18n'
import {reactive,ref} from 'vue'
import Icon from '../../components/Icon.vue'
import {account} from '../../account'
import {path} from '../../data'
import {notifyError,notifySuccess,useUploads} from './accountForm.js'
// KYC centre (no id), basic two-step form, or advanced upload form.
defineProps({id:{type:String,default:''}})
const step=ref(1),form=reactive({fullName:'',idType:'',idNumber:'',country:''})
const {files,selectFile}=useUploads()
function nextKyc(){
 if(!form.fullName.trim()||!form.idType||!form.idNumber.trim()||!form.country)return notifyError('kyc.fillAllFields')
 step.value=2
}
function submitKyc(level){
 const required=level==='advanced'?['handheld','proof']:['front','back','selfie']
 if(required.some(k=>!files[k]))return notifyError('kyc.allUploadsRequired')
 if(level==='advanced')account.advanced='pending';else account.kyc='pending'
 notifySuccess('kyc.advanced.submitSuccess')
}
</script>
<template><div v-if="!id" class="two-cols section-gap"><RouterLink class="card" :to="path('/kyc/basic')"><div class="summary-line"><span class="tag-chip">{{ $t("Level 1") }}</span><span>{{ $t(account.kyc==='none'?"common.kycUnverified":account.kyc==='pending'?"aiQuant.status.pending_review":"common.kycVerified") }}</span></div><h2 class="section-gap">{{ $t("kyc.basic.title") }}</h2><p class="muted section-gap">{{ $t("kyc.basic.description") }}</p><span class="green-link section-gap">{{ $t("c2c.common.goKyc") }}</span></RouterLink><div class="card"><span class="tag-chip">{{ $t("Level 2") }}</span><h2 class="section-gap">{{ $t("kyc.advanced.title") }}</h2><p class="muted section-gap">{{ $t("kyc.advanced.description") }}</p><RouterLink v-if="account.kyc==='approved'" class="green-link section-gap" :to="path('/kyc/advanced')">{{ $t("kyc.advanced.cta") }}</RouterLink><p v-else class="mini-label section-gap">{{ $t("kyc.advanced.lockedHint") }}</p></div></div><div v-else-if="(id==='basic'?account.kyc:account.advanced)==='pending'" class="card section-gap"><h2>{{ $t("aiQuant.status.pending_review") }}</h2><p class="muted section-gap">{{ $t(t('kyc.pendingTip')) }}</p><p class="mini-label section-gap">{{ $t(t('kyc.pendingHint')) }}</p></div><div v-else-if="id==='advanced'&&account.kyc!=='approved'" class="notice section-gap">{{ $t(t('kyc.advanced.lockedHint')) }}</div><form v-else class="account-form" @submit.prevent="step===1&&id==='basic'?nextKyc():submitKyc(id)"><div v-if="id==='basic'" class="kyc-steps"><span :class="{active:step===1}">{{ $t("account.ui.1PersonalInformation") }}</span><span :class="{active:step===2}">{{ $t("account.ui.2UploadDocuments") }}</span></div><template v-if="step===1&&id==='basic'"><label>{{ $t("kyc.fullName") }}<input v-model="form.fullName" :placeholder="$t(&quot;kyc.enterFullName&quot;)"/></label><label>{{ $t("kyc.idType") }}<select v-model="form.idType"><option disabled value="">{{ $t("kyc.selectIdType") }}</option><option :value="&quot;kyc.idCard&quot;">{{ $t("kyc.idCard") }}</option><option :value="&quot;kyc.passport&quot;">{{ $t("kyc.passport") }}</option><option :value="&quot;kyc.driverLicense&quot;">{{ $t("kyc.driverLicense") }}</option></select></label><label>{{ $t("kyc.idNumber") }}<input v-model="form.idNumber" :placeholder="$t(&quot;kyc.enterIdNumber&quot;)"/></label><label>{{ $t("kyc.country") }}<select v-model="form.country"><option disabled value="">{{ $t("kyc.enterCountry") }}</option><option v-for="c in ['United States','United Kingdom','Taiwan','Hong Kong','China','Japan','Korea','Germany','France','Philippines','Singapore']" :value="c">{{ $t(c) }}</option></select></label><button class="primary-button wide-button">{{ $t("kyc.nextStep") }}</button></template><template v-else><p class="notice">{{ $t("account.ui.useFictionalDetailsAndDemoImagesFilesStayOn") }}</p><label v-for="[key,label] in id==='basic'?[['front',&quot;kyc.idFront&quot;],['back',&quot;kyc.idBack&quot;],['selfie',&quot;kyc.selfie&quot;]]:[['handheld',&quot;kyc.advanced.handheldLabel&quot;],['proof',&quot;kyc.advanced.assetProofTitle&quot;]]" :key="key">{{ $t(label) }}<span class="upload-box"><Icon name="layers"/>{{ files[key]||t('kyc.clickToUpload') }}<input type="file" accept="image/png,image/jpeg,application/pdf" :aria-label="$t(label)" @change="selectFile(key,$event)"/></span></label><button v-if="id==='basic'" type="button" class="secondary-button" @click="step=1">{{ $t("aiQuant.quantFund.interestRecords.back") }}</button><button class="primary-button wide-button">{{ $t("kyc.submit") }}</button></template></form></template>
