<script setup>
// 平台报表 — Ant Design Pro report page (2026-11-28): PageShell (no banner), one Card with Ant Tabs for the periods and
// the month/day pickers in the tab bar, sections as Cards with Statistics and Ant Tables (amount columns right-aligned).
import { computed, ref } from 'vue'
import { Button, Card, Col, DatePicker, Row, Space, Statistic, Table, TabPane, Tabs, Tag, TypographyText } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'

const pageVersion = '1.0.0.2.1'

const padDatePart = (value) => String(value).padStart(2, '0')

const getTodayValue = () => {
  const today = new Date()
  return `${today.getFullYear()}-${padDatePart(today.getMonth() + 1)}-${padDatePart(today.getDate())}`
}

const getCurrentMonthValue = () => getTodayValue().slice(0, 7)

const assetTones = {
  USDT: 'black',
  BTC: 'green',
  ETH: 'gray',
  TRX: 'gray',
  LTC: 'gray',
  PEPE: 'gray',
  DAI: 'red',
  TRUMP: 'gray',
  YFI: 'gray',
  DOT: 'gray',
  TON: 'gray',
  BCH: 'gray',
  FIL: 'gray',
  XRP: 'gray',
  DASH: 'gray',
  LINK: 'gray',
  ADA: 'gray',
  BNB: 'orange',
  MATIC: 'orange',
  EOS: 'gray',
  XMR: 'gray',
  ZEC: 'gray',
  SHIB: 'orange',
  DOGE: 'gray',
  SOL: 'orange'
}

const reportAssets = [
  'USDT',
  'BTC',
  'ETH',
  'TRX',
  'LTC',
  'PEPE',
  'DAI',
  'TRUMP',
  'YFI',
  'DOT',
  'TON',
  'BCH',
  'FIL',
  'XRP',
  'DASH',
  'LINK',
  'ADA',
  'BNB',
  'MATIC',
  'EOS',
  'XMR',
  'ZEC',
  'SHIB',
  'DOGE',
  'SOL'
]

const rechargeColumns = [
  { key: 'userDeposit', label: '用户入金' },
  { key: 'serviceDeposit', label: '客服入金' }
]

const withdrawColumns = [
  { key: 'actualAmount', label: '提币实际到账' },
  { key: 'fee', label: '提币手续费' }
]

const buildAssetRow = (asset, values) => ({
  asset,
  tone: assetTones[asset],
  ...values
})

const buildZeroRechargeRows = (overrides = {}) =>
  reportAssets.map((asset) =>
    buildAssetRow(asset, {
      userDeposit: '0',
      serviceDeposit: '0',
      ...(overrides[asset] || {})
    })
  )

const buildWithdrawRows = (overrides = {}) =>
  reportAssets.map((asset) =>
    buildAssetRow(asset, {
      actualAmount: '0',
      fee: '0',
      ...(overrides[asset] || {})
    })
  )

const rechargeMonthRows = buildZeroRechargeRows()
const withdrawZeroRows = buildWithdrawRows()

const platformBalanceItems = [
  ...reportAssets.map((asset) => ({
    label: asset,
    badge: asset,
    value: '0',
    tone: assetTones[asset]
  }))
]

const sections = [
  {
    title: '平台用户账上资金-总',
    columns: 'asset',
    items: platformBalanceItems
  },
  {
    title: '用户数据-总',
    columns: 'small',
    items: [
      { label: '用户统计', value: '0', tone: 'blue' },
      { label: '代理数量', value: '0', tone: 'green' }
    ]
  },
  {
    title: '充值数据-总',
    kind: 'assetTable',
    tableLabel: '充值数据总览',
    tableColumns: rechargeColumns,
    rows: buildZeroRechargeRows()
  },
  {
    title: '提现数据-总',
    kind: 'assetTable',
    tableLabel: '提现数据总览',
    tableColumns: withdrawColumns,
    summaryItems: [
      { label: '提现笔数', value: '0', tone: 'blue' }
    ],
    rows: buildWithdrawRows()
  },
  {
    title: '用户数据-本月',
    columns: 'small',
    items: [
      { label: '用户统计', value: '0', tone: 'blue' },
      { label: '代理数量', value: '0', tone: 'green' }
    ]
  },
]

