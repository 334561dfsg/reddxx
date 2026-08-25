<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { getFrontBottomTabs, getFrontFinanceHubPath } from '../constants/frontNav'
import { useFrontAuthStore } from '../stores/frontAuth'

const props = defineProps({
  prefix: { type: String, required: true }
})

const route = useRoute()
const frontAuth = useFrontAuthStore()
const { isLoggedIn, accountMode } = storeToRefs(frontAuth)

const tabs = computed(() => (
  getFrontBottomTabs(props.prefix).filter((tab) => !isLoggedIn.value || accountMode.value !== 'demo' || tab.key !== 'finance')
))

const pcRoot = computed(() => `${props.prefix}/personal-center`)
const tradePath = computed(() => `${props.prefix}/trade`)
const financeHubPath = computed(() => getFrontFinanceHubPath(props.prefix))

function isTabActive(key) {
  const p = route.path
  const pc = pcRoot.value
  const fh = financeHubPath.value
  switch (key) {
    case 'home':
      return p === `${props.prefix}/home` || p.startsWith(`${props.prefix}/home/`)
    case 'market':
      return p.startsWith(`${props.prefix}/market`)
    case 'trade':
      return p.startsWith(tradePath.value)
    case 'finance':
      return p === fh || p.startsWith(`${fh}/`)
    case 'me':
      if (p === fh || p.startsWith(`${fh}/`)) return false
      return p === pc || p === `${pc}/` || p.startsWith(`${pc}/`)
    default:
      return false
  }
}
</script>

<template>
  <nav
    class="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[calc(0.6rem+env(safe-area-inset-bottom,0px))] pt-2 pointer-events-none lg:hidden"
    aria-label="底部导航"
  >
    <div
      class="pointer-events-auto rounded-2xl border border-white/[0.05] bg-[#0b0e11]/82 shadow-[0_-4px_32px_rgba(0,0,0,0.35),0_8px_24px_-8px_rgba(0,0,0,0.25)] backdrop-blur-xl supports-[backdrop-filter]:bg-[#0b0e11]/70"
    >
      <div class="flex h-[3.35rem] items-stretch justify-around sm:h-14">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.key"
        :to="tab.to"
        class="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-medium transition-colors duration-200 [-webkit-tap-highlight-color:transparent] sm:text-[11px]"
        :class="
          isTabActive(tab.key)
            ? 'text-lime-300'
            : 'text-[#848e9c]/90 hover:text-white/70 active:bg-white/[0.04]'
        "
      >
        <!-- 首页 -->
        <svg
          v-if="tab.key === 'home'"
          class="h-[22px] w-[22px] shrink-0 sm:h-6 sm:w-6"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 10.5 12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20V10.5Z"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
          <path
            d="M9 21.5V14h6v7.5"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
        <!-- 行情 -->
        <svg
          v-else-if="tab.key === 'market'"
          class="h-[22px] w-[22px] shrink-0 sm:h-6 sm:w-6"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 16l4-6 4 3 4-8 4 5"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path d="M4 20h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
        <!-- 交易 -->
        <svg
          v-else-if="tab.key === 'trade'"
          class="h-[22px] w-[22px] shrink-0 sm:h-6 sm:w-6"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <!-- 金融：硬币 + 上升收益柱（偏「赚钱」语义，与顶栏 finance 图标同源） -->
        <svg
          v-else-if="tab.key === 'finance'"
          class="h-[22px] w-[22px] shrink-0 sm:h-6 sm:w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M4.9 15.75a3.35 2.05 0 1 0 6.7 0a3.35 2.05 0 1 0-6.7 0" />
          <path d="M8.25 13.7V9.5M6.35 11.6h3.8" />
          <path d="M14.25 18v-4.25M17.75 18V11M21.25 18V6.75" stroke-width="1.65" />
        </svg>
        <!-- 我的 -->
        <svg
          v-else-if="tab.key === 'me'"
          class="h-[22px] w-[22px] shrink-0 sm:h-6 sm:w-6"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
            stroke="currentColor"
            stroke-width="1.6"
          />
          <path
            d="M4 20.5c1.6-3.2 4.7-5 8-5s6.4 1.8 8 5"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
        <span class="max-w-[4.25rem] truncate text-center leading-tight">{{ tab.label }}</span>
      </RouterLink>
      </div>
    </div>
  </nav>
</template>
