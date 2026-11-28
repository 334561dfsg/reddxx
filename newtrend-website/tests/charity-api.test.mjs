import test from 'node:test'
import assert from 'node:assert/strict'
import {CHARITY_USER, donate, getCharity, listMyDonations} from '../src/api/charity.js'
import {charityService} from '../src/platform/charity.js'
import {balanceOf, credit} from '../src/mock/ledger.js'

const DEMO = 'common.demo.demo', REAL = 'common.demo.real'

test('public catalogue lists listed campaigns by weight in the request language with the channel totals', async () => {
  const before = await getCharity('zh-TW')
  assert.equal(before.projects.length, 8)
  assert.equal(before.totals.totalRaised, 70777391)
  assert.equal(before.totals.peopleHelped, 1314922)
  assert.ok(before.projects.every(p => p.progress <= 100))
  const top = before.projects[0]
  charityService().command('setProjectStatus', {projectId: top.projectId, expectedStatus: 'listed', requestId: 'unlist-top'})
  const after = await getCharity('fr-FR')
  assert.equal(after.projects.length, 7)
  assert.ok(!after.projects.some(p => p.projectId === top.projectId), 'unlisted campaigns are hidden')
  assert.equal(after.totals.totalRaised, before.totals.totalRaised, 'totals still count unlisted campaigns')
  await assert.rejects(donate({mode: REAL, projectId: top.projectId, amount: 10}), {code: 'charity.donate.errors.CHARITY_PROJECT_NOT_AVAILABLE'})
  charityService().command('setProjectStatus', {projectId: top.projectId, expectedStatus: 'unlisted', requestId: 'relist-top'})
})

test('a 真實 donation debits once and raises the campaign; 模擬 only debits the demo ledger', async () => {
  const [project] = (await getCharity('en-US')).projects
  credit(REAL, 'USDT', 100)
  const real = balanceOf(REAL, 'USDT'), mine = (await listMyDonations(REAL, 'en-US')).length
  await donate({mode: REAL, projectId: project.projectId, amount: 40})
  assert.equal(balanceOf(REAL, 'USDT'), real - 40)
  const raised = (await getCharity('en-US')).projects.find(p => p.projectId === project.projectId).raised
  assert.equal(raised, project.raised + 40)
  const history = await listMyDonations(REAL, 'en-US')
  assert.equal(history.length, mine + 1)
  assert.equal(history[0].amount, 40)
  assert.equal(charityService().read().donations[0].userId, CHARITY_USER)

  const demo = balanceOf(DEMO, 'USDT')
  await donate({mode: DEMO, projectId: project.projectId, amount: 5})
  assert.equal(balanceOf(DEMO, 'USDT'), demo - 5)
  assert.equal((await getCharity('en-US')).projects.find(p => p.projectId === project.projectId).raised, raised, 'simulated money never counts')
  assert.deepEqual(await listMyDonations(DEMO, 'en-US'), [])

  await assert.rejects(donate({mode: DEMO, projectId: project.projectId, amount: 0.5}), {code: 'overlay.amountMinimum'})
  await assert.rejects(donate({mode: DEMO, projectId: project.projectId, amount: 600000}), {code: 'charity.donate.errors.maxAmount'})
  assert.equal(balanceOf(DEMO, 'USDT'), demo - 5, 'rejected donations debit nothing')
})
