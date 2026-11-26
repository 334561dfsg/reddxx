<script setup>
import {ref,nextTick,watch} from 'vue'
const emit=defineEmits(['draft-change'])
const draft=ref(''),messages=ref([]),attachments=ref([]),emojisOpen=ref(false),input=ref(null),fileInput=ref(null),log=ref(null)
watch([draft,()=>attachments.value.length],()=>emit('draft-change',draft.value|| (attachments.value.length?'attachment':'')))
function attach(event){attachments.value=[...attachments.value,...Array.from(event.target.files||[]).map(file=>({name:file.name}))];event.target.value=''}
async function send(){
 if(!draft.value.trim()&&!attachments.value.length)return
 messages.value.push({id:crypto.randomUUID(),text:draft.value.trim(),files:attachments.value.map(file=>file.name)})
 draft.value='';attachments.value=[];emojisOpen.value=false
 await nextTick();log.value?.scrollTo({top:log.value.scrollHeight});input.value?.focus()
}
function emoji(value){draft.value+=value;emojisOpen.value=false;nextTick(()=>input.value?.focus())}
</script>
<template>
<div class="support-chat">
 <div ref="log" class="chat-log" role="log" aria-live="polite" :aria-label="$t('customerService.title')">
  <p class="chat-welcome">{{ $t('customerService.welcomeMessage') }}</p>
  <article v-for="item in messages" :key="item.id" class="chat-message"><p v-if="item.text">{{ item.text }}</p><p v-for="(file,i) in item.files" :key="i">{{ file }}</p><small>{{ $t('customerService.status.pending') }}</small></article>
 </div>
 <form class="chat-footer" @submit.prevent="send">
  <div v-if="attachments.length" class="chat-attachments"><div v-for="(file,i) in attachments" :key="i"><span>{{ file.name }}</span><button type="button" :aria-label="$t('customerService.attachment.remove')+' '+file.name" @click="attachments.splice(i,1)">×</button></div></div>
  <div v-if="emojisOpen" id="support-emojis" class="chat-emojis"><button v-for="value in ['😊','👍','🙏','❤️','👋','😃']" :key="value" type="button" :aria-label="value" @click="emoji(value)">{{ value }}</button></div>
  <div class="chat-composer">
   <button type="button" class="chat-tool" :aria-label="$t('customerService.emoji.add')" :aria-expanded="emojisOpen" aria-controls="support-emojis" @click="emojisOpen=!emojisOpen"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M8.5 14a4 4 0 0 0 7 0M9 9h.01M15 9h.01"/></svg></button>
   <button type="button" class="chat-tool" :aria-label="$t('customerService.attachment.add')" @click="fileInput.click()"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 13 6-6a3 3 0 0 1 4 4l-7 7a5 5 0 0 1-7-7l7-7M7 14l7-7"/></svg></button>
   <input ref="fileInput" class="chat-file" type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.xlsx,.xls,.doc,.docx,.csv,.zip" tabindex="-1" @change="attach"/>
   <textarea ref="input" v-model="draft" rows="1" :aria-label="$t('overlay.ui.message')" :placeholder="$t('customerService.placeholder')" @keydown.enter.exact="if(!$event.isComposing){$event.preventDefault();send()}"/>
   <button class="chat-tool chat-send" type="submit" :disabled="!draft.trim()&&!attachments.length" :aria-label="$t('customerService.send')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 3-7 18-4-7-7-4 18-7ZM10 14 21 3"/></svg></button>
  </div>
 </form>
</div>
</template>
<style scoped>
.support-chat{display:flex;flex-direction:column;flex:1;min-height:0;height:100%;overflow:hidden}.chat-log{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:24px 16px;scrollbar-width:thin}.chat-welcome{font-size:13px;line-height:20px;text-align:center;color:#ffffff70;margin:16px 0 32px}.chat-message{width:fit-content;max-width:85%;margin:12px 0 12px auto;padding:10px 12px;background:#172319;border-radius:var(--nt-radius-panel);overflow-wrap:anywhere;font-size:14px}.chat-message p{white-space:pre-wrap;margin:0}.chat-message small{display:block;color:#ffffff70;font-size:11px;margin-top:6px}.chat-footer{flex-shrink:0;padding:12px 14px max(16px,env(safe-area-inset-bottom));background:var(--nt-bg)}.chat-composer{display:flex;align-items:center;gap:6px;padding:10px;border:1px solid #ffffff04;border-radius:32px;background:#141619}.chat-tool{flex:0 0 36px;width:36px;height:36px;display:grid;place-items:center;border-radius:var(--nt-radius-control);background:#1b1e21;color:#b2b5b8}.chat-tool svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}.chat-tool:focus-visible,.chat-emojis button:focus-visible{outline:none}.chat-send{color:var(--nt-accent)}.chat-send:disabled{color:#ffffff26;cursor:default}.chat-composer textarea{flex:1;min-width:0;min-height:36px;max-height:100px;padding:8px 2px;resize:none;border:0;background:transparent;font-size:13px;line-height:20px;box-shadow:none}.chat-composer textarea:focus-visible{outline:none}.chat-file{display:none}.chat-emojis{display:flex;flex-wrap:wrap;gap:4px;padding:8px;margin-bottom:8px;border-radius:var(--nt-radius-panel);background:#141619}.chat-emojis button{width:40px;height:40px;font-size:22px}.chat-attachments{max-height:100px;overflow-y:auto;margin-bottom:8px;font-size:12px}.chat-attachments>div{display:flex;align-items:center;gap:8px;padding:4px 10px}.chat-attachments span{flex:1;overflow-wrap:anywhere}.chat-attachments button{width:32px;height:32px;flex-shrink:0}@media(pointer:coarse){.chat-tool{width:44px;height:44px;flex-basis:44px}.chat-composer{gap:4px;padding:8px}}
</style>
