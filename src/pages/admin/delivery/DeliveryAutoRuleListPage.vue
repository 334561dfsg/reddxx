<script setup>
import { computed, ref, nextTick, reactive, watch } from 'vue'
import {
  DELIVERY_RULE_STATUS,
  DELIVERY_RULE_PRIORITY,
  DELIVERY_RULE_TRIGGER_TYPE,
  DELIVERY_RULE_ACTION
} from '../../../admin/constants/deliveryControl'
import {
  createDeliveryAutoRulesMock,
  createRuleStatisticsMock
} from '../../../admin/mock/deliveryControl'
import DeliveryRuleModal from '../../../admin/components/DeliveryRuleModal.vue'

const rules = ref(createDeliveryAutoRulesMock())
const statistics = ref(createRuleStatisticsMock())

// 模态框状态
const modalOpen = ref(false)
const modalMode = ref('create') // 'create' | 'edit' | 'duplicate'
const currentRule = ref(null)

const keyword = ref('')
const statusFilter = ref('all')
const priorityFilter = ref('all')

// 分页状态
const pagination = reactive({
  currentPage: 1,
  pageSize: 5,
  total: 0
})

const summary = computed(() => [
  { label: '规则总数', value: statistics.value.totalRules, icon: '📋', color: 'blue' },
  { label: '运行中', value: statistics.value.enabledRules, icon: '✅', color: 'emerald' },
  { label: '今日触发', value: statistics.value.todayHits, icon: '⚡', color: 'orange' },
  { label: '今日影响用户', value: statistics.value.todayAffectedUsers, icon: '👥', color: 'violet' }
])

const allFilteredRules = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return rules.value.filter((r) => {
    const hitStatus = statusFilter.value === 'all' || r.status === statusFilter.value
    const hitPriority = priorityFilter.value === 'all' || r.priority === priorityFilter.value
    const hitKw = !kw || `${r.name} ${r.description}`.toLowerCase().includes(kw)
    return hitStatus && hitPriority && hitKw
  })
})

