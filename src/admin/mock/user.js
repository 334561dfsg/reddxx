import { USER_STATUS, USER_ROLE, USER_KYC_STATUS } from '../constants/user.js'

const generateUser = (id, overrides = {}) => ({
  id: `user_${id}`,
  username: `user${id}`,
  email: `user${id}@example.com`,
  phone: `86138${String(id).padStart(8, '0')}`,
  role: USER_ROLE.USER,
  status: USER_STATUS.ACTIVE,
  kycStatus: USER_KYC_STATUS.VERIFIED,
  isVip: false,
  vipLevel: 0,
  creditScore: Math.floor(Math.random() * 200) + 600, // 600-800分
  balance: Math.floor(Math.random() * 100000),
  frozenBalance: Math.floor(Math.random() * 10000),
  totalProfit: Math.floor(Math.random() * 50000) - 10000,
  tradingVolume: Math.floor(Math.random() * 1000000),
  parentId: null,
  parentUsername: null,
  registerTime: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
  lastLoginTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  lastLoginIp: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
  remark: '',
  ...overrides
})

export const usersList = [
  generateUser(1001, {
    username: 'agent_wang',
    email: 'wang@agent.com',
    role: USER_ROLE.AGENT,
    status: USER_STATUS.ACTIVE,
    kycStatus: USER_KYC_STATUS.VERIFIED,
    isVip: true,
    vipLevel: 5,
    creditScore: 780,
    balance: 500000,
    frozenBalance: 0,
    totalProfit: 125000,
    tradingVolume: 5000000,
    parentId: null,
    parentUsername: null,
    remark: '顶级代理'
  }),
  generateUser(1002, {
    username: 'vip_zhang',
    email: 'zhang@vip.com',
    role: USER_ROLE.USER,
    status: USER_STATUS.ACTIVE,
    kycStatus: USER_KYC_STATUS.VERIFIED,
    isVip: true,
    vipLevel: 4,
    creditScore: 750,
    balance: 350000,
    frozenBalance: 50000,
    totalProfit: 88000,
    tradingVolume: 3200000,
    parentId: 'user_1001',
    parentUsername: 'agent_wang'
  }),
  generateUser(1003, {
    username: 'agent_li',
    email: 'li@agent.com',
    role: USER_ROLE.AGENT,
    status: USER_STATUS.ACTIVE,
    kycStatus: USER_KYC_STATUS.VERIFIED,
    isVip: false,
    creditScore: 720,
    balance: 128000,
    frozenBalance: 22000,
    totalProfit: 45000,
    tradingVolume: 1800000,
    parentId: 'user_1001',
    parentUsername: 'agent_wang'
  }),
  generateUser(1004, {
    username: 'user_chen',
    email: 'chen@example.com',
    role: USER_ROLE.USER,
    status: USER_STATUS.ACTIVE,
    kycStatus: USER_KYC_STATUS.VERIFIED,
    isVip: false,
    creditScore: 680,
    balance: 56000,
    frozenBalance: 8000,
    totalProfit: 12000,
    tradingVolume: 680000,
    parentId: 'user_1003',
    parentUsername: 'agent_li'
  }),
  generateUser(1005, {
    username: 'user_liu',
    email: 'liu@example.com',
    role: USER_ROLE.USER,
    status: USER_STATUS.INACTIVE,
    kycStatus: USER_KYC_STATUS.VERIFIED,
    isVip: false,
    creditScore: 620,
    balance: 8500,
    frozenBalance: 0,
    totalProfit: -3200,
    tradingVolume: 120000,
    parentId: 'user_1001',
    parentUsername: 'agent_wang'
  }),
  generateUser(1006, {
    username: 'new_user_wang',
    email: 'newwang@example.com',
    role: USER_ROLE.USER,
    status: USER_STATUS.ACTIVE,
    kycStatus: USER_KYC_STATUS.PENDING,
    isVip: false,
    creditScore: 650,
    balance: 5000,
    frozenBalance: 0,
    totalProfit: 200,
    tradingVolume: 15000,
    parentId: 'user_1003',
    parentUsername: 'agent_li',
    registerTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  }),
  generateUser(1007, {
    username: 'suspended_user',
    email: 'suspended@example.com',
    role: USER_ROLE.USER,
    status: USER_STATUS.SUSPENDED,
    kycStatus: USER_KYC_STATUS.VERIFIED,
    isVip: false,
    creditScore: 580,
    balance: 42000,
    frozenBalance: 42000,
    totalProfit: 18000,
    tradingVolume: 450000,
    parentId: 'user_1001',
    parentUsername: 'agent_wang',
    remark: '异常交易行为，暂时冻结'
  }),
  generateUser(1008, {
    username: 'banned_user',
    email: 'banned@example.com',
    role: USER_ROLE.USER,
    status: USER_STATUS.BANNED,
    kycStatus: USER_KYC_STATUS.VERIFIED,
    isVip: false,
    creditScore: 450,
    balance: 0,
    frozenBalance: 0,
    totalProfit: -5000,
    tradingVolume: 80000,
    parentId: 'user_1003',
    parentUsername: 'agent_li',
    remark: '违规操作，永久封禁'
  }),
  generateUser(1009, {
    username: 'agent_zhao',
    email: 'zhao@agent.com',
    role: USER_ROLE.AGENT,
    status: USER_STATUS.ACTIVE,
    kycStatus: USER_KYC_STATUS.VERIFIED,
    isVip: true,
    vipLevel: 4,
    creditScore: 760,
    balance: 268000,
    frozenBalance: 35000,
    totalProfit: 72000,
    tradingVolume: 2100000,
    parentId: null,
    parentUsername: null
  }),
  generateUser(1010, {
    username: 'vip_qian',
    email: 'qian@vip.com',
    role: USER_ROLE.USER,
    status: USER_STATUS.ACTIVE,
    kycStatus: USER_KYC_STATUS.VERIFIED,
    isVip: true,
    vipLevel: 5,
    creditScore: 790,
    balance: 520000,
    frozenBalance: 80000,
    totalProfit: 156000,
    tradingVolume: 4200000,
    parentId: 'user_1009',
    parentUsername: 'agent_zhao'
  }),
  generateUser(2001, {
    username: 'new_unverified',
    email: 'new_unverified@example.com',
    role: USER_ROLE.USER,
    status: USER_STATUS.ACTIVE,
    kycStatus: USER_KYC_STATUS.NOT_VERIFIED,
    isVip: false,
    creditScore: 630,
    balance: 3200,
    frozenBalance: 0,
    totalProfit: 120,
    tradingVolume: 8000,
    parentId: 'user_1003',
    parentUsername: 'agent_li',
    registerTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  }),
  generateUser(2002, {
    username: 'pending_high_volume',
    email: 'pending_high_volume@example.com',
    role: USER_ROLE.USER,
    status: USER_STATUS.ACTIVE,
    kycStatus: USER_KYC_STATUS.PENDING,
    isVip: false,
    creditScore: 710,
    balance: 42000,
    frozenBalance: 12000,
    totalProfit: 22000,
    tradingVolume: 2600000,
    parentId: 'user_1001',
    parentUsername: 'agent_wang',
    registerTime: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
  }),
  generateUser(2003, {
    username: 'low_score_user',
    email: 'low_score@example.com',
    role: USER_ROLE.USER,
    status: USER_STATUS.ACTIVE,
    kycStatus: USER_KYC_STATUS.VERIFIED,
    isVip: false,
    creditScore: 520,
    balance: 9200,
    frozenBalance: 0,
    totalProfit: -800,
    tradingVolume: 46000,
    parentId: 'user_1009',
    parentUsername: 'agent_zhao',
    registerTime: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString()
  }),
  generateUser(2004, {
    username: 'old_rich_not_vip',
    email: 'old_rich_not_vip@example.com',
    role: USER_ROLE.USER,
    status: USER_STATUS.ACTIVE,
    kycStatus: USER_KYC_STATUS.VERIFIED,
    isVip: false,
    creditScore: 740,
    balance: 420000,
    frozenBalance: 60000,
    totalProfit: 54000,
    tradingVolume: 180000,
    parentId: 'user_1001',
    parentUsername: 'agent_wang',
    registerTime: new Date(Date.now() - 320 * 24 * 60 * 60 * 1000).toISOString()
  }),
  generateUser(2005, {
    username: 'vip_new_high',
    email: 'vip_new_high@example.com',
    role: USER_ROLE.USER,
    status: USER_STATUS.ACTIVE,
    kycStatus: USER_KYC_STATUS.VERIFIED,
    isVip: true,
    vipLevel: 3,
    creditScore: 770,
    balance: 260000,
    frozenBalance: 0,
    totalProfit: 18000,
    tradingVolume: 1300000,
    parentId: 'user_1003',
    parentUsername: 'agent_li',
    registerTime: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  }),
  generateUser(2006, {
    username: 'inactive_low_volume',
    email: 'inactive_low_volume@example.com',
    role: USER_ROLE.USER,
    status: USER_STATUS.INACTIVE,
    kycStatus: USER_KYC_STATUS.VERIFIED,
    isVip: false,
    creditScore: 660,
    balance: 18000,
    frozenBalance: 0,
    totalProfit: 2600,
    tradingVolume: 12000,
    parentId: 'user_1009',
    parentUsername: 'agent_zhao',
    registerTime: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString()
  })
]

