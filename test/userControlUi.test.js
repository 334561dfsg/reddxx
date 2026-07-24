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
  assert.match(source, /正向：交易盈利、理财高收益/)
  assert.match(source, /负向：交易亏损、理财低收益/)
  assert.match(source, /模块状态/)
  assert.match(source, /设置控制/)
  assert.match(source, /取消控制/)
  assert.match(source, /UserControlDetailDrawer/)
  assert.match(source, /MfaVerificationModal/)
  assert.equal(source.match(/@click\.stop=/g)?.length, 4)
  assert.match(source, /getUserControlListMeta/)
  assert.match(source, /getUnifiedControlCancelItems/)
  assert.match(source, /v-for="item in cancelControlItems"/)
})

test('detail drawer distinguishes progress from configuration divergence', () => {
  const source = read('../src/admin/components/user-control/UserControlDetailDrawer.vue')
  assert.match(source, /已执行/)
  assert.match(source, /存在差异/)
  assert.match(source, /规则来源/)
  assert.match(source, /最近执行/)
  assert.match(source, /businessId/)
  assert.match(source, /getUserControlDivergenceKeys/)
  assert.match(source, /配置差异/)
})

test('log page exposes operation, execution, filtering, and demo simulation', () => {
  const source = read('../src/pages/admin/user-control/UserControlLogPage.vue')
  assert.match(source, /操作日志/)
  assert.match(source, /执行日志/)
  assert.match(source, /Demo 模拟工具/)
  assert.match(source, /模拟一次性执行/)
  assert.match(source, /模拟写入失败/)
  assert.match(source, /清除失败开关/)
  assert.match(source, /恢复演示数据/)
  assert.match(source, /自然\/全局结果/)
  assert.match(source, /用户最终结果/)
  assert.match(source, /基础收益档位/)
  assert.match(source, /用户收益档位/)
})

test('log page exposes audit fields and calls the shared demo state actions', () => {
  const source = read('../src/pages/admin/user-control/UserControlLogPage.vue')
  assert.match(source, /UID/)
  assert.match(source, /模块/)
  assert.match(source, /规则来源/)
  assert.match(source, /操作类型/)
  assert.match(source, /操作时间/)
  assert.match(source, /操作备注/)
  assert.match(source, /变更前/)
  assert.match(source, /变更后/)
  assert.match(source, /业务单号/)
  assert.match(source, /执行状态/)
  assert.match(source, /simulateUserControlExecution/)
  assert.match(source, /setUserControlFailureModule/)
  assert.match(source, /resetUserControlDemo/)
  assert.match(source, /六个模块均未更新/)
  assert.match(source, /executionStatusClasses/)
})

test('log page immediately normalizes module values and follows route query changes', () => {
  const source = read('../src/pages/admin/user-control/UserControlLogPage.vue')
  assert.match(source, /getUserControlSimulationValues/)
  assert.match(source, /isUserControlSimulationValue/)
  assert.match(source, /normalizeUserControlLogQuery/)
  assert.match(source, /route\.query\.userId/)
  assert.match(source, /route\.query\.module/)
  assert.match(source, /immediate:\s*true/)
})

test('log tabs and live demo results expose accessible state semantics', () => {
  const source = read('../src/pages/admin/user-control/UserControlLogPage.vue')
  assert.match(source, /role="tablist"/)
  assert.equal(source.match(/role="tab"/g)?.length, 2)
  assert.match(source, /:aria-selected=/)
  assert.match(source, /aria-controls=/)
  assert.equal(source.match(/role="tabpanel"/g)?.length, 2)
  assert.doesNotMatch(source, /:tabindex=/)
  assert.match(source, /role="status"/)
  assert.match(source, /aria-live="polite"/)
})

test('user and module rows link to the named log route with query filters', () => {
  const userSource = read('../src/pages/admin/user/UserListPage.vue')
  const moduleSource = read('../src/pages/admin/user-control/ModuleUserControlPage.vue')
  assert.match(userSource, /name:\s*'users-control-log'[\s\S]*query:\s*\{\s*userId:/)
  assert.match(moduleSource, /name:\s*'users-control-log'[\s\S]*query:\s*\{\s*userId:[\s\S]*module:/)
})
