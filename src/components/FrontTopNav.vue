<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useFrontAuthStore } from '../stores/frontAuth'
import { pathNeedsFrontAuth } from '../composables/useRequireFrontAuth'
import {
  getFrontMainNavLinks,
  getFrontTradeMenuGroups,
  getFrontFinanceChannelEntries,
  getFrontFinanceHubPath,
  TRADE_ASSET_CLASS_META,
  TRADE_PRODUCT_MODE_META
} from '../constants/frontNav'
import { PAIRS_BY_CLASS } from '../constants/frontTradePairs'
import { getPersonalCenterShellMobileNavItems } from '../constants/personalCenterNav'
import { FRONT_LOCALE_CATALOG } from '../admin/constants/i18nCatalog'
import {
  FRONT_LANG_STORAGE_KEY,
  resolveFrontLocalePreference,
  useFrontSiteI18n
} from '../composables/useFrontSiteI18n'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  /** 固定为 `/front`（旧 /m 会重定向至 /front） */
  prefix: { type: String, required: true },
  /** 仅挂载移动端抽屉能力，由页面内自定义按钮触发，不渲染顶部栏。 */
  drawerOnly: { type: Boolean, default: false },
  /** 受控移动端抽屉开关；null 表示组件内部自控。 */
  mobileDrawerOpen: { type: Boolean, default: null }
})
const emit = defineEmits(['mobile-open-change', 'update:mobileDrawerOpen'])

const route = useRoute()
const router = useRouter()
const frontAuth = useFrontAuthStore()
const {
  isLoggedIn,
  email: authEmail,
  nickname: authNickname,
  accountMode,
  accountModeLabel,
  nextAccountMode,
  nextAccountModeLabel
} = storeToRefs(frontAuth)

const authDisplay = computed(() => {
  const n = authNickname.value
  const e = authEmail.value
  if (n) return n
  if (!e) return ''
  return e.length > 22 ? `${e.slice(0, 10)}…${e.slice(-8)}` : e
})

function logoutFront() {
  frontAuth.logout()
  closeOverlays()
  if (pathNeedsFrontAuth(route.path)) {
    router.push(`${props.prefix}/home`)
  }
}

const tradeOpen = ref(false)
const financeOpen = ref(false)
const langOpen = ref(false)
const downloadOpen = ref(false)
const accountOpen = ref(false)
const accountSwitchDialogOpen = ref(false)
const mobileOpen = ref(false)
/** 移动端：主抽屉内点「语言」后从底部弹出的语言选择层 */
const mobileLangSheetOpen = ref(false)
const navRoot = ref(null)
/** Teleport 抽屉，供外点关闭判断 */
const mobileDrawerRef = ref(null)
const mobileLangSheetRef = ref(null)
/** 顶栏：搜索交易对弹层 */
const searchOpen = ref(false)
const searchQuery = ref('')
const searchPanelRef = ref(null)
const accountSwitchDialogRef = ref(null)
const accountSwitchCancelRef = ref(null)
const accountSwitchTriggerRef = ref(null)

function isImageIcon(icon) {
  const s = String(icon || '').trim()
  return /^(https?:\/\/|data:image\/|\/)/i.test(s) || /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(s)
}

let downloadLeaveTimer = null

const mainLinks = computed(() => getFrontMainNavLinks(props.prefix))
/** 主导航中位于「交易 / 金融」之前的链接（首页、行情） */
const mainLinksLead = computed(() => mainLinks.value.filter((i) => i.key !== 'assets'))
const mainLinkAssets = computed(() => mainLinks.value.find((i) => i.key === 'assets'))
const showFinanceEntry = computed(() => !isLoggedIn.value || accountMode.value !== 'demo')
const tradeMenuGroups = computed(() => getFrontTradeMenuGroups(props.prefix))
const financeChannels = computed(() => getFrontFinanceChannelEntries(props.prefix))
const financeHubPath = computed(() => getFrontFinanceHubPath(props.prefix))

const FINANCE_DRAWER_ICON_BY_CHANNEL = {
  liquidity: 'finance-liquidity',
  lending: 'finance-lending',
  'ai-quant': 'finance-ai-quant'
}

/** 抽屉：金融首页 + 三个频道（各频道独立 icon） */
const drawerFinanceNav = computed(() => {
  const p = props.prefix
  return [
    { key: 'finance-hub', label: '金融首页', to: getFrontFinanceHubPath(p), icon: 'finance' },
    ...getFrontFinanceChannelEntries(p).map((c) => ({
      key: `finance-${c.key}`,
      label: c.label,
      to: c.to,
      icon: FINANCE_DRAWER_ICON_BY_CHANNEL[c.key] ?? 'finance'
    }))
  ]
})

/** 抽屉内交易：仅现货 / 永续 / 交割（默认加密货币品种，页内可再切） */
const drawerQuickTradeLinks = computed(() => {
  const p = props.prefix
  const base = `${p}/trade/crypto`
  return [
    {
      key: 'drawer-trade-spot',
      label: TRADE_PRODUCT_MODE_META.spot.label,
      to: `${base}/spot`,
      icon: 'market'
    },
    {
      key: 'drawer-trade-perpetual',
      label: TRADE_PRODUCT_MODE_META.perpetual.label,
      to: `${base}/perpetual`,
      icon: 'market'
    },
    {
      key: 'drawer-trade-delivery',
      label: TRADE_PRODUCT_MODE_META.delivery.label,
      to: `${base}/delivery`,
      icon: 'market'
    }
  ]
})

const pcDrawerShortcuts = computed(() =>
  getPersonalCenterShellMobileNavItems(props.prefix).filter((i) => i.key !== 'assets')
)

const pcBase = computed(() => `${props.prefix}/personal-center`)
const assetsBase = computed(() => `${props.prefix}/personal-center/assets`)
const customerServicePath = computed(() => `${props.prefix}/customer-service`)

/** 抽屉：首页 / 行情 / 资产 */
const drawerPrimaryNavEntries = computed(() =>
  mainLinks.value.map((i) => ({ ...i, icon: i.key }))
)

/** 抽屉：个人中心（与 shell 快捷一致，避免与 pcDrawerShortcuts 重复追加入口） */
const drawerPersonalNavEntries = computed(() => {
  const p = props.prefix
  return [
    { key: 'pc-overview', label: '账户总览', to: `${p}/personal-center`, icon: 'user' },
    ...pcDrawerShortcuts.value.map((i) => ({ ...i, icon: drawerPcIconKey(i.key) }))
  ]
})

function loginRouteWithRedirect(redirectPath) {
  return {
    path: `${props.prefix}/login`,
    query: { redirect: redirectPath }
  }
}

/** 未登录：资产 → 登录带回跳；已登录：原链链 */
const drawerPrimaryNavResolved = computed(() =>
  drawerPrimaryNavEntries.value.map((item) => ({
    ...item,
    linkTo:
      !isLoggedIn.value && item.key === 'assets'
        ? loginRouteWithRedirect(item.to)
        : item.to
  }))
)

/** 未登录：交易入口 → 登录后回到对应交易页 */
const drawerTradeLinksResolved = computed(() =>
  drawerQuickTradeLinks.value.map((item) => ({
    ...item,
    linkTo: isLoggedIn.value ? item.to : loginRouteWithRedirect(item.to)
  }))
)

const financeChannelsResolved = computed(() =>
  financeChannels.value.map((ch) => ({
    ...ch,
    linkTo: isLoggedIn.value ? ch.to : loginRouteWithRedirect(ch.to)
  }))
)

const financeHubLinkTo = computed(() =>
  isLoggedIn.value ? financeHubPath.value : loginRouteWithRedirect(financeHubPath.value)
)

/** 未登录：金融入口 → 登录后回到对应金融页 */
const drawerFinanceNavResolved = computed(() =>
  drawerFinanceNav.value.map((item) => ({
    ...item,
    linkTo: isLoggedIn.value ? item.to : loginRouteWithRedirect(item.to)
  }))
)

function drawerPcIconKey(key) {
  const m = {
    security: 'shield',
    verify: 'badge',
    'withdraw-addresses': 'send',
    'fees-vip': 'percent',
    referral: 'gift',
    notifications: 'bell',
    preferences: 'sliders',
    'customer-service': 'message'
  }
  return m[key] || 'circle'
}

