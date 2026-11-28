<script setup>
// 登入裝置管理 dialog body (Overlay type 'devices'), after gmxx.io's Device Management: one card per login session
// (device icon, "device · browser", 本機 chip on the current one, OS version · IP, last active time). Remote sessions
// can be ended; the current one cannot. Sessions come from the profile API (local mock). The footer explains the
// "only this device" state and that an ended device must sign in again.
import {computed,shallowRef,watch} from 'vue'
import {message} from 'ant-design-vue'
import LineIcon from '../ui/LineIcon.vue'
import Skeleton from '../ui/Skeleton.vue'
import Spinner from '../ui/Spinner.vue'
import RequestState from '../ui/RequestState.vue'
import {t} from '../../i18n'
import {endSession,listSessions,profileErrorKey} from '../../api/profile.js'
import {useRequest} from '../../composables/useRequest.js'
const emit=defineEmits(['state'])

// What the server would read from this request: device, browser and OS from the user agent.
function clientDevice(){
 const ua=typeof navigator==='undefined'?'':navigator.userAgent
 const mobile=/iPhone|Android.+Mobile/.test(ua)
 const device=/iPhone/.test(ua)?'iPhone':/iPad/.test(ua)?'iPad':/Android/.test(ua)?'Android':/Mac OS X/.test(ua)?'Mac':/Windows/.test(ua)?'Windows':/Linux/.test(ua)?'Linux':''
 const browser=/Edg\//.test(ua)?'Edge':/Firefox\//.test(ua)?'Firefox':/Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':''
 const os=/iPhone|iPad/.test(ua)?'iOS':/Android/.test(ua)?'Android':/Mac OS X/.test(ua)?'macOS':/Windows/.test(ua)?'Windows':/Linux/.test(ua)?'Linux':''
 const osVersion=(ua.match(/(?:Mac OS X|iPhone OS|Android|Windows NT) ([\d_.]+)/)?.[1]||'').replace(/_/g,'.')
 return {device,browser,os,osVersion,kind:mobile?'mobile':'desktop'}
}
const sessions=useRequest(()=>listSessions({current:clientDevice()}),{tags:['sessions']})
const ending=shallowRef('')
watch(ending,value=>emit('state',{busy:Boolean(value)}),{immediate:true})
const others=computed(()=>(sessions.data.value||[]).filter(s=>!s.current).length)
const time=value=>{const d=new Date(value),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`}
const title=s=>[s.device||t('profile.center.devices.unknown'),s.browser].filter(Boolean).join(' · ')
const detail=s=>[s.os?t('profile.center.devices.version',{os:s.os,version:s.osVersion||'–'}):'',s.ip||'–'].filter(Boolean).join(' · ')
async function end(session){
 if(ending.value)return
 ending.value=session.id
 try{await endSession(session.id);message.success(t('profile.center.devices.ended',{device:title(session)}));await sessions.refresh()}
 catch(cause){message.error(t(profileErrorKey(cause)))}
 finally{ending.value=''}
}
</script>
<template>
<div class="device-sessions">
 <p class="device-subtitle">{{ $t('profile.center.devices.subtitle') }}</p>
 <RequestState :status="sessions.status.value" :error="sessions.error.value" @retry="sessions.refresh">
  <template #loading><ul class="device-list"><li v-for="n in 3" :key="n" class="device-card"><Skeleton width="40px" height="40px" class="device-icon-skeleton"/><span class="device-text"><Skeleton inline width="120px"/><small><Skeleton inline width="150px"/></small><small><Skeleton inline width="104px"/></small></span></li></ul></template>
  <ul class="device-list" :aria-busy="sessions.refreshing.value||undefined">
   <li v-for="s in sessions.data.value" :key="s.id" class="device-card" :class="{current:s.current}">
    <span class="device-icon" aria-hidden="true"><LineIcon :name="s.kind==='mobile'?'smartphone':'monitor'"/></span>
    <span class="device-text"><strong>{{ title(s) }}<span v-if="s.current" class="device-chip">{{ $t('profile.center.devices.thisDevice') }}</span></strong><small>{{ detail(s) }}</small><small class="device-time"><time :datetime="new Date(s.lastActive).toISOString()">{{ time(s.lastActive) }}</time></small></span>
    <button v-if="!s.current" type="button" class="device-end" :disabled="Boolean(ending)&&ending!==s.id" :aria-busy="ending===s.id||undefined" :aria-label="$t('profile.center.devices.endLabel',{device:title(s)})" @click="end(s)"><Spinner v-if="ending===s.id"/>{{ $t('profile.center.devices.end') }}</button>
   </li>
  </ul>
  <p v-if="!others" class="device-note strong">{{ $t('profile.center.devices.onlyCurrent') }}</p>
 </RequestState>
 <p class="device-note">{{ $t('profile.center.devices.endHint') }}</p>
</div>
</template>
<style scoped>
.device-sessions{display:grid;gap:16px}
.device-subtitle{margin:0;color:var(--nt-text-dim);font-size:13px;line-height:20px}
.device-list{display:grid;gap:10px;margin:0;padding:0;list-style:none;max-height:min(360px,50vh);overflow-y:auto}
.device-card{display:flex;align-items:center;gap:12px;padding:14px;border:1px solid var(--nt-border-strong);border-radius:var(--nt-radius-panel);background:#0c0e10}
.device-card.current{background:#a5ff4a0a}
.device-icon{display:grid;place-items:center;flex-shrink:0;width:40px;height:40px;border-radius:10px;background:#1d2733;color:var(--nt-accent)}
.device-icon svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.device-icon-skeleton{flex-shrink:0;border-radius:10px}
.device-text{flex:1;display:grid;gap:2px;min-width:0}
.device-text strong{display:flex;align-items:center;gap:8px;font-size:14px;line-height:20px;font-weight:600;overflow-wrap:anywhere}
.device-text small{color:var(--nt-text-dim);font-size:12px;line-height:18px;overflow-wrap:anywhere}
.device-time{font-variant-numeric:tabular-nums}
.device-chip{flex-shrink:0;padding:1px 8px;border-radius:var(--nt-radius-pill);background:#a5ff4a1f;color:var(--nt-accent);font-size:11px;line-height:16px;font-weight:500}
.device-end{display:inline-flex;align-items:center;gap:6px;flex-shrink:0;min-height:32px;padding:5px 14px;border-radius:var(--nt-radius-pill);background:#ff44661a;color:#ff6b84;font-size:13px;font-weight:500}
.device-end:hover:not(:disabled){background:#ff446629}
.device-end:focus-visible{outline:none;text-decoration:underline}
.device-end:disabled{opacity:.45;cursor:not-allowed}
.device-end[aria-busy=true]{opacity:.8;cursor:progress}
.device-note{margin:0;text-align:center;color:var(--nt-text-dim);font-size:12px;line-height:18px}
.device-note.strong{color:#c4c6c9;font-size:13px}
</style>
