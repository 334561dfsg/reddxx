<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getSiteConfigSnapshot,
  SITE_CONFIG_STORAGE_KEY
} from '../../admin/mock/siteConfig'
import { resolveFrontLocalePreference, useFrontSiteI18n } from '../../composables/useFrontSiteI18n'

const route = useRoute()
const router = useRouter()
const siteConfig = ref(getSiteConfigSnapshot())
const currentLocale = ref(resolveFrontLocalePreference())
const { defaultLocale } = useFrontSiteI18n()

function refreshSiteConfig() {
  siteConfig.value = getSiteConfigSnapshot()
  currentLocale.value = resolveFrontLocalePreference()
}

function refreshLocale() {
  currentLocale.value = resolveFrontLocalePreference()
}

function onSiteConfigStorage(e) {
  if (e.key === SITE_CONFIG_STORAGE_KEY) refreshSiteConfig()
}

onMounted(() => {
  window.addEventListener('storage', onSiteConfigStorage)
  window.addEventListener('admin-site-config-updated', refreshSiteConfig)
  window.addEventListener('front-locale-change', refreshLocale)
})

onUnmounted(() => {
  window.removeEventListener('storage', onSiteConfigStorage)
  window.removeEventListener('admin-site-config-updated', refreshSiteConfig)
  window.removeEventListener('front-locale-change', refreshLocale)
})

const announcementId = computed(() => String(route.params.announcementId || ''))
const publicAnnouncements = computed(() =>
  (siteConfig.value.announcements || []).filter((row) => row.enabled !== false)
)
const localizedAnnouncements = computed(() => {
  const currentRows = publicAnnouncements.value.filter((row) => row.locale === currentLocale.value)
  if (currentRows.length) return currentRows
  const defaultRows = publicAnnouncements.value.filter((row) => row.locale === defaultLocale.value)
  if (defaultRows.length) return defaultRows
  return publicAnnouncements.value.filter((row) => row.locale === 'zh-CN')
})
const announcement = computed(() =>
  localizedAnnouncements.value.find((row) => row.id === announcementId.value) ||
  publicAnnouncements.value.find((row) => row.id === announcementId.value)
)

const detail = computed(() => announcement.value || null)

function backToList() {
  router.push({ name: 'front-announcements' })
}
</script>

<template>
  <main class="min-h-screen min-h-[100dvh] bg-black text-white" aria-labelledby="front-announcement-detail-page-title">
    <section class="mx-auto w-full max-w-[56.5rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom,0px))] pt-[env(safe-area-inset-top,0px)] sm:px-8 md:pt-16 lg:px-10">
      <header class="grid h-12 grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center md:mb-10 md:h-auto md:min-h-10">
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center justify-self-start rounded-md text-white/88 transition hover:bg-white/[0.06] hover:text-lime-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/35"
          aria-label="返回公告列表"
          @click="backToList"
        >
          <svg class="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 5 8 12l7 7" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <h1 id="front-announcement-detail-page-title" class="justify-self-center text-base font-bold tracking-tight text-white md:text-3xl">
          详情
        </h1>
        <span class="h-10 w-10" aria-hidden="true" />
      </header>

      <article v-if="detail" class="py-5 md:rounded-xl md:border md:border-white/[0.10] md:px-9 md:py-10">
        <h2 id="front-announcement-detail-title" class="text-base font-bold leading-snug text-white md:text-2xl">
          {{ detail.title }}
        </h2>
        <time class="mt-3 block font-mono text-xs text-white/38">{{ detail.publishedAt }}</time>
        <div class="announcement-detail-body mt-5 border-t border-white/[0.12] pt-5 md:mt-7 md:pt-7" v-html="detail.html" />
      </article>

      <section v-else class="border-y border-white/[0.10] py-16 text-center md:rounded-xl md:border">
        <h2 id="front-announcement-detail-title" class="text-xl font-semibold text-white/86">公告不存在</h2>
        <p class="mt-2 text-sm text-white/45">该公告未发布、已停用或已被删除。</p>
      </section>
    </section>
  </main>
</template>

<style scoped>
.announcement-detail-body :deep(h1),
.announcement-detail-body :deep(h2),
.announcement-detail-body :deep(h3) {
  margin: 1.25rem 0 0.65rem;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 700;
  line-height: 1.25;
}

.announcement-detail-body :deep(h2) {
  font-size: 1.375rem;
}

.announcement-detail-body :deep(p) {
  margin: 0.75rem 0;
  color: rgba(255, 255, 255, 0.64);
  font-size: 0.96rem;
  line-height: 1.9;
}

.announcement-detail-body :deep(ul),
.announcement-detail-body :deep(ol) {
  margin: 0.75rem 0 0.75rem 1.25rem;
  color: rgba(255, 255, 255, 0.64);
  line-height: 1.85;
}

.announcement-detail-body :deep(ul) {
  list-style: disc;
}

.announcement-detail-body :deep(ol) {
  list-style: decimal;
}
</style>
