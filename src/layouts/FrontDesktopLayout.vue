<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import CrossPlatformFloatNav from '../components/CrossPlatformFloatNav.vue'
import FrontBottomTabBar from '../components/FrontBottomTabBar.vue'
import FrontTopNav from '../components/FrontTopNav.vue'
import CustomerServiceFloatButton from '../components/front/CustomerServiceFloatButton.vue'
import { bumpFrontSiteI18n } from '../composables/useFrontSiteI18n'
import { SITE_CONFIG_STORAGE_KEY } from '../admin/mock/siteConfig'

/** 与 tailwind.css 中 html.front-site 规则对应：统一文档底色、禁止拉出浅底/白边 */
const FRONT_DOC_CLASS = 'front-site'
const route = useRoute()
const isCustomerService = computed(() => route.path === '/front/customer-service')
const hideFrontChromeOnMobile = computed(() => route.matched.some((record) => record.meta?.hideFrontChromeOnMobile))
const hideFrontFloatingOnMobile = computed(() => route.matched.some((record) => record.meta?.hideFrontFloatingOnMobile))
const hideFrontChrome = computed(() => route.matched.some((record) => record.meta?.hideFrontChrome === true))
const showFrontChrome = computed(() => !isCustomerService.value && !hideFrontChrome.value)
const frontTopNavClass = computed(() => (hideFrontChromeOnMobile.value ? 'hidden lg:block' : ''))
const frontBottomTabClass = computed(() => (hideFrontChromeOnMobile.value ? 'hidden' : ''))
const frontFloatingClass = computed(() => (hideFrontFloatingOnMobile.value ? 'hidden lg:inline-flex' : ''))
const frontShellClass = computed(() => {
  if (!showFrontChrome.value) return 'pb-0'
  if (hideFrontChromeOnMobile.value) return 'pb-0 lg:pb-0'
  return 'pb-[calc(0.5rem+3.5rem+0.6rem+env(safe-area-inset-bottom,0px))] lg:pb-0'
})
const crossPlatformNavClass = computed(() => {
  if (hideFrontChromeOnMobile.value || hideFrontFloatingOnMobile.value) return 'hidden lg:block'
  return ''
})

function onSiteConfigStorage(e) {
  if (e.key === SITE_CONFIG_STORAGE_KEY) bumpFrontSiteI18n()
}

function onAdminSiteConfigUpdated() {
  bumpFrontSiteI18n()
}

onMounted(() => {
  document.documentElement.classList.add(FRONT_DOC_CLASS)
  document.body.classList.add(FRONT_DOC_CLASS)
  window.addEventListener('storage', onSiteConfigStorage)
  window.addEventListener('admin-site-config-updated', onAdminSiteConfigUpdated)
})
onUnmounted(() => {
  document.documentElement.classList.remove(FRONT_DOC_CLASS)
  document.body.classList.remove(FRONT_DOC_CLASS)
  window.removeEventListener('storage', onSiteConfigStorage)
  window.removeEventListener('admin-site-config-updated', onAdminSiteConfigUpdated)
})
</script>

<template>
  <div
    class="min-h-screen min-h-[100dvh] w-full max-w-[100vw] bg-[#050505] text-white"
    :class="frontShellClass"
  >
    <FrontTopNav v-if="showFrontChrome" :class="frontTopNavClass" prefix="/front" />
    <!--
      横向裁剪用 clip 而非 hidden：hidden 会让多数浏览器把 overflow-y 算成 auto，
      本层变成滚动容器，破坏子页面里 sticky（如交易页 top-14 条）并出现布局错位/侧边露底。
    -->
    <div class="min-w-0 w-full overflow-x-clip overflow-y-visible">
      <RouterView />
    </div>
    <FrontBottomTabBar v-if="showFrontChrome" :class="frontBottomTabClass" prefix="/front" />
    <CustomerServiceFloatButton :class="frontFloatingClass" />
    <CrossPlatformFloatNav v-if="showFrontChrome" :class="crossPlatformNavClass" />
  </div>
</template>
