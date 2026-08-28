import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { usersList } from '../src/admin/mock/user.js'
import { __resetAgentCredentialsForTests } from '../src/admin/mock/agent.js'
import {
  __resetRelationshipAuditLogForTests,
  getAgentParentCandidates,
  getParentCandidates,
  getRelationshipAuditLog,
  setAgentParent
} from '../src/admin/repositories/userRelationshipRepository.js'
import {
  __resetDialogLayersForTests,
  registerDialogLayer,
  unregisterDialogLayer
} from '../src/admin/composables/useDialogLifecycle.js'
import { createSfcHarness, loadVueSfc, loadVueSfcModuleUrl } from './helpers/vueSfcHarness.js'

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8')
const parentResetSource = () => read('src/admin/components/user/UserParentResetDialog.vue')
const agentRoleSource = () => read('src/admin/components/user/UserAgentRoleDialog.vue')
const agentParentSource = () => read('src/admin/components/user/UserAgentParentDialog.vue')
const userListPageSource = () => read('src/pages/admin/user/UserListPage.vue')
const agentManagementSource = () => read('src/pages/admin/agent/AgentManagementPage.vue')
const agentUpgradeSource = () => read('src/admin/components/agent/AgentUpgradeDialog.vue')
const panelFile = resolve(process.cwd(), 'src/admin/components/form/PanelSingleSelect.vue')
const agentDeliveryCardFile = resolve(process.cwd(), 'src/admin/components/agent/AgentDeliveryCard.vue')
const agentUpgradeFile = resolve(process.cwd(), 'src/admin/components/agent/AgentUpgradeDialog.vue')
const parentResetFile = resolve(process.cwd(), 'src/admin/components/user/UserParentResetDialog.vue')
const agentRoleFile = resolve(process.cwd(), 'src/admin/components/user/UserAgentRoleDialog.vue')
const agentParentFile = resolve(process.cwd(), 'src/admin/components/user/UserAgentParentDialog.vue')
const relationshipDrawerFile = resolve(process.cwd(), 'src/admin/components/user/UserRelationshipDrawer.vue')
const teamReportDrawerFile = resolve(process.cwd(), 'src/admin/components/user/UserTeamReportDrawer.vue')
const operationDrawerFile = resolve(process.cwd(), 'src/admin/components/user/UserOperationDrawer.vue')
const compactPaginationFile = resolve(process.cwd(), 'src/admin/components/CompactPagination.vue')

const userById = (id) => usersList.find((user) => user.id === id)
const snapshot = (user) => ({ ...user })
const restore = (before) => Object.assign(userById(before.id), before)

const loadDialog = async (dialogFile) => {
  const panelModuleUrl = loadVueSfcModuleUrl(panelFile)
  const agentDeliveryCardModuleUrl = loadVueSfcModuleUrl(agentDeliveryCardFile)
  return loadVueSfc(dialogFile, { vueImports: { [panelFile]: panelModuleUrl, [agentDeliveryCardFile]: agentDeliveryCardModuleUrl } })
}

const loadAgentUpgradeDialog = async () => {
  const agentDeliveryCardModuleUrl = loadVueSfcModuleUrl(agentDeliveryCardFile)
  return loadVueSfc(agentUpgradeFile, { vueImports: { [agentDeliveryCardFile]: agentDeliveryCardModuleUrl } })
}

const reopen = async (harness) => {
  harness.props.visible = false
  await harness.flush()
  await harness.finishTransitions()
  harness.props.visible = true
  await harness.flush()
  await harness.finishTransitions()
}

const inputValue = async (harness, node, value) => {
  node.value = value
  node.dispatchEvent({ type: 'input', target: node })
  await harness.flush()
}

const selectOptions = (harness) => harness.allNodes().filter((node) => (
  node.getAttribute?.('role') === 'option'
))

const fieldsetWithLegend = (harness, legendText) => harness.allNodes().find((node) => (
  node.tag === 'fieldset' &&
  harness.allNodes().some((candidate) => (
    candidate.tag === 'legend' &&
    node.contains(candidate) &&
    candidate.textContent.trim() === legendText
  ))
))

const memberButtons = (harness) => harness.allNodes().filter((node) => (
  node.tag === 'button' && /UID user_/.test(node.textContent)
))

const loadRelationshipDrawer = async () => {
  const compactPaginationModuleUrl = loadVueSfcModuleUrl(compactPaginationFile)
  return loadVueSfc(relationshipDrawerFile, { vueImports: { [compactPaginationFile]: compactPaginationModuleUrl } })
}

const loadTeamReportDrawer = async () => {
  const compactPaginationModuleUrl = loadVueSfcModuleUrl(compactPaginationFile)
  return loadVueSfc(teamReportDrawerFile, { vueImports: { [compactPaginationFile]: compactPaginationModuleUrl } })
}

