<script setup>
import { computed, ref } from 'vue'

const pageVersion = '1.0.0.2.1'

const sections = [
  {
    title: '平台用户账上资金-总',
    columns: 'asset',
    items: [
      { label: 'USDT', badge: 'USDT', value: '39271589.38', tone: 'black' },
      { label: 'USDC', badge: 'USDC', value: '0', tone: 'blue' },
      { label: 'DAI', badge: 'DAI', value: '0', tone: 'red' },
      { label: 'SHIB', badge: 'SHIB', value: '0', tone: 'orange' },
      { label: 'BUSD', badge: 'BUSD', value: '0', tone: 'orange' },
      { label: 'MATIC', badge: 'MATIC', value: '0', tone: 'orange' },
      { label: 'SOL', badge: 'SOL', value: '0', tone: 'orange' },
      { label: 'SOL', badge: 'BNB', value: '0', tone: 'orange' },
      { label: 'BTC', badge: 'BTC', value: '30.624848', tone: 'green' },
      { label: 'ETH', badge: 'ETH', value: '620.9318', tone: 'gray' }
    ]
  },
  {
    title: '用户数据-总',
    columns: 'small',
    items: [
      { label: '用户统计', badge: '15min', value: '22', tone: 'blue' },
      { label: '业务员数量', badge: '15min', value: '42', tone: 'cyan' },
      { label: '代理数量', badge: '15min', value: '0', tone: 'green' }
    ]
  },
  {
    title: '差额数据-总',
    columns: 'asset',
    items: [
      { label: '差额-人民币', badge: 'CNY', value: '-61892.24', tone: 'black' },
      { label: '差额-USDT', badge: 'USDT', value: '-513769.32', tone: 'black' },
      { label: '差额-USDC', badge: 'USDC', value: '10715.00', tone: 'blue' },
      { label: '差额-DAI', badge: 'DAI', value: '0', tone: 'red' },
      { label: '差额-SHIB', badge: 'SHIB', value: '0', tone: 'orange' },
      { label: '差额-BUSD', badge: 'BUSD', value: '0', tone: 'orange' },
      { label: '差额-MATIC', badge: 'MATIC', value: '0', tone: 'orange' },
      { label: '差额-SOL', badge: 'SOL', value: '0', tone: 'orange' },
      { label: '差额-BNB', badge: 'BNB', value: '0', tone: 'orange' },
      { label: '差额-BTC', badge: 'BTC', value: '0', tone: 'green' },
      { label: '差额-ETH', badge: 'ETH', value: '45.3141', tone: 'gray' }
    ]
  },
  {
    title: '充值数据-总（18）',
    columns: 'asset',
    items: [
      { label: 'USDT-充值-充值', badge: 'USDT', value: '0', tone: 'black' },
      { label: 'USDT-充值-彩金', badge: 'USDT', value: '48200531.91', tone: 'black' },
      { label: 'USDT-充值-到钱包金额', badge: 'USDT', value: '48200531.91', tone: 'black' },
      { label: 'USDC-充值-充值', badge: 'USDC', value: '10715.00', tone: 'blue' },
      { label: 'USDC-充值-彩金', badge: 'USDC', value: '0', tone: 'blue' },
      { label: 'USDC-充值-到钱包金额', badge: 'USDC', value: '10715.00', tone: 'blue' },
      { label: 'DAI-充值-充值', badge: 'DAI', value: '0', tone: 'red' },
      { label: 'DAI-充值-彩金', badge: 'DAI', value: '0', tone: 'red' },
      { label: 'DAI-充值-到钱包金额', badge: 'DAI', value: '0.00', tone: 'red' },
      { label: 'SHIB-充值-充值', badge: 'SHIB', value: '0', tone: 'orange' },
      { label: 'SHIB-充值-彩金', badge: 'SHIB', value: '0', tone: 'orange' },
      { label: 'SHIB-充值-到钱包金额', badge: 'SHIB', value: '0.00', tone: 'orange' },
      { label: 'BUSD-充值-充值', badge: 'BUSD', value: '0', tone: 'orange' },
      { label: 'BUSD-充值-彩金', badge: 'BUSD', value: '0', tone: 'orange' },
      { label: 'busd-充值-到钱包金额', badge: 'BUSD', value: '0.00', tone: 'orange' },
      { label: 'MATIC-充值-充值', badge: 'MATIC', value: '0', tone: 'orange' },
      { label: 'MATIC-充值-彩金', badge: 'MATIC', value: '0', tone: 'orange' },
      { label: 'MATIC-充值-到钱包金额', badge: 'MATIC', value: '0.00', tone: 'orange' },
      { label: 'SOL充值-充值', badge: 'SOL', value: '0', tone: 'orange' },
      { label: 'SOL-充值-彩金', badge: 'SOL', value: '0', tone: 'orange' },
      { label: 'SOL-充值-到钱包金额', badge: 'SOL', value: '0.00', tone: 'orange' },
      { label: 'BNB充值-充值', badge: 'BNB', value: '0', tone: 'orange' },
      { label: 'BNB-充值-彩金', badge: 'BNB', value: '0', tone: 'orange' },
      { label: 'BNB-充值-到钱包金额', badge: 'BNB', value: '0.00', tone: 'orange' },
      { label: 'BTC-充值-充值', badge: 'BTC', value: '0', tone: 'green' },
      { label: 'BTC-充值-彩金', badge: 'BTC', value: '0', tone: 'green' },
      { label: 'BTC-充值-到钱包金额', badge: 'BTC', value: '0.000000', tone: 'green' },
      { label: 'ETH-充值-充值', badge: 'ETH', value: '45.3141', tone: 'gray' },
      { label: 'ETH-充值-彩金', badge: 'ETH', value: '0', tone: 'gray' },
      { label: 'ETH-充值-到钱包金额', badge: 'ETH', value: '45.3141', tone: 'gray' }
    ]
  },
  {
    title: '提现数据-总',
    columns: 'asset',
    items: [
      { label: '提现笔数', badge: '15min', value: '6', tone: 'blue' },
      { label: 'USDT-提币(实际到账)', badge: 'USDT', value: '513769.32', tone: 'black' },
      { label: 'USDT-提币手续费', badge: 'USDT', value: '29.00', tone: 'black' },
      { label: 'USDT-划扣', badge: 'USDT', value: '0', tone: 'black' },
      { label: 'USDT-后台提现', badge: 'USDT', value: '0', tone: 'black' },
      { label: 'USDC-提币(实际到账)', badge: 'USDC', value: '0', tone: 'blue' },
      { label: 'DAI-提币(实际到账)', badge: 'DAI', value: '0', tone: 'red' },
      { label: 'SHIB-提币(实际到账)', badge: 'SHIB', value: '0', tone: 'orange' },
      { label: 'BUSD-提币(实际到账)', badge: 'BUSD', value: '0', tone: 'orange' },
      { label: 'MATIC-提币(实际到账)', badge: 'MATIC', value: '0', tone: 'orange' },
      { label: 'SOL-提币(实际到账)', badge: 'SOL', value: '0', tone: 'orange' },
      { label: 'BNB-提币(实际到账)', badge: 'BNB', value: '0', tone: 'orange' },
      { label: 'BTC-提币(实际到账)', badge: 'BTC', value: '0', tone: 'green' },
      { label: 'ETH-提币(实际到账)', badge: 'ETH', value: '0', tone: 'gray' }
    ]
  },
  {
    title: '用户数据-本月',
    columns: 'small',
    items: [
      { label: '用户统计', badge: '15min', value: '0', tone: 'blue' },
      { label: '业务员数量', badge: '15min', value: '42', tone: 'cyan' },
      { label: '代理数量', badge: '15min', value: '0', tone: 'green' }
    ]
  },
  {
    title: '差额数据-月',
    columns: 'asset',
    items: [
      { label: '差额-人民币', badge: 'CNY', value: '0.00', tone: 'black' },
      { label: '差额-USDT', badge: 'USDT', value: '0', tone: 'black' },
      { label: '差额-USDC', badge: 'USDC', value: '0', tone: 'blue' },
      { label: '差额-DAI', badge: 'DAI', value: '0', tone: 'red' },
      { label: '差额-SHIB', badge: 'SHIB', value: '0', tone: 'orange' },
      { label: '差额-BUSD', badge: 'BUSD', value: '0', tone: 'orange' },
      { label: '差额-MATIC', badge: 'MATIC', value: '0', tone: 'orange' },
      { label: '差额-SOL', badge: 'SOL', value: '0', tone: 'orange' },
      { label: '差额-BNB', badge: 'BNB', value: '0', tone: 'orange' },
      { label: '差额-BTC', badge: 'BTC', value: '0', tone: 'green' },
      { label: '差额-ETH', badge: 'ETH', value: '0', tone: 'gray' }
    ]
  }
]

