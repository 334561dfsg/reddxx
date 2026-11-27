<script setup>
// 用户列表 — Ant Design Pro list page (2026-11-28): query card (EarnSearchForm, one input per field, explicit 查询/重置),
// table card (EarnAdminTable) with the 添加用户 toolbar action, text Tags, right-aligned amounts and link row actions:
// 详情 / 编辑资料 / 入金 visible, every other row action in the 更多 Dropdown, whose last entry opens the complete
// operation Drawer (focus returns to the row's 更多 trigger). All drawers, dialogs and MFA flows are unchanged.
import { Button, Dropdown, Menu, MenuDivider, MenuItem, Space, Tag, TypographyText, message } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminDialog from '../../../admin/components/antd/AdminDialog.vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import { AdminButton, AdminTextarea, nativeControl } from '../../../admin/components/antd/controls.js'
import { ref, computed, nextTick, onMounted } from 'vue'
import { DownOutlined, PlusOutlined } from '@ant-design/icons-vue'
import UserStaffEditorDialog from '../../../admin/components/user/UserStaffEditorDialog.vue'
import UserStaffReportDrawer from '../../../admin/components/user/UserStaffReportDrawer.vue'
import { getUserStaffRepository } from '../../../admin/repositories/userStaffRepository.js'
import { getUsers, usersList } from '../../../admin/mock/user'
import { USER_STATUS, USER_ROLE } from '../../../admin/constants/user'
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

const userColumns = [
  { key: 'user', title: '用户', width: 200, fixed: 'left' },
  { key: 'email', title: '邮箱', width: 220 },
  { key: 'role', title: '角色', width: 100 },
  { key: 'salesperson', title: '业务员', width: 90 },
  { key: 'agent', title: '所属代理', width: 140 },
  { key: 'vip', title: 'VIP', width: 90 },
  { key: 'credit', title: '信用分', width: 90, align: 'right' },
  { key: 'balance', title: '账户余额（USD）', width: 150, align: 'right' },
  { key: 'parent', title: '裂变上级', width: 130 },
  { key: 'pointControl', title: '点控', width: 130 },
  { key: 'actions', title: '操作', width: 230, fixed: 'right' }
]

const staffEditorOpen = ref(false)
const staffEditorMode = ref('create')
const staffTarget = ref(null)
const staffReturnFocus = ref(null)
const staffReportOpen = ref(false)
const staffReportUser = ref(null)
const staffReportReturnFocus = ref(null)
// Success feedback through Ant message (AGENTS.md toast rule); no account or password details in the notice.
function showUserCreatedToast() { message.success('添加成功') }
const staffError = ref('')
const staffRevision = ref(0)
const staffEmployees = computed(() => {
  staffRevision.value
  try { return getUserStaffRepository().employees() } catch { return [] }
})
const staffAgents = computed(() => { staffRevision.value; try { return getUserStaffRepository().agents() } catch { return [] } })
const staffName = (id) => usersList.find(user => user.id === id)?.username || '—'
function openStaffEditor(mode, user, trigger) { if (staffEditorOpen.value) return; staffEditorMode.value = mode; staffTarget.value = user; staffReturnFocus.value = trigger; staffEditorOpen.value = true }
function openStaffReport(user, trigger) { if (staffReportOpen.value) return; staffReportUser.value = user; staffReportReturnFocus.value = trigger; staffReportOpen.value = true }
function staffSaved({ user, created }) {
  staffRevision.value++
  if (created) showUserCreatedToast(user)
  else message.success(`已更新 ${user.username} 的上级业务员，历史业绩保持原归属。`)
  // A new account is shown on its own: the applied query becomes its user ID.
  if (created) { filters.value = { ...blankFilters(), userIdKeyword: user.id }; page.value = 1 }
  fetchUsers()
}
function initializeStaff() { try { getUserStaffRepository().seedDemo(); staffError.value = ''; staffRevision.value++; fetchUsers() } catch (error) { staffError.value = error.message; fetchUsers() } }

