import { 
  VERIFICATION_LEVEL, 
  VERIFICATION_STATUS, 
  VERIFICATION_DOC_TYPE,
  LOG_ACTION_TYPE
} from '../../constants/verification.js'

// 认证权限配置
export const verificationConfig = {
  // 未认证权限
  [VERIFICATION_LEVEL.NONE]: {
    level: VERIFICATION_LEVEL.NONE,
    levelName: '未认证',
    canDeposit: true,
    canWithdraw: false,
    canSpotTrade: false,
    canDeliveryContract: false,
    canPerpetualContract: false,
    requireDocuments: [],
    description: '未完成身份认证的用户'
  },
  // 初级认证权限
  [VERIFICATION_LEVEL.BASIC]: {
    level: VERIFICATION_LEVEL.BASIC,
    levelName: '初级认证',
    canDeposit: true,
    canWithdraw: true,
    canSpotTrade: true,
    canDeliveryContract: false,
    canPerpetualContract: false,
    requireDocuments: [
      // VERIFICATION_DOC_TYPE.ID_CARD  // 当前配置不需要上传证件
    ],
    description: '完成基础身份信息认证的用户'
  },
  // 高级认证权限
  [VERIFICATION_LEVEL.ADVANCED]: {
    level: VERIFICATION_LEVEL.ADVANCED,
    levelName: '高级认证',
    canDeposit: true,
    canWithdraw: true,
    canSpotTrade: true,
    canDeliveryContract: true,
    canPerpetualContract: true,
    requireDocuments: [
      VERIFICATION_DOC_TYPE.ID_CARD,
      VERIFICATION_DOC_TYPE.ID_CARD_HOLD,
      VERIFICATION_DOC_TYPE.INCOME_PROOF,
      VERIFICATION_DOC_TYPE.BANK_STATEMENT,
      VERIFICATION_DOC_TYPE.ADDRESS_PROOF
    ],
    description: '完成高级身份认证的用户，享有最高权限'
  }
}

// 认证审核记录
const generateVerificationAudit = (id, overrides = {}) => ({
  id: `audit_${id}`,
  userId: `user_${1000 + id}`,
  username: `user${1000 + id}`,
  email: `user${1000 + id}@example.com`,
  currentLevel: VERIFICATION_LEVEL.NONE,
  applyLevel: VERIFICATION_LEVEL.BASIC,
  status: VERIFICATION_STATUS.PENDING,
  submitTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  auditTime: null,
  auditor: null,
  rejectReason: null,
  documents: [],
  basicInfo: {
    realName: `张三${id}`,
    idNumber: `11010119900101${String(id).padStart(4, '0')}`,
    nationality: '中国',
    address: '北京市朝阳区建国路XX号',
    occupation: '软件工程师'
  },
  ...overrides
})

const buildAdvancedDocuments = (seed = 0) => {
  const now = Date.now()
  const baseTs = now - (seed + 1) * 60 * 60 * 1000
  return [
    {
      type: VERIFICATION_DOC_TYPE.ID_CARD,
      url: '/mock/id_card_front.jpg',
      uploadTime: new Date(baseTs).toISOString()
    },
    {
      type: VERIFICATION_DOC_TYPE.ID_CARD_HOLD,
      url: '/mock/id_card_hold.jpg',
      uploadTime: new Date(baseTs + 5 * 60 * 1000).toISOString()
    },
    {
      type: VERIFICATION_DOC_TYPE.INCOME_PROOF,
      url: '/mock/income_proof.pdf',
      uploadTime: new Date(baseTs + 10 * 60 * 1000).toISOString()
    }
  ]
}

const randomAuditLevelTransition = () => {
  const from = [VERIFICATION_LEVEL.NONE, VERIFICATION_LEVEL.BASIC][Math.floor(Math.random() * 2)]
  return {
    beforeLevel: from,
    afterLevel: from === VERIFICATION_LEVEL.NONE ? VERIFICATION_LEVEL.BASIC : VERIFICATION_LEVEL.ADVANCED
  }
}