const rechargeMonthItems = [
  ['USDT-充值-充值', 'USDT', '0', 'black'],
  ['USDT-充值-彩金', 'USDT', '0', 'black'],
  ['USDT-充值-到钱包金额', 'USDT', '0.00', 'black'],
  ['USDC-充值-充值', 'USDC', '0', 'blue'],
  ['USDC-充值-彩金', 'USDC', '0', 'blue'],
  ['USDC-充值-到钱包金额', 'USDC', '0.00', 'blue'],
  ['DAI-充值-充值', 'DAI', '0', 'red'],
  ['DAI-充值-彩金', 'DAI', '0', 'red'],
  ['DAI-充值-到钱包金额', 'DAI', '0.00', 'red'],
  ['SHIB-充值-充值', 'SHIB', '0', 'orange'],
  ['SHIB-充值-彩金', 'SHIB', '0', 'orange'],
  ['SHIB-充值-到钱包金额', 'SHIB', '0.00', 'orange'],
  ['BUSD-充值-充值', 'BUSD', '0', 'orange'],
  ['BUSD-充值-彩金', 'BUSD', '0', 'orange'],
  ['BUSD-充值-到钱包金额', 'BUSD', '0.00', 'orange'],
  ['MATIC-充值-充值', 'MATIC', '0', 'orange'],
  ['MATIC-充值-彩金', 'MATIC', '0', 'orange'],
  ['MATIC-充值-到钱包金额', 'MATIC', '0.00', 'orange'],
  ['SOL-充值-充值', 'SOL', '0', 'orange'],
  ['SOL-充值-彩金', 'SOL', '0', 'orange'],
  ['SOL-充值-到钱包金额', 'SOL', '0.00', 'orange'],
  ['BNB-充值-充值', 'BNB', '0', 'orange'],
  ['BNB-充值-彩金', 'BNB', '0', 'orange'],
  ['BNB-充值-到钱包金额', 'BNB', '0.00', 'orange'],
  ['BTC-充值-充值', 'BTC', '0', 'green'],
  ['BTC-充值-彩金', 'BTC', '0', 'green'],
  ['BTC-充值-到钱包金额', 'BTC', '0.000000', 'green'],
  ['ETH-充值-充值', 'ETH', '0', 'gray'],
  ['ETH-充值-彩金', 'ETH', '0', 'gray'],
  ['ETH-充值-到钱包金额', 'ETH', '0.0000', 'gray']
].map(([label, badge, value, tone]) => ({ label, badge, value, tone }))