sections.push(
  {
    title: '充值数据-本月',
    kind: 'assetTable',
    tableLabel: '充值数据本月',
    tableColumns: rechargeColumns,
    rows: rechargeMonthRows
  },
  {
    title: '提现数据-本月',
    kind: 'assetTable',
    tableLabel: '提现数据本月',
    tableColumns: withdrawColumns,
    summaryItems: [
      { label: '提现笔数', value: '0', tone: 'blue' }
    ],
    rows: withdrawZeroRows
  },
  {
    title: '用户数据-今日',
    columns: 'small',
    items: [
      { label: '今日新增用户', value: '0', tone: 'blue' },
      { label: '待审核充值', value: '0', tone: 'cyan' },
      { label: '待审核提现', value: '0', tone: 'green' }
    ]
  },
  {
    title: '充值数据-今日',
    kind: 'assetTable',
    tableLabel: '充值数据今日',
    tableColumns: rechargeColumns,
    rows: rechargeMonthRows
  },
  {
    title: '提现数据-今日',
    kind: 'assetTable',
    tableLabel: '提现数据今日',
    tableColumns: withdrawColumns,
    summaryItems: [
      { label: '提现笔数', value: '0', tone: 'blue' }
    ],
    rows: withdrawZeroRows
  }
)

const dataRuleSections = [
  {
    title: '数据规则',
    columns: 'full',
    kind: 'rule',
    items: [
      {
        label: '充值/提现币种展示范围',
        badge: '币种',
        value: '充值数据和提现数据按后台已设置为“可以提现”的币种展示；未开启可提现的币种不进入充值/提现币种列表。',
        tone: 'blue'
      },
      {
        label: '总览数据范围',
        badge: '总',
        value: '总览展示平台累计数据，包括平台用户账上资金、用户数据、充值数据、提现数据。',
        tone: 'black'
      },
      {
        label: '本月数据范围',
        badge: '本月',
        value: '本月展示当前自然月维度的数据，包括用户数据、充值数据、提现数据。',
        tone: 'cyan'
      },
      {
        label: '今日数据范围',
        badge: '今日',
        value: '今日展示当天维度的数据，包括今日新增用户、待审核充值、待审核提现、充值数据、提现数据。',
        tone: 'green'
      }
    ]
  },
  {
    title: '计算口径',
    columns: 'full',
    kind: 'rule',
    items: [
      {
        label: '充值数据',
        badge: '充值',
        value: '每个可提现币种一行，分别展示用户入金、客服入金。',
        tone: 'blue'
      },
      {
        label: '提现数据',
        badge: '提现',
        value: '提现数据按币种逐行展示提币实际到账金额和提币手续费。',
        tone: 'cyan'
      },
      {
        label: '用户数据',
        badge: '用户',
        value: '用户数据展示用户统计、代理数量；今日页展示今日新增用户和待审核充值/提现数量。',
        tone: 'green'
      }
    ]
  }
]

// Asset/rule badge tones as Ant Tag colours (text always shown, colour is decorative only).
const tagColorByTone = {
  black: 'default',
  blue: 'blue',
  cyan: 'cyan',
  red: 'red',
  orange: 'orange',
  green: 'green',
  gray: 'default'
}

const assetTableColumns = (section) => [
  { key: 'asset', dataIndex: 'asset', title: '币种', width: 120, fixed: 'left' },
  ...section.tableColumns.map((column) => ({ key: column.key, dataIndex: column.key, title: column.label, align: 'right', width: 200 }))
]

const reportTabs = [
  {
    id: 'total',
    label: '总览',
    panelId: 'platform-report-total-panel',
    tabId: 'platform-report-total-tab',
    sections: sections.filter((section) => section.title.endsWith('-总') || section.title.includes('-总（'))
  },
  {
    id: 'month',
    label: '本月',
    panelId: 'platform-report-month-panel',
    tabId: 'platform-report-month-tab',
    sections: sections.filter((section) =>
      section.title.includes('本月') || section.title.endsWith('-月') || section.title.endsWith('月份')
    )
  },
  {
    id: 'today',
    label: '今日',
    panelId: 'platform-report-today-panel',
    tabId: 'platform-report-today-tab',
    sections: sections.filter((section) => section.title.includes('今日'))
  },
  {
    id: 'rules',
    label: '数据规则',
    panelId: 'platform-report-rules-panel',
    tabId: 'platform-report-rules-tab',
    sections: dataRuleSections
  }
]

const activeTabId = ref(reportTabs[0].id)
const selectedMonth = ref(getCurrentMonthValue())
const selectedDate = ref(getTodayValue())

