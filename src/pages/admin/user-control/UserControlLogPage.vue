<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UserControlLogContent from '../../../admin/components/user-control/UserControlLogContent.vue'
import { normalizeUserControlLogQuery } from '../../../features/user-control/userControl.js'

const route = useRoute()
const router = useRouter()
const normalizedQuery = computed(() => normalizeUserControlLogQuery({
  userId: route.query.userId,
  module: route.query.module
}))
</script>

<template>
  <UserControlLogContent
    :initial-user-id="normalizedQuery.userId"
    :initial-module="normalizedQuery.module"
    show-user-filter
    @clear-route-filters="router.replace({ name: route.name, query: {} })"
  />
</template>