const withdrawZeroItems = [
  ['提现笔数', '15min', '0', 'blue'],
  ['USDT-提币(实际到账)', 'USDT', '0', 'black'],
  ['USDT-提币手续费', 'USDT', '0', 'black'],
  ['USDT-划扣', 'USDT', '0', 'black'],
  ['USDT-后台提现', 'USDT', '0', 'black'],
  ['USDC-提币(实际到账)', 'USDC', '0', 'blue'],
  ['DAI-提币(实际到账)', 'DAI', '0', 'red'],
  ['SHIB-提币(实际到账)', 'SHIB', '0', 'orange'],
  ['BUSD-提币(实际到账)', 'BUSD', '0', 'orange'],
  ['MATIC-提币(实际到账)', 'MATIC', '0', 'orange'],
  ['SOL-提币(实际到账)', 'SOL', '0', 'orange'],
  ['BNB-提币(实际到账)', 'BNB', '0', 'orange'],
  ['BTC-提币(实际到账)', 'BTC', '0', 'green'],
  ['ETH-提币(实际到账)', 'ETH', '0', 'gray']
].map(([label, badge, value, tone]) => ({ label, badge, value, tone }))

const zeroDiffItems = sections.find((section) => section.title === '差额数据-月').items

sections.push(
  { title: '充值数据-本月（0）', columns: 'asset', items: rechargeMonthItems },
  { title: '提现数据-本月', columns: 'asset', items: withdrawZeroItems },
  {
    title: '用户数据-今日',
    columns: 'small',
    items: [
      { label: '今日新增用户', badge: '15min', value: '0', tone: 'blue' },
      { label: '待审核充值', badge: '15min', value: '0', tone: 'cyan' },
      { label: '待审核提现', badge: '15min', value: '0', tone: 'green' }
    ]
  },
  { title: '差额数据-今日', columns: 'asset', items: zeroDiffItems },
  { title: '充值数据-今日（0）', columns: 'asset', items: rechargeMonthItems },
  { title: '提现数据-今日', columns: 'asset', items: withdrawZeroItems }
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
        value: '总览展示平台累计数据，包括平台用户账上资金、用户数据、差额数据、充值数据、提现数据。',
        tone: 'black'
      },
      {
        label: '本月数据范围',
        badge: '本月',
        value: '本月展示当前自然月内产生的数据，包括用户数据、差额数据、充值数据、提现数据。',
        tone: 'cyan'
      },
      {
        label: '今日数据范围',
        badge: '今日',
        value: '今日展示当天产生的数据，包括今日新增用户、待审核充值、待审核提现、差额数据、充值数据、提现数据。',
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
        value: '每个可提现币种分别展示充值、彩金、到钱包金额；到钱包金额按该币种最终进入用户钱包的金额展示。',
        tone: 'blue'
      },
      {
        label: '提现数据',
        badge: '提现',
        value: '提现数据展示提现笔数，以及每个可提现币种的提币实际到账金额；USDT 额外展示提币手续费、划扣、后台提现。',
        tone: 'cyan'
      },
      {
        label: '差额数据',
        badge: '差额',
        value: '差额数据按人民币和各币种分别展示，用于对比平台入账、出账、钱包变动后的余额差异。',
        tone: 'orange'
      },
      {
        label: '用户数据',
        badge: '用户',
        value: '用户数据展示用户统计、业务员数量、代理数量；今日页展示今日新增用户和待审核充值/提现数量。',
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
</script>

<template>
  <div class="space-y-4" aria-labelledby="platform-report-title">
    <h1 id="platform-report-title" class="sr-only">平台报表</h1>
    <span class="sr-only">当前版本号：{{ pageVersion }}</span>

    <div class="overflow-x-auto rounded-md border border-slate-200 bg-white p-2 shadow-sm">
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
          <span class="mr-2 text-amber-500">!</span>{{ section.title }}
        </h2>
      </div>

      <div class="p-4">
        <div
          v-if="section.items.length"
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
