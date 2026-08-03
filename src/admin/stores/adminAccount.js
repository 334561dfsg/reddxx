import { defineStore } from 'pinia'

export const ADMIN_DEFAULT_PASSWORD = 'admin123456'

const PASSWORD_STORAGE_KEY = 'fex-admin-password'
const PASSWORD_CHANGED_STORAGE_KEY = 'fex-admin-password-changed-at'

const readStorage = (key, fallback = '') => {
  if (typeof localStorage === 'undefined') return fallback
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

const writeStorage = (key, value) => {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage can be unavailable in private browsing or tests.
  }
}

const assertValidPasswordPayload = ({ currentPassword, newPassword, mfaCode }, currentStoredPassword) => {
  if (!/^\d{6}$/.test(String(mfaCode || ''))) {
    throw new Error('MFA 验证码必须是 6 位数字')
  }
  if (!currentPassword) throw new Error('请输入当前密码')
  if (currentPassword !== currentStoredPassword) throw new Error('当前密码不正确')
  if (!newPassword) throw new Error('请输入新密码')
  if (newPassword.length < 8 || newPassword.length > 32) {
    throw new Error('新密码长度需要为 8-32 位')
  }
  if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    throw new Error('新密码需要同时包含字母和数字')
  }
  if (newPassword === currentStoredPassword) throw new Error('新密码不能与当前密码相同')
}

export const useAdminAccountStore = defineStore('adminAccount', {
  state: () => ({
    password: readStorage(PASSWORD_STORAGE_KEY, ADMIN_DEFAULT_PASSWORD),
    passwordLastChangedAt: readStorage(PASSWORD_CHANGED_STORAGE_KEY, '')
  }),
  actions: {
    validateCurrentPassword(password) {
      return password === this.password
    },
    changePassword(payload) {
      assertValidPasswordPayload(payload, this.password)

      const changedAt = new Date().toISOString()
      this.password = payload.newPassword
      this.passwordLastChangedAt = changedAt
      writeStorage(PASSWORD_STORAGE_KEY, payload.newPassword)
      writeStorage(PASSWORD_CHANGED_STORAGE_KEY, changedAt)

      return {
        ok: true,
        changedAt
      }
    }
  }
})
