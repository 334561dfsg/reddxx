<script setup>
import { ref, computed, nextTick, onMounted, reactive, watch } from 'vue'
import { getUsers, usersList } from '../../../admin/mock/user'
import { USER_STATUS, USER_ROLE, USER_KYC_STATUS } from '../../../admin/constants/user'
import UserDetailDrawer from '../../../admin/components/user/UserDetailDrawer.vue'
import UserControlModal from '../../../admin/components/user-control/UserControlModal.vue'
import UserOperations from '../../../admin/components/user/UserOperations.vue'
import UserOperationDrawer from '../../../admin/components/user/UserOperationDrawer.vue'
import UserControlLogDrawer from '../../../admin/components/user-control/UserControlLogDrawer.vue'
import UserOnchainWalletDrawer from '../../../admin/components/user/UserOnchainWalletDrawer.vue'
import UserRelationshipDrawer from '../../../admin/components/user/UserRelationshipDrawer.vue'
import UserProfileEditDialog from '../../../admin/components/user/UserProfileEditDialog.vue'
import UserParentResetDialog from '../../../admin/components/user/UserParentResetDialog.vue'
import UserAgentParentDialog from '../../../admin/components/user/UserAgentParentDialog.vue'
import UserAgentRoleDialog from '../../../admin/components/user/UserAgentRoleDialog.vue'
import AgentUpgradeDialog from '../../../admin/components/agent/AgentUpgradeDialog.vue'
import UserTeamReportDrawer from '../../../admin/components/user/UserTeamReportDrawer.vue'
import UserAgentSubordinateDrawer from '../../../admin/components/user/UserAgentSubordinateDrawer.vue'
import UserAgentReportDrawer from '../../../admin/components/user/UserAgentReportDrawer.vue'
import UserFundsMutationDialog from '../../../admin/components/user/UserFundsMutationDialog.vue'
import UserWithdrawFlowLimitDialog from '../../../admin/components/user/UserWithdrawFlowLimitDialog.vue'
import UserCreditReviewDrawer from '../../../admin/components/user/UserCreditReviewDrawer.vue'
import UserCreditReviewDecisionDialog from '../../../admin/components/user/UserCreditReviewDecisionDialog.vue'
import UserMembershipMutationDialog from '../../../admin/components/user/UserMembershipMutationDialog.vue'
import UserRechargeSummaryDrawer from '../../../admin/components/user/UserRechargeSummaryDrawer.vue'
import UserListSearchField from '../../../admin/components/user/UserListSearchField.vue'
import MfaVerificationModal from '../../../admin/components/MfaVerificationModal.vue'
import {
  cancelUnifiedUserControl,
  setUnifiedUserControl,
  userControlState
} from '../../../admin/state/userControlState.js'
import {
  getUserControlListMeta,
  getUnifiedControlCancelItems
} from '../../../features/user-control/userControl.js'
import { createDialogCloseAction, useDialogContentSnapshot, useDialogLifecycle } from '../../../admin/composables/useDialogLifecycle.js'
import { useMfaActionFlow } from '../../../admin/composables/useMfaActionFlow.js'
import { resolveUserOperationReturnFocus } from '../../../admin/config/userOperations.js'
import {
  deductAvailableFunds,
  freezeAllAvailable,
  getFundsSnapshot,
  getWithdrawFlowLimit,
  removeWithdrawFlowLimit,
  setWithdrawFlowLimit,
  unfreezeAdminFunds
} from '../../../admin/repositories/userFundsRepository.js'
import { getUserOnchainWallet } from '../../../admin/repositories/userOnchainWalletRepository.js'
import { getUserAgentSubordinates } from '../../../admin/repositories/userAgentSubordinateRepository.js'
import { getUserAgentReport } from '../../../admin/repositories/userAgentReportRepository.js'
import {
  adjustUserCredit,
  decideUserCreditReview,
  getCreditMembershipSnapshot,
  getUserCreditReviews,
  getUserRechargeSummary,
  grantUserRebate,
  setUserVipLevel
} from '../../../admin/repositories/userCreditMembershipRepository.js'