// 生成更多模拟用户
const agentIds = ['user_1001', 'user_1003', 'user_1009']
const agentNames = ['agent_wang', 'agent_li', 'agent_zhao']

for (let i = 1011; i <= 1080; i++) {
  const roles = [USER_ROLE.USER, USER_ROLE.AGENT]
  const statuses = [USER_STATUS.ACTIVE, USER_STATUS.INACTIVE]
  const kycStatuses = [USER_KYC_STATUS.VERIFIED, USER_KYC_STATUS.PENDING, USER_KYC_STATUS.NOT_VERIFIED]
  const role = roles[Math.floor(Math.random() * roles.length)]
  const parentIndex = Math.floor(Math.random() * agentIds.length)
  
  const isVip = Math.random() > 0.8 // 20% VIP
  usersList.push(generateUser(i, {
    role: role,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    kycStatus: kycStatuses[Math.floor(Math.random() * kycStatuses.length)],
    isVip,
    vipLevel: isVip ? Math.floor(Math.random() * 5) + 1 : 0,
    parentId: role === USER_ROLE.AGENT ? null : agentIds[parentIndex],
    parentUsername: role === USER_ROLE.AGENT ? null : agentNames[parentIndex]
  }))
}

export const getUserById = (userId) => {
  return usersList.find(user => user.id === userId)
}

