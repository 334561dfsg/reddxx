// Personal-centre service: account change ledger (帳變記錄), notifications, invite summary and preferences.
// Pages import the bound functions from ./profile.js. State is in memory only and resets on reload; the seeds are
// deterministic so filters, pagination and tests are stable. Every result is a JSON snapshot.
import {ApiError, mockCall, snapshot} from './transport.js'
import {otpauthUri, randomSecret, verifyTotp} from './totp.js'
import {FUND_PASSWORD_PATTERN, createFundPasswordStore} from './fundPasswordStore.js'

/** Local demo code accepted wherever the prototype asks for a verification code (same as the contact bindings). */
export const DEMO_TOTP = '123456'

const SERVICE = 'profile'
const DAY = 86400000

/** Change types shown in the ledger filter, grouped by the product that produces them. */
export const CHANGE_TYPES = [
  'deposit', 'withdraw', 'transfer', 'spotBuy', 'spotSell', 'tradeFee', 'marginFreeze', 'marginSettle',
  'fundingFee', 'earnSubscribe', 'earnRedeem', 'earnInterest', 'loanDisbursement', 'loanRepayment',
  'collateralFreeze', 'collateralRelease', 'strategySubscribe', 'strategySettle', 'quantFundSubscribe',
  'quantFundRedeem', 'inviteCommission',
]
export const ACCOUNT_TYPES = ['funding', 'spot', 'futures', 'finance']
export const LEDGER_CURRENCIES = ['USDT', 'BTC', 'ETH', 'USDC']
export const NOTIFICATION_CATEGORIES = ['security', 'system', 'promo']

// Which account each change type books against, and the sign of the change.
const BOOKING = {
  deposit: ['funding', 1], withdraw: ['funding', -1], transfer: ['funding', -1], spotBuy: ['spot', -1],
  spotSell: ['spot', 1], tradeFee: ['spot', -1], marginFreeze: ['futures', -1], marginSettle: ['futures', 1],
  fundingFee: ['futures', -1], earnSubscribe: ['finance', -1], earnRedeem: ['finance', 1], earnInterest: ['finance', 1],
  loanDisbursement: ['funding', 1], loanRepayment: ['funding', -1], collateralFreeze: ['funding', -1],
  collateralRelease: ['funding', 1], strategySubscribe: ['finance', -1], strategySettle: ['finance', 1],
  quantFundSubscribe: ['finance', -1], quantFundRedeem: ['finance', 1], inviteCommission: ['funding', 1],
}
const SIZE = {USDT: [5, 2500], USDC: [5, 1200], BTC: [0.0005, 0.08], ETH: [0.01, 1.6]}
const DECIMALS = {USDT: 2, USDC: 2, BTC: 6, ETH: 5}

// Small deterministic PRNG so the seeded ledger is identical on every load and in tests.
function random(seed) {
  let value = seed >>> 0
  return () => ((value = (value * 1664525 + 1013904223) >>> 0) / 4294967296)
}
const round = (value, currency) => Number(value.toFixed(DECIMALS[currency]))

function seedLedger(now, count = 86) {
  const next = random(20261126)
  const balances = {funding: {}, spot: {}, futures: {}, finance: {}}
  for (const account of ACCOUNT_TYPES) for (const currency of LEDGER_CURRENCIES) balances[account][currency] = currency === 'USDT' ? 12000 : currency === 'USDC' ? 3000 : currency === 'BTC' ? 0.6 : 8
  const entries = []
  let time = now - count * 0.37 * DAY
  for (let index = 0; index < count; index++) {
    const type = CHANGE_TYPES[Math.floor(next() * CHANGE_TYPES.length)]
    const [account, sign] = BOOKING[type]
    const currency = ['futures', 'finance'].includes(account) || type === 'inviteCommission' ? (next() < 0.8 ? 'USDT' : 'USDC') : LEDGER_CURRENCIES[Math.floor(next() * LEDGER_CURRENCIES.length)]
    const [min, max] = SIZE[currency]
    const size = ['tradeFee', 'fundingFee', 'earnInterest', 'inviteCommission'].includes(type) ? min * (0.1 + next()) : min + next() * (max - min)
    const amount = round(sign * size, currency)
    balances[account][currency] = round(Math.max(0, balances[account][currency] + amount), currency)
    time += (0.1 + next() * 0.5) * DAY
    entries.push({id: `AC${String(100000 + index)}`, type, account, currency, amount, balance: balances[account][currency], createdAt: Math.round(time)})
  }
  return entries.reverse()
}

