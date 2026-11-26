<script setup>
import {computed} from 'vue'
import {lineIcon} from '../../icons/lineIcons.js'
// Renders a registry icon. Set defaults come first; attributes on <LineIcon> (class, width, stroke-width, v-if …)
// fall through onto the <svg> and override them. Unknown names render nothing.
const props = defineProps({name: {type: String, required: true}, set: {type: String, default: 'ui'}})
const icon = computed(() => lineIcon(props.set, props.name))
</script>
<template><svg v-if="icon" v-bind="icon.attrs" :viewBox="icon.viewBox" aria-hidden="true" v-html="icon.body"/></template>
<style>
svg.earn-icon{display:inline-block;flex-shrink:0;vertical-align:middle}
svg.loan-icon{width:16px;height:16px;flex-shrink:0;display:inline-block;vertical-align:middle}
</style>
