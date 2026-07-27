import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { navTree } from '../src/admin/config/nav.js'
import { consoleRoutes } from '../src/router/modules/console.js'

test('registers user operation audit log under user management', () => {
  const usersNav = navTree.find((entry) => entry.title === '用户管理')
  const item = usersNav.children.find((entry) => entry.path === '/admin/users/operation-logs')

  assert.ok(item)
  assert.equal(item.title, '用户操作日志')
})

test('registers the user operation audit log route', () => {
  const route = consoleRoutes.find((entry) => entry.name === 'users-operation-logs')

  assert.ok(route)
  assert.equal(route.path, 'users/operation-logs')
  assert.equal(route.meta.title, '用户管理 / 用户操作日志')
})

test('renders explicit filters, visible applied filters, pagination, and inline details', () => {
  const source = readFileSync(
    new URL('../src/pages/admin/user/UserOperationLogPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /用户操作日志/)
  assert.match(source, /applyFilters/)
  assert.match(source, /appliedFilters/)
  assert.match(source, /removeAppliedFilter/)
  assert.match(source, /expandedLogId/)
  assert.match(source, /createPageNumbers/)
  assert.match(source, /aria-expanded/)
  assert.match(source, /md:hidden/)
  assert.doesNotMatch(source, /showModal|showDrawer|role="dialog"/)
})
