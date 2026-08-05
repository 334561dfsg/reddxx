<script setup>
import { computed, ref } from 'vue'

const pageVersion = '1.0.0.2.1'

const padDatePart = (value) => String(value).padStart(2, '0')

const getTodayValue = () => {
  const today = new Date()
  return `${today.getFullYear()}-${padDatePart(today.getMonth() + 1)}-${padDatePart(today.getDate())}`
}

const getCurrentMonthValue = () => getTodayValue().slice(0, 7)

const assetTones = {
  USDT: 'black',
  DAI: 'red',
  SHIB: 'orange',
  BUSD: 'orange',
  MATIC: 'orange',
  SOL: 'orange',
  BNB: 'orange',
  BTC: 'green',
  ETH: 'gray'
}

const rechargeColumns = [
  { key: 'userDeposit', label: '用户入金' },
  { key: 'serviceDeposit', label: '客服入金' },
  { key: 'walletAmount', label: '到钱包金额' }
]

const withdrawColumns = [
  { key: 'actualAmount', label: '提币实际到账' },
  { key: 'fee', label: '提币手续费' },
  { key: 'deduction', label: '划扣' },
  { key: 'backendWithdraw', label: '后台提现' }
]

const buildAssetRow = (asset, values) => ({
  asset,
  tone: assetTones[asset],
  ...values
})

const buildZeroRechargeRows = () => [
  buildAssetRow('USDT', { userDeposit: '0', serviceDeposit: '0', walletAmount: '0.00' }),
  buildAssetRow('DAI', { userDeposit: '0', serviceDeposit: '0', walletAmount: '0.00' }),
  buildAssetRow('SHIB', { userDeposit: '0', serviceDeposit: '0', walletAmount: '0.00' }),
  buildAssetRow('BUSD', { userDeposit: '0', serviceDeposit: '0', walletAmount: '0.00' }),
  buildAssetRow('MATIC', { userDeposit: '0', serviceDeposit: '0', walletAmount: '0.00' }),
  buildAssetRow('SOL', { userDeposit: '0', serviceDeposit: '0', walletAmount: '0.00' }),
  buildAssetRow('BNB', { userDeposit: '0', serviceDeposit: '0', walletAmount: '0.00' }),
  buildAssetRow('BTC', { userDeposit: '0', serviceDeposit: '0', walletAmount: '0.000000' }),
  buildAssetRow('ETH', { userDeposit: '0', serviceDeposit: '0', walletAmount: '0.0000' })
]

const buildWithdrawRows = (usdtValues = {}) => [
  buildAssetRow('USDT', {
    actualAmount: usdtValues.actualAmount || '0',
    fee: usdtValues.fee || '0',
    deduction: usdtValues.deduction || '0',
    backendWithdraw: usdtValues.backendWithdraw || '0'
  }),
  buildAssetRow('DAI', { actualAmount: '0', fee: '0', deduction: '0', backendWithdraw: '0' }),
  buildAssetRow('SHIB', { actualAmount: '0', fee: '0', deduction: '0', backendWithdraw: '0' }),
  buildAssetRow('BUSD', { actualAmount: '0', fee: '0', deduction: '0', backendWithdraw: '0' }),
  buildAssetRow('MATIC', { actualAmount: '0', fee: '0', deduction: '0', backendWithdraw: '0' }),
  buildAssetRow('SOL', { actualAmount: '0', fee: '0', deduction: '0', backendWithdraw: '0' }),
  buildAssetRow('BNB', { actualAmount: '0', fee: '0', deduction: '0', backendWithdraw: '0' }),
  buildAssetRow('BTC', { actualAmount: '0', fee: '0', deduction: '0', backendWithdraw: '0' }),
  buildAssetRow('ETH', { actualAmount: '0', fee: '0', deduction: '0', backendWithdraw: '0' })
]

const rechargeMonthRows = buildZeroRechargeRows()
const withdrawZeroRows = buildWithdrawRows()

