// Route table for the public site (base /NewQuantCapital/). Kept free of DOM/app setup so Node tests can
// resolve it with a memory history (tests/routing.test.mjs). Every page route has a stable name.
const Home=()=>import('./pages/Home.vue')
const FuturesTrade=()=>import('./pages/trading/FuturesTrade.vue')
const OptionsTrade=()=>import('./pages/trading/OptionsTrade.vue')
const SpotTrade=()=>import('./pages/trading/SpotTrade.vue')
const TradeChart=()=>import('./pages/trading/TradeChart.vue')
const Finance=()=>import('./pages/Finance.vue')
const QuantLanding=()=>import('./pages/quant/QuantLanding.vue')
const Strategy=()=>import('./pages/Strategy.vue')
const QuantFundPage=()=>import('./pages/quant/QuantFundPage.vue')
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

// meta.loginRedirect: the page needs an account. Signed out, the router guard in main.js sends the visitor straight to
// /login?redirect=… and login (or registration) returns there (user decision 2026-11-29): trading, the finance channel
// (理財, C2C, 借貸), the AI Quant channel (策略, 量化基金), 資產 and 個人中心. The /earn and /ai-quant landings stay open.
export const routes=[
 {name:'home',path:'/',component:Home},
 {path:'/:legacyLocale(en-US|zh-TW|fr-FR|de-DE|ja-JP|ko-KR)/:legacyPath(.*)*',redirect:to=>({path:'/'+(Array.isArray(to.params.legacyPath)?to.params.legacyPath.join('/'):to.params.legacyPath||''),query:to.query,hash:to.hash})},
 {path:'/trade',redirect:'/trade/futures/BTCUSDT'},
 {name:'trade-futures',path:'/trade/futures/:symbol?',component:FuturesTrade,meta:{loginRedirect:true}},
 {name:'trade-options',path:'/trade/options/:symbol?',component:OptionsTrade,meta:{loginRedirect:true}},
 {name:'trade-spot',path:'/trade/spot/:symbol?',component:SpotTrade,meta:{loginRedirect:true}},
 // Phone chart view opened from the compact trading header (GMXX reference); wider screens go back to the trade page.
 {name:'trade-chart',path:'/trade/:mode(futures|options|spot)/:symbol/chart',component:TradeChart,meta:{loginRedirect:true}},
 {path:'/trade/:pathMatch(.*)*',redirect:'/trade/futures/BTCUSDT'},
 // Copy trading is temporarily excluded from this prototype.
 {path:'/copytrade/:pathMatch(.*)*',redirect:'/'},
 // Joint accounts, promotions (我的活動), the survey and fund password were removed (user decision, 2026-11-26); old links land on the profile.
 {path:'/:removed(joint-account|promotions|survey|fund-password)/:pathMatch(.*)*',redirect:'/profile'},
 // Security / preference settings (devices, 2FA, fund password …) are rows and dialogs on /profile since the
 // newtrendcapital-style redesign (2026-11-26).
 {path:'/:security(devices|2fa|security|preferences)/:pathMatch(.*)*',redirect:'/profile'},
 {name:'loan-order',path:'/earn/loan/order/:orderId',component:()=>import('./pages/LendingOrder.vue'),meta:{loginRedirect:true}},
 // Section params are constrained so unknown sections reach the not-found page instead of an empty shell.
 // An id is only valid under a section, so /earn/x reaches not-found instead of an empty Finance shell.
 {name:'finance-home',path:'/earn',component:Finance},
 {name:'finance',path:'/earn/:section(simple|my-earnings|loan)/:id?',component:Finance,meta:{loginRedirect:true}},
 // AI 量化: one page component per route (channel home, strategy list/mine + stats, fund list/positions, detail, payouts).
 {name:'ai-quant',path:'/ai-quant',component:QuantLanding},
 {name:'strategy',path:'/ai-quant/strategy/:id(mine)?',component:Strategy,meta:{loginRedirect:true}},
 {name:'strategy-stats',path:'/ai-quant/strategy/mine/:recordId/stats',component:Strategy,meta:{loginRedirect:true}},
 {name:'quant-fund',path:'/ai-quant/quant-fund/:id(positions)?',component:QuantFundPage,meta:{loginRedirect:true}},
 {name:'quant-fund-product',path:'/ai-quant/quant-fund/products/:productId',component:()=>import('./pages/quant/QuantFundProductPage.vue'),meta:{loginRedirect:true}},
 {name:'quant-fund-interest',path:'/ai-quant/quant-fund/positions/:orderId/interest-records',component:()=>import('./pages/quant/QuantFundInterestPage.vue'),meta:{loginRedirect:true}},
 {name:'assets',path:'/assets/:section(overview|transfer|records)?',component:Assets,meta:{loginRedirect:true}},
 {name:'auth',path:'/:auth(login|register|forgot-password)',component:Auth},
 {name:'news',path:'/news/:id?',component:News},
 {name:'account',path:'/:account(profile|records|notifications|bind-email|bind-phone|change-password|kyc|referrals)/:id?',component:Account,meta:{loginRedirect:true}},
 {name:'legal',path:'/:section(about|privacy|agreement|risk-disclosure|regulatory-information|content)/:id?',component:Legal},
 {name:'c2c',path:'/c2c/:c2cPage(buy|sell|orders)',component:()=>import('./pages/C2CBuy.vue'),meta:{loginRedirect:true}},
 // Payment accounts were removed (user decision, 2026-11-27): orders go straight to back-office review.
 {path:'/c2c/:old(payment-accounts|accounts)',redirect:'/c2c/buy'},
 {name:'charity',path:'/charity',component:Charity},
 {name:'deposit',path:'/deposit',component:DepositPage,meta:{loginRedirect:true}},
 {name:'withdraw',path:'/withdraw',component:Withdraw,meta:{loginRedirect:true}},
 {name:'messages',path:'/messages',component:Messages},
 // 幫助中心 is a standalone channel, not a 個人中心 section (user decision, 2026-11-26).
 {name:'help-center',path:'/help-center',component:()=>import('./pages/HelpCenter.vue')},
 {name:'not-found',path:'/:pathMatch(.*)*',component:NotFound}
]
