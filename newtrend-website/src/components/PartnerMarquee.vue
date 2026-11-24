<script setup>
import { shallowRef, onMounted, onUnmounted } from 'vue'
import { partners, partnerNames, asset } from '../data'
const paused = shallowRef(false), reduced = shallowRef(false)
let preference
function updatePreference() { reduced.value = preference.matches }
onMounted(() => { preference = matchMedia('(prefers-reduced-motion: reduce)'); updatePreference(); preference.addEventListener('change', updatePreference) })
onUnmounted(() => preference?.removeEventListener('change', updatePreference))
</script>
<template>
  <div class="partner-marquee" :class="{paused,reduced}">
    <div class="partner-controls"><button v-if="!reduced" class="muted" :aria-pressed="paused" @click="paused=!paused">{{ $t(paused?'home.motion.resumePartners':'home.motion.pausePartners') }}</button></div>
    <div class="partner-window" tabindex="0" :aria-label="$t('home.partners.title')">
      <div class="partner-track">
        <div class="partner-group"><img v-for="(partner,i) in partners" :key="partner" :src="asset(partner)" :alt="partnerNames[i]" width="112" height="56"/></div>
        <div class="partner-group partner-copy" aria-hidden="true"><img v-for="partner in partners" :key="partner" :src="asset(partner)" alt="" width="112" height="56"/></div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.partner-controls{display:flex;justify-content:flex-end;min-height:40px;padding:0 24px;margin-top:8px}.partner-controls button{min-height:40px;font-size:.75rem}
.partner-window{overflow:hidden;padding:16px 0;mask-image:linear-gradient(to right,transparent,#000 24px,#000 calc(100% - 24px),transparent)}
.partner-track{display:flex;width:max-content;animation:partners-scroll 52s linear infinite}
.partner-group{display:flex;align-items:center;gap:24px;padding-right:24px;flex-shrink:0}
.partner-group img{width:112px;height:56px;object-fit:contain;background:#fff;border-radius:16px;flex-shrink:0}
.partner-window:hover .partner-track,.partner-window:focus-within .partner-track,.paused .partner-track{animation-play-state:paused}
.reduced .partner-track{animation:none;width:auto}.reduced .partner-group{flex-wrap:wrap;justify-content:center;padding:0 24px}.reduced .partner-copy{display:none}
@keyframes partners-scroll{to{transform:translateX(-50%)}}
@media(prefers-reduced-motion:reduce){.partner-track{animation:none;width:auto}.partner-group{flex-wrap:wrap;justify-content:center;padding:0 24px}.partner-copy{display:none}}
</style>
