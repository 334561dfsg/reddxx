<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getSiteConfigSnapshot } from '../../admin/mock/siteConfig'
import { resolveFrontLocalePreference, useFrontSiteI18n } from '../../composables/useFrontSiteI18n'

const route = useRoute()
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

onMounted(() => {
  window.addEventListener('admin-site-config-updated', refreshSiteConfig)
  window.addEventListener('front-locale-change', refreshLocale)
})

onUnmounted(() => {
  window.removeEventListener('admin-site-config-updated', refreshSiteConfig)
  window.removeEventListener('front-locale-change', refreshLocale)
})

const slug = computed(() => String(route.params.slug || route.meta.contentSlug || '').trim().toLowerCase())
const parentSlug = computed(() => String(route.params.parentSlug || '').trim().toLowerCase())
const pages = computed(() => siteConfig.value.contentPages?.pages || [])
const parentPage = computed(() => {
  if (parentSlug.value) return pages.value.find((row) => !row.parentId && row.slug === parentSlug.value)
  const current = pages.value.find((row) => row.slug === slug.value)
  return current?.parentId ? pages.value.find((row) => row.id === current.parentId) : current
})
const page = computed(() => {
  if (parentSlug.value) {
    const parent = parentPage.value
    if (!parent) return null
    return pages.value.find((row) => row.parentId === parent.id && row.slug === slug.value)
  }
  return pages.value.find((row) => row.slug === slug.value && !row.parentId) || pages.value.find((row) => row.slug === slug.value)
})
const childPages = computed(() => {
  const parent = parentPage.value
  if (!parent) return []
  return pages.value
    .filter((row) => row.parentId === parent.id && row.enabled && row.showInNav)
    .sort((a, b) => {
      if (a.sort !== b.sort) return b.sort - a.sort
      return a.slug.localeCompare(b.slug)
    })
})
const activePage = computed(() => {
  if (parentSlug.value) return page.value
  if (childPages.value.length) return childPages.value[0]
  return page.value
})
const headerPage = computed(() => parentPage.value || activePage.value)
const headerContent = computed(() => localizedPage(headerPage.value))
const activeContent = computed(() => localizedPage(activePage.value))

function childPath(child) {
  const parent = parentPage.value
  return parent ? `/front/pages/${parent.slug}/${child.slug}` : `/front/pages/${child.slug}`
}

function localizedPage(row) {
  if (!row) return null
  const locales = row.locales || {}
  const payload = locales[currentLocale.value] || locales[defaultLocale.value] || locales['zh-CN'] || {}
  const title = payload.title || row.title || ''
  return {
    title,
    navTitle: payload.navTitle || row.navTitle || title,
    summary: payload.summary || row.summary || '',
    html: payload.html || row.html || ''
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] bg-[#030304] text-white">
    <section class="border-b border-white/[0.06] bg-[#050608]">
      <div class="mx-auto max-w-6xl px-6 py-12 min-[400px]:px-[1.875rem] sm:px-9 md:py-16 lg:px-12">
        <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-lime-400/70">
          Content
        </p>
        <h1 class="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
          {{ headerContent?.title || '页面不存在' }}
        </h1>
        <p class="mt-4 max-w-2xl text-sm leading-relaxed text-white/55 sm:text-base">
          {{ headerContent?.summary || '该页面未配置或已被删除。' }}
        </p>
      </div>
    </section>

    <main class="mx-auto max-w-6xl px-6 py-10 min-[400px]:px-[1.875rem] sm:px-9 md:py-14 lg:px-12">
      <nav
        v-if="childPages.length"
        class="mb-8 overflow-x-auto border-b border-white/[0.07] pb-3"
        aria-label="内容子页面"
      >
        <div class="flex min-w-max items-center gap-6 text-sm font-semibold sm:text-base">
          <RouterLink
            v-for="child in childPages"
            :key="child.id"
            :to="childPath(child)"
            class="whitespace-nowrap transition"
            :class="activePage?.id === child.id ? 'text-white' : 'text-white/45 hover:text-lime-300'"
          >
            {{ localizedPage(child).navTitle || localizedPage(child).title }}
          </RouterLink>
        </div>
      </nav>
      <article
        v-if="activePage && activePage.enabled"
        class="content-body rounded-xl border border-white/[0.07] bg-white/[0.03] px-6 py-7 sm:px-8 md:px-10"
        v-html="activeContent?.html"
      />
      <div v-else class="rounded-xl border border-white/[0.07] bg-white/[0.03] p-8 text-center text-white/45">
        页面暂未启用。
      </div>
    </main>
  </div>
</template>

<style scoped>
.content-body :deep(h1),
.content-body :deep(h2),
.content-body :deep(h3) {
  margin: 1.25rem 0 0.65rem;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 700;
  line-height: 1.25;
}

.content-body :deep(h1) {
  font-size: 1.875rem;
}

.content-body :deep(h2) {
  font-size: 1.375rem;
}

.content-body :deep(h3) {
  font-size: 1.125rem;
}

.content-body :deep(p) {
  margin: 0.75rem 0;
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.95rem;
  line-height: 1.85;
}

.content-body :deep(ul),
.content-body :deep(ol) {
  margin: 0.75rem 0 0.75rem 1.25rem;
  color: rgba(255, 255, 255, 0.58);
  line-height: 1.8;
}

.content-body :deep(ul) {
  list-style: disc;
}

.content-body :deep(ol) {
  list-style: decimal;
}

.content-body :deep(a) {
  color: rgb(190, 242, 100);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.content-body :deep(img) {
  margin: 1rem 0;
  max-width: 100%;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
