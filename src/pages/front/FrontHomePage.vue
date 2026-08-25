<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { getLocalizedFrontNewsList } from '../../admin/mock/frontNews'
import { getSiteConfigSnapshot, SITE_CONFIG_STORAGE_KEY } from '../../admin/mock/siteConfig'
import { resolveFrontLocalePreference, useFrontSiteI18n } from '../../composables/useFrontSiteI18n'
import { getFrontTradeDefaultPath } from '../../constants/frontNav'
import { useFrontAuthStore } from '../../stores/frontAuth'

const prefix = '/front'
const tradeDefault = getFrontTradeDefaultPath(prefix)
const frontAuth = useFrontAuthStore()
const { isLoggedIn, accountMode } = storeToRefs(frontAuth)
const siteConfig = ref(getSiteConfigSnapshot())
const currentLocale = ref(resolveFrontLocalePreference())
const { defaultLocale } = useFrontSiteI18n()
const showFinanceEntry = computed(() => !isLoggedIn.value || accountMode.value !== 'demo')

const socialLinks = computed(() =>
  (siteConfig.value.socialLinks || [])
    .filter((row) => row.enabled && row.name && row.url)
    .sort((a, b) => {
      const sa = Number(a.sort) || 0
      const sb = Number(b.sort) || 0
      if (sa !== sb) return sa - sb
      return a.name.localeCompare(b.name)
    })
)

function refreshSiteConfig() {
  siteConfig.value = getSiteConfigSnapshot()
  currentLocale.value = resolveFrontLocalePreference()
}

function refreshLocale() {
  currentLocale.value = resolveFrontLocalePreference()
}

function handleStorage(event) {
  if (!event || event.key === SITE_CONFIG_STORAGE_KEY) refreshSiteConfig()
}

onMounted(() => {
  window.addEventListener('admin-site-config-updated', refreshSiteConfig)
  window.addEventListener('storage', handleStorage)
  window.addEventListener('front-locale-change', refreshLocale)
})

onUnmounted(() => {
  window.removeEventListener('admin-site-config-updated', refreshSiteConfig)
  window.removeEventListener('storage', handleStorage)
  window.removeEventListener('front-locale-change', refreshLocale)
})

const brandValues = ['安全稳定', '专业撮合', '快捷下单', '透明费率']

/** 双入口：深色面板 + 青柠点缀 */
const allControlCards = [
  {
    title: '高效交易执行',
    desc: '全链路加密传输与风控校验，委托与成交状态实时可查，降低异常滑点担忧。',
    to: tradeDefault,
    icon: 'bolt'
  },
  {
    title: '资产清晰可控',
    desc: '余额、保证金与盈亏结构一目了然；提现策略与安全设置在账户中心集中管理。',
    to: `${prefix}/personal-center/assets`,
    icon: 'wallet'
  },
  {
    title: '金融增值',
    desc: '流动性锁仓、信用借贷与 AI 量化策略入口集中呈现；规则与参数与后台配置对齐（演示数据）。',
    to: `${prefix}/finance`,
    icon: 'chart'
  }
]
const controlCards = computed(() => (
  allControlCards.filter((card) => showFinanceEntry.value || card.to !== `${prefix}/finance`)
))

/** 交易优势：深底 + 淡化序号 */
const advantageCards = [
  {
    num: '01',
    title: '公开费率与 VIP',
    desc: '合约、现货费率与阶梯规则集中公示，升级 VIP 更省成本，拒绝隐性收费。',
    to: `${prefix}/personal-center/fees-vip`
  },
  {
    num: '02',
    title: '多重安全防护',
    desc: '设备、验证与敏感操作分层保护；安全中心随时查看登录与风控提示。',
    to: `${prefix}/personal-center/security`
  },
  {
    num: '03',
    title: '深度与低延迟体验',
    desc: '聚合盘口与撮合路由持续优化，尽力让成交更顺、更贴近盘口预期。',
    to: tradeDefault
  }
]

const partnerSlots = [
  '安全审计合作',
  '链上数据服务',
  '行业媒体与社区',
  '流动性与技术伙伴',
  '钱包与支付生态',
  '教育与投教合作'
]

