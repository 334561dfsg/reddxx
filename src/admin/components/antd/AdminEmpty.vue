<script setup>
// Ant Design empty state for admin overlays and panels (Ant Design Pro alignment, 2026-11-28): the compact "simple"
// image with the caller's text as the description. Replaces hand-built dashed boxes.
import { Empty } from 'ant-design-vue'
const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE
</script>

<template>
  <Empty :image="simpleImage" class="admin-empty">
    <template #description><div class="admin-empty-description"><slot /></div></template>
  </Empty>
</template>

<style>
.admin-empty { margin-block: 24px; }
.admin-empty-description { color: rgb(0 0 0 / 45%); font-size: 14px; }
.admin-empty-description p { margin: 0; }
.admin-empty-description p + p { margin-top: 4px; font-size: 12px; }
</style>