export const getUsersByStatus = (status) => {
  if (status === 'all') return usersList
  return usersList.filter(user => user.status === status)
}

export const getUsersByRole = (role) => {
  if (role === 'all') return usersList
  return usersList.filter(user => user.role === role)
}

export const getUsersByKycStatus = (kycStatus) => {
  if (kycStatus === 'all') return usersList
  return usersList.filter(user => user.kycStatus === kycStatus)
}

export const searchUsers = (keyword) => {
  return usersList.filter(user => 
    user.username.toLowerCase().includes(keyword.toLowerCase()) ||
    user.email.toLowerCase().includes(keyword.toLowerCase()) ||
    user.phone.includes(keyword) ||
    user.id.toLowerCase().includes(keyword.toLowerCase())
  )
}

export const getUsers = ({ page, pageSize, searchKeyword }) => {
  let filteredUsers = [...usersList]

  if (searchKeyword && searchKeyword.trim()) {
    const keyword = searchKeyword.toLowerCase()
    filteredUsers = filteredUsers.filter(
      (user) =>
        user.username.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword) ||
        user.phone.includes(keyword) ||
        user.id.toLowerCase().includes(keyword)
    )
  }

  const total = filteredUsers.length
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const list = filteredUsers.slice(start, end)

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ list, total })
    }, 300)
  })
}

