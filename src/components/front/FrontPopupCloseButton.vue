<script setup>
import FrontStrokeIcon from './FrontStrokeIcon.vue'

defineEmits(['click'])
</script>

<template>
  <button
    type="button"
    class="absolute right-2.5 top-2.5 z-[130] flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/55 transition hover:bg-white/10 hover:text-white/90 focus:outline-none sm:right-3 sm:top-3"
    aria-label="关闭"
    @click.stop="$emit('click')"
  >
    <FrontStrokeIcon name="x" size-class="h-5 w-5" />
  </button>
</template>
