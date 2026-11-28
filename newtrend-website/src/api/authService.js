// Auth mock: password login and password reset over one in-memory account store, so a reset changes the password
// login checks. Login (user request, 2026-11-28) reports an unknown account, a wrong password with the attempts
// left, and a 15-minute lock after MAX_LOGIN_ATTEMPTS failures; a successful reset clears the lock.
// Register (user request, 2026-11-28) adds an account to the same store: already-registered identifiers, username
// format and password length are reported; a username account has no bound email until one is added.
// Password reset (user decision, 2026-11-28): the account is found by email, phone (dial code + number) or
// username, and the code always goes to the account's bound email, shown masked. Unknown accounts and accounts
// without a bound email get their own errors (user decision, 2026-11-28: both are shown, the demo needs them). Nothing is emailed: the demo code is DEMO_RESET_CODE.
// State is in memory only and resets on reload.
import {ApiError, mockCall} from './transport.js'
import {clock} from '../mock/clock.js'

const SERVICE = 'auth'
export const DEMO_RESET_CODE = '123456'
export const RESET_CODE_TTL = 10 * 60 * 1000
export const RESEND_COOLDOWN = 60 * 1000
export const MAX_CODE_ATTEMPTS = 5
export const MIN_PASSWORD_LENGTH = 6
export const DEMO_PASSWORD = 'Demo1234'
export const MAX_LOGIN_ATTEMPTS = 5
export const LOGIN_LOCK = 15 * 60 * 1000
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^\d{6,15}$/
const USERNAME = /^[A-Za-z0-9_]{3,20}$/

/** Seed accounts (password DEMO_PASSWORD): two with a bound email, one (phone/username only) without. */
export const SEED_ACCOUNTS = [
  {id: 'U1001', email: 'demo.trader@newquant.test', dial: '+1', phone: '2025550123', username: 'demo_trader'},
  {id: 'U1002', email: 'alice.chen@newquant.test', dial: '+886', phone: '912345678', username: 'alice'},
  {id: 'U1003', email: '', dial: '+852', phone: '61234567', username: 'nomail'},
]

/** ab***@example.com: two leading characters of the local part (one for very short names) and the full domain. */
export function maskEmail(email) {
  const [local, domain] = email.split('@')
  return `${local.slice(0, local.length > 2 ? 2 : 1)}***@${domain}`
}

