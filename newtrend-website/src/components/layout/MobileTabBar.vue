<script setup>
import {computed} from 'vue'
import {useRoute} from 'vue-router'
import LineIcon from '../ui/LineIcon.vue'
import {path} from '../../data'
// Mobile bottom navigation after the GMXX tab bar (user reference, 2026-11-27), in the NewQuantCapital style.
// App.vue shows it only on the five top-level sections below 900px; deeper pages keep their own sticky actions.
const route=useRoute()
const tabs=[
 {key:'home',label:'common.home',icon:'home',to:'/',match:p=>p==='/'},
 {key:'trade',label:'common.trade',icon:'swap-vertical',to:'/trade/futures/BTCUSDT',match:p=>p.startsWith('/trade')},
 {key:'finance',label:'common.finance',icon:'landmark',to:'/earn',match:p=>p.startsWith('/earn')||p.startsWith('/c2c')},
 {key:'quant',label:'common.tabbar.quant',icon:'ai-chip',to:'/ai-quant',match:p=>p.startsWith('/ai-quant')},
 {key:'assets',label:'assets.pageTitle',icon:'wallet',to:'/assets',match:p=>p.startsWith('/assets')},
]
const active=computed(()=>tabs.find(t=>t.match(route.path))?.key)
</script>
<template>
<nav class="mobile-tabbar" :aria-label="$t('common.tabbar.label')">
 <RouterLink v-for="t in tabs" :key="t.key" :to="path(t.to)" :class="{active:active===t.key}" :aria-current="active===t.key?'page':undefined"><LineIcon :name="t.icon"/><span>{{ $t(t.label) }}</span></RouterLink>
</nav>
</template>
<style scoped>
.mobile-tabbar{position:fixed;left:0;right:0;bottom:0;z-index:40;display:none;grid-template-columns:repeat(5,1fr);height:calc(var(--nt-tabbar-h) + env(safe-area-inset-bottom));padding:0 env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);background:color-mix(in srgb,#121415 92%,transparent);border-top:1px solid #ffffff12;backdrop-filter:blur(12px)}
.mobile-tabbar a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-width:0;color:#fff8;font-size:11px;line-height:14px}
.mobile-tabbar a span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 2px}
.mobile-tabbar svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.mobile-tabbar a.active{color:var(--nt-accent);font-weight:600}
.mobile-tabbar a:focus-visible{outline:none;background:#ffffff0a;text-decoration:underline;text-underline-offset:3px}
@media(max-width:900px){.mobile-tabbar{display:grid}}
</style>
