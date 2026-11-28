<script setup>
// 内容管理 → 监管资讯, for the new public site's /regulatory-information (user decision, 2026-11-28). Earn/news list
// conventions: query card (one input per field), shared table card, publish/unpublish confirmation in the operation
// column. Saves in the editor never change the publication status.
import {computed, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {message, Button, Space, Tag, TypographyText} from 'ant-design-vue'
import {PlusOutlined} from '@ant-design/icons-vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {useRegulatoryFeed, regulatoryCommand, errorText, statusLabels, statusColors} from '../../../shared/regulatory/client.js'
import {LOCALES, entryTitle} from '../../../shared/regulatory/domain.js'
import {dateTime} from '../strategy/strategyFormat.js'

const route = useRoute(), router = useRouter(), {state, error, busy, loaded, refresh} = useRegulatoryFeed()
const blank = () => ({title: '', status: 'all'})
const filters = ref({...blank(), ...Object.fromEntries(Object.keys(blank()).filter(k => route.query[k] != null).map(k => [k, String(route.query[k])]))})
const page = ref(Math.max(1, Number(route.query.page) || 1))
const fields = [
  {key: 'title', label: '标题'},
  {key: 'status', label: '状态', options: [{value: 'all', label: '全部状态'}, ...Object.entries(statusLabels).map(([value, label]) => ({value, label}))]},
]
const has = (value, q) => !q || String(value || '').toLowerCase().includes(q)
// Sort weight: larger first, id as a stable tie-breaker (same order as the public index).
const rows = computed(() => [...state.value.entries].sort((a, b) => b.sortWeight - a.sortWeight || a.entryId.localeCompare(b.entryId)).filter(e => {
  const f = filters.value, q = f.title.trim().toLowerCase()
  return (!q || Object.values(e.locales).some(v => has(v.title, q))) && (f.status === 'all' || e.status === f.status)
}))
watch(() => rows.value.length, total => { page.value = Math.min(page.value, Math.max(1, Math.ceil(total / 10))) })
const columns = [
  {key: 'title', title: '标题', width: 300},
  {key: 'attachments', title: '附件', width: 72, align: 'right'},
  {key: 'languages', title: '语言版本', width: 96, align: 'right'},
  {key: 'sortWeight', title: '排序权重', width: 96, align: 'right'},
  {key: 'updatedAt', title: '更新时间', width: 170},
  {key: 'status', title: '状态', width: 96},
  {key: 'actions', title: '操作', width: 120, fixed: 'right'},
]
function search(values) { filters.value = {...blank(), ...values}; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }
function edit(entry) { router.push({path: entry ? `/admin/regulatory/${encodeURIComponent(entry.entryId)}/edit` : '/admin/regulatory/new', query: {...filters.value, page: page.value}}) }

const target = ref(null)
const confirmCopy = computed(() => target.value?.kind === 'unpublish'
  ? {title: '下线监管资讯', confirm: '确认下线', danger: true, text: '下线后前台监管资讯列表和详情页不再显示该条目，可随时重新发布。'}
  : {title: '发布监管资讯', confirm: '确认发布', danger: false, text: '发布后该条目及其附件在前台监管资讯中展示。'})
async function confirmTarget() {
  const t = target.value
  if (busy.value || !t) return
  try {
    await regulatoryCommand('setStatus', {entryId: t.entry.entryId, expectedVersion: t.entry.version, status: t.kind === 'publish' ? 'published' : 'unpublished'})
    message.success(t.kind === 'publish' ? '监管资讯已发布' : '监管资讯已下线')
    target.value = null
  } catch (e) { message.error(errorText(e)) }
}
</script>

<template>
 <PageShell>
  <FeedbackToast v-if="error" type="error" :source="() => (error ? errorText(error) : '')"><Button @click="refresh">重试</Button></FeedbackToast>
  <SearchForm name="regulatory-filters" :model="filters" :fields="fields" @search="search" @reset="reset"/>
  <AdminTable title="监管资讯" v-model:page="page" :rows="rows" :columns="columns" row-key="entryId" :loading="!loaded && !error" desktop-only>
   <template #toolbar><Space :size="8"><Button @click="refresh">刷新</Button><Button type="primary" @click="edit()"><template #icon><PlusOutlined/></template>新增监管资讯</Button></Space></template>
   <template #cell="{column, record}">
    <TypographyText v-if="column.key === 'title'" strong :ellipsis="true" :content="entryTitle(record)" class="reg-cell"/>
    <template v-else-if="column.key === 'attachments'">{{ record.attachments.length }}</template>
    <template v-else-if="column.key === 'updatedAt'">{{ dateTime(record.updatedAt) }}</template>
    <template v-else-if="column.key === 'languages'">{{ Object.keys(record.locales).length }} / {{ LOCALES.length }}</template>
    <Tag v-else-if="column.key === 'status'" :color="statusColors[record.status]">{{ statusLabels[record.status] }}</Tag>
    <Space v-else-if="column.key === 'actions'" :size="8" class="reg-row-actions">
     <Button type="link" @click="edit(record)">编辑</Button>
     <Button v-if="record.status === 'unpublished'" type="link" @click="target = {kind: 'publish', entry: record}">发布</Button>
     <Button v-else type="link" danger @click="target = {kind: 'unpublish', entry: record}">下线</Button>
    </Space>
    <template v-else>{{ record[column.key] || '—' }}</template>
   </template>
  </AdminTable>
  <AdminModal :width="520" :open="!!target" :title="confirmCopy.title" :busy="busy" :confirm-text="confirmCopy.confirm" :danger="confirmCopy.danger" @close="target = null" @confirm="confirmTarget">
   <div v-if="target"><TypographyText strong>{{ entryTitle(target.entry) }}</TypographyText><p>{{ confirmCopy.text }}</p></div>
  </AdminModal>
 </PageShell>
</template>

<style scoped>
.reg-cell{max-width:100%}
.reg-row-actions :deep(.ant-btn-link){padding-inline:4px}
</style>