// 搜索关键词
const userIdKeyword = ref('')
const phoneKeyword = ref('')
const emailKeyword = ref('')
const walletAddressKeyword = ref('')
const hasSearchFilters = computed(() =>
  [userIdKeyword, phoneKeyword, emailKeyword, walletAddressKeyword].some((item) => item.value.trim())
)

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
      userIdKeyword: userIdKeyword.value,
      phoneKeyword: phoneKeyword.value,
      emailKeyword: emailKeyword.value,
      walletAddressKeyword: walletAddressKeyword.value
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
watch([userIdKeyword, phoneKeyword, emailKeyword, walletAddressKeyword, () => pagination.currentPage], () => {
  if (hasSearchFilters.value && pagination.currentPage !== 1) {
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
const detailInitialTab = ref('overview')
const detailReturnFocus = ref(null)
const controlUser = ref(null)
const controlModalOpen = ref(false)
const cancelControlOpen = ref(false)
const operationUser = ref(null)
const userOperations = ref(null)
const operationDrawerOpen = ref(false)
const operationDrawerUser = ref(null)
const deferredDrawerAction = ref(null)
const operationActionReturnFocus = ref(null)
const controlLogOpen = ref(false)
const controlLogUser = ref(null)
const controlLogReturnFocus = ref(null)
const onchainWalletOpen = ref(false)
const onchainWalletUser = ref(null)
const onchainWalletData = ref(null)
const onchainWalletReturnFocus = ref(null)
const relationshipDrawerOpen = ref(false)
const relationshipDrawerUser = ref(null)
const relationshipDrawerMode = ref('direct')
const relationshipReturnFocus = ref(null)
const profileEditOpen = ref(false)
const profileEditUser = ref(null)
const profileEditReturnFocus = ref(null)
const parentResetOpen = ref(false)
const parentResetUser = ref(null)
const parentResetReturnFocus = ref(null)
const agentParentOpen = ref(false)
const agentParentUser = ref(null)
const agentParentReturnFocus = ref(null)
const agentRoleOpen = ref(false)
const agentRoleUser = ref(null)
const agentRoleReturnFocus = ref(null)
const agentUpgradeOpen = ref(false)
const agentUpgradeUser = ref(null)
const agentUpgradeReturnFocus = ref(null)
const teamReportOpen = ref(false)
const teamReportUser = ref(null)
const teamReportReturnFocus = ref(null)
const agentSubordinateOpen = ref(false)
const agentSubordinateUser = ref(null)
const agentSubordinateRows = ref([])
const agentSubordinateError = ref('')
const agentSubordinateLoading = ref(false)
const agentSubordinateReturnFocus = ref(null)
const agentReportOpen = ref(false)
const agentReportUser = ref(null)
const agentReportData = ref(null)
const agentReportError = ref('')
const agentReportReturnFocus = ref(null)
const fundsMutationOpen = ref(false)
const fundsMutationUser = ref(null)
const fundsMutationMode = ref('freeze')
const fundsMutationSnapshot = ref(null)
const fundsMutationReturnFocus = ref(null)
const withdrawFlowOpen = ref(false)
const withdrawFlowUser = ref(null)
const withdrawFlowLimit = ref(null)
const withdrawFlowReturnFocus = ref(null)
const fundsMfaReturnFocus = ref(null)
const lastFundsResult = ref(null)
const lastFundsUserId = ref('')
const membershipMutationOpen = ref(false)
const membershipMutationUser = ref(null)
const membershipMutationMode = ref('credit')
const membershipMutationSnapshot = ref(null)
const membershipMutationReturnFocus = ref(null)
const creditReviewOpen = ref(false)
const creditReviewUser = ref(null)
const creditReviewRows = ref([])
const creditReviewReturnFocus = ref(null)
const reviewDecisionOpen = ref(false)
const reviewDecisionUser = ref(null)
const reviewDecisionReview = ref(null)
const reviewDecisionReturnFocus = ref(null)
const rechargeSummaryOpen = ref(false)
const rechargeSummaryUser = ref(null)
const rechargeSummary = ref(null)
const rechargeSummaryReturnFocus = ref(null)
const membershipMfaReturnFocus = ref(null)
const lastMembershipUserId = ref('')
const lastMembershipActionType = ref('')
const cancelNote = ref('')
const USER_LIST_CONTROL_MODULE_KEYS = Object.freeze(['delivery'])
const {
  open: membershipMfaOpen,
  loading: membershipMfaLoading,
  error: membershipMfaError,
  errorAttempt: membershipMfaErrorAttempt,
  pendingAction: pendingMembershipMfaAction,
  request: requestMembershipMfa,
  verify: verifyMembershipMfa,
  cancel: cancelMembershipMfa
} = useMfaActionFlow({
  execute: async (action) => {
    const input = { ...action.payload, operatorId: 'admin_current' }
    lastMembershipUserId.value = String(action.payload?.userId || '')
    lastMembershipActionType.value = action.type
    if (action.type === 'credit-adjust') adjustUserCredit(input)
    if (action.type === 'vip-level-set') setUserVipLevel(input)
    if (action.type === 'rebate-grant') grantUserRebate(input)
    if (action.type === 'credit-review-decide') decideUserCreditReview(input)
  },
  onSuccess: () => {
    const userId = lastMembershipUserId.value
    if (userId) refreshMembershipUser(userId)
    if (lastMembershipActionType.value === 'credit-review-decide') reviewDecisionOpen.value = false
    else membershipMutationOpen.value = false
    lastMembershipUserId.value = ''
    lastMembershipActionType.value = ''
  }
})
const {
  open: fundsMfaOpen,
  loading: fundsMfaLoading,
  error: fundsMfaError,
  errorAttempt: fundsMfaErrorAttempt,
  pendingAction: pendingFundsMfaAction,
  request: requestFundsMfa,
  verify: verifyFundsMfa,
  cancel: cancelFundsMfa
} = useMfaActionFlow({
  execute: async (action) => {
    const input = { ...action.payload, operatorId: 'admin_current' }
    lastFundsUserId.value = String(action.payload?.userId || '')
    if (action.type === 'freeze-funds') lastFundsResult.value = freezeAllAvailable(input)
    if (action.type === 'unfreeze-funds') lastFundsResult.value = unfreezeAdminFunds(input)
    if (action.type === 'deduct-funds') lastFundsResult.value = deductAvailableFunds(input)
    if (action.type === 'flow-limit-set') lastFundsResult.value = setWithdrawFlowLimit(input)
    if (action.type === 'flow-limit-remove') lastFundsResult.value = removeWithdrawFlowLimit(input)
  },
  onSuccess: () => {
    const userId = lastFundsUserId.value
    if (userId) refreshFundsUser(userId)
    fundsMutationOpen.value = false
    withdrawFlowOpen.value = false
    lastFundsResult.value = null
    lastFundsUserId.value = ''
  }
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
const controlMetaOf = (user) => getUserControlListMeta(userControlState.value, userIdOf(user))
const isLocked = (user) => [USER_STATUS.SUSPENDED, USER_STATUS.BANNED].includes(user?.status)
const isAgentUser = (user) => user?.role === USER_ROLE.AGENT
const cancelControlItems = computed(() => getUnifiedControlCancelItems(controlUser.value ? rulesOf(controlUser.value) : {}, USER_LIST_CONTROL_MODULE_KEYS))
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

const controlDurationLabel = (duration) => ({ once: '单次生效', permanent: '长期生效' })[duration] || '—'
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
  controlUser.value = null
}

const selectControlSetting = (user) => {
  controlReturnUserId.value = userIdOf(user)
  openControlSetting(user)
}

const selectControlCancel = (user) => {
  controlReturnUserId.value = userIdOf(user)
  openControlCancel(user)
}

const requestControlCancelFromSetting = async () => {
  const user = controlUser.value
  if (!user) return
  controlModalOpen.value = false
  await nextTick()
  openControlCancel(user)
}

const selectUserDetail = (user, returnFocus = null) => {
  openUserDetail(user, 'overview', returnFocus)
}

const openOperationDrawer = (user) => {
  controlReturnUserId.value = userIdOf(user)
  deferredDrawerAction.value = null
  operationDrawerUser.value = user
  operationDrawerOpen.value = true
}

const closeOperationDrawer = () => {
  operationDrawerOpen.value = false
}

const handleOperationDrawerAction = async ({ id, user, trigger }) => {
  operationActionReturnFocus.value = trigger || (typeof document === 'undefined' ? null : document.activeElement)
  controlReturnUserId.value = userIdOf(user)

  if (id === 'onchain-wallet') {
    onchainWalletUser.value = user
    onchainWalletData.value = getUserOnchainWallet(userIdOf(user))
    onchainWalletReturnFocus.value = trigger
    onchainWalletOpen.value = true
    return
  }

  if (id === 'credit-review') {
    creditReviewUser.value = user
    creditReviewRows.value = getUserCreditReviews(userIdOf(user))
    creditReviewReturnFocus.value = trigger
    creditReviewOpen.value = true
    return
  }

  if (id === 'credit-adjust' || id === 'vip-level' || id === 'rebate-reward') {
    membershipMutationUser.value = user
    membershipMutationMode.value = { 'credit-adjust': 'credit', 'vip-level': 'vip', 'rebate-reward': 'rebate' }[id]
    membershipMutationSnapshot.value = getCreditMembershipSnapshot(userIdOf(user))
    membershipMutationReturnFocus.value = trigger
    membershipMutationOpen.value = true
    return
  }

  if (id === 'vip-deposit-total') {
    rechargeSummaryUser.value = user
    rechargeSummary.value = getUserRechargeSummary(userIdOf(user))
    rechargeSummaryReturnFocus.value = trigger
    rechargeSummaryOpen.value = true
    return
  }

  if (['freeze-funds', 'unfreeze-funds', 'deduct-funds'].includes(id)) {
    fundsMutationUser.value = user
    fundsMutationMode.value = id.replace('-funds', '')
    fundsMutationSnapshot.value = getFundsSnapshot(userIdOf(user))
    fundsMutationReturnFocus.value = trigger
    fundsMutationOpen.value = true
    return
  }

  if (id === 'withdraw-flow-limit') {
    withdrawFlowUser.value = user
    withdrawFlowLimit.value = getWithdrawFlowLimit(userIdOf(user))
    withdrawFlowReturnFocus.value = trigger
    withdrawFlowOpen.value = true
    return
  }

  if (id === 'edit-profile') {
    profileEditUser.value = user
    profileEditReturnFocus.value = trigger
    profileEditOpen.value = true
    return
  }

  if (id === 'reset-parent') {
    parentResetUser.value = user
    parentResetReturnFocus.value = trigger
    parentResetOpen.value = true
    return
  }

  if (id === 'set-agent-parent') {
    agentParentUser.value = user
    agentParentReturnFocus.value = trigger
    agentParentOpen.value = true
    return
  }

  if (id === 'reset-agent') {
    if (!isAgentUser(user)) {
      agentUpgradeUser.value = user
      agentUpgradeReturnFocus.value = trigger
      agentUpgradeOpen.value = true
    } else {
      agentRoleUser.value = user
      agentRoleReturnFocus.value = trigger
      agentRoleOpen.value = true
    }
    return
  }

  if (id === 'team-report') {
    teamReportUser.value = user
    teamReportReturnFocus.value = trigger
    teamReportOpen.value = true
    return
  }

  if (id === 'agent-subordinates') {
    agentSubordinateUser.value = user
    agentSubordinateRows.value = []
    agentSubordinateError.value = ''
    agentSubordinateReturnFocus.value = trigger
    agentSubordinateOpen.value = true
    await loadAgentSubordinates()
    return
  }

  if (id === 'agent-report') {
    agentReportUser.value = user
    agentReportData.value = null
    agentReportError.value = ''
    agentReportReturnFocus.value = trigger
    try {
      agentReportData.value = getUserAgentReport(userIdOf(user))
    } catch (error) {
      agentReportError.value = error instanceof Error ? error.message : '代理报表加载失败，请稍后重试'
    }
    agentReportOpen.value = true
    return
  }

  if (['direct-referrals', 'all-referrals'].includes(id)) {
    relationshipDrawerUser.value = user
    relationshipDrawerMode.value = id === 'all-referrals' ? 'all' : 'direct'
    relationshipReturnFocus.value = trigger
    relationshipDrawerOpen.value = true
    return
  }

  if (id === 'point-control-log') {
    controlLogUser.value = user
    controlLogReturnFocus.value = trigger
    controlLogOpen.value = true
    return
  }

  if (id === 'assets') {
    openUserDetail(user, 'assets', trigger)
    return
  }

  if (id === 'detail') {
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
    deposit: 'deposit',
    transfer: 'transfer'
  }
  if (regularActions[id]) await openRegularAction(user, regularActions[id], trigger)
}

const loadAgentSubordinates = async () => {
  const user = agentSubordinateUser.value
  if (!user || agentSubordinateLoading.value) return
  agentSubordinateLoading.value = true
  agentSubordinateError.value = ''
  try {
    agentSubordinateRows.value = await Promise.resolve(getUserAgentSubordinates(userIdOf(user)))
  } catch (error) {
    agentSubordinateRows.value = []
    agentSubordinateError.value = error instanceof Error
      ? error.message
      : '代理下级用户加载失败，请稍后重试'
  } finally {
    agentSubordinateLoading.value = false
  }
}

const closeAgentSubordinates = () => {
  agentSubordinateOpen.value = false
}

const clearAgentSubordinates = () => {
  agentSubordinateUser.value = null
  agentSubordinateRows.value = []
  agentSubordinateError.value = ''
  agentSubordinateLoading.value = false
  agentSubordinateReturnFocus.value = null
}

const closeOnchainWallet = () => {
  onchainWalletOpen.value = false
}

const closeControlLog = () => {
  controlLogOpen.value = false
}

const clearControlLog = () => {
  controlLogUser.value = null
  controlLogReturnFocus.value = null
}

const closeAgentReport = () => {
  agentReportOpen.value = false
}

const clearAgentReport = () => {
  agentReportUser.value = null
  agentReportData.value = null
  agentReportError.value = ''
  agentReportReturnFocus.value = null
}

const clearOnchainWallet = () => {
  onchainWalletUser.value = null
  onchainWalletData.value = null
  onchainWalletReturnFocus.value = null
}

const closeRelationshipDrawer = () => {
  relationshipDrawerOpen.value = false
}

const clearRelationshipDrawer = () => {
  relationshipDrawerUser.value = null
  relationshipReturnFocus.value = null
  relationshipDrawerMode.value = 'direct'
}

const closeProfileEdit = () => {
  profileEditOpen.value = false
}

const clearProfileEdit = () => {
  profileEditUser.value = null
  profileEditReturnFocus.value = null
}

const handleProfileSaved = (updatedUser) => {
  const updatedId = userIdOf(updatedUser)
  users.value = users.value.map((user) => userIdOf(user) === updatedId ? { ...updatedUser } : user)
  operationDrawerUser.value = { ...updatedUser }
  profileEditUser.value = { ...updatedUser }
}

const closeParentReset = () => {
  parentResetOpen.value = false
}

const clearParentReset = () => {
  parentResetUser.value = null
  parentResetReturnFocus.value = null
}

const handleParentResetSaved = (updatedUser) => {
  const updatedId = userIdOf(updatedUser)
  users.value = users.value.map((user) => userIdOf(user) === updatedId ? { ...updatedUser } : user)
  operationDrawerUser.value = { ...updatedUser }
  parentResetUser.value = { ...updatedUser }
}

const closeAgentParent = () => {
  agentParentOpen.value = false
}

const clearAgentParent = () => {
  agentParentUser.value = null
  agentParentReturnFocus.value = null
}

const handleAgentParentSaved = (updatedUser) => {
  const updatedId = userIdOf(updatedUser)
  users.value = users.value.map((user) => userIdOf(user) === updatedId ? { ...updatedUser } : user)
  operationDrawerUser.value = { ...updatedUser }
  agentParentUser.value = { ...updatedUser }
}

const closeAgentRole = () => {
  agentRoleOpen.value = false
}

const clearAgentRole = () => {
  agentRoleUser.value = null
  agentRoleReturnFocus.value = null
}

const handleAgentRoleSaved = ({ user: updatedUser }) => {
  users.value = users.value.map((row) => {
    const current = usersList.find((candidate) => userIdOf(candidate) === userIdOf(row))
    return current ? { ...current } : row
  })
  operationDrawerUser.value = { ...updatedUser }
  agentRoleUser.value = { ...updatedUser }
}

const closeAgentUpgrade = () => {
  agentUpgradeOpen.value = false
}

const clearAgentUpgrade = () => {
  agentUpgradeUser.value = null
  agentUpgradeReturnFocus.value = null
}

const handleAgentUpgradeSaved = () => {
  const upgradedId = userIdOf(agentUpgradeUser.value)
  users.value = users.value.map((row) => {
    const current = usersList.find((candidate) => userIdOf(candidate) === userIdOf(row))
    return current ? { ...current } : row
  })
  const updatedUser = usersList.find((candidate) => userIdOf(candidate) === upgradedId)
  if (updatedUser) {
    operationDrawerUser.value = { ...updatedUser }
    agentUpgradeUser.value = { ...updatedUser }
  }
}

const closeTeamReport = () => {
  teamReportOpen.value = false
}

const clearTeamReport = () => {
  teamReportUser.value = null
  teamReportReturnFocus.value = null
}

const refreshFundsUser = (userId) => {
  const snapshot = getFundsSnapshot(userId)
  const updated = snapshot.user
  users.value = users.value.map((user) => userIdOf(user) === String(userId) ? { ...updated } : user)
  if (userIdOf(operationDrawerUser.value) === String(userId)) operationDrawerUser.value = { ...updated }
  if (userIdOf(fundsMutationUser.value) === String(userId)) fundsMutationUser.value = { ...updated }
  fundsMutationSnapshot.value = snapshot
  withdrawFlowLimit.value = getWithdrawFlowLimit(userId)
}

const requestFundsVerification = (request) => {
  fundsMfaReturnFocus.value = request.returnFocus
  requestFundsMfa({ type: request.type, payload: request.payload })
}
const closeFundsMutation = () => { if (!fundsMfaOpen.value && !fundsMfaLoading.value) fundsMutationOpen.value = false }
const clearFundsMutation = () => {
  fundsMutationUser.value = null
  fundsMutationSnapshot.value = null
  fundsMutationReturnFocus.value = null
}
const closeWithdrawFlow = () => { if (!fundsMfaOpen.value && !fundsMfaLoading.value) withdrawFlowOpen.value = false }
const clearWithdrawFlow = () => {
  withdrawFlowUser.value = null
  withdrawFlowLimit.value = null
  withdrawFlowReturnFocus.value = null
}
const handleFundsMfaCancel = () => {
  cancelFundsMfa()
}
const fundsMfaTitle = computed(() => ({
  'freeze-funds': '冻结资金安全验证',
  'unfreeze-funds': '解冻资金安全验证',
  'deduct-funds': '划扣资金安全验证',
  'flow-limit-set': '设置流水限制安全验证',
  'flow-limit-remove': '解除流水限制安全验证'
}[pendingFundsMfaAction.value?.type] || '资金操作安全验证'))

const refreshMembershipUser = (userId) => {
  const snapshot = getCreditMembershipSnapshot(userId)
  const updated = snapshot.user
  users.value = users.value.map((user) => userIdOf(user) === String(userId) ? { ...updated } : user)
  if (userIdOf(operationDrawerUser.value) === String(userId)) operationDrawerUser.value = { ...updated }
  if (userIdOf(membershipMutationUser.value) === String(userId)) membershipMutationUser.value = { ...updated }
  if (userIdOf(creditReviewUser.value) === String(userId)) creditReviewUser.value = { ...updated }
  if (userIdOf(reviewDecisionUser.value) === String(userId)) reviewDecisionUser.value = { ...updated }
  if (userIdOf(rechargeSummaryUser.value) === String(userId)) rechargeSummaryUser.value = { ...updated }
  membershipMutationSnapshot.value = snapshot
  creditReviewRows.value = getUserCreditReviews(userId)
  rechargeSummary.value = getUserRechargeSummary(userId)
  if (reviewDecisionReview.value) {
    reviewDecisionReview.value = creditReviewRows.value.find((review) => review.id === reviewDecisionReview.value.id) || reviewDecisionReview.value
  }
}

const openReviewDecision = ({ review, returnFocus }) => {
  reviewDecisionUser.value = creditReviewUser.value
  reviewDecisionReview.value = { ...review }
  reviewDecisionReturnFocus.value = returnFocus
  reviewDecisionOpen.value = true
}
const requestMembershipVerification = (request) => {
  membershipMfaReturnFocus.value = request.returnFocus
  requestMembershipMfa({ type: request.type, payload: request.payload })
}
const closeMembershipMutation = () => {
  if (!membershipMfaOpen.value && !membershipMfaLoading.value) membershipMutationOpen.value = false
}
const clearMembershipMutation = () => {
  membershipMutationUser.value = null
  membershipMutationSnapshot.value = null
  membershipMutationReturnFocus.value = null
}
const closeCreditReview = () => {
  if (!membershipMfaOpen.value && !membershipMfaLoading.value && !reviewDecisionOpen.value) creditReviewOpen.value = false
}
const clearCreditReview = () => {
  creditReviewUser.value = null
  creditReviewRows.value = []
  creditReviewReturnFocus.value = null
}
const closeReviewDecision = () => {
  if (!membershipMfaOpen.value && !membershipMfaLoading.value) reviewDecisionOpen.value = false
}
const clearReviewDecision = () => {
  reviewDecisionUser.value = null
  reviewDecisionReview.value = null
  reviewDecisionReturnFocus.value = null
}
const closeRechargeSummary = () => { rechargeSummaryOpen.value = false }
const clearRechargeSummary = () => {
  rechargeSummaryUser.value = null
  rechargeSummary.value = null
  rechargeSummaryReturnFocus.value = null
}
const handleMembershipMfaCancel = () => { cancelMembershipMfa() }
const membershipMfaTitle = computed(() => ({
  'credit-adjust': '修改信用分安全验证',
  'vip-level-set': '编辑会员等级安全验证',
  'rebate-grant': '添加返利奖励安全验证',
  'credit-review-decide': '信用分审核安全验证'
}[pendingMembershipMfaAction.value?.type] || '信用与会员操作安全验证'))

const executeDeferredDrawerAction = async () => {
  const action = deferredDrawerAction.value
  deferredDrawerAction.value = null
  operationActionReturnFocus.value = null
  operationDrawerUser.value = null
  if (!action) return

  if (action.id === 'detail' || action.id === 'assets') {
    openUserDetail(
      action.user,
      action.id === 'assets' ? 'assets' : 'overview',
      actionMenuTriggerRefs.get(userIdOf(action.user)) || null
    )
    return
  }

}

const openRegularAction = async (user, action, returnFocus = null) => {
  operationUser.value = user
  await nextTick()
  userOperations.value?.open(action, returnFocus)
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
  if (payload.strategy === 'normal') {
    const cancelItems = getUnifiedControlCancelItems(controlUser.value ? rulesOf(controlUser.value) : {}, USER_LIST_CONTROL_MODULE_KEYS)
    if (controlUser.value && cancelItems.length) {
      cancelUnifiedUserControl({
        userId: userIdOf(controlUser.value),
        modules: USER_LIST_CONTROL_MODULE_KEYS,
        note: payload.note || '恢复正常',
        now: formatTime(),
        operationId: `demo-global-cancel-${nextSequence()}`
      })
    }
    controlModalOpen.value = false
    controlUser.value = null
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
    modules: USER_LIST_CONTROL_MODULE_KEYS,
    note: cancelNote.value.trim(),
    now: formatTime(),
    operationId: `demo-global-cancel-${nextSequence()}`
  }
  cancelUnifiedUserControl(payload)
  closeControlCancel()
}

const handleUnifiedCancelAfterLeave = async () => {
  if (!await onUnifiedCancelAfterLeave()) return
  cancelNote.value = ''
  clearUnifiedCancelSnapshot()
  controlUser.value = null
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
const openUserDetail = (user, initialTab = 'overview', returnFocus = null) => {
  selectedUser.value = user
  detailInitialTab.value = initialTab
  detailReturnFocus.value = returnFocus
  showDetailDrawer.value = true
}

// 关闭弹窗
const closeDetailDrawer = () => {
  showDetailDrawer.value = false
}

const clearDetailDrawer = () => {
  selectedUser.value = null
  detailInitialTab.value = 'overview'
  detailReturnFocus.value = null
}
</script>

<template>
  <section class="space-y-6">
    <!-- 页面标题 -->
    <div>
      <h1 class="text-2xl font-bold text-slate-900">用户管理</h1>
      <p class="text-sm text-slate-500 mt-1">管理系统用户、查看用户信息和操作记录</p>
    </div>

    <!-- 筛选和搜索区域 -->
    <div class="rounded-xl border border-slate-200 bg-white p-5">
      <!-- 搜索框 -->
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <UserListSearchField
          v-model="userIdKeyword"
          label="用户 ID"
          placeholder="搜索用户 ID"
          icon-path="M15 7a3 3 0 11-6 0 3 3 0 016 0zM5 19a7 7 0 0114 0"
        />
        <UserListSearchField
          v-model="phoneKeyword"
          label="手机号"
          placeholder="搜索手机号"
          input-mode="tel"
          autocomplete="tel"
          icon-path="M3 5.5A2.5 2.5 0 015.5 3h1A1.5 1.5 0 018 4.2l.6 2.4a1.5 1.5 0 01-.4 1.4l-.7.7a11 11 0 005.8 5.8l.7-.7a1.5 1.5 0 011.4-.4l2.4.6a1.5 1.5 0 011.2 1.5v1A2.5 2.5 0 0116.5 19h-1C8.6 19 3 13.4 3 6.5v-1z"
        />
        <UserListSearchField
          v-model="emailKeyword"
          label="邮箱"
          placeholder="搜索邮箱"
          input-mode="email"
          autocomplete="email"
          icon-path="M4 6h16v12H4V6zm0 0l8 7 8-7"
        />
        <UserListSearchField
          v-model="walletAddressKeyword"
          label="钱包地址"
          placeholder="搜索钱包地址"
          icon-path="M17 9V7a5 5 0 00-10 0v2M5 9h14v10H5V9z"
        />
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
        <table class="w-full min-w-[1220px]">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">ID</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">用户名</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">邮箱</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">角色</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">VIP</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">信用分</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">账户余额</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">裂变上级</th>
              <th class="min-w-24 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap">点控</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr 
              v-for="user in users" 
              :key="user.id"
              class="hover:bg-slate-50 transition-colors cursor-pointer"
              @click="openUserDetail(user, 'overview', $event.currentTarget)"
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

              <!-- 账户余额 -->
              <td class="px-4 py-3 text-right">
                <span class="text-sm font-medium text-slate-900">
                  {{ formatCurrency(user.balance) }}
                </span>
              </td>

              <!-- 裂变上级 -->
              <td class="px-4 py-3">
                <span v-if="user.parentUsername" class="text-sm text-slate-600">
                  {{ user.parentUsername }}
                </span>
                <span v-else class="text-xs text-slate-400">-</span>
              </td>

              <!-- 用户点控 -->
              <td class="px-4 py-3 whitespace-nowrap">
                <span :class="controlMetaOf(user).hasCurrent ? 'text-sm font-medium text-slate-700' : 'text-xs text-slate-400'">
                  {{ controlMetaOf(user).controlLabel }}
                </span>
              </td>

              <!-- 用户快捷操作 -->
              <td class="px-4 py-3">
                <div data-testid="user-row-action-bar" class="flex flex-wrap items-center gap-2" @click.stop>
                  <button
                    type="button"
                    class="inline-flex h-8 min-w-10 items-center justify-center rounded-lg px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="查看用户详情"
                    @click="selectUserDetail(user, $event.currentTarget)"
                  >
                    详情</button>
                  <button
                    type="button"
                    class="inline-flex h-8 min-w-16 items-center justify-center rounded-lg px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="编辑用户资料"
                    @click="handleOperationDrawerAction({ id: 'edit-profile', user, trigger: $event.currentTarget })"
                  >
                    编辑资料</button>
                  <button
                    type="button"
                    class="inline-flex h-8 min-w-10 items-center justify-center rounded-lg px-2.5 text-xs bg-blue-50/70 font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="客服入金"
                    @click="openRegularAction(user, 'deposit', $event.currentTarget)"
                  >
                    入金</button>
                  <button
                    type="button"
                    class="inline-flex h-8 min-w-12 items-center justify-center rounded-lg px-2.5 text-xs font-medium focus:outline-none focus:ring-2"
                    :class="isLocked(user)
                      ? 'bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-500'
                      : 'bg-rose-50/80 text-rose-700 hover:bg-rose-100 focus:ring-rose-500'"
                    :aria-label="isLocked(user) ? '解封用户' : '封禁用户'"
                    @click="handleOperationDrawerAction({ id: 'freeze-account', user, trigger: $event.currentTarget })"
                  >
                    {{ isLocked(user) ? '解封' : '封户' }}</button>
                  <button
                    type="button"
                    class="inline-flex h-8 min-w-12 items-center justify-center rounded-lg bg-amber-50/80 px-2.5 text-xs font-medium text-amber-700 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    aria-label="设置用户点控"
                    @click="handleOperationDrawerAction({ id: 'point-control', user, trigger: $event.currentTarget })"
                  >
                    点控</button>
                  <button
                    type="button"
                    class="inline-flex h-8 min-w-20 items-center justify-center rounded-lg px-2.5 text-xs bg-rose-50/80 font-medium text-rose-700 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    aria-label="修改用户信用分"
                    @click="handleOperationDrawerAction({ id: 'credit-adjust', user, trigger: $event.currentTarget })"
                  >
                    修改信用分</button>
                  <button
                    type="button"
                    class="inline-flex h-8 min-w-20 items-center justify-center rounded-lg px-2.5 text-xs bg-violet-50/80 font-medium text-violet-700 hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    aria-label="查看用户信用分审核"
                    @click="handleOperationDrawerAction({ id: 'credit-review', user, trigger: $event.currentTarget })"
                  >
                    信用分审核</button>
                  <button
                    v-if="!isAgentUser(user)"
                    type="button"
                    class="inline-flex h-8 min-w-20 items-center justify-center rounded-lg bg-emerald-50/80 px-2.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    aria-label="设置用户为代理"
                    @click="handleOperationDrawerAction({ id: 'reset-agent', user, trigger: $event.currentTarget })"
                  >
                    设为代理</button>
                  <button
                    type="button"
                    class="inline-flex h-8 min-w-20 items-center justify-center rounded-lg bg-cyan-50/80 px-2.5 text-xs font-medium text-cyan-700 hover:bg-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    aria-label="设置用户上级代理"
                    @click="handleOperationDrawerAction({ id: 'set-agent-parent', user, trigger: $event.currentTarget })"
                  >
                    设置上级代理</button>
                  <button
                    :ref="(element) => setActionMenuTriggerRef(user, element)"
                    type="button"
                    class="inline-flex h-8 min-w-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="更多用户操作"
                    @click="openOperationDrawer(user)"
                  >
                    更多
                  </button>
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
      <p class="mt-2 text-sm text-slate-500">请尝试调整用户 ID、手机号、邮箱或钱包地址</p>
      <button
        v-if="hasSearchFilters"
        @click="userIdKeyword = ''; phoneKeyword = ''; emailKeyword = ''; walletAddressKeyword = ''"
        class="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        清空搜索
      </button>
    </div>

    <!-- 用户详情抽屉 -->
    <UserDetailDrawer
      :visible="showDetailDrawer"
      :user="selectedUser"
      :initial-tab="detailInitialTab"
      :return-focus="detailReturnFocus"
      @close="closeDetailDrawer"
      @closed="clearDetailDrawer"
    />

    <UserControlModal
      :open="controlModalOpen"
      scope="global"
      :unified-module-keys="USER_LIST_CONTROL_MODULE_KEYS"
      simplified-global-control-types
      :show-help-panel="false"
      :note-required="false"
      :user="controlUser"
      :existing-rules="controlUser ? rulesOf(controlUser) : {}"
      :return-focus="resolveControlReturnFocus"
      @close="closeControlSetting"
      @submit="submitControlSetting"
      @request-cancel="requestControlCancelFromSetting"
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

    <UserControlLogDrawer
      :visible="controlLogOpen"
      :user="controlLogUser"
      :return-focus="controlLogReturnFocus"
      @close="closeControlLog"
      @closed="clearControlLog"
    />

    <UserAgentReportDrawer
      :visible="agentReportOpen"
      :user="agentReportUser"
      :report="agentReportData"
      :error="agentReportError"
      :return-focus="agentReportReturnFocus"
      @close="closeAgentReport"
      @closed="clearAgentReport"
    />

    <UserAgentSubordinateDrawer
      :visible="agentSubordinateOpen"
      :user="agentSubordinateUser"
      :rows="agentSubordinateRows"
      :error="agentSubordinateError"
      :loading="agentSubordinateLoading"
      :return-focus="agentSubordinateReturnFocus"
      @retry="loadAgentSubordinates"
      @close="closeAgentSubordinates"
      @closed="clearAgentSubordinates"
    />

    <UserOnchainWalletDrawer
      :visible="onchainWalletOpen"
      :user="onchainWalletUser"
      :wallet="onchainWalletData"
      :return-focus="onchainWalletReturnFocus"
      @close="closeOnchainWallet"
      @closed="clearOnchainWallet"
    />

    <UserCreditReviewDrawer
      :visible="creditReviewOpen"
      :user="creditReviewUser"
      :reviews="creditReviewRows"
      :busy="membershipMfaOpen || membershipMfaLoading || reviewDecisionOpen"
      :return-focus="creditReviewReturnFocus"
      @close="closeCreditReview"
      @closed="clearCreditReview"
      @select-review="openReviewDecision"
    />

    <UserRechargeSummaryDrawer
      :visible="rechargeSummaryOpen"
      :user="rechargeSummaryUser"
      :summary="rechargeSummary"
      :return-focus="rechargeSummaryReturnFocus"
      @close="closeRechargeSummary"
      @closed="clearRechargeSummary"
    />

    <UserMembershipMutationDialog
      :visible="membershipMutationOpen"
      :user="membershipMutationUser"
      :mode="membershipMutationMode"
      :snapshot="membershipMutationSnapshot"
      :busy="membershipMfaOpen || membershipMfaLoading"
      :return-focus="membershipMutationReturnFocus"
      @close="closeMembershipMutation"
      @closed="clearMembershipMutation"
      @request-mfa="requestMembershipVerification"
    />

    <UserCreditReviewDecisionDialog
      :visible="reviewDecisionOpen"
      :user="reviewDecisionUser"
      :review="reviewDecisionReview"
      :busy="membershipMfaOpen || membershipMfaLoading"
      :return-focus="reviewDecisionReturnFocus"
      @close="closeReviewDecision"
      @closed="clearReviewDecision"
      @request-mfa="requestMembershipVerification"
    />

    <UserFundsMutationDialog
      :visible="fundsMutationOpen"
      :user="fundsMutationUser"
      :mode="fundsMutationMode"
      :snapshot="fundsMutationSnapshot"
      :busy="fundsMfaOpen || fundsMfaLoading"
      :return-focus="fundsMutationReturnFocus"
      @close="closeFundsMutation"
      @closed="clearFundsMutation"
      @request-mfa="requestFundsVerification"
    />

    <UserWithdrawFlowLimitDialog
      :visible="withdrawFlowOpen"
      :user="withdrawFlowUser"
      :limit="withdrawFlowLimit"
      :busy="fundsMfaOpen || fundsMfaLoading"
      :return-focus="withdrawFlowReturnFocus"
      @close="closeWithdrawFlow"
      @closed="clearWithdrawFlow"
      @request-mfa="requestFundsVerification"
    />

    <UserRelationshipDrawer
      :visible="relationshipDrawerOpen"
      :user="relationshipDrawerUser"
      :mode="relationshipDrawerMode"
      :return-focus="relationshipReturnFocus"
      @close="closeRelationshipDrawer"
      @closed="clearRelationshipDrawer"
    />

    <UserProfileEditDialog
      :visible="profileEditOpen"
      :user="profileEditUser"
      :return-focus="profileEditReturnFocus"
      @close="closeProfileEdit"
      @closed="clearProfileEdit"
      @saved="handleProfileSaved"
    />

    <UserParentResetDialog
      :visible="parentResetOpen"
      :user="parentResetUser"
      :return-focus="parentResetReturnFocus"
      @close="closeParentReset"
      @closed="clearParentReset"
      @saved="handleParentResetSaved"
    />

    <UserAgentParentDialog
      :visible="agentParentOpen"
      :user="agentParentUser"
      :return-focus="agentParentReturnFocus"
      @close="closeAgentParent"
      @closed="clearAgentParent"
      @saved="handleAgentParentSaved"
    />

    <UserAgentRoleDialog
      :visible="agentRoleOpen"
      :user="agentRoleUser"
      :return-focus="agentRoleReturnFocus"
      @close="closeAgentRole"
      @closed="clearAgentRole"
      @saved="handleAgentRoleSaved"
    />

    <AgentUpgradeDialog
      :visible="agentUpgradeOpen"
      :initial-user-id="userIdOf(agentUpgradeUser)"
      :return-focus="agentUpgradeReturnFocus"
      @close="closeAgentUpgrade"
      @closed="clearAgentUpgrade"
      @saved="handleAgentUpgradeSaved"
    />

    <UserTeamReportDrawer
      :visible="teamReportOpen"
      :user="teamReportUser"
      :return-focus="teamReportReturnFocus"
      @close="closeTeamReport"
      @closed="clearTeamReport"
    />

    <Teleport to="body">
      <Transition name="dialog-overlay" appear @after-enter="onUnifiedCancelAfterEnter" @after-leave="handleUnifiedCancelAfterLeave">
        <div v-if="unifiedCancelRendered" v-show="unifiedCancelPhase !== 'closing'" class="fixed inset-0 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" :style="unifiedCancelLayerStyle">
          <Transition name="dialog-panel" appear>
            <section v-show="unifiedCancelPhase !== 'closing'" ref="unifiedCancelDialogRef" data-testid="unified-user-control-cancel-dialog" class="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl supports-[height:100dvh]:max-h-[calc(100dvh-2rem)]" role="dialog" aria-modal="true" aria-labelledby="unified-user-control-cancel-title">
              <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div class="min-w-0 flex-1">
                  <h2 id="unified-user-control-cancel-title" class="break-words text-lg font-semibold text-slate-900">取消用户点控</h2>
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
                  <span class="text-sm font-medium text-slate-800">取消点控备注 <span class="text-rose-500">*</span></span>
                  <textarea v-model="cancelNote" :disabled="!cancelControlItems.length" rows="2" maxlength="200" placeholder="请填写取消点控原因，便于后续审计" class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100" />
                  <span class="mt-1 block text-xs" :class="cancelNote.trim() ? 'text-slate-500' : 'text-rose-600'">
                    {{ cancelNote.trim() ? '确认后将直接取消点控' : '取消点控备注必填' }}
                  </span>
                </label>
              </div>
              <footer class="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
                <button ref="unifiedCancelReturnRef" type="button" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700" @click="closeControlCancel">返回</button>
                <button type="button" :disabled="unifiedCancelPhase !== 'open' || !cancelControlItems.length || !cancelNote.trim()" class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50" @click="confirmControlCancel">
                  确认取消点控
                </button>
              </footer>
            </section>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <MfaVerificationModal
      v-model:open="fundsMfaOpen"
      :loading="fundsMfaLoading"
      :title="fundsMfaTitle"
      description="资金控制属于敏感操作，请输入 MFA 验证码"
      :error="fundsMfaError"
      :error-attempt="fundsMfaErrorAttempt"
      :return-focus="fundsMfaReturnFocus"
      @verify="verifyFundsMfa"
      @cancel="handleFundsMfaCancel"
    />

    <MfaVerificationModal
      v-model:open="membershipMfaOpen"
      :loading="membershipMfaLoading"
      :title="membershipMfaTitle"
      description="信用与会员操作属于敏感操作，请输入 MFA 验证码"
      :error="membershipMfaError"
      :error-attempt="membershipMfaErrorAttempt"
      :return-focus="membershipMfaReturnFocus"
      @verify="verifyMembershipMfa"
      @cancel="handleMembershipMfaCancel"
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
