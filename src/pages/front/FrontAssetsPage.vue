<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { SITE_CONFIG_STORAGE_KEY, siteConfigApi } from '../../admin/mock/siteConfig'
import FrontStrokeIcon from '../../components/front/FrontStrokeIcon.vue'
import {
  FRONT_DEMO_ACCOUNT_ASSET_CONFIG,
  FRONT_ASSET_OVERVIEW,
  FRONT_DEPOSIT_DEFAULT_SYMBOL_LOWER,
  formatFrontAssetAmount,
  formatFrontUsdAmount,
  frontAssetCoinMeta,
  frontDemoAssetClaimMonthKey,
  normalizeFrontDemoAccountAssetConfig
} from '../../constants/frontAssetCenterDemo'
import { useFrontAuthStore } from '../../stores/frontAuth'

const route = useRoute()
const frontAuth = useFrontAuthStore()
const { accountMode, accountModeLabel, email: authEmail } = storeToRefs(frontAuth)
const prefix = '/front'
const depositDetailPath = `${prefix}/personal-center/assets/deposit/${FRONT_DEPOSIT_DEFAULT_SYMBOL_LOWER}`
const transferPath = `${prefix}/personal-center/assets/transfer`
const convertPath = `${prefix}/personal-center/assets/convert`

/** 示例估值，对接接口后替换 */
const hideBalance = ref(false)
const baseTotalUsd = FRONT_ASSET_OVERVIEW.totalUsd
const todayPnl = FRONT_ASSET_OVERVIEW.todayPnl
const demoAssetConfig = ref(normalizeFrontDemoAccountAssetConfig(FRONT_DEMO_ACCOUNT_ASSET_CONFIG))
const assetToast = ref({
  visible: false,
  message: '',
  severity: 'success',
  messageId: '',
  channel: 'toast',
  sourceOwner: 'front-assets-demo-claim-button',
  resultBinding: '',
  durationPolicy: 'auto-dismiss',
  dismissPolicy: 'client-only',
  announcementPolicy: 'polite',
  dedupeKey: 'front-assets-demo-claim',
  sensitiveBoundary: 'demo-account-asset-claim',
  recoveryActions: []
})
let assetToastTimer = null

/** 充提划转闪兑 */
const assetQuickActions = [
  {
    key: 'withdraw',
    label: '提币',
    icon: 'arrow-right',
    to: `${prefix}/personal-center/assets/withdraw`
  },
  {
    key: 'deposit',
    label: '充币',
    icon: 'arrow-left',
    to: depositDetailPath
  },
  {
    key: 'transfer',
    label: '划转',
    icon: 'arrows-swap',
    to: transferPath
  },
  {
    key: 'convert',
    label: '闪兑',
    icon: 'bolt',
    to: convertPath
  }
]

const demoAssetQuickActions = [
  {
    key: 'demo-claim',
    label: '获取资产',
    icon: 'wallet',
    command: 'claim-demo-assets'
  },
  {
    key: 'transfer',
    label: '划转',
    icon: 'arrows-swap',
    to: transferPath
  }
]

const visibleAssetQuickActions = computed(() => (
  accountMode.value === 'demo' ? demoAssetQuickActions : assetQuickActions
))

function pathNorm(p) {
  return (p || '').replace(/\/+$/, '') || '/'
}

/** 是否与当前路由对应（用于高亮「你在哪」） */
function actionActive(a) {
  if (!a.to) return false
  const p = pathNorm(route.path)
  if (a.key === 'deposit') {
    return p.includes('/personal-center/assets/deposit')
  }
  const t = pathNorm(a.to)
  return p === t || p.startsWith(`${t}/`)
}

const subAccounts = FRONT_ASSET_OVERVIEW.subAccounts

const masked = computed(() => hideBalance.value)
const demoAssetClaimLimit = computed(() => demoAssetConfig.value.monthlyClaimLimit)
const demoAssetClaimedCount = ref(0)
const demoClaimedUsd = computed(() => demoAssetClaimedCount.value * demoAssetConfig.value.claimAmountUsd)
const demoClaimAmountText = computed(() => (
  `${formatFrontUsdAmount(demoAssetConfig.value.claimAmountUsd)} ${demoAssetConfig.value.currency}`
))
const accountModeBadgeClass = computed(() => (
  accountMode.value === 'demo'
    ? 'border-amber-300/35 bg-amber-300/10 text-amber-100'
    : 'border-lime-300/35 bg-lime-300/10 text-lime-100'
))
const assetToastClass = computed(() => (
  assetToast.value.severity === 'warning'
    ? 'border-amber-300/25 text-amber-100'
    : 'border-emerald-400/25 text-white'
))
const numericBaseTotalUsd = computed(() => Number(String(baseTotalUsd).replace(/,/g, '')) || 0)
const shownTotalUsdNumber = computed(() => numericBaseTotalUsd.value + (accountMode.value === 'demo' ? demoClaimedUsd.value : 0))
const totalUsd = computed(() => formatFrontUsdAmount(shownTotalUsdNumber.value))
const totalBtc = computed(() => {
  const btcPrice = frontAssetCoinMeta('BTC')?.usdPrice || 1
  return `${formatFrontAssetAmount(shownTotalUsdNumber.value / btcPrice, 'BTC')} BTC`
})