const tradeModes = [
  {
    label: 'U 本位永续',
    sub: 'USDT 保证金 · 资金费率机制透明',
    to: `${prefix}/trade/crypto/perpetual`
  },
  {
    label: '现货交易',
    sub: '主流资产即时买卖，与合约同一套行情体验',
    to: `${prefix}/trade/crypto/spot`
  },
  {
    label: '交割合约',
    sub: '有到期日的合约品种，便于周期策略布局',
    to: `${prefix}/trade/crypto/delivery`
  }
]

const homeNewsItems = computed(() =>
  getLocalizedFrontNewsList(siteConfig.value.frontNews, currentLocale.value, defaultLocale.value)
    .slice(0, 4)
    .map((row) => ({
      ...row,
      to: { name: 'front-news-detail', params: { newsId: row.id } }
    }))
)

const featuredNews = computed(() => homeNewsItems.value[0] || null)
const secondaryNews = computed(() => homeNewsItems.value.slice(1))

const footerYear = new Date().getFullYear()

const allFooterColumns = [
  {
    title: '交易',
    links: [
      { label: 'U 本位永续', to: `${prefix}/trade/crypto/perpetual` },
      { label: '现货', to: `${prefix}/trade/crypto/spot` },
      { label: '交割合约', to: `${prefix}/trade/crypto/delivery` },
      { label: '行情', to: `${prefix}/market` }
    ]
  },
  {
    title: '金融',
    links: [
      { label: '金融首页', to: `${prefix}/finance` },
      { label: '流动性挖矿', to: `${prefix}/finance/liquidity` },
      { label: '信用借贷', to: `${prefix}/finance/lending` },
      { label: 'AI 量化', to: `${prefix}/finance/ai-quant` }
    ]
  },
  {
    title: '账户与服务',
    links: [
      { label: '资产中心', to: `${prefix}/personal-center/assets` },
      { label: '身份认证', to: `${prefix}/personal-center/verification` },
      { label: '安全中心', to: `${prefix}/personal-center/security` },
      { label: '费率与 VIP', to: `${prefix}/personal-center/fees-vip` }
    ]
  },
  {
    title: '账户入口',
    links: [
      { label: '注册', to: `${prefix}/register` },
      { label: '登录', to: `${prefix}/login` },
      { label: '推荐计划', to: `${prefix}/personal-center/referral` },
      { label: '消息通知', to: `${prefix}/personal-center/notifications` }
    ]
  },
  {
    title: '关于平台',
    links: [
      { label: '关于我们', to: `${prefix}/pages/about` },
      { label: '公司资质', to: `${prefix}/pages/company-qualifications` },
      { label: '白皮书', to: `${prefix}/pages/whitepaper` }
    ]
  }
]
const footerColumns = computed(() => (
  allFooterColumns.filter((col) => showFinanceEntry.value || col.title !== '金融')
))
</script>

