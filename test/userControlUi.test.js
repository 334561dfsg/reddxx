import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildUserControlPayload,
  getModuleControlOptions,
  isUserControlFormComplete
} from '../src/features/user-control/userControlForm.js'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('form helper exposes only trading outcomes for trade modules', () => {
  assert.deepEqual(getModuleControlOptions('trade').map((option) => option.value), ['profit', 'loss'])
})

test('form helper exposes only yield outcomes for finance modules', () => {
  assert.deepEqual(getModuleControlOptions('finance').map((option) => option.value), ['highYield', 'lowYield'])
})

test('form helper rejects incomplete values used by the disabled state', () => {
  assert.equal(isUserControlFormComplete({ scope: 'module', family: 'trade', userId: '159', value: 'profit', duration: 'once', note: '   ' }), false)
  assert.equal(isUserControlFormComplete({ scope: 'module', family: 'trade', userId: '159', value: '', duration: 'once', note: '审计备注' }), false)
  assert.equal(isUserControlFormComplete({ scope: 'module', family: 'trade', userId: '159', value: 'highYield', duration: 'once', note: '审计备注' }), false)
  assert.equal(isUserControlFormComplete({ scope: 'global', userId: '', strategy: 'positive', duration: 'once', note: '审计备注' }), false)
  assert.equal(isUserControlFormComplete({ scope: 'module', family: 'trade', userId: '159', value: 'profit', duration: 'once', note: '审计备注' }), true)
})

test('form helper trims notes and builds scope-specific payloads', () => {
  assert.deepEqual(buildUserControlPayload({
    scope: 'module', family: 'trade', userId: '159', strategy: 'negative', value: 'loss', duration: 'permanent', note: '  模块备注  '
  }), { userId: '159', value: 'loss', duration: 'permanent', note: '模块备注' })
  assert.deepEqual(buildUserControlPayload({
    scope: 'global', userId: '158', strategy: 'positive', value: 'lowYield', duration: 'once', note: '  统一备注  '
  }), { userId: '158', strategy: 'positive', duration: 'once', note: '统一备注' })
})

test('shared modal separates trading outcome from finance yield wording', () => {
  const source = read('../src/admin/components/user-control/UserControlModal.vue')
  assert.match(source, /正向控制/)
  assert.match(source, /负向控制/)
  assert.match(source, /盈利/)
  assert.match(source, /亏损/)
  assert.match(source, /高收益/)
  assert.match(source, /低收益/)
  assert.match(source, /一次性/)
  assert.match(source, /永久/)
  assert.match(source, /操作备注/)
})

test('shared modal exposes note validation on blur while submit stays disabled', () => {
  const source = read('../src/admin/components/user-control/UserControlModal.vue')
  assert.match(source, /@blur="noteTouched = true"/)
  assert.match(source, /noteTouched && !form\.note\.trim\(\)/)
  assert.match(source, /:disabled="!isComplete"/)
})

test('module page explains settlement-only perpetual control and module-only scope', () => {
  const source = read('../src/pages/admin/user-control/ModuleUserControlPage.vue')
  assert.match(source, /不改变K线/)
  assert.match(source, /实时浮盈亏/)
  assert.match(source, /本次操作只影响当前模块/)
  assert.match(source, /规则来源/)
})

test('user list exposes unified status and scoped actions', () => {
  const source = read('../src/pages/admin/user/UserListPage.vue')
  assert.match(source, /统一控制/)
  assert.match(source, /模块状态/)
  assert.match(source, /设置控制/)
  assert.match(source, /取消控制/)
  assert.match(source, /UserControlDetailDrawer/)
  assert.match(source, /MfaVerificationModal/)
})

test('detail drawer distinguishes progress from configuration divergence', () => {
  const source = read('../src/admin/components/user-control/UserControlDetailDrawer.vue')
  assert.match(source, /已执行/)
  assert.match(source, /存在差异/)
  assert.match(source, /规则来源/)
  assert.match(source, /最近执行/)
})
