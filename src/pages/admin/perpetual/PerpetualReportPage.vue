<script setup>
// 线控决策报表 — Ant Design Pro report page (2026-11-28): PageShell without h1, a filter Card (searchable 合约 select,
// 时间 radio buttons, RangePicker for 自定义; 刷新/导出 on the right), a Card tab list for the four sections, Statistic rows
// instead of gradient KPI tiles, Ant Tables with built-in pagination, Progress bars for the P&L distribution, and the
// 要点 notes as a small KeyPoints block. The hidden (v-if="false") 操作建议 / 风险预警 blocks are no longer in the
// template; their computed data is kept. Fixes: 平台盈亏 was always green even when negative; 盈利/亏损用户占比 were
// hard-coded (26.4% / 32.4%) and disagreed with the distribution — they are now summed from pnlDistribution; the
// custom date inputs were plain text-like date inputs (now a RangePicker bound to customDateRange); export uses a toast.
import { ref, computed, watch, h } from 'vue'
import { Button, Card, Col, Form, FormItem, Progress, RadioGroup, RangePicker, Row, Select, Space, Statistic, Table, Tag, TypographyText, message } from 'ant-design-vue'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
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
  return `${sign}${formatAmount(value)}`
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
const cardTabs = tabs.map((tab) => ({ key: tab.id, tab: tab.name }))
const upColor = '#389e0d'
const downColor = '#cf1322'
const pnlColor = (value) => (Number(value) >= 0 ? upColor : downColor)
const customRange = computed({
  get: () => (customDateRange.value.start && customDateRange.value.end ? [customDateRange.value.start, customDateRange.value.end] : null),
  set: (value) => { customDateRange.value = { start: value?.[0] || '', end: value?.[1] || '' } }
})
const shareOf = (prefix) => pnlDistribution.filter((item) => item.range.startsWith(prefix)).reduce((sum, item) => sum + item.percentage, 0)
const profitUserShare = computed(() => shareOf('盈利'))
const lossUserShare = computed(() => shareOf('亏损'))
const contractColumns = [
  { key: 'contract', title: '合约', width: 180 },
  { key: 'volume', title: '24h 交易量（USDT）', width: 150, align: 'right' },
  { key: 'position', title: '持仓（USDT）', width: 200, align: 'right' },
  { key: 'ratio', title: '多空比', width: 90, align: 'right' },
  { key: 'pnl', title: '平台盈亏（USDT）', width: 150, align: 'right' },
  { key: 'control', title: '线控', width: 200 }
]
const leverageColumns = [
  { key: 'leverage', dataIndex: 'leverage', title: '杠杆区间', width: 110 },
  { key: 'longCount', dataIndex: 'longCount', title: '多头人数', width: 100, align: 'right' },
  { key: 'shortCount', dataIndex: 'shortCount', title: '空头人数', width: 100, align: 'right' },
  { key: 'longVolume', title: '多头持仓（USDT）', width: 150, align: 'right' },
  { key: 'shortVolume', title: '空头持仓（USDT）', width: 150, align: 'right' },
  { key: 'net', title: '净持仓（USDT）', width: 150, align: 'right' }
]
const whaleColumns = computed(() => [
  { key: 'user', title: '用户', width: 160 },
  ...(selectedContract.value === 'ALL' ? [{ key: 'contracts', title: '交易合约', width: 200 }] : []),
  { key: 'totalPosition', title: '总持仓（USDT）', width: 140, align: 'right' },
  { key: 'sides', title: '多头/空头（USDT）', width: 150, align: 'right' },
  { key: 'leverage', title: '杠杆', width: 80, align: 'right' },
  { key: 'pnl', title: '24h 盈亏（USDT）', width: 150, align: 'right' }
])
// 要点 notes: a small titled list under each section.
const KeyPoints = (props) => h('div', { class: 'report-points' }, [
  h(TypographyText, { strong: true }, () => '要点'),
  h('ul', props.items.map((item) => h('li', item)))
])
KeyPoints.props = ['items']

const refreshData = () => {
  console.log('刷新数据', { timeRange: timeRange.value, contract: selectedContract.value })
}

// 监听合约切换，重置页码
watch(selectedContract, () => {
  whalesCurrentPage.value = 1
  contractsCurrentPage.value = 1
})

// 导出报表
// Export is not implemented in the demo; say so with a toast (operation feedback is toast-only).
const exportReport = () => {
  message.info('导出报表功能待实现（演示环境不生成文件）')
}

// 打开风险评估帮助模态框
const openRiskHelpModal = () => {
  selectedRiskLevel.value = filteredOverview.value.riskLevel
  showRiskHelpModal.value = true
}
</script>

