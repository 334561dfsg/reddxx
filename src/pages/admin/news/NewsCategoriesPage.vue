<script setup>
// 内容管理 → 新闻分类: the public news-centre filter. Names per language, sort weight (larger first), enabled switch.
// A category still used by articles can be disabled but not deleted.
import {computed, ref} from 'vue'
import {useRouter} from 'vue-router'
import {message, Button, Space, Tag, TypographyText} from 'ant-design-vue'
import {PlusOutlined} from '@ant-design/icons-vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import PageShell from '../earn/EarnPageShell.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {useNewsFeed, newsCommand, errorText} from '../../../shared/news/client.js'
import {FALLBACK_LOCALE, LOCALES} from '../../../shared/news/domain.js'

const router = useRouter(), {state, error, busy, loaded, refresh} = useNewsFeed()
const page = ref(1)
const usage = computed(() => Object.fromEntries(state.value.categories.map(c => [c.categoryId, state.value.articles.filter(a => a.category === c.categoryId).length])))
const rows = computed(() => [...state.value.categories].sort((a, b) => b.sortOrder - a.sortOrder))
const columns = [
  {key: 'name', title: '分类名称', width: 260},
  {key: 'languages', title: '语言版本', width: 100, align: 'right'},
  {key: 'articles', title: '文章数', width: 100, align: 'right'},
  {key: 'sortOrder', title: '排序权重', width: 100, align: 'right'},
  {key: 'enabled', title: '状态', width: 100},
  {key: 'actions', title: '操作', width: 120, fixed: 'right'},
]
function edit(category) { router.push(category ? `/admin/news/categories/${encodeURIComponent(category.categoryId)}/edit` : '/admin/news/categories/new') }

const target = ref(null)
async function remove() {
  if (busy.value || !target.value) return
  try {
    await newsCommand('deleteCategory', {categoryId: target.value.categoryId, expectedVersion: target.value.version})
    message.success('分类已删除')
    target.value = null
  } catch (e) { message.error(errorText(e)) }
}
</script>

<template>
 <PageShell>
  <FeedbackToast v-if="error" type="error" :source="() => (error ? errorText(error) : '')"><Button @click="refresh">重试</Button></FeedbackToast>
  <AdminTable title="新闻分类" v-model:page="page" :rows="rows" :columns="columns" row-key="categoryId" :loading="!loaded && !error" desktop-only>
   <template #toolbar><Space :size="8"><Button @click="refresh">刷新</Button><Button type="primary" @click="edit()"><template #icon><PlusOutlined/></template>新增分类</Button></Space></template>
   <template #cell="{column, record}">
    <Space v-if="column.key === 'name'" direction="vertical" :size="0"><TypographyText strong>{{ record.names[FALLBACK_LOCALE] }}</TypographyText><TypographyText v-if="record.names['zh-TW']" type="secondary">{{ record.names['zh-TW'] }}</TypographyText></Space>
    <template v-else-if="column.key === 'languages'">{{ Object.keys(record.names).length }} / {{ LOCALES.length }}</template>
    <template v-else-if="column.key === 'articles'">{{ usage[record.categoryId] || 0 }}</template>
    <Tag v-else-if="column.key === 'enabled'" :color="record.enabled ? 'green' : 'default'">{{ record.enabled ? '启用' : '停用' }}</Tag>
    <Space v-else-if="column.key === 'actions'" :size="8" class="news-row-actions">
     <Button type="link" @click="edit(record)">编辑</Button>
     <Button type="link" danger :disabled="!!usage[record.categoryId]" :title="usage[record.categoryId] ? '仍有文章使用该分类，可改为停用' : undefined" @click="target = record">删除</Button>
    </Space>
    <template v-else>{{ record[column.key] ?? '—' }}</template>
   </template>
  </AdminTable>
  <AdminModal :open="!!target" title="删除分类" :busy="busy" confirm-text="确认删除" danger @close="target = null" @confirm="remove">
   <div v-if="target"><TypographyText strong>{{ target.names[FALLBACK_LOCALE] }}</TypographyText><p>删除后前台筛选不再显示该分类。此操作不能撤销。</p></div>
  </AdminModal>
 </PageShell>
</template>

<style scoped>
.news-row-actions :deep(.ant-btn-link){padding-inline:4px}
</style>
