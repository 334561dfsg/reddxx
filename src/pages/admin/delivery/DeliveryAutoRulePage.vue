<script setup>
import { computed, ref, nextTick } from 'vue'
import MfaVerificationModal from '../../../admin/components/MfaVerificationModal.vue'
import {
  DELIVERY_RULE_STATUS,
  DELIVERY_RULE_PRIORITY,
  DELIVERY_RULE_TRIGGER_TYPE,
  DELIVERY_RULE_ACTION
} from '../../../admin/constants/deliveryControl'
import {
  createDeliveryAutoRulesMock,
  createRuleHitHistoryMock,
  createRuleStatisticsMock
} from '../../../admin/mock/deliveryControl'
import DeliveryRuleModal from '../../../admin/components/DeliveryRuleModal.vue'

const rules = ref(createDeliveryAutoRulesMock())
const hitHistory = ref(createRuleHitHistoryMock())
const statistics = ref(createRuleStatisticsMock())

// 模态框状态
const modalOpen = ref(false)
const modalMode = ref('create') // 'create' | 'edit' | 'duplicate'
const currentRule = ref(null)

// MFA 验证相关
const showMfaModal = ref(false)
const pendingSaveData = ref(null)
const mfaLoading = ref(false)

const activeTab = ref('rules')
const keyword = ref('')
const statusFilter = ref('all')
const priorityFilter = ref('all')

const tabs = [
  { key: 'rules', label: '规则列表', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { key: 'history', label: '触发历史', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'statistics', label: '效果统计', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
]

const summary = computed(() => [
  { label: '规则总数', value: statistics.value.totalRules, icon: '📋', color: 'blue' },
  { label: '运行中', value: statistics.value.enabledRules, icon: '✅', color: 'emerald' },
  { label: '今日触发', value: statistics.value.todayHits, icon: '⚡', color: 'orange' },
  { label: '今日影响用户', value: statistics.value.todayAffectedUsers, icon: '👥', color: 'violet' }
])

const filteredRules = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return rules.value.filter((r) => {
    const hitStatus = statusFilter.value === 'all' || r.status === statusFilter.value
    const hitPriority = priorityFilter.value === 'all' || r.priority === priorityFilter.value
    const hitKw = !kw || `${r.name} ${r.description}`.toLowerCase().includes(kw)
    return hitStatus && hitPriority && hitKw
  })
})

const priorityClass = (priority) => {
  const map = {
    [DELIVERY_RULE_PRIORITY.HIGH]: 'bg-rose-100 text-rose-700',
    [DELIVERY_RULE_PRIORITY.MEDIUM]: 'bg-amber-100 text-amber-700',
    [DELIVERY_RULE_PRIORITY.LOW]: 'bg-slate-100 text-slate-700'
  }
  return map[priority] || 'bg-slate-100 text-slate-700'
}

const priorityLabel = (priority) => {
  const map = {
    [DELIVERY_RULE_PRIORITY.HIGH]: '高',
    [DELIVERY_RULE_PRIORITY.MEDIUM]: '中',
    [DELIVERY_RULE_PRIORITY.LOW]: '低'
  }
  return map[priority] || '-'
}

const statusClass = (status) => {
  const map = {
    [DELIVERY_RULE_STATUS.ENABLED]: 'bg-emerald-100 text-emerald-700',
    [DELIVERY_RULE_STATUS.DISABLED]: 'bg-slate-200 text-slate-600',
    [DELIVERY_RULE_STATUS.PAUSED]: 'bg-amber-100 text-amber-700'
  }
  return map[status] || 'bg-slate-100 text-slate-700'
}

const statusLabel = (status) => {
  const map = {
    [DELIVERY_RULE_STATUS.ENABLED]: '运行中',
    [DELIVERY_RULE_STATUS.DISABLED]: '已禁用',
    [DELIVERY_RULE_STATUS.PAUSED]: '已暂停'
  }
  return map[status] || '-'
}

