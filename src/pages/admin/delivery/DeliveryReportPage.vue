<script setup>
import { ref, computed, watch } from 'vue'
import { 
  DELIVERY_REPORT_TIME_RANGE, 
  DELIVERY_REPORT_TIME_RANGE_OPTIONS, 
  DELIVERY_RISK_LEVEL_CONFIG,
  DELIVERY_USER_TYPE_CONFIG,
  DELIVERY_CYCLE_TYPE_CONFIG,
  DELIVERY_CONTRACT_STATUS_CONFIG
} from '../../../admin/constants/deliveryReport'
import { 
  DELIVERY_RULE_ACTION_CONFIG 
} from '../../../admin/constants/deliveryControl'
import {
  deliveryMarketOverview,
  deliveryContractsData,
  deliveryExpiryDistribution,
  deliveryPnlDistribution,
  deliveryWhalesList,
  deliveryAutoRuleStats,
  deliveryAutoRuleEffectComparison
} from '../../../admin/mock/deliveryReport'

// 时间范围
const timeRange = ref(DELIVERY_REPORT_TIME_RANGE.TODAY)
const customDateRange = ref({ start: '', end: '' })

// 合约选择
const selectedContract = ref('ALL') // ALL 或具体合约symbol
const contractOptions = computed(() => [
  { value: 'ALL', label: '全部合约' },
  ...deliveryContractsData.map(c => ({ value: c.symbol, label: c.name }))
])

// 当前激活的标签
const activeTab = ref('overview') // overview, position, pnl, risk, auto-rules

// 市场概览数据
const overview = ref(deliveryMarketOverview)
const contracts = ref(deliveryContractsData)

// 根据选择的合约筛选数据
const filteredContracts = computed(() => {
  if (selectedContract.value === 'ALL') {
    return contracts.value
  }
  return contracts.value.filter(c => c.symbol === selectedContract.value)
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
    totalUsers: overview.value.totalUsers,
    activeUsers24h: contract.activeUsers,
    platformPnl24h: contract.platformPnl24h,
    userPnl24h: contract.userPnl24h,
    longShortRatio: contract.longShortRatio,
    nearExpiryContracts: contract.daysToExpiry <= 3 ? 1 : 0,
    todaySettlements: contract.daysToExpiry === 0 ? 1 : 0,
    riskLevel: contract.riskLevel
  }
})

