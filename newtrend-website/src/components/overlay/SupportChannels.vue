<script setup>
import LineIcon from '../ui/LineIcon.vue'
import Icon from '../Icon.vue'
defineEmits(['chat','unavailable'])
</script>
<template>
  <h3 class="support-intro">{{ $t('customerService.menu.title') }}</h3>
  <p class="support-subtitle">{{ $t('customerService.menu.subtitle') }}</p>
  <div class="support-channels">
   <button class="support-channel" @click="$emit('chat')"><span class="support-icon"><Icon name="headset" green/></span><span class="support-copy"><strong>{{ $t('customerService.menu.liveChat') }}</strong><small>{{ $t('customerService.menu.liveChatDesc') }}</small></span><Icon name="chevron-right"/></button>
   <button class="support-channel" @click="$emit('unavailable')"><span class="support-icon"><LineIcon name="message-circle" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"/></span><span class="support-copy"><strong>WhatsApp</strong><small>{{ $t('customerService.menu.whatsappDesc') }}</small></span><Icon name="chevron-right"/></button>
   <a class="support-channel" href="mailto:support@newtrendcapital.net"><span class="support-icon"><Icon name="mail" green/></span><span class="support-copy"><strong>{{ $t('customerService.menu.email') }}</strong><small>support@newtrendcapital.net</small></span><Icon name="chevron-right"/></a>
  </div>
</template>
<style scoped>.support-intro{font-size:15px;line-height:1.5;margin:0 0 4px}.support-subtitle{font-size:13px;color:#fff6;margin:0 0 16px}.support-channels{display:grid;gap:12px}.support-channel{display:flex;align-items:center;gap:12px;width:100%;min-height:70px;padding:14px 16px;text-align:left;border:1px solid #ffffff0a;border-radius:var(--nt-radius-panel);background:#0c1017;color:#fff}.support-channel:hover,.support-channel:focus-visible{background:#121820}.support-channel:focus-visible{outline:none}.support-channel:focus-visible strong{text-decoration:underline}.support-icon{display:grid;place-items:center;flex:0 0 40px;height:40px;border-radius:50%;color:#a3e635;background:#10190b}.support-copy{flex:1;min-width:0}.support-copy strong{display:block;font-size:14px;font-weight:500;line-height:20px}.support-copy small{display:block;font-size:12px;line-height:18px;color:#fff6;overflow-wrap:anywhere}.support-channel>.nt-icon{width:16px;opacity:.5}</style>
