import { AGENT_STATUS } from '../constants/agent.js'
import { normalizeAgentProductCommission } from './agentCommission.js'
import { USER_ROLE, USER_STATUS } from '../constants/user.js'
import { usersList } from './user.js'

export const DEFAULT_AGENT_LOGIN_PASSWORD = 'Agent123456'
const AGENT_PORTAL_LOGIN_URL = '/agent-system/login'

const normalizeLoginAccount = (value) => String(value ?? '').trim().toLowerCase()

const normalizePassword = (value) => String(value ?? '')

const toAgentUidFromUser = (user) => {
  const raw = String(user?.id ?? user?.uid ?? '').match(/\d+/)?.[0]
  return raw ? Number(raw) : Date.now()
}

const formatAgentPhone = (phone) => {
  const raw = String(phone ?? '').replace(/\D/g, '')
  if (raw.length < 7) return phone || ''
  return `+${raw.slice(0, 2)} ${raw.slice(2, 5)}****${raw.slice(-4)}`
}

const createAgentPassword = () => {
  const suffix = String(Math.floor(100000 + Math.random() * 900000))
  return `Agent!${suffix}`
}

const createMfaSecret = () => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  return Array.from({ length: 16 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}

const buildMfaSetup = (loginAccount, secret = createMfaSecret()) => {
  const issuer = 'FEX Agent'
  const label = `${issuer}:${loginAccount}`
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`
  return {
    issuer,
    accountName: loginAccount,
    secret,
    otpauthUrl,
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpauthUrl)}`
  }
}

// 模拟代理列表数据
export const mockAgentList = [
  {
    id: 1,
    uid: 100001,
    username: 'agent_zhang',
    /** 直邀注册用推广码（与后台代理档案一致；演示数据） */
    inviteCode: 'AGNT_ZHANG',
    email: 'zhang@example.com',
    phone: '+86 138****8888',
    status: AGENT_STATUS.ACTIVE,
    totalReferrals: 156,
    totalCommission: 12580.5,
    monthCommission: 1280.3,
    createdAt: '2025-01-15 10:30:00',
    lastActiveAt: '2026-03-08 14:20:00',
    productCommission: normalizeAgentProductCommission({
      agentDepositCommissionEnabled: true,
      agentDepositCommissionRate: '0.12',
      agentPerpetualCommissionEnabled: true,
      agentPerpetualCommissionRate: '0.35',
      agentDeliveryCommissionEnabled: true,
      agentDeliveryCommissionRate: '0.28',
      agentSpotCommissionEnabled: true,
      agentSpotCommissionRate: '0.22',
      agentAiQuantCommissionEnabled: true,
      agentAiQuantCommissionRate: '0.15',
      agentLendingCommissionEnabled: true,
      agentLendingCommissionRate: '0.10',
      agentBorrowingCommissionEnabled: false,
      agentBorrowingCommissionRate: '0',
      agentPortfolioCommissionEnabled: true,
      agentPortfolioCommissionRate: '0.10'
    })
  },
  {
    id: 2,
    uid: 100002,
    username: 'agent_wang',
    inviteCode: 'AGNT_WANG',
    email: 'wang@example.com',
    phone: '+86 139****6666',
    status: AGENT_STATUS.ACTIVE,
    totalReferrals: 89,
    totalCommission: 8450.8,
    monthCommission: 950.6,
    createdAt: '2025-02-10 09:15:00',
    lastActiveAt: '2026-03-07 16:45:00',
    productCommission: normalizeAgentProductCommission({})
  },
  {
    id: 3,
    uid: 100003,
    username: 'agent_li',
    inviteCode: 'AGNT_LI',
    email: 'li@example.com',
    phone: '+86 137****5555',
    status: AGENT_STATUS.INACTIVE,
    totalReferrals: 23,
    totalCommission: 2340.2,
    monthCommission: 0,
    createdAt: '2025-03-05 14:20:00',
    lastActiveAt: '2026-01-20 10:30:00',
    productCommission: normalizeAgentProductCommission({})
  },
  {
    id: 4,
    uid: 100004,
    username: 'agent_zhao',
    inviteCode: 'AGNT_ZHAO',
    email: 'zhao@example.com',
    phone: '+86 136****9999',
    status: AGENT_STATUS.ACTIVE,
    totalReferrals: 201,
    totalCommission: 18760.4,
    monthCommission: 2150.9,
    createdAt: '2024-12-01 08:00:00',
    lastActiveAt: '2026-03-09 09:10:00',
    productCommission: normalizeAgentProductCommission({
      agentPerpetualCommissionEnabled: true,
      agentPerpetualCommissionRate: '0.05'
    })
  },
  {
    id: 5,
    uid: 100005,
    username: 'agent_sun',
    inviteCode: 'AGNT_SUN',
    email: 'sun@example.com',
    phone: '+86 135****7777',
    status: AGENT_STATUS.SUSPENDED,
    totalReferrals: 45,
    totalCommission: 4520.1,
    monthCommission: 0,
    createdAt: '2025-02-20 11:30:00',
    lastActiveAt: '2026-02-15 13:20:00',
    productCommission: normalizeAgentProductCommission({})
  }
]