function seedNotifications(now) {
  const items = [
    ['security', 'loginNewIp', 0.02, {ip: '203.0.113.24'}],
    ['system', 'depositCredited', 0.4, {amount: '1,000.00', currency: 'USDT'}],
    ['promo', 'earnLaunch', 0.9, {apy: '8.5%'}],
    ['system', 'earnApproved', 1.3, {product: 'USDT 30D'}],
    ['security', 'passwordChanged', 2.1, {}],
    ['system', 'withdrawSubmitted', 2.6, {amount: '250.00', currency: 'USDT'}],
    ['system', 'inviteCommission', 3.2, {amount: '100.00', currency: 'USDT'}],
    ['promo', 'tradingCompetition', 4.5, {prize: '50,000 USDT'}],
    ['system', 'loanApproved', 5.1, {amount: '3,000.00', currency: 'USDT'}],
    ['security', 'kycSubmitted', 6.4, {}],
    ['system', 'strategySettled', 7.2, {pnl: '+42.18 USDT'}],
    ['promo', 'vipUpgrade', 9.8, {tier: 1}],
    ['system', 'maintenance', 12.5, {window: '02:00–04:00 UTC'}],
    ['security', 'loginNewIp', 15.3, {ip: '198.51.100.7'}],
  ]
  return items.map(([category, kind, ago, params], index) => ({
    id: `NT${1000 + index}`, category, kind, params, read: index > 3, createdAt: Math.round(now - ago * DAY),
  }))
}

const page = (list, number = 1, size = 10) => {
  const pageSize = Math.max(1, Math.min(50, Number(size) || 10))
  const pages = Math.max(1, Math.ceil(list.length / pageSize))
  const current = Math.min(Math.max(1, Number(number) || 1), pages)
  return {items: snapshot(list.slice((current - 1) * pageSize, current * pageSize)), total: list.length, page: current, pageSize}
}