const platformBalanceItems = [
  { label: 'USDT', badge: 'USDT', value: '39271589.38', tone: 'black' },
  { label: 'DAI', badge: 'DAI', value: '0', tone: 'red' },
  { label: 'SHIB', badge: 'SHIB', value: '0', tone: 'orange' },
  { label: 'BUSD', badge: 'BUSD', value: '0', tone: 'orange' },
  { label: 'MATIC', badge: 'MATIC', value: '0', tone: 'orange' },
  { label: 'SOL', badge: 'SOL', value: '0', tone: 'orange' },
  { label: 'BNB', badge: 'BNB', value: '0', tone: 'orange' },
  { label: 'BTC', badge: 'BTC', value: '30.624848', tone: 'green' },
  { label: 'ETH', badge: 'ETH', value: '620.9318', tone: 'gray' }
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
      { label: '用户统计', badge: '15min', value: '22', tone: 'blue' },
      { label: '代理数量', badge: '15min', value: '0', tone: 'green' }
    ]
  },
  {
    title: '充值数据-总（18）',
    kind: 'assetTable',
    tableLabel: '充值数据总览',
    tableColumns: rechargeColumns,
    rows: [
      buildAssetRow('USDT', { userDeposit: '0', serviceDeposit: '48200531.91', walletAmount: '48200531.91' }),
      buildAssetRow('DAI', { userDeposit: '0', serviceDeposit: '0', walletAmount: '0.00' }),
      buildAssetRow('SHIB', { userDeposit: '0', serviceDeposit: '0', walletAmount: '0.00' }),
      buildAssetRow('BUSD', { userDeposit: '0', serviceDeposit: '0', walletAmount: '0.00' }),
      buildAssetRow('MATIC', { userDeposit: '0', serviceDeposit: '0', walletAmount: '0.00' }),
      buildAssetRow('SOL', { userDeposit: '0', serviceDeposit: '0', walletAmount: '0.00' }),
      buildAssetRow('BNB', { userDeposit: '0', serviceDeposit: '0', walletAmount: '0.00' }),
      buildAssetRow('BTC', { userDeposit: '0', serviceDeposit: '0', walletAmount: '0.000000' }),
      buildAssetRow('ETH', { userDeposit: '45.3141', serviceDeposit: '0', walletAmount: '45.3141' })
    ]
  },
  {
    title: '提现数据-总',
    kind: 'assetTable',
    tableLabel: '提现数据总览',
    tableColumns: withdrawColumns,
    summaryItems: [
      { label: '提现笔数', badge: '15min', value: '6', tone: 'blue' }
    ],
    rows: buildWithdrawRows({ actualAmount: '513769.32', fee: '29.00', deduction: '0', backendWithdraw: '0' })
  },
  {
    title: '用户数据-本月',
    columns: 'small',
    items: [
      { label: '用户统计', badge: '15min', value: '0', tone: 'blue' },
      { label: '代理数量', badge: '15min', value: '0', tone: 'green' }
    ]
  },
]