<template>
  <div class="relative isolate min-h-[calc(100dvh-3.5rem)] overflow-hidden lg:min-h-0">
    <div class="pointer-events-none absolute inset-0 bg-[#030304]" aria-hidden="true" />

    <!-- 顶栏提示（与下方通栏 Hero 分离，避免整页被框在一起） -->
    <div class="relative mx-auto max-w-6xl px-6 pt-5 min-[400px]:px-[1.875rem] sm:px-9 sm:pt-6 md:pt-8 lg:px-12">
      <div
        class="mb-5 rounded-lg border border-white/[0.05] bg-white/[0.02] px-6 py-2.5 sm:mb-6 sm:px-[1.875rem]"
        role="note"
      >
        <p
          class="text-center text-[12px] leading-relaxed text-[#a8b0ba] sm:text-left sm:text-[13px] md:text-sm md:leading-[1.55]"
        >
          <span class="font-semibold text-lime-400/90">温馨提示：</span>
          请认准官方访问方式，谨防钓鱼链接。勿向他人泄露验证码与资金密码。合约与现货均有损失全部本金的风险。
        </p>
      </div>
    </div>

    <!-- Hero：全宽通栏，无圆角画框；底部渐变汇入页面底色 -->
    <section
      class="home-hero-visual relative mb-12 w-full overflow-hidden sm:mb-14 md:mb-16 min-h-[min(68vh,560px)] sm:min-h-[min(74vh,620px)] lg:min-h-[min(78vh,680px)]"
      aria-label="主视觉"
    >
      <div class="pointer-events-none absolute inset-0 bg-[#010102]" aria-hidden="true" />
      <div class="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          class="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_38%,rgba(56,189,248,0.08),transparent_62%),radial-gradient(ellipse_50%_40%_at_42%_50%,rgba(163,230,53,0.04),transparent_58%)]"
        />
        <div
          class="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#030304] via-[#030304]/90 to-transparent"
        />
        <div
          class="home-tunnel absolute left-1/2 top-[40%] h-[min(150vw,900px)] w-[min(150vw,900px)] -translate-x-1/2 -translate-y-1/2 opacity-[0.38]"
        >
          <div class="home-ring absolute inset-[4%] rounded-full border border-cyan-400/14" />
          <div class="home-ring absolute inset-[11%] rounded-full border border-sky-400/10" />
          <div class="home-ring absolute inset-[18%] rounded-full border border-blue-400/08" />
          <div class="home-ring absolute inset-[26%] rounded-full border border-indigo-400/06" />
        </div>
        <div
          class="absolute left-1/2 top-[40%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-gradient-to-br from-cyan-200/28 via-white/18 to-blue-500/28 shadow-[0_0_90px_24px_rgba(56,189,248,0.12)] blur-[2px] sm:h-52 sm:w-52"
          style="transform: translate(-50%, -50%) rotateX(12deg) rotate(45deg)"
        />
        <div
          class="absolute left-1/2 top-[40%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/12 bg-gradient-to-br from-white/22 to-cyan-400/10 blur-[0.5px] sm:h-32 sm:w-32"
          style="transform: translate(-50%, -50%) rotate(45deg)"
        />
      </div>

      <div
        class="relative z-10 mx-auto flex w-full max-w-6xl min-h-[inherit] flex-col justify-end px-6 pb-10 pt-[5.25rem] min-[400px]:px-[1.875rem] sm:px-9 sm:pb-14 sm:pt-28 md:pb-14 lg:px-12 lg:pb-16"
      >
          <p
            class="mb-2.5 text-[10px] font-medium uppercase tracking-[0.18em] text-lime-400/70 sm:mb-3 sm:text-xs sm:tracking-[0.2em]"
          >
            CryptoX Pro
          </p>
          <h1
            class="max-w-4xl text-[clamp(1.5rem,5.2vw+0.4rem,3.125rem)] font-bold leading-[1.1] tracking-tight text-white sm:leading-[1.12] lg:tracking-tight"
          >
            广受欢迎的
            <span
              class="bg-gradient-to-r from-lime-300 via-lime-400 to-emerald-400 bg-clip-text text-transparent home-hero-accent"
            >
              数字资产交易平台
            </span>
          </h1>
          <p
            class="mt-3 max-w-xl text-[13px] leading-[1.65] text-white/65 sm:mt-4 sm:text-base sm:leading-relaxed md:text-[1.0625rem] md:leading-[1.65]"
          >
            为全球交易者提供现货、U 本位永续与交割合约；安全第一、费率透明、体验流畅。
          </p>
          <ul
            class="mt-3 flex flex-wrap gap-x-2.5 gap-y-1.5 text-[11px] leading-snug text-white/45 sm:mt-4 sm:gap-x-3 sm:text-sm sm:text-white/40"
            aria-label="平台价值"
          >
            <template v-for="(v, i) in brandValues" :key="v">
              <span v-if="i > 0" class="text-white/18 sm:text-white/20">|</span>
              <span>{{ v }}</span>
            </template>
          </ul>
          <div class="mt-6 flex w-full flex-col gap-2.5 sm:mt-7 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-3">
            <RouterLink
              :to="tradeDefault"
              class="inline-flex h-12 min-h-[2.75rem] w-full items-center justify-center rounded-md bg-gradient-to-r from-lime-400 to-emerald-500 px-[2.625rem] text-[15px] font-semibold text-[#0b0e11] shadow-[0_4px_24px_-6px_rgba(163,230,53,0.35)] transition hover:brightness-110 sm:h-11 sm:min-h-0 sm:w-auto sm:text-sm"
            >
              立即交易
            </RouterLink>
            <RouterLink
              :to="`${prefix}/market`"
              class="inline-flex h-12 min-h-[2.75rem] w-full items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] px-[2.625rem] text-[15px] font-semibold text-white/90 backdrop-blur-sm transition hover:border-white/[0.11] hover:bg-white/[0.06] sm:h-11 sm:min-h-0 sm:w-auto sm:text-sm"
            >
              查看行情
            </RouterLink>
          </div>
      </div>
    </section>

    <div class="relative mx-auto max-w-6xl px-6 pb-14 min-[400px]:px-[1.875rem] sm:px-9 md:pb-20 lg:px-12 lg:pb-24">
      <!-- 双入口：暗色卡片 + 顶边青柠线 -->
      <section class="mb-12 sm:mb-16 md:mb-20" aria-labelledby="home-control">
        <h2
          id="home-control"
          class="mb-6 text-center text-xl font-bold leading-snug tracking-tight text-white text-balance sm:mb-8 sm:text-2xl md:text-3xl md:leading-tight"
        >
          完全掌控你的加密资产
        </h2>
        <div class="grid gap-4 sm:gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
          <RouterLink
            v-for="card in controlCards"
            :key="card.title"
            :to="card.to"
            class="group relative overflow-hidden rounded-2xl border border-[#1f2429] bg-[#1e2329]/90 px-[1.875rem] pb-6 pt-7 shadow-lg shadow-black/20 transition hover:border-lime-400/18 hover:bg-[#232a31] sm:px-9 sm:pb-7 sm:pt-8 md:px-12 md:pb-8 md:pt-9"
          >
            <span
              class="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-lime-400/50 to-transparent opacity-90"
              aria-hidden="true"
            />
            <div
              class="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-lime-400/10 text-lime-400 ring-1 ring-lime-400/14 transition group-hover:bg-lime-400/[0.14]"
              aria-hidden="true"
            >
              <svg
                v-if="card.icon === 'bolt'"
                class="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
              >
                <path d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z" stroke-linejoin="round" />
              </svg>
              <svg
                v-else-if="card.icon === 'chart'"
                class="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
              >
                <path d="M4 18V6m0 0 4 4 4-4 4 6 4-2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M4 20h16" stroke-linecap="round" />
              </svg>
              <svg
                v-else
                class="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
              >
                <path
                  d="M19 7V4H5v3M5 11c0 4.5 3.6 8 8 8s8-3.5 8-8m-16 0v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <h3 class="text-[1.0625rem] font-bold leading-snug text-white sm:text-lg md:text-xl">
              {{ card.title }}
            </h3>
            <p class="mt-2 text-[13px] leading-relaxed text-[#848e9c] sm:text-sm md:text-[0.9375rem] md:leading-[1.6]">
              {{ card.desc }}
            </p>
            <span
              class="mt-4 inline-flex items-center text-[13px] font-semibold text-lime-400/90 transition group-hover:text-lime-300 sm:mt-5 sm:text-sm"
            >
              了解更多
              <svg class="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="m9 18 6-6-6-6"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
          </RouterLink>
        </div>
      </section>

      <!-- 交易优势：深底 + 淡化序号 -->
      <section class="relative mb-12 sm:mb-16 md:mb-20" aria-labelledby="home-adv">
        <div class="relative z-10 mb-8 text-center sm:mb-10">
          <h2
            id="home-adv"
            class="text-xl font-bold leading-snug tracking-tight text-white text-balance sm:text-2xl md:text-3xl"
          >
            我们的交易优势
          </h2>
          <p class="mt-2 text-[13px] text-white/50 sm:text-sm md:mt-2.5 md:text-base">
            让您更从容地面对波动与决策
          </p>
        </div>
        <div
          class="pointer-events-none absolute left-1/2 top-[55%] h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl md:h-72 md:w-72"
          aria-hidden="true"
        />
        <ul class="relative z-10 grid gap-3.5 sm:gap-4 md:grid-cols-3 md:gap-5">
          <li v-for="a in advantageCards" :key="a.num">
            <RouterLink
              :to="a.to"
              class="home-adv-card group relative block overflow-hidden rounded-2xl border border-[#1f2429] bg-[#151a21] px-6 pb-5 pt-6 transition hover:border-lime-400/18 hover:bg-[#1a2129] sm:px-[1.875rem] sm:pb-6 sm:pt-7 md:px-9 md:pb-8 md:pt-8"
            >
              <span
                class="pointer-events-none absolute -right-1 bottom-0 select-none text-[4.25rem] font-black leading-none text-white/[0.04] tabular-nums sm:text-[5.25rem] md:text-[6.25rem] lg:text-[6.5rem]"
                aria-hidden="true"
              >
                {{ a.num }}
              </span>
              <span
                class="relative mb-2.5 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-lime-400/75 sm:mb-3 sm:text-[11px]"
              >
                <span class="h-px w-5 bg-lime-400/28 sm:w-6" aria-hidden="true" />
                {{ a.num }}
              </span>
              <h3 class="relative text-[0.9375rem] font-bold leading-snug text-white sm:text-base md:text-lg">
                {{ a.title }}
              </h3>
              <p class="relative mt-2 text-[13px] leading-relaxed text-[#848e9c] sm:text-sm md:text-[0.9375rem]">
                {{ a.desc }}
              </p>
            </RouterLink>
          </li>
        </ul>
      </section>

      <!-- 分栏：左侧玻璃感球体示意 + 右侧文案（参考 AI/量化一屏，改为绿色系点缀） -->
      <section
        class="mb-12 grid gap-8 rounded-2xl border border-white/[0.045] bg-[#080a0c] px-[1.875rem] py-8 min-[400px]:rounded-3xl sm:mb-16 sm:gap-10 sm:px-12 sm:py-11 md:mb-20 lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-[3.75rem] lg:py-12"
        aria-labelledby="home-tech"
      >
        <div class="home-glass-grid mx-auto grid max-w-md grid-cols-2 gap-3 sm:gap-4" aria-hidden="true">
          <div class="home-sphere home-sphere--btc flex items-center justify-center text-lg font-bold text-white/30 backdrop-blur-md">
            ₿
          </div>
          <div class="home-sphere home-sphere--glow flex items-center justify-center" />
          <div class="home-sphere home-sphere--ai flex items-center justify-center text-sm font-bold tracking-tight text-white">
            AI+
          </div>
          <div class="home-sphere home-sphere--eth flex items-center justify-center text-lg font-bold text-white/35 backdrop-blur-md">
            Ξ
          </div>
        </div>
        <div>
          <h2
            id="home-tech"
            class="text-lg font-bold leading-snug tracking-tight text-white sm:text-xl md:text-2xl"
          >
            专业系统能力，服务主动交易
          </h2>
          <p
            class="mt-3 text-[13px] leading-[1.65] text-white/55 sm:mt-4 sm:text-sm sm:leading-relaxed md:text-base md:leading-[1.65]"
          >
            CryptoX Pro 在撮合、行情与账户体系上持续投入：一方面降低延迟与故障窗口，另一方面让量化、网格等自动化策略可以稳定接入。我们深知，可依赖的系统表现，是交易者长期留存的基础。
          </p>
          <RouterLink
            :to="tradeDefault"
            class="mt-5 inline-flex items-center text-[13px] font-semibold text-lime-400 transition hover:text-lime-300 sm:mt-6 sm:text-sm"
          >
            前往交易终端
            <svg class="ml-1 h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="m9 18 6-6-6-6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </RouterLink>
        </div>
      </section>

      <!-- 多品种 -->
      <section class="mb-12 sm:mb-16 md:mb-20" aria-labelledby="home-markets">
        <h2
          id="home-markets"
          class="mb-5 text-center text-xl font-bold leading-snug tracking-tight text-white text-balance sm:mb-6 sm:text-2xl md:text-3xl"
        >
          多品种覆盖
        </h2>
        <ul class="grid gap-3.5 sm:gap-4 md:grid-cols-3">
          <li v-for="mode in tradeModes" :key="mode.to">
            <RouterLink
              :to="mode.to"
              class="group flex h-full flex-col rounded-xl border border-white/[0.05] bg-[#0b0e11] p-5 transition hover:border-lime-400/22 sm:p-6 md:p-7"
            >
              <h3 class="text-[1.0625rem] font-semibold leading-snug text-white sm:text-lg">
                {{ mode.label }}
              </h3>
              <p class="mt-2 flex-1 text-[13px] leading-relaxed text-white/50 sm:text-sm">
                {{ mode.sub }}
              </p>
              <span class="mt-5 inline-flex items-center text-[13px] font-medium text-lime-400 sm:mt-6 sm:text-sm">
                去交易
                <svg class="ml-1 h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 12h14M12 5l7 7-7 7"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
            </RouterLink>
          </li>
        </ul>
      </section>

      <!-- 合作伙伴：占位条，不冒用真实 Logo -->
      <section class="mb-12 border-t border-white/[0.04] pt-10 sm:mb-16 sm:pt-14 md:mb-20 md:pt-16" aria-labelledby="home-partners">
        <h2
          id="home-partners"
          class="text-center text-xl font-bold leading-snug tracking-tight text-white text-balance sm:text-2xl md:text-3xl"
        >
          生态与合作伙伴
        </h2>
        <p class="mx-auto mt-2.5 max-w-xl text-center text-[13px] leading-relaxed text-white/45 sm:mt-3 sm:text-sm md:text-base">
          安全第一。团队将持续拓展审计、数据与流动性合作，保障您的资产与信息安全。
        </p>
        <ul
          class="mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:mt-10 sm:gap-3 md:gap-4"
        >
          <li
            v-for="slot in partnerSlots"
            :key="slot"
            class="rounded-lg border border-white/[0.06] bg-white/[0.03] px-[1.3125rem] py-2.5 text-center text-[11px] font-medium leading-snug text-white/40 sm:min-w-[7.5rem] sm:px-6 sm:py-3 sm:text-xs sm:text-[13px]"
          >
            {{ slot }}
          </li>
        </ul>
      </section>

      <!-- 底 CTA -->
      <section
        class="rounded-xl border border-[#1f2429] bg-gradient-to-b from-[#1a1f26] to-[#0e1116] px-[1.875rem] py-9 text-center sm:rounded-2xl sm:px-12 sm:py-10 md:px-[4.5rem] md:py-12"
        aria-label="开始使用"
      >
        <p class="text-base font-semibold leading-snug text-white sm:text-lg md:text-xl">
          开启您的交易之旅
        </p>
        <p class="mx-auto mt-2 max-w-lg text-[13px] leading-relaxed text-white/50 sm:text-sm md:mt-2.5">
          建议先完成身份认证并阅读费率说明，再从永续或现货进入交易。
        </p>
        <div class="mt-5 flex flex-col items-stretch justify-center gap-2.5 sm:mt-6 sm:flex-row sm:items-center sm:gap-3">
          <RouterLink
            :to="tradeDefault"
            class="inline-flex h-12 min-h-[2.75rem] w-full items-center justify-center rounded-md bg-gradient-to-r from-lime-400 to-emerald-500 px-12 text-[15px] font-semibold text-[#0b0e11] shadow-[0_4px_20px_-6px_rgba(163,230,53,0.35)] transition hover:brightness-110 sm:h-11 sm:min-h-0 sm:w-auto sm:text-sm"
          >
            进入永续
          </RouterLink>
          <RouterLink
            :to="`${prefix}/personal-center/verification`"
            class="inline-flex h-12 min-h-[2.75rem] w-full items-center justify-center rounded-md border border-white/[0.11] px-12 text-[15px] font-semibold text-white transition hover:border-lime-400/28 sm:h-11 sm:min-h-0 sm:w-auto sm:text-sm"
          >
            身份认证
          </RouterLink>
        </div>
      </section>

      <div class="mt-8 rounded-lg border border-white/[0.04] bg-[#080a0c] px-6 py-4 text-center sm:mt-10 sm:rounded-xl sm:px-[1.875rem] sm:py-5 md:mt-12">
        <p class="text-[11px] leading-[1.65] text-white/35 sm:text-[11px] md:text-xs md:leading-relaxed">
          <span class="font-semibold text-white/45">风险提示：</span>
          数字资产及衍生品交易风险极高，可能导致本金全部损失。本页市场摘要仅供教育参考，不构成投资建议。
        </p>
      </div>

      <!-- 新闻资讯：置于首页内容区最下方，延续参考站的新闻列表信息层级 -->
      <section
        class="mt-12 border-t border-white/[0.06] pt-10 sm:mt-14 sm:pt-12 md:mt-16 md:pt-14"
        aria-labelledby="home-news"
      >
        <div class="mb-6 sm:mb-8">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-lime-400/75">News</p>
            <h2
              id="home-news"
              class="mt-2 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl"
            >
              新闻资讯
            </h2>
          </div>
        </div>

        <div v-if="featuredNews" class="grid gap-4 lg:grid-cols-[1.02fr_1fr] lg:gap-5">
          <RouterLink
            :to="featuredNews.to"
            class="group grid min-h-[17rem] overflow-hidden rounded-xl border border-white/[0.07] bg-[#0b0e11] transition hover:border-lime-400/24 hover:bg-[#10151a]"
          >
            <div class="relative min-h-48 overflow-hidden bg-[#12161b] sm:min-h-56">
              <img
                :src="featuredNews.imageUrl"
                :alt="featuredNews.title"
                class="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-95"
                loading="lazy"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-[#0b0e11] via-[#0b0e11]/28 to-transparent" aria-hidden="true" />
            </div>
            <div class="flex flex-col justify-between p-6 sm:p-7 md:p-8">
              <div>
                <div class="flex items-center justify-between gap-4">
                  <time class="font-mono text-xs text-white/38">{{ featuredNews.date }}</time>
                </div>
                <h3 class="mt-5 max-w-xl text-2xl font-bold leading-tight text-white text-balance sm:text-3xl">
                  {{ featuredNews.title }}
                </h3>
                <p class="mt-4 max-w-xl text-sm leading-[1.8] text-white/52 sm:text-[15px]">
                  {{ featuredNews.summary }}
                </p>
              </div>
              <span class="mt-8 inline-flex items-center text-sm font-semibold text-lime-400">
                查看详情
                <svg class="ml-1.5 h-4 w-4 transition group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 12h14M12 5l7 7-7 7"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
            </div>
          </RouterLink>

          <ul v-if="secondaryNews.length" class="rounded-xl border border-white/[0.07] bg-[#080a0c] px-5 sm:px-6">
            <li v-for="item in secondaryNews" :key="item.id" class="border-b border-white/[0.08] last:border-b-0">
              <RouterLink
                :to="item.to"
                class="group grid gap-3 py-5 text-left transition sm:grid-cols-[7.25rem_minmax(0,1fr)_1.5rem] sm:items-center sm:py-6"
              >
                <div>
                  <time class="font-mono text-[13px] text-white/48 sm:text-sm">{{ item.date }}</time>
                </div>
                <div class="min-w-0">
                  <h3 class="truncate text-[15px] font-semibold leading-snug text-white transition group-hover:text-lime-200 sm:text-base">
                    {{ item.title }}
                  </h3>
                  <p class="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-white/45">
                    {{ item.summary }}
                  </p>
                </div>
                <svg class="hidden h-4 w-4 justify-self-end text-white/34 transition group-hover:translate-x-0.5 group-hover:text-lime-300 sm:block" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </RouterLink>
            </li>
          </ul>
        </div>
      </section>
    </div>

    <footer
      class="relative border-t border-white/[0.07] bg-[#010102] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-12 sm:pt-14 md:pt-16"
      aria-label="页脚"
    >
      <div
        class="mx-auto max-w-6xl px-6 min-[400px]:px-[1.875rem] sm:px-9 lg:px-12"
      >
        <div class="grid gap-10 sm:gap-12 lg:grid-cols-12 lg:gap-10 lg:items-start">
          <div class="lg:col-span-4">
            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-lime-400/75">CryptoX Pro</p>
            <p class="mt-3 max-w-sm text-[13px] leading-relaxed text-white/45 sm:text-sm">
              面向全球用户的数字资产交易平台。现货、合约与账户安全能力持续迭代；演示环境数据仅供参考。
            </p>
            <div v-if="socialLinks.length" class="mt-5">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-white/45">社媒</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <a
                  v-for="item in socialLinks"
                  :key="item.id"
                  :href="item.url"
                  target="_blank"
                  rel="noreferrer"
                  class="inline-flex max-w-full items-center gap-2 rounded-md border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-[12px] font-medium text-white/55 transition hover:border-lime-400/20 hover:bg-lime-400/[0.07] hover:text-lime-200 sm:text-[13px]"
                >
                  <span
                    class="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded bg-white/[0.06] text-[10px] font-bold uppercase text-lime-300"
                    aria-hidden="true"
                  >
                    <img v-if="item.iconUrl" :src="item.iconUrl" alt="" class="h-full w-full object-cover" />
                    <span v-else>{{ item.name.slice(0, 1) }}</span>
                  </span>
                  <span class="truncate">{{ item.name }}</span>
                </a>
              </div>
            </div>
            <div
              class="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.06] pt-5 text-[11px] text-white/35 sm:text-xs"
            >
              <span class="inline-flex items-center gap-1.5">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-400/80" aria-hidden="true" />
                系统监控 · 演示
              </span>
              <span class="text-white/20">|</span>
              <span>7×24 风控校验（示意）</span>
            </div>
          </div>
          <div
            class="grid grid-cols-2 gap-8 sm:gap-6 md:grid-cols-5 lg:col-span-8"
          >
            <div v-for="col in footerColumns" :key="col.title">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                {{ col.title }}
              </p>
              <ul class="mt-3 space-y-2.5">
                <li v-for="link in col.links" :key="link.to">
                  <RouterLink
                    :to="link.to"
                    class="text-[13px] text-white/55 transition hover:text-lime-300/90 sm:text-sm"
                  >
                    {{ link.label }}
                  </RouterLink>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div
          class="mt-10 flex flex-col gap-4 border-t border-white/[0.06] pt-8 sm:mt-12 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:pt-10"
        >
          <p class="text-center text-[11px] leading-relaxed text-white/35 sm:text-left sm:text-xs">
            © {{ footerYear }} CryptoX Pro. 保留所有权利。本站点为产品演示，不构成任何要约。
          </p>
          <nav
            class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-white/40 sm:justify-end sm:text-xs"
            aria-label="法律与条款"
          >
            <a
              href="#"
              class="transition hover:text-white/65"
              @click.prevent
            >用户协议</a>
            <a
              href="#"
              class="transition hover:text-white/65"
              @click.prevent
            >隐私政策</a>
            <a
              href="#"
              class="transition hover:text-white/65"
              @click.prevent
            >免责声明</a>
          </nav>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* 标题中渐变短语：轻微提亮，避免整行强发光 */
.home-hero-accent {
  filter: drop-shadow(0 0 20px rgba(163, 230, 53, 0.12));
}

.home-adv-card {
  min-height: 9.5rem;
}

@media (min-width: 640px) {
  .home-adv-card {
    min-height: 10.5rem;
  }
}

.home-ring {
  animation: home-spin 120s linear infinite;
}

.home-tunnel .home-ring:nth-child(2) {
  animation-duration: 90s;
  animation-direction: reverse;
}
.home-tunnel .home-ring:nth-child(3) {
  animation-duration: 70s;
}
.home-tunnel .home-ring:nth-child(4) {
  animation-duration: 55s;
  animation-direction: reverse;
}

@keyframes home-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.home-glass-grid .home-sphere {
  aspect-ratio: 1;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.home-sphere--btc {
  background: radial-gradient(circle at 30% 30%, rgba(147, 51, 234, 0.35), rgba(15, 23, 42, 0.9));
}
.home-sphere--glow {
  background: radial-gradient(circle at 40% 35%, rgba(255, 255, 255, 0.45), rgba(56, 189, 248, 0.15));
  box-shadow: 0 0 40px rgba(56, 189, 248, 0.25);
}
.home-sphere--ai {
  background: radial-gradient(circle at 50% 40%, rgba(163, 230, 53, 0.35), rgba(15, 23, 42, 0.95));
  border-color: rgba(163, 230, 53, 0.22);
}
.home-sphere--eth {
  background: radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.45), rgba(15, 23, 42, 0.92));
}

@media (prefers-reduced-motion: reduce) {
  .home-ring {
    animation: none;
  }
}
</style>
