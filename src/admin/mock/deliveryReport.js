import { 
  DELIVERY_RISK_LEVEL, 
  DELIVERY_POSITION_SIDE, 
  DELIVERY_USER_TYPE,
  DELIVERY_CYCLE_TYPE,
  DELIVERY_CONTRACT_STATUS,
  SUGGESTION_PRIORITY
} from '../constants/deliveryReport'
import { 
  DELIVERY_RULE_ACTION, 
  DELIVERY_RULE_STATUS 
} from '../constants/deliveryControl'

// 市场概览数据
export const deliveryMarketOverview = {
  totalVolume24h: 68500000,      // 24h总交易量 (USDT)
  totalPosition: 4250000,        // 总持仓 (USDT)
  totalUsers: 2850,              // 总用户数
  activeUsers24h: 1890,          // 24h活跃用户
  longPnl24h: 218600,            // 24h做多盈亏 (USDT)
  shortPnl24h: -61800,           // 24h做空盈亏 (USDT)
  platformPnl24h: 156800,        // 24h平台盈亏 (USDT)
  userPnl24h: -156800,           // 24h用户盈亏 (USDT)
  longShortRatio: 1.28,          // 多空比
  nearExpiryContracts: 3,        // 临近交割合约数
  todaySettlements: 2,           // 今日交割数
  riskLevel: DELIVERY_RISK_LEVEL.MEDIUM // 整体风险等级
}

// 各合约数据（按交割时间排序）
export const deliveryContractsData = [
  {
    symbol: 'BTC60S',
    name: 'BTC/USDT 60秒',
    baseSymbol: 'BTCUSDT',
    cycleType: DELIVERY_CYCLE_TYPE.SEC_60,
    expiryDate: '2026-03-09 14:31:00',
    daysToExpiry: 0,
    hoursToExpiry: 0,
    status: DELIVERY_CONTRACT_STATUS.TRADING,
    volume24h: 28500000,
    position: 1680000,
    longPosition: 980000,
    shortPosition: 700000,
    netPosition: 280000,
    longShortRatio: 1.40,
    activeUsers: 685,
    longPnl24h: 45200,
    shortPnl24h: 23300,
    platformPnl24h: 68500,
    userPnl24h: -68500,
    controlActive: true,
    riskLevel: DELIVERY_RISK_LEVEL.MEDIUM
  },
  {
    symbol: 'ETH120S',
    name: 'ETH/USDT 2分钟',
    baseSymbol: 'ETHUSDT',
    cycleType: DELIVERY_CYCLE_TYPE.SEC_120,
    expiryDate: '2026-03-09 14:32:00',
    daysToExpiry: 0,
    hoursToExpiry: 0,
    status: DELIVERY_CONTRACT_STATUS.TRADING,
    volume24h: 15800000,
    position: 880000,
    longPosition: 520000,
    shortPosition: 360000,
    netPosition: 160000,
    longShortRatio: 1.44,
    activeUsers: 428,
    longPnl24h: 28700,
    shortPnl24h: 13800,
    platformPnl24h: 42500,
    userPnl24h: -42500,
    controlActive: true,
    riskLevel: DELIVERY_RISK_LEVEL.HIGH
  },
  {
    symbol: 'SOL300S',
    name: 'SOL/USDT 5分钟',
    baseSymbol: 'SOLUSDT',
    cycleType: DELIVERY_CYCLE_TYPE.SEC_300,
    expiryDate: '2026-03-09 14:35:00',
    daysToExpiry: 0,
    hoursToExpiry: 0,
    status: DELIVERY_CONTRACT_STATUS.TRADING,
    volume24h: 8900000,
    position: 620000,
    longPosition: 240000,
    shortPosition: 380000,
    netPosition: -140000,
    longShortRatio: 0.63,
    activeUsers: 325,
    longPnl24h: 12000,
    shortPnl24h: -50000,
    platformPnl24h: -38000,
    userPnl24h: 38000,
    controlActive: true,
    riskLevel: DELIVERY_RISK_LEVEL.HIGH
  },
  {
    symbol: 'XRP180S',
    name: 'XRP/USDT 3分钟',
    baseSymbol: 'XRPUSDT',
    cycleType: DELIVERY_CYCLE_TYPE.SEC_180,
    expiryDate: '2026-03-09 14:33:00',
    daysToExpiry: 0,
    hoursToExpiry: 0,
    status: DELIVERY_CONTRACT_STATUS.TRADING,
    volume24h: 6800000,
    position: 485000,
    longPosition: 280000,
    shortPosition: 205000,
    netPosition: 75000,
    longShortRatio: 1.37,
    activeUsers: 268,
    longPnl24h: 16400,
    shortPnl24h: 12100,
    platformPnl24h: 28500,
    userPnl24h: -28500,
    controlActive: false,
    riskLevel: DELIVERY_RISK_LEVEL.LOW
  },
  {
    symbol: 'DOGE30S',
    name: 'DOGE/USDT 30秒',
    baseSymbol: 'DOGEUSDT',
    cycleType: DELIVERY_CYCLE_TYPE.SEC_30,
    expiryDate: '2026-03-09 14:30:30',
    daysToExpiry: 0,
    hoursToExpiry: 0,
    status: DELIVERY_CONTRACT_STATUS.TRADING,
    volume24h: 4200000,
    position: 325000,
    longPosition: 165000,
    shortPosition: 160000,
    netPosition: 5000,
    longShortRatio: 1.03,
    activeUsers: 184,
    longPnl24h: 9800,
    shortPnl24h: 8400,
    platformPnl24h: 18200,
    userPnl24h: -18200,
    controlActive: false,
    riskLevel: DELIVERY_RISK_LEVEL.LOW
  },
  {
    symbol: 'ARB600S',
    name: 'ARB/USDT 10分钟',
    baseSymbol: 'ARBUSDT',
    cycleType: DELIVERY_CYCLE_TYPE.SEC_600,
    expiryDate: '2026-03-09 14:40:00',
    daysToExpiry: 0,
    hoursToExpiry: 0,
    status: DELIVERY_CONTRACT_STATUS.TRADING,
    volume24h: 3800000,
    position: 260000,
    longPosition: 195000,
    shortPosition: 65000,
    netPosition: 130000,
    longShortRatio: 3.00,
    activeUsers: 158,
    longPnl24h: -13400,
    shortPnl24h: -34600,
    platformPnl24h: -48000,
    userPnl24h: 48000,
    controlActive: true,
    riskLevel: DELIVERY_RISK_LEVEL.CRITICAL
  }
]

