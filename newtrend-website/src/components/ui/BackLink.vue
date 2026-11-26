<script setup>
// Shared "← back" link: one arrow, one style. Extra classes/attrs (layout spacing, aria-disabled) pass through.
defineProps({to:{type:[String,Object],required:true}})
</script>
<template><RouterLink :to="to" class="nt-back-link"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 19-7-7 7-7M19 12H5"/></svg><slot/></RouterLink></template>
<style>
.nt-back-link{display:inline-flex;align-items:center;gap:4px;align-self:flex-start;font-size:14px;line-height:20px;color:#87888a;text-decoration:none}
.nt-back-link svg{width:16px;height:16px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.nt-back-link:hover,.nt-back-link:focus-visible{outline:none;color:#fff;text-decoration:underline;text-underline-offset:3px}
.nt-back-link[aria-disabled=true]{opacity:.5;pointer-events:none}
</style>
