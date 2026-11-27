<script setup>
// 场控规则 — Ant Design Pro list (2026-11-28): query card, rule statistics card, table card with link actions.
// Deleting now asks through the shared Ant confirmation modal (was a native confirm()) and reports by toast.
import { computed, ref, nextTick } from 'vue'
import { Button, Card, Col, Dropdown, Menu, MenuItem, Row, Space, Statistic, Tag, TypographyText, message } from 'ant-design-vue'
import { DownOutlined, PlusOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {
  DELIVERY_RULE_STATUS,
  DELIVERY_RULE_PRIORITY,
  DELIVERY_RULE_TRIGGER_TYPE,
  DELIVERY_RULE_ACTION_CONFIG,
  DELIVERY_RULE_TIME_PERIOD
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

const blankFilters = () => ({ name: '', description: '', status: 'all', priority: 'all' })
const filters = ref(blankFilters())
const page = ref(1)

const statusLabels = {
  [DELIVERY_RULE_STATUS.ENABLED]: '运行中',
  [DELIVERY_RULE_STATUS.PAUSED]: '已暂停',
  [DELIVERY_RULE_STATUS.DISABLED]: '已禁用'
}
const statusColors = {
  [DELIVERY_RULE_STATUS.ENABLED]: 'green',
  [DELIVERY_RULE_STATUS.PAUSED]: 'orange',
  [DELIVERY_RULE_STATUS.DISABLED]: 'default'
}
const priorityLabels = {
  [DELIVERY_RULE_PRIORITY.HIGH]: '高',
  [DELIVERY_RULE_PRIORITY.MEDIUM]: '中',
  [DELIVERY_RULE_PRIORITY.LOW]: '低'
}
const priorityColors = {
  [DELIVERY_RULE_PRIORITY.HIGH]: 'red',
  [DELIVERY_RULE_PRIORITY.MEDIUM]: 'orange',
  [DELIVERY_RULE_PRIORITY.LOW]: 'default'
}

const queryFields = [
  { key: 'name', label: '规则名称' },
  { key: 'description', label: '规则描述' },
  { key: 'status', label: '状态', options: [{ value: 'all', label: '全部状态' }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))] },
  { key: 'priority', label: '优先级', options: [{ value: 'all', label: '全部优先级' }, ...Object.entries(priorityLabels).map(([value, label]) => ({ value, label: `${label}优先级` }))] }
]

// Rule count and running count follow the live list (the static statistics mock did not change after create/delete).
const summary = computed(() => [
  { label: '规则总数', value: rules.value.length },
  { label: '运行中', value: rules.value.filter((rule) => rule.status === DELIVERY_RULE_STATUS.ENABLED).length },
  { label: '今日触发', value: statistics.value.todayHits },
  { label: '今日影响用户', value: statistics.value.todayAffectedUsers }
])

const has = (value, query) => !query || String(value || '').toLowerCase().includes(String(query).trim().toLowerCase())
const allFilteredRules = computed(() => rules.value.filter((r) => {
  const f = filters.value
  return (f.status === 'all' || r.status === f.status) &&
    (f.priority === 'all' || r.priority === f.priority) &&
    has(r.name, f.name) && has(r.description, f.description)
}))

const columns = [
  { key: 'rule', title: '规则', width: 280, fixed: 'left' },
  { key: 'trigger', title: '触发条件', width: 220 },
  { key: 'action', title: '执行动作', width: 110 },
  { key: 'priority', title: '优先级', width: 90 },
  { key: 'hitCount', title: '累计触发（次）', width: 130, align: 'right' },
  { key: 'affected', title: '影响用户（人）', width: 130, align: 'right' },
  { key: 'lastHitAt', title: '最后触发', width: 170 },
  { key: 'status', title: '状态', width: 90 },
  { key: 'actions', title: '操作', width: 180, fixed: 'right' }
]

function search(values) { filters.value = { ...blankFilters(), ...values }; page.value = 1 }
function reset() { filters.value = blankFilters(); page.value = 1 }

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

const periodLabel = (period) => ({
  [DELIVERY_RULE_TIME_PERIOD.REAL_TIME]: '实时',
  [DELIVERY_RULE_TIME_PERIOD.LAST_1H]: '近 1 小时',
  [DELIVERY_RULE_TIME_PERIOD.LAST_4H]: '近 4 小时',
  [DELIVERY_RULE_TIME_PERIOD.LAST_24H]: '近 24 小时',
  [DELIVERY_RULE_TIME_PERIOD.TODAY]: '今日',
  [DELIVERY_RULE_TIME_PERIOD.LAST_7D]: '近 7 天'
}[period] || '')

