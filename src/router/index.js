import { createRouter, createWebHistory } from 'vue-router'
import ConsoleLayout from '../layouts/ConsoleLayout.vue'
import FrontDesktopLayout from '../layouts/FrontDesktopLayout.vue'
import HomeEntryPage from '../pages/HomeEntryPage.vue'
import { useAgentAuthStore } from '../stores/agentAuth'
import { canAccessAgentSystemPath } from '../constants/agentSystemNav.js'
import { useFrontAuthStore } from '../stores/frontAuth'
import { agentSystemRoutes } from './modules/agentSystem'
import { consoleRoutes } from './modules/console'
import { legacyRoutes } from './modules/legacy'
import { frontDesktopRoutes } from './modules/front'

const routes = [
  {
    path: '/',
    component: HomeEntryPage
  },
  {
    path: '/:legacyBase(users|contracts|perpetual|delivery|assets|system|liquidity|lending|ai-quant|spot|agent|referral)/:legacyRest(.*)*',
    redirect: (to) => `/admin/${to.params.legacyBase}${to.params.legacyRest ? `/${to.params.legacyRest}` : ''}`
  },
  {
    path: '/admin',
    component: ConsoleLayout,
    children: [...consoleRoutes, ...legacyRoutes]
  },
  {
    path: '/front',
    component: FrontDesktopLayout,
    children: frontDesktopRoutes
  },
  ...agentSystemRoutes,
  /** 旧 /m 路径重定向到统一响应式前台 */
  {
    path: '/m',
    redirect: '/front/home'
  },
  {
    path: '/m/:pathMatch(.*)*',
    redirect: (to) => {
      const m = to.params.pathMatch
      const tail = Array.isArray(m) ? m.filter(Boolean).join('/') : (m ? String(m) : '')
      return tail ? `/front/${tail.replace(/^\/+/, '')}` : '/front/home'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    const tradePathRe = /^\/front\/trade\/[^/]+\/[^/]+$/
    if (
      from?.path &&
      tradePathRe.test(to.path) &&
      tradePathRe.test(from.path)
    ) {
      return false
    }
    return { left: 0, top: 0 }
  }
})

router.beforeEach((to) => {
  const agentAuth = useAgentAuthStore()
  agentAuth.ensureHydrated()

  if (to.path.startsWith('/agent-system')) {
    const needAgent = to.matched.some((r) => r.meta.agentRequiresAuth)
    if (needAgent && !agentAuth.isLoggedIn) {
      return {
        path: '/agent-system/login',
        query: { redirect: to.fullPath }
      }
    }
    if (needAgent && to.path !== '/agent-system' && !canAccessAgentSystemPath(agentAuth.role, to.path)) {
      return '/agent-system/dashboard'
    }
    const guestAgent = to.matched.some((r) => r.meta.agentGuestOnly)
    if (guestAgent && agentAuth.isLoggedIn) {
      const r =
        typeof to.query.redirect === 'string' &&
        to.query.redirect.startsWith('/agent-system') &&
        !to.query.redirect.startsWith('/agent-system/login')
          ? to.query.redirect
          : '/agent-system/dashboard'
      return r
    }
    return true
  }

  const auth = useFrontAuthStore()
  auth.ensureHydrated()

  const needAuth = to.matched.some((r) => r.meta.requiresAuth)
  if (needAuth && !auth.isLoggedIn) {
    return {
      path: '/front/login',
      query: { redirect: to.fullPath }
    }
  }

  const guestOnly = to.matched.some((r) => r.meta.guestOnly)
  if (guestOnly && auth.isLoggedIn) {
    const r =
      typeof to.query.redirect === 'string' &&
      to.query.redirect.startsWith('/front') &&
      !to.query.redirect.startsWith('/front/login')
        ? to.query.redirect
        : '/front/personal-center'
    return r
  }

  return true
})

export default router
