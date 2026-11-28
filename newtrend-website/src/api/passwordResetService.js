// Password-reset mock (user decision, 2026-11-28): the account is found by email, phone (dial code + number) or
// username, and the code always goes to the account's bound email, shown masked. An unknown account gets the same
// "sent" answer without a masked address, so the page cannot be used to test which accounts exist; an account
// without a bound email is told to contact support. Nothing is emailed: the demo code is DEMO_RESET_CODE.
// State is in memory only and resets on reload.
import {ApiError, mockCall} from './transport.js'
import {clock} from '../mock/clock.js'

const SERVICE = 'auth'
export const DEMO_RESET_CODE = '123456'
export const RESET_CODE_TTL = 10 * 60 * 1000
export const RESEND_COOLDOWN = 60 * 1000
export const MAX_CODE_ATTEMPTS = 5
export const MIN_PASSWORD_LENGTH = 6
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^\d{6,15}$/

/** Seed accounts: two with a bound email, one (phone/username only) without. */
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

export function createPasswordResetApi({accounts = SEED_ACCOUNTS, now = () => clock.now()} = {}) {
  const store = accounts.map(account => ({...account, password: ''}))
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
      return {key: `username:${value.toLowerCase()}`, account: store.find(a => a.username.toLowerCase() === value.toLowerCase())}
    }
    throw new ApiError('auth.reset.unsupported')
  }

  /** Sends (simulates) a code to the bound email. Returns {ticket, maskedEmail|null, resendIn} or a coded error. */
  const requestResetCode = request => mockCall(SERVICE, () => {
    const {key, account} = find(request || {})
    if (account && !account.email) throw new ApiError('auth.reset.noBoundEmail')
    const waited = now() - (lastSent.get(key) ?? -Infinity)
    if (waited < RESEND_COOLDOWN) throw new ApiError('auth.reset.tooSoon', {count: Math.ceil((RESEND_COOLDOWN - waited) / 1000)})
    lastSent.set(key, now())
    for (const [id, ticket] of tickets) if (ticket.key === key) tickets.delete(id)
    const ticket = `RT${++sequence}`
    tickets.set(ticket, {key, accountId: account?.id || null, expiresAt: now() + RESET_CODE_TTL, attempts: 0})
    return {ticket, maskedEmail: account ? maskEmail(account.email) : null, resendIn: RESEND_COOLDOWN / 1000}
  })

  /** Checks the password pair, then the code; a wrong code counts against the ticket. */
  const resetPassword = ({ticket, code, password = '', confirm = ''} = {}) => mockCall(SERVICE, () => {
    if (password.length < MIN_PASSWORD_LENGTH) throw new ApiError('auth.ui.demoPasswordNeedsAtLeast6Characters')
    if (password !== confirm) throw new ApiError('auth.reset.mismatch')
    if (!/^\d{6}$/.test(String(code || ''))) throw new ApiError('auth.reset.codeFormat')
    const entry = tickets.get(ticket)
    if (!entry || entry.expiresAt <= now()) { tickets.delete(ticket); throw new ApiError('auth.reset.codeExpired') }
    if (entry.attempts >= MAX_CODE_ATTEMPTS) throw new ApiError('auth.reset.tooManyAttempts')
    if (!entry.accountId || code !== DEMO_RESET_CODE) {
      entry.attempts++
      throw new ApiError(entry.attempts >= MAX_CODE_ATTEMPTS ? 'auth.reset.tooManyAttempts' : 'auth.reset.invalidCode')
    }
    store.find(account => account.id === entry.accountId).password = password
    tickets.delete(ticket)
    return {done: true}
  })

  /** Test hook: the stored password of an account. */
  const passwordOf = id => store.find(account => account.id === id)?.password

  return {requestResetCode, resetPassword, passwordOf}
}