// Applied query (the query card keeps its own draft). One input per field; the agent/salesperson selects are
// searchable by name or UID. All salespeople are listed; an agent/salesperson pair that does not match returns no rows.
const blankFilters = () => ({ userIdKeyword: '', phoneKeyword: '', emailKeyword: '', walletAddressKeyword: '', role: 'all', agentParentId: 'all', employeeId: 'all' })
const filters = ref(blankFilters())
const page = ref(1)
const searchFields = computed(() => [
  { key: 'userIdKeyword', label: '用户 ID' },
  { key: 'phoneKeyword', label: '手机号' },
  { key: 'emailKeyword', label: '邮箱' },
  { key: 'walletAddressKeyword', label: '钱包地址' },
  { key: 'role', label: '用户类型', options: [{ value: 'all', label: '全部类型' }, { value: 'user', label: '普通用户' }, { value: 'agent', label: '代理' }] },
  { key: 'agentParentId', label: '所属代理', searchable: true, options: [{ value: 'all', label: '全部代理' }, ...staffAgents.value.map(agent => ({ value: agent.id, label: `${agent.username} · ${agent.id}` }))] },
  { key: 'employeeId', label: '业务员', searchable: true, options: [{ value: 'all', label: '全部业务员' }, { value: 'unassigned', label: '未分配业务员' }, ...staffEmployees.value.map(person => ({ value: person.id, label: `${person.username} · ${person.id}` }))] }
])
const allToBlank = value => (value === 'all' ? '' : value)
function searchUsers(values) { filters.value = { ...blankFilters(), ...values }; page.value = 1; fetchUsers() }
function resetUsers() { filters.value = blankFilters(); page.value = 1; fetchUsers() }

// 用户数据
const users = ref([])
const loading = ref(false)

// 获取用户数据（全部匹配记录，表格卡片在前端分页）
let userQueryGeneration = 0
const fetchUsers = async () => {
  const generation = ++userQueryGeneration
  const f = filters.value
  loading.value = true
  try {
    const { list } = await getUsers({
      page: 1,
      pageSize: Number.MAX_SAFE_INTEGER,
      userIdKeyword: f.userIdKeyword,
      phoneKeyword: f.phoneKeyword,
      emailKeyword: f.emailKeyword,
      walletAddressKeyword: f.walletAddressKeyword,
      role: allToBlank(f.role),
      agentParentId: allToBlank(f.agentParentId),
      employeeId: allToBlank(f.employeeId)
    })
    if (generation !== userQueryGeneration) return
    users.value = list
  } catch (error) {
    if (generation === userQueryGeneration) message.error(error instanceof Error && error.message ? error.message : '用户列表加载失败，请重试')
  } finally {
    if (generation === userQueryGeneration) loading.value = false
  }
}

// 组件加载时获取数据
onMounted(initializeStaff)

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
const pointControlTagColor = (label) => ({
  永久盈利: 'orange',
  永久亏损: 'green',
  存在模块差异: 'gold'
}[label] || 'blue')
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

  if (id === 'set-employee') { openStaffEditor('assign', user, trigger); return }
  if (id === 'staff-report') { openStaffReport(user, trigger); return }

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
  staffRevision.value++
  if (filters.value.employeeId === updatedUser.id && !updatedUser.isSalesperson) {
    filters.value = { ...filters.value, employeeId: 'all' }
    fetchUsers()
  }
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
  [USER_ROLE.USER]: { text: '普通用户', color: 'blue' },
  [USER_ROLE.AGENT]: { text: '代理', color: 'purple' }
}

