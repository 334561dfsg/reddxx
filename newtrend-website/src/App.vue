<script setup>
import { useRoute } from 'vue-router'
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import Overlay from './components/Overlay.vue'
import MobileTabBar from './components/layout/MobileTabBar.vue'
import {computed} from 'vue'
import {session} from './session'
import GuestPrompt from './components/ui/GuestPrompt.vue'
// The font-size preference was removed (user decision, 2026-11-26). The vendored source theme still keys its
// responsive header rules on data-font-scale="standard", so the attribute stays fixed.
document.documentElement.dataset.fontScale='standard'
const route=useRoute()
// Bottom tab bar on the five top-level sections (GMXX behaviour) and /profile (user decision 2026-11-28: the personal
// centre hub has no back bar, so it keeps the tab bar with no tab active); detail pages keep their own sticky actions.
const tabRoots=[/^\/$/,/^\/trade\/(futures|options|spot)(\/[^/]+)?$/,/^\/earn(\/(simple|loan))?$/,/^\/c2c\/(buy|sell)$/,/^\/ai-quant(\/(strategy|quant-fund))?$/,/^\/assets(\/overview)?$/,/^\/profile$/]
const showTabbar=computed(()=>tabRoots.some(r=>r.test(route.path)))
</script>
<template><div id="site-shell" :class="{'has-tabbar':showTabbar,'trade-route':route.path.includes('/trade/'),'home-route':route.path==='/'}"><Header/><main id="main-content"><RouterView v-if="session.loggedIn||!route.meta.account"/><GuestPrompt v-else page/></main><Footer v-if="!route.path.includes('/trade/')"/></div><MobileTabBar v-if="showTabbar"/><Overlay/></template>
<style>
/* Room for the fixed mobile tab bar so it never covers the end of a page (only where it is shown). */
:root{--nt-tabbar-h:56px}
/* The page itself never scrolls sideways: horizontal swipe rows (featured cards) scroll inside their own box, and a
   transiently wide child must not let the whole page be dragged (user report, 2026-11-27). clip keeps sticky intact. */
#site-shell{overflow-x:clip}
/* Mobile trading pages drop the site header (user decision, 2026-11-27); the bottom tab bar and other pages keep the menu. */
@media(max-width:767px){#site-shell.trade-route>.site-header{display:none}}
/* On phones/tablets the header is fixed like the tab bar: a sticky header belongs to the document and is dragged along
   by touch overscroll (rubber-band) at the top of the page (user report, 2026-11-27). The shell reserves its height. */
@media(max-width:900px){#site-shell>.site-header{position:fixed;top:0;left:0;right:0}#site-shell{padding-top:calc(56px + env(safe-area-inset-top))}}
@media(max-width:767px){#site-shell.trade-route{padding-top:0}}
/* Phones: every page except home ends at its content like an app (user decision, 2026-11-27); the footer links stay on
   the home page. */
@media(max-width:767px){#site-shell:not(.home-route)>.site-footer{display:none}}
@media(max-width:900px){#site-shell.has-tabbar{padding-bottom:calc(var(--nt-tabbar-h) + env(safe-area-inset-bottom))}}
</style>
