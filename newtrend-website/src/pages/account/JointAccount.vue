<script setup>
import {t} from '../../i18n'
import {reactive,ref} from 'vue'
import {account} from '../../account'
import {path} from '../../data'
import {notifyError,notifySuccess,useUploads} from './accountForm.js'
// 1 overview · 2 KYC required · 3 application form.
const step=ref(1),form=reactive({relationship:'',uid:''})
const {files,selectFile}=useUploads()
function applyJoint(){step.value=account.kyc==='approved'?3:2}
function submitJoint(){
 if(!form.relationship||!/^\d{5,12}$/.test(form.uid)||form.uid==='10000001'||!files.relationship)return notifyError('jointAccount.apply.incomplete')
 account.joint={uid:form.uid,relationship:form.relationship,status:'pending_consent'}
 step.value=1
 notifySuccess('jointAccount.apply.submitted')
}
</script>
<template><template v-if="step===2"><div class="card section-gap"><h2>{{ $t(t('jointAccount.apply.kycRequiredTitle')) }}</h2><p class="muted section-gap">{{ $t(t('jointAccount.apply.kycRequiredDesc')) }}</p><div class="device-actions"><button class="secondary-button" @click="step=1">{{ $t("aiQuant.create.cancel") }}</button><RouterLink class="primary-button" :to="path('/kyc')">{{ $t("c2c.common.goKyc") }}</RouterLink></div></div></template><form v-else-if="step===3" class="account-form" @submit.prevent="submitJoint"><label>{{ $t("jointAccount.apply.relationshipType") }}<select v-model="form.relationship"><option disabled value="">{{ $t("c2c.quotes.select") }}</option><option v-for="r in [&quot;jointAccount.relationship.spouse&quot;,&quot;jointAccount.relationship.family&quot;,&quot;jointAccount.relationship.partner&quot;,&quot;jointAccount.relationship.agent&quot;]" :value="r">{{ $t(r) }}</option></select></label><label>{{ $t("jointAccount.apply.memberUid") }}<input v-model="form.uid" :placeholder="$t(&quot;jointAccount.apply.memberUidPlaceholder&quot;)" inputmode="numeric"/></label><label>{{ $t("jointAccount.apply.proofSection") }}<input type="file" accept="image/jpeg,image/png,application/pdf" @change="selectFile('relationship',$event)"/></label><p class="notice">{{ $t("account.ui.thisDemoDoesNotOpenARealJointAccount") }}</p><button class="primary-button">{{ $t("jointAccount.apply.submit") }}</button><button type="button" class="secondary-button" @click="step=1">{{ $t("aiQuant.create.cancel") }}</button></form><template v-else><div class="joint-holder card section-gap"><small>{{ $t("jointAccount.holder.title") }}</small><div class="two-cols section-gap"><div><h2>{{ account.name }}</h2><p class="mini-label">{{ $t("account.ui.primaryApplicantYou") }}</p></div><div><h2 class="muted">{{ $t(account.joint?account.joint.uid:"jointAccount.holder.vacant") }}</h2><p class="mini-label">{{ $t("jointAccount.apply.memberSection") }}</p></div></div></div><ul class="joint-points"><li v-for="k in ['ownership','switch','exit']">{{ $t(t('jointAccount.intro.points.'+k)) }}</li></ul><p v-if="account.joint" class="notice">{{ $t(t('jointAccount.application.title.pending_consent')) }}</p><button v-else class="primary-button" @click="applyJoint">{{ $t("jointAccount.apply.start") }}</button><p class="mini-label section-gap">{{ $t(t('jointAccount.intro.prepare')) }}<br/>{{ $t(t('jointAccount.intro.kycOnly')) }}</p><details v-for="k in ['memberCan','memberSteps','dissolve']" :key="k" class="account-faq"><summary>{{ $t(t('jointAccount.faq.'+k+'.q')) }}</summary><p>{{ $t(t('jointAccount.faq.'+k+'.a')) }}</p></details></template></template>
