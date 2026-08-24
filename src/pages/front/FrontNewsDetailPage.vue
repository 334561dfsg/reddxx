<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getFrontNewsById } from '../../admin/mock/frontNews'
import { getSiteConfigSnapshot, SITE_CONFIG_STORAGE_KEY } from '../../admin/mock/siteConfig'
import { resolveFrontLocalePreference, useFrontSiteI18n } from '../../composables/useFrontSiteI18n'

const route = useRoute()
const router = useRouter()
const siteConfig = ref(getSiteConfigSnapshot())
const currentLocale = ref(resolveFrontLocalePreference())
const { defaultLocale } = useFrontSiteI18n()

const newsId = computed(() => String(route.params.newsId || ''))
const detail = computed(() =>
  getFrontNewsById(newsId.value, siteConfig.value.frontNews, currentLocale.value, defaultLocale.value)
)

function refreshSiteConfig() {
  siteConfig.value = getSiteConfigSnapshot()
  currentLocale.value = resolveFrontLocalePreference()
}

function refreshLocale() {
  currentLocale.value = resolveFrontLocalePreference()
}

function handleStorage(event) {
  if (!event || event.key === SITE_CONFIG_STORAGE_KEY) refreshSiteConfig()
}

function backToHome() {
  router.push({ name: 'front-home-desktop' })
}

onMounted(() => {
  window.addEventListener('admin-site-config-updated', refreshSiteConfig)
  window.addEventListener('storage', handleStorage)
  window.addEventListener('front-locale-change', refreshLocale)
})

onUnmounted(() => {
  window.removeEventListener('admin-site-config-updated', refreshSiteConfig)
  window.removeEventListener('storage', handleStorage)
  window.removeEventListener('front-locale-change', refreshLocale)
})
</script>

<template>
  <main class="min-h-screen min-h-[100dvh] bg-black text-white" aria-labelledby="front-news-detail-page-title">
    <section class="mx-auto w-full max-w-[56.5rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom,0px))] pt-[env(safe-area-inset-top,0px)] sm:px-8 md:pt-16 lg:px-10">
      <header class="relative flex h-12 items-center justify-center md:mb-10 md:h-auto md:min-h-10">
        <button
          type="button"
          class="absolute -left-[18px] inline-flex h-9 w-9 items-center justify-center rounded-md text-white/88 transition hover:bg-white/[0.06] hover:text-lime-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/35 md:left-0"
          aria-label="返回首页"
          @click="backToHome"
        >
          <svg class="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 5 8 12l7 7" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <h1 id="front-news-detail-page-title" class="text-base font-bold tracking-tight text-white md:text-3xl">
          新闻详情
        </h1>
      </header>

      <article v-if="detail" class="py-5 md:rounded-xl md:border md:border-white/[0.10] md:px-9 md:py-10">
        <time class="font-mono text-xs text-white/38">{{ detail.publishedAt }}</time>
        <h2 id="front-news-detail-title" class="mt-4 text-base font-bold leading-snug text-white md:text-2xl">
          {{ detail.title }}
        </h2>
        <p class="mt-3 text-sm leading-relaxed text-white/52">{{ detail.summary }}</p>
        <div class="news-detail-body mt-5 border-t border-white/[0.12] pt-5 md:mt-7 md:pt-7" v-html="detail.html" />
      </article>

      <section v-else class="border-y border-white/[0.10] py-16 text-center md:rounded-xl md:border">
        <h2 id="front-news-detail-title" class="text-xl font-semibold text-white/86">新闻不存在</h2>
        <p class="mt-2 text-sm text-white/45">该新闻已下线或链接已失效。</p>
      </section>
    </section>
  </main>
</template>

<style scoped>
.news-detail-body :deep(h1),
.news-detail-body :deep(h2),
.news-detail-body :deep(h3) {
  margin: 1.25rem 0 0.65rem;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 700;
  line-height: 1.25;
}

.news-detail-body :deep(h2) {
  font-size: 1.375rem;
}

.news-detail-body :deep(p) {
  margin: 0.75rem 0;
  color: rgba(255, 255, 255, 0.64);
  font-size: 0.96rem;
  line-height: 1.9;
}

.news-detail-body :deep(ul),
.news-detail-body :deep(ol) {
  margin: 0.75rem 0 0.75rem 1.25rem;
  color: rgba(255, 255, 255, 0.64);
  line-height: 1.85;
}

.news-detail-body :deep(ul) {
  list-style: disc;
}

.news-detail-body :deep(ol) {
  list-style: decimal;
}
</style>
