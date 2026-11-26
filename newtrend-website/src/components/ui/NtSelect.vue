<script setup>
import {ConfigProvider, Select} from 'ant-design-vue'
import {selectThemes} from './selectThemes.js'
// Ant Design Select in one of the site's dark themes. Everything else (v-model:value, options, aria-*, events,
// popup-class-name) and every slot passes straight through to the Select, so callers use the Select API unchanged.
defineOptions({inheritAttrs: false})
defineProps({variant: {type: String, default: 'field', validator: value => value in selectThemes}})
</script>
<template><ConfigProvider :theme="selectThemes[variant]"><Select v-bind="$attrs"><template v-for="(_, slot) in $slots" #[slot]="scope"><slot :name="slot" v-bind="scope || {}"/></template></Select></ConfigProvider></template>