export const verificationAuditList = [
  generateVerificationAudit(1, {
    username: 'alice_wang',
    email: 'alice@example.com',
    applyLevel: VERIFICATION_LEVEL.BASIC,
    status: VERIFICATION_STATUS.PENDING,
    basicInfo: {
      realName: '王小丽',
      idNumber: '110101199001011234',
      nationality: '中国',
      address: '北京市海淀区中关村大街1号',
      occupation: '产品经理'
    },
    documents: []
  }),
  generateVerificationAudit(2, {
    username: 'bob_li',
    email: 'bob@example.com',
    currentLevel: VERIFICATION_LEVEL.BASIC,
    applyLevel: VERIFICATION_LEVEL.ADVANCED,
    status: VERIFICATION_STATUS.PENDING,
    basicInfo: {
      realName: '李明',
      idNumber: '110101198505051234',
      nationality: '中国',
      address: '上海市浦东新区陆家嘴环路1000号',
      occupation: '投资顾问'
    },
    documents: buildAdvancedDocuments(2)
  }),
  generateVerificationAudit(3, {
    username: 'carol_zhang',
    email: 'carol@example.com',
    currentLevel: VERIFICATION_LEVEL.BASIC,
    applyLevel: VERIFICATION_LEVEL.ADVANCED,
    status: VERIFICATION_STATUS.APPROVED,
    submitTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    auditTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    auditor: 'admin_01',
    basicInfo: {
      realName: '张华',
      idNumber: '110101199203031234',
      nationality: '中国',
      address: '深圳市南山区科技园南区',
      occupation: '企业主'
    },
    documents: buildAdvancedDocuments(3)
  }),
  generateVerificationAudit(4, {
    username: 'david_chen',
    email: 'david@example.com',
    applyLevel: VERIFICATION_LEVEL.BASIC,
    status: VERIFICATION_STATUS.REJECTED,
    submitTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    auditTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    auditor: 'admin_02',
    rejectReason: '提供的身份证件照片不清晰，无法识别关键信息',
    basicInfo: {
      realName: '陈大卫',
      idNumber: '110101199510101234',
      nationality: '中国',
      address: '广州市天河区珠江新城',
      occupation: '销售经理'
    },
    documents: []
  }),
  generateVerificationAudit(5, {
    username: 'emma_liu',
    email: 'emma@example.com',
    applyLevel: VERIFICATION_LEVEL.BASIC,
    status: VERIFICATION_STATUS.RESUBMIT,
    submitTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    auditTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    auditor: 'admin_01',
    rejectReason: '需要补充身份证件的背面照片',
    basicInfo: {
      realName: '刘艾玛',
      idNumber: '110101199801011234',
      nationality: '中国',
      address: '杭州市西湖区文一西路',
      occupation: '设计师'
    },
    documents: []
  })
]

// 生成更多模拟数据
for (let i = 6; i <= 50; i++) {
  const levels = [VERIFICATION_LEVEL.BASIC, VERIFICATION_LEVEL.ADVANCED]
  const applyLevel = levels[Math.floor(Math.random() * levels.length)]
  const statuses = Object.values(VERIFICATION_STATUS)
  const status = statuses[Math.floor(Math.random() * statuses.length)]
  const submitTime = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
  
  verificationAuditList.push(generateVerificationAudit(i, {
    username: `user_${1000 + i}`,
    email: `user${1000 + i}@example.com`,
    currentLevel: applyLevel === VERIFICATION_LEVEL.ADVANCED ? VERIFICATION_LEVEL.BASIC : VERIFICATION_LEVEL.NONE,
    applyLevel: applyLevel,
    status: status,
    submitTime: submitTime,
    auditTime: status !== VERIFICATION_STATUS.PENDING ? new Date(new Date(submitTime).getTime() + 86400000).toISOString() : null,
    auditor: status !== VERIFICATION_STATUS.PENDING ? `admin_0${Math.floor(Math.random() * 3) + 1}` : null,
    basicInfo: {
      realName: `用户${i}`,
      idNumber: `11010119900101${String(i).padStart(4, '0')}`,
      nationality: '中国',
      address: '某省某市某区某街道',
      occupation: '自由职业'
    },
    documents: applyLevel === VERIFICATION_LEVEL.ADVANCED ? buildAdvancedDocuments(i) : []
  }))
}