/** 小图标：若干为多段 path */
function drawerIconPaths(icon) {
  const stroke = {
    home: [
      'M3 10.5 12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20V10.5Z',
      'M9 21.5V14h6v7.5'
    ],
    market: ['M4 16l4-6 4 3 4-8 4 5', 'M4 20h16'],
    finance: [
      'M4.9 15.75a3.35 2.05 0 1 0 6.7 0a3.35 2.05 0 1 0-6.7 0',
      'M8.25 13.7V9.5M6.35 11.6h3.8',
      'M14.25 18v-4.25M17.75 18V11M21.25 18V6.75'
    ],
    /** 流动性挖矿：锁 + 池底线 */
    'finance-liquidity': [
      'M8.75 12V7.75a3.25 3.25 0 0 1 6.5 0V12',
      'M7.25 12h9.5v8.25a1.1 1.1 0 0 1-1.1 1.1H8.35a1.1 1.1 0 0 1-1.1-1.1V12Z',
      'M5.5 20.25h13'
    ],
    /** 信用借贷：双向资金 */
    'finance-lending': [
      'M6.5 9.25h8.5M15 9.25l2.25-2.25M15 9.25l2.25 2.25',
      'M17.5 14.75H9M8 14.75L5.75 17M8 14.75l-2.25-2.25',
      'M12 11.25v1.5M12 15.25v1.5'
    ],
    /** AI 量化：芯片 + 算力脚 */
    'finance-ai-quant': [
      'M10 10h4v4h-4z',
      'M12 7V5.25M12 18.75V17M7.25 12H5.5M18.5 12h-1.75',
      'M8.6 8.6L7.35 7.35M15.4 8.6l1.25-1.25M8.6 15.4L7.35 16.65M15.4 15.4l1.25 1.25'
    ],
    assets: [
      'M19 7V4H5v3M5 11c0 4.5 3.6 8 8 8s8-3.5 8-8m-16 0v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9'
    ],
    user: [
      'M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
      'M4 20.5c1.6-3.2 4.7-5 8-5s6.4 1.8 8 5'
    ],
    wallet: [
      'M19 7V4H5v3M5 11c0 4.5 3.6 8 8 8s8-3.5 8-8m-16 0v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9'
    ],
    shield: [
      'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z'
    ],
    badge: ['M14 3v4a1 1 0 0 0 1 1h4', 'M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z'],
    send: ['M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z'],
    gift: [
      'M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8',
      'M12 22V12M2 7h20v5H2V7Z',
      'M12 12H7.5a2.5 2.5 0 0 1 0-5C11 7 12 12 12 12Z',
      'M12 12h4.5a2.5 2.5 0 0 0 0-5C13 7 12 12 12 12Z'
    ],
    bell: [
      'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9',
      'M10.3 21a1.94 1.94 0 0 0 3.4 0'
    ],
    sliders: ['M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h4M17 14h4M9 8h4'],
    message: ['M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z', 'M8 10h.01M12 10h.01M16 10h.01'],
    percent: ['M19 5 5 19', 'M7.5 7.5h.01M16.5 16.5h.01'],
    circle: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z']
  }
  return stroke[icon] || stroke.circle
}

function isAssetsActive() {
  const p = route.path
  const a = assetsBase.value
  return p === a || p.startsWith(`${a}/`)
}

function isPersonalCenterNavActive() {
  const p = route.path
  const b = pcBase.value
  if (!(p === b || p.startsWith(`${b}/`))) return false
  return !isAssetsActive()
}

function isActivePath(to) {
  const p = route.path
  return p === to || p.startsWith(`${to}/`)
}

function isMainActive(to) {
  const assetsTo = assetsBase.value
  return to === assetsTo ? isAssetsActive() : isActivePath(to)
}

function isTradeSectionActive() {
  const p = route.path
  const base = `${props.prefix}/trade/`
  return p.startsWith(base)
}

function isFinanceSectionActive() {
  const p = route.path
  const base = `${props.prefix}/finance`
  return p === base || p === `${base}/` || p.startsWith(`${base}/`)
}

function linkNavClass(active) {
  return [
    'inline-flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 lg:px-3.5 lg:text-[0.9375rem]',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0e11]',
    active ? 'text-lime-300' : 'text-[#eaecef] hover:text-lime-300'
  ]
}

function mainNavClass(to) {
  return linkNavClass(isMainActive(to))
}

function tradeTriggerClass() {
  return linkNavClass(tradeOpen.value || isTradeSectionActive())
}

function financeTriggerClass() {
  return linkNavClass(financeOpen.value || isFinanceSectionActive())
}

const { localeOptionsForNav, languageSwitcherEnabled } = useFrontSiteI18n()

/** 管理台启用的语言；若为空则回退为全量目录（不应出现） */
const frontLangOptions = computed(() =>
  localeOptionsForNav.value.length ? localeOptionsForNav.value : FRONT_LOCALE_CATALOG
)

const localeCode = ref('zh-CN')

const currentLocale = computed(
  () =>
    frontLangOptions.value.find((o) => o.code === localeCode.value) ||
    frontLangOptions.value[0] ||
    FRONT_LOCALE_CATALOG[0]
)

function selectLocale(code) {
  if (!frontLangOptions.value.some((o) => o.code === code)) return
  localeCode.value = code
  try {
    localStorage.setItem(FRONT_LANG_STORAGE_KEY, code)
  } catch {
    /* ignore */
  }
  langOpen.value = false
  mobileLangSheetOpen.value = false
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('front-locale-change', { detail: { locale: code } }))
  }
}

/** PC：下载菜单悬停（整块热区，避免移入浮层时误关） */
function onDownloadMouseEnter() {
  if (downloadLeaveTimer) {
    clearTimeout(downloadLeaveTimer)
    downloadLeaveTimer = null
  }
  downloadOpen.value = true
  tradeOpen.value = false
  financeOpen.value = false
  langOpen.value = false
  searchOpen.value = false
}

function onDownloadMouseLeave() {
  downloadLeaveTimer = setTimeout(() => {
    downloadOpen.value = false
    downloadLeaveTimer = null
  }, 200)
}

const accountName = computed(() => authDisplay.value || 'wallet_1ee48ca1')
const accountId = computed(() => {
  const raw = authEmail.value || authNickname.value || 'front-demo-user'
  let hash = 0
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0
  }
  return `ID:${hash % 1000}`
})
const accountCreditScore = computed(() => '2100')
const accountAssetSummary = [
  { key: 'spot', label: '币币', value: '167.03' },
  { key: 'perpetual', label: '永续合约', value: '93295.75' },
  { key: 'delivery', label: '交割合约', value: '460.29' },
  { key: 'finance', label: '理财', value: '0.00' }
]
const accountTotalAssets = computed(() => '93923.07 USDT')
const accountModeToneClass = computed(() => (
  accountMode.value === 'demo'
    ? 'border-amber-300/35 bg-amber-300/10 text-amber-100'
    : 'border-lime-300/35 bg-lime-300/10 text-lime-100'
))
const accountSwitchTitle = computed(() => `切换为${nextAccountModeLabel.value}？`)
const accountSwitchDescription = computed(() => (
  nextAccountMode.value === 'real'
    ? '切换后资产、订单、持仓和交易页面将按正式账户展示，请确认后再进行真实资金操作。'
    : '切换后资产、订单、持仓和交易页面将按模拟账户展示，可用于虚拟资金演练。'
))
const accountSwitchActionLabel = computed(() => `确认切换为${nextAccountModeLabel.value}`)

const accountPrimaryLinks = computed(() => [
  { key: 'personal', label: '个人中心', to: `${props.prefix}/personal-center` },
  { key: 'security', label: '安全中心', to: `${props.prefix}/personal-center/security` },
  { key: 'verify', label: '身份认证', to: `${props.prefix}/personal-center/verification` }
])

const accountInfoItems = [
  { key: 'whitepaper', label: '白皮书' },
  { key: 'company', label: '公司资质' },
  { key: 'regulatory', label: '监管文件' }
]

const announcementRoute = computed(() => `${props.prefix}/announcements`)

function goAnnouncementCenter() {
  tradeOpen.value = false
  financeOpen.value = false
  langOpen.value = false
  downloadOpen.value = false
  accountOpen.value = false
  searchOpen.value = false
  mobileOpen.value = false
  mobileLangSheetOpen.value = false
  router.push(announcementRoute.value)
}

function clearFrontCache() {
  try {
    sessionStorage.clear()
  } catch {
    /* ignore */
  }
  if (typeof caches !== 'undefined') {
    caches.keys().then((keys) => keys.forEach((key) => caches.delete(key))).catch(() => {})
  }
  closeOverlays()
}

function openAccountSwitchDialog(ev) {
  accountSwitchTriggerRef.value = ev?.currentTarget || null
  accountOpen.value = false
  mobileOpen.value = false
  accountSwitchDialogOpen.value = true
  nextTick(() => {
    accountSwitchCancelRef.value?.focus?.()
  })
}

function toggleAccountMenu() {
  const next = !accountOpen.value
  accountOpen.value = next
  if (next) {
    tradeOpen.value = false
    financeOpen.value = false
    langOpen.value = false
    downloadOpen.value = false
    searchOpen.value = false
  }
}

function closeAccountSwitchDialog() {
  accountSwitchDialogOpen.value = false
  nextTick(() => {
    const target = accountSwitchTriggerRef.value
    if (target && target.isConnected !== false && typeof target.focus === 'function') {
      target.focus()
    }
    accountSwitchTriggerRef.value = null
  })
}

function confirmAccountSwitch() {
  frontAuth.setAccountMode(nextAccountMode.value)
  closeAccountSwitchDialog()
}

