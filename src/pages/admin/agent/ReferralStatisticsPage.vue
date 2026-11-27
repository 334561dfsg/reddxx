<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { referralStatsReportApi } from '../../../admin/mock/referralStatsReport'
import { referralApi } from '../../../admin/mock/referral'
import {
  getReferralCreditToLabel,
  getReferralSettlementScheduleLine,
  getReferralSettlementNotifyLine
} from '../../../admin/constants/referral'

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
const dailyLoading = ref(false)
const dailyRows = ref([])
const selectedDate = ref(null)
const detailLoading = ref(false)
const dayInviters = ref([])
const settlementCfg = ref(null)

const settlementCreditLabel = computed(() =>
  settlementCfg.value ? getReferralCreditToLabel(settlementCfg.value.referralCommissionCreditTo) : ''
)

const settlementScheduleLine = computed(() =>
  settlementCfg.value ? getReferralSettlementScheduleLine(settlementCfg.value) : ''
)

const settlementNotifyLine = computed(() =>
  settlementCfg.value ? getReferralSettlementNotifyLine(settlementCfg.value) : ''
)

const selectedDayLabel = computed(() => {
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
  dailyLoading.value = true
  try {
    const res = await referralStatsReportApi.getDailySummary({
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
        dayInviters.value = []
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    dailyLoading.value = false
  }
}

const selectDay = async (date) => {
  if (selectedDate.value === date) {
    selectedDate.value = null
    dayInviters.value = []
    return
  }
  selectedDate.value = date
  detailLoading.value = true
  dayInviters.value = []
  try {
    const res = await referralStatsReportApi.getInvitersForDate(date)
    if (selectedDate.value !== date) return // a newer day was selected meanwhile
    if (res.success) {
      dayInviters.value = res.data.list || []
    }
  } catch (e) {
    console.error(e)
  } finally {
    if (selectedDate.value === date) detailLoading.value = false
  }
}

const isRowActive = (date) => selectedDate.value === date

function closeReferralDrawer() {
  selectedDate.value = null
  dayInviters.value = []
}

function onReferralDrawerEscape(e) {
  if (e.key === 'Escape') closeReferralDrawer()
}

watch(selectedDate, (v) => {
  if (v) document.addEventListener('keydown', onReferralDrawerEscape)
  else document.removeEventListener('keydown', onReferralDrawerEscape)
})

onMounted(async () => {
  loadDaily()
  try {
    const res = await referralApi.getReferralConfig()
    if (res.success) settlementCfg.value = res.data
  } catch (e) {
    console.error(e)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', onReferralDrawerEscape)
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900">裂变分销统计</h1>
      <p class="mt-1 text-sm text-slate-500">
        按日汇总裂变分佣；点击某一行从右侧查看当日获得分佣的邀请上级明细。
      </p>
    </div>

    <div
      v-if="settlementCfg"
      class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700"
    >
      <span class="min-w-0 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2 sm:gap-y-1">
        <span>
          当前入账：<span class="font-medium text-slate-900">{{ settlementCreditLabel }}</span>
        </span>
        <span class="hidden sm:inline text-slate-300" aria-hidden="true">·</span>
        <span class="text-slate-700">
          <span class="text-slate-500">结算安排：</span>
          <span class="font-medium text-slate-900">{{ settlementScheduleLine }}</span>
        </span>
        <span class="w-full text-xs text-slate-600 sm:w-auto">{{ settlementNotifyLine }}</span>
      </span>
      <router-link to="/admin/agent/referral-config" class="text-sm font-medium text-blue-600 hover:underline no-underline">
        设置
      </router-link>
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
        <button
          type="button"
          class="ant-btn ant-btn-primary !h-9"
          :disabled="dailyLoading"
          @click="loadDaily"
        >
          {{ dailyLoading ? '查询中…' : '查询' }}
        </button>
      </div>

      <div class="relative min-h-[240px] overflow-x-auto">
        <div
          v-if="dailyLoading"
          class="absolute inset-0 z-10 flex items-center justify-center bg-white/70"
        >
          <div class="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-violet-600" />
        </div>

        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">日期</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">当日佣金 (USDT)</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">有佣上级数</th>
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
              <td class="px-4 py-3 text-right tabular-nums text-slate-700">{{ row.inviterCount }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-slate-600">{{ row.recordCount }}</td>
              <td class="px-4 py-3 text-center">
                <button
                  type="button"
                  class="text-xs font-medium text-violet-600 hover:text-violet-800 hover:underline"
                  @click.stop="selectDay(row.date)"
                >
                  {{ isRowActive(row.date) ? '收起' : '查看明细' }}
                </button>
              </td>
            </tr>
            <tr v-if="!dailyLoading && dailyRows.length === 0">
              <td colspan="5" class="px-4 py-12 text-center text-slate-500">该范围内暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="referral-stats-drawer">
        <div
          v-if="selectedDate"
          class="fixed inset-0 z-[100] flex justify-end bg-black/40"
          role="presentation"
        >
          <aside
            class="referral-stats-drawer-panel flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="referral-stats-drawer-title"
            @click.stop
          >
            <div class="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/90 px-4 py-3 sm:px-5">
              <div class="min-w-0">
                <h2 id="referral-stats-drawer-title" class="text-base font-semibold text-slate-900">
                  {{ selectedDayLabel }} · 获得裂变分佣的邀请上级
                </h2>
                <p class="mt-0.5 text-xs text-slate-500">按当日佣金从高到低排序</p>
              </div>
              <button
                type="button"
                class="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="关闭"
                @click="closeReferralDrawer"
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
                    <th class="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">分佣笔数</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="u in dayInviters" :key="u.uid" class="hover:bg-slate-50/80">
                    <td class="px-4 py-2.5 font-mono text-slate-900">{{ u.uid }}</td>
                    <td class="px-4 py-2.5 font-medium text-slate-900">{{ u.username }}</td>
                    <td class="px-4 py-2.5 text-slate-600">{{ u.email }}</td>
                    <td class="px-4 py-2.5 text-right font-mono tabular-nums text-emerald-700">
                      ${{ u.commission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                    </td>
                    <td class="px-4 py-2.5 text-right tabular-nums text-slate-600">{{ u.orderCount }}</td>
                  </tr>
                  <tr v-if="!detailLoading && dayInviters.length === 0">
                    <td colspan="5" class="px-4 py-8 text-center text-slate-500">暂无数据</td>
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
.referral-stats-drawer-enter-active,
.referral-stats-drawer-leave-active {
  transition: opacity 0.2s ease;
}
.referral-stats-drawer-enter-active .referral-stats-drawer-panel,
.referral-stats-drawer-leave-active .referral-stats-drawer-panel {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}
.referral-stats-drawer-enter-from,
.referral-stats-drawer-leave-to {
  opacity: 0;
}
.referral-stats-drawer-enter-from .referral-stats-drawer-panel,
.referral-stats-drawer-leave-to .referral-stats-drawer-panel {
  transform: translateX(100%);
}
</style>
