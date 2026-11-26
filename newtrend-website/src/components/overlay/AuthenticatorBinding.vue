<script setup>
// 綁定谷歌驗證器 dialog body (Overlay type 'authenticator'), after gmxx.io: step 1 shows the QR code and key (copy)
// with "已在驗證器中添加，下一步"; step 2 asks for the 6-digit dynamic code → 驗證並綁定, with 返回 to step 1.
// mode 'unbind' asks for a current code to turn it off. Everything goes through the profile API (local mock: real TOTP
// from the scanned secret, or the demo code). While a request runs, the overlay's close paths are held.
import {computed,ref,shallowRef,watch,nextTick} from 'vue'
import QRCode from 'qrcode'
import {message} from 'ant-design-vue'
import LineIcon from '../ui/LineIcon.vue'
import Skeleton from '../ui/Skeleton.vue'
import Spinner from '../ui/Spinner.vue'
import RequestState from '../ui/RequestState.vue'
import {t} from '../../i18n'
import {account} from '../../account'
import {DEMO_TOTP,bindAuthenticator,createAuthenticatorSecret,profileErrorKey,unbindAuthenticator} from '../../api/profile.js'
import {invalidate,useMutation,useRequest} from '../../composables/useRequest.js'
import {copyText} from '../../pages/account/accountForm.js'
const props=defineProps({mode:{type:String,default:'bind'}})
const emit=defineEmits(['state','close'])
const step=ref(props.mode==='unbind'?2:1),code=ref(''),invalid=ref(false),input=ref(null)
const secret=useRequest(()=>props.mode==='bind'?createAuthenticatorSecret({account:account.email||'demo'}):Promise.resolve(null),{immediate:props.mode==='bind'})
const qr=shallowRef('')
watch(()=>secret.data.value?.uri,async uri=>{qr.value=uri?await QRCode.toDataURL(uri,{width:168,margin:1}):''},{immediate:true})
const submitting=useMutation(payload=>props.mode==='bind'?bindAuthenticator(payload):unbindAuthenticator(payload)),busy=submitting.pending
watch([code,busy],()=>emit('state',{dirty:Boolean(code.value),busy:busy.value}),{immediate:true})
const grouped=computed(()=>(secret.data.value?.secret||'').replace(/(.{4})/g,'$1 ').trim())
async function next(){step.value=2;await nextTick();input.value?.focus()}
function back(){if(!busy.value){step.value=1;code.value='';invalid.value=false}}
function onInput(event){code.value=event.target.value.replace(/\D/g,'').slice(0,6);event.target.value=code.value;invalid.value=false}
async function submit(){
 if(busy.value)return
 if(code.value.length!==6){invalid.value=true;return message.error(t('profile.center.authenticator.codeRequired'))}
 try{await submitting.run({code:code.value})}
 catch(cause){invalid.value=true;return message.error(t(profileErrorKey(cause)))}
 message.success(t(props.mode==='bind'?'profile.center.authenticator.bound':'profile.center.authenticator.unbound'))
 invalidate('authenticator');code.value='';emit('close')
}
</script>
<template>
<div class="mfa">
 <template v-if="step===1">
  <p class="mfa-lead">{{ $t('profile.center.authenticator.lead') }}</p>
  <section class="mfa-panel">
   <p class="mfa-caption">{{ $t('profile.center.authenticator.scan') }}</p>
   <RequestState :status="secret.status.value" :error="secret.error.value" @retry="secret.refresh">
    <template #loading><Skeleton width="168px" height="168px" class="mfa-qr-skeleton"/><div class="mfa-key"><small>{{ $t('profile.center.authenticator.key') }}</small><Skeleton inline width="240px"/></div></template>
    <img v-if="qr" class="mfa-qr" :src="qr" width="168" height="168" :alt="$t('profile.center.authenticator.qrAlt')"/>
    <Skeleton v-else width="168px" height="168px" class="mfa-qr-skeleton"/>
    <div class="mfa-key"><small>{{ $t('profile.center.authenticator.key') }}</small><code>{{ grouped }}</code><button type="button" class="mfa-copy" @click="copyText(secret.data.value.secret)"><LineIcon name="copy"/>{{ $t('profile.center.authenticator.copyKey') }}</button></div>
   </RequestState>
  </section>
  <button type="button" class="mfa-primary" :disabled="secret.status.value!=='ready'" @click="next">{{ $t('profile.center.authenticator.next') }}</button>
 </template>
 <form v-else class="mfa-form" novalidate @submit.prevent="submit">
  <button v-if="mode==='bind'" type="button" class="mfa-back" :disabled="busy" @click="back"><LineIcon name="arrow-left"/>{{ $t('profile.center.authenticator.back') }}</button>
  <p class="mfa-lead">{{ $t(mode==='bind'?'profile.center.authenticator.enterCode':'profile.center.authenticator.unbindLead') }}</p>
  <label class="mfa-field"><span>{{ $t('profile.center.authenticator.code') }}</span><input ref="input" :value="code" class="mfa-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" :readonly="busy" :aria-invalid="invalid||undefined" aria-describedby="mfa-demo" @input="onInput"/></label>
  <p id="mfa-demo" class="mfa-demo">{{ $t('profile.center.authenticator.demoHint',{code:DEMO_TOTP}) }}</p>
  <button type="submit" class="mfa-primary" :class="{danger:mode==='unbind','is-busy':busy}" :aria-disabled="busy||undefined" :aria-busy="busy||undefined"><Spinner v-if="busy"/>{{ $t(mode==='bind'?'profile.center.authenticator.verifyBind':'profile.center.authenticator.confirmUnbind') }}</button>
 </form>
