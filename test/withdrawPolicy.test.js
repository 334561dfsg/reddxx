import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { navTree } from '../src/admin/config/nav.js'
import { consoleRoutes } from '../src/router/modules/console.js'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('withdraw policy does not expose a global no-restriction switch', () => {
  const pageSource = read('../src/pages/admin/user/WithdrawPolicyPage.vue')
  const source = read('../src/admin/mock/withdrawPolicy.js')

  assert.doesNotMatch(pageSource, /全局总开关/)
  assert.doesNotMatch(pageSource, /不做任何限制/)
  assert.doesNotMatch(pageSource, /noRestrictionEnabled/)
  assert.doesNotMatch(source, /noRestrictionEnabled/)
  assert.doesNotMatch(source, /no_restriction/)
})

test('front withdraw page always shows the withdrawable line', () => {
  const source = read('../src/pages/front/personal-center/AssetsWithdrawPage.vue')

  assert.doesNotMatch(source, /shouldHideWithdrawableLine/)
  assert.doesNotMatch(source, /noRestrictionEnabled/)
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

test('withdraw policy is registered under platform config navigation', () => {
  const route = consoleRoutes.find((entry) => entry.name === 'users-withdraw-policy')
  assert.equal(route?.path, 'users/withdraw-policy')
  assert.match(String(route?.component), /WithdrawPolicyPage/)
  assert.equal(route?.meta?.title, '平台配置 / 出金策略')

  const memberNav = navTree.find((entry) => entry.title === '会员管理')
  assert.ok(memberNav)
  assert.equal(
    memberNav.children.some(
      (entry) => entry.title === '出金策略' && entry.path === '/admin/users/withdraw-policy'
    ),
    false
  )

  const platformNav = navTree.find((entry) => entry.title === '平台配置')
  assert.ok(platformNav)
  assert.ok(
    platformNav.children.some(
      (entry) => entry.title === '出金策略' && entry.path === '/admin/users/withdraw-policy'
    )
  )
})
