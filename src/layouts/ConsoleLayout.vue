<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '../admin/components/AppSidebar.vue'
import AppHeader from '../admin/components/AppHeader.vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import CrossPlatformFloatNav from '../components/CrossPlatformFloatNav.vue'

// Date pickers format through dayjs; match the zh_CN ConfigProvider locale (month/weekday names).
dayjs.locale('zh-cn')

const route = useRoute()
const mobileMenuOpen = ref(false)

watch(
  () => route.fullPath,
  () => {
    mobileMenuOpen.value = false
  }
)
</script>

<template>
  <a-config-provider :auto-insert-space-in-button="false" :locale="zhCN" :theme="{ token: { colorPrimary: '#1677ff', borderRadius: 6, controlHeight: 40 } }">
  <a-layout class="admin-antd-shell" style="height: 100dvh; min-height: 0; flex-direction: row">
    <AppSidebar :mobile-open="mobileMenuOpen" @close="mobileMenuOpen = false" />



    <a-layout class="min-w-0 flex-1">
      <AppHeader @toggle-menu="mobileMenuOpen = !mobileMenuOpen" />
      <a-layout-content class="min-h-0 flex-1 overflow-auto bg-[#f0f2f5] px-4 py-4 md:px-8 md:py-6">
        <RouterView />
      </a-layout-content>
    </a-layout>
    <CrossPlatformFloatNav />
  </a-layout>
  </a-config-provider>
</template>
