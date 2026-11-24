<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({ to: { type: String, required: true } })
const isTradeLink = computed(() => /^\/(futures|options|spot)(?:\/|$)/.test(props.to))
</script>

<template>
  <RouterLink v-if="isTradeLink" :to="to"><slot /></RouterLink>
  <a v-else role="link" aria-disabled="true" @click.prevent><slot /></a>
</template>
