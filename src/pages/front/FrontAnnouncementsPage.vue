<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  getSiteConfigSnapshot,
  SITE_CONFIG_STORAGE_KEY
} from '../../admin/mock/siteConfig'
import FrontTopNav from '../../components/FrontTopNav.vue'
import { resolveFrontLocalePreference, useFrontSiteI18n } from '../../composables/useFrontSiteI18n'

const router = useRouter()
const navMenuOpen = ref(false)
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

const listRows = computed(() =>
  localizedAnnouncements.value.filter((row) => row.title)
)

function toAnnouncementDetail(row) {
  router.push({
    name: 'front-announcement-detail',
    params: { announcementId: row.id }
  })
}

function openNavigationMenu() {
  navMenuOpen.value = true
}
</script>

<template>
  <main class="min-h-screen min-h-[100dvh] bg-black text-white" aria-labelledby="front-announcements-title">
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
          class="absolute left-0 inline-flex h-9 w-9 items-center justify-center rounded-md text-white/86 transition hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/35 lg:hidden"
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
        <h1 id="front-announcements-title" class="text-lg font-bold tracking-tight text-white md:text-3xl">
          平台通知
        </h1>
      </header>

      <section
        class="mx-auto w-full max-w-[56.5rem] border-b border-white/[0.10] py-0 md:rounded-xl md:border md:px-9 md:py-9"
        aria-label="平台通知列表"
      >
        <div v-if="listRows.length" class="divide-y divide-[#252936]">
          <button
            v-for="row in listRows"
            :key="row.id"
            type="button"
            class="group flex w-full items-center justify-between gap-4 py-4 text-left text-sm text-white transition hover:text-lime-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/35 sm:text-[15px] md:py-[1.0625rem]"
            @click="toAnnouncementDetail(row)"
          >
            <span class="min-w-0 truncate">{{ row.title }}</span>
            <svg
              class="h-4 w-4 shrink-0 text-white/45 transition group-hover:translate-x-0.5 group-hover:text-lime-300"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
        <div v-else class="py-16 text-center">
          <p class="text-base font-semibold text-white/86">暂无平台通知</p>
          <p class="mt-2 text-sm text-white/45">有新的系统通知或运营公告时，会在这里展示。</p>
        </div>
      </section>
    </section>
  </main>
</template>
