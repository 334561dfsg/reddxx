<script setup>
import { ref, computed, onMounted, watch, reactive } from 'vue'
import { getVipUpgradeLogs, vipUpgradeLogs } from '../../../admin/mock/vip'
import { VIP_UPGRADE_REASON, VIP_UPGRADE_REASON_OPTIONS } from '../../../admin/constants/vip'

// 搜索和筛选
const searchKeyword = ref('')
const selectedUpgradeReason = ref('all')
const selectedFromVipLevel = ref('all')
const selectedToVipLevel = ref('all')
const dateRange = ref({ start: '', end: '' })

// 数据和分页
const logs = ref([])
const loading = ref(false)
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const totalPages = computed(() => Math.ceil(pagination.total / pagination.pageSize))

// 获取数据
const fetchLogs = async () => {
  loading.value = true
  try {
    const { list, total } = await getVipUpgradeLogs({
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      searchKeyword: searchKeyword.value,
      upgradeReason: selectedUpgradeReason.value,
      fromVipLevel: selectedFromVipLevel.value,
      toVipLevel: selectedToVipLevel.value,
      dateRange: dateRange.value
    })
    logs.value = list
    pagination.total = total
  } catch (error) {
    console.error('获取VIP升级日志失败:', error)
  } finally {
    loading.value = false
  }
}

// 监听筛选和分页变化
watch(
  [searchKeyword, selectedUpgradeReason, selectedFromVipLevel, selectedToVipLevel, dateRange, () => pagination.currentPage],
  (newVal, oldVal) => {
    // 如果是筛选条件变化，重置页码到1
    const isPaginationChange = newVal[5] !== oldVal[5]
    if (!isPaginationChange && pagination.currentPage !== 1) {
      pagination.currentPage = 1
    } else {
      fetchLogs()
    }
  },
  { deep: true }
)

onMounted(fetchLogs)

// 升级原因配置
const upgradeReasonConfig = {
  [VIP_UPGRADE_REASON.RECHARGE]: { text: '充值升级', class: 'bg-blue-100 text-blue-700' },
  [VIP_UPGRADE_REASON.MANUAL]: { text: '手动升级', class: 'bg-amber-100 text-amber-700' }
}

// VIP等级选项
const vipLevelOptions = computed(() => {
  const levels = new Set()
  vipUpgradeLogs.forEach(upgrade => {
    levels.add(upgrade.fromVipLevel)
    levels.add(upgrade.toVipLevel)
  })
  return Array.from(levels).sort((a, b) => a - b)
})

