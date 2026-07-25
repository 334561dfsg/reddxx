<script setup>
import { ref, computed, getCurrentInstance, nextTick, onMounted, reactive, watch } from 'vue'
import { getUsers, usersList } from '../../../admin/mock/user'
import { USER_STATUS, USER_ROLE, USER_KYC_STATUS } from '../../../admin/constants/user'
import UserDetailDrawer from '../../../admin/components/user/UserDetailDrawer.vue'
import UserControlModal from '../../../admin/components/user-control/UserControlModal.vue'
import UserOperations from '../../../admin/components/user/UserOperations.vue'
import UserOperationDrawer from '../../../admin/components/user/UserOperationDrawer.vue'
import MfaVerificationModal from '../../../admin/components/MfaVerificationModal.vue'
import {
  cancelUnifiedUserControl,
  setUnifiedUserControl,
  userControlState
} from '../../../admin/state/userControlState.js'
import {
  getUnifiedControlCancelItems
} from '../../../features/user-control/userControl.js'
import { createDialogCloseAction, useDialogContentSnapshot, useDialogLifecycle } from '../../../admin/composables/useDialogLifecycle.js'
import { useMfaActionFlow } from '../../../admin/composables/useMfaActionFlow.js'
import { resolveUserOperationReturnFocus } from '../../../admin/config/userOperations.js'

const appRouter = getCurrentInstance()?.appContext.config.globalProperties.$router

// 搜索关键词
const searchKeyword = ref('')

// 用户数据
const users = ref([])
const loading = ref(false)

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const totalPages = computed(() => Math.ceil(pagination.total / pagination.pageSize))

// 获取用户数据
const fetchUsers = async () => {
  loading.value = true
  try {
    const { list, total } = await getUsers({
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      searchKeyword: searchKeyword.value
    })
    users.value = list
    pagination.total = total
  } catch (error) {
    console.error('获取用户列表失败:', error)
    // 在这里可以添加错误提示，例如使用一个通知组件
  } finally {
    loading.value = false
  }
}

// 监听搜索和分页变化
watch([searchKeyword, () => pagination.currentPage], () => {
  if (searchKeyword.value && pagination.currentPage !== 1) {
    pagination.currentPage = 1
  } else {
    fetchUsers()
  }
}, { deep: true })

// 组件加载时获取数据
onMounted(fetchUsers)

// 模态弹窗状态
const showDetailDrawer = ref(false)
const selectedUser = ref(null)
const controlUser = ref(null)
const controlModalOpen = ref(false)
const cancelControlOpen = ref(false)
const openActionUserId = ref('')
const operationUser = ref(null)
const userOperations = ref(null)
const operationDrawerOpen = ref(false)
const operationDrawerUser = ref(null)
const deferredDrawerAction = ref(null)
const operationActionReturnFocus = ref(null)
const cancelNote = ref('')
const {
  open: mfaOpen,
  loading: mfaLoading,
  error: mfaError,
  errorAttempt: mfaErrorAttempt,
  pendingAction: pendingMfaAction,
  request: requestMfa,
  openPending: openPendingMfa,
  verify: verifyMfa,
  cancel: cancelMfa
} = useMfaActionFlow({
  execute: async (action) => {
    if (action?.type === 'apply') await applyControl(action.payload)
    if (action?.type === 'cancel') {
      const cancelItems = getUnifiedControlCancelItems(rulesOf(controlUser.value))
      if (cancelItems.length) await cancelUnifiedUserControl(action.payload)
      controlUser.value = null
    }
  },
  onSuccess: () => { cancelNote.value = '' }
})
const unifiedCancelDialogRef = ref(null)
const unifiedCancelReturnRef = ref(null)
const actionMenuTriggerRefs = new Map()
const controlReturnUserId = ref('')

