<script setup>
import { shallowRef, watch, onUnmounted } from 'vue'
import { priceDirection } from '../composables/quoteModel'
const props = defineProps({ value: { type: Number, required: true }, text: { type: String, default: '' }, as: { type: String, default: 'span' } })
const element = shallowRef(null)
let animation
watch(() => props.value, (value, previous) => {
  const direction = priceDirection(previous, value)
  if (!direction) return
  animation?.cancel()
  if (!element.value || document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  animation = element.value.animate([
    { backgroundColor: direction === 'up' ? 'rgba(75, 185, 126, .28)' : 'rgba(255, 65, 86, .24)' },
    { backgroundColor: getComputedStyle(element.value).backgroundColor },
  ], { duration: 1100, easing: 'ease-out' })
}, { flush: 'post' })
onUnmounted(() => animation?.cancel())
</script>
<template><component :is="as" ref="element" class="quote-price"><slot>{{ text }}</slot></component></template>
<style scoped>.quote-price{font-variant-numeric:tabular-nums;white-space:nowrap}</style>