export const getVerificationAudits = ({
  page,
  pageSize,
  searchKeyword,
  applyLevel,
  status,
  dateRange,
  allowedUserIds
}) => {
  let filteredAudits = [...verificationAuditList]
  if (allowedUserIds !== undefined) {
    const allowed = new Set(allowedUserIds)
    filteredAudits = filteredAudits.filter(audit => allowed.has(audit.userId))
  }

  if (searchKeyword && searchKeyword.trim()) {
    const keyword = searchKeyword.toLowerCase()
    filteredAudits = filteredAudits.filter(
      (audit) =>
        audit.username.toLowerCase().includes(keyword) ||
        audit.email.toLowerCase().includes(keyword) ||
        audit.basicInfo.realName.toLowerCase().includes(keyword) ||
        audit.userId.toLowerCase().includes(keyword)
    )
  }

  if (applyLevel && applyLevel !== 'all') {
    filteredAudits = filteredAudits.filter(audit => audit.applyLevel === applyLevel)
  }

  if (status && status !== 'all') {
    filteredAudits = filteredAudits.filter(audit => audit.status === status)
  }

  if (dateRange && dateRange.start && dateRange.end) {
    const start = new Date(dateRange.start).getTime()
    const end = new Date(dateRange.end).getTime()
    filteredAudits = filteredAudits.filter(audit => {
      const time = new Date(audit.submitTime).getTime()
      return time >= start && time <= end
    })
  }

  // 按提交时间倒序
  filteredAudits.sort((a, b) => new Date(b.submitTime) - new Date(a.submitTime))

  const total = filteredAudits.length
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const list = filteredAudits.slice(start, end)

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ list, total })
    }, 300)
  })
}

// 认证日志记录
const generateVerificationLog = (id, overrides = {}) => ({
  id: `log_${id}`,
  userId: `user_${1000 + id}`,
  username: `user${1000 + id}`,
  actionType: LOG_ACTION_TYPE.AUDIT_APPROVED,
  actionTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  operator: 'admin_01',
  beforeLevel: VERIFICATION_LEVEL.NONE,
  afterLevel: VERIFICATION_LEVEL.BASIC,
  description: '认证审核通过',
  ipAddress: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
  details: {},
  ...overrides
})

export const verificationLogList = [
  generateVerificationLog(1, {
    username: 'alice_wang',
    actionType: LOG_ACTION_TYPE.AUDIT_APPROVED,
    actionTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    operator: 'admin_01',
    beforeLevel: VERIFICATION_LEVEL.NONE,
    afterLevel: VERIFICATION_LEVEL.BASIC,
    description: '初级认证审核通过',
    details: {
      auditId: 'audit_1',
      processTime: '2小时15分钟'
    }
  }),
  generateVerificationLog(2, {
    username: 'bob_li',
    actionType: LOG_ACTION_TYPE.LEVEL_UPGRADE,
    actionTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    operator: 'admin_01',
    beforeLevel: VERIFICATION_LEVEL.BASIC,
    afterLevel: VERIFICATION_LEVEL.ADVANCED,
    description: '用户认证等级升级',
    details: {
      reason: '交易量达到高级认证要求'
    }
  }),
  generateVerificationLog(3, {
    username: 'carol_zhang',
    actionType: LOG_ACTION_TYPE.AUDIT_APPROVED,
    actionTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    operator: 'admin_02',
    beforeLevel: VERIFICATION_LEVEL.BASIC,
    afterLevel: VERIFICATION_LEVEL.ADVANCED,
    description: '高级认证审核通过',
    details: {
      auditId: 'audit_3',
      processTime: '1天3小时'
    }
  }),
  generateVerificationLog(4, {
    username: 'david_chen',
    actionType: LOG_ACTION_TYPE.AUDIT_REJECTED,
    actionTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    operator: 'admin_02',
    beforeLevel: VERIFICATION_LEVEL.NONE,
    afterLevel: VERIFICATION_LEVEL.BASIC,
    description: '认证审核被拒绝',
    details: {
      auditId: 'audit_4',
      reason: '提供的身份证件照片不清晰，无法识别关键信息'
    }
  }),
  generateVerificationLog(5, {
    username: 'emma_liu',
    actionType: LOG_ACTION_TYPE.AUDIT_RESUBMIT,
    actionTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    operator: 'admin_01',
    beforeLevel: VERIFICATION_LEVEL.NONE,
    afterLevel: VERIFICATION_LEVEL.BASIC,
    description: '要求补充材料',
    details: {
      auditId: 'audit_5',
      reason: '需要补充身份证件的背面照片'
    }
  }),
  generateVerificationLog(6, {
    actionType: LOG_ACTION_TYPE.CONFIG_UPDATE,
    actionTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    operator: 'admin_03',
    username: 'system',
    userId: 'system',
    beforeLevel: null,
    afterLevel: null,
    description: '更新认证配置规则',
    details: {
      changes: [
        { field: '初级认证提币限额', before: '5000 USDT', after: '10000 USDT' },
        { field: '高级认证需要手持身份证', before: '是', after: '否' }
      ]
    }
  }),
  generateVerificationLog(7, {
    username: 'frank_wu',
    actionType: LOG_ACTION_TYPE.LEVEL_DOWNGRADE,
    actionTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    operator: 'admin_03',
    beforeLevel: VERIFICATION_LEVEL.BASIC,
    afterLevel: VERIFICATION_LEVEL.NONE,
    description: '用户认证等级降级',
    details: {
      reason: '发现用户提供虚假信息'
    }
  }),
  generateVerificationLog(8, {
    username: 'grace_sun',
    actionType: LOG_ACTION_TYPE.AUDIT_APPROVED,
    actionTime: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    operator: 'admin_01',
    beforeLevel: VERIFICATION_LEVEL.NONE,
    afterLevel: VERIFICATION_LEVEL.BASIC,
    description: '初级认证审核通过',
    details: {
      auditId: 'audit_8',
      processTime: '3小时42分钟'
    }
  })
]