const userIdOf = (user) => String(user?.userId ?? user?.id ?? '')
const setActionMenuTriggerRef = (user, element) => {
  const userId = userIdOf(user)
  if (element) actionMenuTriggerRefs.set(userId, element)
  else actionMenuTriggerRefs.delete(userId)
}
const resolveControlReturnFocus = () => {
  return resolveUserOperationReturnFocus(
    operationActionReturnFocus.value,
    actionMenuTriggerRefs.get(controlReturnUserId.value) || null
  )
}
const rulesOf = (user) => userControlState.value.rules[userIdOf(user)] || {}
const hasRules = (user) => Object.values(rulesOf(user)).some((rule) => ['active', 'processing'].includes(rule.status))
const isLocked = (user) => [USER_STATUS.SUSPENDED, USER_STATUS.BANNED].includes(user?.status)
const cancelControlItems = computed(() => getUnifiedControlCancelItems(controlUser.value ? rulesOf(controlUser.value) : {}))
const {
  rendered: unifiedCancelRendered,
  phase: unifiedCancelPhase,
  layerStyle: unifiedCancelLayerStyle,
  requestDialogClose: requestUnifiedCancelClose,
  onAfterEnter: onUnifiedCancelAfterEnter,
  onAfterLeave: onUnifiedCancelAfterLeave
} = useDialogLifecycle({
  open: cancelControlOpen,
  dialogRef: unifiedCancelDialogRef,
  initialFocusRef: unifiedCancelReturnRef,
  returnFocusRef: resolveControlReturnFocus,
  requestClose: () => { cancelControlOpen.value = false }
})
const unifiedCancelDialogData = computed(() => ({
  user: controlUser.value ? { ...controlUser.value } : null
}))
const { content: displayedUnifiedCancelData, clear: clearUnifiedCancelSnapshot } = useDialogContentSnapshot({
  open: cancelControlOpen,
  phase: unifiedCancelPhase,
  source: unifiedCancelDialogData,
  clone: (data) => ({
    user: data.user ? { ...data.user } : null
  })
})
const operationAssets = computed(() => {
  const user = operationUser.value
  if (!user) return null
  const balance = Number(user.balance || 0)
  const frozen = Number(user.frozenBalance || 0)
  return {
    marketAccount: balance + frozen * 0.15,
    wealthAccount: frozen * 2.5,
    tradingContract: balance * 0.16,
    perpetualContract: balance * 0.52
  }
})

const controlValueLabel = (value) => ({
  profit: '盈利',
  loss: '亏损',
  highYield: '高收益',
  lowYield: '低收益'
})[value] || '未设置'

const controlDurationLabel = (duration) => ({ once: '一次性', permanent: '永久' })[duration] || '—'
const controlRuleStatusLabel = (status) => ({ active: '当前有效', processing: '处理中' })[status] || status

const formatTime = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const nextSequence = () => String(userControlState.value.operationLogs.length + 1).padStart(4, '0')

const openControlSetting = (user) => {
  controlUser.value = user
  controlModalOpen.value = true
}

const closeControlSetting = () => {
  controlModalOpen.value = false
  if (!mfaOpen.value) controlUser.value = null
}

const toggleActionMenu = (user) => {
  const userId = userIdOf(user)
  openActionUserId.value = openActionUserId.value === userId ? '' : userId
}

const selectControlSetting = (user) => {
  controlReturnUserId.value = userIdOf(user)
  openActionUserId.value = ''
  openControlSetting(user)
}

const selectControlCancel = (user) => {
  controlReturnUserId.value = userIdOf(user)
  openActionUserId.value = ''
  openControlCancel(user)
}

const selectUserDetail = (user) => {
  openActionUserId.value = ''
  openUserDetail(user)
}

const openOperationDrawer = (user) => {
  controlReturnUserId.value = userIdOf(user)
  openActionUserId.value = ''
  deferredDrawerAction.value = null
  operationDrawerUser.value = user
  operationDrawerOpen.value = true
}

const closeOperationDrawer = () => {
  operationDrawerOpen.value = false
}

const handleOperationDrawerAction = async ({ id, user }) => {
  operationActionReturnFocus.value = typeof document === 'undefined' ? null : document.activeElement
  controlReturnUserId.value = userIdOf(user)

  if (['detail', 'assets', 'point-control-log'].includes(id)) {
    deferredDrawerAction.value = { id, user }
    closeOperationDrawer()
    return
  }

  if (id === 'point-control') {
    selectControlSetting(user)
    return
  }

  if (id === 'cancel-point-control') {
    selectControlCancel(user)
    return
  }

  const regularActions = {
    'freeze-account': 'freeze',
    adjust: 'adjust',
    deposit: 'deposit',
    transfer: 'transfer'
  }
  if (regularActions[id]) await openRegularAction(user, regularActions[id])
}

