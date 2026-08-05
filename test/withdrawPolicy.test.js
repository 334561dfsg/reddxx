import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('withdraw policy defaults to no restriction and keeps legacy configs open', () => {
  const source = read('../src/admin/mock/withdrawPolicy.js')

  assert.match(source, /function ensureNoRestrictionEnabled\(policy\)/)
  assert.match(source, /policy\.noRestrictionEnabled = true/)
  assert.match(source, /noRestrictionEnabled: true/)
  assert.equal((source.match(/ensureNoRestrictionEnabled\(p\)/g) || []).length, 1)
  assert.equal((source.match(/ensureNoRestrictionEnabled\(raw\)/g) || []).length, 1)
})

test('no restriction policy bypasses amount limits in preview calculation', () => {
  const source = read('../src/admin/mock/withdrawPolicy.js')

  assert.match(source, /if \(policy\.noRestrictionEnabled !== false\)/)
  assert.match(source, /minWithdrawUsdt: 0/)
  assert.match(source, /dailyCapUsdt: null/)
  assert.match(source, /mode: 'no_restriction'/)
  assert.match(source, /已开启「不做任何限制」/)
})

test('front withdraw page hides withdrawable line when no restriction is enabled', () => {
  const source = read('../src/pages/front/personal-center/AssetsWithdrawPage.vue')

  assert.match(source, /const shouldHideWithdrawableLine = computed/)
  assert.match(source, /noRestrictionEnabled !== false/)
  assert.match(source, /v-if="!shouldHideWithdrawableLine"/)
  assert.match(source, /{{ withdrawableLine }}/)
})