</div>
</template>
<style scoped>
.mfa,.mfa-form{display:grid;gap:16px}
.mfa-lead{margin:0;color:var(--nt-accent);font-size:13px;line-height:20px}
.mfa-panel{display:grid;justify-items:center;gap:14px;padding:16px;border:1px solid #ffffff14;border-radius:12px;background:#0c0e10}
.mfa-panel :deep(.nt-request-loading){display:grid;justify-items:center;gap:14px;width:100%}
.mfa-caption{margin:0;color:#c4c6c9;font-size:13px}
.mfa-qr{display:block;width:168px;height:168px;border-radius:8px;background:#fff}
.mfa-qr-skeleton{border-radius:8px}
.mfa-key{display:grid;gap:4px;width:100%;padding:12px;border-radius:10px;background:#ffffff08}
.mfa-key small{color:#87888a;font-size:11px;letter-spacing:.06em;text-transform:uppercase}
.mfa-key code{color:var(--nt-accent);font-size:13px;line-height:20px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}
.mfa-copy{display:inline-flex;align-items:center;gap:4px;justify-self:start;min-height:28px;padding:0;color:var(--nt-accent);font-size:13px;font-weight:500}
.mfa-copy svg,.mfa-back svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.mfa-copy:focus-visible,.mfa-back:focus-visible{outline:none;text-decoration:underline}
.mfa-back{display:inline-flex;align-items:center;gap:6px;justify-self:start;min-height:28px;margin-top:-8px;padding:0;color:#a0a1a2;font-size:13px}
.mfa-back:hover{color:#fff}
.mfa-field{display:grid;gap:8px;font-size:14px;color:#e6e7e9}
.mfa-code{min-height:52px;padding:0 14px;border:1px solid #ffffff1f;border-radius:12px;background:#0c0e10;color:#fff;font-size:22px;letter-spacing:.5em;text-align:center;font-variant-numeric:tabular-nums}
.mfa-code::placeholder{color:#4a4d52}
.mfa-code:focus-visible{outline:none;background:#11151a}
.mfa-code[aria-invalid=true]{color:#ff6b84}
.mfa-demo{margin:-8px 0 0;color:#87888a;font-size:12px;line-height:18px}
.mfa-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;border-radius:12px;background:var(--nt-accent);color:var(--nt-bg);font-size:15px;font-weight:600}
.mfa-primary:hover:not(:disabled){background:#b6ff6a}
.mfa-primary.danger{background:#ff4466;color:#fff}
.mfa-primary.danger:hover{background:#ff5c79}
.mfa-primary:disabled{opacity:.5;cursor:not-allowed}
.mfa-primary.is-busy{opacity:.8;cursor:progress}
.mfa-primary:focus-visible{outline:none;text-decoration:underline}
</style>
