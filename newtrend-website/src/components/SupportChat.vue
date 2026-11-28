<script setup>
import LineIcon from './ui/LineIcon.vue'
import {ref,nextTick,watch,onMounted} from 'vue'
import {seedSupportMessages} from '../mock/supportChat.js'
import {clock} from '../mock/clock.js'
const emit=defineEmits(['draft-change'])
// Composer (user reference, 2026-11-28): text box, 發送 and an image button only — no emoji picker or general attachments.
const draft=ref(''),messages=ref(seedSupportMessages()),attachments=ref([]),input=ref(null),fileInput=ref(null),log=ref(null)
watch([draft,()=>attachments.value.length],()=>emit('draft-change',draft.value|| (attachments.value.length?'attachment':'')))
// The text box starts one line high and grows with its content up to the CSS max-height, then scrolls.
function fit(){const el=input.value;if(!el)return;el.style.height='auto';el.style.height=el.scrollHeight+2+'px'}
watch(draft,()=>nextTick(fit))
function attach(event){attachments.value=[...attachments.value,...Array.from(event.target.files||[]).map(file=>({name:file.name}))];event.target.value=''}
async function send(){
 if(!draft.value.trim()&&!attachments.value.length)return
 messages.value.push({id:crypto.randomUUID(),from:'user',text:draft.value.trim(),files:attachments.value.map(file=>file.name),createdAt:clock.now()})
 draft.value='';attachments.value=[]
 await nextTick();log.value?.scrollTo({top:log.value.scrollHeight});input.value?.focus()
}
// MM/DD HH:mm, like the reference chat.
const pad=n=>String(n).padStart(2,'0')
const stamp=ms=>{const d=new Date(ms);return `${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`}
onMounted(()=>log.value?.scrollTo({top:log.value.scrollHeight}))
</script>
<template>
<div class="support-chat">
 <div ref="log" class="chat-log" role="log" aria-live="polite" :aria-label="$t('customerService.title')">
  <article v-for="item in messages" :key="item.id" class="chat-message" :class="item.from"><div class="chat-bubble"><p v-if="item.key">{{ $t(item.key) }}</p><p v-else-if="item.text">{{ item.text }}</p><p v-for="(file,i) in item.files||[]" :key="i">{{ file }}</p></div><time :datetime="new Date(item.createdAt).toISOString()">{{ stamp(item.createdAt) }}</time></article>
 </div>
 <form class="chat-footer" @submit.prevent="send">
  <div v-if="attachments.length" class="chat-attachments"><div v-for="(file,i) in attachments" :key="i"><span>{{ file.name }}</span><button type="button" :aria-label="$t('customerService.attachment.remove')+' '+file.name" @click="attachments.splice(i,1)">×</button></div></div>
  <div class="chat-composer">
   <textarea ref="input" v-model="draft" rows="1" :aria-label="$t('overlay.ui.message')" :placeholder="$t('customerService.placeholder')" @keydown.enter.exact="if(!$event.isComposing){$event.preventDefault();send()}"/>
   <button class="chat-send" type="submit" :disabled="!draft.trim()&&!attachments.length">{{ $t('customerService.send') }}</button>
   <button type="button" class="chat-image" :aria-label="$t('customerService.attachment.image')" @click="fileInput.click()"><LineIcon name="image" aria-hidden="true"/></button>
   <input ref="fileInput" class="chat-file" type="file" multiple accept=".jpg,.jpeg,.png" tabindex="-1" @change="attach"/>
  </div>
 </form>
</div>
</template>
<style scoped>
.support-chat{display:flex;flex-direction:column;flex:1;min-height:0;height:100%;overflow:hidden}.chat-log{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:24px 16px;scrollbar-width:thin}.chat-message{display:flex;flex-direction:column;align-items:flex-start;gap:4px;margin:0 0 16px}.chat-message.user{align-items:flex-end}.chat-bubble{width:fit-content;max-width:85%;padding:10px 14px;border-radius:var(--nt-radius-panel);background:var(--nt-card);overflow-wrap:anywhere;font-size:14px;line-height:20px}.chat-message.user .chat-bubble{background:color-mix(in srgb,var(--nt-accent) 18%,var(--nt-card))}.chat-bubble p{white-space:pre-wrap;margin:0}.chat-message time{font-size:11px;line-height:16px;color:#ffffff70}.chat-footer{flex-shrink:0;padding:12px 16px max(16px,env(safe-area-inset-bottom));background:var(--nt-bg)}.chat-file{display:none}.chat-attachments{max-height:100px;overflow-y:auto;margin-bottom:8px;font-size:12px}.chat-attachments>div{display:flex;align-items:center;gap:8px;padding:4px 10px}.chat-attachments span{flex:1;overflow-wrap:anywhere}.chat-attachments button{width:32px;height:32px;flex-shrink:0}
.chat-footer{border-top:1px solid #ffffff0c}
.chat-composer{display:flex;align-items:flex-end;gap:8px}
.chat-composer textarea{flex:1;min-width:0;height:44px;min-height:44px;max-height:120px;padding:11px 14px;resize:none;overflow-y:auto;scrollbar-width:thin;border:1px solid #ffffff14;border-radius:var(--nt-radius-control);background:var(--nt-card);color:#fff;font-size:14px;line-height:20px;box-shadow:none;transition:background-color 150ms ease-out}
.chat-composer textarea::placeholder{color:#ffffff5c}
.chat-composer textarea:hover{background:color-mix(in srgb,#fff 3%,var(--nt-card))}
.chat-composer textarea:focus-visible{outline:none;background:color-mix(in srgb,#fff 5%,var(--nt-card))}
.chat-send,.chat-image{flex:0 0 auto;height:44px;border-radius:var(--nt-radius-control);transition:background-color 150ms ease-out,color 150ms ease-out}
.chat-send{min-width:72px;padding:0 18px;background:var(--nt-accent);color:var(--nt-bg);font-size:14px;font-weight:600}
.chat-send:not(:disabled):hover{background:color-mix(in srgb,#fff 12%,var(--nt-accent))}
.chat-send:disabled{background:#ffffff0f;color:#ffffff47;cursor:not-allowed}
.chat-image{width:44px;display:grid;place-items:center;background:#ffffff0f;color:#ffffffb3}
.chat-image:hover{background:#ffffff1a;color:var(--nt-accent)}
.chat-image svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.chat-send:focus-visible,.chat-image:focus-visible{outline:none;text-decoration:underline;text-underline-offset:3px}
.chat-image:focus-visible{background:#ffffff1a;color:var(--nt-accent)}
@media(prefers-reduced-motion:reduce){.chat-composer textarea,.chat-send,.chat-image{transition:none}}
</style>