const createUserTagRule = (id, overrides = {}) => ({
  id,
  name: '',
  tag: '',
  status: 'enabled',
  priority: 100,
  matchMode: 'all',
  conditions: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
})

let userTagRules = [
  createUserTagRule('tag_rule_1', {
    name: '高净值用户',
    tag: 'HIGH_VALUE',
    status: 'enabled',
    priority: 10,
    matchMode: 'all',
    conditions: [
      { field: 'balance', operator: 'gte', value: 200000 },
      { field: 'kycStatus', operator: 'eq', value: USER_KYC_STATUS.VERIFIED }
    ]
  }),
  createUserTagRule('tag_rule_2', {
    name: '高频交易用户',
    tag: 'HIGH_VOLUME',
    status: 'enabled',
    priority: 20,
    matchMode: 'all',
    conditions: [
      { field: 'tradingVolume', operator: 'gte', value: 2000000 }
    ]
  }),
  createUserTagRule('tag_rule_3', {
    name: '新注册待转化',
    tag: 'NEW_USER',
    status: 'disabled',
    priority: 30,
    matchMode: 'all',
    conditions: [
      { field: 'registerDays', operator: 'lte', value: 7 },
      { field: 'isVip', operator: 'eq', value: false }
    ]
  }),
  createUserTagRule('tag_rule_4', {
    name: '未认证用户',
    tag: 'UNVERIFIED',
    status: 'enabled',
    priority: 40,
    matchMode: 'all',
    conditions: [
      { field: 'kycStatus', operator: 'neq', value: USER_KYC_STATUS.VERIFIED }
    ]
  }),
  createUserTagRule('tag_rule_5', {
    name: '待认证新客',
    tag: 'NEW_PENDING',
    status: 'enabled',
    priority: 50,
    matchMode: 'all',
    conditions: [
      { field: 'registerDays', operator: 'lte', value: 14 },
      { field: 'kycStatus', operator: 'eq', value: USER_KYC_STATUS.PENDING }
    ]
  }),
  createUserTagRule('tag_rule_6', {
    name: '低信用分',
    tag: 'LOW_SCORE',
    status: 'enabled',
    priority: 60,
    matchMode: 'all',
    conditions: [
      { field: 'creditScore', operator: 'lt', value: 600 }
    ]
  }),
  createUserTagRule('tag_rule_7', {
    name: '高信用分',
    tag: 'HIGH_SCORE',
    status: 'disabled',
    priority: 70,
    matchMode: 'all',
    conditions: [
      { field: 'creditScore', operator: 'gte', value: 780 }
    ]
  }),
  createUserTagRule('tag_rule_8', {
    name: '沉默低交易',
    tag: 'LOW_VOLUME',
    status: 'enabled',
    priority: 80,
    matchMode: 'all',
    conditions: [
      { field: 'tradingVolume', operator: 'lt', value: 50000 },
      { field: 'registerDays', operator: 'gt', value: 30 }
    ]
  }),
  createUserTagRule('tag_rule_9', {
    name: '代理用户',
    tag: 'AGENT',
    status: 'enabled',
    priority: 90,
    matchMode: 'all',
    conditions: [
      { field: 'role', operator: 'eq', value: USER_ROLE.AGENT }
    ]
  }),
  createUserTagRule('tag_rule_10', {
    name: 'VIP用户',
    tag: 'VIP',
    status: 'enabled',
    priority: 100,
    matchMode: 'all',
    conditions: [
      { field: 'isVip', operator: 'eq', value: true }
    ]
  }),
  createUserTagRule('tag_rule_11', {
    name: '大额资产但非VIP',
    tag: 'RICH_NOT_VIP',
    status: 'enabled',
    priority: 110,
    matchMode: 'all',
    conditions: [
      { field: 'balance', operator: 'gte', value: 300000 },
      { field: 'isVip', operator: 'eq', value: false }
    ]
  }),
  createUserTagRule('tag_rule_12', {
    name: '高交易量但未认证',
    tag: 'VOLUME_NO_KYC',
    status: 'enabled',
    priority: 120,
    matchMode: 'all',
    conditions: [
      { field: 'tradingVolume', operator: 'gte', value: 1500000 },
      { field: 'kycStatus', operator: 'neq', value: USER_KYC_STATUS.VERIFIED }
    ]
  }),
  createUserTagRule('tag_rule_13', {
    name: '新注册7天内',
    tag: 'NEW_7D',
    status: 'enabled',
    priority: 130,
    matchMode: 'all',
    conditions: [
      { field: 'registerDays', operator: 'lte', value: 7 }
    ]
  }),
  createUserTagRule('tag_rule_14', {
    name: '封禁用户',
    tag: 'BANNED',
    status: 'disabled',
    priority: 140,
    matchMode: 'all',
    conditions: [
      { field: 'status', operator: 'eq', value: USER_STATUS.BANNED }
    ]
  }),
  createUserTagRule('tag_rule_15', {
    name: '冻结用户',
    tag: 'SUSPENDED',
    status: 'enabled',
    priority: 150,
    matchMode: 'all',
    conditions: [
      { field: 'status', operator: 'eq', value: USER_STATUS.SUSPENDED }
    ]
  }),
  createUserTagRule('tag_rule_16', {
    name: '活跃普通用户',
    tag: 'ACTIVE_USER',
    status: 'enabled',
    priority: 160,
    matchMode: 'all',
    conditions: [
      { field: 'status', operator: 'eq', value: USER_STATUS.ACTIVE },
      { field: 'role', operator: 'eq', value: USER_ROLE.USER }
    ]
  }),
  createUserTagRule('tag_rule_17', {
    name: '高价值或VIP',
    tag: 'HIGH_OR_VIP',
    status: 'enabled',
    priority: 170,
    matchMode: 'any',
    conditions: [
      { field: 'balance', operator: 'gte', value: 200000 },
      { field: 'isVip', operator: 'eq', value: true }
    ]
  }),
  createUserTagRule('tag_rule_18', {
    name: '低余额用户',
    tag: 'LOW_BALANCE',
    status: 'enabled',
    priority: 180,
    matchMode: 'all',
    conditions: [
      { field: 'balance', operator: 'lt', value: 10000 }
    ]
  }),
  createUserTagRule('tag_rule_19', {
    name: '超高交易量',
    tag: 'HIGH_TRADING',
    status: 'enabled',
    priority: 190,
    matchMode: 'all',
    conditions: [
      { field: 'tradingVolume', operator: 'gte', value: 3000000 }
    ]
  }),
  createUserTagRule('tag_rule_20', {
    name: '老用户',
    tag: 'OLD_USER',
    status: 'enabled',
    priority: 200,
    matchMode: 'all',
    conditions: [
      { field: 'registerDays', operator: 'gte', value: 180 }
    ]
  }),
  createUserTagRule('tag_rule_21', {
    name: '新客高频',
    tag: 'NEW_HIGH_VOL',
    status: 'enabled',
    priority: 210,
    matchMode: 'all',
    conditions: [
      { field: 'registerDays', operator: 'lte', value: 30 },
      { field: 'tradingVolume', operator: 'gte', value: 1000000 }
    ]
  }),
  createUserTagRule('tag_rule_22', {
    name: '未激活用户',
    tag: 'INACTIVE',
    status: 'enabled',
    priority: 220,
    matchMode: 'all',
    conditions: [
      { field: 'status', operator: 'eq', value: USER_STATUS.INACTIVE }
    ]
  }),
  createUserTagRule('tag_rule_23', {
    name: '已认证且低信用分',
    tag: 'VERIFIED_LOW_SCORE',
    status: 'enabled',
    priority: 230,
    matchMode: 'all',
    conditions: [
      { field: 'kycStatus', operator: 'eq', value: USER_KYC_STATUS.VERIFIED },
      { field: 'creditScore', operator: 'lt', value: 650 }
    ]
  }),
  createUserTagRule('tag_rule_24', {
    name: '高余额低交易',
    tag: 'BALANCE_HIGH_LOW_VOL',
    status: 'enabled',
    priority: 240,
    matchMode: 'all',
    conditions: [
      { field: 'balance', operator: 'gte', value: 150000 },
      { field: 'tradingVolume', operator: 'lt', value: 200000 }
    ]
  }),
  createUserTagRule('tag_rule_25', {
    name: '高信用VIP',
    tag: 'VIP_TRUSTED',
    status: 'enabled',
    priority: 250,
    matchMode: 'all',
    conditions: [
      { field: 'isVip', operator: 'eq', value: true },
      { field: 'creditScore', operator: 'gte', value: 760 }
    ]
  }),
  createUserTagRule('tag_rule_26', {
    name: '新注册未认证',
    tag: 'NEW_NO_KYC',
    status: 'enabled',
    priority: 260,
    matchMode: 'all',
    conditions: [
      { field: 'registerDays', operator: 'lte', value: 14 },
      { field: 'kycStatus', operator: 'eq', value: USER_KYC_STATUS.NOT_VERIFIED }
    ]
  })
]