// 统计信息
const statistics = computed(() => {
  const total = vipUpgradeLogs.length
  const byRecharge = vipUpgradeLogs.filter(u => u.upgradeReason === VIP_UPGRADE_REASON.RECHARGE).length
  const byManual = vipUpgradeLogs.filter(u => u.upgradeReason === VIP_UPGRADE_REASON.MANUAL).length

  return [
    { label: '总升级记录', value: total.toLocaleString(), class: 'text-blue-600' },
    { label: '充值升级', value: byRecharge.toLocaleString(), class: 'text-purple-600' },
    { label: '手动升级', value: byManual.toLocaleString(), class: 'text-amber-600' }
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
  selectedUpgradeReason.value = 'all'
  selectedFromVipLevel.value = 'all'
  selectedToVipLevel.value = 'all'
  dateRange.value = { start: '', end: '' }
  pagination.currentPage = 1
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
        <h1 class="text-2xl font-bold text-slate-900">VIP升级日志</h1>
        <p class="text-sm text-slate-500 mt-1">查看所有用户的VIP等级升级记录</p>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <h3 class="text-base font-semibold text-slate-900">日志列表</h3>
        <a-button @click="exportData" class="inline-flex items-center gap-2" html-type="button">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          导出数据
        </a-button>
      </div>

      <div class="p-4 border-b border-slate-100 bg-slate-50/30">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <!-- 搜索 -->
          <div class="xl:col-span-1">
            <label class="block text-sm font-medium text-slate-700 mb-1.5">搜索</label>
            <a-input v-model:value="searchKeyword" type="text" placeholder="用户名/ID..." class="" />
          </div>

          <!-- 升级原因 -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">升级原因</label>
            <a-select v-model:value="selectedUpgradeReason" class="">
              <a-select-option value="all">全部原因</a-select-option>
              <a-select-option v-for="option in VIP_UPGRADE_REASON_OPTIONS" :key="option.value" :value="option.value">
                {{ option.label }}
              </a-select-option>
            </a-select>
          </div>

          <!-- 起始等级 -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">起始等级</label>
            <a-select v-model:value="selectedFromVipLevel" class="">
              <a-select-option value="all">全部</a-select-option>
              <a-select-option v-for="level in vipLevelOptions" :key="level" :value="level">
                {{ level === 0 ? '普通用户' : `VIP${level}` }}
              </a-select-option>
            </a-select>
          </div>

          <!-- 目标等级 -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">目标等级</label>
            <a-select v-model:value="selectedToVipLevel" class="">
              <a-select-option value="all">全部</a-select-option>
              <a-select-option v-for="level in vipLevelOptions" :key="level" :value="level">
                {{ level === 0 ? '普通用户' : `VIP${level}` }}
              </a-select-option>
            </a-select>
          </div>

          <!-- 开始日期 -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">开始日期</label>
            <a-input v-model:value="dateRange.start" type="date" class="" />
          </div>

          <!-- 结束日期 -->
          <div class="flex items-end gap-2">
            <div class="flex-1">
              <label class="block text-sm font-medium text-slate-700 mb-1.5">结束日期</label>
              <a-input v-model:value="dateRange.end" type="date" class="" />
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
        <a-table  :data-source="logs" :pagination="false" size="small" :scroll="{ x: 'max-content' }" :row-key="(upgrade) => upgrade.id" :custom-row="(upgrade, index) => ({ class: [&quot;hover:bg-slate-50 transition-colors&quot;] })">
<a-table-column key="column-0" ><template #title>用户</template><template #default="{ record: upgrade, index: index }"><div class=" ">
                <div>
                  <p class="text-sm font-medium text-slate-900">{{ upgrade.username }}</p>
                  <p class="text-xs text-slate-500">{{ upgrade.userId }}</p>
                </div>
              </div></template></a-table-column>
<a-table-column key="column-1" align="center"><template #title>等级变化</template><template #default="{ record: upgrade, index: index }"><div class=" ">
                <div class="flex items-center justify-center gap-2">
                  <div class="text-center">
                    <p class="text-xs text-slate-500">{{ upgrade.fromVipName }}</p>
                    <p class="text-sm font-semibold text-slate-700">{{ upgrade.fromVipLevel === 0 ? '普通' : `VIP${upgrade.fromVipLevel}` }}</p>
                  </div>
                  <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <div class="text-center">
                    <p class="text-xs text-emerald-600">{{ upgrade.toVipName }}</p>
                    <p class="text-sm font-semibold text-emerald-700">{{ upgrade.toVipLevel === 0 ? '普通' : `VIP${upgrade.toVipLevel}` }}</p>
                  </div>
                </div>
              </div></template></a-table-column>
<a-table-column key="column-2" ><template #title>升级原因</template><template #default="{ record: upgrade, index: index }"><div class=" ">
                <span
                  v-if="upgradeReasonConfig[upgrade.upgradeReason]"
                  :class="upgradeReasonConfig[upgrade.upgradeReason].class"
                  class="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                >
                  {{ upgradeReasonConfig[upgrade.upgradeReason].text }}
                </span>
              </div></template></a-table-column>
<a-table-column key="column-3" ><template #title>充值金额</template><template #default="{ record: upgrade, index: index }"><div class=" ">
                <span v-if="upgrade.rechargeAmount" class="text-sm text-slate-700 font-medium">
                  {{ formatAmount(upgrade.rechargeAmount) }}
                </span>
                <span v-else class="text-sm text-slate-400">-</span>
              </div></template></a-table-column>
<a-table-column key="column-4" ><template #title>备注</template><template #default="{ record: upgrade, index: index }"><div class=" ">
                <span class="text-sm text-slate-700">{{ upgrade.remarks }}</span>
              </div></template></a-table-column>
<a-table-column key="column-5" ><template #title>时间</template><template #default="{ record: upgrade, index: index }"><div class=" ">
                <span class="text-sm text-slate-600">{{ formatDateTime(upgrade.createdAt) }}</span>
              </div></template></a-table-column><template #emptyText>
                <svg class="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p class="mt-2 text-sm text-slate-600">暂无数据</p>
              </template>
</a-table>
      </div>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
        <div class="text-sm text-slate-600">
          共 <span class="font-medium">{{ pagination.total }}</span> 条记录，第 <span class="font-medium">{{ pagination.currentPage }}</span> / <span class="font-medium">{{ totalPages }}</span> 页
        </div>
        <a-pagination  size="small" :current="pagination.currentPage" :page-size="pagination.pageSize" :total="pagination.total" :show-size-changer="false"  :disabled="loading" @change="pagination.currentPage = $event" />
      </div>
    </div>
  </section>
</template>