// 持仓分布数据（按到期时间）
export const deliveryExpiryDistribution = [
  { 
    range: '已过期',
    longCount: 0,
    shortCount: 0,
    longVolume: 0,
    shortVolume: 0
  },
  { 
    range: '1分钟内',
    longCount: 385,
    shortCount: 298,
    longVolume: 980000,
    shortVolume: 700000
  },
  { 
    range: '1-3分钟',
    longCount: 425,
    shortCount: 348,
    longVolume: 800000,
    shortVolume: 565000
  },
  { 
    range: '3-5分钟',
    longCount: 268,
    shortCount: 185,
    longVolume: 520000,
    shortVolume: 360000
  },
  { 
    range: '5-10分钟',
    longCount: 325,
    shortCount: 268,
    longVolume: 620000,
    shortVolume: 485000
  },
  { 
    range: '10-30分钟',
    longCount: 285,
    shortCount: 225,
    longVolume: 455000,
    shortVolume: 325000
  }
]

// 用户盈亏分布
export const deliveryPnlDistribution = [
  { range: '亏损>50%', count: 98, percentage: 5.2, totalPnl: -142000 },
  { range: '亏损20-50%', count: 178, percentage: 9.4, totalPnl: -98500 },
  { range: '亏损5-20%', count: 328, percentage: 17.4, totalPnl: -48000 },
  { range: '盈亏±5%', count: 785, percentage: 41.5, totalPnl: 4200 },
  { range: '盈利5-20%', count: 348, percentage: 18.4, totalPnl: 52000 },
  { range: '盈利20-50%', count: 118, percentage: 6.2, totalPnl: 78500 },
  { range: '盈利>50%', count: 35, percentage: 1.9, totalPnl: 154700 }
]

