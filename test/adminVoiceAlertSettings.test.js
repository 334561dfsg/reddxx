import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  DEFAULT_SITE_CONFIG,
  DEFAULT_VOICE_ALERT_EVENTS,
  normalizeSiteConfig,
  normalizeVoiceAlerts
} from '../src/admin/mock/siteConfig.js'
import { navTree } from '../src/admin/config/nav.js'
import { consoleRoutes } from '../src/router/modules/console.js'

const pageSource = readFileSync(
  new URL('../src/pages/admin/system/VoiceAlertSettingsPage.vue', import.meta.url),
  'utf8'
)

const requestedLabels = [
  '客服提示音',
  '充值',
  '提现',
  '充值成功',
  'MT新交易订单（现货）',
  'MT 新增持仓（现货）',
  'MT 平仓（现货）',
  '永续合约新交易订单',
  '交割合约新交易订单',
  '认证'
]

test('voice alert defaults include every requested event and keep sound enabled', () => {
  assert.equal(DEFAULT_SITE_CONFIG.voiceAlerts.enabled, true)
  assert.equal(DEFAULT_VOICE_ALERT_EVENTS.length, requestedLabels.length)
  assert.deepEqual(
    DEFAULT_VOICE_ALERT_EVENTS.map((item) => item.label),
    requestedLabels
  )

  for (const item of DEFAULT_VOICE_ALERT_EVENTS) {
    assert.equal(DEFAULT_SITE_CONFIG.voiceAlerts.events[item.key], true)
  }
})

test('voice alert normalization preserves valid choices and repairs unsafe values', () => {
  const normalized = normalizeVoiceAlerts({
    enabled: false,
    events: {
      deposit: false,
      withdraw: 'no',
      unknownEvent: false
    }
  })

  assert.equal(normalized.enabled, false)
  assert.equal(normalized.events.deposit, false)
  assert.equal(normalized.events.withdraw, true)
  assert.equal(Object.hasOwn(normalized.events, 'unknownEvent'), false)

  const fromSiteConfig = normalizeSiteConfig({
    voiceAlerts: {
      enabled: 'bad',
      events: {
        mtUserLogin: false,
        lendingApplication: false,
        lendingRepayment: false
      }
    }
  })
  assert.equal(fromSiteConfig.voiceAlerts.enabled, true)
  assert.equal(Object.hasOwn(fromSiteConfig.voiceAlerts.events, 'mtUserLogin'), false)
  assert.equal(Object.hasOwn(fromSiteConfig.voiceAlerts.events, 'lendingApplication'), false)
  assert.equal(Object.hasOwn(fromSiteConfig.voiceAlerts.events, 'lendingRepayment'), false)
  assert.equal(fromSiteConfig.voiceAlerts.events.customerService, true)
})

test('voice alert settings route and system menu entry are registered', () => {
  const route = consoleRoutes.find((entry) => entry.name === 'system-voice-alerts')
  assert.equal(route?.path, 'system/voice-alerts')
  assert.match(String(route?.component), /VoiceAlertSettingsPage/)
  assert.equal(route?.meta?.title, '系统设置 / 语音提醒')

  const systemNav = navTree.find((entry) => entry.title === '系统设置')
  assert.ok(systemNav)
  assert.ok(
    systemNav.children.some(
      (entry) => entry.title === '语音提醒' && entry.path === '/admin/system/voice-alerts'
    )
  )
})

test('voice alert settings page exposes explicit-save controls and all alert labels', () => {
  assert.match(pageSource, /语音提醒/)
  assert.match(pageSource, /保存配置/)
  assert.match(pageSource, /恢复已保存/)
  assert.match(pageSource, /恢复默认/)
  assert.match(pageSource, /voiceAlertsState/)
  assert.match(pageSource, /aria-checked/)
  assert.match(pageSource, /role="switch"/)
  assert.match(pageSource, /v-for="event in DEFAULT_VOICE_ALERT_EVENTS"/)
  assert.match(pageSource, /\{\{ event\.label \}\}/)
})
