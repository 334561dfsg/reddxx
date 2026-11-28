<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import FrontStrokeIcon from './front/FrontStrokeIcon.vue'
import { getFrontMoreDemoLinks } from '../constants/frontNav'

const route = useRoute()

const menuOpen = ref(false)
const rootRef = ref(null)

const platformEntries = [
  { key: 'admin', label: '管理台', to: '/admin' },
  { key: 'front', label: '前台', to: '/front/home' },
  { key: 'agent-system', label: '代理系统', to: '/agent-system/dashboard' }
]

const moreLinks = computed(() => getFrontMoreDemoLinks('/front'))

const currentEntry = computed(() => {
  if (route.path.startsWith('/admin')) return 'admin'
  if (route.path.startsWith('/front')) return 'front'
  if (route.path.startsWith('/agent-system')) return 'agent-system'
  return ''
})

/** 前台窄屏有底部 Tab，抬高快捷菜单避免遮挡 */
// Admin editor and settings pages keep a sticky action bar at the bottom right; lift the quick menu above it so it
// never covers the primary save action.
const liftAboveEarnFooter = computed(() => /^\/admin\/((earn|lending|quant-fund)\/products|charity\/projects|strategy\/templates|c2c\/quotes|news(\/categories)?)\/(new|[^/]+\/edit)\/?$/.test(route.path)
  || /^\/admin\/(c2c\/agreement|charity\/stats|lending\/risk-policy|strategy\/risk-policy)\/?$/.test(route.path))

const liftAboveTabBar = computed(() => currentEntry.value === 'front')

function isMoreLinkActive(to) {
  const p = route.path
  return p === to || p.startsWith(`${to}/`)
}

function closeMenu() {
  menuOpen.value = false
}

watch(() => route.fullPath, closeMenu)

function onDocPointerDown(ev) {
  if (rootRef.value?.contains(ev.target)) return
  closeMenu()
}

watch(menuOpen, (open) => {
  if (open) {
    document.addEventListener('pointerdown', onDocPointerDown, true)
  } else {
    document.removeEventListener('pointerdown', onDocPointerDown, true)
  }
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
})

function platformRowClass(key) {
  return currentEntry.value === key
    ? 'bg-lime-300/12 text-lime-200'
    : 'text-white/85 hover:bg-white/[0.06]'
}
</script>

<template>
  <div
    ref="rootRef"
    class="fixed right-4 z-50 bottom-4"
    :style="liftAboveEarnFooter ? {bottom:'calc(96px + env(safe-area-inset-bottom, 0px))'} : undefined"
    :class="
      liftAboveTabBar
        ? 'max-lg:[bottom:calc(1rem+0.5rem+3.5rem+0.6rem+env(safe-area-inset-bottom,0px))]'
        : ''
    "
  >
    <div class="relative">
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-2xl border border-white/20 bg-black/80 px-3 py-2 text-xs font-medium shadow-2xl backdrop-blur transition"
        :class="
          menuOpen
            ? 'border-lime-300/50 bg-lime-300/15 text-lime-200'
            : 'text-white/90 hover:bg-white/10'
        "
        :aria-expanded="menuOpen"
        aria-haspopup="true"
        aria-controls="cross-platform-float-menu"
        @click="menuOpen = !menuOpen"
      >
        快捷菜单
        <FrontStrokeIcon
          :name="menuOpen ? 'chevron-down' : 'chevron-up'"
          size-class="h-3.5 w-3.5 shrink-0 opacity-70"
        />
      </button>

      <div
        v-show="menuOpen"
        id="cross-platform-float-menu"
        class="absolute right-0 bottom-full z-50 mb-2 max-h-[min(70vh,26rem)] w-[min(17rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-white/15 bg-[#0d0d0d] py-2 shadow-2xl"
        role="menu"
      >
        <div class="px-3 pb-1 text-[10px] font-semibold tracking-wide text-white/40">平台入口</div>
        <RouterLink
          v-for="entry in platformEntries"
          :key="entry.key"
          :to="entry.to"
          role="menuitem"
          class="mx-1 block rounded-lg px-3 py-2.5 text-sm transition"
          :class="platformRowClass(entry.key)"
          @click="closeMenu"
        >
          {{ entry.label }}
        </RouterLink>

        <div class="mx-2 my-2 border-t border-white/10" role="separator" />

        <div class="px-3 pb-1 text-[10px] font-semibold tracking-wide text-white/40">更多</div>
        <RouterLink
          v-for="item in moreLinks"
          :key="item.key"
          :to="item.to"
          role="menuitem"
          class="mx-1 block rounded-lg px-3 py-2.5 text-sm transition"
          :class="
            isMoreLinkActive(item.to)
              ? 'bg-lime-300/12 text-lime-200'
              : 'text-white/85 hover:bg-white/[0.06]'
          "
          @click="closeMenu"
        >
          {{ item.label }}
        </RouterLink>
      </div>
    </div>
  </div>
</template>
