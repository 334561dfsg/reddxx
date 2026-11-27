<script setup>
import { ref, computed, onMounted, watch, reactive } from 'vue'
import { getCreditScoreAudits, creditScoreAuditList } from '../../../admin/mock/creditScore'
import CreditScoreAuditDrawer from '../../../admin/components/credit-score-audit/CreditScoreAuditDrawer.vue'
import {
  CREDIT_SCORE_CHANGE_TYPE,
  CREDIT_SCORE_CHANGE_TYPE_OPTIONS,
  CREDIT_SCORE_AUDIT_STATUS
} from '../../../admin/constants/creditScore'

// 审核列表数据
const auditList = ref([])
const loading = ref(false)

// 搜索和筛选
const searchKeyword = ref('')
const filterChangeType = ref('all')
const filterStatus = ref(CREDIT_SCORE_AUDIT_STATUS.PENDING)
const dateRange = ref({ start: '', end: '' })

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const totalPages = computed(() => Math.ceil(pagination.total / pagination.pageSize))

// 获取数据
const fetchAudits = async () => {
  loading.value = true
  try {
    const { list, total } = await getCreditScoreAudits({
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      searchKeyword: searchKeyword.value,
      changeType: filterChangeType.value,
      auditStatus: CREDIT_SCORE_AUDIT_STATUS.PENDING,
      dateRange: dateRange.value
    })
    auditList.value = list
    pagination.total = total
  } catch (error) {
    console.error('获取积分审核列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 监听筛选和分页变化
watch(
  [searchKeyword, filterChangeType, filterStatus, dateRange, () => pagination.currentPage],
  (newVal, oldVal) => {
    // 如果是筛选条件变化，重置页码到1
    const isPaginationChange = newVal[4] !== oldVal[4]
    if (!isPaginationChange && pagination.currentPage !== 1) {
      pagination.currentPage = 1
    } else {
      fetchAudits()
    }
  },
  { deep: true }
)

onMounted(fetchAudits)

// 审核抽屉
const showDetailModal = ref(false)
const selectedAudit = ref(null)

// Toast提示
const toast = ref({
  visible: false,
  message: ''
})

// 统计信息
const statistics = computed(() => {
  const total = creditScoreAuditList.length
  const pending = creditScoreAuditList.filter(a => a.auditStatus === CREDIT_SCORE_AUDIT_STATUS.PENDING).length
  const approved = creditScoreAuditList.filter(a => a.auditStatus === CREDIT_SCORE_AUDIT_STATUS.APPROVED).length
  const rejected = creditScoreAuditList.filter(a => a.auditStatus === CREDIT_SCORE_AUDIT_STATUS.REJECTED).length
  
  return [
    {
      label: '待审核',
      value: pending.toLocaleString(),
      trend: '需处理',
      color: 'amber'
    },
    {
      label: '已通过',
      value: approved.toLocaleString(),
      trend: `${total > 0 ? ((approved / total) * 100).toFixed(1) : 0}% 通过率`,
      color: 'emerald'
    },
    {
      label: '已拒绝',
      value: rejected.toLocaleString(),
      trend: `${total > 0 ? ((rejected / total) * 100).toFixed(1) : 0}% 拒绝率`,
      color: 'rose'
    },
    {
      label: '总申请',
      value: total.toLocaleString(),
      trend: '本月',
      color: 'blue'
    }
  ]
})

// 状态配置
const statusConfig = {
  [CREDIT_SCORE_AUDIT_STATUS.PENDING]: { text: '待审核', class: 'bg-amber-100 text-amber-700' },
  [CREDIT_SCORE_AUDIT_STATUS.APPROVED]: { text: '已通过', class: 'bg-emerald-100 text-emerald-700' },
  [CREDIT_SCORE_AUDIT_STATUS.REJECTED]: { text: '已拒绝', class: 'bg-rose-100 text-rose-700' },
  [CREDIT_SCORE_AUDIT_STATUS.AUTO_APPROVED]: { text: '自动通过', class: 'bg-blue-100 text-blue-700' }
}

// 变动类型配置
const changeTypeConfig = {
  [CREDIT_SCORE_CHANGE_TYPE.RECHARGE]: { text: '充值', class: 'bg-blue-100 text-blue-700' },
  [CREDIT_SCORE_CHANGE_TYPE.PRIMARY_KYC]: { text: '初级认证', class: 'bg-emerald-100 text-emerald-700' },
  [CREDIT_SCORE_CHANGE_TYPE.ADVANCED_KYC]: { text: '高级认证', class: 'bg-purple-100 text-purple-700' },
  [CREDIT_SCORE_CHANGE_TYPE.MANUAL_ADJUST]: { text: '手动调整', class: 'bg-amber-100 text-amber-700' },
  [CREDIT_SCORE_CHANGE_TYPE.AUTO_UPGRADE]: { text: '自动升级', class: 'bg-indigo-100 text-indigo-700' },
  [CREDIT_SCORE_CHANGE_TYPE.PENALTY]: { text: '惩罚', class: 'bg-rose-100 text-rose-700' },
  [CREDIT_SCORE_CHANGE_TYPE.REWARD]: { text: '奖励', class: 'bg-teal-100 text-teal-700' }
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 查看详情
const viewDetail = (audit) => {
  selectedAudit.value = audit
  showDetailModal.value = true
}

// 关闭详情
const closeDetail = () => {
  showDetailModal.value = false
  selectedAudit.value = null
}

// 提交审核（由 CreditScoreAuditDrawer 触发）
const submitAudit = ({ action, note }) => {
  if (!selectedAudit.value || !action) return

  const auditIndex = creditScoreAuditList.findIndex(a => a.id === selectedAudit.value.id)
  if (auditIndex === -1) return

  const now = new Date().toISOString()
  const audit = creditScoreAuditList[auditIndex]

  switch (action) {
    case 'approve':
      audit.auditStatus = CREDIT_SCORE_AUDIT_STATUS.APPROVED
      audit.auditTime = now
      audit.auditorId = 'admin_current'
      audit.auditorName = '当前管理员'
      audit.auditNote = note || null
      closeDetail()
      showToast('审核通过，积分变动已生效！')
      fetchAudits()
      break
    case 'reject':
      audit.auditStatus = CREDIT_SCORE_AUDIT_STATUS.REJECTED
      audit.auditTime = now
      audit.auditorId = 'admin_current'
      audit.auditorName = '当前管理员'
      audit.auditNote = note || '审核未通过'
      closeDetail()
      showToast('已拒绝申请，积分变动不生效！')
      fetchAudits()
      break
  }
}

// 重置筛选
const resetFilters = () => {
  searchKeyword.value = ''
  filterChangeType.value = 'all'
  filterStatus.value = CREDIT_SCORE_AUDIT_STATUS.PENDING
  dateRange.value = { start: '', end: '' }
  pagination.currentPage = 1
}

// 显示Toast提示
const showToast = (message) => {
  toast.value.message = message
  toast.value.visible = true
  setTimeout(() => {
    toast.value.visible = false
  }, 3000)
}

// 导出数据
const exportData = () => {
  alert('导出功能待实现')
}
</script>

<template>
  <section class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">信用分变动审核</h1>
        <p class="text-sm text-slate-500 mt-1">审核用户信用分变动申请</p>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div
        v-for="(stat, index) in statistics"
        :key="index"
        class="bg-white rounded-xl border p-4 shadow-sm transition-all hover:shadow-md"
        :class="`border-${stat.color}-100 bg-${stat.color}-50/10`"
      >
        <p class="text-sm text-slate-600 mb-1 font-medium">{{ stat.label }}</p>
        <div class="flex items-end justify-between">
          <p :class="`text-2xl font-bold text-${stat.color}-600`">{{ stat.value }}</p>
          <p class="text-xs text-slate-400 font-medium mb-1">{{ stat.trend }}</p>
        </div>
      </div>
    </div>

    <!-- 审核列表卡片 -->
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden relative min-h-[400px] shadow-sm">
      <div class="flex items-center justify-between border-b border-slate-200 p-4 bg-white">
        <h3 class="text-base font-semibold text-slate-900">待审核列表</h3>
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

      <!-- 筛选栏 -->
      <div class="p-4 border-b border-slate-100 bg-slate-50/30">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- 搜索框 -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">搜索</label>
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="用户名/ID/原因..."
              class="ant-input !py-1.5"
            />
          </div>
          
          <!-- 变动类型筛选 -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">变动类型</label>
            <select
              v-model="filterChangeType"
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
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">用户信息</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">变动类型</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">积分变动</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">申请人</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">申请时间</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">状态</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr
              v-for="audit in auditList"
              :key="audit.id"
              class="hover:bg-slate-50 transition-colors"
            >
              <td class="px-6 py-4">
                <div>
                  <p class="text-sm font-medium text-slate-900">{{ audit.username }}</p>
                  <p class="text-xs text-slate-500">{{ audit.email }}</p>
                </div>
              </td>
              <td class="px-6 py-4">
                <span
                  v-if="changeTypeConfig[audit.changeType]"
                  :class="changeTypeConfig[audit.changeType].class"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                >
                  {{ changeTypeConfig[audit.changeType].text }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm">
                  <span class="text-slate-600">{{ audit.beforeScore }}</span>
                  <svg class="inline-block h-4 w-4 mx-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span class="text-slate-900 font-semibold">{{ audit.afterScore }}</span>
                  <span 
                    :class="audit.changeAmount > 0 ? 'text-emerald-600' : 'text-rose-600'"
                    class="ml-2 font-semibold"
                  >
                    {{ audit.changeAmount > 0 ? '+' : '' }}{{ audit.changeAmount }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4">
                <p class="text-sm text-slate-700">{{ audit.applyOperatorName }}</p>
              </td>
              <td class="px-6 py-4">
                <p class="text-sm text-slate-700">{{ formatDate(audit.applyTime) }}</p>
              </td>
              <td class="px-6 py-4">
                <span
                  :class="statusConfig[audit.auditStatus].class"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                >
                  {{ statusConfig[audit.auditStatus].text }}
                </span>
              </td>
              <td class="px-6 py-4">
                <button
                  @click="viewDetail(audit)"
                  class="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {{ audit.auditStatus === CREDIT_SCORE_AUDIT_STATUS.PENDING ? '审核' : '查看' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 空状态 -->
      <div
        v-if="!loading && auditList.length === 0"
        class="text-center py-12"
      >
        <svg class="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-slate-900">没有找到记录</h3>
        <p class="mt-1 text-sm text-slate-500">尝试调整筛选条件</p>
      </div>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="border-t border-slate-200 px-6 py-3 flex items-center justify-between">
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
      :visible="showDetailModal"
      :audit="selectedAudit"
      @close="closeDetail"
      @submit="submitAudit"
    />

    <!-- Toast 提示 -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="toast.visible"
        class="fixed bottom-4 right-4 bg-slate-900 text-white px-6 py-3 rounded-lg shadow-lg z-50"
      >
        {{ toast.message }}
      </div>
    </Transition>
  </section>
</template>
