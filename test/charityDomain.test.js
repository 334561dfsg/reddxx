import test from 'node:test'
import assert from 'node:assert/strict'
import {transact, raisedAmount, progressOf, channelTotals, projectsBySort, localized, LOCALES} from '../src/shared/charity/domain.js'
import {seedCharity} from '../src/shared/charity/seed.js'

const T0 = Date.UTC(2026, 10, 28, 0, 0, 0)
let n = 0
const run = (s, action, args, at = T0) => transact(s, action, {...args, requestId: `t-${++n}`}, at)
const draft = (extra = {}) => ({locales: {'en-US': {title: 'Clean Water', summary: 'Wells for 20 villages'}, 'zh-TW': {title: '潔淨水源', summary: ''}, 'ja-JP': {title: '', summary: ''}},
  image: '/NewQuantCapital/assets/b1537e7514a3cc70.jpg', targetAmount: 100000, initialRaised: 2500, peopleHelped: 120, minDonation: 5, maxDonation: 10000, sortOrder: 5, ...extra})

test('seed mirrors the public page: eight campaigns in six languages and the same totals', () => {
  const s = seedCharity(T0)
  assert.equal(s.projects.length, 8)
  assert.ok(s.projects.every(p => LOCALES.every(l => p.locales[l]?.title)), 'every project has all six titles')
  assert.equal(projectsBySort(s.projects)[0].locales['en-US'].title, 'Urgent Appeal for Gaza', 'first preset gets the largest weight')
  assert.equal(raisedAmount(s, s.projects[3]), 33372001, 'initial raised + seeded donations = public snapshot')
  assert.equal(progressOf(s, s.projects[1]), 100, 'progress is capped at 100 even past the goal')
  const totals = channelTotals(s)
  assert.equal(totals.totalRaised, 70777391)
  assert.equal(totals.peopleHelped, 1314922)
  assert.ok(s.donations.every(d => d.status === 'completed'))
})

test('new projects start unlisted, drop empty language versions and fall back to English', () => {
  let s = seedCharity(T0)
  s = run(s, 'saveProject', {project: draft()})
  const created = s.projects.at(-1)
  assert.equal(created.status, 'unlisted')
  assert.deepEqual(Object.keys(created.locales).sort(), ['en-US', 'zh-TW'])
  assert.equal(localized(created, 'zh-TW').summary, 'Wells for 20 villages')
  assert.equal(localized(created, 'ko-KR').title, 'Clean Water')
  assert.equal(s.logs[0].action, 'createProject')
  assert.equal(raisedAmount(s, created), 2500)
  assert.throws(() => run(s, 'saveProject', {project: draft({locales: {'zh-TW': {title: 'x', summary: ''}}})}), /projectFallback/)
  assert.throws(() => run(s, 'saveProject', {project: draft({locales: {'en-US': {title: 'A', summary: ''}, 'fr-FR': {title: '', summary: 'only summary'}}})}), /projectTitle/)
  assert.throws(() => run(s, 'saveProject', {project: draft({maxDonation: 1})}), /projectLimits/)
  assert.throws(() => run(s, 'saveProject', {project: draft({targetAmount: 0})}), /projectTarget/)
  assert.throws(() => run(s, 'saveProject', {project: draft({peopleHelped: 1.5})}), /projectPeople/)
  assert.throws(() => run(s, 'saveProject', {project: draft({sortOrder: 1.5})}), /projectSort/)
})

test('saves keep the status, reject stale versions and log the changed fields', () => {
  let s = seedCharity(T0)
  const p = s.projects[0]
  s = run(s, 'saveProject', {project: {...p, targetAmount: 2000000}, expectedVersion: p.version})
  assert.equal(s.projects[0].status, 'listed', 'saving never publishes or unpublishes')
  assert.equal(s.projects[0].version, 2)
  assert.match(s.logs[0].summary, /目标金额/)
  assert.deepEqual([s.logs[0].before.targetAmount, s.logs[0].after.targetAmount], [1000000, 2000000])
  assert.throws(() => run(s, 'saveProject', {project: p, expectedVersion: p.version}), /stale/)
  assert.throws(() => run(s, 'saveProject', {project: {...p, projectId: 'missing'}}), /project/)
})

test('listing is state-guarded, logged and rejects duplicates', () => {
  let s = seedCharity(T0)
  const p = s.projects[2]
  s = run(s, 'setProjectStatus', {projectId: p.projectId, expectedStatus: 'listed'})
  assert.equal(s.projects[2].status, 'unlisted')
  assert.equal(s.logs[0].action, 'unlistProject')
  assert.throws(() => run(s, 'setProjectStatus', {projectId: p.projectId, expectedStatus: 'listed'}), /status/)
  s = transact(s, 'setProjectStatus', {projectId: p.projectId, expectedStatus: 'unlisted', requestId: 'once'}, T0)
  assert.equal(s.projects[2].status, 'listed')
  assert.throws(() => transact(s, 'setProjectStatus', {projectId: p.projectId, expectedStatus: 'listed', requestId: 'once'}, T0), /duplicate/)
  assert.equal(channelTotals(s).totalRaised, 70777391, 'unlisted projects still count toward the totals')
})

test('channel stats add base values to the project sums', () => {
  let s = seedCharity(T0)
  s = run(s, 'saveStats', {stats: {baseRaised: 1000, basePeopleHelped: 78}, expectedVersion: 1})
  assert.equal(channelTotals(s).totalRaised, 70778391)
  assert.equal(channelTotals(s).peopleHelped, 1315000)
  assert.equal(s.logs[0].action, 'saveStats')
  assert.throws(() => run(s, 'saveStats', {stats: {baseRaised: 0, basePeopleHelped: 0}, expectedVersion: 1}), /stale/)
  assert.throws(() => run(s, 'saveStats', {stats: {baseRaised: -1, basePeopleHelped: 0}, expectedVersion: 2}), /statsRaised/)
  assert.throws(() => run(s, 'saveStats', {stats: {baseRaised: 0, basePeopleHelped: 0.5}, expectedVersion: 2}), /statsPeople/)
})
