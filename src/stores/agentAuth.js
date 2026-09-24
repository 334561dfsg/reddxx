import { defineStore } from 'pinia'
import { usersList } from '../admin/mock/user.js'
import { getUserStaffRepository } from '../admin/repositories/userStaffRepository.js'
import { verifyStaffPassword, verifyStaffTotp } from '../features/user-staff/verifyCredential.js'
import {
  DEFAULT_AGENT_LOGIN_PASSWORD,
  getAgentCredentialByLogin,
  mockAgentList,
  setAgentCredentialMfaBound
} from '../admin/mock/agent.js'

export const AGENT_DEMO_LOGIN_ENABLED = import.meta.env?.DEV === true || import.meta.env?.VITE_ENABLE_DEMO_LOGIN === 'true'

const SESSION_KEY = 'fex-agent-session-v1'
const PROFILES_KEY = 'fex-agent-profiles-v1'

/** 新代理账号默认登录密码（未在本地改过密码时生效） */
export const AGENT_DEFAULT_LOGIN_PASSWORD = 'Agent123456'

function normalizeEmail(email) {
  return String(email).trim().toLowerCase()
}

function loadJson(key, fallback) {
  if (typeof localStorage === 'undefined') return fallback
  try {
    const s = localStorage.getItem(key)
    return s ? JSON.parse(s) : fallback
  } catch {
    return fallback
  }
}

function loadProfiles() {
  return loadJson(PROFILES_KEY, {})
}

function saveProfiles(profiles) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
}

function normalizeLoginAccount(account) {
  return String(account ?? '').trim().toLowerCase()
}

function getProfile(account) {
  if (!account) return null
  const e = normalizeLoginAccount(account)
  const all = loadProfiles()
  return all[e] || null
}

function setProfile(account, patch) {
  const e = normalizeLoginAccount(account)
  const all = loadProfiles()
  all[e] = { ...(all[e] || {}), ...patch }
  saveProfiles(all)
}

function getEffectivePassword(account) {
  const p = getProfile(account)
  if (p?.password && String(p.password).length >= 6) return String(p.password)
  return getAgentCredentialByLogin(account)?.password || DEFAULT_AGENT_LOGIN_PASSWORD
}

/** 与 mockAgentList 对齐的可登录代理 */
function resolveAgentAccountByLogin(loginAccount) {
  const login = normalizeLoginAccount(loginAccount)
  const credential = getAgentCredentialByLogin(login)
  const row = credential
    ? mockAgentList.find((a) => Number(a.uid) === Number(credential.uid))
    : mockAgentList.find((a) => normalizeEmail(a.email) === login || normalizeLoginAccount(a.loginAccount) === login)
  if (!row) return null
  const legacyUserIds = { 100002:'user_1001', 100003:'user_1003', 100004:'user_1009' }
  const userId = legacyUserIds[row.uid] || `user_${row.uid}`
  const user = usersList.find(u => u.id === userId)
  if (row.status !== 'active' || (user && (user.role !== 'agent' || user.status !== 'active'))) return null
  const resolvedLogin = credential?.loginAccount || normalizeLoginAccount(row.loginAccount || row.email)
  return {
    role: 'agent',
    userId,
    agentId: user?.id || null,
    loginAccount: resolvedLogin,
    email: normalizeEmail(row.email),
    nickname: row.username,
    uid: row.uid,
    inviteCode: row.inviteCode || `AG${row.uid}`,
    mfaRequired: credential?.mfaRequired !== false,
    mfaBound: credential?.mfaBound === true
  }
}

function resolveSalespersonByLogin(account) {
  getUserStaffRepository()
  const login = normalizeLoginAccount(account)
  const user = usersList.find(u => normalizeLoginAccount(u.email) === login)
  if (!user || user.role !== 'user' || !user.isSalesperson || user.employeeId || user.status !== 'active') return null
  return { role:'salesperson', userId:user.id, agentId:user.agentParentId || null, uid:user.id.replace(/^user_/, ''), email:user.email, loginAccount:normalizeLoginAccount(user.email), nickname:user.username, inviteCode:null, passwordCredential:user.passwordCredential, mfaSetup:user.mfaSetup }
}

/** 手机号展示：+86 138****5678 */
export function formatAgentPhoneMask(dial, nationalDigits) {
  const d = String(nationalDigits).replace(/\D/g, '')
  if (d.length < 4) return `${dial} ${d || '—'}`
  return `${dial} ${d.slice(0, 3)}****${d.slice(-4)}`
}

