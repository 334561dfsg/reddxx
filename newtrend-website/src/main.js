import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import {tr,t,applyLocale,locale} from './i18n'
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
 {path:'/:locale(en-US|zh-TW|fr-FR|de-DE|ja-JP|ko-KR)/earn/:section?/:id?',component:Finance},
 {path:'/:locale(en-US|zh-TW|fr-FR|de-DE|ja-JP|ko-KR)/ai-quant/:section?/:id?',component:Quant},
 {path:'/:locale(en-US|zh-TW|fr-FR|de-DE|ja-JP|ko-KR)/assets/:section?',component:Assets},
 {path:'/:locale(en-US|zh-TW|fr-FR|de-DE|ja-JP|ko-KR)/:auth(login|register|forgot-password)',component:Auth},
 {path:'/:locale(en-US|zh-TW|fr-FR|de-DE|ja-JP|ko-KR)/news/:id?',component:News},
 {path:'/:locale(en-US|zh-TW|fr-FR|de-DE|ja-JP|ko-KR)/:account(profile|bind-email|bind-phone|change-password|fund-password|2fa|devices|kyc|referrals|promotions|joint-account|survey|help-center)/:id?',component:Account},
 {path:'/:locale(en-US|zh-TW|fr-FR|de-DE|ja-JP|ko-KR)/:section(about|privacy|agreement|risk-disclosure|regulatory-information|content)/:id?',component:Legal},
 {path:'/:locale(en-US|zh-TW|fr-FR|de-DE|ja-JP|ko-KR)/:section/:id?',component:Content},
 {path:'/:pathMatch(.*)*',redirect:'/zh-TW/'}
],scrollBehavior(to,from,saved){return saved||{top:0}}})
router.beforeEach(to=>{if(to.params.locale)applyLocale(to.params.locale)})
const app=createApp(App);app.config.globalProperties.$tr=tr;app.config.globalProperties.$t=t;app.use(router).mount('#app')
