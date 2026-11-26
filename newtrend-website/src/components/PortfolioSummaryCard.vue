<script setup>
import {shallowRef} from 'vue'
import Icon from './Icon.vue'
// Reference PortfolioSummaryCard (newtrendcapital.com, AI Quant positions / my strategies, measured 2026-11-26):
// label + eye toggle, 36px mono figure + unit, coloured accent line, bottom-aligned stats on the right, corner glow.
// The eye masks every figure except stats marked sensitive:false (counts), exactly like the source component.
defineProps({
 labelId:{type:String,required:true},
 label:{type:String,required:true},
 value:{type:String,required:true},
 unit:{type:String,default:''},
 accent:{type:Object,default:null},  // {value,unit,label,tone:'success'|'profit'|'loss'|'neutral'}
 stats:{type:Array,default:()=>[]},  // [{label,value,unit,tone,sensitive}]
})
const hidden=shallowRef(false)
const mask=value=>hidden.value?'****':value
</script>
<template>
<section class="psc nt-glow-host" :aria-labelledby="labelId"><span class="nt-glow" aria-hidden="true"></span>
 <div class="psc-row">
  <div class="psc-primary">
   <span class="psc-label"><span :id="labelId">{{ label }}</span><button type="button" class="psc-eye" :aria-pressed="hidden" :aria-label="$t(hidden?'assets.show':'assets.hide')" :title="$t(hidden?'assets.show':'assets.hide')" @click="hidden=!hidden"><Icon :name="hidden?'eye-off':'eye'"/></button></span>
   <span class="psc-display">{{ mask(value) }}<span v-if="unit">{{ unit }}</span></span>
   <span v-if="accent" class="psc-accent"><strong :class="'tone-'+(accent.tone||'profit')">{{ mask(accent.value)+(accent.unit?' '+accent.unit:'') }}</strong><small>{{ accent.label }}</small></span>
  </div>
  <dl v-if="stats.length" class="psc-stats" :style="{'--psc-cols':stats.length}"><div v-for="stat in stats" :key="stat.label"><dt>{{ stat.label }}</dt><dd :class="'tone-'+(stat.tone||'neutral')">{{ stat.sensitive===false?stat.value:mask(stat.value) }}<span v-if="stat.unit">{{ stat.unit }}</span></dd></div></dl>
 </div>
</section>
</template>
<style>
#site-shell #main-content .psc{position:relative;display:flex;flex-direction:column;gap:20px;padding:28px;border:1px solid #191b1f;border-radius:32px;background:#14161a;overflow:hidden;isolation:isolate}
#site-shell #main-content .psc>.nt-glow{position:absolute}
#site-shell #main-content .psc-row{display:flex;align-items:flex-end;justify-content:space-between;gap:40px}
#site-shell #main-content .psc-primary{display:flex;flex-direction:column;gap:6px;min-width:0}
#site-shell #main-content .psc-label{display:flex;align-items:center;gap:8px;font-size:12px;line-height:16px;letter-spacing:.04em;color:#87888a}
#site-shell #main-content .psc-eye{display:inline-grid;place-items:center;width:16px;height:16px;min-width:0;min-height:0;padding:0;border:0;background:none;color:#87888a}
#site-shell #main-content .psc-eye .nt-icon{width:16px;height:16px;opacity:.6}
#site-shell #main-content .psc-eye:hover .nt-icon,#site-shell #main-content .psc-eye:focus-visible .nt-icon{opacity:1}
#site-shell #main-content .psc-eye:focus-visible{outline:none;background:#ffffff14;border-radius:4px}
#site-shell #main-content .psc-display{margin:0;font-family:var(--nt-font-mono);font-size:36px;line-height:40px;font-weight:600;letter-spacing:-.025em;color:#fff;white-space:nowrap}
#site-shell #main-content .psc-display>span{margin-left:8px;font-size:18px;line-height:28px;font-weight:400;letter-spacing:0;color:#87888a}
#site-shell #main-content .psc-accent{display:flex;align-items:baseline;gap:8px;font-size:15px;line-height:22.5px}
#site-shell #main-content .psc-accent strong{font-family:var(--nt-font-mono);font-weight:600}
#site-shell #main-content .psc-accent small{display:inline;margin:0;font-size:12px;line-height:18px;color:#87888a}
#site-shell #main-content .psc-stats{display:grid;grid-template-columns:repeat(var(--psc-cols,3),minmax(0,1fr));gap:12px 40px;flex-shrink:0;margin:0;padding:0;border:0}
#site-shell #main-content .psc-stats>div{display:flex;flex-direction:column;align-items:flex-start;gap:4px}
#site-shell #main-content .psc-stats dt{margin:0;font-size:12px;line-height:18px;color:#87888a}
#site-shell #main-content .psc-stats dd{margin:0;font-family:var(--nt-font-mono);font-size:18px;line-height:28px;font-weight:600;white-space:nowrap}
#site-shell #main-content .psc-stats dd span{margin-left:4px;font-size:12px;line-height:18px;font-weight:400;color:#87888a}
#site-shell #main-content .psc .tone-neutral{color:#fff}
#site-shell #main-content .psc .tone-success,#site-shell #main-content .psc .tone-profit{color:#2bc287}
#site-shell #main-content .psc .tone-loss{color:#f46}
@media(max-width:1023px){#site-shell #main-content .psc-row{flex-direction:column;align-items:stretch;gap:24px}#site-shell #main-content .psc-stats{grid-template-columns:1fr}#site-shell #main-content .psc-stats>div{flex-direction:row;justify-content:space-between;align-items:baseline}}
</style>
