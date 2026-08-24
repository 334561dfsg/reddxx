<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getFrontNewsList } from '../../admin/mock/frontNews'
import { getSiteConfigSnapshot, SITE_CONFIG_STORAGE_KEY } from '../../admin/mock/siteConfig'
import FrontTopNav from '../../components/FrontTopNav.vue'

const router = useRouter()
const navMenuOpen = ref(false)
const siteConfig = ref(getSiteConfigSnapshot())

const newsRows = computed(() => getFrontNewsList(siteConfig.value.frontNews))
const featuredNews = computed(() => newsRows.value[0] || null)
const listRows = computed(() => newsRows.value.slice(1))

function refreshSiteConfig() {
  siteConfig.value = getSiteConfigSnapshot()
}

function handleStorage(event) {
  if (!event || event.key === SITE_CONFIG_STORAGE_KEY) refreshSiteConfig()
}

function toNewsDetail(row) {
  router.push({
    name: 'front-news-detail',
    params: { newsId: row.id }
  })
}

function openNavigationMenu() {
  navMenuOpen.value = true
}

onMounted(() => {
  window.addEventListener('admin-site-config-updated', refreshSiteConfig)
  window.addEventListener('storage', handleStorage)
})

onUnmounted(() => {
  window.removeEventListener('admin-site-config-updated', refreshSiteConfig)
  window.removeEventListener('storage', handleStorage)
})
</script>

<template>
  <main class="min-h-screen min-h-[100dvh] bg-black text-white" aria-labelledby="front-news-title">
    <FrontTopNav
      prefix="/front"
      drawer-only
      v-model:mobile-drawer-open="navMenuOpen"
      @mobile-open-change="navMenuOpen = $event"
    />
    <section class="mx-auto w-full max-w-[64rem] px-5 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] pt-[env(safe-area-inset-top,0px)] sm:px-8 md:pt-16 lg:px-10">
      <header class="relative mb-0 flex h-12 items-center justify-center border-b border-white/[0.08] md:mb-12 md:h-auto md:min-h-10 md:border-b-0">
        <button
          type="button"
          class="absolute -left-[18px] inline-flex h-9 w-9 items-center justify-center rounded-md text-white/86 transition hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/35 lg:hidden"
          aria-haspopup="dialog"
          aria-controls="front-nav-drawer"
          :aria-expanded="navMenuOpen"
          :aria-label="navMenuOpen ? '关闭菜单' : '打开菜单'"
          @click="openNavigationMenu"
        >
          <svg class="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
          </svg>
        </button>
        <h1 id="front-news-title" class="text-lg font-bold tracking-tight text-white md:text-3xl">
          新闻资讯
        </h1>
      </header>

      <section class="mx-auto w-full max-w-[56.5rem]" aria-label="新闻资讯列表">
        <button
          v-if="featuredNews"
          type="button"
          class="group mb-5 flex w-full flex-col rounded-xl border border-white/[0.08] bg-[#0b0e11] p-5 text-left transition hover:border-lime-400/24 hover:bg-[#10151a] focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/35 sm:p-6 md:mb-6 md:p-8"
          @click="toNewsDetail(featuredNews)"
        >
          <div class="flex items-center justify-between gap-4">
            <span class="rounded-md border border-lime-400/20 bg-lime-400/[0.08] px-2.5 py-1 text-[11px] font-semibold text-lime-300">
              {{ featuredNews.tag }}
            </span>
            <time class="font-mono text-xs text-white/38">{{ featuredNews.date }}</time>
          </div>
          <h2 class="mt-5 text-xl font-bold leading-tight text-white transition group-hover:text-lime-100 sm:text-2xl">
            {{ featuredNews.title }}
          </h2>
          <p class="mt-3 text-sm leading-relaxed text-white/52">
            {{ featuredNews.summary }}
          </p>
        </button>

        <div v-if="listRows.length" class="divide-y divide-[#252936] border-y border-white/[0.10] md:rounded-xl md:border md:px-7">
          <button
            v-for="row in listRows"
            :key="row.id"
            type="button"
            class="group grid w-full gap-2 py-4 text-left transition hover:text-lime-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/35 sm:grid-cols-[7.25rem_minmax(0,1fr)_1.5rem] sm:items-center md:py-[1.0625rem]"
            @click="toNewsDetail(row)"
          >
            <div class="flex items-center gap-2 sm:block">
              <time class="font-mono text-[13px] text-white/48 sm:text-sm">{{ row.date }}</time>
              <span class="rounded border border-white/[0.08] px-1.5 py-0.5 text-[10px] font-semibold text-white/40 sm:mt-2 sm:inline-block">
                {{ row.tag }}
              </span>
            </div>
            <span class="min-w-0 truncate text-[15px] font-semibold text-white transition group-hover:text-lime-200">
              {{ row.title }}
            </span>
            <svg
              class="hidden h-4 w-4 shrink-0 justify-self-end text-white/45 transition group-hover:translate-x-0.5 group-hover:text-lime-300 sm:block"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </section>
    </section>
  </main>
</template>
