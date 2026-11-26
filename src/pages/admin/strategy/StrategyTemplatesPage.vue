<script setup>
import {computed, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {message, Button, Space, Tag, TypographyText} from 'ant-design-vue'
import {PlusOutlined} from '@ant-design/icons-vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {useStrategyFeed, strategyCommand, errorText, marketLabels, styleLabels, templateStatusLabels} from '../../../shared/strategy/client.js'
import {LIVE} from '../../../shared/strategy/domain.js'
import {amount} from './strategyFormat.js'

const route = useRoute(), router = useRouter(), {state, error, busy, loaded, refresh} = useStrategyFeed()
const filters = ref({q: String(route.query.q || ''), market: String(route.query.market || 'all'), style: String(route.query.style || 'all'), status: String(route.query.status || 'all')})
const page = ref(Math.max(1, Number(route.query.page) || 1))
const fields = [
  {key: 'q', label: '模板名称'},
  {key: 'market', label: '市场', options: [{value: 'all', label: '全部市场'}, ...Object.entries(marketLabels).map(([value, label]) => ({value, label}))]},
  {key: 'style', label: '风格', options: [{value: 'all', label: '全部风格'}, ...Object.entries(styleLabels).map(([value, label]) => ({value, label}))]},
  {key: 'status', label: '状态', options: [{value: 'all', label: '全部状态'}, ...Object.entries(templateStatusLabels).map(([value, label]) => ({value, label}))]},
]
const usage = computed(() => {
  const map = {}
  for (const sub of state.value.subscriptions) {
    if (!LIVE.includes(sub.status)) continue
    const entry = map[sub.templateSnapshot.templateId] ||= {count: 0, capital: 0}
    entry.count += 1
    entry.capital += sub.capital
  }
  return map
})
const rows = computed(() => [...state.value.templates].sort((a, b) => a.sortOrder - b.sortOrder).filter(t =>
  (!filters.value.q || t.name.toLowerCase().includes(filters.value.q.toLowerCase()) || t.templateId.toLowerCase().includes(filters.value.q.toLowerCase())) &&
  (filters.value.market === 'all' || t.market === filters.value.market) &&
  (filters.value.style === 'all' || t.style === filters.value.style) &&
  (filters.value.status === 'all' || t.status === filters.value.status)))
watch(() => rows.value.length, total => { page.value = Math.min(page.value, Math.max(1, Math.ceil(total / 10))) })
const columns = [
  {key: 'sortOrder', title: '排序', width: 70, fixed: 'left'},
  {key: 'name', title: '模板', width: 240, fixed: 'left'},
  {key: 'category', title: '市场 / 风格', width: 130},
  {key: 'risk', title: '风险等级', width: 90},
  {key: 'capital', title: '起投 – 单笔上限（USDT）', width: 200, align: 'right'},
  {key: 'days', title: '运行周期', width: 110},
  {key: 'usage', title: '进行中订阅 / 资金（USDT）', width: 210, align: 'right'},
  {key: 'status', title: '状态', width: 90},
  {key: 'actions', title: '操作', width: 150, fixed: 'right'},
]
function search(values) { filters.value = {q: values.q.trim(), market: values.market || 'all', style: values.style || 'all', status: values.status || 'all'}; page.value = 1 }
function reset() { filters.value = {q: '', market: 'all', style: 'all', status: 'all'}; page.value = 1 }
const listQuery = () => ({...filters.value, page: page.value})
function edit(template) { router.push({path: template ? `/admin/strategy/templates/${encodeURIComponent(template.templateId)}/edit` : '/admin/strategy/templates/new', query: listQuery()}) }

const target = ref(null)
async function toggleStatus() {
  if (busy.value || !target.value) return
  try {
    await strategyCommand('setTemplateStatus', {templateId: target.value.templateId, expectedStatus: target.value.status})
    message.success(target.value.status === 'listed' ? '模板已下架' : '模板已上架')
    target.value = null
  } catch (e) { message.error(errorText(e)) }
}
</script>

<template>
 <PageShell>
  <FeedbackToast v-if="error" type="error" :source="() => (error ? errorText(error) : '')"><Button @click="refresh">重试</Button></FeedbackToast>
  <SearchForm name="strategy-template-filters" :model="filters" :fields="fields" @search="search" @reset="reset"/>
  <AdminTable title="策略模板" v-model:page="page" :rows="rows" :columns="columns" row-key="templateId" :loading="!loaded && !error" desktop-only>
   <template #toolbar><Space :size="8"><Button @click="refresh">刷新</Button><Button type="primary" @click="edit()"><template #icon><PlusOutlined/></template>新增模板</Button></Space></template>
   <template #cell="{column, record}">
    <Space v-if="column.key === 'name'" direction="vertical" :size="0"><TypographyText strong>{{ record.name }}</TypographyText><TypographyText type="secondary">{{ record.templateId }} · v{{ record.version }}</TypographyText></Space>
    <template v-else-if="column.key === 'category'">{{ marketLabels[record.market] }} / {{ styleLabels[record.style] }}</template>
    <template v-else-if="column.key === 'risk'">Lv.{{ record.risk }}</template>
    <template v-else-if="column.key === 'capital'">{{ amount(record.minCapital) }} – {{ amount(record.maxCapital) }}</template>
    <template v-else-if="column.key === 'days'">{{ record.minDays }} – {{ record.maxDays }} 天</template>
    <template v-else-if="column.key === 'usage'">{{ usage[record.templateId]?.count || 0 }} / {{ amount(usage[record.templateId]?.capital || 0) }}<TypographyText v-if="record.capacity" type="secondary"> · 容量 {{ amount(record.capacity) }}</TypographyText></template>
    <Tag v-else-if="column.key === 'status'" :color="record.status === 'listed' ? 'green' : 'default'">{{ templateStatusLabels[record.status] }}</Tag>
    <Space v-else-if="column.key === 'actions'" :size="8"><Button type="link" @click="edit(record)">编辑</Button><Button type="link" :danger="record.status === 'listed'" @click="target = {...record}">{{ record.status === 'listed' ? '下架' : '上架' }}</Button></Space>
    <template v-else>{{ record[column.key] ?? '—' }}</template>
   </template>
  </AdminTable>
  <AdminModal :open="!!target" :title="target?.status === 'listed' ? '下架策略模板' : '上架策略模板'" :busy="busy" :confirm-text="target?.status === 'listed' ? '确认下架' : '确认上架'" :danger="target?.status === 'listed'" @close="target = null" @confirm="toggleStatus">
   <div v-if="target"><TypographyText strong>{{ target.name }}</TypographyText><p>{{ target.status === 'listed' ? '下架后前台不再展示该模板，也不能新订阅；进行中的订阅按原条款继续运行，待审核订阅不能再通过。' : '上架后前台策略列表展示该模板，用户可按当前条款订阅。' }}</p></div>
  </AdminModal>
 </PageShell>
</template>
