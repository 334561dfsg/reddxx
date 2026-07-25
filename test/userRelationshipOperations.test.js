import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8')
const parentResetSource = () => read('src/admin/components/user/UserParentResetDialog.vue')
const agentRoleSource = () => read('src/admin/components/user/UserAgentRoleDialog.vue')

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
