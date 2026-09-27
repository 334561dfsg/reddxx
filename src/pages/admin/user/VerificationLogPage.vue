<script setup>
import { ref, computed, onMounted, watch, reactive } from 'vue'
import { verificationLogList } from '../../../admin/mock/verification'
import { 
  LOG_ACTION_TYPE,
  LOG_ACTION_TYPE_OPTIONS
} from '../../../constants/verification'

// 日志列表数据
const logList = ref([])
const loading = ref(false)

// 搜索和筛选
const searchKeyword = ref('')
const filterActionType = ref('all')
const filterDateRange = ref({ start: '', end: '' })

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const totalPages = computed(() => Math.ceil(pagination.total / pagination.pageSize))
const visibleActionTypes = [
  LOG_ACTION_TYPE.AUDIT_APPROVED,
  LOG_ACTION_TYPE.AUDIT_REJECTED,
  LOG_ACTION_TYPE.AUDIT_RESUBMIT
]
const actionTypeOptions = LOG_ACTION_TYPE_OPTIONS.filter((it) => visibleActionTypes.includes(it.value))
const detailToneConfig = {
  [LOG_ACTION_TYPE.AUDIT_APPROVED]: {
    textClass: 'text-emerald-700',
    boxClass: 'border-emerald-200 bg-emerald-50 text-emerald-700'
  },
  [LOG_ACTION_TYPE.AUDIT_REJECTED]: {
    textClass: 'text-rose-700',
    boxClass: 'border-rose-200 bg-rose-50 text-rose-700'
  },
  [LOG_ACTION_TYPE.AUDIT_RESUBMIT]: {
    textClass: 'text-amber-700',
    boxClass: 'border-amber-200 bg-amber-50 text-amber-700'
  },
  [LOG_ACTION_TYPE.CONFIG_UPDATE]: {
    textClass: 'text-purple-700',
    boxClass: 'border-purple-200 bg-purple-50 text-purple-700'
  }
}

// 获取数据
const fetchLogs = async () => {
  loading.value = true
  try {
    const keyword = searchKeyword.value.trim().toLowerCase()

    let filtered = verificationLogList.filter((log) => visibleActionTypes.includes(log.actionType))

    if (keyword) {
      filtered = filtered.filter((log) =>
        String(log.username || '').toLowerCase().includes(keyword)
        || String(log.userId || '').toLowerCase().includes(keyword)
        || String(log.operator || '').toLowerCase().includes(keyword)
        || String(log.description || '').toLowerCase().includes(keyword)
      )
    }

    if (filterActionType.value !== 'all') {
      filtered = filtered.filter((log) => log.actionType === filterActionType.value)
    }

    if (filterDateRange.value.start || filterDateRange.value.end) {
      const startTs = filterDateRange.value.start ? new Date(filterDateRange.value.start).getTime() : null
      const endTs = filterDateRange.value.end
        ? new Date(`${filterDateRange.value.end}T23:59:59`).getTime()
        : null
      filtered = filtered.filter((log) => {
        const t = new Date(log.actionTime).getTime()
        if (startTs != null && t < startTs) return false
        if (endTs != null && t > endTs) return false
        return true
      })
    }

    filtered.sort((a, b) => new Date(b.actionTime) - new Date(a.actionTime))
    pagination.total = filtered.length
    const start = (pagination.currentPage - 1) * pagination.pageSize
    const end = start + pagination.pageSize
    logList.value = filtered.slice(start, end)
  } catch (error) {
    console.error('获取认证日志失败:', error)
  } finally {
    loading.value = false
  }
}

// 监听筛选和分页变化
watch(
  [searchKeyword, filterActionType, filterDateRange, () => pagination.currentPage],
  (newVal, oldVal) => {
    // 如果是筛选条件变化，重置页码到1
    const isPaginationChange = newVal[3] !== oldVal[3]
    if (!isPaginationChange && pagination.currentPage !== 1) {
      pagination.currentPage = 1
    } else {
      fetchLogs()
    }
  },
  { deep: true }
)