const addPaginationFissionTree = () => {
  const startIndex = usersList.length
  const root = {
    id: 'user_pagination_root',
    username: 'pagination_root',
    email: 'pagination-root@example.com',
    role: 'agent',
    status: 'active',
    balance: 0,
    frozenBalance: 0,
    totalProfit: 0,
    tradingVolume: 0,
    parentId: null,
    parentUsername: null,
    registerTime: '2026-01-01T00:00:00.000Z'
  }
  const members = Array.from({ length: 22 }, (_, index) => ({
    id: `user_pagination_${String(index + 1).padStart(2, '0')}`,
    username: `pagination_member_${String(index + 1).padStart(2, '0')}`,
    email: `pagination-member-${index + 1}@example.com`,
    role: 'user',
    status: 'active',
    balance: index + 1,
    frozenBalance: 0,
    totalProfit: 0,
    tradingVolume: 0,
    parentId: root.id,
    parentUsername: root.username,
    registerTime: '2026-01-01T00:00:00.000Z'
  }))
  usersList.push(root, ...members)
  return { root, members, remove: () => usersList.splice(startIndex) }
}

const visiblePaginationMemberIds = (harness) => memberButtons(harness)
  .map((button) => button.textContent.match(/UID (user_pagination_\d+)/)?.[1])
  .filter(Boolean)

test('relationship drawer paginates members and resets selection and page for changed list contexts', async (t) => {
  const tree = addPaginationFissionTree()
  const component = await loadRelationshipDrawer()
  const harness = await createSfcHarness(component, { visible: true, user: tree.root, mode: 'direct' })
  t.after(() => {
    harness.cleanup()
    tree.remove()
  })
  await harness.finishTransitions()

  const controls = harness.findByTestId('relationship-drawer-controls')
  const list = harness.findByTestId('relationship-member-scroll')
  const pagination = harness.findByTestId('relationship-drawer-pagination')
  const search = harness.allNodes().find((node) => node.tag === 'input' && node.getAttribute('type') === 'search')
  const statusFilterToggle = harness.findByTestId('relationship-drawer-status-filter-toggle')
  const roleFilterToggle = harness.findByTestId('relationship-drawer-role-filter-toggle')
  assert.equal(controls.contains(search), true)
  assert.equal(statusFilterToggle.getAttribute('aria-expanded'), 'false')
  assert.equal(roleFilterToggle.getAttribute('aria-expanded'), 'false')
  statusFilterToggle.click()
  await harness.flush()
  const statusFilterPanel = harness.findByTestId('relationship-drawer-status-filter-panel')
  const statusGroup = fieldsetWithLegend(harness, '账户状态')
  assert.equal(statusFilterToggle.getAttribute('aria-expanded'), 'true')
  assert.equal(roleFilterToggle.getAttribute('aria-expanded'), 'false')
  assert.equal(statusFilterPanel.classList.contains('fixed'), true)
  assert.equal(statusFilterPanel.classList.contains('z-20'), true)
  assert.equal(controls.contains(statusFilterPanel), false)
  assert.equal(controls.contains(statusGroup), false)
  assert.equal(list.contains(statusFilterPanel), false)
  assert.equal(pagination.contains(statusFilterPanel), false)

  roleFilterToggle.click()
  await harness.flush()
  const roleFilterPanel = harness.findByTestId('relationship-drawer-role-filter-panel')
  const roleGroup = fieldsetWithLegend(harness, '用户角色')
  assert.equal(Boolean(harness.findByTestId('relationship-drawer-status-filter-panel')), false)
  assert.equal(statusFilterToggle.getAttribute('aria-expanded'), 'false')
  assert.equal(roleFilterToggle.getAttribute('aria-expanded'), 'true')
  assert.equal(roleFilterPanel.classList.contains('fixed'), true)
  assert.equal(roleFilterPanel.classList.contains('z-20'), true)
  assert.equal(controls.contains(roleFilterPanel), false)
  assert.equal(controls.contains(roleGroup), false)
  assert.equal(list.contains(roleFilterPanel), false)
  assert.equal(pagination.contains(roleFilterPanel), false)
  roleFilterToggle.click()
  await harness.flush()
  assert.equal(list.contains(memberButtons(harness)[0]), true)
  assert.equal(pagination.contains(harness.findByTestId('compact-pagination-summary')), true)
  assert.equal(list.contains(harness.findByTestId('compact-pagination-summary')), false)

  assert.deepEqual(visiblePaginationMemberIds(harness), [
    'user_pagination_01', 'user_pagination_02', 'user_pagination_03', 'user_pagination_04', 'user_pagination_05',
    'user_pagination_06', 'user_pagination_07', 'user_pagination_08', 'user_pagination_09', 'user_pagination_10'
  ])
  assert.equal(harness.findByTestId('compact-pagination-summary')?.textContent.trim(), '共 22 条 · 第 1 / 3 页')

  memberButtons(harness)[0].click()
  await harness.flush()
  assert.ok(harness.allNodes().some((node) => node.textContent.includes('已选择裂变下级 pagination_member_01')))

  const nextPage = harness.findByText('下一页', 'button')
  assert.ok(nextPage, 'pagination exposes a next-page control when more members exist')
  nextPage.click()
  await harness.flush()
  assert.deepEqual(visiblePaginationMemberIds(harness), [
    'user_pagination_11', 'user_pagination_12', 'user_pagination_13', 'user_pagination_14', 'user_pagination_15',
    'user_pagination_16', 'user_pagination_17', 'user_pagination_18', 'user_pagination_19', 'user_pagination_20'
  ])
  assert.equal(harness.allNodes().some((node) => node.textContent.includes('已选择裂变下级')), false)

  memberButtons(harness)[0].click()
  await harness.flush()
  assert.ok(harness.allNodes().some((node) => node.textContent.includes('已选择裂变下级 pagination_member_11')))

  await inputValue(harness, search, 'pagination_member')
  assert.equal(harness.findByTestId('compact-pagination-summary')?.textContent.trim(), '共 22 条 · 第 1 / 3 页')
  assert.equal(harness.allNodes().some((node) => node.textContent.includes('已选择裂变下级')), false)

  harness.findByText('下一页', 'button').click()
  await harness.flush()
  statusFilterToggle.click()
  await harness.flush()
  harness.findByText('活跃', 'button').click()
  await harness.flush()
  assert.equal(harness.findByTestId('compact-pagination-summary')?.textContent.trim(), '共 22 条 · 第 1 / 3 页')

  harness.findByText('下一页', 'button').click()
  await harness.flush()
  roleFilterToggle.click()
  await harness.flush()
  harness.findByText('普通用户', 'button').click()
  await harness.flush()
  assert.equal(harness.findByTestId('compact-pagination-summary')?.textContent.trim(), '共 22 条 · 第 1 / 3 页')

  harness.findByText('下一页', 'button').click()
  await harness.flush()
  harness.props.mode = 'all'
  await harness.flush()
  assert.equal(harness.findByTestId('compact-pagination-summary')?.textContent.trim(), '共 22 条 · 第 1 / 3 页')

  harness.findByText('下一页', 'button').click()
  await harness.flush()
  harness.props.user = tree.members[0]
  await harness.flush()
  assert.equal(list.classList.contains('pb-[max(1rem,env(safe-area-inset-bottom))]'), true)
  assert.equal(list.contains(harness.findByText('当前没有裂变下级')), true)
  assert.equal(harness.findByTestId('compact-pagination-summary'), undefined)
  harness.props.user = tree.root
  await harness.flush()
  assert.equal(harness.findByTestId('compact-pagination-summary')?.textContent.trim(), '共 22 条 · 第 1 / 3 页')

  harness.props.visible = false
  await harness.finishTransitions()
  harness.props.visible = true
  await harness.finishTransitions()
  assert.equal(harness.findByTestId('compact-pagination-summary')?.textContent.trim(), '共 22 条 · 第 1 / 3 页')
})

