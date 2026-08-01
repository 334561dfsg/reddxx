<script setup>
import { computed, ref, watch } from 'vue'
import { AGENT_PRODUCT_LINE_DEFS } from '../../admin/constants/agentCommission'
import { agentDailyReportRows } from '../../admin/mock/agentPortal'
import AgentListPaginationBar from '../../components/agent-system/AgentListPaginationBar.vue'
import { useAgentPagedList } from '../../composables/useAgentListPagination'

const PRODUCT_LABEL = {
  deposit: '充值',
  perpetual: '永续合约',
  delivery: '交割合约',
  spot: '现货',
  aiQuant: 'AI 量化',
  lending: '理财',
  borrowing: '借贷'
}

const productFilter = ref('all')
const dateFrom = ref('')
const dateTo = ref('')

const productOptions = computed(() =>
  AGENT_PRODUCT_LINE_DEFS.map((d) => ({
    value: d.key,
    label: PRODUCT_LABEL[d.key] ?? d.title
  }))
)

const queryRows = computed(() => {
  const rows = []
  for (const day of agentDailyReportRows) {
    for (const product of productOptions.value) {
      const tradeVolume = Number(day.volumeByModule?.[product.value] ?? 0)
      const estCommission = Number(day.commissionByModule?.[product.value] ?? 0)
      rows.push({
        id: `${day.date}-${product.value}`,
        date: day.date,
        productKey: product.value,
        productName: product.label,
        tradeVolume,
        estCommission,
        newInvites: day.newInvites,
      })
    }
  }
  return rows
})

const rows = computed(() =>
  queryRows.value
    .filter((r) => productFilter.value === 'all' || r.productKey === productFilter.value)
    .filter((r) => !dateFrom.value || r.date >= dateFrom.value)
    .filter((r) => !dateTo.value || r.date <= dateTo.value)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.productName.localeCompare(b.productName)))
)

const totals = computed(() => ({
  rows: rows.value.length,
  tradeVolume: rows.value.reduce((s, r) => s + r.tradeVolume, 0),
  estCommission: rows.value.reduce((s, r) => s + r.estCommission, 0)
}))

const { pageSize, currentPage, totalCount, totalPages, pagedList } = useAgentPagedList(rows)

watch([productFilter, dateFrom, dateTo], () => {
  currentPage.value = 1
})

function openDatePicker(event) {
  const el = event?.currentTarget
  if (typeof el?.showPicker !== 'function') return
  try {
    el.showPicker()
  } catch {
    // Browser may reject showPicker when focus/click is not treated as a direct user gesture.
  }
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <p class="text-sm font-medium text-white/90">业绩数据查询</p>
      <p class="mt-1 text-sm leading-relaxed text-white/50">
        按日期和产品线检索直邀用户产生的交易额与预估佣金；成员列表请在「团队管理」查看。
      </p>
    </div>

    <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div class="grid gap-3 sm:grid-cols-3">
        <div>
          <label class="block text-xs text-white/45">产品线</label>
          <select
            v-model="productFilter"
            class="mt-1 w-full rounded-lg border border-white/10 bg-[#0c1219] px-3 py-2 text-sm text-white"
          >
            <option value="all">全部产品线</option>
            <option v-for="o in productOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-white/45">开始日期</label>
          <input
            v-model="dateFrom"
            type="date"
            class="mt-1 w-full rounded-lg border border-white/10 bg-[#0c1219] px-3 py-2 text-sm text-white [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:invert"
            @click="openDatePicker"
            @focus="openDatePicker"
          />
        </div>
        <div>
          <label class="block text-xs text-white/45">结束日期</label>
          <input
            v-model="dateTo"
            type="date"
            class="mt-1 w-full rounded-lg border border-white/10 bg-[#0c1219] px-3 py-2 text-sm text-white [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:invert"
            @click="openDatePicker"
            @focus="openDatePicker"
          />
        </div>
      </div>
      <button
        type="button"
        class="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/75 transition hover:bg-white/[0.04]"
        @click="productFilter = 'all'; dateFrom = ''; dateTo = ''"
      >
        重置
      </button>
    </div>

    <div class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
        <p class="text-xs text-white/45">匹配记录</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums text-white">{{ totals.rows }}</p>
      </div>
      <div class="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
        <p class="text-xs text-white/45">交易额合计（USDT）</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums text-emerald-200/95">
          {{ totals.tradeVolume.toLocaleString('zh-CN') }}
        </p>
      </div>
      <div class="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
        <p class="text-xs text-white/45">预估佣金合计（USDT）</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums text-emerald-300">
          {{ totals.estCommission.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
        </p>
      </div>
    </div>

    <div class="overflow-hidden rounded-xl border border-white/[0.06]">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[52rem] border-collapse text-left text-sm">
          <thead class="bg-white/[0.04] text-xs text-white/50">
            <tr>
              <th class="px-4 py-3 font-medium">日期</th>
              <th class="px-4 py-3 font-medium">产品线</th>
              <th class="px-4 py-3 text-right font-medium">交易额（USDT）</th>
              <th class="px-4 py-3 text-right font-medium">预估佣金（USDT）</th>
              <th class="px-4 py-3 text-right font-medium">当日新增直邀</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.05]">
            <tr v-for="r in pagedList" :key="r.id" class="hover:bg-white/[0.02]">
              <td class="px-4 py-3 font-mono text-white/75">{{ r.date }}</td>
              <td class="px-4 py-3 text-emerald-200/95">{{ r.productName }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-white">
                {{ r.tradeVolume.toLocaleString('zh-CN') }}
              </td>
              <td class="px-4 py-3 text-right tabular-nums text-emerald-300/95">
                {{ r.estCommission.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </td>
              <td class="px-4 py-3 text-right tabular-nums text-white/70">{{ r.newInvites }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <AgentListPaginationBar
        :current-page="currentPage"
        :total-pages="totalPages"
        :total-count="totalCount"
        :page-size="pageSize"
        @update:current-page="currentPage = $event"
        @update:page-size="pageSize = $event"
      />
    </div>
    <p v-if="!rows.length" class="text-center text-sm text-white/45">暂无匹配数据</p>
  </div>
</template>