// 筛选后的大户列表
const filteredWhalesList = computed(() => {
  if (selectedContract.value === 'ALL') {
    return deliveryWhalesList
  }
  return deliveryWhalesList.filter(w => w.contracts.includes(selectedContract.value))
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

// 标签配置
const tabs = [
  { id: 'overview', name: '市场概览', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'position', name: '持仓分析', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'pnl', name: '盈亏分析', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'risk', name: '风险监控', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  { id: 'auto-rules', name: '自动化效果', icon: 'M13 10V3L4 14h7v7l9-11h-7z' }
]

// 刷新数据
const refreshData = () => {
  console.log('刷新数据', { timeRange: timeRange.value, contract: selectedContract.value })
}

// 监听合约切换，重置页码
watch(selectedContract, () => {
  whalesCurrentPage.value = 1
})

// 导出报表
const exportReport = () => {
  alert('导出报表功能待实现')
}
</script>

<template>
  <section class="space-y-5">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">场控操作决策报表</h1>
        <p class="mt-1 text-sm text-slate-500">提供交割合约场控数据分析，辅助交割前后的调控决策。</p>
      </div>

      <div class="flex items-center gap-3">
        <button type="button" class="ant-btn inline-flex items-center gap-2" @click="refreshData">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          刷新
        </button>
        <button type="button" class="ant-btn ant-btn-primary inline-flex items-center gap-2" @click="exportReport">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          导出报表
        </button>
      </div>
    </header>

    <div class="pro-card p-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-slate-700">合约</label>
          <select v-model="selectedContract" class="ant-select !py-1.5">
            <option v-for="option in contractOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-slate-700">统计周期</label>
          <select v-model="timeRange" class="ant-select !py-1.5">
            <option v-for="option in DELIVERY_REPORT_TIME_RANGE_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>

        <div v-if="timeRange === DELIVERY_REPORT_TIME_RANGE.CUSTOM" class="space-y-1.5">
          <label class="block text-sm font-medium text-slate-700">自定义日期</label>
          <div class="flex items-center gap-2">
            <input v-model="customDateRange.start" type="date" class="ant-input !py-1.5" />
            <span class="text-slate-400">-</span>
            <input v-model="customDateRange.end" type="date" class="ant-input !py-1.5" />
          </div>
        </div>
      </div>
    </div>

    <article class="pro-card overflow-hidden">
      <div class="border-b border-black/[0.06] bg-white px-6">
        <div class="flex gap-8">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            class="relative px-1 py-4 text-sm transition-all"
            :class="activeTab === tab.id ? 'text-antd-primary font-medium after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-antd-primary' : 'text-black/45 hover:text-black/85'"
            @click="activeTab = tab.id"
          >
            <div class="flex items-center gap-2">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon" /></svg>
              <span>{{ tab.name }}</span>
            </div>
          </button>
        </div>
      </div>

      <div class="bg-[#f0f2f5] p-6">
        <div v-show="activeTab === 'overview'" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="pro-card p-5">
              <div class="flex items-center justify-between mb-3 text-black/45"><h3 class="text-xs font-medium uppercase tracking-wider">24h 交易量</h3><svg class="h-5 w-5 text-antd-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg></div>
              <p class="text-2xl font-bold text-black/85 font-mono">${{ formatAmount(filteredOverview.totalVolume24h) }}</p>
              <p class="mt-2 text-[11px] text-black/25">当前结算币种: USDT</p>
            </div>

            <div class="pro-card p-5">
              <div class="flex items-center justify-between mb-3 text-black/45"><h3 class="text-xs font-medium uppercase tracking-wider">平台总盈亏</h3><svg class="h-5 w-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
              <p class="text-2xl font-bold font-mono" :class="filteredOverview.platformPnl24h >= 0 ? 'text-emerald-500' : 'text-rose-500'">{{ formatCurrency(filteredOverview.platformPnl24h) }}</p>
              <p class="mt-2 text-[11px] text-black/25">统计周期: 24小时</p>
            </div>

            <div class="pro-card p-5">
              <div class="flex items-center justify-between mb-3 text-black/45"><h3 class="text-xs font-medium uppercase tracking-wider">临近交割</h3><svg class="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
              <p class="text-2xl font-bold text-black/85 font-mono">{{ filteredOverview.nearExpiryContracts }}</p>
              <p class="mt-2 text-[11px] text-black/25">3天内到期的活跃合约</p>
            </div>

            <div class="pro-card p-5">
              <div class="flex items-center justify-between mb-3 text-black/45"><h3 class="text-xs font-medium uppercase tracking-wider">系统风险等级</h3><svg class="h-5 w-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
              <span :class="DELIVERY_RISK_LEVEL_CONFIG[filteredOverview.riskLevel].class" class="inline-flex items-center px-2 py-1 rounded text-xs font-medium border">{{ DELIVERY_RISK_LEVEL_CONFIG[filteredOverview.riskLevel].text }}</span>
              <p class="mt-2 text-[11px] text-black/25">基于全平台持仓分布计算</p>
            </div>
          </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="bg-white p-4 rounded border border-black/[0.06]"><p class="text-[11px] text-black/45 mb-1 uppercase">当前总持仓</p><p class="text-lg font-bold text-black/85 font-mono">${{ formatAmount(filteredOverview.totalPosition) }}</p></div>
              <div class="bg-white p-4 rounded border border-black/[0.06]"><p class="text-[11px] text-black/45 mb-1 uppercase">全场多空比</p><p class="text-lg font-bold text-black/85 font-mono">{{ filteredOverview.longShortRatio.toFixed(2) }}</p></div>
            </div>

            <section class="bg-white rounded-lg border border-black/[0.06] shadow-sm">
              <header class="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between"><h3 class="text-sm font-semibold text-black/85">交割合约明细</h3><button class="ant-btn ant-btn-link !text-xs">查看全部</button></header>
              <div class="overflow-x-auto">
                <table class="ant-table">
                  <thead class="ant-table-thead">
                    <tr>
                      <th>合约名称</th>
                      <th class="text-center">交割时间</th>
                      <th class="text-center">状态</th>
                      <th class="text-right">总持仓</th>
                      <th class="text-right">多空比</th>
                      <th class="text-right">平台盈亏</th>
                      <th class="text-center">风险</th>
                    </tr>
                  </thead>
                  <tbody class="ant-table-tbody">
                    <tr v-for="contract in filteredContracts" :key="contract.symbol" class="group transition-all hover:bg-black/[0.01]">
                      <td>
                        <div class="text-sm font-medium text-black/85">{{ contract.name }}</div>
                        <span :class="DELIVERY_CYCLE_TYPE_CONFIG[contract.cycleType].class" class="inline-flex items-center px-1.5 py-0.5 mt-1 rounded text-[10px] font-medium">{{ DELIVERY_CYCLE_TYPE_CONFIG[contract.cycleType].text }}</span>
                      </td>
                      <td class="text-center">
                        <div class="text-sm text-black/85 font-mono">{{ contract.expiryDate.split(' ')[0] }}</div>
                        <div class="text-[11px] text-black/25">{{ contract.daysToExpiry }}天后</div>
                      </td>
                      <td class="text-center">
                        <span :class="DELIVERY_CONTRACT_STATUS_CONFIG[contract.status].class" class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium">{{ DELIVERY_CONTRACT_STATUS_CONFIG[contract.status].text }}</span>
                      </td>
                      <td class="text-right">
                        <div class="text-sm font-medium text-black/85 font-mono">${{ formatAmount(contract.position) }}</div>
                        <div class="text-[11px] text-black/45 font-mono">L: ${{ formatAmount(contract.longPosition) }} / S: ${{ formatAmount(contract.shortPosition) }}</div>
                      </td>
                      <td class="text-right font-mono text-sm">{{ contract.longShortRatio.toFixed(2) }}</td>
                      <td class="text-right font-mono text-sm" :class="contract.platformPnl24h >= 0 ? 'text-emerald-500' : 'text-rose-500'">{{ formatCurrency(contract.platformPnl24h) }}</td>
                      <td class="text-center"><span :class="DELIVERY_RISK_LEVEL_CONFIG[contract.riskLevel].class" class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border">{{ DELIVERY_RISK_LEVEL_CONFIG[contract.riskLevel].text }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <!-- 持仓分析 -->
          <div v-show="activeTab === 'position'" class="space-y-6">
            <section class="bg-white rounded-lg border border-black/[0.06] shadow-sm">
              <header class="px-6 py-4 border-b border-black/[0.06]"><h3 class="text-sm font-semibold text-black/85">持仓到期分布</h3></header>
              <div class="overflow-x-auto">
                <table class="ant-table">
                  <thead class="ant-table-thead">
                    <tr>
                      <th>到期范围</th>
                      <th class="text-right">多头人数</th>
                      <th class="text-right">空头人数</th>
                      <th class="text-right">多头持仓</th>
                      <th class="text-right">空头持仓</th>
                      <th class="text-right">净持仓 (Delta)</th>
                    </tr>
                  </thead>
                  <tbody class="ant-table-tbody">
                    <tr v-for="item in deliveryExpiryDistribution" :key="item.range" class="hover:bg-black/[0.01]">
                      <td class="text-sm font-medium text-black/85">{{ item.range }}</td>
                      <td class="text-right font-mono text-black/45">{{ item.longCount }}</td>
                      <td class="text-right font-mono text-black/45">{{ item.shortCount }}</td>
                      <td class="text-right font-mono text-emerald-500">${{ formatAmount(item.longVolume) }}</td>
                      <td class="text-right font-mono text-rose-500">${{ formatAmount(item.shortVolume) }}</td>
                      <td class="text-right font-mono font-medium" :class="(item.longVolume - item.shortVolume) >= 0 ? 'text-emerald-500' : 'text-rose-500'">{{ formatCurrency(item.longVolume - item.shortVolume) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <!-- 盈亏分析 -->
          <div v-show="activeTab === 'pnl'" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section class="bg-white rounded-lg border border-black/[0.06] shadow-sm p-6">
                <h3 class="text-sm font-semibold text-black/85 mb-6">用户盈亏分布图</h3>
                <div class="space-y-4">
                  <div v-for="item in deliveryPnlDistribution" :key="item.range" class="space-y-1.5">
                    <div class="flex items-center justify-between text-[11px]"><span class="text-black/85">{{ item.range }}</span><span class="text-black/45">{{ item.count }} 人 ({{ item.percentage.toFixed(1) }}%)</span></div>
                    <div class="flex items-center gap-4">
                      <div class="flex-1 h-1.5 bg-black/[0.04] rounded-full overflow-hidden">
                        <div :class="item.totalPnl >= 0 ? 'bg-emerald-500' : 'bg-rose-500'" class="h-full rounded-full transition-all" :style="{ width: `${item.percentage * 2}%` }"></div>
                      </div>
                      <span :class="item.totalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'" class="text-xs font-mono font-medium min-w-[70px] text-right">{{ formatCurrency(item.totalPnl) }}</span>
                    </div>
                  </div>
                </div>
              </section>

              <section class="bg-white rounded-lg border border-black/[0.06] shadow-sm p-6 flex flex-col justify-center gap-6">
                <div class="p-4 bg-black/[0.01] rounded-lg border border-black/[0.03] flex items-center justify-between">
                  <div class="flex items-center gap-3"><div class="w-2 h-2 rounded-full bg-emerald-500"></div><span class="text-sm text-black/45">平台盈利 (结算)</span></div>
                  <span class="text-xl font-bold text-emerald-500 font-mono">{{ formatCurrency(filteredOverview.platformPnl24h) }}</span>
                </div>
                <div class="p-4 bg-black/[0.01] rounded-lg border border-black/[0.03] flex items-center justify-between">
                  <div class="flex items-center gap-3"><div class="w-2 h-2 rounded-full bg-rose-500"></div><span class="text-sm text-black/45">用户亏损 (返还)</span></div>
                  <span class="text-xl font-bold text-rose-500 font-mono">{{ formatCurrency(filteredOverview.userPnl24h) }}</span>
                </div>
                <div class="p-4 bg-black/[0.01] rounded-lg border border-black/[0.03] flex items-center justify-between">
                  <div class="flex items-center gap-3"><div class="w-2 h-2 rounded-full bg-antd-primary"></div><span class="text-sm text-black/45">盈利用户占比</span></div>
                  <span class="text-xl font-bold text-black/85 font-mono">{{ ((deliveryPnlDistribution.filter(d => d.range.includes('盈利')).reduce((sum, d) => sum + d.count, 0) / deliveryPnlDistribution.reduce((sum, d) => sum + d.count, 0)) * 100).toFixed(1) }}%</span>
                </div>
              </section>
            </div>
          </div>

          <!-- 风险监控 -->
          <div v-show="activeTab === 'risk'" class="space-y-6">
            <section class="bg-white rounded-lg border border-black/[0.06] shadow-sm">
              <header class="px-6 py-4 border-b border-black/[0.06]"><h3 class="text-sm font-semibold text-black/85">大户异常监控</h3></header>
              <div class="overflow-x-auto">
                <table class="ant-table">
                  <thead class="ant-table-thead">
                    <tr>
                      <th>用户信息</th>
                      <th class="text-center">账号类型</th>
                      <th class="text-right">总持仓</th>
                      <th class="text-right">24h 盈亏</th>
                      <th class="text-right">临期敞口</th>
                      <th>主要合约</th>
                      <th class="text-center">风险等级</th>
                    </tr>
                  </thead>
                  <tbody class="ant-table-tbody">
                    <tr v-for="whale in paginatedWhalesList" :key="whale.userId" class="hover:bg-black/[0.01]">
                      <td><div class="text-sm font-medium text-black/85">{{ whale.username }}</div><div class="text-[11px] text-black/45 font-mono">{{ whale.userId }}</div></td>
                      <td class="text-center"><span :class="DELIVERY_USER_TYPE_CONFIG[whale.type].class" class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium">{{ DELIVERY_USER_TYPE_CONFIG[whale.type].icon }} {{ DELIVERY_USER_TYPE_CONFIG[whale.type].text }}</span></td>
                      <td class="text-right"><div class="text-sm font-medium text-black/85 font-mono">${{ formatAmount(whale.totalPosition) }}</div><div class="text-[11px] text-black/45 font-mono">L: ${{ formatAmount(whale.longPosition) }} / S: ${{ formatAmount(whale.shortPosition) }}</div></td>
                      <td class="text-right"><div :class="whale.pnl24h >= 0 ? 'text-emerald-500' : 'text-rose-500'" class="text-sm font-medium font-mono">{{ formatCurrency(whale.pnl24h) }}</div><div :class="whale.pnlRate >= 0 ? 'text-emerald-500' : 'text-rose-500'" class="text-[11px] font-mono">{{ whale.pnlRate >= 0 ? '+' : '' }}{{ whale.pnlRate.toFixed(1) }}%</div></td>
                      <td class="text-right font-mono text-sm font-medium">${{ formatAmount(whale.nearExpiryPositions) }}</td>
                      <td><div class="flex flex-wrap gap-1"><span v-for="contract in whale.contracts.slice(0, 2)" :key="contract" class="text-[10px] text-black/45 bg-black/[0.02] px-1.5 py-0.5 rounded border border-black/[0.05]">{{ contract }}</span><span v-if="whale.contracts.length > 2" class="text-[10px] text-black/25">+{{ whale.contracts.length - 2 }}</span></div></td>
                      <td class="text-center"><span :class="DELIVERY_RISK_LEVEL_CONFIG[whale.riskLevel].class" class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border">{{ DELIVERY_RISK_LEVEL_CONFIG[whale.riskLevel].text }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <footer v-if="whalesTotalPages > 1" class="px-6 py-4 border-t border-black/[0.06] flex items-center justify-center gap-4">
                <button @click="whalesCurrentPage = Math.max(1, whalesCurrentPage - 1)" :disabled="whalesCurrentPage === 1" class="ant-btn !py-1 !px-3 disabled:opacity-30">上一页</button>
                <span class="text-xs text-black/45">第 {{ whalesCurrentPage }} / {{ whalesTotalPages }} 页</span>
                <button @click="whalesCurrentPage = Math.min(whalesTotalPages, whalesCurrentPage + 1)" :disabled="whalesCurrentPage === whalesTotalPages" class="ant-btn !py-1 !px-3 disabled:opacity-30">下一页</button>
              </footer>
            </section>
          </div>

          <!-- 自动化规则效果 -->
          <div v-show="activeTab === 'auto-rules'" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div class="bg-white p-5 rounded-lg border border-black/[0.06] shadow-sm"><div class="flex items-center justify-between mb-3 text-black/45"><h3 class="text-xs font-medium uppercase tracking-wider">24h 触发次数</h3><svg class="h-5 w-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div><p class="text-2xl font-bold text-black/85 font-mono">{{ deliveryAutoRuleStats.totalTriggers24h }}</p><p class="mt-2 text-[11px] text-black/25">成功: {{ deliveryAutoRuleStats.successTriggers }} / 失败: {{ deliveryAutoRuleStats.failedTriggers }}</p></div>
              <div class="bg-white p-5 rounded-lg border border-black/[0.06] shadow-sm"><div class="flex items-center justify-between mb-3 text-black/45"><h3 class="text-xs font-medium uppercase tracking-wider">规则总影响</h3><svg class="h-5 w-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><p class="text-2xl font-bold text-emerald-500 font-mono">{{ formatCurrency(deliveryAutoRuleStats.totalImpact24h) }}</p><p class="mt-2 text-[11px] text-black/25">平台盈利净增额 (24h)</p></div>
              <div class="bg-white p-5 rounded-lg border border-black/[0.06] shadow-sm"><div class="flex items-center justify-between mb-3 text-black/45"><h3 class="text-xs font-medium uppercase tracking-wider">启用规则数</h3><svg class="h-5 w-5 text-antd-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div><p class="text-2xl font-bold text-black/85 font-mono">{{ deliveryAutoRuleStats.activeRules }}</p><p class="mt-2 text-[11px] text-black/25">总规则数: {{ deliveryAutoRuleStats.totalRules }}</p></div>
              <div class="bg-white p-5 rounded-lg border border-black/[0.06] shadow-sm"><div class="flex items-center justify-between mb-3 text-black/45"><h3 class="text-xs font-medium uppercase tracking-wider">执行成功率</h3><svg class="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><p class="text-2xl font-bold text-black/85 font-mono">{{ ((deliveryAutoRuleStats.successTriggers / deliveryAutoRuleStats.totalTriggers24h) * 100).toFixed(1) }}%</p><p class="mt-2 text-[11px] text-black/25">24小时规则运行健康度</p></div>
            </div>

            <section class="bg-white rounded-lg border border-black/[0.06] shadow-sm">
              <header class="px-6 py-4 border-b border-black/[0.06]"><h3 class="text-sm font-semibold text-black/85">规则性能排行榜</h3></header>
              <div class="overflow-x-auto">
                <table class="ant-table">
                  <thead class="ant-table-thead">
                    <tr>
                      <th>规则名称</th>
                      <th class="text-right">触发次数</th>
                      <th class="text-right">成功率</th>
                      <th class="text-right">总影响</th>
                      <th class="text-right">平均影响</th>
                      <th>最近触发</th>
                    </tr>
                  </thead>
                  <tbody class="ant-table-tbody">
                    <tr v-for="rule in deliveryAutoRuleStats.rulePerformance" :key="rule.ruleId" class="hover:bg-black/[0.01]">
                      <td><div class="text-sm font-medium text-black/85">{{ rule.ruleName }}</div><div class="text-[11px] text-black/45 font-mono">{{ rule.ruleId }}</div></td>
                      <td class="text-right font-mono text-sm">{{ rule.triggers }}</td>
                      <td class="text-right font-mono text-sm" :class="rule.successRate >= 95 ? 'text-emerald-500' : 'text-amber-500'">{{ rule.successRate.toFixed(1) }}%</td>
                      <td class="text-right font-mono text-sm text-emerald-500 font-medium">{{ formatCurrency(rule.totalImpact) }}</td>
                      <td class="text-right font-mono text-sm text-black/45">{{ formatCurrency(rule.avgImpact) }}</td>
                      <td class="text-xs text-black/45">{{ rule.lastTrigger }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section class="bg-white rounded-lg border border-black/[0.06] shadow-sm">
                <header class="px-6 py-4 border-b border-black/[0.06]"><h3 class="text-sm font-semibold text-black/85">操作类型分布</h3></header>
                <div class="overflow-x-auto">
                  <table class="ant-table">
                    <thead class="ant-table-thead">
                      <tr>
                        <th>类型</th>
                        <th class="text-right">次数</th>
                        <th class="text-right">影响</th>
                      </tr>
                    </thead>
                    <tbody class="ant-table-tbody">
                      <tr v-for="item in deliveryAutoRuleStats.actionsByType" :key="item.action">
                        <td><span :class="DELIVERY_RULE_ACTION_CONFIG[item.action]?.class || 'bg-black/5 text-black/45'" class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium">{{ DELIVERY_RULE_ACTION_CONFIG[item.action]?.text || item.action }}</span></td>
                        <td class="text-right font-mono text-sm">{{ item.count }}</td>
                        <td class="text-right font-mono text-sm" :class="item.impact >= 0 ? 'text-emerald-500' : 'text-rose-500'">{{ formatCurrency(item.impact) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section class="bg-white rounded-lg border border-black/[0.06] shadow-sm p-6">
                <h3 class="text-sm font-semibold text-black/85 mb-4">规则应用效果对比</h3>
                <div class="space-y-4">
                  <div v-for="item in deliveryAutoRuleEffectComparison" :key="item.contract" class="p-4 border border-black/[0.06] rounded-lg bg-black/[0.01]">
                    <div class="flex items-center justify-between mb-3"><h4 class="text-sm font-bold text-black/85">{{ item.contract }}</h4><span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">改善 {{ formatCurrency(item.improvement) }}</span></div>
                    <div class="grid grid-cols-2 gap-4 text-[11px]">
                      <div class="space-y-1"><p class="text-black/25 mb-1">规则启用前</p><div class="flex justify-between"><span>平台盈亏:</span><span :class="item.beforeRules.platformPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'">{{ formatCurrency(item.beforeRules.platformPnl) }}</span></div><div class="flex justify-between"><span>风险等级:</span><span :class="DELIVERY_RISK_LEVEL_CONFIG[item.beforeRules.riskLevel].class" class="px-1.5 py-0.5 rounded">{{ DELIVERY_RISK_LEVEL_CONFIG[item.beforeRules.riskLevel].text }}</span></div></div>
                      <div class="space-y-1"><p class="text-black/25 mb-1">规则启用后</p><div class="flex justify-between"><span>平台盈亏:</span><span :class="item.afterRules.platformPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'">{{ formatCurrency(item.afterRules.platformPnl) }}</span></div><div class="flex justify-between"><span>风险等级:</span><span :class="DELIVERY_RISK_LEVEL_CONFIG[item.afterRules.riskLevel].class" class="px-1.5 py-0.5 rounded">{{ DELIVERY_RISK_LEVEL_CONFIG[item.afterRules.riskLevel].text }}</span></div></div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
    </article>
  </section>
</template>
