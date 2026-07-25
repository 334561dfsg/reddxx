import { VIP_LEVEL_STATUS } from '../constants/vip.js'

export const vipLevels = [
  {
    id: 'vip_0',
    level: 0,
    name: '普通用户',
    displayName: '普通用户',
    iconUrl: '',
    status: VIP_LEVEL_STATUS.ENABLED,
    benefits: ['基础交易功能', '标准手续费'],
    description: '平台所有新注册用户默认等级',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'vip_1',
    level: 1,
    name: 'VIP1',
    displayName: '青铜会员',
    iconUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23D97706"%3E%3Cpath d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/%3E%3C/svg%3E',
    status: VIP_LEVEL_STATUS.ENABLED,
    benefits: ['95折手续费', '优先客服', '基础数据分析'],
    description: '入门级VIP会员，享受基础特权',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z'
  },
  {
    id: 'vip_2',
    level: 2,
    name: 'VIP2',
    displayName: '白银会员',
    iconUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2393C5FD"%3E%3Cpath d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/%3E%3C/svg%3E',
    status: VIP_LEVEL_STATUS.ENABLED,
    benefits: ['9折手续费', '专属客服', '高级数据分析', '每月空投奖励'],
    description: '白银级VIP会员，享受更多特权',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z'
  },
  {
    id: 'vip_3',
    level: 3,
    name: 'VIP3',
    displayName: '黄金会员',
    iconUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FCD34D"%3E%3Cpath d="M12 2L4 9h4v11h8V9h4l-8-7z"/%3E%3C/svg%3E',
    status: VIP_LEVEL_STATUS.ENABLED,
    benefits: ['85折手续费', '专属客服', '专业数据分析', '每月空投奖励'],
    description: '黄金级VIP会员，享受高级特权',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z'
  },
  {
    id: 'vip_4',
    level: 4,
    name: 'VIP4',
    displayName: '铂金会员',
    iconUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23A78BFA"%3E%3Cpath d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/%3E%3C/svg%3E',
    status: VIP_LEVEL_STATUS.ENABLED,
    benefits: ['8折手续费', '一对一客服', '全方位数据分析', '每周空投奖励', '优先提现'],
    description: '铂金级VIP会员，尊享顶级特权',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z'
  },
  {
    id: 'vip_5',
    level: 5,
    name: 'VIP5',
    displayName: '钻石会员',
    iconUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2310B981"%3E%3Cpath d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/%3E%3C/svg%3E',
    status: VIP_LEVEL_STATUS.ENABLED,
    benefits: ['75折手续费', '专属客户经理', '定制化服务', '每日空投奖励', '优先提现', '线下活动邀请'],
    description: '钻石级VIP会员，至尊无上特权',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z'
  }
]

export const getVipLevelById = (id) => {
  return vipLevels.find(level => level.id === id)
}

export const getVipLevelByLevel = (level) => {
  return vipLevels.find(vip => vip.level === level)
}

export const getActiveVipLevels = () => {
  return vipLevels.filter(vip => vip.status === VIP_LEVEL_STATUS.ENABLED)
}