test('team report drawer paginates direct fission branches', async (t) => {
  const tree = addPaginationFissionTree()
  const component = await loadTeamReportDrawer()
  const harness = await createSfcHarness(component, { visible: true, user: tree.root })
  t.after(() => {
    harness.cleanup()
    tree.remove()
  })
  await harness.finishTransitions()

  const overview = harness.findByTestId('team-report-overview-scroll')
  const branchHeader = harness.findByTestId('team-report-branch-header')
  const branchScroll = harness.findByTestId('team-report-branch-scroll')
  const pagination = harness.findByTestId('team-report-pagination')
  assert.ok(overview, 'team overview has a bounded scrolling region')
  assert.ok(branchHeader, 'team branch title remains in a fixed header region')
  assert.ok(branchScroll, 'team branches have an independent scrolling region')
  assert.ok(pagination, 'team pagination remains in a fixed footer region')
  assert.equal(overview.getAttribute('role'), 'region')
  assert.equal(overview.getAttribute('aria-labelledby'), 'team-report-overview-title')
  assert.equal(overview.getAttribute('tabindex'), '0')
  assert.equal(branchScroll.getAttribute('role'), 'region')
  assert.equal(branchScroll.getAttribute('aria-labelledby'), 'team-report-branch-title')
  assert.equal(branchScroll.getAttribute('tabindex'), '0')
  assert.equal(overview.classList.contains('min-h-0'), true)
  assert.equal(overview.classList.contains('shrink'), true)
  assert.equal(overview.classList.contains('shrink-0'), false)
  assert.equal(branchScroll.classList.contains('min-h-20'), true)
  for (const region of [overview, branchScroll]) {
    assert.equal(region.classList.contains('outline-none'), true)
    assert.equal(region.classList.contains('focus-visible:ring-2'), true)
    assert.equal(region.classList.contains('focus-visible:ring-blue-500'), true)
  }
  const overviewMetrics = harness.allNodes().filter((node) => (
    overview.contains(node) && node.getAttribute?.('data-testid') === 'team-report-metric'
  ))
  const visibleBranchArticles = harness.allNodes().filter((node) => node.tag === 'article')
  const paginationSummary = harness.findByTestId('compact-pagination-summary')
  assert.equal(overviewMetrics.length, 7)
  assert.doesNotMatch(overview.textContent, /裂变活跃人数/)
  assert.equal(branchScroll.contains(visibleBranchArticles[0]), true)
  assert.equal(branchScroll.contains(branchHeader), false)
  assert.equal(branchScroll.contains(paginationSummary), false)
  assert.equal(overview.contains(visibleBranchArticles[0]), false)
  assert.equal(pagination.contains(paginationSummary), true)
  assert.equal(overview.contains(paginationSummary), false)

  const visibleBranches = () => harness.allNodes()
    .filter((node) => node.tag === 'article')
    .map((branch) => branch.textContent.match(/pagination_member_\d+/)?.[0])
  assert.deepEqual(visibleBranches(), [
    'pagination_member_01', 'pagination_member_02', 'pagination_member_03', 'pagination_member_04', 'pagination_member_05',
    'pagination_member_06', 'pagination_member_07', 'pagination_member_08', 'pagination_member_09', 'pagination_member_10'
  ])
  assert.equal(harness.findByTestId('compact-pagination-summary')?.textContent.trim(), '共 22 条 · 第 1 / 3 页')

  const nextPage = harness.findByText('下一页', 'button')
  assert.ok(nextPage, 'pagination exposes a next-page control when more branches exist')
  nextPage.click()
  await harness.flush()
  assert.deepEqual(visibleBranches(), [
    'pagination_member_11', 'pagination_member_12', 'pagination_member_13', 'pagination_member_14', 'pagination_member_15',
    'pagination_member_16', 'pagination_member_17', 'pagination_member_18', 'pagination_member_19', 'pagination_member_20'
  ])

  harness.findByText('下一页', 'button').click()
  await harness.flush()
  assert.deepEqual(visibleBranches(), ['pagination_member_21', 'pagination_member_22'])
  assert.equal(harness.findByTestId('compact-pagination-summary')?.textContent.trim(), '共 22 条 · 第 3 / 3 页')

  harness.props.user = tree.members[0]
  await harness.flush()
  assert.equal(harness.findByTestId('compact-pagination-summary'), undefined)
  harness.props.user = tree.root
  await harness.flush()
  assert.equal(harness.findByTestId('compact-pagination-summary')?.textContent.trim(), '共 22 条 · 第 1 / 3 页')
})

