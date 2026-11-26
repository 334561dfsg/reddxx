<script setup>
// 輸入資金密碼 dialog body (Overlay type 'fund-password-verify'), opened by the withdraw page after the form passed
// the server pre-check. Shows what will be withdrawn, takes the 6-digit fund password and calls `onSubmit(password)`,
// which performs the withdrawal. A wrong fund password keeps the dialog open; any other failure closes it so the
// form can be fixed. Results are toasts; close paths are held while submitting.
import {nextTick,ref,shallowRef,watch} from 'vue'
import {message} from 'ant-design-vue'
import Spinner from '../ui/Spinner.vue'
import {t} from '../../i18n'
import {walletErrorKey} from '../../api/wallet.js'
const props=defineProps({summary:{type:Object,required:true},onSubmit:{type:Function,required:true}})
const emit=defineEmits(['state','close'])
const code=ref(''),busy=shallowRef(false),invalid=shallowRef(false),input=ref(null)
watch([code,busy],()=>emit('state',{dirty:Boolean(code.value),busy:busy.value}),{immediate:true})
function onInput(event){code.value=event.target.value.replace(/\D/g,'').slice(0,6);event.target.value=code.value;invalid.value=false}
async function submit(){
 if(busy.value)return
 if(code.value.length!==6){invalid.value=true;return message.error(t('assets.withdraw.error.fundPasswordRequired'))}
 busy.value=true
 try{await props.onSubmit(code.value)}
 catch(cause){
  const key=walletErrorKey(cause)
  message.error(t(key,cause?.params))
  busy.value=false
  if(key.includes('fundPassword')){invalid.value=true;code.value='';await nextTick();input.value?.focus();return}
  return emit('close')
 }
 busy.value=false
 emit('close')
}
</script>
<template>
<form class="fund-prompt" novalidate @submit.prevent="submit">
 <dl class="fund-summary">
  <div><dt>{{ $t('assets.withdraw.totalDeduct') }}</dt><dd>{{ summary.amount }} {{ summary.coin }}</dd></div>
  <div><dt>{{ $t('assets.withdraw.fee') }}</dt><dd>{{ summary.fee }} {{ summary.coin }}</dd></div>
  <div class="total"><dt>{{ $t('assets.withdraw.received') }}</dt><dd>{{ summary.received }} {{ summary.coin }}</dd></div>
  <div class="address"><dt>{{ $t('assets.withdraw.address') }}</dt><dd>{{ summary.address }}</dd></div>
 </dl>
 <label class="fund-field"><span>{{ $t('assets.withdraw.fundPassword') }}</span><input ref="input" data-prompt-initial-focus :value="code" type="password" inputmode="numeric" autocomplete="off" maxlength="6" :placeholder="$t('assets.withdraw.fundPasswordPlaceholder')" :readonly="busy" :aria-invalid="invalid||undefined" @input="onInput"/></label>
 <button type="submit" class="fund-primary" :class="{'is-busy':busy}" :aria-disabled="busy||undefined" :aria-busy="busy||undefined"><Spinner v-if="busy"/>{{ $t(busy?'assets.withdraw.submitting':'assets.withdraw.confirmWithdraw') }}</button>
</form>
</template>
<style scoped>
.fund-prompt{display:grid;gap:16px}
.fund-summary{display:grid;gap:8px;margin:0;padding:14px 16px;border:1px solid #ffffff14;border-radius:12px;background:#0c0e10}
.fund-summary>div{display:flex;justify-content:space-between;gap:12px;font-size:13px;line-height:20px}
.fund-summary dt{color:#87888a;flex-shrink:0}
.fund-summary dd{margin:0;color:#fff;text-align:right;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.fund-summary .total{padding-top:8px;border-top:1px solid #ffffff14}
.fund-summary .total dd{color:#2bc287;font-weight:600}
.fund-summary .address dd{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
.fund-field{display:grid;gap:8px;font-size:14px;color:#e6e7e9}
.fund-field input{min-height:52px;padding:0 14px;border:1px solid #ffffff1f;border-radius:12px;background:#0c0e10;color:#fff;font-size:20px;letter-spacing:.5em;text-align:center}
.fund-field input::placeholder{letter-spacing:0;font-size:14px;color:#6b6d70}
.fund-field input:focus-visible{outline:none;background:#11151a}
.fund-field input[aria-invalid=true]{color:#ff6b84}
.fund-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;border-radius:12px;background:var(--nt-accent);color:var(--nt-bg);font-size:15px;font-weight:600}
.fund-primary:hover{background:#b6ff6a}
.fund-primary.is-busy{opacity:.8;cursor:progress}
.fund-primary:focus-visible{outline:none;text-decoration:underline}
</style>
