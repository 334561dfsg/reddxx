<script setup>
// 代理报表 — Ant Design Pro report page (2026-11-28): query card (date range), overview as a Statistic card, daily
// summary in the shared table card. The daily-detail Ant Drawer keeps its own open flag (drawerOpen) separate from
// the selected day, which is cleared in afterOpenChange so the content stays during the close animation.
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Button, Card, Col, Row, Statistic, Table, TypographyText, message } from 'ant-design-vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import { mockAgentStats, agentApi } from '../../../admin/mock/agent'
import { agentReportApi } from '../../../admin/mock/agentReport'

const stats = ref({ ...mockAgentStats })
const money = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const statCards = computed(() => [
  { label: '总代理数', value: stats.value.totalAgents, hint: `${stats.value.activeAgents} 个活跃` },
  { label: '推荐人数', value: stats.value.totalReferrals, hint: '代理名下用户' },
  { label: '累计佣金（USDT）', value: stats.value.totalCommission, precision: 2, hint: `本月 ${money(stats.value.monthCommission)}` },
  { label: '今日佣金（USDT）', value: stats.value.todayCommission, precision: 2, hint: '实时数据' }
])

const loadStats = async () => {
  try {
    const res = await agentApi.getAgentStats()
    if (res.success) {
      stats.value = res.data
    }
  } catch (e) {
    message.error('代理概览加载失败')
  }
}

// Local calendar dates (the old toISOString() version produced the UTC date, a day off before 08:00 in UTC+8).
function localDate(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const defaultFilters = () => ({ range: [localDate(-29), localDate(0)] })
const filters = ref(defaultFilters())
const fields = [{ key: 'range', label: '统计日期', range: true }]
const page = ref(1)

const loading = ref(false)
const dailyRows = ref([])

// The drawer's open state is separate from the selected day so the content stays during the close animation;
// the day and its rows are cleared once the drawer has finished closing.
const selectedDate = ref(null)
const drawerOpen = ref(false)
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
  const [startDate, endDate] = filters.value.range || defaultFilters().range
  loading.value = true
  try {
    const res = await agentReportApi.getDailySummary({ startDate, endDate })
    if (res.success) {
      dailyRows.value = res.data.list || []
      if (
        selectedDate.value &&
        !dailyRows.value.some((r) => r.date === selectedDate.value)
      ) {
        drawerOpen.value = false
      }
    } else {
      message.error(res.message || '查询失败')
    }
  } catch (e) {
    message.error('按日汇总加载失败')
  } finally {
    loading.value = false
  }
}

function search(values) {
  filters.value = { range: values.range || defaultFilters().range }
  page.value = 1
  loadDaily()
}
function reset() {
  filters.value = defaultFilters()
  page.value = 1
  loadDaily()
}

const selectDay = async (date) => {
  if (selectedDate.value === date && drawerOpen.value) {
    closeAgentDrawer()
    return
  }
  selectedDate.value = date
  drawerOpen.value = true
  detailLoading.value = true
  dayAgents.value = []
  try {
    const res = await agentReportApi.getAgentsForDate(date)
    if (selectedDate.value !== date) return // a newer day was selected meanwhile
    if (res.success) {
      dayAgents.value = res.data.list || []
    } else {
      message.error(res.message || '代理明细加载失败')
    }
  } catch (e) {
    message.error('代理明细加载失败')
  } finally {
    if (selectedDate.value === date) detailLoading.value = false
  }
}

const isRowActive = (date) => selectedDate.value === date

function closeAgentDrawer() {
  drawerOpen.value = false
}

function onDrawerAfterOpenChange(open) {
  if (open) return
  selectedDate.value = null
  dayAgents.value = []
}

function onDrawerEscape(e) {
  if (e.key === 'Escape') closeAgentDrawer()
}

watch(drawerOpen, (v) => {
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

const dailyColumns = [
  { key: 'date', title: '日期', width: 140 },
  { key: 'totalCommission', title: '当日佣金（USDT）', width: 180, align: 'right' },
  { key: 'agentCount', title: '有佣代理数', width: 120, align: 'right' },
  { key: 'recordCount', title: '分佣笔数', width: 120, align: 'right' },
  { key: 'actions', title: '操作', width: 100, fixed: 'right' }
]
const agentColumns = [
  { key: 'uid', dataIndex: 'uid', title: 'UID', width: 120 },
  { key: 'username', dataIndex: 'username', title: '用户名', width: 160 },
  { key: 'email', dataIndex: 'email', title: '邮箱', width: 220 },
  { key: 'commission', dataIndex: 'commission', title: '当日佣金（USDT）', width: 160, align: 'right' },
  { key: 'orderCount', dataIndex: 'orderCount', title: '关联笔数', width: 100, align: 'right' }
]
</script>

<template>
  <PageShell>
    <SearchForm name="agent-report-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />

    <Card title="代理概览" :bordered="false">
      <Row :gutter="24">
        <Col v-for="card in statCards" :key="card.label" :xs="24" :md="12" :xl="6">
          <Statistic :title="card.label" :value="card.value" :precision="card.precision" />
          <TypographyText type="secondary">{{ card.hint }}</TypographyText>
        </Col>
      </Row>
    </Card>

    <AdminTable title="按日汇总" v-model:page="page" :rows="dailyRows" :columns="dailyColumns" row-key="date" :loading="loading" desktop-only>
      <template #toolbar>
        <Button :loading="loading" @click="loadDaily">刷新</Button>
      </template>
      <template #cell="{ column, record }">
        <TypographyText v-if="column.key === 'date'" :strong="isRowActive(record.date)">{{ record.date }}</TypographyText>
        <template v-else-if="column.key === 'totalCommission'">{{ money(record.totalCommission) }}</template>
        <Button v-else-if="column.key === 'actions'" type="link" class="px-0" :aria-expanded="isRowActive(record.date) && drawerOpen" @click="selectDay(record.date)">
          {{ isRowActive(record.date) && drawerOpen ? '收起' : '查看代理' }}
        </Button>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <a-drawer :open="drawerOpen" :mask-closable="false" :keyboard="false" :closable="false" placement="right" width="min(960px, 100vw)" class="admin-ant-business-overlay" @close="closeAgentDrawer" @after-open-change="onDrawerAfterOpenChange">
      <template #title>
        <div class="agent-report-drawer-header">
          <div class="agent-report-drawer-heading">
            <h2 id="agent-report-drawer-title" class="agent-report-drawer-title">{{ selectedLabel }} · 产生佣金的代理</h2>
            <TypographyText type="secondary">按当日佣金从高到低排序</TypographyText>
          </div>
          <Button type="text" aria-label="关闭" @click="closeAgentDrawer"><CloseOutlined /></Button>
        </div>
      </template>
      <Table :columns="agentColumns" :data-source="dayAgents" :loading="detailLoading" :pagination="false" size="middle" row-key="uid" :scroll="{ x: 760 }" :locale="{ emptyText: '暂无代理数据' }">
        <template #bodyCell="{ column, record }">
          <span v-if="column.key === 'uid'" class="font-mono">{{ record.uid }}</span>
          <template v-else-if="column.key === 'commission'">{{ money(record.commission) }}</template>
        </template>
      </Table>
    </a-drawer>
  </PageShell>
</template>

<style scoped>
.agent-report-drawer-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.agent-report-drawer-heading { min-width: 0; }
.agent-report-drawer-title { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; }
</style>
