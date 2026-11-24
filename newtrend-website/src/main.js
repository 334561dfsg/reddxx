import { createApp } from 'vue'
import { createRouter, createWebHistory, START_LOCATION } from 'vue-router'
import App from './App.vue'
import {t,applyLocale,formatCompact} from './i18n'
import Home from './pages/Home.vue'
import Trade from './pages/Trade.vue'
import Finance from './pages/Finance.vue'
import Quant from './pages/Quant.vue'
import Assets from './pages/Assets.vue'
import Content from './pages/Content.vue'
import Auth from './pages/Auth.vue'
import Legal from './pages/Legal.vue'
import News from './pages/News.vue'
import Account from './pages/Account.vue'
import './source-theme.css'
import './styles.css'
const router=createRouter({history:createWebHistory('/newtrend/'),routes:[
 {path:'/',redirect:'/zh-TW/'},{path:'/:locale(en-US|zh-TW|fr-FR|de-DE|ja-JP|ko-KR)/',component:Home},
 {path:'/:locale(en-US|zh-TW|fr-FR|de-DE|ja-JP|ko-KR)/trade/:mode?/:symbol?',component:Trade},
 // Copy trading is temporarily excluded from this prototype.
 {path:'/:locale(en-US|zh-TW|fr-FR|de-DE|ja-JP|ko-KR)/copytrade/:pathMatch(.*)*',redirect:to=>'/'+to.params.locale+'/'},
 {path:'/:locale(en-US|zh-TW|fr-FR|de-DE|ja-JP|ko-KR)/earn/:section?/:id?',component:Finance},
 {path:'/:locale(en-US|zh-TW|fr-FR|de-DE|ja-JP|ko-KR)/ai-quant/:section?/:id?',component:Quant},
 {path:'/:locale(en-US|zh-TW|fr-FR|de-DE|ja-JP|ko-KR)/assets/:section?',component:Assets},
 {path:'/:locale(en-US|zh-TW|fr-FR|de-DE|ja-JP|ko-KR)/:auth(login|register|forgot-password)',component:Auth},
 {path:'/:locale(en-US|zh-TW|fr-FR|de-DE|ja-JP|ko-KR)/news/:id?',component:News},
 {path:'/:locale(en-US|zh-TW|fr-FR|de-DE|ja-JP|ko-KR)/:account(profile|bind-email|bind-phone|change-password|fund-password|2fa|devices|kyc|referrals|promotions|joint-account|survey|help-center)/:id?',component:Account},
 {path:'/:locale(en-US|zh-TW|fr-FR|de-DE|ja-JP|ko-KR)/:section(about|privacy|agreement|risk-disclosure|regulatory-information|content)/:id?',component:Legal},
 {path:'/:locale(en-US|zh-TW|fr-FR|de-DE|ja-JP|ko-KR)/:section/:id?',component:Content},
 {path:'/:pathMatch(.*)*',redirect:'/zh-TW/'}
],scrollBehavior(to,from,saved){
  // A reload reuses history.state.scroll; only back/forward should restore it.
  if(from===START_LOCATION)return {left:0,top:0,behavior:'instant'}
  return saved||{left:0,top:0}
}})
router.beforeEach((to,from)=>{
  if(to.params.locale)applyLocale(to.params.locale)
  // Old homepage inspection links may contain #markets; do not jump there on load.
  if(from===START_LOCATION&&to.hash&&to.matched.some(record=>record.components?.default===Home))
    return {path:to.path,query:to.query,hash:'',replace:true}
})
const app=createApp(App);app.config.globalProperties.$compact=formatCompact;app.config.globalProperties.$t=t;app.use(router).mount('#app')
