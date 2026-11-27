<script setup>
// VIP 升级日志 — Ant Design Pro list page (2026-11-28): query card (one input per field, explicit 查询/重置),
// overview Statistics, table card with toolbar and pagination, reason and levels as text Tags.
// Recharge amounts are USDT, not USD (the old cell formatted them with a $ sign); the mock's date filter excluded
// the end day (compared at 00:00), dates now filter by whole local days.
import { ref, computed, onMounted } from 'vue'
import { Button, Card, Col, Row, Space, Statistic, Tag, TypographyText, message } from 'ant-design-vue'
import { ArrowRightOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import { getVipUpgradeLogs, vipUpgradeLogs } from '../../../admin/mock/vip'
import { VIP_UPGRADE_REASON, VIP_UPGRADE_REASON_OPTIONS } from '../../../admin/constants/vip'

const logs = ref([])
const loading = ref(false)
const page = ref(1)

const levelLabel = (level) => (level === 0 ? '普通用户' : `VIP${level}`)
const vipLevelOptions = computed(() => {
  const levels = new Set()
  vipUpgradeLogs.forEach((upgrade) => {
    levels.add(upgrade.fromVipLevel)
    levels.add(upgrade.toVipLevel)
  })
  return Array.from(levels).sort((a, b) => a - b).map((level) => ({ value: String(level), label: levelLabel(level) }))
})

const blank = () => ({ userId: '', username: '', remarks: '', upgradeReason: 'all', fromVipLevel: 'all', toVipLevel: 'all', createdAt: null })
const filters = ref(blank())
const fields = computed(() => [
  { key: 'userId', label: '用户 ID' },
  { key: 'username', label: '用户名' },
  { key: 'remarks', label: '备注' },
  { key: 'upgradeReason', label: '升级原因', options: [{ value: 'all', label: '全部原因' }, ...VIP_UPGRADE_REASON_OPTIONS] },
  { key: 'fromVipLevel', label: '起始等级', options: [{ value: 'all', label: '全部等级' }, ...vipLevelOptions.value] },
  { key: 'toVipLevel', label: '目标等级', options: [{ value: 'all', label: '全部等级' }, ...vipLevelOptions.value] },
  { key: 'createdAt', label: '升级时间', range: true }
])

const pad = (n) => String(n).padStart(2, '0')
const localDay = (value) => {
  const date = new Date(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())

const fetchLogs = async () => {
  loading.value = true
  try {
    const { list } = await getVipUpgradeLogs({ page: 1, pageSize: Number.MAX_SAFE_INTEGER })
    logs.value = list
  } catch (error) {
    message.error('获取 VIP 升级日志失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

onMounted(fetchLogs)

const rows = computed(() => logs.value.filter((log) => {
  const f = filters.value
  const day = localDay(log.createdAt)
  return has(log.userId, f.userId) && has(log.username, f.username) && has(log.remarks, f.remarks) &&
    (f.upgradeReason === 'all' || log.upgradeReason === f.upgradeReason) &&
    (f.fromVipLevel === 'all' || log.fromVipLevel === Number(f.fromVipLevel)) &&
    (f.toVipLevel === 'all' || log.toVipLevel === Number(f.toVipLevel)) &&
    (!f.createdAt || (day >= f.createdAt[0] && day <= f.createdAt[1]))
}))

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }

const upgradeReasonConfig = {
  [VIP_UPGRADE_REASON.RECHARGE]: { text: '充值升级', color: 'blue' },
  [VIP_UPGRADE_REASON.MANUAL]: { text: '手动升级', color: 'gold' }
}

const statistics = computed(() => [
  { label: '总升级记录', value: vipUpgradeLogs.length },
  { label: '充值升级', value: vipUpgradeLogs.filter((u) => u.upgradeReason === VIP_UPGRADE_REASON.RECHARGE).length },
  { label: '手动升级', value: vipUpgradeLogs.filter((u) => u.upgradeReason === VIP_UPGRADE_REASON.MANUAL).length }
])

const columns = [
  { key: 'user', title: '用户', width: 180, fixed: 'left' },
  { key: 'levels', title: '等级变化', width: 220 },
  { key: 'upgradeReason', title: '升级原因', width: 110 },
  { key: 'rechargeAmount', title: '充值金额（USDT）', width: 160, align: 'right' },
  { key: 'remarks', title: '备注', width: 260 },
  { key: 'createdAt', title: '时间', width: 180 }
]

const formatDateTime = (dateString) => new Date(dateString).toLocaleString('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
})
const formatAmount = (amount) => Number(amount).toLocaleString('zh-CN', { maximumFractionDigits: 2 })

// Mock export: no file yet, so say so instead of a native alert (operation feedback is toast-only).
const exportData = () => {
  message.info(`已按当前筛选条件准备导出 ${rows.value.length} 条升级记录（演示环境不生成文件）`)
}
</script>

<template>
  <PageShell>
    <SearchForm name="vip-upgrade-log-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <Card :bordered="false" title="升级概况">
      <Row :gutter="24">
        <Col v-for="stat in statistics" :key="stat.label" :xs="12" :md="6">
          <Statistic :title="stat.label" :value="stat.value" />
        </Col>
      </Row>
    </Card>
    <AdminTable title="升级记录" v-model:page="page" :rows="rows" :columns="columns" row-key="id" :loading="loading" desktop-only>
      <template #toolbar>
        <Button @click="exportData"><template #icon><DownloadOutlined /></template>导出</Button>
      </template>
      <template #cell="{ column, record }">
        <Space v-if="column.key === 'user'" direction="vertical" :size="0">
          <TypographyText strong>{{ record.username }}</TypographyText>
          <TypographyText type="secondary" class="font-mono">{{ record.userId }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'levels'" :size="4" wrap>
          <Tag>{{ levelLabel(record.fromVipLevel) }}</Tag>
          <ArrowRightOutlined aria-label="升级为" />
          <Tag color="green">{{ levelLabel(record.toVipLevel) }}</Tag>
        </Space>
        <Tag v-else-if="column.key === 'upgradeReason'" :color="upgradeReasonConfig[record.upgradeReason]?.color">{{ upgradeReasonConfig[record.upgradeReason]?.text || record.upgradeReason }}</Tag>
        <template v-else-if="column.key === 'rechargeAmount'">
          <span v-if="record.rechargeAmount">{{ formatAmount(record.rechargeAmount) }}</span>
          <TypographyText v-else type="secondary">—</TypographyText>
        </template>
        <template v-else-if="column.key === 'createdAt'">{{ formatDateTime(record.createdAt) }}</template>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>
  </PageShell>
</template>
