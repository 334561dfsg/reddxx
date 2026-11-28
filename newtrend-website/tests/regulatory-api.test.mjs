import test from 'node:test'
import assert from 'node:assert/strict'
import {listRegulatory, getRegulatory} from '../src/api/regulatory.js'
import {regulatoryService} from '../src/platform/regulatoryClient.js'
import {configureMock} from '../src/api/transport.js'

test('index lists published entries by weight with their old regulation-* slugs', async () => {
  const list = await listRegulatory('zh-TW')
  assert.deepEqual(list.map(e => e.slug), ['regulation-sec', 'regulation-sfc', 'regulation-gfsob', 'regulation-fsra', 'regulation-fmsb'])
  assert.ok(list.every(e => e.title && e.body))
})

test('detail resolves old URLs, carries attachments and hides unknown or unpublished entries', async () => {
  const sfc = await getRegulatory('regulation-sfc', 'ja-JP')
  assert.match(sfc.body, /BPB952/)
  assert.equal(sfc.attachments[0].type, 'image/jpeg')
  await assert.rejects(getRegulatory('regulation-nope', 'en-US'), {code: 'notFound'})
  await assert.rejects(getRegulatory('terms', 'en-US'), {code: 'notFound'})
  const service = regulatoryService(), fmsb = service.read().entries.find(e => e.entryId === 'REG-FMSB')
  service.command('setStatus', {entryId: fmsb.entryId, status: 'unpublished', expectedVersion: fmsb.version, requestId: 'test-unpublish'})
  await assert.rejects(getRegulatory('regulation-fmsb', 'en-US'), {code: 'notFound'})
  assert.equal((await listRegulatory('en-US')).length, 4)
})

test('injected outage rejects with network', async () => {
  const previous = configureMock({fail: ['regulatory']})
  try { await assert.rejects(listRegulatory('en-US'), {code: 'network'}) } finally { configureMock(previous) }
})
