<script setup>
import { useRoute } from 'vue-router'
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import Overlay from './components/Overlay.vue'
// The font-size preference was removed (user decision, 2026-11-26). The vendored source theme still keys its
// responsive header rules on data-font-scale="standard", so the attribute stays fixed.
document.documentElement.dataset.fontScale='standard'
const route=useRoute()
</script>
<template><div id="site-shell"><Header/><main id="main-content"><RouterView/></main><Footer v-if="!route.path.includes('/trade/')"/></div><Overlay/></template>
