import test from 'node:test'
import assert from 'node:assert/strict'
import {createProfileApi, CHANGE_TYPES, ACCOUNT_TYPES} from '../src/api/profileService.js'

const now = () => Date.UTC(2026, 10, 26, 12)

test('account change ledger is deterministic, newest first, filtered and paged', async () => {
  const a = createProfileApi({now}), b = createProfileApi({now})
  const first = await a.listAccountChanges({page: 1, pageSize: 10})
  assert.deepEqual(first, await b.listAccountChanges({page: 1, pageSize: 10}))
  assert.equal(first.items.length, 10)
  assert.ok(first.total > 10)
  for (let i = 1; i < first.items.length; i++) assert.ok(first.items[i - 1].createdAt >= first.items[i].createdAt)
  const usdtFinance = await a.listAccountChanges({account: 'finance', currency: 'USDT', pageSize: 50})
  assert.ok(usdtFinance.items.every(row => row.account === 'finance' && row.currency === 'USDT'))
  for (const row of first.items) { assert.ok(CHANGE_TYPES.includes(row.type)); assert.ok(ACCOUNT_TYPES.includes(row.account)) }
  const last = await a.listAccountChanges({page: 999})
  assert.equal(last.page, Math.ceil(last.total / 10))
  await assert.rejects(a.listAccountChanges({type: 'bogus'}), {code: 'profile.center.records.invalidFilter'})
})

test('results are snapshots: callers cannot mutate the mock ledger', async () => {
  const api = createProfileApi({now})
  const page = await api.listAccountChanges()
  page.items[0].amount = 999999
  assert.notEqual((await api.listAccountChanges()).items[0].amount, 999999)
})

test('notifications: category filter, mark one read idempotently, mark all per category', async () => {
  const api = createProfileApi({now})
  const all = await api.listNotifications()
  assert.equal(all.unread, await api.getUnreadCount())
  const security = await api.listNotifications({category: 'security', pageSize: 50})
  assert.ok(security.items.every(item => item.category === 'security'))
  const unread = all.items.find(item => !item.read)
  await api.markNotificationRead(unread.id)
  await api.markNotificationRead(unread.id)
  assert.equal(await api.getUnreadCount(), all.unread - 1)
  const before = await api.getUnreadCount()
  const {changed} = await api.markAllNotificationsRead({category: 'system'})
  assert.equal(await api.getUnreadCount(), before - changed)
  assert.equal((await api.listNotifications({category: 'system', pageSize: 50})).items.filter(item => !item.read).length, 0)
  await api.markAllNotificationsRead()
  assert.equal(await api.getUnreadCount(), 0)
  assert.equal((await api.markAllNotificationsRead()).changed, 0)
  await assert.rejects(api.markNotificationRead('missing'), {code: 'profile.center.notifications.notFound'})
  await assert.rejects(api.listNotifications({category: 'x'}), {code: 'profile.center.notifications.invalidCategory'})
})

test('preferences validate and persist in memory; invite summary is a snapshot', async () => {
  const api = createProfileApi({now})
  assert.equal((await api.getPreferences()).messageAlert, true)
  assert.equal((await api.updatePreferences({messageAlert: false})).messageAlert, false)
  assert.equal((await api.getPreferences()).messageAlert, false)
  await assert.rejects(api.updatePreferences({messageAlert: 'yes'}), {code: 'profile.center.preferences.saveFailed'})
  const invite = await api.getInviteSummary()
  assert.deepEqual(Object.keys(invite).sort(), ['code', 'invited', 'pending', 'settled'])
})

test('login sessions: current device first and protected; remote sessions end once', async () => {
  const api = createProfileApi({now})
  const list = await api.listSessions({current: {device: 'Mac', browser: 'Chrome', os: 'macOS', osVersion: '10.15.7', kind: 'desktop'}})
  assert.equal(list[0].current, true)
  assert.equal(list[0].device, 'Mac')
  assert.ok(list.slice(1).every(session => !session.current))
  await assert.rejects(api.endSession(list[0].id), {code: 'profile.center.devices.cannotEndCurrent'})
  await api.endSession(list[1].id)
  await assert.rejects(api.endSession(list[1].id), {code: 'profile.center.devices.notFound'})
  assert.equal((await api.listSessions()).length, list.length - 1)
})