// Row actions beyond the three visible links, in their former order; the last entry opens the operation Drawer.
const moreRowActions = (user) => [
  { id: 'freeze-account', label: isLocked(user) ? '解封' : '封户', danger: !isLocked(user) },
  { id: 'point-control', label: '点控' },
  { id: 'credit-adjust', label: '修改信用分' },
  { id: 'credit-review', label: '信用分审核' },
  ...(!isAgentUser(user) ? [{ id: 'reset-agent', label: '设为代理' }] : []),
  { id: 'set-agent-parent', label: '设置上级代理' },
  ...(user.role === 'user' ? [{ id: 'set-employee', label: '设置上级业务员', disabled: !!staffError.value }] : [])
]
const runMoreRowAction = (user, id) => {
  const trigger = actionMenuTriggerRefs.get(userIdOf(user)) || null
  if (id === 'all-operations') { openOperationDrawer(user); return }
  handleOperationDrawerAction({ id, user, trigger })
}

// 格式化货币
const formatCurrency = (value) => Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

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

// The shared Ant frames (AdminDialog) drive these page-owned lifecycles (dialog migration 2026-11-27). Defined last so
// every handler they reference is initialised.
const unifiedCancelLifecycle = { rendered: unifiedCancelRendered, phase: unifiedCancelPhase, layerStyle: unifiedCancelLayerStyle, requestDialogClose: requestUnifiedCancelClose, onAfterEnter: onUnifiedCancelAfterEnter, onAfterLeave: handleUnifiedCancelAfterLeave, dialogRef: unifiedCancelDialogRef }
</script>

