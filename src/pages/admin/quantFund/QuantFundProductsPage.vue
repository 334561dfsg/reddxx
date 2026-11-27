<script setup>
// 量化基金 → 产品管理. Follows the Earn/strategy list conventions: query card with one input per field, shared table
// card, guarded list/unlist confirmation in the operation column. Sort weights: larger first.
import {computed, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {message, Button, Progress, Space, Tag, TypographyText} from 'ant-design-vue'
import {PlusOutlined} from '@ant-design/icons-vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {useQuantFundFeed, quantFundCommand, errorText, productStatusLabels, riskLabels, riskColors, lockLabel} from '../../../shared/quantFund/client.js'
import {ASSETS, FUNDED, raisedAmount} from '../../../shared/quantFund/domain.js'

const whole = value => Number(value || 0).toLocaleString('zh-CN', {maximumFractionDigits: 2})
const route = useRoute(), router = useRouter(), {state, error, busy, loaded, refresh} = useQuantFundFeed()
const blank = () => ({name: '', code: '', asset: 'all', term: 'all', status: 'all'})
const filters = ref({...blank(), ...Object.fromEntries(Object.keys(blank()).filter(k => route.query[k] != null).map(k => [k, String(route.query[k])]))})
const page = ref(Math.max(1, Number(route.query.page) || 1))
const fields = [
  {key: 'name', label: '产品名称'},
  {key: 'code', label: '产品代码'},
  {key: 'asset', label: '标识币种', options: [{value: 'all', label: '全部币种'}, ...ASSETS.map(value => ({value, label: value}))]},
  {key: 'term', label: '锁定期', options: [{value: 'all', label: '全部'}, {value: 'flexible', label: '无锁定期'}, {value: 'fixed', label: '有锁定期'}]},
  {key: 'status', label: '状态', options: [{value: 'all', label: '全部状态'}, ...Object.entries(productStatusLabels).map(([value, label]) => ({value, label}))]},
]
const has = (value, query) => !query || String(value).toLowerCase().includes(query.trim().toLowerCase())
const holdings = computed(() => {
  const map = {}
  for (const o of state.value.orders) {
    if (!FUNDED.includes(o.status)) continue
    const entry = map[o.productSnapshot.productId] ||= {count: 0, principal: 0}
    entry.count += 1
    entry.principal += o.principal
  }
  return map
})
const rows = computed(() => [...state.value.products].sort((a, b) => b.sortOrder - a.sortOrder).filter(p => {
  const f = filters.value
  return has(p.name, f.name) && has(p.code, f.code) && (f.asset === 'all' || p.asset === f.asset) && (f.status === 'all' || p.status === f.status) &&
    (f.term === 'all' || (f.term === 'flexible') === (p.lockDays === null))
}))
watch(() => rows.value.length, total => { page.value = Math.min(page.value, Math.max(1, Math.ceil(total / 10))) })
const progress = p => Math.min(100, Math.round(raisedAmount(state.value, p) / p.totalQuota * 1000) / 10)
const columns = [
  {key: 'name', title: '产品', width: 230, fixed: 'left'},
  {key: 'term', title: '锁定期', width: 76},
  {key: 'rate', title: '日收益率', width: 104, align: 'right'},
  {key: 'amount', title: '申购金额（USDT）', width: 150, align: 'right'},
  {key: 'funding', title: '募集进度', width: 140},
  {key: 'holdings', title: '持有中', width: 100, align: 'right'},
  {key: 'status', title: '状态', width: 70},
  {key: 'sortOrder', title: '排序权重', width: 70, align: 'right'},
  {key: 'actions', title: '操作', width: 110, fixed: 'right'},
]
function search(values) { filters.value = {...blank(), ...values}; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }
function edit(product) {
  router.push({path: product ? `/admin/quant-fund/products/${encodeURIComponent(product.productId)}/edit` : '/admin/quant-fund/products/new', query: {...filters.value, page: page.value}})
}

const target = ref(null)
async function toggleStatus() {
  if (busy.value || !target.value) return
  try {
    await quantFundCommand('setProductStatus', {productId: target.value.productId, expectedStatus: target.value.status})
    message.success(target.value.status === 'listed' ? '产品已下架' : '产品已上架')
    target.value = null
  } catch (e) { message.error(errorText(e)) }
}
</script>

<template>
 <PageShell>
  <FeedbackToast v-if="error" type="error" :source="() => (error ? errorText(error) : '')"><Button @click="refresh">重试</Button></FeedbackToast>
  <SearchForm name="quant-fund-product-filters" :model="filters" :fields="fields" @search="search" @reset="reset"/>
  <AdminTable title="量化基金产品" v-model:page="page" :rows="rows" :columns="columns" row-key="productId" :loading="!loaded && !error" desktop-only>
   <template #toolbar><Space :size="8"><Button @click="refresh">刷新</Button><Button type="primary" @click="edit()"><template #icon><PlusOutlined/></template>新增产品</Button></Space></template>
   <template #cell="{column, record}">
    <Space v-if="column.key === 'name'" direction="vertical" :size="4">
     <span><TypographyText strong>{{ record.name }}</TypographyText><br/><TypographyText type="secondary">{{ record.code }} · {{ record.asset }} · v{{ record.version }}<template v-if="record.restrictedUserIds?.length"> · 限购 {{ record.restrictedUserIds.length }} 人</template></TypographyText></span>
     <!-- The same tags the public card shows: risk by level, automatic 活期/随时赎回 when there is no lock, grey strategy tags. -->
     <Space :size="[4, 4]" wrap class="qf-list-tags">
      <Tag :color="riskColors[record.riskLevel]">{{ riskLabels[record.riskLevel] }}</Tag>
      <template v-if="record.lockDays === null"><Tag color="cyan">活期</Tag><Tag color="cyan">随时赎回</Tag></template>
      <Tag v-for="tag in record.tags" :key="tag">{{ tag }}</Tag>
     </Space>
    </Space>
    <template v-else-if="column.key === 'term'">{{ lockLabel(record.lockDays) }}</template>
    <Space v-else-if="column.key === 'rate'" direction="vertical" :size="0" align="end"><span>{{ record.dailyRate.min === record.dailyRate.max ? `${record.dailyRate.min}%` : `${record.dailyRate.min}% ~ ${record.dailyRate.max}%` }}</span><TypographyText v-if="record.lockDays !== null" type="secondary">提前赎回 {{ record.earlyRedeemFeeRate }}%</TypographyText></Space>
    <template v-else-if="column.key === 'amount'">{{ whole(record.minAmount) }} ~ {{ whole(record.maxAmount) }}</template>
    <div v-else-if="column.key === 'funding'"><Progress :percent="progress(record)" size="small" :show-info="false"/><TypographyText type="secondary">{{ progress(record) }}% · 总额度 {{ whole(record.totalQuota) }}</TypographyText></div>
    <Space v-else-if="column.key === 'holdings'" direction="vertical" :size="0" align="end"><span>{{ holdings[record.productId]?.count || 0 }} 笔</span><TypographyText type="secondary">{{ whole(holdings[record.productId]?.principal || 0) }}</TypographyText></Space>
    <Tag v-else-if="column.key === 'status'" :color="record.status === 'listed' ? 'green' : 'default'">{{ productStatusLabels[record.status] }}</Tag>
    <Space v-else-if="column.key === 'actions'" :size="8" class="qf-row-actions"><Button type="link" @click="edit(record)">编辑</Button><Button type="link" :danger="record.status === 'listed'" @click="target = {...record}">{{ record.status === 'listed' ? '下架' : '上架' }}</Button></Space>
    <template v-else>{{ record[column.key] ?? '—' }}</template>
   </template>
  </AdminTable>
  <AdminModal :open="!!target" :title="target?.status === 'listed' ? '下架量化基金产品' : '上架量化基金产品'" :busy="busy" :confirm-text="target?.status === 'listed' ? '确认下架' : '确认上架'" :danger="target?.status === 'listed'" @close="target = null" @confirm="toggleStatus">
   <div v-if="target"><TypographyText strong>{{ target.name }}</TypographyText><p>{{ target.status === 'listed' ? '下架后不能新申购，待审核的申购也不能再通过；持有中的订单按原条款继续计息和赎回。' : '上架后用户可按当前条款申购。' }}</p></div>
  </AdminModal>
 </PageShell>
</template>

<style scoped>
.qf-row-actions :deep(.ant-btn-link){padding-inline:4px}
.qf-list-tags :deep(.ant-tag){margin-inline-end:0}
</style>
