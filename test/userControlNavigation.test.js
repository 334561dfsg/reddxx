import test from 'node:test'
import assert from 'node:assert/strict'
import { navTree } from '../src/admin/config/nav.js'
import { consoleRoutes } from '../src/router/modules/console.js'

const expected = [
  ['perpetual-user-control', 'perpetual/user-control', 'perpetual'],
  ['delivery-user-control', 'delivery/user-control', 'delivery'],
  ['spot-user-control', 'spot/user-control', 'spot'],
  ['ai-quant-user-yield-control', 'ai-quant/user-yield-control', 'aiQuant'],
  ['liquidity-user-yield-control', 'liquidity/locked/user-yield-control', 'liquidity'],
  ['portfolio-user-yield-control', 'portfolio/user-yield-control', 'portfolio']
]

test('registers all six module user-control routes with module props', () => {
  for (const [name, path, moduleKey] of expected) {
    const route = consoleRoutes.find((item) => item.name === name)
    assert.equal(route.path, path)
    assert.deepEqual(route.props, { moduleKey })
  }
})

test('registers the unified user-control log route', () => {
  const route = consoleRoutes.find((item) => item.name === 'users-control-log')
  assert.equal(route.path, 'users/control-log')
})

test('adds trading control and finance yield-control labels to module menus', () => {
  const byTitle = Object.fromEntries(navTree.map((item) => [item.title, item]))
  assert.ok(byTitle['永续合约'].children.some((item) => item.title === '用户控盘'))
  assert.ok(byTitle['交割合约'].children.some((item) => item.title === '用户控盘'))
  assert.ok(byTitle['现货交易'].children.some((item) => item.title === '用户控盘'))
  assert.ok(byTitle['AI量化交易'].children.some((item) => item.title === '用户收益调节'))
  assert.ok(byTitle['流动性挖矿'].children.some((item) => item.title === '用户收益调节'))
  assert.ok(byTitle['投资组合'].children.some((item) => item.title === '用户收益调节'))
})
