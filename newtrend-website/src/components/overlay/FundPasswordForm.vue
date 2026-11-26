<script setup>
// 設置 / 修改資金密碼 dialog body (Overlay type 'fund-password'). Setting asks for a 6-digit number twice; changing
// also asks for the current one. Saved through the profile API (local mock, shared with withdrawals). Digits only;
// results are toasts; close paths are held while saving. `data.onSaved` lets a caller (the withdraw page) continue.
import {reactive,shallowRef,watch} from 'vue'
import {message} from 'ant-design-vue'
import Spinner from '../ui/Spinner.vue'
import {t} from '../../i18n'
import {profileErrorKey,saveFundPassword} from '../../api/profile.js'
import {invalidate,useMutation} from '../../composables/useRequest.js'
const props=defineProps({set:Boolean,onSaved:Function})
const emit=defineEmits(['state','close'])
const form=reactive({old:'',password:'',confirm:''}),invalid=shallowRef('')
const saving=useMutation(saveFundPassword),busy=saving.pending
watch([form,busy],()=>emit('state',{dirty:Boolean(form.old||form.password||form.confirm),busy:busy.value}),{immediate:true,deep:true})
const digits=(key,event)=>{form[key]=event.target.value.replace(/\D/g,'').slice(0,6);event.target.value=form[key];invalid.value=''}
function fail(field,key){invalid.value=field;message.error(t(key))}
async function submit(){
 if(busy.value)return
 if(props.set&&!form.old)return fail('old','profile.center.fundPassword.oldRequired')
 if(form.password.length!==6)return fail('password','profile.center.fundPassword.sixDigits')
 if(form.password!==form.confirm)return fail('confirm','profile.center.fundPassword.mismatch')
 try{await saving.run({oldPassword:form.old,password:form.password,confirm:form.confirm})}
 catch(cause){const key=profileErrorKey(cause);return fail(key.includes('old')||key.includes('same')?'old':'password',key)}
 message.success(t(props.set?'profile.center.fundPassword.changed':'profile.center.fundPassword.saved'))
 invalidate('fund-password');Object.assign(form,{old:'',password:'',confirm:''})
 emit('close');props.onSaved?.()
}
</script>
<template>
<form class="fund-form" novalidate @submit.prevent="submit">
 <p class="fund-lead">{{ $t('profile.center.fundPassword.lead') }}</p>
 <label v-if="set" class="fund-field"><span>{{ $t('profile.center.fundPassword.old') }}</span><input :value="form.old" type="password" inputmode="numeric" autocomplete="off" maxlength="6" :placeholder="$t('profile.center.fundPassword.oldPlaceholder')" :readonly="busy" :aria-invalid="invalid==='old'||undefined" @input="digits('old',$event)"/></label>
 <label class="fund-field"><span>{{ $t(set?'profile.center.fundPassword.new':'profile.center.fundPassword.password') }}</span><input :value="form.password" type="password" inputmode="numeric" autocomplete="new-password" maxlength="6" :placeholder="$t('profile.center.fundPassword.placeholder')" :readonly="busy" :aria-invalid="invalid==='password'||undefined" aria-describedby="fund-rule" @input="digits('password',$event)"/></label>
 <p id="fund-rule" class="fund-rule" :class="{ok:form.password.length===6}">{{ $t('profile.center.fundPassword.rule') }}</p>
 <label class="fund-field"><span>{{ $t('profile.center.fundPassword.confirm') }}</span><input :value="form.confirm" type="password" inputmode="numeric" autocomplete="new-password" maxlength="6" :placeholder="$t('profile.center.fundPassword.confirmPlaceholder')" :readonly="busy" :aria-invalid="invalid==='confirm'||undefined" @input="digits('confirm',$event)"/></label>
 <button type="submit" class="fund-primary" :class="{'is-busy':busy}" :aria-disabled="busy||undefined" :aria-busy="busy||undefined"><Spinner v-if="busy"/>{{ $t(set?'profile.center.fundPassword.confirmChange':'profile.center.fundPassword.confirmSet') }}</button>
</form>
</template>
<style scoped>
.fund-form{display:grid;gap:16px}
.fund-lead{margin:0;color:var(--nt-accent);font-size:13px;line-height:20px}
.fund-field{display:grid;gap:8px;font-size:14px;line-height:20px;color:#e6e7e9}
.fund-field input{min-height:48px;padding:0 14px;border:1px solid #ffffff1f;border-radius:12px;background:#0c0e10;color:#fff;font-size:16px;letter-spacing:.3em;font-variant-numeric:tabular-nums}
.fund-field input::placeholder{letter-spacing:0;font-size:14px;color:#6b6d70}
.fund-field input:focus-visible{outline:none;background:#11151a}
.fund-field input[aria-invalid=true]{color:#ff6b84}
.fund-rule{margin:-8px 0 0;color:#87888a;font-size:12px;line-height:18px}
.fund-rule::before{content:'○';margin-right:8px}
.fund-rule.ok{color:#2bc287}
.fund-rule.ok::before{content:'●'}
.fund-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;margin-top:4px;border-radius:12px;background:var(--nt-accent);color:var(--nt-bg);font-size:15px;font-weight:600}
.fund-primary:hover{background:#b6ff6a}
.fund-primary.is-busy{opacity:.8;cursor:progress}
.fund-primary:focus-visible{outline:none;text-decoration:underline}
</style>
