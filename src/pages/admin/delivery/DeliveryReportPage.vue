<script setup>
// 场控决策报表 — report page on the Ant Design Pro shell (2026-11-28): filter card, Ant Tabs, Statistics and Ant
// tables with text Tags. Refresh/export give toast feedback (the old export used a native alert).
import { ref, computed, watch } from 'vue'
import { Button, Card, Col, Descriptions, DescriptionsItem, Form, FormItem, Progress, RangePicker, Row, Select, Space, Statistic, Table, TabPane, Tabs, Tag, TypographyText, message } from 'ant-design-vue'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
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
const customDateRange = ref(null)

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
  { id: 'overview', name: '市场概览' },
  { id: 'position', name: '持仓分析' },
  { id: 'pnl', name: '盈亏分析' },
  { id: 'risk', name: '风险监控' },
  { id: 'auto-rules', name: '自动化效果' }
]

// Config objects name Tailwind palette colours; map them onto Ant Tag preset colours.
const TAG_COLORS = { emerald: 'green', amber: 'gold', orange: 'orange', rose: 'red', blue: 'blue', slate: 'default' }
const tagColor = (config) => TAG_COLORS[config?.color] || 'default'
// actionsByType still reports legacy action types that DELIVERY_RULE_ACTION_CONFIG no longer lists.
const LEGACY_ACTION_LABELS = { price_adjust: '价格调整', reject_order: '订单拒绝', limit_position: '仓位限制' }
const actionLabel = (action) => DELIVERY_RULE_ACTION_CONFIG[action]?.text || LEGACY_ACTION_LABELS[action] || action

const profitableUserShare = computed(() => {
  const total = deliveryPnlDistribution.reduce((sum, d) => sum + d.count, 0)
  const profitable = deliveryPnlDistribution.filter(d => d.range.includes('盈利')).reduce((sum, d) => sum + d.count, 0)
  return total ? ((profitable / total) * 100).toFixed(1) : '0.0'
})
const ruleSuccessRate = computed(() => (deliveryAutoRuleStats.totalTriggers24h
  ? ((deliveryAutoRuleStats.successTriggers / deliveryAutoRuleStats.totalTriggers24h) * 100).toFixed(1)
  : '0.0'))

const contractColumns = [
  { key: 'name', title: '合约名称', width: 160 },
  { key: 'expiry', title: '交割时间', width: 130 },
  { key: 'status', title: '状态', width: 100 },
  { key: 'position', title: '总持仓（USD）', width: 220, align: 'right' },
  { key: 'ratio', title: '多空比', width: 90, align: 'right' },
  { key: 'pnl', title: '平台盈亏（USD）', width: 140, align: 'right' },
  { key: 'risk', title: '风险', width: 100 }
]
const expiryColumns = [
  { key: 'range', dataIndex: 'range', title: '到期范围', width: 140 },
  { key: 'longCount', dataIndex: 'longCount', title: '多头人数', width: 100, align: 'right' },
  { key: 'shortCount', dataIndex: 'shortCount', title: '空头人数', width: 100, align: 'right' },
  { key: 'longVolume', title: '多头持仓（USD）', width: 150, align: 'right' },
  { key: 'shortVolume', title: '空头持仓（USD）', width: 150, align: 'right' },
  { key: 'delta', title: '净持仓 Delta（USD）', width: 170, align: 'right' }
]
const whaleColumns = [
  { key: 'user', title: '用户信息', width: 160 },
  { key: 'type', title: '账号类型', width: 100 },
  { key: 'position', title: '总持仓（USD）', width: 220, align: 'right' },
  { key: 'pnl', title: '24h 盈亏（USD）', width: 140, align: 'right' },
  { key: 'nearExpiry', title: '临期敞口（USD）', width: 140, align: 'right' },
  { key: 'contracts', title: '主要合约', width: 200 },
  { key: 'risk', title: '风险等级', width: 100 }
]
const rulePerformanceColumns = [
  { key: 'rule', title: '规则名称', width: 220 },
  { key: 'triggers', dataIndex: 'triggers', title: '触发次数', width: 100, align: 'right' },
  { key: 'successRate', title: '成功率', width: 100, align: 'right' },
  { key: 'totalImpact', title: '总影响（USD）', width: 140, align: 'right' },
  { key: 'avgImpact', title: '平均影响（USD）', width: 140, align: 'right' },
  { key: 'lastTrigger', dataIndex: 'lastTrigger', title: '最近触发', width: 170 }
]
const actionColumns = [
  { key: 'action', title: '类型', width: 140 },
  { key: 'count', dataIndex: 'count', title: '次数', width: 90, align: 'right' },
  { key: 'impact', title: '影响（USD）', width: 140, align: 'right' }
]