// 生成更多日志数据
for (let i = 9; i <= 60; i++) {
  const actionTypes = Object.values(LOG_ACTION_TYPE)
  const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)]
  let beforeLevel = null
  let afterLevel = null

  // 根据动作类型生成更真实的等级变化，避免出现同等级变更记录
  if (actionType === LOG_ACTION_TYPE.LEVEL_UPGRADE) {
    beforeLevel = [VERIFICATION_LEVEL.NONE, VERIFICATION_LEVEL.BASIC][Math.floor(Math.random() * 2)]
    afterLevel = beforeLevel === VERIFICATION_LEVEL.NONE ? VERIFICATION_LEVEL.BASIC : VERIFICATION_LEVEL.ADVANCED
  } else if (actionType === LOG_ACTION_TYPE.LEVEL_DOWNGRADE) {
    beforeLevel = [VERIFICATION_LEVEL.BASIC, VERIFICATION_LEVEL.ADVANCED][Math.floor(Math.random() * 2)]
    afterLevel = beforeLevel === VERIFICATION_LEVEL.ADVANCED ? VERIFICATION_LEVEL.BASIC : VERIFICATION_LEVEL.NONE
  } else if (actionType === LOG_ACTION_TYPE.AUDIT_APPROVED) {
    beforeLevel = [VERIFICATION_LEVEL.NONE, VERIFICATION_LEVEL.BASIC][Math.floor(Math.random() * 2)]
    afterLevel = beforeLevel === VERIFICATION_LEVEL.NONE ? VERIFICATION_LEVEL.BASIC : VERIFICATION_LEVEL.ADVANCED
  } else if (actionType === LOG_ACTION_TYPE.AUDIT_REJECTED || actionType === LOG_ACTION_TYPE.AUDIT_RESUBMIT) {
    const transition = randomAuditLevelTransition()
    beforeLevel = transition.beforeLevel
    afterLevel = transition.afterLevel
  }
  
  verificationLogList.push(generateVerificationLog(i, {
    username: `user_${1000 + i}`,
    actionType: actionType,
    actionTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    operator: `admin_0${Math.floor(Math.random() * 3) + 1}`,
    beforeLevel: beforeLevel,
    afterLevel: afterLevel,
    description: `操作描述 ${i}`,
    details: {}
  }))
}

export const getVerificationLogs = ({
  page,
  pageSize,
  searchKeyword,
  actionType,
  dateRange
}) => {
  let filteredLogs = [...verificationLogList]

  if (searchKeyword && searchKeyword.trim()) {
    const keyword = searchKeyword.toLowerCase()
    filteredLogs = filteredLogs.filter(
      (log) =>
        log.username.toLowerCase().includes(keyword) ||
        log.userId.toLowerCase().includes(keyword) ||
        log.operator.toLowerCase().includes(keyword) ||
        log.description.toLowerCase().includes(keyword)
    )
  }

  if (actionType && actionType !== 'all') {
    filteredLogs = filteredLogs.filter(log => log.actionType === actionType)
  }

  if (dateRange && dateRange !== 'all') {
    const now = Date.now()
    const ranges = {
      'today': 24 * 60 * 60 * 1000,
      'week': 7 * 24 * 60 * 60 * 1000,
      'month': 30 * 24 * 60 * 60 * 1000
    }
    const range = ranges[dateRange]
    if (range) {
      filteredLogs = filteredLogs.filter(log => {
        const logTime = new Date(log.actionTime).getTime()
        return now - logTime <= range
      })
    }
  }

  // 按时间倒序
  filteredLogs.sort((a, b) => new Date(b.actionTime) - new Date(a.actionTime))

  const total = filteredLogs.length
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const list = filteredLogs.slice(start, end)

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ list, total })
    }, 300)
  })
}
