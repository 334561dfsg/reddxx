import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import { navTree } from '../src/admin/config/nav.js'
import { consoleRoutes } from '../src/router/modules/console.js'
import * as publicDepositAddressDomain from '../src/admin/mock/publicDepositAddress.js'

test('exposes public deposit address management under asset management', () => {
  const assets = navTree.find((entry) => entry.title === '资产管理')
  const item = assets?.children?.find((entry) => entry.path === '/admin/assets/public-deposit-addresses')

  assert.deepEqual(item, {
    title: '公共收款地址',
    path: '/admin/assets/public-deposit-addresses'
  })

  const route = consoleRoutes.find((entry) => entry.name === 'assets-public-deposit-addresses')
  assert.ok(route)
  assert.equal(route.path, 'assets/public-deposit-addresses')
})

test('provides a mock repository for public deposit address records', () => {
  assert.equal(
    existsSync(new URL('../src/admin/mock/publicDepositAddress.js', import.meta.url)),
    true
  )
})

test('provides enough modification-log mock records to exercise pagination', () => {
  const counts = publicDepositAddressDomain.publicDepositAddressLogMock.reduce((result, log) => {
    result[log.addressId] = (result[log.addressId] || 0) + 1
    return result
  }, {})

  assert.ok(Math.max(...Object.values(counts)) > 5)
})

test('provides the public deposit address management page', () => {
  assert.equal(
    existsSync(new URL('../src/pages/admin/assets/AssetsPublicDepositAddressPage.vue', import.meta.url)),
    true
  )
})

