import test from 'node:test'
import assert from 'node:assert/strict'
import { navTree } from '../src/admin/config/nav.js'
import { consoleRoutes } from '../src/router/modules/console.js'

const expected = [
  ['perpetual-user-control', 'perpetual/user-control', 'perpetual'],
  ['delivery-user-control', 'delivery/user-control', 'delivery'],
  ['spot-user-control', 'spot/user-control', 'spot']
]

test('registers only trading module user-control routes with module props', () => {
  for (const [name, path, moduleKey] of expected) {
    const route = consoleRoutes.find((item) => item.name === name)
    assert.equal(route.path, path)
    assert.deepEqual(route.props, { moduleKey })
  }
  assert.equal(consoleRoutes.some((item) => item.name === 'ai-quant-user-yield-control'), false)
  assert.equal(consoleRoutes.some((item) => item.name === 'liquidity-user-yield-control'), false)
  assert.equal(consoleRoutes.some((item) => item.name === 'portfolio-user-yield-control'), false)
})

test('uses exact user point-control titles for the three trading routes', () => {
  const expectedTitles = {
    'perpetual-user-control': '永续合约 / 用户点控',
    'delivery-user-control': '交割合约 / 用户点控',
    'spot-user-control': '现货交易 / 用户点控'
  }

  Object.entries(expectedTitles).forEach(([name, title]) => {
    const route = consoleRoutes.find((item) => item.name === name)
    assert.equal(route.meta.title, title)
  })
})

test('registers the unified user-control log route', () => {
  const route = consoleRoutes.find((item) => item.name === 'users-control-log')
  assert.equal(route.path, 'users/control-log')
})

test('adds user point-control labels only to trading module menus', () => {
  const byTitle = Object.fromEntries(navTree.map((item) => [item.title, item]))
  assert.ok(byTitle['永续合约'].children.some((item) => item.title === '用户点控'))
  assert.ok(byTitle['交割合约'].children.some((item) => item.title === '用户点控'))
  assert.ok(byTitle['现货交易'].children.some((item) => item.title === '用户点控'))
  assert.equal(byTitle['AI量化交易'].children.some((item) => item.title === '用户点控'), false)
  assert.equal(byTitle['流动性挖矿'].children.some((item) => item.title === '用户点控'), false)
  assert.equal(byTitle['投资组合'].children.some((item) => item.title === '用户点控'), false)
})