function demoAssetClaimStorageKey() {
  const owner = authEmail.value || 'guest'
  return `fex-front-demo-asset-claims:${owner}:${frontDemoAssetClaimMonthKey()}`
}

function readDemoAssetClaimedCount() {
  if (typeof localStorage === 'undefined') return 0
  const raw = Number(localStorage.getItem(demoAssetClaimStorageKey()))
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0
}

function writeDemoAssetClaimedCount(value) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(demoAssetClaimStorageKey(), String(value))
}

async function loadDemoAssetConfig() {
  try {
    const result = await siteConfigApi.getSiteConfig()
    if (result.success) {
      demoAssetConfig.value = normalizeFrontDemoAccountAssetConfig(result.data?.demoAccountAsset)
    }
  } catch {
    demoAssetConfig.value = normalizeFrontDemoAccountAssetConfig(FRONT_DEMO_ACCOUNT_ASSET_CONFIG)
  }
}

function refreshDemoAssetConfigFromStorage(event) {
  if (!event || event.key === SITE_CONFIG_STORAGE_KEY) {
    loadDemoAssetConfig()
  }
}

function showAssetToast(message, severity = 'success') {
  if (assetToastTimer) {
    clearTimeout(assetToastTimer)
  }
  assetToast.value = {
    visible: true,
    message,
    severity,
    messageId: `demo-asset-claim-${severity}`,
    channel: 'toast',
    sourceOwner: 'front-assets-demo-claim-button',
    resultBinding: demoAssetClaimStorageKey(),
    durationPolicy: 'auto-dismiss',
    dismissPolicy: 'client-only',
    announcementPolicy: 'polite',
    dedupeKey: 'front-assets-demo-claim',
    sensitiveBoundary: 'demo-account-asset-claim',
    recoveryActions: []
  }
  assetToastTimer = setTimeout(() => {
    assetToast.value = {
      ...assetToast.value,
      visible: false
    }
    assetToastTimer = null
  }, 2800)
}

function claimDemoAssets() {
  const latestCount = readDemoAssetClaimedCount()
  demoAssetClaimedCount.value = latestCount
  if (latestCount >= demoAssetClaimLimit.value) {
    showAssetToast(`本月获取资产次数已用完，每月最多可获取 ${demoAssetClaimLimit.value} 次。`, 'warning')
    return
  }
  const nextCount = latestCount + 1
  demoAssetClaimedCount.value = nextCount
  writeDemoAssetClaimedCount(nextCount)
  showAssetToast(`获取成功，已到账 ${demoClaimAmountText.value}，本月剩余 ${Math.max(0, demoAssetClaimLimit.value - nextCount)} 次。`)
}

function runAssetAction(action) {
  if (action.command === 'claim-demo-assets') {
    claimDemoAssets()
  }
}

onMounted(() => {
  loadDemoAssetConfig()
  demoAssetClaimedCount.value = readDemoAssetClaimedCount()
  window.addEventListener('admin-site-config-updated', loadDemoAssetConfig)
  window.addEventListener('storage', refreshDemoAssetConfigFromStorage)
})

onUnmounted(() => {
  if (assetToastTimer) {
    clearTimeout(assetToastTimer)
  }
  window.removeEventListener('admin-site-config-updated', loadDemoAssetConfig)
  window.removeEventListener('storage', refreshDemoAssetConfigFromStorage)
})

function toggleEye() {
  hideBalance.value = !hideBalance.value
}

function displayVal(val) {
  return masked.value ? '****' : val
}

const card = 'rounded-2xl border border-white/[0.06] bg-white/[0.025]'
const label = 'text-[10px] font-medium uppercase tracking-[0.08em] text-white/38'

const actionPillBase =
  'inline-flex items-center justify-center gap-2 rounded-xl border text-left font-medium transition [-webkit-tap-highlight-color:transparent] focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]'
