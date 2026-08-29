import assert from 'node:assert/strict'
import test from 'node:test'
import { navTree } from '../src/admin/config/nav.js'
import { consoleRoutes } from '../src/router/modules/console.js'

const assetMenuEntries = [
  { title: '币种管理', path: '/admin/assets/currencies', routeName: 'system-currencies' },
  { title: '公共收款地址', path: '/admin/assets/public-deposit-addresses', routeName: 'assets-public-deposit-addresses' },
  { title: '交易对管理', path: '/admin/spot/symbols', routeName: 'spot-symbols' },
  { title: '手动归集', path: '/admin/assets/manual-collect', routeName: 'assets-manual-collect' },
  { title: '归集记录', path: '/admin/assets/collect-records', routeName: 'assets-collect-records' },
  { title: '链上交易日志', path: '/admin/assets/address-logs', routeName: 'assets-address-logs' },
  { title: '闪兑汇率管理', path: '/admin/assets/exchange-rate', routeName: 'assets-exchange-rate' },
  { title: '闪兑费率模板', path: '/admin/assets/fee-template', routeName: 'assets-fee-template' }
]

test('asset management submenu entries are registered under platform config', () => {
  const assetNav = navTree.find((entry) => entry.title === '资产管理')
  assert.equal(assetNav, undefined)

  const platformNav = navTree.find((entry) => entry.title === '平台配置')
  assert.ok(platformNav)

  for (const expected of assetMenuEntries) {
    assert.ok(
      platformNav.children.some(
        (entry) => entry.title === expected.title && entry.path === expected.path
      ),
      `${expected.title} should be under platform config`
    )

    const route = consoleRoutes.find((entry) => entry.name === expected.routeName)
    assert.equal(route?.meta?.title, `平台配置 / ${expected.title}`)
  }
})
