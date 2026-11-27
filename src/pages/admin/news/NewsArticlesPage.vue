<script setup>
// 新闻中心 → 文章管理, for the new public site's news centre and home insights. Earn/strategy list conventions:
// query card (one input per field), shared table card, publish/hide/delete confirmations in the operation column.
import {computed, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {message, Button, Space, Tag, TypographyText} from 'ant-design-vue'
import {PlusOutlined} from '@ant-design/icons-vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {useNewsFeed, newsCommand, errorText, stateLabels, stateColors} from '../../../shared/news/client.js'
import {FALLBACK_LOCALE, LOCALES, articleState, categoryName} from '../../../shared/news/domain.js'
import {dateTime} from '../strategy/strategyFormat.js'

const route = useRoute(), router = useRouter(), {state, error, busy, loaded, refresh} = useNewsFeed()
const blank = () => ({title: '', category: 'all', state: 'all', featured: 'all'})
const filters = ref({...blank(), ...Object.fromEntries(Object.keys(blank()).filter(k => route.query[k] != null).map(k => [k, String(route.query[k])]))})
const page = ref(Math.max(1, Number(route.query.page) || 1))
// English first (user decision, 2026-11-27): admin shows the English category name.
const catName = id => categoryName(state.value.categories.find(c => c.categoryId === id), FALLBACK_LOCALE) || '—'
const fields = computed(() => [
  {key: 'title', label: '标题'},
  {key: 'category', label: '分类', options: [{value: 'all', label: '全部分类'}, ...state.value.categories.map(c => ({value: c.categoryId, label: catName(c.categoryId)})), {value: 'none', label: '未分类'}]},
  {key: 'state', label: '状态', options: [{value: 'all', label: '全部状态'}, ...Object.entries(stateLabels).map(([value, label]) => ({value, label}))]},
  {key: 'featured', label: '首页推荐', options: [{value: 'all', label: '全部'}, {value: 'yes', label: '推荐'}, {value: 'no', label: '不推荐'}]},
])
const now = ref(Date.now())
const enTitle = a => a.locales[FALLBACK_LOCALE].title
const zhTitle = a => a.locales['zh-TW']?.title || ''
const rows = computed(() => [...state.value.articles].sort((a, b) => b.publishedAt - a.publishedAt).filter(a => {
  const f = filters.value, q = f.title.trim().toLowerCase()
  return (!q || Object.values(a.locales).some(v => v.title.toLowerCase().includes(q))) &&
    (f.category === 'all' || (f.category === 'none' ? a.category === null : a.category === f.category)) &&
    (f.state === 'all' || articleState(a, now.value) === f.state) &&
    (f.featured === 'all' || (f.featured === 'yes') === a.featured)
}))
watch(() => rows.value.length, total => { page.value = Math.min(page.value, Math.max(1, Math.ceil(total / 10))) })
const columns = [
  {key: 'cover', title: '封面', width: 84},
  {key: 'title', title: '标题', width: 236},
  {key: 'category', title: '分类', width: 80},
  {key: 'tags', title: '标签', width: 104},
  {key: 'languages', title: '语言版本', width: 80, align: 'right'},
  {key: 'publishedAt', title: '发布时间', width: 150},
  {key: 'state', title: '状态', width: 80},
  {key: 'featured', title: '首页推荐', width: 80},
  {key: 'actions', title: '操作', width: 130, fixed: 'right'},
]
function search(values) { now.value = Date.now(); filters.value = {...blank(), ...values}; page.value = 1 }
function reset() { now.value = Date.now(); filters.value = blank(); page.value = 1 }
function edit(article) { router.push({path: article ? `/admin/news/${encodeURIComponent(article.articleId)}/edit` : '/admin/news/new', query: {...filters.value, page: page.value}}) }

// One confirmation dialog for publish / hide / delete.
const target = ref(null)
const confirmCopy = computed(() => {
  const t = target.value
  if (!t) return {}
  if (t.kind === 'delete') return {title: '删除文章', confirm: '确认删除', danger: true, text: '删除后前台不再显示，旧链接打开为「文章不存在」。此操作不能撤销。'}
  if (t.kind === 'hide') return {title: '隐藏文章', confirm: '确认隐藏', danger: true, text: '隐藏后前台新闻中心和首页都不再显示，可随时重新发布。'}
  return {title: '发布文章', confirm: '确认发布', danger: false, text: t.article.publishedAt > Date.now() ? '发布时间还没到，到时间后自动在前台显示。' : '发布后立即在前台新闻中心显示。'}
})
async function confirmTarget() {
  const t = target.value
  if (busy.value || !t) return
  try {
    const args = {articleId: t.article.articleId, expectedVersion: t.article.version}
    if (t.kind === 'delete') await newsCommand('deleteArticle', args)
    else await newsCommand('setStatus', {...args, status: t.kind === 'hide' ? 'hidden' : 'published'})
    message.success({delete: '文章已删除', hide: '文章已隐藏', publish: '文章已发布'}[t.kind])
    target.value = null
  } catch (e) { message.error(errorText(e)) }
}
</script>

<template>
 <PageShell>
  <FeedbackToast v-if="error" type="error" :source="() => (error ? errorText(error) : '')"><Button @click="refresh">重试</Button></FeedbackToast>
  <SearchForm name="news-article-filters" :model="filters" :fields="fields" @search="search" @reset="reset"/>
  <AdminTable title="新闻文章" v-model:page="page" :rows="rows" :columns="columns" row-key="articleId" :loading="!loaded && !error" desktop-only>
   <template #toolbar><Space :size="8"><Button @click="refresh">刷新</Button><Button type="primary" @click="edit()"><template #icon><PlusOutlined/></template>新增文章</Button></Space></template>
   <template #cell="{column, record}">
    <img v-if="column.key === 'cover' && record.image" :src="record.image" alt="" class="news-cover"/>
    <span v-else-if="column.key === 'cover'" class="news-cover empty" aria-hidden="true"/>
    <Space v-else-if="column.key === 'title'" direction="vertical" :size="0" class="news-title"><TypographyText strong :ellipsis="true" :content="enTitle(record)"/><TypographyText v-if="zhTitle(record)" type="secondary" :ellipsis="true" :content="zhTitle(record)"/></Space>
    <template v-else-if="column.key === 'category'">{{ record.category ? catName(record.category) : '未分类' }}</template>
    <Space v-else-if="column.key === 'tags'" :size="[4, 4]" wrap class="news-tags"><Tag v-for="tag in record.tags" :key="tag">{{ tag }}</Tag><TypographyText v-if="!record.tags.length" type="secondary">—</TypographyText></Space>
    <template v-else-if="column.key === 'languages'">{{ Object.keys(record.locales).length }} / {{ LOCALES.length }}</template>
    <template v-else-if="column.key === 'publishedAt'">{{ dateTime(record.publishedAt) }}</template>
    <Tag v-else-if="column.key === 'state'" :color="stateColors[articleState(record, now)]">{{ stateLabels[articleState(record, now)] }}</Tag>
    <template v-else-if="column.key === 'featured'">{{ record.featured ? `推荐 · ${record.featuredOrder}` : '—' }}</template>
    <Space v-else-if="column.key === 'actions'" :size="8" class="news-row-actions">
     <Button type="link" @click="edit(record)">编辑</Button>
     <Button v-if="record.status === 'hidden'" type="link" @click="target = {kind: 'publish', article: record}">发布</Button>
     <Button v-else type="link" danger @click="target = {kind: 'hide', article: record}">隐藏</Button>
     <Button type="link" danger @click="target = {kind: 'delete', article: record}">删除</Button>
    </Space>
    <template v-else>{{ record[column.key] ?? '—' }}</template>
   </template>
  </AdminTable>
  <AdminModal :width="520" :open="!!target" :title="confirmCopy.title" :busy="busy" :confirm-text="confirmCopy.confirm" :danger="confirmCopy.danger" @close="target = null" @confirm="confirmTarget">
   <div v-if="target"><TypographyText strong>{{ enTitle(target.article) }}</TypographyText><p>{{ confirmCopy.text }}</p></div>
  </AdminModal>
 </PageShell>
</template>

<style scoped>
.news-cover{display:block;width:64px;height:40px;object-fit:cover;border-radius:4px}
.news-cover.empty{background:var(--ant-color-fill-secondary,#f0f0f0)}
.news-title{max-width:236px}
.news-tags :deep(.ant-tag){margin-inline-end:0}
.news-row-actions :deep(.ant-btn-link){padding-inline:4px}
</style>