const activeTab = computed(() => {
  return reportTabs.find((tab) => tab.id === activeTabId.value) || reportTabs[0]
})

const appliedPeriodLabel = computed(() => {
  if (activeTabId.value === 'month') {
    return selectedMonth.value
  }

  if (activeTabId.value === 'today') {
    return selectedDate.value
  }

  return ''
})

const periodFilterDescription = computed(() => {
  if (activeTabId.value === 'month') {
    return `当前查询月份：${selectedMonth.value}`
  }

  if (activeTabId.value === 'today') {
    return `当前查询日期：${selectedDate.value}`
  }

  return ''
})

const displaySectionTitle = (title) => {
  if (activeTabId.value === 'month') {
    return title.replace('本月', appliedPeriodLabel.value)
  }

  if (activeTabId.value === 'today') {
    return title.replace('今日', appliedPeriodLabel.value)
  }

  return title
}

const resetPeriodFilter = () => {
  if (activeTabId.value === 'month') {
    selectedMonth.value = getCurrentMonthValue()
    return
  }

  if (activeTabId.value === 'today') {
    selectedDate.value = getTodayValue()
  }
}
</script>

<template>
  <PageShell>
    <h1 class="sr-only">平台报表</h1>
    <span class="sr-only">当前版本号：{{ pageVersion }}</span>

    <Card :bordered="false" :body-style="{ paddingTop: 0 }">
      <Tabs v-model:activeKey="activeTabId" aria-label="平台报表周期">
        <template v-if="activeTabId === 'month' || activeTabId === 'today'" #rightExtra>
          <Space :size="8" wrap aria-label="时间筛选">
            <TypographyText type="secondary">{{ periodFilterDescription }}</TypographyText>
            <DatePicker v-if="activeTabId === 'month'" v-model:value="selectedMonth" picker="month" value-format="YYYY-MM" :allow-clear="false" aria-label="查询月份" placeholder="查询月份" />
            <DatePicker v-else v-model:value="selectedDate" value-format="YYYY-MM-DD" :allow-clear="false" aria-label="查询日期" placeholder="查询日期" />
            <Button @click="resetPeriodFilter">恢复当前时间</Button>
          </Space>
        </template>
        <TabPane v-for="tab in reportTabs" :key="tab.id" :tab="tab.label" />
      </Tabs>

      <div :id="activeTab.panelId" class="platform-report-sections">
        <Card
          v-for="section in activeTab.sections"
          :key="section.title"
          size="small"
          :title="displaySectionTitle(section.title)"
        >
          <Row v-if="section.summaryItems?.length" :gutter="[24, 16]" class="platform-report-summary">
            <Col v-for="item in section.summaryItems" :key="`${section.title}-${item.label}`" :xs="12" :md="8">
              <Statistic :title="item.label" :value="item.value" />
            </Col>
          </Row>

          <Table
            v-if="section.kind === 'assetTable'"
            :data-source="section.rows"
            :columns="assetTableColumns(section)"
            :pagination="false"
            size="small"
            row-key="asset"
            :scroll="{ x: 'max-content' }"
            :aria-label="section.tableLabel"
          >
            <template #bodyCell="{ column, record: row }">
              <Tag v-if="column.key === 'asset'" :color="tagColorByTone[row.tone]">{{ row.asset }}</Tag>
              <span v-else class="font-mono">{{ row[column.key] }}</span>
            </template>
          </Table>

          <Row v-else-if="section.kind === 'rule'" :gutter="[24, 16]">
            <Col v-for="item in section.items" :key="`${section.title}-${item.label}`" :xs="24">
              <Space direction="vertical" :size="4">
                <Space :size="8"><Tag :color="tagColorByTone[item.tone]">{{ item.badge }}</Tag><TypographyText strong>{{ item.label }}</TypographyText></Space>
                <TypographyText type="secondary">{{ item.value }}</TypographyText>
              </Space>
            </Col>
          </Row>

          <Row v-else-if="section.items.length" :gutter="[24, 16]">
            <Col v-for="item in section.items" :key="`${section.title}-${item.label}`" :xs="12" :md="8" :xl="section.columns === 'asset' ? 4 : 8">
              <Statistic :title="item.label" :value="item.value" />
            </Col>
          </Row>
        </Card>
      </div>
    </Card>
  </PageShell>
</template>

<style scoped>
.platform-report-sections { display: grid; gap: 16px; }
.platform-report-summary { margin-bottom: 16px; }
</style>
