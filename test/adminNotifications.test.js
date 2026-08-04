import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { setActivePinia, createPinia } from 'pinia'
import {
  NOTIFICATION_CATEGORIES,
  useAdminNotificationsStore
} from '../src/admin/stores/adminNotifications.js'
import {
  ADMIN_DEFAULT_PASSWORD,
  useAdminAccountStore
} from '../src/admin/stores/adminAccount.js'

const headerSource = readFileSync(
  new URL('../src/admin/components/AppHeader.vue', import.meta.url),
  'utf8'
)
const soundGuideDialogSource = readFileSync(
  new URL('../src/admin/components/AdminSoundGuideDialog.vue', import.meta.url),
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
  assert.equal(store.soundGuideNeeded, true)

  store.dismissSoundGuideNotice()
  assert.equal(store.soundGuideNeeded, false)

  store.playRefreshTestSound()
  assert.equal(store.soundEnabled, true)
  assert.equal(store.soundGuideNeeded, true)

  store.setSoundEnabled(false)
  assert.equal(store.soundEnabled, false)
  assert.equal(store.soundGuideNeeded, false)
  assert.equal(store.notificationCenterState.preferenceState.soundEnabled, false)
})

test('app header exposes accessible notification, account, and MFA password flows', () => {
  assert.match(headerSource, /aria-haspopup="menu"/)
  assert.match(headerSource, /aria-controls="admin-notification-menu"/)
  assert.match(headerSource, /role="menu"/)
  assert.match(headerSource, /role="menuitem"/)
  assert.match(headerSource, /notifications\.hasUnread/)
  assert.match(headerSource, /openCategory\(category\)/)
  assert.match(headerSource, /消息提示音/)
  assert.match(headerSource, /type="checkbox"/)
  assert.match(headerSource, /role="switch"/)
  assert.match(headerSource, /peer-checked:bg-antd-primary/)
  assert.match(headerSource, /AdminSoundGuideDialog/)
  assert.match(headerSource, /刷新后没有声音？/)
  assert.match(headerSource, /openSoundGuide/)
  assert.match(headerSource, /handleSoundGuideOpenChange/)
  assert.match(headerSource, /\(\) => notifications\.soundGuideNeeded/)
  assert.match(headerSource, /soundGuideOpen\.value = true/)
  assert.match(headerSource, /@update:open="handleSoundGuideOpenChange"/)
  assert.match(headerSource, /playRefreshTestSound/)
  assert.match(headerSource, /scheduleRefreshSoundTest/)
  assert.doesNotMatch(headerSource, /测试提示音/)
  assert.doesNotMatch(headerSource, /播放一段消息测试提示音/)
  assert.doesNotMatch(headerSource, /本次提示音可能被浏览器拦截/)
  assert.match(headerSource, /soundGuideNeeded/)
  assert.match(headerSource, /admin-notification-received/)
  assert.match(headerSource, /aria-controls="admin-account-menu"/)
  assert.match(headerSource, /Admin 账号菜单/)
  assert.match(headerSource, /修改密码/)
  assert.match(headerSource, /退出登录/)
  assert.match(headerSource, /AdminChangePasswordDialog/)
  assert.match(headerSource, /MfaVerificationModal/)
  assert.match(headerSource, /openChangePasswordDialog/)
  assert.match(headerSource, /requestPasswordMfa/)
  assert.match(headerSource, /verifyPasswordMfa/)
  assert.match(headerSource, /adminAccount\.changePassword/)
  assert.match(headerSource, /修改登录密码安全验证/)
  assert.match(headerSource, /router\.push\('\/'\)/)
})

test('admin sound guide dialog provides Chrome sound allow-list copy guidance', () => {
  assert.match(soundGuideDialogSource, /useDialogLifecycle/)
  assert.match(soundGuideDialogSource, /role="dialog"/)
  assert.match(soundGuideDialogSource, /aria-modal="true"/)
  assert.match(soundGuideDialogSource, /aria-labelledby="admin-sound-guide-title"/)
  assert.match(soundGuideDialogSource, /aria-label="关闭"/)
  assert.doesNotMatch(soundGuideDialogSource, /@click="close"[^>]*role="presentation"/)
  assert.match(soundGuideDialogSource, /chrome:\/\/settings\/content\/sound/)
  assert.match(soundGuideDialogSource, /window\.location\.host/)
  assert.match(soundGuideDialogSource, /复制 Chrome 声音设置地址/)
  assert.match(soundGuideDialogSource, /复制当前后台域名/)
  assert.match(soundGuideDialogSource, /navigator\?\.clipboard\?\.writeText/)
  assert.match(soundGuideDialogSource, /role="status"/)
  assert.match(soundGuideDialogSource, /请手动选中文本复制/)
})

test('admin account store changes password only after current password and MFA pass', () => {
  setActivePinia(createPinia())
  const store = useAdminAccountStore()

  assert.equal(store.validateCurrentPassword(ADMIN_DEFAULT_PASSWORD), true)
  assert.throws(() => {
    store.changePassword({
      currentPassword: 'wrong-password',
      newPassword: 'newAdmin123',
      mfaCode: '123456'
    })
  }, /当前密码不正确/)

  assert.throws(() => {
    store.changePassword({
      currentPassword: ADMIN_DEFAULT_PASSWORD,
      newPassword: 'short1',
      mfaCode: '123456'
    })
  }, /新密码长度/)

  assert.throws(() => {
    store.changePassword({
      currentPassword: ADMIN_DEFAULT_PASSWORD,
      newPassword: 'newAdmin123',
      mfaCode: '12345'
    })
  }, /MFA 验证码/)

  const result = store.changePassword({
    currentPassword: ADMIN_DEFAULT_PASSWORD,
    newPassword: 'newAdmin123',
    mfaCode: '123456'
  })

  assert.equal(result.ok, true)
  assert.equal(store.validateCurrentPassword('newAdmin123'), true)
  assert.equal(store.validateCurrentPassword(ADMIN_DEFAULT_PASSWORD), false)
  assert.ok(store.passwordLastChangedAt)
})
