<script setup>
// Reference AI Quant page backdrop (newtrendcapital.com, measured 2026-11-26): noise + top lime glow + 56px masked grid
// from the vendored `.page-ambient(-grid)` rules in source-theme.css. Quant Fund list/positions add the aurora layer:
// a slow horizontal sweep plus seven pulsing light beams. Reduced motion stops the animation (source-theme.css).
defineProps({aurora:{type:Boolean,default:false}})
const beams=[
 {left:2,width:22,alpha:28,duration:11,delay:-2},
 {left:16,width:16,alpha:20,duration:8,delay:-5},
 {left:29,width:24,alpha:24,duration:13,delay:-9},
 {left:46,width:15,alpha:18,duration:9,delay:-1},
 {left:57,width:23,alpha:26,duration:12,delay:-7},
 {left:72,width:17,alpha:20,duration:10,delay:-4},
 {left:82,width:20,alpha:22,duration:14,delay:-11},
]
</script>
<template>
 <div class="qf-ambient page-ambient page-ambient-grid" aria-hidden="true">
  <div v-if="aurora" class="qf-aurora">
   <div class="qf-aurora-flow animate-aurora-flow"></div>
   <div v-for="beam in beams" :key="beam.left" class="qf-aurora-beam animate-aurora-pulse" :style="{left:beam.left+'%',width:beam.width+'%','--beam-alpha':beam.alpha+'%',animationDuration:beam.duration+'s',animationDelay:beam.delay+'s'}"></div>
  </div>
 </div>
</template>
<style>
/* Anchor to the full-width main region (page containers are capped at 1440px), like the reference's full-bleed layer. */
#main-content:has(.qf-ambient){position:relative;isolation:isolate}
/* Hosts must not paint over the layer (body already supplies the same var(--nt-bg)), nor re-anchor it to their 1440px box. */
#site-shell #main-content :is(.strategy-page,.quant-page,.finance-page):has(>.qf-ambient){background-color:transparent;position:static}
.qf-ambient{position:absolute;inset:0;z-index:-1;pointer-events:none;overflow:hidden}
.qf-aurora{position:absolute;inset:0 0 auto;height:640px;overflow:hidden;z-index:-1}
.qf-aurora-flow{position:absolute;inset:0 auto 0 0;width:200%;background:linear-gradient(to right,rgb(165 255 74/.1),transparent 50%,rgb(165 255 74/.1));-webkit-mask-image:linear-gradient(#000 10%,transparent 80%);mask-image:linear-gradient(#000 10%,transparent 80%)}
.qf-aurora-beam{position:absolute;top:0;height:100%;transform-origin:top;background:radial-gradient(ellipse 50% 100% at 50% 0%,color-mix(in srgb,var(--nt-accent) var(--beam-alpha),transparent),transparent 70%)}
</style>
