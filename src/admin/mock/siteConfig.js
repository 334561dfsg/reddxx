import {
  DEFAULT_I18N_BLOCK,
  FRONT_LOCALE_CATALOG,
  PHONE_DIAL_PRESETS
} from '../constants/i18nCatalog.js'
import { FRONT_WALLET_LOGIN_PROVIDERS } from '../../stores/frontAuth.js'

const WALLET_PROVIDER_KEYS = new Set(FRONT_WALLET_LOGIN_PROVIDERS.map((p) => p.key))

/** 单钱包登录项（与前台 `FRONT_WALLET_LOGIN_PROVIDERS` 顺序对齐；演示存本地） */
const DEFAULT_WALLET_LOGIN_ROW = {
  enabled: true,
  /** 前台展示名，空则使用内置名称 */
  customLabel: '',
  /** 可选默认 RPC（注入类钱包） */
  rpcUrl: '',
  /** 可选默认链 ID（如 1、56） */
  chainId: '',
  /** WalletConnect Cloud Project ID 等 */
  walletConnectProjectId: '',
  /** 通用 / 深度链接 / 备注（如 Coinbase Wallet 跳转说明） */
  appUniversalLink: ''
}

/**
 * 归一化各钱包登录开关与扩展字段；未知 key 丢弃；缺省项按内置列表补齐。
 * @param {unknown} raw
 */
export function normalizeWalletLoginProviders(raw) {
  /** @type {Map<string, Record<string, unknown>>} */
  const byKey = new Map()
  if (Array.isArray(raw)) {
    for (const row of raw) {
      if (!row || typeof row !== 'object') continue
      const key = String(row.key || '').trim()
      if (!WALLET_PROVIDER_KEYS.has(key)) continue
      byKey.set(key, {
        key,
        enabled: typeof row.enabled === 'boolean' ? row.enabled : DEFAULT_WALLET_LOGIN_ROW.enabled,
        customLabel: typeof row.customLabel === 'string' ? row.customLabel.trim() : '',
        rpcUrl: typeof row.rpcUrl === 'string' ? row.rpcUrl.trim() : '',
        chainId: typeof row.chainId === 'string' ? row.chainId.trim() : '',
        walletConnectProjectId:
          typeof row.walletConnectProjectId === 'string' ? row.walletConnectProjectId.trim() : '',
        appUniversalLink: typeof row.appUniversalLink === 'string' ? row.appUniversalLink.trim() : ''
      })
    }
  }
  return FRONT_WALLET_LOGIN_PROVIDERS.map((p) => {
    const saved = byKey.get(p.key)
    const base = { key: p.key, ...DEFAULT_WALLET_LOGIN_ROW }
    return saved ? { ...base, ...saved, key: p.key } : base
  })
}

const VALID_DIAL = new Set(PHONE_DIAL_PRESETS.map((x) => x.dial))
const DIAL_PATTERN = /^\+\d{1,6}$/

function normalizePlainObject(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  try {
    return JSON.parse(JSON.stringify(raw))
  } catch {
    return null
  }
}

function normalizeCustomDialCodes(raw) {
  const out = []
  const seen = new Set(VALID_DIAL)
  if (!Array.isArray(raw)) return out
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const dial = String(row.dial || '').trim()
    if (!DIAL_PATTERN.test(dial) || seen.has(dial)) continue
    seen.add(dial)
    out.push({
      dial,
      label: String(row.label || dial).trim() || dial,
      icon: String(row.icon || '').trim()
    })
  }
  return out
}

function dialCatalog(customDialCodes) {
  return [...PHONE_DIAL_PRESETS, ...(Array.isArray(customDialCodes) ? customDialCodes : [])]
}

function knownDialSet(customDialCodes) {
  return new Set(dialCatalog(customDialCodes).map((x) => x.dial))
}

function normalizeMetaOverrides(raw, validKeys) {
  /** @type {Record<string, { label?: string, short?: string, icon?: string }>} */
  const out = {}
  if (!raw || typeof raw !== 'object' || !validKeys) return out
  for (const key of validKeys) {
    const row = raw[key]
    if (!row || typeof row !== 'object') continue
    const label = typeof row.label === 'string' ? row.label.trim() : ''
    const short = typeof row.short === 'string' ? row.short.trim() : ''
    const icon = typeof row.icon === 'string' ? row.icon.trim() : ''
    if (label || short || icon) {
      out[key] = {}
      if (label) out[key].label = label
      if (short) out[key].short = short
      if (icon) out[key].icon = icon
    }
  }
  return out
}

