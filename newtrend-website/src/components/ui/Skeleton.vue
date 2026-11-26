<script setup>
// Placeholder block for content that is still loading. Purely visual (aria-hidden); the surrounding
// RequestState announces the loading status once. Size with width/height or a class from the caller.
defineProps({width: String, height: String, round: Boolean})
</script>
<template><span class="nt-skeleton" :class="{round}" :style="{width, height}" aria-hidden="true"></span></template>
<style>
.nt-skeleton{display:block;width:100%;height:14px;border-radius:6px;background:linear-gradient(90deg,#ffffff0a 25%,#ffffff17 50%,#ffffff0a 75%) 0 0/200% 100%;animation:nt-skeleton 1.4s ease-in-out infinite}
.nt-skeleton.round{border-radius:50%}
@keyframes nt-skeleton{from{background-position:100% 0}to{background-position:-100% 0}}
@media(prefers-reduced-motion:reduce){.nt-skeleton{animation:none;background:#ffffff10}}
@media(forced-colors:active){.nt-skeleton{background:GrayText}}
</style>
