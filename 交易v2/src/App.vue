<script setup>
import { watch } from 'vue'
import { account } from './account'
import Header from './components/Header.vue'
import Overlay from './components/Overlay.vue'

watch(() => account.fontScale, scale => {
  document.documentElement.style.fontSize = ({ standard: '16px', large: '18px', xlarge: '20px' })[scale] || '16px'
  document.documentElement.dataset.fontScale = scale
}, { immediate: true })
</script>

<template>
  <div id="site-shell">
    <Header />
    <main id="main-content"><RouterView /></main>
  </div>
  <Overlay />
</template>