// 模拟代理统计数据
export const mockAgentStats = {
  totalAgents: 1245,
  activeAgents: 987,
  inactiveAgents: 203,
  suspendedAgents: 55,
  totalReferrals: 45678,
  totalCommission: 1256780.5,
  monthCommission: 98450.3,
  todayCommission: 3520.8
}

// 模拟代理详情
export const mockAgentDetail = (uid) => {
  const agent = mockAgentList.find((a) => a.uid === uid) || mockAgentList[0]
  return {
    ...agent,
    productCommission: normalizeAgentProductCommission(agent.productCommission),
    /** 代理仅一级，名下推荐用户总数即 totalReferrals */
    referralTree: [
      {
        level: 1,
        count: agent.totalReferrals,
        commission: agent.totalCommission
      }
    ],
    performanceByType: [
      { type: 'deposit', amount: 45000, commission: 4500, count: 120 },
      { type: 'trading', amount: 230000, commission: 2300, count: 450 },
      { type: 'lending', amount: 78000, commission: 3120, count: 89 },
      { type: 'ai_quant', amount: 56000, commission: 2240, count: 67 }
    ]
  }
}

// 模拟更多代理数据以便测试分页
const generateMockAgents = () => {
  const agents = [...mockAgentList]
  for (let i = 6; i <= 25; i++) {
    agents.push({
      id: i,
      uid: 100000 + i,
      username: `agent_user_${i}`,
      email: `user${i}@example.com`,
      phone: `+86 13${Math.floor(Math.random() * 10)}****${Math.floor(Math.random() * 9000) + 1000}`,
      status: Object.values(AGENT_STATUS)[Math.floor(Math.random() * Object.values(AGENT_STATUS).length)],
      totalReferrals: Math.floor(Math.random() * 300),
      totalCommission: Math.floor(Math.random() * 20000),
      monthCommission: Math.floor(Math.random() * 3000),
      createdAt: `2025-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1} 10:00:00`,
      lastActiveAt: '2026-03-08 14:20:00',
      productCommission: normalizeAgentProductCommission({})
    })
  }
  return agents
}

const extendedAgentList = generateMockAgents()
const initialAgentUids = new Set(extendedAgentList.map((agent) => Number(agent.uid)))
const agentCredentials = new Map()

function ensureAgentCredentialsSeeded() {
  if (agentCredentials.size > 0) return
  for (const agent of extendedAgentList) {
    const loginAccount = normalizeLoginAccount(agent.loginAccount || agent.email)
    if (!loginAccount) continue
    agent.loginAccount = loginAccount
    agentCredentials.set(loginAccount, {
      uid: Number(agent.uid),
      email: agent.email,
      username: agent.username,
      loginAccount,
      password: DEFAULT_AGENT_LOGIN_PASSWORD,
      mfaRequired: true,
      mfaBound: false,
      createdAt: agent.createdAt
    })
  }
}

function findAgentByUid(uid) {
  const n = Number(uid)
  return extendedAgentList.find((agent) => Number(agent.uid) === n)
}

function findCredentialByUid(uid) {
  ensureAgentCredentialsSeeded()
  const n = Number(uid)
  return [...agentCredentials.values()].find((credential) => Number(credential.uid) === n) || null
}

function assertLoginAccountAvailable(loginAccount, uid = null) {
  ensureAgentCredentialsSeeded()
  const normalized = normalizeLoginAccount(loginAccount)
  if (!normalized) throw new Error('登录账号必填')
  if (normalized.length < 4 || normalized.length > 64) {
    throw new Error('登录账号长度需为 4～64 位')
  }
  if (!/^[a-z0-9._@-]+$/.test(normalized)) {
    throw new Error('登录账号仅支持字母、数字、点、下划线、短横线或邮箱格式')
  }
  const existing = agentCredentials.get(normalized)
  if (existing && Number(existing.uid) !== Number(uid)) {
    throw new Error('登录账号已被其他代理使用')
  }
  return normalized
}

function assertPassword(password) {
  const value = normalizePassword(password)
  if (value.length < 6 || value.length > 32) {
    throw new Error('登录密码长度需为 6～32 位')
  }
  return value
}

