import { defineStore } from 'pinia'

const SESSION_KEY = 'fex-front-session-v1'
const USERS_KEY = 'fex-front-users-v1'

export const FRONT_ACCOUNT_MODE = {
  DEMO: 'demo',
  REAL: 'real'
}

export const FRONT_ACCOUNT_MODE_LABELS = {
  [FRONT_ACCOUNT_MODE.DEMO]: '模拟账户',
  [FRONT_ACCOUNT_MODE.REAL]: '正式账户'
}

function normalizeAccountMode(value) {
  return Object.hasOwn(FRONT_ACCOUNT_MODE_LABELS, value)
    ? value
    : FRONT_ACCOUNT_MODE.DEMO
}

/**
 * 内置演示账号（仅本地 mock）。每次恢复会话前会合并进用户表，无需先注册即可登录。
 * 对接真实接口后可整段删除。
 */
export const FRONT_DEMO_SEED_USERS = [
  { email: 'demo@fex.local', password: 'Demo123456', nickname: '演示账户' },
  { email: 'trader@fex.local', password: 'Demo123456', nickname: '交易员演示' }
]

/** 模拟钱包登录（无链上连接，仅用于前台演示）。对接真实 Web3 后替换为签名与后端验签。 */
export const FRONT_WALLET_LOGIN_PROVIDERS = [
  {
    key: 'metamask',
    label: 'MetaMask',
    /** 固定演示地址，便于文案展示 */
    mockAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
  },
  {
    key: 'walletconnect',
    label: 'WalletConnect',
    mockAddress: '0x8ba1f109551bd432803012645dac136c77c81e77'
  },
  {
    key: 'coinbase',
    label: 'Coinbase Wallet',
    mockAddress: '0xdeadbeef5dabc65f7aef7e62bc234c9d4d2a8e8a'
  },
  {
    key: 'okx',
    label: 'OKX Wallet',
    mockAddress: '0x0e3e772014d7ee78d08dc59159e4f6c1c6c0e9e1'
  },
  {
    key: 'rabby',
    label: 'Rabby',
    mockAddress: '0x4bb7f3c9a8e2d0b1f5a6c7e8d9b0a1c2d3e4f5ab'
  }
]

const WALLET_ONLY_PASSWORD = '__wallet_mock__'
function shortWalletAddress(addr) {
  const s = String(addr)
  if (s.length < 12) return s
  return `${s.slice(0, 6)}…${s.slice(-4)}`
}

