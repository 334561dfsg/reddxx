import test from 'node:test'
import assert from 'node:assert/strict'
import { navTree } from '../src/admin/config/nav.js'
import { consoleRoutes } from '../src/router/modules/console.js'

const expected = [
  ['delivery-user-control', 'delivery/user-control', 'delivery']
]

test('registers only delivery user-control route with module props', () => {
  for (const [name, path, moduleKey] of expected) {
    const route = consoleRoutes.find((item) => item.name === name)
    assert.equal(route.path, path)
    assert.deepEqual(route.props, { moduleKey })
  }
  assert.equal(consoleRoutes.some((item) => item.name === 'perpetual-user-control'), false)
  assert.equal(consoleRoutes.some((item) => item.name === 'spot-user-control'), false)
  assert.equal(consoleRoutes.some((item) => item.name === 'ai-quant-user-yield-control'), false)
  assert.equal(consoleRoutes.some((item) => item.name === 'liquidity-user-yield-control'), false)
  assert.equal(consoleRoutes.some((item) => item.name === 'portfolio-user-yield-control'), false)
})

test('uses exact user point-control title for the delivery route', () => {
  const expectedTitles = {
    'delivery-user-control': '交割合约 / 用户点控'
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

test('adds user point-control label only to the delivery module menu', () => {
  const byTitle = Object.fromEntries(navTree.map((item) => [item.title, item]))
  assert.equal(byTitle['永续合约'].children.some((item) => item.title === '用户点控'), false)
  assert.ok(byTitle['交割合约'].children.some((item) => item.title === '用户点控'))
  assert.equal(byTitle['现货交易'].children.some((item) => item.title === '用户点控'), false)
  assert.equal(byTitle['AI量化交易'].children.some((item) => item.title === '用户点控'), false)
  assert.equal(byTitle['流动性挖矿'].children.some((item) => item.title === '用户点控'), false)
  assert.equal(byTitle['投资组合'].children.some((item) => item.title === '用户点控'), false)
})
