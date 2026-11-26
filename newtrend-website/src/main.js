import { createApp } from 'vue'
import { createRouter, createWebHistory, START_LOCATION } from 'vue-router'
import App from './App.vue'
import {t,applyLocale,formatCompact,locale} from './i18n'
const Home=()=>import('./pages/Home.vue')
const FuturesTrade=()=>import('./pages/trading/FuturesTrade.vue')
const OptionsTrade=()=>import('./pages/trading/OptionsTrade.vue')
const SpotTrade=()=>import('./pages/trading/SpotTrade.vue')
const Finance=()=>import('./pages/Finance.vue')
const Quant=()=>import('./pages/Quant.vue')
const Assets=()=>import('./pages/Assets.vue')
const Content=()=>import('./pages/Content.vue')
const Auth=()=>import('./pages/Auth.vue')
const Legal=()=>import('./pages/Legal.vue')
const News=()=>import('./pages/News.vue')
const Account=()=>import('./pages/Account.vue')
import './source-theme.css'
import './styles.css'
import './styles/site-containers.css'
import './styles/site-design-system.css'
import './styles/ambient.css'
import './styles/toast.css'
const router=createRouter({history:createWebHistory('/NewQuantCapital/'),routes:[
 {path:'/',component:Home},
 {path:'/:legacyLocale(en-US|zh-TW|fr-FR|de-DE|ja-JP|ko-KR)/:legacyPath(.*)*',redirect:to=>({path:'/'+(Array.isArray(to.params.legacyPath)?to.params.legacyPath.join('/'):to.params.legacyPath||''),query:to.query,hash:to.hash})},
 {path:'/trade',redirect:'/trade/futures/BTCUSDT'},
 {path:'/trade/futures/:symbol?',component:FuturesTrade},
 {path:'/trade/options/:symbol?',component:OptionsTrade},
 {path:'/trade/spot/:symbol?',component:SpotTrade},
 {path:'/trade/:pathMatch(.*)*',redirect:'/trade/futures/BTCUSDT'},
 // Copy trading is temporarily excluded from this prototype.
 {path:'/copytrade/:pathMatch(.*)*',redirect:'/'},
 {path:'/earn/loan/order/:orderId',component:()=>import('./pages/LendingOrder.vue')},
 {path:'/earn/:section?/:id?',component:Finance},
 {path:'/ai-quant/quant-fund/products/:productId',component:Quant},
 {path:'/ai-quant/quant-fund/positions/:orderId/interest-records',component:Quant},
 {path:'/ai-quant/strategy/mine/:recordId/stats',component:Quant},
 {path:'/ai-quant/:section?/:id?',component:Quant},
 {path:'/assets/:section?',component:Assets},
 {path:'/:auth(login|register|forgot-password)',component:Auth},
 {path:'/news/:id?',component:News},
 {path:'/:account(profile|bind-email|bind-phone|change-password|fund-password|2fa|devices|kyc|referrals|promotions|joint-account|survey|help-center)/:id?',component:Account},
 {path:'/:section(about|privacy|agreement|risk-disclosure|regulatory-information|content)/:id?',component:Legal},
 {path:'/c2c/:c2cPage(buy|sell|orders|payment-accounts)',component:()=>import('./pages/C2CBuy.vue')},
 {path:'/c2c/accounts',redirect:'/c2c/payment-accounts'},
 {path:'/:section/:id?',component:Content},
 {path:'/:pathMatch(.*)*',redirect:'/'}
],scrollBehavior(to,from,saved){
  // A reload reuses history.state.scroll; only back/forward should restore it.
  if(from===START_LOCATION)return {left:0,top:0,behavior:'instant'}
  return saved||{left:0,top:0}
}})
router.beforeEach((to,from)=>{
  // Old homepage inspection links may contain #markets; do not jump there on load.
  if(from===START_LOCATION&&to.hash&&to.path==='/')
    return {path:to.path,query:to.query,hash:'',replace:true}
})
async function start(){
 const app=createApp(App);app.config.globalProperties.$compact=formatCompact;app.config.globalProperties.$t=t;app.use(router);await Promise.all([applyLocale(locale.value),router.isReady()]);app.mount('#app')
}
start()