// 大户监控列表
export const deliveryWhalesList = [
  {
    userId: 'user_whale_d001',
    username: 'whale_delivery_01',
    type: DELIVERY_USER_TYPE.WHALE,
    totalPosition: 185000,
    longPosition: 125000,
    shortPosition: 60000,
    pnl24h: 12800,
    pnlRate: 6.9,
    contracts: ['BTC60S', 'ETH120S'],
    nearExpiryPositions: 85000,
    riskLevel: DELIVERY_RISK_LEVEL.HIGH
  },
  {
    userId: 'user_whale_d002',
    username: 'whale_delivery_02',
    type: DELIVERY_USER_TYPE.WHALE,
    totalPosition: 225000,
    longPosition: 225000,
    shortPosition: 0,
    pnl24h: -18500,
    pnlRate: -8.2,
    contracts: ['ARB600S', 'SOL300S'],
    nearExpiryPositions: 140000,
    riskLevel: DELIVERY_RISK_LEVEL.CRITICAL
  },
  {
    userId: 'user_hf_d001',
    username: 'highfreq_delivery',
    type: DELIVERY_USER_TYPE.HIGH_FREQ,
    totalPosition: 148000,
    longPosition: 85000,
    shortPosition: 63000,
    pnl24h: 8500,
    pnlRate: 5.7,
    contracts: ['BTC60S', 'ETH120S', 'XRP180S'],
    nearExpiryPositions: 45000,
    riskLevel: DELIVERY_RISK_LEVEL.MEDIUM
  },
  {
    userId: 'user_active_d001',
    username: 'active_trader_d',
    type: DELIVERY_USER_TYPE.ACTIVE,
    totalPosition: 92000,
    longPosition: 48000,
    shortPosition: 44000,
    pnl24h: 3200,
    pnlRate: 3.5,
    contracts: ['ETH120S', 'DOGE30S'],
    nearExpiryPositions: 28000,
    riskLevel: DELIVERY_RISK_LEVEL.MEDIUM
  },
  {
    userId: 'user_whale_d003',
    username: 'whale_delivery_03',
    type: DELIVERY_USER_TYPE.WHALE,
    totalPosition: 168000,
    longPosition: 48000,
    shortPosition: 120000,
    pnl24h: 15800,
    pnlRate: 9.4,
    contracts: ['SOL300S', 'BTC60S'],
    nearExpiryPositions: 0,
    riskLevel: DELIVERY_RISK_LEVEL.HIGH
  }
]

// 交割风险预警
export const deliveryRiskAlerts = [
  {
    id: 'alert_001',
    priority: SUGGESTION_PRIORITY.URGENT,
    contract: 'ARB600S',
    type: '极端多头持仓',
    description: 'ARB600S合约多空比3.00，距离交割仅10分钟，存在极高交割风险',
    metric: '多空比: 3.00',
    threshold: '正常范围: 0.8-1.5',
    impact: '预计交割亏损: $48,000',
    timestamp: '2026-03-09 14:30:00',
    riskLevel: DELIVERY_RISK_LEVEL.CRITICAL
  },
  {
    id: 'alert_002',
    priority: SUGGESTION_PRIORITY.HIGH,
    contract: 'ETH120S',
    type: '临近交割高持仓',
    description: 'ETH120S合约2分钟内交割，当前持仓$880,000，建议启动交割预控制',
    metric: '持仓量: $880,000',
    threshold: '预警阈值: $500,000',
    impact: '潜在风险: $42,500',
    timestamp: '2026-03-09 14:15:00',
    riskLevel: DELIVERY_RISK_LEVEL.HIGH
  },
  {
    id: 'alert_003',
    priority: SUGGESTION_PRIORITY.HIGH,
    contract: 'SOL300S',
    type: '空头偏重',
    description: 'SOL300S合约空头持仓占比62%，用户整体盈利$38,000，平台亏损',
    metric: '多空比: 0.63',
    threshold: '正常范围: 0.8-1.5',
    impact: '平台亏损: $38,000',
    timestamp: '2026-03-09 13:50:00',
    riskLevel: DELIVERY_RISK_LEVEL.HIGH
  },
  {
    id: 'alert_004',
    priority: SUGGESTION_PRIORITY.MEDIUM,
    contract: 'BTC60S',
    type: '大户持仓集中',
    description: 'BTC60S合约大户持仓集中度较高，建议加强监控',
    metric: '大户持仓: $980,000',
    threshold: '预警阈值: $800,000',
    impact: '风险敞口: $1,680,000',
    timestamp: '2026-03-09 13:20:00',
    riskLevel: DELIVERY_RISK_LEVEL.MEDIUM
  }
]