const filteredRules = computed(() => {
  const start = (pagination.currentPage - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return allFilteredRules.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(allFilteredRules.value.length / pagination.pageSize))

// 监听筛选变化，重置页码
watch([statusFilter, priorityFilter, keyword], () => {
  pagination.currentPage = 1
})

const priorityClass = (priority) => {
  const map = {
    [DELIVERY_RULE_PRIORITY.HIGH]: 'bg-rose-50 text-rose-600 border-rose-100',
    [DELIVERY_RULE_PRIORITY.MEDIUM]: 'bg-amber-50 text-amber-600 border-amber-100',
    [DELIVERY_RULE_PRIORITY.LOW]: 'bg-slate-50 text-slate-500 border-slate-100'
  }
  return map[priority] || 'bg-slate-50 text-slate-500 border-slate-100'
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
    [DELIVERY_RULE_STATUS.ENABLED]: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    [DELIVERY_RULE_STATUS.DISABLED]: 'bg-slate-50 text-slate-400 border-slate-100',
    [DELIVERY_RULE_STATUS.PAUSED]: 'bg-orange-50 text-orange-600 border-orange-100'
  }
  return map[status] || 'bg-slate-50 text-slate-400 border-slate-100'
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
  if (modalMode.value === 'create' || modalMode.value === 'duplicate') {
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
  } else if (modalMode.value === 'edit') {
    // 编辑规则
    const index = rules.value.findIndex(r => r.id === currentRule.value.id)
    if (index !== -1) {
      rules.value[index] = {
        ...rules.value[index],
        ...ruleData,
        updatedAt: new Date().toLocaleString('zh-CN')
      }
    }
  }

  closeModal()
}
</script>

<template>
  <section class="space-y-4">
    <!-- Page Header -->
    <header>
      <h1 class="text-3xl font-semibold text-slate-900">场控规则管理</h1>
      <p class="mt-1 text-sm text-slate-500">智能化场控系统，根据用户交易行为自动触发规则并执行干预操作</p>
    </header>

    <div class="space-y-6">
      <!-- 统计卡片 -->
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="card in summary"
          :key="card.label"
          class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-slate-500">{{ card.label }}</p>
              <p class="mt-2 text-2xl font-bold text-slate-900 font-mono">{{ card.value }}</p>
            </div>
            <div class="h-10 w-10 rounded-lg flex items-center justify-center bg-slate-50 border border-slate-100">
              <svg
                v-if="card.label === '规则总数'"
                class="h-6 w-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <path d="M8 8h8M8 12h8M8 16h8" />
              </svg>
              <svg
                v-else-if="card.label === '运行中'"
                class="h-6 w-6 text-emerald-500"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9 12l2 2l4 -4" />
              </svg>
              <svg
                v-else-if="card.label === '今日触发'"
                class="h-6 w-6 text-orange-500"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4l3 3" />
              </svg>
              <svg
                v-else
                class="h-6 w-6 text-violet-500"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12h8" />
                <path d="M12 8v8" />
              </svg>
            </div>
          </div>
        </article>
      </div>

      <!-- 规则列表 -->
      <article class="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-4 md:px-6">
          <div class="flex flex-wrap items-center gap-3">
            <div class="relative w-72">
              <a-input
                v-model:value="keyword"
                type="text"
                placeholder="搜索规则名称或描述..."
                class="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
              />
              <svg viewBox="0 0 20 20" class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none">
                <circle cx="9" cy="9" r="5.8" stroke="currentColor" stroke-width="1.6" />
                <path d="M13.6 13.6L16.4 16.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
            </div>
            <a-select :get-popup-container="(trigger) => trigger.parentElement"
              v-model:value="statusFilter"
              class=""
            >
              <a-select-option value="all">全部状态</a-select-option>
              <a-select-option :value="DELIVERY_RULE_STATUS.ENABLED">运行中</a-select-option>
              <a-select-option :value="DELIVERY_RULE_STATUS.PAUSED">已暂停</a-select-option>
              <a-select-option :value="DELIVERY_RULE_STATUS.DISABLED">已禁用</a-select-option>
            </a-select>
            <a-select :get-popup-container="(trigger) => trigger.parentElement"
              v-model:value="priorityFilter"
              class=""
            >
              <a-select-option value="all">全部优先级</a-select-option>
              <a-select-option :value="DELIVERY_RULE_PRIORITY.HIGH">高优先级</a-select-option>
              <a-select-option :value="DELIVERY_RULE_PRIORITY.MEDIUM">中优先级</a-select-option>
              <a-select-option :value="DELIVERY_RULE_PRIORITY.LOW">低优先级</a-select-option>
            </a-select>
            <a-button type="text"
              html-type="button"
              class="rounded-md border border-slate-200 bg-white px-4 h-9 text-sm font-medium text-slate-700 hover:text-[#1677ff] hover:border-[#1677ff] transition-colors"
              @click="
                keyword = '';
                statusFilter = 'all';
                priorityFilter = 'all'
              "
            >
              重置
            </a-button>
          </div>
          <a-button type="text"
            html-type="button"
            class="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-[#1677ff] text-white text-sm font-medium shadow-sm hover:bg-[#4096ff] active:bg-[#0958d9] transition-colors"
            @click="openCreateModal"
          >
            <span class="text-base">+</span>
            <span>新增规则</span>
          </a-button>
        </div>

        <div class="p-4 md:p-6 space-y-4">
          <article
            v-for="rule in filteredRules"
            :key="rule.id"
            class="group relative overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-blue-500/30 hover:shadow-md"
          >
            <div class="p-5">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                  <div class="flex items-center gap-3 flex-wrap">
                    <h3 class="text-lg font-bold text-slate-900">{{ rule.name }}</h3>
                    <span
                      class="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full border"
                      :class="statusClass(rule.status)"
                    >
                      <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
                      {{ statusLabel(rule.status) }}
                    </span>
                    <span
                      class="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full border"
                      :class="priorityClass(rule.priority)"
                    >
                      优先级: {{ priorityLabel(rule.priority) }}
                    </span>
                  </div>
                  <p class="mt-2 text-sm text-slate-500">{{ rule.description }}</p>

                  <!-- 触发条件和执行动作 -->
                  <div class="mt-4 flex flex-wrap items-center gap-3">
                    <div class="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-1.5 text-xs">
                      <span class="text-blue-600 font-bold">触发:</span>
                      <span class="text-slate-700 font-medium">
                        {{ triggerTypeLabel(rule.trigger.type) }}
                        <template v-if="rule.trigger.threshold !== undefined">
                          {{ rule.trigger.operator }} {{ rule.trigger.threshold }}
                          {{ rule.trigger.unit }}
                        </template>
                      </span>
                    </div>
                    <svg class="h-4 w-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <div class="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-1.5 text-xs">
                      <span class="text-blue-600 font-bold">执行:</span>
                      <span class="text-blue-700 font-medium">{{ actionTypeLabel(rule.action.type) }}</span>
                    </div>
                  </div>

                  <!-- 统计信息 -->
                  <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                    <div>
                      <p class="text-[12px] text-slate-400 uppercase ">累计触发</p>
                      <p class="mt-1 text-sm font-bold text-slate-900 font-mono">{{ rule.hitCount }} 次</p>
                    </div>
                    <div>
                      <p class="text-[12px] text-slate-400 uppercase">影响用户</p>
                      <p class="mt-1 text-sm font-bold text-slate-900 font-mono">{{ rule.totalAffectedUsers }} 人</p>
                    </div>
                    <div class="sm:col-span-2">
                      <p class="text-[12px] text-slate-400 uppercase">最后触发</p>
                      <p class="mt-1 text-sm font-medium text-slate-600">{{ rule.lastHitAt }}</p>
                    </div>
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div class="flex items-center gap-2">
                  <a-button
                    html-type="button"
                    class="ant-btn !h-8 !px-3 "
                    title="编辑"
                    @click="openEditModal(rule)"
                  >
                    编辑
                  </a-button>
                  <a-button
                    html-type="button"
                    class="ant-btn !h-8 !px-3 "
                    title="复制"
                    @click="openDuplicateModal(rule)"
                  >
                    复制
                  </a-button>
                  <a-button
                    html-type="button"
                    class="ant-btn !h-8 !px-3  !text-rose-600 !border-rose-300 hover:!text-rose-700 hover:!border-rose-500"
                    title="删除"
                    @click="deleteRule(rule.id)"
                  >
                    删除
                  </a-button>
                </div>
              </div>
            </div>

            <!-- 状态切换遮罩 -->
            <div
              v-if="rule.status === DELIVERY_RULE_STATUS.DISABLED"
              class="absolute inset-0 bg-slate-50/60 backdrop-blur-[1px] flex items-center justify-center"
            >
              <div class="text-center">
                <p class="text-sm font-bold text-slate-400 uppercase tracking-widest">该规则已禁用</p>
                <a-button type="text"
                  html-type="button"
                  class="mt-3 rounded-lg bg-white border border-slate-200 px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                  @click="toggleRuleStatus(rule.id)"
                >
                  立即启用
                </a-button>
              </div>
            </div>
          </article>
        </div>

        <!-- 分页 -->
        <div v-if="totalPages > 1" class="flex items-center justify-between border-t border-slate-100 p-4 md:px-6">
          <div class="text-sm text-slate-500">
            共 <span class="font-bold text-slate-900">{{ allFilteredRules.length }}</span> 条规则，第
            <span class="font-bold text-slate-900">{{ pagination.currentPage }}</span> / {{ totalPages }} 页
          </div>
          <div class="flex items-center gap-2">
            <a-pagination size="small" :current="pagination.currentPage" :total="totalPages" :page-size="1" :show-size-changer="false" @change="pagination.currentPage = $event" />
          </div>
        </div>
      </article>
    </div>

    <!-- 规则编辑模态框 -->
    <DeliveryRuleModal
      :open="modalOpen"
      :mode="modalMode"
      :rule="currentRule"
      @close="closeModal"
      @save="saveRule"
    />
  </section>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