export function createAuthApi({accounts = SEED_ACCOUNTS, now = () => clock.now()} = {}) {
  const store = accounts.map(account => ({password: DEMO_PASSWORD, ...account, failures: 0, lockedUntil: 0}))
  const tickets = new Map(), lastSent = new Map()
  let sequence = 0

  function find({method, identifier, dial}) {
    const value = String(identifier || '').trim()
    if (method === 'email') {
      if (!value) throw new ApiError('auth.enterEmail')
      if (!EMAIL.test(value)) throw new ApiError('profile.bindEmailPage.invalidEmail')
      return {key: `email:${value.toLowerCase()}`, account: store.find(a => a.email && a.email.toLowerCase() === value.toLowerCase())}
    }
    if (method === 'phone') {
      const digits = value.replace(/[\s-]/g, '')
      if (!digits) throw new ApiError('auth.enterPhone')
      if (!PHONE.test(digits)) throw new ApiError('auth.reset.invalidPhone')
      return {key: `phone:${dial}${digits}`, account: store.find(a => a.dial === dial && a.phone === digits)}
    }
    if (method === 'username') {
      if (!value) throw new ApiError('auth.enterUsername')
      return {key: `username:${value.toLowerCase()}`, account: store.find(a => a.username && a.username.toLowerCase() === value.toLowerCase())}
    }
    throw new ApiError('auth.reset.unsupported')
  }

  /** Password login. Returns the account's public fields or a coded error (attempts left / lock minutes in params). */
  const loginWithPassword = ({password = '', ...request} = {}) => mockCall(SERVICE, () => {
    const {account} = find(request)
    if (!password) throw new ApiError('auth.enterPassword')
    if (!account) throw new ApiError('auth.loginFail.accountNotFound')
    if (account.lockedUntil > now()) throw new ApiError('auth.loginFail.locked', {minutes: Math.ceil((account.lockedUntil - now()) / 60000)})
    if (password !== account.password) {
      account.failures++
      if (account.failures >= MAX_LOGIN_ATTEMPTS) {
        account.failures = 0
        account.lockedUntil = now() + LOGIN_LOCK
        throw new ApiError('auth.loginFail.locked', {minutes: LOGIN_LOCK / 60000})
      }
      throw new ApiError('auth.loginFail.wrongPassword', {count: MAX_LOGIN_ATTEMPTS - account.failures})
    }
    account.failures = 0
    return {id: account.id, username: account.username || ''}
  })

  /** Creates an account for the email, phone or username; the new account can log in and reset right away. */
  const registerAccount = ({password = '', ...request} = {}) => mockCall(SERVICE, () => {
    const {account} = find(request)
    if (request.method === 'username' && !USERNAME.test(String(request.identifier).trim())) throw new ApiError('auth.registerFail.usernameFormat')
    if (account) throw new ApiError(`auth.registerFail.${request.method}Taken`)
    if (!password) throw new ApiError('auth.enterPassword')
    if (password.length < MIN_PASSWORD_LENGTH) throw new ApiError('auth.passwordTooShort')
    const value = String(request.identifier).trim()
    const created = {id: `U${2000 + store.length}`, email: '', dial: '', phone: '', username: '', password, failures: 0, lockedUntil: 0}
    if (request.method === 'email') created.email = value
    else if (request.method === 'phone') Object.assign(created, {dial: request.dial, phone: value.replace(/[\s-]/g, '')})
    else created.username = value
    store.push(created)
    return {id: created.id}
  })

  /** Sends (simulates) a code to the bound email. Returns {ticket, maskedEmail, resendIn} or a coded error. */
  const requestResetCode = request => mockCall(SERVICE, () => {
    const {key, account} = find(request || {})
    if (!account) throw new ApiError('auth.reset.accountNotFound')
    if (!account.email) throw new ApiError('auth.reset.noBoundEmail')
    const waited = now() - (lastSent.get(key) ?? -Infinity)
    if (waited < RESEND_COOLDOWN) throw new ApiError('auth.reset.tooSoon', {count: Math.ceil((RESEND_COOLDOWN - waited) / 1000)})
    lastSent.set(key, now())
    for (const [id, ticket] of tickets) if (ticket.key === key) tickets.delete(id)
    const ticket = `RT${++sequence}`
    tickets.set(ticket, {key, accountId: account.id, expiresAt: now() + RESET_CODE_TTL, attempts: 0})
    return {ticket, maskedEmail: maskEmail(account.email), resendIn: RESEND_COOLDOWN / 1000}
  })

  /** Checks the password pair, then the code; a wrong code counts against the ticket. */
  const resetPassword = ({ticket, code, password = '', confirm = ''} = {}) => mockCall(SERVICE, () => {
    if (password.length < MIN_PASSWORD_LENGTH) throw new ApiError('auth.passwordTooShort')
    if (password !== confirm) throw new ApiError('auth.reset.mismatch')
    if (!/^\d{6}$/.test(String(code || ''))) throw new ApiError('auth.reset.codeFormat')
    const entry = tickets.get(ticket)
    if (!entry || entry.expiresAt <= now()) { tickets.delete(ticket); throw new ApiError('auth.reset.codeExpired') }
    if (entry.attempts >= MAX_CODE_ATTEMPTS) throw new ApiError('auth.reset.tooManyAttempts')
    if (code !== DEMO_RESET_CODE) {
      entry.attempts++
      throw new ApiError(entry.attempts >= MAX_CODE_ATTEMPTS ? 'auth.reset.tooManyAttempts' : 'auth.reset.invalidCode')
    }
    Object.assign(store.find(account => account.id === entry.accountId), {password, failures: 0, lockedUntil: 0})
    tickets.delete(ticket)
    return {done: true}
  })

  /** Test hook: the stored password of an account. */
  const passwordOf = id => store.find(account => account.id === id)?.password

  return {registerAccount, loginWithPassword, requestResetCode, resetPassword, passwordOf}
}
