import test from 'node:test'
import assert from 'node:assert/strict'
import {transact, publicList, publicEntry, localized, slugOf, entryIdOf, LOCALES, ADMIN, ATTACHMENT_MAX_BYTES} from '../src/shared/regulatory/domain.js'
import {seedRegulatory} from '../src/shared/regulatory/seed.js'
import {createRegulatoryService} from '../src/shared/regulatory/service.js'

const T0 = Date.UTC(2026, 10, 28, 0, 0, 0)
let n = 0
const run = (s, action, args, at = T0) => transact(s, action, {...args, requestId: `r-${++n}`}, at)
const pdf = (id, size = 2048) => ({attachmentId: id, name: `${id}.pdf`, type: 'application/pdf', size, url: `blob:http://localhost/${id}`, uploadedAt: T0})
const draft = (extra = {}) => ({sortWeight: 60, attachments: [pdf('a1')],
  locales: {'en-US': {title: 'MAS', body: '<p>Licensed in Singapore.</p>'}, 'zh-TW': {title: '', body: ''}}, ...extra})

test('seed mirrors the five public regulator links in order, all six languages, with their licence images', () => {
  const s = seedRegulatory(T0)
  assert.deepEqual(publicList(s, 'en-US').map(e => e.title), ['SEC', 'SFC', 'GFSOB', 'FSRA', 'FMSB'])
  assert.ok(s.entries.every(e => LOCALES.every(l => e.locales[l]?.title && e.locales[l].body.startsWith('<'))))
  assert.ok(s.entries.every(e => e.attachments.length === 1 && e.attachments[0].url.startsWith('/NewQuantCapital/assets/') && e.attachments[0].size > 0))
  const sfc = publicEntry(s, 'REG-SFC', 'ja-JP')
  assert.match(sfc.body, /BPB952/)
  assert.ok(!/<img/.test(sfc.body), 'images live in attachments, not the body')
})

test('new entries start unpublished, saves never publish, and publish/unpublish is guarded and logged', () => {
  let s = run(seedRegulatory(T0), 'saveEntry', {entry: draft()})
  const created = s.entries[0]
  assert.equal(created.status, 'unpublished')
  assert.deepEqual(Object.keys(created.locales), ['en-US'], 'empty language versions are dropped')
  assert.equal(publicEntry(s, created.entryId, 'en-US'), null)
  assert.equal(s.logs[0].operator, ADMIN)
  assert.equal(s.logs[0].before, null)
  // A save carrying status: 'published' keeps the stored status.
  s = run(s, 'saveEntry', {entry: {...created, status: 'published', sortWeight: 70}, expectedVersion: created.version})
  assert.equal(s.entries[0].status, 'unpublished')
  assert.match(s.logs[0].summary, /排序权重：60 → 70/)
  assert.equal(s.logs[0].before.sortWeight, 60)
  assert.equal(s.logs[0].after.sortWeight, 70)
  const v = s.entries[0].version
  assert.throws(() => run(s, 'setStatus', {entryId: created.entryId, status: 'published', expectedVersion: v - 1}), /stale/)
  s = run(s, 'setStatus', {entryId: created.entryId, status: 'published', expectedVersion: v}, T0 + 1000)
  assert.equal(s.entries[0].publishedAt, T0 + 1000)
  assert.equal(publicList(s, 'en-US')[0].title, 'MAS', 'larger sort weight first')
  assert.equal(s.logs[0].action, 'publish')
  assert.equal(s.logs[0].before.status, 'unpublished')
  assert.throws(() => run(s, 'setStatus', {entryId: created.entryId, status: 'published', expectedVersion: v + 1}), /status/, 'already published')
  s = run(s, 'setStatus', {entryId: created.entryId, status: 'unpublished', expectedVersion: v + 1})
  assert.equal(s.logs[0].action, 'unpublish')
  assert.equal(publicEntry(s, created.entryId, 'en-US'), null)
})

