<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { mockAgentStats, agentApi } from '../../../admin/mock/agent'
import { agentReportApi } from '../../../admin/mock/agentReport'

const stats = ref({ ...mockAgentStats })

const statCards = computed(() => [
  {
    label: '总代理数',
    value: stats.value.totalAgents.toLocaleString(),
    trend: `+${stats.value.activeAgents} 活跃`,
    color: 'blue',
    good: true
  },
  {
    label: '推荐人数',
    value: stats.value.totalReferrals.toLocaleString(),
    trend: '代理名下用户',
    color: 'purple',
    good: true
  },
  {
    label: '累计佣金',
    value: `$${stats.value.totalCommission.toLocaleString()}`,
    trend: `本月 $${stats.value.monthCommission.toLocaleString()}`,
    color: 'green',
    good: true
  },
  {
    label: '今日佣金',
    value: `$${stats.value.todayCommission.toLocaleString()}`,
    trend: '实时数据',
    color: 'yellow',
    good: true
  }
])

const loadStats = async () => {
  try {
    const res = await agentApi.getAgentStats()
    if (res.success) {
      stats.value = res.data
    }
  } catch (e) {
    console.error(e)
  }
}

function defaultEndDate() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function defaultStartDate() {
  const d = new Date()
  d.setDate(d.getDate() - 29)
  return d.toISOString().slice(0, 10)
}

const startDate = ref(defaultStartDate())
const endDate = ref(defaultEndDate())

const loading = ref(false)
const dailyRows = ref([])

const selectedDate = ref(null)
const detailLoading = ref(false)
const dayAgents = ref([])

const selectedLabel = computed(() => {
  if (!selectedDate.value) return ''
  try {
    const d = new Date(`${selectedDate.value}T12:00:00`)
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    })
  } catch {
    return selectedDate.value
  }
})

