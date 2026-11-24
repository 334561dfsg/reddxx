<script setup>
import icons from '../icons.json'
defineProps({name:String,green:Boolean})
</script>
<template><img v-if="icons[name]" :src="'/NewQuantCapital/assets/'+icons[name]" :alt="$t(&quot;&quot;)" aria-hidden="true" class="nt-icon" :class="{'nt-icon-green':green}" /></template>
