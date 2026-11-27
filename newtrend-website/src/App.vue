<script setup>
import { useRoute } from 'vue-router'
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import Overlay from './components/Overlay.vue'
import MobileTabBar from './components/layout/MobileTabBar.vue'
import {computed} from 'vue'
// The font-size preference was removed (user decision, 2026-11-26). The vendored source theme still keys its
// responsive header rules on data-font-scale="standard", so the attribute stays fixed.
document.documentElement.dataset.fontScale='standard'
const route=useRoute()
// Bottom tab bar on the five top-level sections only (GMXX behaviour); detail pages keep their own sticky actions.
const tabRoots=[/^\/$/,/^\/trade\//,/^\/earn(\/(simple|loan))?$/,/^\/c2c\/(buy|sell)$/,/^\/ai-quant(\/(strategy|quant-fund))?$/,/^\/assets(\/overview)?$/]
const showTabbar=computed(()=>tabRoots.some(r=>r.test(route.path)))
</script>
<template><div id="site-shell" :class="{'has-tabbar':showTabbar}"><Header/><main id="main-content"><RouterView/></main><Footer v-if="!route.path.includes('/trade/')"/></div><MobileTabBar v-if="showTabbar"/><Overlay/></template>
<style>
/* Room for the fixed mobile tab bar so it never covers the end of a page (only where it is shown). */
:root{--nt-tabbar-h:56px}
@media(max-width:900px){#site-shell.has-tabbar{padding-bottom:calc(var(--nt-tabbar-h) + env(safe-area-inset-bottom))}}
</style>