function newSmsChannelId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `sms_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

function parseSmsConfigObject(cfg) {
  if (typeof cfg === 'string') {
    try {
      const parsed = JSON.parse(cfg)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? { ...parsed } : {}
    } catch {
      return {}
    }
  }
  if (cfg && typeof cfg === 'object' && !Array.isArray(cfg)) {
    return { ...cfg }
  }
  return {}
}

/**
 * 从旧版「每区号一条」结构迁移为通道列表（同一区号可多条）。
 * @param {Record<string, { enabled?: boolean, provider?: string, config?: unknown }>|undefined} legacy
 * @returns {Array<{ id: string, dial: string, dials: string[], name: string, enabled: boolean, provider: string, config: Record<string, unknown> }>}
 */
function migrateSmsChannelsFromLegacyByDial(legacy) {
  /** @type {Array<{ id: string, dial: string, dials: string[], name: string, enabled: boolean, provider: string, config: Record<string, unknown> }>} */
  const list = []
  if (!legacy || typeof legacy !== 'object') return list
  for (const p of PHONE_DIAL_PRESETS) {
    const row = legacy[p.dial]
    if (!row || typeof row !== 'object') continue
    const enabled = typeof row.enabled === 'boolean' ? row.enabled : false
    const provider = typeof row.provider === 'string' ? row.provider.trim() : ''
    const config = parseSmsConfigObject(row.config)
    if (!enabled && !provider && Object.keys(config).length === 0) continue
    list.push({
      id: `mig_${p.dial.replace(/[^\d+]/g, '')}`,
      dial: p.dial,
      dials: [p.dial],
      name: '',
      enabled,
      provider: provider || 'custom',
      config
    })
  }
  return list
}

function normalizeSmsChannelDials(row) {
  const raw = Array.isArray(row?.dials) ? row.dials : [row?.dial]
  const out = []
  const seen = new Set()
  for (const item of raw) {
    const dial = String(item || '').trim()
    if (!VALID_DIAL.has(dial) || seen.has(dial)) continue
    seen.add(dial)
    out.push(dial)
  }
  return out
}

/**
 * 归一化短信通道列表（演示存于站点配置；生产应由后端加密敏感字段）。
 * @param {unknown} raw
 * @param {boolean} [explicitKey] 存储中是否显式包含 smsChannels 字段（用于区分「未迁移」与「用户清空」）
 * @param {Record<string, unknown>|undefined} legacyByDial
 */
export function normalizeSmsChannelsList(raw, explicitKey, legacyByDial) {
  /** @type {Array<{ id: string, dial: string, dials: string[], name: string, enabled: boolean, provider: string, config: Record<string, unknown> }>} */
  const fromArray = []
  if (Array.isArray(raw)) {
    for (const row of raw) {
      if (!row || typeof row !== 'object') continue
      const dials = normalizeSmsChannelDials(row)
      if (dials.length === 0) continue
      fromArray.push({
        id: typeof row.id === 'string' && row.id.trim() ? row.id.trim() : newSmsChannelId(),
        dial: dials[0],
        dials,
        name: typeof row.name === 'string' ? row.name.trim() : '',
        enabled: typeof row.enabled === 'boolean' ? row.enabled : true,
        provider: typeof row.provider === 'string' ? row.provider.trim() : '',
        config: parseSmsConfigObject(row.config)
      })
    }
    if (fromArray.length > 0 || explicitKey) {
      return fromArray
    }
  }
  return migrateSmsChannelsFromLegacyByDial(
    legacyByDial && typeof legacyByDial === 'object' ? legacyByDial : undefined
  )
}

/** 短信通道演示数据（全新环境默认；已写入 localStorage 的站点配置不受影响） */
const DEFAULT_SMS_CHANNELS_DEMO = normalizeSmsChannelsList(
  [
    {
      id: 'demo-sms-cn-aliyun',
      dial: '+86',
      name: '国内·阿里云',
      enabled: true,
      provider: 'aliyun',
      config: {
        regionId: 'cn-hangzhou',
        signName: 'CryptoX 演示',
        templateCode: 'SMS_DEMO_001',
        accessKeyId: 'LTAI****************',
        remark: '密钥由服务端保管，此处仅演示字段'
      }
    },
    {
      id: 'demo-sms-cn-tencent',
      dial: '+86',
      name: '国内·腾讯云（备用）',
      enabled: true,
      provider: 'tencent',
      config: {
        sdkAppId: '1400000000',
        signName: 'CryptoX 演示',
        templateId: '1234567',
        secretId: 'AKID****************',
        remark: '同区号多通道示例'
      }
    },
    {
      id: 'demo-sms-hk-twilio',
      dial: '+852',
      name: '香港 Twilio',
      enabled: true,
      provider: 'twilio',
      config: {
        accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        messagingServiceSid: 'MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        remark: '国际通道示例'
      }
    },
    {
      id: 'demo-sms-sg-custom',
      dial: '+65',
      name: '新加坡·自定义网关',
      enabled: false,
      provider: 'custom',
      config: {
        endpoint: 'https://sms.example.com/v1/send',
        apiKey: '***',
        remark: '停用状态示例'
      }
    }
  ],
  true,
  undefined
)

export const DEFAULT_VOICE_ALERT_EVENTS = [
  { key: 'customerService', label: '客服提示音' },
  { key: 'deposit', label: '充值' },
  { key: 'withdraw', label: '提现' },
  { key: 'mtNewTradeOrder', label: 'MT新交易订单（现货）' },
  { key: 'mtNewPosition', label: 'MT 新增持仓（现货）' },
  { key: 'perpetualNewTradeOrder', label: '永续合约新交易订单' },
  { key: 'deliveryNewTradeOrder', label: '交割合约新交易订单' },
  { key: 'verification', label: '认证' }
]

const DEFAULT_VOICE_ALERTS = {
  enabled: true,
  events: Object.fromEntries(DEFAULT_VOICE_ALERT_EVENTS.map((item) => [item.key, true]))
}

export function normalizeVoiceAlerts(raw) {
  const base = {
    enabled: DEFAULT_VOICE_ALERTS.enabled,
    events: { ...DEFAULT_VOICE_ALERTS.events }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base

  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : base.enabled,
    events: Object.fromEntries(
      DEFAULT_VOICE_ALERT_EVENTS.map((item) => [
        item.key,
        typeof raw.events?.[item.key] === 'boolean' ? raw.events[item.key] : base.events[item.key]
      ])
    )
  }
}

export const SITE_CONFIG_STORAGE_KEY = 'fex-admin-site-config'

const STORAGE_KEY = SITE_CONFIG_STORAGE_KEY

const VALID_LOCALE_CODES = new Set(FRONT_LOCALE_CATALOG.map((x) => x.code))
const LOCALE_CODE_PATTERN = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/

function normalizeCustomLocales(raw) {
  const out = []
  const seen = new Set(VALID_LOCALE_CODES)
  if (!Array.isArray(raw)) return out
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const code = String(row.code || '').trim()
    if (!LOCALE_CODE_PATTERN.test(code) || seen.has(code)) continue
    seen.add(code)
    const label = String(row.label || code).trim() || code
    out.push({
      code,
      label,
      short: String(row.short || code).trim() || code,
      icon: String(row.icon || '').trim()
    })
  }
  return out
}

function localeCatalog(customLocales) {
  return [...FRONT_LOCALE_CATALOG, ...(Array.isArray(customLocales) ? customLocales : [])]
}

function knownLocaleSet(customLocales) {
  return new Set(localeCatalog(customLocales).map((x) => x.code))
}

function newSmtpAccountId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `smtp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