const loadDaily = async () => {
  if (startDate.value && endDate.value && startDate.value > endDate.value) {
    const t = startDate.value
    startDate.value = endDate.value
    endDate.value = t
  }
  loading.value = true
  try {
    const res = await agentReportApi.getDailySummary({
      startDate: startDate.value,
      endDate: endDate.value
    })
    if (res.success) {
      dailyRows.value = res.data.list || []
      if (
        selectedDate.value &&
        !dailyRows.value.some((r) => r.date === selectedDate.value)
      ) {
        selectedDate.value = null
        dayAgents.value = []
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const selectDay = async (date) => {
  if (selectedDate.value === date) {
    selectedDate.value = null
    dayAgents.value = []
    return
  }
  selectedDate.value = date
  detailLoading.value = true
  dayAgents.value = []
  try {
    const res = await agentReportApi.getAgentsForDate(date)
    if (selectedDate.value !== date) return // a newer day was selected meanwhile
    if (res.success) {
      dayAgents.value = res.data.list || []
    }
  } catch (e) {
    console.error(e)
  } finally {
    if (selectedDate.value === date) detailLoading.value = false
  }
}

const isRowActive = (date) => selectedDate.value === date

function closeAgentDrawer() {
  selectedDate.value = null
  dayAgents.value = []
}

function onDrawerEscape(e) {
  if (e.key === 'Escape') closeAgentDrawer()
}

watch(selectedDate, (v) => {
  if (v) document.addEventListener('keydown', onDrawerEscape)
  else document.removeEventListener('keydown', onDrawerEscape)
})

onMounted(() => {
  loadStats()
  loadDaily()
})

onUnmounted(() => {
  document.removeEventListener('keydown', onDrawerEscape)
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900">代理报表</h1>
      <p class="mt-1 text-sm text-slate-500">
        全局概览与按日汇总代理渠道佣金；点击某一行从右侧打开当日产生佣金的代理明细（演示数据）。
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="card in statCards"
        :key="card.label"
        class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-slate-600 font-medium">{{ card.label }}</p>
            <p class="mt-2 text-2xl font-bold text-slate-900">{{ card.value }}</p>
            <p class="mt-1 text-xs font-medium" :class="card.good ? 'text-emerald-600' : 'text-slate-500'">
              {{ card.trend }}
            </p>
          </div>
          <div
            :class="`w-12 h-12 bg-${card.color}-50 rounded-xl flex items-center justify-center border border-${card.color}-100 transition-all hover:scale-105 font-medium`"
          >
            <div
              :class="`w-6 h-6 bg-${card.color}-500 rounded-lg shadow-sm opacity-80 text-white flex items-center justify-center text-xs font-bold italic font-medium`"
            >
              {{ card.label.charAt(0) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div
        class="flex flex-wrap items-end gap-3 border-b border-slate-200 p-4 md:px-6 bg-slate-50/30"
      >
        <div>
          <label class="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500"
            >开始日期</label
          >
          <input v-model="startDate" type="date" class="ant-input !h-9 !text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500"
            >结束日期</label
          >
          <input v-model="endDate" type="date" class="ant-input !h-9 !text-sm" />
        </div>
        <button type="button" class="ant-btn ant-btn-primary !h-9" :disabled="loading" @click="loadDaily">
          {{ loading ? '查询中…' : '查询' }}
        </button>
      </div>

      <div class="relative min-h-[280px] overflow-x-auto">
        <div
          v-if="loading"
          class="absolute inset-0 z-10 flex items-center justify-center bg-white/70"
        >
          <div class="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-violet-600" />
        </div>

        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">日期</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">当日佣金 (USDT)</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">有佣代理数</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">分佣笔数</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600 w-28">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr
              v-for="row in dailyRows"
              :key="row.date"
              class="transition-colors"
              :class="
                isRowActive(row.date)
                  ? 'bg-violet-50/80 hover:bg-violet-50'
                  : 'hover:bg-slate-50/90 cursor-pointer'
              "
              @click="selectDay(row.date)"
            >
              <td class="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                {{ row.date }}
              </td>
              <td class="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                ${{ row.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </td>
              <td class="px-4 py-3 text-right tabular-nums text-slate-700">{{ row.agentCount }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-slate-600">{{ row.recordCount }}</td>
              <td class="px-4 py-3 text-center">
                <button
                  type="button"
                  class="text-xs font-medium text-violet-600 hover:text-violet-800 hover:underline"
                  @click.stop="selectDay(row.date)"
                >
                  {{ isRowActive(row.date) ? '收起' : '查看代理' }}
                </button>
              </td>
            </tr>
            <tr v-if="!loading && dailyRows.length === 0">
              <td colspan="5" class="px-4 py-12 text-center text-slate-500">该范围内暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 当日代理明细：右侧抽屉（Teleport 到 body，避免主内容区 overflow 裁切 fixed 遮罩） -->
    <Teleport to="body">
      <Transition name="agent-report-drawer">
        <div
          v-if="selectedDate"
          class="fixed inset-0 z-[100] flex justify-end bg-black/40"
          role="presentation"
        >
          <aside
            class="agent-report-drawer-panel flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-report-drawer-title"
            @click.stop
          >
            <div class="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/90 px-4 py-3 sm:px-5">
              <div class="min-w-0">
                <h2 id="agent-report-drawer-title" class="text-base font-semibold text-slate-900">
                  {{ selectedLabel }} · 产生佣金的代理
                </h2>
                <p class="mt-0.5 text-xs text-slate-500">按当日佣金从高到低排序</p>
              </div>
              <button
                type="button"
                class="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="关闭"
                @click="closeAgentDrawer"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="relative min-h-0 flex-1 overflow-x-auto overflow-y-auto">
              <div
                v-if="detailLoading"
                class="absolute inset-0 z-10 flex items-center justify-center bg-white/80"
              >
                <div class="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-violet-600" />
              </div>

              <table class="min-w-full divide-y divide-slate-200 text-sm">
                <thead class="sticky top-0 z-[1] bg-slate-50 shadow-[0_1px_0_0_rgb(226_232_240)]">
                  <tr>
                    <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">UID</th>
                    <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">用户名</th>
                    <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">邮箱</th>
                    <th class="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">当日佣金 (USDT)</th>
                    <th class="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">关联笔数</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="a in dayAgents" :key="a.uid" class="hover:bg-slate-50/80">
                    <td class="px-4 py-2.5 font-mono text-slate-900">{{ a.uid }}</td>
                    <td class="px-4 py-2.5 font-medium text-slate-900">{{ a.username }}</td>
                    <td class="px-4 py-2.5 text-slate-600">{{ a.email }}</td>
                    <td class="px-4 py-2.5 text-right font-mono tabular-nums text-emerald-700">
                      ${{ a.commission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                    </td>
                    <td class="px-4 py-2.5 text-right tabular-nums text-slate-600">{{ a.orderCount }}</td>
                  </tr>
                  <tr v-if="!detailLoading && dayAgents.length === 0">
                    <td colspan="5" class="px-4 py-8 text-center text-slate-500">暂无代理数据</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </aside>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.agent-report-drawer-enter-active,
.agent-report-drawer-leave-active {
  transition: opacity 0.2s ease;
}
.agent-report-drawer-enter-active .agent-report-drawer-panel,
.agent-report-drawer-leave-active .agent-report-drawer-panel {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}
.agent-report-drawer-enter-from,
.agent-report-drawer-leave-to {
  opacity: 0;
}
.agent-report-drawer-enter-from .agent-report-drawer-panel,
.agent-report-drawer-leave-to .agent-report-drawer-panel {
  transform: translateX(100%);
}
</style>
