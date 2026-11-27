import test from 'node:test'
import assert from 'node:assert/strict'
import {createRouter, createMemoryHistory} from 'vue-router'
import {routes} from '../src/routes.js'

// Lazy page components are stubbed so navigation (redirect checks) never loads .vue files in Node.
const router = createRouter({history: createMemoryHistory(), routes: routes.map(route => route.component ? {...route, component: {render: () => null}} : route)})
const nameOf = path => router.resolve(path).name
async function landsOn(path) { await router.push(path); return router.currentRoute.value }

test('every page route has a unique name', () => {
  const pages = routes.filter(route => !route.redirect)
  assert.ok(pages.every(route => typeof route.name === 'string' && route.name), 'unnamed page route')
  assert.equal(new Set(pages.map(route => route.name)).size, pages.length)
})

test('known pages resolve to their named routes', () => {
  const cases = {
    '/': 'home',
    '/trade/futures/BTCUSDT': 'trade-futures', '/trade/options/ETHUSDT': 'trade-options', '/trade/spot': 'trade-spot',
    '/earn': 'finance-home', '/earn/simple': 'finance', '/earn/simple/usdt90': 'finance', '/earn/my-earnings': 'finance', '/earn/loan': 'finance',
    '/earn/loan/order/LN-1': 'loan-order', '/earn/loan/borrow': 'finance',
    '/ai-quant': 'ai-quant', '/ai-quant/strategy': 'strategy', '/ai-quant/strategy/mine': 'strategy',
    '/ai-quant/quant-fund': 'quant-fund', '/ai-quant/quant-fund/positions': 'quant-fund',
    '/ai-quant/quant-fund/products/qf-vip0': 'quant-fund-product',
    '/ai-quant/quant-fund/positions/QFO-1/interest-records': 'quant-fund-interest',
    '/ai-quant/strategy/mine/STR-1/stats': 'strategy-stats',
    '/assets': 'assets', '/assets/records': 'assets',
    '/login': 'auth', '/register': 'auth', '/news': 'news', '/news/42': 'news',
    '/profile': 'account', '/kyc/basic': 'account', '/help-center': 'help-center', '/records': 'account', '/notifications': 'account',
    '/about': 'legal', '/privacy': 'legal',
    '/c2c/buy': 'c2c', '/c2c/orders': 'c2c',
    '/charity': 'charity', '/deposit': 'deposit', '/withdraw': 'withdraw', '/messages': 'messages',
  }
  for (const [path, name] of Object.entries(cases)) assert.equal(nameOf(path), name, path)
})

test('unknown sections and pages reach the not-found page instead of an empty shell', () => {
  for (const path of ['/earn/x', '/ai-quant/x', '/ai-quant/strategy/x', '/ai-quant/strategy/positions', '/ai-quant/quant-fund/mine', '/assets/x', '/c2c', '/c2c/x', '/kyc-x', '/copytrade-x', '/nope/deeper'])
    assert.equal(nameOf(path), 'not-found', path)
})

test('redirects keep old links working', async () => {
  assert.equal((await landsOn('/trade')).fullPath, '/trade/futures/BTCUSDT')
  assert.equal((await landsOn('/trade/unknown/thing')).fullPath, '/trade/futures/BTCUSDT')
  assert.equal((await landsOn('/copytrade/leaderboard')).fullPath, '/')
  for (const removed of ['/c2c/accounts', '/c2c/payment-accounts']) assert.equal((await landsOn(removed)).fullPath, '/c2c/buy', removed + ' (payment accounts were removed)')
  for (const removed of ['/joint-account', '/promotions/tasks', '/survey/019e9f01-47a3-711f-9052-e7187b9f9407', '/fund-password'])
    assert.equal((await landsOn(removed)).fullPath, '/profile', removed + ' was removed and lands on the profile')
  for (const moved of ['/devices', '/2fa', '/security', '/preferences']) assert.equal((await landsOn(moved)).fullPath, '/profile', moved + ' is a row on the profile page')
  const legacy = await landsOn('/zh-TW/earn/simple?tab=1#top')
  assert.equal(legacy.path, '/earn/simple')
  assert.equal(legacy.query.tab, '1')
  assert.equal(legacy.hash, '#top')
})
