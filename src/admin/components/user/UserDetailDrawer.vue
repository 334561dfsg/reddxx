<script setup>
import AdminDrawer from '../antd/AdminDrawer.vue'
import { Table } from 'ant-design-vue'
const TableColumn = Table.Column

import { AdminButton, AdminInput, AdminSelect, AdminTextarea, nativeControl } from '../antd/controls.js'

import { computed, ref, watch } from 'vue'
import { USER_STATUS, USER_ROLE, USER_KYC_STATUS } from '../../constants/user'
import { userDepositAddressRepository, userDepositAddressVersion } from '../../repositories/userDepositAddressRepository.js'
import UserOperations from './UserOperations.vue'
import UserWalletHoldingsDialog from './UserWalletHoldingsDialog.vue'
import { USER_WALLETS, createMockWalletHoldings } from '../../mock/userWalletHoldings.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  initialTab: { type: String, default: 'overview' },
  returnFocus: { type: [Object, Function], default: null }
})

const depositAddresses = computed(() => { userDepositAddressVersion.value; return userDepositAddressRepository.list(props.user?.id) })

const emit = defineEmits(['close', 'closed'])

// Frame: AdminDrawer (Ant Drawer + useDialogLifecycle), drawer migration 2026-11-27.
const drawerFrame = ref(null)
const phase = computed(() => drawerFrame.value?.phase ?? 'closed')

const close = () => drawerFrame.value?.close()
const handleClosed = () => emit('closed')

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

const walletDetail = ref(null)
const walletDetailOpen = ref(false)
const walletReturnFocus = ref(null)
const openWalletDetail = (wallet, event) => {
  if (phase.value !== 'open' || walletDetail.value || !computedAssets.value) return
  const total = computedAssets.value[wallet.key]
  walletDetail.value = {
    ...wallet, total, userId: props.user.id, username: props.user.username,
    holdings: createMockWalletHoldings(wallet.key, total)
  }
  walletReturnFocus.value = event.currentTarget
  walletDetailOpen.value = true
}
const clearWalletDetail = () => {
  walletDetail.value = null
  walletReturnFocus.value = null
}
watch(() => [props.visible, props.user?.id], () => { walletDetailOpen.value = false })

// 用户操作（封户/入金/划转）已抽出到 `UserOperations.vue`，这里不再维护弹窗与表单逻辑

const tabButtonClass = (id) => {
  const active = activeTab.value === id
  return active
    ? 'text-blue-600 border-blue-500 bg-white'
    : 'text-slate-500 border-transparent hover:text-slate-700 bg-transparent'
}
</script>

