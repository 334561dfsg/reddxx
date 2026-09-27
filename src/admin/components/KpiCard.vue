<script setup>
import { Card, Statistic } from 'ant-design-vue'
defineProps({
  label: String,
  value: String,
  trend: String,
  good: Boolean
})
</script>

<template>
  <Card size="small" class="h-full">
    <Statistic :title="label" :value="value" />
    <span class="text-xs font-medium" :class="good ? 'text-emerald-600' : 'text-rose-600'">{{ trend }}</span>
  </Card>
</template>
