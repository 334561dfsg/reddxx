import { createApp, watch } from 'vue'
import {session} from './session.js'
import {availableInMode} from './utils/demoAccess.js'
import { createRouter, createWebHistory, START_LOCATION } from 'vue-router'
import App from './App.vue'
import {t,applyLocale,formatCompact,locale} from './i18n'
import {routes} from './routes.js'
import './styles/index.css'
const router=createRouter({history:createWebHistory('/NewQuantCapital/'),routes,scrollBehavior(to,from,saved){
  // A reload reuses history.state.scroll; only back/forward should restore it.
  if(from===START_LOCATION)return {left:0,top:0,behavior:'instant'}
  // In-app section links (e.g. the profile menu's 安全中心 → /profile#security) scroll below the fixed header.
  if(to.hash&&!saved)return {el:to.hash,top:80,behavior:'smooth'}
  return saved||{left:0,top:0}
}})
router.beforeEach((to,from)=>{
  // Old homepage inspection links may contain #markets; do not jump there on load.
  if(from===START_LOCATION&&to.hash&&to.path==='/')
    return {path:to.path,query:to.query,hash:'',replace:true}
  // The demo account has no C2C or lending: their pages fall back to the Finance home.
  if(!availableInMode(to.path))return {path:'/earn',replace:true}
})
// Switching to demo while on a C2C or lending page leaves it the same way.
watch(()=>session.mode,()=>{if(!availableInMode(router.currentRoute.value.path))router.replace('/earn')})
async function start(){
 const app=createApp(App);app.config.globalProperties.$compact=formatCompact;app.config.globalProperties.$t=t;app.use(router)
 // A failed language chunk must not leave a blank page: mount anyway and fall back to the bundled default.
 await Promise.all([applyLocale(locale.value).catch(error=>console.error('[i18n] locale load failed',error)),router.isReady()])
 app.mount('#app')
}
start()
