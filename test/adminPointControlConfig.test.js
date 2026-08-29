import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { DEFAULT_SITE_CONFIG, normalizeSiteConfig } from '../src/admin/mock/siteConfig.js'
import { navTree } from '../src/admin/config/nav.js'
import { consoleRoutes } from '../src/router/modules/console.js'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('point-control ratios default to neutral percentages and normalize saved values', () => {
  assert.deepEqual(DEFAULT_SITE_CONFIG.pointControlRatios, {
    delivery: 50
  })

  const normalized = normalizeSiteConfig({
    pointControlRatios: {
      delivery: '62.5',
      perpetual: '40',
      spot: '0'
    }
  })

  assert.deepEqual(normalized.pointControlRatios, {
    delivery: 62.5
  })

  const repaired = normalizeSiteConfig({
    pointControlRatios: {
      delivery: -1,
      perpetual: 101,
      spot: 'abc'
    }
  })

  assert.deepEqual(repaired.pointControlRatios, {
    delivery: 50
  })
})

test('point-control settings route and platform menu entry are registered', () => {
  const route = consoleRoutes.find((entry) => entry.name === 'platform-point-control-config')
  assert.equal(route?.path, 'platform/point-control-config')
  assert.match(String(route?.component), /PointControlConfigPage/)
  assert.equal(route?.meta?.title, '平台配置 / 点控配置')

  const platformNav = navTree.find((entry) => entry.title === '平台配置')
  assert.ok(platformNav)
  assert.ok(
    platformNav.children.some(
      (entry) => entry.title === '点控配置' && entry.path === '/admin/platform/point-control-config'
    )
  )
})

test('point-control settings page exposes only the delivery percent input', () => {
  const source = read('../src/pages/admin/platform/PointControlConfigPage.vue')

  assert.match(source, /点控配置/)
  assert.match(source, /交割点控输赢比例/)
  assert.doesNotMatch(source, /永续点控输赢比例/)
  assert.doesNotMatch(source, /现货点控输赢比例/)
  assert.match(source, /inputmode="decimal"/)
  assert.match(source, /aria-invalid/)
  assert.match(source, /保存配置/)
  assert.match(source, /pointControlSettingsState/)
  assert.match(source, /numericInputState/)
})
