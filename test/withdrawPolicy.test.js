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

test('withdraw policy limit inputs explain zero as unlimited and preview treats zero daily cap as unlimited', () => {
  const pageSource = read('../src/pages/admin/user/WithdrawPolicyPage.vue')
  const mockSource = read('../src/admin/mock/withdrawPolicy.js')

  assert.match(pageSource, /输入 0 表示不限制单笔最低出金/)
  assert.match(pageSource, /输入 0 表示不限制每日出金上限/)
  assert.ok((pageSource.match(/输入 0 表示不限制/g) || []).length >= 8)
  assert.match(mockSource, /Number\.isFinite\(n\) && n > 0 \? n : null/)
  assert.match(mockSource, /Number\.isFinite\(n\) && n === 0\) return '无限制'/)
  assert.match(mockSource, /const defDaily = effectiveDailyCap\(def\.dailyCapUsdt\)/)
  assert.ok((mockSource.match(/dailyCapUsdt: effectiveDailyCap/g) || []).length >= 4)
})
