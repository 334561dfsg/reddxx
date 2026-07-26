import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { usersList } from '../src/admin/mock/user.js'
import {
  __resetRelationshipAuditLogForTests,
  getParentCandidates,
  getRelationshipAuditLog
} from '../src/admin/repositories/userRelationshipRepository.js'
import { createSfcHarness, loadVueSfc, loadVueSfcModuleUrl } from './helpers/vueSfcHarness.js'

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8')
const parentResetSource = () => read('src/admin/components/user/UserParentResetDialog.vue')
const agentRoleSource = () => read('src/admin/components/user/UserAgentRoleDialog.vue')
const panelFile = resolve(process.cwd(), 'src/admin/components/form/PanelSingleSelect.vue')
const parentResetFile = resolve(process.cwd(), 'src/admin/components/user/UserParentResetDialog.vue')
const agentRoleFile = resolve(process.cwd(), 'src/admin/components/user/UserAgentRoleDialog.vue')
const relationshipDrawerFile = resolve(process.cwd(), 'src/admin/components/user/UserRelationshipDrawer.vue')
const teamReportDrawerFile = resolve(process.cwd(), 'src/admin/components/user/UserTeamReportDrawer.vue')
const operationDrawerFile = resolve(process.cwd(), 'src/admin/components/user/UserOperationDrawer.vue')
const compactPaginationFile = resolve(process.cwd(), 'src/admin/components/CompactPagination.vue')

const userById = (id) => usersList.find((user) => user.id === id)
const snapshot = (user) => ({ ...user })
const restore = (before) => Object.assign(userById(before.id), before)

const loadDialog = async (dialogFile) => {
  const panelModuleUrl = loadVueSfcModuleUrl(panelFile)
  return loadVueSfc(dialogFile, { vueImports: { [panelFile]: panelModuleUrl } })
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
  assert.equal(statusFilterPanel.classList.contains('absolute'), true)
  assert.equal(statusFilterPanel.classList.contains('z-20'), true)
  assert.equal(controls.contains(statusFilterPanel), true)
  assert.equal(controls.contains(statusGroup), true)
  assert.equal(list.contains(statusFilterPanel), false)
  assert.equal(pagination.contains(statusFilterPanel), false)

  roleFilterToggle.click()
  await harness.flush()
  const roleFilterPanel = harness.findByTestId('relationship-drawer-role-filter-panel')
  const roleGroup = fieldsetWithLegend(harness, '用户角色')
  assert.equal(harness.findByTestId('relationship-drawer-status-filter-panel'), undefined)
  assert.equal(statusFilterToggle.getAttribute('aria-expanded'), 'false')
  assert.equal(roleFilterToggle.getAttribute('aria-expanded'), 'true')
  assert.equal(roleFilterPanel.classList.contains('absolute'), true)
  assert.equal(roleFilterPanel.classList.contains('z-20'), true)
  assert.equal(controls.contains(roleFilterPanel), true)
  assert.equal(controls.contains(roleGroup), true)
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

test('operation and paginated fission Drawers protect both landscape safe-area edges', () => {
  for (const file of [operationDrawerFile, relationshipDrawerFile, teamReportDrawerFile]) {
    const source = readFileSync(file, 'utf8')
    assert.match(source, /<header[^>]*safe-area-inset-left/)
    assert.match(source, /<header[^>]*safe-area-inset-right/)
    assert.match(source, /data-testid="[^"]*(?:drawer-body|report-drawer-body)"[^>]*safe-area-inset-left/)
    assert.match(source, /data-testid="[^"]*(?:drawer-body|report-drawer-body)"[^>]*safe-area-inset-right/)
  }
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
  assert.equal(scrollBody.contains(statusGroup), true)

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

test('successor selector uses explicit fission relationship terms while retaining the enabled no-parent option', () => {
  const source = agentRoleSource()

  assert.match(source, /直属裂变下级/)
  assert.match(source, /label="承接裂变上级"/)
  assert.match(source, /search-label="搜索承接裂变上级用户"/)
  assert.match(source, /取消代理后，{{ directChildren\.length }} 个直属裂变下级将统一转移到此裂变上级。/)
  assert.match(source, /影响成员.*直属裂变下级/)
  assert.match(source, /承接裂变上级.*无裂变上级/)
  assert.match(source, /searchText:\s*\[candidate\.username, candidate\.email, candidate\.id\]\.join\(' '\)/)
  assert.match(source, /value:\s*''[\s\S]*label:\s*'全部设为无裂变上级'[\s\S]*disabled:\s*false/)
  assert.match(source, /required/)
  assert.match(source, /invalid=/)
})

test('selector changes preserve the exact parent-reset and agent-role payload fields', () => {
  assert.match(parentResetSource(), /resetParent\(\{[\s\S]*userId: userId\.value,[\s\S]*parentId: form\.parentId \|\| null,[\s\S]*reason: form\.reason/)
  assert.match(agentRoleSource(), /if \(needsSuccessor\.value\) payload\.successorParentId = form\.successorParentId \|\| null/)
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

  selectOptions(harness).find((option) => option.textContent.includes('全部设为无裂变上级')).click()
  await harness.finishTransitions()
  assert.equal(trigger.getAttribute('aria-invalid'), 'false')
  harness.findByText('下一步', 'button').click()
  await harness.flush()
  harness.findByText('确认取消代理身份', 'button').click()
  await harness.flush()
  assert.equal(getRelationshipAuditLog().length, 1)
})
