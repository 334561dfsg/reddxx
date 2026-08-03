import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { setActivePinia, createPinia } from 'pinia'
import {
  NOTIFICATION_CATEGORIES,
  useAdminNotificationsStore
} from '../src/admin/stores/adminNotifications.js'

const headerSource = readFileSync(
  new URL('../src/admin/components/AppHeader.vue', import.meta.url),
  'utf8'
)

test('admin notification categories cover requested alert types and routes', () => {
  const labels = NOTIFICATION_CATEGORIES.map((item) => item.label)

  assert.deepEqual(labels, [
    '充值',
    '提现',
    '充值成功',
    'MT新交易订单',
    'MT 新增持仓',
    'MT 平仓',
    'MT 用户登录',
    '永续合约新交易订单',
    '交割合约新交易订单',
    '认证',
    '借贷申请',
    '借贷还款'
  ])

  for (const item of NOTIFICATION_CATEGORIES) {
    assert.match(item.route, /^\/admin\//)
    assert.equal(typeof item.section, 'string')
    assert.ok(item.section.length > 0)
    assert.ok(item.count > 0)
  }
})

test('admin notification store tracks unread counts and safe sound preference', () => {
  setActivePinia(createPinia())
  const store = useAdminNotificationsStore()

  const initialTotal = NOTIFICATION_CATEGORIES.reduce((sum, item) => sum + item.count, 0)
  assert.equal(store.totalUnread, initialTotal)
  assert.equal(store.hasUnread, true)

  store.markCategoryRead('deposit')
  assert.equal(store.categories.find((item) => item.key === 'deposit').unreadCount, 0)
  assert.equal(store.totalUnread, initialTotal - 3)

  store.receiveNotification('deposit', 2)
  assert.equal(store.categories.find((item) => item.key === 'deposit').unreadCount, 2)
  assert.equal(store.totalUnread, initialTotal - 1)

  store.setSoundEnabled(false)
  assert.equal(store.soundEnabled, false)
  assert.equal(store.notificationCenterState.preferenceState.soundEnabled, false)
})

test('app header exposes accessible notification menu, badge, routing, and sound switch', () => {
  assert.match(headerSource, /aria-haspopup="menu"/)
  assert.match(headerSource, /aria-controls="admin-notification-menu"/)
  assert.match(headerSource, /role="menu"/)
  assert.match(headerSource, /role="menuitem"/)
  assert.match(headerSource, /notifications\.hasUnread/)
  assert.match(headerSource, /openCategory\(category\)/)
  assert.match(headerSource, /消息提示音/)
  assert.match(headerSource, /type="checkbox"/)
  assert.match(headerSource, /admin-notification-received/)
})
