<script setup>
import FeedbackToast from '../../platform/FeedbackToast.js'
import {reactive,computed,ref,watch} from 'vue'
import {c2cErrorKey,savePaymentAccount} from '../../api/c2c.js'
import {invalidate,useMutation} from '../../composables/useRequest.js'
const props=defineProps({account:Object})
const emit=defineEmits(['state','saved'])
const draft=reactive({currency:props.account?.currency||'',accountName:'',accountNumber:'',bankName:'',branch:'',swiftCode:'',routingNumber:'',phone:'',bankAddress:'',accountAddress:'',remark:'',...props.account})
const initial=JSON.stringify(draft),error=ref(''),saved=ref(false)
const saving=useMutation(savePaymentAccount)
const valid=computed(()=>draft.currency&&draft.accountName.trim()&&draft.accountNumber.trim()&&draft.bankName.trim()&&draft.remark.length<=255)
watch([()=>({...draft}),saving.pending],()=>emit('state',{valid:Boolean(valid.value),dirty:JSON.stringify(draft)!==initial,busy:saving.pending.value}),{immediate:true})
// Saves through the API; the dialog shows busy and holds its close paths until the request settles.
async function submit(){
 if(!valid.value||saved.value||saving.pending.value)return
 error.value=''
 try{await saving.run({...draft});saved.value=true;invalidate('c2c');emit('saved')}
 catch(cause){error.value=c2cErrorKey(cause)}
}
</script>
<template><form id="c2c-account-form" class="c2c-bank-form" @submit.prevent="submit">
 <div class="c2c-form-columns"><label>{{ $t('c2c.accounts.form.fiatCurrency') }}<select v-model="draft.currency" required><option value="" disabled>{{ $t('c2c.accounts.form.fiatCurrencyPlaceholder') }}</option><option value="USDT">USDT</option></select></label><label>{{ $t('c2c.accounts.form.accountType') }}<input :value="$t('c2c.accounts.form.accountTypeBank')" disabled/></label></div>
 <label>{{ $t('c2c.accounts.form.accountName') }}<input v-model="draft.accountName" required maxlength="100" :placeholder="$t('c2c.accounts.form.accountNamePlaceholder')"/><small>{{ $t('c2c.accounts.form.accountNameHint') }}</small></label>
 <label>{{ $t('c2c.accounts.form.accountNumber') }}<input v-model="draft.accountNumber" required maxlength="100" :placeholder="$t('c2c.accounts.form.accountNumberPlaceholder')"/></label>
 <label>{{ $t('c2c.accounts.form.bankName') }}<input v-model="draft.bankName" required maxlength="100" :placeholder="$t('c2c.accounts.form.bankNamePlaceholder')"/></label>
 <div class="c2c-form-columns"><label v-for="key in ['branch','swiftCode','routingNumber','phone']" :key="key">{{ $t('c2c.accounts.form.'+key) }}<input v-model="draft[key]" maxlength="100"/></label></div>
 <label v-for="key in ['bankAddress','accountAddress','remark']" :key="key">{{ $t('c2c.accounts.form.'+key) }}<input v-model="draft[key]" maxlength="255"/></label>
 <FeedbackToast v-if="error" type="error" :source="() => (error) ? ($t(error)) : ''"></FeedbackToast>
</form></template>