<template>
  <PageShell>
    <!--
      用途：把“线控调控”从全局决策切换到“按合约/按时间窗口”的精细化决策。
      - 合约=ALL：用于挑出需要重点干预的合约池（优先处理亏损/单边/高杠杆集中的合约）。
      - 合约=单一：用于落到具体参数（价格偏移/滑点/延迟/最大杠杆）和规则阈值的微调。
      - 时间范围：对应线控规则的时间窗（如 1/5/15min），用于判断触发是否“短时异常”还是“持续结构性风险”。
    -->
    <Card :bordered="false">
      <div class="report-filter-bar">
        <Form layout="inline" name="perpetual-report-filters" class="report-filter-form">
          <FormItem label="合约">
            <Select v-model:value="selectedContract" :options="contractOptions" show-search option-filter-prop="label" not-found-content="无匹配项" aria-label="合约" class="report-contract-select" />
          </FormItem>
          <FormItem label="时间">
            <RadioGroup v-model:value="timeRange" option-type="button" :options="REPORT_TIME_RANGE_OPTIONS" aria-label="时间范围" />
          </FormItem>
          <FormItem v-if="timeRange === REPORT_TIME_RANGE.CUSTOM" label="自定义日期">
            <RangePicker v-model:value="customRange" value-format="YYYY-MM-DD" :placeholder="['开始日期', '结束日期']" aria-label="自定义日期" />
          </FormItem>
        </Form>
        <Space :size="8">
          <Button @click="refreshData"><template #icon><ReloadOutlined /></template>刷新</Button>
          <Button type="primary" @click="exportReport"><template #icon><DownloadOutlined /></template>导出报表</Button>
        </Space>
      </div>
    </Card>

    <Card :bordered="false" :tab-list="cardTabs" :active-tab-key="activeTab" @tab-change="(key) => (activeTab = key)">
      <!-- 市场概览 -->
      <Space v-show="activeTab === 'overview'" direction="vertical" :size="24" class="report-block">
        <!--
          关键指标用于“是否需要启用/加码线控”的快速判定；次要指标（总持仓/多空比/平均杠杆）用于解释原因、校准参数。
          风险等级卡已隐藏，让运营人员根据数据自行判断（风险评估标准弹窗保留）。
        -->
        <Row :gutter="[24, 16]">
          <Col :xs="12" :xl="6"><Statistic title="24h 交易量（USDT）" :value="formatAmount(filteredOverview.totalVolume24h)" /></Col>
          <Col :xs="12" :xl="6"><Statistic title="平台盈亏（24h，USDT）" :value="formatCurrency(filteredOverview.platformPnl24h)" :value-style="{ color: pnlColor(filteredOverview.platformPnl24h) }" /></Col>
          <Col :xs="12" :xl="4"><Statistic title="总持仓（USDT）" :value="formatAmount(filteredOverview.totalPosition)" /></Col>
          <Col :xs="12" :xl="4"><Statistic title="多空比" :value="filteredOverview.longShortRatio.toFixed(2)" /></Col>
          <Col :xs="12" :xl="4"><Statistic title="平均杠杆" :value="`${filteredOverview.avgLeverage.toFixed(1)}x`" /></Col>
        </Row>
        <KeyPoints :items="reportModuleKeyPoints.overviewSecondary" />

        <!--
          这张表用于“找出需要优先调控的合约 + 复核线控是否已覆盖”：交易量判断重要性，持仓/多空比决定偏移方向，
          平台盈亏决定线控强度，线控状态/自动触发/规则数确认可执行性。
        -->
        <div>
          <div class="report-section-head">
            <TypographyText strong>{{ selectedContract === 'ALL' ? '各合约数据' : '合约详情' }}</TypographyText>
            <TypographyText v-if="selectedContract !== 'ALL'" type="secondary">当前仅显示 {{ contractOptions.find(c => c.value === selectedContract)?.label }} 的数据</TypographyText>
          </div>
          <Table :columns="contractColumns" :data-source="filteredContractsWithControl" row-key="symbol" size="middle" :scroll="{ x: 900 }" :locale="{ emptyText: '暂无合约数据' }" :pagination="{ current: contractsCurrentPage, pageSize: 10, showSizeChanger: false, hideOnSinglePage: true, showTotal: (total) => `共 ${total} 个合约`, onChange: (value) => (contractsCurrentPage = value) }">
            <template #bodyCell="{ column, record: contract }">
              <Space v-if="column.key === 'contract'" direction="vertical" :size="0">
                <TypographyText strong>{{ contract.name }}</TypographyText>
                <TypographyText type="secondary">{{ contract.symbol }}</TypographyText>
              </Space>
              <template v-else-if="column.key === 'volume'">{{ formatAmount(contract.volume24h) }}</template>
              <Space v-else-if="column.key === 'position'" direction="vertical" :size="0" align="end">
                <span>{{ formatAmount(contract.position) }}</span>
                <TypographyText type="secondary">多 {{ formatAmount(contract.longPosition) }} / 空 {{ formatAmount(contract.shortPosition) }}</TypographyText>
              </Space>
              <template v-else-if="column.key === 'ratio'">{{ contract.longShortRatio.toFixed(2) }}</template>
              <TypographyText v-else-if="column.key === 'pnl'" :type="contract.platformPnl24h >= 0 ? 'success' : 'danger'">{{ formatCurrency(contract.platformPnl24h) }}</TypographyText>
              <Tag v-else-if="column.key === 'control' && !contract.controlConfigured">未配置</Tag>
              <Space v-else-if="column.key === 'control'" direction="vertical" :size="4">
                <span>
                  <Tag :color="contract.controlRunning ? 'blue' : 'orange'">{{ contract.controlRunning ? '线控中' : '暂停' }}</Tag>
                  <Tag :color="contract.controlAutoTriggerEnabled ? 'purple' : 'default'">{{ contract.controlAutoTriggerEnabled ? '自动触发开' : '自动触发关' }}</Tag>
                </span>
                <TypographyText type="secondary">规则 {{ contract.controlEnabledRules }}/{{ contract.controlRuleCount }}</TypographyText>
              </Space>
            </template>
          </Table>
        </div>
        <KeyPoints :items="reportModuleKeyPoints.overviewContractsTable" />
      </Space>

      <!-- 持仓分析 -->
      <Space v-show="activeTab === 'position'" direction="vertical" :size="24" class="report-block">
        <!--
          用途：把“风险来自哪里”拆到不同杠杆层级：高杠杆层净持仓单边时优先降低最大杠杆/增加延迟/提高滑点；
          净持仓/占比阈值应参考主力杠杆区间的持仓量与人数分布，避免阈值过紧导致频繁触发。
        -->
        <TypographyText strong>持仓分布（按杠杆倍数）</TypographyText>
        <Table :columns="leverageColumns" :data-source="leverageDistribution" row-key="leverage" size="middle" :pagination="false" :scroll="{ x: 760 }">
          <template #bodyCell="{ column, record: item }">
            <template v-if="column.key === 'longVolume'">{{ formatAmount(item.longVolume) }}</template>
            <template v-else-if="column.key === 'shortVolume'">{{ formatAmount(item.shortVolume) }}</template>
            <TypographyText v-else-if="column.key === 'net'" :type="item.longVolume - item.shortVolume >= 0 ? 'success' : 'danger'">{{ formatCurrency(item.longVolume - item.shortVolume) }}</TypographyText>
            <template v-else>{{ item[column.key] }}</template>
          </template>
        </Table>
        <KeyPoints :items="reportModuleKeyPoints.positionLeverageDistribution" />
      </Space>

      <!-- 盈亏分析 -->
      <Row v-show="activeTab === 'pnl'" :gutter="[24, 24]">
        <Col :xs="24" :xl="12">
          <!-- 用途：识别“平台亏损来自少数用户还是整体结构”。 -->
          <Card title="用户盈亏分布" size="small">
            <Space direction="vertical" :size="12" class="report-block">
              <div v-for="item in pnlDistribution" :key="item.range">
                <div class="report-dist-row">
                  <span>{{ item.range }}</span>
                  <span>{{ item.count }} 人（{{ item.percentage.toFixed(1) }}%）<TypographyText :type="item.totalPnl >= 0 ? 'success' : 'danger'" class="report-dist-pnl">{{ formatCurrency(item.totalPnl) }}</TypographyText></span>
                </div>
                <Progress :percent="item.percentage" :show-info="false" :stroke-color="item.totalPnl >= 0 ? upColor : downColor" size="small" />
              </div>
            </Space>
            <KeyPoints :items="reportModuleKeyPoints.pnlUserDistribution" class="report-card-points" />
          </Card>
        </Col>
        <Col :xs="24" :xl="12">
          <!-- 用途：平台与用户盈亏是镜像关系，用来验证线控是否“把风险/收益拉回平台可控区间”。 -->
          <Card title="平台盈亏统计" size="small">
            <Row :gutter="[24, 16]">
              <Col :span="12"><Statistic title="平台盈亏（USDT）" :value="formatCurrency(filteredOverview.platformPnl24h)" :value-style="{ color: pnlColor(filteredOverview.platformPnl24h) }" /></Col>
              <Col :span="12"><Statistic title="用户盈亏（USDT）" :value="formatCurrency(filteredOverview.userPnl24h)" :value-style="{ color: pnlColor(filteredOverview.userPnl24h) }" /></Col>
              <Col :span="12"><Statistic title="盈利用户占比" :value="profitUserShare" :precision="1" suffix="%" /></Col>
              <Col :span="12"><Statistic title="亏损用户占比" :value="lossUserShare" :precision="1" suffix="%" /></Col>
            </Row>
            <KeyPoints :items="reportModuleKeyPoints.pnlPlatformStats" class="report-card-points" />
          </Card>
        </Col>
      </Row>

      <!-- 风险监控（风险预警事件流已隐藏，数据计算保留） -->
      <Space v-show="activeTab === 'risk'" direction="vertical" :size="24" class="report-block">
        <!-- 用途：把“风险/收益”落到用户维度，支撑精细化线控（特别是高频/大户/高盈利账户）。 -->
        <div class="report-section-head">
          <TypographyText strong>{{ selectedContract === 'ALL' ? '大户监控（全部合约）' : `大户监控（${contractOptions.find(c => c.value === selectedContract)?.label}）` }}</TypographyText>
          <TypographyText v-if="filteredWhalesList.length" type="secondary">共 {{ filteredWhalesList.length }} 个大户</TypographyText>
        </div>
        <Table :columns="whaleColumns" :data-source="filteredWhalesList" row-key="userId" size="middle" :scroll="{ x: 900 }" :locale="{ emptyText: '该合约暂无大户交易' }" :pagination="{ current: whalesCurrentPage, pageSize: 10, showSizeChanger: false, hideOnSinglePage: true, showTotal: (total) => `共 ${total} 个大户`, onChange: (value) => (whalesCurrentPage = value) }">
          <template #bodyCell="{ column, record: whale }">
            <Space v-if="column.key === 'user'" direction="vertical" :size="0">
              <span>{{ whale.username }}</span>
              <TypographyText type="secondary" class="font-mono">{{ whale.userId }}</TypographyText>
            </Space>
            <span v-else-if="column.key === 'contracts'"><Tag v-for="contract in whale.contracts" :key="contract">{{ contract }}</Tag></span>
            <template v-else-if="column.key === 'totalPosition'">{{ formatAmount(whale.totalPosition) }}</template>
            <Space v-else-if="column.key === 'sides'" direction="vertical" :size="0" align="end">
              <span>多 {{ formatAmount(whale.longPosition) }}</span>
              <span>空 {{ formatAmount(whale.shortPosition) }}</span>
            </Space>
            <template v-else-if="column.key === 'leverage'">{{ whale.leverage }}x</template>
            <Space v-else-if="column.key === 'pnl'" direction="vertical" :size="0" align="end">
              <TypographyText :type="whale.pnl24h >= 0 ? 'success' : 'danger'">{{ formatCurrency(whale.pnl24h) }}</TypographyText>
              <TypographyText :type="whale.pnlRate >= 0 ? 'success' : 'danger'">{{ whale.pnlRate >= 0 ? '+' : '' }}{{ whale.pnlRate.toFixed(2) }}%</TypographyText>
            </Space>
          </template>
        </Table>
        <KeyPoints :items="reportModuleKeyPoints.riskWhales" />
      </Space>
    </Card>

      <a-modal :wrap-props="{ 'aria-modal': true }" transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :open="Boolean(showRiskHelpModal)" :mask-closable="false" :closable="false" :keyboard="true" :width="1024" :footer="null" :destroy-on-close="true" wrap-class-name="admin-trading-modal" :body-style="{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 180px)' }" @cancel="showRiskHelpModal = false">
<template #title><template v-if="showRiskHelpModal"><div class="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
            <div class="flex items-center gap-3">
              <svg class="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 class="text-lg font-semibold text-slate-900">风险评估标准</h3>
            </div>
            <a-button aria-label="关闭" type="text"
              @click="showRiskHelpModal = false"
              class="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </a-button>
          </div></template></template>
<template v-if="showRiskHelpModal">

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
                <a-button type="text"
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
                </a-button>
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
        </template>

</a-modal>
  </PageShell>
</template>

<style scoped>
.report-filter-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px}
.report-filter-form{row-gap:12px}
.report-contract-select{width:200px}
.report-block{width:100%}
.report-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.report-dist-row{display:flex;justify-content:space-between;gap:12px}
.report-dist-pnl{display:inline-block;min-width:88px;margin-left:12px;text-align:right}
.report-card-points{margin-top:16px}
.report-points ul{margin:4px 0 0;padding-left:20px;list-style:disc}
</style>