function walletEmailForProvider(key) {
  return normalizeEmail(`wallet.${key}@mock.fex.local`)
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

/** 示例用户表：仅本地演示，对接真实接口后删除 */
function loadUsers() {
  return loadJson(USERS_KEY, [])
}

function saveUsers(users) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function normalizeEmail(email) {
  return String(email).trim().toLowerCase()
}

/**
 * 与 `loginWithPhone` 使用同一合成邮箱键，便于手机号登录/找回一致。
 * @param {string} dialCode 如 +86
 * @param {string} nationalRaw 本地号码（可含非数字，会剥离）
 */
export function buildSyntheticPhoneUserEmail(dialCode, nationalRaw) {
  const dc = String(dialCode || '+86').trim() || '+86'
  const digits = String(nationalRaw).replace(/\D/g, '')
  return normalizeEmail(`phone.${dc.replace(/\+/g, '')}.${digits}@mock.fex.local`)
}

/**
 * 演示环境：视为「手机 / 邮箱 / MFA 均已绑定」的邮箱列表（种子邮箱登录 + 各钱包 mock 账号）。
 * 与安全中心、登录二次验证同源，对接接口后可删除。
 */
export function frontDemoSecuritySeedEmails() {
  const emails = FRONT_DEMO_SEED_USERS.map((u) => normalizeEmail(u.email))
  for (const p of FRONT_WALLET_LOGIN_PROVIDERS) {
    emails.push(normalizeEmail(`wallet.${p.key}@mock.fex.local`))
  }
  return emails
}

/** 保证演示账号存在于本地用户表并与种子一致（幂等） */
function mergeDemoUsersIntoStorage() {
  if (typeof localStorage === 'undefined') return
  const users = loadUsers()
  let changed = false
  for (const d of FRONT_DEMO_SEED_USERS) {
    const e = normalizeEmail(d.email)
    const row = { email: e, password: d.password, nickname: d.nickname }
    const i = users.findIndex((u) => u.email === e)
    if (i === -1) {
      users.push(row)
      changed = true
    } else {
      const prev = users[i]
      if (prev.password !== row.password || prev.nickname !== row.nickname) {
        users[i] = row
        changed = true
      }
    }
  }
  if (changed) saveUsers(users)
}

export const useFrontAuthStore = defineStore('frontAuth', {
  state: () => ({
    email: null,
    nickname: null,
    token: null,
    accountMode: FRONT_ACCOUNT_MODE.DEMO,
    _ready: false
  }),
  getters: {
    isLoggedIn: (s) => Boolean(s.token),
    accountModeLabel: (s) => FRONT_ACCOUNT_MODE_LABELS[s.accountMode] || FRONT_ACCOUNT_MODE_LABELS[FRONT_ACCOUNT_MODE.DEMO],
    nextAccountMode: (s) => s.accountMode === FRONT_ACCOUNT_MODE.DEMO ? FRONT_ACCOUNT_MODE.REAL : FRONT_ACCOUNT_MODE.DEMO,
    nextAccountModeLabel() {
      return FRONT_ACCOUNT_MODE_LABELS[this.nextAccountMode]
    }
  },
  actions: {
    ensureHydrated() {
      mergeDemoUsersIntoStorage()
      if (this._ready) return
      const data = loadJson(SESSION_KEY, null)
      if (data?.token && data?.email) {
        this.email = data.email
        this.nickname = data.nickname ?? null
        this.token = data.token
        this.accountMode = normalizeAccountMode(data.accountMode)
      }
      this._ready = true
    },
    persistSession() {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          email: this.email,
          nickname: this.nickname,
          token: this.token,
          accountMode: normalizeAccountMode(this.accountMode)
        })
      )
    },
    setAccountMode(mode) {
      if (!Object.hasOwn(FRONT_ACCOUNT_MODE_LABELS, mode)) {
        throw new Error('账户模式无效')
      }
      this.accountMode = mode
      this.persistSession()
    },
    login(email, password) {
      mergeDemoUsersIntoStorage()
      const e = normalizeEmail(email)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
        return { ok: false, message: '请输入有效邮箱' }
      }
      if (!password || String(password).length < 6) {
        return { ok: false, message: '密码至少 6 位' }
      }
      const users = loadUsers()
      const row = users.find((u) => u.email === e)
      if (!row) {
        return { ok: false, message: '该邮箱尚未注册' }
      }
      if (row.password !== String(password)) {
        return { ok: false, message: '密码错误' }
      }
      this.email = e
      this.nickname = row.nickname || e.split('@')[0]
      this.token = `mock_${Date.now()}`
      this.persistSession()
      return { ok: true }
    },
    /**
     * 模拟钱包一键登录：写入本地会话。真实接入时需调 provider、签名 message、换新 token。
     * @param {string} providerKey {@link FRONT_WALLET_LOGIN_PROVIDERS}[].key
     */
    /**
     * 演示：国际区号 + 本地号码登录（与站点配置「区号手机号」联动）。
     * 会话邮箱为合成地址，仅用于本地 mock。
     */
    loginWithPhone(dialCode, nationalDigits, password) {
      mergeDemoUsersIntoStorage()
      if (!password || String(password).length < 6) {
        return { ok: false, message: '密码至少 6 位' }
      }
      const dc = String(dialCode || '+86').trim() || '+86'
      const digits = String(nationalDigits).replace(/\D/g, '')
      if (digits.length < 5 || digits.length > 15) {
        return { ok: false, message: '请输入有效的手机号码' }
      }
      const synthetic = buildSyntheticPhoneUserEmail(dc, digits)
      const users = loadUsers()
      let row = users.find((u) => u.email === synthetic)
      const nick = `${dc} · ${digits.slice(-4)}`
      const pwd = String(password)
      if (!row) {
        row = { email: synthetic, password: pwd, nickname: nick }
        users.push(row)
        saveUsers(users)
      } else if (row.password !== pwd) {
        return { ok: false, message: '密码错误' }
      }
      this.email = synthetic
      this.nickname = row.nickname || nick
      this.token = `mock_phone_${Date.now()}`
      this.persistSession()
      return { ok: true }
    },
    loginWithMockWallet(providerKey) {
      mergeDemoUsersIntoStorage()
      const meta = FRONT_WALLET_LOGIN_PROVIDERS.find((p) => p.key === providerKey)
      if (!meta) {
        return { ok: false, message: '不支持的钱包类型' }
      }
      const e = walletEmailForProvider(meta.key)
      const nick = `${meta.label} · ${shortWalletAddress(meta.mockAddress)}`
      const users = loadUsers()
      let row = users.find((u) => u.email === e)
      if (!row) {
        row = { email: e, password: WALLET_ONLY_PASSWORD, nickname: nick }
        users.push(row)
        saveUsers(users)
      } else if (row.nickname !== nick) {
        row = { ...row, nickname: nick }
        const i = users.findIndex((u) => u.email === e)
        users[i] = row
        saveUsers(users)
      }
      this.email = e
      this.nickname = row.nickname || nick
      this.token = `mock_wallet_${meta.key}_${Date.now()}`
      this.persistSession()
      return { ok: true }
    },
    register(email, password, confirmPassword, nickname, verificationCode) {
      mergeDemoUsersIntoStorage()
      const c = String(verificationCode ?? '').trim()
      if (!/^\d{6}$/.test(c)) {
        return { ok: false, message: '请输入 6 位数字验证码' }
      }
      const e = normalizeEmail(email)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
        return { ok: false, message: '请输入有效邮箱' }
      }
      if (!password || String(password).length < 6) {
        return { ok: false, message: '密码至少 6 位' }
      }
      if (password !== confirmPassword) {
        return { ok: false, message: '两次密码不一致' }
      }
      const users = loadUsers()
      if (users.some((u) => u.email === e)) {
        return { ok: false, message: '该邮箱已注册，请直接登录' }
      }
      const nick = (nickname && String(nickname).trim()) || e.split('@')[0]
      users.push({ email: e, password: String(password), nickname: nick })
      saveUsers(users)
      this.email = e
      this.nickname = nick
      this.token = `mock_${Date.now()}`
      this.persistSession()
      return { ok: true }
    },
    /**
     * 手机号注册：合成邮箱键与 `loginWithPhone` 一致。
     */
    registerWithPhone(dialCode, nationalDigits, password, confirmPassword, nickname, verificationCode) {
      mergeDemoUsersIntoStorage()
      const c = String(verificationCode ?? '').trim()
      if (!/^\d{6}$/.test(c)) {
        return { ok: false, message: '请输入 6 位数字验证码' }
      }
      if (!password || String(password).length < 6) {
        return { ok: false, message: '密码至少 6 位' }
      }
      if (password !== confirmPassword) {
        return { ok: false, message: '两次密码不一致' }
      }
      const dc = String(dialCode || '+86').trim() || '+86'
      const digits = String(nationalDigits).replace(/\D/g, '')
      if (digits.length < 5 || digits.length > 15) {
        return { ok: false, message: '请输入有效的手机号码' }
      }
      const synthetic = buildSyntheticPhoneUserEmail(dc, digits)
      const users = loadUsers()
      if (users.some((u) => u.email === synthetic)) {
        return { ok: false, message: '该手机号已注册，请直接登录' }
      }
      const nick =
        (nickname && String(nickname).trim()) || `${dc} · ${digits.slice(-4)}`
      users.push({ email: synthetic, password: String(password), nickname: nick })
      saveUsers(users)
      this.email = synthetic
      this.nickname = nick
      this.token = `mock_phone_reg_${Date.now()}`
      this.persistSession()
      return { ok: true }
    },
    logout() {
      this.email = null
      this.nickname = null
      this.token = null
      this.accountMode = FRONT_ACCOUNT_MODE.DEMO
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(SESSION_KEY)
      }
    },
    /**
     * 找回密码前校验账号是否存在于本机用户表（演示）。
     * @param {{ channel: 'email'|'phone', email?: string, dial?: string, nationalDigits?: string }} p
     */
    /**
     * 注册前校验「收码目标」：邮箱/手机号格式正确且尚未注册（用于发送验证码）。
     * @param {{ channel: 'email'|'phone', email?: string, dial?: string, nationalDigits?: string }} p
     */
    validateRegisterVerificationTarget(p) {
      mergeDemoUsersIntoStorage()
      const users = loadUsers()
      if (p.channel === 'email') {
        const e = normalizeEmail(String(p.email ?? ''))
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
          return { ok: false, message: '请输入有效邮箱' }
        }
        if (users.some((u) => u.email === e)) {
          return { ok: false, message: '该邮箱已注册，请直接登录' }
        }
        return { ok: true }
      }
      const dc = String(p.dial || '+86').trim() || '+86'
      const digits = String(p.nationalDigits ?? '').replace(/\D/g, '')
      if (digits.length < 5 || digits.length > 15) {
        return { ok: false, message: '请输入有效的手机号码' }
      }
      const synthetic = buildSyntheticPhoneUserEmail(dc, digits)
      if (users.some((u) => u.email === synthetic)) {
        return { ok: false, message: '该手机号已注册，请直接登录' }
      }
      return { ok: true }
    },
    validateResetAccountExists(p) {
      mergeDemoUsersIntoStorage()
      const users = loadUsers()
      if (p.channel === 'email') {
        const e = normalizeEmail(String(p.email ?? ''))
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
          return { ok: false, message: '请输入有效邮箱' }
        }
        if (!users.some((u) => u.email === e)) {
          return { ok: false, message: '该邮箱尚未在本机注册' }
        }
        return { ok: true }
      }
      const dc = String(p.dial || '+86').trim() || '+86'
      const digits = String(p.nationalDigits ?? '').replace(/\D/g, '')
      if (digits.length < 5 || digits.length > 15) {
        return { ok: false, message: '请输入有效的手机号码' }
      }
      const synthetic = buildSyntheticPhoneUserEmail(dc, digits)
      if (!users.some((u) => u.email === synthetic)) {
        return { ok: false, message: '该手机号尚未在本机注册' }
      }
      return { ok: true }
    },
    /**
     * 验证码 + 新密码重置（演示：任意 6 位数字视为通过；真实环境应对接短信/邮件校验）。
     */
    resetPasswordWithVerification(p) {
      mergeDemoUsersIntoStorage()
      const {
        channel,
        email,
        dial,
        nationalDigits,
        code,
        newPassword,
        confirmPassword
      } = p
      const pre = this.validateResetAccountExists({
        channel,
        email,
        dial,
        nationalDigits
      })
      if (!pre.ok) return pre
      const c = String(code ?? '').trim()
      if (!/^\d{6}$/.test(c)) {
        return { ok: false, message: '请输入 6 位数字验证码' }
      }
      if (!newPassword || String(newPassword).length < 6) {
        return { ok: false, message: '新密码至少 6 位' }
      }
      if (String(newPassword) !== String(confirmPassword)) {
        return { ok: false, message: '两次新密码不一致' }
      }
      const users = loadUsers()
      let targetEmail
      if (channel === 'email') {
        targetEmail = normalizeEmail(String(email ?? ''))
      } else {
        const dc = String(dial || '+86').trim() || '+86'
        const digits = String(nationalDigits ?? '').replace(/\D/g, '')
        targetEmail = buildSyntheticPhoneUserEmail(dc, digits)
      }
      const i = users.findIndex((u) => u.email === targetEmail)
      if (i === -1) {
        return { ok: false, message: '账号不存在' }
      }
      users[i] = { ...users[i], password: String(newPassword) }
      saveUsers(users)
      return { ok: true, message: '密码已重置，请使用新密码登录' }
    }
  }
})
