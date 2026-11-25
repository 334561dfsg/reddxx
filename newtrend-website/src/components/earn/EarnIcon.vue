<script setup>
defineProps({name:String})
const paths={
 sprout:'M12 22v-8M12 14C12 7 5 7 3 7c0 6 3 9 9 7ZM12 11c0-6 5-9 9-9 0 6-3 10-9 9Z',
 flame:'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z',
 clock:'M12 6v6l4 2',lock:'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5Z',
 calendar:'M8 2v4M16 2v4M3 10h18M3 4h18v18H3ZM7 14h2M12 14h2M7 18h2M12 18h2',
 banknote:'M2 6h20v12H2ZM6 10v4M18 10v4',
 receipt:'M5 3h14v19l-3-2-4 2-4-2-3 2ZM8 7h8M8 11h8M8 15h5',
}
</script>
<template><svg class="earn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle v-if="name==='clock'" cx="12" cy="12" r="10"/><circle v-if="name==='banknote'" cx="12" cy="12" r="2"/><path :d="paths[name]"/></svg></template>
<style scoped>.earn-icon{display:inline-block;flex-shrink:0;vertical-align:middle}</style>
