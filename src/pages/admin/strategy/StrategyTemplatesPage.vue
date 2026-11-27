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

const whole = value => Number(value || 0).toLocaleString('zh-CN', {maximumFractionDigits: 2})
const riskColor = risk => (risk >= 4 ? 'red' : risk === 3 ? 'orange' : 'blue')

const route = useRoute(), router = useRouter(), {state, error, busy, loaded, refresh} = useStrategyFeed()
const filters = ref({name: String(route.query.name || ''), templateId: String(route.query.templateId || ''), market: String(route.query.market || 'all'), style: String(route.query.style || 'all'), status: String(route.query.status || 'all')})
const page = ref(Math.max(1, Number(route.query.page) || 1))
const fields = [
  {key: 'name', label: '模板名称'},
  {key: 'templateId', label: '模板 ID'},
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
const rows = computed(() => [...state.value.templates].sort((a, b) => b.sortOrder - a.sortOrder).filter(t =>
  (!filters.value.name || t.name.toLowerCase().includes(filters.value.name.toLowerCase())) &&
  (!filters.value.templateId || t.templateId.toLowerCase().includes(filters.value.templateId.toLowerCase())) &&
  (filters.value.market === 'all' || t.market === filters.value.market) &&
  (filters.value.style === 'all' || t.style === filters.value.style) &&
  (filters.value.status === 'all' || t.status === filters.value.status)))
watch(() => rows.value.length, total => { page.value = Math.min(page.value, Math.max(1, Math.ceil(total / 10))) })
const columns = [
  {key: 'name', title: '策略模板', width: 180, fixed: 'left'},
  {key: 'category', title: '市场 / 风格', width: 100},
  {key: 'risk', title: '风险等级', width: 75},
  {key: 'capital', title: '投资金额（USDT）', width: 150, align: 'right'},
  {key: 'days', title: '运行周期', width: 95, align: 'right'},
  {key: 'usage', title: '进行中订阅', width: 135, align: 'right'},
  {key: 'status', title: '状态', width: 80},
  {key: 'sortOrder', title: '排序权重', width: 80, align: 'right'},
  {key: 'actions', title: '操作', width: 150, fixed: 'right'},
]
function search(values) { filters.value = {name: values.name.trim(), templateId: values.templateId.trim(), market: values.market || 'all', style: values.style || 'all', status: values.status || 'all'}; page.value = 1 }
function reset() { filters.value = {name: '', templateId: '', market: 'all', style: 'all', status: 'all'}; page.value = 1 }
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
    <Space v-else-if="column.key === 'category'" direction="vertical" :size="0"><span>{{ marketLabels[record.market] }}</span><TypographyText type="secondary">{{ styleLabels[record.style] }}</TypographyText></Space>
    <Tag v-else-if="column.key === 'risk'" :color="riskColor(record.risk)">Lv.{{ record.risk }}</Tag>
    <template v-else-if="column.key === 'capital'">{{ whole(record.minCapital) }} ~ {{ whole(record.maxCapital) }}</template>
    <template v-else-if="column.key === 'days'">{{ record.minDays }} ~ {{ record.maxDays }} 天</template>
    <Space v-else-if="column.key === 'usage'" direction="vertical" :size="0" class="strategy-usage">
     <span>{{ usage[record.templateId]?.count || 0 }} 笔 · {{ amount(usage[record.templateId]?.capital || 0) }}</span>
     <TypographyText type="secondary">{{ record.capacity ? `总额度 ${whole(record.capacity)}` : '总额度不限' }}</TypographyText>
    </Space>
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
