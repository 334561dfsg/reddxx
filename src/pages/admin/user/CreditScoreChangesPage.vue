<script setup>
import { ref, computed, onMounted, watch, reactive } from 'vue'
import {
  getCreditScoreChanges,
  creditScoreChanges,
  creditScoreAuditList
} from '../../../admin/mock/creditScore'
import {
  CREDIT_SCORE_CHANGE_TYPE,
  CREDIT_SCORE_CHANGE_TYPE_OPTIONS,
  CREDIT_SCORE_AUDIT_STATUS
} from '../../../admin/constants/creditScore'
import CreditScoreAuditDrawer from '../../../admin/components/credit-score-audit/CreditScoreAuditDrawer.vue'

/** 将变动日志行转为审核抽屉所需结构，并尽量关联审核库中的记录以展示历史审核信息 */
function buildAuditFromChange(change) {
  const matched = creditScoreAuditList.find(
    (a) =>
      a.userId === change.userId &&
      a.beforeScore === change.beforeScore &&
      a.afterScore === change.afterScore &&
      a.changeAmount === change.changeAmount &&
      a.changeType === change.changeType
  )
  if (matched) {
    return { ...matched }
  }
  return {
    id: change.id,
    userId: change.userId,
    username: change.username,
    email: `${change.username}@example.com`,
    changeType: change.changeType,
    beforeScore: change.beforeScore,
    afterScore: change.afterScore,
    changeAmount: change.changeAmount,
    relatedAmount: change.relatedAmount ?? null,
    reason: change.reason,
    applyOperatorId: change.operatorId,
    applyOperatorName: change.operatorName,
    applyTime: change.createdAt,
    auditStatus: CREDIT_SCORE_AUDIT_STATUS.AUTO_APPROVED,
    auditTime: change.createdAt,
    auditorId: null,
    auditorName: '—',
    auditNote: '系统自动生效，无人工审核记录'
  }
}

// 搜索和筛选
const searchKeyword = ref('')
const selectedChangeType = ref('all')
const dateRange = ref({ start: '', end: '' })

// 数据和分页
const changes = ref([])
const loading = ref(false)
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const totalPages = computed(() => Math.ceil(pagination.total / pagination.pageSize))

// 获取数据
const fetchChanges = async () => {
  loading.value = true
  try {
    const { list, total } = await getCreditScoreChanges({
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      searchKeyword: searchKeyword.value,
      changeType: selectedChangeType.value,
      dateRange: dateRange.value
    })
    changes.value = list
    pagination.total = total
  } catch (error) {
    console.error('获取信用分变动日志失败:', error)
  } finally {
    loading.value = false
  }
}

// 监听筛选和分页变化
watch(
  [searchKeyword, selectedChangeType, dateRange, () => pagination.currentPage],
  (newVal, oldVal) => {
    // 如果是筛选条件变化，重置页码到1
    const isPaginationChange = newVal[3] !== oldVal[3]
    if (!isPaginationChange && pagination.currentPage !== 1) {
      pagination.currentPage = 1
    } else {
      fetchChanges()
    }
  },
  { deep: true }
)

onMounted(fetchChanges)

// 类型配置
const changeTypeConfig = {
  [CREDIT_SCORE_CHANGE_TYPE.RECHARGE]: { text: '充值', class: 'bg-blue-100 text-blue-700' },
  [CREDIT_SCORE_CHANGE_TYPE.PRIMARY_KYC]: { text: '初级认证', class: 'bg-emerald-100 text-emerald-700' },
  [CREDIT_SCORE_CHANGE_TYPE.ADVANCED_KYC]: { text: '高级认证', class: 'bg-purple-100 text-purple-700' },
  [CREDIT_SCORE_CHANGE_TYPE.MANUAL_ADJUST]: { text: '手动调整', class: 'bg-amber-100 text-amber-700' },
  [CREDIT_SCORE_CHANGE_TYPE.AUTO_UPGRADE]: { text: '自动升级', class: 'bg-indigo-100 text-indigo-700' },
  [CREDIT_SCORE_CHANGE_TYPE.PENALTY]: { text: '惩罚', class: 'bg-rose-100 text-rose-700' },
  [CREDIT_SCORE_CHANGE_TYPE.REWARD]: { text: '奖励', class: 'bg-teal-100 text-teal-700' }
}

