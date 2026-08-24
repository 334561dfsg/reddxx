/**
 * 前台路由（/front）。
 * 需登录：customer-service、personal-center 整树、finance 整树、trade/:assetClass/:tradeMode、verification-*-demo。
 * 公开：home、market、login、register、reset-password。
 * 守卫与组合式函数：router/index.js、src/composables/useRequireFrontAuth.js
 */
import { FRONT_DEPOSIT_DEFAULT_SYMBOL_LOWER } from '../../constants/frontAssetCenterDemo.js'
export const frontDesktopRoutes = [
  {
    path: '',
    redirect: '/front/home'
  },
  {
    path: 'home',
    name: 'front-home-desktop',
    component: () => import('../../pages/front/FrontHomePage.vue'),
    meta: { title: '首页' }
  },
  {
    path: 'market',
    name: 'front-market-desktop',
    component: () => import('../../pages/front/FrontMarketPage.vue'),
    meta: { title: '行情' }
  },
  {
    path: 'announcements',
    name: 'front-announcements',
    component: () => import('../../pages/front/FrontAnnouncementsPage.vue'),
    meta: { title: '站内公告', hideFrontChromeOnMobile: true, hideFrontFloatingOnMobile: true }
  },
  {
    path: 'announcements/:announcementId',
    name: 'front-announcement-detail',
    component: () => import('../../pages/front/FrontAnnouncementDetailPage.vue'),
    meta: { title: '公告详情', hideFrontChromeOnMobile: true, hideFrontFloatingOnMobile: true }
  },
  {
    path: 'news/:newsId',
    name: 'front-news-detail',
    component: () => import('../../pages/front/FrontNewsDetailPage.vue'),
    meta: { title: '新闻详情', hideFrontChromeOnMobile: true, hideFrontFloatingOnMobile: true }
  },
  {
    path: 'customer-service',
    name: 'front-customer-service',
    component: () => import('../../pages/front/FrontCustomerServicePage.vue'),
    meta: { title: '客服', requiresAuth: true }
  },
  {
    path: 'finance',
    component: () => import('../../layouts/FinanceShellLayout.vue'),
    meta: { title: '金融', requiresAuth: true },
    children: [
      {
        path: '',
        name: 'front-finance-home',
        component: () => import('../../pages/front/finance/FinanceHomePage.vue'),
        meta: { title: '金融' }
      },
      {
        path: 'liquidity',
        name: 'front-finance-liquidity',
        component: () => import('../../pages/front/finance/liquidity/FinanceLiquidityListPage.vue'),
        meta: { title: '流动性挖矿' }
      },
      {
        path: 'liquidity/rules',
        redirect: '/front/finance/liquidity'
      },
      {
        path: 'liquidity/:productId/rules',
        redirect: '/front/finance/liquidity'
      },
      {
        path: 'liquidity/:productId',
        name: 'front-finance-liquidity-detail',
        component: () => import('../../pages/front/finance/liquidity/FinanceLiquidityDetailPage.vue'),
        meta: { title: '锁仓产品' }
      },
      {
        path: 'lending',
        name: 'front-finance-lending',
        component: () => import('../../pages/front/finance/lending/FinanceLendingListPage.vue'),
        meta: { title: '信用借贷' }
      },
      {
        path: 'lending/rules',
        redirect: '/front/finance/lending'
      },
      {
        path: 'lending/:productId/rules',
        redirect: (to) => ({
          name: 'front-finance-lending-detail',
          params: { productId: to.params.productId }
        })
      },
      {
        path: 'lending/:productId',
        name: 'front-finance-lending-detail',
        component: () => import('../../pages/front/finance/lending/FinanceLendingDetailPage.vue'),
        meta: { title: '借贷产品' }
      },
      {
        path: 'ai-quant',
        name: 'front-finance-ai-quant',
        component: () => import('../../pages/front/finance/aiQuant/FinanceAiQuantListPage.vue'),
        meta: { title: 'AI 量化' }
      },
      {
        path: 'ai-quant/rules',
        redirect: '/front/finance/ai-quant'
      },
      {
        path: 'ai-quant/:productId/rules',
        redirect: (to) => ({
          name: 'front-finance-ai-quant-detail',
          params: { productId: to.params.productId }
        })
      },
      {
        path: 'ai-quant/:productId',
        name: 'front-finance-ai-quant-detail',
        component: () => import('../../pages/front/finance/aiQuant/FinanceAiQuantDetailPage.vue'),
        meta: { title: '策略详情' }
      },
      {
        path: 'portfolio',
        name: 'front-finance-portfolio',
        component: () => import('../../pages/front/finance/portfolio/FinancePortfolioListPage.vue'),
        meta: { title: '投资组合', hideFrontFloatingOnMobile: true }
      },
      {
        path: 'portfolio/rules',
        redirect: '/front/finance/portfolio'
      },
      {
        path: 'portfolio/:productId/rules',
        redirect: (to) => ({
          name: 'front-finance-portfolio-detail',
          params: { productId: to.params.productId }
        })
      },
      {
        path: 'portfolio/:productId',
        name: 'front-finance-portfolio-detail',
        component: () => import('../../pages/front/finance/portfolio/FinancePortfolioDetailPage.vue'),
        meta: { title: '组合详情', hideFrontChromeOnMobile: true, hideFrontFloatingOnMobile: true }
      }
    ]
  },
  {
    path: 'trade',
    redirect: '/front/trade/crypto/perpetual'
  },
  {
    path: 'trade/spot',
    redirect: '/front/trade/crypto/spot'
  },
  {
    path: 'trade/perpetual',
    redirect: '/front/trade/crypto/perpetual'
  },
  {
    path: 'trade/delivery',
    redirect: '/front/trade/crypto/delivery'
  },
  {
    path: 'trade/:assetClass/:tradeMode',
    name: 'front-trade-desktop',
    component: () => import('../../pages/front/FrontTradePage.vue'),
    meta: { title: '交易', requiresAuth: true },
    beforeEnter(to) {
      const okA = new Set(['crypto', 'forex', 'metal'])
      const okM = new Set(['spot', 'perpetual', 'delivery'])
      if (!okA.has(to.params.assetClass) || !okM.has(to.params.tradeMode)) {
        return { path: '/front/trade/crypto/perpetual' }
      }
    }
  },
  {
    path: 'assets',
    redirect: '/front/personal-center/assets'
  },
  {
    path: 'login',
    name: 'front-login',
    component: () => import('../../pages/front/FrontAuthPage.vue'),
    meta: { title: '登录', guestOnly: true }
  },
  {
    path: 'register',
    name: 'front-register',
    component: () => import('../../pages/front/FrontAuthPage.vue'),
    meta: { title: '注册', guestOnly: true }
  },
  {
    path: 'reset-password',
    name: 'front-reset-password',
    component: () => import('../../pages/front/FrontResetPasswordPage.vue'),
    meta: { title: '重置密码', guestOnly: true }
  },
  {
    path: 'personal-center',
    meta: { requiresAuth: true },
    component: () => import('../../layouts/PersonalCenterShellLayout.vue'),
    children: [
      {
        path: '',
        name: 'front-personal-center-desktop',
        component: () => import('../../pages/front/personal-center/PersonalCenterHomePage.vue'),
        meta: {
          title: '个人中心'
        }
      },
      {
        path: 'security',
        name: 'front-security-center-desktop',
        component: () => import('../../pages/front/personal-center/SecurityCenterPage.vue'),
        meta: {
          title: '安全中心'
        }
      },
      {
        path: 'verification',
        name: 'front-personal-verification-desktop',
        component: () => import('../../pages/front/pc/VerificationFlowTemplatePage.vue'),
        meta: {
          title: '身份认证'
        }
      },
      {
        path: 'assets',
        name: 'front-personal-assets-desktop',
        component: () => import('../../pages/front/FrontAssetsPage.vue'),
        meta: { title: '资产' }
      },
      {
        path: 'assets/withdraw',
        name: 'front-personal-assets-withdraw',
        component: () => import('../../pages/front/personal-center/AssetsWithdrawPage.vue'),
        meta: { title: '提币' }
      },
      {
        path: 'assets/transfer',
        name: 'front-personal-assets-transfer',
        component: () => import('../../pages/front/personal-center/AssetsTransferPage.vue'),
        meta: { title: '划转' }
      },
      {
        path: 'assets/convert',
        name: 'front-personal-assets-convert',
        component: () => import('../../pages/front/personal-center/AssetsFlashConvertPage.vue'),
        meta: { title: '闪兑' }
      },
      {
        path: 'assets/deposit',
        name: 'front-personal-assets-deposit',
        redirect: () => ({
          name: 'front-personal-assets-deposit-detail',
          params: { symbol: FRONT_DEPOSIT_DEFAULT_SYMBOL_LOWER }
        }),
        meta: { title: '充币' }
      },
      {
        path: 'assets/deposit/:symbol',
        name: 'front-personal-assets-deposit-detail',
        component: () => import('../../pages/front/personal-center/AssetsDepositDetailPage.vue'),
        meta: { title: '充币' }
      },
      {
        path: 'ledger',
        name: 'front-personal-ledger-desktop',
        component: () => import('../../pages/front/personal-center/PersonalCenterLedgerPage.vue'),
        meta: { title: '账变记录' }
      },
      {
        path: 'api-keys',
        redirect: '/front/personal-center'
      },
      {
        path: 'withdraw-addresses',
        name: 'front-personal-withdraw-addresses-desktop',
        component: () => import('../../pages/front/personal-center/WithdrawAddressPage.vue'),
        meta: { title: '提币地址' }
      },
      {
        path: 'fees-vip',
        name: 'front-personal-fees-vip-desktop',
        component: () => import('../../pages/front/personal-center/FeesVipPage.vue'),
        meta: { title: '费率与 VIP' }
      },
      {
        path: 'referral',
        name: 'front-personal-referral-desktop',
        component: () => import('../../pages/front/personal-center/ReferralPage.vue'),
        meta: { title: '邀请返佣' }
      },
      {
        path: 'notifications',
        name: 'front-personal-notifications-desktop',
        component: () => import('../../pages/front/personal-center/NotificationsPage.vue'),
        meta: { title: '消息通知' }
      },
      {
        path: 'preferences',
        name: 'front-personal-preferences-desktop',
        component: () => import('../../pages/front/personal-center/PreferencesPage.vue'),
        meta: { title: '账户设置' }
      }
    ]
  },
  {
    path: 'verification-flow',
    redirect: '/front/personal-center/verification'
  },
  {
    path: 'verification-permission-demo',
    name: 'front-verification-permission-demo-desktop',
    component: () => import('../../pages/front/VerificationPermissionDemoPage.vue'),
    meta: {
      title: '账户权限（PC）',
      requiresAuth: true
    }
  },
  {
    path: 'verification-popup-demo',
    name: 'front-verification-popup-demo-desktop',
    component: () => import('../../pages/front/VerificationPopupDemoPage.vue'),
    meta: {
      title: '安全与验证（PC）',
      requiresAuth: true
    }
  }
]