export function createProfileApi({now = () => Date.now(), fundPassword = createFundPasswordStore()} = {}) {
  const start = now()
  const ledger = seedLedger(start)
  const notifications = seedNotifications(start)
  const preferences = {messageAlert: true}
  const invite = {code: 'NQC7Q2K8', invited: 3, pending: 0, settled: 100}

  /** GET /account/changes?type=&account=&currency=&page=&pageSize= — newest first; '' means every value. */
  const listAccountChanges = ({type = '', account = '', currency = '', page: number = 1, pageSize = 10} = {}) => mockCall(SERVICE, () => {
    if (type && !CHANGE_TYPES.includes(type)) throw new ApiError('profile.center.records.invalidFilter')
    if (account && !ACCOUNT_TYPES.includes(account)) throw new ApiError('profile.center.records.invalidFilter')
    if (currency && !LEDGER_CURRENCIES.includes(currency)) throw new ApiError('profile.center.records.invalidFilter')
    const rows = ledger.filter(row => (!type || row.type === type) && (!account || row.account === account) && (!currency || row.currency === currency))
    return page(rows, number, pageSize)
  })

  /** GET /notifications?category=&page= — newest first, with the overall unread count. */
  const listNotifications = ({category = '', page: number = 1, pageSize = 8} = {}) => mockCall(SERVICE, () => {
    if (category && !NOTIFICATION_CATEGORIES.includes(category)) throw new ApiError('profile.center.notifications.invalidCategory')
    const rows = notifications.filter(item => !category || item.category === category)
    return {...page(rows, number, pageSize), unread: notifications.filter(item => !item.read).length}
  })

  /** GET /notifications/unread-count */
  const getUnreadCount = () => mockCall(SERVICE, () => notifications.filter(item => !item.read).length)

  /** POST /notifications/:id/read — idempotent. */
  const markNotificationRead = id => mockCall(SERVICE, () => {
    const item = notifications.find(entry => entry.id === id)
    if (!item) throw new ApiError('profile.center.notifications.notFound')
    item.read = true
    return snapshot(item)
  })

  /** POST /notifications/read-all {category?} — returns how many were newly marked. */
  const markAllNotificationsRead = ({category = ''} = {}) => mockCall(SERVICE, () => {
    let changed = 0
    for (const item of notifications) if (!item.read && (!category || item.category === category)) { item.read = true; changed++ }
    return {changed}
  })

  /** GET /account/invite — invitation code and commission summary (USDT). */
  const getInviteSummary = () => mockCall(SERVICE, () => snapshot(invite))

  /** GET /account/preferences, PATCH /account/preferences {messageAlert} */
  const getPreferences = () => mockCall(SERVICE, () => snapshot(preferences))
  const updatePreferences = patch => mockCall(SERVICE, () => {
    if ('messageAlert' in patch) {
      if (typeof patch.messageAlert !== 'boolean') throw new ApiError('profile.center.preferences.saveFailed')
      preferences.messageAlert = patch.messageAlert
    }
    return snapshot(preferences)
  })

  // Login sessions (裝置管理): the caller's own device is always first and cannot be ended; two seeded remote sessions.
  const sessions = [
    {id: 'SS2', device: 'iPhone', browser: 'Safari', os: 'iOS', osVersion: '18.1', ip: '198.51.100.7', lastActive: Math.round(start - 0.6 * DAY), kind: 'mobile'},
    {id: 'SS3', device: 'Windows', browser: 'Edge', os: 'Windows', osVersion: '11', ip: '203.0.113.24', lastActive: Math.round(start - 3.2 * DAY), kind: 'desktop'},
  ]

  /** GET /account/sessions — {current} describes the calling client (as the server would read it from the request). */
  const listSessions = ({current = {}} = {}) => mockCall(SERVICE, () => snapshot([
    {id: 'SS1', device: current.device || 'Unknown', browser: current.browser || '', os: current.os || '', osVersion: current.osVersion || '', ip: '', lastActive: now(), kind: current.kind || 'desktop', current: true},
    ...sessions.map(session => ({...session, current: false})),
  ]))

  /** DELETE /account/sessions/:id — ends a remote session; the current one cannot be ended here. */
  const endSession = id => mockCall(SERVICE, () => {
    if (id === 'SS1') throw new ApiError('profile.center.devices.cannotEndCurrent')
    const index = sessions.findIndex(session => session.id === id)
    if (index < 0) throw new ApiError('profile.center.devices.notFound')
    sessions.splice(index, 1)
    return {id}
  })

  // Google Authenticator (MFA). A bind starts with a pending secret; only a valid code for that secret enables it.
  // Codes are real TOTP (so an authenticator app works) or the local demo code.
  const authenticator = {enabled: false, secret: '', pending: '', boundAt: 0}
  const codeOk = async (secret, code) => String(code) === DEMO_TOTP || await verifyTotp(secret, code, now())

  /** GET /account/authenticator — {enabled, boundAt}. */
  const getAuthenticator = () => mockCall(SERVICE, () => ({enabled: authenticator.enabled, boundAt: authenticator.boundAt}))

  /** POST /account/authenticator/secret — a fresh pending secret and its otpauth URI (replaces any earlier pending one). */
  const createAuthenticatorSecret = ({account = 'demo'} = {}) => mockCall(SERVICE, () => {
    if (authenticator.enabled) throw new ApiError('profile.center.authenticator.alreadyBound')
    authenticator.pending = randomSecret()
    return {secret: authenticator.pending, uri: otpauthUri({issuer: 'NewQuantCapital', account, secret: authenticator.pending})}
  })

  /** POST /account/authenticator/bind {code} */
  const bindAuthenticator = ({code}) => mockCall(SERVICE, async () => {
    if (authenticator.enabled) throw new ApiError('profile.center.authenticator.alreadyBound')
    if (!authenticator.pending) throw new ApiError('profile.center.authenticator.expired')
    if (!/^\d{6}$/.test(String(code))) throw new ApiError('profile.center.authenticator.codeRequired')
    if (!await codeOk(authenticator.pending, code)) throw new ApiError('profile.center.authenticator.invalidCode')
    Object.assign(authenticator, {enabled: true, secret: authenticator.pending, pending: '', boundAt: now()})
    return {enabled: true, boundAt: authenticator.boundAt}
  })

  /** POST /account/authenticator/unbind {code} — needs a current code from the bound authenticator. */
  const unbindAuthenticator = ({code}) => mockCall(SERVICE, async () => {
    if (!authenticator.enabled) throw new ApiError('profile.center.authenticator.notBound')
    if (!/^\d{6}$/.test(String(code))) throw new ApiError('profile.center.authenticator.codeRequired')
    if (!await codeOk(authenticator.secret, code)) throw new ApiError('profile.center.authenticator.invalidCode')
    Object.assign(authenticator, {enabled: false, secret: '', pending: '', boundAt: 0})
    return {enabled: false}
  })

  // 資金密碼: a 6-digit number, set once and then changed with the old one. Withdrawals check it (walletService).
  /** GET /account/fund-password — {set} */
  const getFundPassword = () => mockCall(SERVICE, () => ({set: fundPassword.isSet()}))

  /** PUT /account/fund-password {oldPassword?, password, confirm} */
  const saveFundPassword = ({oldPassword = '', password = '', confirm = ''} = {}) => mockCall(SERVICE, () => {
    if (fundPassword.isSet()) {
      if (!oldPassword) throw new ApiError('profile.center.fundPassword.oldRequired')
      if (!fundPassword.verify(oldPassword)) throw new ApiError('profile.center.fundPassword.oldWrong')
    }
    if (!FUND_PASSWORD_PATTERN.test(password)) throw new ApiError('profile.center.fundPassword.sixDigits')
    if (password !== confirm) throw new ApiError('profile.center.fundPassword.mismatch')
    if (fundPassword.isSet() && password === oldPassword) throw new ApiError('profile.center.fundPassword.sameAsOld')
    const changed = fundPassword.isSet()
    fundPassword.write(password)
    return {set: true, changed}
  })

  return {getFundPassword, saveFundPassword, getAuthenticator, createAuthenticatorSecret, bindAuthenticator, unbindAuthenticator, listSessions, endSession, listAccountChanges, listNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead, getInviteSummary, getPreferences, updatePreferences}
}
