<script setup>
import { ConfigProvider, PageHeader, theme } from 'ant-design-vue'

// Use the installed Ant Design seed so typography and controls remain in sync.
// Colors, radii and semantic states continue to inherit the console theme.
const earnTheme = { token: {
 fontFamily: theme.defaultSeed.fontFamily,
 fontSize: theme.defaultSeed.fontSize,
 controlHeight: theme.defaultSeed.controlHeight,
} }
defineOptions({inheritAttrs:false})
defineProps({title:{type:String,default:''}})
</script>
<template>
 <ConfigProvider :theme="earnTheme" component-size="middle">
  <section class="earn-page-shell" v-bind="$attrs">
   <PageHeader v-if="title" :title="title" :ghost="false">
    <template v-if="$slots.extra" #extra><slot name="extra"/></template>
    <slot name="description"/>
   </PageHeader>
   <slot/>
  </section>
 </ConfigProvider>
</template>
<style scoped>
.earn-page-shell{display:grid;gap:24px;min-width:0;padding-bottom:64px}
.earn-page-shell :deep(.ant-card){min-width:0}
@media(pointer:coarse){.earn-page-shell :deep(.ant-btn){min-height:44px;min-width:44px}}
</style>
