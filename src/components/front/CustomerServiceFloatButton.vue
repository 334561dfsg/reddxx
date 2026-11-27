<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useFrontAuthStore } from '../../stores/frontAuth'

const route = useRoute()
const router = useRouter()
const auth = useFrontAuthStore()
auth.ensureHydrated()
const { isLoggedIn } = storeToRefs(auth)

const destination = '/front/customer-service'
const visible = computed(() => route.path !== destination)

function openCustomerService() {
  router.push(
    isLoggedIn.value
      ? destination
      : { path: '/front/login', query: { redirect: destination } }
  )
}
</script>

<template>
  <button
    v-if="visible"
    type="button"
    class="fixed bottom-[calc(0.5rem+3.5rem+0.6rem+env(safe-area-inset-bottom,0px)+1rem)] right-[8.75rem] z-40 inline-flex h-11 items-center gap-2 rounded-full border border-sky-300/25 bg-[#1597e5] px-3.5 text-sm font-semibold text-white shadow-xl shadow-sky-950/30 transition hover:-translate-y-0.5 hover:bg-sky-400 focus:outline-none lg:bottom-4 lg:right-[9.5rem]"
    aria-label="联系在线客服"
    @click="openCustomerService"
  >
    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
      <path d="M8 10h.01M12 10h.01M16 10h.01" />
    </svg>
    <span class="hidden sm:inline">在线客服</span>
  </button>
</template>