// 统计信息
const statistics = computed(() => {
  const total = creditScoreChanges.length
  const increases = creditScoreChanges.filter(c => c.changeAmount > 0).length
  const decreases = creditScoreChanges.filter(c => c.changeAmount < 0).length
  const totalIncrease = creditScoreChanges.reduce((sum, c) => c.changeAmount > 0 ? sum + c.changeAmount : sum, 0)

  return [
    { label: '总变动记录', value: total.toLocaleString(), class: 'text-blue-600' },
    { label: '增加记录', value: increases.toLocaleString(), class: 'text-emerald-600' },
    { label: '减少记录', value: decreases.toLocaleString(), class: 'text-rose-600' },
    { label: '累计增加', value: `+${totalIncrease}`, class: 'text-purple-600' }
  ]
})

// 格式化日期时间
const formatDateTime = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

// 格式化金额
const formatAmount = (amount) => {
  if (!amount) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// 重置筛选
const resetFilters = () => {
  searchKeyword.value = ''
  selectedChangeType.value = 'all'
  dateRange.value = { start: '', end: '' }
  pagination.currentPage = 1
}

// 导出数据
const exportData = () => {
  alert('导出功能待实现')
}

// 变动详情抽屉（含「历史审核信息」，与「信用分变动审核」页待处理抽屉区分）
const showChangeDetail = ref(false)
const selectedAuditPayload = ref(null)

const openChangeDetail = (change) => {
  selectedAuditPayload.value = buildAuditFromChange(change)
  showChangeDetail.value = true
}

const closeChangeDetail = () => {
  showChangeDetail.value = false
  selectedAuditPayload.value = null
}
</script>

<template>
  <section class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">信用分变动日志</h1>
        <p class="text-sm text-slate-500 mt-1">查看所有用户的信用分变动记录</p>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div
        v-for="(stat, index) in statistics"
        :key="index"
        class="bg-white rounded-xl border border-slate-200 p-4"
      >
        <p class="text-sm text-slate-600 mb-1">{{ stat.label }}</p>
        <p :class="stat.class" class="text-2xl font-bold">{{ stat.value }}</p>
      </div>
    </div>

    <!-- 筛选栏与数据表格合并 -->
    <div class="rounded-xl border border-slate-200 bg-white overflow-hidden relative min-h-[400px]">
      <div class="flex items-center justify-between border-b border-slate-200 p-4 bg-white">
        <h3 class="text-base font-semibold text-slate-900">变动记录</h3>
        <button
          @click="exportData"
          class="ant-btn inline-flex items-center gap-2"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          导出数据
        </button>
      </div>

      <div class="p-4 border-b border-slate-100 bg-slate-50/30">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <!-- 搜索 -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">搜索</label>
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="用户名/ID/原因..."
              class="ant-input !py-1.5"
            />
          </div>

          <!-- 变动类型 -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">变动类型</label>
            <select
              v-model="selectedChangeType"
              class="ant-select !py-1.5"
            >
              <option value="all">全部类型</option>
              <option
                v-for="option in CREDIT_SCORE_CHANGE_TYPE_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- 开始日期 -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">开始日期</label>
            <input
              v-model="dateRange.start"
              type="date"
              class="ant-input !py-1.5"
            />
          </div>

          <!-- 结束日期 -->
          <div class="flex items-end gap-2">
            <div class="flex-1">
              <label class="block text-sm font-medium text-slate-700 mb-1.5">结束日期</label>
              <input
                v-model="dateRange.end"
                type="date"
                class="ant-input !py-1.5"
              />
            </div>
            <button
              @click="resetFilters"
              title="重置筛选"
              class="p-2 text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 加载遮罩 -->
      <div v-if="loading" class="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
        <div class="flex flex-col items-center">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <p class="mt-2 text-sm text-slate-500 font-medium">加载中...</p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">用户</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">变动类型</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">变动前</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">变动值</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">变动后</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">关联金额</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">原因</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">操作人</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">时间</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr
              v-for="change in changes"
              :key="change.id"
              class="hover:bg-slate-50 transition-colors"
            >
              <!-- 用户 -->
              <td class="px-4 py-3">
                <div>
                  <p class="text-sm font-medium text-slate-900">{{ change.username }}</p>
                  <p class="text-xs text-slate-500">{{ change.userId }}</p>
                </div>
              </td>

              <!-- 变动类型 -->
              <td class="px-4 py-3">
                <span
                  v-if="changeTypeConfig[change.changeType]"
                  :class="changeTypeConfig[change.changeType].class"
                  class="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                >
                  {{ changeTypeConfig[change.changeType].text }}
                </span>
              </td>

              <!-- 变动前 -->
              <td class="px-4 py-3 text-center">
                <span class="text-sm font-medium text-slate-700">{{ change.beforeScore }}</span>
              </td>

              <!-- 变动值 -->
              <td class="px-4 py-3 text-center">
                <span
                  :class="change.changeAmount > 0 ? 'text-emerald-600' : change.changeAmount < 0 ? 'text-rose-600' : 'text-slate-600'"
                  class="text-sm font-semibold"
                >
                  {{ change.changeAmount > 0 ? '+' : '' }}{{ change.changeAmount }}
                </span>
              </td>

              <!-- 变动后 -->
              <td class="px-4 py-3 text-center">
                <span class="text-sm font-medium text-slate-700">{{ change.afterScore }}</span>
              </td>

              <!-- 关联金额 -->
              <td class="px-4 py-3">
                <span v-if="change.relatedAmount" class="text-sm text-slate-700 font-medium">
                  {{ formatAmount(change.relatedAmount) }}
                </span>
                <span v-else class="text-sm text-slate-400">-</span>
              </td>

              <!-- 原因 -->
              <td class="px-4 py-3">
                <span class="text-sm text-slate-700">{{ change.reason }}</span>
              </td>

              <!-- 操作人 -->
              <td class="px-4 py-3">
                <span class="text-sm text-slate-700">{{ change.operatorName }}</span>
              </td>

              <!-- 时间 -->
              <td class="px-4 py-3">
                <span class="text-sm text-slate-600">{{ formatDateTime(change.createdAt) }}</span>
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  type="button"
                  class="text-sm font-medium text-blue-600 hover:text-blue-800"
                  @click="openChangeDetail(change)"
                >
                  查看
                </button>
              </td>
            </tr>

            <!-- 空状态 -->
            <tr v-if="!loading && changes.length === 0">
              <td colspan="10" class="px-4 py-12 text-center">
                <svg class="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p class="mt-2 text-sm text-slate-600">暂无数据</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
        <div class="text-sm text-slate-600">
          共 <span class="font-medium">{{ pagination.total }}</span> 条记录，第 <span class="font-medium">{{ pagination.currentPage }}</span> / <span class="font-medium">{{ totalPages }}</span> 页
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="pagination.currentPage--"
            :disabled="pagination.currentPage === 1 || loading"
            class="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            上一页
          </button>
          <button
            @click="pagination.currentPage++"
            :disabled="pagination.currentPage === totalPages || loading"
            class="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            下一页
          </button>
        </div>
      </div>
    </div>

    <CreditScoreAuditDrawer
      :visible="showChangeDetail"
      :audit="selectedAuditPayload"
      :show-audit-history-section="true"
      read-only
      @close="closeChangeDetail"
    />
  </section>
</template>
