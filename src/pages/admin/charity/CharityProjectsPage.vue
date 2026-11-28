<script setup>
// 公益 → 公益项目. Follows the AI 金融 product list: query card with one input per field, shared table card,
// guarded list/unlist confirmation in the operation column. Sort weights: larger first.
import {computed, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {message, Button, Image, Progress, Space, Tag, TypographyText} from 'ant-design-vue'
import {PlusOutlined} from '@ant-design/icons-vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {useCharityFeed, charityCommand, errorText, projectStatusLabels} from '../../../shared/charity/client.js'
import {LOCALES, donationCount, progressOf, projectTitle, projectsBySort, raisedAmount} from '../../../shared/charity/domain.js'
import {amount} from '../strategy/strategyFormat.js'

const whole = value => Number(value || 0).toLocaleString('zh-CN', {maximumFractionDigits: 2})
const route = useRoute(), router = useRouter(), {state, error, busy, loaded, refresh} = useCharityFeed()
const blank = () => ({title: '', projectId: '', status: 'all'})
const filters = ref({...blank(), ...Object.fromEntries(Object.keys(blank()).filter(k => route.query[k] != null).map(k => [k, String(route.query[k])]))})
const page = ref(Math.max(1, Number(route.query.page) || 1))
const fields = [
  {key: 'title', label: '项目名称'},
  {key: 'projectId', label: '项目 ID'},
  {key: 'status', label: '状态', options: [{value: 'all', label: '全部状态'}, ...Object.entries(projectStatusLabels).map(([value, label]) => ({value, label}))]},
]
const has = (value, query) => !query || String(value).toLowerCase().includes(query.trim().toLowerCase())
// The name filter matches any language version.
const rows = computed(() => projectsBySort(state.value.projects).filter(p => {
  const f = filters.value
  return Object.values(p.locales).some(v => has(v.title, f.title)) && has(p.projectId, f.projectId) && (f.status === 'all' || p.status === f.status)
}))
watch(() => rows.value.length, total => { page.value = Math.min(page.value, Math.max(1, Math.ceil(total / 10))) })
const columns = [
  {key: 'project', title: '项目', width: 360, fixed: 'left'},
  {key: 'raised', title: '已募 / 目标（USDT）', width: 220, align: 'right'},
  {key: 'funding', title: '募集进度', width: 150},
  {key: 'donations', title: '捐赠笔数', width: 90, align: 'right'},
  {key: 'peopleHelped', title: '受助人数', width: 110, align: 'right'},
  {key: 'limits', title: '单笔捐赠（USDT）', width: 160, align: 'right'},
  {key: 'status', title: '状态', width: 80},
  {key: 'sortOrder', title: '排序权重', width: 90, align: 'right'},
  {key: 'actions', title: '操作', width: 120, fixed: 'right'},
]
const filledLocales = p => LOCALES.filter(l => p.locales[l]?.title).length
function search(values) { filters.value = {...blank(), ...values}; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }
function edit(project) {
  router.push({path: project ? `/admin/charity/projects/${encodeURIComponent(project.projectId)}/edit` : '/admin/charity/projects/new', query: {...filters.value, page: page.value}})
}

const target = ref(null)
async function toggleStatus() {
  if (busy.value || !target.value) return
  try {
    await charityCommand('setProjectStatus', {projectId: target.value.projectId, expectedStatus: target.value.status})
    message.success(target.value.status === 'listed' ? '项目已下架' : '项目已上架')
    target.value = null
  } catch (e) { message.error(errorText(e)) }
}
</script>

<template>
 <PageShell>
  <FeedbackToast v-if="error" type="error" :source="() => (error ? errorText(error) : '')"><Button @click="refresh">重试</Button></FeedbackToast>
  <SearchForm name="charity-project-filters" :model="filters" :fields="fields" @search="search" @reset="reset"/>
  <AdminTable title="公益项目" v-model:page="page" :rows="rows" :columns="columns" row-key="projectId" :loading="!loaded && !error" desktop-only>
   <template #toolbar><Space :size="8"><Button @click="refresh">刷新</Button><Button type="primary" @click="edit()"><template #icon><PlusOutlined/></template>新增项目</Button></Space></template>
   <template #cell="{column, record}">
    <Space v-if="column.key === 'project'" :size="12" align="start">
     <Image :src="record.image" :alt="projectTitle(record)" :width="72" :height="45" class="charity-cover" :preview="false"/>
     <span><TypographyText strong>{{ projectTitle(record) }}</TypographyText><br/><TypographyText type="secondary">{{ record.projectId }} · v{{ record.version }} · {{ filledLocales(record) }}/6 种语言</TypographyText></span>
    </Space>
    <Space v-else-if="column.key === 'raised'" direction="vertical" :size="0" align="end"><span>{{ amount(raisedAmount(state, record)) }}</span><TypographyText type="secondary">/ {{ whole(record.targetAmount) }}</TypographyText></Space>
    <div v-else-if="column.key === 'funding'"><Progress :percent="progressOf(state, record)" size="small" :show-info="false"/><TypographyText type="secondary">{{ progressOf(state, record) }}%</TypographyText></div>
    <template v-else-if="column.key === 'donations'">{{ donationCount(state, record.projectId) }} 笔</template>
    <template v-else-if="column.key === 'peopleHelped'">{{ whole(record.peopleHelped) }}</template>
    <template v-else-if="column.key === 'limits'">{{ whole(record.minDonation) }} ~ {{ whole(record.maxDonation) }}</template>
    <Tag v-else-if="column.key === 'status'" :color="record.status === 'listed' ? 'green' : 'default'">{{ projectStatusLabels[record.status] }}</Tag>
    <Space v-else-if="column.key === 'actions'" :size="8" class="charity-row-actions"><Button type="link" @click="edit(record)">编辑</Button><Button type="link" :danger="record.status === 'listed'" @click="target = {...record}">{{ record.status === 'listed' ? '下架' : '上架' }}</Button></Space>
    <template v-else>{{ record[column.key] ?? '—' }}</template>
   </template>
  </AdminTable>
  <AdminModal :width="520" :open="!!target" :title="target?.status === 'listed' ? '下架公益项目' : '上架公益项目'" :busy="busy" :confirm-text="target?.status === 'listed' ? '确认下架' : '确认上架'" :danger="target?.status === 'listed'" @close="target = null" @confirm="toggleStatus">
   <div v-if="target"><TypographyText strong>{{ projectTitle(target) }}</TypographyText><p>{{ target.status === 'listed' ? '下架后前台不再展示该项目，也不能再捐赠；已有捐赠记录和已募金额保留，仍计入频道统计。' : '上架后前台按排序权重展示该项目，用户可以捐赠。' }}</p></div>
  </AdminModal>
 </PageShell>
</template>

<style scoped>
.charity-row-actions :deep(.ant-btn-link){padding-inline:4px}
.charity-cover :deep(img),:deep(.charity-cover){object-fit:cover;border-radius:4px}
</style>