const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const getRegisterDays = (user) => {
  const ts = new Date(user.registerTime).getTime()
  if (!Number.isFinite(ts)) return null
  return Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000))
}

const getFieldValue = (user, field) => {
  if (field === 'registerDays') return getRegisterDays(user)
  return user[field]
}

const matchCondition = (user, condition) => {
  const { field, operator, value } = condition || {}
  const actual = getFieldValue(user, field)

  if (operator === 'eq') return actual === value
  if (operator === 'neq') return actual !== value

  const actualNum = normalizeNumber(actual)
  const expectNum = normalizeNumber(value)
  if (actualNum === null || expectNum === null) return false

  if (operator === 'gt') return actualNum > expectNum
  if (operator === 'gte') return actualNum >= expectNum
  if (operator === 'lt') return actualNum < expectNum
  if (operator === 'lte') return actualNum <= expectNum
  return false
}

const matchRule = (user, rule) => {
  const conditions = Array.isArray(rule?.conditions) ? rule.conditions : []
  if (conditions.length === 0) return false
  if (rule?.matchMode === 'any') return conditions.some((c) => matchCondition(user, c))
  return conditions.every((c) => matchCondition(user, c))
}

export const getUserTagRules = ({ page = 1, pageSize = 10, keyword = '', status = 'all' } = {}) => {
  const kw = keyword.trim().toLowerCase()
  let filtered = [...userTagRules]

  if (status !== 'all') {
    filtered = filtered.filter((r) => r.status === status)
  }

  if (kw) {
    filtered = filtered.filter((r) => `${r.name} ${r.tag}`.toLowerCase().includes(kw))
  }

  filtered.sort((a, b) => a.priority - b.priority)

  const total = filtered.length
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const list = filtered.slice(start, end)

  return new Promise((resolve) => {
    setTimeout(() => resolve({ list, total }), 200)
  })
}