export const useAgentAuthStore = defineStore('agentAuth', {
  state: () => ({
    role: null,
    userId: null,
    agentId: null,
    email: null,
    loginAccount: null,
    nickname: null,
    uid: null,
    inviteCode: null,
    token: null,
    _ready: false
  }),
  getters: {
    isLoggedIn: (s) => Boolean(s.token),
    securityProfile(state) {
      if (!state.loginAccount && !state.email) return null
      return getProfile(state.loginAccount || state.email)
    },
    isPhoneBound(state) {
      const p = getProfile(state.loginAccount || state.email)
      return Boolean(p?.phone?.dial && p?.phone?.nationalDigits)
    },
    phoneDisplay(state) {
      const p = getProfile(state.loginAccount || state.email)?.phone
      if (!p?.nationalDigits) return ''
      return formatAgentPhoneMask(p.dial || '+86', p.nationalDigits)
    }
  },
  actions: {
    ensureHydrated() {
      if (this._ready) return
      const data = loadJson(SESSION_KEY, null)
      if (data?.token && data?.email) {
        try {
          getUserStaffRepository()
          const acc = resolveAgentAccountByLogin(data.loginAccount || data.email) || resolveSalespersonByLogin(data.loginAccount || data.email)
          if (acc) this.setAccountSession(acc, data.token)
          else this.logout()
        } catch {
          this.logout()
        }
      }
      this._ready = true
    },
    persistSession() {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          role: this.role,
          userId: this.userId,
          agentId: this.agentId,
          email: this.email,
          loginAccount: this.loginAccount,
          nickname: this.nickname,
          uid: this.uid,
          inviteCode: this.inviteCode,
          token: this.token
        })
      )
    },
    setAccountSession(account, token) {
      for (const key of ['role', 'userId', 'agentId', 'email', 'loginAccount', 'nickname', 'uid', 'inviteCode']) this[key] = account[key] ?? null
      this.token = token
    },
    loginDemo(role) {
      if (!AGENT_DEMO_LOGIN_ENABLED) return { ok:false, message:'当前环境未开启演示登录' }
      try {
        getUserStaffRepository()
        const account = role === 'agent'
          ? resolveAgentAccountByLogin('wang@example.com')
          : role === 'salesperson' ? resolveSalespersonByLogin('sales.test@example.com') : null
        const expectedId = role === 'agent' ? 'user_1001' : 'user_900001'
        if (!account || account.userId !== expectedId || account.role !== role) return { ok:false, message:'演示账号不可用，请检查账号状态' }
        this.setAccountSession(account, `demo_${role}_${Date.now()}`)
        this.persistSession()
        return { ok:true }
      } catch { return { ok:false, message:'演示账号加载失败，请重试' } }
    },
    async loginSalesperson(account, password, options) {
      try {
        const profile = getProfile(account.loginAccount)
        const passwordOk = profile?.password ? String(password) === profile.password : await verifyStaffPassword(String(password), account.passwordCredential)
        if (!passwordOk) return { ok:false, message:'账号或密码错误' }
        if (account.mfaSetup?.secret && !await verifyStaffTotp(account.mfaSetup.secret, String(options.mfaCode || ''))) return { ok:false, requiresMfa:true, message:'请输入验证器中的 6 位安全验证码' }
        const currentAccount = resolveSalespersonByLogin(account.loginAccount)
        if (!currentAccount) return { ok:false, message:'账号已不可用' }
        this.setAccountSession(currentAccount, `salesperson_${Date.now()}`)
        this.persistSession()
        return { ok:true, mfaVerified:Boolean(account.mfaSetup?.secret) }
      } catch {
        return { ok:false, message:'登录验证失败，请稍后重试' }
      }
    },
    login(loginAccount, password, options = {}) {
      const login = normalizeLoginAccount(loginAccount)
      if (login.length < 4) {
        return { ok: false, message: '请输入有效登录账号' }
      }
      if (!password || String(password).length < 6) {
        return { ok: false, message: '密码至少 6 位' }
      }
      try { getUserStaffRepository() } catch { return { ok:false, message:'账号数据加载失败，请稍后重试' } }
      const account = resolveAgentAccountByLogin(login)
      if (!account) {
        const salesperson = resolveSalespersonByLogin(login)
        if (salesperson) return this.loginSalesperson(salesperson, password, options)
      }
      if (!account) {
        return {
          ok: false,
          message: '该账号未开通代理系统访问权限或已停用，请联系管理员。'
        }
      }
      const expected = getEffectivePassword(account.loginAccount)
      if (String(password) !== expected) {
        return { ok: false, message: '账号或密码错误' }
      }
      const profile = getProfile(account.loginAccount)
      const mfaBound = account.mfaBound || Boolean(profile?.phone)
      if (account.mfaRequired && mfaBound && !/^\d{6}$/.test(String(options.mfaCode || ''))) {
        return { ok: false, requiresMfa: true, message: '请输入 6 位安全验证码' }
      }
      this.setAccountSession(account, `agent_${Date.now()}`)
      this.persistSession()
      return {
        ok: true,
        mfaVerified: account.mfaRequired && mfaBound,
        mfaSetupRequired: account.mfaRequired && !mfaBound
      }
    },
    logout() {
      this.role = null
      this.userId = null
      this.agentId = null
      this.email = null
      this.loginAccount = null
      this.nickname = null
      this.uid = null
      this.inviteCode = null
      this.token = null
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(SESSION_KEY)
      }
    },
    /**
     * @returns {{ ok: boolean, message?: string }}
     */
    async changeSalespersonPassword({ oldPassword, newPassword, confirmPassword }) {
      const account = resolveSalespersonByLogin(this.loginAccount)
      if (!account) return { ok:false, message:'账号已不可用，请重新登录' }
      const profile = getProfile(this.loginAccount)
      const valid = profile?.password ? String(oldPassword) === profile.password : await verifyStaffPassword(String(oldPassword ?? ''), account.passwordCredential)
      if (!valid) return { ok:false, message:'当前密码不正确' }
      const next = String(newPassword ?? '')
      if (next.length < 6 || next.length > 128) return { ok:false, message:'密码长度须为 6–128 位' }
      if (next !== confirmPassword) return { ok:false, message:'两次输入的新密码不一致' }
      if (next === oldPassword) return { ok:false, message:'新密码不能与当前密码相同' }
      setProfile(this.loginAccount, {password:next})
      return { ok:true, message:'登录密码已更新，下次请使用新密码登录。' }
    },
    changePassword({ oldPassword, newPassword, confirmPassword }) {
      if (this.role === 'salesperson') return this.changeSalespersonPassword({ oldPassword, newPassword, confirmPassword })
      if (!this.email) return { ok: false, message: '未登录' }
      const login = normalizeLoginAccount(this.loginAccount || this.email)
      const old = String(oldPassword ?? '')
      const next = String(newPassword ?? '')
      const c = String(confirmPassword ?? '')
      if (old !== getEffectivePassword(login)) {
        return { ok: false, message: '当前密码不正确' }
      }
      if (next.length < 6) {
        return { ok: false, message: '新密码至少 6 位' }
      }
      if (next !== c) {
        return { ok: false, message: '两次输入的新密码不一致' }
      }
      if (next === old) {
        return { ok: false, message: '新密码不能与当前密码相同' }
      }
      setProfile(login, { password: next })
      return { ok: true, message: '登录密码已更新，下次请使用新密码登录。' }
    },
    /**
     * 发送短信验证码（本地模拟：生成 6 位数字并短时缓存）
     * @returns {{ ok: boolean, message?: string, previewCode?: string }}
     */
    sendPhoneBindSms() {
      if (!this.email) return { ok: false, message: '未登录' }
      const code = String(Math.floor(100000 + Math.random() * 900000))
      const key = `fex-agent-sms-${normalizeLoginAccount(this.loginAccount || this.email)}`
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(
          key,
          JSON.stringify({ code, exp: Date.now() + 5 * 60 * 1000 })
        )
      }
      return { ok: true, message: '验证码已发送', previewCode: code }
    },
    /**
     * @returns {{ ok: boolean, message?: string }}
     */
    bindPhone({ dial, nationalDigits, smsCode }) {
      if (!this.email) return { ok: false, message: '未登录' }
      const e = normalizeLoginAccount(this.loginAccount || this.email)
      const dc = String(dial || '+86').trim() || '+86'
      const digits = String(nationalDigits).replace(/\D/g, '')
      if (digits.length < 5 || digits.length > 15) {
        return { ok: false, message: '请输入有效的手机号码' }
      }
      const c = String(smsCode ?? '').trim()
      if (!/^\d{6}$/.test(c)) {
        return { ok: false, message: '请输入 6 位数字验证码' }
      }
      const key = `fex-agent-sms-${e}`
      let valid = false
      if (typeof sessionStorage !== 'undefined') {
        try {
          const raw = sessionStorage.getItem(key)
          if (raw) {
            const { code, exp } = JSON.parse(raw)
            if (Date.now() <= exp && String(code) === c) valid = true
          }
        } catch {
          valid = false
        }
      }
      if (!valid) {
        return { ok: false, message: '验证码无效或已过期，请重新获取' }
      }
      setProfile(e, {
        phone: {
          dial: dc,
          nationalDigits: digits,
          verifiedAt: new Date().toISOString()
        }
      })
      setAgentCredentialMfaBound(e, true)
      sessionStorage.removeItem(key)
      return { ok: true, message: '手机号已绑定' }
    }
  }
})
