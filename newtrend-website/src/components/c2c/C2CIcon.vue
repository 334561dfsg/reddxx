<script setup>
defineProps({ name: String })
const paths = {
 buy: 'M3 3h2l2.4 12h12l2-8H6M9 21h.01M19 21h.01',
 sell: 'M20 13 13 20 3 10V3h7Z M7 7h.01',
 orders: 'M6 3h14v18H6z M3 7h3 M3 12h3 M3 17h3 M10 7h6 M10 12h6 M10 17h4',
 bank: 'm3 9 9-6 9 6H3 M5 10v8 M10 10v8 M14 10v8 M19 10v8 M3 21h18',
 store: 'M3 10 5 4h14l2 6 M3 10c0 4 6 4 6 0 0 4 6 4 6 0 0 4 6 4 6 0 M5 14v7h14v-7 M9 21v-6h6v6',
 timer: 'M10 2h4 M12 14l3-3',
 exchange: 'M4 7h16l-5-5 M20 17H4l5 5',
}
</script>
<template><svg class="c2c-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name]"/><circle v-if="name==='timer'" cx="12" cy="14" r="8"/></svg></template>
