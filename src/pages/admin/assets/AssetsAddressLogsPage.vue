<script setup>
// 地址日志 — Ant Design Pro list page (2026-11-28): query card, type counts as Statistics, table card with pagination.
// The old type tabs are now the 类型 query field; search applies on 查询 instead of instantly.
import { computed, ref } from 'vue'
import { Card, Col, Row, Space, Statistic, Tag, TypographyText } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import { ASSET_ADDRESS_LOG_STATUS, ASSET_ADDRESS_LOG_TYPE, ASSET_COMMON_FILTER_ALL } from '../../../admin/constants/assets'
import { createAssetsAddressLogsMock } from '../../../admin/mock/assets'

const logs = ref(createAssetsAddressLogsMock())
const page = ref(1)

const typeMeta = {
  [ASSET_ADDRESS_LOG_TYPE.DEPOSIT]: { text: '充值', color: 'green' },
  [ASSET_ADDRESS_LOG_TYPE.WITHDRAW]: { text: '提现', color: 'red' },
  [ASSET_ADDRESS_LOG_TYPE.COLLECT]: { text: '归集', color: 'blue' },
  [ASSET_ADDRESS_LOG_TYPE.TRANSFER]: { text: '转账', color: 'purple' }
}
const statusMeta = {
  [ASSET_ADDRESS_LOG_STATUS.CONFIRMED]: { text: '已确认', color: 'green' },
  [ASSET_ADDRESS_LOG_STATUS.PENDING]: { text: '待确认', color: 'orange' },
  [ASSET_ADDRESS_LOG_STATUS.FAILED]: { text: '失败', color: 'red' }
}

const countByType = computed(() => Object.keys(typeMeta).map((type) => ({ type, text: typeMeta[type].text, count: logs.value.filter((i) => i.type === type).length })))

const coinOptions = computed(() => [...new Set(['USDT', 'BTC', 'ETH', ...logs.value.map((i) => i.coin)])].map((value) => ({ value, label: value })))
const blank = () => ({ type: ASSET_COMMON_FILTER_ALL, coin: ASSET_COMMON_FILTER_ALL, status: ASSET_COMMON_FILTER_ALL, txHash: '', address: '' })
const filters = ref(blank())
const fields = computed(() => [
  { key: 'type', label: '类型', options: [{ value: ASSET_COMMON_FILTER_ALL, label: '全部类型' }, ...Object.entries(typeMeta).map(([value, meta]) => ({ value, label: meta.text }))] },
  { key: 'coin', label: '币种', searchable: true, options: [{ value: ASSET_COMMON_FILTER_ALL, label: '全部币种' }, ...coinOptions.value] },
  { key: 'status', label: '状态', options: [{ value: ASSET_COMMON_FILTER_ALL, label: '全部状态' }, ...Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.text }))] },
  { key: 'txHash', label: '交易哈希' },
  { key: 'address', label: '地址' }
])
const has = (value, query) => !query || String(value).toLowerCase().includes(query.trim().toLowerCase())

const rows = computed(() => logs.value.filter((item) => {
  const f = filters.value
  return (f.type === ASSET_COMMON_FILTER_ALL || item.type === f.type) &&
    (f.coin === ASSET_COMMON_FILTER_ALL || item.coin === f.coin) &&
    (f.status === ASSET_COMMON_FILTER_ALL || item.status === f.status) &&
    has(item.txHash, f.txHash) && has(item.address, f.address)
}))

const columns = [
  { key: 'type', title: '类型', width: 90 },
  { key: 'coin', title: '币种 / 网络', width: 170 },
  { key: 'address', title: '地址', width: 190 },
  { key: 'amount', title: '金额', width: 160, align: 'right' },
  { key: 'txHash', title: '交易哈希', width: 190 },
  { key: 'block', title: '区块 / 确认数', width: 190 },
  { key: 'status', title: '状态', width: 90 },
  { key: 'time', title: '时间', width: 150 }
]

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }
</script>

<template>
  <PageShell>
    <SearchForm name="asset-address-log-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <Card :bordered="false" title="日志概况">
      <Row :gutter="24">
        <Col v-for="item in countByType" :key="item.type" :xs="12" :md="6">
          <Statistic :title="item.text + '笔数'" :value="item.count" />
        </Col>
      </Row>
    </Card>
    <AdminTable title="地址日志" v-model:page="page" :rows="rows" :columns="columns" row-key="id" desktop-only>
      <template #cell="{ column, record }">
        <Tag v-if="column.key === 'type'" :color="typeMeta[record.type]?.color">{{ typeMeta[record.type]?.text || '—' }}</Tag>
        <Space v-else-if="column.key === 'coin'" direction="vertical" :size="0">
          <TypographyText strong>{{ record.coin }}</TypographyText>
          <TypographyText type="secondary">{{ record.network }}</TypographyText>
        </Space>
        <span v-else-if="column.key === 'address' || column.key === 'txHash'" class="font-mono">{{ record[column.key] }}</span>
        <TypographyText v-else-if="column.key === 'amount'" :type="String(record.amount).startsWith('+') ? 'success' : 'danger'">{{ record.amount }}</TypographyText>
        <Tag v-else-if="column.key === 'status'" :color="statusMeta[record.status]?.color">{{ statusMeta[record.status]?.text || '—' }}</Tag>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>
  </PageShell>
</template>