function buildAgentDelivery({ agent, loginAccount, password, changed = false, mfaSetup }) {
  const title = changed ? '代理登录账号已更新' : '代理系统登录信息'
  const message = [
    `${title}`,
    `代理：${agent.username}（UID ${agent.uid}）`,
    `登录账号：${loginAccount}`,
    password ? `初始密码：${password}` : null,
    mfaSetup?.secret ? `MFA 密钥：${mfaSetup.secret}` : null,
    mfaSetup?.qrCodeUrl ? 'MFA 二维码：见下方截图区域' : null,
    '首次登录后请完成 MFA 安全验证绑定；绑定后再次登录需输入安全验证码。'
  ].filter(Boolean).join('\n')
  return {
    title,
    channel: '站内信 / 邮件 / 短信',
    loginUrl: AGENT_PORTAL_LOGIN_URL,
    loginAccount,
    initialPassword: password || '',
    mfaRequired: true,
    mfaSetup: mfaSetup || null,
    message
  }
}

function upsertCredential({ agent, loginAccount, password, resetMfa = false }) {
  ensureAgentCredentialsSeeded()
  const previous = findCredentialByUid(agent.uid)
  if (previous?.loginAccount && previous.loginAccount !== loginAccount) {
    agentCredentials.delete(previous.loginAccount)
  }
  const mfaSecret = resetMfa ? createMfaSecret() : previous?.mfaSecret || createMfaSecret()
  const credential = {
    ...(previous || {}),
    uid: Number(agent.uid),
    email: agent.email,
    username: agent.username,
    loginAccount,
    password: password || previous?.password || DEFAULT_AGENT_LOGIN_PASSWORD,
    mfaRequired: true,
    mfaBound: resetMfa ? false : previous?.mfaBound === true,
    mfaSecret,
    updatedAt: new Date().toISOString()
  }
  agentCredentials.set(loginAccount, credential)
  agent.loginAccount = loginAccount
  return credential
}

export function getAgentCredentialByLogin(loginAccount) {
  ensureAgentCredentialsSeeded()
  return agentCredentials.get(normalizeLoginAccount(loginAccount)) || null
}

export function getAgentCredentialByUid(uid) {
  return findCredentialByUid(uid)
}

export function setAgentCredentialMfaBound(loginAccount, bound) {
  ensureAgentCredentialsSeeded()
  const credential = getAgentCredentialByLogin(loginAccount)
  if (!credential) return null
  credential.mfaBound = bound === true
  credential.updatedAt = new Date().toISOString()
  return { ...credential }
}

export function searchAgentUserCandidates(keyword) {
  const q = String(keyword ?? '').trim().toLowerCase()
  if (!q) return []
  const normalizedUserId = q.startsWith('user_') ? q : `user_${q.replace(/^uid[:：\s]*/i, '')}`
  const user = usersList.find((row) => row.id.toLowerCase() === normalizedUserId)
  if (!user) return []
  const uid = toAgentUidFromUser(user)
  const existingAgent = findAgentByUid(uid)
  const blocked = user.status === USER_STATUS.BANNED || user.status === USER_STATUS.SUSPENDED
  return [{
    id: user.id,
    uid,
    username: user.username,
    email: user.email,
    phone: formatAgentPhone(user.phone),
    role: user.role,
    status: user.status,
    disabled: Boolean(existingAgent || blocked),
    disabledReason: existingAgent
      ? '该用户已是代理'
      : blocked
        ? '封禁或冻结用户不可开通代理'
        : ''
  }]
}

export function __resetAgentCredentialsForTests() {
  agentCredentials.clear()
  for (let i = extendedAgentList.length - 1; i >= 0; i -= 1) {
    if (!initialAgentUids.has(Number(extendedAgentList[i].uid))) {
      extendedAgentList.splice(i, 1)
    }
  }
  for (let i = mockAgentList.length - 1; i >= 0; i -= 1) {
    if (!initialAgentUids.has(Number(mockAgentList[i].uid))) {
      mockAgentList.splice(i, 1)
    }
  }
  ensureAgentCredentialsSeeded()
}

function patchAgentListItem(a) {
  return {
    ...a,
    loginAccount: findCredentialByUid(a.uid)?.loginAccount || a.loginAccount || a.email,
    productCommission: normalizeAgentProductCommission(a.productCommission)
  }
}

