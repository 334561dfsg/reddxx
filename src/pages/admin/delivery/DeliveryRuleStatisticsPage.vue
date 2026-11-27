<script setup>
// 规则效果统计 — report page on the Ant Design Pro shell (2026-11-28): PageShell + Cards with Statistics and tables.
// The 7天/30天 buttons had no handler (no 30-day data exists) and were removed; the trend bar now scales to the
// largest day instead of a hard-coded 70.
import { computed, ref } from 'vue'
import { Card, Col, Progress, Row, Statistic, Table, TypographyText } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import { createRuleStatisticsMock } from '../../../admin/mock/deliveryControl'

const statistics = ref(createRuleStatisticsMock())

const maxDailyHits = computed(() => Math.max(1, ...statistics.value.performanceData.map((day) => Number(day.hits) || 0)))

const trendColumns = [
  { key: 'date', dataIndex: 'date', title: '日期', width: 90 },
  { key: 'hits', title: '触发次数', width: 260 },
  { key: 'affected', dataIndex: 'affected', title: '影响用户（人）', width: 130, align: 'right' }
]

const breakdownColumns = [
  { key: 'name', title: '类型', width: 200 },
  { key: 'count', dataIndex: 'count', title: '触发次数', width: 110, align: 'right' }
]
const triggerBreakdown = [
  { key: 'trade_count', name: '交易次数触发', note: '最常用的触发类型', count: 156 },
  { key: 'profit_loss', name: '盈亏触发', note: '盈亏异常监控', count: 89 },
  { key: 'daily_profit', name: '日盈利触发', note: '盈利封顶控制', count: 67 },
  { key: 'consecutive_wins', name: '连续盈利触发', note: '连胜阻断', count: 54 }
]
const actionBreakdown = [
  { key: 'profit_control', name: '盈亏控制', note: '最常用的控制手段', count: 178 },
  { key: 'force_loss', name: '强制亏损', note: '阻断连胜', count: 67 },
  { key: 'price_adjust', name: '价格调整', note: '大额持仓控制', count: 89 },
  { key: 'reject_order', name: '订单拒绝', note: '锁定新开仓', count: 32 }
]
</script>

<template>
  <PageShell>
    <Card :bordered="false" title="总体统计">
      <Row :gutter="[24, 16]">
        <Col :xs="12" :xl="6">
          <Statistic title="规则总数" :value="statistics.totalRules" />
          <TypographyText type="secondary">运行中 {{ statistics.enabledRules }} · 暂停 {{ statistics.pausedRules }}</TypographyText>
        </Col>
        <Col :xs="12" :xl="6">
          <Statistic title="总触发次数" :value="statistics.totalHits" />
          <TypographyText type="secondary">今日触发 {{ statistics.todayHits }}</TypographyText>
        </Col>
        <Col :xs="12" :xl="6">
          <Statistic title="总影响用户" :value="statistics.totalAffectedUsers" />
          <TypographyText type="secondary">今日影响 {{ statistics.todayAffectedUsers }}</TypographyText>
        </Col>
        <Col :xs="12" :xl="6">
          <Statistic title="平均触发率" :value="statistics.avgHitRate" suffix="%" />
          <TypographyText type="secondary">规则执行效率指标</TypographyText>
        </Col>
      </Row>
    </Card>

    <Card :bordered="false" title="过去 7 天触发趋势">
      <Table size="middle" :pagination="false" :columns="trendColumns" :data-source="statistics.performanceData" row-key="date">
        <template #bodyCell="{ column, record }">
          <Progress v-if="column.key === 'hits'" :percent="Math.round((record.hits / maxDailyHits) * 100)" :format="() => `${record.hits} 次`" />
        </template>
      </Table>
    </Card>

    <Row :gutter="[24, 24]">
      <Col :xs="24" :xl="12">
        <Card :bordered="false" title="按触发类型统计">
          <Table size="middle" :pagination="false" :columns="breakdownColumns" :data-source="triggerBreakdown" row-key="key">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <div>{{ record.name }}</div>
                <TypographyText type="secondary">{{ record.note }}</TypographyText>
              </template>
            </template>
          </Table>
        </Card>
      </Col>
      <Col :xs="24" :xl="12">
        <Card :bordered="false" title="按执行动作统计">
          <Table size="middle" :pagination="false" :columns="breakdownColumns" :data-source="actionBreakdown" row-key="key">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <div>{{ record.name }}</div>
                <TypographyText type="secondary">{{ record.note }}</TypographyText>
              </template>
            </template>
          </Table>
        </Card>
      </Col>
    </Row>
  </PageShell>
</template>