onMounted(fetchLogs)

// 统计信息
const statistics = computed(() => {
  const visibleLogs = verificationLogList.filter((log) => visibleActionTypes.includes(log.actionType))
  const total = visibleLogs.length
  const today = visibleLogs.filter(log => {
    const logDate = new Date(log.actionTime).toDateString()
    const nowDate = new Date().toDateString()
    return logDate === nowDate
  }).length
  
  const auditActions = visibleLogs.filter(log => 
    log.actionType === LOG_ACTION_TYPE.AUDIT_APPROVED || 
    log.actionType === LOG_ACTION_TYPE.AUDIT_REJECTED || 
    log.actionType === LOG_ACTION_TYPE.AUDIT_RESUBMIT
  ).length
  
  return [
    {
      label: '今日日志',
      value: today.toLocaleString(),
      trend: '条记录',
      color: 'blue'
    },
    {
      label: '总日志数',
      value: total.toLocaleString(),
      trend: '所有记录',
      color: 'gray'
    },
    {
      label: '审核操作',
      value: auditActions.toLocaleString(),
      trend: '次审核',
      color: 'emerald'
    }
  ]
})

// 操作类型配置
const actionTypeConfig = {
  'config_update': { 
    text: '配置更新', 
    class: 'bg-purple-100 text-purple-700',
    icon: '⚙️'
  },
  'audit_approved': { 
    text: '审核通过', 
    class: 'bg-emerald-100 text-emerald-700',
    icon: '✓'
  },
  'audit_rejected': { 
    text: '审核拒绝', 
    class: 'bg-rose-100 text-rose-700',
    icon: '✗'
  },
  'audit_resubmit': { 
    text: '要求补件', 
    class: 'bg-amber-100 text-amber-700',
    icon: '↩'
  },
  'level_upgrade': { text: '等级升级', class: 'bg-blue-100 text-blue-700', icon: '↑' },
  'level_downgrade': { text: '等级降级', class: 'bg-orange-100 text-orange-700', icon: '↓' }
}

// 等级配置
const levelConfig = {
  'none': { text: '未认证', class: 'bg-gray-100 text-gray-700' },
  'basic': { text: '初级认证', class: 'bg-blue-100 text-blue-700' },
  'advanced': { text: '高级认证', class: 'bg-purple-100 text-purple-700' }
}

// 格式化日期
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 查看详情
const showDetailModal = ref(false)
const selectedLog = ref(null)

const selectedSiteInfo = computed(() => {
  if (!selectedLog.value) return null
  const log = selectedLog.value
  const details = log.details || {}
  const docList = Array.isArray(details.documents) ? details.documents : []
  const imageCount = docList.filter((d) => !String(d.url || '').toLowerCase().endsWith('.pdf')).length
  const pdfCount = docList.filter((d) => String(d.url || '').toLowerCase().endsWith('.pdf')).length
  return {
    uid: log.userId || '-',
    username: log.username || '-',
    operator: log.operator || '-',
    actionTypeText: actionTypeConfig[log.actionType]?.text || log.actionType,
    beforeLevel: levelConfig[log.beforeLevel]?.text || '-',
    afterLevel: levelConfig[log.afterLevel]?.text || '-',
    actionTime: formatDate(log.actionTime),
    ipAddress: log.ipAddress || '-',
    description: log.description || '-',
    auditId: details.auditId || '-',
    processTime: details.processTime || '-',
    reason: details.reason || '-',
    docCount: docList.length,
    imageCount,
    pdfCount,
    country: details.nationality || '-',
    city: details.city || '-',
    realName: details.realName || '-',
    idNumber: details.idNumber || '-',
    email: details.email || '-',
    documents: docList
  }
})

// Toast提示
const toast = ref({
  visible: false,
  message: ''
})

const viewDetail = (log) => {
  selectedLog.value = log
  showDetailModal.value = true
}

const closeDetail = () => {
  showDetailModal.value = false
  selectedLog.value = null
}

// 导出日志
const exportLogs = () => {
  showToast('导出功能开发中...')
}

