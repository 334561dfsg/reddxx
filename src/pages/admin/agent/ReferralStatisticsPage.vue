<script setup>
// 裂变分销统计 — Ant Design Pro report page (2026-11-28): query card (date range), the settlement arrangement and
// period totals as a Statistic card, daily summary in the shared table card. The daily-detail Ant Drawer keeps its own
// open flag (drawerOpen) separate from the selected day, which is cleared in afterOpenChange so the content stays
// during the close animation.
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Card, Col, Row, Space, Statistic, Table, TypographyText, message } from 'ant-design-vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import { referralStatsReportApi } from '../../../admin/mock/referralStatsReport'
import { referralApi } from '../../../admin/mock/referral'
import {
  getReferralCreditToLabel,
  getReferralSettlementScheduleLine,
  getReferralSettlementNotifyLine
} from '../../../admin/constants/referral'

const router = useRouter()
const money = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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

const dailyLoading = ref(false)
const dailyRows = ref([])
// The drawer's open state is separate from the selected day so the content stays during the close animation;
// the day and its rows are cleared once the drawer has finished closing.
const selectedDate = ref(null)
const drawerOpen = ref(false)
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

const totals = computed(() => [
  { label: '区间佣金（USDT）', value: dailyRows.value.reduce((sum, row) => sum + Number(row.totalCommission || 0), 0), precision: 2 },
  { label: '分佣笔数', value: dailyRows.value.reduce((sum, row) => sum + Number(row.recordCount || 0), 0) },
  { label: '统计天数', value: dailyRows.value.length }
])

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
  const [startDate, endDate] = filters.value.range || defaultFilters().range
  dailyLoading.value = true
  try {
    const res = await referralStatsReportApi.getDailySummary({ startDate, endDate })
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
    dailyLoading.value = false
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
    closeReferralDrawer()
    return
  }
  selectedDate.value = date
  drawerOpen.value = true
  detailLoading.value = true
  dayInviters.value = []
  try {
    const res = await referralStatsReportApi.getInvitersForDate(date)
    if (selectedDate.value !== date) return // a newer day was selected meanwhile
    if (res.success) {
      dayInviters.value = res.data.list || []
    } else {
      message.error(res.message || '明细加载失败')
    }
  } catch (e) {
    message.error('明细加载失败')
  } finally {
    if (selectedDate.value === date) detailLoading.value = false
  }
}

const isRowActive = (date) => selectedDate.value === date

function closeReferralDrawer() {
  drawerOpen.value = false
}

function onDrawerAfterOpenChange(open) {
  if (open) return
  selectedDate.value = null
  dayInviters.value = []
}

function onReferralDrawerEscape(e) {
  if (e.key === 'Escape') closeReferralDrawer()
}

watch(drawerOpen, (v) => {
  if (v) document.addEventListener('keydown', onReferralDrawerEscape)
  else document.removeEventListener('keydown', onReferralDrawerEscape)
})

onMounted(async () => {
  loadDaily()
  try {
    const res = await referralApi.getReferralConfig()
    if (res.success) settlementCfg.value = res.data
  } catch (e) {
    message.error('结算配置加载失败')
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', onReferralDrawerEscape)
})

const dailyColumns = [
  { key: 'date', title: '日期', width: 140 },
  { key: 'totalCommission', title: '当日佣金（USDT）', width: 180, align: 'right' },
  { key: 'inviterCount', title: '有佣上级数', width: 120, align: 'right' },
  { key: 'recordCount', title: '分佣笔数', width: 120, align: 'right' },
  { key: 'actions', title: '操作', width: 100, fixed: 'right' }
]
const inviterColumns = [
  { key: 'uid', dataIndex: 'uid', title: 'UID', width: 120 },
  { key: 'username', dataIndex: 'username', title: '用户名', width: 160 },
  { key: 'email', dataIndex: 'email', title: '邮箱', width: 220 },
  { key: 'commission', dataIndex: 'commission', title: '当日佣金（USDT）', width: 160, align: 'right' },
  { key: 'orderCount', dataIndex: 'orderCount', title: '分佣笔数', width: 100, align: 'right' }
]
</script>

<template>
  <PageShell>
    <SearchForm name="referral-statistics-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />

    <Card title="区间概览" :bordered="false">
      <Row :gutter="24">
        <Col v-for="item in totals" :key="item.label" :span="6">
          <Statistic :title="item.label" :value="item.value" :precision="item.precision" />
        </Col>
        <Col :span="6">
          <Statistic title="当前入账账户" :value="settlementCreditLabel || '—'" />
        </Col>
      </Row>
      <TypographyText v-if="settlementCfg" type="secondary" class="referral-stats-schedule">
        结算安排：{{ settlementScheduleLine }} {{ settlementNotifyLine }}
      </TypographyText>
    </Card>

    <AdminTable title="按日汇总" v-model:page="page" :rows="dailyRows" :columns="dailyColumns" row-key="date" :loading="dailyLoading" desktop-only>
      <template #toolbar>
        <Space :size="8">
          <Button :loading="dailyLoading" @click="loadDaily">刷新</Button>
          <Button @click="router.push('/admin/agent/referral-config')">裂变分销设置</Button>
        </Space>
      </template>
      <template #cell="{ column, record }">
        <TypographyText v-if="column.key === 'date'" :strong="isRowActive(record.date)">{{ record.date }}</TypographyText>
        <template v-else-if="column.key === 'totalCommission'">{{ money(record.totalCommission) }}</template>
        <Button v-else-if="column.key === 'actions'" type="link" class="px-0" :aria-expanded="isRowActive(record.date) && drawerOpen" @click="selectDay(record.date)">
          {{ isRowActive(record.date) && drawerOpen ? '收起' : '查看明细' }}
        </Button>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <a-drawer :open="drawerOpen" :mask-closable="false" :keyboard="false" :closable="false" placement="right" width="min(960px, 100vw)" class="admin-ant-business-overlay" @close="closeReferralDrawer" @after-open-change="onDrawerAfterOpenChange">
      <template #title>
        <div class="referral-stats-drawer-header">
          <div class="referral-stats-drawer-heading">
            <h2 id="referral-stats-drawer-title" class="referral-stats-drawer-title">{{ selectedDayLabel }} · 获得裂变分佣的邀请上级</h2>
            <TypographyText type="secondary">按当日佣金从高到低排序</TypographyText>
          </div>
          <Button type="text" aria-label="关闭" @click="closeReferralDrawer"><CloseOutlined /></Button>
        </div>
      </template>
      <Table :columns="inviterColumns" :data-source="dayInviters" :loading="detailLoading" :pagination="false" size="middle" row-key="uid" :scroll="{ x: 760 }" :locale="{ emptyText: '暂无数据' }">
        <template #bodyCell="{ column, record }">
          <span v-if="column.key === 'uid'" class="font-mono">{{ record.uid }}</span>
          <template v-else-if="column.key === 'commission'">{{ money(record.commission) }}</template>
        </template>
      </Table>
    </a-drawer>
  </PageShell>
</template>

<style scoped>
.referral-stats-schedule { display: block; margin-top: 16px; }
.referral-stats-drawer-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.referral-stats-drawer-heading { min-width: 0; }
.referral-stats-drawer-title { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; }
</style>
