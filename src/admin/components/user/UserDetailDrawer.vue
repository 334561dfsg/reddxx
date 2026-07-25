<script setup>
import { computed, ref, watch } from 'vue'
import { USER_STATUS, USER_ROLE, USER_KYC_STATUS } from '../../constants/user'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'
import UserOperations from './UserOperations.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  initialTab: { type: String, default: 'overview' },
  returnFocus: { type: [Object, Function], default: null }
})

const emit = defineEmits(['close', 'closed'])
const drawerRef = ref(null)
const titleRef = ref(null)

const {
  rendered,
  phase,
  layerStyle,
  requestDialogClose,
  onAfterEnter,
  onAfterLeave
} = useDialogLifecycle({
  open: computed(() => props.visible && Boolean(props.user)),
  dialogRef: drawerRef,
  initialFocusRef: titleRef,
  returnFocusRef: computed(() => props.returnFocus),
  requestClose: () => emit('close')
})

const close = createDialogCloseAction(requestDialogClose)
const handleAfterLeave = () => {
  onAfterLeave()
  emit('closed')
}

const statusConfig = {
  [USER_STATUS.ACTIVE]: { text: '正常', class: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  [USER_STATUS.INACTIVE]: { text: '不活跃', class: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200' },
  [USER_STATUS.SUSPENDED]: { text: '暂停', class: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  [USER_STATUS.BANNED]: { text: '禁用', class: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' }
}

const roleConfig = {
  [USER_ROLE.USER]: { text: '普通用户', class: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200' },
  [USER_ROLE.AGENT]: { text: '代理', class: 'bg-purple-100 text-purple-700 ring-1 ring-purple-200' }
}

const kycConfig = {
  [USER_KYC_STATUS.NOT_VERIFIED]: { text: '未认证', class: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200' },
  // 兼容现有 mock 枚举：用 pending 映射“初级认证”
  [USER_KYC_STATUS.PENDING]: { text: '初级认证', class: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  // 兼容现有 mock 枚举：用 verified 映射“高级认证”
  [USER_KYC_STATUS.VERIFIED]: { text: '高级认证', class: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  // UI 只展示三态时，将 rejected 视为“未认证”
  [USER_KYC_STATUS.REJECTED]: { text: '未认证', class: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200' }
}

const vipLevel = computed(() => {
  const n = Number(props.user?.vipLevel ?? 0)
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
})

const vipLabel = computed(() => {
  if (vipLevel.value === 0) return '普通用户'
  return `VIP${vipLevel.value}`
})

const uidNumber = computed(() => {
  const raw = props.user?.id || ''
  const n = String(raw).match(/\d+/)?.[0] || ''
  return n
})

const formatMoney = (value, opts = {}) => {
  const num = Number(value || 0)
  const {
    min = 0,
    max = 2
  } = opts

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: min,
    maximumFractionDigits: max
  }).format(num)
}

const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return '-'

  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const formatAddress = (addr) => {
  if (!addr) return '-'
  if (addr.length <= 14) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

const hashToSeed = (input) => {
  const s = String(input || '')
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Deterministic RNG (so UI doesn't "jump" on re-render)
const mulberry32 = (seed) => {
  return () => {
    let t = (seed += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const genAddressFromSeed = (seed, index) => {
  const rand = mulberry32(seed + index * 1013904223)
  const bytes = Array.from({ length: 20 }, () => Math.floor(rand() * 256))
  return `0x${bytes.map((b) => b.toString(16).padStart(2, '0')).join('')}`
}

const moneyWithTail = (base, seed, index) => {
  const rand = mulberry32(seed + index * 2654435761)
  const frac = Math.floor(rand() * 10000) / 100 // 0.00 - 99.99
  return Number(base || 0) + frac
}

const incomeList = computed(() => {
  const user = props.user
  if (!user) return []

  const seed = hashToSeed(user.id)
  const rand = mulberry32(seed)

  const chainOptions = ['Ethereum', 'Ethereum', 'Ethereum']

  const baseTs = Date.now()
  const totalBase = Number(user.balance || 0) + Number(user.frozenBalance || 0)

  return Array.from({ length: 3 }).map((_, i) => {
    const chain = chainOptions[i] || 'Ethereum'
    const address = genAddressFromSeed(seed, i)

    const daysAgo = Math.floor(rand() * 25) + i * 2
    const createdAtDate = new Date(baseTs - daysAgo * 24 * 60 * 60 * 1000)
    // Make timestamps look consistent like the screenshot (11:11:11)
    createdAtDate.setHours(11, 11, 11, 0)
    const createdAt = createdAtDate.toISOString()

    // Make amounts roughly align with user assets
    const amountUsd = totalBase * (0.03 + rand() * 0.04)

    return {
      chain,
      address,
      createdAt,
      amountUsd
    }
  })
})

const tabs = [
  { id: 'overview', label: '概览' },
  { id: 'assets', label: '资产' },
  { id: 'favorites', label: '自选' },
  { id: 'withdrawAddress', label: '出金地址' },
  { id: 'opsLog', label: '操作日志' },
  { id: 'income', label: '入金记录' },
  { id: 'withdrawRecords', label: '出金记录' },
  { id: 'swap', label: '兑换' },
  { id: 'stake', label: '质押' },
  { id: 'contracts', label: '交易合约' },
  { id: 'perp', label: '永续合约' },
  { id: 'spot', label: '现货' }
]

const normalizeInitialTab = (value) => tabs.some((tab) => tab.id === value) ? value : 'overview'
const activeTab = ref('overview')

watch(
  () => [props.visible, props.user?.id, props.initialTab],
  () => {
    if (props.visible) activeTab.value = normalizeInitialTab(props.initialTab)
  }
)

const computedAssets = computed(() => {
  const user = props.user
  if (!user) return null
  const seed = hashToSeed(user.id)
  const b = Number(user.balance || 0)
  const f = Number(user.frozenBalance || 0)
  const profit = Number(user.totalProfit || 0)
  const tradingVolume = Number(user.tradingVolume || 0)

  // Derived parts to match the screenshot 2x2 card layout
  const marketAccount = moneyWithTail(b, seed, 1) + moneyWithTail(f, seed, 2) * 0.15
  const tradingContract = moneyWithTail(b * 0.16, seed, 3)
  const wealthAccount = moneyWithTail(f * 2.5, seed, 4)
  const perpetualContract = moneyWithTail(b * 0.52, seed, 5)

  return {
    marketAccount,
    tradingContract,
    wealthAccount,
    perpetualContract,
    tradingVolume,
    frozenBalance: f,
    totalProfit: moneyWithTail(profit, seed, 6)
  }
})

const usableBalance = computed(() => Number(props.user?.balance || 0))
const totalBalance = computed(() => usableBalance.value + Number(props.user?.frozenBalance || 0))

// 用户操作（封户/入金/划转）已抽出到 `UserOperations.vue`，这里不再维护弹窗与表单逻辑

const tabButtonClass = (id) => {
  const active = activeTab.value === id
  return active
    ? 'text-blue-600 border-blue-500 bg-white'
    : 'text-slate-500 border-transparent hover:text-slate-700 bg-transparent'
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer-detail-overlay" appear @after-enter="onAfterEnter" @after-leave="handleAfterLeave">
      <div
        v-if="rendered"
        v-show="phase !== 'closing'"
        class="fixed inset-0 flex items-start bg-black/40"
        role="presentation"
        :style="layerStyle"
      >
        <Transition name="drawer-detail-panel" appear>
          <section
            v-show="phase !== 'closing'"
            ref="drawerRef"
            data-testid="user-detail-drawer"
            class="flex h-[92vh] max-h-[92vh] w-full flex-col overflow-hidden rounded-b-2xl border-b border-slate-200 bg-slate-50 shadow-2xl supports-[height:100dvh]:h-[92dvh] supports-[height:100dvh]:max-h-[92dvh]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-detail-drawer-title"
          >
          <!-- Header -->
          <header class="relative shrink-0 border-b border-slate-200 bg-white px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
            <h2 id="user-detail-drawer-title" ref="titleRef" tabindex="-1" class="mb-3 text-lg font-semibold text-slate-900 outline-none">
              用户详情
            </h2>
            <button
              type="button"
              class="absolute right-4 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:right-6"
              @click="close"
              aria-label="关闭"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
              <div class="flex w-full flex-col gap-4 pr-0 lg:flex-row lg:items-start lg:justify-between lg:gap-6 lg:pr-16">
              <div class="flex min-w-0 items-start gap-4 pr-4">
                <div class="shrink-0 h-16 w-16 rounded-full overflow-hidden bg-slate-200">
                  <div
                    class="h-full w-full flex items-center justify-center text-white font-semibold bg-gradient-to-br from-slate-900 to-indigo-700"
                  >
                    {{ String(user.username || 'U').slice(0, 1).toUpperCase() }}
                  </div>
                </div>

                <div class="pt-1 space-y-1">
                  <div class="flex items-center gap-3">
                    <span class="w-[56px] text-xs text-slate-500 font-medium">UID:</span>
                    <span class="text-sm font-semibold text-slate-900 font-mono">{{ uidNumber }}</span>
                    <span
                      :class="statusConfig[user.status]?.class || 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'"
                      class="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md"
                    >
                      {{ statusConfig[user.status]?.text || user.status }}
                    </span>
                  </div>

                  <div class="flex items-center gap-3">
                    <span class="w-[56px] text-xs text-slate-500 font-medium">账号:</span>
                    <span class="text-sm font-semibold text-slate-900">{{ user.username }}</span>
                  </div>

                  <div class="flex items-center gap-3">
                    <span class="w-[56px] text-xs text-slate-500 font-medium">邮箱:</span>
                    <span class="text-sm font-semibold text-slate-900">{{ user.email }}</span>
                  </div>
                </div>
              </div>

              <div class="min-w-0 space-y-1 pt-1 lg:flex-shrink-0">
                <div class="flex items-center gap-3">
                  <span class="w-[140px] text-xs text-slate-500 font-medium">最后登录时间:</span>
                  <span class="text-sm font-semibold text-slate-900">{{ formatDateTime(user.lastLoginTime) }}</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="w-[140px] text-xs text-slate-500 font-medium">最后登录IP:</span>
                  <span class="text-sm font-semibold text-slate-900 font-mono">{{ user.lastLoginIp || '-' }}</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="w-[140px] text-xs text-slate-500 font-medium">最后登录地址:</span>
                  <span class="text-sm font-semibold text-slate-900">Beijing, China</span>
                </div>
              </div>

              <!-- 操作按钮列：放到用户信息右侧 -->
              <UserOperations :user="user" :assets="computedAssets" />
            </div>

            <!-- Tabs -->
            <nav class="mt-3 flex items-center gap-0 overflow-x-auto bg-slate-50 border-b border-slate-200">
              <button
                v-for="t in tabs"
                :key="t.id"
                type="button"
                class="shrink-0 px-3 py-3 text-sm font-medium border-b-2 border-transparent transition-colors whitespace-nowrap"
                :class="tabButtonClass(t.id)"
                @click="activeTab = t.id"
              >
                {{ t.label }}
              </button>
            </nav>
          </header>

          <!-- Body -->
          <div data-testid="user-detail-drawer-body" class="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-6">
            <template v-if="activeTab === 'overview'">
              <div class="grid gap-4 lg:grid-cols-3">
                <section class="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2 sm:p-5">
                  <h3 class="text-sm font-semibold text-slate-900">账户信息</h3>
                  <dl class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div class="rounded-lg bg-slate-50 px-3 py-2"><dt class="text-xs text-slate-500">用户名</dt><dd class="mt-1 break-all text-sm font-medium text-slate-900">{{ user?.username || '—' }}</dd></div>
                    <div class="rounded-lg bg-slate-50 px-3 py-2"><dt class="text-xs text-slate-500">邮箱</dt><dd class="mt-1 break-all text-sm font-medium text-slate-900">{{ user?.email || '—' }}</dd></div>
                    <div class="rounded-lg bg-slate-50 px-3 py-2"><dt class="text-xs text-slate-500">角色</dt><dd class="mt-1 text-sm font-medium text-slate-900">{{ roleConfig[user?.role]?.text || user?.role || '—' }}</dd></div>
                    <div class="rounded-lg bg-slate-50 px-3 py-2"><dt class="text-xs text-slate-500">上级</dt><dd class="mt-1 text-sm font-medium text-slate-900">{{ user?.parentUsername || '无' }}</dd></div>
                    <div class="rounded-lg bg-slate-50 px-3 py-2"><dt class="text-xs text-slate-500">注册时间</dt><dd class="mt-1 text-sm font-medium text-slate-900">{{ formatDateTime(user?.createdAt) }}</dd></div>
                    <div class="rounded-lg bg-slate-50 px-3 py-2"><dt class="text-xs text-slate-500">最后登录</dt><dd class="mt-1 text-sm font-medium text-slate-900">{{ formatDateTime(user?.lastLoginTime) }}</dd></div>
                  </dl>
                </section>
                <section class="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                  <h3 class="text-sm font-semibold text-slate-900">账户状态</h3>
                  <dl class="mt-4 space-y-3">
                    <div class="flex items-center justify-between gap-3"><dt class="text-sm text-slate-500">状态</dt><dd class="text-sm font-medium text-slate-900">{{ statusConfig[user?.status]?.text || user?.status || '—' }}</dd></div>
                    <div class="flex items-center justify-between gap-3"><dt class="text-sm text-slate-500">KYC</dt><dd class="text-sm font-medium text-slate-900">{{ kycConfig[user?.kycStatus]?.text || user?.kycStatus || '—' }}</dd></div>
                    <div class="flex items-center justify-between gap-3"><dt class="text-sm text-slate-500">会员等级</dt><dd class="text-sm font-medium text-slate-900">{{ vipLabel }}</dd></div>
                    <div class="flex items-center justify-between gap-3"><dt class="text-sm text-slate-500">信用分</dt><dd class="text-sm font-medium text-slate-900">{{ user?.creditScore ?? '—' }}</dd></div>
                    <div class="flex items-center justify-between gap-3"><dt class="text-sm text-slate-500">代理身份</dt><dd class="text-sm font-medium text-slate-900">{{ user?.isAgent ? '是' : '否' }}</dd></div>
                  </dl>
                </section>
              </div>
            </template>
            <!-- Account assets -->
            <template v-else-if="activeTab === 'assets'">
              <div class="grid gap-4 lg:grid-cols-3">
                <!-- 大框：盈利 + 账户余额 -->
                <section class="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="p-4">
                      <div class="text-sm font-semibold text-slate-900">账户资产</div>
                      <div class="mt-3 text-[11px] text-slate-500">总资产</div>
                      <div class="mt-2 text-4xl font-extrabold text-slate-900 leading-none">
                        {{ computedAssets ? formatMoney(computedAssets.totalProfit, { min: 2, max: 2 }) : '-' }}
                      </div>

                      <div class="mt-4 grid grid-cols-2 gap-3">
                        <div class="rounded-lg bg-white px-3 py-2 border border-slate-100">
                          <div class="text-[11px] text-slate-500">交易量</div>
                          <div class="mt-1 text-sm font-semibold text-slate-900">
                            {{ computedAssets ? formatMoney(computedAssets.tradingVolume, { min: 2, max: 2 }) : '-' }}
                          </div>
                        </div>

                        <div class="rounded-lg bg-white px-3 py-2 border border-slate-100">
                          <div class="text-[11px] text-slate-500">总盈利</div>
                          <div class="mt-1 text-sm font-semibold text-slate-900">
                            {{ formatMoney(totalBalance, { min: 2, max: 2 }) }}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <!-- <div class="text-sm font-semibold text-slate-900">账户资产</div> -->
                      <div class="mt-3 grid grid-cols-2 gap-4 text-sm">
                        <div class="rounded-lg bg-white border border-slate-100 px-4 py-3">
                          <div class="text-xs text-slate-500">市值账户</div>
                          <div class="mt-2 font-semibold text-slate-900 text-lg">
                            {{ computedAssets ? formatMoney(computedAssets.marketAccount, { min: 2, max: 2 }) : '-' }}
                          </div>
                        </div>
                        <div class="rounded-lg bg-white border border-slate-100 px-4 py-3">
                          <div class="text-xs text-slate-500">理财账户</div>
                          <div class="mt-2 font-semibold text-slate-900 text-lg">
                            {{ computedAssets ? formatMoney(computedAssets.wealthAccount, { min: 2, max: 2 }) : '-' }}
                          </div>
                        </div>
                        <div class="rounded-lg bg-white border border-slate-100 px-4 py-3">
                          <div class="text-xs text-slate-500">交易合约</div>
                          <div class="mt-2 font-semibold text-slate-900 text-lg">
                            {{ computedAssets ? formatMoney(computedAssets.tradingContract, { min: 2, max: 2 }) : '-' }}
                          </div>
                        </div>
                        <div class="rounded-lg bg-white border border-slate-100 px-4 py-3">
                          <div class="text-xs text-slate-500">永续合约</div>
                          <div class="mt-2 font-semibold text-slate-900 text-lg">
                            {{ computedAssets ? formatMoney(computedAssets.perpetualContract, { min: 2, max: 2 }) : '-' }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <!-- 新框：KYC 状态 + 信用分 -->
                <section class="rounded-xl border border-slate-200 bg-white p-5">
                  <div class="text-sm font-semibold text-slate-900">KYC 状态与信用分</div>
                  <div class="mt-4 grid grid-cols-2 gap-2">
                    <div class="rounded-lg bg-white px-3 py-2 border border-slate-100">
                      <div class="text-xs text-slate-500">KYC状态</div>
                      <div class="mt-1">
                        <span
                          :class="kycConfig[user.kycStatus]?.class || 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'"
                          class="inline-flex px-2.5 py-1 text-[11px] font-medium rounded-md"
                        >
                          {{ kycConfig[user.kycStatus]?.text || user.kycStatus }}
                        </span>
                      </div>
                    </div>
                    <div class="rounded-lg bg-white px-3 py-2 border border-slate-100">
                      <div class="text-xs text-slate-500">VIP 等级</div>
                      <div class="mt-1 text-sm font-semibold text-slate-900">
                        {{ vipLabel }}
                      </div>
                    </div>
                    <div class="rounded-lg bg-white px-3 py-2 border border-slate-100 col-span-2">
                      <div class="text-xs text-slate-500">信用分</div>
                      <div class="mt-1 text-lg font-semibold text-slate-900">
                        {{ user.creditScore }} / 800
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <section class="mt-6 rounded-xl border border-slate-200 bg-white p-5">
                <div class="flex items-center justify-between gap-4">
                  <div class="text-sm font-semibold text-slate-900">入金区块链地址</div>
                  <!-- <div class="text-xs text-slate-500">最近三条（模拟数据）</div> -->
                </div>

                <div class="mt-4 overflow-x-auto">
                  <table class="min-w-[520px] w-full">
                    <thead class="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">公链</th>
                        <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">地址</th>
                        <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">创建时间</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200">
                      <tr v-for="row in incomeList" :key="row.address + row.createdAt" class="hover:bg-slate-50 transition-colors">
                        <td class="px-4 py-3 text-sm text-slate-700">{{ row.chain }}</td>
                        <td class="px-4 py-3 text-sm">
                          <span class="font-mono text-slate-800">{{ formatAddress(row.address) }}</span>
                        </td>
                        <td class="px-4 py-3 text-sm text-slate-700">{{ formatDateTime(row.createdAt) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </template>

            <!-- Income -->
            <template v-else-if="activeTab === 'income'">
              <section class="rounded-xl border border-slate-200 bg-white p-5">
                <div class="flex items-center justify-between gap-4">
                  <div>
                    <div class="text-sm font-semibold text-slate-900">入金</div>
                    <div class="mt-1 text-xs text-slate-500">展示用户最近的入金记录（模拟数据）</div>
                  </div>
                  <div class="text-xs text-slate-500">共 {{ incomeList.length }} 条</div>
                </div>

                <div class="mt-4 overflow-x-auto">
                  <table class="min-w-[520px] w-full">
                    <thead class="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">公链</th>
                        <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">地址</th>
                        <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">创建时间</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200">
                      <tr v-for="row in incomeList" :key="row.address + row.createdAt" class="hover:bg-slate-50 transition-colors">
                        <td class="px-4 py-3 text-sm text-slate-700">{{ row.chain }}</td>
                        <td class="px-4 py-3 text-sm">
                          <span class="font-mono text-slate-800">{{ formatAddress(row.address) }}</span>
                        </td>
                        <td class="px-4 py-3 text-sm text-slate-700">{{ formatDateTime(row.createdAt) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </template>

            <!-- Contracts / placeholders -->
            <template v-else-if="activeTab === 'contracts'">
              <section class="rounded-xl border border-slate-200 bg-white p-5">
                <div class="text-sm font-semibold text-slate-900">交易合约</div>
                <div class="mt-1 text-xs text-slate-500">预留结构（可后续接入真实接口）</div>
                <div class="mt-4 rounded-lg bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  暂无数据
                </div>
              </section>
            </template>

            <!-- Perp -->
            <template v-else-if="activeTab === 'perp'">
              <section class="rounded-xl border border-slate-200 bg-white p-5">
                <div class="text-sm font-semibold text-slate-900">永续合约</div>
                <div class="mt-1 text-xs text-slate-500">预留结构（可后续接入真实接口）</div>
                <div class="mt-4 rounded-lg bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  暂无数据
                </div>
              </section>
            </template>

            <!-- Other tabs placeholders -->
            <template v-else>
              <section class="rounded-xl border border-slate-200 bg-white p-5">
                <div class="text-sm font-semibold text-slate-900">
                  {{
                    tabs.find((t) => t.id === activeTab)?.label || '详情'
                  }}
                </div>
                <div class="mt-1 text-xs text-slate-500">预留结构（可后续接入真实接口）</div>
                <div class="mt-4 rounded-lg bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  暂无数据
                </div>
              </section>
            </template>
          </div>

          <!-- 操作弹窗与 Toast -->
          <!-- <Teleport to="body">
            <Transition
              enter-active-class="transition ease-out duration-200"
              enter-from-class="opacity-0"
              enter-to-class="opacity-100"
              leave-active-class="transition ease-in duration-150"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <div
                v-if="showActionModal"
                class="fixed inset-0 z-[60] bg-black/40 grid place-items-center p-4"
              >
                <section class="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                  <header class="px-5 py-3 border-b border-slate-100 bg-white">
                    <div class="flex items-start justify-between gap-4">
                      <div>
                        <div class="text-xs font-medium tracking-wide text-slate-500">操作</div>
                        <div class="mt-1 text-base font-semibold text-slate-900">
                          {{
                            actionType === 'freeze'
                              ? '确认操作'
                              : actionType === 'deposit'
                                ? '入金'
                                : actionType === 'transfer'
                                  ? '划转'
                                  : '操作'
                          }}
                        </div>
                      </div>
                      <button
                        type="button"
                        class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                        @click="closeActionModal"
                        aria-label="关闭弹窗"
                      >
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </header>

                  <form class="px-5 py-4" @submit.prevent="submitAction">
                    <div v-if="actionType === 'freeze'" class="space-y-3">
                      <div class="text-sm text-slate-700 leading-6">
                        您确定要将账户
                        <span class="font-semibold text-slate-900">{{ user.username }}</span>
                        的状态更改为
                        <span class="font-semibold text-slate-900">{{ freezeDialog.targetText }}</span>
                        吗？
                      </div>
                    </div>

                    <div v-else-if="actionType === 'deposit'" class="space-y-3">
                      <section class="rounded-xl bg-slate-100 p-5">
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="text-base font-semibold text-slate-900">
                              {{ user.username }} 账户资产
                            </div>
                            <div class="mt-4 grid grid-cols-2 gap-y-3">
                              <div class="flex items-center gap-2">
                                <div class="text-sm text-slate-600 whitespace-nowrap">市币账户：</div>
                                <div class="text-sm font-semibold text-slate-900">
                                  {{ computedAssets ? formatMoney(computedAssets.marketAccount, { min: 2, max: 2 }) : '-' }}
                                </div>
                              </div>
                              <div class="flex items-center gap-2">
                                <div class="text-sm text-slate-600 whitespace-nowrap">理财账户：</div>
                                <div class="text-sm font-semibold text-slate-900">
                                  {{ computedAssets ? formatMoney(computedAssets.wealthAccount, { min: 2, max: 2 }) : '-' }}
                                </div>
                              </div>
                              <div class="flex items-center gap-2">
                                <div class="text-sm text-slate-600 whitespace-nowrap">交易合约：</div>
                                <div class="text-sm font-semibold text-slate-900">
                                  {{ computedAssets ? formatMoney(computedAssets.tradingContract, { min: 2, max: 2 }) : '-' }}
                                </div>
                              </div>
                              <div class="flex items-center gap-2">
                                <div class="text-sm text-slate-600 whitespace-nowrap">永续合约：</div>
                                <div class="text-sm font-semibold text-slate-900">
                                  {{ computedAssets ? formatMoney(computedAssets.perpetualContract, { min: 2, max: 2 }) : '-' }}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </section>

                      <div>
                        <div class="text-sm font-medium text-slate-700 mb-2">选择入金账户：</div>
                        <select
                          v-model="actionForm.depositAccountKey"
                          class="w-full rounded-xl border-2 border-blue-600 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                        >
                          <option v-for="opt in depositAccountOptions" :key="opt.key" :value="opt.key">
                            {{ opt.label }}
                          </option>
                        </select>
                      </div>

                      <div>
                        <div class="text-sm font-medium text-slate-700 mb-2">操作入金数量：</div>
                        <input
                          v-model="actionForm.depositAmount"
                          type="number"
                          step="0.01"
                          class="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:bg-white border border-slate-100"
                          placeholder="请输入入金数量"
                        />
                      </div>

                      <div>
                        <div class="text-sm font-medium text-slate-700 mb-2">备注：</div>
                        <textarea
                          v-model="actionForm.remark"
                          rows="4"
                          class="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:bg-white border border-slate-100"
                          placeholder="请输入备注信息（可选）"
                        />
                      </div>
                    </div>

                    <div v-else-if="actionType === 'transfer'" class="space-y-4">
                      <div>
                        <div class="text-sm font-medium text-slate-700 mb-2">从</div>
                        <select
                          v-model="actionForm.transferFromAccountKey"
                          class="w-full rounded-xl border-2 border-blue-600 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                        >
                          <option v-for="opt in transferAccountOptions" :key="opt.key" :value="opt.key">
                            {{ opt.label }}
                          </option>
                        </select>
                      </div>

                      <div>
                        <div class="text-sm font-medium text-slate-700 mb-2">到</div>
                        <select
                          v-model="actionForm.transferToAccountKey"
                          class="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none"
                        >
                          <option v-for="opt in transferAccountOptions" :key="opt.key" :value="opt.key">
                            {{ opt.label }}
                          </option>
                        </select>
                      </div>

                      <div>
                        <div class="text-sm font-medium text-slate-700 mb-2">币种</div>
                        <select
                          v-model="actionForm.transferCoinKey"
                          class="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none"
                        >
                          <option disabled value="">请选择</option>
                          <option v-for="c in coinOptions" :key="c.key" :value="c.key">
                            {{ c.label }}
                          </option>
                        </select>
                      </div>

                      <div>
                        <div class="flex items-center justify-between mb-2">
                          <div class="text-sm font-medium text-slate-700">划转数量</div>
                        </div>

                        <div class="relative">
                          <input
                            v-model="actionForm.transferAmount"
                            type="number"
                            step="0.01"
                            class="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none border border-slate-100 pr-28"
                            placeholder="请输入划转的数量"
                          />
                          <button
                            type="button"
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-blue-600 hover:text-blue-700"
                            @click="setTransferAll"
                          >
                            全部
                          </button>
                        </div>

                        <div class="mt-2 text-sm text-slate-600">
                          余额: {{ transferFromBalance !== null ? formatMoney(transferFromBalance, { min: 2, max: 2 }) : '-' }}
                        </div>
                      </div>
                    </div>

                    <div class="mt-5" :class="actionType === 'transfer' ? '' : 'flex justify-end gap-3'">
                      <button
                        v-if="actionType !== 'transfer'"
                        type="button"
                        class="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        @click="closeActionModal"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        class="px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-colors"
                        :class="actionType === 'transfer'
                          ? 'w-full px-6 py-4 rounded-xl text-base'
                          : actionConfirmButtonClass"
                      >
                        {{ actionConfirmText }}
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            </Transition>

            <div
              v-if="toast.visible"
              class="fixed top-4 right-4 z-[70] bg-white border border-blue-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3"
            >
              <div class="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span class="text-sm font-medium text-slate-900">{{ toast.message }}</span>
            </div>
          </Teleport> -->

          <!-- Footer -->
          <footer class="shrink-0 border-t border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
            <div class="flex justify-end gap-2">
              <button
                type="button"
                class="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                @click="close"
              >
                关闭
              </button>
            </div>
          </footer>
          </section>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-detail-overlay-enter-active { transition: opacity 200ms ease-out; }
.drawer-detail-overlay-leave-active { transition: opacity 150ms ease-in; }
.drawer-detail-panel-enter-active { transition: opacity 200ms ease-out, transform 200ms ease-out; }
.drawer-detail-panel-leave-active { transition: opacity 150ms ease-in, transform 150ms ease-in; }
.drawer-detail-overlay-enter-from,
.drawer-detail-overlay-leave-to,
.drawer-detail-panel-enter-from,
.drawer-detail-panel-leave-to { opacity: 0; }
.drawer-detail-panel-enter-from,
.drawer-detail-panel-leave-to { transform: translateY(-100%); }

@media (prefers-reduced-motion: reduce) {
  .drawer-detail-overlay-enter-active,
  .drawer-detail-overlay-leave-active,
  .drawer-detail-panel-enter-active,
  .drawer-detail-panel-leave-active { transition-duration: 50ms; }
  .drawer-detail-panel-enter-from,
  .drawer-detail-panel-leave-to { transform: none; }
}
</style>
