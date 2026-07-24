import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

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

test('module page explains settlement-only perpetual control and module-only scope', () => {
  const source = read('../src/pages/admin/user-control/ModuleUserControlPage.vue')
  assert.match(source, /不改变K线/)
  assert.match(source, /实时浮盈亏/)
  assert.match(source, /本次操作只影响当前模块/)
  assert.match(source, /规则来源/)
})