test('team report Drawer pads the whole-report empty region for the bottom safe area exactly once', async (t) => {
  const tree = addPaginationFissionTree()
  const component = await loadTeamReportDrawer()
  const harness = await createSfcHarness(component, { visible: true, user: tree.members[0] })
  t.after(() => {
    harness.cleanup()
    tree.remove()
  })
  await harness.finishTransitions()

  const body = harness.findByTestId('team-report-drawer-body')
  const emptyState = harness.findByTestId('team-report-empty-state')
  const safeBottomClass = 'pb-[max(1rem,env(safe-area-inset-bottom))]'
  assert.ok(emptyState)
  assert.equal(emptyState.classList.contains(safeBottomClass), true)
  assert.equal(body.classList.contains(safeBottomClass), false)
  assert.equal(emptyState.getAttribute('tabindex'), null)
  assert.equal(harness.findByTestId('team-report-pagination'), undefined)
})

test('operation and paginated fission Drawers protect both landscape safe-area edges', () => {
  for (const file of [operationDrawerFile, relationshipDrawerFile, teamReportDrawerFile]) {
    const source = readFileSync(file, 'utf8')
    assert.match(source, /<header[^>]*safe-area-inset-left/)
    assert.match(source, /<header[^>]*safe-area-inset-right/)
    assert.match(source, /data-testid="[^"]*(?:drawer-body|report-drawer-body)"[^>]*safe-area-inset-left/)
    assert.match(source, /data-testid="[^"]*(?:drawer-body|report-drawer-body)"[^>]*safe-area-inset-right/)
  }
})

