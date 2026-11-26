<script setup>
import LineIcon from '../ui/LineIcon.vue'
import FeedbackToast from '../../platform/FeedbackToast.js'
import {computed,ref} from 'vue'
import Skeleton from '../ui/Skeleton.vue'
import RequestState from '../ui/RequestState.vue'
import {c2cErrorKey,deletePaymentAccount,listPaymentAccounts} from '../../api/c2c.js'
import {invalidate,useRequest} from '../../composables/useRequest.js'
import {openModal} from '../../session'
const feedback=ref('')
const request=useRequest(listPaymentAccounts,{tags:['c2c']})
const loading=computed(()=>request.status.value==='loading')
const accounts=computed(()=>request.data.value||[])
function edit(account){openModal('c2c-account',account?'c2c.accounts.form.editTitle':'c2c.accounts.form.createTitle',{account,onSaved:()=>{feedback.value=account?'c2c.accounts.form.saveSuccess':'c2c.accounts.form.createSuccess'}})}
function remove(account){openModal('account-confirm','c2c.accounts.deleteConfirm.title',{focusCancel:true,description:'c2c.accounts.deleteConfirm.hint',confirmLabel:'c2c.accounts.deleteConfirm.confirm',async onConfirm(){
  // Async confirm: busy confirm action, close paths held; a rejection (e.g. account in use) keeps it open with a toast.
  try{await deletePaymentAccount(account.id)}catch(cause){throw new Error(c2cErrorKey(cause))}
  feedback.value='c2c.accounts.deleteSuccess';invalidate('c2c')
 }})}
</script>
<template>
 <div class="c2c-heading"><div><h1>{{ $t('c2c.accounts.title') }}</h1><p>{{ $t('c2c.accounts.subtitle') }}</p></div><button class="c2c-add" @click="edit()">＋ {{ $t('c2c.accounts.add') }}</button></div>
 <FeedbackToast v-if="feedback" type="success" :source="() => (feedback) ? ($t(feedback)) : ''"/>
 <RequestState v-if="request.status.value==='error'" :status="request.status.value" :error="request.error.value" class="c2c-request-frame" @retry="request.refresh"/>
 <div v-else-if="loading" class="c2c-account-grid"><span role="status" class="sr-only">{{ $t('common.loading') }}</span><article v-for="n in 2" :key="n" class="c2c-account-card" aria-hidden="true"><header><strong><Skeleton inline width="160px"/></strong><span><Skeleton inline width="56px"/></span></header><dl><div v-for="k in 3" :key="k"><dt><Skeleton inline width="80px"/></dt><dd><Skeleton inline width="140px"/></dd></div></dl><footer><span><Skeleton inline width="48px"/></span><span><Skeleton inline width="48px"/></span></footer></article></div>
 <div v-else-if="!accounts.length" class="c2c-empty c2c-accounts-empty"><LineIcon set="c2c" name="bank"/><p>{{ $t('c2c.accounts.empty') }}</p><small>{{ $t('c2c.accounts.emptyHint') }}</small><button class="c2c-add" @click="edit()">＋ {{ $t('c2c.accounts.add') }}</button></div>
 <div v-else class="c2c-account-grid"><article v-for="account in accounts" :key="account.id" class="c2c-account-card"><header><strong><LineIcon set="c2c" name="bank"/>{{ account.bankName }}</strong><span class="c2c-status">{{ $t('c2c.accounts.status.active') }}</span></header><dl><div><dt>{{ $t('c2c.accounts.form.fiatCurrency') }}</dt><dd>{{ account.currency }}</dd></div><div><dt>{{ $t('c2c.accounts.form.accountName') }}</dt><dd>{{ account.accountName }}</dd></div><div><dt>{{ $t('c2c.accounts.form.accountNumber') }}</dt><dd>{{ account.accountNumber }}</dd></div></dl><footer><button @click="edit(account)">{{ $t('c2c.accounts.edit') }}</button><button class="c2c-danger" @click="remove(account)">{{ $t('c2c.accounts.delete') }}</button></footer></article></div>
</template>