<template>
  <AdminDrawer :open="visible" title="用户详情" title-id="user-detail-drawer-title" :return-focus="returnFocus" testid="user-detail-drawer" placement="top" height="92vh" plain ref="drawerFrame" @close="emit('close')" @closed="handleClosed">
    <template v-if="user">
          <div class="shrink-0 border-b border-slate-200 bg-white px-4 pb-3 sm:px-6">
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
              <AdminButton
                v-for="t in tabs"
                :key="t.id"
                type="button"
                class="shrink-0 px-3 py-3 text-sm font-medium border-b-2 border-transparent transition-colors whitespace-nowrap"
                :class="tabButtonClass(t.id)"
                @click="activeTab = t.id"
              >
                {{ t.label }}
              </AdminButton>
            </nav>
          </div>

          <!-- Body -->
          <div data-testid="user-detail-drawer-body" class="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-6">
            <template v-if="activeTab === 'overview'">
              <section class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
                <h3 class="text-sm font-semibold text-slate-900">收款地址配置</h3>
                <p class="mt-2 text-sm text-slate-500">{{ depositAddresses.length ? '以下币种和网络使用专属地址，其他组合继承公共地址。' : '使用对应币种和网络的公共地址。' }}</p>
                <ul class="mt-3 space-y-3"><li v-for="entry in depositAddresses" :key="entry.coin + entry.network" class="text-sm"><strong>{{ entry.coin }} / {{ entry.network }}</strong><span class="mt-1 block break-all font-mono text-slate-600">{{ entry.address }}</span></li></ul>
              </section>
              <div class="grid gap-4 lg:grid-cols-3">
                <section class="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2 sm:p-5">
                  <h3 class="text-sm font-semibold text-slate-900">账户信息</h3>
                  <dl class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div class="rounded-lg bg-slate-50 px-3 py-2"><dt class="text-xs text-slate-500">用户名</dt><dd class="mt-1 break-all text-sm font-medium text-slate-900">{{ user?.username || '—' }}</dd></div>
                    <div class="rounded-lg bg-slate-50 px-3 py-2"><dt class="text-xs text-slate-500">邮箱</dt><dd class="mt-1 break-all text-sm font-medium text-slate-900">{{ user?.email || '—' }}</dd></div>
                    <div class="rounded-lg bg-slate-50 px-3 py-2"><dt class="text-xs text-slate-500">角色</dt><dd class="mt-1 text-sm font-medium text-slate-900">{{ roleConfig[user?.role]?.text || user?.role || '—' }}</dd></div>
                    <div class="rounded-lg bg-slate-50 px-3 py-2"><dt class="text-xs text-slate-500">裂变上级</dt><dd class="mt-1 text-sm font-medium text-slate-900">{{ user?.parentUsername || '无裂变上级' }}</dd></div>
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
                      <div class="mt-3 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                        <button
                          v-for="wallet in USER_WALLETS" :key="wallet.key" type="button"
                          class="min-w-0 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
                          aria-haspopup="dialog" :aria-label="`查看${wallet.label}持有币种明细`"
                          @click="openWalletDetail(wallet, $event)"
                        >
                          <span class="block text-xs text-slate-500">{{ wallet.label }}</span>
                          <span class="mt-2 block break-all text-lg font-semibold text-slate-900">{{ computedAssets ? formatMoney(computedAssets[wallet.key], { min: 2, max: 2 }) : '-' }}</span>
                          <span class="mt-2 block text-xs text-blue-600">查看币种明细 →</span>
                        </button>
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
                  <Table :data-source="incomeList" :pagination="false" size="small" :scroll="{ x: 'max-content' }" :row-key="row => row.address + row.createdAt"  ><TableColumn key="column-0"><template #title>公链</template><template #default="{ record: row, index: rowIndex }"><div class="px-4 py-3 text-sm text-slate-700">{{ row.chain }}</div></template></TableColumn><TableColumn key="column-1"><template #title>地址</template><template #default="{ record: row, index: rowIndex }"><div class="px-4 py-3 text-sm">
                          <span class="font-mono text-slate-800">{{ formatAddress(row.address) }}</span>
                        </div></template></TableColumn><TableColumn key="column-2"><template #title>创建时间</template><template #default="{ record: row, index: rowIndex }"><div class="px-4 py-3 text-sm text-slate-700">{{ formatDateTime(row.createdAt) }}</div></template></TableColumn></Table>
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
                  <Table :data-source="incomeList" :pagination="false" size="small" :scroll="{ x: 'max-content' }" :row-key="row => row.address + row.createdAt"  ><TableColumn key="column-0"><template #title>公链</template><template #default="{ record: row, index: rowIndex }"><div class="px-4 py-3 text-sm text-slate-700">{{ row.chain }}</div></template></TableColumn><TableColumn key="column-1"><template #title>地址</template><template #default="{ record: row, index: rowIndex }"><div class="px-4 py-3 text-sm">
                          <span class="font-mono text-slate-800">{{ formatAddress(row.address) }}</span>
                        </div></template></TableColumn><TableColumn key="column-2"><template #title>创建时间</template><template #default="{ record: row, index: rowIndex }"><div class="px-4 py-3 text-sm text-slate-700">{{ formatDateTime(row.createdAt) }}</div></template></TableColumn></Table>
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
          <!-- Footer -->
          <footer class="shrink-0 border-t border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
            <div class="flex justify-end gap-2">
              <AdminButton
                type="button"
                class="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                @click="close"
              >
                关闭
              </AdminButton>
            </div>
          </footer>
    </template>
  </AdminDrawer>
  <UserWalletHoldingsDialog
    :visible="walletDetailOpen" :wallet="walletDetail" :return-focus="walletReturnFocus"
    @close="walletDetailOpen = false" @closed="clearWalletDetail"
  />
</template>