test('relationship filter popup escapes the clipped Drawer and stays reachable in the visual viewport', async (t) => {
  const component = await loadRelationshipDrawer()
  const harness = await createSfcHarness(component, {
    visible: true,
    user: userById('user_1003'),
    mode: 'direct'
  })
  const originalViewportProperties = Object.fromEntries(
    ['innerWidth', 'innerHeight', 'visualViewport'].map((property) => [
      property,
      Object.getOwnPropertyDescriptor(globalThis.window, property)
    ])
  )
  let upperLayer = null
  t.after(() => {
    if (upperLayer) unregisterDialogLayer(upperLayer)
    for (const [property, descriptor] of Object.entries(originalViewportProperties)) {
      if (descriptor) Object.defineProperty(globalThis.window, property, descriptor)
      else delete globalThis.window[property]
    }
    harness.cleanup()
    __resetDialogLayersForTests()
  })
  await harness.finishTransitions()

  globalThis.window.innerWidth = 1024
  globalThis.window.innerHeight = 720
  globalThis.window.visualViewport = {
    width: 320,
    height: 170,
    offsetLeft: 20,
    offsetTop: 160
  }
  const trigger = harness.findByTestId('relationship-drawer-status-filter-toggle')
  trigger.getBoundingClientRect = () => ({
    top: 250,
    right: 460,
    bottom: 294,
    left: 280,
    width: 180,
    height: 44
  })
  trigger.click()
  await harness.flush()

  const popupLayer = harness.findByTestId('relationship-drawer-popup-layer')
  const drawerBody = harness.findByTestId('relationship-drawer-body')
  const panel = harness.findByTestId('relationship-drawer-status-filter-panel')
  assert.ok(popupLayer, 'Drawer exposes its viewport-fixed popup layer')
  assert.equal(panel.parent, popupLayer)
  assert.equal(popupLayer.contains(panel), true)
  assert.equal(drawerBody.contains(panel), false)
  assert.equal(panel.getAttribute('data-placement'), 'top')
  assert.equal(panel.style.position, 'fixed')
  assert.match(panel.style.left, /44px/)
  assert.match(panel.style.top, /168px/)
  assert.match(panel.style.width, /288px/)
  assert.match(panel.style.maxHeight, /76px/)
  assert.equal(panel.style.overflowY, 'auto')

  upperLayer = registerDialogLayer(harness.root)
  assert.equal(popupLayer.inert, true, 'popup follows its owning Drawer when a higher modal layer opens')
  unregisterDialogLayer(upperLayer)
  upperLayer = null
  assert.equal(popupLayer.inert, false)

  const popupOptions = harness.allNodes().filter((node) => node.tag === 'button' && panel.contains(node))
  const roleTrigger = harness.findByTestId('relationship-drawer-role-filter-toggle')
  roleTrigger.focus()
  const tabIntoPopup = {
    type: 'keydown',
    key: 'Tab',
    shiftKey: false,
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault() { this.defaultPrevented = true },
    stopPropagation() { this.propagationStopped = true }
  }
  roleTrigger.dispatchEvent(tabIntoPopup)
  assert.equal(tabIntoPopup.defaultPrevented, true)
  assert.equal(tabIntoPopup.propagationStopped, true)
  assert.equal(harness.document.activeElement, popupOptions[0])

  const escapePopup = {
    type: 'keydown',
    key: 'Escape',
    target: popupOptions[0],
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault() { this.defaultPrevented = true },
    stopPropagation() { this.propagationStopped = true }
  }
  panel.dispatchEvent(escapePopup)
  await harness.flush()
  assert.equal(escapePopup.defaultPrevented, true)
  assert.equal(escapePopup.propagationStopped, true)
  assert.equal(trigger.getAttribute('aria-expanded'), 'false')
  assert.equal(harness.document.activeElement, trigger)
})

test('relationship filters are compact two-column menus that preserve exact status and role filtering', async (t) => {
  const agentChildBefore = snapshot(userById('user_1004'))
  userById('user_1004').role = 'agent'
  const component = await loadVueSfc(relationshipDrawerFile)
  const harness = await createSfcHarness(component, {
    visible: true,
    user: userById('user_1003'),
    mode: 'direct'
  })
  t.after(() => {
    harness.cleanup()
    restore(agentChildBefore)
  })
  await harness.finishTransitions()

  const statusFilterToggle = harness.findByTestId('relationship-drawer-status-filter-toggle')
  const roleFilterToggle = harness.findByTestId('relationship-drawer-role-filter-toggle')
  statusFilterToggle.click()
  await harness.flush()
  const statusGroup = fieldsetWithLegend(harness, '账户状态')
  assert.ok(statusGroup)
  const scrollBody = harness.findByTestId('relationship-drawer-body')
  assert.equal(scrollBody.contains(statusGroup), false)
  assert.equal(harness.findByTestId('relationship-drawer-popup-layer').contains(statusGroup), true)

  const statusOptions = statusGroup.children.find((node) => node.tag === 'div')
  assert.ok(statusOptions.classList.contains('grid'))
  assert.ok(statusOptions.classList.contains('grid-cols-2'))
  assert.ok(harness.allNodes().filter((node) => node.tag === 'button' && statusGroup.contains(node)).every((button) => button.hasAttribute('aria-pressed')))

  const allStatus = harness.findByText('全部状态', 'button')
  const bannedStatus = harness.findByText('禁用', 'button')
  assert.equal(allStatus.getAttribute('aria-pressed'), 'true')
  bannedStatus.click()
  await harness.flush()
  assert.deepEqual(memberButtons(harness).map((button) => button.textContent.match(/banned_user/)?.[0]), ['banned_user'])

  statusFilterToggle.click()
  await harness.flush()
  const allStatusAgain = harness.findByText('全部状态', 'button')
  assert.equal(allStatusAgain.getAttribute('aria-pressed'), 'false')
  allStatusAgain.click()
  await harness.flush()
  roleFilterToggle.click()
  await harness.flush()
  const roleGroup = fieldsetWithLegend(harness, '用户角色')
  assert.ok(roleGroup)
  const roleOptions = roleGroup.children.find((node) => node.tag === 'div')
  assert.ok(roleOptions.classList.contains('grid'))
  assert.ok(roleOptions.classList.contains('grid-cols-2'))
  assert.ok(harness.allNodes().filter((node) => node.tag === 'button' && roleGroup.contains(node)).every((button) => button.hasAttribute('aria-pressed')))

  const agentRole = harness.findByText('代理', 'button')
  agentRole.click()
  await harness.flush()
  roleFilterToggle.click()
  await harness.flush()
  assert.equal(harness.findByText('代理', 'button').getAttribute('aria-pressed'), 'true')
  assert.deepEqual(memberButtons(harness).map((button) => button.textContent.match(/user_chen/)?.[0]), ['user_chen'])
})

