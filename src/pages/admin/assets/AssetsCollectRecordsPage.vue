<script setup>
// 归集记录 — Ant Design Pro list page (2026-11-28): query card, status counts as Statistics, table card. The old
// per-record card with an inline expandable 关联地址 list became a table row whose 关联地址 action opens a Drawer
// with the full paginated list (same data, every related address still reachable).
import { computed, ref } from 'vue'
import { Button, Card, Col, Row, Space, Statistic, Table, Tag, TypographyText } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminDrawer from '../../../admin/components/antd/AdminDrawer.vue'
import { ASSET_COLLECT_MODE, ASSET_COLLECT_RECORD_STATUS, ASSET_COMMON_FILTER_ALL } from '../../../admin/constants/assets'
import { createAssetsCollectRecordsMock } from '../../../admin/mock/assets'

const records = ref(createAssetsCollectRecordsMock())
const page = ref(1)

const statusMeta = {
  [ASSET_COLLECT_RECORD_STATUS.PENDING]: { text: '待处理', color: 'orange' },
  [ASSET_COLLECT_RECORD_STATUS.PROCESSING]: { text: '处理中', color: 'blue' },
  [ASSET_COLLECT_RECORD_STATUS.DONE]: { text: '已完成', color: 'green' },
  [ASSET_COLLECT_RECORD_STATUS.FAILED]: { text: '失败', color: 'red' }
}
const modeMeta = {
  [ASSET_COLLECT_MODE.AUTO]: { text: '自动', color: 'purple' },
  [ASSET_COLLECT_MODE.MANUAL]: { text: '手动', color: 'orange' }
}

const stat = computed(() => Object.keys(statusMeta).map((status) => ({ status, text: statusMeta[status].text, count: records.value.filter((r) => r.status === status).length })))

const coinOptions = computed(() => [...new Set(['USDT', 'BTC', ...records.value.map((r) => r.coin)])].map((value) => ({ value, label: value })))
const blank = () => ({ status: ASSET_COMMON_FILTER_ALL, coin: ASSET_COMMON_FILTER_ALL, mode: ASSET_COMMON_FILTER_ALL, txHash: '', address: '' })
const filters = ref(blank())
const fields = computed(() => [
  { key: 'status', label: '状态', options: [{ value: ASSET_COMMON_FILTER_ALL, label: '全部状态' }, ...Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.text }))] },
  { key: 'coin', label: '币种', searchable: true, options: [{ value: ASSET_COMMON_FILTER_ALL, label: '全部币种' }, ...coinOptions.value] },
  { key: 'mode', label: '归集方式', options: [{ value: ASSET_COMMON_FILTER_ALL, label: '全部方式' }, ...Object.entries(modeMeta).map(([value, meta]) => ({ value, label: meta.text }))] },
  { key: 'txHash', label: '交易哈希' },
  { key: 'address', label: '地址' }
])
const has = (value, query) => !query || String(value).toLowerCase().includes(query.trim().toLowerCase())

const rows = computed(() => records.value.filter((r) => {
  const f = filters.value
  return (f.status === ASSET_COMMON_FILTER_ALL || r.status === f.status) &&
    (f.coin === ASSET_COMMON_FILTER_ALL || r.coin === f.coin) &&
    (f.mode === ASSET_COMMON_FILTER_ALL || r.mode === f.mode) &&
    has(r.txHash, f.txHash) && (!f.address || has(`${r.from} ${r.to}`, f.address))
}))

const columns = [
  { key: 'coin', title: '币种 / 网络', width: 170, fixed: 'left' },
  { key: 'mode', title: '方式', width: 80 },
  { key: 'amount', title: '归集金额', width: 150, align: 'right' },
  { key: 'fee', title: '手续费', width: 110, align: 'right' },
  { key: 'addresses', title: '发起 / 归集地址', width: 200 },
  { key: 'txHash', title: '交易哈希', width: 180 },
  { key: 'time', title: '创建 / 完成时间', width: 150 },
  { key: 'status', title: '状态', width: 90 },
  { key: 'actions', title: '操作', width: 130, fixed: 'right' }
]

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }

const relatedRecord = ref(null)
const relatedOpen = ref(false)
const relatedColumns = [
  { key: 'address', dataIndex: 'address', title: '地址' },
  { key: 'amount', dataIndex: 'amount', title: '金额', align: 'right', width: 160 },
  { key: 'status', dataIndex: 'status', title: '状态', width: 90 }
]
function openRelated(record) { relatedRecord.value = record; relatedOpen.value = true }
</script>

<template>
  <PageShell>
    <SearchForm name="asset-collect-record-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <Card :bordered="false" title="归集概况">
      <Row :gutter="24">
        <Col v-for="item in stat" :key="item.status" :xs="12" :md="6">
          <Statistic :title="item.text" :value="item.count" suffix="笔" />
        </Col>
      </Row>
    </Card>
    <AdminTable title="归集记录" v-model:page="page" :rows="rows" :columns="columns" row-key="id" desktop-only>
      <template #cell="{ column, record }">
        <Space v-if="column.key === 'coin'" direction="vertical" :size="0">
          <TypographyText strong>{{ record.coin }}</TypographyText>
          <TypographyText type="secondary">{{ record.network }}</TypographyText>
        </Space>
        <Tag v-else-if="column.key === 'mode'" :color="modeMeta[record.mode]?.color">{{ modeMeta[record.mode]?.text }}</Tag>
        <span v-else-if="column.key === 'amount'">{{ record.amount.toLocaleString() }} {{ record.coin }}</span>
        <span v-else-if="column.key === 'fee'">{{ record.fee }} {{ record.coin }}</span>
        <Space v-else-if="column.key === 'addresses'" direction="vertical" :size="0">
          <span class="font-mono">{{ record.from }}</span>
          <TypographyText type="secondary" class="font-mono">→ {{ record.to }}</TypographyText>
        </Space>
        <span v-else-if="column.key === 'txHash'" class="font-mono">{{ record.txHash }}</span>
        <Space v-else-if="column.key === 'time'" direction="vertical" :size="0">
          <span>{{ record.createdAt }}</span>
          <TypographyText type="secondary">{{ record.finishedAt === '-' ? '未完成' : `完成于 ${record.finishedAt}` }}</TypographyText>
        </Space>
        <Tag v-else-if="column.key === 'status'" :color="statusMeta[record.status]?.color">{{ statusMeta[record.status]?.text || '未知' }}</Tag>
        <Button v-else-if="column.key === 'actions'" type="link" class="px-0" @click="openRelated(record)">关联地址（{{ record.related.length }}）</Button>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <AdminDrawer :open="relatedOpen" :title="relatedRecord ? `关联地址 · ${relatedRecord.coin} ${relatedRecord.network}` : '关联地址'" :width="640" @close="relatedOpen = false" @closed="relatedRecord = null">
      <Table v-if="relatedRecord" :columns="relatedColumns" :data-source="relatedRecord.related" :row-key="(item) => item.address" size="small" :pagination="{ pageSize: 5, showSizeChanger: false, hideOnSinglePage: true, showTotal: (total) => '共 ' + total + ' 个地址' }">
        <template #bodyCell="{ column, record: item }">
          <span v-if="column.key === 'address'" class="font-mono">{{ item.address }}</span>
          <span v-else-if="column.key === 'amount'">{{ item.amount.toLocaleString() }} {{ relatedRecord.coin }}</span>
          <Tag v-else-if="column.key === 'status'" :color="statusMeta[item.status]?.color">{{ statusMeta[item.status]?.text || '未知' }}</Tag>
        </template>
      </Table>
    </AdminDrawer>
  </PageShell>
</template>