// API 模拟函数
export const agentApi = {
  getAgentList: (params) => {
    const { page = 1, pageSize = 10, searchKeyword = '', status = 'all' } = params

    return new Promise((resolve) => {
      setTimeout(() => {
        let list = extendedAgentList.map(patchAgentListItem)

        if (searchKeyword.trim()) {
          const keyword = searchKeyword.toLowerCase()
          list = list.filter(
            (agent) =>
              agent.username.toLowerCase().includes(keyword) ||
              agent.email.toLowerCase().includes(keyword) ||
              agent.uid.toString().includes(keyword)
          )
        }

        if (status !== 'all') {
          list = list.filter((agent) => agent.status === status)
        }

        const total = list.length
        const start = (page - 1) * pageSize
        const end = start + pageSize
        const paginatedList = list.slice(start, end)

        resolve({
          success: true,
          data: {
            list: paginatedList,
            total: total,
            page: page,
            pageSize: pageSize
          }
        })
      }, 300)
    })
  },

  searchAgentUserCandidates: (keyword) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, data: searchAgentUserCandidates(keyword) })
      }, 200)
    })
  },

  generateAgentPassword: () => createAgentPassword(),

  upgradeToAgent: (payload) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const isLegacy = typeof payload === 'string' || typeof payload === 'number'
          const userId = isLegacy ? String(payload) : String(payload?.userId || payload?.uid || '')
          const user = usersList.find((row) => row.id === userId || String(toAgentUidFromUser(row)) === userId)
          if (!user) throw new Error('未找到该用户')
          if (user.status === USER_STATUS.BANNED || user.status === USER_STATUS.SUSPENDED) {
            throw new Error('封禁或冻结用户不可开通代理')
          }

          const uid = toAgentUidFromUser(user)
          if (findAgentByUid(uid)) throw new Error('该用户已是代理')
          const loginAccount = assertLoginAccountAvailable(
            isLegacy ? user.email : (payload.loginAccount || user.email || user.username),
            uid
          )
          const password = assertPassword(isLegacy ? DEFAULT_AGENT_LOGIN_PASSWORD : (payload.password || createAgentPassword()))
          const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
          const agent = patchAgentListItem({
            id: extendedAgentList.length + 1,
            uid,
            username: user.username,
            inviteCode: `AG${uid}`,
            email: user.email,
            phone: formatAgentPhone(user.phone),
            status: AGENT_STATUS.ACTIVE,
            totalReferrals: 0,
            totalCommission: 0,
            monthCommission: 0,
            createdAt: now,
            lastActiveAt: now,
            productCommission: normalizeAgentProductCommission({})
          })
          extendedAgentList.unshift(agent)
          mockAgentList.push(agent)
          user.role = USER_ROLE.AGENT
          const credential = upsertCredential({ agent, loginAccount, password })
          const delivery = buildAgentDelivery({
            agent,
            loginAccount,
            password,
            mfaSetup: buildMfaSetup(loginAccount, credential.mfaSecret)
          })
          resolve({
            success: true,
            message: '已将该用户设为代理',
            data: { agent: patchAgentListItem(agent), credential: { ...credential, password: undefined }, delivery }
          })
        } catch (error) {
          reject(error)
        }
      }, 500)
    })
  },

  updateAgentLoginCredential: (uid, payload) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const agent = findAgentByUid(uid)
          if (!agent) throw new Error('未找到该代理')
          const current = findCredentialByUid(uid)
          const loginAccount = assertLoginAccountAvailable(payload?.loginAccount || current?.loginAccount || agent.email, uid)
          const nextPassword = payload?.resetPassword
            ? assertPassword(payload?.password || createAgentPassword())
            : current?.password
          const credential = upsertCredential({
            agent,
            loginAccount,
            password: nextPassword,
            resetMfa: payload?.resetMfa === true
          })
          const delivery = buildAgentDelivery({
            agent,
            loginAccount,
            password: payload?.resetPassword ? nextPassword : '',
            changed: true,
            mfaSetup: buildMfaSetup(loginAccount, credential.mfaSecret)
          })
          resolve({
            success: true,
            message: '代理登录账号已更新',
            data: { credential: { ...credential, password: undefined }, delivery }
          })
        } catch (error) {
          reject(error)
        }
      }, 400)
    })
  },

  updateAgentStatus: (uid, status) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: '代理状态已更新'
        })
      }, 500)
    })
  },

  getAgentDetail: (uid) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: mockAgentDetail(uid)
        })
      }, 300)
    })
  },

  updateAgentProductCommission: (uid, productCommission) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const agent = extendedAgentList.find((a) => a.uid === uid)
        if (!agent) {
          reject(new Error('未找到该代理'))
          return
        }
        try {
          agent.productCommission = normalizeAgentProductCommission(productCommission)
        } catch (e) {
          reject(e)
          return
        }
        resolve({
          success: true,
          message: '代理产品线记佣已保存',
          data: { ...agent, productCommission: agent.productCommission }
        })
      }, 400)
    })
  },

  getAgentStats: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: mockAgentStats
        })
      }, 300)
    })
  }
}

export { normalizeAgentProductCommission } from './agentCommission.js'
