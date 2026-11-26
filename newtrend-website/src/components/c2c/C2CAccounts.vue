<script setup>
import LineIcon from '../ui/LineIcon.vue'
import FeedbackToast from '../../platform/FeedbackToast.js'
import {ref} from 'vue'
import {removeAccount} from '../../utils/c2cState'
import {c2cState} from '../../c2cStore'
import {openModal} from '../../session'
const feedback=ref('')
function edit(account){openModal('c2c-account',account?'c2c.accounts.form.editTitle':'c2c.accounts.form.createTitle',{account,onSaved:()=>{feedback.value=account?'c2c.accounts.form.saveSuccess':'c2c.accounts.form.createSuccess'}})}
function remove(account){openModal('account-confirm','c2c.accounts.deleteConfirm.title',{focusCancel:true,description:'c2c.accounts.deleteConfirm.hint',confirmLabel:'c2c.accounts.deleteConfirm.confirm',onConfirm:()=>{removeAccount(c2cState,account.id);feedback.value='c2c.accounts.deleteSuccess'}})}
</script>
<template>
 <div class="c2c-heading"><div><h1>{{ $t('c2c.accounts.title') }}</h1><p>{{ $t('c2c.accounts.subtitle') }}</p></div><button class="c2c-add" @click="edit()">＋ {{ $t('c2c.accounts.add') }}</button></div>
 <FeedbackToast v-if="feedback" type="success" :source="() => (feedback) ? ($t(feedback)) : ''"/>
 <div v-if="!c2cState.accounts.length" class="c2c-empty c2c-accounts-empty"><LineIcon set="c2c" name="bank"/><p>{{ $t('c2c.accounts.empty') }}</p><small>{{ $t('c2c.accounts.emptyHint') }}</small><button class="c2c-add" @click="edit()">＋ {{ $t('c2c.accounts.add') }}</button></div>
 <div v-else class="c2c-account-grid"><article v-for="account in c2cState.accounts" :key="account.id" class="c2c-account-card"><header><strong><LineIcon set="c2c" name="bank"/>{{ account.bankName }}</strong><span class="c2c-status">{{ $t('c2c.accounts.status.active') }}</span></header><dl><div><dt>{{ $t('c2c.accounts.form.fiatCurrency') }}</dt><dd>{{ account.currency }}</dd></div><div><dt>{{ $t('c2c.accounts.form.accountName') }}</dt><dd>{{ account.accountName }}</dd></div><div><dt>{{ $t('c2c.accounts.form.accountNumber') }}</dt><dd>{{ account.accountNumber }}</dd></div></dl><footer><button @click="edit(account)">{{ $t('c2c.accounts.edit') }}</button><button class="c2c-danger" @click="remove(account)">{{ $t('c2c.accounts.delete') }}</button></footer></article></div>
</template>