<template>
  <PageShell>
    <SearchForm name="user-list-filters" :model="filters" :fields="searchFields" @search="searchUsers" @reset="resetUsers" />

    <!-- 用户表格 -->
    <AdminTable title="用户列表" v-model:page="page" :rows="users" :columns="userColumns" :loading="loading" row-key="id" desktop-only>
      <template #toolbar>
        <Space :size="8">
          <FeedbackToast v-if="staffError" type="error" :source="() => (staffError) ? (([String((staffError) ?? ''),''].join(''))) : ''"><Button @click="initializeStaff">重试</Button></FeedbackToast>
          <Button type="primary" :disabled="!!staffError" @click="openStaffEditor('create', null, $event.currentTarget)"><template #icon><PlusOutlined /></template>添加用户</Button>
        </Space>
      </template>
      <template #cell="{ column, record: user }">
        <Space v-if="column.key === 'user'" direction="vertical" :size="0">
          <TypographyText strong>{{ user.username }}</TypographyText>
          <TypographyText type="secondary" class="font-mono">{{ user.id }}</TypographyText>
        </Space>
        <template v-else-if="column.key === 'email'">{{ user.email || '—' }}</template>
        <Tag v-else-if="column.key === 'role'" :color="roleConfig[user.role]?.color">{{ roleConfig[user.role]?.text || user.role }}</Tag>
        <template v-else-if="column.key === 'salesperson'">{{ user.isSalesperson === true ? '是' : '否' }}</template>
        <template v-else-if="column.key === 'agent'">{{ user.role === 'agent' ? '代理账号' : user.agentParentId ? staffName(user.agentParentId) : '未设置代理' }}</template>
        <template v-else-if="column.key === 'vip'">
          <Tag v-if="user.isVip" color="gold">VIP{{ user.vipLevel || '' }}</Tag>
          <TypographyText v-else type="secondary">—</TypographyText>
        </template>
        <template v-else-if="column.key === 'credit'">{{ user.creditScore ?? '—' }}</template>
        <template v-else-if="column.key === 'balance'">{{ formatCurrency(user.balance) }}</template>
        <template v-else-if="column.key === 'parent'">
          <template v-if="user.parentUsername">{{ user.parentUsername }}</template>
          <TypographyText v-else type="secondary">—</TypographyText>
        </template>
        <template v-else-if="column.key === 'pointControl'">
          <Tag v-if="controlMetaOf(user).hasCurrent" :color="pointControlTagColor(controlMetaOf(user).controlLabel)">{{ controlMetaOf(user).controlLabel }}</Tag>
          <TypographyText v-else type="secondary">—</TypographyText>
        </template>
        <Space v-else-if="column.key === 'actions'" data-testid="user-row-action-bar" :size="8">
          <Button type="link" class="px-0" aria-label="查看用户详情" @click="selectUserDetail(user, $event.currentTarget)">详情</Button>
          <Button type="link" class="px-0" aria-label="编辑用户资料" @click="handleOperationDrawerAction({ id: 'edit-profile', user, trigger: $event.currentTarget })">编辑资料</Button>
          <Button type="link" class="px-0" aria-label="客服入金" @click="openRegularAction(user, 'deposit', $event.currentTarget)">入金</Button>
          <Dropdown :trigger="['click']" placement="bottomRight">
            <Button
              type="link"
              class="px-0"
              :ref="(element) => setActionMenuTriggerRef(user, element?.$el || element)"
              aria-label="更多用户操作"
            >更多<DownOutlined /></Button>
            <template #overlay>
              <Menu>
                <MenuItem v-for="action in moreRowActions(user)" :key="action.id" :disabled="action.disabled" :danger="action.danger" @click="runMoreRowAction(user, action.id)">{{ action.label }}</MenuItem>
                <MenuDivider />
                <MenuItem key="all-operations" @click="runMoreRowAction(user, 'all-operations')">全部操作</MenuItem>
              </Menu>
            </template>
          </Dropdown>
        </Space>
        <template v-else>{{ user[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

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
      :show-help-panel="false"
      :note-required="false"
      :user="controlUser"
      :existing-rules="controlUser ? rulesOf(controlUser) : {}"
      :return-focus="resolveControlReturnFocus"
      @close="closeControlSetting"
      @submit="submitControlSetting"
    />

    <UserStaffEditorDialog :visible="staffEditorOpen" :mode="staffEditorMode" :user="staffTarget" :return-focus="staffReturnFocus" @close="staffEditorOpen = false" @saved="staffSaved" @closed="staffTarget = null; staffReturnFocus = null" />
    <UserStaffReportDrawer :visible="staffReportOpen" :user="staffReportUser" :return-focus="staffReportReturnFocus" @close="staffReportOpen = false" @closed="staffReportUser = null; staffReportReturnFocus = null" />
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

    <AdminDialog :open="unifiedCancelRendered" :lifecycle="unifiedCancelLifecycle" title="取消用户点控" title-id="unified-user-control-cancel-title" testid="unified-user-control-cancel-dialog" :width="448" plain>
      <template #subtitle>{{ displayedUnifiedCancelData.user?.username }} · UID {{ userIdOf(displayedUnifiedCancelData.user) }}</template>
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
                  <span class="text-sm font-medium text-slate-800"><span aria-hidden="true" class="text-rose-500 mr-1">*</span>取消点控备注</span>
                  <AdminTextarea v-model="cancelNote" :disabled="!cancelControlItems.length" rows="2" maxlength="200" placeholder="请填写取消点控原因，便于后续审计" class="mt-2 w-full" />
                  <span class="mt-1 block text-xs" :class="cancelNote.trim() ? 'text-slate-500' : 'text-rose-600'">
                    {{ cancelNote.trim() ? '确认后将直接取消点控' : '取消点控备注必填' }}
                  </span>
                </label>
              </div>
              <footer class="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
                <AdminButton :ref="element => { unifiedCancelReturnRef = nativeControl(element) }" type="button" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700" @click="closeControlCancel">返回</AdminButton>
                <AdminButton type="button" :disabled="unifiedCancelPhase !== 'open' || !cancelControlItems.length || !cancelNote.trim()" variant="primary" danger @click="confirmControlCancel">
                  确认取消点控
                </AdminButton>
              </footer>
    </AdminDialog>

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
  </PageShell>
</template>

<style scoped>
[data-testid="user-row-action-bar"] :deep(.ant-btn-link) { height: auto; }
</style>
