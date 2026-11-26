<script setup>
import LineIcon from './LineIcon.vue'
// Inline progress indicator for busy buttons. Decorative: the button itself carries aria-busy and keeps its label.
</script>
<template><LineIcon name="spinner" class="nt-spinner" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" width="16" height="16"/></template>
<style>
.nt-spinner{flex-shrink:0;vertical-align:-3px;margin-inline-end:6px;animation:nt-spin .8s linear infinite}
@keyframes nt-spin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.nt-spinner{animation-duration:2.4s}}
</style>