const executeDeferredDrawerAction = async () => {
  const action = deferredDrawerAction.value
  deferredDrawerAction.value = null
  operationActionReturnFocus.value = null
  operationDrawerUser.value = null
  if (!action) return

  if (action.id === 'detail' || action.id === 'assets') {
    openUserDetail(action.user)
    return
  }

  if (action.id === 'point-control-log') {
    await appRouter?.push({ name: 'users-control-log', query: { userId: userIdOf(action.user) } })
  }
}

const openRegularAction = async (user, action) => {
  openActionUserId.value = ''
  operationUser.value = user
  await nextTick()
  userOperations.value?.open(action)
}

const applyControl = (payload) => {
  setUnifiedUserControl({
    ...payload,
    now: formatTime(),
    batchId: `demo-global-${nextSequence()}`
  })
  controlModalOpen.value = false
  controlUser.value = null
}

const submitControlSetting = (payload) => {
  const overwritesCurrentRules = controlUser.value && hasRules(controlUser.value)
  controlModalOpen.value = false
  if (payload.duration === 'permanent' || overwritesCurrentRules) {
    requestMfa({ type: 'apply', payload })
    return
  }
  applyControl(payload)
}

const openControlCancel = (user) => {
  if (unifiedCancelPhase.value !== 'closed') return
  controlUser.value = user
  cancelNote.value = ''
  cancelControlOpen.value = true
}

const closeControlCancel = createDialogCloseAction(requestUnifiedCancelClose)

const confirmControlCancel = () => {
  if (unifiedCancelPhase.value !== 'open' || !controlUser.value || !cancelControlItems.value.length || !cancelNote.value.trim()) return
  const payload = {
    userId: userIdOf(controlUser.value),
    note: cancelNote.value.trim(),
    now: formatTime(),
    operationId: `demo-global-cancel-${nextSequence()}`
  }
  pendingMfaAction.value = { type: 'cancel', payload }
  closeControlCancel()
}

const handleUnifiedCancelAfterLeave = () => {
  const shouldOpenMfa = pendingMfaAction.value?.type === 'cancel'
  onUnifiedCancelAfterLeave()
  if (unifiedCancelPhase.value === 'closed') {
    cancelNote.value = ''
    clearUnifiedCancelSnapshot()
    if (shouldOpenMfa) {
      openPendingMfa()
    } else {
      controlUser.value = null
    }
  }
}

const handleMfaVerify = (code) => verifyMfa(code)

const handleMfaCancel = () => {
  if (!cancelMfa()) return
  controlUser.value = null
  cancelNote.value = ''
}

const mfaTitle = computed(() => pendingMfaAction.value?.type === 'cancel' ? '取消统一控制安全验证' : '统一控制安全验证')
const mfaDescription = computed(() => pendingMfaAction.value?.type === 'cancel'
  ? '取消六个模块的生效规则属于敏感操作，请输入 MFA 验证码'
  : '永久或覆盖统一控制属于敏感操作，请输入 MFA 验证码')

// 统计信息
const statistics = computed(() => {
  const total = usersList.length
  const active = usersList.filter(u => u.status === USER_STATUS.ACTIVE).length
  const vip = usersList.filter(u => u.isVip).length
  const agents = usersList.filter(u => u.role === USER_ROLE.AGENT).length
  
  return [
    {
      label: '总用户数',
      value: total.toLocaleString(),
      trend: '+8.2% 较上月',
      good: true
    },
    {
      label: '活跃用户',
      value: active.toLocaleString(),
      trend: `${((active / total) * 100).toFixed(1)}% 占比`,
      good: true
    },
    {
      label: 'VIP用户',
      value: vip.toLocaleString(),
      trend: '+12 本月新增',
      good: true
    },
    {
      label: '代理用户',
      value: agents.toLocaleString(),
      trend: `${((agents / total) * 100).toFixed(1)}% 占比`,
      good: true
    }
  ]
})

// 状态配置
const statusConfig = {
  [USER_STATUS.ACTIVE]: { text: '活跃', class: 'bg-emerald-100 text-emerald-700' },
  [USER_STATUS.INACTIVE]: { text: '不活跃', class: 'bg-gray-100 text-gray-700' },
  [USER_STATUS.SUSPENDED]: { text: '暂停', class: 'bg-amber-100 text-amber-700' },
  [USER_STATUS.BANNED]: { text: '禁用', class: 'bg-rose-100 text-rose-700' }
}

