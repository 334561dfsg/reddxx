<script setup>
import { computed, ref } from 'vue'
import { AGENT_PRODUCT_LINE_DEFS } from '../../admin/constants/agentCommission'
import AgentListPaginationBar from '../../components/agent-system/AgentListPaginationBar.vue'
import { useAgentPagedList } from '../../composables/useAgentListPagination'
import { agentDailyReportRows } from '../../admin/mock/agentPortal'

/** 明细表列名（与记佣产品线 key 对应） */
const MODULE_COL_LABEL = {
  deposit: '充值',
  perpetual: '永续',
  delivery: '交割',
  spot: '现货',
  aiQuant: 'AI量化',
  lending: '理财',
  borrowing: '借贷'
}

const monthKeys = [
  ...new Set(agentDailyReportRows.map((r) => r.date.slice(0, 7)))
].sort((a, b) => (a < b ? 1 : -1))

const monthFilter = ref(monthKeys[0] ?? '')

function monthLabel(ym) {
  const [y, m] = ym.split('-')
  return `${y}年${Number(m)}月`
}

const rows = computed(() =>
  agentDailyReportRows
    .filter((r) => r.date.startsWith(monthFilter.value))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
)

const totals = computed(() => {
  const list = rows.value
  return {
    tradeVolume: list.reduce((s, r) => s + r.tradeVolume, 0),
    newInvites: list.reduce((s, r) => s + r.newInvites, 0),
    estCommission: list.reduce((s, r) => s + r.estCommission, 0)
  }
})

const { pageSize, currentPage, totalCount, totalPages, pagedList } = useAgentPagedList(rows)
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm text-white/50">
      下表按<strong class="text-white/75">后台代理记佣产品线</strong>展示各模块交易额；对接接口后以服务端口径为准。
    </p>

    <div class="flex flex-wrap items-end gap-3">
      <div>
        <label class="block text-xs text-white/45">统计月份</label>
        <select
          v-model="monthFilter"
          class="mt-1 min-w-[10rem] rounded-lg border border-white/10 bg-[#0c1219] px-3 py-2 text-sm text-white"
        >
          <option v-for="m in monthKeys" :key="m" :value="m">{{ monthLabel(m) }}</option>
        </select>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
        <p class="text-xs text-white/45">该月累计交易额</p>
        <p class="mt-1 text-lg font-semibold tabular-nums text-white">
          {{ totals.tradeVolume.toLocaleString('zh-CN') }}
          <span class="text-sm font-normal text-white/40">USDT</span>
        </p>
      </div>
      <div class="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
        <p class="text-xs text-white/45">该月新增直邀合计</p>
        <p class="mt-1 text-lg font-semibold tabular-nums text-emerald-200/95">
          {{ totals.newInvites.toLocaleString('zh-CN') }}
        </p>
      </div>
      <div class="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
        <p class="text-xs text-white/45">该月预估佣金合计</p>
        <p class="mt-1 text-lg font-semibold tabular-nums text-emerald-300">
          {{ totals.estCommission.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          <span class="text-sm font-normal text-white/40">USDT</span>
        </p>
      </div>
    </div>

    <div class="overflow-hidden rounded-xl border border-white/[0.06]">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[72rem] border-collapse text-left text-sm">
          <thead class="bg-white/[0.04] text-[11px] text-white/50">
            <tr>
              <th class="sticky left-0 z-10 bg-[#0f141c] px-3 py-3 font-medium backdrop-blur-sm">日期</th>
              <th
                v-for="d in AGENT_PRODUCT_LINE_DEFS"
                :key="d.key"
                class="px-2 py-3 text-right font-medium whitespace-nowrap"
              >
                {{ MODULE_COL_LABEL[d.key] }}额
              </th>
              <th class="px-2 py-3 text-right font-medium whitespace-nowrap">当日合计</th>
              <th class="px-2 py-3 text-right font-medium whitespace-nowrap">新增</th>
              <th class="px-3 py-3 text-right font-medium whitespace-nowrap">预估佣金</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.05] text-[13px]">
            <tr v-for="r in pagedList" :key="r.date" class="hover:bg-white/[0.02]">
              <td class="sticky left-0 z-10 bg-[#0a0f14]/95 px-3 py-2.5 font-mono text-white/85 backdrop-blur-sm">
                {{ r.date }}
              </td>
              <td
                v-for="d in AGENT_PRODUCT_LINE_DEFS"
                :key="d.key"
                class="px-2 py-2.5 text-right tabular-nums text-white/80"
              >
                {{ (r.volumeByModule?.[d.key] ?? 0).toLocaleString('zh-CN') }}
              </td>
              <td class="px-2 py-2.5 text-right tabular-nums font-medium text-white">
                {{ r.tradeVolume.toLocaleString('zh-CN') }}
              </td>
              <td class="px-2 py-2.5 text-right tabular-nums text-emerald-200/90">{{ r.newInvites }}</td>
              <td class="px-3 py-2.5 text-right tabular-nums text-emerald-300/95">
                {{ r.estCommission.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </td>
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
  </div>
</template>