function focusableAccountSwitchControls() {
  const root = accountSwitchDialogRef.value
  if (!root) return []
  return Array.from(root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
    .filter((node) => !node.disabled && !node.hidden && node.getAttribute('aria-hidden') !== 'true')
}

function onAccountSwitchDialogKeydown(ev) {
  if (ev.key === 'Escape') {
    ev.preventDefault()
    ev.stopPropagation()
    closeAccountSwitchDialog()
    return
  }
  if (ev.key !== 'Tab') return
  const controls = focusableAccountSwitchControls()
  if (!controls.length) return
  const first = controls[0]
  const last = controls[controls.length - 1]
  if (ev.shiftKey && document.activeElement === first) {
    ev.preventDefault()
    last.focus()
  } else if (!ev.shiftKey && document.activeElement === last) {
    ev.preventDefault()
    first.focus()
  }
}

/** 演示：App 下载页链接（二维码内容） */
const appQrIosUrl = 'https://apps.apple.com/app/cryptox-pro-demo'
const appQrAndroidUrl = 'https://play.google.com/store/apps/details?id=demo.cryptox.pro'
const appQrIosSrc = computed(
  () =>
    `https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${encodeURIComponent(appQrIosUrl)}`
)
const appQrAndroidSrc = computed(
  () =>
    `https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${encodeURIComponent(appQrAndroidUrl)}`
)

/** 扁平列表供顶栏搜索（品种 + 交易对） */
const tradePairSearchRows = computed(() => {
  const out = []
  for (const [ac, rows] of Object.entries(PAIRS_BY_CLASS)) {
    const classLabel = TRADE_ASSET_CLASS_META[ac]?.label ?? ac
    for (const row of rows) {
      const id = `${row.base}-${row.quote}`
      const symbolLabel = `${row.base}/${row.quote}`
      out.push({
        id,
        base: row.base,
        quote: row.quote,
        assetClass: ac,
        classLabel,
        symbolLabel,
        searchBlob: `${row.base} ${row.quote} ${id} ${symbolLabel} ${classLabel}`.toLowerCase()
      })
    }
  }
  return out
})

const filteredTradePairSearch = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const all = tradePairSearchRows.value
  if (!q) return all.slice(0, 60)
  return all.filter((r) => r.searchBlob.includes(q)).slice(0, 80)
})

function openTradePairSearch() {
  searchOpen.value = true
  tradeOpen.value = false
  financeOpen.value = false
  langOpen.value = false
  downloadOpen.value = false
  searchQuery.value = ''
  nextTick(() => {
    document.getElementById('front-nav-trade-pair-search')?.focus()
  })
}

function pickTradePairRow(row) {
  searchOpen.value = false
  searchQuery.value = ''
  router.push({
    path: `${props.prefix}/trade/${row.assetClass}/perpetual`,
    query: { pair: row.id }
  })
}

function toggleLangMenu() {
  const next = !langOpen.value
  langOpen.value = next
  if (next) {
    tradeOpen.value = false
    financeOpen.value = false
    downloadOpen.value = false
    searchOpen.value = false
  }
}

function toggleTradeMenu() {
  const next = !tradeOpen.value
  tradeOpen.value = next
  if (next) {
    financeOpen.value = false
    langOpen.value = false
    downloadOpen.value = false
    searchOpen.value = false
  }
}

function toggleFinanceMenu() {
  const next = !financeOpen.value
  financeOpen.value = next
  if (next) {
    tradeOpen.value = false
    langOpen.value = false
    downloadOpen.value = false
    searchOpen.value = false
  }
}

function closeOverlays() {
  tradeOpen.value = false
  financeOpen.value = false
  langOpen.value = false
  downloadOpen.value = false
  accountOpen.value = false
  accountSwitchDialogOpen.value = false
  searchOpen.value = false
  mobileOpen.value = false
  mobileLangSheetOpen.value = false
}

function openMobileDrawer() {
  mobileOpen.value = true
}

function closeMobileDrawer() {
  mobileOpen.value = false
}

defineExpose({
  openMobileDrawer,
  closeMobileDrawer
})

watch(() => route.fullPath, closeOverlays)

watch(
  () => props.mobileDrawerOpen,
  (open) => {
    if (open === null) return
    mobileOpen.value = open
  },
  { immediate: true }
)

function closeIfDesktopBreakpoint() {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(min-width: 1024px)').matches) {
    mobileOpen.value = false
    mobileLangSheetOpen.value = false
    tradeOpen.value = false
    financeOpen.value = false
    langOpen.value = false
    downloadOpen.value = false
    accountOpen.value = false
    accountSwitchDialogOpen.value = false
    searchOpen.value = false
  }
}

let removeMediaListener = () => {}

watch(
  () => frontLangOptions.value.map((o) => o.code).join(','),
  () => {
    const opts = frontLangOptions.value
    if (opts.length && !opts.some((o) => o.code === localeCode.value)) {
      const code = opts[0].code
      localeCode.value = code
      try {
        localStorage.setItem(FRONT_LANG_STORAGE_KEY, code)
      } catch {
        /* ignore */
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('front-locale-change', { detail: { locale: code } }))
      }
    }
  }
)

watch(languageSwitcherEnabled, (on) => {
  if (!on) {
    langOpen.value = false
    mobileLangSheetOpen.value = false
  }
})

onMounted(() => {
  localeCode.value = resolveFrontLocalePreference()
  const mq = window.matchMedia('(min-width: 1024px)')
  const onChange = () => closeIfDesktopBreakpoint()
  mq.addEventListener('change', onChange)
  removeMediaListener = () => mq.removeEventListener('change', onChange)
})

function onDocPointerDown(ev) {
  if (accountSwitchDialogOpen.value) return
  if (navRoot.value?.contains(ev.target)) return
  if (mobileDrawerRef.value?.contains(ev.target)) return
  if (mobileLangSheetRef.value?.contains(ev.target)) return
  if (searchPanelRef.value?.contains(ev.target)) return
  if (ev.target?.closest?.('#front-nav-drawer')) return
  if (ev.target?.closest?.('#front-mobile-lang-sheet')) return
  closeOverlays()
}

function pathNorm(p) {
  return p.replace(/\/+$/, '') || '/'
}

function isPcOverviewActive() {
  return pathNorm(route.path) === pathNorm(pcBase.value)
}

const anyPanelOpen = computed(
  () =>
    tradeOpen.value ||
    financeOpen.value ||
    langOpen.value ||
    downloadOpen.value ||
    accountOpen.value ||
    accountSwitchDialogOpen.value ||
    searchOpen.value ||
    mobileOpen.value ||
    mobileLangSheetOpen.value
)

function onEscape(ev) {
  if (ev.key !== 'Escape') return
  if (accountSwitchDialogOpen.value) {
    ev.preventDefault()
    closeAccountSwitchDialog()
    return
  }
  if (mobileLangSheetOpen.value) {
    mobileLangSheetOpen.value = false
    return
  }
  if (searchOpen.value) {
    searchOpen.value = false
    return
  }
  closeOverlays()
}

watch(anyPanelOpen, (open) => {
  if (open) {
    document.addEventListener('pointerdown', onDocPointerDown, true)
    window.addEventListener('keydown', onEscape)
  } else {
    document.removeEventListener('pointerdown', onDocPointerDown, true)
    window.removeEventListener('keydown', onEscape)
  }
})

watch(mobileOpen, (open) => {
  if (typeof document === 'undefined') return
  emit('mobile-open-change', open)
  emit('update:mobileDrawerOpen', open)
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) {
    tradeOpen.value = false
    financeOpen.value = false
    langOpen.value = false
    downloadOpen.value = false
    accountOpen.value = false
    searchOpen.value = false
  } else {
    mobileLangSheetOpen.value = false
    if (!searchOpen.value && !accountSwitchDialogOpen.value) document.body.style.overflow = ''
  }
})

watch(searchOpen, (open) => {
  if (typeof document === 'undefined') return
  if (open && !mobileOpen.value) document.body.style.overflow = 'hidden'
  if (!open && !mobileOpen.value && !accountSwitchDialogOpen.value) document.body.style.overflow = ''
  if (!open) searchQuery.value = ''
})

watch(accountSwitchDialogOpen, (open) => {
  if (typeof document === 'undefined') return
  if (open) document.body.style.overflow = 'hidden'
  if (!open && !mobileOpen.value && !searchOpen.value) document.body.style.overflow = ''
})

watch(showFinanceEntry, (visible) => {
  if (!visible) {
    financeOpen.value = false
  }
})

onUnmounted(() => {
  if (downloadLeaveTimer) clearTimeout(downloadLeaveTimer)
  removeMediaListener()
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  window.removeEventListener('keydown', onEscape)
  document.body.style.overflow = ''
})

const homeTo = computed(() => `${props.prefix}/home`)

function dropdownItemClass(to) {
  return isActivePath(to)
    ? 'bg-lime-400/12 text-lime-300'
    : 'text-[#eaecef] hover:bg-white/[0.06]'
}