// 交割历史统计（近30天）
export const deliveryHistoryStats = {
  totalSettlements: 45,
  avgPlatformPnl: 125000,
  totalVolume: 1850000000,
  successRate: 95.6,
  settlementsByType: [
    { type: DELIVERY_CYCLE_TYPE.SEC_30, count: 580, avgPnl: 1200 },
    { type: DELIVERY_CYCLE_TYPE.SEC_60, count: 480, avgPnl: 1850 },
    { type: DELIVERY_CYCLE_TYPE.SEC_120, count: 420, avgPnl: 2800 },
    { type: DELIVERY_CYCLE_TYPE.SEC_180, count: 380, avgPnl: 3500 },
    { type: DELIVERY_CYCLE_TYPE.SEC_300, count: 320, avgPnl: 5200 },
    { type: DELIVERY_CYCLE_TYPE.SEC_600, count: 280, avgPnl: 8500 },
    { type: DELIVERY_CYCLE_TYPE.SEC_900, count: 240, avgPnl: 12000 },
    { type: DELIVERY_CYCLE_TYPE.SEC_1800, count: 180, avgPnl: 18000 }
  ],
  topProfitableContracts: [
    { contract: 'BTC60S', settlementPnl: 2850, settlementDate: '2026-03-09 14:00:00' },
    { contract: 'ETH120S', settlementPnl: 2150, settlementDate: '2026-03-09 13:58:00' },
    { contract: 'SOL300S', settlementPnl: 1850, settlementDate: '2026-03-09 13:55:00' }
  ],
  topLossContracts: [
    { contract: 'ARB600S', settlementPnl: -1250, settlementDate: '2026-03-09 13:50:00' },
    { contract: 'DOGE30S', settlementPnl: -850, settlementDate: '2026-03-09 13:29:30' },
    { contract: 'XRP180S', settlementPnl: -650, settlementDate: '2026-03-09 13:30:00' }
  ]
}

// 趋势数据（最近7天）
export const deliveryPositionTrendData = [
  { date: '03-03', longPosition: 3250000, shortPosition: 2580000, netPosition: 670000 },
  { date: '03-04', longPosition: 3420000, shortPosition: 2680000, netPosition: 740000 },
  { date: '03-05', longPosition: 3580000, shortPosition: 2750000, netPosition: 830000 },
  { date: '03-06', longPosition: 3680000, shortPosition: 2820000, netPosition: 860000 },
  { date: '03-07', longPosition: 3850000, shortPosition: 2920000, netPosition: 930000 },
  { date: '03-08', longPosition: 4120000, shortPosition: 3150000, netPosition: 970000 },
  { date: '03-09', longPosition: 4250000, shortPosition: 3320000, netPosition: 930000 }
]

export const deliveryPnlTrendData = [
  { date: '03-03', platformPnl: 128000, userPnl: -128000 },
  { date: '03-04', platformPnl: 145000, userPnl: -145000 },
  { date: '03-05', platformPnl: 98000, userPnl: -98000 },
  { date: '03-06', platformPnl: 165000, userPnl: -165000 },
  { date: '03-07', platformPnl: 185000, userPnl: -185000 },
  { date: '03-08', platformPnl: 142000, userPnl: -142000 },
  { date: '03-09', platformPnl: 156800, userPnl: -156800 }
]

export const deliveryVolumeTrendData = [
  { date: '03-03', volume: 52000000, contracts: 8 },
  { date: '03-04', volume: 58000000, contracts: 9 },
  { date: '03-05', volume: 48000000, contracts: 8 },
  { date: '03-06', volume: 62000000, contracts: 10 },
  { date: '03-07', volume: 72000000, contracts: 11 },
  { date: '03-08', volume: 65000000, contracts: 9 },
  { date: '03-09', volume: 68500000, contracts: 8 }
]