test('parent and successor selectors use the shared committed-value combobox rather than native selects', () => {
  for (const source of [parentResetSource(), agentRoleSource()]) {
    assert.match(source, /import PanelSingleSelect from '\.\.\/form\/PanelSingleSelect\.vue'/)
    assert.doesNotMatch(source, /<select\b/)
    assert.match(source, /<PanelSingleSelect/)
  }

  assert.match(parentResetSource(), /v-model="form\.parentId"/)
  assert.match(agentRoleSource(), /v-model="form\.successorParentId"/)
})

test('parent reset keeps search inside the combobox and indexes candidate username, email, and UID', () => {
  const source = parentResetSource()

  assert.doesNotMatch(source, /form\.search/)
  assert.doesNotMatch(source, /searchRef/)
  assert.doesNotMatch(source, /搜索新上级<\/span>/)
  assert.match(source, /search-label="搜索新裂变上级用户"/)
  assert.match(source, /searchText:\s*\[candidate\.username, candidate\.email, candidate\.id\]\.join\(' '\)/)
  assert.match(source, /label:\s*`\$\{candidate\.username\} · UID \$\{candidate\.id\}`/)
  assert.match(source, /value:\s*''[\s\S]*label:\s*'设为无裂变上级'/)
})

test('relationship surfaces consistently identify fission relationships without changing their data contracts', () => {
  const relationshipSource = read('src/admin/components/user/UserRelationshipDrawer.vue')
  const parentReset = parentResetSource()
  const teamReport = read('src/admin/components/user/UserTeamReportDrawer.vue')

  assert.match(relationshipSource, /查看直属裂变下级/)
  assert.match(relationshipSource, /查看全部裂变下级/)
  assert.match(relationshipSource, /搜索裂变下级/)
  assert.match(relationshipSource, /直属裂变上级/)
  assert.match(relationshipSource, /当前没有裂变下级/)

  assert.match(parentReset, /重设裂变上级/)
  assert.match(parentReset, /当前裂变上级/)
  assert.match(parentReset, /新裂变上级/)
  assert.match(parentReset, /搜索新裂变上级用户/)
  assert.match(parentReset, /确认重设裂变上级/)
  assert.match(parentReset, /重设裂变上级失败/)
  assert.match(parentReset, /parentId: form\.parentId \|\| null/)

  assert.match(teamReport, />裂变团队报表</)
  assert.match(teamReport, /裂变团队概览/)
  assert.match(teamReport, /直属裂变分支明细/)
  assert.match(teamReport, /当前没有裂变团队成员/)
})

test('successor selector uses concise subordinate terms while retaining the enabled no-parent option', () => {
  const source = agentRoleSource()

  assert.match(source, /直属下级/)
  assert.match(source, /label="承接上级"/)
  assert.match(source, /search-label="搜索承接上级用户"/)
  assert.match(source, /取消代理后，{{ directChildren\.length }} 个直属下级将统一转移到此上级。/)
  assert.match(source, /影响成员.*直属下级/)
  assert.match(source, /承接上级.*无上级/)
  assert.doesNotMatch(source, /直属裂变下级/)
  assert.doesNotMatch(source, /承接裂变上级/)
  assert.match(source, /searchText:\s*\[candidate\.username, candidate\.email, candidate\.id\]\.join\(' '\)/)
  assert.match(source, /value:\s*''[\s\S]*label:\s*'全部设为无上级'[\s\S]*disabled:\s*false/)
  assert.match(source, /required/)
  assert.match(source, /invalid=/)
})