const actionPillOn =
  'border-lime-400/45 bg-lime-400/[0.13] text-lime-50 shadow-[0_0_0_1px_rgba(190,242,100,0.22)]'
const actionPillOff =
  'border-white/[0.09] bg-white/[0.02] text-white/78 hover:border-white/[0.14] hover:bg-white/[0.055] hover:text-white/92 active:scale-[0.99]'
</script>

<template>
  <div class="text-white">
    <header
      class="mb-4 hidden border-b border-white/[0.06] pb-4 md:mb-5 md:block lg:mb-6 lg:pb-5"
    >
      <h1 class="text-xl font-semibold tracking-tight text-white lg:text-[1.35rem]">资产</h1>
      <p class="mt-1 text-xs text-white/42">总览余额、快捷充提与分账户分布</p>
    </header>

    <div class="flex flex-col gap-4 md:gap-5">
      <div class="flex flex-col gap-4 md:hidden">
        <section :class="`${card} px-4 py-4`" aria-label="账户总资产">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-xs font-medium text-white/45">账户总资产</h1>
            <button
              type="button"
              class="-mr-0.5 rounded-md p-1 text-white/38 transition hover:bg-white/[0.06] hover:text-white/70 [-webkit-tap-highlight-color:transparent]"
              :aria-label="hideBalance ? '显示余额' : '隐藏余额'"
              @click="toggleEye"
            >
              <FrontStrokeIcon
                :name="masked ? 'eye-off' : 'eye'"
                size-class="h-4 w-4"
              />
            </button>
            <span
              class="inline-flex min-h-6 items-center rounded-md border px-2 text-xs font-medium leading-none"
              :class="accountModeBadgeClass"
              aria-label="当前账户类型"
            >
              {{ accountModeLabel }}
            </span>
          </div>
          <p class="mt-3 font-mono text-[1.625rem] font-medium leading-none tracking-tight text-white">
            $ {{ displayVal(totalUsd) }}
          </p>
          <p class="mt-2 text-xs text-white/40">≈ {{ displayVal(totalBtc) }}</p>
          <div class="mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-3 text-xs text-white/42">
            <span>今日收益 {{ displayVal(todayPnl) }}</span>
            <button
              type="button"
              class="-m-1 rounded-md p-1 text-white/32 transition hover:bg-white/[0.06] hover:text-white/65 [-webkit-tap-highlight-color:transparent]"
              aria-label="刷新估值"
            >
              <FrontStrokeIcon name="refresh" size-class="h-4 w-4" />
            </button>
          </div>
        </section>

        <nav
          class="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02] [-webkit-tap-highlight-color:transparent]"
          aria-label="资产快捷操作"
        >
          <div
            class="grid divide-x divide-white/[0.06]"
            :class="accountMode === 'demo' ? 'grid-cols-2' : 'grid-cols-4'"
          >
            <template v-for="a in visibleAssetQuickActions" :key="a.key">
              <button
                v-if="a.command"
                type="button"
                class="flex min-h-[4.25rem] flex-col items-center justify-center gap-1 px-1 py-2.5 text-center text-white/78 transition focus:outline-none focus-visible:z-[1] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime-400/35 active:bg-white/[0.04] hover:bg-white/[0.035]"
                :aria-label="a.label"
                @click="runAssetAction(a)"
              >
                <span class="inline-flex shrink-0 text-white/55">
                  <FrontStrokeIcon :name="a.icon" size-class="h-[1.15rem] w-[1.15rem]" />
                </span>
                <span class="text-[10px] font-medium leading-tight tracking-tight">
                  {{ a.label }}
                </span>
              </button>
              <RouterLink
                v-else
                :to="a.to"
                :aria-current="actionActive(a) ? 'page' : undefined"
                class="flex min-h-[4.25rem] flex-col items-center justify-center gap-1 px-1 py-2.5 text-center transition focus:outline-none focus-visible:z-[1] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime-400/35 active:bg-white/[0.04]"
                :class="
                  actionActive(a)
                    ? 'bg-lime-400/[0.09] text-lime-100'
                    : 'text-white/78 hover:bg-white/[0.035]'
                "
              >
                <span
                  class="inline-flex shrink-0"
                  :class="actionActive(a) ? 'text-lime-300/95' : 'text-white/55'"
                >
                  <FrontStrokeIcon :name="a.icon" size-class="h-[1.15rem] w-[1.15rem]" />
                </span>
                <span class="text-[10px] font-medium leading-tight tracking-tight">
                  {{ a.label }}
                </span>
              </RouterLink>
            </template>
          </div>
        </nav>
      </div>

      <section :class="`hidden ${card} p-5 md:block lg:p-6`">
        <div class="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-xs font-medium text-white/45 md:text-sm">账户总资产</h1>
              <button
                type="button"
                class="rounded-md p-1 text-white/40 transition hover:bg-white/[0.06] hover:text-white/70"
                :aria-label="hideBalance ? '显示余额' : '隐藏余额'"
                @click="toggleEye"
              >
                <FrontStrokeIcon :name="masked ? 'eye-off' : 'eye'" size-class="h-[18px] w-[18px]" />
              </button>
              <span
                class="inline-flex min-h-6 items-center rounded-md border px-2 text-xs font-medium leading-none"
                :class="accountModeBadgeClass"
                aria-label="当前账户类型"
              >
                {{ accountModeLabel }}
              </span>
            </div>
            <p class="mt-3 font-mono text-2xl font-medium tracking-tight text-white md:text-3xl">
              $ {{ displayVal(totalUsd) }}
            </p>
            <p class="mt-1 text-sm text-white/42">≈ {{ displayVal(totalBtc) }}</p>
            <div class="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/45">
              <span>今日收益 {{ displayVal(todayPnl) }}</span>
              <button
                type="button"
                class="rounded p-1 text-white/35 transition hover:text-lime-300/80"
                aria-label="刷新估值"
              >
                <FrontStrokeIcon name="refresh" size-class="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
          <div class="w-full md:w-auto">
            <p :class="`${label} mb-2 md:text-right`">快捷操作</p>
            <nav
              class="flex flex-wrap gap-2 md:justify-end"
              aria-label="资产快捷操作"
            >
              <template v-for="a in visibleAssetQuickActions" :key="`d-${a.key}`">
                <button
                  v-if="a.command"
                  type="button"
                  :aria-label="a.label"
                  :class="[actionPillBase, actionPillOff, 'px-3.5 py-2.5 text-sm md:px-4']"
                  @click="runAssetAction(a)"
                >
                  <span class="inline-flex shrink-0 text-white/48">
                    <FrontStrokeIcon :name="a.icon" size-class="h-[1.05rem] w-[1.05rem]" />
                  </span>
                  {{ a.label }}
                </button>
                <RouterLink
                  v-else
                  :to="a.to"
                  :aria-current="actionActive(a) ? 'page' : undefined"
                  :class="[
                    actionPillBase,
                    actionActive(a) ? actionPillOn : actionPillOff,
                    'px-3.5 py-2.5 text-sm md:px-4'
                  ]"
                >
                  <span
                    class="inline-flex shrink-0"
                    :class="actionActive(a) ? 'text-lime-200/95' : 'text-white/48'"
                  >
                    <FrontStrokeIcon :name="a.icon" size-class="h-[1.05rem] w-[1.05rem]" />
                  </span>
                  {{ a.label }}
                </RouterLink>
              </template>
            </nav>
          </div>
        </div>
      </section>

      <div class="flex flex-col gap-3">
        <h2 :class="label">账户分布</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <article v-for="acc in subAccounts" :key="acc.key" :class="`${card} p-4 md:p-5`">
            <p class="text-sm font-medium text-white/72">{{ acc.title }}</p>
            <p class="mt-3 font-mono text-xl font-medium tabular-nums text-white md:text-2xl">
              $ {{ displayVal(acc.usd) }}
            </p>
            <p class="mt-1 text-xs text-white/40">≈ {{ displayVal(acc.btc) }}</p>
            <p class="mt-3 text-xs text-white/38">今日收益 {{ displayVal(acc.dayPnl) }}</p>
          </article>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="front-asset-toast-fade">
        <div
          v-if="assetToast.visible"
          class="fixed left-1/2 top-1/2 z-[80] max-w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 px-3"
          role="status"
          aria-live="polite"
        >
          <p
            class="rounded-xl border bg-[#1e2329] px-4 py-2.5 text-center text-sm leading-snug shadow-lg ring-1 ring-white/10"
            :class="assetToastClass"
          >
            {{ assetToast.message }}
          </p>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.front-asset-toast-fade-enter-active,
.front-asset-toast-fade-leave-active {
  transition: opacity 0.2s ease;
}

.front-asset-toast-fade-enter-from,
.front-asset-toast-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .front-asset-toast-fade-enter-active,
  .front-asset-toast-fade-leave-active {
    transition-duration: 0.01ms;
  }
}
</style>