// 自动化规则效果统计
export const deliveryAutoRuleStats = {
  totalRules: 6,              // 总规则数
  activeRules: 5,             // 启用中
  totalTriggers24h: 128,      // 24h触发次数
  successTriggers: 125,       // 成功触发
  failedTriggers: 3,          // 失败触发
  totalImpact24h: 185000,     // 24h总影响金额（平台盈利增加）
  avgImpactPerTrigger: 1445,  // 平均每次影响
  actionsByType: [
    { action: DELIVERY_RULE_ACTION.FORCE_WIN, count: 28, impact: 58000, avgResponseTime: 0.12 },
    { action: DELIVERY_RULE_ACTION.FORCE_LOSS, count: 45, impact: 92000, avgResponseTime: 0.08 },
    { action: DELIVERY_RULE_ACTION.PRICE_ADJUST, count: 22, impact: 28000, avgResponseTime: 0.05 },
    { action: DELIVERY_RULE_ACTION.PROFIT_CONTROL, count: 18, impact: 15000, avgResponseTime: 0.15 },
    { action: DELIVERY_RULE_ACTION.REJECT_ORDER, count: 10, impact: -5000, avgResponseTime: 0.02 },
    { action: DELIVERY_RULE_ACTION.LIMIT_POSITION, count: 5, impact: -3000, avgResponseTime: 0.03 }
  ],
  rulePerformance: [
    {
      ruleId: 'RULE-001',
      ruleName: '高频交易用户盈利控制',
      triggers: 35,
      successRate: 97.1,
      totalImpact: 68000,
      avgImpact: 1943,
      lastTrigger: '2026-03-09 14:28:35'
    },
    {
      ruleId: 'RULE-002',
      ruleName: '大户持仓风险预警',
      triggers: 28,
      successRate: 100,
      totalImpact: 52000,
      avgImpact: 1857,
      lastTrigger: '2026-03-09 14:25:12'
    },
    {
      ruleId: 'RULE-003',
      ruleName: '新用户前3笔强制亏损',
      triggers: 22,
      successRate: 95.5,
      totalImpact: 28000,
      avgImpact: 1273,
      lastTrigger: '2026-03-09 14:22:18'
    },
    {
      ruleId: 'RULE-004',
      ruleName: '连胜用户自动干预',
      triggers: 18,
      successRate: 94.4,
      totalImpact: 22000,
      avgImpact: 1222,
      lastTrigger: '2026-03-09 14:20:45'
    },
    {
      ruleId: 'RULE-005',
      ruleName: '超大订单拒单保护',
      triggers: 15,
      successRate: 100,
      totalImpact: 10000,
      avgImpact: 667,
      lastTrigger: '2026-03-09 14:18:30'
    }
  ]
}

// 自动化规则前后对比
export const deliveryAutoRuleEffectComparison = [
  {
    contract: 'BTC60S',
    beforeRules: {
      platformPnl: 45000,
      userPnl: -45000,
      longShortRatio: 1.65,
      avgProfitPerTrade: -85, // 用户平均每笔亏损 85 USDT
      riskLevel: DELIVERY_RISK_LEVEL.HIGH
    },
    afterRules: {
      platformPnl: 68500,
      userPnl: -68500,
      longShortRatio: 1.40,
      avgProfitPerTrade: -120, // 用户平均每笔亏损 120 USDT
      riskLevel: DELIVERY_RISK_LEVEL.MEDIUM
    },
    improvement: 23500,
    rulesApplied: ['RULE-001', 'RULE-002', 'RULE-004']
  },
  {
    contract: 'ETH120S',
    beforeRules: {
      platformPnl: 28000,
      userPnl: -28000,
      longShortRatio: 1.68,
      avgProfitPerTrade: -65, // 用户平均每笔亏损 65 USDT
      riskLevel: DELIVERY_RISK_LEVEL.HIGH
    },
    afterRules: {
      platformPnl: 42500,
      userPnl: -42500,
      longShortRatio: 1.44,
      avgProfitPerTrade: -95, // 用户平均每笔亏损 95 USDT
      riskLevel: DELIVERY_RISK_LEVEL.MEDIUM
    },
    improvement: 14500,
    rulesApplied: ['RULE-001', 'RULE-003']
  },
  {
    contract: 'SOL300S',
    beforeRules: {
      platformPnl: 32000,
      userPnl: -32000,
      longShortRatio: 0.72,
      avgProfitPerTrade: -55, // 用户平均每笔亏损 55 USDT
      riskLevel: DELIVERY_RISK_LEVEL.MEDIUM
    },
    afterRules: {
      platformPnl: 45800,
      userPnl: -45800,
      longShortRatio: 0.85,
      avgProfitPerTrade: -78, // 用户平均每笔亏损 78 USDT
      riskLevel: DELIVERY_RISK_LEVEL.MEDIUM
    },
    improvement: 13800,
    rulesApplied: ['RULE-001', 'RULE-004', 'RULE-005']
  }
]