test('selector changes preserve the exact parent-reset and agent-role payload fields', () => {
  assert.match(parentResetSource(), /resetParent\(\{[\s\S]*userId: userId\.value,[\s\S]*parentId: form\.parentId \|\| null,[\s\S]*reason: form\.reason/)
  assert.match(agentRoleSource(), /if \(needsSuccessor\.value\) payload\.successorParentId = form\.successorParentId \|\| null/)
})

test('agent creation entries reuse the shared upgrade dialog and delivery card', () => {
  assert.match(userListPageSource(), /import AgentUpgradeDialog/)
  assert.match(userListPageSource(), /<AgentUpgradeDialog[\s\S]*:initial-user-id="userIdOf\(agentUpgradeUser\)"/)
  assert.match(userListPageSource(), /if \(!isAgentUser\(user\)\)[\s\S]*agentUpgradeOpen\.value = true/)
  assert.match(agentManagementSource(), /import AgentUpgradeDialog/)
  assert.match(agentManagementSource(), /<AgentUpgradeDialog/)
  assert.match(agentUpgradeSource(), /useDialogLifecycle/)
  assert.match(agentUpgradeSource(), /:style="layerStyle"/)
  assert.doesNotMatch(agentUpgradeSource(), /z-\[100\]/)
  assert.doesNotMatch(agentRoleSource(), /import AgentDeliveryCard/)
  assert.doesNotMatch(agentRoleSource(), /<AgentDeliveryCard/)
  assert.doesNotMatch(agentRoleSource(), /agentApi\.upgradeToAgent/)
})

test('agent parent ownership uses only agent candidates and does not mutate fission parent', () => {
  const before = snapshot(userById('user_1004'))
  try {
    const candidates = getAgentParentCandidates('user_1004')
    assert.deepEqual(candidates.map((candidate) => candidate.role), candidates.map(() => 'agent'))
    assert.equal(candidates.some((candidate) => candidate.id === 'user_1004'), false)
    assert.equal(candidates.some((candidate) => candidate.id === before.parentId), true)

    const updated = setAgentParent({
      userId: 'user_1004',
      agentParentId: 'user_1001',
      reason: '客服调整上级代理'
    })

    assert.equal(updated.agentParentId, 'user_1001')
    assert.equal(updated.agentParentUsername, 'agent_wang')
    assert.equal(updated.parentId, before.parentId)
    assert.equal(updated.parentUsername, before.parentUsername)
  } finally {
    restore(before)
    __resetRelationshipAuditLogForTests()
  }
})

test('agent parent Dialog keeps agent ownership separate from fission wording', () => {
  const source = agentParentSource()
  assert.match(source, /设置上级代理/)
  assert.match(source, /当前上级代理/)
  assert.match(source, /新上级代理/)
  assert.match(source, /getAgentParentCandidates/)
  assert.match(source, /setAgentParent/)
  assert.doesNotMatch(source, /裂变/)
  assert.doesNotMatch(source, /resetParent/)
})

test('agent account settings exposes MFA reset and submits it with the shared delivery result', () => {
  const source = agentManagementSource()
  assert.match(source, /resetMfa: false/)
  assert.match(source, /重设 MFA/)
  assert.match(source, /v-model="accountForm\.resetMfa"/)
  assert.match(source, /resetMfa: accountForm\.value\.resetMfa/)
  assert.match(source, /代理登录账号设置[\s\S]*max-w-2xl/)
  assert.match(source, /<AgentDeliveryCard[\s\S]*title="账号设置已保存，以下信息可发送给代理"/)
})

test('parent-reset mounts the real combobox, preserves drafts, and returns focus to its trigger', async (t) => {
  const userBefore = snapshot(userById('user_1003'))
  const component = await loadDialog(parentResetFile)
  const harness = await createSfcHarness(component, { visible: true, user: userById('user_1003') })
  t.after(() => {
    harness.cleanup()
    restore(userBefore)
    __resetRelationshipAuditLogForTests()
  })
  __resetRelationshipAuditLogForTests()
  await reopen(harness)

  const trigger = harness.findByTestId('panel-single-select-trigger')
  assert.equal(harness.document.activeElement, trigger)
  trigger.click()
  await harness.flush()
  const candidate = getParentCandidates('user_1003')[0]
  const search = harness.findByTestId('panel-single-select-search')
  await inputValue(harness, search, candidate.email)
  assert.equal(selectOptions(harness).length, 1)
  search.dispatchEvent({ type: 'keydown', key: 'ArrowDown', preventDefault() {}, stopPropagation() {} })
  await harness.flush()
  assert.equal(getRelationshipAuditLog().length, 0)
  assert.doesNotMatch(trigger.textContent, new RegExp(candidate.username))

  await inputValue(harness, search, '')
  selectOptions(harness).find((option) => option.textContent.includes(candidate.username)).click()
  await harness.flush()
  assert.match(trigger.textContent, new RegExp(candidate.username))

  await inputValue(harness, harness.allNodes().find((node) => node.tag === 'textarea'), '关系调整')
  harness.findByText('下一步', 'button').click()
  await harness.flush()
  harness.findByText('返回修改', 'button').click()
  await harness.flush()
  assert.equal(harness.document.activeElement, harness.findByTestId('panel-single-select-trigger'))
  assert.equal(getRelationshipAuditLog().length, 0)
})

test('shared agent upgrade dialog shows copyable delivery after initial UID creation', async (t) => {
  const userBefore = snapshot(userById('user_1002'))
  const component = await loadAgentUpgradeDialog()
  let savedPayload = null
  const harness = await createSfcHarness(component, {
    visible: true,
    initialUserId: 'user_1002'
  }, {
    onSaved: (payload) => { savedPayload = payload }
  })
  t.after(() => {
    harness.cleanup()
    restore(userBefore)
    __resetAgentCredentialsForTests()
  })
  __resetAgentCredentialsForTests()
  await harness.finishTransitions()
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 230))
  await harness.flush()

  assert.match(harness.document.body.textContent, /已选中：vip_zhang · UID 1002/)
  harness.findByText('确认添加', 'button').click()
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 560))
  await harness.flush()

  assert.equal(savedPayload?.delivery?.loginAccount, 'zhang@vip.com')
  assert.match(harness.document.body.textContent, /代理创建成功，以下信息可发送给代理/)
  assert.ok(harness.findByText('复制通知内容', 'button'))
  assert.match(harness.document.body.textContent, /登录账号：zhang@vip.com/)
  assert.match(harness.document.body.textContent, /初始密码：/)
  assert.match(harness.document.body.textContent, /MFA 绑定二维码/)
  assert.match(harness.document.body.textContent, /截图发送给代理/)
  assert.doesNotMatch(harness.document.body.textContent, /登录入口/)
  assert.doesNotMatch(harness.document.body.textContent, /\/agent-system\/login/)
  const qrImage = harness.allNodes().find((node) => node.tag === 'img' && node.getAttribute('alt') === 'MFA 绑定二维码')
  assert.match(qrImage?.getAttribute('src') || '', /^https:\/\/api\.qrserver\.com\/v1\/create-qr-code\//)
})