function newSocialLinkId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `social_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/** SMTP 单条账户结构（演示持久化；生产环境密码应由后端加密存储） */
export const DEFAULT_SMTP_CONFIG = {
  /** 是否启用该账户发信 */
  enabled: false,
  host: '',
  port: 587,
  /** none | tls | ssl */
  encryption: 'tls',
  username: '',
  password: '',
  /** 发件人显示名 */
  fromName: '',
  /** 发件人邮箱 */
  fromEmail: '',
  /** 可选，回复地址 */
  replyTo: ''
}

function normalizeSmtp(raw) {
  const d = { ...DEFAULT_SMTP_CONFIG }
  if (!raw || typeof raw !== 'object') return d
  const portNum = Number(raw.port)
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : d.enabled,
    host: typeof raw.host === 'string' ? raw.host.trim() : '',
    port: Number.isFinite(portNum) ? Math.min(65535, Math.max(1, Math.round(portNum))) : d.port,
    encryption: ['none', 'tls', 'ssl'].includes(raw.encryption) ? raw.encryption : d.encryption,
    username: typeof raw.username === 'string' ? raw.username : '',
    password: typeof raw.password === 'string' ? raw.password : '',
    fromName: typeof raw.fromName === 'string' ? raw.fromName.trim() : '',
    fromEmail: typeof raw.fromEmail === 'string' ? raw.fromEmail.trim() : '',
    replyTo: typeof raw.replyTo === 'string' ? raw.replyTo.trim() : ''
  }
}

function normalizeSmtpAccountRow(row) {
  const n = normalizeSmtp(row)
  return {
    id:
      row && typeof row.id === 'string' && row.id.trim()
        ? row.id.trim()
        : newSmtpAccountId(),
    name: row && typeof row.name === 'string' ? row.name.trim() : '',
    enabled: n.enabled,
    host: n.host,
    port: n.port,
    encryption: n.encryption,
    username: n.username,
    password: n.password,
    fromName: n.fromName,
    fromEmail: n.fromEmail,
    replyTo: n.replyTo
  }
}

/** 全站同时仅允许一条 SMTP 处于启用状态（按数组顺序保留第一条启用的）。 */
function enforceSingleEnabledSmtpAccount(list) {
  if (!Array.isArray(list) || list.length === 0) return list
  let seen = false
  return list.map((row) => {
    if (!row.enabled) return row
    if (seen) return { ...row, enabled: false }
    seen = true
    return row
  })
}

/**
 * 多条 SMTP 账户；旧版单对象 `smtp` 在 normalizeSiteConfig 中迁移。
 * @param {unknown} raw
 * @param {boolean} [explicitKey]
 * @param {Record<string, unknown>|undefined} legacySmtp
 */
export function normalizeSmtpAccountsList(raw, explicitKey, legacySmtp) {
  /** @type {ReturnType<typeof normalizeSmtpAccountRow>[]} */
  const fromArray = []
  if (Array.isArray(raw)) {
    for (const row of raw) {
      if (!row || typeof row !== 'object') continue
      fromArray.push(normalizeSmtpAccountRow(row))
    }
    if (fromArray.length > 0 || explicitKey) {
      return enforceSingleEnabledSmtpAccount(fromArray)
    }
  }
  if (legacySmtp && typeof legacySmtp === 'object' && !Array.isArray(legacySmtp)) {
    return enforceSingleEnabledSmtpAccount([
      normalizeSmtpAccountRow({
        id: 'mig-smtp-legacy',
        name: '',
        ...legacySmtp
      })
    ])
  }
  return []
}

const DEFAULT_SMTP_ACCOUNTS_DEMO = normalizeSmtpAccountsList(
  [
    {
      id: 'demo-smtp-primary',
      name: '系统通知（主）',
      enabled: true,
      host: 'smtp.example.com',
      port: 587,
      encryption: 'tls',
      username: 'notify@example.com',
      password: '***',
      fromName: 'CryptoX 演示',
      fromEmail: 'noreply@example.com',
      replyTo: ''
    },
    {
      id: 'demo-smtp-backup',
      name: '备用发信',
      enabled: false,
      host: 'smtp-backup.example.com',
      port: 465,
      encryption: 'ssl',
      username: '',
      password: '',
      fromName: '',
      fromEmail: 'backup@example.com',
      replyTo: ''
    }
  ],
  true,
  undefined
)

function normalizeSocialUrl(url) {
  const text = typeof url === 'string' ? url.trim() : ''
  if (!text) return ''
  if (/^https?:\/\//i.test(text)) return text
  return ''
}

export function normalizeSocialLinksList(raw) {
  const out = []
  if (!Array.isArray(raw)) return out
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const name = typeof row.name === 'string' ? row.name.trim() : ''
    const url = normalizeSocialUrl(row.url)
    if (!name && !url) continue
    const sortNum = Number(row.sort)
    out.push({
      id:
        typeof row.id === 'string' && row.id.trim()
          ? row.id.trim()
          : newSocialLinkId(),
      name: name || '未命名社媒',
      url,
      iconUrl: typeof row.iconUrl === 'string' ? row.iconUrl.trim() : '',
      enabled: typeof row.enabled === 'boolean' ? row.enabled : true,
      sort: Number.isFinite(sortNum) ? Math.round(sortNum) : out.length * 10
    })
  }
  return out.sort((a, b) => {
    if (a.sort !== b.sort) return a.sort - b.sort
    return a.name.localeCompare(b.name)
  })
}

const DEFAULT_SOCIAL_LINKS_DEMO = normalizeSocialLinksList([
  {
    id: 'demo-social-x',
    name: 'X / Twitter',
    url: 'https://x.com/cryptoxpro',
    iconUrl:
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Crect width=%2232%22 height=%2232%22 rx=%226%22 fill=%22%23000%22/%3E%3Cpath fill=%22%23fff%22 d=%22M18.5 14.2 27 4h-2.1l-7.4 8.8L11.6 4H4.8l8.9 13.1L4.8 28h2.1l7.7-9.2 6.2 9.2h6.8l-9.1-13.8Zm-2.7 3.2-.9-1.3L7.7 5.6h2.9l5.8 8.5.9 1.3L24.6 26h-2.9l-5.9-8.6Z%22/%3E%3C/svg%3E',
    enabled: true,
    sort: 0
  },
  {
    id: 'demo-social-telegram',
    name: 'Telegram',
    url: 'https://t.me/cryptoxpro',
    iconUrl:
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Crect width=%2232%22 height=%2232%22 rx=%226%22 fill=%22%2326a5e4%22/%3E%3Cpath fill=%22%23fff%22 d=%22M25.8 7.5 21.9 25c-.3 1.2-1 1.5-2.1.9l-5.8-4.3-2.8 2.7c-.3.3-.6.6-1.2.6l.4-5.9L21.1 9.4c.5-.4-.1-.7-.7-.3L7.2 17.4l-5.7-1.8c-1.2-.4-1.2-1.2.3-1.8L24.1 5.2c1-.4 1.9.2 1.7 2.3Z%22/%3E%3C/svg%3E',
    enabled: true,
    sort: 10
  },
  {
    id: 'demo-social-wechat',
    name: '微信公众号',
    url: 'https://example.com/wechat',
    iconUrl:
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Crect width=%2232%22 height=%2232%22 rx=%226%22 fill=%22%2307c160%22/%3E%3Cpath fill=%22%23fff%22 d=%22M13.5 8.2c-5 0-9 3.2-9 7.2 0 2.3 1.3 4.3 3.4 5.6l-.8 2.5 3-1.5c1 .3 2.1.5 3.3.5h.5c-.3-.8-.5-1.6-.5-2.5 0-3.8 3.6-6.8 8.1-6.8h.4c-1.1-2.9-4.4-5-8.4-5Zm-3 4.4a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Zm6 0a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Zm5.3 2.1c-3.8 0-6.9 2.5-6.9 5.5s3.1 5.5 6.9 5.5c.9 0 1.8-.1 2.6-.4l2.4 1.2-.7-2c1.6-1 2.6-2.6 2.6-4.3 0-3-3.1-5.5-6.9-5.5Zm-2.2 3.3a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Zm4.6 0a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Z%22/%3E%3C/svg%3E',
    enabled: true,
    sort: 20
  },
  {
    id: 'demo-social-discord',
    name: 'Discord',
    url: 'https://discord.gg/cryptoxpro',
    iconUrl:
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Crect width=%2232%22 height=%2232%22 rx=%226%22 fill=%22%235865f2%22/%3E%3Cpath fill=%22%23fff%22 d=%22M23.6 9.4A18 18 0 0 0 19.2 8l-.2.4c1.6.4 2.4 1 2.4 1s-2.1-1.1-5.4-1.1-5.4 1.1-5.4 1.1.8-.6 2.4-1l-.2-.4c-1.5.3-3 .8-4.4 1.4-2.8 4.2-3.6 8.2-3.2 12.1 1.9 1.4 3.8 2.2 5.6 2.7l1.2-1.9c-.7-.3-1.4-.6-2-1 0 0 .2.1.5.2 3.8 1.8 8 1.8 11.7 0 .3-.1.5-.2.5-.2-.6.4-1.3.8-2 1l1.2 1.9c1.8-.5 3.7-1.3 5.6-2.7.5-4.5-.8-8.4-3.2-12.1ZM12.7 19.1c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2Zm6.6 0c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2Z%22/%3E%3C/svg%3E',
    enabled: false,
    sort: 30
  }
])

function newContentRowId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

function normalizeContentSections(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((row, index) => ({
      id: typeof row?.id === 'string' && row.id.trim() ? row.id.trim() : newContentRowId('section'),
      title: typeof row?.title === 'string' ? row.title.trim() : '',
      body: typeof row?.body === 'string' ? row.body.trim() : '',
      imageUrl: typeof row?.imageUrl === 'string' ? row.imageUrl.trim() : '',
      sort: Number.isFinite(Number(row?.sort)) ? Math.round(Number(row.sort)) : index * 10
    }))
    .filter((row) => row.title || row.body || row.imageUrl)
    .sort((a, b) => a.sort - b.sort)
}

function normalizeQualificationRows(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((row, index) => ({
      id: typeof row?.id === 'string' && row.id.trim() ? row.id.trim() : newContentRowId('qual'),
      name: typeof row?.name === 'string' ? row.name.trim() : '',
      issuer: typeof row?.issuer === 'string' ? row.issuer.trim() : '',
      certificateNo: typeof row?.certificateNo === 'string' ? row.certificateNo.trim() : '',
      fileUrl: typeof row?.fileUrl === 'string' ? row.fileUrl.trim() : '',
      fileType: row?.fileType === 'pdf' ? 'pdf' : 'image',
      validFrom: typeof row?.validFrom === 'string' ? row.validFrom.trim() : '',
      validTo: typeof row?.validTo === 'string' ? row.validTo.trim() : '',
      enabled: typeof row?.enabled === 'boolean' ? row.enabled : true,
      sort: Number.isFinite(Number(row?.sort)) ? Math.round(Number(row.sort)) : index * 10
    }))
    .filter((row) => row.name || row.fileUrl)
    .sort((a, b) => a.sort - b.sort)
}

function normalizeWhitepaperRows(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((row, index) => ({
      id: typeof row?.id === 'string' && row.id.trim() ? row.id.trim() : newContentRowId('whitepaper'),
      title: typeof row?.title === 'string' ? row.title.trim() : '',
      locale: typeof row?.locale === 'string' ? row.locale.trim() : 'zh-CN',
      version: typeof row?.version === 'string' ? row.version.trim() : '',
      fileUrl: typeof row?.fileUrl === 'string' ? row.fileUrl.trim() : '',
      updatedAt: typeof row?.updatedAt === 'string' ? row.updatedAt.trim() : '',
      enabled: typeof row?.enabled === 'boolean' ? row.enabled : true,
      sort: Number.isFinite(Number(row?.sort)) ? Math.round(Number(row.sort)) : index * 10
    }))
    .filter((row) => row.title || row.fileUrl)
    .sort((a, b) => a.sort - b.sort)
}

const DEFAULT_RICH_CONTENT_PAGES = [
  {
    id: 'page-about',
    slug: 'about',
    title: '关于我们',
    navTitle: '关于我们',
    parentId: '',
    showInNav: true,
    summary: '了解平台定位、系统能力与安全风控建设。',
    html:
      '<h2>平台定位</h2><p>CryptoX Pro 面向全球用户提供数字资产交易、金融增值与账户安全服务。</p><h2>安全与风控</h2><p>平台持续建设账户安全、风控审核、资金出入金策略与操作审计能力，降低异常风险。</p>',
    enabled: true,
    sort: 0
  },
  {
    id: 'page-company-qualifications',
    slug: 'company-qualifications',
    title: '公司资质',
    navTitle: '公司资质',
    parentId: '',
    showInNav: true,
    summary: '平台资质、合规登记与相关证明文件集中展示。',
    html:
      '<h2>资质展示</h2><p>后台可在此维护资质说明、图片、PDF 链接或合规登记信息。当前为演示内容。</p>',
    enabled: true,
    sort: 10
  },
  {
    id: 'page-member-register',
    slug: 'member-register',
    title: 'Member Register',
    navTitle: 'Member Register',
    parentId: 'page-company-qualifications',
    showInNav: true,
    summary: '会员登记资料与平台主体信息展示。',
    html: '<h2>Member Register</h2><p>这里可维护会员登记文件、图片或 PDF 链接。当前为演示内容。</p>',
    enabled: true,
    sort: 0
  },
  {
    id: 'page-articles-of-association',
    slug: 'articles-of-association',
    title: 'Articles of Association',
    navTitle: 'Articles of Association',
    parentId: 'page-company-qualifications',
    showInNav: true,
    summary: '公司章程文件展示。',
    html: '<h2>Articles of Association</h2><p>这里可维护公司章程正文、扫描件或下载链接。</p>',
    enabled: true,
    sort: 10
  },
  {
    id: 'page-meeting-minutes',
    slug: 'meeting-minutes',
    title: 'Meeting Minutes',
    navTitle: 'Meeting Minutes',
    parentId: 'page-company-qualifications',
    showInNav: true,
    summary: '会议纪要与授权资料展示。',
    html: '<h2>Meeting Minutes</h2><p>这里可维护会议纪要、授权证明与相关附件。</p>',
    enabled: true,
    sort: 20
  },
  {
    id: 'page-tax-id-document',
    slug: 'tax-id-document',
    title: 'Tax ID Document (EIN)',
    navTitle: 'Tax ID Document (EIN)',
    parentId: 'page-company-qualifications',
    showInNav: true,
    summary: '税号文件与登记证明展示。',
    html: '<h2>Tax ID Document (EIN)</h2><p>这里可维护税号证明文件、图片或 PDF。</p>',
    enabled: true,
    sort: 30
  },
  {
    id: 'page-employment-certificate',
    slug: 'employment-certificate',
    title: 'Employment Certificate',
    navTitle: 'Employment Certificate',
    parentId: 'page-company-qualifications',
    showInNav: true,
    summary: '雇佣证明与相关说明展示。',
    html: '<h2>Employment Certificate</h2><p>这里可维护雇佣证明、人员授权证明或相关附件。</p>',
    enabled: true,
    sort: 40
  },
  {
    id: 'page-whitepaper',
    slug: 'whitepaper',
    title: '白皮书',
    navTitle: '白皮书',
    parentId: '',
    showInNav: true,
    summary: '查看平台白皮书、版本更新与不同语言资料。',
    html:
      '<h2>CryptoX Pro 白皮书</h2><p>后台可上传或粘贴白皮书下载链接，也可以直接维护白皮书摘要、版本记录与多语言说明。</p>',
    enabled: true,
    sort: 20
  }
]

const CONTENT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
function normalizeContentPageLocalePayload(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  return {
    title: typeof source.title === 'string' ? source.title.trim() : '',
    navTitle: typeof source.navTitle === 'string' ? source.navTitle.trim() : '',
    summary: typeof source.summary === 'string' ? source.summary.trim() : '',
    html: typeof source.html === 'string' ? source.html.trim() : ''
  }
}

function hasContentPageLocalePayload(payload) {
  const text = String(payload.html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim()
  return Boolean(payload.title || payload.navTitle || payload.summary || text)
}

function normalizeContentPageLocales(row, defaultLocale) {
  const locales = {}
  if (row?.locales && typeof row.locales === 'object' && !Array.isArray(row.locales)) {
    Object.entries(row.locales).forEach(([code, value]) => {
      const localeCode = String(code || '').trim()
      if (!localeCode) return
      const payload = normalizeContentPageLocalePayload(value)
      if (hasContentPageLocalePayload(payload)) {
        locales[localeCode] = payload
      }
    })
  }
  const legacyPayload = normalizeContentPageLocalePayload(row)
  if (hasContentPageLocalePayload(legacyPayload)) {
    locales[defaultLocale] = {
      ...legacyPayload,
      ...(locales[defaultLocale] || {})
    }
  }
  return locales
}

function resolveContentPageLocale(locales, preferredLocale, fallbackSlug) {
  const preferred = locales?.[preferredLocale]
  const first = Object.values(locales || {}).find((item) => item?.title || item?.html)
  const payload = preferred || first || {}
  const title = payload.title || fallbackSlug
  return {
    title,
    navTitle: payload.navTitle || title,
    summary: payload.summary || '',
    html: payload.html || ''
  }
}

function normalizeRichContentPages(raw, defaultLocale = 'zh-CN') {
  const source = Array.isArray(raw) ? raw : DEFAULT_RICH_CONTENT_PAGES
  const seen = new Set()
  const stage = []
  source.forEach((row, index) => {
    if (!row || typeof row !== 'object') return
    const slug = String(row.slug || '').trim().toLowerCase()
    if (!CONTENT_SLUG_PATTERN.test(slug) || seen.has(slug)) return
    seen.add(slug)
    const locales = normalizeContentPageLocales(row, defaultLocale)
    if (Object.keys(locales).length === 0) return
    const display = resolveContentPageLocale(locales, defaultLocale, slug)
    if (!display.title && !display.html) return
    stage.push({
      id: typeof row.id === 'string' && row.id.trim() ? row.id.trim() : newContentRowId('page'),
      slug,
      title: display.title || slug,
      navTitle: display.navTitle || display.title || slug,
      parentId: typeof row.parentId === 'string' ? row.parentId.trim() : '',
      showInNav: typeof row.showInNav === 'boolean' ? row.showInNav : true,
      summary: display.summary,
      html: display.html,
      locales,
      enabled: typeof row.enabled === 'boolean' ? row.enabled : true,
      sort: Number.isFinite(Number(row.sort)) ? Math.round(Number(row.sort)) : index * 10
    })
  })
  const validIds = new Set(stage.map((row) => row.id))
  const out = stage.map((row) => ({
    ...row,
    parentId: row.parentId && validIds.has(row.parentId) && row.parentId !== row.id ? row.parentId : ''
  }))
  return out.sort((a, b) => {
    if (a.parentId !== b.parentId) return a.parentId.localeCompare(b.parentId)
    if (a.sort !== b.sort) return a.sort - b.sort
    return a.slug.localeCompare(b.slug)
  })
}

const ANNOUNCEMENT_MOCK_LOCALES = {
  'zh-CN': {
    maintenance: {
      title: '系统维护公告',
      summary: '平台将在低峰时段进行例行维护，维护期间部分交易与资产服务可能短暂不可用。',
      html:
        '<p>为提升系统稳定性，平台将在低峰时段进行例行维护。请提前管理持仓、挂单与资金操作，维护完成后服务将自动恢复。</p>'
    },
    fee: {
      title: '现货手续费展示更新',
      summary: '前台费率说明已更新展示口径，实际费率以账户等级与产品规则为准。',
      html:
        '<p>现货手续费说明已优化展示口径。不同 VIP 等级、活动权益和交易产品可能适用不同费率，请以订单确认页为准。</p>'
    }
  },
  'zh-TW': {
    maintenance: {
      title: '系統維護公告',
      summary: '平台將於離峰時段進行例行維護，維護期間部分交易與資產服務可能短暫不可用。',
      html:
        '<p>為提升系統穩定性，平台將於離峰時段進行例行維護。請提前管理持倉、掛單與資金操作，維護完成後服務將自動恢復。</p>'
    },
    fee: {
      title: '現貨手續費展示更新',
      summary: '前台費率說明已更新展示口徑，實際費率以帳戶等級與產品規則為準。',
      html:
        '<p>現貨手續費說明已優化展示口徑。不同 VIP 等級、活動權益和交易產品可能適用不同費率，請以訂單確認頁為準。</p>'
    }
  },
  en: {
    maintenance: {
      title: 'Scheduled System Maintenance',
      summary: 'Routine maintenance will run during off-peak hours. Some trading and asset services may be briefly unavailable.',
      html:
        '<p>To improve platform stability, routine maintenance will run during off-peak hours. Please manage positions, open orders, and fund operations in advance. Services will resume automatically after maintenance is complete.</p>'
    },
    fee: {
      title: 'Spot Fee Display Update',
      summary: 'The fee description on the front site has been updated. Actual fees depend on account tier and product rules.',
      html:
        '<p>The spot trading fee display has been optimized. Different VIP tiers, campaign benefits, and trading products may use different rates. Please refer to the order confirmation page for the final fee.</p>'
    }
  },
  ja: {
    maintenance: {
      title: 'システムメンテナンスのお知らせ',
      summary: 'プラットフォームは低利用時間帯に定期メンテナンスを実施します。一部の取引および資産サービスが一時的に利用できない場合があります。',
      html:
        '<p>システムの安定性向上のため、低利用時間帯に定期メンテナンスを実施します。ポジション、未約定注文、資金操作を事前にご確認ください。メンテナンス完了後、サービスは自動的に再開されます。</p>'
    },
    fee: {
      title: '現物手数料表示の更新',
      summary: 'フロントサイトの手数料説明を更新しました。実際の手数料はアカウントランクと商品ルールに基づきます。',
      html:
        '<p>現物取引手数料の表示内容を最適化しました。VIP ランク、キャンペーン特典、取引商品によって適用される手数料が異なる場合があります。最終的な手数料は注文確認ページをご確認ください。</p>'
    }
  },
  ko: {
    maintenance: {
      title: '시스템 점검 안내',
      summary: '플랫폼은 이용량이 적은 시간대에 정기 점검을 진행합니다. 일부 거래 및 자산 서비스가 일시적으로 중단될 수 있습니다.',
      html:
        '<p>시스템 안정성 향상을 위해 이용량이 적은 시간대에 정기 점검을 진행합니다. 포지션, 미체결 주문, 자금 작업을 미리 확인해 주세요. 점검 완료 후 서비스는 자동으로 복구됩니다.</p>'
    },
    fee: {
      title: '현물 수수료 표시 업데이트',
      summary: '프런트 사이트의 수수료 안내 표시 기준이 업데이트되었습니다. 실제 수수료는 계정 등급과 상품 규칙을 따릅니다.',
      html:
        '<p>현물 거래 수수료 안내 표시가 최적화되었습니다. VIP 등급, 이벤트 혜택, 거래 상품에 따라 다른 수수료가 적용될 수 있으므로 최종 수수료는 주문 확인 페이지를 기준으로 확인해 주세요.</p>'
    }
  }
}

const DEFAULT_SITE_ANNOUNCEMENTS = FRONT_LOCALE_CATALOG.flatMap((localeMeta, localeIndex) => {
  const copy = ANNOUNCEMENT_MOCK_LOCALES[localeMeta.code] || ANNOUNCEMENT_MOCK_LOCALES.en
  return [
    {
      id: `ann-maintenance-demo-${localeMeta.code}`,
      locale: localeMeta.code,
      ...copy.maintenance,
      enabled: true,
      publishedAt: '2026-08-24 10:00',
      sort: localeIndex
    },
    {
      id: `ann-fee-demo-${localeMeta.code}`,
      locale: localeMeta.code,
      ...copy.fee,
      enabled: true,
      publishedAt: '2026-08-20 18:30',
      sort: 100 + localeIndex
    }
  ]
})

function normalizeAnnouncementLocalePayload(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  return {
    title: typeof source.title === 'string' ? source.title.trim() : '',
    summary: typeof source.summary === 'string' ? source.summary.trim() : '',
    html: typeof source.html === 'string' ? source.html.trim() : ''
  }
}

function hasAnnouncementLocalePayload(payload) {
  const text = String(payload?.html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim()
  return Boolean(payload?.title || payload?.summary || text)
}

function normalizeAnnouncementLocales(row, defaultLocale) {
  const locales = {}
  if (row?.locales && typeof row.locales === 'object' && !Array.isArray(row.locales)) {
    Object.entries(row.locales).forEach(([code, value]) => {
      const localeCode = String(code || '').trim()
      if (!localeCode) return
      const payload = normalizeAnnouncementLocalePayload(value)
      if (hasAnnouncementLocalePayload(payload)) {
        locales[localeCode] = {
          ...payload,
          html: payload.html || '<p></p>'
        }
      }
    })
  }
  const legacyPayload = normalizeAnnouncementLocalePayload(row)
  if (hasAnnouncementLocalePayload(legacyPayload)) {
    locales[defaultLocale] = {
      ...legacyPayload,
      html: legacyPayload.html || '<p></p>',
      ...(locales[defaultLocale] || {})
    }
  }
  return locales
}

function resolveAnnouncementLocale(locales, preferredLocale) {
  const preferred = locales?.[preferredLocale]
  const first = Object.values(locales || {}).find((item) => item?.title || item?.html)
  const payload = preferred || first || {}
  return {
    title: payload.title || '',
    summary: payload.summary || '',
    html: payload.html || '<p></p>'
  }
}

function normalizeAnnouncementRow(row, index, defaultLocale, forcedLocale, forcedPayload) {
  const locale = String(forcedLocale || row.locale || defaultLocale || 'zh-CN').trim() || 'zh-CN'
  const payload = forcedPayload || normalizeAnnouncementLocalePayload(row)
  const title = payload.title
  if (!title) return null
  const rawId =
    typeof row.id === 'string' && row.id.trim()
      ? row.id.trim()
      : newContentRowId('announcement')
  const id = !row.locale && forcedLocale && forcedLocale !== defaultLocale && !String(rawId).endsWith(`-${forcedLocale}`)
    ? `${rawId}-${forcedLocale}`
    : rawId
  return {
    id,
    locale,
    title,
    summary: payload.summary,
    html: payload.html || '<p></p>',
    locales: {
      [locale]: {
        title,
        summary: payload.summary,
        html: payload.html || '<p></p>'
      }
    },
    enabled: typeof row.enabled === 'boolean' ? row.enabled : true,
    publishedAt:
      typeof row.publishedAt === 'string' && row.publishedAt.trim()
        ? row.publishedAt.trim()
        : '2026-08-24 00:00',
    sort: Number.isFinite(Number(row.sort)) ? Math.round(Number(row.sort)) : index * 10
  }
}

export function normalizeSiteAnnouncements(raw, defaultLocale = 'zh-CN') {
  const source = Array.isArray(raw) ? raw : DEFAULT_SITE_ANNOUNCEMENTS
  const seen = new Set()
  const rows = []
  source.forEach((row, index) => {
    if (!row || typeof row !== 'object') return
    if (typeof row.locale === 'string' && row.locale.trim()) {
      const localeCode = row.locale.trim()
      const locales = normalizeAnnouncementLocales(row, localeCode)
      const display = resolveAnnouncementLocale(locales, localeCode)
      const normalized = normalizeAnnouncementRow(row, index, defaultLocale, localeCode, display)
      if (normalized && !seen.has(normalized.id)) {
        seen.add(normalized.id)
        rows.push(normalized)
      }
      return
    }
    const locales = normalizeAnnouncementLocales(row, defaultLocale)
    const entries = Object.entries(locales)
    if (entries.length > 1) {
      entries.forEach(([localeCode, payload], localeIndex) => {
        const normalized = normalizeAnnouncementRow(
          row,
          index + localeIndex,
          defaultLocale,
          localeCode,
          payload
        )
        if (normalized && !seen.has(normalized.id)) {
          seen.add(normalized.id)
          rows.push(normalized)
        }
      })
      return
    }
    const display = resolveAnnouncementLocale(locales, defaultLocale)
    const normalized = normalizeAnnouncementRow(row, index, defaultLocale, defaultLocale, display)
    if (normalized && !seen.has(normalized.id)) {
      seen.add(normalized.id)
      rows.push(normalized)
    }
  })
  return rows.sort((a, b) => {
    if (a.sort !== b.sort) return a.sort - b.sort
    return String(b.publishedAt).localeCompare(String(a.publishedAt))
  })
}

export function normalizeContentPages(raw, defaultLocale = 'zh-CN') {
  const base = {
    about: {
      enabled: true,
      title: '关于我们',
      summary: 'CryptoX Pro 面向全球用户提供数字资产交易、金融增值与账户安全服务。',
      sections: [
        {
          id: 'about-platform',
          title: '平台定位',
          body: '我们围绕现货、合约、流动性、信用借贷等场景，提供一体化的交易与资产管理体验。',
          imageUrl: '',
          sort: 0
        },
        {
          id: 'about-security',
          title: '安全与风控',
          body: '平台持续建设账户安全、风控审核、资金出入金策略与操作审计能力，降低异常风险。',
          imageUrl: '',
          sort: 10
        }
      ]
    },
    qualifications: [
      {
        id: 'qual-demo-msb',
        name: 'MSB 合规登记（演示）',
        issuer: 'Financial Services Authority',
        certificateNo: 'MSB-DEMO-2026',
        fileUrl: '',
        fileType: 'image',
        validFrom: '2026-01-01',
        validTo: '2027-01-01',
        enabled: true,
        sort: 0
      }
    ],
    whitepapers: [
      {
        id: 'whitepaper-demo-zh',
        title: 'CryptoX Pro 白皮书',
        locale: 'zh-CN',
        version: 'v1.0',
        fileUrl: '',
        updatedAt: '2026-06-01',
        enabled: true,
        sort: 0
      }
    ]
  }
  const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const aboutRaw = input.about && typeof input.about === 'object' ? input.about : {}
  return {
    pages: normalizeRichContentPages(input.pages, defaultLocale),
    about: {
      enabled: typeof aboutRaw.enabled === 'boolean' ? aboutRaw.enabled : base.about.enabled,
      title: typeof aboutRaw.title === 'string' && aboutRaw.title.trim() ? aboutRaw.title.trim() : base.about.title,
      summary: typeof aboutRaw.summary === 'string' ? aboutRaw.summary.trim() : base.about.summary,
      sections: normalizeContentSections(
        Array.isArray(aboutRaw.sections) ? aboutRaw.sections : base.about.sections
      )
    },
    qualifications: normalizeQualificationRows(
      Array.isArray(input.qualifications) ? input.qualifications : base.qualifications
    ),
    whitepapers: normalizeWhitepaperRows(
      Array.isArray(input.whitepapers) ? input.whitepapers : base.whitepapers
    )
  }
}

const DEMO_CUSTOM_LOCALES = [
  {
    code: 'vi',
    label: 'Tiếng Việt',
    short: 'VI',
    icon:
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Crect width=%2232%22 height=%2232%22 rx=%226%22 fill=%22%23da251d%22/%3E%3Cpath fill=%22%23ff0%22 d=%22m16 7 2.1 6.3h6.7l-5.4 3.9 2.1 6.3-5.5-3.9-5.5 3.9 2.1-6.3-5.4-3.9h6.7z%22/%3E%3C/svg%3E'
  }
]

const DEMO_CUSTOM_DIAL_CODES = [
  {
    dial: '+84',
    label: '越南 +84',
    icon:
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Crect width=%2232%22 height=%2232%22 rx=%226%22 fill=%22%23da251d%22/%3E%3Cpath fill=%22%23ff0%22 d=%22m16 7 2.1 6.3h6.7l-5.4 3.9 2.1 6.3-5.5-3.9-5.5 3.9 2.1-6.3-5.4-3.9h6.7z%22/%3E%3C/svg%3E'
  }
]

export const DEFAULT_SITE_CONFIG = {
  siteName: 'CryptoX Pro',
  /** PC 端 Logo（完整 URL 或 data URL） */
  logoUrlPc: '',
  /** 移动端 Logo；未设置时前台侧栏等会回退为 PC Logo */
  logoUrlMobile: '',
  /** 浏览器默认标题，留空则使用站点名称 */
  documentTitle: '',
  /** 管理台侧栏等处的展示副标题 */
  tagline: '',
  /** Meta description */
  seoDescription: '',
  /** Meta keywords，逗号分隔 */
  seoKeywords: '',
  /** Open Graph / 分享预览图 URL */
  seoOgImage: '',
  /** 是否在前台登录页展示区块链钱包登录入口 */
  walletLoginEnabled: true,
  /** 各钱包入口开关与连接相关配置（顺序与内置列表一致） */
  walletLoginProviders: normalizeWalletLoginProviders([]),
  /** 邮箱登录/注册是否显示图形验证码（前端演示校验，接入后端后替换为真实验证码） */
  loginCaptchaEnabled: false,
  /** 登录与注册是否必填邀请码 */
  inviteCodeRequired: false,
  /** 是否在前台开放邮箱登录与邮箱注册 */
  emailLoginEnabled: true,
  /** 是否在前台开放手机号登录与手机号注册；关闭后仅保留邮箱登录/注册，区号列表仍仅 +86 */
  phoneLoginEnabled: true,
  /** 手机登录/安全绑定可选区号（phoneLoginEnabled 为 true 时生效）；顺序由 dialSortOrder 决定 */
  allowedDialCodes: ['+86', '+84'],
  /** 管理台新增的国际区号 */
  customDialCodes: DEMO_CUSTOM_DIAL_CODES,
  /** 区号显示图标/名称覆盖 */
  dialMetaOverrides: {
    '+84': {
      label: '越南 +84',
      icon: DEMO_CUSTOM_DIAL_CODES[0].icon
    }
  },
  /**
   * 区号在下拉中的排序权重，数字越小越靠前；未配置的区号按内置预设顺序默认 0、10、20…
   * @type {Record<string, number>}
   */
  dialSortOrder: {
    '+86': 0,
    '+84': 10
  },
  /** 启用后，以下多语言配置才会应用到前台；关闭则固定简体中文并隐藏语言切换 */
  languageSettingsEnabled: true,
  /** 管理台新增的语言 */
  customLocales: DEMO_CUSTOM_LOCALES,
  /** 邮件服务器（SMTP）多账户，可多条并分别启用 */
  smtpAccounts: DEFAULT_SMTP_ACCOUNTS_DEMO,
  /** 多语言（languageSettingsEnabled 为 true 时生效） */
  i18n: {
    ...DEFAULT_I18N_BLOCK,
    enabledLocales: ['zh-CN', 'en', 'vi'],
    localeSortOrder: {
      'zh-CN': 0,
      en: 10,
      vi: 20
    },
    localeMetaOverrides: {
      vi: {
        label: 'Tiếng Việt',
        short: 'VI',
        icon: DEMO_CUSTOM_LOCALES[0].icon
      }
    },
    translationFiles: {
      vi: {
        common: {
          login: 'Đăng nhập',
          register: 'Đăng ký',
          logout: 'Đăng xuất'
        }
      }
    }
  },
  /** 短信通道列表（同一国际区号可配置多条；演示存本地，生产应由后端保管密钥） */
  smsChannels: DEFAULT_SMS_CHANNELS_DEMO,
  /** 管理台语音提醒配置 */
  voiceAlerts: normalizeVoiceAlerts(),
  /** 社媒链接（前台首页页脚展示启用项） */
  socialLinks: DEFAULT_SOCIAL_LINKS_DEMO,
  /** 前台公开内容页：关于、资质、白皮书 */
  contentPages: normalizeContentPages(),
  /** 前台公开站内公告 */
  announcements: normalizeSiteAnnouncements()
}

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed ? parsed : null
  } catch {
    return null
  }
}

function normalizeDialSortOrder(raw, customDialCodes = []) {
  /** @type {Record<string, number>} */
  const out = {}
  const catalog = dialCatalog(customDialCodes)
  catalog.forEach((p, i) => {
    out[p.dial] = i * 10
  })
  if (raw && typeof raw === 'object') {
    for (const dial of knownDialSet(customDialCodes)) {
      if (!Object.prototype.hasOwnProperty.call(raw, dial)) continue
      const n = Number(raw[dial])
      if (Number.isFinite(n)) out[dial] = Math.round(n)
    }
  }
  return out
}

function normalizeAllowedDialCodes(raw, dialSortOrder, customDialCodes = []) {
  if (!Array.isArray(raw)) raw = ['+86']
  const valid = knownDialSet(customDialCodes)
  const d = [...new Set(raw.map((x) => String(x || '').trim()).filter((x) => valid.has(x)))]
  const codes = d.length ? d : ['+86']
  const order = dialSortOrder && typeof dialSortOrder === 'object' ? dialSortOrder : normalizeDialSortOrder(null, customDialCodes)
  return [...codes].sort((a, b) => {
    const da = order[a] ?? 999999
    const db = order[b] ?? 999999
    if (da !== db) return da - db
    const catalog = dialCatalog(customDialCodes)
    return catalog.findIndex((x) => x.dial === a) - catalog.findIndex((x) => x.dial === b)
  })
}

function normalizeLocaleSortOrder(raw, customLocales = []) {
  /** @type {Record<string, number>} */
  const out = {}
  const catalog = localeCatalog(customLocales)
  catalog.forEach((l, i) => {
    out[l.code] = i * 10
  })
  if (raw && typeof raw === 'object') {
    for (const code of knownLocaleSet(customLocales)) {
      if (!Object.prototype.hasOwnProperty.call(raw, code)) continue
      const n = Number(raw[code])
      if (Number.isFinite(n)) out[code] = Math.round(n)
    }
  }
  return out
}

function normalizeI18n(raw, customLocales = []) {
  const d = { ...DEFAULT_I18N_BLOCK }
  const validLocales = knownLocaleSet(customLocales)
  const catalog = localeCatalog(customLocales)
  if (!raw || typeof raw !== 'object') {
    const localeSortOrder = normalizeLocaleSortOrder(null, customLocales)
    return {
      ...d,
      localeSortOrder,
      localeMetaOverrides: {},
      translationBase: null,
      translationFiles: {},
      enabledLocales: [...d.enabledLocales].sort((a, b) => {
        const da = localeSortOrder[a] ?? 999999
        const db = localeSortOrder[b] ?? 999999
        if (da !== db) return da - db
        return catalog.findIndex((x) => x.code === a) - catalog.findIndex((x) => x.code === b)
      })
    }
  }
  const base = { ...d, ...raw }
  let enabled = Array.isArray(base.enabledLocales)
    ? base.enabledLocales.filter((c) => validLocales.has(c))
    : d.enabledLocales
  if (enabled.length === 0) enabled = [...d.enabledLocales]
  let def = typeof base.defaultLocale === 'string' && validLocales.has(base.defaultLocale)
    ? base.defaultLocale
    : d.defaultLocale
  if (!enabled.includes(def)) def = enabled[0]

  const localeSortOrder = normalizeLocaleSortOrder(base.localeSortOrder, customLocales)
  enabled = [...enabled].sort((a, b) => {
    const da = localeSortOrder[a] ?? 999999
    const db = localeSortOrder[b] ?? 999999
    if (da !== db) return da - db
    return catalog.findIndex((x) => x.code === a) - catalog.findIndex((x) => x.code === b)
  })

  const translationFiles = {}
  if (base.translationFiles && typeof base.translationFiles === 'object' && !Array.isArray(base.translationFiles)) {
    for (const code of validLocales) {
      const file = normalizePlainObject(base.translationFiles[code])
      if (file) translationFiles[code] = file
    }
  }

  return {
    enabledLocales: enabled,
    defaultLocale: def,
    languageSwitcherEnabled:
      typeof base.languageSwitcherEnabled === 'boolean' ? base.languageSwitcherEnabled : d.languageSwitcherEnabled,
    localeSortOrder,
    localeMetaOverrides: normalizeMetaOverrides(base.localeMetaOverrides, validLocales),
    translationBase: normalizePlainObject(base.translationBase),
    translationFiles
  }
}

export function normalizeSiteConfig(raw) {
  const merged = { ...DEFAULT_SITE_CONFIG, ...(raw && typeof raw === 'object' ? raw : {}) }
  const rawObj = raw && typeof raw === 'object' ? raw : {}
  const nestedDials = raw?.i18n && Array.isArray(raw.i18n.allowedDialCodes) ? raw.i18n.allowedDialCodes : null
  if (nestedDials && nestedDials.length && (!raw?.allowedDialCodes || !Array.isArray(raw.allowedDialCodes))) {
    merged.allowedDialCodes = nestedDials
  }
  if (!Object.prototype.hasOwnProperty.call(rawObj, 'phoneLoginEnabled')) {
    if (typeof rawObj.loginSettingsEnabled === 'boolean') {
      merged.phoneLoginEnabled = rawObj.loginSettingsEnabled
    }
  } else if (typeof merged.phoneLoginEnabled !== 'boolean') {
    merged.phoneLoginEnabled = DEFAULT_SITE_CONFIG.phoneLoginEnabled
  }
  if ('loginSettingsEnabled' in merged) delete merged.loginSettingsEnabled
  if (typeof merged.emailLoginEnabled !== 'boolean') {
    merged.emailLoginEnabled = DEFAULT_SITE_CONFIG.emailLoginEnabled
  }
  merged.languageSettingsEnabled =
    typeof merged.languageSettingsEnabled === 'boolean'
      ? merged.languageSettingsEnabled
      : DEFAULT_SITE_CONFIG.languageSettingsEnabled
  merged.customDialCodes = normalizeCustomDialCodes(merged.customDialCodes)
  merged.dialSortOrder = normalizeDialSortOrder(merged.dialSortOrder, merged.customDialCodes)
  merged.allowedDialCodes = normalizeAllowedDialCodes(merged.allowedDialCodes, merged.dialSortOrder, merged.customDialCodes)
  merged.dialMetaOverrides = normalizeMetaOverrides(merged.dialMetaOverrides, knownDialSet(merged.customDialCodes))
  const explicitSmtpAccounts = Object.prototype.hasOwnProperty.call(rawObj, 'smtpAccounts')
  const needsSmtpMigration =
    !explicitSmtpAccounts && merged.smtp && typeof merged.smtp === 'object'
  merged.smtpAccounts = normalizeSmtpAccountsList(
    needsSmtpMigration ? [] : merged.smtpAccounts,
    explicitSmtpAccounts,
    needsSmtpMigration ? merged.smtp : undefined
  )
  if ('smtp' in merged) delete merged.smtp
  merged.customLocales = normalizeCustomLocales(merged.customLocales)
  merged.i18n = normalizeI18n(merged.i18n, merged.customLocales)
  const explicitSmsChannels = Object.prototype.hasOwnProperty.call(rawObj, 'smsChannels')
  merged.smsChannels = normalizeSmsChannelsList(
    merged.smsChannels,
    explicitSmsChannels,
    merged.smsChannelsByDial
  )
  if ('smsChannelsByDial' in merged) delete merged.smsChannelsByDial
  merged.voiceAlerts = normalizeVoiceAlerts(merged.voiceAlerts)
  merged.socialLinks = normalizeSocialLinksList(merged.socialLinks)
  merged.contentPages = normalizeContentPages(merged.contentPages, merged.i18n?.defaultLocale || 'zh-CN')
  merged.announcements = normalizeSiteAnnouncements(merged.announcements, merged.i18n?.defaultLocale || 'zh-CN')
  const legacy = merged.logoUrl
  if (typeof legacy === 'string' && legacy && !merged.logoUrlPc && !merged.logoUrlMobile) {
    merged.logoUrlPc = legacy
    merged.logoUrlMobile = legacy
  }
  if ('logoUrl' in merged) delete merged.logoUrl
  merged.walletLoginProviders = normalizeWalletLoginProviders(merged.walletLoginProviders)
  return merged
}

/** 同步读取当前站点配置（侧栏等组件使用） */
export function getSiteConfigSnapshot() {
  return normalizeSiteConfig(readStored())
}

let memory = normalizeSiteConfig(readStored())

export const siteConfigApi = {
  getSiteConfig: () =>
    new Promise((resolve) => {
      setTimeout(() => {
        memory = normalizeSiteConfig(readStored())
        resolve({
          success: true,
          data: { ...memory }
        })
      }, 200)
    }),

  updateSiteConfig: (config) =>
    new Promise((resolve) => {
      setTimeout(() => {
        const prev = memory
        const smsChannelsPayload =
          config.smsChannels !== undefined
            ? normalizeSmsChannelsList(config.smsChannels, true, config.smsChannelsByDial)
            : prev.smsChannels
        const smtpAccountsPayload =
          config.smtpAccounts !== undefined
            ? normalizeSmtpAccountsList(config.smtpAccounts, true, config.smtp)
            : prev.smtpAccounts
        const socialLinksPayload =
          config.socialLinks !== undefined ? normalizeSocialLinksList(config.socialLinks) : prev.socialLinks
        const customLocalesPayload = normalizeCustomLocales(config.customLocales)
        const i18nPayload = normalizeI18n(
          config.i18n !== undefined ? config.i18n : prev.i18n,
          customLocalesPayload
        )
        const contentPagesPayload =
          config.contentPages !== undefined
            ? normalizeContentPages(config.contentPages, i18nPayload.defaultLocale)
            : prev.contentPages
        const announcementsPayload =
          config.announcements !== undefined
            ? normalizeSiteAnnouncements(config.announcements, i18nPayload.defaultLocale)
            : prev.announcements
        const voiceAlertsPayload =
          config.voiceAlerts !== undefined ? normalizeVoiceAlerts(config.voiceAlerts) : prev.voiceAlerts
        memory = normalizeSiteConfig({
          ...DEFAULT_SITE_CONFIG,
          siteName: String(config.siteName ?? '').trim() || DEFAULT_SITE_CONFIG.siteName,
          logoUrlPc: typeof config.logoUrlPc === 'string' ? config.logoUrlPc : '',
          logoUrlMobile: typeof config.logoUrlMobile === 'string' ? config.logoUrlMobile : '',
          documentTitle: typeof config.documentTitle === 'string' ? config.documentTitle.trim() : '',
          tagline: typeof config.tagline === 'string' ? config.tagline.trim() : '',
          seoDescription: typeof config.seoDescription === 'string' ? config.seoDescription.trim() : '',
          seoKeywords: typeof config.seoKeywords === 'string' ? config.seoKeywords.trim() : '',
          seoOgImage: typeof config.seoOgImage === 'string' ? config.seoOgImage.trim() : '',
          walletLoginEnabled:
            typeof config.walletLoginEnabled === 'boolean'
              ? config.walletLoginEnabled
              : DEFAULT_SITE_CONFIG.walletLoginEnabled,
          walletLoginProviders: normalizeWalletLoginProviders(config.walletLoginProviders),
          loginCaptchaEnabled:
            typeof config.loginCaptchaEnabled === 'boolean'
              ? config.loginCaptchaEnabled
              : DEFAULT_SITE_CONFIG.loginCaptchaEnabled,
          inviteCodeRequired:
            typeof config.inviteCodeRequired === 'boolean'
              ? config.inviteCodeRequired
              : DEFAULT_SITE_CONFIG.inviteCodeRequired,
          emailLoginEnabled:
            typeof config.emailLoginEnabled === 'boolean'
              ? config.emailLoginEnabled
              : DEFAULT_SITE_CONFIG.emailLoginEnabled,
          phoneLoginEnabled:
            typeof config.phoneLoginEnabled === 'boolean'
              ? config.phoneLoginEnabled
              : DEFAULT_SITE_CONFIG.phoneLoginEnabled,
          languageSettingsEnabled:
            typeof config.languageSettingsEnabled === 'boolean'
              ? config.languageSettingsEnabled
              : DEFAULT_SITE_CONFIG.languageSettingsEnabled,
          customLocales: customLocalesPayload,
          allowedDialCodes:
            Array.isArray(config.allowedDialCodes) && config.allowedDialCodes.length
              ? [...config.allowedDialCodes]
              : prev.allowedDialCodes,
          customDialCodes: normalizeCustomDialCodes(config.customDialCodes),
          dialMetaOverrides:
            config.dialMetaOverrides !== undefined && config.dialMetaOverrides !== null && typeof config.dialMetaOverrides === 'object'
              ? { ...config.dialMetaOverrides }
              : prev.dialMetaOverrides,
          dialSortOrder:
            config.dialSortOrder !== undefined && config.dialSortOrder !== null && typeof config.dialSortOrder === 'object'
              ? { ...config.dialSortOrder }
              : prev.dialSortOrder,
          smtpAccounts: smtpAccountsPayload,
          i18n: i18nPayload,
          smsChannels: smsChannelsPayload,
          voiceAlerts: voiceAlertsPayload,
          socialLinks: socialLinksPayload,
          contentPages: contentPagesPayload,
          announcements: announcementsPayload
        })
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(memory))
        } catch {
          /* ignore quota */
        }
        resolve({
          success: true,
          message: '站点配置已保存'
        })
      }, 400)
    }),

  /**
   * 发送测试邮件（演示：不真正连接 SMTP，仅校验必填项）
   * @param {{ to: string, smtpAccountId?: string }} params
   */
  testSmtp: (params) =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        const to = String(params?.to ?? '').trim()
        const accountId = params?.smtpAccountId != null ? String(params.smtpAccountId).trim() : ''
        if (!to) {
          reject(new Error('请填写收件人邮箱'))
          return
        }
        const accounts = memory.smtpAccounts || []
        let s = null
        if (accountId) {
          s = accounts.find((a) => a.id === accountId)
        } else {
          s = accounts.find((a) => a.enabled)
        }
        if (!s) {
          reject(new Error('未找到可用的 SMTP 账户，请先添加并保存'))
          return
        }
        if (!s.enabled) {
          reject(new Error('请先在列表中启用该 SMTP 账户并保存'))
          return
        }
        if (!String(s.host ?? '').trim()) {
          reject(new Error('请填写 SMTP 服务器地址'))
          return
        }
        if (!String(s.fromEmail ?? '').trim()) {
          reject(new Error('请填写发件人邮箱'))
          return
        }
        resolve({
          success: true,
          message: `测试邮件已模拟发送至 ${to}（演示环境未真实投递，接入后端后由服务端发送）`
        })
      }, 600)
    })
}
