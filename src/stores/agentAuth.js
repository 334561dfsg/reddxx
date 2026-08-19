import { defineStore } from 'pinia'
import {
  DEFAULT_AGENT_LOGIN_PASSWORD,
  getAgentCredentialByLogin,
  mockAgentList,
  setAgentCredentialMfaBound
} from '../admin/mock/agent.js'

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
  const resolvedLogin = credential?.loginAccount || normalizeLoginAccount(row.loginAccount || row.email)
  return {
    loginAccount: resolvedLogin,
    email: normalizeEmail(row.email),
    nickname: row.username,
    uid: row.uid,
    inviteCode: row.inviteCode || `AG${row.uid}`,
    mfaRequired: credential?.mfaRequired !== false,
    mfaBound: credential?.mfaBound === true
  }
}

/** 手机号展示：+86 138****5678 */
export function formatAgentPhoneMask(dial, nationalDigits) {
  const d = String(nationalDigits).replace(/\D/g, '')
  if (d.length < 4) return `${dial} ${d || '—'}`
  return `${dial} ${d.slice(0, 3)}****${d.slice(-4)}`
}

export const useAgentAuthStore = defineStore('agentAuth', {
  state: () => ({
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
        this.email = data.email
        this.nickname = data.nickname ?? null
        this.token = data.token
        const acc = resolveAgentAccountByLogin(data.loginAccount || data.email)
        this.uid = data.uid ?? acc?.uid ?? null
        this.inviteCode = data.inviteCode ?? acc?.inviteCode ?? null
        this.loginAccount = data.loginAccount ?? acc?.loginAccount ?? data.email
        if (acc && !this.nickname) this.nickname = acc.nickname
      }
      this._ready = true
    },
    persistSession() {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          email: this.email,
          loginAccount: this.loginAccount,
          nickname: this.nickname,
          uid: this.uid,
          inviteCode: this.inviteCode,
          token: this.token
        })
      )
    },
    login(loginAccount, password, options = {}) {
      const login = normalizeLoginAccount(loginAccount)
      if (login.length < 4) {
        return { ok: false, message: '请输入有效登录账号' }
      }
      if (!password || String(password).length < 6) {
        return { ok: false, message: '密码至少 6 位' }
      }
      const account = resolveAgentAccountByLogin(login)
      if (!account) {
        return {
          ok: false,
          message: '该账号尚未开通代理。请先在平台完成注册，并由运营在管理后台「代理管理」中将您升级为代理。'
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
      this.email = account.email
      this.loginAccount = account.loginAccount
      this.nickname = account.nickname
      this.uid = account.uid
      this.inviteCode = account.inviteCode
      this.token = `agent_${Date.now()}`
      this.persistSession()
      return {
        ok: true,
        mfaVerified: account.mfaRequired && mfaBound,
        mfaSetupRequired: account.mfaRequired && !mfaBound
      }
    },
    logout() {
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
    changePassword({ oldPassword, newPassword, confirmPassword }) {
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