sections.push(
  {
    title: '充值数据-本月（0）',
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
      { label: '提现笔数', badge: '15min', value: '0', tone: 'blue' }
    ],
    rows: withdrawZeroRows
  },
  {
    title: '用户数据-今日',
    columns: 'small',
    items: [
      { label: '今日新增用户', badge: '15min', value: '0', tone: 'blue' },
      { label: '待审核充值', badge: '15min', value: '0', tone: 'cyan' },
      { label: '待审核提现', badge: '15min', value: '0', tone: 'green' }
    ]
  },
  {
    title: '充值数据-今日（0）',
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
      { label: '提现笔数', badge: '15min', value: '0', tone: 'blue' }
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
        value: '每个可提现币种一行，分别展示用户入金、客服入金、到钱包金额；到钱包金额按该币种最终进入用户钱包的金额展示。',
        tone: 'blue'
      },
      {
        label: '提现数据',
        badge: '提现',
        value: '提现数据按币种逐行展示提币实际到账金额；USDT 额外展示提币手续费、划扣、后台提现。',
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

const gridClassByColumns = {
  full: 'grid-cols-1',
  small: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
  asset: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
}

const badgeClassByTone = {
  black: 'bg-slate-900 text-white',
  blue: 'bg-blue-600 text-white',
  cyan: 'bg-cyan-600 text-white',
  red: 'bg-rose-600 text-white',
  orange: 'bg-orange-500 text-white',
  green: 'bg-emerald-600 text-white',
  gray: 'bg-slate-500 text-white'
}

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

const selectTab = (tabId) => {
  activeTabId.value = tabId
}

const selectAdjacentTab = (event, direction) => {
  const currentIndex = reportTabs.findIndex((tab) => tab.id === activeTabId.value)
  const nextIndex = (currentIndex + direction + reportTabs.length) % reportTabs.length
  activeTabId.value = reportTabs[nextIndex].id
  event.preventDefault()
}

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
  <div class="space-y-4" aria-labelledby="platform-report-title">
    <h1 id="platform-report-title" class="sr-only">平台报表</h1>
    <span class="sr-only">当前版本号：{{ pageVersion }}</span>

    <div class="rounded-md border border-slate-200 bg-white p-2 shadow-sm">
      <div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div class="overflow-x-auto">
          <div class="flex min-w-max gap-2" role="tablist" aria-label="平台报表周期">
            <button
              v-for="tab in reportTabs"
              :id="tab.tabId"
              :key="tab.id"
              type="button"
              role="tab"
              :aria-selected="activeTabId === tab.id"
              :aria-controls="tab.panelId"
              class="rounded px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              :class="activeTabId === tab.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'"
              @click="selectTab(tab.id)"
              @keydown.left="selectAdjacentTab($event, -1)"
              @keydown.right="selectAdjacentTab($event, 1)"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>

        <div
          v-if="activeTabId === 'month' || activeTabId === 'today'"
          class="flex flex-col gap-2 border-t border-slate-200 pt-2 sm:flex-row sm:items-center lg:border-t-0 lg:pt-0"
          aria-labelledby="platform-report-period-filter-title"
        >
          <span id="platform-report-period-filter-title" class="sr-only">时间筛选</span>
          <span class="text-sm text-slate-500">{{ periodFilterDescription }}</span>

          <label
            v-if="activeTabId === 'month'"
            class="flex items-center gap-2 text-sm font-medium text-slate-700"
          >
            <span class="whitespace-nowrap">查询月份</span>
            <input
              v-model="selectedMonth"
              type="month"
              class="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              aria-describedby="platform-report-period-filter-title"
            />
          </label>

          <label
            v-if="activeTabId === 'today'"
            class="flex items-center gap-2 text-sm font-medium text-slate-700"
          >
            <span class="whitespace-nowrap">查询日期</span>
            <input
              v-model="selectedDate"
              type="date"
              class="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              aria-describedby="platform-report-period-filter-title"
            />
          </label>

          <button
            type="button"
            class="h-10 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            @click="resetPeriodFilter"
          >
            恢复当前时间
          </button>
        </div>
      </div>
    </div>

    <div
      :id="activeTab.panelId"
      role="tabpanel"
      :aria-labelledby="activeTab.tabId"
      class="space-y-4"
      tabindex="0"
    >
      <section
        v-for="section in activeTab.sections"
        :key="section.title"
        class="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"
        :aria-labelledby="`${section.title}-title`"
      >
        <div class="border-b border-slate-200 bg-white px-4 py-3">
          <h2
            :id="`${section.title}-title`"
            class="text-base font-semibold text-slate-800"
          >
            <span class="mr-2 text-amber-500">!</span>{{ displaySectionTitle(section.title) }}
          </h2>
        </div>

        <div class="space-y-4 p-4">
          <div
            v-if="section.summaryItems?.length"
            class="grid gap-3"
            :class="gridClassByColumns.small"
          >
            <article
              v-for="item in section.summaryItems"
              :key="`${section.title}-${item.label}-${item.badge}`"
              class="rounded-md border border-slate-200 bg-slate-50 p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <h3 class="min-w-0 break-words text-sm font-medium text-slate-700">{{ item.label }}</h3>
                <span
                  class="shrink-0 rounded px-2 py-0.5 text-xs font-medium"
                  :class="badgeClassByTone[item.tone]"
                >
                  {{ item.badge }}
                </span>
              </div>
              <p class="mt-3 break-words font-mono text-2xl font-semibold leading-tight text-slate-950">
                {{ item.value }}
              </p>
            </article>
          </div>

          <div
            v-if="section.kind === 'assetTable'"
            class="overflow-x-auto rounded-md border border-slate-200"
            tabindex="0"
            :aria-label="`${section.tableLabel}，可横向滚动查看全部列`"
          >
            <table class="min-w-[720px] w-full border-collapse text-sm">
              <caption class="sr-only">{{ section.tableLabel }}</caption>
              <thead class="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th scope="col" class="w-32 whitespace-nowrap px-4 py-3">币种</th>
                  <th
                    v-for="column in section.tableColumns"
                    :key="`${section.title}-${column.key}`"
                    scope="col"
                    class="whitespace-nowrap px-4 py-3 text-right"
                  >
                    {{ column.label }}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200 bg-white">
                <tr
                  v-for="row in section.rows"
                  :key="`${section.title}-${row.asset}`"
                  class="hover:bg-slate-50"
                >
                  <th scope="row" class="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-700">
                    <span
                      class="inline-flex rounded px-2 py-0.5 text-xs font-medium"
                      :class="badgeClassByTone[row.tone]"
                    >
                      {{ row.asset }}
                    </span>
                  </th>
                  <td
                    v-for="column in section.tableColumns"
                    :key="`${section.title}-${row.asset}-${column.key}`"
                    class="whitespace-nowrap px-4 py-3 text-right font-mono text-sm font-semibold text-slate-950"
                  >
                    {{ row[column.key] }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            v-else-if="section.items.length"
            class="grid gap-3"
            :class="gridClassByColumns[section.columns]"
          >
            <article
              v-for="item in section.items"
              :key="`${section.title}-${item.label}-${item.badge}`"
              class="rounded-md border border-slate-200 bg-slate-50 p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <h3 class="min-w-0 break-words text-sm font-medium text-slate-700">{{ item.label }}</h3>
                <span
                  class="shrink-0 rounded px-2 py-0.5 text-xs font-medium"
                  :class="badgeClassByTone[item.tone]"
                >
                  {{ item.badge }}
                </span>
              </div>
              <p
                class="mt-3 break-words leading-relaxed text-slate-950"
                :class="section.kind === 'rule' ? 'text-sm' : 'font-mono text-2xl font-semibold leading-tight'"
              >
                {{ item.value }}
              </p>
            </article>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
