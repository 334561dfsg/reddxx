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

test('renders explicit Pro query-card filters, pagination, and inline details', () => {
  const source = readFileSync(
    new URL('../src/pages/admin/user/UserOperationLogPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /用户操作日志/)
  // Pro list layout (2026-11-28): draft lives in the query card; 查询 applies it, 重置 restores the defaults.
  assert.match(source, /<SearchForm name="user-operation-log-filters" :model="filters" :fields="fields" @search="search" @reset="reset"/)
  assert.match(source, /function search\(values\) \{ filters\.value = \{ \.\.\.blank\(\), \.\.\.values \}; page\.value = 1/)
  assert.match(source, /<AdminTable title="用户操作日志" v-model:page="page"/)
  for (const label of ['用户 UID', '用户名', '用户邮箱', '用户手机号', '操作人', '业务分类', '操作类型', '操作结果', '操作原因', '关联 ID', '操作日期']) {
    assert.match(source, new RegExp(`label: '${label}'`))
  }
  assert.match(source, /expandedLogId/)
  assert.match(source, /aria-expanded/)
  assert.match(source, /<Tag v-else-if="column\.key === 'result'"/)
  assert.doesNotMatch(source, /<h1|<form/)
  assert.doesNotMatch(source, /showModal|showDrawer|role="dialog"/)
})
