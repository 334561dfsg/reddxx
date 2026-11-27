<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FrontStrokeIcon from '../components/front/FrontStrokeIcon.vue'
import {
  getPersonalCenterNavItems,
  getPersonalCenterShellMobileNavItems
} from '../constants/personalCenterNav'

const route = useRoute()

const prefix = '/front'

const primaryNav = computed(() => getPersonalCenterNavItems(prefix))
const mobileQuickNav = computed(() => getPersonalCenterShellMobileNavItems(prefix))

/** 与个人中心首页 3×3 网格入口对应的描边图标 */
const shellQuickIconByKey = {
  assets: 'wallet',
  ledger: 'clipboard',
  security: 'shield',
  verify: 'id-card',
  'withdraw-addresses': 'link',
  notifications: 'bell',
  'fees-vip': 'star',
  referral: 'gift',
  preferences: 'cog',
  'customer-service': 'message-circle'
}

function shellQuickIcon(key) {
  return shellQuickIconByKey[key] ?? 'monitor'
}

function pathNorm(p) {
  return p.replace(/\/+$/, '') || '/'
}

/** 个人中心首页（窄屏在此展示快捷网格；子页仅主内容） */
const isPersonalOverview = computed(() => {
  const home = pathNorm(`${prefix}/personal-center`)
  return pathNorm(route.path) === home
})

function navActive(item) {
  const p = route.path
  if (item.match === 'exact') {
    return p === item.to || p === `${item.to}/`
  }
  return p === item.to || p.startsWith(`${item.to}/`)
}
</script>

<template>
  <div
    class="min-h-[calc(100vh-3.5rem)] max-lg:min-h-[calc(100vh-3.5rem-0.5rem-3.5rem-0.6rem-env(safe-area-inset-bottom,0px))] border-t border-white/[0.04] bg-[#050505] text-white"
  >
    <div
      class="mx-auto flex max-w-[1400px] flex-col gap-5 px-3 pt-3 pb-6 sm:px-4 lg:flex-row lg:gap-8 lg:px-6 lg:pt-8 lg:pb-8"
      :class="
        isPersonalOverview
          ? 'max-lg:!pb-[calc(8.25rem+env(safe-area-inset-bottom,0px))] max-lg:gap-5'
          : ''
      "
    >
      <!-- 大屏左侧导航 -->
      <aside class="hidden w-[260px] shrink-0 lg:block" aria-label="个人中心导航">
        <div class="sticky top-20 space-y-6">
          <div class="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
            <p class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/42">
              菜单
            </p>
            <nav class="mt-3 space-y-1">
              <RouterLink
                v-for="item in primaryNav"
                :key="item.key"
                :to="item.to"
                class="group flex items-stretch gap-3 rounded-xl py-2 pl-2 pr-3 text-left transition-colors duration-200 [-webkit-tap-highlight-color:transparent] focus:outline-none"
                :class="
                  navActive(item)
                    ? 'bg-white/[0.055]'
                    : 'hover:bg-white/[0.035]'
                "
              >
                <span
                  class="mt-1.5 mb-1.5 w-[3px] shrink-0 self-stretch rounded-full transition-colors duration-200"
                  :class="
                    navActive(item)
                      ? 'bg-gradient-to-b from-lime-300 to-lime-500/90'
                      : 'bg-transparent group-hover:bg-white/[0.12]'
                  "
                  aria-hidden="true"
                />
                <span class="flex min-w-0 flex-col py-0.5">
                  <span
                    class="text-[15px] font-semibold leading-snug tracking-tight"
                    :class="navActive(item) ? 'text-white' : 'text-white/[0.92]'"
                  >
                    {{ item.label }}
                  </span>
                  <span
                    class="mt-1 text-[11px] font-normal leading-relaxed"
                    :class="
                      navActive(item) ? 'text-white/48' : 'text-[#848e9c] group-hover:text-white/55'
                    "
                  >
                    {{ item.description }}
                  </span>
                </span>
              </RouterLink>
            </nav>
          </div>
        </div>
      </aside>

      <!-- 主内容：窄屏不留额外左右边距（由外壳 px 承担），底部与大屏留白统一 -->
      <main class="min-w-0 flex-1 text-white">
        <div
          class="mx-auto w-full max-w-[1280px] px-0 pb-6 max-lg:pt-0 lg:pb-0"
          :class="isPersonalOverview ? 'max-lg:!pb-1' : ''"
        >
          <RouterView v-slot="{ Component }">
            <Transition name="pc-fade" mode="out-in">
              <component :is="Component" />
            </Transition>
          </RouterView>
        </div>
      </main>

      <!-- 窄屏：仅在总览页底部 — 3×3 紧凑网格；页面额外 pb 避开固定「快捷菜单」 -->
      <nav
        v-if="isPersonalOverview"
        class="lg:hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3"
        aria-label="个人中心入口"
      >
        <h2 class="mb-2 pl-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-white/32">
          常用服务
        </h2>
        <div class="grid grid-cols-3 gap-1.5">
          <RouterLink
            v-for="item in mobileQuickNav"
            :key="`m-${item.key}`"
            :to="item.to"
            class="group flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-center transition [-webkit-tap-highlight-color:transparent] active:scale-[0.99] focus:outline-none"
            :class="
              navActive(item)
                ? 'bg-lime-400/[0.09] text-lime-50'
                : 'text-white/82 hover:bg-white/[0.04] active:bg-white/[0.06]'
            "
          >
            <span
              class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-lime-200/90 transition group-hover:bg-white/[0.09]"
              :class="navActive(item) ? 'bg-lime-400/22 text-lime-50' : ''"
              aria-hidden="true"
            >
              <FrontStrokeIcon :name="shellQuickIcon(item.key)" size-class="h-[1.15rem] w-[1.15rem]" />
            </span>
            <span
              class="line-clamp-2 w-full px-0.5 text-center text-[11px] font-medium leading-tight text-white/80"
              :class="navActive(item) ? 'text-lime-50/95' : ''"
            >
              {{ item.label }}
            </span>
          </RouterLink>
        </div>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.pc-fade-enter-active,
.pc-fade-leave-active {
  transition: opacity 0.18s ease;
}

.pc-fade-enter-from,
.pc-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .pc-fade-enter-active,
  .pc-fade-leave-active {
    transition: none;
  }
}
</style>