// 刷新数据（演示数据为静态 Mock）
const refreshData = () => {
  message.success('报表已刷新（演示数据）')
}

// 监听合约切换，重置页码
watch(selectedContract, () => {
  whalesCurrentPage.value = 1
})

// 导出报表
const exportReport = () => {
  message.info('导出报表功能待实现（演示环境不生成文件）')
}
</script>

<template>
  <PageShell>
    <Card :bordered="false">
      <Form layout="inline" class="report-filters">
        <FormItem label="合约">
          <Select v-model:value="selectedContract" :options="contractOptions" show-search option-filter-prop="label" not-found-content="无匹配项" aria-label="合约" class="report-select" />
        </FormItem>
        <FormItem label="统计周期">
          <Select v-model:value="timeRange" :options="DELIVERY_REPORT_TIME_RANGE_OPTIONS" aria-label="统计周期" class="report-select" />
        </FormItem>
        <FormItem v-if="timeRange === DELIVERY_REPORT_TIME_RANGE.CUSTOM" label="自定义日期">
          <RangePicker v-model:value="customDateRange" value-format="YYYY-MM-DD" :placeholder="['开始日期', '结束日期']" aria-label="自定义日期" />
        </FormItem>
        <FormItem class="report-actions">
          <Space :size="8">
            <Button @click="refreshData"><template #icon><ReloadOutlined /></template>刷新</Button>
            <Button @click="exportReport"><template #icon><DownloadOutlined /></template>导出报表</Button>
          </Space>
        </FormItem>
      </Form>
    </Card>

    <Card :bordered="false" :body-style="{ paddingTop: '8px' }">
      <Tabs v-model:active-key="activeTab">
        <TabPane v-for="tab in tabs" :key="tab.id" :tab="tab.name" />
      </Tabs>

      <div v-show="activeTab === 'overview'" class="report-section">
        <Row :gutter="[24, 24]">
          <Col :xs="12" :xl="8" :xxl="4"><Statistic title="24h 交易量（USDT）" :value="`$${formatAmount(filteredOverview.totalVolume24h)}`" /></Col>
          <Col :xs="12" :xl="8" :xxl="4"><Statistic title="平台总盈亏（24h）" :value="formatCurrency(filteredOverview.platformPnl24h)" /></Col>
          <Col :xs="12" :xl="8" :xxl="4"><Statistic title="临近交割（3 天内）" :value="filteredOverview.nearExpiryContracts" /></Col>
          <Col :xs="12" :xl="8" :xxl="4"><Statistic title="当前总持仓" :value="`$${formatAmount(filteredOverview.totalPosition)}`" /></Col>
          <Col :xs="12" :xl="8" :xxl="4"><Statistic title="全场多空比" :value="filteredOverview.longShortRatio.toFixed(2)" /></Col>
          <Col :xs="12" :xl="8" :xxl="4">
            <div class="report-stat-title">系统风险等级</div>
            <Tag :color="tagColor(DELIVERY_RISK_LEVEL_CONFIG[filteredOverview.riskLevel])">{{ DELIVERY_RISK_LEVEL_CONFIG[filteredOverview.riskLevel]?.text }}</Tag>
            <div><TypographyText type="secondary">基于全平台持仓分布计算</TypographyText></div>
          </Col>
        </Row>

        <Card size="small" title="交割合约明细">
          <Table size="middle" :pagination="false" :columns="contractColumns" :data-source="filteredContracts" row-key="symbol" :scroll="{ x: 960 }">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <div>{{ record.name }}</div>
                <Tag>{{ DELIVERY_CYCLE_TYPE_CONFIG[record.cycleType]?.text || record.cycleType }}</Tag>
              </template>
              <template v-else-if="column.key === 'expiry'">
                <div class="font-mono">{{ record.expiryDate.split(' ')[0] }}</div>
                <TypographyText type="secondary">{{ record.daysToExpiry }} 天后</TypographyText>
              </template>
              <Tag v-else-if="column.key === 'status'" :color="tagColor(DELIVERY_CONTRACT_STATUS_CONFIG[record.status])">{{ DELIVERY_CONTRACT_STATUS_CONFIG[record.status]?.text || record.status }}</Tag>
              <template v-else-if="column.key === 'position'">
                <div class="font-mono">${{ formatAmount(record.position) }}</div>
                <TypographyText type="secondary" class="font-mono">多 ${{ formatAmount(record.longPosition) }} / 空 ${{ formatAmount(record.shortPosition) }}</TypographyText>
              </template>
              <span v-else-if="column.key === 'ratio'" class="font-mono">{{ record.longShortRatio.toFixed(2) }}</span>
              <TypographyText v-else-if="column.key === 'pnl'" :type="record.platformPnl24h >= 0 ? 'success' : 'danger'" class="font-mono">{{ formatCurrency(record.platformPnl24h) }}</TypographyText>
              <Tag v-else-if="column.key === 'risk'" :color="tagColor(DELIVERY_RISK_LEVEL_CONFIG[record.riskLevel])">{{ DELIVERY_RISK_LEVEL_CONFIG[record.riskLevel]?.text }}</Tag>
            </template>
          </Table>
        </Card>
      </div>

      <!-- 持仓分析 -->
      <div v-show="activeTab === 'position'" class="report-section">
        <Card size="small" title="持仓到期分布">
          <Table size="middle" :pagination="false" :columns="expiryColumns" :data-source="deliveryExpiryDistribution" row-key="range" :scroll="{ x: 820 }">
            <template #bodyCell="{ column, record }">
              <span v-if="column.key === 'longVolume'" class="font-mono">${{ formatAmount(record.longVolume) }}</span>
              <span v-else-if="column.key === 'shortVolume'" class="font-mono">${{ formatAmount(record.shortVolume) }}</span>
              <TypographyText v-else-if="column.key === 'delta'" :type="(record.longVolume - record.shortVolume) >= 0 ? 'success' : 'danger'" class="font-mono">{{ formatCurrency(record.longVolume - record.shortVolume) }}</TypographyText>
            </template>
          </Table>
        </Card>
      </div>

      <!-- 盈亏分析 -->
      <div v-show="activeTab === 'pnl'" class="report-section">
        <Row :gutter="[24, 24]">
          <Col :xs="24" :xl="12">
            <Card size="small" title="用户盈亏分布">
              <div v-for="item in deliveryPnlDistribution" :key="item.range" class="pnl-row">
                <div class="pnl-row__head">
                  <span>{{ item.range }}</span>
                  <TypographyText type="secondary">{{ item.count }} 人（{{ item.percentage.toFixed(1) }}%）</TypographyText>
                </div>
                <div class="pnl-row__bar">
                  <Progress :percent="Math.min(100, item.percentage * 2)" :show-info="false" :status="item.totalPnl >= 0 ? 'success' : 'exception'" />
                  <TypographyText :type="item.totalPnl >= 0 ? 'success' : 'danger'" class="font-mono pnl-row__value">{{ formatCurrency(item.totalPnl) }}</TypographyText>
                </div>
              </div>
            </Card>
          </Col>
          <Col :xs="24" :xl="12">
            <Card size="small" title="盈亏汇总">
              <Row :gutter="[24, 24]">
                <Col :span="12"><Statistic title="平台盈利（结算）" :value="formatCurrency(filteredOverview.platformPnl24h)" /></Col>
                <Col :span="12"><Statistic title="用户亏损（返还）" :value="formatCurrency(filteredOverview.userPnl24h)" /></Col>
                <Col :span="12"><Statistic title="盈利用户占比" :value="profitableUserShare" suffix="%" /></Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </div>

      <!-- 风险监控 -->
      <div v-show="activeTab === 'risk'" class="report-section">
        <Card size="small" title="大户异常监控">
          <Table size="middle" :columns="whaleColumns" :data-source="filteredWhalesList" row-key="userId" :scroll="{ x: 1100 }" :locale="{ emptyText: '暂无记录' }"
            :pagination="{ current: whalesCurrentPage, pageSize: whalesPageSize, total: filteredWhalesList.length, showSizeChanger: false, showTotal: (total) => `共 ${total} 条`, onChange: (value) => { whalesCurrentPage = value } }">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'user'">
                <div>{{ record.username }}</div>
                <TypographyText type="secondary" class="font-mono">{{ record.userId }}</TypographyText>
              </template>
              <Tag v-else-if="column.key === 'type'">{{ DELIVERY_USER_TYPE_CONFIG[record.type]?.text || record.type }}</Tag>
              <template v-else-if="column.key === 'position'">
                <div class="font-mono">${{ formatAmount(record.totalPosition) }}</div>
                <TypographyText type="secondary" class="font-mono">多 ${{ formatAmount(record.longPosition) }} / 空 ${{ formatAmount(record.shortPosition) }}</TypographyText>
              </template>
              <template v-else-if="column.key === 'pnl'">
                <div><TypographyText :type="record.pnl24h >= 0 ? 'success' : 'danger'" class="font-mono">{{ formatCurrency(record.pnl24h) }}</TypographyText></div>
                <TypographyText :type="record.pnlRate >= 0 ? 'success' : 'danger'" class="font-mono">{{ record.pnlRate >= 0 ? '+' : '' }}{{ record.pnlRate.toFixed(1) }}%</TypographyText>
              </template>
              <span v-else-if="column.key === 'nearExpiry'" class="font-mono">${{ formatAmount(record.nearExpiryPositions) }}</span>
              <Space v-else-if="column.key === 'contracts'" :size="[4, 4]" wrap>
                <Tag v-for="contract in record.contracts.slice(0, 2)" :key="contract">{{ contract }}</Tag>
                <TypographyText v-if="record.contracts.length > 2" type="secondary">+{{ record.contracts.length - 2 }}</TypographyText>
              </Space>
              <Tag v-else-if="column.key === 'risk'" :color="tagColor(DELIVERY_RISK_LEVEL_CONFIG[record.riskLevel])">{{ DELIVERY_RISK_LEVEL_CONFIG[record.riskLevel]?.text }}</Tag>
            </template>
          </Table>
        </Card>
      </div>

      <!-- 自动化规则效果 -->
      <div v-show="activeTab === 'auto-rules'" class="report-section">
        <Row :gutter="[24, 24]">
          <Col :xs="12" :xl="6">
            <Statistic title="24h 触发次数" :value="deliveryAutoRuleStats.totalTriggers24h" />
            <TypographyText type="secondary">成功 {{ deliveryAutoRuleStats.successTriggers }} / 失败 {{ deliveryAutoRuleStats.failedTriggers }}</TypographyText>
          </Col>
          <Col :xs="12" :xl="6">
            <Statistic title="规则总影响（24h）" :value="formatCurrency(deliveryAutoRuleStats.totalImpact24h)" />
            <TypographyText type="secondary">平台盈利净增额</TypographyText>
          </Col>
          <Col :xs="12" :xl="6">
            <Statistic title="启用规则数" :value="deliveryAutoRuleStats.activeRules" />
            <TypographyText type="secondary">总规则数 {{ deliveryAutoRuleStats.totalRules }}</TypographyText>
          </Col>
          <Col :xs="12" :xl="6">
            <Statistic title="执行成功率" :value="ruleSuccessRate" suffix="%" />
            <TypographyText type="secondary">24 小时规则运行健康度</TypographyText>
          </Col>
        </Row>

        <Card size="small" title="规则性能排行榜">
          <Table size="middle" :pagination="false" :columns="rulePerformanceColumns" :data-source="deliveryAutoRuleStats.rulePerformance" row-key="ruleId" :scroll="{ x: 900 }">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'rule'">
                <div>{{ record.ruleName }}</div>
                <TypographyText type="secondary" class="font-mono">{{ record.ruleId }}</TypographyText>
              </template>
              <TypographyText v-else-if="column.key === 'successRate'" :type="record.successRate >= 95 ? 'success' : 'warning'" class="font-mono">{{ record.successRate.toFixed(1) }}%</TypographyText>
              <span v-else-if="column.key === 'totalImpact'" class="font-mono">{{ formatCurrency(record.totalImpact) }}</span>
              <span v-else-if="column.key === 'avgImpact'" class="font-mono">{{ formatCurrency(record.avgImpact) }}</span>
            </template>
          </Table>
        </Card>

        <Row :gutter="[24, 24]">
          <Col :xs="24" :xl="12">
            <Card size="small" title="操作类型分布">
              <Table size="middle" :pagination="false" :columns="actionColumns" :data-source="deliveryAutoRuleStats.actionsByType" row-key="action">
                <template #bodyCell="{ column, record }">
                  <Tag v-if="column.key === 'action'" :color="tagColor(DELIVERY_RULE_ACTION_CONFIG[record.action])">{{ actionLabel(record.action) }}</Tag>
                  <TypographyText v-else-if="column.key === 'impact'" :type="record.impact >= 0 ? 'success' : 'danger'" class="font-mono">{{ formatCurrency(record.impact) }}</TypographyText>
                </template>
              </Table>
            </Card>
          </Col>
          <Col :xs="24" :xl="12">
            <Card size="small" title="规则应用效果对比">
              <Descriptions v-for="item in deliveryAutoRuleEffectComparison" :key="item.contract" :column="2" size="small" bordered class="effect-block">
                <template #title>{{ item.contract }} <Tag color="green">改善 {{ formatCurrency(item.improvement) }}</Tag></template>
                <DescriptionsItem label="启用前平台盈亏"><TypographyText :type="item.beforeRules.platformPnl >= 0 ? 'success' : 'danger'" class="font-mono">{{ formatCurrency(item.beforeRules.platformPnl) }}</TypographyText></DescriptionsItem>
                <DescriptionsItem label="启用后平台盈亏"><TypographyText :type="item.afterRules.platformPnl >= 0 ? 'success' : 'danger'" class="font-mono">{{ formatCurrency(item.afterRules.platformPnl) }}</TypographyText></DescriptionsItem>
                <DescriptionsItem label="启用前风险"><Tag :color="tagColor(DELIVERY_RISK_LEVEL_CONFIG[item.beforeRules.riskLevel])">{{ DELIVERY_RISK_LEVEL_CONFIG[item.beforeRules.riskLevel]?.text }}</Tag></DescriptionsItem>
                <DescriptionsItem label="启用后风险"><Tag :color="tagColor(DELIVERY_RISK_LEVEL_CONFIG[item.afterRules.riskLevel])">{{ DELIVERY_RISK_LEVEL_CONFIG[item.afterRules.riskLevel]?.text }}</Tag></DescriptionsItem>
              </Descriptions>
            </Card>
          </Col>
        </Row>
      </div>
    </Card>
  </PageShell>
</template>

<style scoped>
.report-select {
  width: 200px;
}
.report-filters {
  row-gap: 16px;
}
.report-actions {
  margin-left: auto;
  margin-inline-end: 0;
}
.report-section {
  display: grid;
  gap: 24px;
  padding-top: 8px;
}
.report-stat-title {
  margin-bottom: 4px;
  color: rgb(0 0 0 / 45%);
}
.pnl-row + .pnl-row {
  margin-top: 12px;
}
.pnl-row__head,
.pnl-row__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.pnl-row__bar :deep(.ant-progress) {
  flex: 1;
  margin: 0;
}
.pnl-row__value {
  min-width: 80px;
  text-align: right;
}
.effect-block + .effect-block {
  margin-top: 16px;
}
</style>