test('parent-reset associates orphaned selection errors with the trigger without linking reason errors', async (t) => {
  const userBefore = snapshot(userById('user_1003'))
  const component = await loadDialog(parentResetFile)
  const harness = await createSfcHarness(component, { visible: true, user: userById('user_1003') })
  t.after(() => {
    harness.cleanup()
    restore(userBefore)
    __resetRelationshipAuditLogForTests()
  })
  await reopen(harness)

  const trigger = harness.findByTestId('panel-single-select-trigger')
  assert.equal(trigger.getAttribute('aria-invalid'), 'true')
  assert.match(trigger.getAttribute('aria-describedby'), /parent-reset-parent-error/)
  assert.ok(harness.findByTestId('parent-reset-parent-error'))

  await inputValue(harness, harness.allNodes().find((node) => node.tag === 'textarea'), '关系调整')
  harness.findByText('下一步', 'button').click()
  await harness.flush()
  assert.match(trigger.getAttribute('aria-describedby'), /parent-reset-parent-error/)
  assert.equal(getRelationshipAuditLog().length, 0)
})

test('agent-role blocks null and disabled successors until the enabled no-parent option is committed', async (t) => {
  const userBefore = snapshot(userById('user_1003'))
  const childBefore = usersList.filter((user) => user.parentId === 'user_1003').map(snapshot)
  const disabledCandidate = getParentCandidates('user_1003')[0]
  disabledCandidate.disabled = true
  const component = await loadDialog(agentRoleFile)
  const harness = await createSfcHarness(component, { visible: true, user: userById('user_1003') })
  t.after(() => {
    harness.cleanup()
    restore(userBefore)
    childBefore.forEach(restore)
    delete disabledCandidate.disabled
    __resetRelationshipAuditLogForTests()
  })
  __resetRelationshipAuditLogForTests()
  await reopen(harness)

  const trigger = harness.findByTestId('panel-single-select-trigger')
  assert.equal(trigger.getAttribute('aria-invalid'), 'true')
  assert.match(trigger.getAttribute('aria-describedby'), /agent-role-successor-parent-error/)
  assert.ok(harness.findByTestId('agent-role-successor-parent-error'))

  await inputValue(harness, harness.allNodes().find((node) => node.tag === 'textarea'), '代理关系调整')
  harness.findByText('下一步', 'button').click()
  await harness.flush()
  assert.equal(getRelationshipAuditLog().length, 0)

  trigger.click()
  await harness.flush()
  const disabledOption = selectOptions(harness).find((option) => option.textContent.includes(disabledCandidate.username))
  disabledOption.click()
  await harness.flush()
  assert.equal(getRelationshipAuditLog().length, 0)
  assert.equal(trigger.getAttribute('aria-invalid'), 'true')

  selectOptions(harness).find((option) => option.textContent.includes('全部设为无上级')).click()
  await harness.finishTransitions()
  assert.equal(trigger.getAttribute('aria-invalid'), 'false')
  harness.findByText('下一步', 'button').click()
  await harness.flush()
  harness.findByText('确认取消代理身份', 'button').click()
  await harness.flush()
  assert.equal(getRelationshipAuditLog().length, 1)
})