const triggerTypeLabel = (type) => {
  const map = {
    [DELIVERY_RULE_TRIGGER_TYPE.TRADE_COUNT]: '交易次数',
    [DELIVERY_RULE_TRIGGER_TYPE.PROFIT_LOSS]: '盈亏',
    [DELIVERY_RULE_TRIGGER_TYPE.DAILY_PROFIT]: '日盈利',
    [DELIVERY_RULE_TRIGGER_TYPE.POSITION_VALUE]: '持仓价值',
    [DELIVERY_RULE_TRIGGER_TYPE.CONSECUTIVE_WINS]: '连续盈利',
    [DELIVERY_RULE_TRIGGER_TYPE.CONSECUTIVE_LOSS]: '连续亏损',
    [DELIVERY_RULE_TRIGGER_TYPE.NET_DEPOSIT]: '净入金'
  }
  return map[type] || '-'
}

const actionTypeLabel = (type) => {
  const map = {
    [DELIVERY_RULE_ACTION.FORCE_WIN]: '强制盈利',
    [DELIVERY_RULE_ACTION.FORCE_LOSS]: '强制亏损',
    [DELIVERY_RULE_ACTION.PRICE_ADJUST]: '价格调整',
    [DELIVERY_RULE_ACTION.PROFIT_CONTROL]: '盈亏控制',
    [DELIVERY_RULE_ACTION.REJECT_ORDER]: '订单拒绝',
    [DELIVERY_RULE_ACTION.LIMIT_POSITION]: '仓位限制'
  }
  return map[type] || '-'
}

const toggleRuleStatus = (ruleId) => {
  const rule = rules.value.find((r) => r.id === ruleId)
  if (!rule) return
  
  if (rule.status === DELIVERY_RULE_STATUS.ENABLED) {
    rule.status = DELIVERY_RULE_STATUS.PAUSED
  } else {
    rule.status = DELIVERY_RULE_STATUS.ENABLED
  }
}

const deleteRule = (ruleId) => {
  if (confirm('确定要删除这条规则吗？删除后将无法恢复。')) {
    rules.value = rules.value.filter((r) => r.id !== ruleId)
  }
}

const openCreateModal = () => {
  modalMode.value = 'create'
  currentRule.value = null
  nextTick(() => {
    modalOpen.value = true
  })
}

const openEditModal = (rule) => {
  modalMode.value = 'edit'
  currentRule.value = rule
  nextTick(() => {
    modalOpen.value = true
  })
}

const openDuplicateModal = (rule) => {
  modalMode.value = 'duplicate'
  currentRule.value = rule
  nextTick(() => {
    modalOpen.value = true
  })
}

const closeModal = () => {
  modalOpen.value = false
  currentRule.value = null
}

const saveRule = (ruleData) => {
  // 准备保存数据，显示 MFA 验证
  pendingSaveData.value = {
    mode: modalMode.value,
    ruleData,
    currentRule: currentRule.value
  }
  showMfaModal.value = true
}

// 处理 MFA 验证
const handleMfaVerify = async (code) => {
  mfaLoading.value = true
  
  try {
    // TODO: 这里调用后端 API 验证 MFA 验证码
    // const response = await api.verifyMFA(code)
    
    // 模拟 API 调用延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 验证成功后执行实际的保存操作
    if (pendingSaveData.value) {
      const { mode, ruleData, currentRule } = pendingSaveData.value
      
      if (mode === 'create' || mode === 'duplicate') {
        // 新增规则
        const newRule = {
          id: `rule_${Date.now()}`,
          ...ruleData,
          hitCount: 0,
          lastHitAt: '-',
          totalAffectedUsers: 0,
          createdAt: new Date().toLocaleString('zh-CN'),
          updatedAt: new Date().toLocaleString('zh-CN')
        }
        rules.value.unshift(newRule)
        alert('自动化规则创建成功！')
      } else if (mode === 'edit') {
        // 编辑规则
        const index = rules.value.findIndex(r => r.id === currentRule.id)
        if (index !== -1) {
          rules.value[index] = {
            ...rules.value[index],
            ...ruleData,
            updatedAt: new Date().toLocaleString('zh-CN')
          }
          alert('自动化规则编辑成功！')
        }
      }
      
      closeModal()
      pendingSaveData.value = null
      showMfaModal.value = false
    }
  } catch (error) {
    alert('MFA 验证失败：' + (error.message || '请稍后重试'))
  } finally {
    mfaLoading.value = false
  }
}
</script>

