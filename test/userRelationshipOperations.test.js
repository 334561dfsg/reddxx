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

test('relationship filters are labelled wrapping segments that preserve exact status and role filtering', async (t) => {
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

  const statusGroup = fieldsetWithLegend(harness, '账户状态')
  const roleGroup = fieldsetWithLegend(harness, '用户角色')
  assert.ok(statusGroup)
  assert.ok(roleGroup)
  const scrollBody = harness.findByTestId('relationship-drawer-body')
  assert.equal(scrollBody.contains(statusGroup), true)
  assert.equal(scrollBody.contains(roleGroup), true)

  for (const group of [statusGroup, roleGroup]) {
    const segmentContainer = group.children.find((node) => node.tag === 'div')
    assert.ok(segmentContainer.classList.contains('flex'))
    assert.ok(segmentContainer.classList.contains('flex-wrap'))
    const segments = harness.allNodes().filter((node) => node.tag === 'button' && group.contains(node))
    assert.ok(segments.length > 1)
    assert.ok(segments.every((button) => button.hasAttribute('aria-pressed')))
  }

  const allStatus = harness.findByText('全部状态', 'button')
  const bannedStatus = harness.findByText('禁用', 'button')
  assert.equal(allStatus.getAttribute('aria-pressed'), 'true')
  bannedStatus.click()
  await harness.flush()
  assert.equal(allStatus.getAttribute('aria-pressed'), 'false')
  assert.equal(bannedStatus.getAttribute('aria-pressed'), 'true')
  assert.deepEqual(memberButtons(harness).map((button) => button.textContent.match(/banned_user/)?.[0]), ['banned_user'])

  allStatus.click()
  await harness.flush()
  const agentRole = harness.findByText('代理', 'button')
  agentRole.click()
  await harness.flush()
  assert.equal(agentRole.getAttribute('aria-pressed'), 'true')
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
  assert.match(source, /search-label="搜索新上级用户"/)
  assert.match(source, /searchText:\s*\[candidate\.username, candidate\.email, candidate\.id\]\.join\(' '\)/)
  assert.match(source, /label:\s*`\$\{candidate\.username\} · UID \$\{candidate\.id\}`/)
  assert.match(source, /value:\s*''[\s\S]*label:\s*'设为无上级'/)
})

test('successor selector indexes candidate username, email, and UID while retaining the enabled no-parent option', () => {
  const source = agentRoleSource()

  assert.match(source, /search-label="搜索承接上级用户"/)
  assert.match(source, /searchText:\s*\[candidate\.username, candidate\.email, candidate\.id\]\.join\(' '\)/)
  assert.match(source, /value:\s*''[\s\S]*label:\s*'全部设为无上级'[\s\S]*disabled:\s*false/)
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

  selectOptions(harness).find((option) => option.textContent.includes('全部设为无上级')).click()
  await harness.finishTransitions()
  assert.equal(trigger.getAttribute('aria-invalid'), 'false')
  harness.findByText('下一步', 'button').click()
  await harness.flush()
  harness.findByText('确认取消代理身份', 'button').click()
  await harness.flush()
  assert.equal(getRelationshipAuditLog().length, 1)
})