const roleConfig = {
  [USER_ROLE.USER]: { text: '普通用户', class: 'bg-blue-100 text-blue-700' },
  [USER_ROLE.AGENT]: { text: '代理', class: 'bg-purple-100 text-purple-700' }
}

const kycConfig = {
  [USER_KYC_STATUS.NOT_VERIFIED]: { text: '未认证', class: 'bg-gray-100 text-gray-700' },
  [USER_KYC_STATUS.PENDING]: { text: '审核中', class: 'bg-blue-100 text-blue-700' },
  [USER_KYC_STATUS.VERIFIED]: { text: '已认证', class: 'bg-emerald-100 text-emerald-700' },
  [USER_KYC_STATUS.REJECTED]: { text: '已拒绝', class: 'bg-rose-100 text-rose-700' }
}

// 格式化货币
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

// 格式化日期
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 打开用户详情
const openUserDetail = (user) => {
  selectedUser.value = user
  showDetailDrawer.value = true
}

// 关闭弹窗
const closeDetailDrawer = () => {
  showDetailDrawer.value = false
  selectedUser.value = null
}
</script>

<template>
  <section class="space-y-6">
    <!-- 页面标题 -->
    <div>
      <h1 class="text-2xl font-bold text-slate-900">用户管理</h1>
      <p class="text-sm text-slate-500 mt-1">管理系统用户、查看用户信息和统计数据</p>
    </div>

    <!-- 统计卡片 -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article
        v-for="stat in statistics"
        :key="stat.label"
        class="rounded-xl border border-slate-200 bg-white p-4"
      >
        <p class="text-sm text-slate-500">{{ stat.label }}</p>
        <p class="mt-2 text-2xl font-semibold text-slate-900">{{ stat.value }}</p>
        <p class="mt-2 text-sm font-medium" :class="stat.good ? 'text-emerald-600' : 'text-rose-600'">
          {{ stat.trend }}
        </p>
      </article>
    </div>

    <!-- 筛选和搜索区域 -->
    <div class="rounded-xl border border-slate-200 bg-white p-5">
      <!-- 搜索框 -->
      <div class="relative">
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="搜索用户名、邮箱、手机号或ID..."
          class="w-full px-4 py-2 pl-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-12 text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p class="mt-4 text-sm text-slate-500">正在加载用户数据...</p>
    </div>

    <!-- 用户表格 -->
    <div v-else-if="!loading && users.length > 0" class="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[1320px]">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">ID</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">用户名</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">邮箱</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">角色</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">VIP</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">信用分</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">状态</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">账户余额</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">上级</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">是否点控中</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr 
              v-for="user in users" 
              :key="user.id"
              class="hover:bg-slate-50 transition-colors cursor-pointer"
              @click="openUserDetail(user)"
            >
              <!-- ID -->
              <td class="px-4 py-3">
                <span class="text-xs font-mono text-slate-600">{{ user.id }}</span>
              </td>

              <!-- 用户名 -->
              <td class="px-4 py-3">
                <p class="text-sm font-medium text-slate-900">{{ user.username }}</p>
              </td>

              <!-- 邮箱 -->
              <td class="px-4 py-3">
                <p class="text-sm text-slate-600">{{ user.email }}</p>
              </td>

              <!-- 角色 -->
              <td class="px-4 py-3">
                <span 
                  :class="roleConfig[user.role].class"
                  class="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                >
                  {{ roleConfig[user.role].text }}
                </span>
              </td>

              <!-- VIP -->
              <td class="px-4 py-3 text-center">
                <span v-if="user.isVip" class="inline-flex items-center justify-center">
                  <svg class="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                </span>
                <span v-else class="text-xs text-slate-400">-</span>
              </td>

              <!-- 信用分 -->
              <td class="px-4 py-3 text-center">
                <span 
                  class="inline-flex px-2 py-1 text-sm font-semibold rounded-md"
                  :class="{
                    'bg-emerald-100 text-emerald-700': user.creditScore >= 700,
                    'bg-blue-100 text-blue-700': user.creditScore >= 600 && user.creditScore < 700,
                    'bg-amber-100 text-amber-700': user.creditScore >= 500 && user.creditScore < 600,
                    'bg-rose-100 text-rose-700': user.creditScore < 500
                  }"
                >
                  {{ user.creditScore }}
                </span>
              </td>

              <!-- 状态 -->
              <td class="px-4 py-3">
                <span 
                  :class="statusConfig[user.status].class"
                  class="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                >
                  {{ statusConfig[user.status].text }}
                </span>
              </td>

              <!-- 账户余额 -->
              <td class="px-4 py-3 text-right">
                <span class="text-sm font-medium text-slate-900">
                  {{ formatCurrency(user.balance) }}
                </span>
              </td>

              <!-- 上级 -->
              <td class="px-4 py-3">
                <span v-if="user.parentUsername" class="text-sm text-slate-600">
                  {{ user.parentUsername }}
                </span>
                <span v-else class="text-xs text-slate-400">-</span>
              </td>

              <!-- 用户点控状态 -->
              <td class="px-4 py-3">
                <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium" :class="hasRules(user) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'">
                  {{ hasRules(user) ? '是' : '否' }}
                </span>
              </td>

              <!-- 点控操作下拉菜单 -->
              <td class="relative px-4 py-3">
                <div data-testid="user-point-control-action-menu" class="relative inline-block text-left" @click.stop>
                  <button
                    :ref="(element) => setActionMenuTriggerRef(user, element)"
                    type="button"
                    class="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    :aria-expanded="openActionUserId === userIdOf(user)"
                    @click="toggleActionMenu(user)"
                  >
                    操作
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 9-7 7-7-7" /></svg>
                  </button>
                  <div v-if="openActionUserId === userIdOf(user)" class="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    <button type="button" class="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50" @click="selectUserDetail(user)">用户详情</button>
                    <button type="button" class="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50" @click="selectUserDetail(user)">资金概况</button>
                    <button type="button" class="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50" @click="openRegularAction(user, 'deposit')">客服入金</button>
                    <button type="button" class="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50" @click="openRegularAction(user, 'adjust')">调账</button>
                    <button type="button" class="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50" @click="openRegularAction(user, 'freeze')">{{ isLocked(user) ? '解封' : '封户' }}</button>
                    <div class="my-1 border-t border-slate-100" />
                    <button type="button" class="block w-full px-3 py-2 text-left text-sm font-medium text-blue-600 hover:bg-blue-50" @click="openOperationDrawer(user)">全部操作…</button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- 分页 -->
      <div v-if="totalPages > 1" class="p-4 border-t border-slate-200 flex items-center justify-between">
        <p class="text-sm text-slate-600">
          第 <span class="font-medium">{{ pagination.currentPage }}</span> / <span class="font-medium">{{ totalPages }}</span> 页，共 <span class="font-medium">{{ pagination.total }}</span> 条记录
        </p>
        <div class="flex items-center gap-2">
          <button
            @click="pagination.currentPage--"
            :disabled="pagination.currentPage <= 1"
            class="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <button
            @click="pagination.currentPage++"
            :disabled="pagination.currentPage >= totalPages"
            class="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading && users.length === 0" class="rounded-xl border border-slate-200 bg-white p-12 text-center">
      <svg class="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
      </svg>
      <h3 class="mt-4 text-lg font-semibold text-slate-900">未找到用户</h3>
      <p class="mt-2 text-sm text-slate-500">请尝试调整搜索关键词</p>
      <button
        v-if="searchKeyword"
        @click="searchKeyword = ''"
        class="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        清空搜索
      </button>
    </div>

    <!-- 用户详情抽屉 -->
    <UserDetailDrawer
      :visible="showDetailDrawer"
      :user="selectedUser"
      @close="closeDetailDrawer"
    />

    <UserControlModal
      :open="controlModalOpen"
      scope="global"
      :user="controlUser"
      :existing-rules="controlUser ? rulesOf(controlUser) : {}"
      :return-focus="resolveControlReturnFocus"
      @close="closeControlSetting"
      @submit="submitControlSetting"
    />

    <UserOperations
      v-if="operationUser"
      ref="userOperations"
      :user="operationUser"
      :assets="operationAssets"
      :show-triggers="false"
    />

    <UserOperationDrawer
      :visible="operationDrawerOpen"
      :user="operationDrawerUser"
      :return-focus="resolveControlReturnFocus"
      @close="closeOperationDrawer"
      @closed="executeDeferredDrawerAction"
      @action="handleOperationDrawerAction"
    />

    <Teleport to="body">
      <Transition name="dialog-overlay" appear @after-enter="onUnifiedCancelAfterEnter" @after-leave="handleUnifiedCancelAfterLeave">
        <div v-if="unifiedCancelRendered" v-show="unifiedCancelPhase !== 'closing'" class="fixed inset-0 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" :style="unifiedCancelLayerStyle">
          <Transition name="dialog-panel" appear>
            <section v-show="unifiedCancelPhase !== 'closing'" ref="unifiedCancelDialogRef" data-testid="unified-user-control-cancel-dialog" class="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl supports-[height:100dvh]:max-h-[calc(100dvh-2rem)]" role="dialog" aria-modal="true" aria-labelledby="unified-user-control-cancel-title">
              <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div class="min-w-0 flex-1">
                  <h2 id="unified-user-control-cancel-title" class="break-words text-lg font-semibold text-slate-900">取消统一控制</h2>
                  <p class="mt-1 break-words text-sm text-slate-500">{{ displayedUnifiedCancelData.user?.username }} · UID {{ userIdOf(displayedUnifiedCancelData.user) }}</p>
                </div>
                <button type="button" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="关闭" @click="closeControlCancel">×</button>
              </header>
              <div data-testid="unified-user-control-cancel-body" class="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
                <div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                  <p class="font-medium">将取消以下 {{ cancelControlItems.length }} 个当前有效模块</p>
                  <ul v-if="cancelControlItems.length" class="mt-2 space-y-1" aria-label="待取消模块规则">
                    <li v-for="item in cancelControlItems" :key="item.moduleKey" class="flex items-center justify-between gap-3 rounded-md bg-white/70 px-3 py-2">
                      <span class="font-medium">{{ item.moduleLabel }}</span>
                      <span class="text-right text-xs text-amber-800">
                        {{ controlValueLabel(item.value) }} · {{ controlDurationLabel(item.duration) }} · {{ controlRuleStatusLabel(item.status) }}
                      </span>
                    </li>
                  </ul>
                  <p v-else class="mt-2 text-sm text-amber-800">当前没有可取消的模块</p>
                  <p v-if="cancelControlItems.length" class="mt-2 text-xs text-amber-700">已执行、已取消和已覆盖的历史记录会保留。</p>
                </div>
                <label class="block">
                  <span class="text-sm font-medium text-slate-800">取消备注 <span class="text-rose-500">*</span></span>
                  <textarea v-model="cancelNote" :disabled="!cancelControlItems.length" rows="2" maxlength="200" placeholder="请说明取消原因" class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100" />
                  <span class="mt-1 block text-xs" :class="cancelNote.trim() ? 'text-slate-500' : 'text-rose-600'">
                    {{ cancelNote.trim() ? '确认后还需完成 MFA 验证' : '取消备注必填' }}
                  </span>
                </label>
              </div>
              <footer class="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
                <button ref="unifiedCancelReturnRef" type="button" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700" @click="closeControlCancel">返回</button>
                <button type="button" :disabled="unifiedCancelPhase !== 'open' || !cancelControlItems.length || !cancelNote.trim()" class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50" @click="confirmControlCancel">
                  继续 MFA 验证
                </button>
              </footer>
            </section>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <MfaVerificationModal
      v-model:open="mfaOpen"
      :loading="mfaLoading"
      :title="mfaTitle"
      :description="mfaDescription"
      :error="mfaError"
      :error-attempt="mfaErrorAttempt"
      :return-focus="resolveControlReturnFocus"
      @verify="handleMfaVerify"
      @cancel="handleMfaCancel"
    />
  </section>
</template>

<style scoped>
.dialog-overlay-enter-active { transition: opacity 200ms ease-out; }
.dialog-overlay-leave-active { transition: opacity 150ms ease-in; }
.dialog-panel-enter-active { transition: opacity 200ms ease-out, transform 200ms ease-out; }
.dialog-panel-leave-active { transition: opacity 150ms ease-in, transform 150ms ease-in; }
.dialog-overlay-enter-from,
.dialog-overlay-leave-to,
.dialog-panel-enter-from,
.dialog-panel-leave-to { opacity: 0; }
.dialog-panel-enter-from,
.dialog-panel-leave-to { transform: scale(0.96); }

@media (prefers-reduced-motion: reduce) {
  .dialog-overlay-enter-active,
  .dialog-overlay-leave-active,
  .dialog-panel-enter-active,
  .dialog-panel-leave-active { transition-duration: 50ms; }
  .dialog-panel-enter-from,
  .dialog-panel-leave-to { transform: none; }
}
</style>
