<script setup>
import { ref, computed, watch } from 'vue'
import { 
  REPORT_TIME_RANGE, 
  REPORT_TIME_RANGE_OPTIONS, 
  RISK_LEVEL_CONFIG,
  USER_TYPE_CONFIG,
  RISK_ASSESSMENT_CRITERIA
} from '../../../admin/constants/perpetualReport'
import {
  marketOverviewData,
  contractsData,
  leverageDistribution,
  pnlDistribution,
  whalesList,
  positionTrendData,
  pnlTrendData,
  volumeTrendData,
  riskAlerts,
  actionSuggestions
} from '../../../admin/mock/perpetualReport'
import {
  createPerpetualControlContractsMock,
} from '../../../admin/mock/perpetualControl'

// 时间范围
const timeRange = ref(REPORT_TIME_RANGE.TODAY)
const customDateRange = ref({ start: '', end: '' })

// 合约选择
const selectedContract = ref('ALL') // ALL 或具体合约symbol

// 当前激活的标签
const activeTab = ref('overview') // overview, position, pnl, risk

// 市场概览数据
const overview = ref(marketOverviewData)
const contracts = ref(contractsData)
const controlContracts = ref(createPerpetualControlContractsMock())

const contractOptions = computed(() => {
  const options = [{ value: 'ALL', label: '全部合约' }]
  const seen = new Set()

  for (const c of contractsData) {
    seen.add(c.symbol)
    options.push({ value: c.symbol, label: c.name })
  }

  for (const c of controlContracts.value) {
    if (seen.has(c.symbol)) continue
    seen.add(c.symbol)
    options.push({ value: c.symbol, label: c.alias || c.symbol })
  }

  return options
})

const controlContractBySymbol = computed(() => {
  const map = new Map()
  for (const contract of controlContracts.value) {
    map.set(contract.symbol, contract)
  }
  return map
})

// 根据选择的合约筛选数据
const filteredContracts = computed(() => {
  if (selectedContract.value === 'ALL') {
    return contracts.value
  }
  return contracts.value.filter(c => c.symbol === selectedContract.value)
})

const filteredContractsWithControl = computed(() => {
  return filteredContracts.value.map((contract) => {
    const controlContract = controlContractBySymbol.value.get(contract.symbol) || null
    const enabledRules = controlContract ? (controlContract.rules || []).filter((r) => r.enabled).length : 0
    const ruleCount = controlContract ? (controlContract.rules || []).length : 0
    return {
      ...contract,
      controlContract,
      controlConfigured: Boolean(controlContract),
      controlRunning: controlContract?.status === 'running',
      controlPaused: controlContract?.status === 'paused',
      controlAutoTriggerEnabled: Boolean(controlContract?.config?.autoTriggerEnabled),
      controlEnabledRules: enabledRules,
      controlRuleCount: ruleCount
    }
  })
})

// 筛选后的汇总数据
const filteredOverview = computed(() => {
  if (selectedContract.value === 'ALL') {
    return overview.value
  }
  
  const contract = contracts.value.find(c => c.symbol === selectedContract.value)
  if (!contract) return overview.value
  
  return {
    totalVolume24h: contract.volume24h,
    totalPosition: contract.position,
    totalUsers: overview.value.totalUsers, // 这个保持全局
    activeUsers24h: contract.activeUsers,
    platformPnl24h: contract.platformPnl24h,
    userPnl24h: contract.userPnl24h,
    longShortRatio: contract.longShortRatio,
    avgLeverage: contract.avgLeverage,
    riskLevel: contract.riskLevel
  }
})

// 筛选后的操作建议
const filteredActionSuggestions = computed(() => {
  if (selectedContract.value === 'ALL') {
    return actionSuggestions
  }
  return actionSuggestions.filter(s => s.contract === selectedContract.value)
})

// 筛选后的风险预警
const filteredRiskAlerts = computed(() => {
  if (selectedContract.value === 'ALL') {
    return riskAlerts
  }
  return riskAlerts.filter(a => a.contract === selectedContract.value)
})

// 筛选后的大户列表
const filteredWhalesList = computed(() => {
  if (selectedContract.value === 'ALL') {
    return whalesList
  }
  return whalesList.filter(w => w.contracts.includes(selectedContract.value))
})

// 风险等级帮助模态框
const showRiskHelpModal = ref(false)
const selectedRiskLevel = ref('LOW') // LOW, MEDIUM, HIGH, CRITICAL

// 操作建议展开/收起
const showAllSuggestions = ref(false)
const displayedActionSuggestions = computed(() => {
  if (showAllSuggestions.value || filteredActionSuggestions.value.length <= 3) {
    return filteredActionSuggestions.value
  }
  return filteredActionSuggestions.value.slice(0, 3)
})

// 风险预警展开/收起
const showAllRiskAlerts = ref(false)
const displayedRiskAlerts = computed(() => {
  if (showAllRiskAlerts.value || filteredRiskAlerts.value.length <= 5) {
    return filteredRiskAlerts.value
  }
  return filteredRiskAlerts.value.slice(0, 5)
})

// 大户监控分页
const whalesCurrentPage = ref(1)
const whalesPageSize = ref(10)
const paginatedWhalesList = computed(() => {
  const start = (whalesCurrentPage.value - 1) * whalesPageSize.value
  const end = start + whalesPageSize.value
  return filteredWhalesList.value.slice(start, end)
})
const whalesTotalPages = computed(() => {
  return Math.ceil(filteredWhalesList.value.length / whalesPageSize.value)
})
// 计算显示的页码（当页数较多时只显示部分）
const whalesPageNumbers = computed(() => {
  const total = whalesTotalPages.value
  const current = whalesCurrentPage.value
  const pages = []
  
  if (total <= 7) {
    // 页数少于7页，全部显示
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // 页数较多，显示首页、当前页前后2页、末页
    pages.push(1)
    
    if (current > 3) {
      pages.push('...')
    }
    
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i)
    }
    
    if (current < total - 2) {
      pages.push('...')
    }
    
    pages.push(total)
  }
  
  return pages
})
// 监听合约切换，重置页码
const resetWhalesPage = () => {
  whalesCurrentPage.value = 1
}