test('page exposes filtering, address fields and history-safe actions without obsolete scope or confirmation settings', () => {
  const source = readFileSync(
    new URL('../src/pages/admin/assets/AssetsPublicDepositAddressPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /公共收款地址/)
  assert.match(source, /新增地址/)
  assert.match(source, /币种 \/ 网络/)
  assert.doesNotMatch(source, /币种专用/)
  assert.doesNotMatch(source, /整链公共/)
  assert.doesNotMatch(source, /整条链/)
  assert.doesNotMatch(source, /最低确认数/)
  assert.doesNotMatch(source, /form\.confirmations/)
  assert.doesNotMatch(source, /form\.chainWide/)
  assert.match(source, /停用后仍保留历史记录/)
  assert.match(source, /createPublicDepositAddressRepository/)
})

test('public deposit address writes are gated by the shared MFA verification modal', () => {
  const source = readFileSync(
    new URL('../src/pages/admin/assets/AssetsPublicDepositAddressPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /import MfaVerificationModal from/)
  assert.match(source, /const pendingMutation = ref\(null\)/)
  assert.match(source, /function requestMfa/)
  assert.match(source, /function handleMfaVerify/)
  assert.match(source, /<MfaVerificationModal/)
  assert.match(source, /@verify="handleMfaVerify"/)
  assert.match(source, /@cancel="cancelMfa"/)
})

test('replacing an enabled address for the same coin and network disables the old record without deleting it', () => {
  assert.equal(typeof publicDepositAddressDomain.createPublicDepositAddressRepository, 'function')

  const repository = publicDepositAddressDomain.createPublicDepositAddressRepository([
    {
      id: 'old',
      coin: 'USDT',
      network: 'TRC20',
      address: 'TOldAddress',
      enabled: true
    }
  ])

  const saved = repository.save({
    coin: 'USDT',
    network: 'TRC20',
    address: 'TNewAddress',
    enabled: true
  })
  const rows = repository.list()

  assert.equal(saved.enabled, true)
  assert.equal(rows.length, 2)
  assert.equal(rows.find((row) => row.id === 'old').enabled, false)
  assert.equal(rows.filter((row) => row.coin === 'USDT' && row.network === 'TRC20' && row.enabled).length, 1)
})

test('deposit address resolution requires an exact coin and network match', () => {
  const repository = publicDepositAddressDomain.createPublicDepositAddressRepository([
    {
      id: 'usdt', coin: 'USDT', network: 'ERC20', address: '0xUsdt', enabled: true
    },
    {
      id: 'usdc', coin: 'USDC', network: 'ERC20', address: '0xUsdc', enabled: true
    }
  ])

  assert.equal(repository.resolve('USDC', 'ERC20').id, 'usdc')
  assert.equal(repository.resolve('ETH', 'ERC20'), null)
  assert.equal(repository.resolve('BTC', 'Bitcoin'), null)
})

test('changing an existing address creates a new record and preserves the disabled original', () => {
  const repository = publicDepositAddressDomain.createPublicDepositAddressRepository([
    {
      id: 'specific', coin: 'USDT', network: 'TRC20', address: 'TOld', enabled: true
    }
  ])

  const replacement = repository.save({
    id: 'specific', coin: 'USDT', network: 'TRC20', address: 'TNew', enabled: true
  })
  const rows = repository.list()

  assert.notEqual(replacement.id, 'specific')
  assert.equal(rows.length, 2)
  assert.equal(rows.find((row) => row.id === 'specific').enabled, false)
  assert.equal(rows.find((row) => row.id === replacement.id).address, 'TNew')
})

test('records address-scoped modification logs with before and after snapshots', () => {
  const repository = publicDepositAddressDomain.createPublicDepositAddressRepository([
    {
      id: 'specific', coin: 'USDT', network: 'TRC20', address: 'TOld',
      enabled: true, remark: '旧备注', operator: 'admin_01', updatedAt: '2026-07-20 10:00:00'
    }
  ])

  repository.save({
    id: 'specific', coin: 'USDT', network: 'TRC20', address: 'TOld',
    enabled: true, remark: '新备注', operator: 'admin_current', updatedAt: '2026-07-20 11:00:00'
  })

  const logs = repository.listLogs('specific')
  assert.equal(logs.length, 1)
  assert.equal(logs[0].action, 'edit')
  assert.equal(logs[0].operator, 'admin_current')
  assert.equal('mfaVerified' in logs[0], false)
  assert.deepEqual(Object.keys(logs[0].before).sort(), ['address', 'coin', 'enabled', 'network', 'remark'].sort())
  assert.deepEqual(Object.keys(logs[0].after).sort(), ['address', 'coin', 'enabled', 'network', 'remark'].sort())
  assert.equal(logs[0].before.remark, '旧备注')
  assert.equal(logs[0].after.remark, '新备注')
})

test('keeps modification logs isolated to their corresponding address row', () => {
  const repository = publicDepositAddressDomain.createPublicDepositAddressRepository([
    { id: 'one', coin: 'USDT', network: 'TRC20', address: 'TOne', enabled: true },
    { id: 'two', coin: 'USDC', network: 'ERC20', address: '0xTwo', enabled: true }
  ])

  repository.save({ id: 'one', coin: 'USDT', network: 'TRC20', address: 'TOne', enabled: false })

  assert.equal(repository.listLogs('one').length, 1)
  assert.equal(repository.listLogs('one')[0].action, 'disable')
  assert.deepEqual(repository.listLogs('two'), [])
})

test('page provides a row-level modification log dialog', () => {
  const source = readFileSync(
    new URL('../src/pages/admin/assets/AssetsPublicDepositAddressPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, />修改日志</)
  assert.match(source, /function openLogDialog/)
  assert.match(source, /repository\.listLogs/)
  assert.match(source, /变更前/)
  assert.match(source, /变更后/)
  assert.match(source, /const LOG_PAGE_SIZE = 5/)
  assert.match(source, /paginatedAddressLogs/)
  assert.match(source, /上一页/)
  assert.match(source, /下一页/)
  assert.doesNotMatch(source, /MFA 已验证/)
  assert.match(source, /日志按地址独立归档，仅用于审计追溯，不支持修改或删除/)
})
