import { createRouter, createWebHistory, START_LOCATION } from 'vue-router'
import Trade from './pages/Trade.vue'
import { applyLocale, locale } from './i18n'

applyLocale(locale.value)

export const router = createRouter({
  history: createWebHistory('/trade-v2/'),
  routes: [
    { path: '/', redirect: '/futures/BTCUSDT' },
    { path: '/:mode(futures|options|spot)/:symbol?', component: Trade },
    { path: '/:pathMatch(.*)*', component: Trade, meta: { placeholder: true } },
  ],
  scrollBehavior(to, from, saved) {
    return from === START_LOCATION ? { left: 0, top: 0, behavior: 'instant' } : saved || { left: 0, top: 0 }
  },
})

router.beforeEach((to, from) => {
  if (to.meta.placeholder) {
    // Non-trading navigation is a placeholder; direct unknown URLs recover locally.
    return from === START_LOCATION ? '/futures/BTCUSDT' : false
  }
})
