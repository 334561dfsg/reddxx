<script setup>
defineProps({
  label: String,
  value: String,
  trend: String,
  good: Boolean
})
</script>

<template>
  <article class="pro-card p-5">
    <p class="text-sm text-black/45 mb-1">{{ label }}</p>
    <div class="flex items-baseline gap-2">
      <p class="text-2xl font-semibold text-black/85 font-mono">{{ value }}</p>
      <span class="text-xs font-medium" :class="good ? 'text-emerald-500' : 'text-rose-500'">
        {{ trend }}
      </span>
    </div>
    <div class="mt-4 h-1 w-full bg-black/5 rounded-full overflow-hidden">
      <div class="h-full bg-antd-primary transition-all duration-500" :style="{ width: good ? '70%' : '40%' }"></div>
    </div>
  </article>
</template>