// The old map referenced action constants that do not exist (PRICE_ADJUST, REJECT_ORDER, LIMIT_POSITION);
// read the labels from the shared action config instead.
const actionTypeLabel = (type) => DELIVERY_RULE_ACTION_CONFIG[type]?.text || '-'
const actionColor = (type) => ({ blue: 'blue', emerald: 'green', rose: 'red' }[DELIVERY_RULE_ACTION_CONFIG[type]?.color] || 'default')

const toggleRuleStatus = (ruleId) => {
  const rule = rules.value.find((r) => r.id === ruleId)
  if (!rule) return

  if (rule.status === DELIVERY_RULE_STATUS.ENABLED) {
    rule.status = DELIVERY_RULE_STATUS.PAUSED
    message.success(`已暂停规则「${rule.name}」`)
  } else {
    rule.status = DELIVERY_RULE_STATUS.ENABLED
    message.success(`已启用规则「${rule.name}」`)
  }
}

const deleteTarget = ref(null)
const requestDelete = (rule) => { deleteTarget.value = rule }
const confirmDelete = () => {
  const rule = deleteTarget.value
  if (!rule) return
  rules.value = rules.value.filter((r) => r.id !== rule.id)
  deleteTarget.value = null
  message.success(`已删除规则「${rule.name}」`)
}

const onMoreAction = (rule, { key }) => {
  if (key === 'duplicate') openDuplicateModal(rule)
  else if (key === 'delete') requestDelete(rule)
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

  message.success('规则已保存')
  closeModal()
}
</script>

<template>
  <PageShell>
    <SearchForm name="delivery-auto-rule-filters" :model="filters" :fields="queryFields" @search="search" @reset="reset" />

    <Card :bordered="false" title="规则概览">
      <Row :gutter="[24, 16]">
        <Col v-for="card in summary" :key="card.label" :xs="12" :xl="6">
          <Statistic :title="card.label" :value="card.value" />
        </Col>
      </Row>
    </Card>

    <AdminTable title="场控规则" v-model:page="page" :rows="allFilteredRules" :columns="columns" row-key="id" desktop-only>
      <template #toolbar>
        <Button type="primary" @click="openCreateModal"><template #icon><PlusOutlined /></template>新增规则</Button>
      </template>
      <template #cell="{ column, record }">
        <Space v-if="column.key === 'rule'" direction="vertical" :size="0">
          <TypographyText strong>{{ record.name }}</TypographyText>
          <TypographyText type="secondary">{{ record.description }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'trigger'" direction="vertical" :size="0">
          <span>{{ triggerTypeLabel(record.trigger?.type) }}</span>
          <TypographyText type="secondary">{{ [periodLabel(record.trigger?.period), record.trigger?.threshold !== undefined ? `阈值 ${record.trigger.threshold}` : ''].filter(Boolean).join(' · ') || '—' }}</TypographyText>
        </Space>
        <Tag v-else-if="column.key === 'action'" :color="actionColor(record.action?.type)">{{ actionTypeLabel(record.action?.type) }}</Tag>
        <Tag v-else-if="column.key === 'priority'" :color="priorityColors[record.priority]">{{ priorityLabels[record.priority] || '-' }}</Tag>
        <template v-else-if="column.key === 'hitCount'">{{ record.hitCount }}</template>
        <template v-else-if="column.key === 'affected'">{{ record.totalAffectedUsers }}</template>
        <Tag v-else-if="column.key === 'status'" :color="statusColors[record.status]">{{ statusLabels[record.status] || '-' }}</Tag>
        <Space v-else-if="column.key === 'actions'" :size="8">
          <Button type="link" class="px-0" @click="openEditModal(record)">编辑</Button>
          <Button type="link" class="px-0" @click="toggleRuleStatus(record.id)">{{ record.status === DELIVERY_RULE_STATUS.ENABLED ? '暂停' : '启用' }}</Button>
          <Dropdown :trigger="['click']">
            <Button type="link" class="px-0">更多<DownOutlined /></Button>
            <template #overlay>
              <Menu @click="onMoreAction(record, $event)">
                <MenuItem key="duplicate">复制</MenuItem>
                <MenuItem key="delete" danger>删除</MenuItem>
              </Menu>
            </template>
          </Dropdown>
        </Space>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <AdminModal :open="!!deleteTarget" title="删除场控规则" :width="448" confirm-text="确认删除" danger @close="deleteTarget = null" @confirm="confirmDelete">
      <p>确定要删除规则「{{ deleteTarget?.name }}」吗？删除后将无法恢复。</p>
    </AdminModal>

    <!-- 规则编辑模态框 -->
    <DeliveryRuleModal
      :open="modalOpen"
      :mode="modalMode"
      :rule="currentRule"
      @close="closeModal"
      @save="saveRule"
    />
  </PageShell>
</template>
