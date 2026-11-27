import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_SITE_CONFIG, migrateLegacySortWeights, normalizeSiteConfig } from '../src/admin/mock/siteConfig.js'

// Sort values are weights: larger first (user decision, 2026-11-27).
test('site config lists sort larger weights first', () => {
  const config = normalizeSiteConfig({
    socialLinks: [
      { id: 'low', name: 'Low', url: 'https://low.example.com', sort: 10 },
      { id: 'high', name: 'High', url: 'https://high.example.com', sort: 90 }
    ],
    dialSortOrder: { '+86': 10, '+84': 90 },
    allowedDialCodes: ['+86', '+84']
  })
  assert.deepEqual(config.socialLinks.map((row) => row.id), ['high', 'low'])
  assert.deepEqual(config.allowedDialCodes, ['+84', '+86'])
})

test('default seeds keep their intended first item under larger-first sorting', () => {
  assert.equal(DEFAULT_SITE_CONFIG.socialLinks[0].id, 'demo-social-x')
  assert.equal(DEFAULT_SITE_CONFIG.allowedDialCodes[0], '+86')
})

test('legacy smaller-first stored configs keep their visible order after migration', () => {
  const legacy = {
    socialLinks: [
      { id: 'first', name: 'First', url: 'https://a.example.com', sort: 0 },
      { id: 'second', name: 'Second', url: 'https://b.example.com', sort: 10 },
      { id: 'third', name: 'Third', url: 'https://c.example.com', sort: 20 }
    ],
    dialSortOrder: { '+86': 0, '+84': 10 },
    allowedDialCodes: ['+86', '+84'],
    i18n: { enabledLocales: ['zh-CN', 'en'], localeSortOrder: { en: 0, 'zh-CN': 10 } }
  }
  migrateLegacySortWeights(legacy)
  const config = normalizeSiteConfig(legacy)
  assert.deepEqual(config.socialLinks.map((row) => row.id), ['first', 'second', 'third'])
  assert.deepEqual(config.allowedDialCodes, ['+86', '+84'])
  assert.deepEqual(config.i18n.enabledLocales, ['en', 'zh-CN'])
})