export const createUserTagRuleItem = (payload) => {
  const now = new Date().toISOString()
  const rule = createUserTagRule(`tag_rule_${Date.now()}`, {
    ...payload,
    createdAt: now,
    updatedAt: now
  })
  userTagRules = [rule, ...userTagRules]
  return new Promise((resolve) => {
    setTimeout(() => resolve(rule), 200)
  })
}

export const updateUserTagRuleItem = (id, payload) => {
  const index = userTagRules.findIndex((r) => r.id === id)
  if (index === -1) {
    return new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error('rule_not_found')), 200)
    })
  }

  const updated = {
    ...userTagRules[index],
    ...payload,
    updatedAt: new Date().toISOString()
  }
  userTagRules = userTagRules.map((r) => (r.id === id ? updated : r))
  return new Promise((resolve) => {
    setTimeout(() => resolve(updated), 200)
  })
}

export const deleteUserTagRuleItem = (id) => {
  userTagRules = userTagRules.filter((r) => r.id !== id)
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), 200)
  })
}

export const previewUserTagRule = (rule) => {
  const matched = usersList.filter((u) => matchRule(u, rule))
  return new Promise((resolve) => {
    setTimeout(() => resolve({ count: matched.length, sample: matched.slice(0, 20) }), 200)
  })
}