// VIP升级日志
export const vipUpgradeLogs = [
  {
    id: 'vip_upgrade_001',
    userId: 'user_003',
    username: 'carol_whale',
    fromVipLevel: 3,
    fromVipName: 'VIP3',
    toVipLevel: 4,
    toVipName: 'VIP4',
    upgradeReason: 'recharge',
    rechargeAmount: 500000,
    remarks: '充值 500,000 USDT，自动升级',
    createdAt: '2026-03-09T08:45:00Z'
  },
  {
    id: 'vip_upgrade_002',
    userId: 'user_006',
    username: 'frank_vip',
    fromVipLevel: 0,
    fromVipName: '普通用户',
    toVipLevel: 1,
    toVipName: 'VIP1',
    upgradeReason: 'manual',
    rechargeAmount: null,
    remarks: '运营手动开通 VIP1',
    createdAt: '2026-03-07T15:20:00Z'
  },
  {
    id: 'vip_upgrade_003',
    userId: 'user_007',
    username: 'grace_investor',
    fromVipLevel: 2,
    fromVipName: 'VIP2',
    toVipLevel: 3,
    toVipName: 'VIP3',
    upgradeReason: 'recharge',
    rechargeAmount: 400000,
    remarks: '推荐新用户奖励活动，满足升级条件',
    createdAt: '2026-03-07T10:00:00Z'
  },
  {
    id: 'vip_upgrade_004',
    userId: 'user_003',
    username: 'carol_whale',
    fromVipLevel: 2,
    fromVipName: 'VIP2',
    toVipLevel: 3,
    toVipName: 'VIP3',
    upgradeReason: 'recharge',
    rechargeAmount: 500000,
    remarks: '充值 500,000 USDT，自动升级',
    createdAt: '2026-03-06T18:30:00Z'
  },
  {
    id: 'vip_upgrade_005',
    userId: 'user_004',
    username: 'david_pro',
    fromVipLevel: 1,
    fromVipName: 'VIP1',
    toVipLevel: 2,
    toVipName: 'VIP2',
    upgradeReason: 'manual',
    rechargeAmount: null,
    remarks: '运营手动调整等级',
    createdAt: '2026-03-08T14:30:00Z'
  },
  {
    id: 'vip_upgrade_006',
    userId: 'user_008',
    username: 'henry_whale',
    fromVipLevel: 3,
    fromVipName: 'VIP3',
    toVipLevel: 4,
    toVipName: 'VIP4',
    upgradeReason: 'recharge',
    rechargeAmount: 1000000,
    remarks: '充值 1,000,000 USDT，自动升级',
    createdAt: '2026-03-05T14:20:00Z'
  },
  {
    id: 'vip_upgrade_007',
    userId: 'user_009',
    username: 'ivy_investor',
    fromVipLevel: 0,
    fromVipName: '普通用户',
    toVipLevel: 1,
    toVipName: 'VIP1',
    upgradeReason: 'manual',
    rechargeAmount: null,
    remarks: '活动资格开通 VIP1',
    createdAt: '2026-03-04T09:15:00Z'
  },
  {
    id: 'vip_upgrade_008',
    userId: 'user_010',
    username: 'jack_pro',
    fromVipLevel: 4,
    fromVipName: 'VIP4',
    toVipLevel: 5,
    toVipName: 'VIP5',
    upgradeReason: 'recharge',
    rechargeAmount: 2000000,
    remarks: '充值 2,000,000 USDT，自动升级',
    createdAt: '2026-03-03T16:40:00Z'
  },
  {
    id: 'vip_upgrade_009',
    userId: 'user_011',
    username: 'kate_trader',
    fromVipLevel: 1,
    fromVipName: 'VIP1',
    toVipLevel: 2,
    toVipName: 'VIP2',
    upgradeReason: 'recharge',
    rechargeAmount: 300000,
    remarks: '充值 300,000 USDT，自动升级',
    createdAt: '2026-03-02T11:20:00Z'
  },
  {
    id: 'vip_upgrade_010',
    userId: 'user_001',
    username: 'alice_trader',
    fromVipLevel: 0,
    fromVipName: '普通用户',
    toVipLevel: 1,
    toVipName: 'VIP1',
    upgradeReason: 'recharge',
    rechargeAmount: 150000,
    remarks: '首笔充值达标，自动升级 VIP1',
    createdAt: '2026-03-01T08:00:00Z'
  }
]

// 生成更多模拟日志
for (let i = 11; i <= 50; i++) {
  const fromLevel = Math.floor(Math.random() * 5)
  const toLevel = fromLevel + 1
  const reasons = ['recharge', 'manual']
  const reason = reasons[Math.floor(Math.random() * reasons.length)]

  vipUpgradeLogs.push({
    id: `vip_upgrade_${String(i).padStart(3, '0')}`,
    userId: `user_${String(100 + i).padStart(3, '0')}`,
    username: `user_${i}_trader`,
    fromVipLevel: fromLevel,
    fromVipName: fromLevel === 0 ? '普通用户' : `VIP${fromLevel}`,
    toVipLevel: toLevel,
    toVipName: `VIP${toLevel}`,
    upgradeReason: reason,
    rechargeAmount: reason === 'recharge' ? (Math.floor(Math.random() * 10) + 1) * 100000 : null,
    remarks: reason === 'recharge' ? '大额充值自动升级' : '运营手动调整等级',
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
  })
}

export const getVipUpgradeLogs = ({ 
  page, 
  pageSize, 
  searchKeyword, 
  upgradeReason, 
  fromVipLevel, 
  toVipLevel,
  dateRange 
}) => {
  let filteredLogs = [...vipUpgradeLogs]

  if (searchKeyword && searchKeyword.trim()) {
    const keyword = searchKeyword.toLowerCase()
    filteredLogs = filteredLogs.filter(
      (log) =>
        log.username.toLowerCase().includes(keyword) ||
        log.userId.toLowerCase().includes(keyword) ||
        (log.remarks && log.remarks.toLowerCase().includes(keyword))
    )
  }

  if (upgradeReason && upgradeReason !== 'all') {
    filteredLogs = filteredLogs.filter(log => log.upgradeReason === upgradeReason)
  }

  if (fromVipLevel !== undefined && fromVipLevel !== 'all') {
    filteredLogs = filteredLogs.filter(log => log.fromVipLevel === Number(fromVipLevel))
  }

  if (toVipLevel !== undefined && toVipLevel !== 'all') {
    filteredLogs = filteredLogs.filter(log => log.toVipLevel === Number(toVipLevel))
  }

  if (dateRange && dateRange.start && dateRange.end) {
    const start = new Date(dateRange.start).getTime()
    const end = new Date(dateRange.end).getTime()
    filteredLogs = filteredLogs.filter(log => {
      const time = new Date(log.createdAt).getTime()
      return time >= start && time <= end
    })
  }

  // 按时间倒序
  filteredLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

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
