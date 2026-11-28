<script setup>
import PairList from '../trading/PairList.vue'
// Phone trading pair drawer (user reference, 2026-11-27), opened by the overlay as a left drawer from the compact
// trading header. The list itself is the shared PairList, also used by the desktop pair panel; the overlay closes
// first and the trading page then routes to the chosen pair.
defineProps({current:String})
const emit=defineEmits(['select'])
</script>
<template><PairList :current="current" variant="drawer" @select="id=>emit('select',id)"/></template>
