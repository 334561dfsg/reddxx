<script setup>
import {watch} from 'vue'
import {account} from './account'
watch(()=>account.fontScale,s=>{document.documentElement.style.fontSize=({standard:'16px',large:'18px',xlarge:'20px'})[s]||'16px';document.documentElement.dataset.fontScale=s},{immediate:true})
import { useRoute } from 'vue-router'
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import Overlay from './components/Overlay.vue'
const route=useRoute()
</script>
<template><div id="site-shell"><Header/><main id="main-content"><RouterView/></main><Footer v-if="!route.path.includes('/trade/')"/><div class="demo-caption">{{ $t("app.ui.localPreviewMarketSnapshotNoLiveTrading") }}</div></div><Overlay/></template>