const contractsCurrentPage = ref(1)
const contractsPageSize = ref(10)
const contractsTotalPages = computed(() => {
  const total = Math.ceil(filteredContractsWithControl.value.length / contractsPageSize.value)
  return total > 0 ? total : 1
})
const paginatedContractsWithControl = computed(() => {
  const start = (contractsCurrentPage.value - 1) * contractsPageSize.value
  const end = start + contractsPageSize.value
  return filteredContractsWithControl.value.slice(start, end)
})
const contractsPageNumbers = computed(() => {
  const total = contractsTotalPages.value
  const current = contractsCurrentPage.value
  const pages = []

  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    pages.push(1)

    if (current > 3) {
      pages.push('...')
    }

    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i)
    }

    if (current < total - 2) {
      pages.push('...')
    }

    pages.push(total)
  }

  return pages
})

// 格式化金额
const formatAmount = (value) => {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`
  } else if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toFixed(0)
}

// 格式化金额（带符号和货币）
const formatCurrency = (value) => {
  const sign = value >= 0 ? '+' : ''
  return `${sign}$${formatAmount(value)}`
}

// 格式化百分比
const formatPercent = (value) => {
  return `${value.toFixed(2)}%`
}

// 标签配置
const tabs = [
  { id: 'overview', name: '市场概览', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'position', name: '持仓分析', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'pnl', name: '盈亏分析', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'risk', name: '风险监控', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' }
]

const reportModuleKeyPoints = {
  filter: [
    '先选合约：ALL 用来看“哪个合约更该先管”，单个合约用来调参数',
    '再选时间：看的是短时波动还是持续问题，也要和规则时间窗对齐'
  ],
  overviewKeyMetrics: [
    '交易量：合约有多活跃，能承受多大“摩擦”（偏移/滑点/延迟）',
    '平台盈亏：线控有没有起作用，亏损扩大就该加码，盈利稳定可放松',
    '风险等级：把多项指标合成一个档位，方便快速决定线控力度'
  ],
  overviewSecondary: [
    '总持仓：盘子越大，调同样幅度对盈亏影响越大，也更敏感',
    '多空比：看是否一边倒，决定价格应该往哪边偏移更合适',
    '平均杠杆：杠杆越高越容易连环爆仓，需要更保守的策略'
  ],
  overviewContractsTable: [
    '先排优先级：优先处理亏损大、单边明显、杠杆集中的合约',
    '再控副作用：交易量/活跃高的合约别下手太重，避免影响主力盘',
    '看是否真在执行：线控状态/规则数能确认不是“只看报表没落地”',
    '同一合约对比多空与持仓变化：用来判断偏移方向和力度要不要改'
  ],
  positionLeverageDistribution: [
    '先看风险集中在哪档杠杆：高杠杆那一档通常最该先控',
    '净持仓是关键指标：用来校准“净持仓触发”类规则的阈值',
    '高杠杆 + 单边时先上硬措施：降最大杠杆、加延迟、加滑点'
  ],
  pnlUserDistribution: [
    '先看赚钱是不是集中在少数人/少数区间：集中越明显越像被“针对”',
    '如果盈利很集中：更适合用盈亏比触发，在短时间内加点摩擦止损',
    '如果大家都亏/都赚：多半是结构性问题，要结合净持仓/波动率一起看'
  ],
  pnlPlatformStats: [
    '平台盈亏和用户盈亏通常是对着的：用来检验线控是否把风险拉回来了',
    '平台持续亏：优先加码（逆势偏移、加滑点、降杠杆、缩短触发窗）',
    '平台赚钱但活跃掉了：可以逐步减摩擦，把交易量拉回来'
  ],
  riskWhales: [
    '大户口径（可按业务调整）：总持仓 ≥ 10万 USDT，或单边持仓 ≥ 8万 USDT 且杠杆 ≥ 20x',
    '看大户持仓与方向：谁可能把净敞口带偏，谁就是重点关注对象',
    '看大户杠杆：高杠杆更容易引发连环爆仓，优先考虑降杠杆/加延迟',
    '看大户盈亏与盈亏率：找出持续高盈利/高频特征，方便把阈值设得更贴近实际'
  ]
}

// 刷新数据
const refreshData = () => {
  console.log('刷新数据', { timeRange: timeRange.value, contract: selectedContract.value })
}

// 监听合约切换，重置页码
watch(selectedContract, () => {
  whalesCurrentPage.value = 1
  contractsCurrentPage.value = 1
})

// 导出报表
const exportReport = () => {
  alert('导出报表功能待实现')
}

// 打开风险评估帮助模态框
const openRiskHelpModal = () => {
  selectedRiskLevel.value = filteredOverview.value.riskLevel
  showRiskHelpModal.value = true
}
</script>

<template>
  <section class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">线控决策报表</h1>
        <p class="text-sm text-slate-500 mt-1">提供全面的市场数据分析，辅助线控调控决策</p>
      </div>
      <div class="flex items-center gap-3">
        <button
          @click="refreshData"
          class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          刷新
        </button>
        <button
          @click="exportReport"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          导出报表
        </button>
      </div>
    </div>

    <!-- 筛选条件 -->
    <!--
      用途：把“线控调控”从全局决策切换到“按合约/按时间窗口”的精细化决策。
      - 合约=ALL：用于挑出需要重点干预的合约池（优先处理亏损/单边/高杠杆集中的合约）。
      - 合约=单一：用于落到具体参数（价格偏移/滑点/延迟/最大杠杆）和规则阈值的微调。
      - 时间范围：对应线控规则的时间窗（如 1/5/15min），用于判断触发是否“短时异常”还是“持续结构性风险”。
    -->
    <div class="bg-white rounded-xl border border-slate-200 p-4">
      <div class="flex items-center gap-6 flex-wrap">
        <!-- 合约选择 -->
        <div class="flex items-center gap-3">
          <span class="text-sm font-medium text-slate-700">合约：</span>
          <select
            v-model="selectedContract"
            class="px-4 py-2 text-sm font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
          >
            <option v-for="option in contractOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
        
        <!-- 时间范围 -->
        <div class="flex items-center gap-3">
          <span class="text-sm font-medium text-slate-700">时间：</span>
          <div class="flex items-center gap-2">
          <button
            v-for="option in REPORT_TIME_RANGE_OPTIONS"
            :key="option.value"
            @click="timeRange = option.value"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              timeRange === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            ]"
          >
            {{ option.label }}
          </button>
        </div>
        </div>
        
        <!-- 自定义日期范围 -->
        <div v-if="timeRange === REPORT_TIME_RANGE.CUSTOM" class="flex items-center gap-2">
          <input
            v-model="customDateRange.start"
            type="date"
            class="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span class="text-slate-500">至</span>
          <input
            v-model="customDateRange.end"
            type="date"
            class="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
    <!-- <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <div class="flex items-start gap-3">
        <svg class="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
        <div class="flex-1">
          <p class="font-semibold text-slate-900 mb-1">要点</p>
          <ul class="list-disc list-inside space-y-1">
            <li v-for="(item, idx) in reportModuleKeyPoints.filter" :key="idx">{{ item }}</li>
          </ul>
        </div>
      </div>
    </div> -->

    <!-- 标签导航 -->
    <div class="bg-white rounded-xl border border-slate-200">
      <div class="border-b border-slate-200">
        <div class="flex overflow-x-auto">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            ]"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon" />
            </svg>
            {{ tab.name }}
          </button>
        </div>
      </div>

      <!-- 标签内容 -->
      <div class="p-6">
        <!-- 市场概览 -->
        <div v-show="activeTab === 'overview'" class="space-y-6">
          <!-- 关键指标卡片 -->
          <!--
            这组指标用于“是否需要启用/加码线控”的快速判定：
            - 24h 交易量：衡量流动性与可承受的交易摩擦；低流动性时，过高的滑点/偏移更容易造成用户流失与异常成交。
            - 平台盈亏：线控目标函数的直接反馈；平台亏损扩大时，通常需要提高逆势偏移/滑点或降低最大杠杆来止损。
            - 风险等级：把多维指标压缩成档位，便于选择“温和/中等/强力/紧急”的线控强度（详见风险评估标准弹窗）。
          -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-semibold text-slate-900">24h 交易量</h3>
                <svg class="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p class="text-3xl font-bold text-slate-900 mb-2">${{ formatAmount(filteredOverview.totalVolume24h) }}</p>
              <p class="text-sm text-slate-600">USDT</p>
            </div>

            <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-semibold text-slate-900">平台盈亏</h3>
                <svg class="h-8 w-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p class="text-3xl font-bold text-emerald-600 mb-2">{{ formatCurrency(filteredOverview.platformPnl24h) }}</p>
              <p class="text-sm text-slate-600">24小时</p>
            </div>

            <!-- 风险等级 - 已隐藏，让运营人员根据数据自行判断 -->
            <!-- <div 
              :class="[
                'rounded-xl p-6 bg-gradient-to-br hidden',
                RISK_LEVEL_CONFIG[filteredOverview.riskLevel].color === 'emerald' 
                  ? 'from-emerald-50 to-teal-50 border border-emerald-200' 
                  : RISK_LEVEL_CONFIG[filteredOverview.riskLevel].color === 'amber'
                  ? 'from-amber-50 to-yellow-50 border border-amber-200'
                  : RISK_LEVEL_CONFIG[filteredOverview.riskLevel].color === 'orange'
                  ? 'from-orange-50 to-amber-50 border border-orange-200'
                  : 'from-rose-50 to-red-50 border border-rose-200'
              ]"
            >
              <div class="flex items-center justify-between mb-4 hi">
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-semibold text-slate-900">风险等级</h3>
                  <button
                    @click="openRiskHelpModal"
                    :class="[
                      'p-1 rounded-full transition-colors',
                      RISK_LEVEL_CONFIG[filteredOverview.riskLevel].color === 'emerald'
                        ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100'
                        : RISK_LEVEL_CONFIG[filteredOverview.riskLevel].color === 'amber'
                        ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-100'
                        : RISK_LEVEL_CONFIG[filteredOverview.riskLevel].color === 'orange'
                        ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-100'
                        : 'text-rose-600 hover:text-rose-700 hover:bg-rose-100'
                    ]"
                    title="查看风险评估标准"
                  >
                    <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
                <svg 
                  :class="[
                    'h-8 w-8',
                    RISK_LEVEL_CONFIG[filteredOverview.riskLevel].color === 'emerald'
                      ? 'text-emerald-600'
                      : RISK_LEVEL_CONFIG[filteredOverview.riskLevel].color === 'amber'
                      ? 'text-amber-600'
                      : RISK_LEVEL_CONFIG[filteredOverview.riskLevel].color === 'orange'
                      ? 'text-orange-600'
                      : 'text-rose-600'
                  ]"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div class="flex items-center gap-3">
                <span
                  :class="RISK_LEVEL_CONFIG[filteredOverview.riskLevel].class"
                  class="inline-flex items-center px-4 py-2 rounded-lg text-lg font-bold border-2"
                >
                  {{ RISK_LEVEL_CONFIG[filteredOverview.riskLevel].text }}
                </span>
              </div>
            </div> -->
          </div>
          <!-- <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p class="font-semibold text-slate-900 mb-1">要点</p>
            <ul class="list-disc list-inside space-y-1">
              <li v-for="(item, idx) in reportModuleKeyPoints.overviewKeyMetrics" :key="idx">{{ item }}</li>
            </ul>
          </div> -->

          <!-- 次要指标 -->
          <!--
            次要指标用于“解释原因 + 校准参数”的辅助判断：
            - 总持仓：决定风险敞口规模；持仓越大，偏移/滑点同等幅度带来的盈亏影响越大。
            - 多空比：判断单边风险；多头过重/空头过重时，优先使用“逆势偏移”引导对手盘、降低净敞口。
            - 平均杠杆：判断爆仓链式风险与平台穿仓风险；杠杆偏高时可下调最大杠杆、增加延迟/滑点抑制冲动交易。
          -->
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div class="bg-white border border-slate-200 rounded-lg p-4">
              <p class="text-sm text-slate-600 mb-1">总持仓</p>
              <p class="text-xl font-bold text-slate-900">${{ formatAmount(filteredOverview.totalPosition) }}</p>
            </div>
            <div class="bg-white border border-slate-200 rounded-lg p-4">
              <p class="text-sm text-slate-600 mb-1">多空比</p>
              <p class="text-xl font-bold text-slate-900">{{ filteredOverview.longShortRatio.toFixed(2) }}</p>
            </div>
            <div class="bg-white border border-slate-200 rounded-lg p-4">
              <p class="text-sm text-slate-600 mb-1">平均杠杆</p>
              <p class="text-xl font-bold text-slate-900">{{ filteredOverview.avgLeverage.toFixed(1) }}x</p>
            </div>
          </div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p class="font-semibold text-slate-900 mb-1">要点</p>
            <ul class="list-disc list-inside space-y-1">
              <li v-for="(item, idx) in reportModuleKeyPoints.overviewSecondary" :key="idx">{{ item }}</li>
            </ul>
          </div>

          <!-- 各合约数据 -->
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-slate-900">
                <span v-if="selectedContract === 'ALL'">各合约数据</span>
                <span v-else>合约详情</span>
              </h3>
              <span v-if="selectedContract !== 'ALL'" class="text-sm text-slate-500">
                当前仅显示 {{ contractOptions.find(c => c.value === selectedContract)?.label }} 的数据
              </span>
            </div>
            <!--
              这张表用于“找出需要优先调控的合约 + 复核线控是否已覆盖”：
              - 24h交易量：判断该合约的业务重要性与可接受摩擦上限。
              - 持仓(多/空)/多空比：决定偏移方向（逆势）与净敞口止损优先级。
              - 平台盈亏：决定线控强度；持续亏损合约优先加大滑点/偏移或降低最大杠杆。
              - 线控状态/自动触发/规则数：确认“可执行性”，避免只看风控侧指标却未落地到线控配置。
            -->
            <div class="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div class="max-h-96 overflow-y-auto">
                <table class="w-full">
                <thead class="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase">合约</th>
                    <th class="px-6 py-3 text-right text-xs font-semibold text-slate-900 uppercase">24h交易量</th>
                    <th class="px-6 py-3 text-right text-xs font-semibold text-slate-900 uppercase">持仓</th>
                    <th class="px-6 py-3 text-right text-xs font-semibold text-slate-900 uppercase">多空比</th>
                    <th class="px-6 py-3 text-right text-xs font-semibold text-slate-900 uppercase">平台盈亏</th>
                    <th class="px-6 py-3 text-center text-xs font-semibold text-slate-900 uppercase">线控</th>
                    <!-- <th class="px-6 py-3 text-center text-xs font-semibold text-slate-900 uppercase">风险</th> -->
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200">
                  <tr v-for="contract in paginatedContractsWithControl" :key="contract.symbol" class="hover:bg-slate-50">
                    <td class="px-6 py-4">
                      <div>
                        <p class="text-sm font-medium text-slate-900">{{ contract.name }}</p>
                        <p class="text-xs text-slate-500">{{ contract.symbol }}</p>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <p class="text-sm font-medium text-slate-900">${{ formatAmount(contract.volume24h) }}</p>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <p class="text-sm font-medium text-slate-900">${{ formatAmount(contract.position) }}</p>
                      <p class="text-xs text-slate-500">
                        多: ${{ formatAmount(contract.longPosition) }} / 
                        空: ${{ formatAmount(contract.shortPosition) }}
                      </p>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <p class="text-sm font-medium text-slate-900">{{ contract.longShortRatio.toFixed(2) }}</p>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <p :class="contract.platformPnl24h >= 0 ? 'text-emerald-600' : 'text-rose-600'" class="text-sm font-medium">
                        {{ formatCurrency(contract.platformPnl24h) }}
                      </p>
                    </td>
                    <td class="px-6 py-4 text-center">
                      <div class="flex flex-col items-center gap-1">
                        <span
                          v-if="!contract.controlConfigured"
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600"
                        >
                          未配置
                        </span>
                        <span
                          v-else
                          :class="contract.controlRunning ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'"
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        >
                          {{ contract.controlRunning ? '线控中' : '暂停' }}
                        </span>
                        <span
                          v-if="contract.controlConfigured"
                          :class="contract.controlAutoTriggerEnabled ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'"
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        >
                          {{ contract.controlAutoTriggerEnabled ? '自动触发开' : '自动触发关' }}
                        </span>
                        <span
                          v-if="contract.controlConfigured"
                          class="text-[11px] text-slate-500"
                        >
                          规则 {{ contract.controlEnabledRules }}/{{ contract.controlRuleCount }}
                        </span>
                      </div>
                    </td>
                    <!-- 风险等级已隐藏 -->
                    <!-- <td class="px-6 py-4 text-center">
                      <span
                        :class="RISK_LEVEL_CONFIG[contract.riskLevel].class"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                      >
                        {{ RISK_LEVEL_CONFIG[contract.riskLevel].text }}
                      </span>
                    </td> -->
                  </tr>
                </tbody>
              </table>
              </div>
            </div>
            <div v-if="selectedContract === 'ALL'" class="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>共 {{ filteredContractsWithControl.length }} 个合约</span>
              <span>第 {{ contractsCurrentPage }} / {{ contractsTotalPages }} 页</span>
            </div>

            <div v-if="selectedContract === 'ALL'" class="mt-3 flex items-center justify-end gap-2">
              <button
                @click="contractsCurrentPage = Math.max(1, contractsCurrentPage - 1)"
                :disabled="contractsCurrentPage === 1"
                :class="[
                  'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                  contractsCurrentPage === 1
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                ]"
              >
                上一页
              </button>
              <div class="flex items-center gap-1">
                <template v-for="(page, index) in contractsPageNumbers" :key="index">
                  <button
                    v-if="page !== '...'"
                    @click="contractsCurrentPage = page"
                    :class="[
                      'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                      contractsCurrentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                    ]"
                  >
                    {{ page }}
                  </button>
                  <span v-else class="px-2 text-slate-400">...</span>
                </template>
              </div>
              <button
                @click="contractsCurrentPage = Math.min(contractsTotalPages, contractsCurrentPage + 1)"
                :disabled="contractsCurrentPage === contractsTotalPages"
                :class="[
                  'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                  contractsCurrentPage === contractsTotalPages
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                ]"
              >
                下一页
              </button>
            </div>
            <div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p class="font-semibold text-slate-900 mb-1">要点</p>
              <ul class="list-disc list-inside space-y-1">
                <li v-for="(item, idx) in reportModuleKeyPoints.overviewContractsTable" :key="idx">{{ item }}</li>
              </ul>
            </div>
          </div>

          <!-- 操作建议 - 已隐藏，让运营人员根据数据自行决策 -->
          <div v-if="false">
            <!--
              用途（当前隐藏）：把报表信号直接翻译成“可执行的线控动作清单”，用于降低决策门槛与缩短响应时间。
              - reason/expectedEffect：解释为什么要调控，以及调控后平台盈亏/风险的预期变化。
              - affects：对应要调整的线控参数（偏移/滑点/延迟/杠杆限制等），便于一键落地到线控配置页。
            -->
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-slate-900">
                <span v-if="selectedContract === 'ALL'">操作建议（全部合约）</span>
                <span v-else>操作建议（{{ contractOptions.find(c => c.value === selectedContract)?.label }}）</span>
              </h3>
              <div class="flex items-center gap-3">
                <span v-if="filteredActionSuggestions.length > 0" class="text-sm text-slate-500">
                  显示 {{ displayedActionSuggestions.length }} / {{ filteredActionSuggestions.length }} 条
                </span>
                <button
                  v-if="filteredActionSuggestions.length > 3"
                  @click="showAllSuggestions = !showAllSuggestions"
                  class="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  {{ showAllSuggestions ? '收起' : '显示全部' }}
                  <svg class="h-4 w-4" :class="{ 'rotate-180': showAllSuggestions }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
            <div v-if="filteredActionSuggestions.length === 0" class="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
              <svg class="h-12 w-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-slate-600">该合约暂无操作建议</p>
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="suggestion in displayedActionSuggestions"
                :key="suggestion.title"
                :class="[
                  'border-l-4 rounded-lg p-4',
                  suggestion.priority === 'critical' ? 'bg-rose-100 border-rose-600' :
                  suggestion.priority === 'high' ? 'bg-rose-50 border-rose-500' :
                  suggestion.priority === 'medium' ? 'bg-amber-50 border-amber-500' :
                  'bg-blue-50 border-blue-500'
                ]"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <span
                        :class="[
                          'px-2 py-0.5 rounded text-xs font-medium',
                          suggestion.priority === 'critical' ? 'bg-rose-200 text-rose-900 font-bold' :
                          suggestion.priority === 'high' ? 'bg-rose-100 text-rose-700' :
                          suggestion.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        ]"
                      >
                        {{ suggestion.priority === 'critical' ? '🚨 紧急' :
                           suggestion.priority === 'high' ? '高优先级' : 
                           suggestion.priority === 'medium' ? '中优先级' : '低优先级' }}
                      </span>
                      <span v-if="selectedContract === 'ALL'" class="text-xs text-slate-600">{{ suggestion.contract }}</span>
                    </div>
                    <h4 class="text-sm font-semibold text-slate-900 mb-2">{{ suggestion.title }}</h4>
                    <p class="text-sm text-slate-700 mb-2">{{ suggestion.reason }}</p>
                    <p class="text-xs text-emerald-700 font-medium mb-2">预期效果: {{ suggestion.expectedEffect }}</p>
                    <div class="flex items-start gap-1.5 text-xs text-slate-600 bg-white/70 rounded px-2 py-1.5">
                      <svg class="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span><span class="font-medium text-slate-700">影响参数:</span> {{ suggestion.affects }}</span>
                    </div>
                  </div>
                  <button 
                    :class="[
                      'ml-4 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors whitespace-nowrap',
                      suggestion.priority === 'critical' ? 'bg-rose-600 hover:bg-rose-700' :
                      suggestion.priority === 'high' ? 'bg-orange-600 hover:bg-orange-700' :
                      'bg-blue-600 hover:bg-blue-700'
                    ]"
                  >
                    执行操作
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 持仓分析 -->
        <div v-show="activeTab === 'position'" class="space-y-6">
          <div class="bg-white border border-slate-200 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-slate-900 mb-4">持仓分布（按杠杆倍数）</h3>
            <!--
              用途：把“风险来自哪里”拆到不同杠杆层级，帮助做两类线控动作：
              1) 结构性调控：当高杠杆层净持仓单边时，优先降低最大杠杆/增加延迟/提高滑点，避免爆仓链式反应。
              2) 触发阈值校准：净持仓/占比阈值应参考主力杠杆区间的持仓量与人数分布，避免阈值过紧导致频繁触发。
              字段含义：
              - 多头/空头人数：反映参与者结构（大户/散户）与情绪偏向。
              - 多头/空头持仓：反映真实资金敞口（线控偏移需要跟敞口规模匹配）。
              - 净持仓：是“净敞口”核心指标，常用于净持仓触发类规则。
            -->
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-slate-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-900">杠杆区间</th>
                    <th class="px-4 py-3 text-right text-xs font-semibold text-slate-900">多头人数</th>
                    <th class="px-4 py-3 text-right text-xs font-semibold text-slate-900">空头人数</th>
                    <th class="px-4 py-3 text-right text-xs font-semibold text-slate-900">多头持仓</th>
                    <th class="px-4 py-3 text-right text-xs font-semibold text-slate-900">空头持仓</th>
                    <th class="px-4 py-3 text-right text-xs font-semibold text-slate-900">净持仓</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200">
                  <tr v-for="item in leverageDistribution" :key="item.leverage" class="hover:bg-slate-50">
                    <td class="px-4 py-3 text-sm font-medium text-slate-900">{{ item.leverage }}</td>
                    <td class="px-4 py-3 text-right text-sm text-slate-700">{{ item.longCount }}</td>
                    <td class="px-4 py-3 text-right text-sm text-slate-700">{{ item.shortCount }}</td>
                    <td class="px-4 py-3 text-right text-sm text-emerald-600 font-medium">${{ formatAmount(item.longVolume) }}</td>
                    <td class="px-4 py-3 text-right text-sm text-rose-600 font-medium">${{ formatAmount(item.shortVolume) }}</td>
                    <td class="px-4 py-3 text-right text-sm font-medium" 
                        :class="(item.longVolume - item.shortVolume) >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                      {{ formatCurrency(item.longVolume - item.shortVolume) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-start gap-3">
              <svg class="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
              <div class="text-sm text-blue-800">
                <p class="font-semibold mb-1">要点</p>
                <ul class="list-disc list-inside space-y-1">
                  <li v-for="(item, idx) in reportModuleKeyPoints.positionLeverageDistribution" :key="idx">{{ item }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- 盈亏分析 -->
        <div v-show="activeTab === 'pnl'" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white border border-slate-200 rounded-lg p-6">
              <h3 class="text-lg font-semibold text-slate-900 mb-4">用户盈亏分布</h3>
              <!--
                用途：识别“平台亏损来自少数用户还是整体结构”，对应两种线控思路：
                - 盈利集中（少数区间/少数用户拿走大部分利润）：倾向启用“盈亏比触发”规则，在短时间窗内对高盈利行为增加摩擦。
                - 普遍亏损/普遍盈利：更多是行情结构问题，优先用净持仓/波动率/成交异常类规则做整体保护。
                字段含义：
                - range/count/percentage：定位人群分布与集中度。
                - totalPnl：衡量该区间对平台整体盈亏压力（与平台盈亏方向相反）。
              -->
              <div class="space-y-3">
                <div v-for="item in pnlDistribution" :key="item.range" class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-sm text-slate-700">{{ item.range }}</span>
                      <span class="text-sm font-medium text-slate-900">{{ item.count }} 人 ({{ item.percentage.toFixed(1) }}%)</span>
                    </div>
                    <div class="w-full bg-slate-200 rounded-full h-2">
                      <div
                        :class="item.totalPnl >= 0 ? 'bg-emerald-500' : 'bg-rose-500'"
                        class="h-2 rounded-full transition-all"
                        :style="{ width: `${item.percentage * 2}%` }"
                      ></div>
                    </div>
                  </div>
                  <span
                    :class="item.totalPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'"
                    class="ml-4 text-sm font-medium min-w-[80px] text-right"
                  >
                    {{ formatCurrency(item.totalPnl) }}
                  </span>
                </div>
              </div>
              <div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p class="font-semibold text-slate-900 mb-1">要点</p>
                <ul class="list-disc list-inside space-y-1">
                  <li v-for="(item, idx) in reportModuleKeyPoints.pnlUserDistribution" :key="idx">{{ item }}</li>
                </ul>
              </div>
            </div>

            <div class="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-6">
              <h3 class="text-lg font-semibold text-slate-900 mb-4">平台盈亏统计</h3>
              <!--
                用途：平台与用户盈亏是镜像关系，用来验证线控是否“把风险/收益拉回平台可控区间”。
                - 平台盈亏为负：通常需要提升逆势偏移/滑点、缩短自动触发时间窗、下调最大杠杆等止损措施。
                - 平台盈亏为正但活跃度下滑：可能线控过严，可逐步回撤摩擦参数以换取交易量。
              -->
              <div class="space-y-4">
                <div class="flex items-center justify-between p-4 bg-white rounded-lg">
                  <span class="text-sm text-slate-700">平台盈亏</span>
                  <span class="text-xl font-bold text-emerald-600">{{ formatCurrency(filteredOverview.platformPnl24h) }}</span>
                </div>
                <div class="flex items-center justify-between p-4 bg-white rounded-lg">
                  <span class="text-sm text-slate-700">用户盈亏</span>
                  <span class="text-xl font-bold text-rose-600">{{ formatCurrency(filteredOverview.userPnl24h) }}</span>
                </div>
                <div class="flex items-center justify-between p-4 bg-white rounded-lg">
                  <span class="text-sm text-slate-700">盈利用户占比</span>
                  <span class="text-xl font-bold text-slate-900">26.4%</span>
                </div>
                <div class="flex items-center justify-between p-4 bg-white rounded-lg">
                  <span class="text-sm text-slate-700">亏损用户占比</span>
                  <span class="text-xl font-bold text-slate-900">32.4%</span>
                </div>
              </div>
              <div class="mt-4 rounded-lg border border-emerald-200 bg-white/70 p-4 text-sm text-slate-700">
                <p class="font-semibold text-slate-900 mb-1">要点</p>
                <ul class="list-disc list-inside space-y-1">
                  <li v-for="(item, idx) in reportModuleKeyPoints.pnlPlatformStats" :key="idx">{{ item }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- 风险监控 -->
        <div v-show="activeTab === 'risk'" class="space-y-6">
          <!-- 风险预警 - 已隐藏 -->
          <div v-if="false">
            <!--
              用途（当前隐藏）：把关键风险信号（单边、多空失衡、异常波动、成交异常等）做成“事件流”，用于触发人工/自动联动。
              - message/type/time：用于快速定位发生了什么、何时发生、属于哪类风险。
              - suggestion：对应建议采取的线控动作（加大偏移/提高滑点/增加延迟/降杠杆/暂停高风险交易等）。
              这类数据通常与自动规则触发记录联动，用于复盘阈值是否合理。
            -->
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-slate-900">
                <span v-if="selectedContract === 'ALL'">风险预警（全部合约）</span>
                <span v-else>风险预警（{{ contractOptions.find(c => c.value === selectedContract)?.label }}）</span>
              </h3>
              <div class="flex items-center gap-3">
                <span v-if="filteredRiskAlerts.length > 0" class="text-sm text-slate-500">
                  共 {{ filteredRiskAlerts.length }} 条预警
                </span>
                <button
                  v-if="filteredRiskAlerts.length > 5"
                  @click="showAllRiskAlerts = !showAllRiskAlerts"
                  class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <span>{{ showAllRiskAlerts ? '收起' : '展开全部' }}</span>
                  <svg
                    class="h-4 w-4 transition-transform duration-200"
                    :class="{ 'rotate-180': showAllRiskAlerts }"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                  <span v-if="!showAllRiskAlerts" class="text-slate-500">(显示 5 / {{ filteredRiskAlerts.length }})</span>
                </button>
              </div>
            </div>
            <div v-if="filteredRiskAlerts.length === 0" class="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
              <svg class="h-12 w-12 text-emerald-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-slate-600">该合约暂无风险预警</p>
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="alert in displayedRiskAlerts"
                :key="alert.id"
                :class="[
                  'border-l-4 rounded-lg p-4',
                  RISK_LEVEL_CONFIG[alert.level].color === 'rose' ? 'bg-rose-50 border-rose-500' :
                  RISK_LEVEL_CONFIG[alert.level].color === 'orange' ? 'bg-orange-50 border-orange-500' :
                  RISK_LEVEL_CONFIG[alert.level].color === 'amber' ? 'bg-amber-50 border-amber-500' :
                  'bg-emerald-50 border-emerald-500'
                ]"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-xs text-slate-600">{{ alert.type }}</span>
                      <span v-if="selectedContract === 'ALL'" class="text-xs text-slate-500">{{ alert.contract }}</span>
                      <span class="text-xs text-slate-400">{{ alert.time }}</span>
                    </div>
                    <p class="text-sm text-slate-900 font-medium mb-2">{{ alert.message }}</p>
                    <p class="text-xs text-slate-600">💡 建议: {{ alert.suggestion }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 大户监控 -->
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-slate-900">
                <span v-if="selectedContract === 'ALL'">大户监控（全部合约）</span>
                <span v-else>大户监控（{{ contractOptions.find(c => c.value === selectedContract)?.label }}）</span>
              </h3>
              <span v-if="filteredWhalesList.length > 0" class="text-sm text-slate-500">
                共 {{ filteredWhalesList.length }} 个大户
              </span>
            </div>
            <!--
              用途：把“风险/收益”落到用户维度，支撑精细化线控（特别是高频/大户/高盈利账户）：
              - 总持仓 + 多/空：识别能左右净敞口的关键账户；当单边集中时可提高该合约摩擦或调整偏移方向。
              - 杠杆：识别潜在连环爆仓源头；高杠杆大户需要优先考虑下调最大杠杆、增加延迟。
              - 24h盈亏 + 盈亏率：识别“持续高盈利/高回撤”账户特征，可配合盈亏比触发类规则设置更贴近真实分布的阈值。
            -->
            <div v-if="filteredWhalesList.length === 0" class="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
              <svg class="h-12 w-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p class="text-slate-600">该合约暂无大户交易</p>
            </div>
            <div v-else>
              <div class="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <table class="w-full">
                <thead class="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase">用户</th>
                    <!-- <th class="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase">类型</th> -->
                    <th v-if="selectedContract === 'ALL'" class="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase">交易合约</th>
                    <th class="px-6 py-3 text-right text-xs font-semibold text-slate-900 uppercase">总持仓</th>
                    <th class="px-6 py-3 text-right text-xs font-semibold text-slate-900 uppercase">多头/空头</th>
                    <th class="px-6 py-3 text-right text-xs font-semibold text-slate-900 uppercase">杠杆</th>
                    <th class="px-6 py-3 text-right text-xs font-semibold text-slate-900 uppercase">24h盈亏</th>
                    <!-- <th class="px-6 py-3 text-center text-xs font-semibold text-slate-900 uppercase">风险</th> -->
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200">
                <tr v-for="whale in paginatedWhalesList" :key="whale.userId" class="hover:bg-slate-50">
                    <td class="px-6 py-4">
                      <p class="text-sm font-medium text-slate-900">{{ whale.username }}</p>
                      <p class="text-xs text-slate-500">{{ whale.userId }}</p>
                    </td>
                    <!-- <td class="px-6 py-4">
                      <span :class="USER_TYPE_CONFIG[whale.type].class" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                        {{ USER_TYPE_CONFIG[whale.type].icon }} {{ USER_TYPE_CONFIG[whale.type].text }}
                      </span>
                    </td> -->
                    <td v-if="selectedContract === 'ALL'" class="px-6 py-4">
                      <div class="flex flex-wrap gap-1">
                        <span 
                          v-for="contract in whale.contracts" 
                          :key="contract"
                          class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700"
                        >
                          {{ contract }}
                        </span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <p class="text-sm font-medium text-slate-900">${{ formatAmount(whale.totalPosition) }}</p>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <p class="text-xs text-emerald-600">${{ formatAmount(whale.longPosition) }}</p>
                      <p class="text-xs text-rose-600">${{ formatAmount(whale.shortPosition) }}</p>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <p class="text-sm font-medium text-slate-900">{{ whale.leverage }}x</p>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <p :class="whale.pnl24h >= 0 ? 'text-emerald-600' : 'text-rose-600'" class="text-sm font-medium">
                        {{ formatCurrency(whale.pnl24h) }}
                      </p>
                      <p :class="whale.pnlRate >= 0 ? 'text-emerald-600' : 'text-rose-600'" class="text-xs">
                        ({{ whale.pnlRate >= 0 ? '+' : '' }}{{ whale.pnlRate.toFixed(2) }}%)
                      </p>
                    </td>
                    <!-- 风险等级已隐藏 -->
                    <!-- <td class="px-6 py-4 text-center">
                      <span :class="RISK_LEVEL_CONFIG[whale.riskLevel].class" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border">
                        {{ RISK_LEVEL_CONFIG[whale.riskLevel].text }}
                      </span>
                    </td> -->
                  </tr>
                </tbody>
              </table>
              
              <!-- 分页控件 -->
              <div v-if="whalesTotalPages > 1" class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div class="text-sm text-slate-600">
                  共 {{ filteredWhalesList.length }} 个大户，第 {{ whalesCurrentPage }} / {{ whalesTotalPages }} 页
                </div>
                <div class="flex items-center gap-2">
                  <button
                    @click="whalesCurrentPage = Math.max(1, whalesCurrentPage - 1)"
                    :disabled="whalesCurrentPage === 1"
                    :class="[
                      'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                      whalesCurrentPage === 1
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                    ]"
                  >
                    上一页
                  </button>
                  <div class="flex items-center gap-1">
                    <template v-for="(page, index) in whalesPageNumbers" :key="index">
                      <button
                        v-if="page !== '...'"
                        @click="whalesCurrentPage = page"
                        :class="[
                          'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                          whalesCurrentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                        ]"
                      >
                        {{ page }}
                      </button>
                      <span v-else class="px-2 text-slate-400">...</span>
                    </template>
                  </div>
                  <button
                    @click="whalesCurrentPage = Math.min(whalesTotalPages, whalesCurrentPage + 1)"
                    :disabled="whalesCurrentPage === whalesTotalPages"
                    :class="[
                      'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                      whalesCurrentPage === whalesTotalPages
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                    ]"
                  >
                    下一页
                  </button>
                </div>
              </div>
            </div>
              <div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p class="font-semibold text-slate-900 mb-1">要点</p>
                <ul class="list-disc list-inside space-y-1">
                  <li v-for="(item, idx) in reportModuleKeyPoints.riskWhales" :key="idx">{{ item }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- 线控效果标签页已移除 -->
      </div>
    </div>

    <!-- 风险评估标准帮助模态框 -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showRiskHelpModal"
        class="fixed inset-0 bg-slate-900 bg-opacity-50 z-50 flex items-center justify-center p-4"
      >
        <!--
          用途：把“风险等级”背后的判定口径透明化，并把每个档位的线控动作标准化：
          - 判定标准：告诉运营/风控应该重点看哪些指标（盈亏、多空比、集中度、高杠杆占比等）。
          - 建议操作：把报表信号映射到可执行的线控动作（偏移/滑点/延迟/杠杆限制/账户级限制等）。
        -->
        <div class="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          <!-- 模态框头部 -->
          <div class="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
            <div class="flex items-center gap-3">
              <svg class="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 class="text-lg font-semibold text-slate-900">风险评估标准</h3>
            </div>
            <button
              @click="showRiskHelpModal = false"
              class="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- 模态框内容 -->
          <div class="flex flex-col h-[calc(90vh-5rem)]">
            <!-- 说明 -->
            <div class="px-6 pt-4 pb-3 border-b border-slate-200">
              <div class="flex items-start gap-2">
                <svg class="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
                <div class="text-sm text-slate-600">
                  <p class="font-semibold mb-1 text-slate-900">风险评估说明</p>
                  <p>系统根据多空比、平台盈亏、持仓集中度、用户盈利分布、高杠杆使用情况等多维度指标，综合评估市场风险等级。</p>
                </div>
              </div>
            </div>

            <!-- Tab 切换 -->
            <div class="px-6 pt-3">
              <div class="flex gap-2 border-b border-slate-200">
                <button
                  v-for="(criteria, level) in RISK_ASSESSMENT_CRITERIA"
                  :key="level"
                  @click="selectedRiskLevel = level"
                  :class="[
                    'px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 -mb-px',
                    selectedRiskLevel === level
                      ? RISK_LEVEL_CONFIG[level].color === 'emerald' ? 'border-emerald-500 text-emerald-700' :
                        RISK_LEVEL_CONFIG[level].color === 'amber' ? 'border-amber-500 text-amber-700' :
                        RISK_LEVEL_CONFIG[level].color === 'orange' ? 'border-orange-500 text-orange-700' :
                        'border-rose-500 text-rose-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  ]"
                >
                  <span :class="selectedRiskLevel === level ? 'font-bold' : ''">{{ criteria.level }}</span>
                </button>
              </div>
            </div>

            <!-- Tab 内容 -->
            <div class="flex-1 overflow-y-auto px-6 py-4">
              <div
                v-for="(criteria, level) in RISK_ASSESSMENT_CRITERIA"
                v-show="selectedRiskLevel === level"
                :key="level"
                :class="[
                  'border-l-4 pl-4 py-2',
                  RISK_LEVEL_CONFIG[level].color === 'emerald' ? 'border-emerald-500' :
                  RISK_LEVEL_CONFIG[level].color === 'amber' ? 'border-amber-500' :
                  RISK_LEVEL_CONFIG[level].color === 'orange' ? 'border-orange-500' :
                  'border-rose-500'
                ]"
              >
                <!-- 等级标题 -->
                <div class="flex items-center gap-3 mb-4">
                  <span
                    :class="RISK_LEVEL_CONFIG[level].class"
                    class="inline-flex items-center px-3 py-1.5 rounded text-base font-bold border"
                  >
                    {{ criteria.level }}
                  </span>
                  <p class="text-sm text-slate-600">{{ criteria.description }}</p>
                </div>

                <!-- 判定标准 -->
                <div class="mb-4">
                  <h4 class="text-sm font-semibold text-slate-900 mb-2">判定标准</h4>
                  <div class="space-y-2">
                    <div
                      v-for="(criterion, index) in criteria.criteria"
                      :key="index"
                      class="flex items-start gap-3 py-2 border-b border-slate-200 last:border-b-0"
                    >
                      <div class="flex-shrink-0 w-28">
                        <span class="text-xs font-medium text-slate-600">{{ criterion.label }}</span>
                      </div>
                      <div class="flex-1">
                        <span class="text-sm font-semibold text-slate-900">{{ criterion.range }}</span>
                        <p class="text-xs text-slate-500 mt-0.5">{{ criterion.desc }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 建议操作 -->
                <div>
                  <h4 class="text-sm font-semibold text-slate-900 mb-2">建议操作</h4>
                  <ul class="space-y-1.5">
                    <li
                      v-for="(action, index) in criteria.actions"
                      :key="index"
                      class="flex items-start gap-2 text-sm text-slate-700"
                    >
                      <span class="text-slate-400 mt-0.5">•</span>
                      <span>{{ action }}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- 底部提示 -->
            <div class="px-6 py-3 border-t border-slate-200">
              <p class="text-xs text-slate-500">
                <strong class="text-slate-700">注意：</strong>风险评估是基于多个指标的综合判断，实际操作时还需要结合市场环境、用户行为等因素进行综合分析。
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </section>
</template>