test('validation: English fallback, complete language versions, sort weight and attachments', () => {
  const s = seedRegulatory(T0)
  assert.throws(() => run(s, 'saveEntry', {entry: draft({locales: {'zh-TW': {title: '新加坡', body: '<p>x</p>'}}})}), /entryFallback/)
  assert.throws(() => run(s, 'saveEntry', {entry: draft({locales: {'en-US': {title: 'MAS', body: '<p></p>'}}})}), /entryFallback/, 'an empty editor counts as no body')
  assert.throws(() => run(s, 'saveEntry', {entry: draft({locales: {'en-US': {title: 'MAS', body: '<p>x</p>'}, 'fr-FR': {title: 'MAS', body: ''}}})}), /entryTitle/)
  assert.throws(() => run(s, 'saveEntry', {entry: draft({sortWeight: 1.5})}), /entrySort/)
  assert.throws(() => run(s, 'saveEntry', {entry: draft({attachments: [{...pdf('x'), type: 'application/zip'}]})}), /attachmentType/)
  assert.throws(() => run(s, 'saveEntry', {entry: draft({attachments: [pdf('x', ATTACHMENT_MAX_BYTES + 1)]})}), /attachmentSize/)
  assert.throws(() => run(s, 'saveEntry', {entry: draft({attachments: Array.from({length: 11}, (_, i) => pdf(`f${i}`))})}), /attachmentLimit/)
  assert.throws(() => run(s, 'saveEntry', {entry: draft({attachments: [{...pdf('x'), url: 'javascript:1'}]})}), /attachmentUrl/)
  assert.throws(() => run(s, 'saveEntry', {entry: {...draft(), entryId: 'REG-NOPE'}, expectedVersion: 1}), /entry/)
  const sec = s.entries.find(e => e.entryId === 'REG-SEC')
  assert.throws(() => run(s, 'saveEntry', {entry: sec, expectedVersion: sec.version - 1}), /stale/)
})

test('bodies are cleaned, other languages fall back to English, attachment changes are logged', () => {
  let s = run(seedRegulatory(T0), 'saveEntry', {entry: draft({locales: {'en-US': {title: 'MAS', body: '<p onclick="x()">ok</p><script>alert(1)</script>'}}})})
  const e = s.entries[0]
  assert.equal(e.locales['en-US'].body, '<p>ok</p>')
  assert.deepEqual(localized(e, 'ko-KR'), {title: 'MAS', body: '<p>ok</p>'})
  s = run(s, 'saveEntry', {entry: {...e, attachments: [pdf('b2')]}, expectedVersion: e.version})
  assert.match(s.logs[0].summary, /附件：新增 1，移除 1/)
})

test('duplicate requests are rejected and the service keeps state in memory only', () => {
  const s = seedRegulatory(T0)
  const sec = s.entries[0]
  const once = transact(s, 'setStatus', {entryId: sec.entryId, status: 'unpublished', expectedVersion: sec.version, requestId: 'same'}, T0)
  assert.throws(() => transact(once, 'setStatus', {entryId: sec.entryId, status: 'published', expectedVersion: sec.version + 1, requestId: 'same'}, T0), /duplicate/)
  const service = createRegulatoryService(() => T0)
  const read = service.read()
  read.entries.length = 0
  assert.equal(service.read().entries.length, 5, 'reads are copies')
  service.command('setStatus', {entryId: 'REG-FMSB', status: 'unpublished', expectedVersion: 1, requestId: 'svc-1'})
  assert.equal(publicList(service.read(), 'en-US').length, 4)
  assert.equal(createRegulatoryService(() => T0).read().entries.filter(x => x.status === 'published').length, 5, 'a new instance starts from the seed')
})

test('public slugs keep the old /content/regulation-<code> links and round-trip new ids', () => {
  assert.equal(slugOf('REG-SEC'), 'regulation-sec')
  assert.equal(entryIdOf('regulation-sec'), 'REG-SEC')
  const id = 'REG-1795857493731-6'
  assert.equal(entryIdOf(slugOf(id)), id)
  assert.equal(entryIdOf('terms'), null)
  assert.equal(entryIdOf('regulation-../x'), null)
})
