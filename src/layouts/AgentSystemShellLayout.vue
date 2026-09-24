<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CrossPlatformFloatNav from '../components/CrossPlatformFloatNav.vue'
import { getAgentSystemNav } from '../constants/agentSystemNav'
import { AGENT_DEMO_LOGIN_ENABLED, useAgentAuthStore } from '../stores/agentAuth'

const route = useRoute()
const router = useRouter()
const auth = useAgentAuthStore()

const mobileNavOpen = ref(false)
const navigation = computed(() => getAgentSystemNav(auth.role))

const pageTitle = computed(() => route.meta?.title || '代理系统')

function navActive(to) {
  const p = route.path.replace(/\/+$/, '') || '/'
  const t = to.replace(/\/+$/, '') || '/'
  return p === t || p.startsWith(`${t}/`)
}

function logout() {
  auth.logout()
  mobileNavOpen.value = false
  router.push('/agent-system/login')
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-[#0a0f14] text-slate-100 md:flex-row">
    <!-- 窄屏顶栏 -->
    <header
      class="flex items-center justify-between gap-3 border-b border-emerald-950/60 bg-[#0c1219] px-4 py-3 md:hidden"
    >
      <span class="min-w-0 shrink text-sm font-semibold text-emerald-200">代理系统</span>
      <div class="flex shrink-0 items-center gap-2">
        <button
          type="button"
          class="rounded-lg border border-white/12 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
          @click="logout"
        >
          退出
        </button>
        <button
          type="button"
          class="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/20"
          @click="mobileNavOpen = !mobileNavOpen"
        >
          {{ mobileNavOpen ? '收起' : '菜单' }}
        </button>
      </div>
    </header>

    <!-- 侧栏 -->
    <aside
      class="shrink-0 border-emerald-950/50 bg-[#0c1219] md:flex md:w-56 md:flex-col md:border-r"
      :class="mobileNavOpen ? 'block border-b md:border-b-0' : 'hidden md:flex'"
    >
      <div class="hidden border-b border-white/[0.06] px-4 py-5 md:block">
        <p class="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-400/80">Partner</p>
        <p class="mt-1 text-lg font-semibold text-white">代理系统</p>
        <p class="mt-1 truncate text-xs text-white/45" :title="auth.email || ''">
          {{ auth.nickname || '—' }}
          <span v-if="auth.uid" class="block font-mono text-[10px] text-white/30">UID {{ auth.uid }}</span>
        </p>
      </div>
      <button v-if="AGENT_DEMO_LOGIN_ENABLED" type="button" class="mx-4 my-3 rounded-lg border border-emerald-500/25 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400" @click="logout">切换演示身份</button>
      <nav class="space-y-0.5 p-2 md:flex-1 md:overflow-y-auto md:p-3" aria-label="代理系统导航">
        <RouterLink
          v-for="item in navigation"
          :key="item.key"
          :to="item.to"
          class="flex flex-col rounded-lg px-3 py-2.5 text-left transition"
          :class="
            navActive(item.to)
              ? 'bg-emerald-500/15 text-emerald-100'
              : 'text-white/75 hover:bg-white/[0.04] hover:text-white'
          "
          @click="mobileNavOpen = false"
        >
          <span class="text-sm font-medium">{{ item.label }}</span>
          <span class="text-[11px] text-white/40">{{ item.desc }}</span>
        </RouterLink>
      </nav>
      <!-- 窄屏展开菜单时底部也可退出（顶栏已有「退出」） -->
      <div class="border-t border-white/[0.06] p-3 md:hidden">
        <button
          type="button"
          class="w-full rounded-lg border border-white/10 px-3 py-2 text-xs text-white/80 transition hover:bg-white/[0.06]"
          @click="logout"
        >
          退出登录
        </button>
      </div>
    </aside>

    <!-- 主区 -->
    <div class="flex min-h-0 min-w-0 flex-1 flex-col">
      <header
        class="hidden items-center justify-between gap-4 border-b border-emerald-950/60 bg-[#0a0f14]/95 px-6 py-4 backdrop-blur md:flex"
      >
        <h1 class="min-w-0 text-lg font-semibold text-white">{{ pageTitle }}</h1>
        <button
          type="button"
          class="shrink-0 rounded-lg border border-white/10 px-4 py-2 text-xs font-medium text-white/80 transition hover:border-white/18 hover:bg-white/[0.06] hover:text-white"
          @click="logout"
        >
          退出登录
        </button>
      </header>
      <main
        id="agent-system-scroll-root"
        class="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-8"
      >
        <RouterView />
      </main>
    </div>

    <CrossPlatformFloatNav />
  </div>
</template>