function drawerPillActive(to) {
  const assetsTo = assetsBase.value
  const fh = financeHubPath.value
  if (pathNorm(to) === pathNorm(fh)) {
    return pathNorm(route.path) === pathNorm(fh)
  }
  let on = isActivePath(to)
  if (to === assetsTo) on = isAssetsActive()
  return on
}

function drawerRowActive(item) {
  if (item.key === 'pc-overview') return isPcOverviewActive()
  return drawerPillActive(item.to)
}

/** 左侧抽屉：柔和分层，避免粗线框 + 重色块 */
function drawerRowClass(item) {
  const on = drawerRowActive(item)
  return [
    'drawer-nav-row flex w-full min-h-[2.5rem] items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] leading-snug font-medium no-underline transition focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/28 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0e11] sm:min-h-0 sm:py-1.5 sm:text-[13px]',
    on
      ? 'bg-gradient-to-r from-lime-400/[0.09] via-white/[0.03] to-transparent text-lime-100 visited:text-lime-100'
      : 'text-[#eaecef] visited:text-[#eaecef] hover:bg-white/[0.04] hover:text-white'
  ]
}

</script>

<template>
  <div
    ref="navRoot"
    v-bind="drawerOnly ? {} : $attrs"
    :class="drawerOnly ? 'contents' : 'sticky top-0 z-20 w-full border-b border-[#1f2429] bg-[#0b0e11]'"
  >
    <div
      v-if="!drawerOnly"
      class="mx-auto flex min-h-[3.5rem] w-full items-center justify-between gap-2.5 px-3 sm:min-h-14 sm:gap-3 sm:px-4 lg:gap-6 lg:px-6 xl:px-8"
    >
      <!-- 左：品牌 + 大屏主导航 -->
      <div class="flex min-w-0 flex-1 items-center gap-4 lg:gap-10">
        <RouterLink
          :to="homeTo"
          class="group flex shrink-0 items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0e11]"
          @click="mobileOpen = false"
        >
          <span class="relative grid h-8 w-8 place-items-center" aria-hidden="true">
            <span
              class="absolute inset-0 rotate-45 rounded-[4px] bg-gradient-to-br from-lime-400 to-emerald-600 shadow-[0_0_20px_-4px_rgba(163,230,53,0.5)] transition group-hover:shadow-[0_0_24px_-2px_rgba(163,230,53,0.6)]"
            />
            <span class="relative text-[13px] font-black leading-none text-[#0b0e11] -rotate-45">X</span>
          </span>
          <span
            class="truncate text-[0.9375rem] font-semibold tracking-tight text-lime-300 sm:text-base lg:text-lg"
          >
            CryptoX Pro
          </span>
        </RouterLink>

        <nav
          class="hidden min-w-0 items-center gap-0.5 lg:flex lg:gap-1"
          aria-label="主导航"
        >
          <RouterLink
            v-for="item in mainLinksLead"
            :key="item.key"
            :to="item.to"
            :class="mainNavClass(item.to)"
          >
            {{ item.label }}
          </RouterLink>

          <div class="relative">
            <button
              type="button"
              class="inline-flex items-center gap-1"
              :class="tradeTriggerClass()"
              :aria-expanded="tradeOpen"
              aria-haspopup="true"
              aria-controls="front-trade-panel"
              @click="toggleTradeMenu"
            >
              交易
              <svg
                class="h-3 w-3 shrink-0 opacity-70 transition-transform duration-200"
                :class="tradeOpen ? 'rotate-180' : ''"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 4.5 6 7.5 9 4.5"
                  stroke="currentColor"
                  stroke-width="1.25"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <Transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="opacity-0 -translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-1"
            >
              <div
                v-show="tradeOpen"
                id="front-trade-panel"
                class="absolute left-0 top-full z-30 mt-1.5 flex min-w-[22rem] divide-x divide-[#1f2429] overflow-hidden rounded-md border border-[#1f2429] bg-[#1e2329] py-1.5 shadow-xl shadow-black/50"
                role="menu"
              >
                <div
                  v-for="group in tradeMenuGroups"
                  :key="group.key"
                  class="min-w-0 flex-1 px-0.5 first:pl-0 last:pr-0"
                >
                  <p
                    class="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#848e9c]"
                  >
                    {{ group.label }}
                  </p>
                  <RouterLink
                    v-for="item in group.items"
                    :key="item.key"
                    :to="item.to"
                    role="menuitem"
                    class="block px-3 py-2 text-sm transition-colors lg:text-[0.9375rem] lg:leading-snug"
                    :class="dropdownItemClass(item.to)"
                    @click="tradeOpen = false"
                  >
                    {{ item.label }}
                  </RouterLink>
                </div>
              </div>
            </Transition>
          </div>

          <div v-if="showFinanceEntry" class="relative">
            <button
              type="button"
              class="inline-flex items-center gap-1"
              :class="financeTriggerClass()"
              :aria-expanded="financeOpen"
              aria-haspopup="true"
              aria-controls="front-finance-panel"
              @click="toggleFinanceMenu"
            >
              金融
              <svg
                class="h-3 w-3 shrink-0 opacity-70 transition-transform duration-200"
                :class="financeOpen ? 'rotate-180' : ''"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 4.5 6 7.5 9 4.5"
                  stroke="currentColor"
                  stroke-width="1.25"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <Transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="opacity-0 -translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-1"
            >
              <div
                v-show="financeOpen"
                id="front-finance-panel"
                class="absolute left-0 top-full z-30 mt-1.5 w-[min(40rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-[#1f2429] bg-[#1e2329] shadow-xl shadow-black/50"
                role="menu"
              >
                <div
                  class="grid divide-y divide-[#1f2429] sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:items-stretch"
                >
                  <RouterLink
                    v-for="ch in financeChannelsResolved"
                    :key="ch.key"
                    role="menuitem"
                    :to="ch.linkTo"
                    class="group flex h-full min-h-[7.5rem] flex-col px-4 py-4 text-left transition sm:min-h-[8.75rem] sm:px-4 sm:py-4 md:px-5 md:py-4"
                    :class="dropdownItemClass(ch.to)"
                    @click="financeOpen = false"
                  >
                    <p
                      class="text-[10px] font-bold uppercase leading-tight tracking-[0.18em] text-lime-400/90"
                    >
                      {{ ch.tag }}
                    </p>
                    <h3
                      class="mt-1.5 text-base font-semibold leading-snug tracking-tight text-white sm:text-[1.0625rem]"
                    >
                      {{ ch.label }}
                    </h3>
                    <p
                      class="mt-1.5 line-clamp-2 text-[11.5px] leading-snug text-[#848e9c] sm:text-[12.5px]"
                    >
                      {{ ch.desc }}
                    </p>
                    <span
                      class="mt-auto inline-flex items-center pt-2.5 text-[13px] font-semibold leading-none text-lime-400/95 transition group-hover:text-lime-300 sm:pt-3 sm:text-sm"
                    >
                      进入频道
                      <svg
                        class="ml-1 h-3.5 w-3.5 shrink-0 transition group-hover:translate-x-0.5 sm:h-4 sm:w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
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
                <div
                  class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-[#1f2429] bg-[#12161c]/95 px-4 py-2.5"
                >
                  <span class="text-[11px] font-medium leading-snug text-[#848e9c]">CryptoX 金融 · 演示数据</span>
                  <RouterLink
                    :to="financeHubLinkTo"
                    role="menuitem"
                    class="shrink-0 text-[13px] font-semibold leading-none text-lime-400 transition hover:text-lime-300 sm:text-sm"
                    :class="pathNorm(route.path) === pathNorm(financeHubPath) ? 'text-lime-300' : ''"
                    @click="financeOpen = false"
                  >
                    金融首页
                  </RouterLink>
                </div>
              </div>
            </Transition>
          </div>

          <RouterLink
            v-if="mainLinkAssets"
            :key="mainLinkAssets.key"
            :to="mainLinkAssets.to"
            :class="mainNavClass(mainLinkAssets.to)"
            @click="mobileOpen = false"
          >
            {{ mainLinkAssets.label }}
          </RouterLink>
        </nav>
      </div>

      <!-- 右：大屏工具 + 账户 -->
      <div class="hidden shrink-0 items-center gap-2 sm:gap-3 lg:flex">
        <span
          v-if="isLoggedIn && accountMode === 'demo'"
          class="inline-flex h-8 min-w-[8.5rem] items-center justify-center rounded-md bg-[#043f08] px-5 text-sm font-medium leading-none text-[#16f33b]"
          aria-label="当前账户类型：模拟账户"
        >
          模拟账户
        </span>
        <button
          type="button"
          class="rounded-md p-2 text-[#eaecef] transition hover:bg-[#1f2429] hover:text-lime-300"
          :class="searchOpen ? 'bg-[#1f2429] text-lime-300' : ''"
          aria-label="搜索交易对"
          :aria-expanded="searchOpen"
          aria-controls="front-nav-trade-pair-dialog"
          aria-haspopup="dialog"
          @click="openTradePairSearch"
        >
          <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
            />
          </svg>
        </button>
        <button
          type="button"
          class="relative rounded-md p-2 text-[#eaecef] transition hover:bg-[#1f2429] hover:text-lime-300"
          :class="route.path.startsWith(announcementRoute) ? 'bg-[#1f2429] text-lime-300' : ''"
          aria-label="查看站内公告"
          @click="goAnnouncementCenter"
        >
          <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 9.5v5M10 8l7-3v14l-7-3H6a3 3 0 0 1 0-6h4Z"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M5.5 14.5 7 21h3l-1.6-6.5"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <div
          class="relative hidden lg:block"
          @mouseenter="onDownloadMouseEnter"
          @mouseleave="onDownloadMouseLeave"
        >
          <button
            type="button"
            class="rounded-md p-2 text-[#eaecef] transition hover:bg-[#1f2429] hover:text-lime-300"
            :class="downloadOpen ? 'bg-[#1f2429] text-lime-300' : ''"
            aria-label="下载 App"
            aria-haspopup="true"
            :aria-expanded="downloadOpen"
          >
            <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 4v11m0 0-3.5-3.5M12 15l3.5-3.5M5 19h14"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-1"
          >
            <div
              v-show="downloadOpen"
              class="absolute right-0 top-full z-30 w-[min(19rem,calc(100vw-2rem))] pt-2"
              role="menu"
              @mouseenter="onDownloadMouseEnter"
              @mouseleave="onDownloadMouseLeave"
            >
              <div
                class="rounded-md border border-[#1f2429] bg-[#1e2329] p-4 shadow-xl shadow-black/50"
              >
                <p class="mb-3 text-center text-xs font-medium text-[#848e9c]">扫码下载 App</p>
                <div class="grid grid-cols-2 gap-4">
                  <div class="text-center">
                    <img
                      :src="appQrIosSrc"
                      alt=""
                      width="112"
                      height="112"
                      class="mx-auto h-28 w-28 rounded border border-[#1f2429] bg-white p-1"
                      loading="lazy"
                      decoding="async"
                    />
                    <p class="mt-2 text-xs text-[#eaecef]">iOS</p>
                  </div>
                  <div class="text-center">
                    <img
                      :src="appQrAndroidSrc"
                      alt=""
                      width="112"
                      height="112"
                      class="mx-auto h-28 w-28 rounded border border-[#1f2429] bg-white p-1"
                      loading="lazy"
                      decoding="async"
                    />
                    <p class="mt-2 text-xs text-[#eaecef]">Android</p>
                  </div>
                </div>
                <p class="mt-3 text-center text-[10px] leading-snug text-[#848e9c]/90">
                  演示二维码，链接仅供参考
                </p>
              </div>
            </div>
          </Transition>
        </div>
        <div v-if="languageSwitcherEnabled" class="relative hidden lg:block">
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-md py-2 pl-2 pr-1.5 text-[#eaecef] transition hover:bg-[#1f2429] hover:text-lime-300"
            :class="langOpen ? 'bg-[#1f2429] text-lime-300' : ''"
            :aria-expanded="langOpen"
            aria-haspopup="listbox"
            aria-controls="front-lang-panel"
            :aria-label="`语言，当前 ${currentLocale.label}`"
            @click="toggleLangMenu"
          >
            <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
                stroke="currentColor"
                stroke-width="1.75"
              />
              <path
                d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"
                stroke="currentColor"
                stroke-width="1.75"
              />
            </svg>
            <span v-if="currentLocale.icon" class="hidden h-4 w-4 shrink-0 overflow-hidden rounded-full xl:inline-flex">
              <img
                v-if="isImageIcon(currentLocale.icon)"
                :src="currentLocale.icon"
                :alt="currentLocale.label"
                class="h-full w-full object-cover"
              />
              <span v-else class="text-sm leading-4">{{ currentLocale.icon }}</span>
            </span>
            <span class="hidden max-w-[4.5rem] truncate text-xs font-medium xl:inline">
              {{ currentLocale.short }}
            </span>
            <svg
              class="h-3 w-3 shrink-0 opacity-70 transition-transform duration-200"
              :class="langOpen ? 'rotate-180' : ''"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3 4.5 6 7.5 9 4.5"
                stroke="currentColor"
                stroke-width="1.25"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-1"
          >
            <div
              v-show="langOpen"
              id="front-lang-panel"
              class="absolute right-0 top-full z-30 mt-1.5 min-w-[11rem] overflow-hidden rounded-md border border-[#1f2429] bg-[#1e2329] py-1 shadow-xl shadow-black/50"
              role="listbox"
              @click.stop
            >
              <button
                v-for="opt in frontLangOptions"
                :id="`front-lang-${opt.code}`"
                :key="opt.code"
                type="button"
                role="option"
                class="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition lg:text-[0.9375rem]"
                :class="
                  localeCode === opt.code
                    ? 'bg-lime-400/12 text-lime-300'
                    : 'text-[#eaecef] hover:bg-white/[0.06]'
                "
                :aria-selected="localeCode === opt.code"
                @click="selectLocale(opt.code)"
              >
                <span class="min-w-0 flex items-center gap-1.5">
                  <span v-if="opt.icon" class="inline-flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full">
                    <img
                      v-if="isImageIcon(opt.icon)"
                      :src="opt.icon"
                      :alt="opt.label"
                      class="h-full w-full object-cover"
                    />
                    <span v-else>{{ opt.icon }}</span>
                  </span>
                  <span class="min-w-0 truncate">{{ opt.label }}</span>
                </span>
                <svg
                  v-if="localeCode === opt.code"
                  class="h-4 w-4 shrink-0 text-lime-400/90"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M20 6 9 17l-5-5"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>
          </Transition>
        </div>

        <template v-if="isLoggedIn">
          <RouterLink
            :to="customerServicePath"
            class="hidden h-9 w-9 items-center justify-center rounded-full bg-[#1f2429] text-[#eaecef] transition hover:bg-[#3f4652] hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/45 lg:inline-flex"
            :class="isActivePath(customerServicePath) ? 'bg-[#3f4652] text-sky-300' : ''"
            aria-label="在线客服"
            title="在线客服"
          >
            <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
              <path d="M8 10h.01M12 10h.01M16 10h.01" />
            </svg>
          </RouterLink>
          <div
            class="relative hidden lg:block"
          >
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1f2429] text-[#eaecef] transition hover:bg-[#3f4652] hover:text-lime-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/45"
              :class="accountOpen || isPersonalCenterNavActive() ? 'bg-[#3f4652] text-white' : ''"
              :title="authEmail || undefined"
              aria-label="账户菜单"
              aria-haspopup="true"
              :aria-expanded="accountOpen"
              aria-controls="front-account-panel"
              @click="toggleAccountMenu"
            >
              <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                  stroke="currentColor"
                  stroke-width="1.75"
                />
                <path
                  d="M5 20c1.4-3.1 4-4.75 7-4.75S17.6 16.9 19 20"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                />
              </svg>
            </button>
            <Transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="opacity-0 -translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-1"
            >
              <div
                v-show="accountOpen"
                id="front-account-panel"
                class="absolute right-0 top-full z-40 w-[19rem] max-w-[calc(100vw-1rem)] pt-2"
                role="menu"
              >
                <div class="max-h-[calc(100vh-5rem)] overflow-y-auto overscroll-contain rounded-xl border border-white/[0.08] bg-[#24242e] shadow-2xl shadow-black/55">
                  <div class="px-5 pb-4 pt-5">
                    <div class="flex items-center gap-3">
                      <div class="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-white/20 bg-gradient-to-br from-lime-200 via-cyan-200 to-violet-300 text-[16px] font-bold text-[#252733]">
                        {{ accountName.slice(0, 1).toUpperCase() }}
                      </div>
                      <div class="min-w-0">
                        <p class="truncate text-[16px] font-semibold leading-tight text-white" :title="accountName">{{ accountName }}</p>
                        <div class="mt-1.5 flex items-center gap-1.5 text-[13px] leading-none text-white/55">
                          <span>{{ accountId }}</span>
                          <svg class="h-4 w-4 text-cyan-300" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                              d="M9 9h10v10H9V9Z"
                              stroke="currentColor"
                              stroke-width="1.7"
                            />
                            <path
                              d="M5 15V5h10"
                              stroke="currentColor"
                              stroke-width="1.7"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div class="mt-4 rounded-lg border border-indigo-400/30 bg-[#27243a] py-2 text-center text-[16px] font-medium leading-none text-white/90">
                      信用分&nbsp;&nbsp;{{ accountCreditScore }}
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/[0.06] px-5 py-5">
                    <div v-for="item in accountAssetSummary" :key="item.key" class="min-w-0">
                      <p class="text-[13px] leading-none text-white/45">{{ item.label }}</p>
                      <p class="mt-2 truncate font-mono text-[18px] font-medium leading-none text-white">
                        {{ item.value }}
                      </p>
                    </div>
                  </div>

                  <div class="border-t border-white/[0.06] py-2">
                    <RouterLink
                      v-for="item in accountPrimaryLinks"
                      :key="item.key"
                      :to="item.to"
                      role="menuitem"
                      class="block px-5 py-2.5 text-[15px] leading-tight text-white/90 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/35"
                      @click="accountOpen = false"
                    >
                      {{ item.label }}
                    </RouterLink>
                  </div>

                  <div class="border-t border-white/[0.06] py-2">
                    <button
                      v-for="item in accountInfoItems"
                      :key="item.key"
                      type="button"
                      role="menuitem"
                      class="block w-full px-5 py-2.5 text-left text-[15px] leading-tight text-white/90 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/35"
                      @click="accountOpen = false"
                    >
                      {{ item.label }}
                    </button>
                  </div>

                  <div class="border-t border-white/[0.06] py-1">
                    <button
                      type="button"
                      role="menuitem"
                      class="block w-full px-5 py-2.5 text-left text-[15px] leading-tight text-white/90 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/35"
                      @click="openAccountSwitchDialog"
                    >
                      切换为{{ nextAccountModeLabel }}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      class="block w-full px-5 py-2.5 text-left text-[15px] leading-tight text-white/90 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/35"
                      @click="clearFrontCache"
                    >
                      清除缓存
                    </button>
                  </div>

                  <div class="border-t border-white/[0.06] py-1">
                    <button
                      type="button"
                      role="menuitem"
                      class="block w-full px-5 py-2.5 text-left text-[15px] leading-tight text-white/90 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/35"
                      @click="logoutFront"
                    >
                      退出登录
                    </button>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </template>
        <template v-else>
          <RouterLink
            :to="`${prefix}/login`"
            class="rounded-lg border border-white/[0.14] px-3.5 py-2 text-sm font-medium text-[#eaecef] transition [-webkit-tap-highlight-color:transparent] hover:bg-white/[0.06] sm:px-4"
            @click="mobileOpen = false"
          >
            登录
          </RouterLink>
          <RouterLink
            :to="`${prefix}/register`"
            class="rounded-lg bg-lime-400 px-3.5 py-2 text-sm font-semibold text-[#0b0e11] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] transition hover:bg-lime-300 sm:px-4"
            @click="mobileOpen = false"
          >
            注册
          </RouterLink>
        </template>
      </div>

      <!-- 右：<lg 菜单 -->
      <div class="flex shrink-0 items-center gap-2 lg:hidden">
        <button
          type="button"
          class="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#1f2429] text-[#eaecef] transition hover:bg-[#3f4652] hover:text-lime-300"
          :class="route.path.startsWith(announcementRoute) ? 'bg-[#3f4652] text-lime-300' : ''"
          aria-label="查看站内公告"
          @click="goAnnouncementCenter"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 9.5v5M10 8l7-3v14l-7-3H6a3 3 0 0 1 0-6h4Z"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M5.5 14.5 7 21h3l-1.6-6.5"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#1f2429] text-[#eaecef] transition hover:bg-[#3f4652]"
          :aria-expanded="mobileOpen"
          aria-haspopup="dialog"
          aria-controls="front-nav-drawer"
          :aria-label="mobileOpen ? '关闭菜单' : '打开菜单'"
          @click="mobileOpen = !mobileOpen"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              v-if="!mobileOpen"
              d="M4 7h16M4 12h16M4 17h10"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
            />
            <path
              v-else
              d="m6 6 12 12M18 6 6 18"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="front-drawer">
        <div
          v-if="mobileOpen"
          id="front-nav-drawer"
          ref="mobileDrawerRef"
          class="fixed inset-0 z-[100] lg:hidden"
          role="presentation"
        >
          <div
            class="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="菜单"
            class="front-drawer-panel absolute left-0 top-0 flex min-h-0 h-full w-[min(18rem,86vw)] max-w-[100vw] flex-col border-r border-white/[0.04] bg-[#0b0e11] shadow-[4px_0_24px_-4px_rgba(0,0,0,0.5)]"
            @click.stop
          >
            <!-- 贴顶固定：抽屉顶栏（关菜单）+ 账号卡片（仅登录态内容） -->
            <div
              class="shrink-0 border-b border-white/[0.05] bg-[#0b0e11] px-2 pb-2.5 pt-[max(0.25rem,env(safe-area-inset-top,0px))]"
            >
              <div class="flex justify-end">
                <button
                  type="button"
                  class="rounded-lg p-2 text-white/40 transition hover:bg-white/[0.07] hover:text-white/85"
                  aria-label="关闭菜单"
                  @click="mobileOpen = false"
                >
                  <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="m6 6 12 12M18 6 6 18"
                      stroke="currentColor"
                      stroke-width="1.75"
                      stroke-linecap="round"
                    />
                  </svg>
                </button>
              </div>
              <div
                class="mt-1 space-y-2 rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2.5"
              >
                <template v-if="isLoggedIn">
                  <p class="text-[10px] font-medium uppercase tracking-wider text-lime-400/75">
                    当前账号
                  </p>
                  <p
                    class="mt-0.5 truncate text-sm font-medium text-white/90"
                    :title="authEmail || undefined"
                  >
                    {{ authDisplay }}
                  </p>
                  <div class="mt-2 flex items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-white/[0.035] px-3 py-2">
                    <span class="text-[11px] text-white/45">资产总额</span>
                    <span class="font-mono text-[11px] font-semibold text-lime-200">{{ accountTotalAssets }}</span>
                  </div>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <RouterLink
                      :to="`${prefix}/personal-center`"
                      class="inline-flex min-w-[6rem] flex-1 items-center justify-center rounded-lg bg-lime-400/15 py-2 text-xs font-semibold text-lime-200 transition hover:bg-lime-400/22"
                      @click="mobileOpen = false"
                    >
                      个人中心
                    </RouterLink>
                    <button
                      type="button"
                      class="inline-flex min-w-[6rem] flex-1 items-center justify-center rounded-lg border border-white/15 py-2 text-xs font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white/85"
                      @click="logoutFront"
                    >
                      退出
                    </button>
                  </div>
                </template>
                <template v-else>
                  <p class="text-[12px] leading-relaxed text-[#c8cdd3]">
                    登录后可使用资产、交易全部功能。
                  </p>
                  <div class="mt-2.5 grid grid-cols-2 gap-2">
                    <RouterLink
                      :to="`${prefix}/login`"
                      class="flex items-center justify-center rounded-lg border border-white/[0.14] bg-white/[0.04] py-2.5 text-sm font-medium text-[#eaecef] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition [-webkit-tap-highlight-color:transparent] visited:text-[#eaecef] hover:border-white/[0.22] hover:bg-white/[0.08] hover:text-white"
                      @click="mobileOpen = false"
                    >
                      登录
                    </RouterLink>
                    <RouterLink
                      :to="`${prefix}/register`"
                      class="flex items-center justify-center rounded-lg bg-lime-400 py-2.5 text-sm font-semibold text-[#0b0e11] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] transition [-webkit-tap-highlight-color:transparent] visited:text-[#0b0e11] hover:bg-lime-300"
                      @click="mobileOpen = false"
                    >
                      注册
                    </RouterLink>
                  </div>
                </template>
              </div>
            </div>

            <nav
              class="front-drawer-nav-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2.5 pb-2"
              role="menu"
            >
              <p class="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b0b8c1] sm:tracking-wider">
                主导航
              </p>
              <div class="space-y-0.5">
                <RouterLink
                  v-for="item in drawerPrimaryNavResolved"
                  :key="item.key"
                  :to="item.linkTo"
                  role="menuitem"
                  :class="drawerRowClass(item)"
                  @click="mobileOpen = false"
                >
                  <span
                    class="drawer-nav-icon flex h-7 w-7 shrink-0 items-center justify-center"
                    :class="drawerRowActive(item) ? 'text-lime-300/95' : 'text-lime-400/65'"
                    aria-hidden="true"
                  >
                    <svg
                      class="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.65"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path v-for="(d, i) in drawerIconPaths(item.icon)" :key="i" :d="d" />
                    </svg>
                  </span>
                  <span class="min-w-0 truncate text-current">{{ item.label }}</span>
                </RouterLink>
              </div>

              <div
                class="mx-3 mb-0.5 mt-5 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
                aria-hidden="true"
              />
              <p class="mb-2 mt-5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b0b8c1] sm:tracking-wider">
                交易
              </p>
              <div class="space-y-0.5">
                <RouterLink
                  v-for="item in drawerTradeLinksResolved"
                  :key="item.key"
                  :to="item.linkTo"
                  role="menuitem"
                  :class="drawerRowClass(item)"
                  @click="mobileOpen = false"
                >
                  <span
                    class="drawer-nav-icon flex h-7 w-7 shrink-0 items-center justify-center"
                    :class="drawerRowActive(item) ? 'text-lime-300/95' : 'text-lime-400/65'"
                    aria-hidden="true"
                  >
                    <svg
                      class="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.65"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path v-for="(d, i) in drawerIconPaths(item.icon)" :key="i" :d="d" />
                    </svg>
                  </span>
                  <span class="min-w-0 truncate text-current">{{ item.label }}</span>
                </RouterLink>
              </div>

              <template v-if="showFinanceEntry">
                <div
                  class="mx-3 mb-0.5 mt-5 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
                  aria-hidden="true"
                />
                <p class="mb-2 mt-5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b0b8c1] sm:tracking-wider">
                  金融
                </p>
                <div class="space-y-0.5">
                  <RouterLink
                    v-for="item in drawerFinanceNavResolved"
                    :key="item.key"
                    :to="item.linkTo"
                    role="menuitem"
                    :class="drawerRowClass(item)"
                    @click="mobileOpen = false"
                  >
                    <span
                      class="drawer-nav-icon flex h-7 w-7 shrink-0 items-center justify-center"
                      :class="drawerRowActive(item) ? 'text-lime-300/95' : 'text-lime-400/65'"
                      aria-hidden="true"
                    >
                      <svg
                        class="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.65"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path v-for="(d, i) in drawerIconPaths(item.icon)" :key="i" :d="d" />
                      </svg>
                    </span>
                    <span class="min-w-0 truncate text-current">{{ item.label }}</span>
                  </RouterLink>
                </div>
              </template>

              <template v-if="isLoggedIn">
                <div
                  class="mx-3 mb-0.5 mt-5 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
                  aria-hidden="true"
                />
                <p class="mb-2 mt-5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b0b8c1] sm:tracking-wider">
                  个人中心
                </p>
                <div class="space-y-0.5">
                  <RouterLink
                    v-for="item in drawerPersonalNavEntries"
                    :key="item.key"
                    :to="item.to"
                    role="menuitem"
                    :class="drawerRowClass(item)"
                    @click="mobileOpen = false"
                  >
                    <span
                      class="drawer-nav-icon flex h-7 w-7 shrink-0 items-center justify-center"
                      :class="drawerRowActive(item) ? 'text-lime-300/95' : 'text-lime-400/65'"
                      aria-hidden="true"
                    >
                      <svg
                        class="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.65"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path v-for="(d, i) in drawerIconPaths(item.icon)" :key="i" :d="d" />
                      </svg>
                    </span>
                    <span class="min-w-0 truncate text-current">{{ item.label }}</span>
                  </RouterLink>
                  <button
                    type="button"
                    role="menuitem"
                    :class="drawerRowClass({ key: 'account-switch', to: '' })"
                    @click="openAccountSwitchDialog"
                  >
                    <span
                      class="drawer-nav-icon flex h-7 w-7 shrink-0 items-center justify-center text-lime-400/65"
                      aria-hidden="true"
                    >
                      <svg
                        class="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.65"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M7 7h10l-2.6-2.6" />
                        <path d="M17 17H7l2.6 2.6" />
                        <path d="M17 7 7 17" />
                      </svg>
                    </span>
                    <span class="min-w-0 truncate text-current">切换为{{ nextAccountModeLabel }}</span>
                  </button>
                </div>
              </template>
            </nav>

            <div
              v-if="languageSwitcherEnabled"
              class="shrink-0 border-t border-white/[0.06] bg-[#0b0e11] px-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-1"
            >
              <button
                type="button"
                class="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-3 text-left transition [-webkit-tap-highlight-color:transparent] focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/28 active:bg-white/[0.04]"
                aria-haspopup="dialog"
                :aria-expanded="mobileLangSheetOpen"
                aria-controls="front-mobile-lang-sheet"
                @click="mobileLangSheetOpen = true"
              >
                <span class="flex min-w-0 items-center gap-2.5">
                  <span
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-lime-400/80"
                    aria-hidden="true"
                  >
                    <img
                      v-if="isImageIcon(currentLocale.icon)"
                      :src="currentLocale.icon"
                      :alt="currentLocale.label"
                      class="h-full w-full rounded-lg object-cover"
                    />
                    <span v-else-if="currentLocale.icon" class="text-base">{{ currentLocale.icon }}</span>
                    <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
                        stroke="currentColor"
                        stroke-width="1.75"
                      />
                      <path
                        d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"
                        stroke="currentColor"
                        stroke-width="1.75"
                      />
                    </svg>
                  </span>
                  <span class="min-w-0">
                    <span class="block text-[11px] font-medium uppercase tracking-wider text-[#848e9c]">
                      语言
                    </span>
                    <span class="mt-0.5 block truncate text-sm font-medium text-[#eaecef]">
                      {{ currentLocale.label }}
                    </span>
                  </span>
                </span>
                <svg
                  class="h-4 w-4 shrink-0 text-white/35"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="m9 6 6 6-6 6"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>
          </aside>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="front-lang-sheet">
        <div
          v-if="languageSwitcherEnabled && mobileLangSheetOpen"
          id="front-mobile-lang-sheet"
          ref="mobileLangSheetRef"
          class="fixed inset-0 z-[110] lg:hidden"
          role="presentation"
        >
          <div
            class="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="front-mobile-lang-title"
            class="front-lang-sheet-panel absolute bottom-0 left-0 right-0 flex max-h-[min(70vh,28rem)] flex-col overflow-hidden rounded-t-2xl border border-white/[0.08] border-b-0 bg-[#12161c] shadow-[0_-8px_32px_rgba(0,0,0,0.45)]"
            @click.stop
          >
            <div class="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <h2 id="front-mobile-lang-title" class="text-base font-semibold text-[#eaecef]">
                选择语言
              </h2>
              <button
                type="button"
                class="rounded-lg p-2 text-white/45 transition hover:bg-white/[0.07] hover:text-white/85"
                aria-label="关闭"
                @click="mobileLangSheetOpen = false"
              >
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="m6 6 12 12M18 6 6 18"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
            </div>
            <div
              class="front-nav-scroll-pill min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
              role="listbox"
              aria-label="语言列表"
            >
              <button
                v-for="opt in frontLangOptions"
                :id="`front-mobile-lang-${opt.code}`"
                :key="opt.code"
                type="button"
                role="option"
                class="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-3 text-left text-[15px] font-medium transition [-webkit-tap-highlight-color:transparent] focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/28 active:bg-white/[0.04] sm:text-[14px]"
                :class="
                  localeCode === opt.code
                    ? 'bg-lime-400/[0.09] text-lime-100'
                    : 'text-[#eaecef] hover:bg-white/[0.04] hover:text-white'
                "
                :aria-selected="localeCode === opt.code"
                @click="selectLocale(opt.code)"
              >
                <span class="min-w-0 flex items-center gap-2">
                  <span v-if="opt.icon" class="inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full">
                    <img
                      v-if="isImageIcon(opt.icon)"
                      :src="opt.icon"
                      :alt="opt.label"
                      class="h-full w-full object-cover"
                    />
                    <span v-else>{{ opt.icon }}</span>
                  </span>
                  <span class="min-w-0 truncate">{{ opt.label }}</span>
                </span>
                <svg
                  v-if="localeCode === opt.code"
                  class="h-4 w-4 shrink-0 text-lime-400/90"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M20 6 9 17l-5-5"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="front-account-switch-dialog">
        <div
          v-if="accountSwitchDialogOpen"
          class="front-account-switch-overlay fixed inset-0 z-[120] flex items-end justify-center overflow-hidden bg-black/60 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-[1px] sm:items-center sm:pb-4"
          role="presentation"
        >
          <div
            ref="accountSwitchDialogRef"
            class="front-account-switch-panel relative flex max-h-[min(88vh,28rem)] w-full max-w-sm flex-col overflow-hidden rounded-xl border border-white/[0.1] bg-[#181923] shadow-2xl shadow-black/65"
            role="dialog"
            aria-modal="true"
            aria-labelledby="front-account-switch-title"
            @click.stop
            @keydown="onAccountSwitchDialogKeydown"
          >
            <div class="shrink-0 border-b border-white/[0.06] px-5 py-4 pr-14">
              <h2 id="front-account-switch-title" class="text-base font-semibold leading-snug text-white">
                {{ accountSwitchTitle }}
              </h2>
              <button
                type="button"
                class="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/[0.07] hover:text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/35"
                aria-label="关闭"
                @click="closeAccountSwitchDialog"
              >
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="m6 6 12 12M18 6 6 18"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div
                class="mb-3 inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold"
                :class="accountModeToneClass"
              >
                当前：{{ accountModeLabel }}
              </div>
              <p class="text-sm leading-6 text-white/75">
                {{ accountSwitchDescription }}
              </p>
            </div>

            <div class="flex shrink-0 justify-end gap-2 border-t border-white/[0.06] px-5 py-4">
              <button
                ref="accountSwitchCancelRef"
                type="button"
                class="inline-flex min-h-[2.5rem] items-center justify-center rounded-lg border border-white/[0.12] px-4 text-sm font-medium text-white/75 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/35"
                @click="closeAccountSwitchDialog"
              >
                取消切换
              </button>
              <button
                type="button"
                class="inline-flex min-h-[2.5rem] items-center justify-center rounded-lg bg-lime-400 px-4 text-sm font-semibold text-[#11150d] transition hover:bg-lime-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#181923]"
                @click="confirmAccountSwitch"
              >
                {{ accountSwitchActionLabel }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="front-search-modal">
        <div
          v-if="searchOpen"
          id="front-nav-trade-pair-dialog"
          ref="searchPanelRef"
          class="front-search-modal-overlay fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/55 p-3 pt-[max(3.5rem,env(safe-area-inset-top))] backdrop-blur-[1px] sm:items-center sm:p-4 sm:pt-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="front-nav-trade-pair-title"
          @click.self="searchOpen = false"
        >
          <div
            class="front-search-modal-panel w-full max-w-lg rounded-xl border border-[#1f2429] bg-[#12161c] shadow-2xl shadow-black/60"
            @click.stop
          >
            <div class="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <h2 id="front-nav-trade-pair-title" class="text-base font-semibold text-[#eaecef]">
                搜索交易对
              </h2>
              <button
                type="button"
                class="rounded-lg p-2 text-white/45 transition hover:bg-white/[0.07] hover:text-white/85"
                aria-label="关闭"
                @click="searchOpen = false"
              >
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="m6 6 12 12M18 6 6 18"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
            </div>
            <div class="p-3">
              <label class="sr-only" for="front-nav-trade-pair-search">搜索交易对</label>
              <div class="relative">
                <svg
                  class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#848e9c]"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                  />
                </svg>
                <input
                  id="front-nav-trade-pair-search"
                  v-model="searchQuery"
                  type="search"
                  autocomplete="off"
                  autocorrect="off"
                  spellcheck="false"
                  placeholder="输入代码或名称，如 BTC、ETH/USDT、黄金…"
                  class="w-full rounded-lg border border-white/[0.08] bg-black/30 py-2.5 pl-10 pr-3 text-sm text-[#eaecef] placeholder:text-[#848e9c]/85 focus:border-lime-400/40 focus:outline-none focus:ring-2 focus:ring-lime-400/25"
                />
              </div>
              <ul
                class="front-nav-scroll-pill mt-2 max-h-[min(22rem,50vh)] overflow-y-auto overscroll-contain rounded-lg border border-white/[0.04] bg-black/20 py-1"
                role="listbox"
                aria-label="匹配的交易对"
              >
                <li
                  v-if="filteredTradePairSearch.length === 0"
                  class="px-4 py-10 text-center text-sm text-[#848e9c]"
                >
                  未找到匹配的交易对
                </li>
                <li v-for="row in filteredTradePairSearch" :key="`${row.assetClass}-${row.id}`">
                  <button
                    type="button"
                    role="option"
                    class="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition [-webkit-tap-highlight-color:transparent] hover:bg-white/[0.05] focus:outline-none focus-visible:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-lime-400/25"
                    @click="pickTradePairRow(row)"
                  >
                    <span class="min-w-0 font-medium text-[#eaecef]">{{ row.symbolLabel }}</span>
                    <span
                      class="shrink-0 rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#848e9c]"
                    >
                      {{ row.classLabel }}
                    </span>
                  </button>
                </li>
              </ul>
              <p class="mt-2 px-0.5 text-[11px] leading-relaxed text-[#848e9c]/90">
                选择后将进入对应品种的永续交易页；未登录时会先跳转登录。
              </p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.front-drawer-enter-active,
.front-drawer-leave-active {
  transition: opacity 0.2s ease;
}

.front-drawer-enter-active .front-drawer-panel,
.front-drawer-leave-active .front-drawer-panel {
  transition: transform 0.2s ease;
}

.front-drawer-enter-from,
.front-drawer-leave-to {
  opacity: 0;
}

.front-drawer-enter-from .front-drawer-panel,
.front-drawer-leave-to .front-drawer-panel {
  transform: translateX(-100%);
}

@media (prefers-reduced-motion: reduce) {
  .front-drawer-enter-active,
  .front-drawer-leave-active,
  .front-drawer-enter-active .front-drawer-panel,
  .front-drawer-leave-active .front-drawer-panel,
  .front-lang-sheet-enter-active,
  .front-lang-sheet-leave-active,
  .front-lang-sheet-enter-active .front-lang-sheet-panel,
  .front-lang-sheet-leave-active .front-lang-sheet-panel,
  .front-account-switch-dialog-enter-active,
  .front-account-switch-dialog-leave-active,
  .front-account-switch-dialog-enter-active .front-account-switch-panel,
  .front-account-switch-dialog-leave-active .front-account-switch-panel,
  .front-search-modal-enter-active,
  .front-search-modal-leave-active,
  .front-search-modal-enter-active .front-search-modal-panel,
  .front-search-modal-leave-active .front-search-modal-panel {
    transition: none;
  }
}

/* 主导航抽屉：可滚动但不显示滚动条 */
.front-drawer-nav-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.front-drawer-nav-scroll::-webkit-scrollbar {
  display: none;
}

.front-lang-sheet-enter-active,
.front-lang-sheet-leave-active {
  transition: opacity 0.2s ease;
}

.front-lang-sheet-enter-active .front-lang-sheet-panel,
.front-lang-sheet-leave-active .front-lang-sheet-panel {
  transition: transform 0.22s ease;
}

.front-lang-sheet-enter-from,
.front-lang-sheet-leave-to {
  opacity: 0;
}

.front-lang-sheet-enter-from .front-lang-sheet-panel,
.front-lang-sheet-leave-to .front-lang-sheet-panel {
  transform: translateY(100%);
}

.front-account-switch-dialog-enter-active {
  transition: opacity 0.2s ease-out;
}

.front-account-switch-dialog-leave-active {
  transition: opacity 0.15s ease-in;
}

.front-account-switch-dialog-enter-active .front-account-switch-panel {
  transition:
    transform 0.2s ease-out,
    opacity 0.2s ease-out;
}

.front-account-switch-dialog-leave-active .front-account-switch-panel {
  transition:
    transform 0.15s ease-in,
    opacity 0.15s ease-in;
}

.front-account-switch-dialog-enter-from,
.front-account-switch-dialog-leave-to {
  opacity: 0;
}

.front-account-switch-dialog-enter-from .front-account-switch-panel,
.front-account-switch-dialog-leave-to .front-account-switch-panel {
  opacity: 0;
  transform: translateY(100%);
}

@media (min-width: 640px) {
  .front-account-switch-dialog-enter-from .front-account-switch-panel,
  .front-account-switch-dialog-leave-to .front-account-switch-panel {
    transform: scale(0.96);
  }
}

.front-search-modal-enter-active,
.front-search-modal-leave-active {
  transition: opacity 0.2s ease;
}

.front-search-modal-enter-active .front-search-modal-panel,
.front-search-modal-leave-active .front-search-modal-panel {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.front-search-modal-enter-from,
.front-search-modal-leave-to {
  opacity: 0;
}

.front-search-modal-enter-from .front-search-modal-panel,
.front-search-modal-leave-to .front-search-modal-panel {
  opacity: 0;
  transform: scale(0.97) translateY(-6px);
}

/* 搜索弹层遮罩：可滚但隐藏系统滚动条（仅滚轮/触控），避免原生条 */
.front-search-modal-overlay {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.front-search-modal-overlay::-webkit-scrollbar {
  display: none;
}

/*
 * 自定义胶囊滚动条（非系统默认外观）：透明轨道 + 圆角滑块 + 透明边距
 * Firefox：thumb / track 颜色；WebKit：隐藏箭头与 corner
 */
.front-nav-scroll-pill {
  scrollbar-width: thin;
  scrollbar-color: rgba(163, 230, 53, 0.55) transparent;
}

.front-nav-scroll-pill::-webkit-scrollbar {
  width: 6px;
}

.front-nav-scroll-pill::-webkit-scrollbar-button,
.front-nav-scroll-pill::-webkit-scrollbar-corner {
  display: none;
  width: 0;
  height: 0;
}

.front-nav-scroll-pill::-webkit-scrollbar-track {
  background: transparent;
}

.front-nav-scroll-pill::-webkit-scrollbar-thumb {
  border-radius: 999px;
  border: 2px solid transparent;
  background-color: rgba(163, 230, 53, 0.38);
  background-clip: padding-box;
  min-height: 2.5rem;
}

.front-nav-scroll-pill::-webkit-scrollbar-thumb:hover {
  background-color: rgba(190, 242, 100, 0.55);
  background-clip: padding-box;
}

.front-nav-scroll-pill::-webkit-scrollbar-thumb:active {
  background-color: rgba(163, 230, 53, 0.7);
}

@media (prefers-reduced-motion: reduce) {
  .front-account-switch-dialog-enter-active,
  .front-account-switch-dialog-leave-active,
  .front-account-switch-dialog-enter-active .front-account-switch-panel,
  .front-account-switch-dialog-leave-active .front-account-switch-panel {
    transition: none;
  }

  .front-account-switch-dialog-enter-from .front-account-switch-panel,
  .front-account-switch-dialog-leave-to .front-account-switch-panel {
    transform: none;
  }
}
</style>
