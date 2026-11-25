<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import EarnPageShell from './EarnPageShell.vue'
import EarnProductsPanel from './EarnProductsPanel.vue'
import EarnRecordsPanel from './EarnRecordsPanel.vue'

const route = useRoute()
const section = computed(() => route.meta.earnSection || 'products')
</script>
<template>
 <EarnPageShell>
  <EarnProductsPanel v-if="section==='products'"/>
  <EarnRecordsPanel v-else :key="section" :section="section"/>
 </EarnPageShell>
</template>