// 重置筛选
const resetFilters = () => {
  searchKeyword.value = ''
  filterActionType.value = 'all'
  filterDateRange.value = { start: '', end: '' }
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
</script>

<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">认证日志</h1>
        <p class="mt-1 text-sm text-slate-500">查看所有认证相关的操作记录</p>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <div 
        v-for="stat in statistics" 
        :key="stat.label"
        class="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-slate-600">{{ stat.label }}</p>
            <p :class="`text-2xl font-bold text-${stat.color}-600 mt-2`">{{ stat.value }}</p>
            <p class="text-xs text-slate-500 mt-1">{{ stat.trend }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 日志列表卡片 -->
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden relative min-h-[400px] shadow-sm">
      <div class="flex items-center justify-between border-b border-slate-200 p-4 bg-white">
        <h3 class="text-base font-semibold text-slate-900">操作日志</h3>
        <a-button @click="exportLogs" class="inline-flex items-center gap-2" html-type="button">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          导出日志
        </a-button>
      </div>

      <!-- 筛选栏 -->
      <div class="p-4 border-b border-slate-100 bg-slate-50/30">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- 搜索 -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">搜索</label>
            <a-input v-model:value="searchKeyword" type="text" placeholder="用户名、操作人..." class="" />
          </div>
          
          <!-- 操作类型 -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">操作类型</label>
            <a-select v-model:value="filterActionType" class="">
              <a-select-option value="all">全部类型</a-select-option>
              <a-select-option v-for="option in actionTypeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </a-select-option>
            </a-select>
          </div>
          
          <!-- 时间范围 -->
          <div class="flex items-end gap-2 lg:col-span-2">
            <div class="flex-1">
              <label class="block text-sm font-medium text-slate-700 mb-1.5">申请时间范围</label>
              <div class="flex items-center gap-2">
                <a-input v-model:value="filterDateRange.start" type="date" class="" />
                <span class="text-slate-400">至</span>
                <a-input v-model:value="filterDateRange.end" type="date" class="" />
              </div>
            </div>
            <a-button @click="resetFilters" title="重置筛选" class="text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors" html-type="button">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </a-button>
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
        <a-table  :data-source="logList" :pagination="false" size="small" :scroll="{ x: 'max-content' }" :row-key="(log) => log.id" :custom-row="(log, index) => ({ class: [&quot;hover:bg-gray-50&quot;] })">
<a-table-column key="column-0" ><template #title>时间</template><template #default="{ record: log, index: index }"><div class="  whitespace-nowrap text-sm text-gray-900">
                {{ formatDate(log.actionTime) }}
              </div></template></a-table-column>
<a-table-column key="column-1" ><template #title>操作类型</template><template #default="{ record: log, index: index }"><div class="  whitespace-nowrap">
                <span :class="actionTypeConfig[log.actionType].class" class="px-2 py-1 text-xs font-semibold rounded-full inline-flex items-center">
                  <span class="mr-1">{{ actionTypeConfig[log.actionType].icon }}</span>
                  {{ actionTypeConfig[log.actionType].text }}
                </span>
              </div></template></a-table-column>
<a-table-column key="column-2" ><template #title>用户</template><template #default="{ record: log, index: index }"><div class="  whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ log.username }}</div>
                <div class="text-xs text-gray-400">{{ log.userId }}</div>
              </div></template></a-table-column>
<a-table-column key="column-3" ><template #title>等级变更</template><template #default="{ record: log, index: index }"><div class="  whitespace-nowrap">
                <div v-if="log.beforeLevel && log.afterLevel" class="flex items-center space-x-2">
                  <span :class="levelConfig[log.beforeLevel].class" class="px-2 py-1 text-xs font-semibold rounded-full">
                    {{ levelConfig[log.beforeLevel].text }}
                  </span>
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                  <span :class="levelConfig[log.afterLevel].class" class="px-2 py-1 text-xs font-semibold rounded-full">
                    {{ levelConfig[log.afterLevel].text }}
                  </span>
                </div>
                <span v-else class="text-sm text-gray-400">-</span>
              </div></template></a-table-column>
<a-table-column key="column-4" ><template #title>操作人</template><template #default="{ record: log, index: index }"><div class="  whitespace-nowrap text-sm text-gray-500">
                {{ log.operator }}
              </div></template></a-table-column>
<a-table-column key="column-5" ><template #title>描述</template><template #default="{ record: log, index: index }"><div class="  text-sm text-gray-900">
                {{ log.description }}
              </div></template></a-table-column>
<a-table-column key="column-6" ><template #title>操作</template><template #default="{ record: log, index: index }"><div class="  whitespace-nowrap text-sm font-medium">
                <a-button @click="viewDetail(log)" class="text-blue-600 hover:text-blue-900" html-type="button">
                  详情
                </a-button>
              </div></template></a-table-column>
</a-table>
      </div>

      <div v-if="!loading && logList.length === 0" class="text-center py-12">
        <p class="text-gray-500">暂无日志记录</p>
      </div>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="border-t border-gray-200 px-6 py-3 flex items-center justify-between">
        <div class="text-sm text-gray-600">
          共 <span class="font-medium">{{ pagination.total }}</span> 条记录，第 <span class="font-medium">{{ pagination.currentPage }}</span> / <span class="font-medium">{{ totalPages }}</span> 页
        </div>
        <a-pagination  size="small" :current="pagination.currentPage" :page-size="pagination.pageSize" :total="pagination.total" :show-size-changer="false"  :disabled="loading" @change="pagination.currentPage = $event" />
      </div>
    </div>

    <transition name="audit-drawer">
      <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(showDetailModal && selectedLog && selectedSiteInfo)" :mask-closable="false" :keyboard="false" :closable="false" :footer="null" width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeDetail"><template #title><template v-if="Boolean(showDetailModal && selectedLog && selectedSiteInfo)"><div class="flex items-center justify-between gap-3"><span>详情</span><a-button aria-label="关闭" html-type="button"   @click="closeDetail">×</a-button></div></template></template><template v-if="showDetailModal && selectedLog && selectedSiteInfo"><div class="border-b border-slate-200 bg-gradient-to-r from-white to-slate-100 px-5 py-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-xs font-medium tracking-wide text-slate-500">认证日志详情抽屉</div>
                <div class="mt-1 text-xl font-semibold text-slate-900">
                  {{ selectedSiteInfo.username }}（{{ selectedSiteInfo.uid }}）的日志详情
                </div>
                <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    class="rounded-full px-2.5 py-1 font-medium"
                    :class="actionTypeConfig[selectedLog.actionType]?.class || 'bg-slate-100 text-slate-700'"
                  >
                    类型：{{ selectedSiteInfo.actionTypeText }}
                  </span>
                  <span class="rounded-full bg-white px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">时间：{{ selectedSiteInfo.actionTime }}</span>
                  <span class="rounded-full bg-white px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">操作人：{{ selectedSiteInfo.operator }}</span>
                </div>
              </div>
            </div>
          </div>
<div class="min-h-0 flex-1 overflow-y-auto p-4">
            <div class="space-y-4">
              <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <section class="rounded-xl border border-slate-200 bg-white p-4">
                  <div class="text-xs text-slate-500">用户与申请</div>
                  <div class="mt-3 space-y-2 text-sm">
                    <div class="flex justify-between"><span class="text-slate-500">用户名</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.username }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">用户ID</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.uid }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">变更前等级</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.beforeLevel }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">变更后等级</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.afterLevel }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">审核ID</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.auditId }}</span></div>
                  </div>
                </section>

                <section class="rounded-xl border border-slate-200 bg-white p-4">
                  <div class="text-xs text-slate-500">站内进度</div>
                  <div class="mt-3 space-y-2 text-sm">
                    <div class="flex justify-between"><span class="text-slate-500">日志类型</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.actionTypeText }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">总材料数</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.docCount }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">图片数</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.imageCount }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">PDF 数</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.pdfCount }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">处理时长</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.processTime }}</span></div>
                  </div>
                </section>

                <section class="rounded-xl border border-slate-200 bg-white p-4">
                  <div class="text-xs text-slate-500">审核记录</div>
                  <div class="mt-3 space-y-2 text-sm">
                    <div class="flex justify-between"><span class="text-slate-500">操作时间</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.actionTime }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">操作人</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.operator }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">IP</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.ipAddress }}</span></div>
                    <div class="flex justify-between gap-3">
                      <span class="shrink-0 text-slate-500">审核描述</span>
                      <span
                        class="text-right font-medium"
                        :class="detailToneConfig[selectedLog.actionType]?.textClass || 'text-slate-900'"
                      >
                        {{ selectedSiteInfo.description }}
                      </span>
                    </div>
                  </div>
                  <div
                    v-if="selectedSiteInfo.reason !== '-'"
                    class="mt-3 rounded-lg border p-3 text-xs"
                    :class="detailToneConfig[selectedLog.actionType]?.boxClass || 'border-slate-200 bg-slate-50 text-slate-700'"
                  >
                    原因：{{ selectedSiteInfo.reason }}
                  </div>
                </section>
              </div>

              <section class="rounded-xl border border-slate-200 bg-white p-4">
                <div class="text-xs text-slate-500">初级认证区域</div>
                <div class="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                  <div class="rounded-lg bg-slate-50 px-3 py-2"><span class="text-slate-500">国家：</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.country }}</span></div>
                  <div class="rounded-lg bg-slate-50 px-3 py-2"><span class="text-slate-500">所在城市：</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.city }}</span></div>
                  <div class="rounded-lg bg-slate-50 px-3 py-2"><span class="text-slate-500">姓名：</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.realName }}</span></div>
                  <div class="rounded-lg bg-slate-50 px-3 py-2"><span class="text-slate-500">证件号码：</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.idNumber }}</span></div>
                  <div class="rounded-lg bg-slate-50 px-3 py-2 md:col-span-2"><span class="text-slate-500">邮箱：</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.email }}</span></div>
                </div>
              </section>

              <section class="rounded-xl border border-slate-200 bg-white p-4">
                <div class="mb-3 flex items-center justify-between">
                  <div class="text-xs text-slate-500">提交材料（站内）</div>
                </div>
                <div class="space-y-2">
                  <div
                    v-for="(doc, index) in selectedSiteInfo.documents"
                    :key="`${doc.type}-${index}`"
                    class="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <div class="min-w-0">
                      <div class="font-medium text-slate-900">{{ doc.type || '-' }}</div>
                      <div class="mt-0.5 truncate text-xs text-slate-500">{{ doc.url || '-' }}</div>
                    </div>
                  </div>
                  <div v-if="!selectedSiteInfo.documents.length" class="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                    暂无材料记录
                  </div>
                </div>
              </section>
            </div>
          </div></template><template #footer><template v-if="Boolean(showDetailModal && selectedLog && selectedSiteInfo)"><section class="shrink-0 border-t border-slate-200 bg-white px-5 py-4">
            <div class="mt-1 flex justify-end">
              <a-button class="" @click="closeDetail" html-type="button">关闭</a-button>
            </div>
          </section></template></template></a-modal>
    </transition>

    <!-- 成功提示 Toast -->
    <div 
      v-if="toast.visible"
      class="fixed top-4 right-4 z-50 bg-white border border-blue-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 animate-slide-in"
    >
      <div class="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
        <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <span class="text-sm font-medium text-slate-900">{{ toast.message }}</span>
    </div>
  </div>
</template>

<style scoped>
.audit-drawer-enter-active,
.audit-drawer-leave-active {
  transition: opacity 0.25s ease;
}

.audit-drawer-enter-from,
.audit-drawer-leave-to {
  opacity: 0;
}

.audit-drawer-enter-from > section,
.audit-drawer-leave-to > section {
  transform: translateY(-100%);
}

.audit-drawer-enter-active > section,
.audit-drawer-leave-active > section {
  transition: transform 0.25s ease;
  transform: translateY(0);
}
</style>
