// Route table for the public site (base /NewQuantCapital/). Kept free of DOM/app setup so Node tests can
// resolve it with a memory history (tests/routing.test.mjs). Every page route has a stable name.
const Home=()=>import('./pages/Home.vue')
const FuturesTrade=()=>import('./pages/trading/FuturesTrade.vue')
const OptionsTrade=()=>import('./pages/trading/OptionsTrade.vue')
const SpotTrade=()=>import('./pages/trading/SpotTrade.vue')
const Finance=()=>import('./pages/Finance.vue')
const Quant=()=>import('./pages/Quant.vue')
const Assets=()=>import('./pages/Assets.vue')
const Charity=()=>import('./pages/Charity.vue')
const Withdraw=()=>import('./pages/Withdraw.vue')
const Messages=()=>import('./pages/Messages.vue')
const DepositPage=()=>import('./components/deposit/DepositPage.vue')
const NotFound=()=>import('./pages/NotFound.vue')
const Auth=()=>import('./pages/Auth.vue')
const Legal=()=>import('./pages/Legal.vue')
const News=()=>import('./pages/News.vue')
const Account=()=>import('./pages/Account.vue')

export const routes=[
 {name:'home',path:'/',component:Home},
 {path:'/:legacyLocale(en-US|zh-TW|fr-FR|de-DE|ja-JP|ko-KR)/:legacyPath(.*)*',redirect:to=>({path:'/'+(Array.isArray(to.params.legacyPath)?to.params.legacyPath.join('/'):to.params.legacyPath||''),query:to.query,hash:to.hash})},
 {path:'/trade',redirect:'/trade/futures/BTCUSDT'},
 {name:'trade-futures',path:'/trade/futures/:symbol?',component:FuturesTrade},
 {name:'trade-options',path:'/trade/options/:symbol?',component:OptionsTrade},
 {name:'trade-spot',path:'/trade/spot/:symbol?',component:SpotTrade},
 {path:'/trade/:pathMatch(.*)*',redirect:'/trade/futures/BTCUSDT'},
 // Copy trading is temporarily excluded from this prototype.
 {path:'/copytrade/:pathMatch(.*)*',redirect:'/'},
 {name:'loan-order',path:'/earn/loan/order/:orderId',component:()=>import('./pages/LendingOrder.vue')},
 // Section params are constrained so unknown sections reach the not-found page instead of an empty shell.
 // An id is only valid under a section, so /earn/x reaches not-found instead of an empty Finance shell.
 {name:'finance-home',path:'/earn',component:Finance},
 {name:'finance',path:'/earn/:section(simple|my-earnings|loan)/:id?',component:Finance},
 {name:'quant-fund-product',path:'/ai-quant/quant-fund/products/:productId',component:Quant},
 {name:'quant-fund-interest',path:'/ai-quant/quant-fund/positions/:orderId/interest-records',component:Quant},
 {name:'strategy-stats',path:'/ai-quant/strategy/mine/:recordId/stats',component:Quant},
 {name:'ai-quant',path:'/ai-quant/:section(strategy|quant-fund)?/:id(mine|positions)?',component:Quant},
 {name:'assets',path:'/assets/:section(overview|transfer|records)?',component:Assets},
 {name:'auth',path:'/:auth(login|register|forgot-password)',component:Auth},
 {name:'news',path:'/news/:id?',component:News},
 {name:'account',path:'/:account(profile|bind-email|bind-phone|change-password|fund-password|2fa|devices|kyc|referrals|promotions|joint-account|survey|help-center)/:id?',component:Account},
 {name:'legal',path:'/:section(about|privacy|agreement|risk-disclosure|regulatory-information|content)/:id?',component:Legal},
 {name:'c2c',path:'/c2c/:c2cPage(buy|sell|orders|payment-accounts)',component:()=>import('./pages/C2CBuy.vue')},
 {path:'/c2c/accounts',redirect:'/c2c/payment-accounts'},
 {name:'charity',path:'/charity',component:Charity},
 {name:'deposit',path:'/deposit',component:DepositPage},
 {name:'withdraw',path:'/withdraw',component:Withdraw},
 {name:'messages',path:'/messages',component:Messages},
 {name:'not-found',path:'/:pathMatch(.*)*',component:NotFound}
]