<template>
  <section class="space-y-5">
    <header>
      <h1 class="text-3xl font-semibold text-slate-900">自动化规则管理</h1>
      <p class="mt-1 text-sm text-slate-500">智能化场控系统，自动触发规则执行干预操作</p>
    </header>

    <!-- 统计卡片 -->
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article v-for="card in summary" :key="card.label" class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-slate-500">{{ card.label }}</p>
            <p class="mt-2 text-3xl font-semibold text-slate-900">{{ card.value }}</p>
          </div>
          <span class="text-3xl">{{ card.icon }}</span>
        </div>
      </article>
    </div>

    <!-- Tab 切换 -->
    <div class="flex items-center gap-2 border-b border-slate-200">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition"
        :class="activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'"
        @click="activeTab = tab.key"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon" />
        </svg>
        {{ tab.label }}
      </button>
    </div>

    <!-- 规则列表 -->
    <div v-if="activeTab === 'rules'">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <input
            v-model="keyword"
            type="text"
            placeholder="搜索规则名称或描述..."
            class="w-full min-w-[280px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          />
          <select v-model="statusFilter" class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <option value="all">全部状态</option>
            <option :value="DELIVERY_RULE_STATUS.ENABLED">运行中</option>
            <option :value="DELIVERY_RULE_STATUS.PAUSED">已暂停</option>
            <option :value="DELIVERY_RULE_STATUS.DISABLED">已禁用</option>
          </select>
          <select v-model="priorityFilter" class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <option value="all">全部优先级</option>
            <option :value="DELIVERY_RULE_PRIORITY.HIGH">高优先级</option>
            <option :value="DELIVERY_RULE_PRIORITY.MEDIUM">中优先级</option>
            <option :value="DELIVERY_RULE_PRIORITY.LOW">低优先级</option>
          </select>
        </div>
        <button 
          type="button" 
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          @click="openCreateModal"
        >
          + 新增规则
        </button>
      </div>

      <div class="space-y-3">
        <article
          v-for="rule in filteredRules"
          :key="rule.id"
          class="rounded-xl border p-5 transition"
          :class="rule.status === DELIVERY_RULE_STATUS.ENABLED ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 bg-white'"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-4 flex-1">
              <!-- 开关 -->
              <button
                type="button"
                class="relative mt-1 h-6 w-11 rounded-full transition"
                :class="rule.status === DELIVERY_RULE_STATUS.ENABLED ? 'bg-emerald-600' : 'bg-slate-300'"
                @click="toggleRuleStatus(rule.id)"
              >
                <span
                  class="absolute top-0.5 h-5 w-5 rounded-full bg-white transition"
                  :class="rule.status === DELIVERY_RULE_STATUS.ENABLED ? 'left-5' : 'left-0.5'"
                ></span>
              </button>

              <div class="flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="text-xl font-semibold text-slate-900">{{ rule.name }}</h3>
                  <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="statusClass(rule.status)">
                    {{ statusLabel(rule.status) }}
                  </span>
                  <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="priorityClass(rule.priority)">
                    优先级: {{ priorityLabel(rule.priority) }}
                  </span>
                </div>
                <p class="mt-2 text-sm text-slate-600">{{ rule.description }}</p>

                <!-- 触发条件和执行动作 -->
                <div class="mt-3 flex flex-wrap items-center gap-4 text-sm">
                  <div class="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5">
                    <svg class="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span class="text-blue-700">触发: {{ triggerTypeLabel(rule.trigger.type) }}</span>
                  </div>
                  <div class="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5">
                    <svg class="h-4 w-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    <span class="text-violet-700">动作: {{ actionTypeLabel(rule.action.type) }}</span>
                  </div>
                </div>

                <!-- 统计数据 -->
                <div class="mt-3 grid grid-cols-3 gap-4">
                  <div class="rounded-lg bg-slate-50 p-2.5">
                    <p class="text-xs text-slate-500">触发次数</p>
                    <p class="mt-1 font-semibold text-slate-900">{{ rule.hitCount }}</p>
                  </div>
                  <div class="rounded-lg bg-slate-50 p-2.5">
                    <p class="text-xs text-slate-500">影响用户</p>
                    <p class="mt-1 font-semibold text-slate-900">{{ rule.totalAffectedUsers }}</p>
                  </div>
                  <div class="rounded-lg bg-slate-50 p-2.5">
                    <p class="text-xs text-slate-500">最近触发</p>
                    <p class="mt-1 text-xs font-medium text-slate-700">{{ rule.lastHitAt }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex items-center gap-2 text-sm">
              <button 
                type="button" 
                class="font-medium text-blue-600 hover:text-blue-700"
                @click="openEditModal(rule)"
              >
                编辑
              </button>
              <button 
                type="button" 
                class="font-medium text-slate-600 hover:text-slate-700"
                @click="openDuplicateModal(rule)"
              >
                复制
              </button>
              <button 
                type="button" 
                class="font-medium text-rose-600 hover:text-rose-700" 
                @click="deleteRule(rule.id)"
              >
                删除
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>

    <!-- 触发历史 -->
    <div v-if="activeTab === 'history'">
      <article class="rounded-xl border border-slate-200 bg-white">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="border-b border-slate-200 bg-slate-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase">时间</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase">规则</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase">用户</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase">触发值</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase">执行动作</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-slate-900 uppercase">结果</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-slate-900 uppercase">影响持仓</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr v-for="hit in hitHistory" :key="hit.id" class="hover:bg-slate-50">
                <td class="px-6 py-4 text-sm text-slate-600">{{ hit.triggerTime }}</td>
                <td class="px-6 py-4 text-sm font-medium text-slate-900">{{ hit.ruleName }}</td>
                <td class="px-6 py-4 text-sm">
                  <div class="font-medium text-slate-900">{{ hit.userName }}</div>
                  <div class="text-slate-500">{{ hit.userId }}</div>
                </td>
                <td class="px-6 py-4 text-sm text-slate-600">{{ hit.triggerValue }}</td>
                <td class="px-6 py-4 text-sm text-slate-600">{{ hit.action }}</td>
                <td class="px-6 py-4 text-center">
                  <span class="rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                    {{ hit.result === 'success' ? '成功' : '失败' }}
                  </span>
                </td>
                <td class="px-6 py-4 text-center text-sm font-semibold text-slate-900">{{ hit.affectedPositions }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </div>

    <!-- 效果统计 -->
    <div v-if="activeTab === 'statistics'">
      <div class="rounded-xl border border-slate-200 bg-white p-6">
        <h3 class="text-lg font-semibold text-slate-900">过去 7 天触发趋势</h3>
        <div class="mt-4 grid grid-cols-7 gap-2">
          <div v-for="data in statistics.performanceData" :key="data.date" class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
            <p class="text-xs text-slate-500">{{ data.date }}</p>
            <p class="mt-2 text-2xl font-bold text-blue-600">{{ data.hits }}</p>
            <p class="mt-1 text-xs text-slate-600">触发次数</p>
            <p class="mt-2 font-semibold text-violet-600">{{ data.affected }}</p>
            <p class="text-xs text-slate-600">影响用户</p>
          </div>
        </div>

        <div class="mt-6 grid grid-cols-3 gap-4">
          <div class="rounded-lg border border-slate-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
            <p class="text-sm text-slate-600">总触发次数</p>
            <p class="mt-2 text-3xl font-bold text-blue-600">{{ statistics.totalHits }}</p>
          </div>
          <div class="rounded-lg border border-slate-200 bg-gradient-to-br from-violet-50 to-purple-50 p-4">
            <p class="text-sm text-slate-600">总影响用户</p>
            <p class="mt-2 text-3xl font-bold text-violet-600">{{ statistics.totalAffectedUsers }}</p>
          </div>
          <div class="rounded-lg border border-slate-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
            <p class="text-sm text-slate-600">平均触发率</p>
            <p class="mt-2 text-3xl font-bold text-emerald-600">{{ statistics.avgHitRate }}%</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 规则配置模态框 -->
    <DeliveryRuleModal
      :open="modalOpen"
      :mode="modalMode"
      :rule="currentRule"
      @close="closeModal"
      @save="saveRule"
    />

    <!-- MFA 验证弹窗 -->
    <MfaVerificationModal
      v-model:open="showMfaModal"
      :loading="mfaLoading"
      title="自动化规则验证"
      description="新增或编辑自动化场控规则属于敏感操作，请输入 MFA 验证码"
      @verify="handleMfaVerify"
      @cancel="pendingSaveData = null"
    />
  </section>
</template>
