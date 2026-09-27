<script setup>
import { computed, onMounted, onUnmounted, ref, h, watch } from 'vue'
import { getSiteConfigSnapshot } from '../mock/siteConfig'
import { navTree } from '../config/nav'
import { useAdminPermissionsStore } from '../stores/adminPermissions'
import { filterNavTreeByPermissions } from '../utils/filterNavByPermissions'
import { Layout, Drawer } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'
import { AppstoreOutlined, TeamOutlined, SettingOutlined, BarChartOutlined } from '@ant-design/icons-vue'

const wide = ref(window.matchMedia('(min-width: 1024px)').matches)
const media = window.matchMedia('(min-width: 1024px)')
const syncWidth = event => { wide.value = event.matches }
onMounted(() => media.addEventListener('change', syncWidth))
onUnmounted(() => media.removeEventListener('change', syncWidth))
const route = useRoute()
const router = useRouter()
const openKeys = ref([])
const menuItems = computed(() => {
  const map = (items) => items.map(item => ({ key: item.path || item.title, label: item.title, icon: item.icon ? () => h(item.icon === 'users' ? TeamOutlined : item.icon === 'finance' ? BarChartOutlined : item.icon === 'settings' ? SettingOutlined : AppstoreOutlined) : undefined, children: item.children?.length ? map(item.children) : undefined }))
  return map(filteredNavTree.value)
})
const permStore = useAdminPermissionsStore()

const filteredNavTree = computed(() =>
  filterNavTreeByPermissions(navTree, (keys) => permStore.canAny(keys))
)

watch(() => route.path, path => {
  const visit = (items, parents = []) => { for (const item of items) { const key = item.path || item.title; if (item.path === path) openKeys.value = [...new Set([...openKeys.value, ...parents])]; if (item.children) visit(item.children, [...parents, key]) } }
  visit(filteredNavTree.value)
}, { immediate: true, flush: 'post' })

const props = defineProps({
  mobileOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const siteName = ref('CryptoX Pro')
const siteTagline = ref('')
const siteLogoUrlPc = ref('')
const siteLogoUrlMobile = ref('')

/** 宽屏侧栏：优先 PC Logo，否则移动端 */
const logoForDesktop = computed(
  () => siteLogoUrlPc.value || siteLogoUrlMobile.value || ''
)
/** 窄屏抽屉：优先移动端 Logo，否则 PC */
const logoForMobile = computed(
  () => siteLogoUrlMobile.value || siteLogoUrlPc.value || ''
)

const applySiteBranding = () => {
  const c = getSiteConfigSnapshot()
  siteName.value = c.siteName || 'CryptoX Pro'
  siteTagline.value = c.tagline || ''
  siteLogoUrlPc.value = c.logoUrlPc || ''
  siteLogoUrlMobile.value = c.logoUrlMobile || ''
}

onMounted(() => {
  applySiteBranding()
  window.addEventListener('admin-site-config-updated', applySiteBranding)
})

onUnmounted(() => {
  window.removeEventListener('admin-site-config-updated', applySiteBranding)
})

const sidebarClass = computed(() => {
  if (props.mobileOpen) return 'translate-x-0'
  return '-translate-x-full lg:translate-x-0'
})
</script>

<template>
  <component :is="wide ? Layout.Sider : Drawer" :width="256" theme="light" :open="mobileOpen" placement="left" :mask-closable="false" :closable="false" :body-style="{ padding: 0 }" @close="emit('close')">
    <div class="flex h-full flex-col">
      <div class="flex items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4">
        <div class="flex min-w-0 items-center gap-3">
          <div
            class="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-antd-primary text-white"
            :class="{ 'bg-white ring-1 ring-slate-200': logoForDesktop || logoForMobile }"
          >
            <img
              v-if="logoForDesktop"
              :src="logoForDesktop"
              alt=""
              class="hidden h-full w-full object-contain lg:block"
            />
            <img
              v-if="logoForMobile"
              :src="logoForMobile"
              alt=""
              class="h-full w-full object-contain lg:hidden"
            />
            <svg
              v-if="!logoForDesktop && !logoForMobile"
              viewBox="0 0 20 20"
              class="h-4 w-4"
              fill="none"
            >
              <path d="M4 13L8 9L10.8 11.8L15.8 6.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="truncate text-lg leading-none font-bold text-slate-900">{{ siteName }}</p>
            <p v-if="siteTagline" class="mt-0.5 truncate text-[11px] leading-tight text-slate-500">{{ siteTagline }}</p>
          </div>
        </div>

        <a-button
          v-if="!wide"
          type="text"
          class="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          aria-label="关闭"
          @click="emit('close')"
        >
          <svg viewBox="0 0 20 20" class="h-5 w-5" fill="none">
            <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </a-button>
      </div>

      <nav class="sidebar-menu flex-1 overflow-y-auto py-2" aria-label="管理台导航">
        <a-menu v-model:open-keys="openKeys" :selected-keys="[route.path]" :items="menuItems" mode="inline" @click="({ key }) => { if (key.startsWith('/')) { router.push(key); emit('close') } }" />
      </nav>
    </div>
  </component>
</template>

<style scoped>
.sidebar-menu :deep(.ant-menu-item),
.sidebar-menu :deep(.ant-menu-submenu-title) {
  height: 36px;
  line-height: 36px;
  margin-block: 2px;
}
/* Preserve usable touch targets while keeping the surrounding spacing compact. */
@media (pointer: coarse) {
  .sidebar-menu :deep(.ant-menu-item),
  .sidebar-menu :deep(.ant-menu-submenu-title) {
    height: 44px;
    line-height: 44px;
  }
}
</style>
