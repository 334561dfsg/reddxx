import test from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { agentApi, __resetAgentCredentialsForTests, getAgentCredentialByLogin } from '../src/admin/mock/agent.js'
import { useAgentAuthStore } from '../src/stores/agentAuth.js'

function installStorage(name) {
  const data = new Map()
  globalThis[name] = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    clear: () => data.clear()
  }
}

test('upgrading a user to agent stores login credentials and delivery message', async () => {
  __resetAgentCredentialsForTests()

  const res = await agentApi.upgradeToAgent({
    userId: 'user_1002',
    loginAccount: 'vip-zhang-agent',
    password: 'Agent!23456',
    passwordMode: 'manual'
  })

  assert.equal(res.success, true)
  assert.equal(res.data.agent.loginAccount, 'vip-zhang-agent')
  assert.equal(res.data.delivery.loginAccount, 'vip-zhang-agent')
  assert.equal(res.data.delivery.initialPassword, 'Agent!23456')
  assert.match(res.data.delivery.message, /代理系统登录信息/)
  assert.doesNotMatch(res.data.delivery.message, /登录入口/)
  assert.doesNotMatch(res.data.delivery.message, /\/agent-system\/login/)
  assert.match(res.data.delivery.message, /首次登录后请完成 MFA/)
  assert.match(res.data.delivery.message, /MFA 密钥：/)
  assert.match(res.data.delivery.message, /MFA 二维码：见下方截图区域/)
  assert.doesNotMatch(res.data.delivery.message, /https:\/\/api\.qrserver\.com/)
  assert.match(res.data.delivery.mfaSetup.secret, /^[A-Z2-7]{16}$/)
  assert.match(res.data.delivery.mfaSetup.otpauthUrl, /^otpauth:\/\/totp\//)
  assert.match(res.data.delivery.mfaSetup.qrCodeUrl, /^https:\/\/api\.qrserver\.com\/v1\/create-qr-code\//)

  const credential = getAgentCredentialByLogin('VIP-ZHANG-AGENT')
  assert.equal(credential.uid, res.data.agent.uid)
  assert.equal(credential.password, 'Agent!23456')
  assert.equal(credential.mfaSecret, res.data.delivery.mfaSetup.secret)
})

test('agent login accepts configured account and enforces MFA code after binding', async () => {
  __resetAgentCredentialsForTests()
  installStorage('localStorage')
  installStorage('sessionStorage')
  setActivePinia(createPinia())
  const auth = useAgentAuthStore()
  await agentApi.upgradeToAgent({
    userId: 'user_1004',
    loginAccount: 'chen-agent',
    password: 'Agent!654321',
    passwordMode: 'manual'
  })

  let result = auth.login('chen-agent', 'Agent!654321')
  assert.equal(result.ok, true)
  assert.equal(result.mfaSetupRequired, true)
  assert.equal(auth.loginAccount, 'chen-agent')

  const sms = auth.sendPhoneBindSms()
  assert.equal(sms.ok, true)
  const bound = auth.bindPhone({ dial: '+86', nationalDigits: '13900001004', smsCode: sms.previewCode })
  assert.equal(bound.ok, true)
  auth.logout()

  result = auth.login('chen-agent', 'Agent!654321')
  assert.equal(result.ok, false)
  assert.equal(result.requiresMfa, true)
  assert.match(result.message, /安全验证码/)

  result = auth.login('chen-agent', 'Agent!654321', { mfaCode: '123456' })
  assert.equal(result.ok, true)
  assert.equal(result.mfaVerified, true)
})

test('agent account settings rejects duplicate login account and returns reset delivery', async () => {
  __resetAgentCredentialsForTests()
  const created = await agentApi.upgradeToAgent({
    userId: 'user_1005',
    loginAccount: 'liu-agent',
    password: 'Agent!222222',
    passwordMode: 'manual'
  })

  await assert.rejects(
    agentApi.updateAgentLoginCredential(created.data.agent.uid, {
      loginAccount: 'zhang@example.com'
    }),
    /登录账号已被其他代理使用/
  )

  const updated = await agentApi.updateAgentLoginCredential(created.data.agent.uid, {
    loginAccount: 'liu-agent-new',
    password: 'Agent!333333',
    resetPassword: true,
    passwordMode: 'manual'
  })

  assert.equal(updated.success, true)
  assert.equal(updated.data.credential.loginAccount, 'liu-agent-new')
  assert.equal(updated.data.delivery.initialPassword, 'Agent!333333')
  assert.match(updated.data.delivery.message, /代理登录账号已更新/)
  assert.doesNotMatch(updated.data.delivery.message, /登录入口/)
  assert.doesNotMatch(updated.data.delivery.message, /\/agent-system\/login/)
})

test('agent account settings can reset MFA without resetting password', async () => {
  __resetAgentCredentialsForTests()
  const created = await agentApi.upgradeToAgent({
    userId: 'user_1006',
    loginAccount: 'mfa-reset-agent',
    password: 'Agent!444444',
    passwordMode: 'manual'
  })
  const before = getAgentCredentialByLogin('mfa-reset-agent')

  const updated = await agentApi.updateAgentLoginCredential(created.data.agent.uid, {
    loginAccount: 'mfa-reset-agent',
    resetMfa: true
  })

  const after = getAgentCredentialByLogin('mfa-reset-agent')
  assert.equal(updated.success, true)
  assert.equal(updated.data.delivery.initialPassword, '')
  assert.notEqual(after.mfaSecret, before.mfaSecret)
  assert.equal(after.mfaBound, false)
  assert.equal(updated.data.delivery.mfaSetup.secret, after.mfaSecret)
  assert.match(updated.data.delivery.message, /MFA 密钥：/)
  assert.match(updated.data.delivery.message, /MFA 二维码：见下方截图区域/)
  assert.doesNotMatch(updated.data.delivery.message, /https:\/\/api\.qrserver\.com/)
})

test('agent user lookup matches only exact user id and returns a single candidate', async () => {
  __resetAgentCredentialsForTests()

  let res = await agentApi.searchAgentUserCandidates('user_1004')
  assert.equal(res.success, true)
  assert.equal(res.data.length, 1)
  assert.equal(res.data[0].id, 'user_1004')
  assert.equal(res.data[0].username, 'user_chen')

  res = await agentApi.searchAgentUserCandidates('1004')
  assert.equal(res.data.length, 1)
  assert.equal(res.data[0].id, 'user_1004')

  res = await agentApi.searchAgentUserCandidates('chen@example.com')
  assert.deepEqual(res.data, [])

  res = await agentApi.searchAgentUserCandidates('user_999999')
  assert.deepEqual(res.data, [])
})
